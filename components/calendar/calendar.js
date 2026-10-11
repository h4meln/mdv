/* <mdv-calendar> — Web Component Custom Element */
import { BaseElement } from '../shared/base-element.js';
import { sheet } from '../shared/styles.js';
import { ymd, parseYmd } from '../shared/date-utils.js';
import { getEvents } from '../shared/events-store.js';
import { CATEGORIES } from './calendar.constants.js';
import { CALENDAR_STYLES } from './calendar.styles.js';
import * as views from './calendar.views.js';

const TEAR_DURATION = 480;
const WHEEL_COOLDOWN = 240;
const SCROLLABLE_SEL = '.cal-cell-events, .cal-agenda-view, .cal-week-events, .cal-modal-body, .cal-agenda-list-inner, .cal-strip-list';
const RING_COUNT = 8;

class MdvCalendar extends BaseElement {
  constructor() {
    super();
    this._view = 'month';
    this._events = [];
    this._byDate = {};
    this._today = new Date();
    this._cursor = new Date();
    this._selected = new Date();
    this._modalDate = null;
    this._mounted = false;
    this._stripScroll = 0;
    this._navLocked = false;
    this._navTimer = null;
    this._lastWheelNav = 0;

    this._keyHandler = (e) => {
      if (!this.isConnected) return;
      if (e.key === 'Escape' && this._modalDate) { this._closeModal(); return; }
      if (this._modalDate) return;
      if (e.key === 'ArrowLeft')  this._navigate(-1);
      if (e.key === 'ArrowRight') this._navigate(1);
    };
    this._wheelHandler = (e) => this._onWheelGlobal(e);
  }

  async connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [sheet(CALENDAR_STYLES)];
    this._events = await getEvents();
    this._indexEvents();
    this._initDates();
    this._buildShell();
    this._wireEvents();
    this._updateAll();
    requestAnimationFrame(() => this._centerStrip(false));
  }

  disconnectedCallback() {
    window.removeEventListener('wheel', this._wheelHandler);
    if (this._navTimer) { clearTimeout(this._navTimer); this._navTimer = null; }
    if (typeof super.disconnectedCallback === 'function') {
      super.disconnectedCallback();
    }
  }

  set events(list) {
    this._events = Array.isArray(list) ? list : [];
    this._indexEvents();
    this._initDates();
    if (this._mounted) this._updateAll();
  }
  get events() { return this._events; }

  _indexEvents() {
    this._byDate = {};
    for (const ev of this._events) {
      if (ev && ev.date) {
        (this._byDate[ev.date] ||= []).push(ev);
      }
    }
    Object.values(this._byDate).forEach(list =>
      list.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')));
  }

  _initDates() {
    const realToday = new Date();
    this._today = realToday;
    this._cursor = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate());
    this._selected = new Date(this._cursor);
  }

  _eventsOn(date) { return this._byDate[ymd(date)] || []; }
  
  _catOf(ev) { return CATEGORIES[ev.category] || CATEGORIES.meeting; }

  _badgeClass(events) {
    if (events.some(e => e.category === 'critical')) return 'r';
    if (events.some(e => e.category === 'deadline')) return 'a';
    return 'g';
  }

  _weekDays() {
    const c = this._cursor;
    const dayOfWeek = c.getDay(); // 0: Dom, 1: Lun...
    const start = new Date(c.getFullYear(), c.getMonth(), c.getDate() - dayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }

  _ringsHTML() {
    return Array.from({ length: RING_COUNT }, (_, i) => {
      const x = ((i + 0.5) / RING_COUNT) * 100;
      return `<div class="cal-ring" style="left:${x}%"></div>`;
    }).join('');
  }

  _holesZoneHTML() {
    return `<div class="cal-holes-zone"></div>`;
  }

  _buildShell() {
    this.shadowRoot.innerHTML = `
      <div class="cal-shell">
        <div class="cal-toolbar-slot"></div>
        <div class="cal-strip-slot"></div>
        <div class="cal-body">
          <div class="cal-panel-stack">
            <div class="cal-panel-behind">
              ${this._holesZoneHTML()}
              <div class="cal-content-slot behind-slot"></div>
            </div>
            <div class="cal-panel-front">
              ${this._holesZoneHTML()}
              <div class="cal-content-slot front-slot"></div>
            </div>
            <div class="cal-rings">${this._ringsHTML()}</div>
          </div>
          <div class="cal-sidebar-slot"></div>
        </div>
      </div>
      <div class="cal-modal-slot"></div>`;

    this._toolbarSlot   = this.shadowRoot.querySelector('.cal-toolbar-slot');
    this._stripSlot     = this.shadowRoot.querySelector('.cal-strip-slot');
    this._behindSlot    = this.shadowRoot.querySelector('.cal-panel-behind');
    this._frontSlot     = this.shadowRoot.querySelector('.cal-panel-front');
    this._frontContent  = this.shadowRoot.querySelector('.front-slot');
    this._behindContent = this.shadowRoot.querySelector('.behind-slot');
    this._sidebarSlot   = this.shadowRoot.querySelector('.cal-sidebar-slot');
    this._modalSlot     = this.shadowRoot.querySelector('.cal-modal-slot');
    this._mounted = true;
  }

  _wireEvents() {
    this._delegate('[data-action]', (e, el) => this._handleAction(e, el));
    this._delegate('[data-date]', (e, el) => {
      if (el.closest('.cal-modal')) return;
      const targetDate = parseYmd(el.dataset.date);
      this._selected = targetDate;
      this._openModal(targetDate);
    });

    this._on(document, 'keydown', this._keyHandler);
    window.addEventListener('wheel', this._wheelHandler, { passive: false });

    let touchStartX = 0, touchStartY = 0, touchActive = false;
    this._on(this.shadowRoot, 'touchstart', (e) => {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchActive = true;
    }, { passive: true });

    this._on(this.shadowRoot, 'touchend', (e) => {
      if (!touchActive) return;
      touchActive = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
      this._navigate(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  _onWheelGlobal(e) {
    const path = e.composedPath ? e.composedPath() : [];
    if (!path.includes(this)) return;
    if (e.ctrlKey) return;

    const target = e.target;
    if (!target || typeof target.closest !== 'function') return;

    if (target.closest('.cal-modal')) return;
    if (!target.closest('.cal-panel-stack')) return;
    if (target.closest(SCROLLABLE_SEL)) return;
    if (this._view === 'agenda') return;

    e.preventDefault();

    const now = performance.now();
    if (now - this._lastWheelNav < WHEEL_COOLDOWN) return;

    const dy = e.deltaY;
    if (Math.abs(dy) < 2) return;
    this._lastWheelNav = now;
    this._navigate(dy > 0 ? 1 : -1);
  }

  _updateAll() {
    this._updateToolbar();
    this._updateStrip();
    this._setFront(this._viewHTML());
    this._updateSidebar();
    this._updateModal();
  }

  _updateToolbar() {
    this._toolbarSlot.innerHTML = views.renderToolbar(this);
  }

  _updateStrip() {
    const oldList = this._stripSlot.querySelector('.cal-strip-list');
    const savedScroll = oldList ? oldList.scrollLeft : this._stripScroll;
    this._stripSlot.innerHTML = views.renderStrip(this);
    const newList = this._stripSlot.querySelector('.cal-strip-list');
    if (newList) newList.scrollLeft = savedScroll;
  }

  _viewHTML() {
    return (
      this._view === 'month' ? views.renderMonth(this) :
      this._view === 'week'  ? views.renderWeek(this)  :
                               views.renderAgenda(this)
    );
  }

  _setFront(html) {
    this._frontContent.innerHTML = html;
    this._behindContent.innerHTML = '';
    this._frontSlot.classList.remove('cal-panel--tearing', 'cal-panel--enter');
  }

  _updateSidebar() {
    this._sidebarSlot.innerHTML = views.renderSidebar(this);
  }

  _updateModal() {
    this._modalSlot.innerHTML = views.renderModal(this);
  }

  _handleAction(e, el) {
    const a = el.dataset.action;
    if (a === 'view')         { e.stopPropagation(); this._setView(el.dataset.view); }
    else if (a === 'prev')    { e.stopPropagation(); this._navigate(-1); }
    else if (a === 'next')    { e.stopPropagation(); this._navigate(1); }
    else if (a === 'today')   {
      e.stopPropagation();
      if (el.hasAttribute('data-disabled')) return;
      this._goToday();
    }
    else if (a === 'close-modal') this._closeModal();
    else if (a === 'modal-bg') { if (e.target === el) this._closeModal(); }
  }

  _finishPending() {
    if (!this._navLocked) return;
    if (this._navTimer) { clearTimeout(this._navTimer); this._navTimer = null; }
    this._frontSlot.classList.remove('cal-panel--tearing');
    this._frontContent.innerHTML = this._behindContent.innerHTML;
    this._behindContent.innerHTML = '';
    this._navLocked = false;
  }

  _setView(v) {
    if (v === this._view) return;
    this._view = v;
    this._animateAndUpdate();
  }

  _navigate(dir) {
    this._finishPending();

    const c = this._cursor;
    if (this._view === 'week') {
      this._cursor = new Date(c.getFullYear(), c.getMonth(), c.getDate() + 7 * dir);
    } else if (this._view === 'agenda') {
      return;
    } else {
      this._cursor = new Date(c.getFullYear(), c.getMonth() + dir, 1);
    }
    this._animateAndUpdate();
  }

  _goToday() {
    const t = new Date();
    this._cursor = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    this._selected = new Date(this._cursor);
    this._animateAndUpdate();
  }

  _animateAndUpdate() {
    this._finishPending();

    const nextHtml = this._viewHTML();
    const useTear = (this._view === 'month' || this._view === 'week');

    if (!useTear) {
      this._updateToolbar();
      this._updateStrip();
      this._frontContent.innerHTML = nextHtml;
      this._behindContent.innerHTML = '';
      this._frontSlot.classList.remove('cal-panel--tearing');
      this._frontSlot.classList.add('cal-panel--enter');
      this._frontSlot.addEventListener('animationend', () => {
        this._frontSlot.classList.remove('cal-panel--enter');
      }, { once: true });
      this._updateSidebar();
      requestAnimationFrame(() => this._centerStrip(false));
      return;
    }

    this._navLocked = true;
    this._behindContent.innerHTML = nextHtml;
    this._frontSlot.classList.add('cal-panel--tearing');

    this._navTimer = setTimeout(() => {
      this._navTimer = null;
      this._frontSlot.classList.remove('cal-panel--tearing');
      this._frontContent.innerHTML = this._behindContent.innerHTML;
      this._behindContent.innerHTML = '';
      this._updateToolbar();
      this._updateStrip();
      this._updateSidebar();
      this._navLocked = false;
      requestAnimationFrame(() => this._centerStrip(false));
    }, TEAR_DURATION);
  }

  _openModal(date) {
    this._selected = date;
    this._modalDate = date;
    this._updateModal();
    this._updateStrip();
    this._updateSidebar();
    requestAnimationFrame(() => this._centerStrip(true));
  }

  _closeModal() {
    this._modalDate = null;
    this._updateModal();
    this._updateStrip();
    this._updateSidebar();
  }

  _centerStrip(smooth = true) {
    const strip = this.shadowRoot.querySelector('.cal-strip-list');
    if (!strip) return;
    const target = strip.querySelector('.cal-strip-day.selected, .cal-strip-day.today');
    if (!target) return;
    const targetCenter = target.offsetLeft + target.offsetWidth / 2;
    const left = targetCenter - strip.clientWidth / 2;
    if (smooth) strip.scrollTo({ left, behavior: 'smooth' });
    else strip.scrollLeft = left;
    this._stripScroll = left;
  }
}

customElements.define('mdv-calendar', MdvCalendar);