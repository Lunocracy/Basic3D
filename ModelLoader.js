class ModelLoader {
  constructor() {}

  static loadGLB(file, app, feedbackElement, onParsed) {
    if (!app || !app.loaders || !app.loaders.gltf) {
      if (feedbackElement) feedbackElement.textContent = 'GLTF Loader not initialized.';
      return;
    }

    const THREE = app.THREE;
    const reader = new FileReader();

    reader.onload = (event) => {
      const contents = event.target.result;
      if (feedbackElement) feedbackElement.textContent = 'Parsing 3D model...';

      app.loaders.gltf.parse(
        contents,
        '',
        (gltf) => {
          const loadedModel = gltf.scene;
          const box = new THREE.Box3().setFromObject(loadedModel);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const maxSize = Math.max(size.x, size.y, size.z) || 1;
          const scale = 1.8 / maxSize;

          loadedModel.scale.set(scale, scale, scale);
          box.setFromObject(loadedModel);
          box.getCenter(center);
          loadedModel.position.sub(center);

          if (onParsed) onParsed(loadedModel);
          if (feedbackElement) feedbackElement.textContent = file.name + ' loaded successfully.';
        },
        (error) => {
          console.error('[ModelLoader Error]', error);
          if (feedbackElement) feedbackElement.textContent = 'Error parsing GLB: ' + error.message;
        }
      );
    };

    reader.onerror = (error) => {
      console.error('[ModelLoader Read Error]', error);
      if (feedbackElement) feedbackElement.textContent = 'Error reading file.';
    };

    reader.readAsArrayBuffer(file);
  }

  static clearSceneGeometry(app, meshes, loadedModel) {
    if (loadedModel && app.scene) {
      app.scene.remove(loadedModel);
    }

    if (Array.isArray(meshes)) {
      meshes.forEach((mesh) => {
        if (app.scene) app.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      meshes.length = 0;
    }
  }
}

globalThis.ModelLoader = ModelLoader;
if (typeof module !== 'undefined' && module.exports) module.exports = ModelLoader;