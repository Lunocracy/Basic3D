class Basic3d {
  constructor() {
    this.app = null;
    this.meshes = [];
    this.grid = null;
    this.thickLine = null;
    this.raycastingEnabled = true;
    this.intersected = null;
    this.loadedModel = null;
    this.isShiftDown = false;
    this.paintedObjectsThisStroke = new Set();
    this.defaultFov = 45;
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

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.7);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x58a6ff, 0.6);
    fillLight.position.set(-5, 4, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x00f2fe, 0.5);
    rimLight.position.set(0, 6, -6);
    scene.add(rimLight);
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

    if (this.thickLine && this.thickLine.userData.locked !== true && this.thickLine.material && this.thickLine.material.color) {
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      this.thickLine.material.color.copy(randomColor);
    }
  }

  _setupUI() {
    const makeEl = typeof makeElement !== 'undefined' ? makeElement : (typeof LunoUIComponents !== 'undefined' ? LunoUIComponents.makeElement : null);
    if (!makeEl) return;

    const feedback = makeEl(
      'div',
      { style: { marginTop: '6px', fontSize: '11px', color: '#8b949e', fontFamily: 'monospace' } },
      'Ready.'
    );

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

    const thickLineChk = makeEl('input', {
      type: 'checkbox',
      id: 'thickLineToggle',
      checked: true,
    });
    const thickLineLbl = makeEl(
      'label',
      { htmlFor: 'thickLineToggle', style: { marginLeft: '6px', color: '#c9d1d9', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer' } },
      'Show Halo Ring'
    );
    thickLineChk.onchange = () => {
      if (this.thickLine) {
        this.thickLine.visible = thickLineChk.checked;
        feedback.textContent = thickLineChk.checked ? 'Ring ON' : 'Ring OFF';
      }
    };
    const thickLineDiv = makeEl(
      'div',
      { style: { marginTop: '4px', display: 'flex', alignItems: 'center' } },
      [thickLineChk, thickLineLbl]
    );

    const raycastChk = makeEl('input', {
      type: 'checkbox',
      id: 'raycastToggle',
      checked: true,
    });
    const raycastLbl = makeEl(
      'label',
      { htmlFor: 'raycastToggle', style: { marginLeft: '6px', color: '#c9d1d9', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer' } },
      'Enable Hover & Click'
    );
    raycastChk.onchange = () => {
      this.raycastingEnabled = raycastChk.checked;
      feedback.textContent = this.raycastingEnabled ? 'Hover ON' : 'Hover OFF';
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

    const dropZone = makeEl(
      'div',
      {
        id: 'drop-zone',
        style: {
          border: '1px dashed #30363d',
          borderRadius: '6px',
          padding: '8px',
          textAlign: 'center',
          marginTop: '8px',
          color: '#8b949e',
          fontSize: '11px',
          fontFamily: 'monospace',
          background: '#0d1117'
        },
      },
      'Drop .glb model here'
    );

    dropZone.ondragover = (event) => {
      event.preventDefault();
      dropZone.style.backgroundColor = '#161b22';
      dropZone.style.borderColor = '#00f2fe';
    };
    dropZone.ondragleave = () => {
      dropZone.style.backgroundColor = '#0d1117';
      dropZone.style.borderColor = '#30363d';
    };
    dropZone.ondrop = (event) => {
      event.preventDefault();
      dropZone.style.backgroundColor = '#0d1117';
      dropZone.style.borderColor = '#30363d';
      const file = event.dataTransfer.files[0];
      if (file && file.name.toLowerCase().endsWith('.glb')) {
        this._loadGLB(file, feedback);
      } else {
        feedback.textContent = 'Please drop a valid .glb file.';
      }
    };

    const content = makeEl('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px' } }, [
      btnRandom,
      gridDiv,
      thickLineDiv,
      raycastDiv,
      dropZone,
      feedback,
    ]);

    if (typeof UITools !== 'undefined' && typeof UITools.makeDialog === 'function') {
      this.controlsDialog = UITools.makeDialog({
        env: this.env,
        title: '3D Controls',
        contentElement: content,
        size: [210, 240],
        position: [14, 18],
        onGeometryChange: (boxInstance, geometry) => {
          if (geometry && geometry.inner) {
            feedback.textContent = 'Size: ' + Math.round(geometry.inner.width) + ' × ' + Math.round(geometry.inner.height);
          }
        },
      });
    }
  }

  _buildThickLine() {
    if (!this.app || !this.app.modules) return;
    const { Line2, LineGeometry, LineMaterial } = this.app.modules;
    if (!Line2 || !LineGeometry || !LineMaterial) {
      return;
    }

    const points = [];
    const radius = 1.0;
    const y = 0.55;
    const segments = 64;

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(radius * Math.cos(theta), y, radius * Math.sin(theta));
    }

    const geometry = new LineGeometry();
    geometry.setPositions(points);

    const material = new LineMaterial({
      color: 0x00f2fe,
      linewidth: 4,
    });

    const line = new Line2(geometry, material);
    line.computeLineDistances();
    line.scale.set(1, 1, 1);
    line.userData.locked = false;
    this.app.scene.add(line);
    this.thickLine = line;

    if (this.app.renderer && this.app.renderer.domElement) {
      const { clientWidth, clientHeight } = this.app.renderer.domElement;
      material.resolution.set(clientWidth || 300, clientHeight || 300);
    }

    const chk = document.getElementById('thickLineToggle');
    if (chk) {
      this.thickLine.visible = chk.checked;
    }

    this._assignColorsRandomly();
  }

  _setupRaycasting() {
    if (!this.app || !this.app.raycaster || !this.app.renderer) return;

    const THREE = this.app.THREE;
    this.pointer = new THREE.Vector2();
    this.intersected = null;

    const onPointerMove = (event) => {
      if (!this.raycastingEnabled) return;
      const rect = this.app.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    this.app.renderer.domElement.addEventListener('pointermove', onPointerMove);

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
    if (this.thickLine && this.app.raycaster.params && this.app.raycaster.params.Line) {
      this.app.raycaster.params.Line.threshold = 0.02;
    }

    const objectsToTest = this.thickLine
      ? [...this.meshes, this.thickLine]
      : this.meshes;
    const intersects = this.app.raycaster.intersectObjects(
      objectsToTest.filter((o) => o && o.visible),
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
        this.app.add(this.loadedModel);
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
    if (!object) return;

    object.userData.locked = true;

    if (object.isLine2) {
      const colors = this.getThemeColors();
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      object.material.color.copy(randomColor);
      return;
    }

    if (object.isMesh) {
      const newMaterial = new THREE.MeshPhysicalMaterial({});
      newMaterial.color.set(this._generateSaturatedColor());
      newMaterial.metalness = 0.1;
      newMaterial.roughness = 0.2;
      newMaterial.clearcoat = 0.7;

      if (Array.isArray(object.material)) {
        const materialIndex = intersect.face ? intersect.face.materialIndex : undefined;
        if (materialIndex !== undefined) {
          const oldMaterial = object.material[materialIndex];
          if (oldMaterial && oldMaterial.map) newMaterial.map = oldMaterial.map;

          const newMaterials = object.material.slice();
          newMaterials[materialIndex] = newMaterial;
          object.material = newMaterials;
          if (oldMaterial && oldMaterial.dispose) oldMaterial.dispose();
        }
      } else {
        const oldMaterial = object.material;
        if (oldMaterial && oldMaterial.map) newMaterial.map = oldMaterial.map;

        object.material = newMaterial;
        if (oldMaterial && oldMaterial.dispose) oldMaterial.dispose();
      }
    }
  }

  _highlight(object) {
    const THREE = this.app.THREE;
    if (!object) return;

    if (object.isMesh && object.material && object.material.emissive) {
      object.originalEmissive = object.material.emissive.getHex();
      object.material.emissive.setHex(0x330000);
    } else if (object.isLine2 && object.material) {
      object.originalColor = object.material.color.clone();
      object.material.color.lerp(new THREE.Color(0xffffff), 0.4);
    }
  }

  _unhighlight(object) {
    if (!object) return;

    if (
      object.isMesh &&
      object.material &&
      object.material.emissive &&
      object.originalEmissive !== undefined
    ) {
      object.material.emissive.setHex(object.originalEmissive);
    } else if (object.isLine2 && object.originalColor && object.material) {
      object.material.color.copy(object.originalColor);
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
    this.thickLine = null;
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
      enableControls: true,
      useThickLines: true,
      useRaycaster: true,
      commonLoaders: true,
      hdrPath: null
    });

    await this.app.init(canvasContainer);

    if (this.app.scene) {
      this.app.scene.background = null;
    }

    this._buildStudioLighting();
    this._buildPrimitives();
    this._setupUI();
    this._buildThickLine();
    this._setupRaycasting();

    const initialRect = parentElement.getBoundingClientRect();
    if (initialRect.width > 0 && initialRect.height > 0) {
      this.onResize(initialRect.width, initialRect.height);
    }

    const THREE = this.app.getTHREE ? this.app.getTHREE() : (this.app.THREE || window.THREE);
    this.pointer = new THREE.Vector2();

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

    if (this.thickLine && this.thickLine.material && this.thickLine.material.resolution) {
      this.thickLine.material.resolution.set(width, height);
    }
  }
}

globalThis.Basic3d = Basic3d;
if (typeof module !== 'undefined' && module.exports) module.exports = Basic3d;