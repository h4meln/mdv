/* <mdv-eggbar active="home"> — barra di navigazione SVG con indicatore a uovo. */
import { BaseElement } from '../shared/base-element.js';
import { sheet } from '../shared/styles.js';
import { ICONS, NAV_ITEMS } from './eggbar.icons.js';
import { NAVBAR_STYLES } from './eggbar.styles.js';
import {
  ITEM_W, UL_X,
  EGG_W, EGG_TOP_R, EGG_BOT_R, EGG_TOP, EGG_BOT,
  HOLE_W, HOLE_TOP_R, HOLE_BOT_R, HOLE_TOP, HOLE_BOT,
  eggPath, filletLeft, filletRight,
} from './eggbar.geometry.js';

const NAV_DELAY = 620;

class MdvEggBar extends BaseElement {
  static get observedAttributes() { return ['active']; }

  constructor() {
    super();
    this._ready = false;
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [sheet(NAVBAR_STYLES)];

    const itemsHtml = NAV_ITEMS.map(it => `
      <li data-id="${it.id}">
        <a href="${it.href}" data-id="${it.id}" style="--icon: url('${ICONS[it.id]}')">
          <span class="navbar-icon"></span>
          <span class="navbar-label">${it.label}</span>
        </a>
      </li>`).join('');

    this.shadowRoot.innerHTML = `
      <svg class="navbar-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="navbar-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="520" height="150">
            <rect x="0" y="0" width="520" height="150" fill="white"/>
            <g id="navbar-mask-group">
              <path id="navbar-mask-hole" fill="black"/>
              <path id="navbar-mask-fl"   fill="black"/>
              <path id="navbar-mask-fr"   fill="black"/>
            </g>
          </mask>
        </defs>
        <rect id="navbar-bg" x="0" y="80" width="520" height="70" rx="15" mask="url(#navbar-mask)"/>
        <g id="navbar-indicator-group"><path id="navbar-indicator"/></g>
      </svg>
      <ul class="navbar-items">${itemsHtml}</ul>`;

    const $ = id => this.shadowRoot.getElementById(id);
    const BASE_CX = UL_X + ITEM_W * 0.5;

    $('navbar-indicator').setAttribute('d',
      eggPath(BASE_CX, EGG_W, EGG_TOP_R, EGG_BOT_R, EGG_TOP, EGG_BOT));
    $('navbar-mask-hole').setAttribute('d',
      eggPath(BASE_CX, HOLE_W, HOLE_TOP_R, HOLE_BOT_R, HOLE_TOP, HOLE_BOT));
    $('navbar-mask-fl').setAttribute('d', filletLeft(BASE_CX));
    $('navbar-mask-fr').setAttribute('d', filletRight(BASE_CX));

    this._indicatorGroup = $('navbar-indicator-group');
    this._maskGroup      = $('navbar-mask-group');
    this._items = [...this.shadowRoot.querySelectorAll('.navbar-items li')];
    this._ids = NAV_ITEMS.map(it => it.id);

    // 1) Posiziona l'uovo SENZA transition (host ancora visibility:hidden)
    this._applyActive(this.getAttribute('active') || this._ids[0]);

    // 2) Attiva transition + rendi visibile l'host
    requestAnimationFrame(() => {
      this._ready = true;
      this.setAttribute('data-ready', '');
    });

    this._on(this.shadowRoot, 'click', (e) => {
      const a = e.target.closest?.('.navbar-items a');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();

      const id = a.dataset.id;
      const href = a.getAttribute('href');

      this._applyActive(id);

      const ev = new CustomEvent('navbar-click', {
        detail: { id, href }, bubbles: true, composed: true, cancelable: true,
      });
      const proceed = this.dispatchEvent(ev);
      if (!proceed) return;

      if (href && href !== '#') {
        setTimeout(() => { window.location.href = href; }, NAV_DELAY);
      }
    });
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this._ready) return; // ignora i cambi durante il primo render
    if (name === 'active' && oldV !== newV && this._indicatorGroup) {
      this._applyActive(newV);
    }
  }

  _applyActive(id) {
    const index = this._ids.indexOf(id);
    if (index < 0) return;
    const dx = index * ITEM_W;
    this._indicatorGroup.style.transform = `translate(${dx}px, 0)`;
    this._maskGroup.style.transform      = `translate(${dx}px, 0)`;
    this._items.forEach((li, i) => li.classList.toggle('active', i === index));
  }

  setActive(id) { this.setAttribute('active', id); }
  get active() { return this.getAttribute('active'); }
}

customElements.define('mdv-eggbar', MdvEggBar);