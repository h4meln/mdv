/* <mdv-socialbar> — barra icone social con effetto glitch 3D.
   Uso:
     <mdv-socialbar
        github="https://github.com/tuonome"
        instagram="https://instagram.com/tuonome"
        whatsapp="https://wa.me/39..."
        email="info@esempio.it"
     ></mdv-socialbar>

   Ogni attributo = una rete (il valore è l'URL).
   Un attributo senza valore mostra solo l'icona, non cliccabile.

   Opzioni globali:
     size="2.5"           → dimensione icona in rem (default 2.5)
     gap="1.5"            → spazio tra icone in rem (default 1.5)
     orientation="h|v"    → orizzontale o verticale (default h)
     align="left|center|right"
     red, blue            → colori del glitch

   Setter JS:
     el.links = [{ name:'github', href:'...' }, { svg:'<path .../>', href:'...' }];
*/
import { BaseElement } from '../shared/base-element.js';
import { sheet } from '../shared/styles.js';
import { SOCIALBAR_STYLES } from './socialbar.styles.js';
import { SOCIAL_ICONS, ALIASES, LABELS, NETWORKS } from './socialbar.icons.js';

const OPTIONS = ['size', 'gap', 'orientation', 'align', 'red', 'blue'];

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

function canon(name) {
  const n = String(name || '').toLowerCase();
  return ALIASES[n] || n;
}

class MdvSocialbar extends BaseElement {
  static get observedAttributes() {
    return [...NETWORKS, ...OPTIONS];
  }

  constructor() {
    super();
    this._linksOverride = null;
    this._built = false;
  }

  connectedCallback() {
    if (!this.shadowRoot.adoptedStyleSheets || !this.shadowRoot.adoptedStyleSheets.length) {
      this.shadowRoot.adoptedStyleSheets = [sheet(SOCIALBAR_STYLES)];
    }
    this._render();
    this._built = true;
  }

  attributeChangedCallback() {
    if (this.isConnected && this._built) this._render();
  }

  set links(list) {
    this._linksOverride = Array.isArray(list) ? list : null;
    if (this.isConnected && this._built) this._render();
  }
  get links() {
    if (this._linksOverride) return this._linksOverride.slice();
    return this._readLinks();
  }

  _readLinks() {
    const out = [];
    for (const net of NETWORKS) {
      if (!this.hasAttribute(net)) continue;
      const key = canon(net);
      const raw = this.getAttribute(net);
      const href = raw == null ? '' : raw.trim();
      out.push({ name: key, href });
    }
    return out;
  }

  _render() {
    const links = (this._linksOverride || this._readLinks())
      .map((l) => ({ ...l, name: canon(l.name) }))
      .filter((l) => l.svg || SOCIAL_ICONS[l.name]);

    const size   = this.getAttribute('size');
    const gap    = this.getAttribute('gap');
    const orient = (this.getAttribute('orientation') || 'h').toLowerCase();
    const align  = (this.getAttribute('align') || 'center').toLowerCase();
    const red    = this.getAttribute('red');
    const blue   = this.getAttribute('blue');

    const usedSymbols = new Set();
    const defs = links
      .filter((l) => !l.svg && SOCIAL_ICONS[l.name])
      .map((l) => {
        if (usedSymbols.has(l.name)) return '';
        usedSymbols.add(l.name);
        return `<g id="sb-i-${l.name}">${SOCIAL_ICONS[l.name]}</g>`;
      })
      .join('');

    const items = links.map((l) => this._renderItem(l)).join('');

    this.shadowRoot.innerHTML = `
      <svg class="sb-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>${defs}</defs>
      </svg>
      <div class="sb-root" role="list">${items}</div>`;

    const root = this.shadowRoot.querySelector('.sb-root');
    if (size) root.style.setProperty('--size', `${size}rem`);
    if (gap)  root.style.setProperty('--gap',  `${gap}rem`);
    if (red)  root.style.setProperty('--red',  red);
    if (blue) root.style.setProperty('--blue', blue);
    root.classList.toggle('sb-root--v', orient === 'v');
    root.classList.add(`sb-root--${align}`);

    /* Listener diretti item-per-item: indipendenti dalla delegazione
       e ricreati ad ogni render (i vecchi nodi vengono scartati). */
    root.querySelectorAll('.sb-item').forEach((item) => {
      const on  = () => item.classList.add('sb-item--active');
      const off = () => item.classList.remove('sb-item--active');
      item.addEventListener('mouseenter', on);
      item.addEventListener('mouseleave', off);
      item.addEventListener('focus',      on);
      item.addEventListener('blur',       off);
      item.addEventListener('pointerenter', on);
      item.addEventListener('pointerleave', off);
    });
  }

  _renderItem(l) {
    const label = l.label || LABELS[l.name] || l.name;
    const href = l.href
      ? (l.name === 'email' && !/^mailto:/i.test(l.href)
          ? `mailto:${l.href}`
          : l.href)
      : '';

    const inner = l.svg
      ? `<svg class="sb-layer sb-layer--r"    viewBox="0 0 24 24" aria-hidden="true">${l.svg}</svg>
         <svg class="sb-layer sb-layer--b"    viewBox="0 0 24 24" aria-hidden="true">${l.svg}</svg>
         <svg class="sb-layer sb-layer--main" viewBox="0 0 24 24" aria-hidden="true">${l.svg}</svg>`
      : `<svg class="sb-layer sb-layer--r"    viewBox="0 0 24 24" aria-hidden="true"><use href="#sb-i-${l.name}"/></svg>
         <svg class="sb-layer sb-layer--b"    viewBox="0 0 24 24" aria-hidden="true"><use href="#sb-i-${l.name}"/></svg>
         <svg class="sb-layer sb-layer--main" viewBox="0 0 24 24" aria-hidden="true"><use href="#sb-i-${l.name}"/></svg>`;

    const innerHTML = `<span class="sb-icon">${inner}</span>`;

    if (href) {
      const isExternal = !/^mailto:/i.test(href);
      const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a class="sb-item" role="listitem" href="${escapeHtml(href)}"${attrs}
                 aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${innerHTML}</a>`;
    }
    return `<span class="sb-item sb-item--static" role="listitem"
                 aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${innerHTML}</span>`;
  }
}

customElements.define('mdv-socialbar', MdvSocialbar);