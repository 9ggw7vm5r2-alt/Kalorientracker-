window.KC_BUILD='V21';

const $=id=>document.getElementById(id), today=new Date().toISOString().slice(0,10);$('date').value=today;$('wdate').value=today;
const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
const foodDB=[
{name:'Banane',kcal:89,protein:1.1,carbs:22.8,fat:.3,unit:'100 g'},
{name:'Apfel',kcal:52,protein:.3,carbs:13.8,fat:.2,unit:'100 g'},
{name:'Skyr natur',kcal:63,protein:11,carbs:4,fat:.2,unit:'100 g'},
{name:'Magerquark',kcal:67,protein:12,carbs:4,fat:.2,unit:'100 g'},
{name:'Hähnchenbrust',kcal:165,protein:31,carbs:0,fat:3.6,unit:'100 g'},
{name:'Reis gekocht',kcal:130,protein:2.7,carbs:28,fat:.3,unit:'100 g'},
{name:'Haferflocken',kcal:372,protein:13.5,carbs:59,fat:7,unit:'100 g'},
{name:'Ei',kcal:78,protein:6.3,carbs:.6,fat:5.3,unit:'1 Stück'},
{name:'Lachs',kcal:208,protein:20,carbs:0,fat:13,unit:'100 g'},
{name:'Tofu',kcal:144,protein:17,carbs:2.8,fat:8.7,unit:'100 g'},
{name:'Kartoffeln gekocht',kcal:87,protein:1.9,carbs:20,fat:.1,unit:'100 g'},
{name:'Brokkoli',kcal:34,protein:2.8,carbs:7,fat:.4,unit:'100 g'},
{name:'Olivenöl',kcal:119,protein:0,carbs:0,fat:13.5,unit:'1 EL'},
{name:'Vollkornbrot',kcal:230,protein:9,carbs:43,fat:3.5,unit:'100 g'},
{name:'Naturjoghurt 1,5%',kcal:58,protein:4.1,carbs:5.5,fat:1.5,unit:'100 g'}];

function showSection(id){document.querySelectorAll('.section').forEach(s=>s.classList.toggle('on',s.id===id));document.querySelectorAll('.bottom-nav .tab').forEach(x=>x.classList.toggle('on',x.dataset.t===(['today','foods','fitness','stats','more'].includes(id)?id:'more')));if(id==='stats')renderStats();if(id==='fitness')renderFitness();window.scrollTo({top:0,behavior:'smooth'});}document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>showSection(b.dataset.t));document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>showSection(b.dataset.open));
const dayKey=d=>'kc-day-'+d, loadDay=()=>LS.get(dayKey($('date').value),[]), saveDay=a=>LS.set(dayKey($('date').value),a);
const fitnessKey=d=>'kc-fitness-'+d,loadFitness=(d=$('date').value)=>LS.get(fitnessKey(d),{steps:0,active:0,exercise:0,distance:0}),saveFitness=(v,d=$('date').value)=>LS.set(fitnessKey(d),v);
function macroGoals(){return LS.get('kc-macros',{protein:150,carbs:220,fat:65})}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}



const AI_IMAGE_CACHE_KEY='kc-ai-food-images-v1';
function aiImageCache(){try{return JSON.parse(localStorage.getItem(AI_IMAGE_CACHE_KEY)||'{}')}catch{return {}}}
function aiImageKey(name){return String(name||'').toLowerCase().trim().replace(/\s+/g,' ').slice(0,120)}
async function ensureAIMealImage(meal){
  if(!meal||meal.image||meal.aiImage)return;
  const key=aiImageKey(meal.name);if(!key)return;
  const cache=aiImageCache();
  if(cache[key]){meal.aiImage=cache[key];saveDay(loadDay().map(x=>x.id===meal.id?meal:x));render();return;}
  try{
    const r=await fetch('/api/generate-food-image',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({dish:meal.name})});
    if(!r.ok)return;
    const data=await r.json();if(!data.image)return;
    meal.aiImage=data.image;cache[key]=data.image;
    try{localStorage.setItem(AI_IMAGE_CACHE_KEY,JSON.stringify(cache))}catch{}
    saveDay(loadDay().map(x=>x.id===meal.id?meal:x));render();
  }catch{}
}
function queueMissingAIMealImages(meals){
  const missing=(meals||[]).filter(x=>!x.image&&!x.aiImage).slice(0,2);
  missing.forEach((x,i)=>setTimeout(()=>ensureAIMealImage(x),500+i*900));
}

const builtInMealImages=[
 [/protein.*shake|eiweiß.*shake|oatly.*barista/,'/images/protein-shake.jpg'],
 [/spaghetti|bolognese|pasta|nudel/,'/images/bolognese.jpg'],
 [/hähnchen|chicken.*bowl|reis.*bowl/,'/images/chicken-bowl.jpg'],
 [/chili/,'/images/chili.jpg'],[/curry/,'/images/curry.jpg'],
 [/porridge|haferflocken|müsli/,'/images/porridge.jpg'],
 [/overnight.*oat/,'/images/overnight-oats.jpg'],
 [/lachs|salmon/,'/images/salmon.jpg'],[/salat/,'/images/salad.jpg']
];
function builtInMealImage(name){return (builtInMealImages.find(([re])=>re.test(String(name||'').toLowerCase()))||[])[1]||'';}

function mealVisual(name,type){
  const t=(String(name||'')+' '+String(type||'')).toLowerCase();
  const map=[
    [/pizza/,'🍕'],[/burger/,'🍔'],[/döner|kebab/,'🥙'],[/pasta|nudel|spaghetti/,'🍝'],
    [/reis|curry/,'🍛'],[/salat/,'🥗'],[/suppe/,'🍲'],[/lachs|fisch/,'🐟'],
    [/hähnchen|chicken|huhn/,'🍗'],[/ei|rührei|spiegelei/,'🍳'],[/brot|toast|brötchen/,'🥪'],
    [/banane/,'🍌'],[/apfel/,'🍎'],[/shake|protein/,'🥤'],[/kaffee/,'☕'],[/joghurt|skyr|müsli|hafer/,'🥣'],
    [/frühstück/,'🥣'],[/mittag/,'🥗'],[/abend/,'🍽️'],[/snack/,'🍎'],[/getränk/,'🥤']
  ];
  return (map.find(([re])=>re.test(t))||[])[1]||'🍽️';
}

function resizeMealPhoto(file,max=640,quality=.78){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=reject;
    reader.onload=()=>{
      const img=new Image();
      img.onerror=reject;
      img.onload=()=>{
        let w=img.width,h=img.height,scale=Math.min(1,max/Math.max(w,h));
        const cv=document.createElement('canvas');cv.width=Math.round(w*scale);cv.height=Math.round(h*scale);
        cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
        resolve(cv.toDataURL('image/jpeg',quality));
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}
window.changeMealPhoto=id=>{
  const input=document.createElement('input');input.type='file';input.accept='image/*';input.setAttribute('capture','environment');
  input.onchange=async()=>{
    const file=input.files?.[0];if(!file)return;
    try{
      const data=await resizeMealPhoto(file);
      const a=loadDay(),x=a.find(y=>y.id===id);if(!x)return;
      x.image=data;saveDay(a);render();
    }catch(e){alert('Das Foto konnte nicht gespeichert werden.');}
  };
  input.click();
};
window.removeMealPhoto=id=>{
  const a=loadDay(),x=a.find(y=>y.id===id);if(!x)return;
  delete x.image;saveDay(a);render();
};

window.editMeal=id=>{
  const a=loadDay(),x=a.find(y=>y.id===id);if(!x)return;
  const name=prompt('Gericht',x.name);if(name===null)return;
  const kcal=prompt('Kalorien (kcal)',Math.round(x.kcal));if(kcal===null)return;
  const protein=prompt('Protein (g)',Math.round(x.protein||0));if(protein===null)return;
  const carbs=prompt('Kohlenhydrate (g)',Math.round(x.carbs||0));if(carbs===null)return;
  const fat=prompt('Fett (g)',Math.round(x.fat||0));if(fat===null)return;
  if(!name.trim()||!(+kcal>0))return alert('Bitte Gericht und gültige Kalorien eingeben.');
  Object.assign(x,{name:name.trim(),kcal:+kcal,protein:+protein||0,carbs:+carbs||0,fat:+fat||0});
  saveDay(a);render();
};

function addMeal(name,kcal,protein=0,carbs=0,fat=0,type='Mahlzeit'){if(!name||!(+kcal>0))return alert('Bitte Lebensmittel und Kalorien eingeben.');let a=loadDay();a.push({id:Date.now(),name,kcal:+kcal,protein:+protein||0,carbs:+carbs||0,fat:+fat||0,type,time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})});saveDay(a);render();}
window.delMeal=id=>{saveDay(loadDay().filter(x=>x.id!==id));render()};
function render(){let a=loadDay(),u=a.reduce((s,x)=>s+x.kcal,0),p=a.reduce((s,x)=>s+x.protein,0),c=a.reduce((s,x)=>s+x.carbs,0),f=a.reduce((s,x)=>s+x.fat,0),base=+$('goal').value||2000,fit=loadFitness(),credit=LS.get('kc-credit-active',false),g=base+(credit?(+fit.active||0):0),m=macroGoals();$('used').textContent=Math.round(u);$('left').textContent=Math.round(g-u);$('prot').textContent=Math.round(p);$('count').textContent=a.length;let pct=Math.min(100,u/g*100);$('bar').style.width=pct+'%';if($('usedRing'))$('usedRing').textContent=Math.round(u);if($('heroGoalRing'))$('heroGoalRing').textContent=Math.round(base);if($('activityCredit'))$('activityCredit').textContent=Math.round(fit.active||0);if($('heroGoal'))$('heroGoal').textContent=Math.round(base);if($('progressText'))$('progressText').textContent=Math.round(pct)+' %';if($('calorieRing'))$('calorieRing').style.setProperty('--p',Math.min(100,Math.max(0,pct)));if($('leftMirror'))$('leftMirror').textContent=Math.round(g-u);if($('todaySteps'))$('todaySteps').textContent=Math.round(fit.steps||0).toLocaleString('de-DE');if($('todayActive'))$('todayActive').textContent=Math.round(fit.active||0);if($('todayExercise'))$('todayExercise').textContent=Math.round(fit.exercise||0);const mealOrder=['Frühstück','Mittagessen','Abendessen','Snack','Getränk','Datenbank','Rezept','Foto-KI','Plan','Mahlzeit'];const icons={'Frühstück':'🥣','Mittagessen':'🥗','Abendessen':'🍽️','Snack':'🍎','Getränk':'🥤','Datenbank':'🥕','Rezept':'🍳','Foto-KI':'📷','Plan':'✓','Mahlzeit':'🍴'};let groups={};a.forEach(x=>(groups[x.type||'Mahlzeit']??=[]).push(x));let ordered=[...mealOrder.filter(k=>groups[k]),...Object.keys(groups).filter(k=>!mealOrder.includes(k))];if(!ordered.length)ordered=['Frühstück','Mittagessen','Abendessen','Snack'];$('entries').innerHTML=ordered.map(type=>{let xs=groups[type]||[],sum=xs.reduce((q,x)=>q+x.kcal,0);return `<div class="meal-group"><div class="meal-group-head"><div class="meal-group-title"><span class="meal-avatar">${icons[type]||'🍴'}</span><div><b>${esc(type)}</b><small>${xs.length?xs.length+' Eintrag'+(xs.length>1?'e':''):'Noch nichts erfasst'}</small></div></div><div style="display:flex;align-items:center;gap:9px"><span class="meal-kcal">${Math.round(sum)} kcal</span><button class="meal-add" onclick="openQuickFor('${encodeURIComponent(type)}')">＋</button></div></div>${xs.length?xs.map(x=>`<div class="meal-row"><button class="meal-thumb meal-photo-btn" onclick="changeMealPhoto(${x.id})" aria-label="Foto ${x.image?'ändern':'hinzufügen'}">${(x.image||x.aiImage||builtInMealImage(x.name))?`<img src="${x.image||x.aiImage||builtInMealImage(x.name)}" alt="${esc(x.name)}">`:`<span>${mealVisual(x.name,x.type)}</span><small>Foto</small>`}</button><div class="meal-row-main"><b>${esc(x.name)}</b><div class="food-meta">P ${(+x.protein||0).toFixed(0)} · KH ${(+x.carbs||0).toFixed(0)} · F ${(+x.fat||0).toFixed(0)}</div></div><div class="meal-row-right"><b>${Math.round(x.kcal)} kcal</b><div class="meal-actions"><button class="meal-edit" onclick="editMeal(${x.id})">Ändern</button><button class="meal-edit" onclick="changeMealPhoto(${x.id})">${x.image?'Foto ändern':'Foto'}</button><button class="meal-delete" onclick="delMeal(${x.id})">Löschen</button></div></div></div>`).join(''):`<div class="empty-meal">Mit + hinzufügen</div>`}</div>`}).join('');if($('todayActiveMirror'))$('todayActiveMirror').textContent=Math.round(fit.active||0);
  const topMacros=[['Protein',p,m.protein,'macroTopProtein'],['Carbs',c,m.carbs,'macroTopCarbs'],['Fat',f,m.fat,'macroTopFat']];topMacros.forEach(([n,val,goal,id])=>{if($(id))$(id).textContent=Math.round(val);if($(id+'Goal'))$(id+'Goal').textContent=Math.round(goal);let mp=goal?Math.min(100,val/goal*100):0;if($(id+'Bar'))$(id+'Bar').style.width=mp+'%';if($(id+'Pct'))$(id+'Pct').textContent=Math.round(mp)+' %'});$('macroSummary').innerHTML=`<div class="macro protein"><span>Protein</span><b>${Math.round(p)}/${m.protein} g</b></div><div class="progress"><i style="width:${Math.min(100,p/m.protein*100)}%;background:linear-gradient(90deg,#3b82f6,#60a5fa)"></i></div><br><div class="macro carbs"><span>Kohlenhydrate</span><b>${Math.round(c)}/${m.carbs} g</b></div><div class="progress"><i style="width:${Math.min(100,c/m.carbs*100)}%;background:linear-gradient(90deg,#f59e0b,#fbbf24)"></i></div><br><div class="macro fat"><span>Fett</span><b>${Math.round(f)}/${m.fat} g</b></div><div class="progress"><i style="width:${Math.min(100,f/m.fat*100)}%;background:linear-gradient(90deg,#8b5cf6,#a78bfa)"></i></div>`;queueMissingAIMealImages(a);renderTemplates();renderFitness();}
$('add').onclick=()=>{addMeal($('food').value.trim(),$('kcal').value,$('protein').value,$('carbs').value,$('fat').value,$('type').value);['food','kcal','protein','carbs','fat'].forEach(x=>$(x).value='')};$('date').onchange=render;$('goal').oninput=()=>{LS.set('kc-goal',+$('goal').value);render()};$('goal').value=LS.get('kc-goal',2000);
function foodCard(x){let id=encodeURIComponent(x.name);return `<div class="item"><div><b>${esc(x.name)}</b><div class="muted">${x.unit||'100 g'} · P ${Math.round(x.protein||0)} · KH ${Math.round(x.carbs||0)} · F ${Math.round(x.fat||0)}</div></div><div><b>${Math.round(x.kcal)} kcal</b><div><button class="fav" onclick="toggleFav('${id}')">☆</button><button class="btn soft" onclick='quickAdd(${JSON.stringify(x).replace(/'/g,"&#39;")})'>+</button></div></div></div>`}
window.quickAdd=x=>addMeal(x.name,x.kcal,x.protein,x.carbs,x.fat,'Datenbank');window.toggleFav=n=>{n=decodeURIComponent(n);let f=LS.get('kc-favs',[]),x=foodDB.find(y=>y.name===n);if(!x)return;f.some(y=>y.name===n)?f=f.filter(y=>y.name!==n):f.push(x);LS.set('kc-favs',f);renderFavorites()};
function searchFoods(){let q=$('foodSearch').value.trim().toLowerCase();let r=foodDB.filter(x=>x.name.toLowerCase().includes(q));$('foodResults').innerHTML=r.length?r.map(foodCard).join(''):'<p class="muted">Kein lokaler Treffer.</p>'}$('foodSearchBtn').onclick=searchFoods;$('foodSearch').oninput=searchFoods;
function renderFavorites(){let f=LS.get('kc-favs',[]);$('favorites').innerHTML=f.length?f.map(foodCard).join(''):'<p class="muted">Noch keine Favoriten.</p>'}renderFavorites();
$('lookupBarcode').onclick=async()=>{let code=$('barcode').value.trim();if(!code)return;let el=$('barcodeResult');el.innerHTML='<p class="muted">Suche…</p>';try{let r=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=product_name,nutriments,serving_size');let j=await r.json();if(j.status!==1)throw new Error('Produkt nicht gefunden');let n=j.product.nutriments||{},x={name:j.product.product_name||('Barcode '+code),kcal:n['energy-kcal_100g']||0,protein:n.proteins_100g||0,carbs:n.carbohydrates_100g||0,fat:n.fat_100g||0,unit:'100 g'};el.innerHTML=foodCard(x)}catch(e){el.innerHTML='<p class="muted">'+esc(e.message)+'. Du kannst das Produkt trotzdem manuell unter „Heute“ eintragen.</p>'}};
function renderTemplates(){let t=LS.get('kc-templates',[]),html=t.length?t.map((x,i)=>`<div class="item"><div><b>${esc(x.name)}</b><div class="muted">${x.items.length} Einträge · ${Math.round(x.items.reduce((s,y)=>s+y.kcal,0))} kcal</div></div><div><button class="btn soft" onclick="useTemplate(${i})">Hinzufügen</button><button class="btn danger" onclick="delTemplate(${i})">Löschen</button></div></div>`).join(''):'<p class="muted">Noch keine Vorlagen.</p>';$('templates').innerHTML=html;$('templatesToday').innerHTML=html}
$('saveTemplate').onclick=()=>{let a=loadDay();if(!a.length)return alert('Heute gibt es noch keine Einträge.');let name=prompt('Name der Vorlage?','Mein Tag');if(!name)return;let t=LS.get('kc-templates',[]);t.push({name,items:a.map(({name,kcal,protein,carbs,fat,type})=>({name,kcal,protein,carbs,fat,type}))});LS.set('kc-templates',t);renderTemplates()};window.useTemplate=i=>{let t=LS.get('kc-templates',[])[i];if(!t)return;t.items.forEach(x=>addMeal(x.name,x.kcal,x.protein,x.carbs,x.fat,x.type));};window.delTemplate=i=>{let t=LS.get('kc-templates',[]);t.splice(i,1);LS.set('kc-templates',t);renderTemplates()};
function last7(){let out=[];for(let i=6;i>=0;i--){let d=new Date();d.setDate(d.getDate()-i);out.push(d.toISOString().slice(0,10))}return out}function renderStats(){let ds=last7(),rows=ds.map(d=>({d,a:LS.get(dayKey(d),[])})),vals=rows.map(r=>r.a.reduce((s,x)=>s+x.kcal,0)),prots=rows.map(r=>r.a.reduce((s,x)=>s+x.protein,0)),tracked=vals.filter(x=>x>0),goal=LS.get('kc-goal',2000);$('avgKcal').textContent=tracked.length?Math.round(tracked.reduce((a,b)=>a+b,0)/tracked.length):0;$('avgProt').textContent=tracked.length?Math.round(prots.reduce((a,b)=>a+b,0)/tracked.length):0;$('goalHits').textContent=vals.filter(x=>x>0&&Math.abs(x-goal)<=goal*.1).length;$('daysTracked').textContent=tracked.length;let max=Math.max(goal,...vals,1);$('weekChart').innerHTML=rows.map((r,i)=>`<div class="bar" style="height:${Math.max(2,vals[i]/max*100)}%"><span>${new Date(r.d+'T12:00').toLocaleDateString('de-DE',{weekday:'short'})}</span></div>`).join('');let cs=rows.map(r=>r.a.reduce((s,x)=>s+x.carbs,0)),fs=rows.map(r=>r.a.reduce((s,x)=>s+x.fat,0));$('weekMacros').innerHTML=`7-Tage Summe: <b>Protein ${Math.round(prots.reduce((a,b)=>a+b,0))} g</b> · Kohlenhydrate ${Math.round(cs.reduce((a,b)=>a+b,0))} g · Fett ${Math.round(fs.reduce((a,b)=>a+b,0))} g`}
function renderFitness(){let v=loadFitness();if($('fitSteps'))$('fitSteps').textContent=Math.round(v.steps||0).toLocaleString('de-DE');if($('fitActive'))$('fitActive').textContent=Math.round(v.active||0);if($('fitExercise'))$('fitExercise').textContent=Math.round(v.exercise||0);if($('fitDistance'))$('fitDistance').textContent=(+v.distance||0).toFixed(1);if($('stepsInput'))$('stepsInput').value=v.steps||'';if($('activeInput'))$('activeInput').value=v.active||'';if($('exerciseInput'))$('exerciseInput').value=v.exercise||'';if($('distanceInput'))$('distanceInput').value=v.distance||'';let ds=last7(),rows=ds.map(d=>({d,v:loadFitness(d)})),max=Math.max(1,...rows.map(x=>+x.v.steps||0));if($('fitnessWeek'))$('fitnessWeek').innerHTML=rows.map(x=>`<div class="fitness-week-row"><span>${new Date(x.d+'T12:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit'})}</span><div class="fitness-week-bar"><i style="width:${Math.min(100,(+x.v.steps||0)/max*100)}%"></i></div><b>${Math.round(x.v.steps||0).toLocaleString('de-DE')}</b></div>`).join('')}
if($('saveFitness'))$('saveFitness').onclick=()=>{saveFitness({steps:+$('stepsInput').value||0,active:+$('activeInput').value||0,exercise:+$('exerciseInput').value||0,distance:+$('distanceInput').value||0});render();alert('Fitnesswerte gespeichert.')};if($('openFitness'))$('openFitness').onclick=()=>document.querySelector('[data-t="fitness"]').click();if($('copyFitnessLink'))$('copyFitnessLink').onclick=async()=>{let base=location.origin+location.pathname,txt=base+'?fitness=1&steps=[SCHRITTE]&active=[AKTIVKALORIEN]&exercise=[TRAININGSMINUTEN]&distance=[DISTANZ_KM]';try{await navigator.clipboard.writeText(txt);$('fitnessCopyMsg').textContent='Link-Vorlage kopiert.'}catch{$('fitnessCopyMsg').textContent=txt}};
function importFitnessParams(sp){if(sp.get('fitness')!=='1'&&!['steps','active','exercise','distance'].some(k=>sp.has(k)))return false;let d=sp.get('date')||today,old=loadFitness(d),v={steps:sp.has('steps')?+sp.get('steps')||0:old.steps,active:sp.has('active')?+sp.get('active')||0:old.active,exercise:sp.has('exercise')?+sp.get('exercise')||0:old.exercise,distance:sp.has('distance')?+sp.get('distance')||0:old.distance};saveFitness(v,d);return true}
let calcGoal=0;$('calc').onclick=()=>{let w=+$('bw').value,h=+$('height').value,a=+$('age').value,b=10*w+6.25*h-5*a+($('sex').value==='m'?5:-161),t=Math.round(b*(+$('activity').value)),z=t+(+$('target').value);calcGoal=z;$('bmr').textContent=Math.round(b)+' kcal';$('tdee').textContent=t+' kcal';$('needGoal').textContent=z+' kcal'};$('applyGoal').onclick=()=>{if(calcGoal){$('goal').value=calcGoal;LS.set('kc-goal',calcGoal);render();alert('Tagesziel übernommen.')}};
const wload=()=>LS.get('kc-weights',[]),wsave=a=>LS.set('kc-weights',a);$('wadd').onclick=()=>{let kg=+$('wval').value;if(!kg)return;let a=wload().filter(x=>x.date!==$('wdate').value);a.push({date:$('wdate').value,kg});wsave(a);$('wval').value='';renderWeights()};window.wdel=i=>{let a=wload().sort((x,y)=>y.date.localeCompare(x.date));a.splice(i,1);wsave(a);renderWeights()};function renderWeights(){let a=wload().sort((x,y)=>y.date.localeCompare(x.date));$('weights').innerHTML=a.length?a.map((x,i)=>`<div class="item"><span>${x.date}</span><b>${x.kg} kg</b><button class="btn danger" onclick="wdel(${i})">Löschen</button></div>`).join(''):'<p class="muted">Noch keine Gewichtseinträge.</p>'}renderWeights();
function localPlan(){let g=+$('goal').value||2000,d=$('diet').value,n=+$('mealCount').value||4;let sets=d==='Vegan'?[['Porridge mit Sojajoghurt, Banane & Beeren',.25],['Tofu-Reis-Bowl mit Gemüse',.3],['Hummus-Vollkornbrot & Obst',.15],['Linsenpasta mit Tomaten & Gemüse',.3]]:d==='Vegetarisch'?[['Skyr-Porridge mit Beeren',.25],['Reis-Bowl mit Ei, Feta & Gemüse',.3],['Magerquark mit Obst',.15],['Kartoffeln, Kräuterquark & Salat',.3]]:[['Skyr-Porridge mit Beeren',.25],['Hähnchen-Reis-Bowl mit Gemüse',.3],['Magerquark mit Banane',.15],['Lachs, Kartoffeln & Brokkoli',.3]];while(sets.length<n)sets.push(['Flexibler Snack nach Wahl',1/n]);return sets.slice(0,n).map((x,i)=>({name:x[0],kcal:Math.round(g*(i===n-1?1-sets.slice(0,n-1).reduce((s,y)=>s+y[1],0):x[1]))}))}
$('makePlan').onclick=async()=>{let box=$('mealPlan');box.innerHTML='<p class="muted">Erstelle Plan…</p>';let plan=null;try{let r=await fetch('/api/meal-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({calories:+$('goal').value,macros:macroGoals(),diet:$('diet').value,meals:+$('mealCount').value,preferences:$('preferences').value})});if(r.ok){let j=await r.json();plan=j.meals||null}}catch{}if(!plan)plan=localPlan();box.innerHTML='<ol>'+plan.map(x=>`<li><b>${esc(x.name)}</b> – ca. ${Math.round(x.kcal||0)} kcal${x.description?'<br><span class="muted">'+esc(x.description)+'</span>':''}</li>`).join('')+'</ol><button id="planToday" class="btn soft wide">Plan als Tagesvorlage speichern</button>';$('planToday').onclick=()=>{let t=LS.get('kc-templates',[]);t.push({name:'Ernährungsplan '+today,items:plan.map(x=>({name:x.name,kcal:+x.kcal||0,protein:+x.protein||0,carbs:+x.carbs||0,fat:+x.fat||0,type:'Plan'}))});LS.set('kc-templates',t);renderTemplates();alert('Plan als Vorlage gespeichert.')}};
const rload=()=>LS.get('kc-recipes',[]),rsave=a=>LS.set('kc-recipes',a);$('saveRecipe').onclick=()=>{let name=$('recipeName').value.trim();if(!name)return;let a=rload();a.push({id:Date.now(),title:name,ingredients:$('recipeIngredients').value.split('\n').filter(Boolean),steps:$('recipeSteps').value.split('\n').filter(Boolean),kcal:+$('recipeKcal').value||0,protein:+$('recipeProt').value||0,servings:+$('recipeServings').value||1});rsave(a);renderRecipes();alert('Rezept gespeichert.')};function renderRecipes(){let a=rload();$('recipeLibrary').innerHTML=a.length?a.map((r,i)=>`<div class="item"><div><b>${esc(r.title)}</b><div class="muted">${r.kcal||0} kcal/Portion · ${r.protein||0} g Protein</div></div><div><button class="btn soft" onclick="trackRecipe(${i})">Tracken</button><button class="btn danger" onclick="delRecipe(${i})">Löschen</button></div></div>`).join(''):'<p class="muted">Noch keine Rezepte.</p>'}window.trackRecipe=i=>{let r=rload()[i];if(r)addMeal(r.title,r.kcal,r.protein,0,0,'Rezept')};window.delRecipe=i=>{let a=rload();a.splice(i,1);rsave(a);renderRecipes()};renderRecipes();
$('rimport').onclick=async()=>{let url=$('rurl').value.trim();if(!url)return;$('rmsg').textContent='Importiere…';try{let r=await fetch('/api/import-recipe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url,extra_text:$('rtext').value})}),j=await r.json();if(!r.ok)throw new Error(j.error||'Import nicht möglich');$('rmsg').textContent=j.note||'';$('importedRecipe').innerHTML=`<h3>${esc(j.title||'Rezept')}</h3><h4>Zutaten</h4><ul>${(j.ingredients||[]).map(x=>`<li>${esc(typeof x==='string'?x:[x.amount,x.unit,x.name].filter(Boolean).join(' '))}</li>`).join('')}</ul><h4>Schritte</h4><ol>${(j.steps||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`}catch(e){$('rmsg').textContent='Import aktuell nicht automatisch möglich: '+e.message+' Du kannst das Rezept oben manuell speichern.'}};
function dataUrl(f){return new Promise((res,rej)=>{let r=new FileReader;r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)})}
async function analyzePhotoFile(f,statusBox,resultBox,saveId='savePhoto'){
  if(!f)return;
  if(statusBox)statusBox.textContent='Foto wird analysiert…';
  if(resultBox)resultBox.innerHTML='';
  try{
    let r=await fetch('/api/analyze-meal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageDataUrl:await dataUrl(f)})}),j=await r.json();
    if(!r.ok)throw new Error(j.error||'Analyse nicht möglich');
    let kcal=(j.items||[]).reduce((sum,x)=>sum+(+x.calories||0),0),protein=(j.items||[]).reduce((sum,x)=>sum+(+x.protein||0),0);
    if(statusBox)statusBox.textContent=j.note||'KI-Schätzung – bitte Portionsgrößen prüfen.';
    if(resultBox){
      resultBox.innerHTML=`<h3>${esc(j.meal_name||'Mahlzeit')}</h3>${(j.items||[]).map(x=>`<div class="item"><span>${esc(x.name)}</span><b>${Math.round(x.calories||0)} kcal</b></div>`).join('')}<button id="${saveId}" class="btn primary wide">${Math.round(kcal)} kcal übernehmen</button>`;
      let b=$(saveId);if(b)b.onclick=()=>{addMeal(j.meal_name||'Foto-Mahlzeit',kcal,protein,0,0,'Foto-KI');typeof closeQuickSheet==='function'?closeQuickSheet():$('quickEntryCard')?.classList.remove('open')};
    }
    return j;
  }catch(e){if(statusBox)statusBox.textContent='Foto-KI ist aktuell nicht verfügbar: '+e.message;throw e}
}
$('photoFile').onchange=()=>{let f=$('photoFile').files[0];if(f){$('preview').src=URL.createObjectURL(f);$('preview').style.display='block'}};
$('analyze').onclick=async()=>{let f=$('photoFile').files[0];if(!f)return alert('Bitte Foto wählen.');try{await analyzePhotoFile(f,$('photoMsg'),$('photoResult'),'savePhoto')}catch{}};
function applySettings(){let m=macroGoals();$('proteinGoal').value=m.protein;$('carbGoal').value=m.carbs;$('fatGoal').value=m.fat;let dark=LS.get('kc-dark',false);$('darkMode').checked=dark;document.documentElement.dataset.theme=dark?'dark':'';let rem=LS.get('kc-reminder',{on:false,time:'19:00'});$('reminderOn').checked=rem.on;$('reminderTime').value=rem.time;if($('creditActive'))$('creditActive').checked=LS.get('kc-credit-active',false)}$('saveMacros').onclick=()=>{LS.set('kc-macros',{protein:+$('proteinGoal').value||0,carbs:+$('carbGoal').value||0,fat:+$('fatGoal').value||0});render();alert('Makroziele gespeichert.')};$('darkMode').onchange=()=>{LS.set('kc-dark',$('darkMode').checked);applySettings()};if($('creditActive'))$('creditActive').onchange=()=>{LS.set('kc-credit-active',$('creditActive').checked);render()};$('saveReminder').onclick=async()=>{let x={on:$('reminderOn').checked,time:$('reminderTime').value};LS.set('kc-reminder',x);if(x.on&&'Notification'in window&&Notification.permission==='default')try{await Notification.requestPermission()}catch{}alert('Erinnerung gespeichert.')};function checkReminder(){let r=LS.get('kc-reminder',{on:false});if(!r.on)return;let now=new Date(),hm=now.toTimeString().slice(0,5),stamp=now.toISOString().slice(0,10);if(hm>=r.time&&LS.get('kc-reminded','')!==stamp){LS.set('kc-reminded',stamp);if('Notification'in window&&Notification.permission==='granted')new Notification('Kalorien Tracker',{body:'Denk daran, deinen Tag zu vervollständigen.'});else alert('Erinnerung: Denk daran, deinen Kalorientag zu vervollständigen.')}}setInterval(checkReminder,60000);setTimeout(checkReminder,1500);
$('exportData').onclick=()=>{let all={goal:LS.get('kc-goal',2000),macros:macroGoals(),weights:wload(),recipes:rload(),favorites:LS.get('kc-favs',[]),templates:LS.get('kc-templates',[]),days:{},fitness:{}};for(let i=0;i<90;i++){let d=new Date();d.setDate(d.getDate()-i);let s=d.toISOString().slice(0,10),a=LS.get(dayKey(s),[]);if(a.length)all.days[s]=a;let fv=loadFitness(s);if(fv.steps||fv.active||fv.exercise||fv.distance)all.fitness[s]=fv}let blob=new Blob([JSON.stringify(all,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='kalorien-tracker-daten.json';a.click();URL.revokeObjectURL(a.href)};$('clearAll').onclick=()=>{if(confirm('Wirklich alle lokalen App-Daten löschen?')){Object.keys(localStorage).filter(k=>k.startsWith('kc-')).forEach(k=>localStorage.removeItem(k));location.reload()}};

const roughFoodRules=[
  {re:/\b(proteinshake|eiweißshake|protein shake)\b/i,name:'Proteinshake',kcal:120,p:24,c:3,f:2,unit:'Portion'},
  {re:/\b(oatly\s*barista|hafermilch|haferdrink)\b/i,name:'Haferdrink',kcal:61,p:1.1,c:7.1,f:3,unit:'100 ml'},

  {re:/\b(brötchen|semmel)\b/i,name:'Brötchen',kcal:160,p:5.5,c:30,f:2,unit:'Stück'},
  {re:/\b(brot|toast)\b/i,name:'Brot/Toast',kcal:110,p:4,c:20,f:1.5,unit:'Scheibe'},
  {re:/\b(käse|gouda|emmentaler)\b/i,name:'Käse',kcal:115,p:8,c:.3,f:9,unit:'Portion'},
  {re:/\b(frischkäse)\b/i,name:'Frischkäse',kcal:70,p:2,c:2,f:6,unit:'Portion'},
  {re:/\b(butter)\b/i,name:'Butter',kcal:75,p:.1,c:.1,f:8.3,unit:'Portion'},
  {re:/\b(ei|eier|rührei|spiegelei)\b/i,name:'Ei',kcal:80,p:6.5,c:.5,f:5.5,unit:'Stück'},
  {re:/\b(banane)\b/i,name:'Banane',kcal:105,p:1.3,c:27,f:.4,unit:'Stück'},
  {re:/\b(apfel|äpfel)\b/i,name:'Apfel',kcal:85,p:.4,c:22,f:.3,unit:'Stück'},
  {re:/\b(skyr)\b/i,name:'Skyr',kcal:125,p:22,c:8,f:.5,unit:'Becher'},
  {re:/\b(joghurt|jogurt)\b/i,name:'Joghurt',kcal:120,p:7,c:12,f:4,unit:'Becher'},
  {re:/\b(haferflocken|porridge|müsli)\b/i,name:'Haferflocken/Müsli',kcal:280,p:10,c:45,f:7,unit:'Schüssel'},
  {re:/\b(pizza)\b/i,name:'Pizza',kcal:850,p:34,c:95,f:36,unit:'Pizza'},
  {re:/\b(döner|kebab)\b/i,name:'Döner',kcal:720,p:38,c:70,f:30,unit:'Portion'},
  {re:/\b(burger)\b/i,name:'Burger',kcal:600,p:30,c:50,f:30,unit:'Stück'},
  {re:/\b(pommes|fritten)\b/i,name:'Pommes',kcal:430,p:6,c:55,f:20,unit:'Portion'},
  {re:/\b(spaghetti|nudeln|pasta)\b/i,name:'Pasta',kcal:520,p:18,c:82,f:12,unit:'Teller'},
  {re:/\b(bolognese)\b/i,name:'Bolognese-Sauce',kcal:260,p:18,c:14,f:14,unit:'Portion'},
  {re:/\b(reis)\b/i,name:'Reis',kcal:260,p:5,c:56,f:.6,unit:'Portion'},
  {re:/\b(hähnchen|huhn|chicken)\b/i,name:'Hähnchen',kcal:250,p:46,c:0,f:6,unit:'Portion'},
  {re:/\b(lachs)\b/i,name:'Lachs',kcal:310,p:30,c:0,f:20,unit:'Portion'},
  {re:/\b(salat)\b/i,name:'Salat',kcal:180,p:6,c:18,f:9,unit:'Schüssel'},
  {re:/\b(curry)\b/i,name:'Curry',kcal:520,p:22,c:60,f:22,unit:'Teller'},
  {re:/\b(suppe)\b/i,name:'Suppe',kcal:300,p:12,c:35,f:11,unit:'Teller'},
  {re:/\b(cola|limonade|fanta|sprite)\b/i,name:'Softdrink',kcal:140,p:0,c:35,f:0,unit:'Glas'},
  {re:/\b(sa ft|saft)\b/i,name:'Saft',kcal:120,p:1,c:28,f:0,unit:'Glas'},
  {re:/\b(kaffee)\b/i,name:'Kaffee',kcal:15,p:.5,c:2,f:.5,unit:'Tasse'},
  {re:/\b(cappuccino|latte macchiato|milchkaffee)\b/i,name:'Milchkaffee',kcal:140,p:7,c:12,f:6,unit:'Tasse'},
  {re:/\b(bier)\b/i,name:'Bier',kcal:210,p:2,c:17,f:0,unit:'0,5 l'},
  {re:/\b(schokolade|schoko)\b/i,name:'Schokolade',kcal:270,p:4,c:29,f:16,unit:'Portion'},
  {re:/\b(kuchen|torte)\b/i,name:'Kuchen',kcal:380,p:6,c:45,f:19,unit:'Stück'}
];
function roughQty(text,re){
  const m=text.match(new RegExp('(\\d+(?:[\\.,]\\d+)?)\\s*(?:x|mal)?\\s*(?:'+re.source.replace(/^\\b|\\b$/g,'')+')','i'));
  if(m)return Math.max(.25,Math.min(6,parseFloat(m[1].replace(',','.'))||1));
  if(/\b(zwei|2)\b/i.test(text)&&re.test(text))return 2;
  if(/\b(drei|3)\b/i.test(text)&&re.test(text))return 3;
  return 1;
}
function localRoughEstimate(text){
  const t=String(text||'').trim();let items=[];
  roughFoodRules.forEach(r=>{if(r.re.test(t)){let q=roughQty(t,r.re),mult=q;
    if(r.unit==='100 ml'){
      const ml=t.match(/(\d+(?:[\.,]\d+)?)\s*ml/i);
      if(ml){q=parseFloat(ml[1].replace(',','.'))||100;mult=q/100;}
    }
    if(/\bklein(e|er|es|en)?\b/i.test(t))mult*=.78;
    if(/\bgroß(e|er|es|en)?|große portion|viel\b/i.test(t))mult*=1.28;
    items.push({name:r.name,qty:q,kcal:r.kcal*mult,protein:r.p*mult,carbs:r.c*mult,fat:r.f*mult})
  }});
  if(!items.length){let base=/snack|klein/i.test(t)?280:/frühstück/i.test(t)?450:/abend|mittag|teller|portion/i.test(t)?650:500;items=[{name:'Grob geschätzte Mahlzeit',qty:1,kcal:base,protein:Math.round(base*.045),carbs:Math.round(base*.12),fat:Math.round(base*.035)}]}
  let sum=k=>items.reduce((a,x)=>a+(+x[k]||0),0);return {name:t.slice(0,90)||'Grob geschätzte Mahlzeit',kcal:Math.round(sum('kcal')),protein:+sum('protein').toFixed(1),carbs:+sum('carbs').toFixed(1),fat:+sum('fat').toFixed(1),items,note:'Grobe Schätzung anhand typischer Portionsgrößen. Menge, Zubereitung, Öl, Saucen und Marken können die tatsächlichen Werte deutlich verändern.'};
}
async function estimateRoughMeal(){
  const text=(document.getElementById('roughEstimateText')?.value||'').trim();
  const out=document.getElementById('roughEstimateResult');
  if(!text){ if(out) out.innerHTML='<div class="hint">Bitte beschreibe zuerst dein Essen.</div>'; return; }
  const est=localRoughEstimate(text);
  if(!out) return;
  out.innerHTML=`<div class="rough-estimate-result-card">
    <strong>Geschätzte Mahlzeit</strong>
    <div class="estimate-kcal">${Math.round(est.kcal)} kcal</div>
    <div class="estimate-macros"><span>Protein ${Math.round(est.protein)} g</span><span>KH ${Math.round(est.carbs)} g</span><span>Fett ${Math.round(est.fat)} g</span></div>
    <div class="hint">Grobe Schätzung. Menge, Zubereitung, Öl, Soßen und Marken können die Werte deutlich verändern.</div>
    <button class="primary" id="roughEstimateUse">Schätzung übernehmen</button>
  </div>`;
  document.getElementById('roughEstimateUse')?.addEventListener('click',()=>{
    const meal={
      id:Date.now(),
      name:text,
      kcal:Math.max(1,Math.round(Number(est.kcal)||0)),
      protein:Math.max(0,Math.round(Number(est.protein)||0)),
      carbs:Math.max(0,Math.round(Number(est.carbs)||0)),
      fat:Math.max(0,Math.round(Number(est.fat)||0)),
      type:'Mahlzeit',
      time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})
    };
    const meals=loadDay();
    meals.push(meal);
    saveDay(meals);
    render();
    closeQuickSheet();
  });
}
if($('quickEstimate'))$('quickEstimate').onclick=()=>{$('roughEstimateBox')?.classList.toggle('on');setTimeout(()=>$('roughEstimateText')?.focus(),80)};
if($('roughEstimateRun'))$('roughEstimateRun').onclick=estimateRoughMeal;

if($('quickPhoto'))$('quickPhoto').onclick=()=>$('quickPhotoFile')?.click();
if($('quickPhotoFile'))$('quickPhotoFile').onchange=async()=>{let f=$('quickPhotoFile').files[0];if(!f)return;let box=$('quickPhotoStatus');if(box)box.innerHTML='<span>Foto wird vorbereitet…</span><div id="quickPhotoResult"></div>';try{await analyzePhotoFile(f,box.querySelector('span'),$('quickPhotoResult'),'saveQuickPhoto')}catch{}};
if($('quickManual'))$('quickManual').onclick=()=>{$('manualEntryFields')?.classList.toggle('on')};
if($('quickSearch'))$('quickSearch').onclick=()=>{document.querySelector('[data-t="foods"]')?.click();setTimeout(()=>$('foodSearch')?.focus(),120)};
if($('quickBarcode'))$('quickBarcode').onclick=()=>{document.querySelector('[data-t="foods"]')?.click();setTimeout(()=>$('barcode')?.focus(),120)};
function closeQuickSheet(){$('quickEntryCard')?.classList.remove('open');$('sheetBackdrop')?.classList.remove('on');document.body.classList.remove('sheet-open');$('roughEstimateBox')?.classList.remove('on');$('manualEntryFields')?.classList.remove('on')}window.openQuickFor=t=>{let card=$('quickEntryCard');if(card)card.classList.add('open');$('sheetBackdrop')?.classList.add('on');document.body.classList.add('sheet-open');if(t&&$('type')){let v=decodeURIComponent(t);[...$('type').options].some(o=>o.value===v)&&($('type').value=v)}};if($('quickAddOpen'))$('quickAddOpen').onclick=()=>openQuickFor('');if($('quickAddClose'))$('quickAddClose').onclick=closeQuickSheet;if($('sheetBackdrop'))$('sheetBackdrop').onclick=closeQuickSheet;document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>{let id=b.dataset.open;if(!id)return;document.querySelectorAll('.section').forEach(s=>s.classList.toggle('on',s.id===id));document.querySelectorAll('.bottom-nav .tab').forEach(t=>t.classList.toggle('on',t.dataset.t==='more'));window.scrollTo({top:0,behavior:'smooth'})}));
let sp=new URLSearchParams(location.search),shared=sp.get('url')||'',fitnessImported=importFitnessParams(sp);if(shared){$('rurl').value=shared;document.querySelector('[data-t="recipes"]').click()}else if(fitnessImported){document.querySelector('[data-t="fitness"]').click();history.replaceState({},'',location.pathname)}function updateHomeGreeting(){let h=new Date().getHours(),g=h<11?'Guten Morgen! ☀️':h<18?'Guten Tag! 👋':'Guten Abend! 👋';if($('greeting'))$('greeting').textContent=g;let d=new Date();if($('headerDay'))$('headerDay').textContent=d.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long'});}updateHomeGreeting();applySettings();render();renderTemplates();searchFoods();
if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});


const smartRecipes=[
 {name:'Skyr-Beeren-Power-Bowl',emoji:'🫐',kcal:410,p:36,c:48,f:8,time:'5 Min.',ingredients:['300 g Skyr','100 g Beeren','40 g Haferflocken','10 g Nüsse','1 TL Honig'],steps:'Skyr in eine Schüssel geben, Beeren und Haferflocken darauf verteilen, mit Nüssen und Honig toppen.'},
 {name:'Hähnchen-Reis-Gemüse-Bowl',emoji:'🍗',kcal:610,p:52,c:70,f:14,time:'25 Min.',ingredients:['180 g Hähnchenbrust','200 g gekochter Reis','200 g Gemüse','1 TL Olivenöl','Gewürze'],steps:'Hähnchen würzen und braten. Gemüse garen, mit Reis anrichten und Hähnchen daraufgeben.'},
 {name:'Protein-Pasta Bolognese',emoji:'🍝',kcal:650,p:48,c:78,f:16,time:'25 Min.',ingredients:['100 g Pasta','150 g mageres Hack','200 g Tomaten','Zwiebel','Kräuter'],steps:'Pasta kochen. Hack und Zwiebel anbraten, Tomaten und Kräuter zugeben und mit der Pasta servieren.'},
 {name:'Lachs mit Kartoffeln & Brokkoli',emoji:'🐟',kcal:590,p:43,c:52,f:22,time:'30 Min.',ingredients:['160 g Lachs','250 g Kartoffeln','200 g Brokkoli','Zitrone','Gewürze'],steps:'Kartoffeln garen. Lachs braten oder backen, Brokkoli dämpfen und alles mit Zitrone servieren.'},
 {name:'Wrap mit Hähnchen & Joghurt-Dip',emoji:'🌯',kcal:520,p:45,c:55,f:14,time:'15 Min.',ingredients:['1 großer Vollkorn-Wrap','150 g Hähnchen','Salat & Tomate','80 g Joghurt','Gewürze'],steps:'Hähnchen braten. Wrap mit Gemüse, Hähnchen und gewürztem Joghurt füllen und einrollen.'},
 {name:'Rührei-Avocado-Toast',emoji:'🍳',kcal:470,p:27,c:38,f:23,time:'10 Min.',ingredients:['3 Eier','2 Scheiben Vollkorntoast','½ Avocado','Tomaten'],steps:'Eier zu Rührei braten. Toast rösten, Avocado darauf verteilen und mit Rührei und Tomaten servieren.'},
 {name:'Chili con Carne',emoji:'🥘',kcal:560,p:44,c:58,f:17,time:'30 Min.',ingredients:['150 g mageres Hack','120 g Kidneybohnen','100 g Mais','200 g Tomaten','Gewürze'],steps:'Hack anbraten, restliche Zutaten zugeben und 15–20 Minuten köcheln lassen.'},
 {name:'Tofu-Gemüse-Curry',emoji:'🍛',kcal:540,p:30,c:60,f:20,time:'25 Min.',ingredients:['180 g Tofu','250 g Gemüse','150 g gekochter Reis','100 ml leichte Kokosmilch','Currypulver'],steps:'Tofu anbraten, Gemüse zugeben, mit Kokosmilch und Curry köcheln und mit Reis servieren.'},
 {name:'Thunfisch-Kartoffel-Salat',emoji:'🥗',kcal:490,p:42,c:50,f:13,time:'20 Min.',ingredients:['1 Dose Thunfisch im eigenen Saft','250 g Kartoffeln','Gurke & Tomate','80 g Joghurt','Senf'],steps:'Kartoffeln garen und abkühlen. Mit Gemüse und Thunfisch mischen, Joghurt-Senf-Dressing unterheben.'},
 {name:'Overnight Oats Protein',emoji:'🥣',kcal:450,p:32,c:58,f:10,time:'5 Min. + kaltstellen',ingredients:['60 g Haferflocken','200 ml Milch/Haferdrink','150 g Skyr','Beeren','Zimt'],steps:'Alles vermischen und über Nacht kaltstellen. Morgens mit Beeren toppen.'}
];

function recipeImage(r){
 const n=String(r.name||'').toLowerCase();
 if(/lachs/.test(n))return '/images/salmon.jpg';
 if(/skyr|beeren|porridge/.test(n))return '/images/porridge.jpg';
 if(/hähnchen.*reis/.test(n))return '/images/chicken-bowl.jpg';
 if(/pasta|bolognese/.test(n))return '/images/bolognese.jpg';
 if(/chili/.test(n))return '/images/chili.jpg';
 if(/curry/.test(n))return '/images/curry.jpg';
 if(/salat|thunfisch/.test(n))return '/images/salad.jpg';
 if(/overnight/.test(n))return '/images/overnight-oats.jpg';
 if(/rührei|wrap/.test(n))return '/images/chicken-bowl.jpg';
 return '/images/porridge.jpg';
}

function recipeCard(r,featured=false){
 const ing=r.ingredients.map(x=>`<li>${esc(x)}</li>`).join('');
 return `<article class="smart-recipe ${featured?'featured':''}"><div class="recipe-photo"><img src="${recipeImage(r)}" alt="${esc(r.name)}" loading="lazy"></div><div class="recipe-body"><div class="recipe-top"><b>${esc(r.name)}</b><span>${r.time}</span></div><div class="recipe-macros"><strong>${r.kcal} kcal</strong><span>P ${r.p} g</span><span>KH ${r.c} g</span><span>F ${r.f} g</span></div><details><summary>Zutaten & Zubereitung</summary><ul>${ing}</ul><p>${esc(r.steps)}</p></details><button class="btn soft wide" onclick="addSmartRecipe('${encodeURIComponent(r.name)}')">Als Mahlzeit eintragen</button></div></article>`;
}
window.addSmartRecipe=name=>{
 const r=smartRecipes.find(x=>x.name===decodeURIComponent(name));if(!r)return;
 addMeal(r.name,r.kcal,r.p,r.c,r.f,'Rezept');
};
function renderSmartRecipes(){
 const d=new Date(),day=Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000);
 const daily=smartRecipes[((day%smartRecipes.length)+smartRecipes.length)%smartRecipes.length];
 const el=document.getElementById('dailyRecipe');if(el)el.innerHTML=recipeCard(daily,true);
 const lib=document.getElementById('smartRecipeLibrary');if(lib)lib.innerHTML=smartRecipes.filter(x=>x!==daily).map(x=>recipeCard(x)).join('');
}
renderSmartRecipes();


async function ensureAIRecipeImages(){
 const cards=[...document.querySelectorAll('.smart-recipe')];
 for(let i=0;i<Math.min(cards.length,4);i++){
   const card=cards[i],img=card.querySelector('.recipe-photo img'),name=card.querySelector('.recipe-top b')?.textContent;
   if(!img||!name)continue;
   const key='recipe:'+aiImageKey(name),cache=aiImageCache();
   if(cache[key]){img.src=cache[key];continue;}
   try{
     const r=await fetch('/api/generate-food-image',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({dish:name})});
     if(!r.ok)continue;const data=await r.json();if(!data.image)continue;
     img.src=data.image;cache[key]=data.image;try{localStorage.setItem(AI_IMAGE_CACHE_KEY,JSON.stringify(cache))}catch{}
   }catch{}
 }
}

setTimeout(ensureAIRecipeImages,1200);
