window.addEventListener('load', () => {
// 1.2 secondi di pausa dopo l'ingresso
setTimeout(() => {
    
    if (window.innerWidth > 980) {
    const scrollContainer = document.querySelector('.ct-content');
    if (scrollContainer) {
        // Fase 1: Scendi verso le info
        scrollContainer.scrollBy({
        top: window.innerHeight,
        behavior: 'smooth'
        });

        // Fase 2: Aspetta 1.5s e poi risali automaticamente!
        setTimeout(() => {
        scrollContainer.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        }, 1000); 
    }
    } else {
    // Su mobile stesso effetto, adattato alla logica del documento
    const sections = document.querySelectorAll('.ct-section');
    if (sections.length > 1) {
        // Fase 1: Scendi
        sections[1].scrollIntoView({
        behavior: 'smooth',
        block: 'start'
        });

        // Fase 2: Risali
        setTimeout(() => {
        sections[0].scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
        }, 500);
    }
    }
    
}, 500); 
});