
const $=(s,scope=document)=>scope.querySelector(s);
const $$=(s,scope=document)=>[...scope.querySelectorAll(s)];

const toast=$("#toast");
function showToast(message){
  if(!toast)return;
  toast.textContent=message;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(()=>toast.classList.remove("show"),2200);
}

$("#menuBtn")?.addEventListener("click",()=>$("#mainNav")?.classList.toggle("open"));
$$(".main-nav a").forEach(a=>a.addEventListener("click",()=>$("#mainNav")?.classList.remove("open")));

function getFavorites(){
  try{return JSON.parse(localStorage.getItem("rotemFavorites")||"[]")}catch{return[]}
}
function setFavorites(items){localStorage.setItem("rotemFavorites",JSON.stringify(items))}
function syncFavorites(){
  const favs=getFavorites();
  $$("[data-fav]").forEach(btn=>{
    const active=favs.includes(btn.dataset.fav);
    btn.classList.toggle("active",active);
    btn.textContent=active?"♥":"♡";
  });
}
document.addEventListener("click",(e)=>{
  const btn=e.target.closest("[data-fav]");
  if(!btn)return;
  e.preventDefault();e.stopPropagation();
  let favs=getFavorites(); const id=btn.dataset.fav;
  if(favs.includes(id)){favs=favs.filter(x=>x!==id);showToast("הוסר מהמועדפים")}
  else{favs.push(id);showToast("נשמר למועדפים ♡")}
  setFavorites(favs);syncFavorites();
});
syncFavorites();

$("#favoritesBtn")?.addEventListener("click",()=>showToast(getFavorites().length?`יש לך ${getFavorites().length} פריטים במועדפים`:"עדיין לא שמרת מועדפים"));

$(".category-prev")?.addEventListener("click",()=>$("#categories")?.scrollBy({left:420,behavior:"smooth"}));
$(".category-next")?.addEventListener("click",()=>$("#categories")?.scrollBy({left:-420,behavior:"smooth"}));

$$("[data-demo-form]").forEach(form=>form.addEventListener("submit",e=>{
  e.preventDefault();
  const type=form.dataset.demoForm;
  const messages={
    newsletter:"נרשמת לעדכונים בהצלחה ♡",
    contact:"הטופס נראה מעולה — כרגע זו הדגמה בלבד",
    login:"התחברות תהיה פעילה אחרי חיבור Backend",
    register:"הרשמה תהיה פעילה אחרי חיבור Backend"
  };
  showToast(messages[type]||"הפעולה כרגע במצב דמו");
  if(type==="newsletter"||type==="contact") form.reset();
}));

$$(".demo-buy").forEach(btn=>btn.addEventListener("click",()=>showToast("הרכישה תחובר לסליקה בשלב הפיתוח ♡")));

$("#copyRecipeLink")?.addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(location.href);showToast("הקישור הועתק ♡")}
  catch{showToast("אפשר להעתיק את הכתובת משורת הדפדפן")}
});

$$("[data-auth-tab]").forEach(btn=>btn.addEventListener("click",()=>{
  $$("[data-auth-tab]").forEach(b=>b.classList.toggle("active",b===btn));
  $$("[data-auth-panel]").forEach(p=>p.classList.toggle("active",p.dataset.authPanel===btn.dataset.authTab));
}));

// Source-backed editorial series. The page templates stay shared; query parameters
// supply the title and image for each series item without duplicating their layouts.
const biscuitCakeSeries=[
  {id:"01",title:"עוגת ביסקוויטים פיסטוק",image:"images/biscuit-cakes/01-pistachio/IMG_5024-web.PNG"},
  {id:"02",title:"עוגת ביסקוויטים קרמבו",image:"images/biscuit-cakes/02-krembo/IMG_5008-web.JPEG"},
  {id:"03",title:"עוגת ביסקוויטים מוקה",image:"images/biscuit-cakes/03-mocha/IMG_5176-web.JPEG"},
  {id:"04",title:"עוגת ביסקוויטים קראנץ׳ נוטלה",image:"images/biscuit-cakes/04-nutella-crunch/IMG_3692.JPEG"},
  {id:"05",title:"עוגת ביסקוויטים לימון ונענע",image:null},
  {id:"06",title:"עוגת ביסקוויטים קרפ",image:"images/biscuit-cakes/06-crepe/IMG_7314-web.JPEG"},
  {id:"07",title:"פירמידת ביסקוויטים כשרה לפסח",image:null},
  {id:"08",title:"עוגת ביסקוויטים אלפחורס",image:"images/biscuit-cakes/08-alfajores/IMG_3516-web.JPEG",images:["images/biscuit-cakes/08-alfajores/IMG_3516-web.JPEG","images/biscuit-cakes/08-alfajores/IMG_7727-web.JPEG"]},
  {id:"09",title:"כדורי ביסקוויטים",image:"images/biscuit-cakes/09-biscuit-balls/IMG_3511-web.JPEG",images:["images/biscuit-cakes/09-biscuit-balls/IMG_3511-web.JPEG","images/biscuit-cakes/09-biscuit-balls/IMG_3514-web.JPEG"]},
  {id:"10",title:"עוגת ביסקוויטים טריפל שוקולד",image:"images/biscuit-cakes/10-triple-chocolate/IMG_3512-web.JPEG",images:["images/biscuit-cakes/10-triple-chocolate/IMG_3512-web.JPEG","images/biscuit-cakes/10-triple-chocolate/IMG_3513-web.JPEG"]},
  {id:"11",title:"פצצת אוראו וביסקוויטים",image:"images/biscuit-cakes/11-oreo-bomb/IMG_9366-web.JPEG",images:["images/biscuit-cakes/11-oreo-bomb/IMG_9366-web.JPEG","images/biscuit-cakes/11-oreo-bomb/IMG_9387-web.JPEG"]},
  {id:"12",title:"עוגת ביסקוויטים פקאן סיני",image:"images/biscuit-cakes/12-chinese-pecan/IMG_3691.JPEG"},
  {id:"13",title:"עוגת ביסקוויטים פירות יער",image:"images/biscuit-cakes/13-berries/IMG_3515-web.JPEG"},
  {id:"14",title:"עוגת ביסקוויטים באונטי",image:"images/biscuit-cakes/14-bounty/IMG_3690.JPEG"}
];
// place/budget below are an estimate inferred from each title (e.g. "video
// games night" -> home, "tennis date" -> outside/low cost) — not data from
// Rotem — so the "where"/"budget" filters on the dates page have something
// real to match against instead of always returning zero results. Flagged
// to Rotem as a best-effort guess to confirm or correct with real values.
const dateSeriesAB=[
  {id:"01",title:"דייט אוכל איטלקי",image:"images/date-series-a-b/01-italian-food/IMG_2453-web.JPEG",images:["images/date-series-a-b/01-italian-food/IMG_2453-web.JPEG","images/date-series-a-b/01-italian-food/IMG_2630-web.JPEG"],place:"outside",budget:"medium"},
  {id:"02",title:"דייט ביר פונג",image:"images/date-series-a-b/02-beer-pong/IMG_2640-web.PNG",images:["images/date-series-a-b/02-beer-pong/IMG_2640-web.PNG","images/date-series-a-b/02-beer-pong/IMG_2641-web.JPEG"],place:"home",budget:"low"},
  {id:"03",title:"ערב טעימות גבינות",image:"images/date-series-a-b/03-cheese-1/IMG_2645-web.PNG",place:"home",budget:"medium"},
  {id:"04",title:"ערב גבינות ויין",image:"images/date-series-a-b/04-cheese-2/IMG_2648-web.PNG",images:["images/date-series-a-b/04-cheese-2/IMG_2648-web.PNG","images/date-series-a-b/04-cheese-2/IMG_2651-web.JPEG"],place:"home",budget:"high"},
  {id:"05",title:"דייט דגים",image:"images/date-series-a-b/05-fish/IMG_2153-web.JPEG",images:["images/date-series-a-b/05-fish/IMG_2153-web.JPEG","images/date-series-a-b/05-fish/IMG_2156-web.JPEG","images/date-series-a-b/05-fish/IMG_2160-web.JPEG","images/date-series-a-b/05-fish/IMG_2165-web.JPEG","images/date-series-a-b/05-fish/IMG_5332-web.JPEG"],place:"outside",budget:"medium"},
  {id:"06",title:"דייט המבורגר",image:"images/date-series-a-b/06-burger/IMG_5367-web.PNG",images:["images/date-series-a-b/06-burger/IMG_2652-web.JPEG","images/date-series-a-b/06-burger/IMG_5367-web.PNG","images/date-series-a-b/06-burger/IMG_5423-web.JPEG"],place:"outside",budget:"medium"},
  {id:"07",title:"ערב משחקי וידאו",image:"images/date-series-a-b/07-video-games/IMG_2656-web.JPEG",images:["images/date-series-a-b/07-video-games/IMG_2656-web.JPEG","images/date-series-a-b/07-video-games/IMG_2657-web.PNG"],place:"home",budget:"low"},
  {id:"08",title:"דייט זריחה",image:"images/date-series-a-b/08-sunrise/IMG_3518-web.JPEG",images:["images/date-series-a-b/08-sunrise/IMG_3518-web.JPEG","images/date-series-a-b/08-sunrise/IMG_4482-web.JPEG"],place:"outside",budget:"low"},
  {id:"09",title:"סדנת חימר זוגית",image:"images/date-series-a-b/09-clay/IMG_2684-web.JPEG",images:["images/date-series-a-b/09-clay/IMG_2684-web.JPEG","images/date-series-a-b/09-clay/IMG_2689-web.JPEG"],place:"outside",budget:"medium"},
  {id:"10",title:"דייט טניס",image:"images/date-series-a-b/10-tennis/IMG_2779-web.JPEG",images:["images/date-series-a-b/10-tennis/IMG_2779-web.JPEG","images/date-series-a-b/10-tennis/IMG_2780-web.JPEG"],place:"outside",budget:"low"},
  {id:"11",title:"ערב יצירה ויין",image:"images/date-series-a-b/11-crafts-and-wine/IMG_2658-web.JPEG",place:"home",budget:"medium"},
  {id:"12",title:"דייט צפייה בכוכבים",image:"images/date-series-a-b/12-stargazing/IMG_2799-web.JPEG",images:["images/date-series-a-b/12-stargazing/IMG_2799-web.JPEG","images/date-series-a-b/12-stargazing/IMG_2802-web.JPEG","images/date-series-a-b/12-stargazing/IMG_2831-web.JPEG"],place:"outside",budget:"low"},
  {id:"13",title:"דייט לגו זוגי",image:"images/date-series-a-b/13-lego/IMG_3640-web.JPEG",images:["images/date-series-a-b/13-lego/IMG_3640-web.JPEG","images/date-series-a-b/13-lego/IMG_3647-web.JPEG"],place:"home",budget:"low"}
];

function seriesImage(item,placeholderClass){
  if(item.image){
    const image=document.createElement("img");
    image.src=item.image; image.alt=item.title; image.loading="lazy";
    return image;
  }
  const placeholder=document.createElement("div");
  placeholder.className=placeholderClass;
  placeholder.setAttribute("role","img");
  placeholder.setAttribute("aria-label",item.title);
  return placeholder;
}

// Shared card builders — reused by the recipes/dates listing pages, the
// homepage highlights, and the "related" strips on the detail pages, so
// every real-content card on the site is built from the same source data.
function buildRecipeCard(item,{filterable=false}={}){
  const href=`recipe.html?series=biscuit-cake&item=${item.id}`;
  const card=document.createElement(filterable?"article":"a");
  card.className="recipe-card"+(filterable?" filter-item":"");
  if(filterable){
    card.dataset.search=`${item.title} עוגת ביסקוויטים`;
    card.dataset.category="cakes"; card.dataset.type="sweet"; card.dataset.bake="no-bake"; card.dataset.difficulty="easy"; card.dataset.time="30"; card.dataset.series="biscuit-cakes";
    const link=document.createElement("a");
    link.className="card-link"; link.href=href; link.setAttribute("aria-label",item.title);
    card.append(link);
  }else{
    card.href=href;
  }
  const fav=document.createElement("button");
  fav.className="fav-btn"; fav.type="button"; fav.dataset.fav=`biscuit-cake-${item.id}`; fav.setAttribute("aria-label","הוספה למועדפים"); fav.textContent="♡";
  const body=document.createElement("div"); body.className="recipe-body";
  const heading=document.createElement("h3"); heading.textContent=item.title;
  const meta=document.createElement("div"); meta.className="recipe-meta"; meta.innerHTML=`<span>פרק ${parseInt(item.id,10)} בסדרת עוגות הביסקוויטים</span><span>עוגות</span>`;
  body.append(heading,meta); card.append(fav,seriesImage(item,"recipe-image-placeholder"),body);
  return card;
}
function buildDateCard(item,{filterable=false}={}){
  const href=`date.html?series=date-a-b&item=${item.id}`;
  const card=document.createElement(filterable?"article":"a");
  card.className="date-card"+(filterable?" filter-item":"");
  if(filterable){
    card.dataset.search=`${item.title} סדרת דייטים א ב`; card.dataset.budget=item.budget||"medium"; card.dataset.place=item.place||"outside"; card.dataset.duration="medium"; card.dataset.series="date-a-b";
    const link=document.createElement("a");
    link.className="card-link"; link.href=href; link.setAttribute("aria-label",item.title);
    card.append(link);
  }else{
    card.href=href;
  }
  const imageWrap=document.createElement("div"); imageWrap.className="date-card-image"; imageWrap.append(seriesImage(item,"date-image-placeholder"));
  const tag=document.createElement("span"); tag.className="date-tag"; tag.textContent="סדרה"; imageWrap.append(tag);
  const body=document.createElement("div"); body.className="date-card-body";
  const heading=document.createElement("h3"); heading.textContent=item.title;
  const description=document.createElement("p"); description.textContent="מסדרת הדייטים א׳-ב׳";
  const footer=document.createElement("div"); footer.className="date-card-footer";
  const number=document.createElement("span"); number.textContent=`רעיון #${item.id}`;
  const fav=document.createElement("button"); fav.className="mini-heart"; fav.type="button"; fav.dataset.fav=`date-a-b-${item.id}`; fav.textContent="♡";
  footer.append(number,fav); body.append(heading,description,footer); card.append(imageWrap,body);
  return card;
}

function addSeriesListings(){
  const recipesRoot=$("#recipeResults");
  if(recipesRoot){
    recipesRoot.replaceChildren();
    biscuitCakeSeries.forEach(item=>recipesRoot.append(buildRecipeCard(item,{filterable:true})));
  }
  const datesRoot=$("#dateResults");
  if(datesRoot){
    datesRoot.replaceChildren();
    dateSeriesAB.forEach(item=>datesRoot.append(buildDateCard(item,{filterable:true})));
  }
}

// Builds the click-to-swap photo gallery under a detail page's hero image,
// when a series item has more than one real photo.
function addSeriesGallery(item,image){
  if(!image)return;
  const galleryImages=[item.image,...(item.images||[])].filter(Boolean)
    .filter((source,index,all)=>all.indexOf(source)===index);
  if(galleryImages.length<2)return;
  const gallery=document.createElement("div"); gallery.className="series-gallery";
  galleryImages.forEach((source,index)=>{
    const thumb=document.createElement("button"); thumb.type="button"; thumb.className="series-gallery-thumb";
    const thumbnail=document.createElement("img"); thumbnail.src=source; thumbnail.alt=`${item.title} – תמונה ${index+1}`;
    thumb.append(thumbnail); thumb.addEventListener("click",()=>{image.src=source;image.alt=item.title;gallery.querySelectorAll("button").forEach(button=>button.classList.remove("active"));thumb.classList.add("active")});
    if(index===0)thumb.classList.add("active"); gallery.append(thumb);
  });
  image.parentElement.append(gallery);
}

function pickRelated(list,excludeId,count){
  return list.filter(row=>row.image&&row.id!==excludeId).slice(0,count);
}

// recipe.html / date.html are shared templates. With a valid ?series=&item=
// query string they hydrate with the real photo, title and gallery for that
// item. Without one (or with an unrecognized one) the page keeps its default
// "not found" copy already in the HTML — no fabricated recipe is shown.
function hydrateSeriesDetail(){
  const params=new URLSearchParams(location.search);
  const series=params.get("series"), id=params.get("item");

  const recipeRelatedRoot=$("#relatedRecipes");
  if(recipeRelatedRoot){
    const item=series==="biscuit-cake"?biscuitCakeSeries.find(row=>row.id===id):null;
    if(item){
      const image=$(".recipe-main-image img");
      const titleEl=$("#recipeTitle");
      const crumb=$("#recipeCrumb");
      const notFoundText=$("#recipeNotFoundText");
      const favorite=$(".recipe-main-image [data-fav]");
      if(item.image&&image){image.src=item.image;image.alt=item.title}
      if(titleEl&&titleEl.firstChild)titleEl.firstChild.textContent=`${item.title} `;
      if(crumb)crumb.textContent=item.title;
      if(notFoundText)notFoundText.remove();
      if(favorite){favorite.dataset.fav=`biscuit-cake-${item.id}`;favorite.style.display=""}
      addSeriesGallery(item,image);
      document.title=`${item.title} | רותם עדיני`;
    }else{
      const favorite=$(".recipe-main-image [data-fav]");
      if(favorite)favorite.style.display="none";
    }
    recipeRelatedRoot.replaceChildren(...pickRelated(biscuitCakeSeries,item?.id,3).map(row=>buildRecipeCard(row)));
  }

  const dateRelatedRoot=$("#relatedDates");
  if(dateRelatedRoot){
    const item=series==="date-a-b"?dateSeriesAB.find(row=>row.id===id):null;
    if(item){
      const image=$(".date-detail-image img");
      const titleEl=$("#dateTitle");
      const crumb=$("#dateCrumb");
      const notFoundText=$("#dateNotFoundText");
      const favorite=$(".date-detail-image [data-fav]");
      if(item.image&&image){image.src=item.image;image.alt=item.title}
      if(titleEl&&titleEl.firstChild)titleEl.firstChild.textContent=`${item.title} `;
      if(crumb)crumb.textContent=item.title;
      if(notFoundText)notFoundText.remove();
      if(favorite){favorite.dataset.fav=`date-a-b-${item.id}`;favorite.style.display=""}
      addSeriesGallery(item,image);
      document.title=`${item.title} | רותם עדיני`;
    }else{
      const favorite=$(".date-detail-image [data-fav]");
      if(favorite)favorite.style.display="none";
    }
    dateRelatedRoot.replaceChildren(...pickRelated(dateSeriesAB,item?.id,3).map(row=>buildDateCard(row)));
  }
}

// The homepage "latest recipes" / "date ideas" panels used to show hardcoded
// demo cards. They now preview real, source-backed series items instead of
// sitting empty — reusing the same data and detail pages as the rest of the site.
function addHomeHighlights(){
  const homeRecipes=$(".home-recipes");
  if(homeRecipes){
    homeRecipes.replaceChildren();
    biscuitCakeSeries.filter(item=>item.image).slice(0,5).forEach(item=>homeRecipes.append(buildRecipeCard(item)));
  }
  const dateList=$(".date-list");
  if(dateList){
    dateList.replaceChildren();
    dateSeriesAB.filter(item=>item.image).slice(0,3).forEach(item=>{
      const card=document.createElement("a");
      card.className="date-item"; card.href=`date.html?series=date-a-b&item=${item.id}`;
      const body=document.createElement("div");
      const heading=document.createElement("h3"); heading.textContent=item.title;
      const desc=document.createElement("p"); desc.textContent="מסדרת הדייטים א׳-ב׳";
      const heart=document.createElement("span"); heart.textContent="♡";
      body.append(heading,desc,heart); card.append(seriesImage(item,"date-image-placeholder"),body); dateList.append(card);
    });
  }
}

function addSeriesFilters(){
  const recipeFilters=$("#recipeResults")?.closest(".filter-layout")?.querySelector("aside");
  if(recipeFilters){
    const group=document.createElement("div"); group.className="filter-group series-filter";
    group.innerHTML='<h3>סדרות</h3><div class="chips"><button class="chip" data-series-filter="recipes" data-value="biscuit-cakes">סדרת עוגות ביסקוויטים</button></div>';
    recipeFilters.append(group);
  }
  const dateFilters=$("#dateResults")?.closest("main")?.querySelector(".discovery-filter");
  if(dateFilters){
    const group=document.createElement("div"); group.className="filter-group inline-filter series-filter";
    group.innerHTML='<span>סדרות</span><div class="chips"><button class="chip" data-series-filter="dates" data-value="date-a-b">סדרת הא-ב</button></div>';
    dateFilters.append(group);
  }
}

addSeriesListings();
addSeriesFilters();
addHomeHighlights();
hydrateSeriesDetail();
syncFavorites();

// Reviewed spreadsheet imports live in the same recipes.json catalog as the
// existing inventory. Only records marked with a sequenceId are rendered here;
// this keeps the older inventory available without turning unreviewed rows into
// public recipe cards.
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]))}
// Cards use the small, web-optimized thumbnail first (falling back to the
// original photo if one isn't available); the detail page prefers the
// original full-resolution photo for its large hero image.
function reviewedRecipeCardImage(recipe){
  return recipe.images?.thumbnail||recipe.images?.main||recipe.images?.hero||null;
}
function reviewedRecipeHeroImage(recipe){
  return recipe.images?.main||recipe.images?.hero||recipe.images?.thumbnail||null;
}
// The Excel "series" column currently only ever names one grouping. Mapping it
// to the same slug the legacy biscuit-cake cards use lets the existing "סדרת
// עוגות ביסקוויטים" filter chip match these catalog records too.
const RECIPE_SERIES_SLUGS={"עוגות ביסקוויטים":"biscuit-cakes"};
function reviewedRecipeSeriesSlug(recipe){
  return RECIPE_SERIES_SLUGS[recipe.series]||"";
}
// Every recipe card keeps the same shape — link, media area, body — whether or
// not it has a photo, so cards without an image still reserve the same space
// and rows stay aligned instead of collapsing.
function reviewedRecipeMedia(recipe){
  const imageSrc=reviewedRecipeCardImage(recipe);
  if(imageSrc){
    const image=document.createElement("img");
    image.src=imageSrc;image.alt=recipe.title;image.loading="lazy";
    return image;
  }
  const placeholder=document.createElement("div");
  placeholder.className="recipe-image-placeholder";
  placeholder.setAttribute("role","img");
  placeholder.setAttribute("aria-label",recipe.title);
  return placeholder;
}
function reviewedRecipeCard(recipe){
  const card=document.createElement("article");
  card.className="recipe-card filter-item";
  card.dataset.search=`${recipe.title} ${recipe.foodType||""}`;
  card.dataset.category=recipe.categorySlug||"all";
  card.dataset.type=recipe.siteCategory==="עוגות וקינוחים"?"sweet":"savory";
  card.dataset.bake="regular";
  card.dataset.difficulty=recipe.difficultySlug||"all";
  card.dataset.time=String(recipe.prepTimeMinutes||0);
  card.dataset.series=reviewedRecipeSeriesSlug(recipe);
  card.dataset.tags=(recipe.tags||[]).join(" ");
  const link=document.createElement("a");link.className="card-link";link.href=`recipe.html?recipe=${encodeURIComponent(recipe.id)}`;link.setAttribute("aria-label",recipe.title);
  const fav=document.createElement("button");fav.className="fav-btn";fav.type="button";fav.dataset.fav=`recipe-${recipe.id}`;fav.setAttribute("aria-label","הוספה למועדפים");fav.textContent="♡";
  const body=document.createElement("div");body.className="recipe-body";
  const heading=document.createElement("h3");heading.textContent=recipe.title;
  const meta=document.createElement("div");meta.className="recipe-meta";
  const category=document.createElement("span");category.textContent=recipe.siteCategory||recipe.foodType||"";
  const timing=document.createElement("span");timing.textContent=recipe.prepTimeMinutes?`${recipe.prepTimeMinutes} דק׳`:"";
  meta.append(category,timing);body.append(heading,meta);
  card.append(link,fav,reviewedRecipeMedia(recipe),body);
  return card;
}
// A source line that's really a sub-heading for the ingredients that follow
// it (e.g. "לרוטב טחינה ביתי:", "מצרכים לקרמל") rather than an ingredient in
// its own right — shown as a label instead of a checkable item so it can't be
// mistaken for something to buy or measure.
function isIngredientHeading(line){
  const text=(line||"").trim();
  if(!text)return false;
  if(/\d/.test(text))return false;
  return /[:﹕]$/.test(text)||/^מצרכים(\s|$)/.test(text);
}
// Source instructions are sometimes already numbered ("1.\t...", "2.\t...")
// from the original document, and the template also numbers each step —
// producing a visible double number. Strip the prefix only when it matches
// this step's own position, so an instruction that genuinely starts with an
// unrelated number is left untouched.
function stripRedundantStepNumber(text,stepNumber){
  const match=/^\s*(\d+)[.\)]\s*/.exec(text||"");
  if(match&&Number(match[1])===stepNumber)return text.slice(match[0].length);
  return text;
}
function renderReviewedRecipeDetail(recipe){
  const main=document.querySelector("main.page-main");if(!main)return;
  const ingredients=(recipe.ingredients||[]).map(item=>isIngredientHeading(item)
    ?`<div class="ingredient-heading">${escapeHtml(item)}</div>`
    :`<label class="ingredient-check"><input type="checkbox"><span>${escapeHtml(item)}</span></label>`).join("");
  const instructions=(recipe.instructions||[]).map((item,index)=>`<li><span class="step-number">${index+1}</span><div><h3>שלב ${index+1}</h3><p>${escapeHtml(stripRedundantStepNumber(item,index+1))}</p></div></li>`).join("");
  const imageSrc=reviewedRecipeHeroImage(recipe);
  const favBtn=`<button class="fav-btn large-fav" data-fav="recipe-${escapeHtml(recipe.id)}" type="button" aria-label="שמירה למועדפים">♡</button>`;
  const visual=imageSrc?`<div class="recipe-main-image"><img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(recipe.title)}">${favBtn}</div>`:`<div class="recipe-main-image no-image-fav-slot">${favBtn}</div>`;
  const note=recipe.notes?`<div class="tip-box"><strong>שימו לב</strong><p>${escapeHtml(recipe.notes)}</p></div>`:"";
  main.innerHTML=`<section class="recipe-detail-hero container reviewed-recipe-hero ${imageSrc?"has-recipe-image":"no-recipe-image"}"><a class="recipe-back-link" href="recipes.html" aria-label="חזרה לכל המתכונים"><span aria-hidden="true">→</span> לכל המתכונים</a>${visual}<div class="recipe-intro"><div class="breadcrumbs"><a href="recipes.html">מתכונים</a><span>›</span><span>${escapeHtml(recipe.siteCategory||recipe.foodType||"מתכון")}</span></div><h1>${escapeHtml(recipe.title)}</h1><p>${escapeHtml(recipe.foodType||"")}</p><div class="recipe-stats"><div><strong>${escapeHtml(recipe.siteCategory||"—")}</strong><span>קטגוריה</span></div><div><strong>${escapeHtml(recipe.difficulty||"—")}</strong><span>רמת קושי</span></div><div><strong>${recipe.prepTimeMinutes?`${recipe.prepTimeMinutes} דק׳`:"—"}</strong><span>זמן הכנה</span></div><div><strong>${escapeHtml(recipe.publishedDate||"—")}</strong><span>פורסם</span></div></div>${note}<div class="recipe-actions"><a class="btn btn-primary" href="${escapeHtml(recipe.sourceUrl)}" target="_blank" rel="noopener">לצפייה בפוסט באינסטגרם</a><a class="btn btn-secondary" href="recipes.html">לכל המתכונים</a></div></div></section><section class="container recipe-content-grid reviewed-recipe-content"><aside class="ingredients-card panel"><span class="section-kicker">מצרכים</span><h2>מה צריך?</h2>${ingredients||"<p>אין רשימת מצרכים זמינה.</p>"}</aside><article class="instructions-card panel"><span class="section-kicker">אופן הכנה</span><h2>איך מכינים?</h2><ol class="steps-list">${instructions||"<li><div><p>אין הוראות הכנה זמינות.</p></div></li>"}</ol></article></section>`;
  document.title=`${recipe.title} | רותם עדיני`;
}
// Source dates are DD/MM/YYYY. Anything unparseable sorts to the very end
// (oldest) rather than breaking the newest-first order of everything else.
function parseIsraeliDate(value){
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec((value||"").trim());
  if(!m)return null;
  return new Date(Number(m[3]),Number(m[2])-1,Number(m[1])).getTime();
}
function biscuitSeriesFolderId(path){
  const m=/images\/biscuit-cakes\/(\d+)-/.exec(path||"");
  return m?m[1]:null;
}
// A few legacy "biscuit cake series" stand-ins don't have a photo yet, so they
// can't be matched by image path — but their catalog record's title confirms
// they're the same recipe (just a slightly different title/word order once the
// real content arrived), so they're still deduplicated by title here.
const BISCUIT_SERIES_TITLE_MATCH={
  "עוגת קראנץ׳ נוטלה":"04",
  "עוגת ביסקוויטים לימונענע":"05",
  "עוגת ביסקוויטים באונטי":"14"
};
// Populates the (data-driven, never invented) tag filter chips once the
// catalog is loaded and we know which tags actually occur in the data.
function addTagFilters(items){
  const tags=[...new Set(items.flatMap(r=>r.tags||[]))];
  const panel=$("#recipeResults")?.closest(".filter-layout")?.querySelector("aside");
  if(!tags.length||!panel||panel.querySelector(".tag-filter"))return;
  const group=document.createElement("div");group.className="filter-group tag-filter";
  const chipsHtml=tags.map(tag=>`<button class="chip" data-tag-filter="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join("");
  group.innerHTML=`<h3>תגיות</h3><div class="chips"><button class="chip active" data-tag-filter="all">הכל</button>${chipsHtml}</div>`;
  panel.append(group);
  group.querySelectorAll("[data-tag-filter]").forEach(btn=>btn.addEventListener("click",()=>{
    group.querySelectorAll("[data-tag-filter]").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    window.__recipeFilters?.setTag(btn.dataset.tagFilter);
  }));
}
async function loadReviewedRecipes(){
  try{
    const response=await fetch("data/recipes.json");if(!response.ok)return;
    const catalog=await response.json();const reviewed=(catalog.recipes||[]).filter(recipe=>Number.isInteger(recipe.sequenceId)&&recipe.status==="COMPLETE"&&recipe.ingredients?.length&&recipe.instructions?.length);
    const results=$("#recipeResults");
    if(results){
      // A few launch recipes are the exact same photo as a legacy "biscuit cake
      // series" stand-in card already rendered by addSeriesListings(). Now that
      // the fuller catalog record for that photo exists, drop the stand-in so
      // the recipe shows once instead of twice.
      const coveredBiscuitIds=new Set(reviewed.map(r=>biscuitSeriesFolderId(r.images?.thumbnail)||biscuitSeriesFolderId(r.images?.main)||biscuitSeriesFolderId(r.images?.hero)||BISCUIT_SERIES_TITLE_MATCH[r.title]).filter(Boolean));
      $$('.recipe-card[data-series="biscuit-cakes"]',results).forEach(card=>{
        const href=card.querySelector("a")?.getAttribute("href")||"";
        const match=/item=(\d+)/.exec(href);
        if(match&&coveredBiscuitIds.has(match[1]))card.remove();
      });
      // A couple of catalog records are the same recipe posted to Instagram
      // twice; only the more complete one renders as a card (see the
      // DUPLICATE_OF_* issue tags) — the other keeps its data and URL, it just
      // isn't shown a second time.
      const listItems=reviewed.filter(recipe=>!(recipe.issues||[]).some(issue=>issue.startsWith("DUPLICATE_OF")));
      listItems.sort((a,b)=>(parseIsraeliDate(b.publishedDate)||0)-(parseIsraeliDate(a.publishedDate)||0));
      // Remaining legacy cards (no catalog record yet) have no publish date, so
      // they sink to the end, after every dated recipe, newest to oldest.
      const remainingLegacyCards=$$(".recipe-card",results);
      listItems.forEach(recipe=>results.append(reviewedRecipeCard(recipe)));
      remainingLegacyCards.forEach(card=>results.append(card));
      addTagFilters(listItems);
      $("#recipeSearch")?.dispatchEvent(new Event("input"));
    }
    const recipeId=new URLSearchParams(location.search).get("recipe");
    const recipe=reviewed.find(item=>item.id===recipeId);if(recipe)renderReviewedRecipeDetail(recipe);
  }catch{ /* A static preview can still show the existing catalog if data is unavailable. */ }
}
// The reviewed catalog is only ever rendered on the recipes board or a recipe
// detail page — skip the ~500KB fetch everywhere else (dates, games...).
if(document.body.dataset.page==="recipes")loadReviewedRecipes();

// Homepage category strip: each category's photo is the most recently
// published FOOD recipe in that category that actually has a photo yet
// (skipping newer recipes in the same category that don't have one).
// The same fetch also refreshes the "latest recipes" panel below the hero —
// previously always the same 5 legacy series cards regardless of real
// publish dates — so both use one shared ~500KB request instead of two.
async function loadHomeCategoryImages(){
  const categoryLinks=$$(".category");
  const homeRecipes=$(".home-recipes");
  if(!categoryLinks.length&&!homeRecipes)return;
  try{
    const response=await fetch("data/recipes.json");if(!response.ok)return;
    const catalog=await response.json();
    const reviewed=(catalog.recipes||[]).filter(recipe=>Number.isInteger(recipe.sequenceId)&&recipe.status==="COMPLETE"&&recipe.ingredients?.length&&recipe.instructions?.length&&!(recipe.issues||[]).some(issue=>issue.startsWith("DUPLICATE_OF")));
    if(homeRecipes){
      const latest=[...reviewed].filter(recipe=>reviewedRecipeCardImage(recipe))
        .sort((a,b)=>(parseIsraeliDate(b.publishedDate)||0)-(parseIsraeliDate(a.publishedDate)||0))
        .slice(0,5);
      if(latest.length){homeRecipes.replaceChildren(...latest.map(recipe=>reviewedRecipeCard(recipe)))}
    }
    categoryLinks.forEach(link=>{
      const params=new URLSearchParams((link.getAttribute("href")||"").split("?")[1]);
      const categorySlug=params.get("category");if(!categorySlug)return;
      const inCategory=reviewed.filter(recipe=>recipe.categorySlug===categorySlug).sort((a,b)=>(parseIsraeliDate(b.publishedDate)||0)-(parseIsraeliDate(a.publishedDate)||0));
      const latestWithImage=inCategory.find(recipe=>reviewedRecipeCardImage(recipe));
      const image=link.querySelector("img");if(!image)return;
      // No recipe (or none with a photo yet) in this category: swap in the
      // same round "no photo" placeholder used elsewhere, instead of leaving
      // a stripped <img> with no src (which renders as an empty circle).
      if(!latestWithImage){
        const placeholder=document.createElement("div");
        placeholder.className="category-placeholder";
        placeholder.setAttribute("role","img");
        placeholder.setAttribute("aria-label",link.querySelector("span")?.textContent||"");
        image.replaceWith(placeholder);
        return;
      }
      image.src=reviewedRecipeCardImage(latestWithImage);
      image.alt=link.querySelector("span")?.textContent||latestWithImage.title;
    });
  }catch{ /* Category thumbnails simply stay off rather than showing a broken image. */ }
}
if(document.body.dataset.page==="home")loadHomeCategoryImages();

// The games catalog is source-backed: its cards link directly to the migrated
// product landing pages in /games. Gift prototypes remain intentionally hidden.
$("#giftResults")?.replaceChildren();
if($("#giftCount"))$("#giftCount").textContent="0";
$$('img[src*="images.unsplash.com"]').forEach(image=>{image.removeAttribute("src");image.alt=""});

// Recipes filters
const recipeResults=$("#recipeResults");
if(recipeResults){
  const state={type:"all",time:"all",bake:"all",difficulty:"all",category:"all",series:"all",tag:"all",search:""};
  const cards=()=>$$(".recipe-card.filter-item",recipeResults);
  function applyRecipeFilters(){
    let visible=0;
    cards().forEach(card=>{
      const matchesSearch=!state.search||card.dataset.search.includes(state.search);
      const matchesType=state.type==="all"||card.dataset.type===state.type;
      const matchesBake=state.bake==="all"||card.dataset.bake===state.bake;
      const matchesDiff=state.difficulty==="all"||card.dataset.difficulty===state.difficulty;
      const matchesCat=state.category==="all"||card.dataset.category===state.category;
      const matchesTime=state.time==="all"||Number(card.dataset.time)<=Number(state.time);
      const matchesSeries=state.series==="all"||card.dataset.series===state.series;
      const matchesTag=state.tag==="all"||(card.dataset.tags||"").split(" ").includes(state.tag);
      const show=matchesSearch&&matchesType&&matchesBake&&matchesDiff&&matchesCat&&matchesTime&&matchesSeries&&matchesTag;
      card.classList.toggle("is-hidden",!show); if(show)visible++;
    });
    $("#recipeCount").textContent=visible;
    $("#recipeEmpty").hidden=visible!==0;
  }
  // Small bridge so the tag chips — created later, once the catalog has
  // loaded and we know which tags exist — can reach this filter state.
  window.__recipeFilters={setTag(value){state.tag=value;applyRecipeFilters()}};
  $$("[data-filter]").forEach(btn=>btn.addEventListener("click",()=>{
    const key=btn.dataset.filter;
    $$(`[data-filter="${key}"]`).forEach(b=>b.classList.remove("active"));
    btn.classList.add("active"); state[key]=btn.dataset.value; applyRecipeFilters();
  }));
  $("#recipeSearch")?.addEventListener("input",e=>{state.search=e.target.value.trim();applyRecipeFilters()});
  $("#difficultyFilter")?.addEventListener("change",e=>{state.difficulty=e.target.value;applyRecipeFilters()});
  $("#categoryFilter")?.addEventListener("change",e=>{state.category=e.target.value;applyRecipeFilters()});
  $$('[data-series-filter="recipes"]').forEach(btn=>btn.addEventListener("click",()=>{state.series=state.series===btn.dataset.value?"all":btn.dataset.value;btn.classList.toggle("active",state.series===btn.dataset.value);applyRecipeFilters()}));
  $("[data-reset-filters]")?.addEventListener("click",()=>{
    Object.assign(state,{type:"all",time:"all",bake:"all",difficulty:"all",category:"all",series:"all",tag:"all",search:""});
    $("#recipeSearch").value="";$("#difficultyFilter").value="all";$("#categoryFilter").value="all";
    $$("[data-filter]").forEach(b=>b.classList.toggle("active",b.dataset.value==="all"));
    $$('[data-series-filter="recipes"]').forEach(b=>b.classList.remove("active"));
    $$("[data-tag-filter]").forEach(b=>b.classList.toggle("active",b.dataset.tagFilter==="all"));
    applyRecipeFilters();
  });
  $("#sortRecipes")?.addEventListener("change",e=>{
    const mode=e.target.value;
    const sorted=[...cards()].sort((a,b)=>{
      if(mode==="time-asc")return Number(a.dataset.time)-Number(b.dataset.time);
      if(mode==="name")return a.dataset.search.localeCompare(b.dataset.search,"he");
      return 0;
    });
    sorted.forEach(c=>recipeResults.appendChild(c));
  });

  const params=new URLSearchParams(location.search);
  const cat=params.get("category"); const quick=params.get("quick");
  if(cat){state.category=cat;$("#categoryFilter").value=cat}
  if(quick==="30"){state.time="30";$$('[data-filter="time"]').forEach(b=>b.classList.toggle("active",b.dataset.value==="30"))}
  if(quick==="no-bake"){state.bake="no-bake";$$('[data-filter="bake"]').forEach(b=>b.classList.toggle("active",b.dataset.value==="no-bake"))}
  if(quick==="easy"){state.difficulty="easy";$("#difficultyFilter").value="easy"}
  applyRecipeFilters();
}

// Dates filters
const dateResults=$("#dateResults");
if(dateResults){
  const state={budget:"all",place:"all",duration:"all",series:"all",search:""};
  const cards=$$(".date-card",dateResults);
  function apply(){
    let visible=0;
    cards.forEach(c=>{
      const show=(state.budget==="all"||c.dataset.budget===state.budget)
        &&(state.place==="all"||c.dataset.place===state.place)
        &&(state.duration==="all"||c.dataset.duration===state.duration)
        &&(!state.search||c.dataset.search.includes(state.search))
        &&(state.series==="all"||c.dataset.series===state.series);
      c.classList.toggle("is-hidden",!show); if(show)visible++;
    });
    $("#dateCount").textContent=visible;$("#dateEmpty").hidden=visible!==0;
  }
  $$("[data-date-filter]").forEach(btn=>btn.addEventListener("click",()=>{
    const key=btn.dataset.dateFilter;
    $$(`[data-date-filter="${key}"]`).forEach(b=>b.classList.remove("active"));btn.classList.add("active");
    state[key]=btn.dataset.value;apply();
  }));
  $("#dateDuration")?.addEventListener("change",e=>{state.duration=e.target.value;apply()});
  $("#dateSearch")?.addEventListener("input",e=>{state.search=e.target.value.trim();apply()});
  $$('[data-series-filter="dates"]').forEach(btn=>btn.addEventListener("click",()=>{state.series=state.series===btn.dataset.value?"all":btn.dataset.value;btn.classList.toggle("active",state.series===btn.dataset.value);apply()}));
  apply();
}

// Games
const gameCards=$$(".shop-card[data-kind]");
$$("[data-game-filter]").forEach(btn=>btn.addEventListener("click",()=>{
  $$("[data-game-filter]").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
  const value=btn.dataset.gameFilter;
  let visible=0;
  gameCards.forEach(c=>{
    const show=value==="all"||c.dataset.kind===value;
    c.classList.toggle("is-hidden",!show);if(show)visible++;
  });
  if($("#gamesEmpty"))$("#gamesEmpty").hidden=visible!==0;
}));

// Gifts
const giftResults=$("#giftResults");
if(giftResults){
  const state={occasion:"all",budget:"all"};const cards=$$(".gift-shop-card",giftResults);
  function apply(){let visible=0;cards.forEach(c=>{const show=(state.occasion==="all"||c.dataset.occasion===state.occasion)&&(state.budget==="all"||c.dataset.budget===state.budget);c.classList.toggle("is-hidden",!show);if(show)visible++});$("#giftCount").textContent=visible;$("#giftEmpty").hidden=visible!==0}
  $$("[data-gift-filter]").forEach(btn=>btn.addEventListener("click",()=>{$$("[data-gift-filter]").forEach(b=>b.classList.remove("active"));btn.classList.add("active");state.occasion=btn.dataset.value;apply()}));
  $("#giftBudget")?.addEventListener("change",e=>{state.budget=e.target.value;apply()});
  apply();
}


// ===== V3 additions =====
const favoriteCatalog=Object.fromEntries([
  ...biscuitCakeSeries.map(item=>[`biscuit-cake-${item.id}`,{type:"recipe",title:item.title,meta:`סדרת עוגות ביסקוויטים · #${item.id}`,href:`recipe.html?series=biscuit-cake&item=${item.id}`,image:item.image}]),
  ...dateSeriesAB.map(item=>[`date-a-b-${item.id}`,{type:"date",title:item.title,meta:`סדרת הא-ב · #${item.id}`,href:`date.html?series=date-a-b&item=${item.id}`,image:item.image}])
]);

const favoritesGrid = $("#favoritesGrid");
if(favoritesGrid){
  let currentType="all";
  function renderFavorites(){
    const ids=getFavorites();
    const rows=ids.map(id=>({id,...favoriteCatalog[id]})).filter(x=>x.title).filter(x=>currentType==="all"||x.type===currentType);
    favoritesGrid.innerHTML=rows.map(item=>`
      <article class="favorite-card">
        <a href="${item.href}">
          ${item.image?`<img src="${item.image}" alt="${item.title}">`:`<div class="favorite-placeholder">${item.icon||"♡"}</div>`}
          <div class="favorite-card-body"><h3>${item.title}</h3><small>${item.meta}</small></div>
        </a>
        <button class="mini-heart active" data-fav="${item.id}" type="button">♥</button>
      </article>
    `).join("");
    $("#favoritesEmpty").style.display=rows.length?"none":"block";
  }
  $$("[data-favorite-tab]").forEach(btn=>btn.addEventListener("click",()=>{
    $$("[data-favorite-tab]").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
    currentType=btn.dataset.favoriteTab;renderFavorites();
  }));
  document.addEventListener("click",e=>{if(e.target.closest("[data-fav]"))setTimeout(renderFavorites,0)});
  renderFavorites();
  // Recipes from the reviewed catalog are favorited as "recipe-<id>", which
  // isn't in the static favoriteCatalog above (that only covers the two
  // hardcoded legacy series) — resolve those lazily from the same JSON the
  // recipes board uses, then re-render once we know their title/image/link.
  if(getFavorites().some(id=>id.startsWith("recipe-"))){
    fetch("data/recipes.json").then(r=>r.ok?r.json():null).then(catalog=>{
      (catalog?.recipes||[]).forEach(recipe=>{
        favoriteCatalog[`recipe-${recipe.id}`]={type:"recipe",title:recipe.title,meta:recipe.siteCategory||recipe.foodType||"",href:`recipe.html?recipe=${encodeURIComponent(recipe.id)}`,image:reviewedRecipeCardImage(recipe)};
      });
      renderFavorites();
    }).catch(()=>{ /* Favorites from the reviewed catalog just won't resolve; the rest still render. */ });
  }
}

// Demo auth redirect
$$("[data-demo-form='login'],[data-demo-form='register']").forEach(form=>{
  form.addEventListener("submit",()=>{
    const redirect=form.querySelector("[data-redirect]")?.dataset.redirect;
    if(redirect)setTimeout(()=>location.href=redirect,500);
  });
});

// Playable demo game
const questions=[
  {type:"שאלה",q:"מה הדבר הכי קטן שאני עושה שגורם לך להרגיש אהוב/ה?",hint:"אין תשובה נכונה. קחו רגע וענו באמת."},
  {type:"זיכרון",q:"איזה רגע קטן שלנו היית רוצה לחוות שוב בדיוק כמו שהיה?",hint:"גם רגע יומיומי נחשב."},
  {type:"בחירה",q:"אם מחר יש לנו יום חופשי לגמרי — מה הדבר הראשון שהיית רוצה שנעשה?",hint:"בלי לחשוב על תקציב או לוגיסטיקה."},
  {type:"משימה",q:"כל אחד אומר שלושה דברים שהוא מעריך בשני — בלי לחזור על דברים שכבר אמרתם בעבר.",hint:"כן, גם דברים קטנים."},
  {type:"שאלה",q:"מה הדבר שאנחנו עושים יחד ותמיד מצליח לשפר לך את מצב הרוח?",hint:"נסו להבין למה דווקא הוא."},
  {type:"משימה",q:"בחרו שיר שמזכיר לכם אחד את השני והשמיעו אותו עכשיו.",hint:"בלי להסביר קודם למה בחרתם אותו."},
  {type:"שאלה",q:"איזה הרגל זוגי קטן היית רוצה שנאמץ בחודש הקרוב?",hint:"משהו שאפשר באמת לעשות."},
  {type:"בונוס",q:"מי שענה אחרון בוחר מה אוכלים לקינוח.",hint:"סיימתם את סבב הדמו ♡"}
];
let qIndex=0;
function renderQuestion(){
  if(!$("#playQuestion"))return;
  $("#playType").textContent=questions[qIndex].type;
  $("#playQuestion").textContent=questions[qIndex].q;
  $("#playHint").textContent=questions[qIndex].hint;
  $("#gameProgress").textContent=`שאלה ${qIndex+1} מתוך ${questions.length}`;
}
$("#nextQuestion")?.addEventListener("click",()=>{qIndex=(qIndex+1)%questions.length;renderQuestion()});
$("#prevQuestion")?.addEventListener("click",()=>{qIndex=(qIndex-1+questions.length)%questions.length;renderQuestion()});
$("#restartGame")?.addEventListener("click",()=>{qIndex=0;renderQuestion();showToast("המשחק התחיל מחדש")});
renderQuestion();

// Checkout demo
$("#couponBtn")?.addEventListener("click",()=>showToast("קוד הקופון יחובר במערכת האמיתית"));
$$("[data-demo-form='checkout']").forEach(form=>form.addEventListener("submit",()=>{
  setTimeout(()=>{location.href="dashboard.html"},600);
}));

// Global search — indexes the real recipe/date/game catalogs so a search
// actually finds something, instead of always showing the empty state.
// Gifts have no real catalog yet (see the gifts section above, which keeps
// that shop intentionally empty), so gift results legitimately stay at zero
// until there's real content to index.
const GLOBAL_GAMES_CATALOG=[
  {title:"היער הקסום",meta:"משחק דיגיטלי · שאלות עומק",href:"games/forest-game.html"},
  {title:"מירוץ האהבה",meta:"משחק דיגיטלי · תחרות",href:"games/race-game.html"},
  {title:"משחק הזיכרון הגדול",meta:"משחק דיגיטלי · זיכרונות וצחוק",href:"games/memory-game.html"},
  {title:"החבילה המלאה",meta:"חבילה דיגיטלית · שלושה משחקים",href:"games/bundle.html"}
];
const globalResults=$("#globalResults");
if(globalResults){
  let type="all",term="",index=[];
  function renderGlobalResults(){
    const filtered=index.filter(item=>(type==="all"||item.type===type)&&(!term||item.search.includes(term)));
    globalResults.innerHTML=filtered.map(item=>`
      <a class="global-result-card" href="${item.href}">
        <span class="result-type">${item.typeLabel}</span>
        ${item.image?`<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">`:`<div class="result-placeholder">♡</div>`}
        <div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.meta)}</p></div>
      </a>`).join("");
    $("#globalResultCount").textContent=filtered.length;
    $("#globalEmpty").hidden=filtered.length!==0;
  }
  $("#globalSearchInput")?.addEventListener("input",e=>{term=e.target.value.trim().toLowerCase();renderGlobalResults()});
  $$("[data-global-type]").forEach(btn=>btn.addEventListener("click",()=>{
    $$("[data-global-type]").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
    type=btn.dataset.globalType;renderGlobalResults();
  }));
  index=[
    ...dateSeriesAB.map(item=>({type:"date",typeLabel:"דייט",title:item.title,meta:"מסדרת הדייטים א׳-ב׳",href:`date.html?series=date-a-b&item=${item.id}`,image:item.image,search:item.title.toLowerCase()})),
    ...GLOBAL_GAMES_CATALOG.map(g=>({type:"game",typeLabel:"משחק",...g,search:(g.title+" "+g.meta).toLowerCase()}))
  ];
  renderGlobalResults();
  fetch("data/recipes.json").then(r=>r.ok?r.json():null).then(catalog=>{
    const reviewed=(catalog?.recipes||[]).filter(recipe=>Number.isInteger(recipe.sequenceId)&&recipe.status==="COMPLETE"&&recipe.ingredients?.length&&recipe.instructions?.length&&!(recipe.issues||[]).some(issue=>issue.startsWith("DUPLICATE_OF")));
    index.push(...reviewed.map(recipe=>({type:"recipe",typeLabel:"מתכון",title:recipe.title,meta:recipe.siteCategory||recipe.foodType||"מתכון",href:`recipe.html?recipe=${encodeURIComponent(recipe.id)}`,image:reviewedRecipeCardImage(recipe),search:`${recipe.title} ${recipe.foodType||""} ${(recipe.tags||[]).join(" ")}`.toLowerCase()})));
    renderGlobalResults();
  }).catch(()=>{ /* Recipe results just won't be searchable if the catalog fails to load; dates/games still work. */ });
}
