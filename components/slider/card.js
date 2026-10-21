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

// Shared, bounded queue. Visible cards can overtake background work.
const loads = [];
let activeLoads = 0;
function pumpLoads() {
  while (activeLoads < 3 && loads.length) {
    loads.sort((a, b) => b.priority - a.priority);
    const job = loads.shift();
    activeLoads++;
    Promise.resolve().then(job.task).catch(error => {
      console.warn('[mdv-card] load failed', error);
    }).finally(() => { activeLoads--; pumpLoads(); });
  }
}
function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => finish(new Error('Image load timed out')), 15000);
    let done = false;
    function finish(error) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      img.onload = img.onerror = null;
      if (error) { img.src = ''; reject(error); }
      else resolve(url);
    }
    img.decoding = 'async';
    img.onload = async () => {
      // A decode rejection need not mean the successfully loaded image is unusable.
      if (img.decode) { try { await img.decode(); } catch (_) {} }
      finish();
    };
    img.onerror = () => finish(new Error('Image could not be loaded'));
    img.src = url;
  });
}

class MdvCard extends BaseElement {
  static get observedAttributes() { return ['src', 'title', 'orientation', 'data-standing']; }

  constructor() {
    super();
    this._generation = 0;
    this._attempts = 0;
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
    if (!this._visibilityHandler) this._visibilityHandler = () => { if (document.hidden) this._resetHover(); };
    document.addEventListener('visibilitychange', this._visibilityHandler);
    if (!this._initPromise) this._initPromise = this._init();
    this._initPromise.then(() => {
      if (this.isConnected && !this._loaded && !this._isInsideSlider()) this._observe();
    });
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
    if ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
        (navigator.deviceMemory && navigator.deviceMemory <= 4)) {
      this.setAttribute('data-lite', '');
    }

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
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._resetHover();
      clearTimeout(this._retryTimer);
      // Preserve the DOM, image and local listeners across real reconnects.
    });
  }

  attributeChangedCallback(name, oldV, newV) {
    if (oldV === newV) return;
    if (name === 'title') {
      if (this._header) this._applyTitle();
      return;
    }
    if (name === 'src') {
      this._generation++;
      this._attempts = 0;
      clearTimeout(this._retryTimer);
      this._loaded = false;
      this.removeAttribute('data-ready');
      this.removeAttribute('data-error');
      if (this._cardEl) this._cardEl.style.setProperty('--tessera', 'none');
      if (this._io) { this._io.disconnect(); this._io = null; }
      if (!this._ready || !newV) return;
      this.wake('front', this._isActiveSlide() ? 2 : 0);
    }
  }

  // ── LAZY LOAD ────────────────────────────────────────────────
  _observe() {
    if (this._scheduled || this._loaded || this._io || !this.isConnected) return;
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

  // Safe before initialization; priority 2 is the active card, 1 its neighbors.
  wake(side = 'front', priority = 0) {
    if (this._io) { this._io.disconnect(); this._io = null; }
    if (this._loaded) return;
    if (this._job) this._job.priority = Math.max(this._job.priority, priority);
    if (this._scheduled) return;
    clearTimeout(this._retryTimer);
    this._scheduled = true;
    const job = this._job = { priority, task: async () => {
      const generation = this._generation;
      try {
        await (this._initPromise || (this._initPromise = this._init()));
        if (this.isConnected) await this._loadNow(side, generation);
      } finally {
        this._scheduled = false;
        this._job = null;
        if (this.isConnected && generation !== this._generation) this.wake(side, priority);
      }
    }};
    loads.push(job);
    pumpLoads();
  }

  async _loadNow(side, generation) {
    const raw = this.getAttribute('src') || '';
    const url = this._resolveSrc(raw);
    try {
      if (!url) throw new Error('Unknown card image: ' + raw);
      await preloadImage(url);
      if (generation !== this._generation) return;
      this._cardEl.style.setProperty('--tessera', 'url(' + JSON.stringify(url) + ')');
      this.setAttribute('data-ready', '');
      this.removeAttribute('data-error');
      this._loaded = true;
      this._attempts = 0;
      this._emit('card-loaded', { src: raw, url, side });
    } catch (error) {
      if (generation !== this._generation) return;
      this.setAttribute('data-error', '');
      this._emit('card-error', { src: raw, url, message: error.message });
      if (++this._attempts < 3 && this.isConnected) {
        this._retryTimer = setTimeout(() => this.wake(side, 1), this._attempts * 1000);
      }
    }
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
    if (!this._loaded) { this._attempts = 0; this.wake('front', 2); return; }
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

    const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!supportsHover || reduced) return;
    this._on(this._sceneEl, 'pointerenter', (e) => {
      if (e.pointerType === 'touch' || (this._isInsideSlider() && !this.standing)) return;
      this._s.hovering = true; this._s.idle = false;
      this._pointer = { clientX: e.clientX, clientY: e.clientY }; this._startLoop();
    });
    this._on(this._sceneEl, 'pointermove', (e) => {
      if (!this._s.hovering) return;
      this._updateTarget(e); this._startLoop();
    });
    this._on(this._sceneEl, 'pointerleave', () => {
      this._pointer = null;
      this._s.hovering = false;
      this._s.tPX = 50; this._s.tPY = 50;
      this._s.tRX = 0;  this._s.tRY = 0;
      this._s.tGlare = 0;
      this._startLoop();
    });
  }

  _updateTarget(e) {
    const r = this._sceneEl.getBoundingClientRect();
    if (!r.width || !r.height) return;
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
    if (this._rafId || !this.isConnected || document.hidden) return;
    this._s.idle = false;
    this._lastFrame = 0;
    this._rafId = requestAnimationFrame(time => this._tick(time));
  }

  _tick(time) {
    try {
      if (this._pointer) { this._updateTarget(this._pointer); this._pointer = null; }
      const elapsed = this._lastFrame ? time - this._lastFrame : 16.67;
      this._lastFrame = time;
      this._slowFrames = elapsed > 28 && elapsed < 250 ? (this._slowFrames || 0) + 1 : Math.max(0, (this._slowFrames || 0) - 1);
      if (this._slowFrames >= 12) this.setAttribute('data-lite', '');
      const s = this._s;
      if (s.idle) { this._rafId = null; return; }
      const k = 1 - Math.pow(1 - (s.hovering ? 0.18 : 0.08), Math.min(elapsed, 50) / 16.67);
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
      if (!this.hasAttribute('data-lite')) {
        st.setProperty('--px',     s.cPX.toFixed(2) + '%');
        st.setProperty('--py',     s.cPY.toFixed(2) + '%');
        st.setProperty('--gx',     s.cGX.toFixed(2) + '%');
        st.setProperty('--gy',     s.cGY.toFixed(2) + '%');
        st.setProperty('--ga',     s.cGA.toFixed(2) + 'deg');
      }
      st.setProperty('--rx', s.cRX.toFixed(2) + 'deg');
      st.setProperty('--ry', s.cRY.toFixed(2) + 'deg');
      st.setProperty('--motion', s.motion.toFixed(3));
      st.setProperty('--glare',  s.cGlare.toFixed(3));
      s.lastGX = s.cGX; s.lastGY = s.cGY; s.lastGA = s.cGA;
      const settled =
        Math.abs(s.tPX - s.cPX) < 0.05 &&
        Math.abs(s.tPY - s.cPY) < 0.05 &&
        Math.abs(s.tRX - s.cRX) < 0.05 &&
        Math.abs(s.tRY - s.cRY) < 0.05 &&
        s.motion < 0.002 && Math.abs(s.tGlare - s.cGlare) < 0.002 &&
        Math.abs(gxT - s.cGX) < 0.05 && Math.abs(gyT - s.cGY) < 0.05 && Math.abs(gaT - s.cGA) < 0.05;
      if (settled) {
        if (!s.hovering) {
          st.setProperty('--rx', '0deg');
          st.setProperty('--ry', '0deg');
          st.setProperty('--motion', '0');
          st.setProperty('--glare', '0');
        }
        s.idle = true; this._rafId = null; return;
      }
    } finally {
      if (!this._s.idle) this._rafId = requestAnimationFrame(time => this._tick(time));
    }
  }

  _resetHover() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._pointer = null;
    Object.assign(this._s, { hovering: false, idle: true, tPX: 50, tPY: 50,
      tRX: 0, tRY: 0, cPX: 50, cPY: 50, cRX: 0, cRY: 0,
      cGX: 50, cGY: 50, cGA: -33, lastGX: 50, lastGY: 50, lastGA: -33,
      motion: 0, tGlare: 0, cGlare: 0 });
    for (const [name, value] of Object.entries({ rx: '0deg', ry: '0deg', motion: '0', glare: '0' })) {
      this._cardEl?.style.setProperty('--' + name, value);
    }
  }

  setStanding(v) {
    if (!v) this._resetHover();
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
