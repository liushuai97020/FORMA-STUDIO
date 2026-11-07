/* ==========================================================================
   CASA MAR — the house
   --------------------------------------------------------------------------
   Two limewashed volumes on a stone plinth: a long lower pavilion holding the
   living rooms, and an upper volume set back under a deep cantilevered slab.
   Full-height glass faces the pool, vertical oak fins screen the south sun,
   and a thin external stair folds the roof terrace back down to the deck.

   All dimensions are in metres. +x is east, +z is inland, -z is the sea.
   ========================================================================== */

import * as THREE from 'three';
import { createPoolWater } from './shaders.js';

const DECK = 0; // pool deck level
const FLOOR = 0.45; // villa finished floor
const LOWER_TOP = 3.3; // top of the lower volume walls
const TERRACE = 3.55; // upper terrace / upper volume floor
const UPPER_TOP = 6.4; // top of the upper volume walls
const ROOF_TOP = 6.75;
const CLIFF_Z = -15.6;

const POOL = {
  x0: -19.75,
  x1: -8.25,
  z0: -15.2,
  z1: -1.95,
  water: -0.16,
  floor: -1.55,
};

const bronze = (materials) => materials.bronze;

/* --------------------------------------------------------------------------
   Small geometry helpers
   -------------------------------------------------------------------------- */

function addBox(parent, material, width, height, depth, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  if (options.rotY) mesh.rotation.y = options.rotY;
  if (options.rotX) mesh.rotation.x = options.rotX;
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  parent.add(mesh);
  return mesh;
}

function addPlane(parent, material, width, depth, x, y, z, options = {}) {
  const geometry = new THREE.PlaneGeometry(width, depth);
  /* Scale UVs so stone paving keeps a consistent 4 m slab tile. */
  const uScale = options.uvX ?? options.uvScale;
  const vScale = options.uvY ?? options.uvScale;
  if (uScale || vScale) {
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i += 1) {
      uv.setXY(i, uv.getX(i) * (uScale ?? 1), uv.getY(i) * (vScale ?? 1));
    }
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  if (options.rotY) mesh.rotation.z = options.rotY;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = options.receive !== false;
  mesh.castShadow = false;
  parent.add(mesh);
  return mesh;
}

function addRod(parent, material, start, end, radius = 0.03) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 8);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addGlassQuad(parent, material, a, b, height) {
  /* A single vertical glass panel spanning a sloped run between two points. */
  const positions = new Float32Array([
    a.x, a.y + height, a.z,
    b.x, b.y + height, b.z,
    b.x, b.y, b.z,
    a.x, a.y, a.z,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

/* --------------------------------------------------------------------------
   Curtain wall builders
   -------------------------------------------------------------------------- */

function glazingX(parent, materials, x, y0, y1, z0, z1, options = {}) {
  const height = y1 - y0;
  const length = z1 - z0;
  const midY = (y0 + y1) / 2;
  const midZ = (z0 + z1) / 2;

  const glass = new THREE.Mesh(new THREE.PlaneGeometry(length, height), options.material ?? materials.glass);
  glass.rotation.y = Math.PI / 2;
  glass.position.set(x, midY, midZ);
  glass.castShadow = false;
  glass.receiveShadow = false;
  parent.add(glass);

  const frameMat = bronze(materials);
  addBox(parent, frameMat, 0.055, height, 0.055, x, midY, z0, { cast: false });
  addBox(parent, frameMat, 0.055, height, 0.055, x, midY, z1, { cast: false });
  addBox(parent, frameMat, 0.055, 0.07, length, x, y1 - 0.035, midZ, { cast: false });
  addBox(parent, frameMat, 0.055, 0.07, length, x, y0 + 0.035, midZ, { cast: false });

  const bays = Math.max(2, Math.round(length / 2.25));
  for (let i = 1; i < bays; i += 1) {
    const z = z0 + (length * i) / bays;
    addBox(parent, frameMat, 0.045, height, 0.045, x, midY, z, { cast: false });
  }

  return glass;
}

function glazingZ(parent, materials, z, x0, x1, y0, y1, options = {}) {
  const height = y1 - y0;
  const width = x1 - x0;
  const midY = (y0 + y1) / 2;
  const midX = (x0 + x1) / 2;

  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width, height), options.material ?? materials.glass);
  glass.position.set(midX, midY, z);
  glass.castShadow = false;
  glass.receiveShadow = false;
  parent.add(glass);

  const frameMat = bronze(materials);
  addBox(parent, frameMat, 0.055, height, 0.055, x0, midY, z, { cast: false });
  addBox(parent, frameMat, 0.055, height, 0.055, x1, midY, z, { cast: false });
  addBox(parent, frameMat, width, 0.07, 0.055, midX, y1 - 0.035, z, { cast: false });
  addBox(parent, frameMat, width, 0.07, 0.055, midX, y0 + 0.035, z, { cast: false });

  const bays = Math.max(2, Math.round(width / 2.25));
  for (let i = 1; i < bays; i += 1) {
    const x = x0 + (width * i) / bays;
    addBox(parent, frameMat, 0.045, height, 0.045, x, midY, z, { cast: false });
  }

  return glass;
}

function glassRailing(parent, materials, x0, x1, z, y, height = 1.02) {
  const width = x1 - x0;
  const midX = (x0 + x1) / 2;
  addBox(parent, materials.glassRail, width, height - 0.06, 0.016, midX, y + (height - 0.06) / 2, z, {
    cast: false,
    receive: false,
  });
  addBox(parent, bronze(materials), width + 0.04, 0.03, 0.055, midX, y + height, z, { cast: false });
  const posts = Math.max(2, Math.round(width / 2.6));
  for (let i = 0; i <= posts; i += 1) {
    const x = x0 + (width * i) / posts;
    addBox(parent, bronze(materials), 0.026, height, 0.026, x, y + height / 2, z, { cast: false });
  }
}

function glassRailingZ(parent, materials, z0, z1, x, y, height = 1.02) {
  const depth = z1 - z0;
  const midZ = (z0 + z1) / 2;
  addBox(parent, materials.glassRail, 0.016, height - 0.06, depth, x, y + (height - 0.06) / 2, midZ, {
    cast: false,
    receive: false,
  });
  addBox(parent, bronze(materials), 0.055, 0.03, depth + 0.04, x, y + height, midZ, { cast: false });
  const posts = Math.max(2, Math.round(depth / 2.6));
  for (let i = 0; i <= posts; i += 1) {
    const z = z0 + (depth * i) / posts;
    addBox(parent, bronze(materials), 0.026, height, 0.026, x, y + height / 2, z, { cast: false });
  }
}

/* --------------------------------------------------------------------------
   Furniture helpers
   -------------------------------------------------------------------------- */

function addLounger(parent, materials, x, z, rotation = 0, baseY = DECK) {
  const group = new THREE.Group();
  group.position.set(x, baseY + 0.05, z);
  group.rotation.y = rotation;

  /* Teak frame */
  addBox(group, materials.teak, 0.72, 0.07, 1.92, 0, 0.27, 0, { cast: true });
  for (const side of [-0.33, 0.33]) {
    addBox(group, materials.teak, 0.05, 0.08, 1.82, side, 0.2, 0, { cast: true });
  }
  addBox(group, materials.teak, 0.68, 0.08, 0.07, 0, 0.38, 0.88, { cast: true });
  addBox(group, materials.teak, 0.68, 0.08, 0.07, 0, 0.38, -0.88, { cast: true });
  for (const zPos of [-0.58, 0, 0.58]) {
    addBox(group, materials.teak, 0.66, 0.045, 0.05, 0, 0.375, zPos, { cast: true });
  }

  /* Cushion and tilted back. */
  addBox(group, materials.fabric, 0.64, 0.09, 1.5, 0, 0.43, -0.05, { cast: true });
  const back = addBox(group, materials.fabric, 0.64, 0.08, 0.9, 0, 0.63, 0.67, { cast: true });
  back.rotation.x = -0.62;
  const backRest = addBox(group, materials.teak, 0.7, 0.05, 0.86, 0, 0.56, 0.67, { cast: true });
  backRest.rotation.x = -0.62;

  parent.add(group);
  return group;
}

function addPlanter(parent, materials, x, z, scale = 1, baseY = DECK) {
  const group = new THREE.Group();
  group.position.set(x, baseY, z);
  group.scale.setScalar(scale);

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.27, 0.62, 18), materials.ceramic);
  pot.position.y = 0.31;
  pot.castShadow = true;
  pot.receiveShadow = true;
  group.add(pot);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.9, 8), materials.bark);
  trunk.position.y = 0.95;
  trunk.castShadow = true;
  group.add(trunk);

  const random = [
    [0.0, 1.72, 0.0, 0.42],
    [0.3, 1.58, 0.16, 0.3],
    [-0.26, 1.61, -0.1, 0.33],
    [0.06, 1.92, -0.12, 0.27],
    [-0.2, 1.86, 0.2, 0.22],
  ];
  for (const [dx, dy, dz, radius] of random) {
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), materials.foliage);
    crown.position.set(dx, dy, dz);
    crown.scale.y = 0.85;
    crown.castShadow = true;
    group.add(crown);
  }

  parent.add(group);
  return group;
}

function addPendant(parent, materials, x, y, z, drop = 0.7, shadeRadius = 0.17) {
  addRod(parent, bronze(materials), new THREE.Vector3(x, y + drop, z), new THREE.Vector3(x, y, z), 0.008);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(shadeRadius, shadeRadius * 1.16, 0.13, 20, 1, true), materials.bronze);
  shade.position.set(x, y - 0.07, z);
  shade.castShadow = false;
  parent.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(shadeRadius * 0.72, 12, 8), materials.windowGlow);
  bulb.position.set(x, y - 0.1, z);
  parent.add(bulb);
}

function addArmchair(parent, materials, x, z, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, FLOOR, z);
  group.rotation.y = rotation;
  addBox(group, materials.fabric, 0.78, 0.16, 0.78, 0, 0.34, 0, { cast: false, receive: false });
  addBox(group, materials.fabric, 0.78, 0.48, 0.16, 0, 0.62, 0.31, { cast: false, receive: false });
  addBox(group, materials.teak, 0.62, 0.28, 0.6, 0, 0.16, 0, { cast: false, receive: false });
  parent.add(group);
  return group;
}

/* --------------------------------------------------------------------------
   Site: plinth, deck, pool, cliff
   -------------------------------------------------------------------------- */

function buildSite(group, materials) {
  const deck = new THREE.Group();
  group.add(deck);

  /* The stone deck is three strips framing a pool that runs to the cliff edge. */
  const deckX0 = -23.6;
  const deckX1 = 14.4;
  const deckZ0 = -15.5;
  const deckZ1 = 4.6;
  const baseHeight = 0.5;
  const baseY = DECK - baseHeight / 2;

  const strips = [
    /* west of the pool */
    { x0: deckX0, x1: POOL.x0, z0: deckZ0, z1: POOL.z1 },
    /* east of the pool, running beneath the house */
    { x0: POOL.x1, x1: deckX1, z0: deckZ0, z1: POOL.z1 },
    /* the wide terrace south of the pool */
    { x0: deckX0, x1: deckX1, z0: POOL.z1, z1: deckZ1 },
  ];

  for (const strip of strips) {
    const width = strip.x1 - strip.x0;
    const depth = strip.z1 - strip.z0;
    const x = (strip.x0 + strip.x1) / 2;
    const z = (strip.z0 + strip.z1) / 2;
    addBox(group, materials.stoneDark, width, baseHeight, depth, x, baseY, z);
    addPlane(deck, materials.paving, width, depth, x, DECK + 0.012, z, {
      uvX: width / 4,
      uvY: depth / 4,
    });
  }

  /* The deck sits on a retaining wall along the cliff edge. */
  addBox(group, materials.cliff, 60, 7.6, 1.5, -3, -3.75, CLIFF_Z - 0.45, { receive: true });

  /* A quiet shadow reveal at the very edge of the cliff. */
  addBox(group, materials.seal, deckX1 - deckX0, 0.2, 0.1, (deckX0 + deckX1) / 2, -0.1, CLIFF_Z + 0.04, {
    cast: false,
  });

  /* ------------------------------------------------------------------ pool */

  const poolGroup = new THREE.Group();
  group.add(poolGroup);

  const width = POOL.x1 - POOL.x0;
  const depth = POOL.z1 - POOL.z0;
  const cx = (POOL.x0 + POOL.x1) / 2;
  const cz = (POOL.z0 + POOL.z1) / 2;
  const wallTop = -0.02;
  const wallHeight = wallTop - POOL.floor;

  /* Inner basin, lined with small glazed mosaic tiles. The seaward lip stays
     just below the waterline so the pool reads as a true infinity edge. */
  const northWallTop = POOL.water - 0.03;
  const northWallHeight = northWallTop - POOL.floor;
  addBox(poolGroup, materials.poolTile, width, northWallHeight, 0.14, cx, POOL.floor + northWallHeight / 2, POOL.z0 + 0.07);
  addBox(poolGroup, materials.poolTile, width, wallHeight, 0.14, cx, POOL.floor + wallHeight / 2, POOL.z1 - 0.07);
  addBox(poolGroup, materials.poolTile, 0.14, wallHeight, depth, POOL.x0 + 0.07, POOL.floor + wallHeight / 2, cz);
  addBox(poolGroup, materials.poolTile, 0.14, wallHeight, depth, POOL.x1 - 0.07, POOL.floor + wallHeight / 2, cz);
  addBox(poolGroup, materials.poolTile, width, 0.12, depth, cx, POOL.floor - 0.06, cz);

  /* Stone coping to the south and both long sides. */
  const copingTop = 0.1;
  addBox(poolGroup, materials.stone, 0.62, copingTop, depth, POOL.x0 - 0.31, copingTop / 2, cz, { cast: true });
  addBox(poolGroup, materials.stone, 0.62, copingTop, depth, POOL.x1 + 0.31, copingTop / 2, cz, { cast: true });
  addBox(poolGroup, materials.stone, width + 1.24, copingTop, 0.62, cx, copingTop / 2, POOL.z1 + 0.31, { cast: true });

  /* The infinity edge: a thin weir, then nothing but the Atlantic. */
  addBox(poolGroup, materials.stoneDark, width + 0.02, 0.09, 0.24, cx, POOL.water - 0.04, POOL.z0 - 0.09, {
    cast: false,
  });
  addBox(poolGroup, materials.seal, width + 0.02, 0.9, 0.36, cx, -0.62, POOL.z0 - 0.28, { cast: false });
  addBox(poolGroup, materials.seal, width + 0.02, 0.16, 0.5, cx, -1.24, POOL.z0 - 0.22, { cast: false });

  /* Water surface. */
  const water = createPoolWater();
  water.mesh.geometry.dispose();
  water.mesh.geometry = new THREE.PlaneGeometry(width + 0.04, depth + 0.04, 1, 1);
  water.mesh.position.set(cx, POOL.water, cz);
  poolGroup.add(water.mesh);

  /* Submerged steps in the shallow corner. */
  addBox(poolGroup, materials.poolTile, 2.1, 0.3, 0.9, POOL.x1 - 1.2, POOL.floor + 0.15, POOL.z1 - 0.62, {
    cast: false,
  });
  addBox(poolGroup, materials.poolTile, 2.1, 0.3, 0.72, POOL.x1 - 1.2, POOL.floor + 0.46, POOL.z1 - 0.52, {
    cast: false,
  });

  /* Warm underwater lamps — almost invisible by day, a glow at dusk. */
  const poolLamps = [];
  for (const z of [-5.2, -8.4, -11.6]) {
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.16, 18), materials.poolLamp);
    lamp.rotation.y = -Math.PI / 2;
    lamp.position.set(POOL.x1 - 0.16, -0.62, z);
    poolGroup.add(lamp);
    poolLamps.push(lamp);
  }

  /* A wide stone step at the entry. */
  addBox(group, materials.stone, 5.6, 0.15, 1.05, 6.9, 0.075, 3.35, { cast: true });
  addBox(group, materials.stone, 5.6, 0.3, 0.65, 6.9, 0.15, 3.05, { cast: true });

  /* Planting at the deck edge and beside the entry. */
  addPlanter(group, materials, -22.1, 3.4, 1.15);
  addPlanter(group, materials, -6.4, 4.1, 0.92);
  addPlanter(group, materials, 1.8, 4.2, 0.85);

  /* Two loungers face the water from the south deck. */
  addLounger(group, materials, -17.3, 0.85, 0);
  addLounger(group, materials, -15.1, 0.85, 0);
  addBox(group, materials.stone, 0.62, 0.36, 0.62, -13.0, 0.18, 1.05, { cast: true });

  return { deck, water, poolLamps };
}

/* --------------------------------------------------------------------------
   The lower pavilion
   -------------------------------------------------------------------------- */

function buildLowerVolume(group, materials) {
  const lower = new THREE.Group();
  group.add(lower);

  const x0 = -1.6;
  const x1 = 13.6;
  const z0 = -15.2;
  const z1 = 2.6;
  const width = x1 - x0;
  const depth = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;

  /* Stone plinth under the whole volume. */
  addBox(lower, materials.stone, width + 0.5, FLOOR, depth + 0.5, cx, FLOOR / 2, cz, { cast: true });

  /* Floor and roof slabs. */
  addBox(lower, materials.stoneDark, width, 0.22, depth, cx, FLOOR - 0.11, cz, { cast: true });
  addBox(lower, materials.lime, width, 0.25, depth, cx, LOWER_TOP + 0.125, cz, { cast: true });

  /* White end walls: east wall, and the south wall either side of the entry. */
  addBox(lower, materials.lime, 0.2, LOWER_TOP - FLOOR, depth, x1 - 0.1, (FLOOR + LOWER_TOP) / 2, cz);
  addBox(lower, materials.lime, 6.2, LOWER_TOP - FLOOR, 0.22, 1.5, (FLOOR + LOWER_TOP) / 2, z1 - 0.11);
  addBox(lower, materials.lime, 4.6, LOWER_TOP - FLOOR, 0.22, 11.3, (FLOOR + LOWER_TOP) / 2, z1 - 0.11);
  addBox(lower, materials.lime, 0.28, LOWER_TOP - FLOOR, 0.28, x0 + 0.14, (FLOOR + LOWER_TOP) / 2, z1 - 0.14);
  addBox(lower, materials.lime, 0.28, LOWER_TOP - FLOOR, 0.28, x1 - 0.14, (FLOOR + LOWER_TOP) / 2, z0 + 0.14);

  /* Glazing — a full-height west curtain wall facing the pool, plus north glass,
     a wide south entry and a ribbon window in the east wall. */
  glazingX(lower, materials, x0 + 0.03, FLOOR, LOWER_TOP, z0 + 0.25, z1 - 0.35);
  glazingZ(lower, materials, z0 + 0.08, x0 + 0.18, x1 - 0.18, FLOOR, LOWER_TOP);
  glazingZ(lower, materials, z1 - 0.08, 4.6, 9.0, FLOOR, LOWER_TOP);
  glazingX(lower, materials, x1 - 0.08, FLOOR, LOWER_TOP, 0.6, 2.2);

  /* Entry surround: a dark oak lintel and a fine bronze door pull. */
  addBox(lower, materials.oakDark, 4.8, 0.16, 0.36, 6.8, LOWER_TOP - 0.12, z1 + 0.02, { cast: true });
  addBox(lower, materials.bronze, 0.03, 0.9, 0.03, 6.35, 1.6, z1 + 0.06, { cast: false });

  /* Interior floor, ceiling and a warm back wall. */
  const floors = new THREE.Group();
  group.add(floors);
  addPlane(floors, materials.interiorFloor, width - 0.4, depth - 0.45, cx, FLOOR + 0.015, cz - 0.1, { uvScale: 6 });
  addBox(floors, materials.interiorCeiling, width - 0.4, 0.06, depth - 0.45, cx, LOWER_TOP - 0.2, cz - 0.1, {
    cast: false,
    receive: false,
  });

  /* A partial partition and back wall make the interior read at a glance. */
  addBox(floors, materials.interiorWall, 0.12, LOWER_TOP - FLOOR - 0.2, 4.6, 10.6, (FLOOR + LOWER_TOP) / 2, -10.2, {
    cast: false,
  });
  addBox(floors, materials.interiorWall, 4.2, LOWER_TOP - FLOOR - 0.2, 0.12, 8.5, (FLOOR + LOWER_TOP) / 2, -13.3, {
    cast: false,
  });

  /* Living room. */
  addPlane(lower, materials.rug, 5.4, 4.4, 4.9, FLOOR + 0.032, -6.2);
  addBox(lower, materials.fabricWarm, 3.1, 0.42, 0.92, 6.5, FLOOR + 0.37, -6.2, { cast: false, receive: false });
  addBox(lower, materials.fabricWarm, 3.1, 0.55, 0.22, 6.5, FLOOR + 0.63, -6.68, { cast: false, receive: false });
  addBox(lower, materials.fabric, 0.98, 0.34, 1.55, 8.1, FLOOR + 0.29, -5.5, { cast: false, receive: false });
  addBox(lower, materials.fabric, 0.44, 0.42, 0.44, 6.05, FLOOR + 0.38, -7.4, { cast: false, receive: false });
  addArmchair(lower, materials, 2.75, -7.9, 0.6);
  addArmchair(lower, materials, 3.2, -4.3, 2.6);

  addBox(lower, materials.teak, 1.9, 0.09, 0.9, 4.7, FLOOR + 0.34, -6.15, { cast: false, receive: false });
  for (const dx of [-0.78, 0.78]) {
    addBox(lower, materials.bronze, 0.05, 0.3, 0.75, 4.7 + dx, FLOOR + 0.17, -6.15, { cast: false });
  }

  /* Dining table under the entry glazing. */
  addBox(lower, materials.oak, 2.7, 0.09, 1.0, 7.8, FLOOR + 0.74, 0.1, { cast: false, receive: false });
  for (const dx of [-1.1, 1.1]) {
    for (const dz of [-0.34, 0.34]) {
      addBox(lower, materials.bronze, 0.05, 0.72, 0.05, 7.8 + dx, FLOOR + 0.36, 0.1 + dz, { cast: false });
    }
  }
  for (const dz of [-0.68, 0.86]) {
    for (const dx of [-0.72, 0.72]) {
      addBox(lower, materials.teak, 0.46, 0.05, 0.46, 7.8 + dx, FLOOR + 0.45, 0.1 + dz, { cast: false });
      addBox(lower, materials.teak, 0.42, 0.45, 0.05, 7.8 + dx, FLOOR + 0.68, 0.1 + dz + (dz > 0 ? 0.2 : -0.2), {
        cast: false,
      });
    }
  }
  addPendant(lower, materials, 7.8, LOWER_TOP - 0.3, 0.1, 0.9, 0.25);

  /* A low kitchen island along the east wall. */
  addBox(lower, materials.stone, 0.85, 0.9, 3.6, 12.6, FLOOR + 0.45, -11.2, { cast: false, receive: false });
  addBox(lower, materials.oak, 0.9, 0.07, 3.7, 12.6, FLOOR + 0.92, -11.2, { cast: false, receive: false });

  /* Floor lamp. */
  addRod(lower, bronze(materials), new THREE.Vector3(2.1, FLOOR, -5.0), new THREE.Vector3(2.1, FLOOR + 1.55, -5.0), 0.018);
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.32, 16, 1, true), materials.fabric);
  lampShade.position.set(2.1, FLOOR + 1.55, -5.0);
  lower.add(lampShade);

  return { lower, x0, x1, z0, z1, cz };
}

/* --------------------------------------------------------------------------
   The upper volume, roof, louvers and roof terrace
   -------------------------------------------------------------------------- */

function buildUpperVolume(group, materials, lights) {
  const upper = new THREE.Group();
  group.add(upper);

  const x0 = 0.2;
  const x1 = 12.8;
  const z0 = -15.2;
  const z1 = -4.2;
  const width = x1 - x0;
  const depth = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const wallHeight = UPPER_TOP - TERRACE;

  /* Upper floor plate and the big cantilevered roof slab. */
  addBox(upper, materials.stoneDark, width + 0.1, 0.08, depth + 0.1, cx, TERRACE + 0.04, cz, { cast: false });
  addBox(upper, materials.lime, 15.9, 0.35, 13.8, 6.85, 6.575, -9.6, { cast: true });

  /* White end and back walls. */
  addBox(upper, materials.lime, 0.2, wallHeight, depth, x1 - 0.1, TERRACE + wallHeight / 2, cz);
  addBox(upper, materials.lime, width, wallHeight, 0.22, cx, TERRACE + wallHeight / 2, z0 + 0.11);
  addBox(upper, materials.lime, 4.4, wallHeight, 0.22, 10.6, TERRACE + wallHeight / 2, z1 - 0.11);
  addBox(upper, materials.lime, 0.24, wallHeight, 0.24, x1 - 0.12, TERRACE + wallHeight / 2, z1 - 0.12);

  /* The west face is entirely glass, looking down the pool to the sea. */
  glazingX(upper, materials, x0 + 0.03, TERRACE, UPPER_TOP, z0 + 0.2, z1 - 0.25);

  /* The glazed south face sits behind the oak screen. */
  glazingZ(upper, materials, z1 - 0.08, x0 + 0.16, 8.4, TERRACE, UPPER_TOP);

  /* A horizontal slot window in the white south-east wall. */
  addBox(upper, materials.seal, 3.2, 1.0, 0.12, 10.6, 5.2, z1 + 0.02, { cast: false });
  glazingZ(upper, materials, z1 + 0.05, 9.15, 12.15, 4.76, 5.66);

  /* A slot window facing the sea. */
  addBox(upper, materials.seal, 9.4, 0.85, 0.12, 6.2, 5.5, z0 - 0.02, { cast: false });
  glazingZ(upper, materials, z0 - 0.05, 1.6, 10.8, 5.1, 5.9);

  /* Interior of the upper room: a calm, warm volume glimpsed through the fins. */
  addPlane(upper, materials.interiorFloor, width - 0.5, depth - 0.5, cx, TERRACE + 0.085, cz, { uvScale: 5 });
  addBox(upper, materials.interiorCeiling, width - 0.5, 0.06, depth - 0.5, cx, UPPER_TOP - 0.22, cz, {
    cast: false,
    receive: false,
  });
  addPlane(upper, materials.rug, 3.0, 2.4, 5.8, TERRACE + 0.1, -10.5);

  const bedGroup = new THREE.Group();
  bedGroup.position.set(8.9, TERRACE + 0.08, -11.4);
  addBox(bedGroup, materials.teak, 2.3, 0.32, 1.9, 0, 0.16, 0, { cast: false, receive: false });
  addBox(bedGroup, materials.fabric, 2.14, 0.24, 1.78, 0, 0.42, 0, { cast: false, receive: false });
  addBox(bedGroup, materials.fabric, 2.14, 0.12, 0.62, 0, 0.58, -0.5, { cast: false, receive: false });
  addBox(bedGroup, materials.oak, 2.24, 0.9, 0.12, 0, 0.45, -0.98, { cast: false, receive: false });
  upper.add(bedGroup);

  addBox(upper, materials.teak, 0.9, 0.04, 0.9, 5.3, TERRACE + 0.44, -9.0, { cast: false, receive: false });
  addRod(upper, bronze(materials), new THREE.Vector3(5.3, TERRACE, -9.0), new THREE.Vector3(5.3, TERRACE + 0.42, -9.0), 0.02);
  addBox(upper, materials.fabric, 1.8, 0.4, 0.8, 3.7, TERRACE + 0.28, -12.4, { cast: false, receive: false });

  /* ------------------------------------------------------------- oak fins */

  const finMaterial = materials.oak;
  const finGeometry = new THREE.BoxGeometry(0.055, wallHeight - 0.18, 0.18);
  const finCount = 34;
  const fins = new THREE.InstancedMesh(finGeometry, finMaterial, finCount);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.34, 0));
  const scale = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < finCount; i += 1) {
    const x = 0.55 + (7.65 * i) / (finCount - 1);
    matrix.compose(
      new THREE.Vector3(x, TERRACE + wallHeight / 2, -3.94),
      quaternion,
      scale,
    );
    fins.setMatrixAt(i, matrix);
  }
  fins.instanceMatrix.needsUpdate = true;
  fins.castShadow = true;
  fins.receiveShadow = true;
  upper.add(fins);

  addBox(upper, materials.oakDark, 8.5, 0.1, 0.24, 4.35, TERRACE + 0.05, -3.94, { cast: true });
  addBox(upper, materials.oakDark, 8.5, 0.1, 0.24, 4.35, UPPER_TOP - 0.09, -3.94, { cast: true });

  /* --------------------------------------------------------- soffit slats */

  /* South eave */
  const slatGeometrySouth = new THREE.BoxGeometry(15.6, 0.055, 0.09);
  const southCount = 11;
  const southSlats = new THREE.InstancedMesh(slatGeometrySouth, materials.oak, southCount);
  for (let i = 0; i < southCount; i += 1) {
    const z = -2.92 - i * 0.122;
    matrix.compose(new THREE.Vector3(6.8, 6.365, z), new THREE.Quaternion(), scale);
    southSlats.setMatrixAt(i, matrix);
  }
  southSlats.instanceMatrix.needsUpdate = true;
  southSlats.castShadow = true;
  southSlats.receiveShadow = true;
  upper.add(southSlats);

  /* West eave */
  const westGeometry = new THREE.BoxGeometry(0.09, 0.055, 13.6);
  const westCount = 8;
  const westSlats = new THREE.InstancedMesh(westGeometry, materials.oak, westCount);
  for (let i = 0; i < westCount; i += 1) {
    const x = -0.95 + i * 0.15;
    matrix.compose(new THREE.Vector3(x, 6.365, -9.6), new THREE.Quaternion(), scale);
    westSlats.setMatrixAt(i, matrix);
  }
  westSlats.instanceMatrix.needsUpdate = true;
  westSlats.castShadow = true;
  westSlats.receiveShadow = true;
  upper.add(westSlats);

  /* East eave */
  const eastGeometry = new THREE.BoxGeometry(0.09, 0.055, 13.6);
  const eastSlats = new THREE.InstancedMesh(eastGeometry, materials.oak, 11);
  for (let i = 0; i < 11; i += 1) {
    const x = 13.0 + i * 0.16;
    matrix.compose(new THREE.Vector3(x, 6.365, -9.6), new THREE.Quaternion(), scale);
    eastSlats.setMatrixAt(i, matrix);
  }
  eastSlats.instanceMatrix.needsUpdate = true;
  eastSlats.castShadow = true;
  eastSlats.receiveShadow = true;
  upper.add(eastSlats);

  /* White fascia cap and a fine shadow gap under the roof edge. */
  addBox(upper, materials.stoneDark, 15.94, 0.06, 13.84, 6.85, 6.73, -9.6, { cast: false });

  /* ------------------------------------------------------------------ roof terrace */

  addPlane(upper, materials.paving, 15.0, 6.9, 6.0, TERRACE + 0.005, -0.85, { uvX: 3.75, uvY: 1.725 });
  glassRailing(upper, materials, -1.55, 13.55, 2.53, TERRACE, 1.02);
  glassRailingZ(upper, materials, -4.1, 1.45, -1.57, TERRACE, 1.02);

  addLounger(upper, materials, 9.6, 0.7, 0, TERRACE);
  addLounger(upper, materials, 11.2, 0.7, 0, TERRACE);
  addBox(upper, materials.stone, 0.6, 0.42, 0.6, 10.4, TERRACE + 0.21, 1.55, { cast: true });
  addPlanter(upper, materials, 2.0, 0.9, 0.9, TERRACE);
  addPlanter(upper, materials, 13.0, 1.5, 0.8, TERRACE);

  /* A slim white chimney / stair volume rising through the roof adds asymmetry. */
  addBox(upper, materials.lime, 1.15, 1.05, 1.15, 12.2, ROOF_TOP + 0.52, -13.7, { cast: true });
  addBox(upper, materials.seal, 0.9, 0.03, 0.9, 12.2, ROOF_TOP + 1.06, -13.7, { cast: false });

  /* --------------------------------------------------------------- downlights */

  for (const x of [2.4, 6.4, 10.4]) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), materials.downlight);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(x, 6.36, -3.4);
    upper.add(disc);
    const light = new THREE.PointLight(0xffb877, 0, 6, 2);
    light.position.set(x, 6.2, -3.4);
    upper.add(light);
    lights.duskLights.push({ light, day: 0, dusk: 2.6 });
  }

  return { upper };
}

/* --------------------------------------------------------------------------
   The external stair from the roof terrace to the pool deck
   -------------------------------------------------------------------------- */

function buildStair(group, materials) {
  const stair = new THREE.Group();
  group.add(stair);

  const width = 1.34;
  const x = -2.32;
  const topZ = 1.78;
  const steps = 17;
  const rise = (TERRACE - 0.12) / steps;
  const run = 0.278;

  for (let i = 0; i < steps; i += 1) {
    const y = TERRACE - 0.12 - i * rise;
    const z = topZ - i * run;
    addBox(stair, materials.stone, width, 0.11, 0.3, x, y, z, { cast: true });
  }

  /* Bronze stringer under the outer edge. */
  const start = new THREE.Vector3(x - width / 2 + 0.03, TERRACE - 0.2, topZ + 0.1);
  const end = new THREE.Vector3(x - width / 2 + 0.03, DECK + 0.02, topZ - (steps - 1) * run - 0.1);
  addRod(stair, materials.bronze, start, end, 0.025);

  /* A single pane of glass follows the flight; a fine bronze rail caps it. */
  addGlassQuad(stair, materials.glassRail, start, end, 0.98);
  addRod(stair, materials.bronze, start.clone().add(new THREE.Vector3(0, 0.98, 0)), end.clone().add(new THREE.Vector3(0, 0.98, 0)), 0.018);

  /* Slender supports rooting the flight. */
  for (let i = 2; i < steps; i += 4) {
    const y = TERRACE - 0.12 - i * rise;
    const z = topZ - i * run;
    addRod(stair, materials.bronze, new THREE.Vector3(x + width / 2 - 0.05, DECK, z), new THREE.Vector3(x + width / 2 - 0.05, y - 0.06, z), 0.018);
  }

  /* A little landing plate at the top. */
  addBox(stair, materials.stone, width + 0.1, 0.11, 0.5, x, TERRACE - 0.055, topZ + 0.26, { cast: true });

  return stair;
}

/* --------------------------------------------------------------------------
   Lights that live inside the house
   -------------------------------------------------------------------------- */

function buildInteriorLights(group, lights) {
  const positions = [
    [4.6, 2.1, -6.2],
    [9.4, 2.1, 0.2],
    [11.0, 2.0, -10.6],
    [5.8, 5.1, -10.4],
    [10.8, 5.1, -6.6],
  ];

  for (const [x, y, z] of positions) {
    const light = new THREE.PointLight(0xffb26f, 0, 9, 2);
    light.position.set(x, y, z);
    group.add(light);
    lights.interiorLights.push({ light, day: 0.9, dusk: 14 });
  }

  /* A soft cove strip at the back of each room. */
  for (const [z, y, width] of [[-14.6, LOWER_TOP - 0.34, 12.0], [-14.8, UPPER_TOP - 0.3, 10.4]]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(width, 0.035, 0.03), lights.glowMaterials.strip);
    strip.position.set(6.2, y, z + 0.22);
    strip.castShadow = false;
    group.add(strip);
  }
}

/* --------------------------------------------------------------------------
   Assemble the house
   -------------------------------------------------------------------------- */

export function createVilla(materials) {
  const group = new THREE.Group();
  const lights = {
    interiorLights: [],
    duskLights: [],
    glowMaterials: {
      strip: materials.stripGlow,
      window: materials.windowGlow,
      downlight: materials.downlight,
      poolLamp: materials.poolLamp,
    },
  };

  const site = buildSite(group, materials);
  buildLowerVolume(group, materials);
  buildUpperVolume(group, materials, lights);
  buildStair(group, materials);
  buildInteriorLights(group, lights);

  return {
    group,
    water: site.water,
    poolLamps: site.poolLamps,
    lights,
  };
}
