/* <mdv-slider title="...">
    <mdv-card src="chiave" title="..." orientation="portrait"></mdv-card>
  </mdv-slider> */
  import { BaseElement } from '../shared/base-element.js';
  import { sheet } from '../shared/styles.js';
  import { escapeHtml } from '../shared/dom-utils.js';
  import { SWIPER_BASE_CSS, SLIDER_STYLES } from './slider.styles.js';
  
  const SWIPER_URL = new URL('../../assets/libs/swiper-bundle.min.js', import.meta.url).href;
  const CARD_URL   = new URL('./card.js', import.meta.url).href;
  
  let swiperPromise = null;
  function ensureSwiper() {
    if (window.Swiper) return Promise.resolve(window.Swiper);
    if (swiperPromise) return swiperPromise;
    swiperPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SWIPER_URL}"]`);
      if (existing) {
        if (window.Swiper) return resolve(window.Swiper);
        existing.addEventListener('load',  () => resolve(window.Swiper));
        existing.addEventListener('error', reject);
      } else {
        const s = document.createElement('script');
        s.src = SWIPER_URL;
        s.onload  = () => resolve(window.Swiper);
        s.onerror = reject;
        document.head.appendChild(s);
      }
    });
    return swiperPromise;
  }
  
  let cardPromise = null;
  function ensureCard() {
    if (customElements.get('mdv-card')) return Promise.resolve();
    if (cardPromise) return cardPromise;
    cardPromise = import(CARD_URL).then(() => customElements.whenDefined('mdv-card'));
    return cardPromise;
  }
  
  class MdvSlider extends BaseElement {
    static get observedAttributes() { return ['title']; }
  
    constructor() {
      super();
      this._swiper = null;
      this._ready = false;
      this._initPromise = null;
      this._childrenObserver = null;
    }
  
    connectedCallback() {
      if (this._ready) {
        if (!this._swiper && this._cards?.length) this._initSwiper();
        return;
      }
      if (this._initPromise) return;
      const tryStart = () => {
        const cards = Array.from(this.children).filter(el => el.tagName === 'MDV-CARD');
        if (cards.length === 0) return false;
        if (this._childrenObserver) {
          this._childrenObserver.disconnect();
          this._childrenObserver = null;
        }
        this._initPromise = this._init();
        return true;
      };
      if (tryStart()) return;
      this._childrenObserver = new MutationObserver(() => tryStart());
      this._childrenObserver.observe(this, { childList: true });
    }
  
    disconnectedCallback() {
      queueMicrotask(() => {
      if (this.isConnected) return;
      if (this._childrenObserver) { this._childrenObserver.disconnect(); this._childrenObserver = null; }
      if (this._swiper) this._resumeIndex = this._swiper.realIndex;
      if (this._swiper) { try { this._swiper.destroy(true, false); } catch (_) {} this._swiper = null; }
      if (this._standingRaf) { cancelAnimationFrame(this._standingRaf); this._standingRaf = null; }
      this._cleanup();
      });
    }
  
    attributeChangedCallback(name, oldV, newV) {
      if (oldV === newV || !this._ready) return;
      if (name === 'title') {
        const t = this.shadowRoot.querySelector('.slider-title');
        if (t) t.textContent = newV || '';
      }
    }
  
    async _init() {
      await Promise.all([ ensureCard(), ensureSwiper() ]);
      this._cards = Array.from(this.children).filter(el => el.tagName === 'MDV-CARD');
      this._cards.forEach(card => {
        if (!card.hasAttribute('orientation')) card.setAttribute('orientation', 'portrait');
      });
      this._renderShell();
      this._adoptCards();
      if (this.isConnected) this._initSwiper();
      this._ready = true;
      this._emit('slider-ready');
    }
  
    _renderShell() {
      this.shadowRoot.adoptedStyleSheets = [sheet(SWIPER_BASE_CSS), sheet(SLIDER_STYLES)];
      const t = this.getAttribute('title') || '';
      const titleHTML = t ? `<h2 class="slider-title">${escapeHtml(t)}</h2>` : '';
      if (this._cards.length <= 1) this.setAttribute('data-single', '');
      this.shadowRoot.innerHTML = `
        <div class="slider">
          ${titleHTML}
          <div class="swiper">
            <div class="swiper-wrapper"></div>
            <div class="swiper-pagination"></div>
            <div class="swiper-button-prev"></div>
            <div class="swiper-button-next"></div>
          </div>
        </div>`;
      this._swiperEl     = this.shadowRoot.querySelector('.swiper');
      this._wrapperEl    = this.shadowRoot.querySelector('.swiper-wrapper');
      this._paginationEl = this.shadowRoot.querySelector('.swiper-pagination');
      this._prevEl       = this.shadowRoot.querySelector('.swiper-button-prev');
      this._nextEl       = this.shadowRoot.querySelector('.swiper-button-next');
    }
  
    _adoptCards() {
      for (const card of this._cards) {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        slide.appendChild(card);
        this._wrapperEl.appendChild(slide);
      }
    }
  
    _initSwiper() {
      const n = this._cards.length;
      if (!window.Swiper || n === 0) return;
      if (n === 1) {
        this._prevEl.style.display = 'none';
        this._nextEl.style.display = 'none';
        this._paginationEl.style.display = 'none';
        this._wrapperEl.firstElementChild.classList.add('swiper-slide-active');
        this._cards[0].setStanding(true);
        this._cards[0].wake?.('front');
        return;
      }
      const loopEnabled = n >= 3;
      this._swiper = new window.Swiper(this._swiperEl, {
        initialSlide: this._resumeIndex || 0,
        speed: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300,
        effect: 'cards', grabCursor: true, centeredSlides: true, slidesPerView: 'auto',
        loop: loopEnabled, watchSlidesProgress: true, keyboard: { enabled: true },
        pagination: {
          el: this._paginationEl,
          clickable: true,
          renderBullet: (index, className) => {
            const card = this._cards[index];
            const label = card?.getAttribute('title') || String(index + 1);
            return `<span class="${className}"><span class="slider-badge-label">${escapeHtml(label)}</span></span>`;
          },
        },
        navigation: { nextEl: this._nextEl, prevEl: this._prevEl },
        cardsEffect: { perSlideOffset: 10, perSlideRotate: 3, rotate: true, slideShadows: false },
        a11y: { enabled: true, slideRole: 'group', containerRoleDescriptionMessage: 'Card slider' },
        on: {
          init: (sw) => {
            this._updateStanding(sw);
            requestAnimationFrame(() => {
              if (!this.isConnected || sw.destroyed) return;
              this._updateStanding(sw);
              this._scrollBadgeIntoView(sw.realIndex, 'auto');
            });
            this._wakeBidirectional();
          },
          slideChange: (sw) => {
            this._resetFlips();
            this._updateStanding(sw);
            this._scrollBadgeIntoView(sw.realIndex, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
            this._emit('slide-change', { index: sw.realIndex, card: this._cards[sw.realIndex] });
          },
          slideChangeTransitionStart: (sw) => this._updateStanding(sw),
          slideChangeTransitionEnd:   (sw) => this._updateStanding(sw),
          resize: (sw) => this._scheduleStanding(sw),
        },
      });
    }
  
    // Load a small neighborhood instead of decoding the entire deck at startup.
    _wakeBidirectional() {
      this._wakeNearby(this._swiper?.realIndex || this._resumeIndex || 0);
    }

    _wakeNearby(index) {
      const n = this._cards.length;
      this._cards[index]?.wake('front', 2);
      for (const offset of [-1, 1, -2, 2]) {
        const i = this._swiper?.params.loop ? (index + offset + n) % n : index + offset;
        this._cards[i]?.wake(offset < 0 ? 'back' : 'front', 1);
      }
    }

    _scheduleStanding(sw) {
      if (this._standingRaf) return; 
      this._standingRaf = requestAnimationFrame(() => {
        this._standingRaf = null;
        this._updateStanding(sw);
      });
    }
  
    _scrollBadgeIntoView(idx, behavior = 'smooth') {
      const bullets = this._paginationEl.querySelectorAll('.swiper-pagination-bullet');
      const bullet = bullets[idx];
      if (!bullet) return;
      const container = this._paginationEl;
      const targetLeft = bullet.offsetLeft - (container.clientWidth - bullet.offsetWidth) / 2;
      container.scrollTo({ left: targetLeft, behavior });
    }
  
    _updateStanding(swiper) {
      if (!swiper || swiper.destroyed || !swiper.slides) return;
      const activeIdx = swiper.realIndex;
      swiper.slides.forEach(slide => {
        const card = slide.querySelector('mdv-card');
        if (!card) return;
        const want = slide === swiper.slides[swiper.activeIndex];
        if (card.standing !== want) card.setStanding(want);
      });
      this._wakeNearby(activeIdx);
    }
  
    _resetFlips() { this._cards.forEach(c => c.resetFlip && c.resetFlip()); }
    next() { this._swiper && this._swiper.slideNext(); }
    prev() { this._swiper && this._swiper.slidePrev(); }
    setActive(i) {
      if (!this._swiper) return;
      const n = this._cards.length;
      if (i < 0 || i >= n) return;
      if (this._swiper.params.loop) this._swiper.slideToLoop(i, 0);
      else this._swiper.slideTo(i, 0);
      this._updateStanding(this._swiper);
    }
    get cards() { return this._cards || []; }
  }
  
  customElements.define('mdv-slider', MdvSlider);
