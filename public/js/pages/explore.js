export function explore(container, section) {
  if (!container || !section || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const desktop = matchMedia('(min-width:981px)').matches;
  const target = desktop ? container : window;
  const position = () => desktop ? container.scrollTop : scrollY;
  if (position() > 10) return;
  let cancelled = false;
  let returnTimer;
  const cancel = () => {
    cancelled = true; clearTimeout(startTimer); clearTimeout(returnTimer);
    target.scrollTo({top:position(),behavior:'instant'});
    cleanup();
  };
  const events = ['wheel','touchstart','pointerdown','keydown'];
  const cleanup = () => events.forEach(type => window.removeEventListener(type,cancel));
  events.forEach(type => window.addEventListener(type,cancel,{once:true,passive:true}));
  const startTimer = setTimeout(() => {
    if (cancelled) return;
    const top = desktop ? section.offsetTop : section.getBoundingClientRect().top + scrollY;
    target.scrollTo({top,behavior:'smooth'});
    returnTimer = setTimeout(() => {
      if (!cancelled) target.scrollTo({top:0,behavior:'smooth'});
      cleanup();
    }, 1800);
  }, 1600);
}
