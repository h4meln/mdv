/* ─────────────────────────────────────────────────────────────
   Sala Prove — logica di pagina
   Auto-scroll "vetrina": al load mostra brevemente la sezione
   calendario, poi torna in cima. Solo su desktop (> 980px).
   ───────────────────────────────────────────────────────────── */

(() => {
const DESKTOP_MIN   = 980;
const DELAY_BEFORE  = 1200;  // attesa prima di partire
const DELAY_AFTER   = 1500;  // attesa prima di tornare su

function autoScroll() {
    if (window.innerWidth > DESKTOP_MIN) {
    // Desktop: scrolla il contenitore .sp-content
    const container = document.querySelector('.sp-content');
    if (!container) return;

    container.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
    setTimeout(() => {
        container.scrollTo({ top: 0, behavior: 'smooth' });
    }, DELAY_AFTER);

    } else {
    // Mobile: scrollIntoView sulle due sezioni
    const sections = document.querySelectorAll('.sp-section');
    if (sections.length < 2) return;

    sections[1].scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
        sections[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, DELAY_AFTER);
    }
}

window.addEventListener('load', () => {
    setTimeout(autoScroll, DELAY_BEFORE);
});
})();