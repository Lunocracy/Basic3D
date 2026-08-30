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

          loadedModel.traverse((child) => {
            if (!child.isMesh) return;
            ModelLoader._applyPlasticMaterial(child, THREE);
            child.castShadow = true;
            child.receiveShadow = true;
          });

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

  static _applyPlasticMaterial(mesh, THREE) {
    const wasArray = Array.isArray(mesh.material);
    const oldMaterials = wasArray ? mesh.material : [mesh.material];

    const newMaterials = oldMaterials.map((oldMat) => {
      const plastic = new THREE.MeshPhysicalMaterial({
        color: oldMat && oldMat.color ? oldMat.color.clone() : new THREE.Color(0xffffff),
        map: oldMat ? oldMat.map || null : null,
        metalness: 0.0,
        roughness: 0.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        reflectivity: 0.9
      });
      if (oldMat && oldMat.dispose) oldMat.dispose();
      return plastic;
    });

    mesh.material = wasArray ? newMaterials : newMaterials[0];
  }
}

globalThis.ModelLoader = ModelLoader;
if (typeof module !== 'undefined' && module.exports) module.exports = ModelLoader;