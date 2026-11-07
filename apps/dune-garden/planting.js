// ==========================================================================
// Dune Garden — planting
//
// Massed dune grass (instanced folded blades with a wind shader), procedural
// olives with thousands of instanced leaves, ribbed organ-pipe cacti, golden
// barrel cactus and pale agaves. Every plant grows from the planter geometry in
// layout.js, so beds and planting never drift apart.
// ==========================================================================

import * as THREE from 'three';
import { createBarkTexture } from './textures.js';
import { PLANTERS, planterFootprint, soilY } from './layout.js';

const TAU = Math.PI * 2;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rnd, list) => list[Math.floor(rnd() * list.length) % list.length];

/* --------------------------------------------------------------------------
   Geometry — folded, tapering blades
   -------------------------------------------------------------------------- */

function createBladeGeometry({
  width = 0.05,
  bend = 0.14,
  fold = 0.42,
  rows = 6,
}) {
  const positions = [];
  const normals = [];
  const colors = [];
  const uvs = [];
  const indices = [];

  const baseColor = new THREE.Color(0.66, 0.68, 0.5);
  const tipColor = new THREE.Color(1.0, 0.99, 0.9);

  for (let r = 0; r <= rows; r += 1) {
    const t = r / rows;
    const w = Math.max(0.003, width * (1 - Math.pow(t, 1.35)));
    const xb = bend * t * t;
    const foldZ = w * fold;
    const row = [
      [-w / 2 + xb, t, 0],
      [xb, t, foldZ],
      [w / 2 + xb, t, 0],
    ];
    for (let k = 0; k < 3; k += 1) {
      positions.push(row[k][0], row[k][1], row[k][2]);
      normals.push(0, 1, 0);
      const c = baseColor.clone().lerp(tipColor, Math.pow(t, 0.85));
      colors.push(c.r, c.g, c.b);
      uvs.push(k * 0.5, t);
    }
  }

  for (let r = 0; r < rows; r += 1) {
    const i0 = r * 3;
    const i1 = i0 + 3;
    indices.push(
      i0,
      i0 + 1,
      i1,
      i1,
      i0 + 1,
      i1 + 1,
      i0 + 1,
      i0 + 2,
      i1 + 1,
      i1 + 1,
      i0 + 2,
      i1 + 2,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/* --------------------------------------------------------------------------
   Wind — a vertex-shader bend, phase-shifted per instance
   -------------------------------------------------------------------------- */

function applyWind(material, windUniform, strength = 1) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windUniform;
    shader.uniforms.uWindStrength = { value: strength };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uWindTime;\nuniform float uWindStrength;',
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        #ifdef USE_INSTANCING
          float bladeH = clamp(position.y, 0.0, 1.0);
          float phase = instanceMatrix[3].x * 0.52 + instanceMatrix[3].z * 0.81;
          float gust = sin(uWindTime * 0.55 + phase * 0.45) * 0.5 + 0.5;
          float sway = sin(uWindTime * 1.5 + phase) * 0.6
                     + sin(uWindTime * 2.7 + phase * 1.7) * 0.22;
          float bendAmt = bladeH * bladeH * uWindStrength;
          transformed.x += sway * bendAmt * (0.14 + gust * 0.16);
          transformed.z += cos(uWindTime * 1.1 + phase * 1.3) * bendAmt * 0.08;
        #endif
        `,
      );
  };
  material.customProgramCacheKey = () => `dune-wind-${strength}`;
  return material;
}

/* --------------------------------------------------------------------------
   Swept tapered tube — olive wood and ribbed cactus columns
   -------------------------------------------------------------------------- */

function sweepGeometry(
  points,
  radii,
  {
    radialSegments = 8,
    ribCount = 0,
    ribDepth = 0,
    closeStart = true,
    closeEnd = true,
  } = {},
) {
  const tangents = points.map((point, i) => {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    return new THREE.Vector3().subVectors(next, prev).normalize();
  });

  let normal = new THREE.Vector3(1, 0, 0);
  if (Math.abs(tangents[0].dot(normal)) > 0.9) normal.set(0, 0, 1);
  normal.addScaledVector(tangents[0], -normal.dot(tangents[0])).normalize();

  const frameNormals = [];
  const rotation = new THREE.Quaternion();
  for (let i = 0; i < points.length; i += 1) {
    if (i > 0) {
      rotation.setFromUnitVectors(tangents[i - 1], tangents[i]);
      normal.applyQuaternion(rotation);
      normal
        .addScaledVector(tangents[i], -normal.dot(tangents[i]))
        .normalize();
    }
    frameNormals.push(normal.clone());
  }

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i < points.length; i += 1) {
    const t = i / (points.length - 1);
    const binormal = new THREE.Vector3()
      .crossVectors(tangents[i], frameNormals[i])
      .normalize();
    for (let j = 0; j <= radialSegments; j += 1) {
      const angle = (j / radialSegments) * TAU;
      const rib = ribCount ? 1 + ribDepth * Math.cos(ribCount * angle) : 1;
      const r = radii[i] * rib;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const px = points[i].x + frameNormals[i].x * cos * r + binormal.x * sin * r;
      const py = points[i].y + frameNormals[i].y * cos * r + binormal.y * sin * r;
      const pz = points[i].z + frameNormals[i].z * cos * r + binormal.z * sin * r;
      positions.push(px, py, pz);
      const nx = frameNormals[i].x * cos + binormal.x * sin;
      const ny = frameNormals[i].y * cos + binormal.y * sin;
      const nz = frameNormals[i].z * cos + binormal.z * sin;
      const len = Math.hypot(nx, ny, nz) || 1;
      normals.push(nx / len, ny / len, nz / len);
      uvs.push(j / radialSegments, t);
    }
  }

  const stride = radialSegments + 1;
  for (let i = 0; i < points.length - 1; i += 1) {
    for (let j = 0; j < radialSegments; j += 1) {
      const a = i * stride + j;
      const b = a + stride;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const addCap = (ringStart, ringEnd, center, outward) => {
    const centerIndex = positions.length / 3;
    positions.push(center.x, center.y, center.z);
    normals.push(outward.x, outward.y, outward.z);
    uvs.push(0.5, ringStart === 0 ? 0 : 1);
    // reverse winding on the start cap so it faces outward
    const flip = outward.dot(tangents[0]) < 0;
    for (let j = 0; j < radialSegments; j += 1) {
      const a = ringStart + j;
      const b = ringStart + j + 1;
      if (flip) indices.push(centerIndex, a, b);
      else indices.push(centerIndex, b, a);
    }
    return centerIndex;
  };

  if (closeStart) {
    const outward = tangents[0].clone().negate();
    const center = points[0].clone().addScaledVector(tangents[0], -radii[0] * 0.12);
    addCap(0, 0, center, outward);
  }
  if (closeEnd) {
    const last = points.length - 1;
    const outward = tangents[last].clone();
    const center = points[last].clone().addScaledVector(outward, radii[last] * 0.6);
    addCap(last * stride, last * stride + radialSegments, center, outward);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/* --------------------------------------------------------------------------
   Dune grass field
   -------------------------------------------------------------------------- */

const GRASS_COLORS = [0xa5aa74, 0xbcb184, 0xb0ab7a, 0x94a06a, 0xc7bd92, 0x8b9762];

function createGrassField(windUniform, bladeMaterial) {
  const rnd = mulberry32(80417);
  const dummy = new THREE.Object3D();
  const placements = [];

  const regions = [];

  for (const planter of PLANTERS) {
    if (planter.kind === 'cacti') continue;
    const footprint = planterFootprint(planter);
    regions.push({
      ...footprint,
      y: soilY(planter),
      density: planter.kind === 'olive' ? 62 : 132,
      hMin: 0.5,
      hMax: 1.12,
      clumps: 8,
    });
  }

  // A few tufts pushing up between the cacti.
  regions.push({
    minX: 3.7,
    maxX: 6.7,
    minZ: -2.95,
    maxZ: -1.1,
    y: 0.44,
    density: 10,
    hMin: 0.3,
    hMax: 0.65,
    clumps: 4,
  });

  // Massed dune grass in the sand behind the low wall.
  regions.push({
    minX: -11.5,
    maxX: 11.5,
    minZ: -14.6,
    maxZ: -10.9,
    y: -0.02,
    density: 44,
    hMin: 0.55,
    hMax: 1.15,
    clumps: 16,
  });

  for (const region of regions) {
    const area = (region.maxX - region.minX) * (region.maxZ - region.minZ);
    const count = Math.max(1, Math.round(area * region.density));
    const clumps = [];
    for (let c = 0; c < (region.clumps ?? 8); c += 1) {
      clumps.push({
        x: region.minX + rnd() * (region.maxX - region.minX),
        z: region.minZ + rnd() * (region.maxZ - region.minZ),
        radius: 0.18 + rnd() * 0.32,
      });
    }

    for (let i = 0; i < count; i += 1) {
      let x;
      let z;
      if (rnd() < 0.55) {
        const clump = clumps[Math.floor(rnd() * clumps.length)];
        const angle = rnd() * TAU;
        const radius = Math.pow(rnd(), 0.7) * clump.radius;
        x = clump.x + Math.cos(angle) * radius;
        z = clump.z + Math.sin(angle) * radius;
      } else {
        x = region.minX + rnd() * (region.maxX - region.minX);
        z = region.minZ + rnd() * (region.maxZ - region.minZ);
      }
      x = Math.min(region.maxX, Math.max(region.minX, x));
      z = Math.min(region.maxZ, Math.max(region.minZ, z));

      const height = region.hMin + rnd() * (region.hMax - region.hMin);
      // A share of shorter, wider blades knits the mass together at the base.
      const understory = rnd() < 0.32;
      const width = understory ? 1.6 + rnd() * 1.0 : 0.9 + rnd() * 0.8;
      const bladeHeight = understory ? 0.28 + rnd() * 0.3 : height;
      placements.push({
        x,
        y: region.y + (rnd() - 0.5) * 0.02,
        z,
        height: bladeHeight,
        width,
        yaw: rnd() * TAU,
        tiltX: (rnd() - 0.5) * 0.44,
        tiltZ: (rnd() - 0.5) * 0.44,
        color: pick(rnd, GRASS_COLORS),
      });
    }
  }

  const mesh = new THREE.InstancedMesh(
    createBladeGeometry({ width: 0.05, bend: 0.24, fold: 0.42, rows: 6 }),
    bladeMaterial,
    placements.length,
  );
  mesh.name = 'dune-grass';
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = false;

  const color = new THREE.Color();
  placements.forEach((blade, index) => {
    dummy.position.set(blade.x, blade.y, blade.z);
    dummy.rotation.set(blade.tiltX, blade.yaw, blade.tiltZ);
    dummy.scale.set(blade.width, blade.height, blade.width);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);

    color.set(blade.color);
    color.multiplyScalar(0.92 + rnd() * 0.36);
    mesh.setColorAt(index, color);
  });

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  /* Pale seed heads on the taller blades — the signature of dune grass. */

  const seedCandidates = placements.filter(
    (blade) => blade.height > 0.52 && rnd() < 0.36,
  );
  const seedGeometry = new THREE.CylinderGeometry(0.004, 0.013, 0.34, 4, 1, true);
  seedGeometry.translate(0, 0.17, 0);
  const seedMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const seeds = new THREE.InstancedMesh(
    seedGeometry,
    seedMaterial,
    seedCandidates.length,
  );
  seeds.name = 'dune-seed-heads';
  seeds.frustumCulled = false;
  seeds.castShadow = false;
  const seedColors = [0xd9c9a0, 0xcdbb8a, 0xe2d4ac, 0xc4b07c];
  seedCandidates.forEach((blade, index) => {
    dummy.position.set(
      blade.x + Math.sin(blade.yaw) * 0.02,
      blade.y + blade.height * 0.97,
      blade.z + Math.cos(blade.yaw) * 0.02,
    );
    dummy.rotation.set(blade.tiltX * 1.5, blade.yaw, blade.tiltZ * 1.5);
    const size = 0.7 + rnd() * 0.8;
    dummy.scale.set(size, blade.height * (0.8 + rnd() * 0.5), size);
    dummy.updateMatrix();
    seeds.setMatrixAt(index, dummy.matrix);
    color.set(seedColors[Math.floor(rnd() * seedColors.length)]);
    seeds.setColorAt(index, color);
  });
  seeds.instanceMatrix.needsUpdate = true;
  if (seeds.instanceColor) seeds.instanceColor.needsUpdate = true;

  const field = new THREE.Group();
  field.name = 'dune-grass-field';
  field.add(mesh, seeds);
  return field;
}

/* --------------------------------------------------------------------------
   Olives
   -------------------------------------------------------------------------- */

const LEAF_COLORS = [0x8b9670, 0x9aa47c, 0x7d8862, 0xaab08a, 0x74805c, 0x95a077];

function buildOlive({
  x,
  z,
  y,
  scale = 1,
  seed,
  barkMaterial,
  leafPlacements,
  rnd,
}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  group.name = 'olive';

  const trunkHeight = 1.7 + rnd() * 0.5;
  const lean = (rnd() - 0.5) * 0.16;
  const trunkPoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * 0.3, 0.45, 0.02),
    new THREE.Vector3(lean * 0.6, 0.95, 0.05),
    new THREE.Vector3(lean * 0.8, 1.35, 0.03),
    new THREE.Vector3(lean, trunkHeight, 0),
  ];
  const trunkRadii = [0.18, 0.15, 0.12, 0.09, 0.07];

  const trunk = new THREE.Mesh(
    sweepGeometry(trunkPoints, trunkRadii, { radialSegments: 9 }),
    barkMaterial,
  );
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const branchCount = 6 + Math.floor(rnd() * 3);
  const canopyCenters = [];

  for (let i = 0; i < branchCount; i += 1) {
    const angle = (i / branchCount) * TAU + rnd() * 0.7;
    const reach = 0.5 + rnd() * 0.65;
    const rise = 0.85 + rnd() * 0.7;
    const start = new THREE.Vector3(
      lean + (rnd() - 0.5) * 0.05,
      trunkHeight - 0.12 - rnd() * 0.22,
      (rnd() - 0.5) * 0.05,
    );
    const mid = new THREE.Vector3(
      start.x + Math.cos(angle) * reach * 0.55,
      start.y + rise * 0.58,
      start.z + Math.sin(angle) * reach * 0.55,
    );
    const end = new THREE.Vector3(
      start.x + Math.cos(angle + (rnd() - 0.5) * 0.5) * reach,
      start.y + rise,
      start.z + Math.sin(angle + (rnd() - 0.5) * 0.5) * reach,
    );

    const branch = new THREE.Mesh(
      sweepGeometry([start, mid, end], [0.055, 0.032, 0.01], {
        radialSegments: 7,
      }),
      barkMaterial,
    );
    branch.castShadow = true;
    branch.receiveShadow = true;
    group.add(branch);

    canopyCenters.push(end);
    canopyCenters.push(mid.clone().lerp(end, 0.55));

    // A secondary twig.
    const twigEnd = end
      .clone()
      .add(
        new THREE.Vector3(
          Math.cos(angle + 1.2) * 0.35,
          0.22 + rnd() * 0.22,
          Math.sin(angle + 1.2) * 0.35,
        ),
      );
    const twig = new THREE.Mesh(
      sweepGeometry([end, twigEnd], [0.022, 0.006], { radialSegments: 6 }),
      barkMaterial,
    );
    twig.castShadow = true;
    group.add(twig);
    canopyCenters.push(twigEnd);
  }

  // Fill the canopy with instanced leaf cards.
  for (const center of canopyCenters) {
    const leafCount = 190 + Math.floor(rnd() * 80);
    for (let i = 0; i < leafCount; i += 1) {
      const theta = rnd() * TAU;
      const radius = Math.pow(rnd(), 0.55) * 0.64;
      const px =
        x + (center.x + Math.cos(theta) * radius) * scale;
      const py =
        y +
        (center.y + (rnd() - 0.5) * 0.56 - 0.04) * scale;
      const pz =
        z + (center.z + Math.sin(theta) * radius) * scale;

      leafPlacements.push({
        x: px,
        y: py,
        z: pz,
        rx: (rnd() - 0.5) * Math.PI,
        ry: rnd() * TAU,
        rz: (rnd() - 0.5) * Math.PI,
        scale: (0.6 + rnd() * 0.55) * scale,
        color: pick(rnd, LEAF_COLORS),
        shade: 0.78 + rnd() * 0.32,
      });
    }
  }

  return group;
}

function createLeafGeometry() {
  const positions = [
    0.1, 0, 0,
    0.018, 0.03, 0.006,
    -0.08, 0, 0,
    0.018, -0.03, 0.006,
  ];
  const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
  const uvs = [1, 0.5, 0.5, 1, 0, 0.5, 0.5, 0];
  const indices = [0, 1, 2, 0, 2, 3];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createLeafMesh(leafPlacements, material) {
  const mesh = new THREE.InstancedMesh(
    createLeafGeometry(),
    material,
    leafPlacements.length,
  );
  mesh.name = 'olive-leaves';
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = false;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  leafPlacements.forEach((leaf, index) => {
    dummy.position.set(leaf.x, leaf.y, leaf.z);
    dummy.rotation.set(leaf.rx, leaf.ry, leaf.rz);
    dummy.scale.setScalar(leaf.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    color.set(leaf.color).multiplyScalar(leaf.shade);
    mesh.setColorAt(index, color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/* --------------------------------------------------------------------------
   Cacti and agaves
   -------------------------------------------------------------------------- */

function createOrganPipe(rnd, x, z, y, material) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const columns = 8 + Math.floor(rnd() * 3);
  for (let c = 0; c < columns; c += 1) {
    const angle = (c / columns) * TAU + rnd() * 0.5;
    const distance = c === 0 ? 0 : 0.17 + rnd() * 0.26;
    const height = 1.25 + rnd() * 1.3;
    const bend = (rnd() - 0.5) * 0.18;
    const baseX = Math.cos(angle) * distance;
    const baseZ = Math.sin(angle) * distance;
    const radius = 0.1 + rnd() * 0.05;

    const points = [];
    const radii = [];
    const steps = 7;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      points.push(
        new THREE.Vector3(
          baseX + bend * t * t,
          height * t,
          baseZ + bend * 0.6 * t * t,
        ),
      );
      const profile =
        Math.sin(Math.PI * Math.min(1, 0.14 + t * 0.86)) * 0.9 + 0.1;
      radii.push(radius * profile);
    }
    radii[radii.length - 1] = 0.012;

    const column = new THREE.Mesh(
      sweepGeometry(points, radii, {
        radialSegments: 14,
        ribCount: 9,
        ribDepth: 0.075,
      }),
      material,
    );
    column.castShadow = true;
    column.receiveShadow = true;
    group.add(column);
  }

  return group;
}

function createBarrelCactus(rnd, x, z, y, radius, material) {
  const geometry = new THREE.SphereGeometry(radius, 36, 22);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const px = position.getX(i);
    const py = position.getY(i);
    const pz = position.getZ(i);
    const angle = Math.atan2(pz, px);
    const rib = 1 + 0.05 * Math.cos(16 * angle);
    position.setXYZ(i, px * rib, py * 0.78, pz * rib);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y + radius * 0.72, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createAgaveField(placements, material) {
  const geometry = createBladeGeometry({ width: 0.19, bend: 0.6, fold: 0.3, rows: 6 });

  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  mesh.name = 'agave';
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = false;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const tiltAxis = new THREE.Vector3(0, 0, 1);
  const qYaw = new THREE.Quaternion();
  const qTilt = new THREE.Quaternion();

  placements.forEach((leaf, index) => {
    qYaw.setFromAxisAngle(yAxis, leaf.yaw);
    qTilt.setFromAxisAngle(tiltAxis, -leaf.tilt);
    dummy.quaternion.copy(qYaw).multiply(qTilt);
    dummy.position.set(leaf.x, leaf.y, leaf.z);
    dummy.scale.set(leaf.scale, leaf.scale, leaf.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    color.set(leaf.color).multiplyScalar(leaf.shade);
    mesh.setColorAt(index, color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/* --------------------------------------------------------------------------
   Public API
   -------------------------------------------------------------------------- */

export function createPlanting(windUniform) {
  const group = new THREE.Group();
  group.name = 'planting';

  const rnd = mulberry32(39107);

  /* Materials ---------------------------------------------------------- */

  const bladeMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0,
  });
  applyWind(bladeMaterial, windUniform, 1);

  const barkMap = createBarkTexture({ size: 256, repeat: [2, 1] });
  const barkMaterial = new THREE.MeshStandardMaterial({
    map: barkMap,
    color: 0xb3a389,
    roughness: 0.95,
    metalness: 0,
  });

  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    roughness: 0.76,
    metalness: 0,
  });

  const cactusMaterial = new THREE.MeshStandardMaterial({
    color: 0x74875f,
    roughness: 0.72,
    metalness: 0,
    flatShading: true,
  });
  const barrelMaterial = new THREE.MeshStandardMaterial({
    color: 0x9aa26b,
    roughness: 0.76,
    metalness: 0,
    flatShading: true,
  });
  const agaveMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    roughness: 0.82,
    metalness: 0,
  });
  applyWind(agaveMaterial, windUniform, 0.35);

  /* Grass -------------------------------------------------------------- */

  group.add(createGrassField(windUniform, bladeMaterial));

  /* Olives ------------------------------------------------------------- */

  const leafPlacements = [];
  const oliveRnd = mulberry32(55123);

  const olives = [
    { x: -8.4, z: 3.4, y: soilY(PLANTERS.find((p) => p.id === 'olive')), scale: 1.3 },
    { x: -8.2, z: -8.2, y: soilY(PLANTERS.find((p) => p.id === 'back-left')), scale: 1.12 },
    { x: 3.4, z: -8.2, y: soilY(PLANTERS.find((p) => p.id === 'back-right')), scale: 1.18 },
  ];
  for (const olive of olives) {
    group.add(
      buildOlive({
        ...olive,
        barkMaterial,
        leafPlacements,
        rnd: oliveRnd,
      }),
    );
  }
  group.add(createLeafMesh(leafPlacements, leafMaterial));

  /* Cacti -------------------------------------------------------------- */

  const cactiPlanter = PLANTERS.find((p) => p.id === 'cacti');
  const cactiY = soilY(cactiPlanter);
  group.add(createOrganPipe(mulberry32(22319), 4.85, -2.15, cactiY, cactusMaterial));

  const barrels = [
    { x: 4.0, z: -1.7, r: 0.34 },
    { x: 6.15, z: -2.05, r: 0.3 },
    { x: 4.65, z: -2.65, r: 0.28 },
    { x: 5.85, z: -1.45, r: 0.24 },
  ];
  for (const barrel of barrels) {
    group.add(
      createBarrelCactus(mulberry32(907 * barrel.r * 1000 + 13), barrel.x, barrel.z, cactiY, barrel.r, barrelMaterial),
    );
  }

  /* Spines on the barrels ------------------------------------------------- */

  const spineGeometry = new THREE.ConeGeometry(0.0045, 0.055, 3);
  const spineMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8c9a0,
    roughness: 0.6,
    metalness: 0,
  });
  const spineCount = barrels.length * 150;
  const spines = new THREE.InstancedMesh(spineGeometry, spineMaterial, spineCount);
  spines.name = 'cactus-spines';
  spines.frustumCulled = false;
  const spineRnd = mulberry32(77441);
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  let spineIndex = 0;
  for (const barrel of barrels) {
    for (let i = 0; i < 150; i += 1) {
      const theta = spineRnd() * TAU;
      const phi = Math.acos(1 - spineRnd() * 1.2);
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      dummy.position.set(
        barrel.x + nx * barrel.r * 1.02,
        cactiY + barrel.r * 0.72 + ny * barrel.r * 0.8,
        barrel.z + nz * barrel.r * 1.02,
      );
      dummy.quaternion.setFromUnitVectors(up, new THREE.Vector3(nx, ny * 0.8, nz).normalize());
      dummy.scale.setScalar(0.8 + spineRnd() * 0.7);
      dummy.updateMatrix();
      spines.setMatrixAt(spineIndex, dummy.matrix);
      spineIndex += 1;
    }
  }
  spines.instanceMatrix.needsUpdate = true;
  group.add(spines);

  /* Agaves -------------------------------------------------------------- */

  const agavePlacements = [];
  const agaveRnd = mulberry32(60413);
  const agaveSites = [
    { x: -9.9, z: -8.15, y: 0.56, size: 1.2 },
    { x: 9.3, z: -8.35, y: 0.56, size: 1.0 },
    { x: 6.2, z: -2.55, y: cactiY, size: 0.9 },
    { x: -7.2, z: 3.95, y: 0.44, size: 0.75 },
  ];

  for (const site of agaveSites) {
    const leafCount = 16 + Math.floor(agaveRnd() * 5);
    for (let i = 0; i < leafCount; i += 1) {
      agavePlacements.push({
        x: site.x + (agaveRnd() - 0.5) * 0.08,
        y: site.y,
        z: site.z + (agaveRnd() - 0.5) * 0.08,
        yaw: (i / leafCount) * TAU + agaveRnd() * 0.25,
        tilt: 0.5 + agaveRnd() * 0.5,
        scale: site.size * (0.75 + agaveRnd() * 0.3),
        color: 0x94a58d,
        shade: 0.82 + agaveRnd() * 0.3,
      });
    }
  }
  group.add(createAgaveField(agavePlacements, agaveMaterial));

  return { group };
}
