
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

// Recipes filters
const recipeResults=$("#recipeResults");
if(recipeResults){
  const state={type:"all",time:"all",bake:"all",difficulty:"all",category:"all",search:""};
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
      const show=matchesSearch&&matchesType&&matchesBake&&matchesDiff&&matchesCat&&matchesTime;
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
  $("[data-reset-filters]")?.addEventListener("click",()=>{
    Object.assign(state,{type:"all",time:"all",bake:"all",difficulty:"all",category:"all",search:""});
    $("#recipeSearch").value="";$("#difficultyFilter").value="all";$("#categoryFilter").value="all";
    $$("[data-filter]").forEach(b=>b.classList.toggle("active",b.dataset.value==="all"));
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
  const state={budget:"all",place:"all",duration:"all",search:""};
  const cards=$$(".date-card",dateResults);
  function apply(){
    let visible=0;
    cards.forEach(c=>{
      const show=(state.budget==="all"||c.dataset.budget===state.budget)
        &&(state.place==="all"||c.dataset.place===state.place)
        &&(state.duration==="all"||c.dataset.duration===state.duration)
        &&(!state.search||c.dataset.search.includes(state.search));
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
}


// ===== V3 additions =====
const favoriteCatalog = {
  "recipe-lemon-biscuit": {type:"recipe", title:"עוגת ביסקוויטים לימון", meta:"מתכון · 30 דק׳", href:"recipe.html", image:"https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80"},
  "recipe-cookie": {type:"recipe", title:"עוגיות שוקולד צ׳יפס", meta:"מתכון · 25 דק׳", href:"recipe.html", image:"https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&q=80"},
  "recipe-pasta": {type:"recipe", title:"פסטה רוזה מושלמת", meta:"מתכון · 20 דק׳", href:"recipe.html", image:"https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=600&q=80"},
  "recipe-cheesecake": {type:"recipe", title:"עוגת גבינה אפויה", meta:"מתכון · 70 דק׳", href:"recipe.html", image:"https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80"},
  "recipe-shakshuka": {type:"recipe", title:"שקשוקה ביתית", meta:"מתכון · 20 דק׳", href:"recipe.html", image:"https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=600&q=80"},
  "date-1": {type:"date", title:"פיקניק שקיעה", meta:"דייט · תקציב נמוך", href:"date.html", image:"https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=600&q=80"},
  "gift-1": {type:"gift", title:"מארז ערב זוגי", meta:"מתנה · ₪159", href:"gifts.html", image:"https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80"},
  "game-heart": {type:"game", title:"דיבורים מהלב", meta:"משחק · ₪49", href:"game.html", icon:"🎲"}
};

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
}
