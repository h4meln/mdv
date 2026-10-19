import { explore } from './explore.js';

const start = () => {
  explore(document.querySelector('.sp-content'), document.querySelectorAll('.sp-section')[1]);

  // il diorama (fixed) non deve bloccare lo scroll della colonna destra
  const rail = document.querySelector('.sp-content');
  const left = document.querySelector('.sp-left-wrap');
  if (rail && left && matchMedia('(min-width:981px)').matches) {
    left.addEventListener('wheel', e => {
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
