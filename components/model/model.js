/* <mdv-model> v5.7 - Swamp Lawn Grass + Slow Shooting Stars */
import { BaseElement } from '../shared/base-element.js';
import { sheet } from '../shared/styles.js';

const THREE_LIB_PATH = '../../assets/libs/three/';

const STYLES = `
:host {
  position: fixed; inset: 0; z-index: 0;
  display: block; pointer-events: none;
}
canvas {
  display: block; width: 100%; height: 100%;
  pointer-events: none; cursor: auto;
  opacity: 0; transition: opacity 1.8s ease-out;
}
canvas.ready { opacity: 1; }
.model-vignette {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at 50% 58%, transparent 35%, rgba(5, 7, 10, .58) 100%);
  opacity: .55;
}
`;

const TEXTURE_MAPS = {
  SRGB: ['map', 'emissiveMap', 'sheenColorMap', 'specularColorMap'],
  SAMPLED: ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap', 'sheenColorMap', 'sheenRoughnessMap', 'specularColorMap', 'specularIntensityMap'],
  LINEAR: ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap', 'sheenRoughnessMap', 'specularIntensityMap']
};

const CONFIG = {
  ANIMATION: {
    FADE_DEFAULT: 0.07,
    FADE_SLOW: 0.1,
    IDLE_DWELL: 2.2,
    MOVE_DWELL: 0.45,
    FORCE_RUN_DUR: 1.4,
    WALK_DWELL: 0.9,
    EAT_TIMER_BASE: 10,
    EAT_TIMER_VAR: 8
  },
  LIGHTS: {
    HEMI_SKY: 0x8aaccc, HEMI_GROUND: 0x1a2418, HEMI_INT: 0.68,
    MOON_COLOR: 0xa8c8e8, MOON_INT: 1.45,
    RIM_PINK: 0xff6b86, RIM_BLUE: 0x55cfff, MACRO_BLUE: 0xcde2ff
  },
  SCENE: {
    FOG_COLOR: 0x0a1410, FOG_DENSITY: 0.044,
    FLOOR_COLOR: 0x0d1508,
    MAX_SCROLL_DIVISOR: 3.2
  },
  GRASS: {
    BLADES_MOBILE: 12000, BLADES_DESKTOP: 48000,
    SEGMENTS: 4, HEIGHT: 0.24, WIDTH: 0.016, MAX_RADIUS: 16.0
  },
  STARS: { COUNT: 2600 },
  METEORS: { COUNT: 25 }
};

// Shader GLSL Chunks
const GRASS_UNIFORMS_GLSL = `
  uniform float uTime;
  uniform float uHeight;
`;

const GRASS_VERTEX_CHUNK = `
  #include <begin_vertex>

  #ifdef USE_INSTANCING
    vec3 iPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  #else
    vec3 iPos = vec3(0.0);
  #endif

  float hN   = clamp(position.y / uHeight, 0.0, 1.0);
  float bend = pow(hN, 1.6);
  float gust = 0.55 + 0.45 * sin(uTime * 0.28 + iPos.x * 0.08 + iPos.z * 0.07);
  float wave = sin(uTime * 1.55 + iPos.x * 0.85 + iPos.z * 0.70) * 0.55
             + sin(uTime * 2.90 + iPos.x * 1.9  - iPos.z * 1.4)  * 0.22
             + sin(uTime * 0.55 + iPos.z * 0.35) * 0.16;

  float amt = bend * gust * wave;
  transformed.x += amt * 0.07;
  transformed.z += amt * 0.05;
  transformed.x += sin(uTime * 6.0 + iPos.x * 11.0 + position.y * 40.0) * 0.0025 * bend;
`;

const STAR_VERTEX_SHADER = `
  attribute vec3  aColor;
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  uniform float uPR;
  varying vec3  vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    float tw = 0.60 + 0.40 * sin(uTime * (0.7 + aPhase * 0.13) + aPhase * 6.2831);
    vAlpha = tw;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position  = projectionMatrix * mv;
    gl_PointSize = aSize * uPR * 90.0 / max(0.001, -mv.z);
  }
`;

const STAR_FRAGMENT_SHADER = `
  varying vec3  vColor;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.02, d);
    a *= a;
    gl_FragColor = vec4(vColor * (0.7 + vAlpha * 0.6), a * vAlpha);
  }
`;

let THREE = null;

class MdvModel extends BaseElement {
  constructor() {
    super();
    this._running = true;
    this._disposed = false;
    this._quality = 'initial';
    
    this._energy = 0;
    this._lastScroll = 0;
    this._mouse = { x: 0.5, y: 0.5 };
    
    this._state = 'idle';
    this._stateTime = 0;
    this._sequence = null;
    this._sequenceActions = new Map();
    this._forceRunUntil = 0;
    this._walkUntil = 0;
    this._eatTimer = CONFIG.ANIMATION.EAT_TIMER_VAR;
    
    this._alphaMode = (this.getAttribute('alpha-mode') || 'auto').toLowerCase();
    this._camZ = parseFloat(this.getAttribute('cam-z') || '1');
    
    this._loop = this._loop.bind(this);
  }

  async connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [sheet(STYLES)];
    this.shadowRoot.innerHTML = `<canvas></canvas><div class="model-vignette"></div>`;
    this._canvas = this.shadowRoot.querySelector('canvas');

    THREE = await import(THREE_LIB_PATH + 'three.module.js');
    this._buildScene();

    await this._initializeModels();
    
    const heightScale = Math.max(0.05, (this._bodyHeight || 1.3) / 1.3);
    this._buildCameraRig(heightScale);
    this._wireEvents();

    this._rafId = requestAnimationFrame(this._loop);
  }

  disconnectedCallback() {
    this._disposed = true;
    cancelAnimationFrame(this._rafId);
    if (this._io) { this._io.disconnect(); this._io = null; }
    this._cleanup();
  }

  async _initializeModels() {
    const lowSrc = this.getAttribute('src-low');
    const highSrc = this.getAttribute('src');
    let loaded = false;

    if (lowSrc) {
      loaded = await this._loadModel(lowSrc, 'low');
      if (loaded && highSrc && highSrc !== lowSrc) this._upgradeToHighQuality(highSrc);
    } else {
      loaded = await this._loadModel(highSrc, 'high');
    }

    if (loaded) {
      this._setupAnimationStateMachine();
      this._transitionToState('idle', true);
      this._renderer.compile(this._scene, this._camera);
      
      requestAnimationFrame(() => requestAnimationFrame(() => {
        this._canvas.classList.add('ready');
      }));
    }
  }

  async _createLoader() {
    const { GLTFLoader } = await import(THREE_LIB_PATH + 'GLTFLoader.js');
    const { DRACOLoader } = await import(THREE_LIB_PATH + 'DRACOLoader.js');
    const { MeshoptDecoder } = await import(THREE_LIB_PATH + 'meshopt_decoder.module.js');

    const loader = new GLTFLoader();
    const draco = new DRACOLoader().setDecoderPath('assets/libs/three/draco/gltf/');
    loader.setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);

    try {
      const { KTX2Loader } = await import(THREE_LIB_PATH + 'KTX2Loader.js');
      const ktx2 = new KTX2Loader().setTranscoderPath(THREE_LIB_PATH + 'basis/').detectSupport(this._renderer);
      loader.setKTX2Loader(ktx2);
    } catch (err) {
      // Fallback
    }
    return loader;
  }

  async _loadModel(src, quality = 'high') {
    if (!src) return false;
    try {
      const loader = await this._createLoader();
      const gltf = await loader.loadAsync(src);
      if (this._disposed) return false;

      const model = gltf.scene;
      model.updateWorldMatrix(true, true);

      this._processModelGeometry(model);
      this._processModelMaterials(model);
      this._applyModelTransformations(model);
      this._findBones(model);
      this._setupModelHierarchyAndAnimation(model, gltf.animations, quality);

      return true;
    } catch (err) {
      console.error(`[mdv-model] Error loading ${quality} model:`, err);
      return false;
    }
  }

  async _upgradeToHighQuality(src) {
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (this._disposed) return;
    
    const loaded = await this._loadModel(src, 'high');
    if (!loaded) return;

    this._performHighQualitySwap();
    this._clips = this._highClips || [];
    this._mixer = this._highMixer || null;
    this._sequence = null; 
    this._sequenceActions.clear();

    if (this._mixer) { 
      this._setupAnimationStateMachine(); 
      this._transitionToState(this._state || 'idle', true); 
    }
  }

  _performHighQualitySwap() {
    if (!this._highModel || !this._lowModel) return;
    this._highModel.visible = true;
    this._root.remove(this._lowModel);
    this._disposeObject(this._lowModel);
    this._lowModel = null;
    this._quality = 'high';
  }

  _processModelGeometry(model) {
    const box = new THREE.Box3().setFromObject(model);
    const boxSize = box.getSize(new THREE.Vector3());
    const boxExtent = Math.max(boxSize.x, boxSize.y, boxSize.z);

    const boneNames = [];
    const bonePoints = [];
    model.traverse(obj => {
      if (obj.isBone) {
        boneNames.push(obj.name);
        bonePoints.push(obj.getWorldPosition(new THREE.Vector3()));
      }
    });

    let nonIkIndices = boneNames.map((n, i) => i).filter(i => !/ik/i.test(boneNames[i]));
    if (nonIkIndices.length < 2) nonIkIndices = boneNames.map((_, i) => i);
    const filteredPoints = nonIkIndices.map(i => bonePoints[i]);

    const min = new THREE.Vector3(1e9, 1e9, 1e9);
    const max = new THREE.Vector3(-1e9, -1e9, -1e9);
    const centerSum = new THREE.Vector3();
    
    filteredPoints.forEach(p => { min.min(p); max.max(p); centerSum.add(p); });
    centerSum.multiplyScalar(1 / Math.max(1, filteredPoints.length));

    const extent = filteredPoints.length >= 2 ? Math.max(max.x - min.x, max.y - min.y, max.z - min.z, 0.001) : Math.max(boxExtent, 0.001);
    const scaleFactor = parseFloat(this.getAttribute('height') || '1.3') / extent;
    const center = box.getCenter(new THREE.Vector3());
    
    if (filteredPoints.length >= 2) { center.x = centerSum.x; center.z = centerSum.z; }

    model.scale.setScalar(scaleFactor);
    model.position.set(-center.x * scaleFactor, -min.y * scaleFactor + 0.02, -center.z * scaleFactor);
    this._bodyHeight = (filteredPoints.length >= 2 ? max.y - min.y : boxSize.y) * scaleFactor;
  }

  _processModelMaterials(model) {
    const maxAnisotropy = Math.min(8, this._renderer.capabilities.getMaxAnisotropy());

    model.traverse(obj => {
      if (!obj.isMesh) return;
      obj.castShadow = true; obj.receiveShadow = true; obj.frustumCulled = true;

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach(mat => {
        if (!mat) return;
        
        TEXTURE_MAPS.SAMPLED.forEach(key => {
          if (mat[key]) { mat[key].anisotropy = maxAnisotropy; mat[key].generateMipmaps = true; }
        });
        TEXTURE_MAPS.SRGB.forEach(key => {
          if (mat[key] && mat[key].colorSpace !== THREE.SRGBColorSpace) { mat[key].colorSpace = THREE.SRGBColorSpace; mat[key].needsUpdate = true; }
        });
        TEXTURE_MAPS.LINEAR.forEach(key => {
          if (mat[key] && mat[key].colorSpace !== THREE.NoColorSpace) { mat[key].colorSpace = THREE.NoColorSpace; mat[key].needsUpdate = true; }
        });

        const hardCutout = mat.alphaTest > 0;
        const hasMap = !!(mat.map || mat.alphaMap);
        
        if (hardCutout || (mat.transparent && hasMap)) {
          let mode = this._alphaMode === 'auto' ? (this._msaa ? 'coverage' : (hardCutout ? 'test' : 'hash')) : this._alphaMode;
          mat.alphaToCoverage = (mode === 'coverage');
          mat.alphaHash = (mode === 'hash');
          mat.alphaTest = (mode === 'test' || (mode === 'auto' && hardCutout)) ? (mat.alphaTest > 0 ? mat.alphaTest : 0.5) : 0;
          mat.transparent = false; 
          mat.depthWrite = true;
        }
        
        if (mat.side === THREE.FrontSide) mat.side = THREE.DoubleSide;
        mat.needsUpdate = true;
      });
    });
  }

  _applyModelTransformations(model) {
    const rotY = parseFloat(this.getAttribute('rotation-y') || '0') + parseFloat(this.getAttribute('face') || '0');
    if (rotY) model.rotation.y = rotY * Math.PI / 180;
  }

  _findBones(model) {
    this._headBone = null;
    let highestBone = null, highestY = -1e9;
    
    model.traverse(obj => {
      if (!obj.isBone) return;
      if (!this._headBone && /head|skull|jaw|nose|cervix|neck\d/i.test(obj.name)) this._headBone = obj;
      
      const y = obj.getWorldPosition(new THREE.Vector3()).y;
      if (y > highestY) { highestY = y; highestBone = obj; }
    });
    
    if (!this._headBone) this._headBone = highestBone;
  }

  _setupModelHierarchyAndAnimation(model, clips, quality) {
    if (!this._root) { 
      this._root = new THREE.Group(); 
      this._scene.add(this._root); 
    }
    
    if (quality === 'low') {
      this._lowModel = model;
      this._root.add(model);
      this._lowMixer = clips.length ? new THREE.AnimationMixer(model) : null;
      this._lowClips = clips;
    } else {
      this._highModel = model;
      this._root.add(model);
      if (this._lowModel) model.visible = false;
      this._highMixer = clips.length ? new THREE.AnimationMixer(model) : null;
      this._highClips = clips;
    }

    if (!this._mixer && clips.length) { 
      this._mixer = new THREE.AnimationMixer(model); 
      this._clips = clips; 
    }
    
    if (quality === 'high' && this._lowModel && this._lowModel !== model) {
      this._performHighQualitySwap();
    }
  }

  _setupAnimationStateMachine() {
    const lowerName = clip => clip.name.toLowerCase();
    const pickAll = kw => this._clips.filter(c => lowerName(c).includes(kw) && !/start|end/.test(lowerName(c)));
    const pickOne = kw => this._clips.filter(c => lowerName(c).includes(kw));

    this._animSets = {
      idle: pickAll('idle'),
      walkIn: pickOne('walk').filter(c => /start/.test(lowerName(c))),
      walk: pickAll('walk'),
      walkOut: pickOne('walk').filter(c => /end/.test(lowerName(c))),
      runIn: pickOne('run').filter(c => /start/.test(lowerName(c))),
      run: pickAll('run'),
      runOut: pickOne('run').filter(c => /end/.test(lowerName(c))),
      eat: pickAll('eat')
    };

    if (!this._animSets.idle.length && !this._animSets.walk.length && this._clips.length) {
      const fallback = [this._clips[0]];
      this._animSets.idle = fallback;
      this._animSets.walk = fallback;
      this._animSets.run = fallback;
    }
  }

  _transitionToState(newState, force = false) {
    if (newState === this._state && !force) return;
    if (!this._animSets) return;

    const prevState = this._state;
    this._state = newState; 
    this._stateTime = this._currentTimeSec || 0;

    const loops = { idle: this._animSets.idle, walk: this._animSets.walk, run: this._animSets.run };
    const ins = { walk: this._animSets.walkIn, run: this._animSets.runIn };
    const outs = { walk: this._animSets.walkOut, run: this._animSets.runOut };

    const playLoop = () => this._playSequence(loops[newState], { loop: true, fade: 0.06 });

    if (newState === 'idle' && (prevState === 'walk' || prevState === 'run') && outs[prevState]?.length) {
      this._playSequence(outs[prevState], { onEnd: playLoop, fade: CONFIG.ANIMATION.FADE_SLOW });
    } else if (prevState === 'idle' && ins[newState]?.length) {
      this._playSequence(ins[newState], { onEnd: playLoop, fade: CONFIG.ANIMATION.FADE_SLOW });
    } else { 
      playLoop(); 
    }
  }

  _playSequence(clips, { loop = false, fade = CONFIG.ANIMATION.FADE_DEFAULT, onEnd = null } = {}) {
    if (!clips?.length) { 
      if (onEnd) onEnd(); 
      return null; 
    }
    this._sequence = { clips, currentIndex: 0, loop, onEnd, prevAction: null, fade };
    this._advanceSequence(fade, true);
    return this._sequence;
  }

  _advanceSequence(fade = CONFIG.ANIMATION.FADE_DEFAULT, isFirst = false) {
    const seq = this._sequence; 
    if (!seq) return;
    
    const clip = seq.clips[seq.currentIndex];
    let action = this._sequenceActions.get(clip);

    if (!action) { 
      action = this._mixer.clipAction(clip); 
      this._sequenceActions.set(clip, action); 
    }
    
    const prevAction = seq.prevAction;
    action.reset().setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.setEffectiveWeight(1).play();

    if (!isFirst && prevAction) action.crossFadeFrom(prevAction, fade, false);
    if (this._lastAction && this._lastAction !== action && this._lastAction !== prevAction) {
      this._lastAction.fadeOut(fade);
    }

    seq.prevAction = action; 
    this._lastAction = action; 
    this._headSwayBase = null;
  }

  _updateSequence() {
    const seq = this._sequence; 
    if (!seq?.prevAction) return;
    
    const action = seq.prevAction;
    if (action.time < Math.max(0, action.getClip().duration - 0.02)) return;

    seq.currentIndex++;
    if (seq.currentIndex >= seq.clips.length) {
      if (seq.loop) { 
        seq.currentIndex = 0; 
        this._advanceSequence(seq.fade, false); 
      } else { 
        const callback = seq.onEnd; 
        this._sequence = null; 
        if (callback) callback(); 
      }
    } else { 
      this._advanceSequence(seq.fade, false); 
    }
  }

  _buildScene() {
    this._setupRenderer();
    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(CONFIG.SCENE.FOG_COLOR, CONFIG.SCENE.FOG_DENSITY);
    this._camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.02, 60);

    this._setupLights();
    this._buildFloor();
    this._buildGrass();
    this._buildStarField();
    this._buildShootingStars();
  }

  _setupRenderer() {
    this._renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    this._renderer.setSize(innerWidth, innerHeight, false);
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('outputColorSpace' in this._renderer) this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.12;

    const gl = this._renderer.getContext();
    this._msaaSamples = typeof gl.SAMPLES !== 'undefined' ? gl.getParameter(gl.SAMPLES) | 0 : 0;
    this._msaa = this._msaaSamples > 1;
  }

  _setupLights() {
    this._scene.add(new THREE.HemisphereLight(CONFIG.LIGHTS.HEMI_SKY, CONFIG.LIGHTS.HEMI_GROUND, CONFIG.LIGHTS.HEMI_INT));
    
    const moon = new THREE.DirectionalLight(CONFIG.LIGHTS.MOON_COLOR, CONFIG.LIGHTS.MOON_INT);
    moon.position.set(-4, 7, 3);
    moon.castShadow = true; 
    moon.shadow.mapSize.set(1536, 1536);
    moon.shadow.camera.left = -4; moon.shadow.camera.bottom = -4; moon.shadow.camera.right = 4; moon.shadow.camera.top = 4;
    this._scene.add(moon);

    const rimPink = new THREE.PointLight(CONFIG.LIGHTS.RIM_PINK, 7, 14); 
    rimPink.position.set(-3.4, 1.6, -1.5); 
    this._scene.add(rimPink);
    
    const rimBlue = new THREE.PointLight(CONFIG.LIGHTS.RIM_BLUE, 6, 14); 
    rimBlue.position.set(3.4, 0.9, -2.2); 
    this._scene.add(rimBlue);
    
    this._macroLight = new THREE.PointLight(CONFIG.LIGHTS.MACRO_BLUE, 0, 4); 
    this._macroLight.position.set(0.5, 1.2, 1.4); 
    this._scene.add(this._macroLight);
  }

  _buildFloor() {
    const floorAlpha = new THREE.CanvasTexture(this._generateRadialGradientCanvas(512, 250, [
      { stop: 0, color: 'rgba(255,255,255,1)' },
      { stop: 0.5, color: 'rgba(255,255,255,0.85)' },
      { stop: 0.8, color: 'rgba(255,255,255,0.2)' },
      { stop: 1, color: 'rgba(255,255,255,0)' }
    ]));

    const floorMat = new THREE.MeshStandardMaterial({
      color: CONFIG.SCENE.FLOOR_COLOR, roughness: 0.99, metalness: 0.0,
      alphaMap: floorAlpha, transparent: true, depthWrite: false
    });
    this._floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), floorMat);
    this._floor.rotation.x = -Math.PI / 2; 
    this._floor.receiveShadow = true;
    this._floor.frustumCulled = false;
    this._scene.add(this._floor);

    const shadowTex = new THREE.CanvasTexture(this._generateRadialGradientCanvas(128, 60, [
      { stop: 0, color: 'rgba(0,0,0,0.8)' },
      { stop: 1, color: 'rgba(0,0,0,0)' }
    ]));
    this._blobShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6), 
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.8 })
    );
    this._blobShadow.rotation.x = -Math.PI / 2; 
    this._blobShadow.position.y = 0.012;
    this._blobShadow.frustumCulled = false;
    this._scene.add(this._blobShadow);
  }

  _generateRadialGradientCanvas(size, radius, stops) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const center = size / 2;
    const gradient = ctx.createRadialGradient(center, center, 10, center, center, radius);
    stops.forEach(s => gradient.addColorStop(s.stop, s.color));
    ctx.fillStyle = gradient; 
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }

  _buildGrass() {
    const isMobile = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
    const totalBlades = isMobile ? CONFIG.GRASS.BLADES_MOBILE : CONFIG.GRASS.BLADES_DESKTOP;
    
    const bladeGeom = this._createGrassGeometry();
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, vertexColors: true,
      roughness: 0.78, metalness: 0.0, side: THREE.DoubleSide
    });

    bladeMat.onBeforeCompile = shader => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uHeight = { value: CONFIG.GRASS.HEIGHT };
      this._grassUniforms = shader.uniforms;

      shader.vertexShader = GRASS_UNIFORMS_GLSL + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', GRASS_VERTEX_CHUNK);
    };

    this._grassBlades = new THREE.InstancedMesh(bladeGeom, bladeMat, totalBlades);
    this._grassBlades.frustumCulled = false;
    this._grassBlades.receiveShadow = true;
    this._grassBlades.castShadow = false;

    this._distributeGrassInstances(totalBlades, isMobile);
    this._scene.add(this._grassBlades);
  }

  _createGrassGeometry() {
    const pos = [], uvs = [], cols = [], idx = [];
    const tmpColor = new THREE.Color();
    const cBase = new THREE.Color(0.14, 0.20, 0.12);
    const cMid = new THREE.Color(0.42, 0.55, 0.34);
    const cTip = new THREE.Color(0.72, 0.85, 0.55);

    for (let i = 0; i <= CONFIG.GRASS.SEGMENTS; i++) {
      const t = i / CONFIG.GRASS.SEGMENTS;
      const y = t * CONFIG.GRASS.HEIGHT;
      const z = Math.pow(t, 2.2) * 0.045;
      const w = CONFIG.GRASS.WIDTH * 0.5 * (1 - Math.pow(t, 1.3)) + 0.0005;
      
      pos.push(-w, y, z, w, y, z);
      uvs.push(0, t, 1, t);
      
      if (t < 0.55) tmpColor.copy(cBase).lerp(cMid, t / 0.55);
      else tmpColor.copy(cMid).lerp(cTip, (t - 0.55) / 0.45);
      
      cols.push(tmpColor.r, tmpColor.g, tmpColor.b, tmpColor.r, tmpColor.g, tmpColor.b);
    }
    
    for (let i = 0; i < CONFIG.GRASS.SEGMENTS; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }

    const geom = new THREE.BufferGeometry();
    geom.setIndex(idx);
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geom.computeVertexNormals();
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);
    return geom;
  }

  _distributeGrassInstances(totalBlades, isMobile) {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const largeClusterCount = isMobile ? 40 : 75;
    const smallClusterCount = isMobile ? 100 : 200;
    
    const buildClusters = (count, radiusFn) => Array.from({ length: count }, () => {
      const dist = Math.sqrt(Math.random()) * CONFIG.GRASS.MAX_RADIUS * 0.95;
      const angle = Math.random() * Math.PI * 2;
      return [Math.cos(angle) * dist, Math.sin(angle) * dist, radiusFn()];
    });

    const largeClusters = buildClusters(largeClusterCount, () => 1.8 + Math.random() * 2.2);
    const smallClusters = buildClusters(smallClusterCount, () => 0.4 + Math.random() * 0.8);

    for (let i = 0; i < totalBlades; i++) {
      let x, z;
      const rand = Math.random();
      
      if (rand < 0.45) {
        const cluster = largeClusters[(Math.random() * largeClusterCount) | 0];
        const angle = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.6) * cluster[2];
        x = cluster[0] + Math.cos(angle) * r;
        z = cluster[1] + Math.sin(angle) * r;
      } else if (rand < 0.75) {
        const cluster = smallClusters[(Math.random() * smallClusterCount) | 0];
        const angle = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.6) * cluster[2];
        x = cluster[0] + Math.cos(angle) * r;
        z = cluster[1] + Math.sin(angle) * r;
      } else {
        const dist = Math.sqrt(Math.random()) * CONFIG.GRASS.MAX_RADIUS;
        const angle = Math.random() * Math.PI * 2;
        x = Math.cos(angle) * dist;
        z = Math.sin(angle) * dist;
      }

      let distCenter = Math.hypot(x, z);
      if (distCenter > CONFIG.GRASS.MAX_RADIUS) {
        const clampK = CONFIG.GRASS.MAX_RADIUS / distCenter;
        x *= clampK; z *= clampK; distCenter = CONFIG.GRASS.MAX_RADIUS;
      }

      dummy.position.set(x, 0, z);
      dummy.rotation.set((Math.random() - 0.5) * 0.30, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.30);
      
      const radialScale = Math.max(0.30, 1 - Math.pow(distCenter / CONFIG.GRASS.MAX_RADIUS, 3.0));
      const scaleY = (0.85 + Math.random() * 0.35) * radialScale;
      const scaleXZ = (0.85 + Math.random() * 0.40);
      dummy.scale.set(scaleXZ, scaleY, scaleXZ);
      dummy.updateMatrix();
      this._grassBlades.setMatrixAt(i, dummy.matrix);

      color.setHSL(...this._getRandomGrassHSL());
      this._grassBlades.setColorAt(i, color);
    }
    
    this._grassBlades.instanceMatrix.needsUpdate = true;
    if (this._grassBlades.instanceColor) this._grassBlades.instanceColor.needsUpdate = true;
  }

  _getRandomGrassHSL() {
    const pick = Math.random();
    if (pick < 0.55) return [0.20 + (Math.random() - 0.5) * 0.045, 0.30 + Math.random() * 0.20, 0.20 + Math.random() * 0.14];
    if (pick < 0.80) return [0.16 + (Math.random() - 0.5) * 0.03, 0.38 + Math.random() * 0.20, 0.22 + Math.random() * 0.14];
    if (pick < 0.92) return [0.28 + (Math.random() - 0.5) * 0.03, 0.25 + Math.random() * 0.18, 0.16 + Math.random() * 0.10];
    return [0.10 + (Math.random() - 0.5) * 0.03, 0.28 + Math.random() * 0.18, 0.14 + Math.random() * 0.10];
  }

  _buildStarField() {
    const pos = new Float32Array(CONFIG.STARS.COUNT * 3);
    const colArr = new Float32Array(CONFIG.STARS.COUNT * 3);
    const size = new Float32Array(CONFIG.STARS.COUNT);
    const phase = new Float32Array(CONFIG.STARS.COUNT);
    const tempColor = new THREE.Color();

    for (let i = 0; i < CONFIG.STARS.COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.02 + Math.random() * 0.98);
      const radius = 30 + Math.random() * 22;

      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      pos[i * 3 + 1] = Math.cos(phi) * radius;
      pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;

      const randColor = Math.random();
      if (randColor > 0.90) tempColor.setHex(0xa8ccff);
      else if (randColor > 0.72) tempColor.setHex(0xffe0b0);
      else if (randColor > 0.60) tempColor.setHex(0xffd0d0);
      else tempColor.setHex(0xffffff);
      
      tempColor.multiplyScalar(0.55 + Math.random() * 0.45);
      tempColor.toArray(colArr, i * 3);

      size[i] = 0.6 + Math.pow(Math.random(), 3) * 2.6;
      phase[i] = Math.random() * 100;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colArr, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 120);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPR: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: STAR_VERTEX_SHADER,
      fragmentShader: STAR_FRAGMENT_SHADER,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    });

    this._starUniforms = mat.uniforms;
    this._stars = new THREE.Points(geo, mat);
    this._stars.frustumCulled = false;
    this._scene.add(this._stars);
  }

  _buildShootingStars() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const tailGradient = ctx.createLinearGradient(0, 0, 256, 0);
    tailGradient.addColorStop(0.00, 'rgba(255,255,255,0)');
    tailGradient.addColorStop(0.35, 'rgba(200,220,255,0.10)');
    tailGradient.addColorStop(0.70, 'rgba(220,235,255,0.40)');
    tailGradient.addColorStop(0.92, 'rgba(255,255,255,0.95)');
    tailGradient.addColorStop(1.00, 'rgba(255,255,255,1)');
    ctx.fillStyle = tailGradient; 
    ctx.fillRect(0, 0, 256, 64);

    ctx.globalCompositeOperation = 'destination-in';
    const falloffGradient = ctx.createLinearGradient(0, 0, 0, 64);
    falloffGradient.addColorStop(0.0, 'rgba(0,0,0,0)');
    falloffGradient.addColorStop(0.5, 'rgba(0,0,0,1)');
    falloffGradient.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = falloffGradient; 
    ctx.fillRect(0, 0, 256, 64);
    
    ctx.globalCompositeOperation = 'source-over';
    const headGradient = ctx.createRadialGradient(244, 32, 0, 244, 32, 10);
    headGradient.addColorStop(0, 'rgba(255,255,255,1)');
    headGradient.addColorStop(0.5, 'rgba(230,240,255,0.55)');
    headGradient.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = headGradient; 
    ctx.fillRect(0, 0, 256, 64);

    this._meteorTex = new THREE.CanvasTexture(canvas);
    this._meteorTex.colorSpace = THREE.SRGBColorSpace;
    this._meteorGeo = new THREE.PlaneGeometry(1, 1);
    this._meteors = [];

    for (let i = 0; i < CONFIG.METEORS.COUNT; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: this._meteorTex, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
        fog: false, side: THREE.DoubleSide, toneMapped: false
      });
      const mesh = new THREE.Mesh(this._meteorGeo, mat);
      mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 100;
      this._scene.add(mesh);

      this._meteors.push({
        mesh, time: 0, duration: 1, delay: 0.25 + i * 0.45,
        from: new THREE.Vector3(), to: new THREE.Vector3(), dir: new THREE.Vector3(),
        len: 2.4, thickness: 0.14
      });
    }
  }

  _spawnMeteor(meteor) {
    const radius = 32 + Math.random() * 8;
    const azimuth = -Math.PI * 0.5 + (Math.random() - 0.5) * 2.4;
    const elevation = 0.35 + Math.random() * 0.60;

    const from = new THREE.Vector3(
      Math.cos(elevation) * Math.cos(azimuth),
      Math.sin(elevation),
      Math.cos(elevation) * Math.sin(azimuth)
    ).multiplyScalar(radius);

    const up = from.clone().normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), up);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();

    const sign = Math.random() < 0.5 ? 1 : -1;
    const dir = right.clone().multiplyScalar(sign);
    dir.y -= 0.20 + Math.random() * 0.25;
    dir.normalize();

    const travelDistance = 6 + Math.random() * 5;

    meteor.from.copy(from);
    meteor.to.copy(from).addScaledVector(dir, travelDistance);
    meteor.dir.copy(dir);
    meteor.time = 0;
    meteor.duration = 1.8 + Math.random() * 1.4;
    meteor.len = 2.0 + Math.random() * 1.6;
    meteor.thickness = 0.10 + Math.random() * 0.08;
    meteor.mesh.visible = true;
    meteor.mesh.position.copy(from);
    meteor.mesh.material.opacity = 0;
  }

  _updateMeteors(deltaTime) {
    if (!this._meteors) return;
    const camPos = this._camera.position;

    for (const meteor of this._meteors) {
      if (!meteor.mesh.visible) {
        meteor.delay -= deltaTime;
        if (meteor.delay <= 0) this._spawnMeteor(meteor);
        continue;
      }

      meteor.time += deltaTime;
      const progress = meteor.time / meteor.duration;

      if (progress >= 1) {
        meteor.mesh.visible = false;
        meteor.mesh.material.opacity = 0;
        meteor.delay = 0.5 + Math.random() * 1.5;
        continue;
      }

      const easedProgress = progress * progress * (3 - 2 * progress);
      meteor.mesh.position.lerpVectors(meteor.from, meteor.to, easedProgress);
      meteor.mesh.position.addScaledVector(meteor.dir, -meteor.len * 0.5);

      meteor.mesh.material.opacity = Math.min(1, progress * 6) * Math.min(1, (1 - progress) * 3.5);

      const camToMeteor = camPos.clone().sub(meteor.mesh.position).normalize();
      const xAxis = meteor.dir.clone().addScaledVector(camToMeteor, -meteor.dir.dot(camToMeteor));
      if (xAxis.lengthSq() < 1e-6) xAxis.set(1, 0, 0);
      xAxis.normalize();
      
      const yAxis = new THREE.Vector3().crossVectors(camToMeteor, xAxis).normalize();
      const rotationMatrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, camToMeteor);
      
      meteor.mesh.quaternion.setFromRotationMatrix(rotationMatrix);
      meteor.mesh.scale.set(meteor.len, meteor.thickness, 1);
    }
  }

  _buildCameraRig(heightScale) {
    const headY = this.hasAttribute('head-y') ? parseFloat(this.getAttribute('head-y')) : 0.965 * heightScale;
    
    const makeCamPoint = (x, y, z) => new THREE.Vector3(x, y * heightScale, z * this._camZ);
    const makeLookPoint = (x, y, z) => new THREE.Vector3(x, y * heightScale, z * heightScale);

    this._camPath = new THREE.CatmullRomCurve3([
      makeCamPoint(0.45, 1.0, 4.7), makeCamPoint(1.5, 1.2, 2.7),
      makeCamPoint(0.55, 1.06, 1.2), makeCamPoint(0.145, 0.985, 0.78)
    ]);
    
    this._lookPath = new THREE.CatmullRomCurve3([
      makeLookPoint(0, 0.5, 0), makeLookPoint(0, 0.85, 0.45),
      makeLookPoint(0.05, 0.95, 0.58), makeLookPoint(0.075, headY, 0.64)
    ]);
  }

  _wireEvents() {
    this._on(window, 'scroll', () => {
      const scrollVelocity = Math.abs(scrollY - this._lastScroll);
      this._lastScroll = scrollY;
      this._energy = Math.min(1, this._energy + scrollVelocity / 170);
    }, { passive: true });

    this._on(window, 'mousemove', e => { 
      this._mouse.x = e.clientX / innerWidth; 
      this._mouse.y = e.clientY / innerHeight; 
    });
    
    this._on(window, 'pointerdown', () => { 
      this._forceRunUntil = (this._currentTimeSec || 0) + CONFIG.ANIMATION.FORCE_RUN_DUR; 
    });
    
    this._on(window, 'resize', () => {
      this._camera.aspect = innerWidth / innerHeight; 
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(innerWidth, innerHeight, false);
      if (this._starUniforms) this._starUniforms.uPR.value = Math.min(window.devicePixelRatio || 1, 2);
    });

    this._io = new IntersectionObserver(([entry]) => {
      this._running = entry.isIntersecting;
      if (this._running) this._rafId = requestAnimationFrame(this._loop);
    });
    this._io.observe(this);
  }

  _loop(timeMs) {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(this._loop);

    const deltaTime = Math.min(0.05, (timeMs - (this._prevTimeMs || timeMs)) / 1000);
    this._prevTimeMs = timeMs;
    this._currentTimeSec = timeMs / 1000;

    const rawScrollProgress = Math.min(1, Math.max(0, scrollY / Math.max(1, innerHeight * CONFIG.SCENE.MAX_SCROLL_DIVISOR)));
    const easedScrollProgress = rawScrollProgress * rawScrollProgress * (3 - 2 * rawScrollProgress);
    
    this._energy *= Math.pow(0.27, deltaTime);
    const scrollAdjustedEnergy = this._energy * (1 - easedScrollProgress * 0.85);

    this._updateShaders();
    this._updateAnimations(deltaTime, scrollAdjustedEnergy);
    this._updateModelTransform(easedScrollProgress);
    this._updateCameraRig(easedScrollProgress, deltaTime);
    this._updateMeteors(deltaTime);
    this._updateQuality(deltaTime);

    this._renderer.render(this._scene, this._camera);
  }

  _updateShaders() {
    if (this._grassUniforms) this._grassUniforms.uTime.value = this._currentTimeSec;
    if (this._starUniforms) this._starUniforms.uTime.value = this._currentTimeSec;
  }

  _updateAnimations(deltaTime, energy) {
    if (!this._mixer) return;
    
    this._mixer.update(deltaTime);
    this._updateSequence();

    if (this._headBone) {
      const calmFactor = this._state === 'idle' ? 1 : 0.3;
      if (!this._headSwayBase) this._headSwayBase = { y: this._headBone.rotation.y, x: this._headBone.rotation.x };
      this._headBone.rotation.y = this._headSwayBase.y + Math.sin(this._currentTimeSec * 0.6) * 0.06 * calmFactor + Math.sin(this._currentTimeSec * 1.9) * 0.025 * calmFactor;
      this._headBone.rotation.x = this._headSwayBase.x + Math.sin(this._currentTimeSec * 0.83) * 0.035 * calmFactor;
    }

    const timeInState = this._currentTimeSec - this._stateTime;
    let desiredState = this._state;

    if (this._currentTimeSec < this._forceRunUntil) {
      desiredState = 'run';
    } else if (this._state === 'run') {
      desiredState = energy > 0.25 ? 'run' : 'walk';
      if (desiredState === 'walk') this._walkUntil = this._currentTimeSec + CONFIG.ANIMATION.WALK_DWELL;
    } else if (this._state === 'walk') {
      desiredState = this._currentTimeSec < this._walkUntil ? 'walk' : (energy > 0.5 ? 'run' : (energy > 0.06 ? 'walk' : 'idle'));
    } else {
      desiredState = energy > 0.15 ? 'walk' : 'idle';
    }

    const minDwell = this._state === 'idle' ? CONFIG.ANIMATION.IDLE_DWELL : CONFIG.ANIMATION.MOVE_DWELL;
    if (desiredState !== this._state && timeInState > minDwell) {
      this._transitionToState(desiredState);
    }

    this._eatTimer -= deltaTime;
    if (this._animSets?.eat?.length && this._state === 'idle' && !this._sequence?.onEnd && this._eatTimer <= 0) {
      this._camFollow = true;
      this._playSequence(this._animSets.eat, { 
        onEnd: () => { 
          this._camFollow = false; 
          this._transitionToState('idle', true); 
        } 
      });
      this._eatTimer = CONFIG.ANIMATION.EAT_TIMER_BASE + Math.random() * CONFIG.ANIMATION.EAT_TIMER_VAR;
    }
  }

  _updateModelTransform(easedScrollProgress) {
    if (!this._root) return;
    
    this._root.position.x += (0.35 - easedScrollProgress * 0.35 - this._root.position.x) * 0.05;
    this._root.rotation.y = -0.15 + (this._mouse.x - 0.5) * -0.25 * (1 - easedScrollProgress);
    
    if (this._blobShadow) {
      this._blobShadow.position.x = this._root.position.x;
      const scale = 1 - this._root.position.y * 0.5;
      this._blobShadow.scale.set(scale, scale, 1);
      this._blobShadow.material.opacity = 0.78 * scale;
    }
  }

  _updateCameraRig(easedScrollProgress, deltaTime) {
    const faceRotation = parseFloat(this.getAttribute('face') || '0') * Math.PI / 180;
    const rotateVector = v => (!faceRotation ? v : new THREE.Vector3(
      v.x * Math.cos(faceRotation) + v.z * Math.sin(faceRotation), 
      v.y, 
      -v.x * Math.sin(faceRotation) + v.z * Math.cos(faceRotation)
    ));

    const rootX = this._root ? this._root.position.x : 0;
    const targetCamPos = rotateVector(this._camPath.getPoint(easedScrollProgress));
    const targetLookAt = rotateVector(this._lookPath.getPoint(easedScrollProgress));

    if (this._headBone && easedScrollProgress > 0.45) {
      const headWorldPos = this._headBone.getWorldPosition(new THREE.Vector3());
      const normalizedScroll = Math.min(1, (easedScrollProgress - 0.45) / 0.45);
      const easing = Math.pow(normalizedScroll, 2) * (3 - 2 * normalizedScroll);
      
      targetLookAt.x += (headWorldPos.x - rootX - targetLookAt.x) * easing; 
      targetLookAt.y += (headWorldPos.y - targetLookAt.y) * easing; 
      targetLookAt.z += (headWorldPos.z - targetLookAt.z) * easing;
    }

    const minClearance = (0.15 + easedScrollProgress * 0.04) * (1 - easedScrollProgress * 0.85);
    if (targetCamPos.y < targetLookAt.y + minClearance) targetCamPos.y = targetLookAt.y + minClearance;

    this._eatKinematic = (this._eatKinematic || 0) + ((this._camFollow ? 1 : 0) - (this._eatKinematic || 0)) * 0.07;
    targetCamPos.y -= 0.16 * this._eatKinematic; 
    targetCamPos.z += 0.4 * this._eatKinematic; 
    targetLookAt.y -= 0.3 * this._eatKinematic;

    const mouseOffsetX = (this._mouse.x - 0.5) * 0.55 * (1 - easedScrollProgress * 0.85);
    const mouseOffsetY = (0.5 - this._mouse.y) * 0.3 * (1 - easedScrollProgress * 0.85);
    
    const calculatedCamPos = new THREE.Vector3(rootX + targetCamPos.x + mouseOffsetX, targetCamPos.y + mouseOffsetY, targetCamPos.z);
    const calculatedLookAt = new THREE.Vector3(rootX + targetLookAt.x, targetLookAt.y, targetLookAt.z);

    if (!this._smoothedCamPos) { 
      this._smoothedCamPos = calculatedCamPos.clone(); 
      this._smoothedLookAt = calculatedLookAt.clone(); 
    }
    
    const lerpFactor = 1 - Math.pow(0.0001, deltaTime);
    this._smoothedCamPos.lerp(calculatedCamPos, lerpFactor);
    this._smoothedLookAt.lerp(calculatedLookAt, lerpFactor * 1.15);

    this._camera.position.copy(this._smoothedCamPos); 
    this._camera.lookAt(this._smoothedLookAt);

    const targetFov = 38 - easedScrollProgress * 13;
    if (Math.abs(this._camera.fov - targetFov) > 0.01) { 
      this._camera.fov = targetFov; 
      this._camera.updateProjectionMatrix(); 
    }

    this._macroLight.intensity = easedScrollProgress * 5;
    this._macroLight.position.set(this._camera.position.x + 0.3, this._camera.position.y + 0.25, this._camera.position.z + 0.4);

    const vignette = this.shadowRoot.querySelector('.model-vignette');
    if (vignette) vignette.style.opacity = (0.5 + easedScrollProgress * 0.5).toFixed(2);
  }

  _updateQuality(deltaTime) {
    if (this._quality === 'high' && this._renderer) {
      const currentPR = this._renderer.getPixelRatio();
      const targetPR = Math.min(window.devicePixelRatio || 1, 2);
      if (currentPR < targetPR) {
        this._renderer.setPixelRatio(Math.min(targetPR, currentPR + deltaTime * 0.35));
      }
    }
  }

  _disposeObject(object) {
    if (!object) return;
    object.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach(mat => {
          if (!mat) return;
          TEXTURE_MAPS.SAMPLED.forEach(key => { if (mat[key]?.isTexture) mat[key].dispose(); });
          mat.dispose();
        });
      }
    });
  }

  _cleanup() {
    this._sequence = null; 
    this._sequenceActions.clear();
    this._grassUniforms = null; 
    this._starUniforms = null;

    if (this._mixer) { this._mixer.stopAllAction(); this._mixer = null; }
    if (this._lowMixer) { this._lowMixer.stopAllAction(); this._lowMixer = null; }
    if (this._highMixer) { this._highMixer.stopAllAction(); this._highMixer = null; }
    
    this._disposeObject(this._lowModel); 
    this._disposeObject(this._highModel);
    this._lowModel = null; 
    this._highModel = null;

    if (this._grassBlades) { this._grassBlades.geometry.dispose(); this._grassBlades.material.dispose(); }
    if (this._floor) { this._floor.geometry.dispose(); this._floor.material.alphaMap?.dispose(); this._floor.material.dispose(); }
    if (this._blobShadow) { this._blobShadow.geometry.dispose(); this._blobShadow.material.map?.dispose(); this._blobShadow.material.dispose(); }
    if (this._stars) { this._stars.geometry.dispose(); this._stars.material.dispose(); }

    if (this._meteors) {
      this._meteors.forEach(m => { m.mesh.material.dispose(); this._scene.remove(m.mesh); });
      this._meteors = null;
    }
    
    if (this._meteorGeo) this._meteorGeo.dispose();
    if (this._meteorTex) this._meteorTex.dispose();

    if (this._renderer) {
      this._renderer.dispose();
      this._renderer = null;
    }
  }
}

customElements.define('mdv-model', MdvModel);