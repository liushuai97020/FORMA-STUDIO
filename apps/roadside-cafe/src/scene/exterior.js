import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createCat, createPerson } from './people.js';
import { createSignMaterial, createStreetSignMaterial } from './materials.js';

export const BUILDING = {
  x0: -7.5,
  x1: 7.5,
  z0: -7.2,
  z1: 1.5,
  ground: 0.12,
  groundTop: 3.6,
  upperTop: 6.6,
  roof: 6.9
};

const ROAD = {
  near: 4.4,
  far: 12.4,
  y: -0.14
};

/* --------------------------------------------------------------------------
   Small builders
   -------------------------------------------------------------------------- */

function addBox(parent, material, width, height, depth, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  if (options.userData) Object.assign(mesh.userData, options.userData);
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, material, radiusTop, radiusBottom, height, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, options.segments || 12), material);
  mesh.position.set(x, y, z);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  parent.add(mesh);
  return mesh;
}

function addGroundPlane(parent, material, width, depth, x, y, z, tile = 4, receive = true) {
  const geometry = new THREE.PlaneGeometry(width, depth);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) * (width / tile), uv.getY(i) * (depth / tile));
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

function addPanel(parent, material, width, height, x, y, z, rotationY = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

function addBeamBetween(parent, material, a, b, radius = 0.02, segments = 6) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material);
  mesh.position.copy(a).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addWire(parent, material, points, radius = 0.012) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 32, radius, 4, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

/* --------------------------------------------------------------------------
   Building
   -------------------------------------------------------------------------- */

function createBuilding(MAT) {
  const group = new THREE.Group();
  const { x0, x1, z0, z1, ground, groundTop, upperTop, roof } = BUILDING;
  const width = x1 - x0;
  const depth = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const interactives = [];

  /* Base and body ---------------------------------------------------------- */

  addBox(group, MAT.brick, width + 0.34, 0.7, depth + 0.34, cx, 0.35, cz, { cast: true });

  /* The ground floor is a hollow shell: a solid back wall and two side walls,
     with the storefront openings left clear so the lit café interior is visible
     from the street. */
  addBox(group, MAT.plasterWarm, width, groundTop - ground, 0.3, cx, (groundTop + ground) / 2, z0 + 0.15, { cast: true });
  addBox(group, MAT.plasterWarm, 0.3, groundTop - ground, depth, x0 + 0.15, (groundTop + ground) / 2, cz, { cast: true });
  addBox(group, MAT.plasterWarm, 0.3, groundTop - ground, depth, x1 - 0.15, (groundTop + ground) / 2, cz, { cast: true });
  addBox(group, MAT.stoneDark, width, 0.12, depth, cx, ground + 0.06, cz, { cast: false, receive: true });

  /* Upper floor. The front rises as a warm plaster wall with two windows. */
  addBox(group, MAT.plaster, width, upperTop - groundTop, depth, cx, (upperTop + groundTop) / 2, cz, { cast: true });
  addBox(group, MAT.stone, width + 0.5, 0.24, depth + 0.5, cx, groundTop + 0.12, cz, { cast: true });

  /* Roof and eaves */
  addBox(group, MAT.plasterPale, width + 0.4, 0.3, depth + 0.4, cx, upperTop + 0.15, cz, { cast: true });
  addBox(group, MAT.brickDark, width + 0.65, 0.26, 0.34, cx, roof - 0.13, z1 + 0.08, { cast: true });
  addBox(group, MAT.brickDark, 0.34, 0.26, depth + 0.65, x1 + 0.08, roof - 0.13, cz, { cast: true });
  addBox(group, MAT.brickDark, 0.34, 0.26, depth + 0.65, x0 - 0.08, roof - 0.13, cz, { cast: true });

  /* A shallow tiled cap reads as old Hangzhou without adding a full roof. */
  const cap = addBox(group, MAT.brickDark, width + 0.9, 0.1, depth + 0.9, cx, roof + 0.02, cz, { cast: true });
  cap.receiveShadow = true;

  /* Ground-floor facade: piers, kick plates, transom band. */
  const frontZ = z1 + 0.01;
  addBox(group, MAT.plaster, 0.5, 3.48, 0.32, x0 + 0.25, ground + 1.74, z1, { cast: true });
  addBox(group, MAT.plaster, 0.5, 3.48, 0.32, x1 - 0.25, ground + 1.74, z1, { cast: true });
  addBox(group, MAT.plaster, 0.18, 3.48, 0.34, 0.92, ground + 1.74, z1, { cast: true });
  addBox(group, MAT.plaster, 0.2, 3.48, 0.34, 3.38, ground + 1.74, z1, { cast: true });
  addBox(group, MAT.plasterWarm, width, 0.8, 0.36, cx, 3.2, z1, { cast: true });

  /* Window and door openings */
  const leftWindow = { x0: -6.9, x1: 0.82, y0: 0.62, y1: 2.92 };
  const rightWindow = { x0: 3.52, x1: 6.9, y0: 0.62, y1: 2.92 };
  const door = { x0: 1.04, x1: 3.28, y0: ground, y1: 2.82 };

  function storefrontWindow(area, bays) {
    const width = area.x1 - area.x0;
    const height = area.y1 - area.y0;
    const glass = addPanel(
      group,
      MAT.windowGlass,
      width,
      height,
      (area.x0 + area.x1) / 2,
      (area.y0 + area.y1) / 2,
      z1 + 0.035
    );
    glass.renderOrder = 2;
    addBox(group, MAT.oakDark, width + 0.1, 0.13, 0.16, (area.x0 + area.x1) / 2, area.y0 - 0.06, z1 + 0.06, { cast: true });
    addBox(group, MAT.oakDark, width + 0.1, 0.12, 0.16, (area.x0 + area.x1) / 2, area.y1 + 0.06, z1 + 0.06, { cast: true });
    for (let i = 0; i <= bays; i += 1) {
      const x = area.x0 + (width * i) / bays;
      addBox(group, MAT.oakDark, 0.065, height, 0.1, x, (area.y0 + area.y1) / 2, z1 + 0.05, { cast: true });
    }
    addBox(group, MAT.oakDark, width + 0.1, 0.06, 0.1, (area.x0 + area.x1) / 2, 1.85, z1 + 0.05, { cast: true });
    addBox(group, MAT.oak, width + 0.16, 0.24, 0.3, (area.x0 + area.x1) / 2, area.y0 - 0.18, z1 + 0.12, { cast: true });
    return glass;
  }

  storefrontWindow(leftWindow, 4);
  storefrontWindow(rightWindow, 2);

  /* Low oak stall riser under the windows */
  addBox(group, MAT.oak, leftWindow.x1 - leftWindow.x0, 0.5, 0.08, (leftWindow.x0 + leftWindow.x1) / 2, 0.36, z1 + 0.03, { cast: true });
  addBox(group, MAT.oak, rightWindow.x1 - rightWindow.x0, 0.5, 0.08, (rightWindow.x0 + rightWindow.x1) / 2, 0.36, z1 + 0.03, { cast: true });

  /* Door: two glass leaves with a dark oak frame; both are clickable. */
  addBox(group, MAT.oakDark, door.x1 - door.x0 + 0.26, 0.16, 0.2, (door.x0 + door.x1) / 2, door.y1 + 0.08, z1 + 0.05, { cast: true });
  addBox(group, MAT.oakDark, 0.13, door.y1 - door.y0, 0.18, door.x0 - 0.06, (door.y0 + door.y1) / 2, z1 + 0.05, { cast: true });
  addBox(group, MAT.oakDark, 0.13, door.y1 - door.y0, 0.18, door.x1 + 0.06, (door.y0 + door.y1) / 2, z1 + 0.05, { cast: true });
  addBox(group, MAT.oakDark, 0.08, door.y1 - door.y0, 0.12, (door.x0 + door.x1) / 2, (door.y0 + door.y1) / 2, z1 + 0.05, { cast: true });

  for (const [leafX0, leafX1] of [[door.x0, (door.x0 + door.x1) / 2 - 0.03], [(door.x0 + door.x1) / 2 + 0.03, door.x1]]) {
    const glass = addPanel(group, MAT.windowGlass, leafX1 - leafX0, door.y1 - door.y0 - 0.06, (leafX0 + leafX1) / 2, (door.y0 + door.y1) / 2, z1 + 0.1);
    glass.userData.interactive = 'door';
    interactives.push(glass);
    const handle = addCylinder(group, MAT.brass, 0.024, 0.024, 0.34, leafX0 + (leafX1 - leafX0) * 0.82, 1.3, z1 + 0.16, { rotation: [Math.PI / 2, 0, 0], cast: false });
    handle.userData.interactive = 'door';
    interactives.push(handle);
  }

  /* Door step, sills and wall lights */
  addBox(group, MAT.stone, 2.5, 0.14, 0.78, (door.x0 + door.x1) / 2, 0.07, z1 + 0.5, { cast: true });
  addBox(group, MAT.stone, leftWindow.x1 - leftWindow.x0 + 0.2, 0.12, 0.22, (leftWindow.x0 + leftWindow.x1) / 2, leftWindow.y0 - 0.06, z1 + 0.14, { cast: true });
  addBox(group, MAT.stone, rightWindow.x1 - rightWindow.x0 + 0.2, 0.12, 0.22, (rightWindow.x0 + rightWindow.x1) / 2, rightWindow.y0 - 0.06, z1 + 0.14, { cast: true });

  for (const x of [door.x0 - 0.34, door.x1 + 0.34]) {
    addBox(group, MAT.metalDark, 0.1, 0.16, 0.1, x, 2.45, z1 + 0.08, { cast: true });
    addCylinder(group, MAT.lampGlow, 0.075, 0.075, 0.28, x, 2.27, z1 + 0.12, { segments: 12, cast: false });
  }

  /* Awning over the pavement --------------------------------------------- */

  const awning = new THREE.Group();
  group.add(awning);
  const awningZ0 = z1 + 0.08;
  const awningZ1 = 3.72;
  const awningY0 = 3.62;
  const awningY1 = 3.12;
  const awningW = 14.2;
  const awningGeometry = new THREE.BufferGeometry();
  const verts = new Float32Array([
    -awningW / 2, awningY0, awningZ0,
    awningW / 2, awningY0, awningZ0,
    awningW / 2, awningY1, awningZ1,
    -awningW / 2, awningY1, awningZ1
  ]);
  awningGeometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  awningGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 4, 0, 4, 1, 0, 1]), 2));
  awningGeometry.setIndex([0, 1, 2, 0, 2, 3]);
  awningGeometry.computeVertexNormals();
  const awningMesh = new THREE.Mesh(awningGeometry, MAT.awning);
  awningMesh.position.set(0, 0, 0);
  awningMesh.castShadow = true;
  awningMesh.receiveShadow = true;
  awning.add(awningMesh);

  const valance = addPanel(awning, MAT.awning, awningW, 0.42, 0, awningY1 - 0.21, awningZ1 + 0.01);
  valance.castShadow = true;
  addBox(awning, MAT.metalDark, awningW + 0.2, 0.06, 0.08, 0, awningY0 + 0.03, awningZ0, { cast: true });
  addBox(awning, MAT.metalDark, awningW + 0.2, 0.05, 0.08, 0, awningY1, awningZ1, { cast: true });
  for (const x of [-awningW / 2 + 0.06, awningW / 2 - 0.06]) {
    addBeamBetween(awning, MAT.metalDark, new THREE.Vector3(x, awningY0, awningZ0), new THREE.Vector3(x, awningY1, awningZ1), 0.018);
    addBeamBetween(awning, MAT.metalDark, new THREE.Vector3(x, 2.9, awningZ1), new THREE.Vector3(x, awningY1, awningZ1), 0.015);
  }

  /* String lights under the awning */
  const bulbs = new THREE.Group();
  awning.add(bulbs);
  const stringPoints = [];
  for (let i = 0; i <= 16; i += 1) {
    const x = -6.8 + (13.6 * i) / 16;
    const sag = Math.sin((i / 16) * Math.PI) * 0.11;
    const y = 2.88 - sag;
    stringPoints.push(new THREE.Vector3(x, y, awningZ1 - 0.12));
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), MAT.lampGlow);
    bulb.position.set(x, y - 0.06, awningZ1 - 0.12);
    bulbs.add(bulb);
  }
  addWire(bulbs, MAT.metalDark, stringPoints, 0.008);

  /* Signboard on the upper facade */
  const sign = createSignMaterial({
    width: 1024,
    height: 340,
    title: '檐下咖啡',
    subtitle: 'EAVES COFFEE · HANGZHOU',
    background: '#f1e5d3',
    foreground: '#2d241d',
    accent: '#a15b39'
  });
  MAT.textures.push(sign.texture);
  addBox(group, MAT.oakDark, 5.1, 1.5, 0.12, 0, 4.48, z1 + 0.05, { cast: true });
  addPanel(group, sign.material, 4.88, 1.3, 0, 4.48, z1 + 0.12);

  /* A vertical blade sign at the corner, best seen from the street. */
  const vertical = createSignMaterial({
    width: 320,
    height: 920,
    vertical: true,
    title: '檐下咖啡',
    subtitle: 'EAVES',
    background: '#eddfcb',
    foreground: '#2a211a',
    accent: '#a15b39'
  });
  MAT.textures.push(vertical.texture);
  addBox(group, MAT.metalDark, 0.08, 2.12, 0.76, x1 + 0.15, 4.45, 0.3, { cast: true });
  const blade = addPanel(group, vertical.material, 0.68, 2.0, x1 + 0.2, 4.45, 0.3, Math.PI / 2);
  blade.castShadow = true;

  /* Upper windows and shutters */
  function upperWindow(x, y, w = 1.7, h = 1.28) {
    addBox(group, MAT.oakDark, w + 0.16, h + 0.16, 0.1, x, y, z1 + 0.05, { cast: true });
    addPanel(group, MAT.windowGlass, w, h, x, y, z1 + 0.11);
    addBox(group, MAT.oak, w * 0.47, h, 0.055, x - w * 0.25, y, z1 + 0.15, { cast: true });
    addBox(group, MAT.oak, w * 0.47, h, 0.055, x + w * 0.25, y, z1 + 0.15, { cast: true });
    addBox(group, MAT.stone, w + 0.3, 0.12, 0.35, x, y - h / 2 - 0.08, z1 + 0.16, { cast: true });
    addBox(group, MAT.terracotta, w * 0.8, 0.26, 0.3, x, y - h / 2 - 0.26, z1 + 0.22, { cast: true });
    for (let i = 0; i < 4; i += 1) {
      const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 + (i % 2) * 0.04, 1), i % 2 ? MAT.foliage : MAT.foliageLight);
      plant.position.set(x - w * 0.32 + i * 0.2, y - h / 2 - 0.06, z1 + 0.24);
      plant.scale.y = 0.8;
      plant.castShadow = true;
      group.add(plant);
    }
    addBox(group, MAT.oakDark, w + 0.24, 0.08, 0.12, x, y + h / 2 + 0.12, z1 + 0.14, { cast: true });
  }

  upperWindow(-4.7, 4.72);
  upperWindow(4.7, 4.72);

  /* East and west facades: windows, sconce, drainpipes */
  addPanel(group, MAT.windowGlass, 2.8, 1.9, x1 + 0.01, 1.85, -3.3, Math.PI / 2);
  addBox(group, MAT.oakDark, 0.08, 2.1, 3.0, x1 + 0.05, 1.85, -3.3, { rotation: [0, Math.PI / 2, 0], cast: true });
  addBox(group, MAT.oakDark, 0.08, 2.0, 3.0, x0 - 0.05, 1.85, -2.4, { rotation: [0, Math.PI / 2, 0], cast: true });
  addPanel(group, MAT.windowGlass, 2.6, 1.8, x0 - 0.01, 1.9, -2.4, Math.PI / 2);
  for (const x of [x0 - 0.06, x1 + 0.06]) {
    addCylinder(group, MAT.metalDark, 0.06, 0.06, 3.1, x, 1.55, z1 - 0.45, { segments: 8, cast: true });
  }
  addBox(group, MAT.metalDark, 0.1, 0.16, 0.1, x1 + 0.05, 2.5, 0.55, { cast: true });
  addCylinder(group, MAT.lampGlow, 0.07, 0.07, 0.26, x1 + 0.12, 2.33, 0.55, { segments: 12, cast: false });

  /* Rain streaks on the storefront glass */
  const rainGlass = addPanel(group, MAT.rainGlass, 6.0, 2.4, -3.1, 1.77, z1 + 0.19);
  rainGlass.renderOrder = 3;
  const rainGlassDoor = addPanel(group, MAT.rainGlass, 2.1, 2.4, 2.16, 1.62, z1 + 0.2);
  rainGlassDoor.renderOrder = 3;

  return { group, interactives, rainGlass: [rainGlass, rainGlassDoor], bulbs };
}

/* --------------------------------------------------------------------------
   Café pavement objects: chalkboard, planters, bench, bicycle, cat
   -------------------------------------------------------------------------- */

function createCafeFront(MAT) {
  const group = new THREE.Group();
  const { z1 } = BUILDING;

  /* Chalkboard A-frame */
  const board = new THREE.Group();
  board.position.set(-3.1, 0, 2.55);
  board.rotation.y = -0.16;
  group.add(board);
  addBox(board, MAT.oakDark, 0.96, 1.22, 0.07, 0, 0.78, 0, { rotation: [-0.18, 0, 0], cast: true });
  addPanel(board, MAT.chalkboard, 0.8, 1.04, 0, 0.79, 0.045, 0);
  const boardPanel = board.children[board.children.length - 1];
  boardPanel.rotation.x = -0.18;
  boardPanel.position.z = 0.055;
  addBeamBetween(board, MAT.oakDark, new THREE.Vector3(-0.45, 0.12, -0.2), new THREE.Vector3(-0.38, 1.24, 0), 0.022);
  addBeamBetween(board, MAT.oakDark, new THREE.Vector3(0.45, 0.12, -0.2), new THREE.Vector3(0.38, 1.24, 0), 0.022);
  addBeamBetween(board, MAT.oakDark, new THREE.Vector3(-0.45, 0.12, 0.2), new THREE.Vector3(-0.38, 1.24, 0), 0.022);
  addBeamBetween(board, MAT.oakDark, new THREE.Vector3(0.45, 0.12, 0.2), new THREE.Vector3(0.38, 1.24, 0), 0.022);

  /* Planters at either side of the entrance */
  function planter(x, z, scale, leaf) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    group.add(g);
    addCylinder(g, MAT.terracotta, 0.38, 0.31, 0.62, 0, 0.31, 0, { segments: 14, cast: true });
    addCylinder(g, MAT.soil, 0.34, 0.34, 0.04, 0, 0.63, 0, { segments: 14, cast: false });
    for (let i = 0; i < 6; i += 1) {
      const leafMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.21 + (i % 3) * 0.07, 1), i % 2 ? leaf : MAT.foliage);
      leafMesh.position.set((Math.sin(i * 2.1) * 0.19), 0.85 + (i % 3) * 0.14, Math.cos(i * 1.7) * 0.16);
      leafMesh.scale.y = 0.8;
      leafMesh.castShadow = true;
      g.add(leafMesh);
    }
  }

  planter(-6.85, 2.15, 1.05, MAT.foliageLight);
  planter(6.9, 2.15, 0.95, MAT.foliage);

  /* Bench under the left window */
  addBox(group, MAT.oakDark, 2.8, 0.1, 0.48, -4.75, 0.56, z1 + 0.62, { cast: true });
  addBox(group, MAT.oakDark, 2.8, 0.36, 0.08, -4.75, 0.85, z1 + 0.4, { rotation: [-0.08, 0, 0], cast: true });
  for (const x of [-5.95, -3.55]) {
    addBox(group, MAT.metalDark, 0.08, 0.52, 0.4, x, 0.26, z1 + 0.62, { cast: true });
  }
  addBox(group, MAT.fabricRust, 1.2, 0.1, 0.4, -5.1, 0.64, z1 + 0.65, { cast: true });
  addBox(group, MAT.fabricCream, 1.0, 0.1, 0.38, -3.8, 0.64, z1 + 0.66, { cast: true });

  /* A sleeping cat on a small mat beside the door */
  const cat = createCat(MAT);
  cat.position.set(0.4, 0.03, z1 + 0.82);
  cat.rotation.y = -0.3;
  group.add(cat);
  addBox(group, MAT.fabricCream, 0.9, 0.035, 0.55, 0.4, 0.02, z1 + 0.82, { cast: false });

  /* Bicycle leaning by the east window */
  const bike = new THREE.Group();
  bike.position.set(8.18, 0, 0.1);
  bike.rotation.y = Math.PI / 2 + 0.12;
  bike.rotation.z = 0.06;
  group.add(bike);
  const wheelGeo = new THREE.TorusGeometry(0.33, 0.022, 6, 24);
  for (const wx of [-0.56, 0.56]) {
    const wheel = new THREE.Mesh(wheelGeo, MAT.metalDark);
    wheel.position.set(wx, 0.35, 0);
    wheel.castShadow = true;
    bike.add(wheel);
    for (let i = 0; i < 6; i += 1) {
      addBeamBetween(bike, MAT.metal, new THREE.Vector3(wx, 0.35, 0), new THREE.Vector3(wx + Math.cos(i * Math.PI / 3) * 0.31, 0.35 + Math.sin(i * Math.PI / 3) * 0.31, 0), 0.006);
    }
  }
  addBeamBetween(bike, MAT.brass, new THREE.Vector3(-0.56, 0.35, 0), new THREE.Vector3(0, 0.82, 0), 0.018);
  addBeamBetween(bike, MAT.brass, new THREE.Vector3(0, 0.82, 0), new THREE.Vector3(0.45, 0.35, 0), 0.018);
  addBeamBetween(bike, MAT.brass, new THREE.Vector3(-0.2, 0.36, 0), new THREE.Vector3(0.4, 0.75, 0), 0.018);
  addBeamBetween(bike, MAT.metalDark, new THREE.Vector3(0.12, 0.8, -0.24), new THREE.Vector3(0.12, 0.8, 0.24), 0.012);
  addBox(bike, MAT.fabricCream, 0.24, 0.05, 0.12, -0.08, 0.91, 0, { cast: true });

  return group;
}

/* --------------------------------------------------------------------------
   Street furniture, trees, wires, signs
   -------------------------------------------------------------------------- */

function createStreet(MAT) {
  const group = new THREE.Group();

  /* Surfaces */
  addGroundPlane(group, MAT.pavement, 100, 2.9, 0, 0.01, 2.95, 3.2);
  addGroundPlane(group, MAT.asphalt, 100, 8.0, 0, ROAD.y, (ROAD.near + ROAD.far) / 2, 4.4);
  addGroundPlane(group, MAT.pavement, 100, 2.8, 0, 0.01, 13.8, 3.2);
  addBox(group, MAT.curb, 100, 0.15, 0.22, 0, 0.065, ROAD.near, { cast: false });
  addBox(group, MAT.curb, 100, 0.15, 0.22, 0, 0.065, ROAD.far, { cast: false });

  /* Road markings */
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xe7dfcf, roughness: 0.82, metalness: 0 });
  for (let x = -48; x < 48; x += 6) {
    addBox(group, dashMat, 2.4, 0.012, 0.12, x, ROAD.y + 0.012, 8.4, { cast: false });
  }
  for (let i = 0; i < 7; i += 1) {
    addBox(group, dashMat, 0.42, 0.012, 2.2, -10.6 + i * 0.82, ROAD.y + 0.013, 6.05, { cast: false });
  }
  addBox(group, dashMat, 2.0, 0.012, 0.12, -10.6, ROAD.y + 0.012, 10.7, { cast: false });

  /* Manholes and drains */
  for (const [x, z] of [[-2.8, 7.0], [5.6, 10.2], [-18, 8.1]]) {
    const manhole = addCylinder(group, MAT.metalDark, 0.42, 0.42, 0.02, x, ROAD.y + 0.014, z, { segments: 20, cast: false });
    manhole.receiveShadow = true;
  }
  for (const x of [-6, 3, 12]) {
    addBox(group, MAT.metalDark, 0.72, 0.02, 0.3, x, 0.03, 4.32, { cast: false });
  }

  /* Puddles — visible when the weather turns wet */
  const puddles = [];
  const puddleSpots = [
    [-4.2, 5.2, 1.2, 0.55], [3.6, 6.7, 0.9, 0.38], [-9.4, 9.1, 1.5, 0.7],
    [8.2, 10.6, 1.1, 0.5], [-1.2, 2.4, 0.8, 0.3], [11.3, 3.0, 0.7, 0.32]
  ];
  for (const [x, z, w, d] of puddleSpots) {
    const geometry = new THREE.CircleGeometry(1, 28);
    geometry.scale(w, d, 1);
    const puddle = new THREE.Mesh(geometry, MAT.puddle);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(x, z > ROAD.near ? ROAD.y + 0.015 : 0.025, z);
    puddle.receiveShadow = true;
    group.add(puddle);
    puddles.push(puddle);
  }

  /* Utility poles and a web of wires */
  const poleMaterial = MAT.metalDark;
  const poleTops = [];
  for (const x of [-14.2, 8.8]) {
    addCylinder(group, poleMaterial, 0.13, 0.17, 7.4, x, 3.7, 3.75, { segments: 12, cast: true });
    addCylinder(group, MAT.stone, 0.24, 0.3, 0.22, x, 0.11, 3.75, { segments: 12, cast: true });
    addBox(group, MAT.metalDark, 1.9, 0.12, 0.12, x, 6.25, 3.75, { cast: true });
    addBox(group, MAT.metalDark, 1.3, 0.1, 0.1, x, 5.75, 3.75, { cast: true });
    for (const dx of [-0.72, 0.72]) {
      addCylinder(group, MAT.metalDark, 0.04, 0.04, 0.14, x + dx, 6.37, 3.75, { segments: 6, cast: false });
      addCylinder(group, MAT.metalDark, 0.035, 0.035, 0.16, x + dx * 0.7, 5.88, 3.75, { segments: 6, cast: false });
    }
    addBox(group, MAT.metalDark, 0.34, 0.56, 0.34, x, 4.7, 3.75, { cast: true });
    poleTops.push(new THREE.Vector3(x, 6.3, 3.75));
  }

  for (let i = 0; i < 3; i += 1) {
    const y = 6.25 - i * 0.22;
    addWire(group, poleMaterial, [
      new THREE.Vector3(-48, y + 0.4, 3.75),
      new THREE.Vector3(-14.2, y, 3.75),
      new THREE.Vector3(8.8, y, 3.75),
      new THREE.Vector3(48, y + 0.4, 3.75)
    ], 0.014);
  }
  addWire(group, poleMaterial, [
    new THREE.Vector3(8.8, 6.25, 3.75),
    new THREE.Vector3(8.0, 5.5, 2.4),
    new THREE.Vector3(7.2, 5.1, 1.5)
  ], 0.012);
  addWire(group, poleMaterial, [
    new THREE.Vector3(-14.2, 6.25, 3.75),
    new THREE.Vector3(-9.5, 5.4, 2.1),
    new THREE.Vector3(-7.4, 5.2, 1.5)
  ], 0.012);

  /* Streetlights */
  const streetLights = [];
  for (const x of [-12.8, 11.2]) {
    addCylinder(group, MAT.metalDark, 0.07, 0.1, 4.9, x, 2.45, 3.9, { segments: 10, cast: true });
    const arm = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 4.85, 3.9),
      new THREE.Vector3(x, 5.15, 3.7),
      new THREE.Vector3(x, 5.18, 3.05)
    ]);
    const armMesh = new THREE.Mesh(new THREE.TubeGeometry(arm, 12, 0.035, 6, false), MAT.metalDark);
    armMesh.castShadow = true;
    group.add(armMesh);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), MAT.lampGlow);
    globe.position.set(x, 5.08, 3.0);
    group.add(globe);
    const light = new THREE.PointLight(0xffc07c, 0, 8, 2);
    light.position.set(x, 4.95, 3.0);
    group.add(light);
    streetLights.push({ light, day: 0.1, rain: 1.1 });
  }

  /* Street signs */
  const signPoleX = 6.15;
  addCylinder(group, MAT.metalDark, 0.035, 0.045, 3.2, signPoleX, 1.6, 3.3, { segments: 8, cast: true });
  const roadSign = createStreetSignMaterial('安福路', 'ANFU ROAD');
  MAT.textures.push(roadSign.map);
  addBox(group, MAT.metalDark, 0.04, 0.36, 0.86, signPoleX, 2.7, 3.3, { cast: true });
  addPanel(group, roadSign, 0.82, 0.32, signPoleX + 0.03, 2.7, 3.3, Math.PI / 2);
  addPanel(group, roadSign, 0.82, 0.32, signPoleX - 0.03, 2.7, 3.3, -Math.PI / 2);
  const slowSign = createStreetSignMaterial('慢行', 'SLOW · SCHOOL');
  MAT.textures.push(slowSign.map);
  addPanel(group, slowSign, 0.62, 0.24, signPoleX + 0.03, 2.22, 3.3, Math.PI / 2);

  /* Bus stop */
  const stop = new THREE.Group();
  stop.position.set(15.8, 0, 3.0);
  group.add(stop);
  addBox(stop, MAT.metalDark, 0.08, 2.6, 0.08, -1.35, 1.3, 0, { cast: true });
  addBox(stop, MAT.metalDark, 0.08, 2.6, 0.08, 1.35, 1.3, 0, { cast: true });
  addBox(stop, MAT.metalDark, 2.9, 0.08, 1.0, 0, 2.6, 0, { cast: true });
  addBox(stop, MAT.windowGlass, 2.6, 1.9, 0.04, 0, 1.42, -0.36, { cast: false });
  addBox(stop, MAT.oak, 2.3, 0.07, 0.42, 0, 0.5, 0.05, { cast: true });
  for (const x of [-0.95, 0.95]) addBox(stop, MAT.metalDark, 0.06, 0.5, 0.38, x, 0.25, 0.05, { cast: true });
  const busSign = createStreetSignMaterial('湖畔 7 路', 'LAKESIDE · BUS 7');
  MAT.textures.push(busSign.map);
  addBox(stop, MAT.metalDark, 0.06, 2.7, 0.06, -1.55, 1.35, 0.3, { cast: true });
  addPanel(stop, busSign, 0.72, 0.26, -1.55, 2.38, 0.33, Math.PI / 2);

  /* Tactile paving strips along the curb */
  const tactile = new THREE.MeshStandardMaterial({ color: 0xb7a88d, roughness: 0.9 });
  for (let x = -44; x < 44; x += 1.2) {
    addBox(group, tactile, 0.72, 0.012, 0.32, x, 0.018, 4.05, { cast: false });
  }

  return { group, puddles, streetLights, signPoleX };
}

/* --------------------------------------------------------------------------
   Trees
   -------------------------------------------------------------------------- */

function createTree(MAT, x, z, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);

  addBox(group, MAT.stone, 1.5, 0.34, 1.5, 0, 0.17, 0, { cast: true });
  addBox(group, MAT.soil, 1.2, 0.05, 1.2, 0, 0.34, 0, { cast: false });

  addCylinder(group, MAT.hairBrown, 0.12, 0.17, 2.3, 0.02, 1.45, 0, { segments: 9, cast: true });
  addCylinder(group, MAT.hairBrown, 0.06, 0.1, 1.2, -0.12, 2.7, 0.06, { rotation: [0, 0, 0.32], segments: 8, cast: true });
  addCylinder(group, MAT.hairBrown, 0.05, 0.09, 1.0, 0.18, 2.95, -0.08, { rotation: [0, 0, -0.34], segments: 8, cast: true });

  const crowns = [
    [0, 3.35, 0, 0.92], [-0.55, 3.05, 0.16, 0.68], [0.58, 3.12, -0.12, 0.72],
    [-0.2, 3.72, -0.28, 0.62], [0.3, 3.8, 0.22, 0.56]
  ];
  for (const [cx, cy, cz, radius] of crowns) {
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), (cx + cy) % 2 > 0.5 ? MAT.foliage : MAT.foliageLight);
    crown.position.set(cx, cy, cz);
    crown.scale.y = 0.82;
    crown.castShadow = true;
    crown.receiveShadow = true;
    group.add(crown);
  }
  return group;
}

/* --------------------------------------------------------------------------
   Vehicles
   -------------------------------------------------------------------------- */

function createCar(MAT, paint, options = {}) {
  const group = new THREE.Group();
  const bodyMat = paint;
  const length = options.length || 4.1;
  const width = options.width || 1.76;
  const height = options.height || 1.36;

  const body = new THREE.Mesh(new RoundedBoxGeometry(length, 0.62, width, 3, 0.16), bodyMat);
  body.position.y = 0.62;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(new RoundedBoxGeometry(length * 0.54, 0.56, width * 0.87, 3, 0.15), bodyMat);
  cabin.position.set(-0.12, 1.08, 0);
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  group.add(cabin);

  /* Windows sit flush in the cabin sides, leaving the painted roof visible. */
  for (const z of [-width * 0.44, width * 0.44]) {
    for (const x of [-0.55, 0.42]) {
      addBox(group, MAT.glassDark, length * 0.19, 0.3, 0.015, x, 1.11, z, { cast: false });
    }
  }
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.72, 0.34), MAT.glassDark);
  windshield.position.set(length * 0.155, 1.11, 0);
  windshield.rotation.y = Math.PI / 2;
  group.add(windshield);
  const rearGlass = windshield.clone();
  rearGlass.position.x = -length * 0.4;
  rearGlass.rotation.y = -Math.PI / 2;
  group.add(rearGlass);

  const wheelMat = MAT.rubber;
  const wheelGeometry = new THREE.CylinderGeometry(0.29, 0.29, 0.22, 14);
  for (const x of [-length * 0.31, length * 0.31]) {
    for (const z of [-width / 2 + 0.02, width / 2 - 0.02]) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.33, z);
      wheel.castShadow = true;
      group.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.23, 12), MAT.chrome);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(x, 0.33, z);
      group.add(hub);
    }
  }

  for (const z of [-0.58, 0.58]) {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.24), MAT.headlight);
    headlight.position.set(length / 2 - 0.02, 0.66, z);
    group.add(headlight);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.2), MAT.taillight);
    tail.position.set(-length / 2 + 0.02, 0.66, z);
    group.add(tail);
  }

  return group;
}

function createBus(MAT) {
  const group = new THREE.Group();
  const length = 8.6;
  const width = 2.35;
  const body = new THREE.Mesh(new RoundedBoxGeometry(length, 2.1, width, 4, 0.2), MAT.busCream);
  body.position.y = 1.65;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  const stripe = addBox(group, MAT.busTeal, length + 0.02, 0.38, width + 0.02, 0, 1.05, 0, { cast: true });
  stripe.receiveShadow = true;

  const windowMat = MAT.glassDark;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i += 1) {
      const window = addBox(group, windowMat, 1.2, 0.95, 0.03, -2.9 + i * 1.45, 2.3, side * (width / 2 + 0.01), { cast: false });
      window.renderOrder = 2;
    }
  }
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.95), windowMat);
  windshield.position.set(length / 2 + 0.01, 2.3, 0);
  windshield.rotation.y = Math.PI / 2;
  group.add(windshield);

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 14);
  for (const x of [-2.6, 2.7]) {
    for (const z of [-width / 2, width / 2]) {
      const wheel = new THREE.Mesh(wheelGeo, MAT.rubber);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.45, z);
      wheel.castShadow = true;
      group.add(wheel);
    }
  }
  for (const z of [-0.72, 0.72]) {
    addBox(group, MAT.headlight, 0.16, 0.18, 0.32, length / 2 + 0.01, 0.8, z, { cast: false });
  }
  addBox(group, MAT.metalDark, 0.16, 0.24, width * 0.9, 0, 2.9, 0, { cast: true });

  const signMat = createStreetSignMaterial('7 湖畔', 'LAKESIDE');
  MAT.textures.push(signMat.map);
  addPanel(group, signMat, 1.15, 0.34, length / 2 + 0.03, 2.72, 0, Math.PI / 2);

  return group;
}

/* --------------------------------------------------------------------------
   Neighbours and backdrop
   -------------------------------------------------------------------------- */

function createNeighbour(MAT, side) {
  const group = new THREE.Group();
  const west = side === 'west';
  const x = west ? -16.2 : 17.2;
  const width = 13;
  const height = west ? 5.6 : 6.2;

  addBox(group, west ? MAT.plasterWarm : MAT.plasterPale, width, height, 8.4, x, height / 2, -2.9, { cast: true });
  addBox(group, MAT.brick, width + 0.2, 0.75, 8.6, x, 0.37, -2.9, { cast: true });
  addBox(group, MAT.brickDark, width + 0.55, 0.24, 0.3, x, height - 0.2, 1.28, { cast: true });
  addBox(group, MAT.brickDark, width + 0.55, 0.24, 0.3, x, height - 0.2, -7.1, { cast: true });

  const frontZ = 1.28;
  for (const wx of [x - 3.7, x + 3.5]) {
    addBox(group, MAT.oakDark, 2.2, 2.25, 0.14, wx, 2.2, frontZ + 0.05, { cast: true });
    addPanel(group, MAT.windowGlass, 1.9, 1.95, wx, 2.2, frontZ + 0.13);
    addBox(group, MAT.oak, 0.07, 1.95, 0.08, wx, 2.2, frontZ + 0.17, { cast: true });
    addBox(group, MAT.stone, 2.6, 0.14, 0.35, wx, 1.02, frontZ + 0.18, { cast: true });
    addBox(group, MAT.oak, 2.5, 2.2, 0.06, wx, 4.35, frontZ + 0.06, { cast: true });
    addPanel(group, MAT.windowGlass, 2.2, 1.8, wx, 4.35, frontZ + 0.11);
  }

  const shop = createSignMaterial({
    width: 900,
    height: 280,
    title: west ? '纸页书店' : '花房',
    subtitle: west ? 'PAPER PAGES · BOOKS' : 'FLOWERS · DAILY',
    background: west ? '#e6d9c4' : '#dfe1d4',
    foreground: '#3b3128',
    accent: west ? '#73513a' : '#5b6b4c'
  });
  MAT.textures.push(shop.texture);
  addBox(group, MAT.oakDark, 4.4, 1.0, 0.1, x, 3.55, frontZ + 0.1, { cast: true });
  addPanel(group, shop.material, 4.15, 0.86, x, 3.55, frontZ + 0.17);

  /* warm shop interior glow behind the lower windows */
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.8), MAT.windowGlow);
  glow.position.set(x, 2.0, frontZ + 0.03);
  group.add(glow);

  if (!west) {
    /* Flower buckets outside the little shop */
    for (let i = 0; i < 4; i += 1) {
      addCylinder(group, MAT.metalDark, 0.18, 0.14, 0.45, x - 2.1 + i * 0.5, 0.22, 2.2 + (i % 2) * 0.3, { segments: 10, cast: true });
      const bunch = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), i % 2 ? MAT.foliageLight : MAT.foliage);
      bunch.position.set(x - 2.1 + i * 0.5, 0.58, 2.2 + (i % 2) * 0.3);
      bunch.scale.y = 0.8;
      bunch.castShadow = true;
      group.add(bunch);
    }
  } else {
    addBox(group, MAT.oakDark, 3.0, 0.14, 0.5, x + 1.4, 0.75, 2.3, { cast: true });
    addBox(group, MAT.oakDark, 3.0, 0.6, 0.12, x + 1.4, 0.5, 2.1, { cast: true });
    for (let i = 0; i < 4; i += 1) {
      addBox(group, MAT.paper, 0.16, 0.22, 0.06, x + 0.4 + i * 0.23, 0.92, 2.32, { rotation: [0, 0.2 * (i % 2 ? 1 : -1), 0], cast: false });
    }
  }

  return group;
}

function createTreeLine(MAT) {
  const group = new THREE.Group();
  const random = (() => {
    let s = 13;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  })();

  /* A soft bank of trees behind the street, so the café roofline sits against
     foliage and sky rather than a wall of blank massing. */
  for (let i = 0; i < 22; i += 1) {
    const x = -34 + random() * 68;
    const z = -17 - random() * 9;
    const radius = 1.2 + random() * 2.2;
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius, 1),
      i % 3 === 0 ? MAT.foliageDark : MAT.foliage
    );
    crown.position.set(x, 2.2 + random() * 1.6, z);
    crown.scale.set(1.1, 0.95 + random() * 0.4, 1);
    crown.castShadow = false;
    crown.receiveShadow = false;
    group.add(crown);
    if (i % 4 === 0) {
      addCylinder(group, MAT.hairBrown, 0.14, 0.2, 3.0, x, 1.5, z, { segments: 7, cast: false });
    }
  }

  /* Two very low, fog-softened roofs for depth. */
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8f7e6b, roughness: 0.98 });
  addBox(group, roofMaterial, 10, 3.6, 6, -22, 1.4, -25, { cast: false });
  addBox(group, MAT.brickDark, 10.6, 0.22, 6.5, -22, 3.3, -25, { rotation: [0.1, 0, 0], cast: false });
  addBox(group, roofMaterial, 8, 4.4, 6, 21, 1.8, -27, { cast: false });
  addBox(group, MAT.brickDark, 8.6, 0.22, 6.5, 21, 4.1, -27, { rotation: [0.1, 0, 0], cast: false });

  return group;
}

/* --------------------------------------------------------------------------
   Walking people
   -------------------------------------------------------------------------- */

function createPedestrians(MAT) {
  const group = new THREE.Group();
  const walkers = [];

  const specs = [
    { x: -11.5, z: 3.1, dir: 1, speed: 0.62, top: 'shirtCream', bottom: 'denim', hair: 'hairBrown', style: 'soft', umbrella: 'umbrellaCream', phase: 0.2 },
    { x: -4.6, z: 3.25, dir: -1, speed: 0.52, top: 'fabricRust', bottom: 'denim', hair: 'hairDark', style: 'long', umbrella: 'umbrellaRust', phase: 1.7 },
    { x: 12.4, z: 2.95, dir: -1, speed: 0.7, top: 'shirtBlue', bottom: 'denim', hair: 'hairDark', style: 'short', umbrella: 'umbrellaSage', phase: 3.1 },
    { x: 19.4, z: 13.5, dir: -1, speed: 0.56, top: 'fabricSage', bottom: 'denim', hair: 'hairBrown', style: 'bun', umbrella: 'umbrellaCream', phase: 4.2 },
    { x: -20.5, z: 13.6, dir: 1, speed: 0.64, top: 'shirtCream', bottom: 'denim', hair: 'hairGrey', style: 'short', umbrella: 'umbrellaSage', phase: 0.9 }
  ];

  for (const spec of specs) {
    const person = createPerson(MAT, {
      top: spec.top,
      bottom: spec.bottom,
      hair: spec.hair,
      hairStyle: spec.style,
      umbrella: spec.umbrella,
      skin: spec.hair === 'hairGrey' ? 'skinWarm' : 'skinLight'
    });
    person.position.set(spec.x, 0, spec.z);
    person.rotation.y = spec.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(person);
    walkers.push({ person, ...spec, min: -26, max: 26 });
  }

  /* A person waiting at the bus stop, holding a newspaper. */
  const waiter = createPerson(MAT, {
    top: 'shirtCream',
    bottom: 'fabricWarm' in MAT ? 'fabricWarm' : 'denim',
    hair: 'hairGrey',
    hairStyle: 'short',
    skin: 'skinWarm'
  });
  waiter.position.set(16.0, 0, 4.05);
  waiter.rotation.y = -0.2;
  group.add(waiter);
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.02), MAT.paper);
  paper.position.set(0.22, 1.08, 0.22);
  paper.rotation.set(-0.5, 0.2, 0);
  waiter.add(paper);

  return { group, walkers, waiter };
}

/* --------------------------------------------------------------------------
   Assemble the exterior
   -------------------------------------------------------------------------- */

export function createExterior(MAT, quality = {}) {
  const group = new THREE.Group();
  const building = createBuilding(MAT);
  const street = createStreet(MAT);
  const cafeFront = createCafeFront(MAT);
  const pedestrians = createPedestrians(MAT);

  group.add(building.group, street.group, cafeFront, pedestrians.group);
  group.add(createTree(MAT, -9.3, 3.2, 1.05));
  group.add(createTree(MAT, 10.6, 3.15, 0.95));
  group.add(createNeighbour(MAT, 'west'));
  group.add(createNeighbour(MAT, 'east'));
  group.add(createTreeLine(MAT));

  /* Warm under-awning light, and a soft spill through the door. */
  const awningLight = new THREE.PointLight(0xffb877, 0.9, 8, 2);
  awningLight.position.set(0, 2.75, 2.4);
  group.add(awningLight);
  const doorLight = new THREE.PointLight(0xffc18a, 0.7, 6, 2);
  doorLight.position.set(2.16, 1.6, 2.2);
  group.add(doorLight);

  /* Cars and a bus on the road. */
  const vehicles = [];
  const carSpecs = [
    { paint: MAT.carSage, lane: 6.3, dir: 1, speed: 4.6, x: 10, length: 4.0 },
    { paint: MAT.carCream, lane: 6.3, dir: 1, speed: 3.9, x: 19, length: 4.2 },
    { paint: MAT.carCharcoal, lane: 10.4, dir: -1, speed: 4.2, x: 10, length: 4.3 },
    { paint: MAT.carRust, lane: 10.4, dir: -1, speed: 3.6, x: -14, length: 3.8 }
  ];

  for (const spec of carSpecs) {
    const car = createCar(MAT, spec.paint, { length: spec.length });
    car.position.set(spec.x, ROAD.y, spec.lane);
    car.rotation.y = spec.dir > 0 ? 0 : Math.PI;
    group.add(car);
    vehicles.push({ object: car, ...spec });
  }

  const bus = createBus(MAT);
  bus.position.set(-7, ROAD.y, 10.2);
  bus.rotation.y = Math.PI;
  group.add(bus);
  vehicles.push({ object: bus, lane: 10.2, dir: -1, speed: 2.6, x: -7, length: 8.6, bus: true });

  /* Light spill through the storefront; interiors add their own warmth. */
  const doorSpill = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.5), MAT.windowGlow);
  doorSpill.position.set(2.16, 1.45, 1.28);
  doorSpill.rotation.y = Math.PI;
  doorSpill.castShadow = false;
  group.add(doorSpill);

  return {
    group,
    interactives: building.interactives,
    rainGlass: building.rainGlass,
    puddles: street.puddles,
    streetLights: street.streetLights,
    vehicles,
    pedestrians,
    lights: [
      { light: awningLight, day: 0.85, rain: 1.6 },
      { light: doorLight, day: 0.55, rain: 1.0 },
      ...street.streetLights.map((entry) => ({ light: entry.light, day: entry.day, rain: entry.rain }))
    ],
    setHeroPose() {
      const poses = [-7, 16, 8, -25, -16];
      vehicles.forEach((vehicle, index) => {
        vehicle.x = poses[index] ?? vehicle.x;
        vehicle.object.position.x = vehicle.x;
      });
    },
    update(dt, time, rainAmount) {
      for (const vehicle of vehicles) {
        const dir = vehicle.dir;
        vehicle.x += dir * vehicle.speed * dt;
        if (dir > 0 && vehicle.x > 56) vehicle.x = -58;
        if (dir < 0 && vehicle.x < -58) vehicle.x = 56;
        vehicle.object.position.x = vehicle.x;
      }

      for (const walker of pedestrians.walkers) {
        walker.x += walker.dir * walker.speed * dt;
        if (walker.x > walker.max) {
          walker.x = walker.max;
          walker.dir = -1;
        } else if (walker.x < walker.min) {
          walker.x = walker.min;
          walker.dir = 1;
        }
        const person = walker.person;
        person.position.x = walker.x;
        person.rotation.y = walker.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        const phase = time * (5.5 + walker.speed) + walker.phase;
        const parts = person.userData.parts;
        if (parts) {
          parts.legL.rotation.x = Math.sin(phase) * 0.48;
          parts.legR.rotation.x = -Math.sin(phase) * 0.48;
          parts.armL.rotation.x = -Math.sin(phase) * 0.4;
          parts.armR.rotation.x = Math.sin(phase) * 0.4;
          parts.head.rotation.y = Math.sin(phase * 0.25) * 0.12;
          person.position.y = Math.abs(Math.sin(phase)) * 0.025;
        }
        if (person.userData.umbrella) {
          person.userData.umbrella.visible = rainAmount > 0.25;
          person.userData.umbrella.rotation.z = Math.sin(time * 0.9 + walker.phase) * 0.04 - 0.06;
        }
      }

      const waiterParts = pedestrians.waiter.userData.parts;
      if (waiterParts) {
        waiterParts.head.rotation.y = Math.sin(time * 0.25) * 0.2;
        waiterParts.head.rotation.x = Math.sin(time * 0.17) * 0.03;
      }

      for (const entry of this.lights) {
        entry.light.intensity = THREE.MathUtils.lerp(entry.day, entry.rain, rainAmount);
      }
    }
  };
}
