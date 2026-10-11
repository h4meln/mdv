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
`;