/* <mdv-diorama> — Diorama 3D interattivo delle sale prove.
   - trascina per ruotare, rotellina per lo zoom
   - clicca gli strumenti → scheda tecnica
   - toggle Sala Rossa / Sala Blu con relighting automatico
   Uso: <mdv-diorama room="red"></mdv-diorama>  oppure  el.room = 'blue' */
   import { BaseElement } from '../shared/base-element.js';
   import { sheet } from '../shared/styles.js';
   
   const STYLES = `
   :host { display: block; position: relative; border-radius: 22px; overflow: hidden;
     border: 1px solid rgba(255,255,255,.09);
     box-shadow: 0 30px 80px -20px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.06);
     aspect-ratio: 16 / 10; background: #0d0b09; }
   canvas { display: block; width: 100%; height: 100%; cursor: grab; touch-action: none; }
   canvas:active { cursor: grabbing; }
   
   .dio-ui { position: absolute; inset: 0; pointer-events: none; font-family: 'Manrope', system-ui, sans-serif; }
   .dio-top { position: absolute; top: 16px; left: 16px; right: 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
   .dio-title { color: #fff; }
   .dio-title h3 { margin: 0; font-family: 'Fraunces', serif; font-style: italic; font-weight: 400; font-size: clamp(20px, 3vw, 30px); line-height: 1.05; text-shadow: 0 2px 18px rgba(0,0,0,.6); }
   .dio-title p { margin: 4px 0 0; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; opacity: .72; }
   
   .dio-toggle { pointer-events: auto; display: flex; gap: 6px; padding: 5px; border-radius: 999px;
     background: rgba(12,10,9,.62); border: 1px solid rgba(255,255,255,.12); backdrop-filter: blur(12px); }
   .dio-toggle button { appearance: none; border: 0; cursor: pointer; font: 600 12px/1 'Manrope',sans-serif;
     letter-spacing: .08em; text-transform: uppercase; padding: 9px 16px; border-radius: 999px;
     color: rgba(255,255,255,.65); background: transparent; transition: all .25s; }
   .dio-toggle button.on[data-room="red"] { background: #e8643c; color: #fff; box-shadow: 0 4px 18px rgba(232,100,60,.5); }
   .dio-toggle button.on[data-room="blue"] { background: #5a8cb4; color: #fff; box-shadow: 0 4px 18px rgba(90,140,180,.5); }
   
   .dio-hint { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
     font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.55);
     padding: 7px 14px; border-radius: 999px; background: rgba(12,10,9,.5); border: 1px solid rgba(255,255,255,.08);
     backdrop-filter: blur(8px); white-space: nowrap; }
   
   .dio-card { position: absolute; right: 16px; bottom: 16px; width: min(300px, calc(100% - 32px));
     pointer-events: auto; color: #fff; padding: 18px 18px 16px; border-radius: 16px;
     background: rgba(14,12,10,.78); border: 1px solid rgba(255,255,255,.12); backdrop-filter: blur(16px);
     transform: translateY(14px); opacity: 0; transition: all .35s cubic-bezier(.16,1,.3,1); }
   .dio-card.show { transform: none; opacity: 1; }
   .dio-card h4 { margin: 0 0 6px; font-family: 'Fraunces', serif; font-weight: 400; font-size: 19px; }
   .dio-card p { margin: 0; font-size: 13px; line-height: 1.55; color: rgba(255,255,255,.78); }
   .dio-card .dio-tag { display: inline-block; margin-bottom: 9px; font-size: 10px; font-weight: 700; letter-spacing: .14em;
     text-transform: uppercase; padding: 4px 9px; border-radius: 20px; background: rgba(255,190,52,.16);
     color: #ffbe34; border: 1px solid rgba(255,190,52,.3); }
   .dio-card .dio-x { position: absolute; top: 10px; right: 10px; width: 26px; height: 26px; border-radius: 50%;
     border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); color: #fff; cursor: pointer; font-size: 13px; }
   `;
   
   const LIB = '../../assets/libs/three/';
   let THREE = null;   // namespace three, condiviso a livello di modulo
   
   let _glbLoader = null;
   async function loadGLB(url) {
     if (!_glbLoader) {
       const { GLTFLoader } = await import(LIB + 'GLTFLoader.js');
       const { DRACOLoader } = await import(LIB + 'DRACOLoader.js');
       const { MeshoptDecoder } = await import(LIB + 'meshopt_decoder.module.js');
       _glbLoader = new GLTFLoader();
       _glbLoader.setDRACOLoader(new DRACOLoader().setDecoderPath('assets/libs/three/draco/gltf/'));
       _glbLoader.setMeshoptDecoder(MeshoptDecoder);
     }
     return _glbLoader.loadAsync(url);
   }
   
   const ROOMS = {
     red: {
       name: 'Sala Rossa', sub: '~40 m² · fino a 6-7 musicisti',
       floor: 0x3d1512, wall: 0x2a1113, accent: 0xff5a3c, accent2: 0xffbe34,
       props: [
         { id: 'desk',    name: 'Mixer & impianto', desc: 'Mixer, impianto audio, amplificatori, microfoni e leggii. Tutto pronto all\u2019uso: porta il tuo strumento e suona.', build: 'mixerDesk' },
         { id: 'drums',   name: 'Batteria Mapex', desc: 'Batteria Mapex comprensiva di aste e piatto charleston. Cassa acustica con parchetto per volume controllato.', build: 'drums',
           views: [
             { dist: 3.2, h: 1.5, dy: 0.1 },   /* kit intero */
             { dist: 1.5, h: 1.9, dy: 0.85 },  /* piatti */
             { dist: 1.7, h: 0.85, dy: 0.15 }, /* rullante e tom */
           ] },
         { id: 'spk',     name: 'Casse passive 500W RMS', desc: 'Coppia di casse passive da 500 Watt RMS: volume da palco anche a metà manopola.', build: 'speakers' },
         { id: 'bassamp', name: 'Markbass basso', desc: 'Testa Markbass più cassa dedicata: il groove si sente nelle ossa.', build: 'bassAmp' },
         { id: 'gamp1',   name: 'Marshall chitarra', desc: 'Testa e cassa Marshall per chitarra: il suono del rock, punto.', build: 'marshall',
           views: [
             { dist: 1.8, h: 0.9, dy: 0.25 },
             { dist: 1.1, h: 0.75, dy: 0.35 }, /* pannello frontale */
           ] },
         { id: 'gamp2',   name: 'Crate chitarra', desc: 'Secondo setup testa + cassa Crate: doppia chitarra, zero code.', build: 'guitarAmp2' },
         { id: 'piano',   name: 'Pianoforte', desc: 'Pianoforte verticale per tastieristi, cantanti e chi scrive.', build: 'piano',
           views: [
             { dist: 2.6, h: 1.2, dy: 0.3 },
             { dist: 1.4, h: 1.0, dy: 0.1 },   /* tastiera */
           ] },
         { id: 'couch',   name: 'Divano rosso', desc: 'Il leggendario divano rosso: riposo, ascolto e discussioni infinite su accordi e scale.', build: 'couch' },
       ],
     },
     blue: {
       name: 'Sala Blu', sub: '~25 m² · ideale per trio e quartetti',
       floor: 0x122036, wall: 0x101a2c, accent: 0x4da3ff, accent2: 0x9fd8ff,
       props: [
         { id: 'desk',    name: 'Mixer & impianto', desc: 'Mixer, impianto audio, amplificatori, microfoni e leggii.', build: 'mixerDesk' },
         { id: 'drums',   name: 'Batteria Mapex', desc: 'Batteria Mapex con aste e charleston.', build: 'drums',
           views: [
             { dist: 3.2, h: 1.5, dy: 0.1 },
             { dist: 1.5, h: 1.9, dy: 0.85 },
             { dist: 1.7, h: 0.85, dy: 0.15 },
           ] },
         { id: 'spk',     name: 'Casse 500W RMS', desc: 'Casse da 500 Watt RMS, più che sufficienti per la sala.', build: 'speakers' },
         { id: 'mics',    name: 'Microfoni', desc: 'Due microfoni con asta per voce e strumenti.', build: 'micPair' },
         { id: 'bassamp', name: 'Markbass basso', desc: 'Testa + cassa Markbass.', build: 'bassAmp' },
         { id: 'gamp1',   name: 'Marshall combo', desc: 'Amplificatore combo Marshall per chitarra.', build: 'comboAmp' },
         { id: 'gamp2',   name: 'Stinger chitarra', desc: 'Testa + cassa Stinger, secondo canale chitarra.', build: 'guitarAmp2' },
       ],
     },
   };
   
   class MdvDiorama extends BaseElement {
     static get observedAttributes() { return ['room']; }
   
     constructor() {
       super();
       this._room = 'red';
       this._theta = 0.6; this._phi = 1.02; this._radius = 8.2;
       this._hotspots = []; this._highlight = null;
       this._autoSpin = true;
     }
   
     get room() { return this._room; }
     set room(v) { this._room = ROOMS[v] ? v : 'red'; if (this._built) this._rebuildRoom(); }
   
     attributeChangedCallback(name, _, v) { if (name === 'room') this.room = v; }
   
     async connectedCallback() {
       this.shadowRoot.adoptedStyleSheets = [sheet(STYLES)];
       this.shadowRoot.innerHTML = `
         <canvas></canvas>
         <div class="dio-ui">
           <div class="dio-top">
             <div class="dio-title"><h3></h3><p></p></div>
             <div class="dio-toggle">
               <button data-room="red">Rossa</button>
               <button data-room="blue">Blu</button>
             </div>
           </div>
           <div class="dio-hint">trascina per ruotare · rotella = zoom · clicca gli strumenti</div>
           <div class="dio-card">
             <button class="dio-x" aria-label="Chiudi">✕</button>
             <span class="dio-tag">Scheda tecnica</span>
             <h4></h4><p></p>
           </div>
         </div>`;
       this._canvas = this.shadowRoot.querySelector('canvas');
       this._card = this.shadowRoot.querySelector('.dio-card');
   
       THREE = await import(LIB + 'three.module.js');
       this._THREE = THREE;
       this._buildBase();
       this._rebuildRoom();
       this._wire();
       this._loop = this._loop.bind(this);
       this._raf = requestAnimationFrame(this._loop);
       this._built = true;
     }
   
     disconnectedCallback() { cancelAnimationFrame(this._raf); this._cleanup(); }
   
     /* ── base: renderer, luci, stanza ── */
     _buildBase() {
       const THREE = this._THREE;
       const r = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true });
       r.setPixelRatio(Math.min(devicePixelRatio, 1.8));
       r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
       r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1;
       this._renderer = r;
       this._scene = new THREE.Scene();
       this._scene.fog = new THREE.FogExp2(0x0d0b09, 0.028);
       this._camera = new THREE.PerspectiveCamera(42, 2, 0.1, 80);
   
       this._hemi = new THREE.HemisphereLight(0xfff0dd, 0x181210, 0.55);
       this._key = new THREE.DirectionalLight(0xffe2b8, 1.6);
       this._key.position.set(4, 7, 3); this._key.castShadow = true;
       this._key.shadow.mapSize.set(1024, 1024);
       Object.assign(this._key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
       this._accent = new THREE.PointLight(0xff5a3c, 30, 18);
       this._accent.position.set(-3, 3.2, -2);
       this._accent2 = new THREE.PointLight(0xffbe34, 12, 12);
       this._accent2.position.set(3.4, 1.4, 2);
       this._scene.add(this._hemi, this._key, this._accent, this._accent2);
       this._resize();
     }
   
     _rebuildRoom() {
       const THREE = this._THREE;
       const cfg = ROOMS[this._room];
       if (this._roomGroup) { this._scene.remove(this._roomGroup); }
       const g = new THREE.Group(); this._roomGroup = g; this._hotspots = [];
   
       /* stanza */
       const floor = new THREE.Mesh(new THREE.PlaneGeometry(11, 8),
         new THREE.MeshStandardMaterial({ color: cfg.floor, roughness: 0.9 }));
       floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
       const wallMat = new THREE.MeshStandardMaterial({ color: cfg.wall, roughness: 0.85 });
       const back = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.2), wallMat);
       back.position.set(0, 2.1, -4); back.receiveShadow = true; g.add(back);
       const left = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.2), wallMat.clone());
       left.rotation.y = Math.PI / 2; left.position.set(-5.5, 2.1, 0); g.add(left);
       /* pannelli acustici sul muro */
       const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.95 });
       for (let i = 0; i < 5; i++) {
         const p = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.7, 0.07), panelMat);
         p.position.set(-3.4 + i * 1.7, 2.15, -3.94); g.add(p);
       }
       /* luci al neon sul soffitto (glow) */
       const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.4, 10),
         new THREE.MeshBasicMaterial({ color: cfg.accent }));
       tube.rotation.z = Math.PI / 2; tube.position.set(0, 4.05, -1.2); g.add(tube);
       const tubeGlow = new THREE.PointLight(cfg.accent, 20, 10);
       tubeGlow.position.set(0, 3.7, -1.2); g.add(tubeGlow);
   
       this._accent.color.set(cfg.accent);
       this._accent2.color.set(cfg.accent2);
   
       /* arredi */
       cfg.props.forEach((p, i) => {
         const built = this['_' + p.build]();
         const slot = this._slot(i, cfg.props.length);
         built.group.position.set(slot.x, 0, slot.z);
         built.group.rotation.y = slot.ry;
         g.add(built.group);
         /* hotspot invisibile per il raycast */
         const hs = new THREE.Mesh(new THREE.SphereGeometry(built.radius, 10, 8),
           new THREE.MeshBasicMaterial({ visible: false }));
         hs.position.set(slot.x, built.radius * 0.75, slot.z);
         hs.userData = { prop: p, group: built.group };
         g.add(hs); this._hotspots.push(hs);
       });
   
       this._scene.add(g);
       this._updateUI();
     }
   
     _slot(i, n) {
       const positions = [
         { x: -2.6, z: -2.4, ry: 0.5 }, { x: 0.2, z: -2.7, ry: 0 },
         { x: 3.0, z: -2.2, ry: -0.5 }, { x: -3.4, z: 0.2, ry: 1.1 },
         { x: 3.5, z: 0.1, ry: -1.2 }, { x: -1.9, z: 1.6, ry: 2.6 },
         { x: 1.2, z: 1.9, ry: 3.4 }, { x: 3.2, z: 1.6, ry: -2.7 },
       ];
       return positions[i % positions.length];
     }
   
     _updateUI() {
       const cfg = ROOMS[this._room];
       this.shadowRoot.querySelector('.dio-title h3').textContent = cfg.name;
       this.shadowRoot.querySelector('.dio-title p').textContent = cfg.sub;
       this.shadowRoot.querySelectorAll('.dio-toggle button').forEach(b =>
         b.classList.toggle('on', b.dataset.room === this._room));
       this._hideCard();
     }
   
     /* ── costruttori degli oggetti (primitivi stilizzati) ── */
     _mat(color, opts = {}) {
       const Mat = (opts.clearcoat !== undefined) ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
       return new Mat({ color, roughness: 0.6, ...opts });
     }
   
     /* sostituisce il contenuto di g con il GLB caricato (fallback: lascia il placeholder) */
     _withGLB(g, urlAttr, defaultUrl, target, mode, offsetY) {
       this._glbRequested = this._glbRequested || {};
       if (this._glbRequested[urlAttr]) return;
       this._glbRequested[urlAttr] = true;
       const url = this.getAttribute(urlAttr) || defaultUrl;
       loadGLB(url).then(gltf => {
         const m = gltf.scene;
         let box = new THREE.Box3().setFromObject(m);
         let s = box.getSize(new THREE.Vector3());
         if (s.z > s.y * 1.15) {                      /* export Z-up sdraiato → raddrizza */
           m.rotation.x = -Math.PI / 2;
           m.updateWorldMatrix(true, true);
           box = new THREE.Box3().setFromObject(m);
           s = box.getSize(new THREE.Vector3());
         }
         const ref = mode === 'height' ? s.y : Math.max(s.x, s.y, s.z);
         const k = target / Math.max(ref, 0.001);
         m.scale.setScalar(k);
         m.position.set(
           -(box.min.x + box.max.x) / 2 * k,
           -box.min.y * k + (offsetY || 0),
           -(box.min.z + box.max.z) / 2 * k);
         m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
         g.clear(); g.add(m);
       }).catch(err => console.warn('[mdv-diorama] GLB non caricato (' + urlAttr + '), resto sul placeholder:', err));
     }
   
     _mixerDesk() {
       const T = this._THREE, g = new THREE.Group();
       const desk = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.8), this._mat(0x2c2620));
       desk.position.y = 0.95; g.add(desk);
       for (const sx of [-0.9, 0.9]) {
         const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.95, 0.6), this._mat(0x1d1813));
         leg.position.set(sx, 0.47, 0); g.add(leg);
       }
       const mixer = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.09, 0.55), this._mat(0x3a3f44, { metalness: 0.4 }));
       mixer.position.set(0, 1.03, 0); g.add(mixer);
       for (let i = 0; i < 12; i++) {
         const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.035, 8), this._mat(0xd8d2c8));
         knob.position.set(-0.48 + (i % 6) * 0.19, 1.1, i < 6 ? -0.12 : 0.12); g.add(knob);
       }
       return { group: g, radius: 1.3 };
     }
   
     _drums() {
       const T = this._THREE, g = new THREE.Group();
       const shell = this._mat(0x8c1f28, { roughness: 0.35 });
       const skin = this._mat(0xe8e0d0, { roughness: 0.5 });
       const bass = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.5, 24), shell);
       bass.rotation.x = Math.PI / 2; bass.position.set(0, 0.42, 0); g.add(bass);
       const bassSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.03, 24), skin);
       bassSkin.rotation.x = Math.PI / 2; bassSkin.position.set(0, 0.42, 0.26); g.add(bassSkin);
       const snare = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 18), this._mat(0xb8b0a0, { metalness: 0.6 }));
       snare.position.set(-0.55, 0.72, 0.1); g.add(snare);
       const tom1 = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.2, 18), shell);
       tom1.position.set(0.18, 0.85, -0.05); g.add(tom1);
       const tom2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.22, 18), shell);
       tom2.position.set(0.52, 0.82, -0.12); g.add(tom2);
       const metal = this._mat(0xc9b46a, { metalness: 0.85, roughness: 0.25 });
       const mkCym = (x, z, r) => {
         const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 8), this._mat(0x555a5e, { metalness: 0.7 }));
         st.position.set(x, 0.65, z); g.add(st);
         const cy = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 0.015, 24), metal);
         cy.position.set(x, 1.32, z); cy.rotation.x = 0.12; g.add(cy);
       };
       mkCym(-0.85, -0.4, 0.3); mkCym(0.95, 0.15, 0.34);
       const throne = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), this._mat(0x1d1813));
       throne.position.set(0, 0.55, 0.95); g.add(throne);
       this._withGLB(g, 'drum-src', 'assets/models/batteria.glb', 1.5, 'height');
       return { group: g, radius: 1.35 };
     }
   
     _speakers() {
       const T = this._THREE, g = new THREE.Group();
       for (const sx of [-0.45, 0.45]) {
         for (let s = 0; s < 2; s++) {
           const box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.5), this._mat(0x17130f));
           box.position.set(sx, 0.38 + s * 0.76, 0); g.add(box);
           const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.14, 0.06, 20), this._mat(0x2e2620));
           cone.rotation.x = Math.PI / 2; cone.position.set(sx, 0.38 + s * 0.76, 0.26); g.add(cone);
         }
       }
       return { group: g, radius: 1.0 };
     }
   
     _bassAmp() {
       const T = this._THREE, g = new THREE.Group();
       const cab = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.62, 0.42), this._mat(0x141210));
       cab.position.y = 0.31; g.add(cab);
       const grill = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.02), this._mat(0x2a2a28));
       grill.position.set(0, 0.31, 0.22); g.add(grill);
       const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.3), this._mat(0xd8d2c4));
       head.position.y = 0.71; g.add(head);
       return { group: g, radius: 0.75 };
     }
   
     _guitarAmp() {
       const g = new THREE.Group();
       const cab = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.6, 0.35), this._mat(0x181614));
       cab.position.y = 0.3; g.add(cab);
       const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.28), this._mat(0x201c18));
       head.position.y = 0.71; g.add(head);
       const face = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.02), this._mat(0xd8c9a8));
       face.position.set(0, 0.71, 0.15); g.add(face);
       return { group: g, radius: 0.8 };
     }
   
     _marshall() {
       const g = new THREE.Group();
       const cab = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.6, 0.35), this._mat(0x181614));
       cab.position.y = 0.3; g.add(cab);
       /* la testata vera arriva via GLB e si appoggia sulla cassa */
       this._withGLB(g, 'marshall-src', 'assets/models/marshall.glb', 0.26, 'height', 0.61);
       return { group: g, radius: 0.8 };
     }
   
     _guitarAmp2() { const b = this._guitarAmp(); b.group.scale.setScalar(0.92); return b; }
   
     _comboAmp() {
       const T = this._THREE, g = new THREE.Group();
       const c = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.32), this._mat(0x181614));
       c.position.y = 0.28; g.add(c);
       const tolex = new THREE.Mesh(new THREE.BoxGeometry(0.67, 0.1, 0.34), this._mat(0xc9b46a, { metalness: 0.5 }));
       tolex.position.y = 0.52; g.add(tolex);
       return { group: g, radius: 0.7 };
     }
   
     _piano() {
       const g = new THREE.Group();
       /* placeholder procedurale: resta visibile finché il GLB non è pronto
          (e diventa il fallback definitivo se il file non si trova) */
       const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.15, 0.4),
         this._mat(0x0f0d0c, { roughness: 0.25, clearcoat: 0.6 }));
       body.position.y = 0.78; g.add(body);
       const keys = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.14), this._mat(0xf2ecdc, { roughness: 0.3 }));
       keys.position.set(0, 0.62, 0.24); g.add(keys);
       const bench = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.3), this._mat(0x1d1813));
       bench.position.set(0, 0.42, 0.75); g.add(bench);
   
       if (!this._pianoRequested) {
         this._pianoRequested = true;
         const url = this.getAttribute('piano-src') || 'assets/models/pianoforte.glb';
         loadGLB(url).then(gltf => {
           const m = gltf.scene;
           /* esportazioni Z-up (Sketchfab): se il modello è "sdraiato", raddrizza */
           let box = new THREE.Box3().setFromObject(m);
           let s = box.getSize(new THREE.Vector3());
           if (s.z > s.y * 1.15) { m.rotation.x = -Math.PI / 2; m.updateWorldMatrix(true, true); }
           box = new THREE.Box3().setFromObject(m);
           s = box.getSize(new THREE.Vector3());
           const k = 1.3 / Math.max(s.y, 0.001);          /* altezza finale 1.3 */
           m.scale.setScalar(k);
           m.position.set(
             -(box.min.x + box.max.x) / 2 * k,
             -box.min.y * k,
             -(box.min.z + box.max.z) / 2 * k);
           m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
           g.clear(); g.add(m); g.add(bench);   /* la panca procedurale resta */
         }).catch(err => console.warn('[mdv-diorama] pianoforte GLB non caricato, resto sul placeholder:', err));
       }
       return { group: g, radius: 1.05 };
     }
   
     _couch() {
       const T = this._THREE, g = new THREE.Group();
       const m = this._mat(0x8c1f28, { roughness: 0.8 });
       const seat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.35, 0.7), m);
       seat.position.y = 0.32; g.add(seat);
       const back = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 0.22), m);
       back.position.set(0, 0.72, -0.26); g.add(back);
       for (const sx of [-0.82, 0.82]) {
         const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.7), m);
         arm.position.set(sx, 0.62, 0); g.add(arm);
       }
       return { group: g, radius: 1.1 };
     }
   
     _micPair() {
       const T = this._THREE, g = new THREE.Group();
       for (const sx of [-0.3, 0.3]) {
         const st = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.35, 8), this._mat(0x555a5e, { metalness: 0.7 }));
         st.position.set(sx, 0.67, 0); g.add(st);
         const mic = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), this._mat(0x22201e, { metalness: 0.4 }));
         mic.scale.y = 1.5; mic.position.set(sx, 1.38, 0.02); g.add(mic);
         const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.03, 12), this._mat(0x33302c));
         base.position.set(sx, 0.02, 0); g.add(base);
       }
       return { group: g, radius: 0.75 };
     }
   
     /* ── interazioni ── */
     _wire() {
       let drag = null;
       this._on(this._canvas, 'pointerdown', (e) => {
         drag = { x: e.clientX, y: e.clientY, moved: false };
         this._canvas.setPointerCapture(e.pointerId);
       });
       this._on(this._canvas, 'pointermove', (e) => {
         this._pick(e);
         if (!drag) return;
         const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
         if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
         this._theta -= dx * 0.006; this._phi = Math.min(1.35, Math.max(0.55, this._phi - dy * 0.004));
         drag.x = e.clientX; drag.y = e.clientY;
         this._autoSpin = false;
         this._povTarget = 0; this._povProp = null;   /* il drag interrompe il focus POV */
       });
       this._on(this._canvas, 'pointerup', (e) => {
         if (drag && !drag.moved) this._click(e);
         drag = null;
         setTimeout(() => this._autoSpin = true, 6000);
       });
       this._on(this._canvas, 'wheel', (e) => {
         e.preventDefault();
         this._radius = Math.min(13, Math.max(5, this._radius + e.deltaY * 0.01));
       }, { passive: false });
       this._on(window, 'resize', () => this._resize());
       this._delegate('.dio-toggle button', (e, el) => { this._room = el.dataset.room; this._rebuildRoom(); });
       this._delegate('.dio-x', () => this._hideCard());
     }
   
     _ray(e) {
       const T = this._THREE;
       const rect = this._canvas.getBoundingClientRect();
       const ndc = new T.Vector2(
         ((e.clientX - rect.left) / rect.width) * 2 - 1,
         -((e.clientY - rect.top) / rect.height) * 2 + 1);
       const ray = new T.Raycaster();
       ray.setFromCamera(ndc, this._camera);
       return ray.intersectObjects(this._hotspots, false)[0] || null;
     }
   
     _pick(e) {
       const hit = this._ray(e);
       this._canvas.style.cursor = hit ? 'pointer' : 'grab';
       this._setHighlight(hit ? hit.object.userData.group : null);
     }
   
     _setHighlight(group) {
       if (this._highlight === group) return;
       if (this._highlight) this._highlight.traverse(o => {
         if (o.isMesh && o.userData._e !== undefined) { o.material.emissive.setHex(o.userData._e); }
       });
       this._highlight = group;
       if (group) group.traverse(o => {
         if (o.isMesh) {
           if (o.userData._e === undefined) o.userData._e = o.material.emissive ? o.material.emissive.getHex() : 0;
           if (o.material.emissive) o.material.emissive.setHex(0x3a2c10);
         }
       });
     }
   
     _click(e) {
       const hit = this._ray(e);
       if (!hit) { this._hideCard(); return; }
       const { prop } = hit.object.userData;
       this.shadowRoot.querySelector('.dio-card h4').textContent = prop.name;
       this.shadowRoot.querySelector('.dio-card p').textContent = prop.desc;
       this._card.classList.add('show');
       this._setHighlight(hit.object.userData.group);
   
       /* POV: strumenti con 'views' portano la camera su punti prestabiliti;
          ricliccare lo stesso strumento cicla alla vista successiva */
       if (prop.views && prop.views.length) {
         if (this._povProp !== prop.id) { this._povProp = prop.id; this._povIdx = 0; }
         else this._povIdx = (this._povIdx + 1) % prop.views.length;
         const v = prop.views[this._povIdx];
         const hp = hit.object.getWorldPosition(new THREE.Vector3());
         const th = this._theta + 0.55;
         this._povLook = new THREE.Vector3(hp.x, hp.y + (v.dy || 0), hp.z);
         this._povPos = new THREE.Vector3(
           hp.x + Math.sin(th) * v.dist, v.h, hp.z + Math.cos(th) * v.dist);
         this._povTarget = 1;
         this._autoSpin = false;
         this.shadowRoot.querySelector('.dio-tag').textContent =
           'POV ' + (this._povIdx + 1) + '/' + prop.views.length + ' · clicca ancora per la vista successiva';
       } else {
         this._povTarget = 0; this._povProp = null;
         this.shadowRoot.querySelector('.dio-tag').textContent = 'Scheda tecnica';
       }
       this._emit('diorama:select', { room: this._room, id: prop.id });
     }
   
     _hideCard() {
       this._card.classList.remove('show');
       this._setHighlight(null);
       this._povTarget = 0; this._povProp = null;
     }
   
     _resize() {
       const w = this.clientWidth || 800, h = this.clientHeight || 500;
       this._renderer.setSize(w, h, false);
       this._camera.aspect = w / h; this._camera.updateProjectionMatrix();
     }
   
     _loop(t) {
       this._raf = requestAnimationFrame(this._loop);
       if (this._autoSpin) this._theta += 0.0016;
       const cam = this._camera;
       cam.position.set(
         Math.sin(this._theta) * Math.sin(this._phi) * this._radius,
         Math.cos(this._phi) * this._radius + 1.2,
         Math.cos(this._theta) * Math.sin(this._phi) * this._radius);
       cam.lookAt(0, 0.9, 0);
       /* fusione morbida verso il POV dello strumento selezionato */
       this._povK = (this._povK || 0) + ((this._povTarget || 0) - (this._povK || 0)) * 0.06;
       if (this._povK > 0.002 && this._povPos) {
         const e = this._povK * this._povK * (3 - 2 * this._povK);
         cam.position.lerp(this._povPos, e);
         const lv = new THREE.Vector3(0, 0.9, 0).lerp(this._povLook, e);
         cam.lookAt(lv);
       }
       /* respiro delle luci */
       const s = t / 1000;
       this._accent.intensity = 26 + Math.sin(s * 1.7) * 6;
       this._renderer.render(this._scene, cam);
     }
   }
   
   console.info('%c mdv-diorama v2.1 — fix THREE module-scope attivo ', 'background:#25D366;color:#000;padding:2px 8px;border-radius:4px');
   customElements.define('mdv-diorama', MdvDiorama);
   