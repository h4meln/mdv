/* <mdv-card src="chiave|url" title="..." orientation="portrait|landscape"> */
import { BaseElement } from '../shared/base-element.js';
import { sheet } from '../shared/styles.js';
import { getTessere } from '../shared/tessere-store.js';
import { CARD_STYLES } from './card.styles.js';

const TEMPLATE = `
  <div class="card-scene">
    <div class="card-inner" tabindex="0" role="button" aria-pressed="false">
      <div class="card-spin">
        <div class="card-flipper">
          <div class="card-face card-face--front">
            <div class="card-layer card-layer--textures"></div>
            <div class="card-layer card-layer--bands"></div>
            <div class="card-layer card-layer--glare"></div>
            <div class="card-layer card-layer--sparkle"></div>
            <div class="card-layer card-layer--frame"></div>
            <div class="card-header"></div>
          </div>
          <div class="card-face card-face--back">
            <div class="card-layer card-layer--frame"></div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

const MAX_TILT = 20;
const CLICK_THRESHOLD = 6;

// ── DIZIONARIO ──────────────────────────────────────────────────
let tesserePromise = null;
function loadTessere() {
  if (!tesserePromise) tesserePromise = getTessere();
  return tesserePromise;
}
const resolvedCache = new Map();

// ── DOPPIA CODA SEQUENZIALE ─────────────────────────────────────
// Due corsie indipendenti. Ciascuna carica UNA immagine alla volta,
// con STAGGER_MS fra un avvio e il successivo.
// "front" procede dall'alto verso il centro, "back" dal basso verso il centro.
const MAX_PER_LANE = 1;
const STAGGER_MS   = 140;

const _lanes = {
  front: { q: [], active: 0, lastStart: 0, timer: 0 },
  back:  { q: [], active: 0, lastStart: 0, timer: 0 },
};

function _pump(side) {
  const lane = _lanes[side];
  if (lane.active >= MAX_PER_LANE || lane.q.length === 0) return;
  const now = performance.now();
  const wait = Math.max(0, lane.lastStart + STAGGER_MS - now);
  if (wait > 0) {
    if (lane.timer) return;
    lane.timer = setTimeout(() => { lane.timer = 0; _pump(side); }, wait);
    return;
  }
  lane.lastStart = now;
  const item = lane.q.shift();
  lane.active++;
  Promise.resolve()
    .then(item.task)
    .catch(() => {})
    .then(() => {
      lane.active--;
      item.resolve();
      _pump(side);
    });
}

function enqueueLoad(task, side = 'front') {
  return new Promise((resolve) => {
    _lanes[side].q.push({ task, resolve });
    _pump(side);
  });
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'sync';
    img.src = url;
    // decode() risolve quando l'immagine è PRONTA al disegno,
    // non solo quando i byte sono arrivati.
    if (img.decode) {
      img.decode().then(() => resolve(url), reject);
    } else {
      // Fallback per browser vecchi (iOS < 11, Android vecchi)
      img.onload  = () => resolve(url);
      img.onerror = reject;
    }
  });
}

class MdvCard extends BaseElement {
  static get observedAttributes() { return ['src', 'title', 'orientation', 'data-standing']; }

  constructor() {
    super();
    this._ready = false;
    this._initPromise = null;
    this._flipped = false;
    this._rafId = null;
    this._tessere = {};
    this._io = null;
    this._loaded = false;      // immagine applicata al DOM
    this._scheduled = false;   // in coda o già in caricamento
    this._downX = 0; this._downY = 0; this._hasDown = false;
    this._s = {
      hovering: false, idle: true,
      tPX: 50, tPY: 50, tRX: 0, tRY: 0,
      cPX: 50, cPY: 50, cRX: 0, cRY: 0,
      cGX: 50, cGY: 50, cGA: -33,
      lastGX: 50, lastGY: 50, lastGA: -33,
      motion: 0, tGlare: 0, cGlare: 0,
    };
  }

  connectedCallback() {
    if (!this._initPromise) this._initPromise = this._init();
    return this._initPromise;
  }

  async _init() {
    if (this._ready) return;
    this.shadowRoot.adoptedStyleSheets = [sheet(CARD_STYLES)];
    this.shadowRoot.innerHTML = TEMPLATE;
    this._cardEl  = this.shadowRoot.querySelector('.card-inner');
    this._sceneEl = this.shadowRoot.querySelector('.card-scene');
    this._header  = this.shadowRoot.querySelector('.card-header');

    this._applyTitle();
    if (!this.hasAttribute('orientation')) this.setAttribute('orientation', 'portrait');
    this._wireEvents();

    this._tessere = await loadTessere();
    this._ready = true;

    // Se nessuno ci ha già messo in coda (slider / wake esterno) e non siamo
    // in uno slider, attiviamo il lazy load a visibilità.
    if (!this._scheduled && !this._loaded && !this._isInsideSlider()) {
      this._observe();
    }
  }

  disconnectedCallback() {
    queueMicrotask(() => {
      if (this.isConnected) return; // move (Swiper loop), non remove
      if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
      this._s.idle = true;
      if (this._io) { this._io.disconnect(); this._io = null; }
      this._cleanup();
      this._initPromise = null;
      this._ready = false;
    });
  }

  attributeChangedCallback(name, oldV, newV) {
    if (oldV === newV) return;
    if (name === 'title') {
      if (this._ready && this._header) this._applyTitle();
      return;
    }
    if (name === 'src') {
      // Reset stato visivo
      this._loaded = false;
      this.removeAttribute('data-ready');
      if (this._cardEl) this._cardEl.style.setProperty('--tessera', 'none');
      if (this._io) { this._io.disconnect(); this._io = null; }
      if (!this._ready || !newV) return;
      if (this._isInsideSlider()) {
        // Lo slider decide quando ricaricare: aspettiamo wake()
      } else {
        this._scheduled = false;
        this._observe();
      }
    }
  }

  // ── LAZY LOAD ────────────────────────────────────────────────
  _observe() {
    if (this._scheduled || this._loaded) return;
    if (!('IntersectionObserver' in window)) {
      this.wake(this._pickSide());
      return;
    }
    this._io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const side = this._pickSide();
          this._io.disconnect();
          this._io = null;
          this.wake(side);
          return;
        }
      }
    }, { rootMargin: '150px 0px' });
    this._io.observe(this);
  }

  /* Lato in base alla posizione: metà alta → front, metà bassa → back. */
  _pickSide() {
    if (typeof window === 'undefined') return 'front';
    const r = this.getBoundingClientRect();
    const mid = window.innerHeight / 2;
    return (r.top + r.height / 2) < mid ? 'front' : 'back';
  }

  /* Richiede il caricamento su una corsia specifica.
     Chiamabile in qualsiasi momento: se l'init non è pronto, la corsia
     attende. L'ordine di chiamata è preservato (importante per la
     doppia puntina dello slider). */
  wake(side = 'front') {
    if (this._io) { this._io.disconnect(); this._io = null; }
    if (this._scheduled || this._loaded) return;
    this._scheduled = true;
    const initPromise = this._initPromise || (this._initPromise = this._init());
    enqueueLoad(async () => {
      await initPromise;
      if (!this.isConnected) return;
      await this._loadNow(side);
    }, side);
  }

  async _loadNow(side) {
    const raw = this.getAttribute('src') || '';
    const url = this._resolveSrc(raw);
    if (!url) {
      if (raw) console.warn(`[mdv-card] chiave "${raw}" non trovata`);
      this._scheduled = false;
      return;
    }
    try {
      await preloadImage(url);
    } catch (_) {
      this._scheduled = false;
      return;
    }
    if (this.getAttribute('src') !== raw) {
      // src cambiato durante il preload → ritenta con il nuovo
      this._scheduled = false;
      return this.wake(side);
    }
    this._cardEl.style.setProperty('--tessera', `url('${url}')`);
    this.setAttribute('data-ready', '');
    this._loaded = true;
    this._scheduled = false;
    this._emit('card-loaded', { src: raw, url, side });
  }

  _resolveSrc(raw) {
    if (!raw) return '';
    if (/^[a-z]+:/i.test(raw) || raw.includes('/') || raw.includes('.')) return raw;
    let url = resolvedCache.get(raw);
    if (!url) {
      const dict = this._tessere || {};
      url = dict[raw] || dict[raw.toUpperCase()] || dict[raw.toLowerCase()] || null;
      if (url) resolvedCache.set(raw, url);
    }
    return url || '';
  }

  _applyTitle() {
    this._header.textContent = this.getAttribute('title') || '';
  }

  // ── CONTESTO ─────────────────────────────────────────────────
  _isInsideSlider() {
    let node = this.parentNode;
    while (node) {
      if (node instanceof ShadowRoot) {
        if (node.host?.tagName === 'MDV-SLIDER') return true;
        node = node.host;
        continue;
      }
      if (node.nodeType === 1 && node.tagName === 'MDV-SLIDER') return true;
      if (node === document) return false;
      node = node.parentNode;
    }
    return false;
  }
  _isActiveSlide() {
    let node = this.parentNode;
    while (node) {
      if (node.nodeType === 1 && node.classList?.contains('swiper-slide-active')) return true;
      if (node instanceof ShadowRoot) node = node.host;
      else if (node === document) return false;
      else node = node.parentNode;
    }
    return false;
  }

  // ── INTERAZIONE ──────────────────────────────────────────────
  _toggleFlip() {
    if (this._isInsideSlider() && !this._isActiveSlide()) return;
    this._flipped = !this._flipped;
    this._cardEl.classList.toggle('is-flipped', this._flipped);
    this._cardEl.setAttribute('aria-pressed', String(this._flipped));
    this._emit('card-flip', {
      flipped: this._flipped,
      src: this.getAttribute('src') || '',
    });
  }

  _wireEvents() {
    this._on(this._cardEl, 'pointerdown', (e) => {
      this._downX = e.clientX; this._downY = e.clientY;
      this._hasDown = true;
    });
    this._on(this._cardEl, 'pointerup', (e) => {
      if (!this._hasDown) return;
      this._hasDown = false;
      const dist = Math.hypot(e.clientX - this._downX, e.clientY - this._downY);
      if (dist > CLICK_THRESHOLD) return;
      this._toggleFlip();
    });
    this._on(this._cardEl, 'pointercancel', () => { this._hasDown = false; });

    this._on(this._cardEl, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._toggleFlip(); }
    });

    const isTouch = (navigator.maxTouchPoints || 0) > 0;
    const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || !supportsHover || reduced) return;
    this._on(this._sceneEl, 'pointerenter', (e) => {
      this._s.hovering = true; this._s.idle = false;
      this._updateTarget(e); this._startLoop();
    });
    this._on(this._sceneEl, 'pointermove', (e) => {
      if (!this._s.hovering) return;
      this._updateTarget(e); this._startLoop();
    });
    this._on(this._sceneEl, 'pointerleave', () => {
      this._s.hovering = false;
      this._s.tPX = 50; this._s.tPY = 50;
      this._s.tRX = 0;  this._s.tRY = 0;
      this._s.tGlare = 0;
      this._startLoop();
    });
  }

  _updateTarget(e) {
    const r = this._sceneEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (e.clientY - r.top)  / r.height));
    const s = this._s;
    s.tPX = x * 100; s.tPY = y * 100;
    s.tRY = (x - 0.5) * MAX_TILT * 2;
    s.tRX = (0.5 - y) * MAX_TILT * 2;
    const cx = r.left + r.width / 2;
    const cy = r.top  + r.height / 2;
    const d  = Math.hypot(e.clientX - cx, e.clientY - cy);
    const maxD = Math.hypot(r.width / 2, r.height / 2);
    s.tGlare = Math.max(0, 1 - d / maxD);
  }

  _startLoop() {
    if (this._rafId) return;
    this._rafId = requestAnimationFrame(() => this._tick());
  }

  _tick() {
    try {
      const s = this._s;
      if (s.idle) { this._rafId = null; return; }
      const k = s.hovering ? 0.18 : 0.08;
      s.cPX += (s.tPX - s.cPX) * k;
      s.cPY += (s.tPY - s.cPY) * k;
      s.cRX += (s.tRX - s.cRX) * k;
      s.cRY += (s.tRY - s.cRY) * k;
      s.cGlare += (s.tGlare - s.cGlare) * 0.15;
      const gxT = 50 - (s.cRY / MAX_TILT) * 55;
      const gyT = 50 + (s.cRX / MAX_TILT) * 55;
      const gaT = -33 + (s.cRY / MAX_TILT) * 8 + (s.cRX / MAX_TILT) * 4;
      s.cGX += (gxT - s.cGX) * 0.15;
      s.cGY += (gyT - s.cGY) * 0.15;
      s.cGA += (gaT - s.cGA) * 0.15;
      const dGX = Math.abs(s.cGX - s.lastGX);
      const dGY = Math.abs(s.cGY - s.lastGY);
      const dGA = Math.abs(s.cGA - s.lastGA);
      const target = Math.min(1, (dGX + dGY + dGA * 1.5) * 0.10);
      const mk = target > s.motion ? 0.5 : 0.07;
      s.motion += (target - s.motion) * mk;
      const st = this._cardEl.style;
      st.setProperty('--px',     s.cPX.toFixed(2) + '%');
      st.setProperty('--py',     s.cPY.toFixed(2) + '%');
      st.setProperty('--rx',     s.cRX.toFixed(2) + 'deg');
      st.setProperty('--ry',     s.cRY.toFixed(2) + 'deg');
      st.setProperty('--gx',     s.cGX.toFixed(2) + '%');
      st.setProperty('--gy',     s.cGY.toFixed(2) + '%');
      st.setProperty('--ga',     s.cGA.toFixed(2) + 'deg');
      st.setProperty('--motion', s.motion.toFixed(3));
      st.setProperty('--glare',  s.cGlare.toFixed(3));
      s.lastGX = s.cGX; s.lastGY = s.cGY; s.lastGA = s.cGA;
      const settled =
        Math.abs(s.tPX - s.cPX) < 0.05 &&
        Math.abs(s.tPY - s.cPY) < 0.05 &&
        Math.abs(s.tRX - s.cRX) < 0.05 &&
        Math.abs(s.tRY - s.cRY) < 0.05 &&
        s.motion < 0.002 && s.cGlare < 0.002;
      if (settled && !s.hovering) {
        st.setProperty('--rx', '0deg');
        st.setProperty('--ry', '0deg');
        st.setProperty('--motion', '0');
        st.setProperty('--glare', '0');
        s.idle = true; this._rafId = null; return;
      }
    } finally {
      if (!this._s.idle) this._rafId = requestAnimationFrame(() => this._tick());
    }
  }

  setStanding(v) {
    const has = this.hasAttribute('data-standing');
    if (v === has) return;
    if (v) this.setAttribute('data-standing', '');
    else   this.removeAttribute('data-standing');
  }
  get standing() { return this.hasAttribute('data-standing'); }

  resetFlip() {
    this._flipped = false;
    if (this._cardEl) {
      this._cardEl.classList.remove('is-flipped');
      this._cardEl.setAttribute('aria-pressed', 'false');
    }
  }
}

customElements.define('mdv-card', MdvCard);