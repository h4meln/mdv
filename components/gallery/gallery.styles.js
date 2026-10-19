export const GALLERY_STYLES = `
:host {
  display: block;
  position: fixed;
  inset: 0;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  overscroll-behavior: none;
  z-index: 1;
}
:host(.is-dragging) { cursor: grabbing; }

.gallery-stage { position: absolute; inset: 0; overflow: hidden; }

.gallery-item {
  position: absolute;
  top: 0; left: 0;
  margin: 0; padding: 0;
  will-change: transform;
  backface-visibility: hidden;
  overflow: hidden;
  border-radius: 8px;
}
.gallery-item img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
  -webkit-user-drag: none;
}
/* ── Skeleton di caricamento (glow/blur, stile toast) ── */
.gallery-skeleton {
  position: absolute;
  inset: -4vh -2vw;
  z-index: 3;
  display: grid;
  grid-template-columns: repeat(var(--sk-cols, 4), minmax(0, 1fr));
  gap: clamp(10px, 1.6vw, 22px);
  align-content: start;
  padding: 4vh 2vw;
  pointer-events: none;
  animation: gallery-sk-fade .35s ease both;
}
.sk-tile {
  position: relative;
  display: block;
  height: calc(28vh * var(--h, 60) / 60);
  border-radius: 10px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(80,140,241,.16), rgba(237,98,111,.10) 60%, rgba(255,255,255,.04)),
    rgba(255,255,255,.035);
  border: 1px solid rgba(255,255,255,.07);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  animation: gallery-sk-breathe 2.6s ease-in-out infinite alternate;
  animation-delay: var(--d, 0s);
}
.sk-tile::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg,
    transparent 20%,
    rgba(255,255,255,.14) 45%,
    transparent 70%);
  transform: translateX(-120%);
  animation: gallery-sk-shine 2.4s ease-in-out infinite;
  animation-delay: var(--d, 0s);
}
@keyframes gallery-sk-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes gallery-sk-breathe {
  from { filter: blur(0px); opacity: .55; }
  to   { filter: blur(10px); opacity: .95; }
}
@keyframes gallery-sk-shine {
  0%   { transform: translateX(-120%); }
  60%  { transform: translateX(120%); }
  100% { transform: translateX(120%); }
}
@media (prefers-reduced-motion: reduce) {
  .sk-tile, .sk-tile::after { animation: none; }
}
/* ── Lightbox ── */
.gallery-lightbox {
  position: fixed; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  animation: gallery-lb-fade .25s ease both;
}
.gallery-lightbox-backdrop {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.gallery-lightbox-img {
  position: relative;
  max-width: 92vw; max-height: 88vh;
  border-radius: 10px;
  box-shadow: 0 30px 80px rgba(0,0,0,.55);
  animation: gallery-lb-in .35s cubic-bezier(.34,1.56,.64,1) both;
  user-select: none;
}
.gallery-lightbox-btn {
  position: absolute; top: 22px;
  width: 46px; height: 46px;
  border-radius: 50%;
  background: rgba(255,255,255,.10);
  border: none; padding: 0;
  cursor: pointer; z-index: 3;
  transition: background .18s;
  display: flex; align-items: center; justify-content: center;
}
.gallery-lightbox-btn:hover { background: rgba(255,255,255,.24); }
.gallery-lightbox-close    { right: 22px; }
.gallery-lightbox-download { right: 78px; }
.gallery-lightbox-icon {
  display: block; width: 20px; height: 20px;
  background-color: #fff;
  -webkit-mask-image: var(--i);   mask-image: var(--i);
  -webkit-mask-size: contain;     mask-size: contain;
  -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  -webkit-mask-position: center;  mask-position: center;
}
@keyframes gallery-lb-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes gallery-lb-in {
  from { opacity: 0; transform: scale(.94); }
  to   { opacity: 1; transform: scale(1); }
}

.gallery-item { background:#20263a; border-radius:0; }
.gallery-item::before { content:''; position:absolute; inset:-8px; background-image:var(--preview); background-size:cover; background-position:center; filter:blur(8px); opacity:1; transition:opacity .6s; animation:photo-breathe 2s ease-in-out infinite alternate; }
.gallery-item img { opacity:0; filter:blur(6px); transition:opacity .65s,filter .65s; }
.gallery-item.is-loaded img { opacity:1; filter:none; }
.gallery-item.is-loaded::before { opacity:0; animation:none; }
@keyframes photo-breathe { to { filter:blur(12px); opacity:.65; } }
@media(prefers-reduced-motion:reduce) { .gallery-item::before { animation:none; } .gallery-item img { transition:none; } }
`;
