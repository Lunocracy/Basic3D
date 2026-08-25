var ThreeJSLoader = globalThis.ThreeJSLoader = class ThreeJSLoader {
  constructor() {}

  static isReady() {
    return typeof THREE !== 'undefined';
  }

  static async load(version = 'r128') {
    if (ThreeJSLoader.isReady()) return THREE;

    const sources = [
      'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
      'https://unpkg.com/three@0.128.0/build/three.min.js',
      'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'
    ];

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
          return THREE;
        }
      } catch (e) {}
    }

    throw new Error('Failed to load Three.js from CDN sources.');
  }
};

if (typeof module !== "undefined" && module.exports) module.exports = ThreeJSLoader;