export function explore(container, section) {
  if (!container || !section) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const desktop = matchMedia('(min-width:981px)').matches;
  const target = desktop ? container : window;
  const position = () => desktop ? container.scrollTop : (window.scrollY || 0);
  if (position() > 10) return;

  let cancelled = false;
  let startTimer = 0;
  let returnTimer = 0;
  const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'];

  const cleanup = () => {
    clearTimeout(startTimer);
    clearTimeout(returnTimer);
    events.forEach(type => window.removeEventListener(type, cancel));
  };

  // Qualsiasi interazione dell'utente interrompe l'anteprima, senza rimbalzi
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    cleanup();
  };

  events.forEach(type => window.addEventListener(type, cancel, { passive: true }));

  startTimer = setTimeout(() => {
    if (cancelled) return;
    const top = desktop ? section.offsetTop : section.getBoundingClientRect().top + window.scrollY;
    target.scrollTo({ top, behavior: 'smooth' });

    returnTimer = setTimeout(() => {
      if (cancelled) return;
      target.scrollTo({ top: 0, behavior: 'smooth' });
      cleanup();
    }, 1800);
  }, 1600);
}
