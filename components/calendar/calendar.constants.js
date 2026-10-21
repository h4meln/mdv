export const BASE_CATEGORIES = {
  concert: { label: 'Concerti', color: 'rose' },
  workshop: { label: 'Laboratori', color: 'amber' },
  meeting: { label: 'Vita associativa', color: 'sky' },
  social: { label: 'Incontri e giochi', color: 'sand' },
  deadline: { label: 'Scadenze', color: 'violet' },
};

let EXTRA_CATEGORIES = {};
try {
  const mod = await import('../../data/categories.js');
  const extra = mod?.CATEGORIES || mod?.default || {};
  if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
    for (const [key, cat] of Object.entries(extra)) {
      if (/^[a-z][a-z0-9_-]{0,39}$/i.test(key) && cat && typeof cat.label === 'string' && typeof cat.color === 'string') {
        EXTRA_CATEGORIES[key] = { label: cat.label, color: cat.color };
      }
    }
  }
} catch { /* nessun file personalizzato */ }

export const CATEGORIES = { ...BASE_CATEGORIES, ...EXTRA_CATEGORIES };

export const MONTHS_IT = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
];

export const DOW_IT_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
export const DOW_IT_LONG  = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export const PIP_MAP = {
  green: 'l',
  rose: 'c',
  amber: 'y',
  violet: 'v',
  sky: 'y',
  lime: 'l',
  sand: 'y'
};