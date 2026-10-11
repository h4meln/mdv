import { pad, ymd, sameDay, parseYmd } from '../shared/date-utils.js';
import { CATEGORIES, MONTHS_IT, DOW_IT_SHORT, DOW_IT_LONG, PIP_MAP } from './calendar.constants.js';

export function renderToolbar(cal) {
  const c = cal._cursor;
  const now = new Date();
  const cursorIsToday = sameDay(c, now);

  let title;
  if (cal._view === 'week') {
    const days = cal._weekDays();
    const a = days[0], b = days[6];
    if (a.getMonth() === b.getMonth()) {
      title = `${a.getDate()} – ${b.getDate()} ${MONTHS_IT[a.getMonth()]} ${a.getFullYear()}`;
    } else {
      title = `${a.getDate()} ${MONTHS_IT[a.getMonth()].slice(0,3)} – ${b.getDate()} ${MONTHS_IT[b.getMonth()].slice(0,3)} ${b.getFullYear()}`;
    }
  } else if (cal._view === 'agenda') {
    title = 'Tutti gli eventi';
  } else {
    title = `${MONTHS_IT[c.getMonth()]} ${c.getFullYear()}`;
  }

  const oggiAttrs = cursorIsToday ? 'data-disabled' : '';

  return `
    <div class="cal-toolbar">
      <div class="cal-toolbar-left">
        <div class="cal-title">${title}</div>
        <div class="cal-title-badge">Event Planner</div>
      </div>
      <div class="cal-toolbar-right">
        <button type="button" class="cal-view-btn ${cal._view==='month'?'active':''}"  data-action="view" data-view="month">Mese</button>
        <button type="button" class="cal-view-btn ${cal._view==='week'?'active':''}"   data-action="view" data-view="week">Settimana</button>
        <button type="button" class="cal-view-btn ${cal._view==='agenda'?'active':''}" data-action="view" data-view="agenda">Agenda</button>
        <button type="button" class="cal-view-btn" data-action="today" ${oggiAttrs}>Oggi</button>
        <div class="cal-nav-group">
          <button type="button" class="cal-nav-btn" data-action="prev" aria-label="Precedente">‹</button>
          <button type="button" class="cal-nav-btn" data-action="next" aria-label="Successivo">›</button>
        </div>
      </div>
    </div>`;
}

function eventRow(cal, ev, opts = {}) {
  const { variant = '' } = opts;
  const cat = cal._catOf(ev);
  const date = ev.date ? parseYmd(ev.date) : null;
  const time = ev.time ? `${ev.time}${ev.end ? ' – ' + ev.end : ''}` : 'Tutto il giorno';
  const dNum = date ? pad(date.getDate()) : '';
  const dDow = date ? DOW_IT_SHORT[date.getDay()] : '';
  
  const metaParts = [];
  if (ev.location) metaParts.push('📍 ' + ev.location);
  if (ev.description) metaParts.push(ev.description);
  const meta = metaParts.join(' · ');

  const cls = ['cal-event-row', `cal-event-row--${cat.color}`];
  if (variant) cls.push(`cal-event-row--${variant}`);

  return `
    <div class="${cls.join(' ')}" data-date="${ev.date || ''}">
      ${date ? `
        <div class="cal-event-date">
          <div class="cal-event-day">${dNum}</div>
          <div class="cal-event-dow">${dDow}</div>
        </div>` : ''}
      <div class="cal-event-body">
        <div class="cal-event-time">${time} · ${cat.label}</div>
        <div class="cal-event-title">${ev.title}</div>
        ${meta ? `<div class="cal-event-meta">${meta}</div>` : ''}
      </div>
    </div>`;
}

export function renderMonth(cal) {
  const y = cal._cursor.getFullYear();
  const m = cal._cursor.getMonth();
  const first = new Date(y, m, 1);
  const startDay = first.getDay(); // 0 è Domenica
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();

  const cells = [];
  // Giorni del mese precedente per riempire la prima settimana
  for (let i = startDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(y, m - 1, prevDays - i), other: true });
  }
  // Giorni del mese corrente
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(y, m, d), other: false });
  }
  // Completamento griglia a 35 o 42 celle
  let nextD = 1;
  const totalCells = cells.length > 35 ? 42 : 35;
  while (cells.length < totalCells) {
    cells.push({ date: new Date(y, m + 1, nextD++), other: true });
  }

  return `
    <div class="cal-panel">
      <div class="cal-dow">
        ${DOW_IT_SHORT.map((d, i) => `<div class="cal-dw ${(i===0||i===6)?'wkend':''}">${d}</div>`).join('')}
      </div>
      <div class="cal-grid">
        ${cells.map(c => renderCell(cal, c.date, c.other)).join('')}
      </div>
    </div>`;
}

export function renderCell(cal, date, other) {
  const events = other ? [] : cal._eventsOn(date);
  const isToday = sameDay(date, cal._today);
  const isPast = !other && !isToday && date < new Date(cal._today.getFullYear(), cal._today.getMonth(), cal._today.getDate());
  const isSelected = !isToday && sameDay(date, cal._selected);
  const isWkend = date.getDay() === 0 || date.getDay() === 6;
  
  const cls = ['cal-cell'];
  if (other) cls.push('other');
  if (isWkend) cls.push('wkend');
  if (isPast) cls.push('past');
  if (isToday) cls.push('today');
  if (isSelected) cls.push('selected');
  
  const visible = events.slice(0, 3);
  const badgeClass = cal._badgeClass(events);

  return `
    <div class="${cls.join(' ')}" data-date="${ymd(date)}">
      <div class="cal-cell-top">
        <div class="cal-cell-num">${date.getDate()}</div>
        ${events.length > 0 ? `<div class="cal-cell-badge cal-cell-badge--${badgeClass}">${events.length}</div>` : ''}
      </div>
      ${events.length > 0 ? `
        <div class="cal-cell-events">
          ${visible.map(ev => {
            const cat = cal._catOf(ev);
            return `
              <div class="cal-cell-event cal-cell-event--${cat.color}">
                <span class="cal-cell-event-dot"></span>${ev.title}
              </div>`;
          }).join('')}
          ${events.length > visible.length ? `<div class="cal-cell-more">+${events.length - visible.length} altri</div>` : ''}
        </div>` : ''}
    </div>`;
}

export function renderWeek(cal) {
  return `
    <div class="cal-panel">
      <div class="cal-week">
        ${cal._weekDays().map(d => renderWeekCol(cal, d)).join('')}
      </div>
    </div>`;
}

export function renderWeekCol(cal, date) {
  const events = cal._eventsOn(date);
  const isToday = sameDay(date, cal._today);
  return `
    <div class="cal-week-col ${isToday ? 'today' : ''}" data-date="${ymd(date)}">
      <div class="cal-week-head">
        <div class="cal-week-dow">${DOW_IT_SHORT[date.getDay()]}</div>
        <div class="cal-week-num">${date.getDate()}</div>
      </div>
      <div class="cal-week-events">
        ${events.map(ev => eventRow(cal, ev, { variant: 'week' })).join('')}
      </div>
    </div>`;
}

export function renderAgenda(cal) {
  const all = [];
  for (const [dateStr, evs] of Object.entries(cal._byDate)) {
    for (const ev of evs) all.push({ ...ev, _dateStr: dateStr });
  }
  all.sort((a, b) => {
    if (a._dateStr !== b._dateStr) return a._dateStr < b._dateStr ? -1 : 1;
    return (a.time || '99:99').localeCompare(b.time || '99:99');
  });

  if (!all.length) {
    return `<div class="cal-panel"><div class="cal-empty">Nessun evento in archivio</div></div>`;
  }
  return `
    <div class="cal-panel">
      <div class="cal-agenda-view">
        ${all.map(ev => eventRow(cal, ev, { variant: 'flat' })).join('')}
      </div>
    </div>`;
}

export function renderStrip(cal) {
  const y = cal._cursor.getFullYear();
  const m = cal._cursor.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(y, m, d));

  return `
    <div class="cal-strip-card cal-strip">
      <div class="cal-strip-wrap">
        <div class="cal-strip-list">
          ${days.map(d => {
            const events = cal._eventsOn(d);
            const isToday = sameDay(d, cal._today);
            const isSel = !isToday && sameDay(d, cal._selected);
            const isWkend = d.getDay() === 0 || d.getDay() === 6;
            
            const cls = ['cal-strip-day'];
            if (isWkend) cls.push('weekend');
            if (isToday) cls.push('today');
            else if (isSel) cls.push('selected');
            
            const pips = events.slice(0, 3).map(ev => {
              const cat = cal._catOf(ev);
              return `<span class="cal-strip-pip" style="color: var(--${cat.color})"></span>`;
            }).join('');

            return `
              <div class="${cls.join(' ')}" data-date="${ymd(d)}">
                <div class="cal-strip-day-dow">${DOW_IT_SHORT[d.getDay()]}</div>
                <div class="cal-strip-day-num">${d.getDate()}</div>
                <div class="cal-strip-day-mon">${MONTHS_IT[d.getMonth()].slice(0,3)}</div>
                <div class="cal-strip-day-pips">${pips}</div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

export function renderSidebar(cal) {
  return `
    <aside class="cal-sidebar">
      ${renderImageCard(cal)}
      ${renderDayCard(cal)}
      ${renderAgendaCard(cal)}
      ${renderLegend(cal)}
    </aside>`;
}

export function renderImageCard(cal) {
  return `
    <div class="cal-sb-card cal-image-card">
      <img class="cal-sidebar-image" src="assets/img/gallina.png" alt="Sidebar decorative image" />
    </div>`;
}

export function renderDayCard(cal) {
  const d = cal._selected;
  const isToday = sameDay(d, cal._today);
  return `
    <div class="cal-sb-card">
      <div class="cal-sb-label">${isToday ? 'Oggi' : 'Selezionato'}</div>
      <div class="cal-today-date">${pad(d.getDate())}</div>
      <div class="cal-today-info">${DOW_IT_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}</div>
    </div>`;
}

export function renderAgendaCard(cal) {
  const d = cal._selected;
  const events = cal._eventsOn(d);
  return `
    <div class="cal-sb-card">
      <div class="cal-sb-label">Agenda del giorno</div>
      <div class="cal-agenda-list-inner">
        ${events.length === 0
          ? `<div class="cal-empty-sm">Nessun evento</div>`
          : events.map(ev => eventRow(cal, ev, { variant: 'sb' })).join('')}
      </div>
    </div>`;
}

export function renderLegend(cal) {
  const counts = {};
  for (const ev of cal._events) counts[ev.category] = (counts[ev.category] || 0) + 1;
  return `
    <div class="cal-sb-card">
      <div class="cal-sb-label">Legenda</div>
      <div class="cal-legend">
        ${Object.entries(CATEGORIES).map(([key, cat]) => `
          <div class="cal-legend-row">
            <div class="cal-legend-swatch" style="background:var(--${cat.color})"></div>
            ${cat.label}
            <span class="cal-legend-count">${counts[key] || 0}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

export function renderModal(cal) {
  if (!cal._modalDate) return '';
  const date = cal._modalDate;
  const events = cal._eventsOn(date);
  return `
    <div class="cal-modal" data-action="modal-bg">
      <div class="cal-modal-card">
        <div class="cal-modal-head">
          <div>
            <div class="cal-modal-dow">${DOW_IT_LONG[date.getDay()]}</div>
            <div class="cal-modal-date">${pad(date.getDate())}</div>
            <div class="cal-modal-month">${MONTHS_IT[date.getMonth()]} ${date.getFullYear()}</div>
          </div>
          <button class="cal-modal-close" data-action="close-modal" aria-label="Chiudi">×</button>
        </div>
        <div class="cal-modal-body">
          ${events.length === 0
            ? `<div class="cal-empty">Nessun evento in questa data</div>`
            : events.map(ev => eventRow(cal, ev, { variant: 'modal' })).join('')}
        </div>
      </div>
    </div>`;
}