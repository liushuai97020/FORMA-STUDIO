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

  /* A warm interior light bed tucked just behind the storefront glass. It
     glows through the openings without hiding the bar and tables. */
  const storefrontGlowMaterial = MAT.storefrontInterior;
  for (const [gx, gw, gy, gh] of [[-3.0, 5.7, 1.72, 2.15], [5.2, 3.2, 1.72, 2.15], [2.16, 1.9, 1.55, 2.1]]) {
    const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), storefrontGlowMaterial);
    glowPlane.position.set(gx, gy, z1 + 0.022);
    glowPlane.renderOrder = 3;
    group.add(glowPlane);
  }

  /* A parked car at the curb, headlights on. */
  const storefrontWash = new THREE.Mesh(new THREE.PlaneGeometry(13.8, 2.3), MAT.storefrontWash);
  storefrontWash.position.set(0, 1.7, z1 + 0.015);
  storefrontWash.renderOrder = 4;
  group.add(storefrontWash);

  const parkedCar = createCar(MAT, MAT.carCream, { length: 4.15 });
  parkedCar.position.set(14.6, ROAD.y, 5.15);
  parkedCar.rotation.y = -0.44;
  const parkedLight = new THREE.PointLight(0xffc98a, 2.2, 7, 2);
  parkedLight.position.set(14.6, 1.0, 5.15);
  group.add(parkedLight);
  group.add(parkedCar);
  /* Awning over the pavement --------------------------------------------- */

  const awning = new THREE.Group();
  group.add(awning);
  const awningZ0 = z1 + 0.08;
  const awningZ1 = 2.85;
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
    accent: '#a15b39',
    brightness: 1.0
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
    accent: '#a15b39',
    brightness: 0.95
  });
  MAT.textures.push(vertical.texture);
  addBox(group, MAT.metalDark, 0.08, 2.12, 0.76, x1 + 0.15, 4.45, 0.3, { cast: true });
  const blade = addPanel(group, vertical.material, 0.68, 2.0, x1 + 0.2, 4.45, 0.3, Math.PI / 2);
  blade.castShadow = true;

  /* Warm LED strip tucked beneath the awning. */
  addBox(awning, MAT.neonAmber, awningW - 0.5, 0.035, 0.045, 0, awningY1 - 0.045, awningZ1 + 0.06, { cast: false });
  addBox(awning, MAT.neonAmber, awningW - 0.5, 0.025, 0.025, 0, awningY1 - 0.12, awningZ1 + 0.08, { cast: false });

  /* A small OPEN sign on the side wall. */
  const openSign = createSignMaterial({
    width: 420,
    height: 180,
    title: '营业中',
    subtitle: 'OPEN · 23:42',
    background: '#0c0b12',
    foreground: '#ffc47a',
    accent: '#ff9c52',
    brightness: 1.25
  });
  MAT.textures.push(openSign.texture);
  addBox(group, MAT.metalDark, 1.14, 0.56, 0.08, x1 + 0.06, 2.22, 0.9, { rotation: [0, Math.PI / 2, 0], cast: true });
  addPanel(group, openSign.material, 1.02, 0.44, x1 + 0.11, 2.22, 0.9, Math.PI / 2);

  /* Rooftop equipment gives the silhouette a lived-in, city-detail read. */
  for (const [ax, az] of [[-4.4, -4.6], [-1.9, -5.5], [3.8, -3.6]]) {
    addBox(group, MAT.metalDark, 1.1, 0.62, 0.74, ax, roof + 0.46, az, { cast: true });
    addCylinder(group, MAT.metalDark, 0.24, 0.24, 0.035, ax - 0.2, roof + 0.79, az, { segments: 16, cast: true });
    addCylinder(group, MAT.metalDark, 0.24, 0.24, 0.035, ax + 0.2, roof + 0.79, az, { segments: 16, cast: true });
    addBox(group, MAT.metalDark, 1.2, 0.05, 0.84, ax, roof + 0.18, az, { cast: false });
  }
  addBox(group, MAT.brickDark, 0.7, 1.3, 0.7, 5.8, roof + 0.75, -5.9, { cast: true });
  addCylinder(group, MAT.metalDark, 0.28, 0.28, 0.35, 5.8, roof + 1.55, -5.9, { segments: 14, cast: true });
  addCylinder(group, MAT.metalDark, 0.12, 0.16, 2.1, -6.9, roof + 0.25, -6.2, { segments: 10, cast: true });

  /* Satellite dish, slightly crooked. */
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.52, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.3), MAT.plasterPale);
  dish.position.set(2.2, roof + 1.15, -6.4);
  dish.rotation.set(Math.PI * 0.42, 0.2, 0.1);
  group.add(dish);
  addCylinder(group, MAT.metalDark, 0.045, 0.045, 1.1, 2.2, roof + 0.55, -6.4, { segments: 8, cast: true });

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

  return { group, interactives, rainGlass: [rainGlass, rainGlassDoor], bulbs, storefrontGlow: storefrontGlowMaterial };
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
    const light = new THREE.PointLight(0xffc07c, 0, 15, 2);
    light.position.set(x, 4.95, 3.0);
    group.add(light);
    streetLights.push({ light, day: 0.1, rain: 9 });

    /* A soft volumetric cone of light under each streetlamp. */
    const coneMaterial = new THREE.MeshBasicMaterial({
      color: 0xffb875,
      transparent: true,
      opacity: 0.075,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: true
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.1, 4.0, 18, 1, true), coneMaterial);
    cone.position.set(x, 3.05, 3.0);
    group.add(cone);
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
  addBox(stop, MAT.neonGreen, 0.035, 0.32, 0.035, -1.55, 2.38, 0.7, { cast: false });

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
  /* Smaller leaf clusters break up the silhouette and catch street light. */
  const leafClusters = [
    [-0.82, 3.0, -0.1, 0.34], [0.88, 3.25, 0.1, 0.3], [-0.35, 3.55, 0.52, 0.3],
    [0.5, 3.7, -0.38, 0.27], [-0.72, 3.5, 0.35, 0.24], [0.18, 3.95, 0.04, 0.22],
    [-0.08, 3.18, -0.62, 0.26], [0.68, 2.92, 0.42, 0.22]
  ];
  leafClusters.forEach(([cx, cy, cz, radius], index) => {
    const leaf = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius, 1),
      index % 3 === 0 ? MAT.foliageDark : index % 2 ? MAT.foliage : MAT.foliageLight
    );
    leaf.position.set(cx, cy, cz);
    leaf.scale.set(1.05, 0.8, 1.05);
    leaf.castShadow = true;
    group.add(leaf);
  });
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

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 22), MAT.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(length * 0.52, width * 0.74, 1);
  shadow.position.y = 0.025;
  group.add(shadow);

  const body = new THREE.Mesh(new RoundedBoxGeometry(length, 0.46, width, 3, 0.13), bodyMat);
  body.position.y = 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const shoulder = new THREE.Mesh(new RoundedBoxGeometry(length * 0.9, 0.3, width * 0.9, 3, 0.1), bodyMat);
  shoulder.position.y = 0.76;
  shoulder.castShadow = true;
  group.add(shoulder);

  for (const sx of [-1, 1]) {
    const hood = new THREE.Mesh(new RoundedBoxGeometry(length * 0.28, 0.18, width * 0.88, 3, 0.07), bodyMat);
    hood.position.set(sx * length * 0.32, 0.87, 0);
    hood.castShadow = true;
    group.add(hood);
  }

  const cabin = new THREE.Mesh(new RoundedBoxGeometry(length * 0.5, 0.42, width * 0.84, 3, 0.12), bodyMat);
  cabin.position.set(-0.04, 1.06, 0);
  cabin.castShadow = true;
  group.add(cabin);
  const roof = new THREE.Mesh(new RoundedBoxGeometry(length * 0.34, 0.045, width * 0.7, 2, 0.035), bodyMat);
  roof.position.set(-0.05, 1.28, 0);
  group.add(roof);

  /* Glasshouse */
  for (const z of [-width * 0.425, width * 0.425]) {
    for (const x of [-0.68, 0.35]) {
      addBox(group, MAT.glassDark, length * 0.18, 0.27, 0.014, x, 1.08, z, { cast: false });
      addBox(group, MAT.metalDark, length * 0.18 + 0.035, 0.022, 0.035, x, 1.23, z, { cast: false });
    }
    addBox(group, MAT.chrome, length * 0.5, 0.014, 0.02, -0.04, 1.015, z, { cast: false });
  }
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.7, 0.29), MAT.glassDark);
  windshield.position.set(length * 0.16, 1.08, 0);
  windshield.rotation.y = Math.PI / 2;
  group.add(windshield);
  const rearGlass = windshield.clone();
  rearGlass.position.x = -length * 0.4;
  rearGlass.rotation.y = -Math.PI / 2;
  group.add(rearGlass);

  /* Wheels, rims and spokes */
  const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 18);
  const rimGeometry = new THREE.TorusGeometry(0.16, 0.028, 6, 18);
  for (const wx of [-length * 0.31, length * 0.31]) {
    for (const z of [-width / 2 + 0.035, width / 2 - 0.035]) {
      const wheel = new THREE.Mesh(wheelGeometry, MAT.rubber);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.31, z);
      wheel.castShadow = true;
      group.add(wheel);
      const rim = new THREE.Mesh(rimGeometry, MAT.chrome);
      rim.position.set(wx, 0.31, z + Math.sign(z) * 0.1);
      group.add(rim);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.205, 10), MAT.chrome);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(wx, 0.31, z);
      group.add(hub);
      for (let i = 0; i < 5; i += 1) {
        addBox(group, MAT.chrome, 0.24, 0.018, 0.018, wx, 0.31, z + Math.sign(z) * 0.105, { rotation: [0, 0, (i / 5) * Math.PI * 2], cast: false });
      }
    }
  }

  /* Bumpers, grille, light housings, mirrors, plates and seams. */
  for (const sx of [-1, 1]) {
    const bumper = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.2, width * 0.96, 3, 0.04), MAT.metalDark);
    bumper.position.set(sx * (length / 2 - 0.02), 0.37, 0);
    bumper.castShadow = true;
    group.add(bumper);
    addBox(group, MAT.metalDark, 0.04, 0.05, width * 0.88, sx * (length / 2 + 0.05), 0.27, 0, { cast: false });
  }
  addBox(group, MAT.grille, 0.03, 0.18, width * 0.44, length / 2 + 0.02, 0.55, 0, { cast: false });
  for (let i = 0; i < 4; i += 1) {
    addBox(group, MAT.chrome, 0.015, 0.018, width * 0.4, length / 2 + 0.045, 0.49 + i * 0.04, 0, { cast: false });
  }
  for (const z of [-width * 0.33, width * 0.33]) {
    addCylinder(group, MAT.chrome, 0.1, 0.11, 0.05, length / 2 + 0.04, 0.58, z, { rotation: [0, 0, Math.PI / 2], segments: 14, cast: false });
    addCylinder(group, MAT.headlight, 0.082, 0.082, 0.04, length / 2 + 0.07, 0.58, z, { rotation: [0, 0, Math.PI / 2], segments: 14, cast: false });
    addBox(group, MAT.taillight, 0.035, 0.13, 0.25, -length / 2 - 0.02, 0.62, z, { cast: false });
    addBox(group, MAT.metalDark, 0.07, 0.13, 0.2, -length / 2 - 0.045, 0.42, z, { cast: false });
    const mirror = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.1, 0.08, 2, 0.025), bodyMat);
    mirror.position.set(length * 0.11, 1.06, z * 1.08);
    group.add(mirror);
  }
  addBox(group, MAT.paper, 0.03, 0.11, 0.36, -length / 2 - 0.035, 0.46, 0, { cast: false });
  addBox(group, MAT.paper, 0.03, 0.11, 0.36, length / 2 + 0.035, 0.46, 0, { cast: false });
  addBox(group, MAT.metalDark, 0.03, 0.35, 0.03, -0.72, 1.03, -width / 2 + 0.01, { cast: false });
  addBox(group, MAT.metalDark, 0.03, 0.35, 0.03, 0.3, 1.03, -width / 2 + 0.01, { cast: false });
  addBox(group, MAT.chrome, 0.2, 0.03, 0.035, -0.35, 0.8, -width / 2 - 0.01, { cast: false });
  addBox(group, MAT.chrome, 0.2, 0.03, 0.035, 0.25, 0.8, -width / 2 - 0.01, { cast: false });
  addCylinder(group, MAT.metalDark, 0.01, 0.01, 0.45, -length * 0.28, 1.42, 0.18, { segments: 5, cast: false });

  for (const z of [-width * 0.33, width * 0.33]) {
    const headGlow = new THREE.Sprite(MAT.glowSpriteWarm.clone());
    headGlow.material.opacity = 0.7;
    headGlow.position.set(length / 2 + 0.12, 0.58, z);
    headGlow.scale.set(1.6, 0.8, 1);
    group.add(headGlow);
    const tailGlow = new THREE.Sprite(MAT.glowSpriteWarm.clone());
    tailGlow.material.color.set(0xff4a38);
    tailGlow.material.opacity = 0.45;
    tailGlow.position.set(-length / 2 - 0.1, 0.6, z);
    tailGlow.scale.set(0.9, 0.5, 1);
    group.add(tailGlow);
  }

  return group;
}

function createBus(MAT) {
  const group = new THREE.Group();
  const length = 8.6;
  const width = 2.35;

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), MAT.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(length * 0.48, width * 0.7, 1);
  shadow.position.y = 0.025;
  group.add(shadow);

  const body = new THREE.Mesh(new RoundedBoxGeometry(length, 2.1, width, 4, 0.16), MAT.busCream);
  body.position.y = 1.62;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  const skirt = new THREE.Mesh(new RoundedBoxGeometry(length * 0.98, 0.35, width + 0.02, 3, 0.08), MAT.busTeal);
  skirt.position.y = 0.55;
  skirt.castShadow = true;
  group.add(skirt);
  addBox(group, MAT.busTeal, length + 0.02, 0.32, width + 0.02, 0, 1.06, 0, { cast: true });

  /* Window bays with dark mullions and warm interior glass. */
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i += 1) {
      const wx = -3.05 + i * 1.22;
      const window = addBox(group, MAT.busWindowGlow, 1.05, 0.88, 0.03, wx, 2.28, side * (width / 2 + 0.01), { cast: false });
      window.renderOrder = 2;
      addBox(group, MAT.metalDark, 0.08, 1.02, 0.045, wx - 0.57, 2.28, side * (width / 2 + 0.02), { cast: false });
      addBox(group, MAT.metalDark, 0.06, 0.06, 0.05, wx, 1.82, side * (width / 2 + 0.02), { cast: false });
    }
    addBox(group, MAT.metalDark, length * 0.86, 0.06, 0.05, 0, 2.76, side * (width / 2 + 0.02), { cast: false });
  }
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.78, 1.0), MAT.glassDark);
  windshield.position.set(length / 2 + 0.01, 2.28, 0);
  windshield.rotation.y = Math.PI / 2;
  group.add(windshield);
  const rearWindow = windshield.clone();
  rearWindow.position.x = -length / 2 - 0.01;
  rearWindow.rotation.y = -Math.PI / 2;
  rearWindow.scale.set(0.7, 0.8, 1);
  group.add(rearWindow);

  /* Door, route board, wipers and mirrors. */
  addBox(group, MAT.glassDark, 0.04, 1.45, 1.05, length / 2 + 0.02, 1.65, 0.38, { cast: false });
  addBox(group, MAT.metalDark, 0.06, 1.6, 1.1, length / 2 + 0.04, 1.65, 0.38, { cast: false });
  addBox(group, MAT.neonWarmWhite, 0.03, 0.12, 0.9, length / 2 + 0.05, 2.6, 0.38, { cast: false });
  for (const z of [-width * 0.34, width * 0.34]) {
    addCylinder(group, MAT.chrome, 0.12, 0.13, 0.06, length / 2 + 0.06, 0.82, z, { rotation: [0, 0, Math.PI / 2], segments: 14, cast: false });
    addCylinder(group, MAT.headlight, 0.1, 0.1, 0.045, length / 2 + 0.09, 0.82, z, { rotation: [0, 0, Math.PI / 2], segments: 14, cast: false });
    addBox(group, MAT.taillight, 0.04, 0.24, 0.24, -length / 2 - 0.02, 0.92, z, { cast: false });
    const mirror = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.34, 0.1, 2, 0.03), MAT.metalDark);
    mirror.position.set(length * 0.46, 1.9, z * 1.15);
    group.add(mirror);
  }
  addBox(group, MAT.metalDark, 0.06, 0.26, width * 0.9, length / 2 + 0.02, 0.4, 0, { cast: true });
  addBox(group, MAT.metalDark, 0.06, 0.26, width * 0.9, -length / 2 - 0.02, 0.4, 0, { cast: true });
  addBox(group, MAT.metalDark, 0.04, 0.7, 0.04, length / 2 - 0.8, 2.3, 0.86, { rotation: [0, 0, -0.35], cast: false });
  addBox(group, MAT.metalDark, 0.04, 0.7, 0.04, length / 2 - 0.8, 2.3, -0.86, { rotation: [0, 0, 0.35], cast: false });

  const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.28, 18);
  for (const wx of [-2.65, 2.7]) {
    for (const z of [-width / 2 + 0.01, width / 2 - 0.01]) {
      const wheel = new THREE.Mesh(wheelGeo, MAT.rubber);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.46, z);
      wheel.castShadow = true;
      group.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.29, 12), MAT.chrome);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(wx, 0.46, z);
      group.add(hub);
    }
  }

  addBox(group, MAT.metalDark, 1.1, 0.3, 1.8, -1.3, 2.83, 0, { cast: true });
  const signMat = createStreetSignMaterial('7 湖畔', 'LAKESIDE');
  MAT.textures.push(signMat.map);
  addPanel(group, signMat, 1.15, 0.34, length / 2 + 0.03, 2.72, 0, Math.PI / 2);
  addPanel(group, signMat, 0.75, 0.25, -length / 2 - 0.03, 2.5, 0, -Math.PI / 2);

  return group;
}

/* --------------------------------------------------------------------------
   Night dressing: glow sprites, light pools and wet-road reflections
   -------------------------------------------------------------------------- */

function createNightDressing(MAT) {
  const group = new THREE.Group();
  const glowSprites = [];
  const lightPools = [];
  const reflections = [];

  function glow(material, x, y, z, sx, sy, opacity) {
    const sprite = new THREE.Sprite(material.clone());
    sprite.position.set(x, y, z);
    sprite.scale.set(sx, sy, 1);
    sprite.material.opacity = 0;
    sprite.userData.baseOpacity = opacity;
    group.add(sprite);
    glowSprites.push(sprite);
    return sprite;
  }

  function pool(material, x, z, width, depth, opacity, y = 0.035) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material.clone());
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.material.opacity = 0;
    mesh.material.depthWrite = false;
    mesh.userData.baseOpacity = opacity;
    group.add(mesh);
    lightPools.push(mesh);
    return mesh;
  }

  function reflection(material, x, z, width, length, opacity, y = ROAD.y + 0.022, tint = null) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material.clone());
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.material.opacity = 0;
    mesh.material.depthWrite = false;
    if (tint) mesh.material.color.set(tint);
    mesh.userData.baseOpacity = opacity;
    group.add(mesh);
    reflections.push(mesh);
    return mesh;
  }

  /* Sign halos */
  glow(MAT.glowSpriteWarm, 0, 4.55, 2.5, 4.6, 2.4, 0.18);
  glow(MAT.glowSpriteWarm, 8.1, 4.5, 0.4, 2.1, 2.8, 0.16);
  glow(MAT.glowSpriteWarm, 2.15, 2.25, 3.0, 3.2, 2.2, 0.15);
  glow(MAT.glowSpriteWarm, 7.4, 2.22, 1.3, 1.5, 1.1, 0.12);

  /* Neighbouring neon */
  glow(MAT.glowSpriteViolet, -16.2, 3.6, 1.7, 3.4, 1.8, 0.14);
  glow(MAT.glowSpriteViolet, 17.2, 3.7, 1.8, 2.8, 1.6, 0.11);
  const greenGlow = MAT.glowSpriteCool.clone();
  greenGlow.color.set(0x6effc0);
  glow(greenGlow, 14.3, 2.4, 0.8, 1.2, 1.0, 0.12);

  /* Streetlamps */
  for (const x of [-12.8, 11.2]) {
    glow(MAT.glowSpriteWarm, x, 5.08, 3.0, 2.0, 2.0, 0.25);
    pool(MAT.poolWarm, x, 3.0, 4.2, 4.2, 0.18);
  }

  /* Warm spill from the shopfront onto the sidewalk and road. */
  pool(MAT.poolWarm, 0, 3.0, 7.6, 4.8, 0.2);
  pool(MAT.poolWarm, -4.2, 3.35, 3.6, 2.8, 0.12);
  pool(MAT.poolWarm, 4.4, 3.35, 3.6, 2.8, 0.12);
  reflection(MAT.reflectionWarm, -2.5, 8.0, 1.15, 10.5, 0.3);
  reflection(MAT.reflectionWarm, 1.5, 8.2, 1.3, 11.0, 0.38);
  reflection(MAT.reflectionWarm, 5.3, 8.0, 0.9, 10.0, 0.24);
  reflection(MAT.reflectionWarm, 7.6, 7.4, 0.7, 8.0, 0.2);
  reflection(MAT.reflectionViolet, -13.2, 8.4, 1.15, 10.0, 0.22, ROAD.y + 0.024, 0x9a5ce8);
  reflection(MAT.reflectionViolet, 9.6, 8.6, 1.0, 9.0, 0.18, ROAD.y + 0.024, 0x9a5ce8);
  reflection(MAT.reflectionWarm, -12.8, 7.4, 1.8, 7.0, 0.2, ROAD.y + 0.02, 0xffa45e);
  reflection(MAT.reflectionWarm, 11.2, 7.6, 1.8, 7.0, 0.2, ROAD.y + 0.02, 0xffa45e);

  return { group, glowSprites, lightPools, reflections };
}

/* --------------------------------------------------------------------------
   Micro-detail dressing: façade seams, roof tile courses, gutters, meters,
   street furniture, curb stones, drains, background city.
   -------------------------------------------------------------------------- */

function createDetailDressing(MAT) {
  const group = new THREE.Group();
  const { x0, x1, z1, roof, upperTop } = BUILDING;
  const width = x1 - x0;
  const cx = 0;
  const front = z1 + 0.015;

  function rounded(parent, material, w, h, d, x, y, z, radius = 0.03, options = {}) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, radius), material);
    mesh.position.set(x, y, z);
    if (options.rotation) mesh.rotation.set(...options.rotation);
    mesh.castShadow = options.cast !== false;
    mesh.receiveShadow = options.receive !== false;
    parent.add(mesh);
    return mesh;
  }

  function grimePlane(w, h, x, y, z, rotationY = 0, opacity = 0.45) {
    const material = MAT.grime.clone();
    material.opacity = opacity;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotationY;
    mesh.renderOrder = 1;
    group.add(mesh);
    return mesh;
  }

  /* ------------------------------------------------------------------------
     Façade layers, trims and seams
     ------------------------------------------------------------------------ */

  rounded(group, MAT.trimStone, width + 0.24, 0.09, 0.24, cx, 0.68, front + 0.13, 0.018);
  rounded(group, MAT.trimStone, 0.2, 0.09, (z1 - BUILDING.z0) + 0.3, x0 - 0.1, 0.68, (z1 + BUILDING.z0) / 2, 0.018, { rotation: [0, Math.PI / 2, 0] });
  rounded(group, MAT.trimStone, 0.2, 0.09, (z1 - BUILDING.z0) + 0.3, x1 + 0.1, 0.68, (z1 + BUILDING.z0) / 2, 0.018, { rotation: [0, Math.PI / 2, 0] });

  /* Brick base joints */
  for (let x = -7.05; x <= 7.05; x += 1.18) {
    addBox(group, MAT.brickDark, 0.018, 0.55, 0.025, x, 0.35, front + 0.18, { cast: false });
  }

  /* Horizontal string courses and vertical panel joints on the plaster. */
  for (const y of [3.76, 4.04, 5.44, 6.34]) {
    addBox(group, MAT.trimStone, width + 0.06, 0.035, 0.04, cx, y, front + 0.035, { cast: false });
  }
  for (const x of [-7.15, -5.92, -3.55, -2.2, 2.2, 3.55, 5.92, 7.15]) {
    addBox(group, MAT.trimStone, 0.035, 2.52, 0.04, x, 5.07, front + 0.035, { cast: false });
  }

  /* Recessed plaster panels between the upper windows and the sign. */
  for (const [px, pw] of [[-2.55, 1.6], [2.55, 1.6]]) {
    rounded(group, MAT.plasterPale, pw, 1.2, 0.06, px, 5.05, front + 0.055, 0.025, { cast: false });
    addBox(group, MAT.oakDark, pw + 0.12, 0.045, 0.045, px, 4.42, front + 0.1, { cast: false });
    addBox(group, MAT.oakDark, pw + 0.12, 0.045, 0.045, px, 5.68, front + 0.1, { cast: false });
    addBox(group, MAT.oakDark, 0.045, 1.3, 0.045, px - pw / 2 - 0.03, 5.05, front + 0.1, { cast: false });
    addBox(group, MAT.oakDark, 0.045, 1.3, 0.045, px + pw / 2 + 0.03, 5.05, front + 0.1, { cast: false });
  }

  /* Dentils under the eave, each with a tiny shadow gap. */
  for (let x = -7.1; x <= 7.1; x += 0.47) {
    addBox(group, MAT.plasterPale, 0.18, 0.18, 0.17, x, 6.49, front + 0.11, { cast: false });
    addBox(group, MAT.grille, 0.12, 0.055, 0.02, x, 6.39, front + 0.2, { cast: false });
  }

  /* Exposed rafter tails under the deep eave. */
  for (let x = -7.2; x <= 7.2; x += 0.86) {
    addBox(group, MAT.trimWood, 0.11, 0.12, 0.62, x, 6.58, z1 + 0.3, { cast: true });
    addBox(group, MAT.metalDark, 0.08, 0.08, 0.68, x, 6.5, z1 + 0.34, { cast: false });
  }

  /* Gutters and brackets across the front and downpipes with elbows. */
  const gutter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, width + 0.8, 10, 1, true, 0, Math.PI),
    MAT.metalDark
  );
  gutter.rotation.z = Math.PI / 2;
  gutter.rotation.y = Math.PI / 2;
  gutter.position.set(0, 6.79, z1 + 0.23);
  group.add(gutter);
  for (let x = -7.3; x <= 7.3; x += 1.45) {
    addBox(group, MAT.metalDark, 0.16, 0.08, 0.28, x, 6.71, z1 + 0.26, { cast: false });
  }
  for (const x of [x0 + 0.3, x1 - 0.3]) {
    addCylinder(group, MAT.metalDark, 0.062, 0.062, 3.35, x, 4.95, z1 + 0.28, { segments: 10, cast: true });
    addCylinder(group, MAT.metalDark, 0.055, 0.055, 0.3, x, 3.3, z1 + 0.4, { rotation: [0.7, 0, 0], segments: 8, cast: true });
    for (const y of [3.7, 4.6, 5.55, 6.4]) {
      addBox(group, MAT.metalDark, 0.18, 0.035, 0.12, x, y, z1 + 0.35, { cast: false });
    }
  }

  /* Wall vents, electrical boxes, meters and conduit. */
  const vent = rounded(group, MAT.ventMetal, 0.52, 0.42, 0.12, -6.65, 5.95, front + 0.08, 0.03);
  for (let i = 0; i < 5; i += 1) addBox(group, MAT.grille, 0.38, 0.025, 0.015, -6.65, 5.82 + i * 0.06, front + 0.15, { cast: false });
  rounded(group, MAT.ventMetal, 0.4, 0.55, 0.14, 6.7, 1.48, front + 0.08, 0.025);
  addCylinder(group, MAT.pipeCopper, 0.035, 0.035, 2.2, 6.9, 0.95, front + 0.18, { segments: 8, cast: true });
  addCylinder(group, MAT.pipeCopper, 0.035, 0.035, 0.55, 6.9, 2.2, front + 0.18, { rotation: [0, 0, Math.PI / 2], segments: 8, cast: true });
  addBox(group, MAT.metalDark, 0.3, 0.38, 0.16, 6.15, 2.35, front + 0.08, { cast: true });
  addBox(group, MAT.grille, 0.22, 0.08, 0.02, 6.15, 2.45, front + 0.18, { cast: false });
  addCylinder(group, MAT.pipeCopper, 0.025, 0.025, 2.0, 6.15, 1.25, front + 0.2, { segments: 8, cast: true });

  /* Side façade panel seams, meters, air conditioners and pipework. */
  for (const side of [-1, 1]) {
    const sx = side < 0 ? x0 - 0.015 : x1 + 0.015;
    const rot = side < 0 ? -Math.PI / 2 : Math.PI / 2;
    for (const z of [-6.5, -4.9, -3.3, -1.7, -0.1]) {
      addBox(group, MAT.trimStone, 0.035, 2.7, 0.035, sx, 5.0, z, { cast: false });
    }
    for (const y of [3.8, 5.45, 6.3]) {
      addBox(group, MAT.trimStone, 0.035, 0.035, 7.5, sx, y, -3.0, { cast: false });
    }
    const ac = rounded(group, MAT.ventMetal, 0.88, 0.62, 0.55, sx + side * 0.28, 4.12, -3.0, 0.04);
    for (let i = 0; i < 7; i += 1) addBox(group, MAT.grille, 0.026, 0.34, 0.5, sx + side * (0.72), 4.12, -3.32 + i * 0.1, { cast: false });
    addBox(group, MAT.metalDark, 0.34, 0.06, 0.08, sx + side * 0.2, 3.73, -3.0, { cast: true });
    addBox(group, MAT.metalDark, 0.34, 0.06, 0.08, sx + side * 0.2, 4.52, -3.0, { cast: true });
    addCylinder(group, MAT.pipeCopper, 0.028, 0.028, 2.6, sx + side * 0.08, 1.5, -5.9, { segments: 8, cast: true });
    addCylinder(group, MAT.metalDark, 0.052, 0.052, 3.2, sx + side * 0.08, 4.95, -5.9, { segments: 8, cast: true });
    grimePlane(2.4, 1.8, sx + side * 0.02, 1.7, -4.2, rot, 0.32);
    grimePlane(1.5, 2.0, sx + side * 0.02, 5.0, -1.2, rot, 0.22);
  }

  /* Storefront outer frame: deeper reveals, fluted mullions, threshold. */
  for (const [x, w] of [[-3.04, 7.72], [5.21, 3.38]]) {
    addBox(group, MAT.oakDark, w + 0.44, 0.09, 0.26, x, 2.98, z1 + 0.18, { cast: true });
    addBox(group, MAT.oakDark, w + 0.44, 0.08, 0.2, x, 0.56, z1 + 0.18, { cast: true });
    for (const dx of [-w / 2 - 0.15, w / 2 + 0.15]) {
      addBox(group, MAT.oakDark, 0.12, 2.44, 0.2, x + dx, 1.76, z1 + 0.16, { cast: true });
      addBox(group, MAT.trimWood, 0.045, 2.28, 0.055, x + dx, 1.76, z1 + 0.28, { cast: false });
    }
  }
  /* Fluting on the existing storefront mullions. */
  for (const x of [-6.9, -4.97, -3.04, -1.11, 0.92, 3.52, 5.21, 6.9]) {
    addBox(group, MAT.trimWood, 0.032, 2.3, 0.035, x, 1.75, z1 + 0.13, { cast: false });
    addBox(group, MAT.trimWood, 0.032, 2.3, 0.035, x + 0.045, 1.75, z1 + 0.13, { cast: false });
  }

  /* Transom panes above the storefront and a warm soffit board. */
  for (const [tx, tw] of [[-3.04, 6.2], [5.21, 3.1], [2.16, 1.9]]) {
    for (let i = 0; i < 3; i += 1) {
      const paneWidth = tw / 3 - 0.1;
      const pane = addPanel(group, MAT.windowGlass, paneWidth, 0.32, tx - tw / 2 + tw / 6 + i * (tw / 3), 3.12, z1 + 0.12 + i * 0.001);
      pane.renderOrder = 2;
      addBox(group, MAT.oakDark, 0.045, 0.42, 0.08, tx - tw / 2 + (tw * i) / 3, 3.12, z1 + 0.16, { cast: false });
    }
    addBox(group, MAT.oakDark, tw + 0.1, 0.06, 0.09, tx, 3.32, z1 + 0.16, { cast: false });
    addBox(group, MAT.oakDark, tw + 0.1, 0.06, 0.09, tx, 2.92, z1 + 0.16, { cast: false });
  }

  /* Brass house number, door mat and brass kick plates. */
  addBox(group, MAT.brass, 0.3, 0.18, 0.025, 3.02, 2.02, z1 + 0.2, { cast: false });
  addBox(group, MAT.metalDark, 1.2, 0.025, 0.5, 2.16, 0.16, z1 + 0.54, { cast: false });
  addBox(group, MAT.oakDark, 0.1, 0.38, 0.035, 1.16, 0.52, z1 + 0.24, { cast: false });
  addBox(group, MAT.oakDark, 0.1, 0.38, 0.035, 3.16, 0.52, z1 + 0.24, { cast: false });

  /* Awning soffit slats and valance seam lines. */
  for (let x = -6.8; x <= 6.8; x += 1.1) {
    addBox(group, MAT.trimWood, 0.08, 0.05, 1.65, x, 3.03, 2.05, { cast: false });
  }
  for (let x = -6.85; x <= 6.85; x += 0.95) {
    addBox(group, MAT.oakDark, 0.025, 0.44, 0.02, x, 2.91, 2.86, { cast: false });
  }

  /* Awning support arms, wall brackets and a pair of gooseneck sign lamps. */
  for (const x of [-6.2, -2.1, 2.1, 6.2]) {
    addBox(group, MAT.metalDark, 0.22, 0.14, 0.18, x, 2.87, z1 + 0.06, { cast: true });
    addBeamBetween(group, MAT.metalDark, new THREE.Vector3(x, 2.88, z1 + 0.06), new THREE.Vector3(x, 3.06, 2.9), 0.018);
    addBox(group, MAT.brass, 0.08, 0.08, 0.04, x, 3.03, 2.96, { cast: false });
  }
  for (const lx of [-2.3, 2.3]) {
    addCylinder(group, MAT.metalDark, 0.035, 0.04, 0.6, lx, 5.28, z1 + 0.26, { segments: 8, cast: true });
    addBeamBetween(group, MAT.metalDark, new THREE.Vector3(lx, 5.55, z1 + 0.26), new THREE.Vector3(lx, 5.55, z1 + 0.85), 0.03);
    addCylinder(group, MAT.metalDark, 0.09, 0.16, 0.16, lx, 5.48, z1 + 0.9, { segments: 12, cast: true });
    const lampGlow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), MAT.lampGlow);
    lampGlow.position.set(lx, 5.39, z1 + 0.9);
    group.add(lampGlow);
    const lamp = new THREE.PointLight(0xffc88b, 1.1, 5.5, 2);
    lamp.position.set(lx, 5.3, z1 + 0.9);
    group.add(lamp);
  }

  /* Deeper upper-window surrounds and shutter slats. */
  for (const wx of [-4.7, 4.7]) {
    const wy = 4.72;
    const ww = 1.7;
    const wh = 1.28;
    addBox(group, MAT.trimStone, ww + 0.34, 0.14, 0.22, wx, wy + wh / 2 + 0.15, z1 + 0.12, { cast: true });
    addBox(group, MAT.trimStone, ww + 0.34, 0.16, 0.26, wx, wy - wh / 2 - 0.12, z1 + 0.15, { cast: true });
    for (const sx of [-1, 1]) {
      addBox(group, MAT.trimStone, 0.14, wh + 0.26, 0.2, wx + sx * (ww / 2 + 0.14), wy, z1 + 0.1, { cast: true });
      addBox(group, MAT.oakDark, 0.055, wh + 0.12, 0.18, wx + sx * (ww / 2 + 0.06), wy, z1 + 0.03, { cast: false });
    }
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 5; i += 1) {
        addBox(group, MAT.trimWood, ww * 0.37, 0.035, 0.03, wx + sx * ww * 0.24, wy - wh * 0.34 + i * wh * 0.17, z1 + 0.2, { cast: false });
      }
      addCylinder(group, MAT.brass, 0.018, 0.018, 0.09, wx + sx * ww * 0.05, wy - wh * 0.32, z1 + 0.22, { rotation: [Math.PI / 2, 0, 0], segments: 6, cast: false });
    }
  }

  /* Weathered plaster / rust streaks. */
  grimePlane(2.4, 2.4, -6.1, 1.75, front + 0.022, 0, 0.44);
  grimePlane(1.6, 2.1, 6.6, 1.55, front + 0.022, 0, 0.4);
  grimePlane(1.8, 1.4, -4.8, 3.55, front + 0.024, 0, 0.26);
  grimePlane(1.4, 1.2, 5.8, 3.5, front + 0.024, 0, 0.26);
  grimePlane(1.1, 1.5, -2.4, 6.24, front + 0.024, 0, 0.2);
  grimePlane(1.5, 1.1, 2.5, 3.78, front + 0.024, 0, 0.2);

  /* ------------------------------------------------------------------------
     Roof: tile courses, ridge caps, more roof equipment.
     ------------------------------------------------------------------------ */

  const tileGeometry = new THREE.BoxGeometry(0.34, 0.055, 0.37);
  const tileRows = 22;
  const tileCols = 21;
  const tiles = new THREE.InstancedMesh(tileGeometry, MAT.roofTile, tileRows * tileCols);
  const dummy = new THREE.Object3D();
  let tileIndex = 0;
  for (let row = 0; row < tileRows; row += 1) {
    for (let col = 0; col < tileCols; col += 1) {
      const x = -7.0 + col * 0.7;
      const z = -6.55 + row * 0.34;
      dummy.position.set(x, roof + 0.09 + (row % 3) * 0.003, z);
      dummy.rotation.set(0, ((row + col) % 3 - 1) * 0.01, 0);
      dummy.updateMatrix();
      tiles.setMatrixAt(tileIndex, dummy.matrix);
      tileIndex += 1;
    }
  }
  tiles.instanceMatrix.needsUpdate = true;
  tiles.castShadow = false;
  tiles.receiveShadow = true;
  group.add(tiles);

  /* Ridge caps on the visible front edge */
  for (let x = -7.2; x <= 7.2; x += 0.64) {
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.38, 10), MAT.roofTile);
    ridge.rotation.z = Math.PI / 2;
    ridge.position.set(x, roof + 0.16, z1 - 0.1);
    ridge.castShadow = true;
    group.add(ridge);
  }
  addBox(group, MAT.brickDark, width + 0.9, 0.12, 0.22, 0, roof + 0.11, z1 - 0.34, { cast: true });

  /* More roof clutter: vent pipes, aerial, water tank stand. */
  for (const [vx, vz] of [[-5.5, -1.2], [-3.1, -3.9], [5.2, -2.2]]) {
    addCylinder(group, MAT.metalDark, 0.08, 0.08, 0.7, vx, roof + 0.45, vz, { segments: 8, cast: true });
    addCylinder(group, MAT.ventMetal, 0.22, 0.26, 0.08, vx, roof + 0.82, vz, { segments: 14, cast: true });
  }
  addBox(group, MAT.metalDark, 0.06, 2.2, 0.06, 4.8, roof + 1.1, -6.4, { cast: true });
  for (let i = 0; i < 4; i += 1) {
    addBox(group, MAT.metalDark, 0.7 - i * 0.12, 0.025, 0.025, 4.8, roof + 1.4 + i * 0.28, -6.4, { cast: false });
  }
  addBox(group, MAT.grille, 1.0, 0.14, 1.0, -6.1, roof + 0.08, -4.2, { cast: false });

  /* ------------------------------------------------------------------------
     Street surface: curb stones, joints, drains, patches, background city.
     ------------------------------------------------------------------------ */

  const curbGeometry = new RoundedBoxGeometry(0.9, 0.16, 0.25, 2, 0.02);
  const curbCount = 88;
  for (const [z, mat] of [[ROAD.near, MAT.trimStone], [ROAD.far, MAT.trimStone]]) {
    const curbs = new THREE.InstancedMesh(curbGeometry, mat, curbCount);
    for (let i = 0; i < curbCount; i += 1) {
      dummy.position.set(-43.5 + i * 1.0, 0.075, z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      curbs.setMatrixAt(i, dummy.matrix);
    }
    curbs.instanceMatrix.needsUpdate = true;
    curbs.receiveShadow = true;
    group.add(curbs);
  }

  for (let x = -44; x < 44; x += 2.4) {
    addBox(group, MAT.trimStone, 0.024, 0.012, 2.7, x, 0.022, 2.95, { cast: false });
    addBox(group, MAT.trimStone, 0.024, 0.012, 2.7, x, 0.022, 13.8, { cast: false });
  }
  for (const z of [1.7, 3.4]) {
    addBox(group, MAT.trimStone, 88, 0.012, 0.024, 0, 0.022, z, { cast: false });
  }

  /* Storm drains and curb inlets */
  for (const x of [-12, -6, 1, 8, 15]) {
    addBox(group, MAT.grille, 0.64, 0.035, 0.34, x, ROAD.y + 0.02, 4.32, { cast: false });
    for (let i = 0; i < 5; i += 1) {
      addBox(group, MAT.metalDark, 0.075, 0.02, 0.26, x - 0.22 + i * 0.11, ROAD.y + 0.04, 4.32, { cast: false });
    }
    addBox(group, MAT.metalDark, 0.82, 0.06, 0.12, x, ROAD.y + 0.035, 4.16, { cast: false });
  }

  /* Manhole rims and covers */
  for (const [x, z] of [[-2.8, 7.0], [5.6, 10.2], [-18, 8.1]]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 24), MAT.metalDark);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(x, ROAD.y + 0.03, z);
    group.add(rim);
    addBox(group, MAT.metalDark, 0.7, 0.012, 0.035, x, ROAD.y + 0.035, z, { cast: false });
    addBox(group, MAT.metalDark, 0.035, 0.012, 0.7, x, ROAD.y + 0.035, z, { cast: false });
  }

  /* Patches, cracks and worn tar lines. */
  const patchMaterial = new THREE.MeshStandardMaterial({ color: 0x2d302f, roughness: 0.72, metalness: 0.05 });
  for (const [x, z, w, d] of [[-15, 6.2, 2.1, 0.7], [1.5, 9.8, 1.2, 1.7], [11, 6.9, 1.8, 0.6], [-4, 11.2, 0.9, 0.9]]) {
    addBox(group, patchMaterial, w, 0.008, d, x, ROAD.y + 0.011, z, { cast: false });
  }
  const crackMaterial = new THREE.MeshBasicMaterial({ color: 0x141615, toneMapped: true });
  for (let i = 0; i < 18; i += 1) {
    const x = -30 + Math.random() * 60;
    const z = 5.2 + Math.random() * 6.6;
    const length = 0.4 + Math.random() * 1.8;
    addBox(group, crackMaterial, length, 0.003, 0.012, x, ROAD.y + 0.014, z, {
      rotation: [0, Math.random() * Math.PI, 0], cast: false
    });
  }

  /* Worn tar patch strips along the curb gutter */
  for (let x = -36; x < 36; x += 7.5) {
    addBox(group, MAT.asphalt, 2.8, 0.003, 0.06, x, ROAD.y + 0.013, 4.8, { cast: false });
  }

  /* ------------------------------------------------------------------------
     Vending machine, bins, bus shelter additions
     ------------------------------------------------------------------------ */

  const vending = new THREE.Group();
  vending.position.set(-11.1, 0.02, 2.55);
  vending.rotation.y = -0.12;
  group.add(vending);
  addBox(vending, MAT.metalDark, 1.1, 1.95, 0.82, 0, 0.98, 0, { cast: true });
  addBox(vending, MAT.grille, 1.14, 0.08, 0.86, 0, 1.99, 0, { cast: true });
  const machineFace = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.5, 1.8), toneMapped: true });
  addPanel(vending, machineFace, 0.9, 1.25, 0, 1.15, 0.42);
  const machineRows = [MAT.teaRed, MAT.teaGreen, MAT.teaPeach, MAT.coffee, MAT.milk, MAT.fabricRust];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      addBox(vending, machineRows[(row + col) % machineRows.length], 0.075, 0.16, 0.04, -0.31 + col * 0.12, 1.55 - row * 0.24, 0.45, { cast: false });
    }
    addBox(vending, MAT.grille, 0.82, 0.025, 0.06, 0, 1.45 - row * 0.24, 0.48, { cast: false });
  }
  addBox(vending, MAT.brass, 0.12, 0.3, 0.05, 0.39, 0.72, 0.46, { cast: false });
  addBox(vending, MAT.grille, 0.48, 0.12, 0.08, 0, 0.45, 0.44, { cast: false });
  const vendingLabel = createSignMaterial({
    width: 400, height: 160, title: '冷饮', subtitle: 'COLD DRINKS', background: '#111923',
    foreground: '#d8ecf2', accent: '#7ccfe0', brightness: 1.2
  });
  MAT.textures.push(vendingLabel.texture);
  addPanel(vending, vendingLabel.material, 0.72, 0.28, 0, 2.12, 0.42);
  const vendingGlow = new THREE.PointLight(0x9edbff, 0.8, 4, 2);
  vendingGlow.position.set(-11.1, 1.3, 3.1);
  group.add(vendingGlow);

  /* Bins and a stack of crates */
  for (const [bx, bz, mat] of [[-7.1, 2.7, MAT.grille], [7.2, 2.75, MAT.metalDark]]) {
    addCylinder(group, mat, 0.25, 0.22, 0.72, bx, 0.38, bz, { segments: 14, cast: true });
    addCylinder(group, MAT.metalDark, 0.26, 0.26, 0.055, bx, 0.78, bz, { segments: 14, cast: true });
    for (let i = 0; i < 7; i += 1) {
      addBox(group, MAT.metalDark, 0.33, 0.012, 0.02, bx, 0.3 + i * 0.065, bz - 0.23, { cast: false });
    }
  }
  addBox(group, MAT.oakDark, 0.62, 0.35, 0.44, 7.7, 0.18, 2.3, { cast: true });
  addBox(group, MAT.fabricSage, 0.45, 0.03, 0.3, 7.7, 0.37, 2.3, { cast: false });

  /* Bus shelter canopy and glass side panel */
  addBox(group, MAT.metalDark, 3.0, 0.08, 1.4, 15.8, 2.75, 3.0, { cast: true });
  addBox(group, MAT.windowGlass, 2.7, 1.55, 0.04, 15.8, 1.9, 3.57, { cast: false });
  addBox(group, MAT.windowGlass, 0.04, 1.55, 1.15, 14.55, 1.9, 3.0, { cast: false });
  for (let i = 0; i < 5; i += 1) {
    addBox(group, MAT.trimWood, 2.4, 0.035, 0.08, 15.8, 0.52, 2.88 + i * 0.06, { cast: false });
  }
  const timetable = createSignMaterial({
    width: 300, height: 420, title: '7 路', subtitle: '湖畔 · 末班 23:10', background: '#18222a',
    foreground: '#dbe8ea', accent: '#85b7c4', brightness: 1.1
  });
  MAT.textures.push(timetable.texture);
  addPanel(group, timetable.material, 0.42, 0.6, 14.58, 1.9, 3.0, Math.PI / 2);
  addBox(group, MAT.neonWarmWhite, 2.4, 0.035, 0.035, 15.8, 2.68, 2.45, { cast: false });

  /* Utility pole crossarms, insulators, transformer and cable drops. */
  for (const [px, pz] of [[-14.2, 3.75], [8.8, 3.75]]) {
    addBox(group, MAT.metalDark, 2.5, 0.09, 0.12, px, 6.52, pz, { cast: true });
    addBox(group, MAT.metalDark, 1.9, 0.08, 0.1, px, 5.95, pz, { cast: true });
    for (const dx of [-1.02, -0.5, 0.5, 1.02]) {
      addCylinder(group, MAT.ceramic, 0.045, 0.055, 0.18, px + dx, 6.64, pz, { segments: 8, cast: false });
      addCylinder(group, MAT.metalDark, 0.02, 0.02, 0.08, px + dx, 6.78, pz, { segments: 6, cast: false });
    }
    for (const dx of [-0.7, 0.7]) {
      addCylinder(group, MAT.ceramic, 0.04, 0.05, 0.15, px + dx, 6.03, pz, { segments: 8, cast: false });
    }
    addCylinder(group, MAT.ventMetal, 0.24, 0.28, 0.62, px + 0.34, 5.1, pz + 0.12, { segments: 14, cast: true });
    addBox(group, MAT.metalDark, 0.42, 0.72, 0.3, px, 4.45, pz + 0.18, { cast: true });
    addBox(group, MAT.grille, 0.3, 0.42, 0.02, px, 4.45, pz + 0.34, { cast: false });
    addCylinder(group, MAT.metalDark, 0.018, 0.018, 2.1, px + 0.1, 5.7, pz + 0.2, { segments: 6, cast: false });
    addCylinder(group, MAT.metalDark, 0.018, 0.018, 1.4, px - 0.1, 6.0, pz + 0.24, { segments: 6, cast: false });
  }
  addWire(group, MAT.metalDark, [
    new THREE.Vector3(8.8, 6.35, 3.75), new THREE.Vector3(8.4, 5.9, 3.0),
    new THREE.Vector3(8.2, 4.0, 2.2), new THREE.Vector3(8.1, 2.5, 1.75)
  ], 0.008);
  addWire(group, MAT.metalDark, [
    new THREE.Vector3(-14.2, 6.2, 3.75), new THREE.Vector3(-13.8, 5.2, 3.2),
    new THREE.Vector3(-13.6, 3.8, 2.3), new THREE.Vector3(-13.6, 2.7, 1.8)
  ], 0.008);
  addWire(group, MAT.metalDark, [
    new THREE.Vector3(-48, 5.7, 4.1), new THREE.Vector3(-14.2, 5.9, 3.75),
    new THREE.Vector3(8.8, 5.9, 3.75), new THREE.Vector3(48, 5.7, 4.1)
  ], 0.01);

  /* Streetlight base plates and small hanging banners. */
  for (const [sx, sz] of [[-12.8, 3.9], [11.2, 3.9]]) {
    addCylinder(group, MAT.metalDark, 0.22, 0.26, 0.08, sx, 0.06, sz, { segments: 16, cast: true });
    addBox(group, MAT.trimWood, 0.03, 0.95, 0.44, sx + 0.25, 3.55, sz, { cast: true });
    addBox(group, MAT.fabricRust, 0.02, 0.78, 0.34, sx + 0.27, 3.58, sz, { cast: false });
  }

  /* ------------------------------------------------------------------------
     Distant city silhouettes with scattered lit windows
     ------------------------------------------------------------------------ */

  const background = new THREE.Group();
  background.position.set(0, 0, -25);
  group.add(background);
  const blockMaterial = new THREE.MeshStandardMaterial({ color: 0x0b0b14, roughness: 0.98, metalness: 0 });
  const windowMaterials = [
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.22, 0.18, 0.13), toneMapped: true }),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.18, 0.12, 0.08), toneMapped: true }),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.06, 0.09, 0.15), toneMapped: true })
  ];
  const blockSpecs = [
    [-28, 3.2, 10], [-15, 2.5, 8], [-1, 3.6, 9], [14, 2.8, 8], [28, 3.0, 9]
  ];
  for (const [bx, height, bw] of blockSpecs) {
    addBox(background, blockMaterial, bw, height, 6, bx, height / 2, 0, { cast: false });
    for (let row = 0; row < Math.floor(height / 1.4); row += 1) {
      for (let col = 0; col < Math.floor(bw / 1.2); col += 1) {
        if (Math.random() > 0.8) {
          const mat = windowMaterials[(row + col) % windowMaterials.length];
          addBox(background, mat, 0.34, 0.44, 0.03, bx - bw / 2 + 0.7 + col * 1.2, 1.1 + row * 1.4, 3.02, { cast: false });
        }
      }
    }
    addBox(background, MAT.grille, bw * 0.7, 0.3, 0.2, bx, height + 0.2, 2.9, { cast: false });
  }

  /* Local façade grazers reveal the new seams, shutters and trims at night. */
  for (const [lx, lz] of [[-5.8, 4.0], [5.8, 4.0]]) {
    const sconce = new THREE.PointLight(0xffbf82, 1.6, 7.5, 2);
    sconce.position.set(lx, 3.35, lz);
    group.add(sconce);
    addCylinder(group, MAT.brass, 0.08, 0.1, 0.24, lx, 3.12, 3.74, { segments: 10, cast: true });
  }
  const facadeGrazer = new THREE.SpotLight(0xffc891, 7.2, 18, 0.82, 0.72, 1.5);
  facadeGrazer.position.set(0.0, 2.9, 4.5);
  const grazerTarget = new THREE.Object3D();
  grazerTarget.position.set(0.0, 5.4, 1.4);
  group.add(grazerTarget);
  facadeGrazer.target = grazerTarget;
  group.add(facadeGrazer);

  return group;
}



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
    background: west ? '#0b1119' : '#120d16',
    foreground: west ? '#9edbe8' : '#f2a7e8',
    accent: west ? '#4c9db0' : '#c76ebe',
    brightness: west ? 1.25 : 1.45
  });
  MAT.textures.push(shop.texture);
  addBox(group, MAT.oakDark, 4.4, 1.0, 0.1, x, 3.55, frontZ + 0.1, { cast: true });
  addPanel(group, shop.material, 4.15, 0.86, x, 3.55, frontZ + 0.17);

  /* A thin neon line under each neighbouring shop sign. */
  if (west) {
    addBox(group, MAT.neonViolet, 3.4, 0.035, 0.04, x, 3.02, frontZ + 0.18, { cast: false });
    addBox(group, MAT.neonViolet, 0.05, 1.2, 0.04, x - 2.1, 2.2, frontZ + 0.18, { cast: false });
  } else {
    addBox(group, MAT.neonPink, 2.8, 0.035, 0.04, x, 3.02, frontZ + 0.18, { cast: false });
    addBox(group, MAT.neonGreen, 0.045, 1.1, 0.04, x + 1.6, 2.2, frontZ + 0.18, { cast: false });
  }

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
      coat: true,
      hat: spec.style === 'soft' || (spec.style === 'short' && spec.hair === 'hairGrey'),
      scarf: true,
      bag: spec.style === 'long',
      top: spec.top,
      bottom: spec.bottom,
      hair: spec.hair,
      hairStyle: spec.style,
      umbrella: spec.umbrella,
      skin: spec.hair === 'hairGrey' ? 'skinWarm' : 'skinLight'
    });
    person.position.set(spec.x, 0, spec.z);
    person.rotation.y = spec.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    const personShadow = new THREE.Mesh(new THREE.CircleGeometry(0.34, 14), MAT.contactShadow);
    personShadow.rotation.x = -Math.PI / 2;
    personShadow.position.y = 0.012;
    person.add(personShadow);
    group.add(person);
    walkers.push({ person, ...spec, min: -26, max: 26 });
  }

  /* A person waiting at the bus stop, holding a newspaper. */
  const waiter = createPerson(MAT, {
    top: 'shirtCream',
    bottom: 'fabricWarm' in MAT ? 'fabricWarm' : 'denim',
    scarf: true,
    hat: true,
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
  group.add(createDetailDressing(MAT));
  const nightDressing = createNightDressing(MAT);
  group.add(nightDressing.group);

  /* Warm under-awning light, and a soft spill through the door. */
  const awningLight = new THREE.PointLight(0xffb877, 0.9, 12, 2);
  awningLight.position.set(0, 2.75, 2.8);
  group.add(awningLight);
  const doorLight = new THREE.PointLight(0xffc18a, 0.7, 8, 2);
  doorLight.position.set(2.16, 1.6, 2.2);
  group.add(doorLight);
  const spillWest = new THREE.PointLight(0xffb26f, 0, 15, 2);
  spillWest.position.set(-3.4, 1.6, 3.3);
  group.add(spillWest);
  const spillEast = new THREE.PointLight(0xffb26f, 0, 15, 2);
  spillEast.position.set(4.2, 1.6, 3.3);
  group.add(spillEast);
  const facadeWash = new THREE.PointLight(0xffb274, 0, 18, 2);
  facadeWash.position.set(0.8, 5.6, 5.8);
  group.add(facadeWash);

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
    const lightSprites = [];
    car.traverse((object) => {
      if (object.isSprite) {
        object.userData.baseOpacity = object.material.opacity;
        lightSprites.push(object);
      }
    });
    vehicles.push({ object: car, sprites: lightSprites, ...spec });
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
      { light: awningLight, day: 0.85, rain: 7 },
      { light: doorLight, day: 0.55, rain: 4.5 },
      { light: spillWest, day: 0, rain: 7 },
      { light: spillEast, day: 0, rain: 7 },
      { light: facadeWash, day: 0, rain: 10 },
      ...street.streetLights.map((entry) => ({ light: entry.light, day: entry.day, rain: entry.rain }))
    ],
    storefrontGlow: building.storefrontGlow,
    glowSprites: nightDressing.glowSprites,
    lightPools: nightDressing.lightPools,
    reflections: nightDressing.reflections,
    setHeroPose() {
      const poses = [-8, 15, 9, -24, -18];
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
        if (vehicle.sprites) {
          for (const sprite of vehicle.sprites) {
            sprite.material.opacity = sprite.userData.baseOpacity * THREE.MathUtils.lerp(0.1, 1.0, rainAmount);
          }
        }
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

      if (this.storefrontGlow) this.storefrontGlow.opacity = THREE.MathUtils.lerp(0.14, 0.98, rainAmount);
      if (MAT.storefrontWash) MAT.storefrontWash.opacity = rainAmount * 0.09;

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

















