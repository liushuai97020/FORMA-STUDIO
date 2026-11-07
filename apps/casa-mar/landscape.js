/* ==========================================================================
   CASA MAR — landscape
   --------------------------------------------------------------------------
   The site is a coastal shelf: a stone deck at the cliff, soft dunes south and
   east, open Atlantic north. The landscape is drawn from the same procedural
   kit as the house — no external models, no textures loaded from disk.

   The horizon, sea and sky are shader pairs so the warm coastal haze stays
   continuous at every viewport and in both day and dusk light.
   ========================================================================== */

import * as THREE from 'three';
import { createSea, createSky } from './shaders.js';

const DECK = {
  x0: -23.6,
  x1: 14.4,
  z0: -15.5,
  z1: 4.6,
};

/* --------------------------------------------------------------------------
   Seeded randomness
   -------------------------------------------------------------------------- */

function makeRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (value) => Math.min(1, Math.max(0, value));

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function hash2(x, z) {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function noise2(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  return (
    hash2(ix, iz) * (1 - ux) * (1 - uz) +
    hash2(ix + 1, iz) * ux * (1 - uz) +
    hash2(ix, iz + 1) * (1 - ux) * uz +
    hash2(ix + 1, iz + 1) * ux * uz
  );
}

/* Euclidean distance from the stone deck; used to keep dunes low at its edge. */
function distanceToDeck(x, z) {
  const dx = Math.max(DECK.x0 - x, 0, x - DECK.x1);
  const dz = Math.max(DECK.z0 - z, 0, z - DECK.z1);
  return Math.sqrt(dx * dx + dz * dz);
}

export function terrainHeight(x, z) {
  if (z < DECK.z0 + 0.2) {
    const drop = clamp01((DECK.z0 + 0.2 - z) / 5.5);
    return -0.36 - drop * 8.2;
  }

  const distance = distanceToDeck(x, z);
  const rise = smoothstep(0, 9, distance);

  let height = -0.34;
  height += 0.24 * Math.sin(x * 0.055 + z * 0.048 + 0.7);
  height += 0.13 * Math.sin(x * 0.135 - z * 0.11 + 2.4);
  height += 0.06 * noise2(x * 0.08, z * 0.08);
  height += 0.7 * smoothstep(10, 34, z);
  height += 0.55 * smoothstep(22, 58, z + x * 0.08);
  height += 0.5 * smoothstep(18, 48, x);
  height += 0.4 * smoothstep(24, 60, -x);
  height *= rise;
  height -= (1 - rise) * 0.35;
  return height;
}

/* --------------------------------------------------------------------------
   Dune ground
   -------------------------------------------------------------------------- */

function createTerrain(materials) {
  const width = 400;
  const depth = 340;
  const centerX = 25;
  const centerZ = 78;
  const columns = 168;
  const rows = 144;

  const positions = new Float32Array((columns + 1) * (rows + 1) * 3);
  const uvs = new Float32Array((columns + 1) * (rows + 1) * 2);
  const indices = [];

  let index = 0;
  let uvIndex = 0;
  for (let iz = 0; iz <= rows; iz += 1) {
    for (let ix = 0; ix <= columns; ix += 1) {
      const x = centerX - width / 2 + (width * ix) / columns;
      const z = centerZ - depth / 2 + (depth * iz) / rows;
      positions[index] = x;
      positions[index + 1] = terrainHeight(x, z);
      positions[index + 2] = z;
      uvs[uvIndex] = x / 7;
      uvs[uvIndex + 1] = z / 7;
      index += 3;
      uvIndex += 2;
    }
  }

  for (let iz = 0; iz < rows; iz += 1) {
    for (let ix = 0; ix < columns; ix += 1) {
      const a = iz * (columns + 1) + ix;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, materials.sand);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

/* --------------------------------------------------------------------------
   Dune grasses
   -------------------------------------------------------------------------- */

function createBladeGeometry() {
  const segments = 3;
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const indices = [];

  const root = new THREE.Color('#6f7250');
  const tip = new THREE.Color('#d8c99e');

  /* Each instance is a small tuft of three blades, so the dunes read as
     clumps of marram grass rather than a field of single spikes. */
  const blades = [
    { angle: 0, offsetX: 0, offsetZ: 0, lean: 0.26 },
    { angle: 2.15, offsetX: 0.07, offsetZ: 0.03, lean: 0.34 },
    { angle: 4.3, offsetX: -0.05, offsetZ: 0.06, lean: 0.19 },
  ];

  for (const blade of blades) {
    const start = positions.length / 3;
    const cos = Math.cos(blade.angle);
    const sin = Math.sin(blade.angle);

    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const bend = blade.lean * t * t;
      const width = 0.03 * (1 - t * 0.9);
      const x = bend + blade.offsetX;
      const z = blade.offsetZ;
      positions.push(
        x * cos - width * sin, t, x * sin + width * cos,
        x * cos + width * sin, t, x * sin - width * cos,
      );
      const color = root.clone().lerp(tip, t * 0.85);
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    }

    for (let i = 0; i < segments; i += 1) {
      const a = start + i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const GRASS_ZONES = [
  { x0: -46, x1: 26, z0: 5.6, z1: 34, weight: 0.36 },
  { x0: -40, x1: -23.8, z0: -15.4, z1: 14, weight: 0.18 },
  { x0: 14.6, x1: 40, z0: -15.4, z1: 16, weight: 0.2 },
  { x0: -26, x1: 16, z0: 5.2, z1: 11, weight: 0.14 },
  { x0: 4, x1: 42, z0: 10, z1: 40, weight: 0.12 },
];

function createGrasses(materials, random) {
  const count = 2050;
  const geometry = createBladeGeometry();
  const mesh = new THREE.InstancedMesh(geometry, materials.grass, count);
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();
  const color = new THREE.Color();

  const totalWeight = GRASS_ZONES.reduce((sum, zone) => sum + zone.weight, 0);
  let placed = 0;

  while (placed < count) {
    let pick = random() * totalWeight;
    let zone = GRASS_ZONES[0];
    for (const candidate of GRASS_ZONES) {
      pick -= candidate.weight;
      if (pick <= 0) {
        zone = candidate;
        break;
      }
    }

    const x = zone.x0 + random() * (zone.x1 - zone.x0);
    const z = zone.z0 + random() * (zone.z1 - zone.z0);
    const y = terrainHeight(x, z);

    /* A tuft is a handful of blades sharing a root: vary height and lean. */
    const height = 0.42 + random() * 0.95;
    const lean = 0.7 + random() * 0.7;
    euler.set(0, random() * Math.PI * 2, (random() - 0.5) * 0.25);
    quaternion.setFromEuler(euler);
    scale.set((0.8 + random() * 0.7) * lean, height, 1);
    position.set(x, y - 0.02, z);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(placed, matrix);

    const tint = 0.72 + random() * 0.4;
    color.setRGB(0.68 * tint, 0.68 * tint, 0.5 * tint);
    mesh.setColorAt(placed, color);

    placed += 1;
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function createForegroundGrasses(materials, random) {
  const count = 470;
  const geometry = createBladeGeometry();
  const mesh = new THREE.InstancedMesh(geometry, materials.grass, count);
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const x = -37 + random() * 50;
    const z = 5.8 + random() * 13;
    const y = terrainHeight(x, z);
    const height = 0.9 + random() * 1.05;
    euler.set(0, random() * Math.PI * 2, (random() - 0.5) * 0.32);
    quaternion.setFromEuler(euler);
    scale.set(0.9 + random() * 0.8, height, 1);
    position.set(x, y - 0.02, z);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(i, matrix);
    const tint = 0.8 + random() * 0.35;
    color.setRGB(0.74 * tint, 0.71 * tint, 0.5 * tint);
    mesh.setColorAt(i, color);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/* --------------------------------------------------------------------------
   Palms
   -------------------------------------------------------------------------- */

function createLeafletGeometry() {
  /* A tapered strip along +Y, one unit long and one unit wide at its base. */
  const positions = new Float32Array([
    -0.5, 0, 0,
    0.5, 0, 0,
    0.18, 0.55, 0.02,
    -0.18, 0.55, 0.02,
    0.08, 1, 0.03,
    -0.08, 1, 0.03,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3, 3, 2, 4, 3, 4, 5]);
  geometry.computeVertexNormals();
  return geometry;
}

function createPalm(materials, { x, z, height, lean = 0.5, seed = 1, baseY }) {
  const random = makeRandom(seed);
  const group = new THREE.Group();
  const base = baseY ?? terrainHeight(x, z);
  group.position.set(x, base, z);

  /* A gently curved trunk, built as a chain of tapered cylinders. */
  const segments = 13;
  const leanDirection = random() * Math.PI * 2;
  const leanX = Math.cos(leanDirection) * lean;
  const leanZ = Math.sin(leanDirection) * lean * 0.5;
  const points = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const bend = Math.pow(t, 1.75);
    points.push(
      new THREE.Vector3(leanX * bend * height * 0.12, t * height, leanZ * bend * height * 0.12),
    );
  }

  for (let i = 0; i < segments; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const radiusBottom = THREE.MathUtils.lerp(0.23, 0.115, i / segments);
    const radiusTop = THREE.MathUtils.lerp(0.23, 0.115, (i + 1) / segments);
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, length * 1.03, 8, 1),
      materials.palmTrunk,
    );
    trunk.position.copy(start).addScaledVector(direction, 0.5);
    trunk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);
  }

  /* Trunk rings read as a palm rather than a pole. */
  for (let i = 2; i < segments; i += 2) {
    const point = points[i];
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.225 - i * 0.008, 0.21 - i * 0.008, 0.075, 8, 1, true),
      materials.bark,
    );
    ring.position.copy(point);
    group.add(ring);
  }

  const crown = points[points.length - 1];
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), materials.palmTrunk);
  core.position.copy(crown);
  core.castShadow = true;
  group.add(core);

  for (let i = 0; i < 4; i += 1) {
    const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), materials.bark);
    coconut.position.copy(crown);
    coconut.position.x += (random() - 0.5) * 0.34;
    coconut.position.y -= 0.14 + random() * 0.16;
    coconut.position.z += (random() - 0.5) * 0.34;
    group.add(coconut);
  }

  /* Fronds: a shared instanced mesh of tapered leaflets. */
  const frondCount = 11;
  const samples = 26;
  const leafletsPerFrond = samples * 2;
  const leafletGeometry = createLeafletGeometry();
  const leaflets = new THREE.InstancedMesh(leafletGeometry, materials.palmLeaf, frondCount * leafletsPerFrond);
  leaflets.castShadow = true;
  leaflets.receiveShadow = false;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0);
  const direction = new THREE.Vector3();
  const side = new THREE.Vector3();
  const color = new THREE.Color();
  let instance = 0;

  for (let f = 0; f < frondCount; f += 1) {
    const angle = (f / frondCount) * Math.PI * 2 + random() * 0.2;
    const outward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const droop = 0.22 + random() * 0.34;
    const reach = 2.0 + random() * 0.9;

    for (let i = 0; i < samples; i += 1) {
      const t = 0.14 + (i / (samples - 1)) * 0.86;
      const radius = reach * t;
      const rachisY = 0.1 + Math.sin(t * Math.PI * 0.55) * 0.38 - droop * t * t * reach * 0.55;
      const point = new THREE.Vector3()
        .copy(crown)
        .addScaledVector(outward, radius)
        .add(new THREE.Vector3(0, rachisY, 0));

      /* Leaflets alternate out from the rachis, angled down and swept back. */
      const leafletLength = (0.38 + Math.sin(t * Math.PI) * 0.62) * (0.8 + random() * 0.25);
      for (const sign of [-1, 1]) {
        side.copy(outward).multiplyScalar(-sign * 0.5);
        side.z += sign * 0.86;
        side.y = 0;
        side.normalize();
        direction
          .set(
            side.x * 0.9 + outward.x * 0.4,
            0.18 - 0.45 * t - random() * 0.12,
            side.z * 0.9 + outward.z * 0.4,
          )
          .normalize();
        quaternion.setFromUnitVectors(up, direction);
        position.copy(point).addScaledVector(side, sign * 0.05);
        scale.set(0.09 + random() * 0.035, leafletLength, 1);
        matrix.compose(position, quaternion, scale);
        leaflets.setMatrixAt(instance, matrix);
        const tint = 0.7 + random() * 0.35;
        color.setRGB(0.38 * tint, 0.44 * tint, 0.28 * tint);
        leaflets.setColorAt(instance, color);
        instance += 1;
      }
    }
  }

  leaflets.instanceMatrix.needsUpdate = true;
  if (leaflets.instanceColor) leaflets.instanceColor.needsUpdate = true;
  group.add(leaflets);

  return group;
}

/* --------------------------------------------------------------------------
   Shrubs
   -------------------------------------------------------------------------- */

function createShrubs(materials, random) {
  const count = 34;
  const geometry = new THREE.IcosahedronGeometry(0.5, 1);
  const scrub = new THREE.InstancedMesh(geometry, materials.foliage, count);
  scrub.castShadow = true;
  scrub.receiveShadow = true;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    let x;
    let z;
    if (i < 16) {
      x = -46 + random() * 80;
      z = 8 + random() * 32;
    } else {
      x = 15 + random() * 34;
      z = -14 + random() * 20;
    }
    position.set(x, terrainHeight(x, z) + 0.22, z);
    quaternion.setFromEuler(new THREE.Euler(0, random() * Math.PI, 0));
    scale.set(0.8 + random() * 1.4, 0.55 + random() * 0.7, 0.8 + random() * 1.3);
    matrix.compose(position, quaternion, scale);
    scrub.setMatrixAt(i, matrix);
    const tint = 0.7 + random() * 0.3;
    color.setRGB(0.34 * tint, 0.38 * tint, 0.28 * tint);
    scrub.setColorAt(i, color);
  }

  scrub.instanceMatrix.needsUpdate = true;
  if (scrub.instanceColor) scrub.instanceColor.needsUpdate = true;
  return scrub;
}

/* --------------------------------------------------------------------------
   Assemble the landscape
   -------------------------------------------------------------------------- */

export function createLandscape(materials) {
  const group = new THREE.Group();
  const random = makeRandom(901);

  const sky = createSky();
  const sea = createSea();
  group.add(sky.mesh, sea.mesh);

  const terrain = createTerrain(materials);
  group.add(terrain);

  const grasses = createGrasses(materials, random);
  group.add(grasses);

  const foregroundGrasses = createForegroundGrasses(materials, random);
  group.add(foregroundGrasses);

  const shrubs = createShrubs(materials, random);
  group.add(shrubs);

  const palms = new THREE.Group();
  palms.add(
    createPalm(materials, { x: 17.8, z: -12.2, height: 8.4, lean: 0.55, seed: 12 }),
    createPalm(materials, { x: -22.3, z: -12.8, height: 6.4, lean: 0.85, seed: 37, baseY: 0 }),
    createPalm(materials, { x: 21.4, z: 1.6, height: 7.4, lean: 0.4, seed: 73 }),
    createPalm(materials, { x: -30.4, z: 6.8, height: 5.8, lean: 0.9, seed: 91 }),
  );
  group.add(palms);

  return { group, sky, sea, terrain, grasses, foregroundGrasses, palms };
}
