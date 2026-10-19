import { BaseElement } from '../shared/base-element.js';
import { sheet } from '../shared/styles.js';
const rooms = {
  red: { name: 'Sala Rossa', size: 'Circa 40 m²', photos: [
    ['0','Mixer, impianto audio e amplificatori'], ['5','Mixer'], ['3','Casse passive da 500 Watt RMS'],
    ['2','Batteria Mapex con aste e charleston'], ['9','Batteria Mapex'], ['6','Amplificatore basso Markbass: testa e cassa'],
    ['1','Amplificatore chitarra Marshall: testa e cassa'], ['4','Amplificatore chitarra Crate: testa e cassa'], ['15','Pianoforte'], ['14','Divano rosso'] ] },
  blue: { name: 'Sala Blu', size: 'Circa 25 m²', photos: [
    ['13','Mixer, impianto audio e amplificatori'], ['00','Mixer'], ['7','Casse da 500 Watt RMS'], ['8','Microfoni'],
    ['16','Batteria Mapex con aste e charleston'], ['17','Batteria Mapex'], ['11','Amplificatore basso Markbass: testa e cassa'],
    ['10','Amplificatore chitarra Marshall combo'], ['12','Amplificatore chitarra Stinger: testa e cassa'] ] }
};
const styles = `
:host { display:block; width:100%; height:100%; color:#f5ead8; font-family:Manrope,sans-serif; }
* { box-sizing:border-box; }
.room { height:100%; display:flex; flex-direction:column; padding:28px 28px 170px; gap:18px; background:radial-gradient(ellipse at top left,#492723,transparent 65%),#191817; }
.room[data-room=blue] { background:radial-gradient(ellipse at top left,#243c56,transparent 65%),#191817; }
header { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
h1 { margin:0 0 4px; font:36px/1.1 'Amatic SC',cursive; } header p { margin:0; font-size:13px; color:#d4c6b8; }
.switch { display:flex; gap:6px; border:1px solid #ffffff30; border-radius:30px; padding:4px; }
button { font:600 13px Manrope,sans-serif; color:inherit; cursor:pointer; border:1px solid #ffffff30; background:#292522; min-height:44px; border-radius:24px; padding:8px 16px; }
.switch button { border:0; background:transparent; }
.switch button[aria-pressed=true] { background:#b84b35; color:white; }
[data-room=blue] .switch button[aria-pressed=true] { background:#36658c; }
figure { margin:0; flex:1; min-height:0; display:flex; flex-direction:column; gap:12px; }
.photo { flex:1; min-height:160px; position:relative; background:#100f0e; border:1px solid #ffffff22; border-radius:16px; overflow:hidden; display:grid; place-items:center; }
.photo img { display:block; width:100%; height:100%; position:absolute; object-fit:contain; }
.photo.is-loading img { opacity:.25; }
.photo.is-loading::after { content:'Caricamento foto…'; z-index:1; background:#191817dd; padding:12px; border-radius:10px; }
figcaption { min-height:44px; font-size:14px; line-height:1.5; display:flex; gap:12px; justify-content:space-between; }
.counter { white-space:nowrap; color:#c4b8a8; }
.controls { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.thumbs { display:flex; overflow-x:auto; gap:8px; padding:4px 0; }
.thumbs button { padding:3px; min-width:64px; width:64px; height:52px; border-radius:8px; opacity:.6; }
.thumbs button[aria-current=true] { border:2px solid #ffc98a; opacity:1; }
.thumbs img { width:100%; height:100%; object-fit:cover; border-radius:4px; }
button:focus-visible { outline:2px solid #ffc98a; outline-offset:2px; }
@media(max-width:980px) { .room { padding:20px; } }
@media(max-width:400px) { .room { padding:16px; gap:12px; } h1 { font-size:30px; } .switch button { padding:8px 12px; } }

:host { font-family:'Amatic SC',cursive; }
.room,.room[data-room=blue] { padding:0; gap:0; position:relative; background:#101017; }
header { position:absolute; inset:0 0 auto; z-index:3; display:grid; grid-template-columns:1fr auto 1fr; padding:22px; gap:12px; background:linear-gradient(#090a12d9,transparent); }
header h1 { font-size:38px; } header p { font:20px 'Amatic SC',cursive; color:#eee; }
.switch { justify-self:end; border:0; background:#10101799; }
.switch button { font:700 24px 'Amatic SC',cursive; padding:6px 12px; }
.switch button[aria-pressed=true] { background:#b42c44; }
[data-room=blue] .switch button[aria-pressed=true] { background:#2b5da6; }
figure { display:block; height:100%; }
.photo {
    position:absolute; top:96px; bottom:190px; left:50%;
    transform:translateX(-50%);
    aspect-ratio: 3 / 4;
    max-width: calc(100% - 160px);
    background: var(--card-glass, rgba(255,255,255,.035));
    border:1px solid rgba(255,255,255,.10);
    border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 15px 35px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05);
    overflow:hidden; display:grid; place-items:center;
}
.photo img { width:100%; height:100%; object-fit:cover; position:absolute; inset:0; }
figcaption { position:absolute; bottom:172px; left:110px; right:110px; padding:6px 0; z-index:3; display:flex; gap:10px; align-items:center; justify-content:center; text-align:center; font:24px/1.25 'Amatic SC',cursive; color:#f5ead8; text-shadow:0 2px 8px #000; } figcaption .counter { font-size:.85em; opacity:.85; }
.controls { position:absolute; inset:50% 24px auto; transform:translateY(-50%); display:flex; justify-content:space-between; pointer-events:none; z-index:4; }
.controls button { pointer-events:auto; width:44px; height:44px; padding:0; font:24px/1 'Amatic SC',cursive; color:#fff; cursor:pointer;
    background:rgba(255,255,255,.05); border:1px solid rgba(245,234,216,.16); border-radius:50%;
    display:flex; align-items:center; justify-content:center; transition:all .15s; }
.controls button:hover { background:rgba(232,100,60,.2); border-color:rgba(232,100,60,.5); }
.thumbs { overflow:visible; gap:0; align-items:center; justify-content:center; max-width:180px; flex-wrap:wrap; }
.thumbs button { min-width:16px; width:16px; height:24px; min-height:24px; padding:5px; border:0; background:transparent; opacity:.55; }
.thumbs button span { display:block; width:6px; height:6px; border-radius:50%; background:white; }
.thumbs button[aria-current=true] { border:0; opacity:1; } .thumbs button[aria-current=true] span { transform:scale(1.6); }
.photo::before { content:''; position:absolute; z-index:1; inset:55% 0 0; background:linear-gradient(transparent,#080910b0); pointer-events:none; }
@media(max-width:980px) { .photo { top:86px; bottom:168px; max-width: calc(100% - 70px); } header { padding:18px 14px; gap:6px; } header h1 { font-size:28px; } header p { font-size:18px; } .switch button { font-size:21px; padding:6px 9px; } .thumbs { max-width:92px; } figcaption { bottom:14px; font-size:23px; } }
.lightbox {
    border: 0; padding: 0; margin: 0;
    width: 100vw; height: 100vh; max-width: none; max-height: none;
    background: transparent; color: inherit; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
}
.lightbox:not([open]) { display: none; }
.lightbox { overscroll-behavior: contain; }
.lightbox::backdrop {
    background: rgba(6, 7, 12, .95);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
}
.lightbox img {
    max-width: 96vw; max-height: 92vh;
    width: auto; height: auto;
    object-fit: contain;
    border-radius: 10px;
    box-shadow: 0 30px 90px rgba(0,0,0,.7);
}
.lightbox-close {
    position: fixed; top: 18px; right: 22px; z-index: 2;
    width: 30px; height: 30px; padding: 0; display: grid; place-items: center;
    color: rgba(255,255,255,.76); cursor: pointer;
    border: 1px solid rgba(255,255,255,.12); border-radius: 50%;
    background: rgba(255,255,255,.07);
    transition: transform .2s ease, background .2s ease, color .2s ease;
}
.lightbox-close:hover {
    color: #fff; background: rgba(255,255,255,.16); transform: rotate(90deg);
}
.lightbox-close svg { width: 13px; height: 13px; display: block; }
.photo { cursor: zoom-in; }

`;
class MdvRoomGallery extends BaseElement {
  constructor() { super(); this.room = 'red'; this.index = 0; this._autoTimer = null; this._autoplay = true; }
  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [sheet(styles)];
    this.shadowRoot.innerHTML = `<section class="room" aria-label="Foto delle sale prove"><header><div><h1></h1><p></p></div><div class="thumbs" aria-label="Scegli una foto"></div><div class="switch" aria-label="Scegli la sala"><button data-room="red">Rossa</button><button data-room="blue">Blu</button></div></header><figure><div class="photo"><img alt=""></div><figcaption aria-live="polite"><span class="caption"></span><span class="counter"></span></figcaption></figure><div class="controls"><button class="nav-btn" data-step="-1" aria-label="Foto precedente">‹</button><button class="nav-btn" data-step="1" aria-label="Foto successiva">›</button></div></section><dialog class="lightbox"><button class="lightbox-close" aria-label="Chiudi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12"/></svg></button><img alt=""></dialog>`;
    const _lb = this.shadowRoot.querySelector('.lightbox');
    const _lbImg = _lb.querySelector('img');
    const _closeLb = () => { if (_lb.open) _lb.close(); };
    this._on(_lb, 'click', e => {
      if (e.target === _lb || e.target.closest('.lightbox-close')) _closeLb();
    });
    this._on(_lb, 'close', () => { document.body.style.overflow = ''; });
    this._on(this.shadowRoot, 'click', e => {
      const _ph = e.target.closest('.photo');
      if (!_ph) return;
      const _im = _ph.querySelector('img');
      if (!_im || !_im.src) return;
      _lbImg.src = _im.src;
      _lb.showModal();
      document.body.style.overflow = 'hidden';
    });
    this._on(this.shadowRoot, 'keydown', e => {
      if (e.key === 'Escape' && _lb.open) _closeLb();
    });
this._on(this.shadowRoot,'click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.room) { this.room=b.dataset.room; this.index=0; this.updateRoom(); this._resetAuto(); }
      else { this._resetAuto(); this.index = b.dataset.index !== undefined ? Number(b.dataset.index) : (this.index + Number(b.dataset.step) + rooms[this.room].photos.length) % rooms[this.room].photos.length; this.updatePhoto(); }
    });
    this._on(this.shadowRoot,'keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); this._resetAuto(); this.index=(this.index+(e.key==='ArrowLeft'?-1:1)+rooms[this.room].photos.length)%rooms[this.room].photos.length; this.updatePhoto();
    });
    const root = this.shadowRoot.querySelector('.room');
    this._on(root,'mouseenter',()=>this._pauseAuto());
    this._on(root,'mouseleave',()=>this._startAuto());
    this._on(root,'focusin',()=>this._pauseAuto());
    this._on(root,'focusout',()=>this._startAuto());
    const img=this.shadowRoot.querySelector('.photo img');
    this._on(img,'load',()=>this.shadowRoot.querySelector('.photo').classList.remove('is-loading'));
    this._on(img,'error',()=>{ this.shadowRoot.querySelector('.photo').classList.remove('is-loading'); this.shadowRoot.querySelector('.caption').textContent='Foto non disponibile. Prova con la successiva.'; });
    this.updateRoom();
  }
  disconnectedCallback() {
    this._pauseAuto();
    super.disconnectedCallback && super.disconnectedCallback();
    this._cleanup && this._cleanup();
  }

  updateRoom() {
    const r=rooms[this.room], s=this.shadowRoot;
    s.querySelector('.room').dataset.room=this.room;
    s.querySelector('h1').textContent=r.name; s.querySelector('header p').textContent=r.size;
    s.querySelectorAll('[data-room]').forEach(b=>{ if(b.tagName==='BUTTON') b.setAttribute('aria-pressed',String(b.dataset.room===this.room)); });
    s.querySelector('.thumbs').innerHTML=r.photos.map(([id,alt],i)=>`<button data-index="${i}" aria-label="${alt}"><span aria-hidden="true"></span></button>`).join('');
    this.updatePhoto();
    this._startAuto();
  }

  _startAuto() {
    this._pauseAuto();
    if (!this._autoplay) return;
    this._autoTimer = setInterval(() => {
      const total = rooms[this.room].photos.length;
      this.index = (this.index + 1) % total;
      this.updatePhoto();
    }, 3800);
  }

  _pauseAuto() { clearInterval(this._autoTimer); this._autoTimer = null; }

  _resetAuto() { this._startAuto(); }
  updatePhoto() {
    const r=rooms[this.room], [id,alt]=r.photos[this.index], s=this.shadowRoot;
    s.querySelector('.photo').classList.add('is-loading');
    const img=s.querySelector('.photo img'); img.alt=`${r.name} — ${alt}`; img.src=`public/img/sala_prove/${id}.png`;
    img.loading = this.index === 0 ? 'eager' : 'lazy';
    img.decoding = 'async';
    if(img.complete && img.naturalWidth) s.querySelector('.photo').classList.remove('is-loading');
    s.querySelector('.caption').textContent=alt; s.querySelector('.counter').textContent=`${this.index+1} / ${r.photos.length}`;
    s.querySelectorAll('[data-index]').forEach(b=>b.setAttribute('aria-current',String(Number(b.dataset.index)===this.index)));
  }
}
customElements.define('mdv-room-gallery',MdvRoomGallery);
