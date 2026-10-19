/* <mdv-gallery> — masonry infinito.
    Items: array di stringhe o {src, alt}.
    Attributi:
      cols="8"             → numero MASSIMO di colonne visibili (su mobile si riduce)
      parallax="0.05"      → fattore parallasse per colonna (0 = nessuna)
      auto-scroll          → abilita auto-scroll verticale (default OFF)
      auto-speed="0.25"    → velocità auto-scroll
      no-drag              → disabilita drag
      no-wheel             → disabilita wheel
      no-zoom              → disabilita click-per-ingrandire
      drag-axis="x|y|xy"   → limita drag (default: y)

    Scroll laterale infinito: sempre attivo, qualunque sia il numero di
    colonne visibili. Le colonne "buffer" laterali permettono di
    trascinare/scorrere orizzontalmente e scoprirne di nuove.
*/
import { BaseElement } from '../shared/base-element.js';
import { sheet } from '../shared/styles.js';
import { getGallery } from '../shared/gallery-store.js';
import { GALLERY_PREVIEWS } from '../../data/gallery-previews.js';
import { GALLERY_STYLES } from './gallery.styles.js';

const TARGET_COL_W     = 340;
const MIN_COL_W        = 200;
const BUFFER_COLS      = 2;
const MAX_VISIBLE_COLS = 10;
const EASE             = 0.085;
const DRAG_MULT        = 2.5;
const DIFF_MULT        = 0.0001;

const DOWNLOAD_ICON = "data:image/svg+xml,%3Csvg%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20id=%22SVGRepo_bgCarrier%22%20stroke-width=%220%22%3E%3C/g%3E%3Cg%20id=%22SVGRepo_tracerCarrier%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3C/g%3E%3Cg%20id=%22SVGRepo_iconCarrier%22%3E%20%3Cpath%20opacity=%220.5%22%20d=%22M3%2015C3%2017.8284%203%2019.2426%203.87868%2020.1213C4.75736%2021%206.17157%2021%209%2021H15C17.8284%2021%2019.2426%2021%2020.1213%2020.1213C21%2019.2426%2021%2017.8284%2021%2015%22%20stroke=%22%231C274C%22%20stroke-width=%221.5%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3C/path%3E%20%3Cpath%20d=%22M12%203V16M12%2016L16%2011.625M12%2016L8%2011.625%22%20stroke=%22%231C274C%22%20stroke-width=%221.5%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3C/path%3E%20%3C/g%3E%3C/svg%3E";
const CLOSE_ICON = "data:image/svg+xml,%3Csvg%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20id=%22SVGRepo_bgCarrier%22%20stroke-width=%220%22%3E%3C/g%3E%3Cg%20id=%22SVGRepo_tracerCarrier%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3C/g%3E%3Cg%20id=%22SVGRepo_iconCarrier%22%3E%20%3Cpath%20fill-rule=%22evenodd%22%20clip-rule=%22evenodd%22%20d=%22M22%2012C22%2017.5228%2017.5228%2022%2012%2022C6.47715%2022%202%2017.5228%202%2012C2%206.47715%206.47715%202%2012%202C17.5228%202%2022%206.47715%2022%2012ZM8.96963%208.96965C9.26252%208.67676%209.73739%208.67676%2010.0303%208.96965L12%2010.9393L13.9696%208.96967C14.2625%208.67678%2014.7374%208.67678%2015.0303%208.96967C15.3232%209.26256%2015.3232%209.73744%2015.0303%2010.0303L13.0606%2012L15.0303%2013.9696C15.3232%2014.2625%2015.3232%2014.7374%2015.0303%2015.0303C14.7374%2015.3232%2014.2625%2015.3232%2013.9696%2015.0303L12%2013.0607L10.0303%2015.0303C9.73742%2015.3232%209.26254%2015.3232%208.96965%2015.0303C8.67676%2014.7374%208.67676%2014.2625%208.96965%2013.9697L10.9393%2012L8.96963%2010.0303C8.67673%209.73742%208.67673%209.26254%208.96963%208.96965Z%22%20fill=%22%231C274C%22%3E%3C/path%3E%20%3C/g%3E%3C/svg%3E";

const mod   = (n, m) => ((n % m) + m) % m;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function normalizeItem(x) {
  if (typeof x === 'string') return { src: x, alt: '' };
  if (x && typeof x === 'object' && x.src) return { src: x.src, alt: x.alt || '' };
  return null;
}


class MdvGallery extends BaseElement {
  constructor() {
    super();
    this._itemsData = [];
    this._dimsCache = null;
    this._tiles = [];
    this._L = null;
    this._lastTime = 0;
    this._resizeTimer = null;
    this._rafId = null;
    this._lightbox = null;
    this._configKey = null;
    this._state = {
      tx: 0, ty: 0, cx: 0, cy: 0,
      diff: 0, dragging: false,
      startX: 0, startY: 0, startTx: 0, startTy: 0,
      initialized: false,
    };
    this._isFirefox = navigator.userAgent.indexOf('Firefox') > -1;
    this._isWindows = navigator.appVersion.indexOf('Win') !== -1;
    this._MULT_MOUSE   = this._isWindows ? 0.6 * 2 : 0.6;
    this._MULT_FIREFOX = this._isWindows ? 20  * 2 : 20;
  }

  get autoScroll()  { return this.hasAttribute('auto-scroll'); }
  get autoSpeed()   { return parseFloat(this.getAttribute('auto-speed')) || 0.25; }
  get dragEnabled() { return !this.hasAttribute('no-drag'); }
  get wheelEnabled(){ return !this.hasAttribute('no-wheel'); }
  get zoomEnabled() { return !this.hasAttribute('no-zoom'); }
  get dragAxis()    { return this.getAttribute('drag-axis') || 'y'; }
  get forcedCols()  { return parseInt(this.getAttribute('cols'), 10) || 0; }
  get parallaxFactor() { return parseFloat(this.getAttribute('parallax')) || 0; }

  async connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [sheet(GALLERY_STYLES)];
    this.shadowRoot.innerHTML = `<div class="gallery-stage" aria-label="Galleria fotografica" aria-busy="true"></div>`;
    this._stage = this.shadowRoot.querySelector('.gallery-stage');

    if (!this._itemsData.length) {
      const raw = await getGallery();
      this._itemsData = (raw || []).map(normalizeItem).filter(Boolean);
    }
    if (!this._itemsData.length) {
      this._stage.setAttribute('aria-label', 'Galleria fotografica vuota');
      this._stage.setAttribute('aria-busy', 'false');
      return;
    }

    await this._ensureDims();
    this._build();

    if (this.dragEnabled) {
      this._on(window, 'pointerdown',   (e) => this._onDown(e));
      this._on(window, 'pointermove',   (e) => this._onMove(e));
      this._on(window, 'pointerup',     () => this._onUp());
      this._on(window, 'pointercancel', () => this._onUp());
    }
    if (this.wheelEnabled) {
      this._on(window, 'wheel', (e) => this._onWheel(e), { passive: true });
    }
    this._on(window, 'resize', () => this._onResize());
    this._on(window, 'orientationchange', () => this._onResize());

    if (this.zoomEnabled) {
      this._on(this._stage, 'click', (e) => {
        const fig = e.target.closest('.gallery-item');
        if (!fig) return;
        const src = fig.dataset.src;
        if (src) this._openLightbox(src);
      });
    }

    this._rafId = requestAnimationFrame((t) => this._tick(t));
  }

  disconnectedCallback() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this._closeLightbox();
    this._cleanup();
  }

  set items(list) {
    this._itemsData = (Array.isArray(list) ? list : []).map(normalizeItem).filter(Boolean);
    this._dimsCache = null;
    if (this.isConnected && this._itemsData.length) this._rebuild();
  }
  get items() { return this._itemsData.slice(); }

  async _rebuild() {
    await this._ensureDims();
    this._build();
    if (!this._rafId) this._rafId = requestAnimationFrame((t) => this._tick(t));
  }

  async _ensureDims() {
    if (this._dimsCache) return this._dimsCache;
    this._dimsCache = this._itemsData.map(x => ({ src:x.src, w:GALLERY_PREVIEWS[x.src]?.w || 4, h:GALLERY_PREVIEWS[x.src]?.h || 3 }));
    this._dimsCache.forEach((d, i) => { d.alt = this._itemsData[i].alt || ''; });
    return this._dimsCache;
  }

  _getLayoutConfig() {
    const vw  = window.innerWidth;
    const gap = clamp(vw * 0.010, 4, 16);

    // Quante colonne riempiono il viewport senza scendere sotto MIN_COL_W.
    const maxFit = Math.max(1, Math.floor((vw + gap) / (MIN_COL_W + gap)));

    let visibleCols;
    if (this.forcedCols > 0) {
      // cols="N" è un MASSIMO: su schermi piccoli viene ridotto a maxFit.
      visibleCols = Math.min(this.forcedCols, maxFit, MAX_VISIBLE_COLS);
    } else {
      visibleCols = clamp(
        Math.round((vw + gap) / (TARGET_COL_W + gap)),
        1,
        Math.min(maxFit, MAX_VISIBLE_COLS)
      );
    }

    const colW = (vw - gap * (visibleCols - 1)) / visibleCols;
    // Sempre 2 colonne di buffer laterale: così anche con 1 sola colonna
    // visibile puoi trascinare in orizzontale e scoprirne altre
    // (comportamento "landscape infinito").
    const buffers = BUFFER_COLS;
    return { vw, cols: visibleCols + buffers, visibleCols, gap, colW };
  }

  _configKeyOf(cfg) {
    return `${cfg.visibleCols}:${Math.round(cfg.colW)}:${Math.round(cfg.gap)}`;
  }

  _getRatioLimits(visibleCols, vw) {
    if (visibleCols <= 1 && vw < 600) {
      return { min: 1.40, max: 2.10 };
    }
    if (visibleCols <= 2 && vw < 900) {
      return { min: 1.00, max: 1.90 };
    }
    return { min: 0.55, max: 1.70 };
  }

  _build() {
    if (!this._dimsCache) return;
    const cfg = this._getLayoutConfig();
    this._configKey = this._configKeyOf(cfg);

    const { vw, cols, visibleCols, gap, colW } = cfg;
    const ratioLimits = this._getRatioLimits(visibleCols, vw);
    const colHeights = new Array(cols).fill(0);
    const columns = Array.from({ length: cols }, () => []);

    for (const d of this._dimsCache) {
      let best = 0;
      for (let c = 1; c < cols; c++) if (colHeights[c] < colHeights[best]) best = c;
      const ratio = clamp(d.h / d.w, ratioLimits.min, ratioLimits.max);
      const h = colW * ratio;
      const left = best * (colW + gap);
      const top = colHeights[best];
      columns[best].push({ d, left, top, w: colW, h });
      colHeights[best] = top + h + gap;
    }

    const periodX = cols * (colW + gap);
    // Anche con 1 colonna visibile serve la centratura, altrimenti la
    // colonna visibile finirebbe a sinistra e il drag X partirebbe da lì.
    const offsetX = (periodX - vw) / 2;

    let maxItemH = 0;
    for (const col of columns) for (const it of col) if (it.h > maxItemH) maxItemH = it.h;
    const offsetY = maxItemH;
    const prevOffsetY = this._L ? this._L.offsetY : offsetY;

    this._stage.textContent = '';
    const frag = document.createDocumentFragment();
    const next = [];

    const pf = this.parallaxFactor;
    for (let c = 0; c < cols; c++) {
      const period = colHeights[c];
      const my = pf > 0 ? (1 - c * pf) : ((c % 2 === 0) ? 1 : -1);
      for (const it of columns[c]) {
        const fig = document.createElement('figure');
        fig.className = 'gallery-item';
        fig.style.width  = it.w + 'px';
        fig.style.height = it.h + 'px';
        fig.style.left   = it.left + 'px';
        fig.style.top    = it.top  + 'px';
        fig.dataset.src  = it.d.src;
        const preview = GALLERY_PREVIEWS[it.d.src]?.preview;
        if (preview) fig.style.setProperty('--preview', `url("${preview}")`);
        const img = document.createElement('img');
        img.addEventListener('load', () => fig.classList.add('is-loaded'), { once: true });
        img.addEventListener('error', () => { fig.classList.add('is-error'); fig.setAttribute('aria-label', 'Foto non disponibile'); }, { once: true });
        img.src = it.d.src;
        if (img.complete && img.naturalWidth) fig.classList.add('is-loaded');
        img.alt = it.d.alt || '';
        img.loading = 'lazy';
        img.decoding = 'async';
        fig.appendChild(img);
        frag.appendChild(fig);
        next.push({ el: fig, left: it.left, top: it.top, period, my });
      }
    }
    this._stage.appendChild(frag);
    this._stage.setAttribute('aria-busy', 'false');
    this._tiles = next;
    this._L = { periodX, offsetX, offsetY };

    if (!this._state.initialized) {
      this._state.initialized = true;
      this._state.tx = 0;
      this._state.ty = offsetY;
      this._state.cx = 0;
      this._state.cy = offsetY;
    } else {
      const dy = prevOffsetY - offsetY;
      this._state.ty += dy;
      this._state.cy += dy;
    }
  }

  _render() {
    if (!this._L) return;
    const { periodX, offsetX, offsetY } = this._L;
    const scale = (1 - this._state.diff).toFixed(4);
    for (const p of this._tiles) {
      const px = mod(p.left + this._state.cx, periodX) - offsetX;
      const py = mod(p.top + this._state.cy * p.my, p.period) - offsetY;
      const dx = px - p.left;
      const dy = py - p.top;
      p.el.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${scale})`;
    }
  }

  _tick(now) {
    if (!this._lastTime) this._lastTime = now;
    const dt = Math.min(now - this._lastTime, 50) / 16.67;
    this._lastTime = now;

    if (this.autoScroll && !this._state.dragging) {
      this._state.ty -= this.autoSpeed * dt;
    }

    const xDiff = this._state.tx - this._state.cx;
    const yDiff = this._state.ty - this._state.cy;
    this._state.cx += xDiff * EASE;
    this._state.cy += yDiff * EASE;
    this._state.diff = Math.max(Math.abs(yDiff * DIFF_MULT), Math.abs(xDiff * DIFF_MULT));

    this._render();
    this._rafId = requestAnimationFrame((t) => this._tick(t));
  }

  _onDown(e) {
    if (this._state.dragging) return;
    if (e.target.closest?.('.gallery-lightbox')) return;
    this._state.dragging = true;
    this.classList.add('is-dragging');
    this._state.startX = e.clientX;
    this._state.startY = e.clientY;
    this._state.startTx = this._state.tx;
    this._state.startTy = this._state.ty;
  }

  _onMove(e) {
    if (!this._state.dragging) return;
    const axis = this.dragAxis;
    if (axis.includes('x')) {
      this._state.tx = this._state.startTx + (e.clientX - this._state.startX) * DRAG_MULT;
    }
    if (axis.includes('y')) {
      this._state.ty = this._state.startTy + (e.clientY - this._state.startY) * DRAG_MULT;
    }
  }

  _onUp() {
    if (!this._state.dragging) return;
    this._state.dragging = false;
    this.classList.remove('is-dragging');
  }

  _onWheel(e) {
    if (e.target.closest?.('.gallery-lightbox')) return;
    let wx = e.wheelDeltaX || e.deltaX * -1;
    let wy = e.wheelDeltaY || e.deltaY * -1;
    if (this._isFirefox && e.deltaMode === 1) { wx *= this._MULT_FIREFOX; wy *= this._MULT_FIREFOX; }
    wx *= this._MULT_MOUSE;
    wy *= this._MULT_MOUSE;
    this._state.tx += wx;
    this._state.ty += wy;
  }

  _onResize() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      if (!this._dimsCache) return;
      // Ignora i resize "finti" di mobile (URL bar che si nasconde/mostra):
      // se la config è identica, non ricostruire → niente flicker.
      const key = this._configKeyOf(this._getLayoutConfig());
      if (key === this._configKey) return;
      this._build();
    }, 150);
  }

  _openLightbox(src) {
    this._closeLightbox();
    const lb = document.createElement('div');
    lb.className = 'gallery-lightbox';
    lb.innerHTML = `
      <div class="gallery-lightbox-backdrop"></div>
      <button class="gallery-lightbox-btn gallery-lightbox-download" aria-label="Scarica">
        <span class="gallery-lightbox-icon" style="--i:url('${DOWNLOAD_ICON}')"></span>
      </button>
      <button class="gallery-lightbox-btn gallery-lightbox-close" aria-label="Chiudi">
        <span class="gallery-lightbox-icon" style="--i:url('${CLOSE_ICON}')"></span>
      </button>
      <img class="gallery-lightbox-img" src="${src}" alt="">`;

    lb.querySelector('.gallery-lightbox-close').addEventListener('click', () => this._closeLightbox());
    lb.querySelector('.gallery-lightbox-backdrop').addEventListener('click', () => this._closeLightbox());
    lb.querySelector('.gallery-lightbox-download').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = src;
      a.download = src.split('/').pop() || 'photo';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });

    const onKey = (e) => { if (e.key === 'Escape') this._closeLightbox(); };
    this._lbKey = onKey;
    window.addEventListener('keydown', onKey);

    this.shadowRoot.appendChild(lb);
    this._lightbox = lb;
  }

  _closeLightbox() {
    if (this._lightbox) { this._lightbox.remove(); this._lightbox = null; }
    if (this._lbKey) { window.removeEventListener('keydown', this._lbKey); this._lbKey = null; }
  }
}

customElements.define('mdv-gallery', MdvGallery);