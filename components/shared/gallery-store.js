/* gallery-store — array di immagini per <mdv-gallery>.
   Legge da data/gallery.js (export const GALLERY = [...]).
   Ogni elemento può essere:
     'url/immagine.jpg'
     { src: 'url', alt: '...' }
     { src: '...', sources: [{type, srcset}, ...] }  // per <picture> */
let cache = null;
let loadPromise = null;

export async function getGallery() {
  if (cache) return cache;
  if (loadPromise) return loadPromise;
  loadPromise = import('../../data/gallery.js')
    .then(m => m.GALLERY || m.default || [])
    .catch(() => window.GALLERY || [])
    .then(list => { cache = Array.isArray(list) ? list : []; return cache; });
  return loadPromise;
}
