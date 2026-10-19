import { explore } from './explore.js';

const start = () => {
  explore(document.querySelector('.content'), document.querySelectorAll('.section')[1]);

  // la mappa (fixed) non deve "ingoiare" lo scroll della colonna
  const rail = document.querySelector('.content');
  const map = document.querySelector('.map-wrap');

  // la mappa appare solo quando ha finito di caricare: niente flash bianco
  const frame = map && map.querySelector('iframe');
  if (frame) {
    const reveal = () => frame.classList.add('is-ready');
    if (frame.contentDocument && frame.contentDocument.readyState === 'complete') reveal();
    else frame.addEventListener('load', reveal, { once: true });
    setTimeout(reveal, 4000); // fallback: non lasciarla invisibile per sempre
  }
  if (rail && map && matchMedia('(min-width:981px)').matches) {
    map.addEventListener('wheel', e => {
      e.preventDefault();
      rail.scrollBy({ top: e.deltaY, behavior: 'auto' });
    }, { passive: false });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
