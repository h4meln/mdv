/* <mdv-toast> — toast "buona causa" in Shadow DOM. Icone SVG inline.
   Uso:
     <mdv-toast
        icon="heart"
        title="SALVA IL MONDO!"
        sub-title="Una piccola azione può fare la differenza"
        text="Dai un occhio ... al seguente {link} ..."
        link="https://www.google.it"
        link-label="link"
        pdf="public/Mondo delle uova Presentazione.pdf"
        pdf-label="Documento di buona causa"
        pdf-meta="PDF · Apri documento"
        delay="0.35"
     ></mdv-toast>

   L'attributo `icon` accetta:
     - una chiave del registry (heart, star, gift, sparkle, lightbulb, book, pdf, ...)
     - oppure una stringa SVG grezza (deve iniziare con "<svg")

   Metodi:
     el.close() → animazione di uscita + rimozione dal DOM
*/
import { BaseElement } from '../shared/base-element.js';
import { sheet } from '../shared/styles.js';
import { TOAST_STYLES } from './toast.styles.js';

/* ─────────────── ICON REGISTRY (SVG inline) ─────────────── */
const ICONS = {
  heart: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,

  star: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,

  sparkle: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 2 9.5 8.5 3 11l6.5 2.5L12 20l2.5-6.5L21 11l-6.5-2.5L12 2z"/></svg>`,

  gift: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,

  lightbulb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg>`,

  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,

  /* ── icone fisse del layout ── */
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12"/></svg>`,

  arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M13 5l7 7-7 7"/></svg>`,

  /* documento con dicitura PDF */
  pdf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><text x="12" y="17.5" text-anchor="middle" font-size="6.2" font-family="Arial, sans-serif" font-weight="700" fill="currentColor" stroke="none">PDF</text></svg>`,
};

/** Risolve un valore (chiave o SVG grezzo) in markup SVG. */
function resolveIcon(value, fallback = 'heart') {
  if (!value) return ICONS[fallback] ?? '';
  const v = String(value).trim();
  if (v.startsWith('<svg')) return v;            // SVG passato direttamente
  return ICONS[v] ?? ICONS[fallback] ?? '';
}

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

/* ─────────────── COMPONENT ─────────────── */
class MdvToast extends BaseElement {
  static get observedAttributes() {
    return [
      'icon', 'title', 'sub-title', 'text',
      'link', 'link-label',
      'pdf', 'pdf-label', 'pdf-meta',
      'delay', 'auto-close',
    ];
  }

  constructor() {
    super();
    this._built = false;
    this._autoCloseTimer = null;
    this._closing = false;
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [sheet(TOAST_STYLES)];
    this._render();
    this._built = true;
  }

  disconnectedCallback() {
    clearTimeout(this._autoCloseTimer);
  }

  attributeChangedCallback() {
    if (this.isConnected && this._built) this._render();
  }

  close() {
    if (this._closing) return;
    this._closing = true;

    const toast = this.shadowRoot.querySelector('.cause-toast');
    if (!toast) return this._finishClose();

    toast.classList.add('is-closing');
    toast.addEventListener('animationend', () => this._finishClose(), { once: true });
    // Fallback per prefers-reduced-motion (animation: none)
    setTimeout(() => this._finishClose(), 700);
  }

  _finishClose() {
    if (!this.isConnected) return;
    this.dispatchEvent(new CustomEvent('mdv-toast-close', {
      bubbles: true, composed: true,
    }));
    this.remove();
  }

  _render() {
    const icon      = resolveIcon(this.getAttribute('icon'), 'heart');
    const title     = this.getAttribute('title')      || 'Title';
    const subTitle  = this.getAttribute('sub-title')  || '';
    const textRaw   = this.getAttribute('text')       || '';
    const link      = this.getAttribute('link')       || '';
    const linkLabel = this.getAttribute('link-label') || 'link';
    const pdf       = this.getAttribute('pdf')        || '';
    const pdfLabel  = this.getAttribute('pdf-label')  || 'Document';
    const pdfMeta   = this.getAttribute('pdf-meta')   || 'Open';
    const delay     = parseFloat(this.getAttribute('delay') || '0.35');
    const autoClose = parseFloat(this.getAttribute('auto-close') || '0');

    // Testo con placeholder {link}
    let textHtml = escapeHtml(textRaw);
    if (link) {
      const a = `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkLabel)}</a>`;
      textHtml = textHtml.replace(/\{link\}/g, a);
    }

    const subTitleHtml = subTitle
      ? `<span class="cause-toast__eyebrow">${escapeHtml(subTitle)}</span>`
      : '';

    const pdfHtml = pdf
      ? `<a class="cause-toast__pdf" href="${escapeHtml(pdf)}" target="_blank" rel="noopener noreferrer">
           <span class="cause-toast__pdf-icon">${ICONS.pdf}</span>
           <span class="cause-toast__pdf-info">
             <strong>${escapeHtml(pdfLabel)}</strong>
             <small>${escapeHtml(pdfMeta)}</small>
           </span>
           <span class="cause-toast__arrow">${ICONS.arrowRight}</span>
         </a>`
      : '';

    this.shadowRoot.innerHTML = `
      <aside class="cause-toast" role="status" aria-live="polite" aria-label="${escapeHtml(title)}">
        <button class="cause-toast__close" type="button" aria-label="Chiudi">
          ${ICONS.close}
        </button>
        <div class="cause-toast__glow"></div>
        <div class="cause-toast__header">
          <span class="cause-toast__badge">${icon}</span>
          <div>
            <h2>${escapeHtml(title)}</h2>
            ${subTitleHtml}
          </div>
        </div>
        <p class="cause-toast__text">${textHtml}</p>
        ${pdfHtml}
      </aside>`;

    const toast = this.shadowRoot.querySelector('.cause-toast');
    toast.style.animationDelay = `${delay}s`;

    this.shadowRoot
      .querySelector('.cause-toast__close')
      .addEventListener('click', () => this.close());

    clearTimeout(this._autoCloseTimer);
    if (autoClose > 0) {
      this._autoCloseTimer = setTimeout(() => this.close(), autoClose * 1000);
    }
  }
}

customElements.define('mdv-toast', MdvToast);

export { ICONS };