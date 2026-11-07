/* ============================================================================
   GT-01 — procedural concept coupé
   ----------------------------------------------------------------------------
   The body is a hand-built loft rather than a pile of primitives: dense side
   skins are swept from the wheel-arch line to a rounded shoulder, a crowned top
   deck closes the hood and rear deck, and curved front / rear fascias close the
   volume. The wheel arches are cut into the side boundary itself, so the skin
   runs cleanly over the wheels and the openings read as real wheel wells. Every
   surface is generated at runtime — no assets, no network.
   ============================================================================ */

import * as THREE from 'three';

/* ----------------------------------------------------------- dimensions */

const FRONT = -2.42;
const REAR = 2.42;
const BOTTOM_Y = 0.15;
const HALF_WIDTH = 0.95;

const AXLE_F = -1.45;
const AXLE_R = 1.5;
const AXLE_Y = 0.365;
const ARCH_R = 0.42;

const SIDE_STEPS = 210;
const SIDE_ROWS = 26;
const TOP_COLS = 18;
const CAP_COLS = 20;

const CANOPY_DEPTH = 1.36;
const CANOPY_BEVEL = 0.055;
const CANOPY_BASE_Y = 0.905;
const CANOPY_HALF = CANOPY_DEPTH / 2 + CANOPY_BEVEL;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/* -------------------------------------------------------------- palette */

export const PAINTS = [
  {
    id: 'sage',
    label: 'Sage metallic',
    color: 0x667a63,
    metalness: 0.72,
    roughness: 0.3,
  },
  {
    id: 'silver',
    label: 'Warm silver',
    color: 0xb7b3a8,
    metalness: 0.92,
    roughness: 0.22,
  },
  {
    id: 'graphite',
    label: 'Deep graphite',
    color: 0x2a2c2e,
    metalness: 0.82,
    roughness: 0.26,
  },
];

/* -------------------------------------------------- body sculpt helpers */

const BODY_WIDTH = [
  [-2.5, 0.8],
  [-2.2, 0.86],
  [-1.9, 0.92],
  [-1.5, 0.97],
  [-1.0, 0.995],
  [-0.4, 1.0],
  [0.2, 0.985],
  [0.8, 0.99],
  [1.5, 1.02],
  [1.9, 0.985],
  [2.2, 0.9],
  [2.5, 0.8],
];

const CANOPY_WIDTH = [
  [-0.8, 0.68],
  [-0.45, 0.8],
  [-0.1, 0.88],
  [0.3, 0.93],
  [0.7, 0.95],
  [1.1, 0.9],
  [1.4, 0.8],
  [1.72, 0.64],
];

/* Upper silhouette: hood, beltline, rear deck. Starts at the nose leading
   edge and ends at the tail lip. */
const TOP_PROFILE = [
  [-2.42, 0.585],
  [-2.34, 0.62],
  [-2.2, 0.667],
  [-2.0, 0.716],
  [-1.76, 0.773],
  [-1.5, 0.835],
  [-1.2, 0.878],
  [-0.86, 0.911],
  [-0.48, 0.932],
  [-0.05, 0.943],
  [0.5, 0.943],
  [1.0, 0.934],
  [1.4, 0.918],
  [1.72, 0.897],
  [1.98, 0.865],
  [2.18, 0.82],
  [2.32, 0.76],
  [2.42, 0.67],
];

const CANOPY_PROFILE = [
  [-0.72, CANOPY_BASE_Y],
  [-0.56, 0.968],
  [-0.34, 1.058],
  [-0.06, 1.152],
  [0.28, 1.225],
  [0.62, 1.252],
  [0.92, 1.242],
  [1.16, 1.2],
  [1.36, 1.12],
  [1.52, 1.018],
  [1.66, CANOPY_BASE_Y],
];

/* ---------------------------------------------------- profile sampling */

const TOP_CURVE = new THREE.CatmullRomCurve3(
  TOP_PROFILE.map(([x, y]) => new THREE.Vector3(x, y, 0)),
  false,
  'centripetal',
  0.5,
);
const TOP_POINTS = TOP_CURVE.getPoints(160);

function topYAt(x) {
  const clamped = clamp(x, FRONT, REAR);
  for (let i = 1; i < TOP_POINTS.length; i += 1) {
    const a = TOP_POINTS[i - 1];
    const b = TOP_POINTS[i];
    if (clamped <= b.x) {
      const t = (clamped - a.x) / Math.max(1e-6, b.x - a.x);
      return a.y + (b.y - a.y) * t;
    }
  }
  return TOP_POINTS[TOP_POINTS.length - 1].y;
}

function tableValue(table, x) {
  if (x <= table[0][0]) return table[0][1];
  const last = table[table.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < table.length; i += 1) {
    const [x1, v1] = table[i - 1];
    const [x2, v2] = table[i];
    if (x <= x2) {
      const t = smoothstep(x1, x2, x);
      return v1 + (v2 - v1) * t;
    }
  }
  return last[1];
}

function bodyWidthScale(x) {
  return tableValue(BODY_WIDTH, x);
}

function canopyWidthScale(x) {
  return tableValue(CANOPY_WIDTH, x);
}

/* The skin above a wheel arch follows the arch itself, so the opening is cut
   directly into the lower boundary of the side surfaces. */
function archChord() {
  return Math.sqrt(Math.max(0.001, ARCH_R * ARCH_R - (AXLE_Y - BOTTOM_Y) ** 2));
}

function archBoundary(x) {
  let y = BOTTOM_Y;
  for (const center of [AXLE_F, AXLE_R]) {
    const chord = archChord();
    if (Math.abs(x - center) <= chord) {
      const lift = Math.sqrt(Math.max(0, ARCH_R * ARCH_R - (x - center) ** 2));
      y = Math.max(y, AXLE_Y + lift);
    }
  }
  return y;
}

function sideZAt(x, y) {
  const top = topYAt(x);
  const t = clamp((y - BOTTOM_Y) / Math.max(0.05, top - BOTTOM_Y), 0, 1);
  const bow = 0.948 + 0.058 * Math.sin(Math.PI * t);
  return HALF_WIDTH * bodyWidthScale(x) * bow;
}

/* ------------------------------------------------------------ side data */

const STATIONS = [];
for (let i = 0; i <= SIDE_STEPS; i += 1) {
  const x = FRONT + ((REAR - FRONT) * i) / SIDE_STEPS;
  const top = topYAt(x);
  const bottom = archBoundary(x);
  const shoulderR = Math.min(0.062, Math.max(0.018, (top - bottom) * 0.36));
  const shoulderY = top - shoulderR;
  const shoulderZ = sideZAt(x, shoulderY);
  const topZ = shoulderZ * 0.952;
  STATIONS.push({ x, top, bottom, shoulderY, shoulderZ, topZ });
}

function stationRows(station) {
  const rows = [];
  for (let j = 0; j <= SIDE_ROWS; j += 1) {
    const v = j / SIDE_ROWS;
    let y;
    let z;
    if (v <= 0.76) {
      y = station.bottom + (station.shoulderY - station.bottom) * (v / 0.76);
      z = sideZAt(station.x, y);
    } else {
      const a = ((v - 0.76) / 0.24) * (Math.PI / 2);
      y = station.shoulderY + (station.top - station.shoulderY) * Math.sin(a);
      z = station.shoulderZ + (station.topZ - station.shoulderZ) * (1 - Math.cos(a));
    }
    rows.push({ y, z });
  }
  return rows;
}

/* ------------------------------------------------------- mesh builders */

function addGrid(positions, indices, cols, flip = false) {
  const stride = cols + 1;
  const rows = positions.length / stride / 3;
  for (let i = 0; i < rows - 1; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      const a = i * stride + j;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      if (flip) {
        indices.push(a, b, c, b, d, c);
      } else {
        indices.push(a, c, b, b, c, d);
      }
    }
  }
}

function makeMesh(positions, indices, material, name) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  return mesh;
}

function buildSidePanel(stationData, sign, material) {
  const positions = [];
  const indices = [];
  for (const station of stationData) {
    const rows = stationRows(station);
    for (const row of rows) {
      positions.push(station.x, row.y, sign * row.z);
    }
  }
  addGrid(positions, indices, SIDE_ROWS);
  return makeMesh(positions, indices, material, sign > 0 ? 'side-right' : 'side-left');
}

function buildTopDeck(stationData, material) {
  const positions = [];
  const indices = [];
  for (const station of stationData) {
    for (let j = 0; j <= TOP_COLS; j += 1) {
      const u = -1 + (2 * j) / TOP_COLS;
      const crown = 0.01 * (1 - u * u);
      positions.push(station.x, station.top + crown, u * station.topZ);
    }
  }
  addGrid(positions, indices, TOP_COLS, true);
  return makeMesh(positions, indices, material, 'top-deck');
}

function buildCap(station, sign, material) {
  const rows = stationRows(station);
  const positions = [];
  const indices = [];
  const bulge = 0.085;

  for (let i = 0; i <= SIDE_ROWS; i += 1) {
    const row = rows[i];
    const v = i / SIDE_ROWS;
    const bulgeFactor = 1 - smoothstep(0.72, 1, v);
    for (let j = 0; j <= CAP_COLS; j += 1) {
      const u = -1 + (2 * j) / CAP_COLS;
      const crown = 0.01 * (1 - u * u) * smoothstep(0.82, 1, v);
      const z = u * row.z;
      const surfaceX =
        sign < 0
          ? FRONT - bulge * Math.pow(1 - u * u, 1.35) * bulgeFactor
          : REAR + bulge * Math.pow(1 - u * u, 1.35) * bulgeFactor;
      positions.push(surfaceX, row.y + crown, z);
    }
  }
  addGrid(positions, indices, CAP_COLS);
  return makeMesh(positions, indices, material, sign < 0 ? 'front-cap' : 'rear-cap');
}

/* ------------------------------------------------ wheel-arch lip trim */

function buildArchLips(material) {
  const group = new THREE.Group();
  const chord = archChord();
  const start = Math.atan2(BOTTOM_Y - AXLE_Y, chord);
  const end = Math.PI - start;

  for (const center of [AXLE_F, AXLE_R]) {
    const points = [];
    for (let i = 0; i <= 40; i += 1) {
      const angle = start + ((end - start) * i) / 40;
      const x = center + Math.cos(angle) * ARCH_R;
      const y = AXLE_Y + Math.sin(angle) * ARCH_R;
      points.push([x, y, sideZAt(x, y) + 0.002]);
    }
    for (const sign of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3(
        points.map(([x, y, z]) => new THREE.Vector3(x, y, sign * z)),
      );
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 52, 0.006, 6, false),
        material,
      );
      group.add(mesh);
    }
  }
  return group;
}

/* --------------------------------------------------------------- body */

function buildBody(material, trimMaterial) {
  const group = new THREE.Group();
  group.name = 'body';

  const right = buildSidePanel(STATIONS, 1, material);
  const left = buildSidePanel(STATIONS, -1, material);
  const deck = buildTopDeck(STATIONS, material);
  const front = buildCap(STATIONS[0], -1, material);
  const rear = buildCap(STATIONS[STATIONS.length - 1], 1, material);
  const lips = buildArchLips(trimMaterial);

  group.add(right, left, deck, front, rear, lips);
  return group;
}

/* --------------------------------------------------------------- canopy */

function buildCanopyShape() {
  const curve = new THREE.CatmullRomCurve3(
    CANOPY_PROFILE.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    false,
    'centripetal',
    0.5,
  );
  const points = curve.getPoints(120);
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    shape.lineTo(points[i].x, points[i].y);
  }
  shape.lineTo(CANOPY_PROFILE[CANOPY_PROFILE.length - 1][0], CANOPY_BASE_Y);
  shape.closePath();
  return shape;
}

function buildCanopyTrim(materials) {
  const points = [];
  const steps = 44;
  for (let i = 0; i <= steps; i += 1) {
    const x = -0.72 + (2.38 * i) / steps;
    const z = CANOPY_HALF * canopyWidthScale(x) * 0.985;
    points.push(new THREE.Vector3(x, CANOPY_BASE_Y + 0.004, z));
  }
  for (let i = steps; i >= 0; i -= 1) {
    const x = -0.72 + (2.38 * i) / steps;
    const z = CANOPY_HALF * canopyWidthScale(x) * 0.985;
    points.push(new THREE.Vector3(x, CANOPY_BASE_Y + 0.004, -z));
  }
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 160, 0.0075, 6, true),
    materials.trim,
  );
  mesh.name = 'canopy-trim';
  return mesh;
}

function buildCanopy(materials) {
  const shape = buildCanopyShape();
  let geometry = new THREE.ExtrudeGeometry(shape, {
    depth: CANOPY_DEPTH,
    bevelEnabled: true,
    bevelThickness: CANOPY_BEVEL,
    bevelSize: 0.045,
    bevelSegments: 4,
    steps: 1,
    curveSegments: 1,
  });

  geometry.translate(0, 0, -CANOPY_DEPTH / 2);

  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const tumble = 1 - 0.34 * smoothstep(CANOPY_BASE_Y, 1.26, y);
    position.setZ(i, z * canopyWidthScale(x) * tumble);
  }
  position.needsUpdate = true;

  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const mesh = new THREE.Mesh(geometry, materials.glass);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 2;
  mesh.name = 'canopy';
  return mesh;
}

/* ---------------------------------------------------------- materials */

function makeMaterials() {
  const paint = new THREE.MeshPhysicalMaterial({
    color: PAINTS[0].color,
    metalness: PAINTS[0].metalness,
    roughness: PAINTS[0].roughness,
    clearcoat: 1.0,
    clearcoatRoughness: 0.07,
    envMapIntensity: 1.25,
  });

  return {
    paint,
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x243335,
      metalness: 0.0,
      roughness: 0.032,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.9,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      side: THREE.FrontSide,
    }),
    trim: new THREE.MeshStandardMaterial({
      color: 0x111314,
      metalness: 0.32,
      roughness: 0.5,
    }),
    glossBlack: new THREE.MeshPhysicalMaterial({
      color: 0x090a0b,
      metalness: 0.4,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    }),
    seam: new THREE.MeshStandardMaterial({
      color: 0x1a1c1c,
      metalness: 0.2,
      roughness: 0.62,
    }),
    tire: new THREE.MeshStandardMaterial({
      color: 0x141414,
      metalness: 0.02,
      roughness: 0.86,
    }),
    rim: new THREE.MeshStandardMaterial({
      color: 0xc8c5bd,
      metalness: 1.0,
      roughness: 0.24,
    }),
    rimDark: new THREE.MeshStandardMaterial({
      color: 0x2b2c2d,
      metalness: 0.9,
      roughness: 0.4,
    }),
    brake: new THREE.MeshStandardMaterial({
      color: 0x8f8f8c,
      metalness: 0.92,
      roughness: 0.46,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: 0x3c5b45,
      metalness: 0.4,
      roughness: 0.36,
    }),
    interior: new THREE.MeshStandardMaterial({
      color: 0x151616,
      metalness: 0.12,
      roughness: 0.78,
    }),
    interiorSoft: new THREE.MeshStandardMaterial({
      color: 0x6a5a48,
      metalness: 0.06,
      roughness: 0.82,
    }),
    headlight: new THREE.MeshBasicMaterial({
      color: 0xfff4dc,
      toneMapped: false,
    }),
    headlightHalo: new THREE.MeshBasicMaterial({
      color: 0xffeac4,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
    taillight: new THREE.MeshBasicMaterial({
      color: 0xe42f1b,
      toneMapped: false,
    }),
    taillightHalo: new THREE.MeshBasicMaterial({
      color: 0xff3a20,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
    mirrorGlass: new THREE.MeshStandardMaterial({
      color: 0x0a0d0d,
      metalness: 0.85,
      roughness: 0.12,
    }),
    skid: new THREE.MeshStandardMaterial({
      color: 0x1a1b1b,
      metalness: 0.55,
      roughness: 0.44,
    }),
    liner: new THREE.MeshStandardMaterial({
      color: 0x0c0d0d,
      metalness: 0.1,
      roughness: 0.92,
      side: THREE.DoubleSide,
    }),
  };
}

/* --------------------------------------------------------------- wheels */

function buildWheel(materials) {
  const wheel = new THREE.Group();

  const tyreProfile = [
    [0.238, -0.145],
    [0.29, -0.152],
    [0.333, -0.136],
    [0.356, -0.106],
    [0.364, -0.062],
    [0.365, 0],
    [0.364, 0.062],
    [0.356, 0.106],
    [0.333, 0.136],
    [0.29, 0.152],
    [0.238, 0.145],
  ].map(([radius, axial]) => new THREE.Vector2(radius, axial));

  const tyre = new THREE.Mesh(new THREE.LatheGeometry(tyreProfile, 80), materials.tire);
  tyre.rotation.x = Math.PI / 2;
  tyre.castShadow = true;
  wheel.add(tyre);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.246, 0.246, 0.26, 64, 1, true),
    materials.rimDark,
  );
  barrel.rotation.x = Math.PI / 2;
  wheel.add(barrel);

  const outerLip = new THREE.Mesh(
    new THREE.TorusGeometry(0.247, 0.011, 10, 72),
    materials.rim,
  );
  outerLip.position.z = 0.128;
  wheel.add(outerLip);

  const innerLip = new THREE.Mesh(
    new THREE.TorusGeometry(0.247, 0.008, 8, 64),
    materials.rimDark,
  );
  innerLip.position.z = -0.118;
  wheel.add(innerLip);

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.19, 0.022, 64),
    materials.brake,
  );
  disc.rotation.x = Math.PI / 2;
  disc.position.z = 0.035;
  wheel.add(disc);

  const discHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.03, 32),
    materials.rimDark,
  );
  discHub.rotation.x = Math.PI / 2;
  discHub.position.z = 0.036;
  wheel.add(discHub);

  const caliperAngle = Math.PI * 0.82;
  const caliper = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.145, 0.055),
    materials.accent,
  );
  caliper.position.set(
    Math.cos(caliperAngle) * 0.13,
    Math.sin(caliperAngle) * 0.13,
    0.045,
  );
  caliper.rotation.z = caliperAngle - Math.PI / 2;
  wheel.add(caliper);

  const spokeShape = new THREE.Shape();
  spokeShape.moveTo(0.062, -0.03);
  spokeShape.lineTo(0.205, -0.021);
  spokeShape.lineTo(0.247, -0.009);
  spokeShape.lineTo(0.247, 0.009);
  spokeShape.lineTo(0.205, 0.021);
  spokeShape.lineTo(0.062, 0.03);
  spokeShape.closePath();

  const spokeGeometry = new THREE.ExtrudeGeometry(spokeShape, {
    depth: 0.017,
    bevelEnabled: false,
    curveSegments: 1,
  });
  spokeGeometry.translate(0, 0, 0.1);

  const spokeCount = 10;
  for (let i = 0; i < spokeCount; i += 1) {
    const spoke = new THREE.Mesh(spokeGeometry, materials.rim);
    spoke.rotation.z = (i / spokeCount) * Math.PI * 2;
    wheel.add(spoke);
  }

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.047, 0.052, 0.05, 32),
    materials.rim,
  );
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.115;
  wheel.add(hub);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.02, 24),
    materials.rimDark,
  );
  cap.rotation.x = Math.PI / 2;
  cap.position.z = 0.142;
  wheel.add(cap);

  wheel.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return wheel;
}

function buildArchLiner(materials, centerX) {
  const radius = ARCH_R - 0.004;
  const width = 1.9;
  const chord = Math.sqrt(
    Math.max(0.001, radius * radius - (AXLE_Y - BOTTOM_Y) ** 2),
  );
  const start = Math.atan2(BOTTOM_Y - AXLE_Y, chord);
  const end = Math.PI - start;
  const rows = 36;
  const cols = 8;

  const positions = [];
  const indices = [];

  for (let i = 0; i <= rows; i += 1) {
    const angle = start + ((end - start) * i) / rows;
    const x = centerX + Math.cos(angle) * radius;
    const y = AXLE_Y + Math.sin(angle) * radius;
    for (let j = 0; j <= cols; j += 1) {
      const z = -width / 2 + (width * j) / cols;
      positions.push(x, y, z);
    }
  }

  const stride = cols + 1;
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      const a = i * stride + j;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, materials.liner);
  mesh.receiveShadow = true;
  mesh.name = 'arch-liner';
  return mesh;
}

function buildWheels(materials, group) {
  const positions = [
    { x: AXLE_F, z: 0.78, steer: 0.055 },
    { x: AXLE_F, z: -0.78, steer: 0.055 },
    { x: AXLE_R, z: 0.795, steer: 0 },
    { x: AXLE_R, z: -0.795, steer: 0 },
  ];

  for (const config of positions) {
    const mount = new THREE.Group();
    mount.position.set(config.x, AXLE_Y, config.z);
    if (config.steer) mount.rotation.y = config.steer;

    const wheel = buildWheel(materials);
    if (config.z < 0) wheel.rotation.y = Math.PI;
    mount.add(wheel);
    group.add(mount);
  }

  group.add(buildArchLiner(materials, AXLE_F));
  group.add(buildArchLiner(materials, AXLE_R));
}

/* ---------------------------------------------------------- light bars */

function tubeAlong(points, radius, material, segments = 48) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  );
  return new THREE.Mesh(
    new THREE.TubeGeometry(curve, segments, radius, 10, false),
    material,
  );
}

/* The front and rear fascias bulge forward at their centre; lights sit proud
   of that curved surface. */
function frontFasciaX(y, z) {
  const edge = sideZAt(FRONT, clamp(y, BOTTOM_Y, topYAt(FRONT)));
  const u = clamp(z / Math.max(0.2, edge), -1, 1);
  return FRONT - 0.085 * Math.pow(1 - u * u, 1.35) - 0.004;
}

function rearFasciaX(y, z) {
  const edge = sideZAt(REAR, clamp(y, BOTTOM_Y, topYAt(REAR)));
  const u = clamp(z / Math.max(0.2, edge), -1, 1);
  return REAR + 0.075 * Math.pow(1 - u * u, 1.35) + 0.004;
}

function buildLights(group, materials) {
  const frontPoints = [];
  for (let i = 0; i <= 16; i += 1) {
    const z = -0.6 + (1.2 * i) / 16;
    const y = 0.47 + 0.006 * (1 - Math.pow(z / 0.6, 2));
    frontPoints.push([frontFasciaX(y, z), y, z]);
  }
  group.add(tubeAlong(frontPoints, 0.011, materials.headlight));
  group.add(tubeAlong(frontPoints, 0.03, materials.headlightHalo, 56));

  for (const side of [-1, 1]) {
    const blade = [
      [frontFasciaX(0.47, side * 0.61), 0.47, side * 0.61],
      [frontFasciaX(0.4, side * 0.655), 0.4, side * 0.655],
      [frontFasciaX(0.33, side * 0.67), 0.33, side * 0.67],
    ];
    group.add(tubeAlong(blade, 0.009, materials.headlight));
  }

  const rearPoints = [];
  for (let i = 0; i <= 18; i += 1) {
    const z = -0.7 + (1.4 * i) / 18;
    const y = 0.545 + 0.006 * (1 - Math.pow(z / 0.7, 2));
    rearPoints.push([rearFasciaX(y, z), y, z]);
  }
  group.add(tubeAlong(rearPoints, 0.011, materials.taillight));
  group.add(tubeAlong(rearPoints, 0.03, materials.taillightHalo, 56));
}

/* ------------------------------------------------------------- details */

function buildSplineTube(points, radius, material, segments = 64) {
  return tubeAlong(points, radius, material, segments);
}

function buildPanelLines(group, materials) {
  for (const side of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= 14; i += 1) {
      const x = -2.06 + (1.3 * i) / 14;
      points.push([x, topYAt(x) + 0.0115, side * 0.5]);
    }
    group.add(buildSplineTube(points, 0.003, materials.seam, 56));
  }

  const doorSamples = [
    [-0.44, 0.81],
    [-0.34, 0.74],
    [-0.2, 0.64],
    [-0.06, 0.5],
    [0.04, 0.36],
    [0.09, 0.24],
  ];
  for (const side of [-1, 1]) {
    const points = doorSamples.map(([x, y]) => [
      x,
      y,
      side * (sideZAt(x, y) + 0.0015),
    ]);
    group.add(buildSplineTube(points, 0.003, materials.seam, 48));
  }

  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i += 1) {
      const y = 0.46 + i * 0.055;
      const gill = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.026, 0.012),
        materials.seam,
      );
      gill.position.set(-0.82, y, side * (sideZAt(-0.82, y) + 0.004));
      group.add(gill);
    }
  }
}

function buildTrim(group, materials) {
  const underbody = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.055, 1.5),
    materials.liner,
  );
  underbody.position.set(0, 0.125, 0);
  group.add(underbody);

  const frontLip = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.024, 1.5),
    materials.glossBlack,
  );
  frontLip.position.set(FRONT + 0.16, 0.102, 0);
  group.add(frontLip);

  const intakeRecess = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.072, 0.94),
    materials.glossBlack,
  );
  intakeRecess.position.set(FRONT - 0.103, 0.285, 0);
  group.add(intakeRecess);

  for (let i = 0; i < 2; i += 1) {
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.008, 0.98),
      materials.trim,
    );
    slat.position.set(FRONT - 0.121, 0.268 + i * 0.031, 0);
    group.add(slat);
  }

  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.04, 0.06),
      materials.skid,
    );
    skirt.position.set(0.0, 0.12, side * 0.83);
    group.add(skirt);
  }

  const rearLip = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.024, 1.48),
    materials.glossBlack,
  );
  rearLip.position.set(REAR - 0.18, 0.102, 0);
  group.add(rearLip);

  for (let i = 0; i < 5; i += 1) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.11, 0.014),
      materials.glossBlack,
    );
    fin.position.set(2.3, 0.17, -0.52 + i * 0.26);
    fin.rotation.z = 0.24;
    group.add(fin);
  }

  for (const side of [-1, 1]) {
    const base = new THREE.Vector3(-0.34, 0.955, side * 0.712);
    const head = new THREE.Vector3(-0.23, 1.0, side * 0.928);
    const direction = head.clone().sub(base);
    const length = direction.length();

    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.017, length, 10),
      materials.trim,
    );
    stalk.position.copy(base).addScaledVector(direction, 0.5);
    stalk.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    );
    group.add(stalk);

    const housing = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 28, 20),
      materials.paint,
    );
    housing.scale.set(1.05, 0.54, 0.78);
    housing.position.copy(head);
    group.add(housing);

    const glassFace = new THREE.Mesh(
      new THREE.SphereGeometry(0.059, 20, 14),
      materials.mirrorGlass,
    );
    glassFace.scale.set(0.26, 0.76, 0.98);
    glassFace.position.copy(head).add(new THREE.Vector3(0.068, -0.002, 0));
    group.add(glassFace);
  }
}

function buildInterior(group, materials) {
  const tub = new THREE.Mesh(
    new THREE.BoxGeometry(1.86, 0.22, 1.14),
    materials.interior,
  );
  tub.position.set(0.28, 0.83, 0);
  group.add(tub);

  const dash = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.11, 1.24),
    materials.interior,
  );
  dash.position.set(-0.44, 0.91, 0);
  dash.rotation.z = 0.12;
  group.add(dash);

  for (const side of [-1, 1]) {
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.1, 0.42),
      materials.interiorSoft,
    );
    seat.position.set(0.42, 0.9, side * 0.3);
    group.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.4, 0.4),
      materials.interiorSoft,
    );
    back.position.set(0.72, 1.02, side * 0.3);
    back.rotation.z = -0.2;
    group.add(back);

    const headrest = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 20, 14),
      materials.interiorSoft,
    );
    headrest.scale.set(1.1, 0.76, 0.98);
    headrest.position.set(0.86, 1.11, side * 0.3);
    group.add(headrest);
  }

  const steering = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.016, 8, 32),
    materials.interior,
  );
  steering.position.set(-0.06, 0.97, -0.3);
  steering.rotation.y = Math.PI / 2;
  steering.rotation.x = 0.18;
  group.add(steering);
}

/* ---------------------------------------------------------------- build */

export function createCar() {
  const materials = makeMaterials();
  const group = new THREE.Group();
  group.name = 'gt-01';

  const body = buildBody(materials.paint, materials.trim);
  group.add(body);

  const canopy = buildCanopy(materials);
  group.add(canopy);
  group.add(buildCanopyTrim(materials));

  buildWheels(materials, group);
  buildLights(group, materials);
  buildPanelLines(group, materials);
  buildTrim(group, materials);
  buildInterior(group, materials);

  const paint = materials.paint;
  const state = {
    current: {
      color: new THREE.Color(PAINTS[0].color),
      metalness: PAINTS[0].metalness,
      roughness: PAINTS[0].roughness,
    },
    target: {
      color: new THREE.Color(PAINTS[0].color),
      metalness: PAINTS[0].metalness,
      roughness: PAINTS[0].roughness,
    },
    activeId: PAINTS[0].id,
    animating: false,
  };

  function setPaint(id) {
    const next = PAINTS.find((entry) => entry.id === id);
    if (!next || next.id === state.activeId) return;
    state.activeId = next.id;
    state.target.color.setHex(next.color);
    state.target.metalness = next.metalness;
    state.target.roughness = next.roughness;
    state.animating = true;
  }

  function update(delta) {
    if (!state.animating) return;
    const lambda = 7.5;
    const blend = 1 - Math.exp(-lambda * delta);
    state.current.color.lerp(state.target.color, blend);
    state.current.metalness +=
      (state.target.metalness - state.current.metalness) * blend;
    state.current.roughness +=
      (state.target.roughness - state.current.roughness) * blend;
    paint.color.copy(state.current.color);
    paint.metalness = state.current.metalness;
    paint.roughness = state.current.roughness;
    if (
      Math.abs(state.current.metalness - state.target.metalness) < 0.002 &&
      Math.abs(state.current.roughness - state.target.roughness) < 0.002 &&
      state.current.color.distanceTo(state.target.color) < 0.002
    ) {
      paint.color.copy(state.target.color);
      paint.metalness = state.target.metalness;
      paint.roughness = state.target.roughness;
      state.animating = false;
    }
  }

  function setPaintImmediate(id) {
    const next = PAINTS.find((entry) => entry.id === id);
    if (!next) return;
    state.activeId = next.id;
    state.current.color.setHex(next.color);
    state.target.color.setHex(next.color);
    state.current.metalness = next.metalness;
    state.target.metalness = next.metalness;
    state.current.roughness = next.roughness;
    state.target.roughness = next.roughness;
    paint.color.copy(state.current.color);
    paint.metalness = next.metalness;
    paint.roughness = next.roughness;
    state.animating = false;
  }

  function dispose() {
    const geometries = new Set();
    const materialsSet = new Set(Object.values(materials));
    group.traverse((child) => {
      if (child.isMesh) geometries.add(child.geometry);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materialsSet) material.dispose();
  }

  return {
    group,
    paintMaterial: paint,
    paints: PAINTS,
    setPaint,
    setPaintImmediate,
    update,
    dispose,
  };
}



