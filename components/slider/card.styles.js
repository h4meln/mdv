export const CARD_STYLES = `
:host {
  display: block;
  --landscape-w: var(--mdv-land-w, 372px);
  --landscape-h: var(--mdv-land-h, 266px);
  --portrait-w:  var(--mdv-port-w, 266px);
  --portrait-h:  var(--mdv-port-h, 372px);
  --radius: calc(var(--landscape-w) * 16 / 372);
  --ease-spin: cubic-bezier(.34, 1.05, .64, 1);
  --dur-spin: 0.85s;
  --card-intensity: 0.5;
}

:host(:not([data-ready])) .card-face {
  background: linear-gradient(135deg, #191329, #30233e);
}
:host(:not([data-ready])) .card-layer { visibility: hidden; }
:host(:not([data-ready])) .card-face--front::after {
  content: '…'; position: absolute; inset: 0; display: grid; place-items: center;
  color: #fff; font: 24px system-ui;
}
:host([data-error]) .card-face--front::after { content: '↻'; }
.card-face { transition: opacity .35s ease-out; }

.card-scene {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  perspective: calc(var(--landscape-w) * 1300 / 372);
}
.card-inner {
  --px: 50%;  --py: 50%; --rx: 0deg; --ry: 0deg;
  --gx: 50%;  --gy: 50%; --ga: -33deg;
  --motion: 0; --glare: 0;
  position: relative;
  width: var(--landscape-w); height: var(--landscape-h);
  transform: rotateX(var(--rx)) rotateY(var(--ry));
  transform-style: preserve-3d;
  cursor: pointer; outline: none;
  touch-action: pan-y;
  /* The rotating child changes orientation without animating layout. */
}
:host([orientation="portrait"][data-standing]) .card-inner { width: var(--landscape-w); height: var(--landscape-h); }
.card-inner:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }
.card-spin {
  position: absolute; top: 50%; left: 50%;
  width: var(--landscape-w); height: var(--landscape-h);
  transform: translate(-50%, -50%) rotateZ(0deg);
  transform-style: preserve-3d;
  transition: transform var(--dur-spin) var(--ease-spin);
}
:host([orientation="portrait"][data-standing]) .card-spin { transform: translate(-50%, -50%) rotateZ(90deg); }
:host([orientation="landscape"]) .card-spin { transform: translate(-50%, -50%) rotateZ(0deg); }
.card-flipper {
  position: relative; width: 100%; height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.7s cubic-bezier(.4, .2, .2, 1);
}
.card-inner.is-flipped .card-flipper { transform: rotateY(180deg); }
.card-face {
  position: absolute; inset: 0;
  border-radius: var(--radius);
  overflow: hidden;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
  background-color: #0a0818;
  background-image: var(--tessera, none);
  background-size: 100% 200%;
  background-repeat: no-repeat;
  box-shadow: 0 30px 60px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.12) inset;
}
.card-face--front { background-position: 0 100%; transform: rotateY(0deg); }
.card-face--back  { background-position: 0 0;    transform: rotateY(180deg); }
.card-layer { position: absolute; inset: 0; pointer-events: none; }
.card-layer--textures {
  background-image:
    repeating-linear-gradient(var(--ga), #ff006e 0px, #fb5607 70px, #ffbe0b 140px, #06ffa5 210px, #00b4d8 280px, #8338ec 350px, #ff006e 420px),
    repeating-linear-gradient(calc(var(--ga) + 166deg), rgba(255,255,255,0.16) 0 1px, rgba(0,0,0,0.18) 1px 3px, transparent 3px 4px),
    radial-gradient(circle 320px at var(--px) var(--py), rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 40%, transparent 75%);
  background-size: 260% 260%, 200% 200%, 600px 600px;
  background-position: var(--gx) var(--gy), var(--gx) var(--gy), var(--px) var(--py);
  background-blend-mode: difference, luminosity, soft-light;
  mix-blend-mode: overlay;
  opacity: calc(0.08 + var(--card-intensity) * 0.10 + var(--motion) * 0.55);
}
.card-layer--bands {
  background:
    linear-gradient(var(--ga), transparent 28%, rgba(220,240,255,0) 38%, rgba(220,240,255,.45) 46%, rgba(255,255,255,.98) 50%, rgba(255,220,255,.45) 54%, rgba(220,240,255,0) 62%, transparent 72%),
    linear-gradient(var(--ga), transparent 10%, rgba(255,235,200,0) 16%, rgba(255,235,200,.55) 25%, rgba(255,255,255,.95) 28%, rgba(200,245,225,.55) 31%, rgba(255,240,210,0) 40%, transparent 46%),
    linear-gradient(var(--ga), transparent 66%, rgba(220,220,255,0) 72%, rgba(220,225,255,.55) 77%, rgba(255,255,255,.90) 79%, rgba(255,220,235,.55) 81%, rgba(220,220,255,0) 88%, transparent 94%);
  background-size: 250% 250%, 250% 250%, 250% 250%;
  background-position: var(--gx) var(--gy);
  mix-blend-mode: screen;
  opacity: calc(var(--motion) * 0.85 * var(--card-intensity));
}
.card-layer--glare {
  background: radial-gradient(circle 300px at var(--px) var(--py), rgba(255,255,255,.95) 0%, rgba(255,255,255,.55) 18%, rgba(255,255,255,.20) 45%, rgba(255,255,255,0) 75%);
  mix-blend-mode: screen;
  opacity: var(--glare);
  z-index: 6;
}
.card-layer--sparkle {
  background-image:
    radial-gradient(circle at 12% 18%, #fff .6px, transparent 1.3px),
    radial-gradient(circle at 32% 42%, #fff .6px, transparent 1.3px),
    radial-gradient(circle at 58% 22%, #fff .6px, transparent 1.3px),
    radial-gradient(circle at 82% 38%, #fff .6px, transparent 1.3px),
    radial-gradient(circle at 22% 68%, #fff .6px, transparent 1.3px),
    radial-gradient(circle at 48% 78%, #fff .6px, transparent 1.3px),
    radial-gradient(circle at 72% 62%, #fff .6px, transparent 1.3px),
    radial-gradient(circle at 88% 82%, #fff .6px, transparent 1.3px);
  mix-blend-mode: color-dodge;
  -webkit-mask-image: radial-gradient(circle 300px at var(--px) var(--py), #000 0%, rgba(0,0,0,.5) 55%, transparent 90%);
          mask-image: radial-gradient(circle 300px at var(--px) var(--py), #000 0%, rgba(0,0,0,.5) 55%, transparent 90%);
  opacity: calc(var(--glare) * 0.8);
}
.card-layer--frame {
  border-radius: var(--radius);
  box-shadow: inset 0 0 0 2px rgba(255,255,255,.14), inset 0 0 0 4px rgba(0,0,0,.40), inset 0 0 40px rgba(0,0,0,.55);
  z-index: 20;
}
.card-header {
  position: absolute; top: 12px; left: 14px; right: 14px; z-index: 21;
  color: #fff;
  font-size: calc(var(--landscape-w) * 12 / 372);
  font-weight: 700; letter-spacing: 1.5px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.95);
  pointer-events: none; opacity: 0; transition: opacity 0.3s;
}
.card-header:not(:empty) { opacity: 1; }

:host([data-lite]) .card-layer--bands,
:host([data-lite]) .card-layer--sparkle { display: none; }
:host([data-lite]) .card-layer--textures {
  background-image: linear-gradient(-33deg, #ff006e, #ffbe0b, #06ffa5, #00b4d8, #8338ec);
  background-size: 100% 100%; background-position: center;
  background-blend-mode: normal; opacity: .15;
}
:host([data-lite]) .card-layer--glare {
  background: radial-gradient(circle at 50% 50%, #ffffff60, transparent 70%);
  mix-blend-mode: normal;
}
:host([data-lite]) .card-face { box-shadow: 0 12px 24px -10px #0009; }
@media (prefers-reduced-motion: reduce) {
  .card-inner, .card-spin, .card-flipper, .card-face { transition: none !important; }
  .card-layer--textures { opacity: .15; }
  .card-layer--bands, .card-layer--sparkle, .card-layer--glare { display: none; }
}
`;