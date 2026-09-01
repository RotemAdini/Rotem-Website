[CmdletBinding()]
param(
    [string]$SourceRoot = '',
    [string]$OutputFile = '',
    [string]$ReportFile = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$scriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
if (!$SourceRoot) { $SourceRoot = Join-Path $scriptFolder '..\recipes' }
if (!$OutputFile) { $OutputFile = Join-Path $scriptFolder '..\data\recipes.json' }
if (!$ReportFile) { $ReportFile = Join-Path $scriptFolder '..\reports\recipes-inventory.md' }

function Get-RelativePath([string]$Path, [string]$Base) {
    $resolvedBase = (Resolve-Path -LiteralPath $Base).Path.TrimEnd('\\')
    if ($Path.StartsWith($resolvedBase, [StringComparison]::OrdinalIgnoreCase)) {
        return (($Path.Substring($resolvedBase.Length).TrimStart('\\')) -replace '\\', '/')
    }
    return ($Path -replace '\\', '/')
}

function Clean-Text([string]$Text) {
    if ($null -eq $Text) { return '' }
    return (($Text -replace '[\u200e\u200f\u202a-\u202e\u2066-\u2069]', '') -replace '\s+', ' ').Trim()
}

function Get-DocxParagraphs([IO.FileInfo]$File) {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($File.FullName)
    try {
        $entry = $zip.GetEntry('word/document.xml')
        if ($null -eq $entry) { return @() }
        $reader = [IO.StreamReader]::new($entry.Open())
        try { [xml]$xml = $reader.ReadToEnd() } finally { $reader.Dispose() }
        $ns = [Xml.XmlNamespaceManager]::new($xml.NameTable)
        $ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
        return @($xml.SelectNodes('//w:p', $ns) | ForEach-Object {
            Clean-Text (($_.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join '')
        } | Where-Object { $_ })
    } finally { $zip.Dispose() }
}

function Get-Title([string[]]$Lines) {
    foreach ($line in $Lines) {
        $value = Clean-Text $line
        if (!$value -or $value -match $script:ingredientPattern -or $value -match $script:instructionPattern -or $value -match '^@') { continue }
        # A title is normally the first text block after the reel URL. Keep only its opening line.
        $value = ($value -replace '^[-•*\s]+', '').Trim()
        if ($value.Length -gt 140) { $value = $value.Substring(0, 140).Trim() }
        return $value
    }
    return ''
}

function Split-RecipeText([string[]]$Lines) {
    $ingredientStart = -1; $instructionStart = -1
    for ($i = 0; $i -lt $Lines.Count; $i++) {
        if ($ingredientStart -lt 0 -and $Lines[$i] -match $script:ingredientPattern ) { $ingredientStart = $i; continue }
        if ($instructionStart -lt 0 -and $Lines[$i] -match $script:instructionPattern ) { $instructionStart = $i }
    }
    $ingredients = @()
    if ($ingredientStart -ge 0) {
        $end = if ($instructionStart -gt $ingredientStart) { $instructionStart } else { $Lines.Count }
        for ($i = $ingredientStart + 1; $i -lt $end; $i++) { if (Clean-Text $Lines[$i]) { $ingredients += (Clean-Text $Lines[$i]) } }
    }
    $instructions = @()
    if ($instructionStart -ge 0) {
        for ($i = $instructionStart + 1; $i -lt $Lines.Count; $i++) { if (Clean-Text $Lines[$i]) { $instructions += (Clean-Text $Lines[$i]) } }
    }
    return @{ ingredients = @($ingredients); instructions = @($instructions) }
}

function New-Recipe([string]$Title, [string]$Url, [string[]]$Ingredients, [string[]]$Instructions, [string]$SourceFile, [string]$SourceType) {
    [ordered]@{
        id = ''; slug = ''; title = $Title; sourceUrl = $Url
        ingredients = @($Ingredients); instructions = @($Instructions)
        images = [ordered]@{ thumbnail = $null; main = $null; hero = $null; new = @() }
        imageMatch = [ordered]@{ confidence = 'NONE'; method = $null; imageKey = $null }
        sourceFiles = @([ordered]@{ path = $SourceFile; type = $SourceType })
        status = 'NEEDS_REVIEW'; issues = @()
    }
}

function Normalize-Key([string]$Value) {
    return ((Clean-Text $Value).ToLowerInvariant() -replace '[^\p{L}\p{N}]', '')
}

# Keep the script ASCII-only so it runs correctly under Windows PowerShell 5.1,
# which otherwise treats UTF-8 without a BOM as the system code page.
function Decode-Utf8Base64([string]$Value) { return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Value)) }
$script:ingredientPattern = Decode-Utf8Base64 'XijXntem16jXm9eZ1518157XlCDXoNem15jXqNeafNee15Qg16bXqNeZ15opXHMqOj8='
$script:instructionPattern = Decode-Utf8Base64 'XijXkNeV16TXnyDXlNeb16DXlHzXkNeV16TXnyDXlNeb16DXqnzXlNeb16DXlClccyo6Pw=='
$script:csvCandidatePattern = Decode-Utf8Base64 'KNee16bXqNeb15nXnXzXnteUINeg16bXmNeo15p8157XlCDXpteo15nXmnxpbmdyZWRpZW50c3xmdWxsIGluZ3JlZGllbnRzKQ=='
$script:newImageDirectory = Decode-Utf8Base64 '15fXk9ep'

if (!(Test-Path -LiteralPath $SourceRoot)) { throw "Recipe source folder does not exist: $SourceRoot" }
$sourceRootFull = (Resolve-Path -LiteralPath $SourceRoot).Path
$recipeRoot = Split-Path -Parent $sourceRootFull
$recipes = [System.Collections.Generic.List[object]]::new()

# DOCX: each Instagram URL starts a recipe block. Text is taken directly from Word XML.
Get-ChildItem -LiteralPath $sourceRootFull -Recurse -File -Filter '*.docx' | Sort-Object FullName | ForEach-Object {
    $relative = Get-RelativePath $_.FullName $recipeRoot
    $paragraphs = Get-DocxParagraphs $_
    $starts = @(for ($i = 0; $i -lt $paragraphs.Count; $i++) { if ($paragraphs[$i] -match 'https?://') { $i } })
    for ($s = 0; $s -lt $starts.Count; $s++) {
        $start = $starts[$s]; $end = if ($s + 1 -lt $starts.Count) { $starts[$s + 1] } else { $paragraphs.Count }
        $urlMatch = [regex]::Match($paragraphs[$start], 'https?://\S+')
        $lines = @($paragraphs[($start + 1)..($end - 1)])
        $parts = Split-RecipeText $lines
        $recipes.Add((New-Recipe (Get-Title $lines) $urlMatch.Value $parts.ingredients $parts.instructions $relative 'docx'))
    }
}

# CSV: include every row labelled Food as a recipe candidate, plus any row with an
# explicit ingredient marker (some sponsored food recipes use another category).
Get-ChildItem -LiteralPath $sourceRootFull -Recurse -File -Filter '*.csv' | Sort-Object FullName | ForEach-Object {
    $relative = Get-RelativePath $_.FullName $recipeRoot
    Import-Csv -LiteralPath $_.FullName | ForEach-Object {
        $caption = Clean-Text ([string]$_.caption_full)
        if ($_.primary_category -ne 'Food' -and $caption -notmatch $script:csvCandidatePattern ) { return }
        $title = (($caption -split '[.!…]')[0]).Trim()
        if ($title.Length -gt 140) { $title = $title.Substring(0, 140).Trim() }
        $recipe = New-Recipe $title ([string]$_.reel_url) @() @() $relative 'csv'
        $recipe.sourceFiles[0]['row'] = [string]$_.reel_index
        $recipe.issues += 'CSV_CAPTION_DOES_NOT_CONTAIN_STRUCTURED_RECIPE_TEXT'
        $recipes.Add($recipe)
    }
}

# Consolidate exact source-URL duplicates; retain every source-file reference.
$unique = [ordered]@{}
foreach ($recipe in $recipes) {
    $key = if ($recipe.sourceUrl) { $recipe.sourceUrl.TrimEnd('/') } else { "title:" + (Normalize-Key $recipe.title) }
    if (!$unique.Contains($key)) { $unique[$key] = $recipe; continue }
    $existing = $unique[$key]
    $existing.sourceFiles += $recipe.sourceFiles
    if (!$existing.title -and $recipe.title) { $existing.title = $recipe.title }
    if (!$existing.ingredients.Count -and $recipe.ingredients.Count) { $existing.ingredients = $recipe.ingredients }
    if (!$existing.instructions.Count -and $recipe.instructions.Count) { $existing.instructions = $recipe.instructions }
    $existing.issues += 'DUPLICATE_SOURCE_URL_CONSOLIDATED'
}
$records = @($unique.Values)

# Build image bundles by filename. Matching requires an explicit, maintainable Hebrew alias;
# no fuzzy filename/title guesses are permitted.
$bundles = @{}
Get-ChildItem -LiteralPath $sourceRootFull -Recurse -File | Where-Object { $_.Extension -match '^\.(jpg|jpeg|png|webp)$' } | ForEach-Object {
    $parent = $_.Directory.Name
    $kind = if ($parent -eq $script:newImageDirectory) { 'new' } else { switch ($parent) { 'thumbnails' { 'thumbnail' }; 'thumbnail' { 'thumbnail' }; 'main' { 'main' }; 'hero' { 'hero' }; default { $null } } }
    if (!$kind) { return }
    $key = $_.BaseName.ToLowerInvariant()
    if (!$bundles.ContainsKey($key)) { $bundles[$key] = [ordered]@{ thumbnail=$null; main=$null; hero=$null; new=@() } }
    $rel = Get-RelativePath $_.FullName $recipeRoot
    if ($kind -eq 'new') { $bundles[$key].new += $rel } else { $bundles[$key][$kind] = $rel }
}

$aliases = @{
    'almond_cookies' = @((Decode-Utf8Base64 '16LXldeS15nXldeqINep16fXk9eZ150=')); 'eggplant_spread' = @((Decode-Utf8Base64 '157Xnteo15cg15fXpteZ15zXmded')); 'caramelized_onion_spaghetti' = @((Decode-Utf8Base64 '16HXpNeS15jXmSDXkdeo15XXmNeRINeR16bXnCDXnten15XXqNee15w='))
    'mini_sweet_potato_tortilla_quiche' = @((Decode-Utf8Base64 '157Xmdeg15kg16fXmdepINeR15jXmNeUINee15jXldeo15jXmdeZ15Q=')); 'rice_paper_burekas' = @((Decode-Utf8Base64 '15HXldeo16fXoSDXkteR15nXoNeV16og157Xk9ek15kg15DXldeo15Y='))
    'rice_paper_meat_bourekas' = @((Decode-Utf8Base64 '15HXldeo16fXoSDXkdep16gg157Xk9ek15kg15DXldeo15Y=')); 'cheesecake_diet' = @((Decode-Utf8Base64 '16LXldeS16og15LXkdeZ16DXlCDXk9eZ15DXmNeY15nXqg=='))
}
# Reviewed bilingual semantic matches. The Instagram shortcode is an immutable source
# identifier, while each target key names the English image bundle. These mappings
# are deliberately limited to one-to-one title meanings (for example, "אוזני המן
# אמסטרדם" -> amsterdam_hamantaschen); they never use a fuzzy visual guess.
$semanticUrlAliases = @{
    'C35hMaNIqVB'='amsterdam_hamantaschen'; 'Cy5RiJXoNQ9'='alfajores_cookies'; 'C5F12e5tkty'='cheese_blintzes'
    'CwXOVU8Ita-'='cheese_khachapuri'; 'C6x0JkiISVu'='chicken_arayes_mint'; 'Ct_1uM4IWz4'='chocolate_protein_souffle'
    'CsqQpHwsV7X'='lahuh'; 'Cs-3ZYQxkiS'='kubana'; 'CtHXu5FoZLN'='lemon_crembo'; 'CtO-3HaoEFq'='brownie_cheesecake'
    'C4a8n7MID3R'='maple_pecan_cake_no_oil'; 'CvSlwYVo3Q4'='mini_chocolate_cookies'; 'C4zwUOhokzd'='mint_teriyaki_chicken_thighs'
    'C7PAmXdovOB'='mustard_garlic_potatoes'; 'C4LdaZAI5Wd'='nutella_rugelach'; 'Cvpd1Too9Op'='oat_cookies'
    'CwsmK4xI130'='pistachio_crunch'; 'C39tTw3I2t-'='quinoa_orange_salad'; 'CzLZ9WloVlV'='raffaello_balls'
    'CwFJXFpIvJ7'='cheesecake_diet'
}
$assignedImageKeys = [System.Collections.Generic.HashSet[string]]::new()
foreach ($recipe in $records) {
    $candidateKeys = @($aliases.Keys | Where-Object { $aliases[$_] | Where-Object { $recipe.title -like "*$_*" } })
    foreach ($shortcode in $semanticUrlAliases.Keys) { if ($recipe.sourceUrl -match [regex]::Escape($shortcode)) { $candidateKeys += $semanticUrlAliases[$shortcode] } }
    $candidateKeys = @($candidateKeys | Select-Object -Unique)
    if ($candidateKeys.Count -eq 1) {
        $key = [string]$candidateKeys[0]
        if (!$bundles.ContainsKey($key)) { continue }
        $bundle = $bundles[$key]
        $recipe.images['thumbnail'] = $bundle['thumbnail']; $recipe.images['main'] = $bundle['main']; $recipe.images['hero'] = $bundle['hero']; $recipe.images['new'] = @($bundle['new'])
        $recipe.imageMatch = [ordered]@{ confidence = 'HIGH'; method = if ($semanticUrlAliases.Values -contains $key) { 'bilingual-semantic-title-and-source-url' } else { 'explicit-bilingual-title-alias' }; imageKey = $key }
        [void]$assignedImageKeys.Add($key)
        if ($bundle['new'].Count) { $recipe.sourceFiles += @($bundle['new'] | ForEach-Object { [ordered]@{ path=$_; type='image-new' } }) }
    }
}

$titleGroups = @{}
foreach ($recipe in $records) { $key = Normalize-Key $recipe.title; if (!$titleGroups.ContainsKey($key)) { $titleGroups[$key] = @() }; $titleGroups[$key] += $recipe }
foreach ($group in $titleGroups.Values | Where-Object { $_.Count -gt 1 }) { foreach ($recipe in $group) { $recipe.issues += 'POSSIBLE_DUPLICATE_TITLE' } }

foreach ($recipe in $records) {
    if (!$recipe.title) { $recipe.issues += 'MISSING_TITLE' }
    if (!$recipe.sourceUrl) { $recipe.issues += 'MISSING_SOURCE_URL' }
    if (!$recipe.ingredients.Count) { $recipe.issues += 'MISSING_INGREDIENTS' }
    if (!$recipe.instructions.Count) { $recipe.issues += 'MISSING_INSTRUCTIONS' }
    if (!$recipe.images['thumbnail']) { $recipe.issues += 'MISSING_THUMBNAIL' }
    if (!$recipe.images['main']) { $recipe.issues += 'MISSING_MAIN_IMAGE' }
    if (!$recipe.images['hero']) { $recipe.issues += 'MISSING_HERO_IMAGE' }
    $recipe.issues = @($recipe.issues | Select-Object -Unique)
    $recipe.status = if ($recipe.issues.Count) { 'NEEDS_REVIEW' } else { 'COMPLETE' }
    $slugSeed = if ($recipe.title) { $recipe.title } else { $recipe.sourceUrl }
    $recipe.slug = (Normalize-Key $slugSeed).Substring(0, [Math]::Min(60, (Normalize-Key $slugSeed).Length))
    if (!$recipe.slug) { $recipe.slug = 'untitled' }
}
$usedIds = @{}
foreach ($recipe in $records | Sort-Object title, sourceUrl) {
    $base = $recipe.slug; if (!$usedIds.ContainsKey($base)) { $usedIds[$base] = 0 }; $usedIds[$base]++
    $recipe.id = if ($usedIds[$base] -eq 1) { $base } else { "$base-$($usedIds[$base])" }
}

$unmatchedImageKeys = @($bundles.Keys | Where-Object { !$assignedImageKeys.Contains($_) } | Sort-Object)
$outputDir = Split-Path -Parent $OutputFile; $reportDir = Split-Path -Parent $ReportFile
New-Item -ItemType Directory -Force -Path $outputDir, $reportDir | Out-Null
$json = [ordered]@{ generatedAt = (Get-Date).ToUniversalTime().ToString('o'); sourceRoot = 'recipes'; recipes = @($records); unmatchedImages = @($unmatchedImageKeys | ForEach-Object { [ordered]@{ key=$_; files=$bundles[$_]} }) }
$json | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $OutputFile -Encoding utf8

$lines = @('# Recipes inventory', '', "Generated: $($json.generatedAt)", '', "| ID | Title | URL | Ingredients | Instructions | Thumbnail | Main | Hero | Image confidence | Status / issues |", '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
foreach ($recipe in $records | Sort-Object title, id) {
    $safeTitle = ($recipe.title -replace '\|', '\\|'); $safeIssues = ($recipe.issues -join ', ' -replace '\|', '\\|')
    $lines += "| $($recipe.id) | $safeTitle | $(if($recipe.sourceUrl){'yes'}else{'no'}) | $($recipe.ingredients.Count) | $($recipe.instructions.Count) | $(if($recipe.images.thumbnail){'yes'}else{'no'}) | $(if($recipe.images.main){'yes'}else{'no'}) | $(if($recipe.images.hero){'yes'}else{'no'}) | $($recipe.imageMatch.confidence) | $($recipe.status): $safeIssues |"
}
$lines += '', '## Unmatched image bundles', ''
if ($unmatchedImageKeys.Count) {
    $unmatchedImageKeys | ForEach-Object {
        $bundle = $bundles[$_]
        $files = @($bundle['thumbnail'], $bundle['main'], $bundle['hero']) + @($bundle['new']) | Where-Object { $_ }
        $lines += "- ``$_``: $($files -join ', ')"
    }
} else { $lines += 'None.' }
$lines | Set-Content -LiteralPath $ReportFile -Encoding utf8

$complete = @($records | Where-Object status -eq 'COMPLETE').Count
$duplicate = @($records | Where-Object { $_.issues -contains 'DUPLICATE_SOURCE_URL_CONSOLIDATED' -or $_.issues -contains 'POSSIBLE_DUPLICATE_TITLE' }).Count
[ordered]@{ totalUniqueRecipes=$records.Count; completeRecipes=$complete; recipesNeedingReview=$records.Count-$complete; duplicateFlaggedRecipes=$duplicate; unmatchedImageBundles=$unmatchedImageKeys.Count; outputFile=$OutputFile; reportFile=$ReportFile } | ConvertTo-Json
