class ThreeJSLoader {

  constructor(canvasId, options = {}) {
    this.canvasId = canvasId;
    this.options = options || {};
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = null;
    this.THREE = null;
    this.animId = null;
    this.isDestroyed = false;
    this.onUpdateCallback = null;
    this.onUpdateCallbacks = [];
    this.loaders = {};
    this._pmremGenerator = null;
    this._envTexture = null;
  }
  static isReady() {
    return typeof THREE !== 'undefined';
  }

  static async load(version = 'r128') {
      if (ThreeJSLoader.isReady() && typeof THREE.GLTFLoader !== 'undefined') return window.THREE;

      const sources = [
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
        'https://unpkg.com/three@0.128.0/build/three.min.js',
        'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'
      ];

      if (!ThreeJSLoader.isReady()) {
        for (const src of sources) {
          try {
            await new Promise((resolve, reject) => {
              const s = document.createElement('script');
              s.src = src;
              s.async = false;
              s.onload = resolve;
              s.onerror = reject;
              document.head.appendChild(s);
            });
            if (typeof THREE !== 'undefined') {
              break;
            }
          } catch (e) {}
        }
      }

      if (typeof THREE !== 'undefined' && typeof THREE.OrbitControls === 'undefined') {
        const controlSources = [
          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
          'https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js'
        ];
        for (const cSrc of controlSources) {
          try {
            await new Promise((resolve, reject) => {
              const cs = document.createElement('script');
              cs.src = cSrc;
              cs.async = false;
              cs.onload = resolve;
              cs.onerror = reject;
              document.head.appendChild(cs);
            });
            if (typeof THREE.OrbitControls !== 'undefined') break;
          } catch(e) {}
        }
      }

      if (typeof THREE !== 'undefined' && typeof THREE.GLTFLoader === 'undefined') {
        const gltfSources = [
          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
          'https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js'
        ];
        for (const gSrc of gltfSources) {
          try {
            await new Promise((resolve, reject) => {
              const gs = document.createElement('script');
              gs.src = gSrc;
              gs.async = false;
              gs.onload = resolve;
              gs.onerror = reject;
              document.head.appendChild(gs);
            });
            if (typeof THREE.GLTFLoader !== 'undefined') break;
          } catch(e) {}
        }
      }

      if (typeof THREE !== 'undefined' && typeof THREE.RGBELoader === 'undefined') {
        const rgbeSources = [
          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/RGBELoader.js',
          'https://unpkg.com/three@0.128.0/examples/js/loaders/RGBELoader.js'
        ];
        for (const rSrc of rgbeSources) {
          try {
            await new Promise((resolve, reject) => {
              const rs = document.createElement('script');
              rs.src = rSrc;
              rs.async = false;
              rs.onload = resolve;
              rs.onerror = reject;
              document.head.appendChild(rs);
            });
            if (typeof THREE.RGBELoader !== 'undefined') break;
          } catch(e) {}
        }
      }

      return window.THREE;
    }

  async init(container) {
      this.container = container || document.getElementById(this.canvasId) || document.body;
      await ThreeJSLoader.load();
      this.THREE = window.THREE;
      const THREE = this.THREE;

      const width = this.container.clientWidth || window.innerWidth || 800;
      const height = this.container.clientHeight || window.innerHeight || 600;

      // 1. Scene
      this.scene = new THREE.Scene();

      // 2. Camera
      const fov = this.options.fov || 45;
      this.camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 2000);
      const camPos = this.options.cameraPos || { x: 0, y: 150, z: 250 };
      this.camera.position.set(camPos.x, camPos.y, camPos.z);

      // 3. Renderer with ACES Filmic Tone Mapping & sRGB Color Accuracy
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.outputEncoding = THREE.sRGBEncoding || 3001;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping || 4;
      this.renderer.toneMappingExposure = 1.0;
      this.renderer.domElement.style.width = '100%';
      this.renderer.domElement.style.height = '100%';
      this.renderer.domElement.style.display = 'block';
      this.container.appendChild(this.renderer.domElement);

      // 4. Controls
      if (this.options.enableControls && THREE.OrbitControls) {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        if (this.options.target) {
          this.controls.target.set(this.options.target.x, this.options.target.y, this.options.target.z);
        }
      }

      // 5. Raycaster & Loaders
      this.raycaster = new THREE.Raycaster();
      this.loaders = {
        gltf: typeof THREE.GLTFLoader !== 'undefined' ? new THREE.GLTFLoader() : null
      };

      // 6. Render Loop
      const animate = () => {
        if (this.isDestroyed) return;
        this.animId = requestAnimationFrame(animate);
        if (this.controls) this.controls.update();

        if (typeof this.onUpdateCallback === 'function') {
          try { this.onUpdateCallback(); } catch(e) {}
        }

        for (const cb of this.onUpdateCallbacks) {
          try { cb(); } catch(e) {}
        }

        this.renderer.render(this.scene, this.camera);
      };
      animate();

      return this;
    }
  resize(width, height) {
    if (!this.renderer || !this.camera) return;
    const w = width || (this.container ? this.container.clientWidth : window.innerWidth);
    const h = height || (this.container ? this.container.clientHeight : window.innerHeight);
    if (w > 0 && h > 0) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }
  }

  destroy() {
    this.isDestroyed = true;
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this._pmremGenerator) {
      this._pmremGenerator.dispose();
      this._pmremGenerator = null;
    }
    if (this._envTexture) {
      this._envTexture.dispose();
      this._envTexture = null;
    }
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    if (this.renderer) this.renderer.dispose();
  }

  async loadEnvironment(url) {
      if (!this.THREE || !this.scene) return;
      const THREE = this.THREE;
      return new Promise((resolve, reject) => {
        if (THREE.RGBELoader) {
          const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
          pmremGenerator.compileEquirectangularShader();
          new THREE.RGBELoader().load(
            url,
            (texture) => {
              const envMap = pmremGenerator.fromEquirectangular(texture).texture;
              this.scene.environment = envMap;
              texture.dispose();
              pmremGenerator.dispose();
              resolve(envMap);
            },
            undefined,
            reject
          );
        } else {
          const textureLoader = new THREE.TextureLoader();
          textureLoader.load(
            url,
            (texture) => {
              texture.mapping = THREE.EquirectangularReflectionMapping;
              this.scene.environment = texture;
              resolve(texture);
            },
            undefined,
            reject
          );
        }
      });
    }

  clearEnvironment() {
      if (this.scene) {
        this.scene.environment = null;
      }
    }
  add(object) {
      if (this.scene && object) {
        this.scene.add(object);
      }
    }

  remove(object) {
      if (this.scene && object) {
        this.scene.remove(object);
      }
    }
}

globalThis.ThreeJSLoader = ThreeJSLoader;
if (typeof module !== "undefined" && module.exports) module.exports = ThreeJSLoader;