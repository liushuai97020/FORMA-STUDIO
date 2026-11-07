// ==========================================================================
// Linea Sofa — furniture atelier
//
// A low three-seat modular lounge built from plump, rounded volumes; two deep
// seat cushions, loosened back cushions, low arms, a continuous base on slim
// bronze legs. Styled with a folded wool throw on an ottoman and a travertine
// pedestal table carrying a hand-thrown ceramic vessel.
//
// All dimensions are metres. The composition is centred around the sofa with
// the ottoman forward-right and the table to the right.
// ==========================================================================

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  createCeramicBump,
  createContactShadowMap,
  createFabricMaps,
  createTravertineMaps,
  createWoolMaps,
  disposeTextures,
} from './textures.js';

export const FABRICS = [
  { id: 'sand', label: '沙色', labelEn: 'Sand', hex: '#c2a88b', sheen: '#f8e8d2' },
  { id: 'olive', label: '橄榄绿', labelEn: 'Olive', hex: '#767a5f', sheen: '#edead0' },
  { id: 'rust', label: '锈红', labelEn: 'Rust', hex: '#a55c3f', sheen: '#f4c7ad' },
];

/* -------------------------------------------------------------------------- */
/*  Geometry helpers                                                          */
/* -------------------------------------------------------------------------- */

function roundedBox(width, height, depth, radius = 0.06, segments = 5) {
  const safe = Math.min(radius, width / 2 - 0.001, height / 2 - 0.001, depth / 2 - 0.001);
  return new RoundedBoxGeometry(width, height, depth, segments, safe);
}

/**
 * A structured rounded volume with the faces inflated like a filled cushion.
 * Front, top and sides push outward while the contact edges stay tight.
 */
function plushGeometry(width, height, depth, { radius = 0.07, segments = 8, bulge = 0.05 } = {}) {
  const geometry = roundedBox(width, height, depth, radius, segments);
  const position = geometry.attributes.position;
  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < position.count; i += 1) {
    vertex.fromBufferAttribute(position, i);
    const nx = THREE.MathUtils.clamp(vertex.x / halfW, -1, 1);
    const ny = THREE.MathUtils.clamp(vertex.y / halfH, -1, 1);
    const nz = THREE.MathUtils.clamp(vertex.z / halfD, -1, 1);
    const invX = 1 - nx * nx;
    const invY = 1 - ny * ny;
    const invZ = 1 - nz * nz;

    vertex.x *= 1 + bulge * invY * invZ * 0.75;
    vertex.z *= 1 + bulge * invX * invY * 0.75;
    vertex.y *= 1 + bulge * invX * invZ * (vertex.y > 0 ? 1.25 : 0.32);

    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function rectPoints3D(halfA, halfB, radius, plane, offset) {
  const r = Math.max(0.001, Math.min(radius, halfA - 0.001, halfB - 0.001));
  const cornerCenters = [
    [halfA - r, halfB - r, 0],
    [-halfA + r, halfB - r, Math.PI / 2],
    [-halfA + r, -halfB + r, Math.PI],
    [halfA - r, -halfB + r, (Math.PI * 3) / 2],
  ];
  const arcs = [];
  for (let c = 0; c < cornerCenters.length; c += 1) {
    const [cx, cy, start] = cornerCenters[c];
    const arc = [];
    const steps = 10;
    for (let i = 0; i <= steps; i += 1) {
      const angle = start + (i / steps) * (Math.PI / 2);
      arc.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
    arcs.push(arc);
  }

  const points2D = [];
  for (let c = 0; c < arcs.length; c += 1) {
    const arc = arcs[c];
    for (let i = 0; i < arc.length; i += 1) points2D.push(arc[i]);
    const next = arcs[(c + 1) % arcs.length][0];
    const last = arc[arc.length - 1];
    for (let i = 1; i <= 5; i += 1) {
      const t = i / 6;
      points2D.push([last[0] + (next[0] - last[0]) * t, last[1] + (next[1] - last[1]) * t]);
    }
  }

  return points2D.map(([a, b]) => {
    if (plane === 'xz') return new THREE.Vector3(a, offset, b);
    return new THREE.Vector3(a, b, offset);
  });
}

function addWelt(parent, { width, height, depth, radius, plane, offset, material, thickness = 0.0055 }) {
  const points =
    plane === 'top'
      ? rectPoints3D(width / 2 - radius, depth / 2 - radius, radius, 'xz', offset)
      : rectPoints3D(width / 2 - radius, height / 2 - radius, radius, 'xy', offset);
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
  const geometry = new THREE.TubeGeometry(curve, 200, thickness, 5, true);
  const welt = new THREE.Mesh(geometry, material);
  welt.castShadow = false;
  welt.receiveShadow = true;
  parent.add(welt);
  return welt;
}

function makeMesh(geometry, material, { cast = true, receive = true } = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

/* -------------------------------------------------------------------------- */
/*  Furniture                                                                 */
/* -------------------------------------------------------------------------- */

export function createFurniture(renderer) {
  const textures = [];
  const fabricMaps = createFabricMaps(renderer);
  const woolMaps = createWoolMaps(renderer);
  const travertineMaps = createTravertineMaps(renderer);
  const ceramicBump = createCeramicBump(renderer);
  const contactMap = createContactShadowMap(renderer);
  textures.push(
    fabricMaps.map,
    fabricMaps.bumpMap,
    fabricMaps.normalMap,
    woolMaps.map,
    woolMaps.bumpMap,
    travertineMaps.map,
    travertineMaps.bumpMap,
    ceramicBump,
    contactMap,
  );

  const initial = FABRICS[0];

  const fabricMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initial.hex),
    map: fabricMaps.map,
    normalMap: fabricMaps.normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    bumpMap: fabricMaps.bumpMap,
    bumpScale: 0.018,
    roughness: 0.96,
    metalness: 0,
    sheen: 0.8,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color(initial.sheen),
    envMapIntensity: 0.26,
  });

  const pipingMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initial.hex).multiplyScalar(0.8),
    bumpMap: fabricMaps.bumpMap,
    bumpScale: 0.009,
    roughness: 0.86,
    metalness: 0,
    sheen: 0.7,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(initial.sheen).multiplyScalar(0.9),
    envMapIntensity: 0.25,
  });

  const accentFabricMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initial.hex).multiplyScalar(0.72),
    map: fabricMaps.map,
    normalMap: fabricMaps.normalMap,
    normalScale: new THREE.Vector2(0.9, 0.9),
    bumpMap: fabricMaps.bumpMap,
    bumpScale: 0.018,
    roughness: 0.97,
    metalness: 0,
    sheen: 0.7,
    sheenRoughness: 0.84,
    sheenColor: new THREE.Color(initial.sheen).multiplyScalar(0.85),
    envMapIntensity: 0.22,
  });

  const woolMaterial = new THREE.MeshStandardMaterial({
    map: woolMaps.map,
    bumpMap: woolMaps.bumpMap,
    bumpScale: 0.007,
    color: 0xf6eddf,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.18,
  });

  const stoneMaterial = new THREE.MeshStandardMaterial({
    map: travertineMaps.map,
    bumpMap: travertineMaps.bumpMap,
    bumpScale: 0.0045,
    color: 0xf7ead8,
    roughness: 0.82,
    metalness: 0,
    envMapIntensity: 0.35,
  });

  const ceramicMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xcfbea8,
    roughness: 0.38,
    metalness: 0,
    clearcoat: 0.26,
    clearcoatRoughness: 0.5,
    bumpMap: ceramicBump,
    bumpScale: 0.0016,
    envMapIntensity: 0.75,
  });

  const vesselInnerMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d332a,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.1,
  });

  const bronzeMaterial = new THREE.MeshStandardMaterial({
    color: 0x37302a,
    roughness: 0.42,
    metalness: 0.55,
    envMapIntensity: 0.7,
  });

  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x4b3a2b,
    transparent: true,
    opacity: 0.52,
    alphaMap: contactMap,
    depthWrite: false,
  });

  const group = new THREE.Group();
  group.name = 'linea-sofa';

  const sofa = new THREE.Group();
  group.add(sofa);

  /* ---------------------------------------------------------------- base */

  const legGeometry = new THREE.CylinderGeometry(0.019, 0.012, 0.1, 14);
  const legPositions = [
    [-1.31, -0.39],
    [0, -0.39],
    [1.31, -0.39],
    [-1.31, 0.39],
    [0, 0.39],
    [1.31, 0.39],
  ];
  for (let i = 0; i < legPositions.length; i += 1) {
    const leg = makeMesh(legGeometry, bronzeMaterial);
    leg.position.set(legPositions[i][0], 0.05, legPositions[i][1]);
    sofa.add(leg);
  }

  const baseWidth = 3.0;
  const baseDepth = 1.02;
  const baseHeight = 0.16;
  const base = makeMesh(
    plushGeometry(baseWidth, baseHeight, baseDepth, { radius: 0.05, segments: 6, bulge: 0.014 }),
    fabricMaterial,
  );
  base.position.set(0, 0.1 + baseHeight / 2, 0);
  sofa.add(base);

  /* ------------------------------------------------------- back structure */

  const backFrame = makeMesh(
    plushGeometry(3.0, 0.36, 0.2, { radius: 0.06, segments: 6, bulge: 0.018 }),
    fabricMaterial,
  );
  backFrame.position.set(0, 0.26 + 0.18, -0.41);
  sofa.add(backFrame);

  /* -------------------------------------------------------- seat cushions */

  const seatWidth = 1.22;
  const seatHeight = 0.2;
  const seatDepth = 0.82;
  const seatRadius = 0.085;

  for (let side = -1; side <= 1; side += 2) {
    const cushion = new THREE.Group();
    const cushionMesh = makeMesh(
      plushGeometry(seatWidth, seatHeight, seatDepth, {
        radius: seatRadius,
        segments: 8,
        bulge: 0.075,
      }),
      fabricMaterial,
    );
    cushion.add(cushionMesh);
    addWelt(cushion, {
      width: seatWidth,
      height: seatHeight,
      depth: seatDepth,
      radius: seatRadius,
      plane: 'top',
      offset: seatHeight / 2 - 0.007,
      material: pipingMaterial,
      thickness: 0.0058,
    });
    cushion.position.set(side * 0.62, 0.26 + seatHeight / 2, 0.08);
    cushion.rotation.x = -0.006;
    cushion.rotation.y = side * 0.004;
    sofa.add(cushion);
  }

  /* -------------------------------------------------------- back cushions */

  const backWidth = 1.21;
  const backHeight = 0.48;
  const backDepth = 0.19;
  const backRadius = 0.09;

  for (let side = -1; side <= 1; side += 2) {
    const cushion = new THREE.Group();
    const cushionMesh = makeMesh(
      plushGeometry(backWidth, backHeight, backDepth, {
        radius: backRadius,
        segments: 8,
        bulge: 0.085,
      }),
      fabricMaterial,
    );
    cushion.add(cushionMesh);

    addWelt(cushion, {
      width: backWidth,
      height: backHeight,
      depth: backDepth,
      radius: backRadius,
      plane: 'front',
      offset: backDepth / 2 - 0.004,
      material: pipingMaterial,
      thickness: 0.0054,
    });

    // A single tailored seam runs down the face of each back cushion.
    const seamPoints = [];
    const halfHeight = backHeight / 2;
    for (let i = 0; i <= 14; i += 1) {
      const t = -0.86 + (1.72 * i) / 14;
      const y = t * (halfHeight - backRadius);
      const ny = y / halfHeight;
      const z = (backDepth / 2) * (1 + 0.085 * (1 - ny * ny)) - 0.004;
      seamPoints.push(new THREE.Vector3(0, y, z));
    }
    const seamCurve = new THREE.CatmullRomCurve3(seamPoints, false, 'centripetal', 0.5);
    const seamGeometry = new THREE.TubeGeometry(seamCurve, 32, 0.0042, 5, false);
    const seam = new THREE.Mesh(seamGeometry, pipingMaterial);
    seam.castShadow = false;
    seam.receiveShadow = true;
    cushion.add(seam);

    cushion.position.set(side * 0.615, 0.55, -0.27);
    cushion.rotation.x = -0.1;
    cushion.rotation.z = side * 0.006;
    sofa.add(cushion);
  }

  /* ---------------------------------------------------------------- arms */

  const armWidth = 0.28;
  const armHeight = 0.36;
  const armDepth = 1.02;

  for (let side = -1; side <= 1; side += 2) {
    const arm = new THREE.Group();
    const armMesh = makeMesh(
      plushGeometry(armWidth, armHeight, armDepth, {
        radius: 0.095,
        segments: 8,
        bulge: 0.055,
      }),
      fabricMaterial,
    );
    arm.add(armMesh);
    addWelt(arm, {
      width: armWidth,
      height: armHeight,
      depth: armDepth,
      radius: 0.095,
      plane: 'top',
      offset: armHeight / 2 - 0.008,
      material: pipingMaterial,
      thickness: 0.0055,
    });
    arm.position.set(side * 1.36, 0.26 + armHeight / 2, 0);
    arm.rotation.y = side * 0.004;
    sofa.add(arm);
  }

  /* ------------------------------------------------------ accent cushion */

  const accent = new THREE.Group();
  const accentMesh = makeMesh(
    plushGeometry(0.52, 0.28, 0.14, { radius: 0.062, segments: 8, bulge: 0.07 }),
    accentFabricMaterial,
  );
  accent.add(accentMesh);
  addWelt(accent, {
    width: 0.52,
    height: 0.28,
    depth: 0.14,
    radius: 0.062,
    plane: 'front',
    offset: 0.07 - 0.004,
    material: pipingMaterial,
    thickness: 0.0042,
  });
  accent.position.set(-0.74, 0.6, -0.11);
  accent.rotation.set(-0.16, 0.24, 0.035);
  sofa.add(accent);

  /* ------------------------------------------------------------- ottoman */

  const ottoman = new THREE.Group();
  const ottomanWidth = 0.86;
  const ottomanHeight = 0.34;
  const ottomanDepth = 0.86;

  const plinth = makeMesh(
    roundedBox(0.72, 0.055, 0.72, 0.02, 4),
    new THREE.MeshStandardMaterial({
      color: 0x453a2e,
      roughness: 0.52,
      metalness: 0.28,
      envMapIntensity: 0.5,
    }),
  );
  plinth.position.y = 0.0275;
  ottoman.add(plinth);

  const ottomanBody = makeMesh(
    plushGeometry(ottomanWidth, ottomanHeight, ottomanDepth, {
      radius: 0.086,
      segments: 8,
      bulge: 0.036,
    }),
    fabricMaterial,
  );
  ottomanBody.position.y = 0.07 + ottomanHeight / 2;
  ottoman.add(ottomanBody);
  addWelt(ottoman, {
    width: ottomanWidth,
    height: ottomanHeight,
    depth: ottomanDepth,
    radius: 0.086,
    plane: 'top',
    offset: 0.07 + ottomanHeight - 0.009,
    material: pipingMaterial,
    thickness: 0.0055,
  });

  // Folded wool throw, three layers with a hand-cut fringe.
  const throwGroup = new THREE.Group();
  throwGroup.position.y = 0.07 + ottomanHeight;

  const foldLower = makeMesh(roundedBox(0.66, 0.06, 0.48, 0.024, 4), woolMaterial);
  foldLower.position.set(-0.015, 0.03, 0.01);
  foldLower.rotation.y = -0.11;
  foldLower.rotation.z = 0.006;
  throwGroup.add(foldLower);

  const foldMiddle = makeMesh(roundedBox(0.62, 0.055, 0.45, 0.022, 4), woolMaterial);
  foldMiddle.position.set(0.025, 0.0875, -0.005);
  foldMiddle.rotation.y = 0.07;
  foldMiddle.rotation.z = -0.007;
  throwGroup.add(foldMiddle);

  const foldUpper = makeMesh(roundedBox(0.56, 0.045, 0.4, 0.02, 4), woolMaterial);
  foldUpper.position.set(-0.01, 0.1375, 0.02);
  foldUpper.rotation.y = -0.035;
  throwGroup.add(foldUpper);

  const fringeGeometry = new THREE.CylinderGeometry(0.0024, 0.0016, 0.07, 4);
  const fringe = new THREE.InstancedMesh(fringeGeometry, woolMaterial, 18);
  const fringeDummy = new THREE.Object3D();
  for (let i = 0; i < 18; i += 1) {
    const x = -0.25 + (0.5 * i) / 17;
    fringeDummy.position.set(x, -0.08, 0.202);
    fringeDummy.rotation.set(0.05, 0, (i % 2 === 0 ? 1 : -1) * 0.035);
    fringeDummy.updateMatrix();
    fringe.setMatrixAt(i, fringeDummy.matrix);
  }
  fringe.instanceMatrix.needsUpdate = true;
  fringe.castShadow = false;
  fringe.receiveShadow = true;
  foldUpper.add(fringe);

  ottoman.add(throwGroup);
  ottoman.position.set(1.06, 0, 1.13);
  ottoman.rotation.y = -0.075;
  group.add(ottoman);

  /* -------------------------------------------------------- side table */

  const table = new THREE.Group();
  const profile = [
    [0.0, 0.0],
    [0.162, 0.0],
    [0.168, 0.007],
    [0.158, 0.016],
    [0.1, 0.042],
    [0.076, 0.08],
    [0.068, 0.15],
    [0.07, 0.235],
    [0.076, 0.315],
    [0.1, 0.35],
    [0.16, 0.366],
    [0.24, 0.374],
    [0.284, 0.38],
    [0.296, 0.387],
    [0.3, 0.397],
    [0.3, 0.406],
    [0.295, 0.412],
    [0.282, 0.416],
    [0.0, 0.416],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const tableGeometry = new THREE.LatheGeometry(profile, 72);
  const tableMesh = makeMesh(tableGeometry, stoneMaterial);
  table.add(tableMesh);
  table.position.set(2.2, 0, 0.02);
  table.rotation.y = 0.36;
  group.add(table);

  /* ------------------------------------------------------------ vessel */

  const vesselProfile = [
    [0.0, 0.0],
    [0.062, 0.0],
    [0.074, 0.006],
    [0.096, 0.028],
    [0.116, 0.07],
    [0.125, 0.12],
    [0.122, 0.165],
    [0.108, 0.21],
    [0.082, 0.248],
    [0.066, 0.272],
    [0.064, 0.288],
    [0.074, 0.298],
    [0.086, 0.304],
    [0.087, 0.312],
    [0.079, 0.318],
    [0.069, 0.315],
    [0.06, 0.302],
    [0.054, 0.29],
    [0.0, 0.288],
  ].map(([x, y]) => new THREE.Vector2(x, y));

  const vesselGeometry = new THREE.LatheGeometry(vesselProfile, 64);
  const vessel = makeMesh(vesselGeometry, ceramicMaterial);
  vessel.position.set(2.2, 0.416, 0.02);
  vessel.rotation.y = 0.5;
  vessel.scale.setScalar(1.12);
  group.add(vessel);

  const vesselMouth = makeMesh(new THREE.CircleGeometry(0.054, 32), vesselInnerMaterial, {
    cast: false,
    receive: true,
  });
  vesselMouth.rotation.x = -Math.PI / 2;
  vesselMouth.scale.setScalar(1.12);
  vesselMouth.position.set(2.2, 0.416 + 0.288 * 1.12, 0.02);
  group.add(vesselMouth);

  /* ------------------------------------------------- contact shadows */

  const shadowGeometry = new THREE.PlaneGeometry(1, 1);
  const shadows = [
    { x: 0, z: 0.02, sx: 4.25, sz: 2.25, opacity: 0.42 },
    { x: 1.06, z: 1.13, sx: 1.4, sz: 1.4, opacity: 0.36 },
    { x: 2.2, z: 0.02, sx: 0.95, sz: 0.95, opacity: 0.32 },
  ];
  for (let i = 0; i < shadows.length; i += 1) {
    const definition = shadows[i];
    const material = shadowMaterial.clone();
    material.opacity = definition.opacity;
    const shadow = new THREE.Mesh(shadowGeometry, material);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(definition.sx, definition.sz, 1);
    shadow.position.set(definition.x, 0.003 + i * 0.0004, definition.z);
    shadow.renderOrder = 2;
    shadow.castShadow = false;
    shadow.receiveShadow = false;
    shadow.userData.ignoreFraming = true;
    group.add(shadow);
  }

  /* ---------------------------------------------- fabric state / update */

  const targetColor = new THREE.Color(initial.hex);
  const targetSheen = new THREE.Color(initial.sheen);
  const targetPiping = new THREE.Color(initial.hex).multiplyScalar(0.8);
  const targetPipingSheen = new THREE.Color(initial.sheen).multiplyScalar(0.9);
  const targetAccent = new THREE.Color(initial.hex).multiplyScalar(0.72);
  const targetAccentSheen = new THREE.Color(initial.sheen).multiplyScalar(0.85);
  let currentFabric = initial.id;

  function setFabric(id) {
    const next = FABRICS.find((fabric) => fabric.id === id);
    if (!next || next.id === currentFabric) return;
    currentFabric = next.id;
    targetColor.set(next.hex);
    targetSheen.set(next.sheen);
    targetPiping.set(next.hex).multiplyScalar(0.8);
    targetPipingSheen.set(next.sheen).multiplyScalar(0.9);
    targetAccent.set(next.hex).multiplyScalar(0.72);
    targetAccentSheen.set(next.sheen).multiplyScalar(0.85);
  }

  function update(dt) {
    const k = 1 - Math.exp(-6.2 * Math.min(dt, 0.1));
    fabricMaterial.color.lerp(targetColor, k);
    fabricMaterial.sheenColor.lerp(targetSheen, k);
    pipingMaterial.color.lerp(targetPiping, k);
    pipingMaterial.sheenColor.lerp(targetPipingSheen, k);
    accentFabricMaterial.color.lerp(targetAccent, k);
    accentFabricMaterial.sheenColor.lerp(targetAccentSheen, k);
  }

  function dispose() {
    group.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (let i = 0; i < materials.length; i += 1) materials[i].dispose();
      }
    });
    disposeTextures(textures);
  }

  return {
    group,
    fabrics: FABRICS,
    setFabric,
    update,
    dispose,
    get fabricId() {
      return currentFabric;
    },
  };
}
