/* events-store — unica sorgente dati per il calendario.
   Legge da data/events.js (export const EVENTS = [...]).
   Fallback su window.CALENDAR_EVENTS per retro-compatibilità. */
let cache = null;
let loadPromise = null;

export async function getEvents() {
  if (cache) return cache;
  if (loadPromise) return loadPromise;

  loadPromise = import('../../data/events.js')
    .then(m => m.EVENTS || m.default || [])
    .catch(err => {
      console.warn('[events-store] data/events.js non caricabile, fallback globale', err);
      return window.CALENDAR_EVENTS || [];
    })
    .then(list => {
      cache = Array.isArray(list) ? list : [];
      if (!cache.length && Array.isArray(window.CALENDAR_EVENTS)) {
        cache = window.CALENDAR_EVENTS;
      }
      return cache;
    });

  return loadPromise;
}

export function invalidate() {
  cache = null;
  loadPromise = null;
}
