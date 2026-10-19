export const CALENDAR_STYLES = `
:host {
  --bg: transparent; 
  --card: rgba(255, 255, 255, 0.03); 
  --card2: rgba(255, 255, 255, 0.05); 
  --card3: rgba(245, 234, 216, 0.95);
  --border: rgba(255, 255, 255, 0.08); 
  --border2: rgba(245, 234, 216, 0.16);
  --text: #cfc4b2; 
  --text2: #b0a491; 
  --text3: #8f8271;
  --green: #4a7c59; 
  --lime: #7ba888; 
  --amber: #f3a953; 
  --rose: #e8643c;
  --sky: #5a8cb4; 
  --violet: #8a7ca8; 
  --sand: #d4b87a;
  --title-color: #f5ead8;
  
  --holes-h: 34px;
  --hole-c-y: 17px;
  --hole-r: 7px;

  --shadow-card: 0 4px 20px rgba(0,0,0,0.35);
  --shadow-inset-top: inset 0 1px 0 rgba(255,255,255,.08);

  display: block; 
  font-family: 'Manrope', system-ui, sans-serif; 
  color: var(--text); 
  position: relative;
  contain: layout style;
}

*, *::before, *::after { box-sizing: border-box; }

@keyframes cal-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes cal-slide-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes modal-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes modal-in { from { opacity: 0; transform: translateY(20px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes cal-tear {
  0%   { opacity: 1; transform: rotate(0) translate(0, 0); }
  35%  { opacity: 1; transform: rotate(-2deg) translate(-8px, 20px); }
  100% { opacity: 0; transform: rotate(-8deg) translate(-40px, 380px); }
}

.cal-shell { display: flex; flex-direction: column; gap: 16px; position: relative; animation: cal-in .4s ease-out both; }

/* ── Toolbar ── */
.cal-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 0 4px; gap: 12px; flex-wrap: wrap; }
.cal-toolbar-left { display: flex; align-items: center; gap: 12px; }
.cal-title { font-family: 'Fraunces', serif; font-style: italic; font-size: 32px; color: var(--title-color); line-height: 1; text-shadow: 0 0 20px rgba(232,100,60,.25); }
.cal-title-badge { font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #ffc98a; background: linear-gradient(90deg, rgba(232,100,60,.2), rgba(255,190,52,.15)); border: 1px solid rgba(255,190,52,.35); padding: 4px 10px; border-radius: 20px; }
.cal-toolbar-right { display: flex; gap: 14px; align-items: center; border-bottom: 1px solid var(--border2); padding-bottom: 6px; }

.cal-view-btn, .cal-nav-btn, .cal-modal-close { font: inherit; color: inherit; appearance: none; -webkit-appearance: none; }
.cal-view-btn { padding: 6px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; border: none; color: var(--text2); transition: all .18s; }
.cal-view-btn:hover { color: var(--title-color); background: var(--card2); }
.cal-view-btn.active { color: #ffbe8a; background: rgba(232,100,60,.15); box-shadow: inset 0 0 0 1px rgba(232,100,60,.3); }
.cal-view-btn[data-disabled] { opacity: .4; pointer-events: none; }

.cal-nav-group { display: flex; gap: 6px; }
.cal-nav-btn { width: 32px; height: 32px; padding: 0; border-radius: 50%; font-size: 16px; cursor: pointer; background: rgba(255,255,255,.05); border: 1px solid var(--border2); display: flex; align-items: center; justify-content: center; transition: all .15s; }
.cal-nav-btn:hover { background: rgba(232,100,60,.2); border-color: rgba(232,100,60,.5); color: #fff; }

.cal-body { display: grid; grid-template-columns: 1fr 280px; gap: 16px; }

/* ── Panel Stack: Fix altezza con CSS Grid ── */
.cal-panel-stack {
  display: grid;
  grid-template-columns: 100%;
  position: relative;
  border-radius: 18px;
}

/* Pannelli principali del calendario */
.cal-panel-front, .cal-panel-behind {
  grid-area: 1 / 1;
  position: relative;
  border-radius: 18px;
  padding-top: var(--holes-h);
  background: rgba(20, 20, 20, 0.55);
  border: 1px solid var(--border2);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  overflow: hidden;
}

.cal-panel-behind { z-index: 1; }
.cal-panel-front { z-index: 2; transform-origin: top left; }
.cal-panel-front.cal-panel--tearing { animation: cal-tear .5s cubic-bezier(.5, 0, .75, .4) forwards; pointer-events: none; z-index: 3; }
.cal-panel-front.cal-panel--enter .cal-content-slot > .cal-panel { animation: cal-slide-in .3s ease-out both; }

.cal-content-slot { display: block; min-height: 320px; }
.cal-content-slot > .cal-panel { background: transparent; border: none; }

/* ── Effetto Carta Forata (Originale Ripristinato) ── */
.cal-holes-zone { position: absolute; top: 0; left: 0; right: 0; height: var(--holes-h); z-index: 5; pointer-events: none; }
.cal-holes-zone::before {
  content: ''; position: absolute; inset: 0; border-radius: 20px 20px 0 0;
  border-bottom: 1px solid var(--border2); 
  background: rgba(255, 255, 255, 0.06); /* Effetto vetro invece che bianco/panna */
  -webkit-mask-image: radial-gradient(circle at 50% var(--hole-c-y), transparent var(--hole-r), #000 calc(var(--hole-r) + 0.5px));
  -webkit-mask-size: calc(100% / 8) 100%; -webkit-mask-position: 0 0; -webkit-mask-repeat: repeat-x;
  mask-image: radial-gradient(circle at 50% var(--hole-c-y), transparent var(--hole-r), #000 calc(var(--hole-r) + 0.5px));
  mask-size: calc(100% / 8) 100%; mask-position: 0 0; mask-repeat: repeat-x;
}
.cal-holes-zone::after {
  content: ''; position: absolute; inset: 0; border-radius: 20px 20px 0 0; pointer-events: none;
  background-image: radial-gradient(circle at 50% var(--hole-c-y), rgba(42,37,32,0) calc(var(--hole-r) - 1.5px), rgba(42,37,32,.20) calc(var(--hole-r) - 0.5px), rgba(42,37,32,.06) calc(var(--hole-r) + 1px), rgba(42,37,32,0) calc(var(--hole-r) + 2.5px));
  background-size: calc(100% / 8) 100%; background-repeat: repeat-x; background-position: 0 0;
}

/* ── Anelli Metallici (Originale Ripristinato) ── */
.cal-rings { position: absolute; top: calc(var(--hole-c-y) - 30px); left: 0; right: 0; height: 30px; z-index: 20; pointer-events: none; }
.cal-ring {
  position: absolute; top: 0; width: 9px; height: 30px; transform: translateX(-50%); border-radius: 4.5px;
  background: linear-gradient(180deg, #c9b46a, #6e5f33 55%, #b39a52) !important;
  box-shadow: 0 0 6px rgba(201,180,106,.35), inset 0 1px 1px rgba(255,255,255,.5) !important;
}

/* ── Griglia Calendario (Fix Mobile Alignment) ── */
.cal-dow, .cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.cal-dow { border-bottom: 1px solid var(--border2); }
.cal-dw { padding: 10px 4px; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--text3); text-align: center; border-right: 1px solid var(--border2); }
.cal-dw:last-child { border-right: none; }
.cal-dw.wkend { color: var(--rose); opacity: .8; }

.cal-cell { border-right: 1px solid var(--border2); border-bottom: 1px solid var(--border2); padding: 6px; position: relative; transition: background .15s; display: flex; flex-direction: column; gap: 4px; cursor: pointer; min-height: 105px; }
.cal-cell:nth-child(7n) { border-right: none; }
.cal-cell:hover { background: rgba(255,255,255,.03); }
.cal-cell.other { opacity: .3; }
.cal-cell.past { opacity: .6; }

.cal-cell-top { display: flex; align-items: center; justify-content: space-between; }
.cal-cell-num { font-family: 'Fraunces', serif; font-weight: 600; font-size: 14px; color: var(--text); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
.cal-cell.wkend .cal-cell-num { color: var(--rose); }
.cal-cell.today { background: rgba(232,100,60,.08); }
.cal-cell.today .cal-cell-num { background: var(--rose); color: #fff; font-weight: 700; }
.cal-cell.selected:not(.today) { background: rgba(255,255,255,.05); }
.cal-cell.selected:not(.today) .cal-cell-num { border: 1px solid var(--rose); color: #ffbe8a; }

.cal-cell-badge { font-size: 9px; font-weight: 700; border-radius: 10px; padding: 1px 5px; line-height: 1.2; }
.cal-cell-badge--g { background: rgba(74,124,89,.25); color: var(--lime); }
.cal-cell-badge--a { background: rgba(243,169,83,.25); color: var(--amber); }
.cal-cell-badge--r { background: rgba(232,100,60,.25); color: var(--rose); }

.cal-cell-events { display: flex; flex-direction: column; gap: 3px; flex: 1; overflow-y: auto; scrollbar-width: none; }
.cal-cell-event { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,.05); box-shadow: inset 2px 0 0 currentColor; }
.cal-cell-event--green  { color: var(--lime); }
.cal-cell-event--amber  { color: var(--amber); }
.cal-cell-event--rose   { color: var(--rose); }
.cal-cell-event--sky    { color: var(--sky); }
.cal-cell-event--violet { color: var(--violet); }
.cal-cell-event--lime   { color: var(--lime); }
.cal-cell-event--sand   { color: var(--sand); }
.cal-cell-event-dot { width: 4px; height: 4px; border-radius: 50%; background: currentColor; }
.cal-cell-more { font-size: 9px; font-weight: 600; color: var(--text3); margin-top: auto; }

/* ── Riga Evento ── */
.cal-event-row { display: grid; grid-template-columns: 50px 1fr; gap: 12px; align-items: center; padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,.03); border: 1px solid var(--border2); box-shadow: inset 3px 0 0 var(--row-color, var(--rose)); cursor: pointer; transition: transform .15s, background .15s; }
.cal-event-row:hover { transform: translateX(2px); background: rgba(255,255,255,.06); }
.cal-event-row--green  { --row-color: var(--green); }
.cal-event-row--lime   { --row-color: var(--lime); }
.cal-event-row--amber  { --row-color: var(--amber); }
.cal-event-row--rose   { --row-color: var(--rose); }
.cal-event-row--sky    { --row-color: var(--sky); }
.cal-event-row--violet { --row-color: var(--violet); }
.cal-event-row--sand   { --row-color: var(--sand); }
.cal-event-date { display: flex; flex-direction: column; align-items: center; }
.cal-event-day { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 600; line-height: 1; color: var(--row-color, var(--rose)); }
.cal-event-dow { font-size: 9px; font-weight: 700; text-transform: uppercase; color: var(--text3); }
.cal-event-body { min-width: 0; }
.cal-event-time { font-size: 10px; font-weight: 700; color: var(--text3); }
.cal-event-title { font-size: 13px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cal-event-meta { font-size: 11px; color: var(--text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.cal-event-row--sb { grid-template-columns: 38px 1fr; padding: 8px 10px; gap: 8px; }
.cal-event-row--sb .cal-event-day { font-size: 16px; }
.cal-event-row--sb .cal-event-title { font-size: 12px; }

/* ── Sidebar & Views ── */
.cal-week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.cal-week-col { border-right: 1px solid var(--border2); padding: 10px 8px; display: flex; flex-direction: column; gap: 8px; min-height: 360px; }
.cal-week-col:last-child { border-right: none; }
.cal-week-col.today { background: rgba(232,100,60,.03); }
.cal-week-head { display: flex; align-items: baseline; gap: 6px; padding-bottom: 6px; border-bottom: 1px solid var(--border2); }
.cal-week-dow { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text3); }
.cal-week-num { font-family: 'Fraunces', serif; font-weight: 600; font-size: 18px; }

.cal-agenda-view { display: flex; flex-direction: column; gap: 8px; padding: 12px; max-height: 520px; overflow-y: auto; }

.cal-sidebar { display: flex; flex-direction: column; gap: 12px; }
.cal-sb-card { background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border2); border-radius: 14px; padding: 14px; box-shadow: var(--shadow-card); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(14px);}
.cal-sb-label { font-size: 9px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: var(--text3); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
.cal-sb-label::after { content: ''; flex: 1; height: 1px; background: var(--border2); }
.cal-today-date { font-family: 'Fraunces', serif; font-weight: 300; font-size: 48px; color: var(--rose); line-height: 1; }
.cal-today-info { font-size: 11px; color: var(--text3); margin-top: 2px; }
.cal-agenda-list-inner { display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto; }
.cal-empty-sm { font-size: 11px; color: var(--text3); font-style: italic; }

.cal-image-card { padding: 0; background: transparent; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; }
.cal-sidebar-image { display: block; width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 13px; }
.cal-legend { display: flex; flex-direction: column; gap: 6px; }
.cal-legend-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text2); }
.cal-legend-swatch { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.cal-legend-count { margin-left: auto; font-size: 10px; color: var(--text3); font-weight: 600; }

/* ── Strip (Senza sfondo contenitore, Glow sugli item all'hover) ── */
@keyframes sweepGlow { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

.cal-strip-card { background: transparent !important; border: none !important; box-shadow: none !important; padding: 10px 0 2px; }
.cal-strip-list { display: flex; gap: 8px; overflow-x: auto; padding: 4px 4px 10px; scroll-snap-type: x mandatory; }

.cal-strip-day {
  flex: 0 0 auto; width: 54px; padding: 8px 4px; border-radius: 10px;
  background: rgba(255,255,255,.08); /* Sfondo più opaco e visibile */
  border: 1px solid var(--border2); 
  box-shadow: 0 4px 12px rgba(0,0,0,0.15); /* Ombra per dare volume */
  display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;
  scroll-snap-align: center; transition: all .2s; position: relative; overflow: hidden;
}
.cal-strip-day > * { position: relative; z-index: 1; }

/* Il glow è nascosto di default... */
.cal-strip-day::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,.2) 50%, transparent 65%);
  background-size: 220% 100%; opacity: 0; transition: opacity .3s;
}

/* ...e si attiva in modo fluido solo all'hover */
.cal-strip-day:hover { 
  background: rgba(255,255,255,.12); 
  border-color: rgba(255,190,52,.4); 
  transform: translateY(-2px); 
  box-shadow: 0 6px 16px rgba(0,0,0,0.25);
}
.cal-strip-day:hover::before { 
  opacity: 1; 
  animation: sweepGlow 1.5s ease-in-out infinite; 
}

.cal-strip-day-dow { font-size: 9px; font-weight: 700; text-transform: uppercase; color: var(--text2); }
.cal-strip-day-num { font-family: 'Fraunces', serif; font-weight: 600; font-size: 18px; line-height: 1; }
.cal-strip-day-mon { font-size: 9px; color: var(--text3); text-transform: uppercase; }
.cal-strip-day-pips { display: flex; gap: 3px; height: 5px; }
.cal-strip-pip { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

.cal-strip-day.weekend .cal-strip-day-dow { color: var(--rose); }

.cal-strip-day.today { background: var(--rose); border-color: var(--rose); color: #fff; }
.cal-strip-day.today .cal-strip-day-dow, .cal-strip-day.today .cal-strip-day-mon { color: #fff; }

.cal-strip-day.selected:not(.today) {
  border-color: var(--rose); background: rgba(232,100,60,.12);
  box-shadow: 0 0 15px rgba(232,100,60,.3), inset 0 1px 1px rgba(255,255,255,0.1);
}

/* ── Modale ── */
.cal-modal { position: absolute; inset: 0; z-index: 9999; background: none; display: flex; align-items: center; justify-content: center; padding: 20px; animation: modal-fade .2s ease-out; }
.cal-modal-card { background: rgba(25, 25, 25, 0.85);backdrop-filter: blur(24px);-webkit-backdrop-filter: blur(24px);border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; width: 100%; max-width: 580px; max-height: 80vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.05); animation: modal-in .25s ease-out; }
.cal-modal-head { padding: 16px 20px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border2); }
.cal-modal-dow { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text3); letter-spacing: .15em; }
.cal-modal-date { font-family: 'Fraunces', serif; font-weight: 300; font-size: 42px; line-height: 1; color: var(--rose); }
.cal-modal-month { font-size: 12px; color: var(--text2); }
.cal-modal-close { border: none; background: rgba(255,255,255,.05); cursor: pointer; font-size: 20px; line-height: 1; color: var(--text); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all .15s; }
.cal-modal-close:hover { background: var(--rose); color: #fff; }
.cal-modal-body { padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.cal-empty { text-align: center; padding: 30px 10px; font-size: 13px; color: var(--text3); font-style: italic; }

/* ── Mobile Responsive ── */
@media (max-width: 780px) {
  .cal-body { grid-template-columns: 1fr; }
  .cal-sidebar { display: none; }
}
@media (max-width: 480px) {
  /* Fix Allineamento Mobile per la Griglia */
  .cal-dw { padding: 6px 2px; font-size: 9px; letter-spacing: 0; }
  .cal-cell { padding: 4px 2px; min-height: 80px; }
  .cal-cell-num { font-size: 12px; width: 20px; height: 20px; }
  .cal-week-col { min-height: 280px; padding: 6px 4px; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }

:host { --text: #f3ede3; --text2: #d1c7b8; --text3: #bfb3a1; contain: none; }
.cal-body { grid-template-columns: minmax(0, 1fr) 280px; align-items: start; }
.cal-panel-stack { min-width: 0; }
.cal-panel-front { background: #242321; backdrop-filter: none; -webkit-backdrop-filter: none; }
.cal-title { font-style: normal; font-size: clamp(25px, 3vw, 36px); line-height: 1.2; text-shadow: none; }
.cal-title-badge { display: none; }
.cal-toolbar-right { gap: 4px; flex-wrap: wrap; }
.cal-view-btn { min-height: 44px; font-size: 14px; padding: 8px 10px; }
.cal-nav-btn, .cal-modal-close { width: 44px; height: 44px; }
.cal-cell { min-height: 100px; }
.cal-cell-num { font-family: 'Manrope', sans-serif; font-size: 17px; }
.cal-cell.past { opacity: 1; }
.cal-cell-event { font-size: 12px; line-height: 1.5; }
.cal-sb-label, .cal-week-dow, .cal-event-time, .cal-event-meta, .cal-today-info, .cal-empty-sm, .cal-legend-row { font-size: 13px; line-height: 1.5; }
.cal-event-title, .cal-event-row--sb .cal-event-title { font-size: 15px; line-height: 1.4; white-space: normal; }
.cal-event-meta { white-space: normal; }
.cal-strip-day::before { display: none; }
.cal-strip-day.selected:not(.today) { box-shadow: none; }
.cal-modal { position: fixed; background: #0009; }
.cal-modal-card { background: #252320; }
[data-date]:focus-visible, button:focus-visible { outline: 2px solid #ffc98a; outline-offset: -2px; }
@media (max-width: 780px) {
  .cal-body { grid-template-columns: minmax(0, 1fr); }
  .cal-toolbar { align-items: stretch; }
  .cal-toolbar-right { width: 100%; justify-content: space-between; gap: 0; }
  .cal-view-btn { padding: 8px; font-size: 13px; }
  .cal-cell { min-height: 76px; padding: 5px 2px; }
  .cal-cell-num { font-size: 15px; }
  .cal-cell-events { display: none; }
  .cal-cell-badge { font-size: 11px; }
  .cal-dw { font-size: 11px; }
  .cal-week { grid-template-columns: 1fr; }
  .cal-week-col { min-height: 90px; border-right: 0; border-bottom: 1px solid var(--border2); padding: 12px; }
  .cal-sidebar { display: flex; }
  .cal-image-card { display: none; }
}


:host { --rose:#ec6377; --sky:#6b9ee8; --green:#6b9ee8; --lime:#9dc3ff; --amber:#f18a9a; --violet:#739edc; --sand:#efabb5; --text:#f0f1f7; --text2:#c0c9df; --text3:#a7b4d0; --title-color:#f4f1ed; }
.cal-title { font:700 44px/1.1 'Amatic SC',cursive; }
.cal-view-btn { font:700 24px 'Amatic SC',cursive; }
.cal-view-btn.active { background:#508cf122; color:#a9caff; box-shadow:inset 0 0 0 1px #508cf155; }
.cal-panel-front { background:#151825; border-color:#508cf133; box-shadow:none; }
.cal-ring { background:linear-gradient(#c4cee7,#5c6c92,#97abd3) !important; box-shadow:none !important; }
.cal-sb-card { box-shadow:none; backdrop-filter:none; border-color:#508cf133; }
.cal-sb-label,.cal-event-title,.cal-event-row--sb .cal-event-title,.cal-empty,.cal-empty-sm { font:700 25px/1.3 'Amatic SC',cursive; }
.cal-event-meta { font:400 23px/1.3 'Amatic SC',cursive; }
.cal-cell-event { font:700 21px/1.2 'Amatic SC',cursive; }
.cal-cell { cursor:default; }
.cal-cell:has(.cal-cell-events),.cal-strip-day:has(.cal-strip-pip) { cursor:pointer; }
.cal-modal-card { background:#151825; }


:host([compact]) .cal-body { grid-template-columns:minmax(0,1fr); }
:host([compact]) .cal-sidebar-slot { display:none; }
:host([compact]) .cal-toolbar-right { width:100%; justify-content:space-between; }
:host([compact]) .cal-cell { min-height:80px; }
:host([compact]) .cal-week { grid-template-columns:1fr; }
:host([compact]) .cal-week-col { min-height:90px; }
`;
