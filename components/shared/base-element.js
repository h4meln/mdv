/* BaseElement — fondamenta comuni ai Web Components.
   _on()       listener con cleanup automatico
   _delegate() event delegation sul shadowRoot
   _emit()     evento custom che attraversa lo shadow DOM */
export class BaseElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._cleanups = [];
  }
  _on(target, type, handler, opts) {
    target.addEventListener(type, handler, opts);
    this._cleanups.push(() => target.removeEventListener(type, handler, opts));
  }
  _delegate(selector, handler) {
    const parts = selector.trim().split(/\s+/);
    const lastSel = parts[parts.length - 1];
    const ancestorSels = parts.slice(0, -1);

    this._on(this.shadowRoot, 'click', (e) => {
      let el = e.target;
      while (el && el !== this.shadowRoot) {
        if (typeof el.matches === 'function' && el.matches(lastSel)) {
          let ok = true, node = el;
          for (let i = ancestorSels.length - 1; i >= 0; i--) {
            node = node.parentElement;
            while (node && !node.matches(ancestorSels[i])) node = node.parentElement;
            if (!node) { ok = false; break; }
          }
          if (ok) { handler(e, el); return; }
        }
        el = el.parentElement;
      }
    });
  }
  _emit(name, detail, opts = {}) {
    this.dispatchEvent(new CustomEvent(name, {
      detail, bubbles: true, composed: true, ...opts,
    }));
  }
  _cleanup() {
    this._cleanups.forEach(fn => fn());
    this._cleanups.length = 0;
  }
}
