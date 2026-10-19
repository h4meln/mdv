export const TIMELINE_STYLES = `
:host { display: block; position: relative; }
.timeline { position: relative; padding-top: 15vw; }

.year-number {
  position: sticky; top: 3.9vh; z-index: 10;
  display: flex; align-items: center; justify-content: center;
  margin: 0; padding: 0;
  font-weight: 300; font-size: clamp(3rem, 7vw, 6rem); line-height: 1;
  pointer-events: none; color: #fff;
  height: clamp(40px, 8vh, 80px);
}
.digit {
  display: inline-block; overflow: hidden; line-height: 90%;
  width: 0.875ch; position: relative;
  will-change: transform, opacity;
}

/* Su mobile diamo sufficiente corsa verticale per leggere tutto il testo con calma */
.pin-wrap { position: relative; height: 280vh; }

.year-section {
  position: sticky; top: 0; height: 100vh;
  display: flex; align-items: center; justify-content: center;
  padding: clamp(4.5rem, 10vh, 7.5rem) clamp(1rem, 3vw, 3rem) clamp(1rem, 2vw, 2rem);
  box-sizing: border-box;
}

.year-grid {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
  width: 100%; height: 100%;
  max-width: 1800px; margin: 0 auto;
  position: relative;
  transform-origin: center center;
  will-change: transform, opacity, filter;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.year-text {
  grid-area: 1 / 1;
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  text-align: center;
  padding-inline: clamp(0.5rem, 2vw, 1.5rem);
  will-change: opacity, transform;
  z-index: 2;
}

.year-text > div { width: 100%; max-width: 55ch; margin: 0 auto; }

.media-stack {
  grid-area: 1 / 1;
  position: relative;
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  padding: 1rem; box-sizing: border-box;
  z-index: 1;
}

.media-item {
  position: absolute; max-height: 88%; max-width: 88%;
  object-fit: contain; opacity: 0;
  transform-origin: center center;
  will-change: transform, opacity, filter;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
}

.year-title {
  margin: 0 0 0.35em; font-size: clamp(2.2rem, 5vw, 3.8rem);
  font-weight: 900; line-height: 0.9; letter-spacing: -0.045em;
  text-wrap: balance; color: #fff; text-align: center;
}
.year-title.is-sm { font-size: clamp(1.8rem, 3.8vw, 2.8rem); }
.year-title strong { font-weight: 900; color: var(--color-strong, #D9451E); }
.year-title em { font-style: italic; font-weight: 900; color: var(--color-em, #1A56DB); }

.year-text p {
  margin: 0 auto; font-size: clamp(0.95rem, 1.6vw, 1.2rem);
  line-height: 1.25; letter-spacing: -0.01em;
  max-width: 50ch; text-wrap: pretty; color: #fff; text-align: center;
}

.word { display: inline-block; opacity: 0.1; will-change: opacity; }

@media (min-width: 768px) {
  .pin-wrap { height: 220vh; }
  .year-grid {
    grid-template-rows: 1fr;
    grid-template-columns: 1fr 1.15fr;
    align-items: center;
    gap: clamp(1.5rem, 3vw, 3rem);
  }
  .year-text {
    grid-area: auto;
    align-items: flex-start;
    text-align: left;
  }
  .year-text > div { margin: 0; }
  .media-stack { grid-area: auto; }
  .year-title {
    font-size: clamp(2.8rem, 5vw, 4.5rem);
    line-height: 0.88; letter-spacing: -0.05em; text-align: left;
  }
  .year-title.is-sm { font-size: clamp(2.2rem, 3.5vw, 3rem); }
  .year-text p {
    font-size: clamp(1.1rem, 1.8vw, 1.35rem);
    line-height: 1.2; max-width: 48ch; margin: 0; text-align: left;
  }
}

@media (min-width: 1280px) {
  .year-section { padding-top: clamp(5.5rem, 11vh, 8.5rem); }
  .year-grid { gap: clamp(2rem, 4vw, 4rem); max-width: 1900px; }
  .year-text p { font-size: clamp(1.2rem, 2vw, 1.5rem); max-width: 52ch; }
}

.year-text p { font-family:Manrope,sans-serif; font-size:clamp(15px,1.3vw,19px); line-height:1.7; letter-spacing:0; }
.year-title { font-family:'Amatic SC',cursive; letter-spacing:0; line-height:1.1; }
.polaroid { margin:0; padding:12px 12px 16px; background:#f4eddf; box-shadow:0 16px 40px #0007; width:min(440px,80%); box-sizing:border-box; }
.polaroid img { display:block; width:100%; max-height:48vh; object-fit:contain; background:#e2dacb; }
.polaroid figcaption { color:#38302a; font:14px/1.5 Manrope,sans-serif; padding-top:12px; text-align:center; }
@media(max-width:767px) {
 .year-grid { grid-template-rows:auto minmax(180px,1fr); gap:12px; }
 .year-text { grid-area:1/1; }
 .media-stack { grid-area:2/1; }
 .year-section { padding:90px 16px 120px; }
 .year-text p { font-size:14px; line-height:1.55; }
 .year-title { font-size:30px; }
 .polaroid { max-width:80%; padding:8px 8px 12px; }
 .polaroid img { max-height:23vh; }
 .polaroid figcaption { font-size:11px; padding-top:8px; }
}

:host { font-family:'Amatic SC',cursive; }
.pin-wrap { height:380vh; }
.year-number { font-family:'Amatic SC',cursive; font-weight:700; }
.year-title { font-size:clamp(44px,5vw,76px); line-height:1.08; }
.year-text p { font:400 clamp(25px,2.1vw,32px)/1.4 'Amatic SC',cursive; max-width:36ch; }
.year-grid { gap:5vw; }
.media-stack { isolation:isolate; }
.polaroid { width:min(370px,65%); max-height:74%; padding:14px 14px 0; background:#f7f7f2; box-shadow:0 2px 3px #0003,0 20px 35px #0006; border:1px solid #ddd; }
.polaroid img { width:100%; aspect-ratio:1; max-height:43vh; object-fit:cover; background:#15151b; border:1px solid #ddd; }
.polaroid figcaption { min-height:68px; display:grid; place-items:center; padding:10px 2px; font:700 22px/1.2 'Amatic SC',cursive; color:#242530; }
.reel { width:min(340px,66%); height:min(65vh,600px); background:#111; box-shadow:0 20px 60px #0006; }
.reel video { width:100%; height:100%; object-fit:contain; }
.reel-sound { position:absolute; left:12px; bottom:12px; padding:7px 14px; color:white; border:1px solid #ffffff70; background:#111c; border-radius:30px; font:700 23px 'Amatic SC',cursive; cursor:pointer; }
@media(max-width:767px) {
 .pin-wrap { height:400vh; }
 .year-section { padding:75px 12px 95px; }
 .year-grid { grid-template-rows:auto minmax(180px,1fr); gap:10px; }
 .year-text p { font-size:22px; line-height:1.3; }
 .year-title { font-size:36px; margin-bottom:10px; }
 .polaroid { width:52%; padding:8px 8px 0; max-height:90%; }
 .polaroid img { max-height:24vh; }
 .polaroid figcaption { font-size:17px; min-height:44px; padding:6px 0; }
 .reel { width:47%; height:100%; max-height:36vh; }
}


@media(max-width:767px) {
 .year-number { top:20px; font-size:48px; height:50px; }
 .year-section { padding-top:100px; }
 .year-title { font-size:34px; }
 .year-text p { font-size:21px; }
 .reel { width:60%; max-height:38vh; }
 .reel-sound { font-size:20px; left:8px; bottom:8px; }
}

/* ══════════════════════════════════════════════════════════
   MOBILE: parole e media in due blocchi distinti.
   Niente sezioni sticky sovrapposte (il testo non finisce più
   sopra le immagini), niente scrub: i media restano visibili.
   Gli !important vincono sugli stili inline scritti dal render.
   ══════════════════════════════════════════════════════════ */
@media (max-width: 767px) {
  .timeline { padding-top: 0; }
  .pin-wrap { height: auto; }
  .year-section {
    position: relative; top: auto;
    height: auto; min-height: 0;
    display: block;
    padding: 92px 18px 64px;
  }
  .year-grid {
    display: flex; flex-direction: column;
    align-items: stretch; height: auto;
    gap: 22px;
    transform: none !important;
    filter: none !important;
    opacity: 1 !important;
  }
  .year-text { opacity: 1 !important; align-items: center; text-align: center; padding-inline: 0; }
  .word { opacity: 1 !important; }
  .year-title { font-size: clamp(28px, 8vw, 38px) !important; margin-bottom: 12px; }
  .year-title.is-sm { font-size: clamp(24px, 6.4vw, 32px) !important; }
  .year-text p {
    font-size: clamp(17px, 4.6vw, 21px) !important;
    line-height: 1.42; max-width: 34ch;
  }
  .media-stack {
    position: relative; display: block;
    height: auto; min-height: 0; padding: 0;
    isolation: auto;
  }
  .media-item {
    position: relative !important;
    opacity: 1 !important;
    filter: none !important;
    transform: none !important;
    max-width: 100% !important;
    max-height: none !important;
    margin: 0 auto 18px !important;
    z-index: auto !important;
  }
  .polaroid { width: min(100%, 420px); max-height: none; padding: 10px 10px 0; }
  .polaroid img { max-height: none !important; aspect-ratio: 4 / 3; object-fit: cover; }
  .polaroid figcaption { font-size: 17px; min-height: 44px; padding: 8px 0; }
  .reel { width: min(100%, 340px); height: auto; aspect-ratio: 9 / 16; max-height: 68svh; }
  .reel video { height: 100%; }
  .reel-sound { font-size: 20px; left: 10px; bottom: 10px; }
  .year-number {
    top: 14px;
    font-size: clamp(30px, 9vw, 44px);
    height: 46px;
    /* niente pillola scura: solo il numero, leggibile grazie all'ombra */
    text-shadow: 0 2px 14px rgba(0, 0, 0, .85), 0 0 2px rgba(0, 0, 0, .9);
  }
}
`;
