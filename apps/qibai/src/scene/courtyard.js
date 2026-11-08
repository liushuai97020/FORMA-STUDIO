import * as THREE from 'three';
import {
  box,
  cylinder,
  plane,
  roundedBox,
  groupAt,
  markShadows,
  addContactShadow,
  mulberry32,
  clamp
} from './helpers.js';

function makeWallSegment(M, length, height, position, rotationY = 0) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;
  group.add(box(length, height, 0.28, M.wall, [0, height / 2, 0]));
  group.add(box(length + 0.14, 0.12, 0.5, M.roofDark, [0, height + 0.02, 0], { cast: true }));
  group.add(box(length + 0.06, 0.1, 0.34, M.woodDeep, [0, height - 0.12, 0], { cast: false }));
  markShadows(group, true, true);
  return group;
}

function makeMoonGate(M) {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-1.95, 0);
  shape.lineTo(1.95, 0);
  shape.lineTo(1.95, 2.38);
  shape.lineTo(-1.95, 2.38);
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 1.28, 1.02, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
  const wall = new THREE.Mesh(geometry, M.wall);
  wall.rotation.y = Math.PI / 2;
  wall.position.set(-13.98, 0, 3.0);
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.045, 8, 48), M.roofDark);
  rim.rotation.y = Math.PI / 2;
  rim.position.set(-13.65, 1.28, 3.0);
  rim.castShadow = true;
  group.add(rim);
  group.add(box(0.32, 0.1, 4.02, M.roofDark, [-13.92, 2.46, 3.0]));

  // Bamboo beyond the moon gate, visible through the opening.
  group.add(makeBambooCluster(M, [-15.05, 0, 2.3], 0.75, 22));
  group.add(makeBambooCluster(M, [-15.7, 0, 4.2], 0.55, 23));
  return group;
}

function makeBambooCluster(M, position, scale = 1, seed = 1) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const rng = mulberry32(seed);
  const stems = Math.max(4, Math.round(9 * scale));
  const leafTransforms = [];
  const leafGeometry = new THREE.PlaneGeometry(0.55 * scale, 0.09 * scale);
  const leafDummy = new THREE.Object3D();

  for (let index = 0; index < stems; index++) {
    const height = (2.8 + rng() * 3.1) * scale;
    const x = (rng() - 0.5) * 1.2 * scale;
    const z = (rng() - 0.5) * 1.1 * scale;
    const lean = (rng() - 0.5) * 0.08;
    const stem = cylinder(0.018 * scale, 0.035 * scale, height, M.bamboo, [x, height / 2, z], {
      radialSegments: 6,
      cast: true
    });
    stem.rotation.z = lean;
    stem.rotation.x = (rng() - 0.5) * 0.07;
    group.add(stem);
    for (let node = 0; node < 2; node++) {
      const ring = cylinder(0.032 * scale, 0.032 * scale, 0.02, M.bamboo, [x, 0.65 + node * height * 0.3, z], {
        radialSegments: 6,
        cast: false
      });
      ring.rotation.z = lean;
      group.add(ring);
    }
    for (let leaf = 0; leaf < 10; leaf++) {
      leafDummy.position.set(
        x + (rng() - 0.5) * 0.9 * scale,
        height * (0.28 + rng() * 0.68),
        z + (rng() - 0.5) * 0.9 * scale
      );
      leafDummy.rotation.set((rng() - 0.5) * 0.9, rng() * Math.PI * 2, (rng() - 0.5) * 0.9);
      leafDummy.scale.setScalar(0.7 + rng() * 0.6);
      leafDummy.updateMatrix();
      leafTransforms.push(leafDummy.matrix.clone());
    }
  }

  const leaves = new THREE.InstancedMesh(leafGeometry, M.bambooLeaf, leafTransforms.length);
  for (let index = 0; index < leafTransforms.length; index++) leaves.setMatrixAt(index, leafTransforms[index]);
  leaves.instanceMatrix.needsUpdate = true;
  leaves.castShadow = false;
  leaves.receiveShadow = false;
  group.add(leaves);
  return group;
}

function makePedestrianGate(M) {
  const group = new THREE.Group();
  group.position.set(-2.0, 0, 13.28);
  for (const x of [-1.35, 1.35]) {
    group.add(box(0.24, 2.85, 0.32, M.woodDeep, [x, 1.42, 0]));
    group.add(box(0.58, 0.18, 0.6, M.stoneDark, [x, 0.09, 0], { cast: false }));
  }
  group.add(box(3.1, 0.16, 0.38, M.woodDeep, [0, 2.76, 0]));
  group.add(box(3.3, 0.13, 0.72, M.roofDark, [0, 2.92, 0]));
  group.add(box(2.9, 0.13, 0.45, M.stoneDark, [0, 0.06, 0], { cast: false }));

  for (const side of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(side * 1.18, 0, 0.02);
    hinge.rotation.y = side * -0.58;
    group.add(hinge);
    hinge.add(box(1.14, 2.32, 0.1, M.woodDark, [-side * 0.57, 1.2, 0]));
    for (let index = 0; index < 4; index++) {
      hinge.add(box(0.035, 1.75, 0.03, M.woodDeep, [-side * 0.94 + index * 0.27, 1.25, 0.07], { cast: false }));
    }
    for (let index = 0; index < 3; index++) {
      hinge.add(box(0.88, 0.028, 0.025, M.woodDeep, [-side * 0.57, 0.6 + index * 0.38, 0.07], { cast: false }));
    }
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), M.brass);
    knob.position.set(-side * 0.14, 1.18, 0.13);
    hinge.add(knob);
  }
  return group;
}

function makeVehicleGate(M) {
  const group = new THREE.Group();
  group.position.set(9.7, 0, 13.12);
  for (const x of [-2.35, 2.35]) {
    group.add(box(0.25, 2.7, 0.32, M.woodDeep, [x, 1.35, 0]));
    group.add(box(0.52, 0.16, 0.52, M.stoneDark, [x, 0.08, 0], { cast: false }));
  }
  group.add(box(0.12, 0.08, 5.3, M.blackMetal, [0, 0.05, 0], { cast: false }));

  const sliding = new THREE.Group();
  sliding.position.set(3.1, 0, 0.08);
  group.add(sliding);
  sliding.add(box(3.9, 0.15, 0.2, M.woodDeep, [0, 2.12, 0]));
  sliding.add(box(3.9, 0.13, 0.2, M.woodDeep, [0, 0.2, 0]));
  for (let index = 0; index < 20; index++) {
    sliding.add(box(0.07, 1.85, 0.08, M.woodDark, [-1.85 + index * 0.194, 1.16, 0], { cast: true }));
  }
  sliding.add(box(4.0, 0.1, 0.3, M.roofDark, [0, 2.22, 0]));
  group.add(box(0.18, 2.7, 0.34, M.woodDeep, [1.45, 1.35, 0.02]));
  return group;
}

function makeStoneLantern(M, position) {
  const group = new THREE.Group();
  group.position.set(position[0], 0, position[1]);
  group.add(cylinder(0.37, 0.44, 0.14, M.stoneDark, [0, 0.08, 0], { radialSegments: 6, cast: false }));
  group.add(cylinder(0.13, 0.17, 0.85, M.stone, [0, 0.58, 0], { radialSegments: 6 }));
  group.add(box(0.48, 0.4, 0.48, M.stone, [0, 1.15, 0]));
  group.add(box(0.34, 0.22, 0.34, M.warmGlow, [0, 1.15, 0.25], { cast: false }));
  group.add(box(0.54, 0.08, 0.54, M.stoneDark, [0, 1.4, 0]));
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.34, 4), M.stoneDark);
  cap.position.y = 1.6;
  cap.rotation.y = Math.PI / 4;
  cap.castShadow = true;
  group.add(cap);
  const light = new THREE.PointLight(0xffa95c, 1.8, 4.3, 2);
  light.position.set(0, 1.2, 0.12);
  group.add(light);
  addContactShadow(group, M.shadowTexture, [0, 0.05, 0], [1.25, 1.25], 0.22);
  return { group, light };
}

function makeBench(M, position) {
  const group = new THREE.Group();
  group.position.set(position[0], 0, position[1]);
  for (let index = 0; index < 4; index++) {
    group.add(box(2.2, 0.055, 0.15, M.wood, [0, 0.48 + index * 0.001, -0.26 + index * 0.17]));
  }
  for (let index = 0; index < 3; index++) {
    group.add(box(2.15, 0.16, 0.055, M.wood, [0, 0.72 + index * 0.17, -0.33]));
  }
  for (const x of [-0.88, 0.88]) {
    group.add(box(0.1, 0.48, 0.64, M.woodDeep, [x, 0.25, 0]));
    group.add(box(0.1, 0.82, 0.07, M.woodDeep, [x, 0.68, -0.32]));
  }
  addContactShadow(group, M.shadowTexture, [0, 0.05, 0], [2.55, 1.1], 0.24);
  return group;
}

function makeWaterBasin(M) {
  const group = new THREE.Group();
  group.position.set(-10.35, 0, 3.1);
  group.add(box(2.7, 0.16, 1.9, M.stoneDark, [0, 0.08, 0], { cast: false }));
  group.add(box(2.5, 0.36, 1.72, M.stone, [0, 0.28, 0]));
  group.add(box(2.1, 0.03, 1.32, M.water, [0, 0.47, 0], { cast: false }));
  group.add(box(0.9, 0.13, 0.52, M.stone, [-0.82, 0.48, -0.44]));
  group.add(box(0.65, 0.1, 0.32, M.stone, [0.74, 0.48, 0.35]));
  for (let index = 0; index < 8; index++) {
    const petal = plane(0.12, 0.05, M.petal, [
      -0.7 + Math.random() * 1.4,
      0.49,
      -0.45 + Math.random() * 0.9
    ]);
    petal.rotation.set(-Math.PI / 2, Math.random() * Math.PI, 0);
    group.add(petal);
  }
  return group;
}

function makePathLights(M, positions) {
  const group = new THREE.Group();
  const lights = [];
  for (const [index, position] of positions.entries()) {
    const fixture = new THREE.Group();
    fixture.position.set(position[0], 0, position[1]);
    fixture.add(cylinder(0.05, 0.07, 0.5, M.blackMetal, [0, 0.25, 0], { radialSegments: 8 }));
    fixture.add(cylinder(0.13, 0.1, 0.16, M.lantern, [0, 0.5, 0], { radialSegments: 8 }));
    fixture.add(cylinder(0.17, 0.17, 0.035, M.blackMetal, [0, 0.6, 0], { radialSegments: 10, cast: false }));
    const light = new THREE.PointLight(0xffad63, 0.65, 3.2, 2);
    light.position.set(0, 0.58, 0);
    fixture.add(light);
    lights.push({ light, base: 0.65 });
    group.add(fixture);
  }
  return { group, lights };
}

function makePath(M) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.0, 0.06, 12.9),
    new THREE.Vector3(-1.1, 0.06, 9.2),
    new THREE.Vector3(-1.7, 0.06, 5.7),
    new THREE.Vector3(-0.2, 0.06, 2.6),
    new THREE.Vector3(0.15, 0.06, 0.55)
  ]);
  const count = 34;
  const geometry = new THREE.BoxGeometry(1.18, 0.055, 0.78);
  const mesh = new THREE.InstancedMesh(geometry, M.paving, count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const tints = [0xffffff, 0xe8e3da, 0xd7d2c8, 0xf0ebe2];
  for (let index = 0; index < count; index++) {
    const t = index / (count - 1);
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    dummy.position.set(point.x + (Math.random() - 0.5) * 0.1, 0.075, point.z + (Math.random() - 0.5) * 0.08);
    dummy.rotation.set(0, Math.atan2(tangent.x, tangent.z) + (Math.random() - 0.5) * 0.12, 0);
    dummy.scale.set(0.84 + Math.random() * 0.24, 1, 0.84 + Math.random() * 0.22);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    color.setHex(tints[index % tints.length]);
    mesh.setColorAt(index, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return { mesh, curve };
}

function makeShrubs(M) {
  const group = new THREE.Group();
  const positions = [
    [-12.8, 12.4, 0.55], [-11.7, 12.7, 0.45], [-10.6, 12.4, 0.5],
    [4.4, 12.5, 0.45], [5.5, 12.7, 0.55], [12.6, 11.8, 0.6],
    [-12.2, 6.0, 0.42], [-12.4, 0.2, 0.5], [12.7, 1.0, 0.55],
    [6.2, 3.9, 0.4], [7.4, 13.0, 0.52]
  ];
  const geometry = new THREE.IcosahedronGeometry(0.42, 1);
  const blobs = new THREE.InstancedMesh(geometry, M.leaf, positions.length * 5);
  const dummy = new THREE.Object3D();
  const rng = mulberry32(78);
  let index = 0;
  for (const [x, z, scale] of positions) {
    for (let blob = 0; blob < 5; blob++) {
      dummy.position.set(
        x + (rng() - 0.5) * 0.8 * scale,
        (0.25 + rng() * 0.2) * scale,
        z + (rng() - 0.5) * 0.7 * scale
      );
      dummy.rotation.set(rng() * 0.4, rng() * Math.PI, rng() * 0.3);
      dummy.scale.set(scale * (0.9 + rng() * 0.5), scale * (0.5 + rng() * 0.4), scale * (0.9 + rng() * 0.5));
      dummy.updateMatrix();
      blobs.setMatrixAt(index++, dummy.matrix);
    }
  }
  blobs.count = index;
  blobs.instanceMatrix.needsUpdate = true;
  blobs.castShadow = true;
  blobs.receiveShadow = true;
  group.add(blobs);
  return group;
}

function makeGrassClumps(M) {
  const group = new THREE.Group();
  const geometry = new THREE.ConeGeometry(0.035, 0.45, 4);
  const count = 180;
  const instanced = new THREE.InstancedMesh(geometry, M.leaf, count);
  const dummy = new THREE.Object3D();
  const rand = mulberry32(55);
  let index = 0;
  const clusters = [
    [-8.7, 8.7], [-4.8, 10.5], [-3.9, 7.0], [2.5, 9.2], [4.7, 4.0],
    [11.8, 3.4], [-10.7, 6.2], [-7.6, 2.3], [1.8, 3.2]
  ];
  for (const [cx, cz] of clusters) {
    for (let blade = 0; blade < 20; blade++) {
      const angle = rand() * Math.PI * 2;
      const radius = rand() * 0.55;
      dummy.position.set(cx + Math.cos(angle) * radius, 0.25, cz + Math.sin(angle) * radius);
      dummy.rotation.set((rand() - 0.5) * 0.3, rand() * Math.PI, (rand() - 0.5) * 0.3);
      dummy.scale.set(0.7 + rand() * 0.7, 0.65 + rand() * 0.8, 0.7 + rand() * 0.7);
      dummy.updateMatrix();
      instanced.setMatrixAt(index++, dummy.matrix);
    }
  }
  instanced.count = index;
  instanced.instanceMatrix.needsUpdate = true;
  instanced.castShadow = false;
  instanced.receiveShadow = true;
  group.add(instanced);
  return group;
}

function makeDistantTrees(M) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x5b6a58, roughness: 0.95 });
  const materialDark = new THREE.MeshStandardMaterial({ color: 0x485745, roughness: 0.95 });
  const trees = [
    [-17, -24, 2.4], [-6, -26, 2.8], [5, -25, 2.5], [16, -23, 2.2], [27, -12, 2.0], [-27, -14, 2.1]
  ];
  for (const [x, z, size] of trees) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    const trunk = cylinder(0.12 * size, 0.2 * size, 2.3 * size, M.bark, [0, 1.15 * size, 0], { radialSegments: 6, cast: false });
    tree.add(trunk);
    for (let index = 0; index < 3; index++) {
      const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry((0.9 + Math.random() * 0.5) * size, 1), index === 0 ? material : materialDark);
      canopy.position.set((Math.random() - 0.5) * 1.4 * size, (2.3 + Math.random() * 1.2) * size, (Math.random() - 0.5) * 1.4 * size);
      canopy.scale.set(1.1, 0.9, 1.0);
      tree.add(canopy);
    }
    group.add(tree);
  }
  return group;
}

export function createCourtyard(M) {
  const group = new THREE.Group();
  group.name = 'courtyard';
  const exteriorLights = [];
  const glowMaterials = [M.windowGlow, M.warmGlow];
  const emissiveMaterials = [M.lantern, M.paper, M.warmGlow];

  // Ground planes.
  const ground = plane(72, 72, M.grass, [0, -0.06, 0], { rotation: [-Math.PI / 2, 0, 0], receive: true });
  group.add(ground);
  group.add(box(27.5, 0.06, 24.4, M.gravel, [0, 0.0, 1.0], { cast: false }));
  group.add(box(13.8, 0.06, 1.7, M.stone, [0, 0.025, -0.05], { cast: false }));

  // Street outside the front wall and the apron through the vehicle gate.
  group.add(box(68, 0.035, 7.6, M.asphalt, [0, 0.012, 19.15], { cast: false }));
  group.add(box(5.2, 0.045, 3.1, M.pavingDark, [9.7, 0.03, 14.75], { cast: false }));
  group.add(box(68, 0.09, 0.18, M.stone, [0, 0.04, 15.32], { cast: false }));
  group.add(box(68, 0.09, 0.18, M.stone, [0, 0.04, 22.98], { cast: false }));
  for (let x = -28; x <= 28; x += 5.2) {
    group.add(box(2.4, 0.01, 0.09, M.linenLight, [x, 0.045, 19.25], { cast: false }));
  }

  group.add(box(10.8, 0.045, 3.15, M.paving, [0, 0.075, 1.2], { cast: false }));
  group.add(box(10.9, 0.08, 0.16, M.stoneDark, [0, 0.09, 2.78], { cast: false }));
  group.add(box(10.9, 0.08, 0.16, M.stoneDark, [0, 0.09, -0.35], { cast: false }));
  group.add(box(0.16, 0.08, 3.15, M.stoneDark, [-5.42, 0.09, 1.2], { cast: false }));
  group.add(box(0.16, 0.08, 3.15, M.stoneDark, [5.42, 0.09, 1.2], { cast: false }));
  group.add(box(7.2, 0.08, 0.18, M.stone, [-8.1, 0.09, 4.28], { cast: false }));
  group.add(box(7.2, 0.08, 0.18, M.stone, [-8.1, 0.09, 10.12], { cast: false }));
  group.add(box(0.18, 0.08, 5.9, M.stone, [-11.7, 0.09, 7.2], { cast: false }));
  group.add(box(0.18, 0.08, 5.9, M.stone, [-4.5, 0.09, 7.2], { cast: false }));

  // Grass beds and moss.
  group.add(box(7.2, 0.05, 5.9, M.grass, [-8.1, 0.055, 7.2], { cast: false }));
  group.add(box(10.6, 0.035, 0.9, M.moss, [0.2, 0.06, 12.55], { cast: false }));
  group.add(box(0.85, 0.035, 6.4, M.moss, [-12.9, 0.06, 7.1], { cast: false }));
  group.add(box(4.6, 0.035, 0.8, M.moss, [4.9, 0.06, 12.5], { cast: false }));
  for (const [x, z, w, d] of [[-9.9, 7.2, 2.2, 3.2], [-6.9, 8.6, 1.8, 2.1], [-11.4, 9.6, 1.8, 2.4]]) {
    group.add(box(w, 0.02, d, M.moss, [x, 0.09, z], { cast: false }));
  }

  // Stone path.
  const path = makePath(M);
  group.add(path.mesh);
  for (let index = 0; index < 20; index++) {
    const t = Math.random();
    const point = path.curve.getPointAt(t);
    group.add(box(0.08 + Math.random() * 0.12, 0.015, 0.05 + Math.random() * 0.1, M.moss, [point.x + (Math.random() - 0.5) * 1.0, 0.11, point.z + (Math.random() - 0.5) * 0.5], { cast: false }));
  }

  // Boundary walls with a moon gate on the west wall.
  group.add(makeWallSegment(M, 10.45, 2.38, [-8.775, 0, 13.4]));
  group.add(makeWallSegment(M, 7.9, 2.38, [3.4, 0, 13.4]));
  group.add(makeWallSegment(M, 1.95, 2.38, [13.025, 0, 13.4]));
  group.add(makeWallSegment(M, 24.8, 2.38, [14, 0, 1.0], Math.PI / 2));
  group.add(makeWallSegment(M, 12.6, 2.38, [-14, 0, -5.2], Math.PI / 2));
  group.add(makeWallSegment(M, 8.4, 2.38, [-14, 0, 9.1], Math.PI / 2));
  group.add(makeWallSegment(M, 27.9, 2.38, [0, 0, -11.48]));
  group.add(makeMoonGate(M));

  // Low front wall returns beside the gates.
  group.add(box(0.28, 2.55, 1.1, M.wall, [-3.35, 1.27, 13.05]));
  group.add(box(0.28, 2.55, 1.1, M.wall, [-0.65, 1.27, 13.05]));
  group.add(box(0.28, 2.55, 1.1, M.wall, [7.38, 1.27, 13.05]));
  group.add(box(0.28, 2.55, 1.1, M.wall, [12.02, 1.27, 13.05]));
  group.add(makePedestrianGate(M));
  group.add(makeVehicleGate(M));

  // Parking court.
  group.add(box(5.65, 0.06, 7.7, M.gravel, [9.68, 0.035, 7.25], { cast: false }));
  group.add(box(5.6, 0.04, 0.22, M.stone, [9.68, 0.08, 3.5], { cast: false }));
  group.add(box(5.6, 0.04, 0.22, M.stone, [9.68, 0.08, 11.0], { cast: false }));
  group.add(box(0.16, 0.05, 7.4, M.stone, [6.9, 0.08, 7.25], { cast: false }));
  group.add(box(0.16, 0.05, 7.4, M.stone, [12.46, 0.08, 7.25], { cast: false }));
  for (const x of [8.35, 10.95]) {
    group.add(box(0.9, 0.18, 0.28, M.stoneDark, [x, 0.12, 9.75], { cast: false }));
  }
  group.add(box(4.6, 0.05, 2.2, M.gravel, [9.68, 0.04, 12.35], { cast: false }));

  // Slatted screen behind the parked car.
  const screen = new THREE.Group();
  screen.position.set(12.92, 0, 7.25);
  const screenPostMaterial = M.woodDeep;
  screen.add(box(0.14, 2.75, 0.14, screenPostMaterial, [0, 1.38, -3.2]));
  screen.add(box(0.14, 2.75, 0.14, screenPostMaterial, [0, 1.38, 3.2]));
  for (let index = 0; index < 34; index++) {
    screen.add(box(0.07, 2.3, 0.055, M.woodDark, [0.02, 1.2, -3.0 + index * 0.182], { cast: true }));
  }
  screen.add(box(0.16, 0.12, 6.55, M.woodDeep, [0, 2.4, 0]));
  group.add(screen);

  // Bamboo, shrubs and grasses.
  group.add(makeBambooCluster(M, [-12.55, 0, 10.4], 1.1, 7));
  group.add(makeBambooCluster(M, [-12.65, 0, 0.4], 0.95, 8));
  group.add(makeBambooCluster(M, [13.2, 0, -1.2], 0.75, 9));
  group.add(makeShrubs(M));
  group.add(makeGrassClumps(M));
  // Distant tree line is intentionally omitted; the low walls and mist keep the horizon quiet.

  // Courtyard furniture and water.
  group.add(makeBench(M, [-3.55, 9.0]));
  group.add(makeWaterBasin(M));
  const lanternA = makeStoneLantern(M, [-4.15, 4.45]);
  const lanternB = makeStoneLantern(M, [5.35, 4.05]);
  group.add(lanternA.group, lanternB.group);
  exteriorLights.push(
    { light: lanternA.light, base: 1.8 },
    { light: lanternB.light, base: 1.8 }
  );

  const pathLights = makePathLights(M, [[-2.4, 10.3], [0.25, 6.6], [5.8, 12.35]]);
  group.add(pathLights.group);
  exteriorLights.push(...pathLights.lights);

  // A few stepping stones to the tea room.
  for (let index = 0; index < 5; index++) {
    group.add(box(0.72 + Math.random() * 0.2, 0.055, 0.56 + Math.random() * 0.18, M.stone, [-6.8 - index * 0.8, 0.075, 2.4 - index * 0.62], { cast: false }));
  }

  // Contact shadows for large landscape pieces.
  addContactShadow(group, M.shadowTexture, [-3.55, 0.07, 9.0], [3.0, 1.4], 0.22);
  addContactShadow(group, M.shadowTexture, [-10.35, 0.07, 3.1], [3.3, 2.5], 0.18);
  addContactShadow(group, M.shadowTexture, [9.68, 0.07, 7.25], [6.2, 8.2], 0.12);

  markShadows(group, true, true);
  group.traverse((object) => {
    if (object.isMesh && (object.material === M.windowGlow || object.material === M.warmGlow)) object.castShadow = false;
  });

  return {
    group,
    exteriorLights,
    glowMaterials,
    emissiveMaterials,
    pathCurve: path.curve,
    anchors: {
      tree: [-5.8, 2.2, 6.9],
      parking: [9.68, 1.2, 7.25],
      gate: [-2.0, 1.5, 12.8],
      water: [-10.35, 0.6, 3.1]
    }
  };
}





