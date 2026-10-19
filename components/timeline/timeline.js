import { TIMELINE_STYLES } from './timeline.styles.js';
import { BaseElement } from '../shared/base-element.js';
import { sheet } from '../shared/styles.js';

// ==========================================
// Utils & Helpers
// ==========================================
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const easeOutPow2 = (progress) => 1 - Math.pow(1 - progress, 2);

const escapeHtml = (value) => {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
};

const splitWords = (element) => {
  const words = element.textContent.replace(/\s+/g, ' ').trim().split(' ');
  element.textContent = '';
  
  return words.map((word, index) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.textContent = word;
    span.style.opacity = '0.1';
    
    element.appendChild(span);
    if (index < words.length - 1) element.appendChild(document.createTextNode(' '));
    return span;
  });
};

// ==========================================
// Constants
// ==========================================
const CONFIG = {
  EXIT_START: -0.08,
  EXIT_RANGE: 0.45,
  EXIT_POWER: 2,
  ENTRY_POWER: 1.5,
  YEAR_OUT_DURATION: 200,
  YEAR_IN_DURATION: 300,
  YEAR_DIGIT_DELAY: 100,
  INITIAL_LABEL: 'riavvolgiamo il nastro',
  TRANSITIONS: {
    IN: 'cubic-bezier(.25,.46,.45,.94)',
    OUT: 'cubic-bezier(.55,.085,.68,.53)'
  }
};

// ==========================================
// Builder
// ==========================================
class TimelineBuilder {
  constructor() {
    this.tweens = [];
    this.duration = 0;
  }

  to(start, duration, onUpdate, ease = (p) => p) {
    this.tweens.push({ start, duration, onUpdate, ease });
    this.duration = Math.max(this.duration, start + duration);
    return this;
  }

  seek(time) {
    for (const tween of this.tweens) {
      const rawProgress = clamp((time - tween.start) / tween.duration, 0, 1);
      tween.onUpdate(tween.ease(rawProgress), rawProgress);
    }
  }
}

// ==========================================
// Component
// ==========================================
class MdvTimeline extends BaseElement {
  static get observedAttributes() {
    return ['no-smooth-scroll'];
  }

  constructor() {
    super();
    // State
    this._data = [];
    this._sections = [];
    this._digits = [];
    this._currentYear = null;
    this._built = false;
    
    // Animation & Scroll State
    this._lastScrollY = -1;
    this._rafId = null;
    this._resizeTimer = null;
    this._smoothScroll = { target: 0, current: 0, active: false };
  }

  // --- Properties ---

  set data(list) {
    this._data = Array.isArray(list) ? list : [];
    if (this.isConnected) this._rebuild();
  }

  get data() {
    return [...this._data];
  }

  // --- Lifecycle ---

  async connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [sheet(TIMELINE_STYLES)];
    if (this._data.length > 0) this._rebuild();
  }

  disconnectedCallback() {
    this.shadowRoot.querySelectorAll('video').forEach(v => { this._setVideoVisible(v, false); });
    this._stopRenderLoop();
    clearTimeout(this._resizeTimer);
    this._cleanup();
  }

  // --- Core Initialization ---

  _rebuild() {
    if (!this._data.length) return;
    
    this._stopRenderLoop();
    this._cleanup();
    
    this._buildDom();
    this._initializeSections();
    this._wireEvents();
    this._measureSections();
    
    this._initialSync();
    
    this._built = true;
    this._startRenderLoop();
  }

  // --- DOM Generation ---

  _buildDom() {
    const yearsHtml = this._data.map(item => this._generateYearHtml(item)).join('');
    const initialHtml = `<span class="year-label">${escapeHtml(CONFIG.INITIAL_LABEL)}</span>`;
    
    this.shadowRoot.innerHTML = `
      <div class="timeline">
        <div id="year-display" class="year-number" aria-hidden="true">${initialHtml}</div>
        ${yearsHtml}
      </div>
    `;
  }

  _generateYearHtml(dataItem) {
    const year = escapeHtml(String(dataItem.year || ''));
    const title = dataItem.title || '';
    const text = escapeHtml(dataItem.text || '');
    
    const mediaHtml = (dataItem.media || []).map(media => this._generateMediaHtml(media)).join('');
    const titleClass = title.length > 60 ? ' is-sm' : '';

    return `
      <div class="pin-wrap" data-year="${year}">
        <section class="year-section">
          <div class="year-grid">
            <div class="year-text">
              <div>
                <h2 class="year-title${titleClass}">${title}</h2>
                <p class="intro">${text}</p>
              </div>
            </div>
            <div class="media-stack">${mediaHtml}</div>
          </div>
        </section>
      </div>
    `;
  }

  _generateMediaHtml(media) {
    if (media.type === 'video') {
      return `<div class="media-item reel"><video src="${escapeHtml(media.src)}" poster="${escapeHtml(media.src.replace(/\.mp4$/, '-poster.jpg'))}" playsinline loop preload="none" aria-label="${escapeHtml(media.alt || 'Video del Mondo')}"></video><button class="reel-sound" type="button" aria-label="Attiva audio">Attiva audio ↗</button></div>`;
    }
    return `<figure class="media-item polaroid"><img src="${escapeHtml(media.src)}" alt="${escapeHtml(media.alt || '')}" loading="lazy" decoding="async"><figcaption>${escapeHtml(media.alt || '')}</figcaption></figure>`;
  }

  // --- Sections & Animations Setup ---

  _initializeSections() {
    this._sections = [];
    const pinWraps = [...this.shadowRoot.querySelectorAll('.pin-wrap')];

    pinWraps.forEach(wrap => {
      const section = wrap.querySelector('.year-section');
      const grid = section.querySelector('.year-grid');
      const yearText = section.querySelector('.year-text');
      const introElement = section.querySelector('.intro');
      const mediaItems = [...section.querySelectorAll('.media-item')];
      
      const words = splitWords(introElement);
      const timeline = new TimelineBuilder();

      this._setupTextAnimations(timeline, words, yearText);
      this._setupMediaAnimations(timeline, mediaItems);

      timeline.duration = 1;

      this._sections.push({
        wrap, section, grid, yearText, mediaItems,
        timeline,
        year: wrap.dataset.year,
        top: 0, height: 0, sectionHeight: 0,
        entered: false, lastProgress: -1, lastEntry: -1
      });
    });

    this._digits = [...this.shadowRoot.querySelectorAll('.digit')];
    this._yearDisplay = this.shadowRoot.getElementById('year-display');
  }

  _setupTextAnimations(timeline, words, yearTextElement) {
    const wordCount = words.length;
    const maxStart = 0.20 - 0.12;

    // Words reveal animation
    words.forEach((word, index) => {
      const start = wordCount > 1 ? (index / (wordCount - 1)) * maxStart : 0;
      timeline.to(start, 0.12, progress => {
        word.style.opacity = (0.1 + 0.9 * progress).toFixed(3);
      }, easeOutPow2);
    });

    // Keep the copy readable throughout the scene, including its hold interval.
    yearTextElement.style.opacity = '1';
  }

  _setupMediaAnimations(timeline, mediaItems) {
    const mediaCount = mediaItems.length;
    const maxMediaStart = 0.24;

    mediaItems.forEach((item, index) => {
      const rotation = item.classList.contains('reel') ? 0 : (index % 2 ? 9 : -9);
      const start = 0.12 + (mediaCount > 1 ? (index / (mediaCount - 1)) * maxMediaStart : 0);
      
      // Store scrub metadata directly on the element for fast access during RAF
      item._rot = rotation;
      item._scrubStart = start;
      item._scrubDur = 0.13;
      item._offsetX = item.classList.contains('reel') ? 0 : (index % 2 ? 9 : -12);
      item._offsetY = item.classList.contains('reel') ? 0 : (index % 2 ? 10 : -6);
      
      item.style.opacity = '0';
      item.style.zIndex = String(index);
      item.style.transform = `rotate(${rotation}deg) scale(0.4)`;
      item.style.filter = 'blur(20px)';
    });
  }

  _setVideoVisible(video, visible) {
    visible = visible && !document.hidden;
    if (video._visible === visible) return;
    video._visible = visible;
    cancelAnimationFrame(video._fadeFrame);
    if (!visible) { video.pause(); video.muted = true; return; }
    video.muted = !!video._userMuted;
    video.volume = .01;
    const button = video.parentElement.querySelector('.reel-sound');
    const update = () => {
      button.textContent = video.muted ? 'Attiva audio ↗' : 'Disattiva audio ×';
      button.setAttribute('aria-label', video.muted ? 'Attiva audio' : 'Disattiva audio');
    };
    video.play().then(() => {
      if (!video._visible) { video.pause(); return; }
      const start = performance.now();
      const fade = now => {
        if (!video._visible) return;
        video.volume = Math.max(0, Math.min(1, (now - start) / 700));
        if (video.volume < 1) video._fadeFrame = requestAnimationFrame(fade);
      };
      video._fadeFrame = requestAnimationFrame(fade); update();
    }).catch(() => {
      if (!video._visible) return;
      video.muted = true; video.volume = 1; video.play().catch(() => {}); update();
    });
  }

  // --- Event Handling ---

  _wireEvents() {
    this._on(this.shadowRoot, 'click', e => {
      const button = e.target.closest('.reel-sound');
      if (!button) return;
      const video = button.parentElement.querySelector('video');
      const audible = !video.muted && video.volume > 0;
      video._userMuted = audible;
      video.muted = audible;
      video.volume = audible ? 0 : 1;
      video.play().catch(() => {});
      button.textContent = audible ? 'Attiva audio ↗' : 'Disattiva audio ×';
      button.setAttribute('aria-label', audible ? 'Attiva audio' : 'Disattiva audio');
    });
    this._on(document, 'visibilitychange', () => {
      if (document.hidden) this.shadowRoot.querySelectorAll('video').forEach(v => this._setVideoVisible(v, false));
      else { this._lastScrollY = -1; }
    });
    if (!this.hasAttribute('no-smooth-scroll')) {
      this._on(window, 'wheel', this._handleWheel.bind(this), { passive: false });
    }
    this._on(window, 'scroll', this._handleScroll.bind(this), { passive: true });
    this._on(window, 'load', () => this._measureSections());
    this._on(window, 'resize', this._handleResize.bind(this));
  }

  _handleWheel(event) {
    if (event.ctrlKey) return;
    const maxScroll = this._getMaxScroll();
    if (maxScroll <= 0) return;
    
    event.preventDefault();
    
    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 16; 
    else if (event.deltaMode === 2) delta *= window.innerHeight;
    
    this._smoothScroll.target = clamp(this._smoothScroll.target + delta, 0, maxScroll);
    this._smoothScroll.active = true;
  }

  _handleScroll() {
    if (this._smoothScroll.active) return;
    this._smoothScroll.current = window.scrollY;
    this._smoothScroll.target = window.scrollY;
  }

  _handleResize() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      this._measureSections();
      this._smoothScroll.target = clamp(this._smoothScroll.target, 0, this._getMaxScroll());
      this._smoothScroll.current = window.scrollY;
      this._lastScrollY = -1; // Force visual update
    }, 150);
  }

  _getMaxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  _measureSections() {
    this._isMobileLayout = window.matchMedia('(max-width: 767px)').matches;
    const scrollY = window.scrollY;
    this._sections.forEach(section => {
      const rect = section.wrap.getBoundingClientRect();
      section.top = rect.top + scrollY;
      section.height = section.wrap.offsetHeight;
      section.sectionHeight = section.section.offsetHeight;
      
      // Reset caches to force re-render
      section.lastProgress = -1;
      section.lastEntry = -1; 
    });
  }

  // --- Year / Digits Display Logic ---

  _setDigits(year) {
    const yearStr = String(year).padStart(4, '0');
    
    if (this._digits.length !== 4) {
      this._yearDisplay.innerHTML = yearStr.split('')
        .map(char => `<span class="digit">${escapeHtml(char)}</span>`)
        .join('');
      this._digits = [...this._yearDisplay.querySelectorAll('.digit')];
      return;
    }
    
    this._digits.forEach((digitEl, index) => {
      digitEl.style.transition = 'none';
      digitEl.style.transform = 'translateY(0)';
      digitEl.style.opacity = '1';
      digitEl.textContent = yearStr[index];
    });
  }

  _animateYearRoll(fromYear, toYear) {
    if (toYear === CONFIG.INITIAL_LABEL) {
      this._showLabel();
      return;
    }

    const toStr = String(toYear).padStart(4, '0');

    // First transition: From Text Label to Digits
    if (this._digits.length !== 4) {
      this._transitionFromLabelToDigits(toStr);
      return;
    }

    // Standard transition: Digit to Digit
    const fromStr = String(fromYear).padStart(4, '0');
    this._rollDigits(fromStr, toStr);
  }

  _transitionFromLabelToDigits(targetYearStr) {
    const buildDigits = () => {
      this._yearDisplay.innerHTML = targetYearStr.split('').map(char =>
        `<span class="digit" style="opacity:0;transform:translateY(100%)">${escapeHtml(char)}</span>`
      ).join('');
      
      this._digits = [...this._yearDisplay.querySelectorAll('.digit')];
      this._digits.forEach((el, index) => {
        setTimeout(() => {
          el.style.transition = `transform ${CONFIG.YEAR_IN_DURATION}ms ${CONFIG.TRANSITIONS.IN}, opacity ${CONFIG.YEAR_IN_DURATION}ms ${CONFIG.TRANSITIONS.IN}`;
          el.style.transform = 'translateY(0)';
          el.style.opacity = '1';
        }, (3 - index) * CONFIG.YEAR_DIGIT_DELAY);
      });
    };

    const label = this._yearDisplay.querySelector('.year-label');
    if (label) {
      label.style.transition = `opacity ${CONFIG.YEAR_OUT_DURATION}ms ease, transform ${CONFIG.YEAR_OUT_DURATION}ms ease`;
      label.style.opacity = '0';
      label.style.transform = 'translateY(-50%)';
      setTimeout(buildDigits, CONFIG.YEAR_OUT_DURATION);
    } else {
      buildDigits();
    }
  }

  _rollDigits(fromStr, toStr) {
    this._digits.forEach((el, index) => {
      if (fromStr[index] === toStr[index]) return; // Skip if digit didn't change
      
      setTimeout(() => {
        el.style.transition = `transform ${CONFIG.YEAR_OUT_DURATION}ms ${CONFIG.TRANSITIONS.OUT}, opacity ${CONFIG.YEAR_OUT_DURATION}ms ${CONFIG.TRANSITIONS.OUT}`;
        el.style.transform = 'translateY(-100%)';
        el.style.opacity = '0';
        
        setTimeout(() => {
          el.textContent = toStr[index];
          el.style.transition = 'none';
          el.style.transform = 'translateY(100%)';
          el.style.opacity = '0';
          
          void el.offsetWidth; // Force Reflow
          
          el.style.transition = `transform ${CONFIG.YEAR_IN_DURATION}ms ${CONFIG.TRANSITIONS.IN} .05s, opacity ${CONFIG.YEAR_IN_DURATION}ms ${CONFIG.TRANSITIONS.IN} .05s`;
          el.style.transform = 'translateY(0)';
          el.style.opacity = '1';
        }, CONFIG.YEAR_OUT_DURATION);
        
      }, (3 - index) * CONFIG.YEAR_DIGIT_DELAY);
    });
  }

  _showLabel() {
    if (this._digits.length !== 4) return;
    
    // Animate digits out
    this._digits.forEach((el, index) => {
      setTimeout(() => {
        el.style.transition = `transform ${CONFIG.YEAR_OUT_DURATION}ms ${CONFIG.TRANSITIONS.OUT}, opacity ${CONFIG.YEAR_OUT_DURATION}ms ${CONFIG.TRANSITIONS.OUT}`;
        el.style.transform = 'translateY(100%)';
        el.style.opacity = '0';
      }, index * CONFIG.YEAR_DIGIT_DELAY);
    });
    
    const totalDuration = (3 * CONFIG.YEAR_DIGIT_DELAY) + CONFIG.YEAR_OUT_DURATION;
    
    // Build and animate label in
    setTimeout(() => {
      this._yearDisplay.innerHTML = `<span class="year-label" style="opacity:0;transform:translateY(-50%);transition:opacity ${CONFIG.YEAR_IN_DURATION}ms ease, transform ${CONFIG.YEAR_IN_DURATION}ms ease">${escapeHtml(CONFIG.INITIAL_LABEL)}</span>`;
      this._digits = [];
      
      const label = this._yearDisplay.querySelector('.year-label');
      void label.offsetWidth; // Force Reflow
      label.style.opacity = '1';
      label.style.transform = 'translateY(0)';
    }, totalDuration);
  }

  // --- Render Loop (RAF) ---

  _startRenderLoop() {
    this._rafId = requestAnimationFrame(() => this._renderTick());
  }

  _stopRenderLoop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _renderTick() {
    if (this._smoothScroll.active) {
      const diff = this._smoothScroll.target - this._smoothScroll.current;
      this._smoothScroll.current += diff * 0.12;
      
      if (Math.abs(diff) < 0.4) {
        this._smoothScroll.current = this._smoothScroll.target;
        this._smoothScroll.active = false;
      }
      window.scrollTo(0, this._smoothScroll.current);
    }
    
    const scrollY = window.scrollY;
    if (scrollY !== this._lastScrollY) {
      this._lastScrollY = scrollY;
      this._processSections(scrollY);
    }
    
    this._startRenderLoop();
  }

  _initialSync() {
    const scrollY = window.scrollY;
    let initialYear = String(this._data[this._data.length - 1]?.year || this._data[0].year);
    let isAnySectionEntered = false;

    this._sections.forEach(section => {
      section.entered = scrollY >= section.top - 1;
      if (section.entered) {
        initialYear = section.year;
        isAnySectionEntered = true;
      }
    });

    this._currentYear = isAnySectionEntered ? initialYear : CONFIG.INITIAL_LABEL;
    if (isAnySectionEntered) this._setDigits(initialYear);

    this._processSections(scrollY, true);
  }

  _processSections(scrollY, isInitial = false) {
    const vh = window.innerHeight;

    for (let i = 0; i < this._sections.length; i++) {
      const section = this._sections[i];
      this._updateSectionVisuals(section, scrollY, vh);
      
      if (!isInitial) {
        this._handleSectionIntersection(section, scrollY, i);
      }
    }
  }

  _updateSectionVisuals(section, scrollY, vh) {
    // 1. Calculate Entry/Exit Easing
    const entryProgress = clamp((scrollY - (section.top - vh)) / vh, 0, 1);
    const easedEntry = Math.pow(entryProgress, CONFIG.ENTRY_POWER);
    
    const exitProgress = clamp((scrollY - (section.top + section.height - section.sectionHeight + vh * CONFIG.EXIT_START)) / (vh * CONFIG.EXIT_RANGE), 0, 1);
    const totalEasing = easedEntry * Math.pow(1 - exitProgress, CONFIG.EXIT_POWER);

    if (totalEasing !== section.lastEntry) {
      section.lastEntry = totalEasing;
      section.grid.style.transform = `scale(${(0.5 + 0.5 * totalEasing).toFixed(4)})`;
      section.grid.style.filter = `blur(${((1 - totalEasing) * 30).toFixed(2)}px)`;
      section.grid.style.opacity = totalEasing.toFixed(3);
    }

    // 2. Calculate Scrub Progress (Inner Timeline)
    const scrollableDistance = section.height - section.sectionHeight;
    const scrubProgress = scrollableDistance > 0 ? clamp((scrollY - section.top) / scrollableDistance, 0, 1) : 0;
    
    if (scrubProgress !== section.lastProgress) {
      section.lastProgress = scrubProgress;
      section.timeline.seek(scrubProgress * section.timeline.duration);
    }

    // 3. Render Media Items based on Scrub Progress
    const timelineTime = scrubProgress * section.timeline.duration;
    const mediaCount = section.mediaItems.length;
    
    for (let j = 0; j < mediaCount; j++) {
      this._renderMediaItem(section.mediaItems[j], timelineTime, mediaCount, j);
      const video = section.mediaItems[j].querySelector('video');
      if (video) {
        // Su mobile le sezioni non sono sticky: i media restano sempre visibili,
        // quindi il criterio basato sullo scrub non vale più. Si usa la posizione
        // reale dell'elemento nel viewport.
        const visible = this._isMobileLayout
          ? this._isInViewport(video, vh)
          : (totalEasing > .8 && timelineTime > section.mediaItems[j]._scrubStart + .08 && scrollY < section.top + section.height - section.sectionHeight);
        this._setVideoVisible(video, visible);
      }
    }
  }

  _isInViewport(el, vh) {
    const rect = el.getBoundingClientRect();
    return rect.top < vh * 0.85 && rect.bottom > vh * 0.15;
  }

  _renderMediaItem(item, timelineTime, totalItems, index) {
    const rawProgress = clamp((timelineTime - item._scrubStart) / item._scrubDur, 0, 1);
    const easing = easeOutPow2(rawProgress);
    
    item.style.transform = `translate(${item._offsetX}%, ${item._offsetY}%) rotate(${item._rot.toFixed(3)}deg) scale(${(0.8 + 0.2 * easing).toFixed(4)})`;
    item.style.filter = `blur(${((1 - easing) * 20).toFixed(2)}px)`;
    item.style.opacity = easing.toFixed(3);
    
    // Optimize z-index layering
    item.style.zIndex = String(easing > 0.01 ? totalItems + index : index);
  }

  _handleSectionIntersection(section, scrollY, currentIndex) {
    const hasEntered = scrollY >= section.top - 1;

    if (hasEntered && !section.entered) {
      section.entered = true;
      this._animateYearRoll(this._currentYear, section.year);
      this._currentYear = section.year;
    } else if (!hasEntered && section.entered) {
      section.entered = false;
      const prevYear = currentIndex > 0 ? this._sections[currentIndex - 1].year : CONFIG.INITIAL_LABEL;
      this._animateYearRoll(this._currentYear, prevYear);
      this._currentYear = prevYear;
    }
  }
}

customElements.define('mdv-timeline', MdvTimeline);