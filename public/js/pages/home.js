(function () {
    'use strict';

    const hero = document.getElementById('logoHero');
    const caption = document.getElementById('heroCaption');
    const nav = document.querySelector('mdv-eggbar');
    const eggs = document.querySelector('.egg-parallax');

    if (!hero) return;

    const link = hero.querySelector('a');
    const text = hero.querySelector('.logo-text');
    const root = document.documentElement;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rem = () => parseFloat(getComputedStyle(root).fontSize) || 16;
    const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

    /* ===================== CONFIG ===================== */
    const CFG = {
        startVh: 0.25,          // dimensione iniziale logo (vh)
        maxVw: 0.90,            // limite larghezza viewport
        endX: () => 2.5 * rem(), // posizione finale logo
        endY: () => 2 * rem(),
        distance: () => Math.min(innerHeight * 0.75, 700),
        ease: t => 1 - Math.pow(1 - t, 3),
        textFrom: 0.45,         // quando appare il testo del logo
        captionGap: () => (innerWidth < 700 ? 1.6 : 2.6) * rem(),
        captionFade: 0.45,
        captionDrift: 34,

        // soglie navbar con isteresi (px)
        navShowAt: 80,
        navHideAt: 20
    };

    /* ===================== STATE ===================== */
    let metrics = null;
    let ticking = false;
    let resizeQueued = false;
    let ready = false;
    let navVisible = false;

    /* ===================== MEASURE ===================== */
    function measure() {
        const width = hero.offsetWidth;
        const height = hero.offsetHeight;
        if (!width || !height) return;

        const vw = innerWidth;
        const vh = innerHeight;

        const scale0 = Math.max(
            1,
            Math.min((vh * CFG.startVh) / height, (vw * CFG.maxVw) / width)
        );

        metrics = {
            width,
            height,
            scale0,
            startX: vw / 2,
            startY: vh / 3.15,
            endX: CFG.endX() + width / 2,
            endY: CFG.endY() + height / 2,
            distance: CFG.distance()
        };

        updateCaptionPosition();
        render();
    }

    function updateCaptionPosition() {
        if (!caption || !metrics) return;
        const logoBottom = metrics.startY + (metrics.height * metrics.scale0) / 2;
        caption.style.top = `${(logoBottom + CFG.captionGap()).toFixed(1)}px`;
    }

    /* ===================== NAVBAR TOGGLE ===================== */
    function updateNav(scroll) {
        const shouldShow = navVisible
            ? scroll > CFG.navHideAt
            : scroll > CFG.navShowAt;

        if (shouldShow === navVisible) return;

        navVisible = shouldShow;
        nav?.classList.toggle('is-visible', navVisible);
        document.body.classList.toggle('nav-hidden', !navVisible);
    }

    /* ===================== UOVA ===================== */
    // Le uova restano ferme e scendono fuori dal fondo del viewport allo scroll.
    // Nessun listener dedicato: sfrutta lo stesso requestAnimationFrame del logo.
    function renderEggs(scroll) {
        if (!eggs) return;
        if (reducedMotion) { eggs.style.opacity = '1'; return; }
        const t = clamp(scroll / (innerHeight * 0.6), 0, 1);
        eggs.style.transform = `translate3d(0, ${(t * 70).toFixed(2)}vh, 0)`;
        eggs.style.opacity = (1 - t).toFixed(3);
    }

    /* ===================== RENDER ===================== */
    function render() {
        const scroll = scrollY || root.scrollTop || 0;

        renderEggs(scroll);

        if (!metrics) return;

        updateNav(scroll);

        const progress = reducedMotion ? 1 : clamp(scroll / metrics.distance, 0, 1);
        const eased = CFG.ease(progress);

        // logo: dimensione + posizione
        const scale = metrics.scale0 + (1 - metrics.scale0) * eased;
        const cx = metrics.startX + (metrics.endX - metrics.startX) * eased;
        const cy = metrics.startY + (metrics.endY - metrics.startY) * eased;
        const x = cx - (metrics.width * scale) / 2;
        const y = cy - (metrics.height * scale) / 2;

        hero.style.transform =
            `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;

        // testo logo
        if (text) {
            const tp = clamp((eased - CFG.textFrom) / (1 - CFG.textFrom), 0, 1);
            text.style.opacity = reducedMotion ? '1' : tp.toFixed(3);
        }

        // caption
        if (caption) {
            const cp = reducedMotion ? 1 : clamp(progress / CFG.captionFade, 0, 1);
            caption.style.opacity = (1 - cp).toFixed(3);
            caption.style.transform =
                `translate3d(0, ${(-cp * CFG.captionDrift).toFixed(1)}px, 0)`;
        }

        // interazione solo a logo "parcheggiato"
        const parked = progress > 0.995;
        hero.style.pointerEvents = parked ? 'auto' : 'none';
        if (link) link.style.pointerEvents = parked ? 'auto' : 'none';

        if (!ready) {
            ready = true;
            hero.classList.add('is-ready');
        }
    }

    /* ===================== SCHEDULING ===================== */
    function requestRender() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { render(); ticking = false; });
    }

    function requestMeasure() {
        if (resizeQueued) return;
        resizeQueued = true;
        requestAnimationFrame(() => { resizeQueued = false; measure(); });
    }

    const onScroll = () => requestRender();

    /* ===================== EVENTS ===================== */
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', requestMeasure, { passive: true });
    addEventListener('orientationchange', requestMeasure, { passive: true });

    if ('ResizeObserver' in window) {
        new ResizeObserver(requestMeasure).observe(hero);
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) requestMeasure();
    });

    /* ===================== INIT ===================== */
    // stato iniziale coerente con la posizione di scroll corrente
    navVisible = (scrollY || 0) > CFG.navShowAt;
    document.body.classList.toggle('nav-hidden', !navVisible);
    nav?.classList.toggle('is-visible', navVisible);

    measure();
    if (document.fonts?.ready) document.fonts.ready.then(measure);
})();

// GoFundMe's widget reports its height after loading; accept only its own messages.
addEventListener('message', event => {
  const widget=document.querySelector('.gfm-embed-iframe');
  if(event.origin !== 'https://www.gofundme.com' || event.source !== widget?.contentWindow) return;
  if(event.data?.type === 'gfm-embed-widget-resize') {
    const height=Number(event.data.offsetHeight);
    if(Number.isFinite(height) && height > 0) widget.height=String(Math.min(1800,Math.max(200,height)));
  }
});
