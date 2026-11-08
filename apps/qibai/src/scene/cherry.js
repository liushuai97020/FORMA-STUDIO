import * as THREE from 'three';
import {
  box,
  cylinder,
  plane,
  addContactShadow,
  makeBeamBetween,
  mulberry32,
  clamp
} from './helpers.js';

const BLOSSOM_COLORS = ['#f7d4dc', '#efb7c4', '#e7a3b2', '#fbe7ea', '#dd93a5'];
const PETAL_COLORS = ['#f4c0ca', '#f8d7dd', '#e9a9b7', '#fbe4e8', '#d990a1'];

function createBlossomGeometry() {
  const positions = [];
  const normals = [];
  const petals = 5;
  for (let index = 0; index < petals; index++) {
    const angle = (index / petals) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const inner = 0.025;
    const outer = 0.115;
    const innerWidth = 0.018;
    const outerWidth = 0.048;
    const a = [cos * inner - sin * innerWidth, 0.003, sin * inner + cos * innerWidth];
    const b = [cos * inner + sin * innerWidth, 0.003, sin * inner - cos * innerWidth];
    const c = [cos * outer + sin * outerWidth, 0.018, sin * outer - cos * outerWidth];
    const d = [cos * outer - sin * outerWidth, 0.018, sin * outer + cos * outerWidth];
    positions.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < 6; i++) normals.push(0, 1, 0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

function createPetalGeometry() {
  const geometry = new THREE.PlaneGeometry(0.12, 0.055, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function branchDirection(parent, rng) {
  const axis = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5);
  if (axis.lengthSq() < 0.0001) axis.set(1, 0, 0);
  axis.normalize();
  const next = parent.clone().applyAxisAngle(axis, 0.28 + rng() * 0.55);
  next.y += 0.1 + rng() * 0.22;
  return next.normalize();
}

function createTree(M, position, quality) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const visual = new THREE.Group();
  group.add(visual);
  const rng = mulberry32(407);
  const tips = [];

  const trunk = cylinder(0.27, 0.45, 2.55, M.bark, [0.03, 1.28, 0], { radialSegments: 10 });
  trunk.rotation.z = -0.035;
  visual.add(trunk);

  const rootFlare = cylinder(0.55, 0.7, 0.28, M.bark, [0.02, 0.14, 0], { radialSegments: 10, cast: false });
  visual.add(rootFlare);

  function branch(start, dir, length, radius, depth) {
    const end = start.clone().addScaledVector(dir, length);
    visual.add(makeBeamBetween(start.toArray(), end.toArray(), radius, radius * 0.68, depth > 1 ? M.bark : M.barkLight, depth > 1 ? 8 : 6));
    if (depth <= 0) {
      tips.push(end);
      return;
    }
    const children = rng() < 0.36 ? 3 : 2;
    for (let index = 0; index < children; index++) {
      const childDir = branchDirection(dir, rng);
      const childLength = length * (0.58 + rng() * 0.2);
      const childRadius = radius * (0.52 + rng() * 0.1);
      branch(end, childDir, childLength, childRadius, depth - 1);
    }
  }

  const start = new THREE.Vector3(0.03, 2.35, 0);
  branch(start, new THREE.Vector3(0.1, 1, 0.02).normalize(), 1.7, 0.2, 4);

  // A few low side branches to broaden the silhouette.
  for (const angle of [0.4, 2.5, 4.2]) {
    const dir = new THREE.Vector3(Math.cos(angle) * 0.8, 0.75, Math.sin(angle) * 0.8).normalize();
    branch(new THREE.Vector3(0.03, 1.7 + rng() * 0.35, 0), dir, 1.35 + rng() * 0.3, 0.12, 2);
  }

  const flowerGeometry = createBlossomGeometry();
  const flowerCount = quality.blossomCount;
  const blossoms = new THREE.InstancedMesh(flowerGeometry, M.blossom, flowerCount);
  const centers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.024, 0), new THREE.MeshStandardMaterial({
    color: 0xe0ad69,
    roughness: 0.8
  }), flowerCount);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const center = new THREE.Vector3(0.1, 5.1, 0.05);
  const radii = new THREE.Vector3(3.4, 1.75, 2.9);

  function setBlossom(index, position, scale) {
    dummy.position.copy(position);
    dummy.rotation.set(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    blossoms.setMatrixAt(index, dummy.matrix);
    centers.setMatrixAt(index, dummy.matrix);
    color.set(BLOSSOM_COLORS[index % BLOSSOM_COLORS.length]);
    blossoms.setColorAt(index, color);
  }

  let flowerIndex = 0;
  const tipFlowers = Math.floor(flowerCount * 0.48);
  const perTip = Math.max(2, Math.ceil(tipFlowers / Math.max(tips.length, 1)));
  for (const tip of tips) {
    for (let index = 0; index < perTip && flowerIndex < tipFlowers; index++) {
      const offset = new THREE.Vector3(
        (rng() - 0.5) * 1.25,
        (rng() - 0.5) * 0.9,
        (rng() - 0.5) * 1.25
      );
      setBlossom(flowerIndex++, tip.clone().add(offset), 0.86 + rng() * 0.72);
    }
  }
  while (flowerIndex < flowerCount) {
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const radius = Math.pow(rng(), 0.58);
    const position = new THREE.Vector3(
      center.x + Math.sin(phi) * Math.cos(theta) * radii.x * radius,
      center.y + Math.cos(phi) * radii.y * radius,
      center.z + Math.sin(phi) * Math.sin(theta) * radii.z * radius
    );
    setBlossom(flowerIndex++, position, 0.72 + rng() * 0.7);
  }
  blossoms.instanceMatrix.needsUpdate = true;
  blossoms.instanceColor.needsUpdate = true;
  centers.instanceMatrix.needsUpdate = true;
  blossoms.castShadow = false;
  blossoms.receiveShadow = false;
  centers.castShadow = false;
  centers.receiveShadow = false;
  visual.add(blossoms, centers);

  // A handful of green leaf clusters give the canopy depth.
  const leafGeometry = new THREE.PlaneGeometry(0.36, 0.16);
  const leafCount = Math.round(flowerCount * 0.12);
  const leaves = new THREE.InstancedMesh(leafGeometry, M.leaf, leafCount);
  for (let index = 0; index < leafCount; index++) {
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const radius = 0.55 + rng() * 0.42;
    dummy.position.set(
      center.x + Math.sin(phi) * Math.cos(theta) * radii.x * radius,
      center.y + Math.cos(phi) * radii.y * radius,
      center.z + Math.sin(phi) * Math.sin(theta) * radii.z * radius
    );
    dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    dummy.scale.setScalar(0.7 + rng() * 0.8);
    dummy.updateMatrix();
    leaves.setMatrixAt(index, dummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
  leaves.castShadow = false;
  visual.add(leaves);

  // Mossy base, stones and fallen petals.
  visual.add(cylinder(1.65, 1.9, 0.08, M.moss, [0, 0.035, 0], { radialSegments: 28, cast: false }));
  const stoneMaterial = M.stoneDark;
  for (let index = 0; index < 7; index++) {
    const angle = rng() * Math.PI * 2;
    const radius = 1.1 + rng() * 1.3;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + rng() * 0.22, 0), stoneMaterial);
    stone.position.set(Math.cos(angle) * radius, 0.12, Math.sin(angle) * radius);
    stone.scale.set(1.1, 0.55, 0.9);
    stone.rotation.set(rng(), rng(), rng());
    stone.castShadow = true;
    visual.add(stone);
  }

  const groundPetalCount = Math.round(flowerCount * 0.22);
  const groundPetalGeometry = createPetalGeometry();
  const groundPetals = new THREE.InstancedMesh(groundPetalGeometry, M.petal, groundPetalCount);
  for (let index = 0; index < groundPetalCount; index++) {
    const angle = rng() * Math.PI * 2;
    const radius = Math.pow(rng(), 0.55) * 4.9;
    dummy.position.set(Math.cos(angle) * radius, 0.085 + rng() * 0.02, Math.sin(angle) * radius);
    dummy.rotation.set(0, rng() * Math.PI * 2, (rng() - 0.5) * 0.6);
    dummy.scale.set(0.72 + rng() * 1.2, 1, 0.72 + rng() * 1.2);
    dummy.updateMatrix();
    groundPetals.setMatrixAt(index, dummy.matrix);
    color.set(PETAL_COLORS[index % PETAL_COLORS.length]);
    groundPetals.setColorAt(index, color);
  }
  groundPetals.instanceMatrix.needsUpdate = true;
  groundPetals.instanceColor.needsUpdate = true;
  groundPetals.castShadow = false;
  groundPetals.receiveShadow = false;
  group.add(groundPetals);

  // Dynamic falling petals.
  const fallingCount = quality.petalCount;
  const falling = new THREE.InstancedMesh(createPetalGeometry(), M.petal, fallingCount);
  falling.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  falling.castShadow = false;
  falling.receiveShadow = false;
  const petals = [];
  for (let index = 0; index < fallingCount; index++) {
    const petal = {
      position: new THREE.Vector3(),
      speed: 0.22 + rng() * 0.42,
      phase: rng() * Math.PI * 2,
      spin: new THREE.Vector3(rng() * 2.5, rng() * 2.5, rng() * 2.5),
      rotation: new THREE.Euler(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI),
      scale: 0.7 + rng() * 1.3,
      sway: 0.3 + rng() * 0.85,
      color: new THREE.Color(PETAL_COLORS[index % PETAL_COLORS.length])
    };
    resetPetal(petal, true);
    petals.push(petal);
    falling.setColorAt(index, petal.color);
  }
  falling.instanceColor.needsUpdate = true;
  group.add(falling);

  function resetPetal(petal, initial = false) {
    const angle = rng() * Math.PI * 2;
    const radius = Math.pow(rng(), 0.58) * 4.1;
    petal.position.set(
      Math.cos(angle) * radius,
      initial ? 2.5 + rng() * 4.4 : 5.4 + rng() * 2.3,
      Math.sin(angle) * radius
    );
    petal.phase = rng() * Math.PI * 2;
    petal.speed = 0.2 + rng() * 0.45;
  }

  addContactShadow(group, M.shadowTexture, [0.1, 0.06, 0.1], [9.0, 8.2], 0.22);

  let wind = 0.55;
  let petalsVisible = true;
  const dummyPetal = new THREE.Object3D();

  function update(dt, time) {
    const sway = Math.sin(time * 0.75) * 0.0045 * (0.25 + wind);
    visual.rotation.z = sway;
    visual.rotation.x = Math.cos(time * 0.52) * 0.0032 * (0.25 + wind);

    if (!petalsVisible) return;
    for (let index = 0; index < petals.length; index++) {
      const petal = petals[index];
      const drift = (0.16 + wind * 0.78) * petal.sway;
      petal.position.y -= petal.speed * dt * (0.75 + wind * 0.6);
      petal.position.x += (drift + Math.sin(time * 1.4 + petal.phase) * 0.17) * dt;
      petal.position.z += (Math.cos(time * 1.1 + petal.phase) * 0.16 + wind * 0.18) * dt;
      petal.rotation.x += petal.spin.x * dt;
      petal.rotation.y += petal.spin.y * dt;
      petal.rotation.z += petal.spin.z * dt;
      if (petal.position.y < 0.08 || petal.position.x > 9.5) resetPetal(petal);
      dummyPetal.position.copy(petal.position);
      dummyPetal.rotation.copy(petal.rotation);
      dummyPetal.scale.setScalar(petal.scale);
      dummyPetal.updateMatrix();
      falling.setMatrixAt(index, dummyPetal.matrix);
    }
    falling.instanceMatrix.needsUpdate = true;
  }

  function setWind(value) {
    wind = clamp(value, 0, 1);
  }

  function setPetalsVisible(value) {
    petalsVisible = value;
    falling.visible = value;
    if (value) {
      for (const petal of petals) resetPetal(petal, true);
    }
  }

  function getCanopyPoint() {
    return group.position.clone().add(new THREE.Vector3(0, 5.2, 0));
  }

  return {
    group,
    visual,
    blossoms,
    falling,
    groundPetals,
    update,
    setWind,
    setPetalsVisible,
    getCanopyPoint,
    anchors: {
      tree: [-5.6, 4.2, 6.8],
      canopy: [-5.6, 6.4, 6.8]
    }
  };
}

export function createCherry(M, quality) {
  return createTree(M, [-5.6, 0, 6.8], quality);
}
