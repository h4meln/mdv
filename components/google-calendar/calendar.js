/* <mdv-google-calendar> — calendario settimanale delle sale prova.
─────────────────────────────────────────────────────────────
Legge i feed pubblici ICS di Google Calendar, li parsa e
disegna una griglia custom (niente iframe → niente sfondo
bianco, niente slot fantasma al cambio settimana).

Attributi:
    sources       URL ICS separati da virgola (uno per sorgente)
    start-hour    prima ora visibile (default: 20)
    end-hour      ultima ora visibile  (default: 24)
    days          giorni da mostrare, 1=lun … 7=dom  (default: 1,2,3,4,5)
    hour-height   altezza riga-ora in px (default: 52)
    refetch-min   minuti tra refetch automatici (default: 5, 0 = off)

Eventi emessi:
    event-click   detail: { id, title, start, end, color, location }
───────────────────────────────────────────────────────────── */

import { BaseElement } from '../shared/base-element.js';
import { sheet } from '../shared/styles.js';

const COLORS = ['#D50000', '#3F51B5', '#009688', '#FF9800', '#9C27B0'];
const CACHE_TTL_MS = 5 * 60 * 1000;

const STYLES = `
    :host {
    --gutter-w: 56px;
    --head-h: 56px;
    --hour-h: 52px;
    display: block;
    font-family: 'Manrope', system-ui, sans-serif;
    color: #cfc4b2;
    background: #1a1614;
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 30px 70px -25px rgba(0,0,0,.8);
    }

    .wrap { display: flex; flex-direction: column; }

    /* ── barra di navigazione settimana ── */
    .nav {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 16px;
    background: #161311;
    border-bottom: 1px solid rgba(255,255,255,.06);
    font-size: .85rem;
    }
    .nav strong {
    font-family: 'Fraunces', serif; font-weight: 400;
    font-size: 1.05rem; color: #f5ead8; letter-spacing: .01em;
    }
    .nav button {
    appearance: none; background: transparent;
    border: 1px solid rgba(255,255,255,.15);
    color: #cfc4b2; border-radius: 8px;
    padding: 6px 12px; cursor: pointer; font: inherit;
    transition: border-color .2s, color .2s;
    }
    .nav button:hover { border-color: #ffbe8a; color: #ffbe8a; }

    /* ── griglia ── */
    .grid { display: grid; /* grid-template-columns impostato inline */ }

    /* riga intestazioni giorni */
    .head {
    height: var(--head-h);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 2px;
    font-size: .7rem; letter-spacing: .14em; text-transform: uppercase;
    color: #8f8271; background: #161311;
    border-right: 1px solid rgba(255,255,255,.05);
    border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .head.corner { border-right-color: rgba(255,255,255,.08); }
    .head .dnum {
    font-family: 'Fraunces', serif; font-weight: 400;
    font-size: 1.05rem; color: #f5ead8;
    letter-spacing: 0; text-transform: none;
    }

    /* colonna etichette ore */
    .gutter {
    display: flex; flex-direction: column;
    border-right: 1px solid rgba(255,255,255,.05);
    background: #161311;
    }
    .hour-label {
    height: var(--hour-h);
    display: flex; align-items: flex-start; justify-content: flex-end;
    padding: 4px 8px 0 0;
    font-size: .7rem; color: #8f8271;
    }

    /* colonne giorni (contengono gli eventi in absolute) */
    .day-col {
    position: relative;
    border-right: 1px solid rgba(255,255,255,.05);
    background: #1a1614;
    background-image: repeating-linear-gradient(
        to bottom,
        transparent 0,
        transparent calc(var(--hour-h) - 1px),
        rgba(255,255,255,.05) calc(var(--hour-h) - 1px),
        rgba(255,255,255,.05) var(--hour-h)
    );
    }
    .day-col:last-child { border-right: none; }

    /* evento */
    .ev {
    position: absolute; left: 4px; right: 4px;
    border-radius: 8px; padding: 5px 8px;
    font-size: .74rem; font-weight: 600; line-height: 1.2;
    color: #fff; cursor: pointer;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0,0,0,.3);
    transition: filter .15s;
    }
    .ev:hover { filter: brightness(1.15); }

    /* stati */
    .loading {
    padding: 40px 16px; text-align: center;
    font-size: .88rem; color: #8f8271;
    }
    .loading::after {
    content: ''; display: inline-block;
    width: 10px; height: 10px; margin-left: 10px;
    border-radius: 50%; background: #ffbe8a;
    animation: pulse 1.2s ease-in-out infinite;
    vertical-align: middle;
    }
    @keyframes pulse {
    0%, 100% { opacity: .3; transform: scale(.8); }
    50%      { opacity: 1; transform: scale(1.1); }
    }

    /* ── mobile ── */
    @media (max-width: 700px) {
    :host { --gutter-w: 44px; --head-h: 52px; }
    .nav { font-size: .78rem; padding: 10px 12px; }
    .head { font-size: .62rem; }
    .head .dnum { font-size: .92rem; }
    .hour-label { font-size: .64rem; }
    .ev { font-size: .7rem; padding: 4px 6px; border-radius: 6px; }
    }
`;

class MdvGoogleCalendar extends BaseElement {
    static get observedAttributes() {
    return ['sources', 'start-hour', 'end-hour', 'days', 'hour-height'];
    }

    constructor() {
    super();
    this._events = [];
    this._weekOffset = 0;
    this._loaded = false;
    }

    async connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [sheet(STYLES)];
    this.shadowRoot.innerHTML = `<div class="loading">Carico il calendario…</div>`;

    this._on(this.shadowRoot, 'click', (e) => this._onClick(e));

    try {
        await this._load();
        this._loaded = true;
        this._render();
    } catch (err) {
        console.error('[mdv-google-calendar]', err);
        this.shadowRoot.innerHTML =
        `<div class="loading">Impossibile caricare il calendario. Riprova più tardi.</div>`;
    }

    const min = +(this.getAttribute('refetch-min') || 5);
    if (min > 0) {
        this._refetchTimer = setInterval(() => this._refresh(), min * 60 * 1000);
    }
    }

    disconnectedCallback() {
    clearInterval(this._refetchTimer);
    }

    attributeChangedCallback(name) {
    if (!this._loaded) return;
    if (name === 'sources') {
        this._load().then(() => this._render()).catch(() => {});
    } else {
        this._render();
    }
    }

    /* ── caricamento dati ───────────────────────────────────── */

    async _load() {
    const sources = this._getSources();
    const cacheKey = 'mdv-cal:' + sources.map((s) => s.url).join('|');

    const cached = this._readCache(cacheKey);
    if (cached) { this._events = cached; return; }

    const results = await Promise.all(
        sources.map((s, i) => this._fetchOne(s.url, COLORS[i % COLORS.length]))
    );
    this._events = results.flat();
    this._writeCache(cacheKey, this._events);
    }

    async _refresh() {
    const sources = this._getSources();
    const cacheKey = 'mdv-cal:' + sources.map((s) => s.url).join('|');
    try {
        const results = await Promise.all(
        sources.map((s, i) => this._fetchOne(s.url, COLORS[i % COLORS.length]))
        );
        this._events = results.flat();
        this._writeCache(cacheKey, this._events);
        this._render();
    } catch (err) {
        console.warn('[mdv-google-calendar] refresh fallito', err);
    }
    }

    _getSources() {
    return (this.getAttribute('sources') || '')
        .split(',').map((s) => s.trim()).filter(Boolean)
        .map((url) => ({ url }));
    }

    async _fetchOne(url, color) {
        // Proxy CORS: il browser chiama il proxy, il proxy chiama Google
        const proxied = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        const res = await fetch(proxied, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status} su ${url}`);
        const text = await res.text();
        return this._parseICS(text, color);
    }

    _readCache(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { ts, events } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL_MS) return null;
        return events.map((ev) => ({
        ...ev,
        start: new Date(ev.start),
        end: new Date(ev.end),
        }));
    } catch { return null; }
    }

    _writeCache(key, events) {
    try {
        localStorage.setItem(key, JSON.stringify({
        ts: Date.now(),
        events: events.map((ev) => ({
            ...ev,
            start: ev.start.toISOString(),
            end: ev.end.toISOString(),
        })),
        }));
    } catch { /* quota piena o storage disabilitato: ignora */ }
    }

    /* ── parsing ICS ────────────────────────────────────────── */

    _parseICS(text, color) {
    // unfolding: righe piegate iniziano con spazio o tab
    const unfolded = text.replace(/\r?\n[ \t]/g, '');
    const lines = unfolded.split(/\r?\n/);
    const out = [];
    let cur = null;

    for (const line of lines) {
        if (line === 'BEGIN:VEVENT') {
        cur = { color };
        } else if (line === 'END:VEVENT') {
        if (cur && cur.start && cur.end) out.push(cur);
        cur = null;
        } else if (cur) {
        const idx = line.indexOf(':');
        if (idx < 0) continue;
        const key = line.slice(0, idx).split(';')[0];
        const val = line.slice(idx + 1);

        if (key === 'DTSTART') cur.start = this._parseICSDate(val);
        else if (key === 'DTEND') cur.end = this._parseICSDate(val);
        else if (key === 'SUMMARY') cur.title = this._unescapeICS(val);
        else if (key === 'UID') cur.id = val;
        else if (key === 'LOCATION') cur.location = this._unescapeICS(val);
        // NB: RRULE / EXDATE non gestiti (le ricorrenze mostrano solo la prima occorrenza)
        }
    }
    return out;
    }

    _parseICSDate(s) {
    const m = s.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/);
    if (!m) return null;
    const [, y, mo, d, h = '0', mi = '0', se = '0', z] = m;
    if (z === 'Z') return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se));
    return new Date(+y, +mo - 1, +d, +h, +mi, +se);
    }

    _unescapeICS(s) {
    return s
        .replace(/\\n/gi, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\');
    }

    /* ── rendering ──────────────────────────────────────────── */

    _render() {
    const startH   = +(this.getAttribute('start-hour') || 20);
    const endH     = +(this.getAttribute('end-hour')   || 24);
    const hourH    = +(this.getAttribute('hour-height')|| 52);
    const days     = (this.getAttribute('days') || '1,2,3,4,5')
                        .split(',').map((n) => +n - 1);
    const monday   = this._monday(this._weekOffset);
    const hoursCount = Math.max(0, endH - startH);

    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    wrap.style.setProperty('--hour-h', hourH + 'px');

    // ── nav settimana ──
    const nav = document.createElement('div');
    nav.className = 'nav';
    nav.innerHTML = `
        <button data-nav="-1" aria-label="Settimana precedente">◀</button>
        <strong>${this._formatRange(monday, days)}</strong>
        <button data-nav="1" aria-label="Settimana successiva">▶</button>
    `;
    wrap.appendChild(nav);

    // ── griglia ──
    const grid = document.createElement('div');
    grid.className = 'grid';
    grid.style.gridTemplateColumns = `var(--gutter-w) repeat(${days.length}, 1fr)`;

    // riga 1: corner + nomi giorni
    grid.appendChild(el('div', 'head corner'));
    for (const d of days) {
        const dt = addDays(monday, d);
        const head = el('div', 'head day');
        head.innerHTML = `${dt.toLocaleDateString('it-IT', { weekday: 'short' })}<span class="dnum">${dt.getDate()}</span>`;
        grid.appendChild(head);
    }

    // riga 2 col 1: gutter con etichette ore
    const gutter = el('div', 'gutter');
    gutter.style.height = (hoursCount * hourH) + 'px';
    for (let h = startH; h < endH; h++) {
        const label = el('div', 'hour-label');
        label.textContent = `${String(h).padStart(2, '0')}:00`;
        gutter.appendChild(label);
    }
    grid.appendChild(gutter);

    // riga 2 col 2..N+1: colonne giorno con eventi
    for (const d of days) {
        const col = el('div', 'day-col');
        col.style.height = (hoursCount * hourH) + 'px';

        const dayStart = addDays(monday, d);
        const evs = this._eventsForDay(dayStart, startH, endH);
        for (const ev of evs) {
        col.appendChild(this._renderEvent(ev, startH, hourH));
        }
        grid.appendChild(col);
    }

    wrap.appendChild(grid);

    // ── swap contenuto ──
    const old = this.shadowRoot.querySelector('.wrap, .loading');
    if (old) old.replaceWith(wrap);
    else this.shadowRoot.appendChild(wrap);
    }

    _renderEvent(ev, startH, hourH) {
    const sH = ev.start.getHours() + ev.start.getMinutes() / 60;
    const eH = ev.end.getHours()   + ev.end.getMinutes()   / 60;

    const top    = Math.max(0, (sH - startH) * hourH);
    const bottom = Math.max(top + 22, (eH - startH) * hourH);
    const height = bottom - top - 2;

    const node = document.createElement('div');
    node.className = 'ev';
    node.style.background = ev.color;
    node.style.top = top + 'px';
    node.style.height = height + 'px';
    node.textContent = ev.title || 'Prenotato';
    node.title =
        `${ev.title || 'Prenotato'}\n${fmt(ev.start)} → ${fmtTime(ev.end)}`;
    if (ev.id) node.dataset.id = ev.id;
    return node;
    }

    _eventsForDay(dayStart, startH, endH) {
    const a = new Date(dayStart); a.setHours(0, 0, 0, 0);
    const b = new Date(a);        b.setDate(b.getDate() + 1);

    return this._events.filter((ev) => {
        if (!(ev.start >= a && ev.start < b)) return false;
        const sH = ev.start.getHours() + ev.start.getMinutes() / 60;
        const eH = ev.end.getHours()   + ev.end.getMinutes()   / 60;
        return eH > startH && sH < endH;
    });
    }

    _onClick(e) {
    const nav = e.target.closest('[data-nav]');
    if (nav) {
        this._weekOffset += +nav.dataset.nav;
        this._render();
        return;
    }
    const ev = e.target.closest('.ev');
    if (ev && ev.dataset.id) {
        const found = this._events.find((x) => x.id === ev.dataset.id);
        if (found) this._emit('event-click', found);
    }
    }

    /* ── utilità di calendario ─────────────────────────────── */

    _monday(offset = 0) {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dow = (d.getDay() + 6) % 7;   // 0 = lunedì
    d.setDate(d.getDate() - dow + offset * 7);
    return d;
    }

    _formatRange(monday, days) {
    const first = addDays(monday, days[0]);
    const last  = addDays(monday, days[days.length - 1]);
    const sameMonth = first.getMonth() === last.getMonth();

    if (sameMonth) {
        return `${first.getDate()}–${last.toLocaleDateString('it-IT', {
        day: 'numeric', month: 'long',
        })}`;
    }
    return `${first.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} – ${last.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`;
    }
}

/* ── helpers di modulo ─────────────────────────────────────── */

function el(tag, className) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    return n;
}
function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}
function fmt(d) {
    return d.toLocaleString('it-IT', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
    });
}
function fmtTime(d) {
    return d.toLocaleTimeString('it-IT', {
    hour: '2-digit', minute: '2-digit',
    });
}

customElements.define('mdv-google-calendar', MdvGoogleCalendar);