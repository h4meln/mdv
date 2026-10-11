/* Cache globale di CSSStyleSheet: stesso testo → stesso oggetto,
   parsato una sola volta per documento. */
const cache = new Map();
export function sheet(cssText) {
  if (cache.has(cssText)) return cache.get(cssText);
  const s = new CSSStyleSheet();
  s.replaceSync(cssText);
  cache.set(cssText, s);
  return s;
}
