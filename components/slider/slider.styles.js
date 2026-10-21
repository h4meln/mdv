export const SWIPER_BASE_CSS = `
.swiper { margin-left:auto; margin-right:auto; position:relative; overflow:hidden; list-style:none; padding:0; z-index:1; display:block; }
.swiper-wrapper { position:relative; width:100%; height:100%; z-index:1; display:flex; transition-property:transform; box-sizing:content-box; }
.swiper-slide { flex-shrink:0; width:100%; height:100%; position:relative; transition-property:transform; display:block; }
.swiper-cards { overflow:visible; }
.swiper-3d { perspective:1200px; }
.swiper-3d .swiper-wrapper, .swiper-3d .swiper-slide { transform-style:preserve-3d; }
.swiper-cards .swiper-slide { transform-origin:center bottom; backface-visibility:hidden; }
.swiper-button-prev, .swiper-button-next { position:absolute; top:50%; z-index:10; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.swiper-button-disabled { opacity:.35; cursor:auto; pointer-events:none; }
.swiper-button-lock { display:none; }
.swiper-pagination { position:absolute; text-align:center; transition:.3s opacity; transform:translate3d(0,0,0); z-index:10; }
.swiper-pagination-bullet { width:8px; height:8px; display:inline-block; border-radius:50%; background:#000; opacity:.2; }
.swiper-pagination-bullet-active { opacity:1; background:var(--swiper-pagination-color, #fff); }
.swiper-pagination-lock { display:none; }
`;

export const SLIDER_STYLES = `
:host {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  container-type: inline-size;
  font-family: "Bricolage Grotesque", system-ui, sans-serif;
  --swiper-theme-color: #fff;
  --swiper-navigation-color: #fff;
  --swiper-navigation-size: 22px;
  --swiper-pagination-color: #fff;
  --prev-btn: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='15 18 9 12 15 6'/></svg>");
  --next-btn: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='9 18 15 12 9 6'/></svg>");

  /* Larghezza "viva" della slide. 78% del container → le card adiacenti
     si affacciano per ~11% per lato. Il resto può uscire liberamente. */
  --slide: clamp(220px, 78cqw, 420px);

  contain: layout style;
}

/* Nessun clip qui: le card escono dal componente e vengono fermate
   dal viewport (che è l'unico confine sensato). */
.slider {
  position: relative;
  width: 100%;
  min-width: 0;
  overflow: visible;
}

.slider-title {
  text-align: center;
  font-size: clamp(0.9rem, 1.6cqw + 0.5rem, 1.2rem);
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #fff;
  margin: 0 0 12px;
  text-shadow: 0 2px 12px rgba(0,0,0,0.6);
}

.swiper {
  width: 100%;
  padding: 30px 0 80px;
  overflow: visible;
  box-sizing: border-box;
  /* Lo swipe orizzontale resta a Swiper; quello verticale scorre la pagina.
     Senza questo Chrome emette pointercancel sul primo move orizzontale. */
  touch-action: pan-y;
}
.swiper-wrapper { padding-bottom: 0; height: var(--slide); }

/* ── Slide: scala con il container, lascia affiorare le vicine ── */
.swiper-slide {
  width: var(--slide) !important;
  height: var(--slide);
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent !important;
  --card-intensity: 0.4;

  --mdv-land-w: calc(var(--slide) * 372 / 420);
  --mdv-land-h: calc(var(--slide) * 266 / 420);
  --mdv-port-w: calc(var(--slide) * 266 / 420);
  --mdv-port-h: calc(var(--slide) * 372 / 420);
}
.swiper-slide-active { --card-intensity: 1; }

/* ── Badge pagination ── */
.swiper-pagination {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 8px 8px;
  max-width: min(480px, calc(100cqw - 32px));
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-behavior: smooth;
}
.swiper-pagination::-webkit-scrollbar { display: none; }

.swiper-pagination-bullet {
  width: auto; height: auto;
  min-width: 56px;
  padding: 6px 14px;
  border-radius: 16px;
  background: rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.72);
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: .06em;
  text-align: center;
  opacity: 1;
  margin: 0 !important;
  cursor: pointer;
  transition: background .2s, color .2s, transform .2s;
  flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  user-select: none;
  white-space: nowrap;
}
.swiper-pagination-bullet:hover {
  background: rgba(255,255,255,0.22);
  color: #fff;
  transform: translateY(-1px);
}
.swiper-pagination-bullet-active {
  background: #fff;
  color: #1b1b22;
  transform: translateY(-1px);
}
.slider-badge-label { display: block; line-height: 1; }

/* ── Frecce ── */
.swiper-button-prev, .swiper-button-next {
  position: absolute;
  top: 50%;
  margin-top: -22px;
  width: 44px; height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  /* Solid translucent controls avoid filtering every moving card behind them. */
  border: none;
  padding: 0;
  z-index: 10;
  cursor: pointer;
  transition: background 0.2s;
  display: flex; align-items: center; justify-content: center;
  font-size: 0; line-height: 0;
}
.swiper-button-prev:hover, .swiper-button-next:hover { background: rgba(255,255,255,0.22); }
.swiper-button-prev { left: 8px; }
.swiper-button-next { right: 8px; }
.swiper-button-prev::after, .swiper-button-next::after {
  content: '' !important;
  font-family: inherit !important;
  font-size: 0 !important;
  display: block;
  width: 18px; height: 18px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}
.swiper-button-prev::after { background-image: var(--prev-btn); }
.swiper-button-next::after { background-image: var(--next-btn); }

:host([data-single]) .swiper-button-prev,
:host([data-single]) .swiper-button-next,
:host([data-single]) .swiper-pagination { display: none !important; }

/* ── Adattamenti per container stretti ── */
@container (max-width: 480px) {
  .swiper { padding: 20px 0 70px; }
  .swiper-button-prev, .swiper-button-next {
    width: 36px; height: 36px;
    margin-top: -18px;
    background: rgba(255,255,255,0.12);
  }
  .swiper-button-prev { left: 4px; }
  .swiper-button-next { right: 4px; }
  .swiper-button-prev::after, .swiper-button-next::after {
    width: 14px; height: 14px;
  }
  .swiper-pagination-bullet { min-width: 44px; padding: 5px 10px; font-size: 10.5px; }
}

@container (max-width: 360px) {
  .slider-title { letter-spacing: 2px; }
  .swiper-pagination { bottom: 10px; }
}

/* Su schermi larghi la fetta visibile è un po' più generosa */
@container (min-width: 600px) {
  :host { --slide: clamp(360px, 76cqw, 420px); }
}

@media (prefers-reduced-motion: reduce) {
  .swiper-pagination { scroll-behavior: auto; }
  .swiper-pagination-bullet { transition: none; }
}

/* Fallback senza container queries */
@supports not (container-type: inline-size) {
  :host { --slide: clamp(220px, 78vw, 420px); }
  .swiper-pagination { max-width: min(480px, calc(100vw - 32px)); }
  @media (max-width: 480px) {
    .swiper { padding: 20px 0 70px; }
    .swiper-button-prev, .swiper-button-next {
      width: 36px; height: 36px;
      margin-top: -18px;
    }
    .swiper-pagination-bullet { min-width: 44px; padding: 5px 10px; font-size: 10.5px; }
  }
  @media (min-width: 600px) {
    :host { --slide: clamp(360px, 76vw, 420px); }
  }
}
`;
