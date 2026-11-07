// ==========================================================================
// Dune Garden — architecture
//
// The built courtyard: stone paving, a rimless-looking reflecting pool with a
// stone coping, board-formed retaining walls, raised planters, a slatted timber
// pavilion, low seating and the pale house that holds the garden's west edge.
// Everything is procedural geometry and canvas textures.
// ==========================================================================

import * as THREE from 'three';
import {
  createBarkTexture,
  createConcreteTexture,
  createDeckTexture,
  createPavingTexture,
  createPlasterTexture,
  createSoilTexture,
  createTimberTexture,
} from './textures.js';
import { createPool } from './water.js';
import {
  BACK_WALL,
  EAST_WALL,
  HOUSE,
  PAVILION,
  PAVING,
  PLANTERS,
  POOL,
  soilY,
} from './layout.js';

const TAU = Math.PI * 2;

function scaleUV(geometry, u, v) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
  }
  uv.needsUpdate = true;
  return geometry;
}

function boxMesh(width, height, depth, material, uScale = 1, vScale = 1) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  if (uScale !== 1 || vScale !== 1) scaleUV(geometry, uScale, vScale);
  return new THREE.Mesh(geometry, material);
}

function setShadows(object, { cast = true, receive = true } = {}) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
  return object;
}

function createMaterials() {
  const pavingMap = createPavingTexture({ size: 1024, repeat: [1, 1] });
  const concreteMap = createConcreteTexture({ size: 1024, repeat: [1, 1] });
  const timberMap = createTimberTexture({ size: 512, repeat: [1, 1] });
  const deckMap = createDeckTexture({ size: 512, repeat: [1, 1] });
  const soilMap = createSoilTexture({ size: 512, repeat: [1, 1] });
  const barkMap = createBarkTexture({ size: 256, repeat: [1, 1] });
  const plasterMap = createPlasterTexture({ size: 512, repeat: [1, 1] });

  return {
    paving: new THREE.MeshStandardMaterial({
      map: pavingMap,
      color: 0xe7ddcc,
      roughness: 0.88,
      metalness: 0,
    }),
    concrete: new THREE.MeshStandardMaterial({
      map: concreteMap,
      roughness: 0.93,
      metalness: 0,
    }),
    timber: new THREE.MeshStandardMaterial({
      map: timberMap,
      roughness: 0.72,
      metalness: 0,
    }),
    post: new THREE.MeshStandardMaterial({
      map: barkMap,
      color: 0xc3a077,
      roughness: 0.8,
      metalness: 0,
    }),
    deck: new THREE.MeshStandardMaterial({
      map: deckMap,
      roughness: 0.8,
      metalness: 0,
    }),
    soil: new THREE.MeshStandardMaterial({
      map: soilMap,
      roughness: 1,
      metalness: 0,
    }),
    stone: new THREE.MeshStandardMaterial({
      color: 0xc8baa2,
      roughness: 0.78,
      metalness: 0,
    }),
    stoneLight: new THREE.MeshStandardMaterial({
      color: 0xd3c6ae,
      roughness: 0.72,
      metalness: 0,
    }),
    plaster: new THREE.MeshStandardMaterial({
      map: plasterMap,
      roughness: 0.96,
      metalness: 0,
    }),
    roof: new THREE.MeshStandardMaterial({
      color: 0xb5ac9b,
      roughness: 0.9,
      metalness: 0,
    }),
    linen: new THREE.MeshStandardMaterial({
      color: 0xd9d0bd,
      roughness: 0.97,
      metalness: 0,
    }),
    metal: new THREE.MeshStandardMaterial({
      color: 0x2c2d26,
      roughness: 0.5,
      metalness: 0.55,
    }),
    basin: new THREE.MeshStandardMaterial({
      color: 0x2b322a,
      roughness: 0.95,
      metalness: 0,
    }),
    glow: new THREE.MeshStandardMaterial({
      color: 0x2a2b24,
      roughness: 0.4,
      metalness: 0.2,
      emissive: 0xffb877,
      emissiveIntensity: 0,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x1d241f,
      roughness: 0.18,
      metalness: 0.35,
      emissive: 0xffb26b,
      emissiveIntensity: 0,
    }),
  };
}

/* --------------------------------------------------------------------------
   Paving slab, kerb and ground-level stone path
   -------------------------------------------------------------------------- */

function createPaving(materials) {
  const group = new THREE.Group();
  group.name = 'paving';

  const width = PAVING.maxX - PAVING.minX;
  const depth = PAVING.maxZ - PAVING.minZ;
  const slab = boxMesh(width, 0.28, depth, materials.paving, width / 4.8, depth / 4.8);
  slab.position.set(
    (PAVING.minX + PAVING.maxX) / 2,
    -0.14,
    (PAVING.minZ + PAVING.maxZ) / 2,
  );
  slab.receiveShadow = true;
  slab.castShadow = false;
  group.add(slab);

  // A flush stone kerb along the open southern edge.
  const kerb = boxMesh(width, 0.1, 0.16, materials.stoneLight);
  kerb.position.set(0, 0.03, PAVING.maxZ - 0.08);
  kerb.receiveShadow = true;
  group.add(kerb);

  // Stepping stones through the planting and the back wall, out to the dunes.
  const stepGeometry = new THREE.BoxGeometry(1.15, 0.07, 0.62);
  for (let i = 0; i < 5; i += 1) {
    const step = new THREE.Mesh(stepGeometry, materials.stone);
    step.position.set(-0.75 + (i % 2 === 0 ? 0.14 : -0.14), 0.035, -8.9 - i * 1.42);
    step.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.06;
    step.receiveShadow = true;
    step.castShadow = true;
    group.add(step);
  }

  return group;
}

/* --------------------------------------------------------------------------
   Reflecting pool — stone coping, dark basin, water surface
   -------------------------------------------------------------------------- */

function createPoolZone(materials, shared) {
  const group = new THREE.Group();
  group.name = 'pool';

  const width = POOL.x1 - POOL.x0;
  const depth = POOL.z1 - POOL.z0;
  const cx = (POOL.x0 + POOL.x1) / 2;
  const cz = (POOL.z0 + POOL.z1) / 2;

  // Dark basin floor beneath the water.
  const basin = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.02, depth - 0.02),
    materials.basin,
  );
  basin.rotation.x = -Math.PI / 2;
  basin.position.set(cx, 0.02, cz);
  basin.receiveShadow = true;
  group.add(basin);

  // Water surface.
  const water = createPool({
    width,
    depth,
    x: cx,
    z: cz,
    y: POOL.waterY,
    shared,
  });
  group.add(water.mesh);

  // Stone coping on four sides.
  const cw = POOL.copingW;
  const ch = POOL.copingH;
  const copings = [
    { w: width + cw * 2, d: cw, x: cx, z: POOL.z0 - cw / 2 },
    { w: width + cw * 2, d: cw, x: cx, z: POOL.z1 + cw / 2 },
    { w: cw, d: depth, x: POOL.x0 - cw / 2, z: cz },
    { w: cw, d: depth, x: POOL.x1 + cw / 2, z: cz },
  ];
  for (const coping of copings) {
    const slab = boxMesh(coping.w, ch, coping.d, materials.stoneLight);
    slab.position.set(coping.x, ch / 2, coping.z);
    slab.receiveShadow = true;
    slab.castShadow = true;
    group.add(slab);
  }

  // A hairline shadow where the coping meets the paving.
  const joint = boxMesh(width + cw * 2 + 0.04, 0.012, depth + cw * 2 + 0.04, materials.basin);
  joint.position.set(cx, 0.006, cz);
  joint.receiveShadow = true;
  group.add(joint);

  return { group, water };
}

/* --------------------------------------------------------------------------
   Board-formed retaining walls
   -------------------------------------------------------------------------- */

function createLowWall({ axis, from, to, at, height, thickness, materials }) {
  const group = new THREE.Group();
  const length = to - from;
  const center = (from + to) / 2;

  const uScale = length / 2.4;
  const vScale = height / 1.8;
  const wall =
    axis === 'x'
      ? boxMesh(length, height, thickness, materials.concrete, uScale, vScale)
      : boxMesh(thickness, height, length, materials.concrete, uScale, vScale);
  wall.position.set(axis === 'x' ? center : at, height / 2, axis === 'x' ? at : center);
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  const cap =
    axis === 'x'
      ? boxMesh(length + 0.1, 0.07, thickness + 0.09, materials.stoneLight)
      : boxMesh(thickness + 0.09, 0.07, length + 0.1, materials.stoneLight);
  cap.position.set(axis === 'x' ? center : at, height + 0.035, axis === 'x' ? at : center);
  cap.castShadow = true;
  cap.receiveShadow = true;
  group.add(cap);

  return group;
}

function createWalls(materials) {
  const group = new THREE.Group();
  group.name = 'low-walls';

  group.add(
    createLowWall({
      axis: 'x',
      from: PAVING.minX,
      to: BACK_WALL.opening.x0,
      at: BACK_WALL.z,
      height: BACK_WALL.height,
      thickness: BACK_WALL.thickness,
      materials,
    }),
  );
  group.add(
    createLowWall({
      axis: 'x',
      from: BACK_WALL.opening.x1,
      to: PAVING.maxX,
      at: BACK_WALL.z,
      height: BACK_WALL.height,
      thickness: BACK_WALL.thickness,
      materials,
    }),
  );
  group.add(
    createLowWall({
      axis: 'z',
      from: EAST_WALL.z0,
      to: EAST_WALL.z1,
      at: EAST_WALL.x,
      height: EAST_WALL.height,
      thickness: EAST_WALL.thickness,
      materials,
    }),
  );

  return group;
}

/* --------------------------------------------------------------------------
   Raised planters
   -------------------------------------------------------------------------- */

function rectPlanter(planter, materials) {
  const group = new THREE.Group();
  const { width, depth, height } = planter;
  const t = 0.24;
  const capH = 0.06;

  const walls = [
    { w: width, d: t, x: 0, z: -depth / 2 + t / 2 },
    { w: width, d: t, x: 0, z: depth / 2 - t / 2 },
    { w: t, d: depth - t * 2, x: -width / 2 + t / 2, z: 0 },
    { w: t, d: depth - t * 2, x: width / 2 - t / 2, z: 0 },
  ];

  for (const wall of walls) {
    const mesh = boxMesh(
      wall.w,
      height,
      wall.d,
      materials.concrete,
      Math.max(wall.w, wall.d) / 2.4,
      height / 1.8,
    );
    mesh.position.set(wall.x, height / 2, wall.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const cap = boxMesh(wall.w + (wall.w < 1 ? 0.12 : 0), capH, wall.d + (wall.d < 1 ? 0.12 : 0), materials.stoneLight);
    cap.position.set(wall.x, height + capH / 2, wall.z);
    cap.castShadow = true;
    cap.receiveShadow = true;
    group.add(cap);
  }

  const soil = boxMesh(width - t * 2 - 0.04, 0.09, depth - t * 2 - 0.04, materials.soil);
  soil.position.set(0, height - 0.075, 0);
  soil.receiveShadow = true;
  group.add(soil);

  group.position.set(planter.x, 0, planter.z);
  return group;
}

function roundPlanter(planter, materials) {
  const group = new THREE.Group();
  const { r, height } = planter;

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(r + 0.13, r + 0.13, height, 48, 1, true),
    materials.concrete,
  );
  wall.position.y = height / 2;
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  const cap = new THREE.Mesh(
    new THREE.RingGeometry(r - 0.02, r + 0.16, 56, 1),
    materials.stoneLight,
  );
  cap.rotation.x = -Math.PI / 2;
  cap.position.y = height + 0.008;
  cap.receiveShadow = true;
  cap.castShadow = true;
  group.add(cap);

  const capSide = new THREE.Mesh(
    new THREE.CylinderGeometry(r + 0.16, r + 0.16, 0.05, 56, 1, true),
    materials.stoneLight,
  );
  capSide.position.y = height - 0.017;
  capSide.castShadow = true;
  capSide.receiveShadow = true;
  group.add(capSide);

  const soil = new THREE.Mesh(new THREE.CircleGeometry(r - 0.03, 48), materials.soil);
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = height - 0.02;
  soil.receiveShadow = true;
  group.add(soil);

  group.position.set(planter.x, 0, planter.z);
  return group;
}

function createPlanters(materials) {
  const group = new THREE.Group();
  group.name = 'planters';

  for (const planter of PLANTERS) {
    if (planter.type === 'round') {
      group.add(roundPlanter(planter, materials));
    } else {
      group.add(rectPlanter(planter, materials));
    }
  }

  return group;
}

/* --------------------------------------------------------------------------
   The house on the west edge
   -------------------------------------------------------------------------- */

function createHouse(materials) {
  const group = new THREE.Group();
  group.name = 'house';

  const wallLength = HOUSE.z1 - HOUSE.z0;
  const wallCenterZ = (HOUSE.z0 + HOUSE.z1) / 2;

  // Board-formed plinth.
  const plinth = boxMesh(
    0.46,
    0.5,
    wallLength,
    materials.concrete,
    wallLength / 2.4,
    0.5 / 1.8,
  );
  plinth.position.set(HOUSE.wallX, 0.25, wallCenterZ);
  setShadows(plinth);
  group.add(plinth);

  // Lime-plastered garden wall.
  const wall = boxMesh(
    0.4,
    HOUSE.height - 0.5,
    wallLength,
    materials.plaster,
    wallLength / 2.4,
    (HOUSE.height - 0.5) / 2.4,
  );
  wall.position.set(HOUSE.wallX, 0.5 + (HOUSE.height - 0.5) / 2, wallCenterZ);
  setShadows(wall);
  group.add(wall);

  // A shadow reveal where the wall meets the roof.
  const reveal = boxMesh(0.1, 0.1, wallLength, materials.basin);
  reveal.position.set(HOUSE.wallX + 0.19, HOUSE.height - 0.04, wallCenterZ);
  group.add(reveal);

  // House mass and a deep flat roof.
  const body = boxMesh(5.6, 3.4, wallLength + 1.2, materials.plaster, 3, 2);
  body.position.set(HOUSE.wallX - 3.0, 1.7, wallCenterZ);
  setShadows(body);
  group.add(body);

  const roof = boxMesh(6.2, 0.24, wallLength + 1.9, materials.roof);
  roof.position.set(HOUSE.wallX - 3.0, 3.5, wallCenterZ);
  setShadows(roof);
  group.add(roof);

  // A long horizontal window band and a doorway, both warm at dusk.
  const windowZ = -5.7;
  const windowGlass = boxMesh(0.07, 0.72, 4.8, materials.glass);
  windowGlass.position.set(HOUSE.wallX + 0.215, 1.58, windowZ);
  group.add(windowGlass);

  const mullionGeometry = new THREE.BoxGeometry(0.08, 0.8, 0.045);
  for (let i = 0; i < 6; i += 1) {
    const mullion = new THREE.Mesh(mullionGeometry, materials.metal);
    mullion.position.set(HOUSE.wallX + 0.24, 1.58, windowZ - 2.25 + i * 0.9);
    group.add(mullion);
  }

  const sill = boxMesh(0.2, 0.06, 5.1, materials.stoneLight);
  sill.position.set(HOUSE.wallX + 0.25, 1.2, windowZ);
  sill.castShadow = true;
  sill.receiveShadow = true;
  group.add(sill);

  // A thin timber awning over the window deepens the wall.
  const awning = boxMesh(1.05, 0.09, 5.6, materials.timber, 5.6 / 1.2, 1.05 / 1.2);
  awning.position.set(HOUSE.wallX + 0.7, 2.18, windowZ);
  awning.castShadow = true;
  awning.receiveShadow = true;
  group.add(awning);

  const awningEdge = boxMesh(1.1, 0.15, 0.08, materials.timber, 1.1 / 1.2, 0.15 / 1.2);
  awningEdge.position.set(HOUSE.wallX + 1.15, 2.1, windowZ + 2.76);
  awningEdge.castShadow = true;
  group.add(awningEdge);

  const doorZ = 2.7;
  const door = boxMesh(0.07, 2.3, 1.25, materials.glass);
  door.position.set(HOUSE.wallX + 0.215, 1.15, doorZ);
  group.add(door);

  const doorFrame = boxMesh(0.12, 0.05, 1.4, materials.metal);
  doorFrame.position.set(HOUSE.wallX + 0.24, 2.32, doorZ);
  group.add(doorFrame);

  const doorStep = boxMesh(1.9, 0.09, 0.9, materials.stone);
  doorStep.position.set(HOUSE.wallX + 0.7, 0.045, doorZ);
  doorStep.receiveShadow = true;
  doorStep.castShadow = true;
  group.add(doorStep);

  // A run of slim vertical battens gives the long wall a human scale.
  const battenGeometry = new THREE.BoxGeometry(0.045, 1.95, 0.035);
  for (let i = 0; i < 11; i += 1) {
    const batten = new THREE.Mesh(battenGeometry, materials.timber);
    batten.position.set(HOUSE.wallX + 0.22, 1.55, -2.4 + i * 0.185);
    batten.castShadow = true;
    batten.receiveShadow = true;
    group.add(batten);
  }

  setShadows(windowGlass, { cast: false, receive: false });
  setShadows(door, { cast: false, receive: false });

  const light = new THREE.PointLight(0xffb474, 0, 9, 2);
  light.position.set(HOUSE.wallX + 0.9, 1.85, windowZ);
  group.add(light);

  return { group, glowMaterials: [materials.glass], lights: [{ light, base: 5.5 }] };
}

/* --------------------------------------------------------------------------
   Timber pavilion
   -------------------------------------------------------------------------- */

function createPavilion(materials) {
  const group = new THREE.Group();
  group.name = 'pavilion';
  group.position.set(PAVILION.x, 0, PAVILION.z);

  const { width, depth, deckH, postH } = PAVILION;
  const halfW = width / 2 - 0.35;
  const halfD = depth / 2 - 0.35;

  const deck = boxMesh(width, deckH, depth, materials.deck, width, depth);
  deck.position.y = deckH / 2;
  setShadows(deck);
  group.add(deck);

  // Deck edge shadow gap.
  const shadowLine = boxMesh(width + 0.02, 0.02, depth + 0.02, materials.basin);
  shadowLine.position.y = 0.01;
  group.add(shadowLine);

  const postGeometry = new THREE.BoxGeometry(0.14, postH, 0.14);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(postGeometry, materials.post);
      post.position.set(sx * halfW, deckH + postH / 2, sz * halfD);
      post.castShadow = true;
      post.receiveShadow = true;
      group.add(post);
    }
  }

  const beamY = deckH + postH + 0.13;
  const beamZ1 = boxMesh(0.16, 0.26, depth - 0.2, materials.timber, (depth - 0.2) / 1.2, 0.26 / 1.2);
  const beamZ2 = beamZ1.clone();
  beamZ1.position.set(-halfW, beamY, 0);
  beamZ2.position.set(halfW, beamY, 0);
  group.add(beamZ1, beamZ2);

  const beamX1 = boxMesh(width - 0.2, 0.26, 0.16, materials.timber, (width - 0.2) / 1.2, 0.26 / 1.2);
  const beamX2 = beamX1.clone();
  beamX1.position.set(0, beamY, -halfD);
  beamX2.position.set(0, beamY, halfD);
  group.add(beamX1, beamX2);

  // Slatted roof — thin timber blades that throw striped shadows.
  const slatY = deckH + postH + 0.35;
  const slatCount = 13;
  const slatGeometry = boxMesh(
    width - 0.16,
    0.15,
    0.06,
    materials.timber,
    (width - 0.16) / 1.2,
    0.15 / 1.2,
  );
  for (let i = 0; i < slatCount; i += 1) {
    const slat = new THREE.Mesh(slatGeometry.geometry, materials.timber);
    const z = -2.16 + i * 0.36;
    slat.position.set(0, slatY, z);
    slat.castShadow = true;
    slat.receiveShadow = true;
    group.add(slat);
  }

  // A slim fascia along the outer edges.
  const fascia = boxMesh(width, 0.12, 0.05, materials.timber, width / 1.2, 0.1);
  fascia.position.set(0, beamY, halfD + 0.1);
  group.add(fascia);

  // Pendant lamp.
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.85, 6),
    materials.metal,
  );
  cord.position.set(0, deckH + postH + 0.35 - 0.42, 0);
  group.add(cord);

  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.13, 0.17, 24, 1, true),
    materials.metal,
  );
  shade.position.set(0, deckH + postH - 0.28, 0);
  group.add(shade);

  const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.13, 20), materials.glow);
  bulb.rotation.x = Math.PI / 2;
  bulb.position.set(0, deckH + postH - 0.37, 0);
  group.add(bulb);

  // A hidden warm strip along the underside of the roof beams.
  const strip = boxMesh(width - 1.2, 0.025, 0.035, materials.glow);
  strip.position.set(0, beamY - 0.16, halfD - 0.4);
  group.add(strip);

  const light = new THREE.PointLight(0xffbb80, 0, 10, 2);
  light.position.set(0, deckH + postH - 0.45, 0);
  group.add(light);

  // Low backless bench facing the pool from inside the pavilion.
  const benchSeat = boxMesh(0.46, 0.09, 2.5, materials.timber, 0.46 / 1.2, 2.5 / 1.2);
  benchSeat.position.set(halfW - 0.75, deckH + 0.43, 0);
  setShadows(benchSeat);
  group.add(benchSeat);

  const benchLegGeometry = new THREE.BoxGeometry(0.34, 0.38, 0.09);
  for (const z of [-0.95, 0.95]) {
    const leg = new THREE.Mesh(benchLegGeometry, materials.post);
    leg.position.set(halfW - 0.75, deckH + 0.19, z);
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);
  }

  // A low stone table just inside the pavilion.
  const table = boxMesh(0.7, 0.34, 1.1, materials.stone);
  table.position.set(-1.5, deckH + 0.17, 0.9);
  setShadows(table);
  group.add(table);

  return { group, glowMaterials: [materials.glow], lights: [{ light, base: 7 }] };
}

/* --------------------------------------------------------------------------
   Low seating by the pool
   -------------------------------------------------------------------------- */

function createLoungeChair(materials, x, z, rotation) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;

  const legGeometry = new THREE.BoxGeometry(0.055, 0.24, 0.055);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(legGeometry, materials.post);
      leg.position.set(sx * 0.32, 0.12, sz * 0.35);
      leg.castShadow = true;
      leg.receiveShadow = true;
      group.add(leg);
    }
  }

  const seat = boxMesh(0.74, 0.08, 0.8, materials.timber, 0.74 / 1.2, 0.8 / 1.2);
  seat.position.set(0, 0.28, 0);
  setShadows(seat);
  group.add(seat);

  const cushion = boxMesh(0.68, 0.07, 0.72, materials.linen);
  cushion.position.set(0, 0.355, -0.02);
  setShadows(cushion);
  group.add(cushion);

  const back = boxMesh(0.74, 0.62, 0.07, materials.timber, 0.74 / 1.2, 0.62 / 1.2);
  back.position.set(0, 0.55, 0.37);
  back.rotation.x = -0.16;
  setShadows(back);
  group.add(back);

  const backCushion = boxMesh(0.66, 0.52, 0.07, materials.linen);
  backCushion.position.set(0, 0.58, 0.31);
  backCushion.rotation.x = -0.16;
  setShadows(backCushion);
  group.add(backCushion);

  return group;
}

function createSeating(materials) {
  const group = new THREE.Group();
  group.name = 'seating';

  group.add(createLoungeChair(materials, -5.7, 2.0, 0.1));
  group.add(createLoungeChair(materials, -3.55, 2.15, -0.07));

  const table = boxMesh(1.15, 0.34, 0.72, materials.stone);
  table.position.set(-4.6, 0.17, 3.35);
  table.rotation.y = 0.03;
  setShadows(table);
  group.add(table);

  // A low timber tray on the table.
  const tray = boxMesh(0.6, 0.035, 0.34, materials.timber, 0.6 / 1.2, 0.34 / 1.2);
  tray.position.set(-4.55, 0.36, 3.3);
  tray.rotation.y = 0.28;
  setShadows(tray);
  group.add(tray);

  return group;
}

function createForeground(materials) {
  const group = new THREE.Group();
  group.name = 'foreground';

  // A monolithic stone bench anchoring the open southern edge of the court.
  const benchBase = boxMesh(3.1, 0.36, 0.62, materials.stone);
  benchBase.position.set(0.2, 0.18, 5.55);
  setShadows(benchBase);
  group.add(benchBase);

  const benchTop = boxMesh(3.16, 0.06, 0.68, materials.stoneLight);
  benchTop.position.set(0.2, 0.39, 5.55);
  setShadows(benchTop);
  group.add(benchTop);

  // A small stone drum table.
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.31, 0.36, 28),
    materials.stone,
  );
  drum.position.set(2.25, 0.18, 5.5);
  drum.castShadow = true;
  drum.receiveShadow = true;
  group.add(drum);

  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.2, 0.09, 28),
    materials.stoneLight,
  );
  bowl.position.set(2.25, 0.4, 5.5);
  bowl.castShadow = true;
  bowl.receiveShadow = true;
  group.add(bowl);

  return group;
}

/* --------------------------------------------------------------------------
   Public API
   -------------------------------------------------------------------------- */

export function createArchitecture(shared) {
  const materials = createMaterials();
  const group = new THREE.Group();
  group.name = 'architecture';

  group.add(createPaving(materials));

  const pool = createPoolZone(materials, shared);
  group.add(pool.group);

  group.add(createWalls(materials));
  group.add(createPlanters(materials));

  const house = createHouse(materials);
  group.add(house.group);

  const pavilion = createPavilion(materials);
  group.add(pavilion.group);

  group.add(createSeating(materials));
  group.add(createForeground(materials));

  const glowMaterials = [...house.glowMaterials, ...pavilion.glowMaterials];
  const lights = [...house.lights, ...pavilion.lights];

  return {
    group,
    materials,
    water: pool.water,
    glowMaterials,
    lights,
    setDusk(dusk) {
      for (const material of glowMaterials) {
        material.emissiveIntensity = dusk * 1.9;
      }
      for (const entry of lights) {
        entry.light.intensity = dusk * entry.base;
      }
    },
  };
}
