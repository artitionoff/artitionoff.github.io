const CATS=["Завтрак","Обед","Ужин","Гарнир","Десерт","Другое"];
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function load(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
function store(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
let favs=load("cz_favs",[]), mine=load("cz_mine",[]);
let st={tab:"all",q:"",cat:"Все",open:null,err:""};
const all=()=>[...BASE_RECIPES,...mine];

function listHtml(){
  const q=st.q.toLowerCase();
  const rs=all().filter(r=>(st.tab!=="fav"||favs.includes(r.id))&&(st.cat==="Все"||r.category===st.cat)&&r.title.toLowerCase().includes(q));
  if(!rs.length) return `<p class="empty">${st.tab==="fav"?"В избранном пусто. Открой рецепт и нажми «В избранное».":"Ничего не найдено."}</p>`;
  return rs.map(r=>`<button class="card" data-act="open" data-v="${esc(r.id)}"><h3>${esc(r.title)}</h3><div class="meta">${esc(r.category)} · ${r.time} мин · ${r.servings} порц. · ${esc(r.level)}</div></button>`).join("");
}
function rowIng(){return `<div class="row"><input placeholder="Продукт" class="in-n"><input placeholder="Кол-во" class="in-a"><input placeholder="Ед." class="in-u"></div>`}
function rowStep(){return `<textarea rows="2" class="in-s" placeholder="Что сделать на этом шаге"></textarea>`}

function render(){
  document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("on",b.dataset.v===st.tab&&!st.open));
  const app=$("#app");
  app.className=st.open?"v-open":st.tab==="add"?"v-add":"v-list";
  if(st.open){
    const r=all().find(x=>x.id===st.open); if(!r){st.open=null;return render()}
    const isFav=favs.includes(r.id), own=mine.some(x=>x.id===r.id);
    app.innerHTML=`<button class="btn alt" data-act="back">Назад к списку</button>
      <h2>${esc(r.title)}</h2><p class="meta">${esc(r.category)} · ${r.time} мин · ${r.servings} порц. · ${esc(r.level)}</p>
      <button class="btn" data-act="fav" data-v="${esc(r.id)}">${isFav?"Убрать из избранного":"В избранное"}</button>
      <h3>Ингредиенты</h3><ul class="ing">${r.ingredients.map(i=>`<li>${esc(i.name)} — ${esc(i.amount)} ${esc(i.unit)}</li>`).join("")}</ul>
      <h3>Приготовление</h3><ol class="st">${r.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>
      ${own?`<button class="btn del" data-act="del" data-v="${esc(r.id)}">Удалить рецепт</button>`:""}`;
  } else if(st.tab==="add"){
    app.innerHTML=`<h2>Свой рецепт</h2><p class="meta">Заполни по шаблону и нажми «Сохранить рецепт».</p>
      <input id="f-title" placeholder="Название блюда">
      <select id="f-cat">${CATS.map(c=>`<option>${c}</option>`).join("")}</select>
      <div class="row" style="grid-template-columns:1fr 1fr 1fr">
        <input id="f-time" type="number" min="1" placeholder="Минут">
        <input id="f-serv" type="number" min="1" placeholder="Порций">
        <select id="f-lvl"><option>Легко</option><option>Средне</option><option>Сложно</option></select></div>
      <h3>Ингредиенты</h3><div id="ings">${rowIng()}${rowIng()}</div>
      <button class="btn alt" data-act="addIng">Ещё ингредиент</button>
      <h3>Шаги</h3><div id="steps">${rowStep()}</div>
      <button class="btn alt" data-act="addStep">Ещё шаг</button>
      <p class="msg" id="err">${esc(st.err)}</p>
      <button class="btn" data-act="save">Сохранить рецепт</button>`;
  } else {
    app.innerHTML=`<input id="q" type="search" placeholder="Найти рецепт" value="${esc(st.q)}">
      <div class="chips">${["Все",...CATS].map(c=>`<button class="${c===st.cat?"on":""}" data-act="cat" data-v="${c}">${c}</button>`).join("")}</div>
      <div id="list" class="in">${listHtml()}</div>`;
    $("#q").addEventListener("input",e=>{st.q=e.target.value;$("#list").classList.remove("in");$("#list").innerHTML=listHtml()});
  }
  window.scrollTo(0,0);
}

document.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]"); if(!b) return;
  const a=b.dataset.act, v=b.dataset.v;
  if(a==="tab"){st.tab=v;st.open=null;st.err="";return render()}
  if(a==="cat"){st.cat=v;return render()}
  if(a==="open"){st.open=v;return render()}
  if(a==="back"){st.open=null;return render()}
  if(a==="fav"){favs=favs.includes(v)?favs.filter(x=>x!==v):[...favs,v];store("cz_favs",favs);return render()}
  if(a==="del"){mine=mine.filter(x=>x.id!==v);favs=favs.filter(x=>x!==v);store("cz_mine",mine);store("cz_favs",favs);st.open=null;return render()}
  if(a==="addIng") $("#ings").insertAdjacentHTML("beforeend",rowIng());
  if(a==="addStep") $("#steps").insertAdjacentHTML("beforeend",rowStep());
  if(a==="save"){
    const ings=[...document.querySelectorAll("#ings .row")].map(r=>({name:r.querySelector(".in-n").value.trim(),amount:r.querySelector(".in-a").value.trim(),unit:r.querySelector(".in-u").value.trim()})).filter(i=>i.name);
    const steps=[...document.querySelectorAll(".in-s")].map(s=>s.value.trim()).filter(Boolean);
    const title=$("#f-title").value.trim();
    if(!title||!ings.length||!steps.length){$("#err").textContent="Нужны название, хотя бы один ингредиент и один шаг.";return}
    mine.push({id:"my"+Date.now(),title,category:$("#f-cat").value,time:+$("#f-time").value||0,servings:+$("#f-serv").value||1,level:$("#f-lvl").value,ingredients:ings,steps});
    store("cz_mine",mine); st.tab="all"; st.cat="Все"; render();
  }
});
render();
