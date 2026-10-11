/* <mdv-model-3D> v3 — Gallo GLB per MDV.
   SOLO modello esterno: <mdv-model-3D src="assets/models/gallo.glb">
   - clip riconosciute per nome: walk / run / eat (crossfade automatici)
   - root motion rimosso dall'osso radice (walk-in-place)
   - camera cinematografica guidata dallo scroll: piano generale → occhio
   - librerie LOCALI da assets/libs (vedi tools/setup-libs.py), zero CDN */
   import { BaseElement } from '../shared/base-element.js';
   import { sheet } from '../shared/styles.js';
   
   const LIB = '../../assets/libs/three/';
   const model3D_STYLES = `
   :host { position: fixed; inset: 0; z-index: 0; display: block; pointer-events: none; }
   canvas { display: block; width: 100%; height: 100%; pointer-events: auto; cursor: grab; }
   canvas:active { cursor: grabbing; }
   .model-3D-vignette { position: absolute; inset: 0; pointer-events: none;
     background: radial-gradient(ellipse at 50% 60%, transparent 40%, rgba(10,8,6,.55) 100%); }
   `;
   
   let THREE = null;
   
   /* walk-in-place: azzera SOLO la traslazione XZ dell'osso radice */
   function stripRootMotion(clip, root) {
     if (!root) return clip;
     const prefix = root.name + '.position';
     const t = clip.tracks.find(t => t.name === prefix || t.name.endsWith('.' + prefix));
     if (!t) return clip;
     const v = t.values;
     let d = 0;
     for (let i = 3; i < v.length; i += 3) d += Math.abs(v[i] - v[0]) + Math.abs(v[i + 2] - v[2]);
     if (d / v.length < 0.005) return clip;
     for (let i = 3; i < v.length; i += 3) { v[i] = v[0]; v[i + 2] = v[2]; }
     return clip;
   }
   function findRootBone(model) {
     let root = null;
     model.traverse(o => {
       if (o.isBone && !(o.parent && o.parent.isBone) && !root) root = o;
     });
     return root;
   }
   
   class MdvModel3D extends BaseElement {
     constructor() {
       super();
       this._energy = 0; this._phase = 0; this._crow = 0;
       this._mouse = { x: 0.5, y: 0.5 };
       this._lastScroll = 0;
       this._running = true;
       this._zoomT = 0;
       this._modelOk = false;
     }
   
     async connectedCallback() {
       this.shadowRoot.adoptedStyleSheets = [sheet(model3D_STYLES)];
       this.shadowRoot.innerHTML = `<canvas></canvas><div class="model-3D-vignette"></div>`;
       this._canvas = this.shadowRoot.querySelector('canvas');
   
       THREE = await import(LIB + 'three.module.js');
       this._THREE = THREE;
       this._buildScene();
       await this._loadModel();
       this._buildCameraRig();
       this._wire();
       this._loop = this._loop.bind(this);
       this._raf = requestAnimationFrame(this._loop);
     }
   
     disconnectedCallback() { cancelAnimationFrame(this._raf); this._cleanup(); }
   
     async _loadModel() {
       const src = this.getAttribute('src');
       if (!src) { console.error('[mdv-model-3D] ATTRIBUTO src MANCANTE: <mdv-model-3D src="assets/models/gallo.glb">'); return; }
       try {
         const { GLTFLoader } = await import(LIB + 'GLTFLoader.js');
         const { DRACOLoader } = await import(LIB + 'DRACOLoader.js');
         const { MeshoptDecoder } = await import(LIB + 'meshopt_decoder.module.js');
         const loader = new GLTFLoader();
         loader.setDRACOLoader(new DRACOLoader().setDecoderPath('assets/libs/three/draco/gltf/'));
         loader.setMeshoptDecoder(MeshoptDecoder);
         const gltf = await loader.loadAsync(src);
         const model = gltf.scene;
   
         /* normalizza: bounding da ossa se skinnato, altrimenti da mesh */
         model.updateWorldMatrix(true, true);
         const bonePts = [];
         model.traverse(o => { if (o.isBone) bonePts.push(o.getWorldPosition(new THREE.Vector3())); });
         let center, size;
         if (bonePts.length >= 2) {
           center = bonePts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / bonePts.length);
           let r = 0.001;
           bonePts.forEach(p => { r = Math.max(r, p.distanceTo(center)); });
           size = r * 2.2;
         } else {
           const box = new THREE.Box3().setFromObject(model);
           size = Math.max(box.max.y - box.min.y, 0.001);
           center = box.getCenter(new THREE.Vector3());
         }
         const k = 1.3 / Math.max(size, 0.001);
         model.scale.setScalar(k);
         model.position.set(-center.x * k, -center.y * k + 0.55, -center.z * k);
         model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
         const rotY = parseFloat(this.getAttribute('rotation-y') || '0');
         if (rotY) model.rotation.y = rotY * Math.PI / 180;
   
         this._root = new THREE.Group();
         this._root.add(model);
         this._scene.add(this._root);   /* il modello va AGGIUNTO alla scena (era mancante) */
   
         /* animazioni: walk/run/eat per nome, walk-in-place */
         const rootBone = findRootBone(model);
         this._clips = (gltf.animations || []).map(c => stripRootMotion(c, rootBone));
         if (this._clips.length) {
           this._mixer = new THREE.AnimationMixer(model);
           const find = kw => this._clips.find(c => c.name.toLowerCase().includes(kw));
           this._actions = {
             walk: find('walk') ? this._mixer.clipAction(find('walk')) : null,
             run:  find('run')  ? this._mixer.clipAction(find('run'))  : null,
             eat:  find('eat')  ? this._mixer.clipAction(find('eat'))  : null,
           };
           if (!this._actions.walk && !this._actions.run) {
             this._actions.any = this._mixer.clipAction(this._clips[0]);
             this._actions.any.play();
           } else {
             Object.values(this._actions).forEach(a => { if (a) { a.play(); a.setEffectiveWeight(0); } });
             (this._actions.walk || this._actions.run).setEffectiveWeight(1);
           }
           if (this._actions.eat) {
             this._actions.eat.setLoop(THREE.LoopOnce, 1);
             this._actions.eat.clampWhenFinished = true;
           }
           this._eatTimer = 6 + Math.random() * 6;
           this._mixer.addEventListener('finished', (e) => {
             if (this._actions && e.action === this._actions.eat) {
               this._eating = false;
               e.action.fadeOut(0.4);
               if (this._actions.walk) this._actions.walk.fadeIn(0.4).setEffectiveWeight(1);
               if (this._actions.run) this._actions.run.fadeIn(0.4).setEffectiveWeight(0);
             }
           });
         }
         this._modelOk = true;
         this._emit('model-3D:model-loaded', { clips: this._clips.map(c => c.name) });
       } catch (err) {
         console.error('[mdv-model-3D] MODELLO NON CARICATO (controlla assets/models/gallo.glb e assets/libs/three/):', err);
       }
     }
   
     _buildScene() {
       const renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true, alpha: true });
       renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
       renderer.setSize(innerWidth, innerHeight);
       renderer.shadowMap.enabled = true;
       renderer.shadowMap.type = THREE.PCFSoftShadowMap;
       renderer.toneMapping = THREE.ACESFilmicToneMapping;
       renderer.toneMappingExposure = 1.12;
       this._renderer = renderer;
   
       this._scene = new THREE.Scene();
       this._scene.fog = new THREE.FogExp2(0x140f0c, 0.045);
       this._camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.02, 60);
   
       this._scene.add(new THREE.HemisphereLight(0xffe6c4, 0x1a1210, 0.85));
       const key = new THREE.DirectionalLight(0xffd9a0, 2.6);
       key.position.set(3, 5, 4);
       key.castShadow = true;
       key.shadow.mapSize.set(2048, 2048);
       key.shadow.camera.left = key.shadow.camera.bottom = -4;
       key.shadow.camera.right = key.shadow.camera.top = 4;
       this._scene.add(key);
       const rimP = new THREE.PointLight(0xff4b6f, 14, 14); rimP.position.set(-3.4, 1.6, -1.5); this._scene.add(rimP);
       const rimC = new THREE.PointLight(0x34c4fd, 10, 14); rimC.position.set(3.4, 0.9, -2.2); this._scene.add(rimC);
       const macro = new THREE.PointLight(0xfff2dd, 0, 3);
       macro.position.set(0.5, 1.2, 1.4); this._scene.add(macro);
       this._macroLight = macro;
   
       const floor = new THREE.Mesh(
         new THREE.PlaneGeometry(24, 24),
         new THREE.MeshStandardMaterial({ color: 0x241a14, roughness: 0.95 }));
       floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; this._scene.add(floor);
   
       this._blobShadow = new THREE.Mesh(
         new THREE.PlaneGeometry(2.6, 2.6),
         new THREE.MeshBasicMaterial({ map: this._contactShadowTexture(), transparent: true, depthWrite: false, opacity: 0.85 }));
       this._blobShadow.rotation.x = -Math.PI / 2;
       this._blobShadow.position.y = 0.012;
       this._scene.add(this._blobShadow);
   
       this._scene.add(this._dust());
     }
   
     _contactShadowTexture() {
       const c = document.createElement('canvas'); c.width = c.height = 128;
       const ctx = c.getContext('2d');
       const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
       g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
       ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
       return new THREE.CanvasTexture(c);
     }
   
     _dust() {
       const N = 220, pos = new Float32Array(N * 3);
       for (let i = 0; i < N; i++) {
         pos[i * 3] = (Math.random() - 0.5) * 14;
         pos[i * 3 + 1] = Math.random() * 4;
         pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
       }
       const g = new THREE.BufferGeometry();
       g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
       return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffca7a, size: 0.02, transparent: true, opacity: 0.55 }));
     }
   
     _buildCameraRig() {
       const V = (x, y, z) => new THREE.Vector3(x, y, z);
       this._camPath = new THREE.CatmullRomCurve3([
         V(0.45, 1.0, 4.7),     // 0.00 piano generale
         V(1.5, 1.2, 2.7),      // 0.38 mezzo
         V(0.55, 1.06, 1.2),    // 0.72 testa
         V(0.145, 0.985, 0.78), // 1.00 macro occhio
       ]);
       this._lookPath = new THREE.CatmullRomCurve3([
         V(0, 0.5, 0),
         V(0, 0.85, 0.45),
         V(0.05, 0.95, 0.58),
         V(0.075, 0.965, 0.64),
       ]);
     }
   
     _wire() {
       this._on(window, 'scroll', () => {
         const y = scrollY;
         const v = Math.abs(y - this._lastScroll);
         this._lastScroll = y;
         this._energy = Math.min(1, this._energy + v / 260);
       }, { passive: true });
       this._on(window, 'mousemove', (e) => {
         this._mouse.x = e.clientX / innerWidth;
         this._mouse.y = e.clientY / innerHeight;
       });
       this._on(this._canvas, 'pointerdown', () => { this._crow = 1; });
       this._on(window, 'resize', () => {
         this._camera.aspect = innerWidth / innerHeight;
         this._camera.updateProjectionMatrix();
         this._renderer.setSize(innerWidth, innerHeight);
       });
       const io = new IntersectionObserver(([en]) => {
         this._running = en.isIntersecting;
         if (this._running) this._raf = requestAnimationFrame(this._loop);
       });
       io.observe(this);
     }
   
     _loop(t) {
       if (!this._running) return;
       this._raf = requestAnimationFrame(this._loop);
       const dt = Math.min(0.05, (t - (this._pt || t)) / 1000); this._pt = t;
       const s = t / 1000;
   
       const P = Math.min(1, Math.max(0, scrollY / Math.max(1, innerHeight * 2.6)));
       const zt = P * P * (3 - 2 * P);
       this._zoomT = zt;
   
       this._energy *= Math.pow(0.12, dt);
       const E = this._energy * (1 - zt * 0.85);
       this._phase += dt * (3 + E * 11);
       const ph = this._phase;
       this._crow *= Math.pow(0.25, dt);
   
       if (this._modelOk) {
         const r = this._root;
         if (this._mixer) {
           this._mixer.update(dt);
           const A = this._actions || {};
           if (A.walk || A.run) {
             this._crow *= Math.pow(0.3, dt);
             const runW = A.run ? Math.max(Math.min(1, E * 1.5), this._crow) : 0;
             const walkW = (A.walk ? 1 : 0) * (1 - Math.min(1, runW));
             if (A.walk) A.walk.setEffectiveWeight(walkW * 0.9 + 0.1);
             if (A.run)  A.run.setEffectiveWeight(runW);
             this._hopY = (this._hopY || 0) + (this._crow * 0.12 - (this._hopY || 0)) * 0.18;
             r.position.y = this._hopY;
             r.rotation.x = -this._crow * 0.22;
             this._eatTimer -= dt * (1 + E * 4);
             if (A.eat && this._eatTimer <= 0 && E < 0.2) {
               A.eat.reset(); A.eat.setEffectiveWeight(1); A.eat.fadeIn(0.3);
               if (A.walk) A.walk.fadeOut(0.3);
               if (A.run) A.run.fadeOut(0.3);
               this._eating = true;
               this._eatTimer = 9 + Math.random() * 9;
             }
           } else if (A.any) {
             A.any.setEffectiveTimeScale(0.6 + E * 1.6);
           }
         } else {
           /* GLB senza animazioni: idle procedurale */
           r.rotation.z = Math.sin(s * 1.4) * 0.02 + E * Math.sin(ph) * 0.04;
           r.rotation.x = Math.sin(s * 0.9) * 0.012 - this._crow * 0.3;
           r.position.y = Math.abs(Math.sin(ph)) * 0.03 * E + Math.sin(s * 1.8) * 0.005;
           r.scale.y = 1 + Math.sin(s * 2.2) * 0.008 + this._crow * 0.03;
         }
       }
   
       const r = this._root;
       const rx = r ? r.position.x : 0;   /* modello assente: la camera resta sulla scena vuota */
       if (r) {
         r.position.x += ((0.35 - zt * 0.35) - r.position.x) * 0.05;
         r.rotation.y = -0.15 + (this._mouse.x - 0.5) * -0.25 * (1 - zt);
         this._blobShadow.position.x = r.position.x;
         const sc = 1 - r.position.y * 0.5;
         this._blobShadow.scale.set(sc, sc, 1);
         this._blobShadow.material.opacity = 0.85 * sc;
       }
   
       const camPos = this._camPath.getPoint(zt);
       const lookAt = this._lookPath.getPoint(zt);
       this._eatK = (this._eatK || 0) + ((this._eating ? 1 : 0) - (this._eatK || 0)) * 0.07;
       camPos.y -= 0.16 * this._eatK;
       camPos.z += 0.4 * this._eatK;
       lookAt.y -= 0.3 * this._eatK;
       const px = (this._mouse.x - 0.5) * 0.55 * (1 - zt * 0.85);
       const py = (0.5 - this._mouse.y) * 0.3 * (1 - zt * 0.85);
       const cam = this._camera;
       cam.position.set(rx + camPos.x + px, camPos.y + py, camPos.z);
       if (!this._camSm) {
         this._camSm = new THREE.Vector3(cam.position.x, cam.position.y, cam.position.z);
         this._lookSm = new THREE.Vector3(rx + lookAt.x, lookAt.y, lookAt.z);
       }
       const k = 1 - Math.pow(0.0001, dt);
       this._camSm.lerp(new THREE.Vector3(cam.position.x, cam.position.y, cam.position.z), k);
       this._lookSm.lerp(new THREE.Vector3(rx + lookAt.x, lookAt.y, lookAt.z), k * 1.15);
       cam.position.copy(this._camSm);
       cam.lookAt(this._lookSm);
       const fov = 38 - zt * 13;
       if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
       this._macroLight.intensity = zt * 6;
       this._macroLight.position.set(cam.position.x + 0.3, cam.position.y + 0.25, cam.position.z + 0.4);
       const vig = this.shadowRoot.querySelector('.model-3D-vignette');
       vig.style.opacity = (0.55 + zt * 0.45).toFixed(2);
   
       this._renderer.render(this._scene, cam);
     }
   }
   
   customElements.define('mdv-model-3D', MdvModel3D);
   