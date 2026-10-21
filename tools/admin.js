import { EVENTS } from '../data/events.js';
import { BASE_CATEGORIES } from '../components/calendar/calendar.constants.js';
import { parseEventsFile, eventsModule, eventError, normalizeEvents, normalizeCategories, slugifyCategory, categoriesModule, categoryInUse, COLORS } from './data.js';
import '../components/calendar/calendar.js';
const $=id=>document.getElementById(id);
const KEY='mdv-event-workbench-v1';
const names=['title','date','time','end','category','location','description'];
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const initialEvents=normalizeEvents(EVENTS,true);
let state={events:initialEvents,selected:initialEvents.length?0:-1};
let customCategories={};
let storageAvailable=true, lastExport=JSON.stringify(initialEvents), lastCategoriesExport='{}', timer, noticeTimer, previewMode='card';
try {
 const saved=JSON.parse(localStorage.getItem(KEY)||'null');
 if(saved && Array.isArray(saved.events) && saved.events.length<=5000) {
  state={events:normalizeEvents(saved.events,true),selected:Math.min(Math.max(-1,Number(saved.selected)||0),saved.events.length-1)};
  customCategories=normalizeCategories(saved.customCategories);
  lastExport=typeof saved.lastExport==='string'?saved.lastExport:lastExport;
  lastCategoriesExport=typeof saved.lastCategoriesExport==='string'?saved.lastCategoriesExport:lastCategoriesExport;
 }
} catch { storageAvailable=false; }
function allCategories(){return {...BASE_CATEGORIES,...customCategories};}
const catLabel=key=>allCategories()[key]?.label||'Scegli categoria';
const catColor=key=>allCategories()[key]?.color||'sky';
let history=[JSON.stringify(state)], historyIndex=0;
const selected=()=>state.events[state.selected];
function notify(message){$('notice').textContent=message;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,4500);}
function saveLocal(){
 try { localStorage.setItem(KEY,JSON.stringify({...state,lastExport,customCategories,lastCategoriesExport}));storageAvailable=true; }
 catch {storageAvailable=false;}
 $('storage-status').textContent=storageAvailable?'Bozza salvata su questo dispositivo':'Salvataggio locale non disponibile - esporta una copia';
}
function checkpoint(){
 clearTimeout(timer);const next=JSON.stringify(state);
 if(JSON.stringify(state.events)!==JSON.stringify(JSON.parse(history[historyIndex]).events)){history=history.slice(0,historyIndex+1);history.push(next);if(history.length>60)history.shift();historyIndex=history.length-1;}
 saveLocal();updateStatus();
}
function updateStatus(){
 $('undo').disabled=historyIndex<=0;$('redo').disabled=historyIndex>=history.length-1;
 const invalid=state.events.findIndex(e=>eventError(e));
 const catsDirty=JSON.stringify(customCategories)!==lastCategoriesExport;
 const eventsDirty=JSON.stringify(state.events)!==lastExport;
 $('export').disabled=invalid>=0&&!catsDirty;
 const error=selected()?eventError(selected()):'';
 $('validation').textContent=error||(selected()?'Pronto per il calendario.':(state.events.length?'Scegli un evento.':'Crea il primo evento per iniziare.'));
 $('validation').classList.toggle('invalid',!!error);
 $('export-status').textContent=invalid>=0?`${state.events.filter(e=>eventError(e)).length} eventi da completare`:(!eventsDirty&&!catsDirty)?'Nessuna modifica da esportare':(catsDirty?'Categorie e eventi da esportare':'Modifiche da esportare');
}
function categoryBadge(key){const el=document.createElement('span');el.className='cat-chip';el.dataset.color=catColor(key);el.textContent=catLabel(key);return el;}
function formatTime(event){if(!event?.time)return event?'Tutto il giorno':'';return `${event.time}${event.end?'-'+event.end:''}`;}
function weekday(event){if(!event?.date||!/^\d{4}-\d{2}-\d{2}$/.test(event.date))return '';const d=new Date(event.date+'T12:00:00');if(Number.isNaN(d.getTime()))return '';return new Intl.DateTimeFormat('it',{weekday:'short'}).format(d).replace('.','');}
function renderList(){
 const query=$('search').value.toLocaleLowerCase('it').trim();const list=$('event-list');list.replaceChildren();
 $('count').textContent=String(state.events.length);
 state.events.map((event,index)=>({event,index})).filter(({event})=>[event.title,event.date,event.location,catLabel(event.category)].join(' ').toLocaleLowerCase('it').includes(query)).sort((a,b)=>(a.event.date||'').localeCompare(b.event.date||'')||(a.event.time||'99:99').localeCompare(b.event.time||'99:99')).forEach(({event,index})=>{
  const button=document.createElement('button');button.className='event-entry'+(eventError(event)?' invalid':'');button.setAttribute('aria-current',String(index===state.selected));
  const date=document.createElement('span');date.className='date-tag';
  if(event.date){const wd=weekday(event);date.textContent=(wd?wd+'\n':'')+event.date.slice(8)+'\n'+event.date.slice(5,7)+' '+event.date.slice(0,4);}else{date.textContent='-';}
  const body=document.createElement('span');
  const title=document.createElement('strong');title.textContent=event.title||'Evento senza titolo';
  const meta=document.createElement('small');meta.textContent=[formatTime(event),event.location||'Luogo da definire'].filter(Boolean).join(' - ');
  const row=document.createElement('span');row.className='event-meta-row';row.append(categoryBadge(event.category));
  const when=document.createElement('span');when.className='event-when';when.textContent=formatTime(event);if(when.textContent)row.append(when);
  body.append(title,meta,row);
  const err=eventError(event);if(err){const reason=document.createElement('small');reason.className='event-reason';reason.textContent=err;body.append(reason);}
  button.append(date,body);
  button.addEventListener('click',()=>{checkpoint();state.selected=index;saveLocal();render();});
  list.append(button);
 });
 if(!list.children.length){const empty=document.createElement('p');empty.className='empty-list';empty.textContent=state.events.length?'Nessun evento corrisponde alla ricerca.':'Il programma è ancora tutto da scrivere. Cominciamo?';list.append(empty);}
 $('empty-state').hidden=state.events.length>0;
 $('card-preview').hidden=state.events.length===0||previewMode!=='card';
 $('calendar-preview').hidden=state.events.length===0||previewMode!=='calendar';
}function updatePreview(){
 const event=selected();
 $('preview-title').textContent=event?.title||'Il prossimo evento comincia con un’idea.';
 $('preview-category').textContent=event?catLabel(event.category):'IL PROSSIMO INCONTRO';
 let date='Ci vediamo qui.';
 if(event?.date && !Number.isNaN(new Date(event.date+'T12:00:00').getTime()))date=new Intl.DateTimeFormat('it',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(event.date+'T12:00:00'));
 $('preview-date').textContent=date;$('preview-description').textContent=event?.description||'';
 $('preview-location').textContent=event?.location||'Arosio - Via Volta 38';
 $('preview-time').textContent=formatTime(event);
 if(previewMode==='calendar' && state.events.length){
  const calendar=document.querySelector('mdv-calendar');calendar.events=state.events.filter(e=>!eventError(e));
  if(event?.date && /^\d{4}-\d{2}-\d{2}$/.test(event.date))calendar.showDate(event.date);
 }
 updateStatus();
}
function renderCategorySelect(){
 const select=$('category');const previous=select.value;select.replaceChildren();
 for(const [key,cat] of Object.entries(allCategories())){
  const option=document.createElement('option');option.value=key;option.textContent=cat.label;select.append(option);
 }
 if(previous && allCategories()[previous])select.value=previous;
}
function renderCategories(){
 const list=$('category-list');list.replaceChildren();
 $('category-count').textContent=String(Object.keys(customCategories).length);
 for(const [key,cat] of Object.entries(customCategories)){
  const row=document.createElement('div');row.className='category-row';
  const sw=document.createElement('span');sw.className='category-swatch';sw.style.background=`var(--${cat.color})`;
  const name=document.createElement('span');name.className='category-name';name.textContent=cat.label;
  const keyEl=document.createElement('span');keyEl.className='category-key';keyEl.textContent=key;name.append(keyEl);
  const del=document.createElement('button');del.type='button';del.textContent='Elimina';del.className='danger';
  del.addEventListener('click',()=>{
   if(categoryInUse(key,state.events)){notify('Questa categoria è usata da eventi in bozza: cambia la categoria prima di eliminarla.');return;}
   checkpoint();delete customCategories[key];lastCategoriesExport='__dirty__';saveLocal();renderCategories();renderCategorySelect();render();notify('Categoria eliminata.');
  });
  row.append(sw,name,del);list.append(row);
 }
 if(!Object.keys(customCategories).length){const p=document.createElement('p');p.className='empty-list';p.textContent='Nessuna categoria personalizzata. Le categorie di base restano sempre disponibili.';list.append(p);}
}
function render(){
 renderList();renderCategories();renderCategorySelect();
 const event=selected();$('fields').disabled=!event;
 for(const name of names)$(name).value=event?.[name]||'';
 updatePreview();
}
for(const color of COLORS){const option=document.createElement('option');option.value=color;option.textContent=color;$('category-color').append(option);}
$('category-form').addEventListener('submit',e=>{
 e.preventDefault();
 const label=$('category-label').value.trim();
 const color=$('category-color').value;
 const error=$('category-error');
 if(!label){error.textContent='Scrivi un nome per la categoria.';error.hidden=false;return;}
 const key=slugifyCategory(label);
 if(!key){error.textContent='Il nome deve contenere lettere o numeri.';error.hidden=false;return;}
 if(allCategories()[key]){error.textContent='Esiste già una categoria con questa chiave. Scegli un altro nome.';error.hidden=false;return;}
 error.hidden=true;
 checkpoint();
 customCategories[key]={label,color};
 lastCategoriesExport='__dirty__';
 $('category-label').value='';
 $('category-color').value='sky';
 saveLocal();render();notify(`Categoria "${label}" creata. Ora puoi assegnarla agli eventi.`);
});
$('event-form').addEventListener('submit',e=>e.preventDefault());
$('event-form').addEventListener('input',e=>{
 if(!selected()||!names.includes(e.target.name))return;
 selected()[e.target.name]=e.target.value;renderList();updatePreview();saveLocal();clearTimeout(timer);timer=setTimeout(checkpoint,400);
});
$('add').onclick=()=>{checkpoint();state.events.push({title:'',date:today(),category:Object.keys(BASE_CATEGORIES)[0],time:'',end:'',location:'Mondo delle Uova, Arosio',description:''});state.selected=state.events.length-1;checkpoint();render();$('title').focus();};
$('empty-add-event').onclick=()=>$('add').click();
$('empty-add-category').onclick=()=>{$('category-panel').open=true;$('category-label').focus();$('category-panel').scrollIntoView({block:'nearest'});};
$('duplicate').onclick=()=>{if(!selected())return;checkpoint();state.events.push({...selected(),title:(selected().title+' - copia').slice(0,160)});state.selected=state.events.length-1;checkpoint();render();notify('Evento duplicato. Controlla la data prima di esportare.');};
$('delete').onclick=()=>{if(!selected())return;checkpoint();state.events.splice(state.selected,1);state.selected=Math.min(state.selected,state.events.length-1);checkpoint();render();notify('Evento eliminato dalla bozza. Puoi annullare.');};
$('undo').onclick=()=>{checkpoint();if(historyIndex>0){state=JSON.parse(history[--historyIndex]);saveLocal();render();}};
$('redo').onclick=()=>{if(historyIndex<history.length-1){state=JSON.parse(history[++historyIndex]);saveLocal();render();}};
$('search').oninput=renderList;
for(const mode of ['card','calendar'])$('show-'+mode).onclick=()=>{previewMode=mode;for(const m of ['card','calendar'])$('show-'+m).setAttribute('aria-pressed',String(m===mode));renderList();updatePreview();};
function download(filename,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').onclick=()=>{
 try {
  const output=eventsModule(state.events);
  download('events.js',output,'text/javascript;charset=utf-8');
  lastExport=JSON.stringify(state.events);
  if(Object.keys(customCategories).length){
   download('categories.js',categoriesModule(customCategories),'text/javascript;charset=utf-8');
   lastCategoriesExport=JSON.stringify(customCategories);
   notify('events.js e categories.js scaricati. Sostituisci data/events.js e data/categories.js nel progetto, poi pubblica.');
  } else {
   lastCategoriesExport='{}';
   notify('events.js scaricato. Sostituiscilo nel progetto per pubblicare.');
  }
  saveLocal();updateStatus();
 } catch(error){notify(error.message);}
};
$('backup').onclick=()=>{download('mdv-eventi.json',JSON.stringify({kind:'mdv-events-draft',events:state.events,customCategories},null,2),'application/json');notify('Copia JSON scaricata.');};
$('import').onclick=()=>$('file').click();
$('file').onchange=async()=>{
 const file=$('file').files[0];if(!file)return;
 try {
  if(file.size>2000000)throw new Error('File troppo grande (massimo 2 MB).');
  const text=await file.text();
  let payload=null, events=null;
  try {const parsed=JSON.parse(text);if(parsed && Array.isArray(parsed.events)){payload=parsed;events=normalizeEvents(parsed.events,true);}} catch {}
  if(!events)events=parseEventsFile(text);
  if(state.events.length&&!confirm(`Aprire ${events.length} eventi al posto dei ${state.events.length} nella bozza? Puoi annullare dopo l'importazione.`))return;
  checkpoint();
  state={events,selected:events.length?0:-1};
  if(payload && payload.customCategories){customCategories=normalizeCategories(payload.customCategories);lastCategoriesExport='__dirty__';}
  checkpoint();render();notify(`${events.length} eventi importati.`);
 }catch(error){notify('Importazione non riuscita: '+error.message);}
 finally{$('file').value='';}
};
document.addEventListener('keydown',e=>{
 if(!(e.ctrlKey||e.metaKey))return;
 if(e.key.toLowerCase()==='s'){e.preventDefault();$('export').click();}
 if(e.key.toLowerCase()==='z'&&!e.target.matches('input,textarea')){e.preventDefault();$(e.shiftKey?'redo':'undo').click();}
});
await customElements.whenDefined('mdv-calendar');render();saveLocal();