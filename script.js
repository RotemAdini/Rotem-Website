
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
  {id:"01",title:"עוגת ביסקוויטים פיסטוק",image:"images/biscuit-cakes/01-pistachio/IMG_5024.PNG"},
  {id:"02",title:"עוגת ביסקוויטים קרמבו",image:"images/biscuit-cakes/02-krembo/IMG_5008.JPEG"},
  {id:"03",title:"עוגת ביסקוויטים מוקה",image:"images/biscuit-cakes/03-mocha/IMG_5176.JPEG"},
  {id:"04",title:"עוגת ביסקוויטים קראנץ׳ נוטלה",image:null},
  {id:"05",title:"עוגת ביסקוויטים לימון ונענע",image:null},
  {id:"06",title:"עוגת ביסקוויטים קרפ",image:"images/biscuit-cakes/06-crepe/IMG_7314.JPEG"},
  {id:"07",title:"פירמידת ביסקוויטים כשרה לפסח",image:null},
  {id:"08",title:"עוגת ביסקוויטים אלפחורס",image:"images/biscuit-cakes/08-alfajores/IMG_3516.JPEG",images:["images/biscuit-cakes/08-alfajores/IMG_3516.JPEG","images/biscuit-cakes/08-alfajores/IMG_7727.JPEG"]},
  {id:"09",title:"כדורי ביסקוויטים",image:"images/biscuit-cakes/09-biscuit-balls/IMG_3511.JPEG",images:["images/biscuit-cakes/09-biscuit-balls/IMG_3511.JPEG","images/biscuit-cakes/09-biscuit-balls/IMG_3514.JPEG"]},
  {id:"10",title:"עוגת ביסקוויטים טריפל שוקולד",image:"images/biscuit-cakes/10-triple-chocolate/IMG_3512.JPEG",images:["images/biscuit-cakes/10-triple-chocolate/IMG_3512.JPEG","images/biscuit-cakes/10-triple-chocolate/IMG_3513.JPEG"]},
  {id:"11",title:"פצצת אוראו וביסקוויטים",image:"images/biscuit-cakes/11-oreo-bomb/IMG_9366.JPEG",images:["images/biscuit-cakes/11-oreo-bomb/IMG_9366.JPEG","images/biscuit-cakes/11-oreo-bomb/IMG_9387.JPEG"]},
  {id:"12",title:"עוגת ביסקוויטים פקאן סיני",image:null},
  {id:"13",title:"עוגת ביסקוויטים פירות יער",image:"images/biscuit-cakes/13-berries/IMG_3515.JPEG"},
  {id:"14",title:"עוגת ביסקוויטים באונטי",image:null}
];
const dateSeriesAB=[
  {id:"01",title:"דייט אוכל איטלקי",image:"images/date-series-a-b/01-italian-food/IMG_2453.JPEG",images:["images/date-series-a-b/01-italian-food/IMG_2453.JPEG","images/date-series-a-b/01-italian-food/IMG_2630.JPEG"]},
  {id:"02",title:"דייט ביר פונג",image:"images/date-series-a-b/02-beer-pong/IMG_2640.PNG",images:["images/date-series-a-b/02-beer-pong/IMG_2640.PNG","images/date-series-a-b/02-beer-pong/IMG_2641.JPEG"]},
  {id:"03",title:"ערב טעימות גבינות",image:"images/date-series-a-b/03-cheese-1/IMG_2645.PNG"},
  {id:"04",title:"ערב גבינות ויין",image:"images/date-series-a-b/04-cheese-2/IMG_2648.PNG",images:["images/date-series-a-b/04-cheese-2/IMG_2648.PNG","images/date-series-a-b/04-cheese-2/IMG_2651.JPEG"]},
  {id:"05",title:"דייט דגים",image:null},
  {id:"06",title:"דייט המבורגר",image:"images/date-series-a-b/06-burger/IMG_5367.PNG",images:["images/date-series-a-b/06-burger/IMG_2652.JPEG","images/date-series-a-b/06-burger/IMG_5367.PNG","images/date-series-a-b/06-burger/IMG_5423.JPEG"]},
  {id:"07",title:"ערב משחקי וידאו",image:"images/date-series-a-b/07-video-games/IMG_2656.JPEG",images:["images/date-series-a-b/07-video-games/IMG_2656.JPEG","images/date-series-a-b/07-video-games/IMG_2657.PNG"]},
  {id:"08",title:"דייט זריחה",image:"images/date-series-a-b/08-sunrise/IMG_3518.JPEG",images:["images/date-series-a-b/08-sunrise/IMG_3518.JPEG","images/date-series-a-b/08-sunrise/IMG_4482.JPEG"]},
  {id:"09",title:"סדנת חימר זוגית",image:"images/date-series-a-b/09-clay/IMG_2684.JPEG",images:["images/date-series-a-b/09-clay/IMG_2684.JPEG","images/date-series-a-b/09-clay/IMG_2689.JPEG"]},
  {id:"10",title:"דייט טניס",image:"images/date-series-a-b/10-tennis/IMG_2779.JPEG",images:["images/date-series-a-b/10-tennis/IMG_2779.JPEG","images/date-series-a-b/10-tennis/IMG_2780.JPEG"]},
  {id:"11",title:"ערב יצירה ויין",image:"images/date-series-a-b/11-crafts-and-wine/IMG_2658.JPEG"},
  {id:"12",title:"דייט צפייה בכוכבים",image:"images/date-series-a-b/12-stargazing/IMG_2799.JPEG",images:["images/date-series-a-b/12-stargazing/IMG_2799.JPEG","images/date-series-a-b/12-stargazing/IMG_2802.JPEG","images/date-series-a-b/12-stargazing/IMG_2831.JPEG"]},
  {id:"13",title:"דייט לגו זוגי",image:null}
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
  const meta=document.createElement("div"); meta.className="recipe-meta"; meta.innerHTML=`<span>סדרה #${item.id}</span><span>עוגות</span>`;
  body.append(heading,meta); card.append(fav,seriesImage(item,"recipe-image-placeholder"),body);
  return card;
}
function buildDateCard(item,{filterable=false}={}){
  const href=`date.html?series=date-a-b&item=${item.id}`;
  const card=document.createElement(filterable?"article":"a");
  card.className="date-card"+(filterable?" filter-item":"");
  if(filterable){
    card.dataset.search=`${item.title} סדרת דייטים א ב`; card.dataset.budget="medium"; card.dataset.place="outside"; card.dataset.duration="medium"; card.dataset.series="date-a-b";
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

// The games catalog is source-backed: its cards link directly to the migrated
// product landing pages in /games. Gift prototypes remain intentionally hidden.
$("#giftResults")?.replaceChildren();
if($("#giftCount"))$("#giftCount").textContent="0";
$$('img[src*="images.unsplash.com"]').forEach(image=>{image.removeAttribute("src");image.alt=""});

// Recipes filters
const recipeResults=$("#recipeResults");
if(recipeResults){
  const state={type:"all",time:"all",bake:"all",difficulty:"all",category:"all",series:"all",search:""};
  const cards=$$(".recipe-card.filter-item",recipeResults);
  function applyRecipeFilters(){
    let visible=0;
    cards.forEach(card=>{
      const matchesSearch=!state.search||card.dataset.search.includes(state.search);
      const matchesType=state.type==="all"||card.dataset.type===state.type;
      const matchesBake=state.bake==="all"||card.dataset.bake===state.bake;
      const matchesDiff=state.difficulty==="all"||card.dataset.difficulty===state.difficulty;
      const matchesCat=state.category==="all"||card.dataset.category===state.category;
      const matchesTime=state.time==="all"||Number(card.dataset.time)<=Number(state.time);
      const matchesSeries=state.series==="all"||card.dataset.series===state.series;
      const show=matchesSearch&&matchesType&&matchesBake&&matchesDiff&&matchesCat&&matchesTime&&matchesSeries;
      card.classList.toggle("is-hidden",!show); if(show)visible++;
    });
    $("#recipeCount").textContent=visible;
    $("#recipeEmpty").hidden=visible!==0;
  }
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
    Object.assign(state,{type:"all",time:"all",bake:"all",difficulty:"all",category:"all",series:"all",search:""});
    $("#recipeSearch").value="";$("#difficultyFilter").value="all";$("#categoryFilter").value="all";
    $$("[data-filter]").forEach(b=>b.classList.toggle("active",b.dataset.value==="all"));
    $$('[data-series-filter="recipes"]').forEach(b=>b.classList.remove("active"));
    applyRecipeFilters();
  });
  $("#sortRecipes")?.addEventListener("change",e=>{
    const mode=e.target.value;
    const sorted=[...cards].sort((a,b)=>{
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
  gameCards.forEach(c=>c.classList.toggle("is-hidden",value!=="all"&&c.dataset.kind!==value));
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

// Global search
const globalResults=$("#globalResults");
if(globalResults){
  // Search has no source-backed catalog entries yet. Remove its prototype rows,
  // while keeping the search controls and their empty-state behavior in place.
  globalResults.replaceChildren();
  const cards=$$(".global-result-card",globalResults);
  let type="all",term="";
  function applyGlobalSearch(){
    let visible=0;
    cards.forEach(c=>{
      const show=(type==="all"||c.dataset.type===type)&&(!term||c.dataset.search.includes(term));
      c.classList.toggle("is-hidden",!show);if(show)visible++;
    });
    $("#globalResultCount").textContent=visible;
    $("#globalEmpty").hidden=visible!==0;
  }
  $("#globalSearchInput")?.addEventListener("input",e=>{term=e.target.value.trim();applyGlobalSearch()});
  $$("[data-global-type]").forEach(btn=>btn.addEventListener("click",()=>{
    $$("[data-global-type]").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
    type=btn.dataset.globalType;applyGlobalSearch();
  }));
  applyGlobalSearch();
}
