class Simple3dShapes {
  constructor() {}

  static buildPrimitives(app, scene) {
    const meshes = [];
    const THREE = app.THREE;

    const glossyMat = new THREE.MeshPhysicalMaterial({
      metalness: 0.1,
      roughness: 0.15,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9
    });

    const S = 0.8;
    const cube = new THREE.Mesh(new THREE.BoxGeometry(S, S, S), glossyMat.clone());
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(S * 0.55, 64, 32), glossyMat.clone());
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(S * 0.35, S * 0.35, S, 64), glossyMat.clone());

    [cube, sphere, cylinder].forEach((m) => {
      m.geometry.computeBoundingBox();
      const h = m.geometry.boundingBox.max.y - m.geometry.boundingBox.min.y;
      m.position.y = h * 0.5;
      m.userData.locked = false;
      m.castShadow = true;
      m.receiveShadow = true;
    });

    const r = 0.9;
    [cube, sphere, cylinder].forEach((m, i) => {
      const ang = i * ((2 * Math.PI) / 3);
      m.position.x = r * Math.cos(ang);
      m.position.z = r * Math.sin(ang);
      scene.add(m);
      meshes.push(m);
    });

    const grid = new THREE.GridHelper(8, 16, 0x00f2fe, 0x21262d);
    grid.position.y = -0.01;
    grid.visible = true;
    scene.add(grid);

    return { meshes, grid };
  }
}

globalThis.Simple3dShapes = Simple3dShapes;
if (typeof module !== 'undefined' && module.exports) module.exports = Simple3dShapes;