import { EVENTS } from '../data/events.js';
import { CATEGORIES } from '../components/calendar/calendar.constants.js';
import { parseEventsFile, eventsModule, eventError, normalizeEvents } from './event-data.js';
import '../components/calendar/calendar.js';
const $=id=>document.getElementById(id);
const KEY='mdv-event-workbench-v1';
const names=['title','date','time','end','category','location','description'];
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const initialEvents=normalizeEvents(EVENTS,true);
let state={events:initialEvents,selected:initialEvents.length?0:-1};
let storageAvailable=true, lastExport=JSON.stringify(initialEvents), timer, noticeTimer, previewMode='card';
try {
 const saved=JSON.parse(localStorage.getItem(KEY)||'null');
 if(saved && Array.isArray(saved.events) && saved.events.length<=5000) {
  state={events:normalizeEvents(saved.events,true),selected:Math.min(Math.max(-1,Number(saved.selected)||0),saved.events.length-1)};
  lastExport=typeof saved.lastExport==='string'?saved.lastExport:lastExport;
 }
} catch { storageAvailable=false; }
let history=[JSON.stringify(state)], historyIndex=0;
const selected=()=>state.events[state.selected];
function notify(message){$('notice').textContent=message;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,4500);}
function saveLocal(){
 try { localStorage.setItem(KEY,JSON.stringify({...state,lastExport}));storageAvailable=true; }
 catch {storageAvailable=false;}
 $('storage-status').textContent=storageAvailable?'Bozza salvata su questo dispositivo':'Salvataggio locale non disponibile — esporta una copia';
}
function checkpoint(){
 clearTimeout(timer);const next=JSON.stringify(state);
 if(JSON.stringify(state.events)!==JSON.stringify(JSON.parse(history[historyIndex]).events)){history=history.slice(0,historyIndex+1);history.push(next);if(history.length>60)history.shift();historyIndex=history.length-1;}
 saveLocal();updateStatus();
}
function updateStatus(){
 $('undo').disabled=historyIndex<=0;$('redo').disabled=historyIndex>=history.length-1;
 const invalid=state.events.findIndex(e=>eventError(e));
 $('export').disabled=invalid>=0;
 const error=selected()?eventError(selected()):'';
 $('validation').textContent=error||(selected()?'Pronto per il calendario.':'Aggiungi un evento per iniziare.');
 $('validation').classList.toggle('invalid',!!error);
 $('export-status').textContent=invalid>=0?`${state.events.filter(e=>eventError(e)).length} eventi da completare`:JSON.stringify(state.events)===lastExport?'Nessuna modifica da esportare':'Modifiche da esportare';
}
function renderList(){
 const query=$('search').value.toLocaleLowerCase('it').trim();const list=$('event-list');list.replaceChildren();
 $('count').textContent=String(state.events.length);
 state.events.map((event,index)=>({event,index})).filter(({event})=>[event.title,event.date,event.location].join(' ').toLocaleLowerCase('it').includes(query)).sort((a,b)=>(a.event.date||'').localeCompare(b.event.date||'')).forEach(({event,index})=>{
  const button=document.createElement('button');button.className='event-entry'+(eventError(event)?' invalid':'');button.setAttribute('aria-current',String(index===state.selected));
  const date=document.createElement('span');date.className='date-tag';date.textContent=event.date?event.date.slice(8)+'\n'+event.date.slice(5,7):'—';
  const body=document.createElement('span'),title=document.createElement('strong'),meta=document.createElement('small');title.textContent=event.title||'Evento senza titolo';meta.textContent=CATEGORIES[event.category]?.label||'Scegli categoria';body.append(title,meta);button.append(date,body);
  button.addEventListener('click',()=>{checkpoint();state.selected=index;saveLocal();render();});list.append(button);
 });
 if(!list.children.length){const empty=document.createElement('p');empty.className='empty-list';empty.textContent=state.events.length?'Nessun evento corrisponde alla ricerca.':'Il programma è ancora tutto da scrivere. Cominciamo?';list.append(empty);}
}
function updatePreview(){
 const event=selected();
 $('preview-title').textContent=event?.title||'Il prossimo evento comincia con un’idea.';
 $('preview-category').textContent=CATEGORIES[event?.category]?.label||'IL PROSSIMO INCONTRO';
 let date='Ci vediamo qui.';
 if(event?.date && !Number.isNaN(new Date(event.date+'T12:00:00').getTime()))date=new Intl.DateTimeFormat('it',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(event.date+'T12:00:00'));
 $('preview-date').textContent=date;$('preview-description').textContent=event?.description||'';
 $('preview-location').textContent=event?.location||'Arosio · Via Volta 38';
 $('preview-time').textContent=event?.time?`${event.time}${event.end?' — '+event.end:''}`:event?'Tutto il giorno':'';
 if(previewMode==='calendar'){
  const calendar=document.querySelector('mdv-calendar');calendar.events=state.events.filter(e=>!eventError(e));
  if(event?.date && /^\d{4}-\d{2}-\d{2}$/.test(event.date))calendar.showDate(event.date);
 }
 updateStatus();
}
function render(){
 renderList();const event=selected();$('fields').disabled=!event;
 for(const name of names)$(name).value=event?.[name]||'';
 updatePreview();
}
for(const [value,cat] of Object.entries(CATEGORIES)){const option=document.createElement('option');option.value=value;option.textContent=cat.label;$('category').append(option);}
$('event-form').addEventListener('submit',e=>e.preventDefault());
$('event-form').addEventListener('input',e=>{
 if(!selected()||!names.includes(e.target.name))return;
 selected()[e.target.name]=e.target.value;renderList();updatePreview();saveLocal();clearTimeout(timer);timer=setTimeout(checkpoint,400);
});
$('add').onclick=()=>{checkpoint();state.events.push({title:'',date:today(),category:'concert',time:'',end:'',location:'Mondo delle Uova, Arosio',description:''});state.selected=state.events.length-1;checkpoint();render();$('title').focus();};
$('duplicate').onclick=()=>{if(!selected())return;checkpoint();state.events.push({...selected(),title:(selected().title+' — copia').slice(0,160)});state.selected=state.events.length-1;checkpoint();render();notify('Evento duplicato. Controlla la data prima di esportare.');};
$('delete').onclick=()=>{if(!selected())return;checkpoint();state.events.splice(state.selected,1);state.selected=Math.min(state.selected,state.events.length-1);checkpoint();render();notify('Evento eliminato dalla bozza. Puoi annullare.');};
$('undo').onclick=()=>{checkpoint();if(historyIndex>0){state=JSON.parse(history[--historyIndex]);saveLocal();render();}};
$('redo').onclick=()=>{if(historyIndex<history.length-1){state=JSON.parse(history[++historyIndex]);saveLocal();render();}};
$('search').oninput=renderList;
for(const mode of ['card','calendar'])$('show-'+mode).onclick=()=>{previewMode=mode;$('card-preview').hidden=mode!=='card';$('calendar-preview').hidden=mode!=='calendar';for(const m of ['card','calendar'])$('show-'+m).setAttribute('aria-pressed',String(m===mode));updatePreview();};
function download(filename,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').onclick=()=>{
 try {const output=eventsModule(state.events);download('events.js',output,'text/javascript;charset=utf-8');lastExport=JSON.stringify(state.events);saveLocal();updateStatus();notify('events.js scaricato. Sostituiscilo nel progetto per pubblicare.');}
 catch(error){notify(error.message);}
};
$('backup').onclick=()=>{download('mdv-eventi.json',JSON.stringify({kind:'mdv-events-draft',events:state.events},null,2),'application/json');notify('Copia JSON scaricata.');};
$('import').onclick=()=>$('file').click();
$('file').onchange=async()=>{
 const file=$('file').files[0];if(!file)return;
 try {
  if(file.size>2000000)throw new Error('File troppo grande (massimo 2 MB).');
  const events=parseEventsFile(await file.text());
  if(state.events.length&&!confirm(`Aprire ${events.length} eventi al posto dei ${state.events.length} nella bozza? Puoi annullare dopo l’importazione.`))return;
  checkpoint();state={events,selected:events.length?0:-1};checkpoint();render();notify(`${events.length} eventi importati.`);
 }catch(error){notify('Importazione non riuscita: '+error.message);}
 finally{$('file').value='';}
};
document.addEventListener('keydown',e=>{
 if(!(e.ctrlKey||e.metaKey))return;
 if(e.key.toLowerCase()==='s'){e.preventDefault();$('export').click();}
 if(e.key.toLowerCase()==='z'&&!e.target.matches('input,textarea')){e.preventDefault();$(e.shiftKey?'redo':'undo').click();}
});
await customElements.whenDefined('mdv-calendar');render();saveLocal();
