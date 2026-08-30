class Basic3d {

  constructor() {
      this.app = null;
      this.meshes = [];
      this.lights = [];
      this.grid = null;
      this.raycastingEnabled = false;
      this.intersected = null;
      this.loadedModel = null;
      this.isShiftDown = false;
      this.paintedObjectsThisStroke = new Set();
      this.defaultFov = 45;
      this.environmentEnabled = false;
    }
  getThemeColors() {
    const THREE = this.app.THREE;
    return [
      new THREE.Color(0xff2d55),
      new THREE.Color(0x00f2fe),
      new THREE.Color(0x3fb950),
      new THREE.Color(0xffb74d),
      new THREE.Color(0xa371f7),
      new THREE.Color(0x58a6ff)
    ];
  }

  _buildStudioLighting() {
      const THREE = this.app.THREE;
      const scene = this.app.scene;
      this.lights = [];

      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.65);
      hemiLight.position.set(0, 20, 0);
      scene.add(hemiLight);
      this.lights.push(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
      keyLight.position.set(5, 8, 5);
      scene.add(keyLight);
      this.lights.push(keyLight);

      const fillLight = new THREE.DirectionalLight(0x58a6ff, 0.55);
      fillLight.position.set(-5, 4, -3);
      scene.add(fillLight);
      this.lights.push(fillLight);

      const rimLight = new THREE.DirectionalLight(0x00f2fe, 0.45);
      rimLight.position.set(0, 6, -6);
      scene.add(rimLight);
      this.lights.push(rimLight);
    }
  _buildPrimitives() {
    const result = Simple3dShapes.buildPrimitives(this.app, this.app.scene);
    this.meshes.push(...result.meshes);
    this.grid = result.grid;
    this._assignColorsRandomly();
  }

  _assignColorsRandomly() {
    const colors = this.getThemeColors();
    const shuffled = [...colors].sort(() => Math.random() - 0.5);

    this.meshes.forEach((m, i) => {
      if (m.userData.locked !== true && m.material && m.material.color) {
        m.material.color.copy(shuffled[i % shuffled.length]);
      }
    });
  }

  async _toggleEnvironment(enabled, feedbackElement) {
      if (!this.app) return;

      if (enabled) {
        if (feedbackElement) feedbackElement.textContent = 'Loading environment map...';
        let lastError = null;
        for (const url of Basic3d.ENV_MAP_URLS) {
          try {
            await this.app.loadEnvironment(url);
            this.environmentEnabled = true;

            // Turn off direct studio lights so environment is 100% of the lighting source
            if (Array.isArray(this.lights)) {
              this.lights.forEach((l) => (l.visible = false));
            }

            // Boost exposure to ensure environment lighting isn't dark or washed out
            if (this.app.renderer) {
              this.app.renderer.toneMappingExposure = 1.35;
            }

            if (feedbackElement) feedbackElement.textContent = 'Environment reflections ON';
            return;
          } catch (error) {
            lastError = error;
          }
        }
        console.error('[Basic3d] Failed to load environment map', lastError);
        if (feedbackElement) feedbackElement.textContent = 'Could not load environment map.';
      } else {
        this.app.clearEnvironment();
        this.environmentEnabled = false;

        // Re-enable studio lighting & restore baseline exposure
        if (Array.isArray(this.lights)) {
          this.lights.forEach((l) => (l.visible = true));
        }
        if (this.app.renderer) {
          this.app.renderer.toneMappingExposure = 1.0;
        }

        if (feedbackElement) feedbackElement.textContent = 'Environment reflections OFF';
      }
    }

  _setupUI() {
      const makeEl = typeof makeElement !== 'undefined' ? makeElement : (typeof LunoUIComponents !== 'undefined' ? LunoUIComponents.makeElement : null);
      if (!makeEl) return;

      const feedback = makeEl(
        'div',
        { style: { marginTop: '6px', fontSize: '11px', color: '#8b949e', fontFamily: 'monospace', wordBreak: 'break-word' } },
        'Ready.'
      );

      const fileInput = makeEl('input', {
        type: 'file',
        accept: '.glb,.gltf',
        style: { display: 'none' }
      });
      fileInput.onchange = (event) => {
        const file = event.target.files && event.target.files[0];
        if (file) {
          this._loadGLB(file, feedback);
        }
        fileInput.value = '';
      };

      const btnRandom = makeEl(
        'button',
        {
          style: {
            display: 'block',
            width: '100%',
            padding: '6px',
            background: '#238636',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '11px'
          },
        },
        '🎲 Randomize Colors'
      );
      btnRandom.onclick = () => {
        this._assignColorsRandomly();
        feedback.textContent = 'Colors updated at ' + new Date().toLocaleTimeString();
      };

      const gridChk = makeEl('input', {
        type: 'checkbox',
        id: 'gridToggle',
        checked: true
      });
      const gridLbl = makeEl(
        'label',
        { htmlFor: 'gridToggle', style: { marginLeft: '6px', color: '#c9d1d9', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer' } },
        'Show Ground Grid'
      );
      gridChk.onchange = () => {
        if (this.grid) this.grid.visible = gridChk.checked;
        feedback.textContent = gridChk.checked ? 'Grid ON' : 'Grid OFF';
      };
      const gridDiv = makeEl(
        'div',
        { style: { marginTop: '6px', display: 'flex', alignItems: 'center' } },
        [gridChk, gridLbl]
      );

      const raycastChk = makeEl('input', {
        type: 'checkbox',
        id: 'raycastToggle',
        checked: false,
      });
      const raycastLbl = makeEl(
        'label',
        { htmlFor: 'raycastToggle', style: { marginLeft: '6px', color: '#c9d1d9', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer' } },
        'Enable Hover & Tap'
      );
      raycastChk.onchange = () => {
        this.raycastingEnabled = raycastChk.checked;
        feedback.textContent = this.raycastingEnabled ? 'Hover/Tap ON' : 'Hover/Tap OFF';
        if (!this.raycastingEnabled && this.intersected) {
          this._unhighlight(this.intersected);
          this.intersected = null;
        }
      };
      const raycastDiv = makeEl(
        'div',
        { style: { marginTop: '4px', display: 'flex', alignItems: 'center' } },
        [raycastChk, raycastLbl]
      );

      const envChk = makeEl('input', {
        type: 'checkbox',
        id: 'envToggle',
        checked: false,
      });
      const envLbl = makeEl(
        'label',
        { htmlFor: 'envToggle', style: { marginLeft: '6px', color: '#c9d1d9', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer' } },
        'Environment Reflections'
      );
      envChk.onchange = () => {
        this._toggleEnvironment(envChk.checked, feedback);
      };
      const envDiv = makeEl(
        'div',
        { style: { marginTop: '4px', display: 'flex', alignItems: 'center' } },
        [envChk, envLbl]
      );

      const glbImportBtn = makeEl(
        'div',
        {
          id: 'drop-zone',
          title: 'Click to select or drag and drop a .glb file',
          style: {
            border: '1px dashed #30363d',
            borderRadius: '6px',
            padding: '9px 6px',
            textAlign: 'center',
            marginTop: '8px',
            color: '#58a6ff',
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: '600',
            background: '#161b22',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'all 0.15s ease'
          },
        },
        '📂 Open or Drop .glb Model'
      );

      glbImportBtn.onclick = () => fileInput.click();

      glbImportBtn.ondragover = (event) => {
        event.preventDefault();
        glbImportBtn.style.backgroundColor = '#1f2937';
        glbImportBtn.style.borderColor = '#00f2fe';
        glbImportBtn.style.color = '#00f2fe';
      };
      glbImportBtn.ondragleave = () => {
        glbImportBtn.style.backgroundColor = '#161b22';
        glbImportBtn.style.borderColor = '#30363d';
        glbImportBtn.style.color = '#58a6ff';
      };
      glbImportBtn.ondrop = (event) => {
        event.preventDefault();
        glbImportBtn.style.backgroundColor = '#161b22';
        glbImportBtn.style.borderColor = '#30363d';
        glbImportBtn.style.color = '#58a6ff';
        const file = event.dataTransfer.files[0];
        if (file && (file.name.toLowerCase().endsWith('.glb') || file.name.toLowerCase().endsWith('.gltf'))) {
          this._loadGLB(file, feedback);
        } else {
          feedback.textContent = 'Please drop a valid .glb file.';
        }
      };

      const content = makeEl('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px' } }, [
        fileInput,
        btnRandom,
        gridDiv,
        raycastDiv,
        envDiv,
        glbImportBtn,
        feedback,
      ]);

      if (typeof UITools !== 'undefined' && typeof UITools.makeDialog === 'function') {
        this.controlsDialog = UITools.makeDialog({
          env: this.env,
          title: '3D Controls',
          contentElement: content,
          size: [210, 265],
          position: [14, 18],
          onGeometryChange: (boxInstance, geometry) => {
            if (geometry && geometry.inner) {
              feedback.textContent = 'Size: ' + Math.round(geometry.inner.width) + ' × ' + Math.round(geometry.inner.height);
            }
          },
        });
      }
    }
  _setupRaycasting() {
    if (!this.app || !this.app.raycaster || !this.app.renderer) return;

    const THREE = this.app.THREE;
    this.pointer = new THREE.Vector2();
    this.intersected = null;

    const toNDC = (clientX, clientY) => {
      const rect = this.app.renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
    };

    const onPointerMove = (event) => {
      if (!this.raycastingEnabled || event.pointerType === 'touch') return;
      this.pointer.copy(toNDC(event.clientX, event.clientY));
    };

    const onTap = (event) => {
      if (!this.raycastingEnabled || event.pointerType !== 'touch') return;
      const ndc = toNDC(event.clientX, event.clientY);
      this.app.raycaster.setFromCamera(ndc, this.app.camera);
      const intersects = this.app.raycaster.intersectObjects(
        this.meshes.filter((o) => o && o.visible),
        false
      );
      if (intersects.length > 0) {
        this._applyPaintToObject(intersects[0]);
      }
    };

    this.app.renderer.domElement.addEventListener('pointermove', onPointerMove);
    this.app.renderer.domElement.addEventListener('pointerdown', onTap);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift' && !this.isShiftDown) {
        this.isShiftDown = true;
        this.paintedObjectsThisStroke.clear();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') this.isShiftDown = false;
    });

    const originalOnUpdate = this.app.onUpdateCallback;
    this.app.onUpdateCallback = () => {
      if (originalOnUpdate) originalOnUpdate();
      this._updateRaycasting();
    };
  }

  _updateRaycasting() {
    if (!this.app || !this.app.raycaster || !this.raycastingEnabled) {
      if (this.intersected) {
        this._unhighlight(this.intersected);
        this.intersected = null;
      }
      return;
    }

    this.app.raycaster.setFromCamera(this.pointer, this.app.camera);

    const intersects = this.app.raycaster.intersectObjects(
      this.meshes.filter((o) => o && o.visible),
      false
    );
    const newIntersect = intersects.length > 0 ? intersects[0] : null;

    if (this.isShiftDown) {
      if (this.intersected) {
        this._unhighlight(this.intersected);
        this.intersected = null;
      }

      if (
        newIntersect &&
        !this.paintedObjectsThisStroke.has(newIntersect.object)
      ) {
        this._applyPaintToObject(newIntersect);
        this.paintedObjectsThisStroke.add(newIntersect.object);
      }
      return;
    }

    const newIntersectedObject = newIntersect ? newIntersect.object : null;

    if (this.intersected !== newIntersectedObject) {
      this._unhighlight(this.intersected);
      this.intersected = newIntersectedObject;
      this._highlight(this.intersected);
    }
  }

  _loadGLB(file, feedbackElement) {
      if (typeof ModelLoader !== 'undefined' && ModelLoader.loadGLB) {
        ModelLoader.loadGLB(file, this.app, feedbackElement, (loadedModel) => {
          this._clearSceneGeometry();
          this.loadedModel = loadedModel;
          if (this.app.scene) {
            this.app.scene.add(this.loadedModel);
          } else if (this.app.add) {
            this.app.add(this.loadedModel);
          }
          this.loadedModel.traverse((child) => {
            if (child.isMesh) {
              this.meshes.push(child);
            }
          });
        });
      }
    }
  _clearSceneGeometry() {
    if (typeof ModelLoader !== 'undefined' && ModelLoader.clearSceneGeometry) {
      ModelLoader.clearSceneGeometry(this.app, this.meshes, this.loadedModel);
    }
    this.loadedModel = null;
  }

  _generateSaturatedColor() {
    const THREE = this.app.THREE;
    const c = new THREE.Color(),
      v = [0, 1, Math.random()];
    v.sort(() => Math.random() - 0.5);
    return c.setRGB(v[0], v[1], v[2]), c;
  }

  _applyPaintToObject(intersect) {
    const THREE = this.app.THREE;
    const object = intersect.object;
    if (!object || !object.isMesh) return;

    object.userData.locked = true;

    const newMaterial = new THREE.MeshPhysicalMaterial({});
    newMaterial.color.set(this._generateSaturatedColor());
    newMaterial.metalness = 0.0;
    newMaterial.roughness = 0.2;
    newMaterial.clearcoat = 1.0;
    newMaterial.clearcoatRoughness = 0.08;

    if (Array.isArray(object.material)) {
      const materialIndex = intersect.face ? intersect.face.materialIndex : 0;
      const oldMaterial = object.material[materialIndex];
      if (oldMaterial && oldMaterial.map) newMaterial.map = oldMaterial.map;

      const newMaterials = object.material.slice();
      newMaterials[materialIndex] = newMaterial;
      object.material = newMaterials;
      if (oldMaterial && oldMaterial.dispose) oldMaterial.dispose();
    } else {
      const oldMaterial = object.material;
      if (oldMaterial && oldMaterial.map) newMaterial.map = oldMaterial.map;

      object.material = newMaterial;
      if (oldMaterial && oldMaterial.dispose) oldMaterial.dispose();
    }
  }

  _highlight(object) {
    if (!object || !object.isMesh || !object.material || !object.material.emissive) return;
    object.originalEmissive = object.material.emissive.getHex();
    object.material.emissive.setHex(0x330000);
  }

  _unhighlight(object) {
    if (!object || !object.isMesh || !object.material || !object.material.emissive) return;
    if (object.originalEmissive !== undefined) {
      object.material.emissive.setHex(object.originalEmissive);
    }
  }

  destroy() {
    this.destroyed = true;

    if (Array.isArray(this.cleanupFns)) {
      for (const cleanup of this.cleanupFns.splice(0)) {
        try {
          cleanup();
        } catch (error) {}
      }
    }

    if (
      this.controlsDialog &&
      typeof this.controlsDialog.close === 'function'
    ) {
      try {
        this.controlsDialog.close();
      } catch (e) {}
      this.controlsDialog = null;
    }

    if (this.app && typeof this.app.destroy === 'function') {
      try {
        this.app.destroy();
      } catch (error) {}
    }

    if (this.rootElement && this.rootElement.parentElement) {
      this.rootElement.parentElement.removeChild(this.rootElement);
    }

    this.rootElement = null;
    this.app = null;
    this.meshes = [];
    this.grid = null;
    this.intersected = null;
    this.loadedModel = null;

    if (window.basic3d === this) {
      window.basic3d = null;
    }
  }

  async run(env) {
    if (this.rootElement) {
      this.destroy();
    }

    this.destroyed = false;
    this.cleanupFns = [];
    this.env = env;

    if (!env || !env.container) {
      throw new Error("[Basic3d] run() requires an environment object with a valid container.");
    }

    let parentElement;
    if (env && typeof env.createContainer === 'function') {
      const containers = env.createContainer();
      this.outerContainer = containers.element;
      parentElement = containers.contentElement;
    } else {
      parentElement = env.container;

      parentElement.style.position = 'relative';
      parentElement.style.width = '100%';
      parentElement.style.height = '100%';
      parentElement.style.margin = '0';
      parentElement.style.padding = '0';
      parentElement.style.overflow = 'hidden';
      parentElement.style.background = '#0d1117';
    }

    const canvasId = 'basic3d-canvas-' + Math.random().toString(36).slice(2);
    const canvasContainer = document.createElement('div');
    canvasContainer.id = canvasId;
    canvasContainer.style.cssText = 'position:absolute; top:0; left:0; right:0; bottom:0; overflow:hidden; background:#0d1117;';
    parentElement.appendChild(canvasContainer);
    this.rootElement = canvasContainer;

    if (
      !parentElement._vibesAppResizeObserver &&
      typeof ResizeObserver !== 'undefined'
    ) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (typeof this.onResize === 'function') {
            this.onResize(entry.contentRect.width, entry.contentRect.height);
          }
        }
      });
      ro.observe(parentElement);
      parentElement._vibesAppResizeObserver = ro;
    }

    if (typeof ThreeJSLoader === 'undefined') {
      throw new Error('ThreeJSLoader library module not loaded on scope.');
    }

    this.app = new ThreeJSLoader(canvasId, {
      cameraPos: { x: 1.2, y: 1.8, z: 2.8 },
      enableControls: true
    });

    await this.app.init(canvasContainer);

    if (this.app.scene) {
      this.app.scene.background = null;
    }

    this._buildStudioLighting();
    this._buildPrimitives();
    this._setupUI();
    this._setupRaycasting();

    const initialRect = parentElement.getBoundingClientRect();
    if (initialRect.width > 0 && initialRect.height > 0) {
      this.onResize(initialRect.width, initialRect.height);
    }

    window.threeApp = this.app;
    window.basic3d = this;

    return this;
  }

  onResize(width, height) {
    if (width <= 0 || height <= 0) return;

    if (this.app) {
      if (this.app.camera) {
        const aspect = width / Math.max(1, height);
        this.app.camera.aspect = aspect;

        if (aspect < 1.0) {
          this.app.camera.fov = Math.min(85, this.defaultFov / aspect);
        } else {
          this.app.camera.fov = this.defaultFov;
        }

        this.app.camera.updateProjectionMatrix();
      }

      if (typeof this.app.resize === 'function') {
        this.app.resize(width, height);
      }
    }
  }
}

Basic3d.ENV_MAP_URLS = [
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/equirectangular/venice_sunset_1k.hdr',
  'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/equirectangular/venice_sunset_1k.hdr'
];

globalThis.Basic3d = Basic3d;
if (typeof module !== 'undefined' && module.exports) module.exports = Basic3d;