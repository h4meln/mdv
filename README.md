# Mondo delle Uova

Sito statico dell’associazione: HTML, CSS e Web Components, senza build.

## Anteprima locale

Avvia `python -m http.server 8765` dalla cartella del progetto e apri
`http://localhost:8765`. È necessario un server HTTP per i moduli JavaScript.

## Contenuti

- `data/events.js`: solo appuntamenti confermati.
- `data/timeline.js`: testi, foto e reel della home.
- `data/gallery.js`: fotografie della galleria. Dopo aver aggiunto foto, esegui
  `python scripts/build-gallery-previews.py` (richiede Pillow) per rigenerare
  dimensioni e anteprime sfocate. Le nuove immagini funzionano anche senza anteprima.
- `public/img/sala_prove/`: 19 foto recuperate dal sito originale.
- `assets/doc/`: buona causa, iscrizione e delega minorenni.

I reel originali MOV sono conservati. La home usa le copie MP4 H.264/AAC ottimizzate
con poster e caricamento su richiesta. L’audio viene tentato quando il video è
visibile; se il browser lo blocca, il video parte muto e il pulsante permette di
attivarlo. Uscendo dalla scena, il video si ferma.

La chiusura del toast viene ricordata per la sessione della scheda. I link alla
campagna e al documento rimangono nella home e nel tesseramento. Il widget GoFundMe,
la mappa e il calendario prenotazioni richiedono una connessione ai servizi esterni.

La breve esplorazione automatica di Info e Sale si interrompe al primo input
(rotella, tocco, clic o tastiera) e non parte con movimento ridotto.

## Officina eventi

Apri `http://localhost:8765/tools/admin-eventi.html` dopo aver avviato il server.
L’editor carica il programma corrente; una bozza salvata su questo browser ha la
precedenza. Per caricare una versione più recente, usa **Apri file**.

- Anteprima della scheda e del calendario pubblico, aggiornata mentre scrivi.
- Ricerca, duplicazione, eliminazione reversibile, annulla/ripeti (60 passaggi).
- Bozze automatiche in localStorage e backup JSON, anche di eventi incompleti.
- Import di JSON e di array letterali `export const EVENTS` / `window.CALENDAR_EVENTS`,
  senza eseguire il codice del file. Le vecchie categorie vengono tradotte.
- Esportazione `events.js` con controllo dei campi obbligatori e delle date.

L’esportazione scarica un file: non modifica il programma sul server. Sostituisci
`data/events.js` e pubblica il progetto come di consueto. Le bozze sono locali,
non sincronizzate tra operatori o dispositivi. **Ctrl/Cmd+S** esporta il programma.

L’impostazione dell’editor è ispirata al flusso anteprima/controlli di
[Interlinea](https://github.com/h4meln/interlinea); l’implementazione è specifica per MdV.
