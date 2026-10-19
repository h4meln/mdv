/** Parse data files without executing JavaScript. Supports legacy literal arrays. */
import { CATEGORIES } from '../components/calendar/calendar.constants.js';
const fields = ['date','time','end','title','category','location','description'];
const legacy = { team:'meeting', design:'workshop', work:'workshop', oneOnOne:'meeting', personal:'social', family:'social', travel:'social', critical:'deadline' };
export function normalizeEvents(value, draft = false) {
  if (!Array.isArray(value) || value.length > 5000) throw new Error('Il file deve contenere un elenco di massimo 5000 eventi.');
  return value.map((source,index) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error(`Evento ${index+1}: formato non valido.`);
    const event = {};
    for (const field of fields) {
      if (source[field] != null && typeof source[field] !== 'string') throw new Error(`Evento ${index+1}: ${field} deve essere testo.`);
      if (source[field]?.trim()) event[field] = source[field].trim();
    }
    event.category = legacy[event.category] || event.category || 'meeting';
    const error = eventError(event);
    if (error && !draft) throw new Error(`Evento ${index+1}: ${error}`);
    return event;
  });
}
export function eventError(event) {
  if (!event.title?.trim()) return 'Aggiungi un titolo.';
  if (event.title.length > 160) return 'Il titolo può avere al massimo 160 caratteri.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date || '')) return 'Scegli una data valida.';
  const date = new Date(event.date + 'T12:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== event.date) return 'La data non esiste.';
  for (const key of ['time','end']) if (event[key] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(event[key])) return 'Usa orari nel formato HH:MM.';
  if (event.end && !event.time) return 'Indica l’ora di inizio prima della fine.';
  if (!CATEGORIES[event.category]) return 'Scegli una categoria.';
  if ((event.location || '').length > 250 || (event.description || '').length > 4000) return 'Luogo o descrizione troppo lunghi.';
  return '';
}
export function eventsModule(events) {
  const normalized=normalizeEvents(events).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99'));
  return '// Mondo delle Uova — eventi confermati\nexport const EVENTS = ' + JSON.stringify(normalized,null,2) + ';\n';
}
export function parseEventsFile(source) {
  if (source.length > 2000000) throw new Error('File troppo grande (massimo 2 MB).');
  let text=source.replace(/^\uFEFF/,'').trim(), position=0;
  function skip() {
    while(position<text.length) {
      if(/\s/.test(text[position])) {position++;continue;}
      if(text.startsWith('//',position)) { const end=text.indexOf('\n',position);position=end<0?text.length:end+1;continue; }
      if(text.startsWith('/*',position)) { const end=text.indexOf('*/',position+2);if(end<0)throw new Error('Commento incompleto.');position=end+2;continue; }
      break;
    }
  }
  function string() {
    const quote=text[position++];let output='';
    while(position<text.length) {
      let c=text[position++];if(c===quote)return output;
      if(c==='\\') {
        const escaped=text[position++];
        if(escaped==='u') { const hex=text.slice(position,position+4);if(!/^[\da-f]{4}$/i.test(hex))throw new Error('Escape Unicode non valido.');output+=String.fromCharCode(parseInt(hex,16));position+=4; }
        else if(escaped==='x') {const hex=text.slice(position,position+2);if(!/^[\da-f]{2}$/i.test(hex))throw new Error('Escape non valido.');output+=String.fromCharCode(parseInt(hex,16));position+=2;}
        else {const escapes={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','0':'\0'};output+=escapes[escaped]??escaped;}
      } else { if(c==='\n'||c==='\r')throw new Error('Testo su più righe non valido: usa \\n.');output+=c; }
    }
    throw new Error('Stringa incompleta.');
  }
  function value(depth=0) {
    if(depth>12)throw new Error('Struttura troppo profonda.');skip();const c=text[position];
    if(c==='"'||c==="'")return string();
    if(c==='['||c==='{') {
      position++;const array=c==='[', result=array?[]:Object.create(null),end=array?']':'}';skip();
      while(text[position]!==end) {
        if(array) result.push(value(depth+1));
        else {
          skip();let key;
          if(text[position]==='"'||text[position]==="'")key=string();
          else {const match=text.slice(position).match(/^[A-Za-z_$][\w$]*/);if(!match)throw new Error('Nome campo non valido.');key=match[0];position+=key.length;}
          if(['__proto__','constructor','prototype'].includes(key))throw new Error('Campo non consentito.');
          skip();if(text[position++]!==':')throw new Error('Atteso : dopo il campo.');result[key]=value(depth+1);
        }
        skip();if(text[position]===end)break;if(text[position++]!==',')throw new Error('Attesa una virgola.');skip();
      }
      position++;return result;
    }
    const literal=text.slice(position).match(/^(true|false|null|-?\d+(?:\.\d+)?)(?=\s|,|\]|\}|$)/);
    if(literal){position+=literal[0].length;return JSON.parse(literal[0]);}
    throw new Error('Sono ammessi solo dati, non codice JavaScript.');
  }
  skip();const prefix=text.slice(position).match(/^(?:export\s+const\s+EVENTS\s*=|window\.CALENDAR_EVENTS\s*=)/);
  if(prefix)position+=prefix[0].length;
  const result=value();skip();if(text[position]===';')position++;skip();
  if(position!==text.length)throw new Error('Il file contiene codice aggiuntivo: importa solo l’elenco eventi.');
  return normalizeEvents(Array.isArray(result)?result:result?.events, result?.kind === 'mdv-events-draft');
}
