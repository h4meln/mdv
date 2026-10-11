/* 
  tessere-store — mappa chiave → URL immagine.
  Legge da data/tessere.js (export const TESSERE = { ... }).
  Fallback su window.TESSERE. 
*/
let cache = null;
let loadPromise = null;

function emitUpdate() {
  window.dispatchEvent(new CustomEvent('tessere:update'));
}

export async function getTessere() {
  if (cache) return cache;
  if (loadPromise) return loadPromise;
  loadPromise = import('../../data/tessere.js')
    .then(m => m.TESSERE || m.default || {})
    .catch(() => window.TESSERE || {})
    .then(dict => {
      cache = dict || {};
      emitUpdate();        // ← notifica le card che la mappa è pronta
      return cache;
    });
  return loadPromise;
}