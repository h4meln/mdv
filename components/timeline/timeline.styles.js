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
`;