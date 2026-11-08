import * as THREE from 'three';
import { DRINKS, drinkById } from '../state.js';
import { createPerson } from './people.js';

const FLOOR = 0.18;
const CEILING = 3.38;

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
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, options.segments || 16), material);
  mesh.position.set(x, y, z);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
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

function makeTextTexture(text, { width = 512, height = 256, background = '#2f2b25', color = '#f1e4d2', sub = '', accent = '#d7ad84', font = '600 90px "Songti SC","STSong","Microsoft YaHei",serif' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(241,228,210,0.22)';
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, width - 24, height - 24);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(text, width / 2, height * 0.43);
  if (sub) {
    ctx.font = '500 24px Georgia, serif';
    ctx.fillStyle = accent;
    ctx.fillText(sub, width / 2, height * 0.74);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createScreenTexture() {
  const width = 512;
  const height = 384;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#dce9d8';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#2f4634';
  ctx.fillRect(0, 0, width, 70);
  ctx.fillStyle = '#f1e4d2';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '600 34px "Songti SC","Microsoft YaHei",serif';
  ctx.fillText('檐下 · 点单', 28, 36);
  ctx.font = '500 18px Georgia, serif';
  ctx.fillStyle = 'rgba(241,228,210,0.72)';
  ctx.fillText('EAVES ORDER', 330, 38);
  const items = ['美式咖啡  ¥22', '燕麦拿铁  ¥28', '桂花冷萃  ¥30', '蜜桃乌龙  ¥26', '青提茉莉  ¥26', '血橙气泡  ¥24'];
  ctx.font = '500 28px "Songti SC","Microsoft YaHei",sans-serif';
  items.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    ctx.fillStyle = '#3b4a3b';
    ctx.fillText(item, 32 + col * 242, 130 + row * 76);
  });
  ctx.fillStyle = '#b4683f';
  ctx.fillRect(32, 340, 160, 6);
  ctx.fillStyle = '#3b4a3b';
  ctx.font = '500 18px Georgia, serif';
  ctx.fillText('请选择饮品 · 现点现做', 210, 344);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCup(MAT, color = MAT.coffee, size = 1) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * size, 0.035 * size, 0.12 * size, 16, 1, true), MAT.paper);
  body.position.y = 0.06 * size;
  body.castShadow = true;
  group.add(body);
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * size, 0.033 * size, 0.105 * size, 16), color);
  liquid.position.y = 0.06 * size;
  group.add(liquid);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.048 * size, 0.048 * size, 0.008 * size, 16), MAT.metalDark);
  lid.position.y = 0.123 * size;
  group.add(lid);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.044 * size, 0.04 * size, 0.04 * size, 16, 1, true), MAT.oak);
  sleeve.position.y = 0.055 * size;
  sleeve.castShadow = true;
  group.add(sleeve);
  return group;
}

/* --------------------------------------------------------------------------
   Room shell and bar
   -------------------------------------------------------------------------- */

function createRoom(MAT) {
  const group = new THREE.Group();

  const floor = addBox(group, MAT.terrazzo, 14.6, 0.08, 8.7, 0, FLOOR - 0.04, -2.85, { cast: false });
  floor.receiveShadow = true;

  addBox(group, MAT.plasterWarm, 14.7, CEILING - FLOOR, 0.16, 0, (CEILING + FLOOR) / 2, -7.0, { cast: false });
  addBox(group, MAT.plaster, 0.16, CEILING - FLOOR, 8.7, -7.28, (CEILING + FLOOR) / 2, -2.85, { cast: false });
  addBox(group, MAT.plaster, 0.16, CEILING - FLOOR, 8.7, 7.28, (CEILING + FLOOR) / 2, -2.85, { cast: false });
  addBox(group, MAT.plasterPale, 14.7, 0.14, 8.7, 0, CEILING + 0.02, -2.85, { cast: false });

  /* Exposed oak beams and warm white ceiling */
  for (const z of [-6.2, -3.8, -1.3, 1.1]) {
    addBox(group, MAT.oakDark, 14.5, 0.16, 0.18, 0, CEILING - 0.09, z, { cast: true, receive: true });
  }
  for (const x of [-6.2, -2.2, 2.0, 6.1]) {
    for (let i = 0; i < 3; i += 1) {
      const spot = addCylinder(group, MAT.metalDark, 0.06, 0.075, 0.14, x, CEILING - 0.22, -6 - i * 2.2, { segments: 10, cast: false });
      spot.rotation.z = 0.15;
    }
  }

  /* Warm wall lining and a slim dado */
  addBox(group, MAT.oak, 14.4, 0.12, 0.05, 0, 0.48, 1.43, { cast: false });
  addBox(group, MAT.oak, 0.05, 0.12, 8.4, -7.19, 0.48, -2.85, { cast: false });
  addBox(group, MAT.oak, 0.05, 0.12, 8.4, 7.19, 0.48, -2.85, { cast: false });

  /* Menu board on the back wall */
  const menuTexture = makeTextTexture('', { width: 1024, height: 640, background: '#2f2b25', font: '500 20px serif' });
  const menuCanvas = menuTexture.image;
  const ctx = menuCanvas.getContext('2d');
  ctx.fillStyle = '#2f2b25';
  ctx.fillRect(0, 0, 1024, 640);
  ctx.strokeStyle = 'rgba(241,228,210,0.2)';
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, 988, 604);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f1e4d2';
  ctx.font = '600 70px "Songti SC","STSong","Microsoft YaHei",serif';
  ctx.fillText('檐下咖啡', 512, 100);
  ctx.fillStyle = 'rgba(241,228,210,0.55)';
  ctx.font = '400 24px Georgia, serif';
  ctx.fillText('EAVES COFFEE · HANGZHOU', 512, 160);
  ctx.strokeStyle = 'rgba(215,173,132,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(300, 196);
  ctx.lineTo(724, 196);
  ctx.stroke();

  const rows = [
    ['美式咖啡', 'AMERICANO', '22'], ['燕麦拿铁', 'OAT LATTE', '28'],
    ['桂花乌龙冷萃', 'OSMANTHUS COLD BREW', '30'], ['海盐焦糖拿铁', 'SEA SALT CARAMEL', '32'],
    ['蜜桃乌龙', 'PEACH OOLONG', '26'], ['青提茉莉', 'JASMINE GRAPE', '26']
  ];
  rows.forEach(([name, en, price], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 100 + col * 470;
    const y = 270 + row * 104;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f1e4d2';
    ctx.font = '500 34px "Songti SC","Microsoft YaHei",serif';
    ctx.fillText(name, x, y);
    ctx.fillStyle = 'rgba(241,228,210,0.45)';
    ctx.font = '400 14px Georgia, serif';
    ctx.fillText(en, x, y + 28);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#d7ad84';
    ctx.font = '400 24px Georgia, serif';
    ctx.fillText('¥ ' + price, x + 380, y + 6);
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(241,228,210,0.42)';
  ctx.font = '400 17px "Songti SC", serif';
  ctx.fillText('今日手冲 · 云南保山 / 请询问咖啡师', 512, 600);
  menuTexture.needsUpdate = true;
  const menuMaterial = new THREE.MeshBasicMaterial({ map: menuTexture, toneMapped: true });
  MAT.textures.push(menuTexture);
  addBox(group, MAT.oakDark, 4.2, 2.6, 0.1, -2.1, 2.18, -6.98, { cast: true });
  addPanel(group, menuMaterial, 3.9, 2.35, -2.1, 2.18, -6.9);

  /* Small framed poem / picture on the west wall */
  const artTexture = makeTextTexture('檐下', {
    width: 360, height: 460, background: '#e4d3ba', color: '#4d3828',
    sub: '雨落在檐口，光落在桌上。', accent: '#9b6a47', font: '600 116px "Songti SC","STSong",serif'
  });
  MAT.textures.push(artTexture);
  addBox(group, MAT.oakDark, 0.1, 1.0, 0.78, -7.17, 2.0, -0.9, { cast: true });
  addPanel(group, new THREE.MeshBasicMaterial({ map: artTexture, toneMapped: true }), 0.66, 0.88, -7.11, 2.0, -0.9, Math.PI / 2);

  /* Window bar along the left storefront — visible from the street */
  addBox(group, MAT.oakDark, 4.4, 0.1, 0.42, -4.2, FLOOR + 1.02, 0.78, { cast: true, receive: true });
  addBox(group, MAT.oak, 4.4, 0.08, 0.36, -4.2, FLOOR + 0.24, 0.78, { cast: true });
  for (const x of [-6.2, -2.2]) {
    addBox(group, MAT.metalDark, 0.05, 1.0, 0.36, x, FLOOR + 0.52, 0.78, { cast: true });
  }
  addCylinder(group, MAT.brass, 0.018, 0.018, 4.2, -4.2, FLOOR + 0.26, 0.96, { rotation: [0, 0, Math.PI / 2], segments: 8, cast: true });
  for (const x of [-5.6, -4.2, -2.8]) {
    group.add(createStool(MAT, x, 0.25));
    addCylinder(group, MAT.metalDark, 0.012, 0.012, 1.42, x, CEILING - 0.72, 0.55, { segments: 6, cast: false });
    addCylinder(group, MAT.brass, 0.11, 0.16, 0.2, x, CEILING - 1.47, 0.55, { segments: 16, cast: true });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), MAT.lampGlow);
    bulb.position.set(x, CEILING - 1.58, 0.55);
    group.add(bulb);
  }
  addCylinder(group, MAT.paper, 0.04, 0.035, 0.11, -4.9, FLOOR + 1.12, 0.8, { segments: 12, cast: true });

  return group;
}

function createBar(MAT) {
  const group = new THREE.Group();

  /* Front counter: stone top over a slatted oak body. */
  addBox(group, MAT.oakDark, 7.8, 0.94, 0.88, -2.0, 0.65, -4.7, { cast: true });
  for (let i = 0; i < 26; i += 1) {
    const x = -5.8 + i * 0.3;
    addBox(group, MAT.oak, 0.14, 0.8, 0.06, x, 0.62, -4.24, { cast: true });
  }
  addBox(group, MAT.stone, 8.1, 0.1, 1.02, -2.0, 1.16, -4.7, { cast: true, receive: true });
  addBox(group, MAT.stone, 8.1, 0.08, 0.22, -2.0, 1.0, -4.1, { cast: true });
  addBox(group, MAT.brass, 7.8, 0.035, 0.06, -2.0, 0.32, -4.22, { cast: false });
  for (const x of [-5.7, -0.1]) {
    addBox(group, MAT.oakDark, 0.16, 0.94, 0.9, x, 0.65, -4.7, { cast: true });
  }

  /* Back counter and shelving. */
  addBox(group, MAT.oakDark, 8.4, 0.9, 0.82, -2.2, 0.63, -6.55, { cast: true });
  addBox(group, MAT.stone, 8.6, 0.1, 0.94, -2.2, 1.13, -6.55, { cast: true });
  for (const y of [1.62, 2.15, 2.66]) {
    addBox(group, MAT.oak, 8.3, 0.07, 0.34, -2.2, y, -6.86, { cast: true });
    addBox(group, MAT.oakDark, 0.06, 0.36, 0.34, -6.32, y, -6.86, { cast: true });
    addBox(group, MAT.oakDark, 0.06, 0.36, 0.34, 1.92, y, -6.86, { cast: true });
    addBox(group, MAT.oakDark, 0.06, 0.36, 0.34, -2.2, y, -6.86, { cast: true });
  }

  /* Bottles, jars and cups on the shelves. */
  const bottleColors = [MAT.coffee, MAT.teaGreen, MAT.teaPeach, MAT.teaRed, MAT.milk, MAT.brass];
  for (let i = 0; i < 16; i += 1) {
    const x = -5.9 + (i % 8) * 0.72;
    const y = i < 8 ? 1.71 : 2.24;
    const color = bottleColors[i % bottleColors.length];
    addCylinder(group, color, 0.055, 0.07, 0.2 + (i % 3) * 0.05, x, y + 0.11, -6.86, { segments: 10, cast: true });
    addCylinder(group, MAT.oakDark, 0.028, 0.03, 0.07, x, y + 0.25 + (i % 3) * 0.02, -6.86, { segments: 8, cast: true });
  }
  for (let i = 0; i < 8; i += 1) {
    const cup = createCup(MAT, i % 2 ? MAT.milk : MAT.coffee, 0.85);
    cup.position.set(-1.9 + i * 0.16, 2.27, -6.85);
    group.add(cup);
  }

  /* Espresso machine */
  const machine = new THREE.Group();
  machine.position.set(-3.85, 1.18, -6.45);
  group.add(machine);
  addBox(machine, MAT.chrome, 1.75, 0.48, 0.78, 0, 0.24, 0, { cast: true });
  addBox(machine, MAT.metalDark, 1.62, 0.15, 0.66, 0, 0.53, 0, { cast: true });
  addBox(machine, MAT.metalDark, 1.2, 0.1, 0.5, 0, 0.03, 0.12, { cast: true });
  for (const x of [-0.42, 0.42]) {
    addCylinder(machine, MAT.metalDark, 0.09, 0.09, 0.18, x, 0.13, 0.21, { segments: 12, cast: true });
    addCylinder(machine, MAT.oakDark, 0.028, 0.035, 0.3, x, 0.36, 0.22, { rotation: [0.2, 0, 0], segments: 8, cast: true });
    addCylinder(machine, MAT.chrome, 0.07, 0.07, 0.06, x, 0.0, 0.3, { rotation: [Math.PI / 2, 0, 0], segments: 12, cast: true });
  }
  addCylinder(machine, MAT.chrome, 0.035, 0.045, 0.62, -0.72, 0.27, 0.14, { rotation: [0, 0, -0.4], segments: 10, cast: true });
  addBox(machine, MAT.brass, 0.3, 0.06, 0.26, 0.65, 0.56, -0.16, { cast: true });
  addCylinder(machine, MAT.brass, 0.04, 0.04, 0.12, 0.65, 0.61, -0.16, { segments: 10, cast: true });

  /* Grinder */
  const grinder = new THREE.Group();
  grinder.position.set(-5.05, 1.18, -6.5);
  group.add(grinder);
  addBox(grinder, MAT.metalDark, 0.38, 0.62, 0.38, 0, 0.31, 0, { cast: true });
  addCylinder(grinder, MAT.glassDark, 0.16, 0.13, 0.34, 0, 0.78, 0, { segments: 16, cast: true });
  addCylinder(grinder, MAT.coffee, 0.13, 0.13, 0.18, 0, 0.68, 0, { segments: 16, cast: false });
  addBox(grinder, MAT.brass, 0.19, 0.05, 0.05, 0.24, 0.32, 0, { cast: true });

  /* Kettle and scale */
  addCylinder(group, MAT.metalDark, 0.17, 0.2, 0.28, 0.7, 1.32, -6.55, { segments: 14, cast: true });
  addCylinder(group, MAT.brass, 0.03, 0.03, 0.28, 0.56, 1.42, -6.55, { rotation: [0, 0, -0.9], segments: 8, cast: true });
  addBox(group, MAT.metalDark, 0.38, 0.035, 0.3, 1.2, 1.21, -6.5, { cast: true });
  addBox(group, MAT.metalDark, 0.46, 0.02, 0.08, -6.1, 1.2, -6.6, { cast: true });

  /* Raised bar shelf with syrup bottles */
  for (let i = 0; i < 5; i += 1) {
    addCylinder(group, i % 2 ? MAT.teaPeach : MAT.teaGreen, 0.045, 0.045, 0.22, 1.15 + i * 0.14, 1.32, -6.8, { segments: 8, cast: true });
  }

  /* Pendant lamps over the counter */
  const pendants = [];
  for (const x of [-5.0, -2.1, 0.7]) {
    addCylinder(group, MAT.metalDark, 0.012, 0.012, 0.72, x, 2.98, -5.4, { segments: 6, cast: false });
    addCylinder(group, MAT.brass, 0.17, 0.24, 0.24, x, 2.56, -5.4, { segments: 18, cast: true });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), MAT.lampGlow);
    bulb.position.set(x, 2.44, -5.4);
    group.add(bulb);
    const light = new THREE.PointLight(0xffb26f, 0, 7, 2);
    light.position.set(x, 2.3, -5.4);
    group.add(light);
    pendants.push(light);
  }

  return { group, machine, pendants };
}

/* --------------------------------------------------------------------------
   Ordering computer + pick-up cup + display cabinet
   -------------------------------------------------------------------------- */

function createComputer(MAT) {
  const group = new THREE.Group();
  group.position.set(0.92, 1.21, -4.45);
  group.rotation.y = -0.32;

  addCylinder(group, MAT.chrome, 0.11, 0.13, 0.035, 0, 0.02, 0, { segments: 18, cast: true });
  addBox(group, MAT.metalDark, 0.06, 0.22, 0.06, 0, 0.14, 0, { cast: true });
  addBox(group, MAT.metalDark, 0.48, 0.34, 0.05, 0, 0.38, 0.02, { rotation: [-0.2, 0, 0], cast: true });
  const screenMat = new THREE.MeshStandardMaterial({
    map: createScreenTexture(),
    emissive: 0x8ec7ae,
    emissiveIntensity: 0.9,
    roughness: 0.35,
    metalness: 0
  });
  MAT.textures.push(screenMat.map);
  const screen = addPanel(group, screenMat, 0.43, 0.29, 0, 0.39, 0.055);
  screen.rotation.x = -0.2;
  screen.userData.interactive = 'computer';
  const body = addBox(group, MAT.metalDark, 0.5, 0.36, 0.055, 0, 0.38, 0.01, { rotation: [-0.2, 0, 0], cast: true });
  body.userData.interactive = 'computer';

  const glow = new THREE.PointLight(0x9ed4b7, 0.35, 2.2, 2);
  glow.position.set(0, 0.5, 0.28);
  group.add(glow);

  return { group, screen, glow };
}

function createCabinet(MAT) {
  const group = new THREE.Group();
  const x = 4.95;
  const z = -6.76;
  const baseY = FLOOR;
  const glowMaterial = MAT.windowGlow.clone();
  glowMaterial.opacity = 0.4;

  addBox(group, MAT.oakDark, 3.6, 0.78, 0.78, x, baseY + 0.39, z, { cast: true });
  addBox(group, MAT.stone, 3.72, 0.08, 0.9, x, baseY + 0.82, z, { cast: true });
  addBox(group, MAT.oak, 3.6, 0.08, 0.78, x, baseY + 2.28, z, { cast: true });
  for (const dx of [-1.78, 1.78]) {
    addBox(group, MAT.oakDark, 0.08, 1.5, 0.7, x + dx, baseY + 1.55, z, { cast: true });
  }
  addBox(group, MAT.oak, 3.5, 0.035, 0.7, x, baseY + 1.45, z, { cast: true });
  addBox(group, MAT.oak, 3.5, 0.035, 0.7, x, baseY + 1.92, z, { cast: true });

  /* Glass front, lit from within. */
  const glass = addPanel(group, MAT.windowGlass, 3.5, 1.38, x, baseY + 1.56, z + 0.36);
  glass.renderOrder = 2;

  const glow = new THREE.Mesh(new THREE.BoxGeometry(3.35, 1.18, 0.02), glowMaterial);
  glow.position.set(x, baseY + 1.58, z - 0.25);
  group.add(glow);

  /* Handle */
  addCylinder(group, MAT.brass, 0.014, 0.014, 0.28, x + 1.0, baseY + 1.52, z + 0.39, { rotation: [Math.PI / 2, 0, 0], cast: true });

  const drinks = [];
  const slots = [
    [-1.2, baseY + 1.06], [-0.42, baseY + 1.06], [0.38, baseY + 1.06], [1.18, baseY + 1.06],
    [-0.8, baseY + 1.56], [0.08, baseY + 1.56], [0.92, baseY + 1.56]
  ];

  DRINKS.slice(0, 7).forEach((drink, index) => {
    const item = new THREE.Group();
    const [dx, dy] = slots[index];
    item.position.set(x + dx, dy, z + 0.08);
    group.add(item);
    const cupColor = drink.category === 'tea'
      ? (drink.id === 'jasmine-grape' ? MAT.teaGreen : drink.id === 'blood-orange' ? MAT.teaRed : MAT.teaPeach)
      : MAT.coffee;
    const cup = createCup(MAT, cupColor, 1.55);
    cup.rotation.y = 0.3;
    item.add(cup);
    const straw = addCylinder(item, MAT[drink.id === 'jasmine-grape' ? 'teaGreen' : 'brass'], 0.012, 0.012, 0.35, 0.02, 0.27, 0, { segments: 8, cast: true });
    straw.rotation.z = 0.15;

    const labelTexture = makeTextTexture(drink.name, {
      width: 320, height: 120, background: '#f0e3d1', color: '#3e3025', sub: drink.en, accent: '#9c623f', font: '600 42px "Songti SC","Microsoft YaHei",serif'
    });
    MAT.textures.push(labelTexture);
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTexture, toneMapped: true });
    const label = addPanel(item, labelMat, 0.3, 0.112, 0, 0.055, 0.105);
    label.rotation.x = -0.3;

    item.userData.interactive = 'drink';
    item.userData.drinkId = drink.id;
    cup.userData.interactive = 'drink';
    cup.userData.drinkId = drink.id;
    drinks.push({ group: item, drink, cup });
  });

  /* Small cabinet plaque */
  const plaque = makeTextTexture('今日陈列', {
    width: 420, height: 140, background: '#efe1cf', color: '#4b382a', sub: 'TODAY\'S DISPLAY', accent: '#a66b48', font: '600 54px "Songti SC", serif'
  });
  MAT.textures.push(plaque);
  addPanel(group, new THREE.MeshBasicMaterial({ map: plaque, toneMapped: true }), 0.62, 0.2, x + 1.25, baseY + 2.2, z + 0.4);

  return { group, drinks, glow };
}

/* --------------------------------------------------------------------------
   Tables, chairs, shelves and dressing
   -------------------------------------------------------------------------- */

function createChair(MAT, x, z, rotationY = 0) {
  const group = new THREE.Group();
  group.position.set(x, FLOOR, z);
  group.rotation.y = rotationY;
  addBox(group, MAT.oak, 0.44, 0.055, 0.44, 0, 0.46, 0, { cast: true });
  addBox(group, MAT.fabricCream, 0.42, 0.04, 0.4, 0, 0.5, 0, { cast: false });
  addBox(group, MAT.oak, 0.44, 0.46, 0.055, 0, 0.73, -0.2, { cast: true });
  for (const dx of [-0.18, 0.18]) {
    for (const dz of [-0.18, 0.18]) {
      addBox(group, MAT.metalDark, 0.035, 0.46, 0.035, dx, 0.23, dz, { cast: true });
    }
  }
  return group;
}

function createTable(MAT, x, z) {
  const group = new THREE.Group();
  group.position.set(x, FLOOR, z);
  addCylinder(group, MAT.oak, 0.46, 0.46, 0.055, 0, 0.72, 0, { segments: 28, cast: true });
  addCylinder(group, MAT.metalDark, 0.045, 0.065, 0.67, 0, 0.38, 0, { segments: 10, cast: true });
  addCylinder(group, MAT.metalDark, 0.28, 0.32, 0.035, 0, 0.04, 0, { segments: 20, cast: true });
  return group;
}

function createStool(MAT, x, z) {
  const group = new THREE.Group();
  group.position.set(x, FLOOR, z);
  addCylinder(group, MAT.oak, 0.19, 0.19, 0.06, 0, 0.71, 0, { segments: 20, cast: true });
  addCylinder(group, MAT.metalDark, 0.03, 0.04, 0.68, 0, 0.37, 0, { segments: 8, cast: true });
  addCylinder(group, MAT.metalDark, 0.19, 0.22, 0.03, 0, 0.04, 0, { segments: 16, cast: true });
  addBox(group, MAT.brass, 0.12, 0.02, 0.12, 0, 0.42, 0, { cast: false });
  return group;
}

function createShelfAndDecor(MAT) {
  const group = new THREE.Group();

  /* Bookcase on the west wall */
  const bx = -7.05;
  addBox(group, MAT.oakDark, 0.32, 2.2, 2.5, bx, FLOOR + 1.1, -2.5, { cast: true });
  for (const y of [0.7, 1.25, 1.8, 2.3]) {
    addBox(group, MAT.oak, 0.4, 0.04, 2.42, bx, FLOOR + y, -2.5, { cast: true });
  }
  const bookColors = [MAT.fabricRust, MAT.fabricSage, MAT.fabricCream, MAT.teaPeach, MAT.paper, MAT.denim];
  for (let shelf = 0; shelf < 3; shelf += 1) {
    for (let i = 0; i < 10; i += 1) {
      const mat = bookColors[(shelf + i) % bookColors.length];
      if (!mat || !mat.isMaterial) continue;
      addBox(group, mat, 0.045 + (i % 3) * 0.012, 0.22 + (i % 4) * 0.035, 0.18, bx + 0.08, FLOOR + 0.83 + shelf * 0.55, -3.55 + i * 0.2, {
        rotation: [0, 0, i % 7 === 0 ? 0.13 : 0], cast: true
      });
    }
  }

  /* A small reading lamp and papers on the bookcase */
  addCylinder(group, MAT.brass, 0.012, 0.012, 0.5, -6.85, FLOOR + 2.55, -3.35, { segments: 6, cast: true });
  addCylinder(group, MAT.metalDark, 0.13, 0.16, 0.16, -6.85, FLOOR + 2.82, -3.35, { segments: 14, cast: true });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), MAT.lampGlow);
  lamp.position.set(-6.85, FLOOR + 2.72, -3.35);
  group.add(lamp);

  /* Hanging plants near the front windows */
  for (const x of [-6.35, 6.3]) {
    addCylinder(group, MAT.terracotta, 0.16, 0.12, 0.2, x, 2.82, 0.85, { segments: 14, cast: true });
    for (let i = 0; i < 5; i += 1) {
      const vine = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.35 + i * 0.08, 3, 5), MAT.foliage);
      vine.position.set(x + (i - 2) * 0.06, 2.62 - i * 0.1, 0.85 + Math.sin(i) * 0.04);
      vine.rotation.z = (i - 2) * 0.1;
      group.add(vine);
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 1), i % 2 ? MAT.foliageLight : MAT.foliage);
      leaf.position.set(x + (i - 2) * 0.08, 2.42 - i * 0.13, 0.87);
      leaf.scale.y = 0.8;
      group.add(leaf);
    }
  }

  /* Coat rack by the door */
  addCylinder(group, MAT.metalDark, 0.025, 0.025, 1.75, 4.85, FLOOR + 0.9, 0.85, { segments: 8, cast: true });
  addCylinder(group, MAT.metalDark, 0.24, 0.26, 0.035, 4.85, FLOOR + 0.04, 0.85, { segments: 16, cast: true });
  for (const [dx, dz] of [[0.28, 0], [-0.28, 0], [0, 0.28]]) {
    addCylinder(group, MAT.metalDark, 0.018, 0.018, 0.32, 4.85 + dx, FLOOR + 1.58, 0.85 + dz, { rotation: [0, 0, dx ? Math.sign(dx) * 0.7 : 0], segments: 6, cast: true });
  }
  addBox(group, MAT.fabricSage, 0.4, 0.55, 0.08, 4.68, FLOOR + 1.38, 0.83, { cast: true });
  addBox(group, MAT.fabricRust, 0.32, 0.42, 0.08, 5.0, FLOOR + 1.3, 0.85, { cast: true });

  /* Window sill plants and newspapers */
  addBox(group, MAT.terracotta, 0.28, 0.22, 0.24, -6.45, FLOOR + 3.0, 1.25, { cast: true });
  for (let i = 0; i < 3; i += 1) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), i % 2 ? MAT.foliage : MAT.foliageLight);
    leaf.position.set(-6.45 + (i - 1) * 0.15, FLOOR + 3.16, 1.23);
    leaf.scale.y = 0.8;
    group.add(leaf);
  }
  addBox(group, MAT.paper, 0.34, 0.025, 0.42, -5.8, FLOOR + 0.78, -1.0, { rotation: [0, 0.2, 0], cast: false });
  addBox(group, MAT.paper, 0.28, 0.02, 0.36, -5.45, FLOOR + 0.8, -1.08, { rotation: [0, -0.3, 0], cast: false });

  return group;
}

/* --------------------------------------------------------------------------
   Order animation: barista, machine, cup
   -------------------------------------------------------------------------- */

function createOrderCup(MAT) {
  const group = new THREE.Group();
  group.visible = false;
  const cup = createCup(MAT, MAT.coffee, 1.35);
  group.add(cup);
  const steam = [];
  for (let i = 0; i < 3; i += 1) {
    const sprite = new THREE.Sprite(MAT.steam.clone());
    sprite.scale.set(0.26, 0.5, 1);
    sprite.position.set((i - 1) * 0.08, 0.28 + i * 0.03, 0);
    group.add(sprite);
    steam.push(sprite);
  }
  return { group, cup, steam };
}

/* --------------------------------------------------------------------------
   Interior micro-detail: ceiling slats, wall panelling, bar clutter, frames,
   table settings and soft rim lights behind the regulars.
   -------------------------------------------------------------------------- */

function createInteriorDetail(MAT) {
  const group = new THREE.Group();
  const lights = [];

  /* Ceiling slats over the room */
  for (let x = -6.85; x <= 6.85; x += 0.44) {
    addBox(group, MAT.oakDark, 0.045, 0.045, 7.7, x, CEILING - 0.055, -2.95, { cast: false });
  }
  addBox(group, MAT.oak, 0.1, 0.08, 7.7, -6.45, CEILING - 0.11, -2.95, { cast: true });
  addBox(group, MAT.oak, 0.1, 0.08, 7.7, 6.45, CEILING - 0.11, -2.95, { cast: true });

  /* Board-and-batten panelling on the back wall behind the bar */
  for (let x = -6.9; x <= 2.65; x += 0.32) {
    addBox(group, MAT.oakDark, 0.055, 2.55, 0.035, x, FLOOR + 1.48, -7.04, { cast: false });
  }
  addBox(group, MAT.oak, 6.5, 0.06, 0.06, -2.1, FLOOR + 2.72, -7.02, { cast: false });
  addBox(group, MAT.oak, 6.5, 0.06, 0.06, -2.1, FLOOR + 0.3, -7.02, { cast: false });

  /* Wainscot and chair rail on the right wall */
  for (let z = -6.6; z <= -0.2; z += 0.78) {
    addBox(group, MAT.oak, 0.05, 0.9, 0.04, 7.24, FLOOR + 0.58, z, { cast: false });
    addBox(group, MAT.oakDark, 0.04, 0.62, 0.62, 7.255, FLOOR + 0.55, z + 0.32, { cast: false });
  }
  addBox(group, MAT.oak, 0.08, 0.07, 7.0, 7.22, FLOOR + 1.06, -3.4, { cast: false });
  addBox(group, MAT.oakDark, 0.08, 0.12, 7.0, 7.22, FLOOR + 0.08, -3.4, { cast: false });

  /* Baseboards and door casing */
  addBox(group, MAT.oakDark, 13.1, 0.12, 0.055, 0, FLOOR + 0.06, -7.05, { cast: false });
  addBox(group, MAT.oakDark, 0.055, 0.12, 6.9, -7.26, FLOOR + 0.06, -3.3, { cast: false });
  addBox(group, MAT.oakDark, 0.055, 0.12, 6.9, 7.26, FLOOR + 0.06, -3.3, { cast: false });
  addBox(group, MAT.oakDark, 0.1, 2.1, 0.1, 6.55, FLOOR + 1.05, -0.62, { cast: true });
  addBox(group, MAT.oakDark, 0.1, 2.1, 0.1, 7.06, FLOOR + 1.05, -0.62, { cast: true });
  addBox(group, MAT.oakDark, 0.1, 0.1, 1.8, 6.7, FLOOR + 2.15, 0.2, { cast: false });

  /* Framed prints and a small menu card on the side wall */
  const artTitles = [
    ['雨', 'AFTER THE RAIN', '#1a2430', '#d9e7ea'],
    ['街角', 'A CORNER IN HANGZHOU', '#2a211b', '#e6d3b6'],
    ['一杯', 'A QUIET CUP', '#1d2420', '#d8e2cf']
  ];
  artTitles.forEach(([title, sub, bg, fg], index) => {
    const texture = makeTextTexture(title, { width: 320, height: 420, background: bg, color: fg, sub, accent: '#b8784e', font: '600 74px "Songti SC", serif' });
    MAT.textures.push(texture);
    const z = -4.6 + index * 1.25;
    addBox(group, MAT.oakDark, 0.05, 1.0, 0.78, 7.22, FLOOR + 1.95, z, { cast: false });
    addPanel(group, new THREE.MeshBasicMaterial({ map: texture, toneMapped: true }), 0.66, 0.86, 7.17, FLOOR + 1.95, z, -Math.PI / 2);
    addBox(group, MAT.brass, 0.02, 0.04, 0.8, 7.2, FLOOR + 2.47, z, { cast: false });
  });

  /* Pastry tray, cup stacks and bar clutter */
  addBox(group, MAT.stone, 0.85, 0.035, 0.48, 0.15, FLOOR + 1.19, -4.75, { cast: true });
  for (const [px, pz] of [[-0.1, -4.83], [0.25, -4.7], [0.45, -4.86]]) {
    const pastry = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.032, 6, 12, Math.PI), MAT.oak);
    pastry.position.set(px, FLOOR + 1.22, pz);
    pastry.rotation.x = -Math.PI / 2;
    group.add(pastry);
  }
  for (const [cx, cz] of [[1.34, -6.32], [1.48, -6.32], [1.62, -6.32]]) {
    for (let i = 0; i < 3; i += 1) {
      addCylinder(group, MAT.paper, 0.085, 0.075, 0.07, cx, FLOOR + 1.18 + i * 0.07, cz, { segments: 14, cast: false });
    }
  }
  addBox(group, MAT.oak, 0.28, 0.46, 0.24, 1.75, FLOOR + 1.16, -6.55, { rotation: [0, 0.1, 0], cast: true });
  addBox(group, MAT.paper, 0.21, 0.05, 0.16, 1.75, FLOOR + 1.42, -6.55, { cast: false });
  addCylinder(group, MAT.brass, 0.035, 0.05, 0.32, -3.3, FLOOR + 1.3, -6.35, { rotation: [0.15, 0, 0.12], segments: 8, cast: true });
  addBox(group, MAT.metalDark, 0.22, 0.035, 0.22, -4.55, FLOOR + 1.2, -6.5, { cast: false });
  addCylinder(group, MAT.chrome, 0.028, 0.028, 0.18, -4.55, FLOOR + 1.24, -6.5, { rotation: [Math.PI / 2, 0, 0], segments: 8, cast: true });
  for (let i = 0; i < 4; i += 1) {
    addCylinder(group, MAT.brass, 0.035, 0.04, 0.16, -2.0 + i * 0.14, FLOOR + 1.24, -6.72, { segments: 8, cast: true });
  }

  /* Chalk menu cards hanging over the bar */
  for (let i = 0; i < 3; i += 1) {
    const card = makeTextTexture(i === 0 ? '今日咖啡' : i === 1 ? '手冲单' : '天气特调', {
      width: 240, height: 320, background: '#24201b', color: '#e9ddca', sub: 'EAVES · TODAY',
      accent: '#bf8556', font: '600 46px "Songti SC", serif'
    });
    MAT.textures.push(card);
    addBox(group, MAT.oakDark, 0.03, 0.62, 0.44, -5.2 + i * 0.55, FLOOR + 2.36, -6.98, { cast: false });
    addPanel(group, new THREE.MeshBasicMaterial({ map: card, toneMapped: true }), 0.36, 0.54, -5.2 + i * 0.55, FLOOR + 2.36, -6.955);
  }

  /* Ritual objects on the counter by the espresso machine */
  addBox(group, MAT.oakDark, 0.25, 0.025, 0.18, -3.15, FLOOR + 1.2, -5.7, { cast: false });
  addCylinder(group, MAT.chrome, 0.028, 0.028, 0.16, -3.15, FLOOR + 1.27, -5.7, { rotation: [0, 0, 0.2], segments: 8, cast: true });
  addCylinder(group, MAT.brass, 0.03, 0.04, 0.2, -3.33, FLOOR + 1.25, -5.7, { segments: 8, cast: true });
  addCylinder(group, MAT.metalDark, 0.055, 0.055, 0.12, -2.7, FLOOR + 1.24, -5.7, { segments: 10, cast: true });

  /* Chairs get back slats and a little upholstery detail. */
  const chairPositions = [
    [-5.0, -2.6, Math.PI / 2], [-3.0, -2.6, -Math.PI / 2],
    [2.65, -2.7, Math.PI / 2], [4.45, -2.7, -Math.PI / 2]
  ];
  for (const [cx, cz, rot] of chairPositions) {
    const chair = new THREE.Group();
    chair.position.set(cx, FLOOR, cz);
    chair.rotation.y = rot;
    group.add(chair);
    for (let i = 0; i < 3; i += 1) {
      addBox(chair, MAT.oak, 0.38, 0.035, 0.025, 0, 0.62 + i * 0.11, -0.22, { cast: true });
    }
    addBox(chair, MAT.fabricCream, 0.36, 0.025, 0.017, 0, 0.56, -0.205, { cast: false });
    for (const dx of [-0.18, 0.18]) {
      addCylinder(chair, MAT.brass, 0.022, 0.022, 0.04, dx, 0.5, -0.19, { segments: 8, cast: false });
    }
  }

  /* Table settings: menus, water glasses, a candle and a book. */
  for (const [tx, tz] of [[-4.0, -2.6], [3.55, -2.7]]) {
    addBox(group, MAT.paper, 0.24, 0.012, 0.33, tx - 0.24, FLOOR + 0.755, tz + 0.18, { rotation: [0, 0.3, 0], cast: false });
    addCylinder(group, MAT.brass, 0.035, 0.045, 0.1, tx + 0.18, FLOOR + 0.815, tz - 0.18, { segments: 10, cast: true });
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), MAT.lampGlow);
    flame.scale.y = 1.8;
    flame.position.set(tx + 0.18, FLOOR + 0.89, tz - 0.18);
    group.add(flame);
    addCylinder(group, MAT.windowGlass, 0.04, 0.04, 0.12, tx + 0.28, FLOOR + 0.79, tz + 0.2, { segments: 12, cast: false });
    addBox(group, MAT.fabricSage, 0.26, 0.045, 0.2, tx + 0.3, FLOOR + 0.76, tz - 0.28, { rotation: [0, -0.2, 0], cast: false });
  }

  /* A little shelf of coffee bags and jars above the cabinet */
  for (let i = 0; i < 5; i += 1) {
    addBox(group, MAT.paper, 0.14, 0.23, 0.08, 3.3 + i * 0.2, FLOOR + 2.45, -6.9, { cast: false });
    addBox(group, MAT.fabricRust, 0.1, 0.04, 0.06, 3.3 + i * 0.2, FLOOR + 2.58, -6.88, { cast: false });
  }

  /* Pendant rings and extra bulbs over the window bar */
  for (const x of [-5.6, -4.2, -2.8]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.01, 5, 20), MAT.brass);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, CEILING - 1.36, 0.55);
    group.add(ring);
    addCylinder(group, MAT.brass, 0.02, 0.02, 0.12, x + 0.28, CEILING - 1.1, 0.55, { rotation: [0, 0, 0.5], segments: 6, cast: false });
  }

  /* Soft rim lights so silhouettes separate from the dark background. */
  const rimA = new THREE.PointLight(0xffc58e, 0, 3.4, 2);
  rimA.position.set(2.2, 1.55, -1.65);
  group.add(rimA);
  lights.push({ light: rimA, day: 0.2, rain: 0.85 });
  const rimB = new THREE.PointLight(0xffb87b, 0, 3.4, 2);
  rimB.position.set(4.85, 1.55, -1.6);
  group.add(rimB);
  lights.push({ light: rimB, day: 0.18, rain: 0.75 });
  const rimBarista = new THREE.PointLight(0xffd1a0, 0, 2.8, 2);
  rimBarista.position.set(-2.2, 2.0, -6.3);
  group.add(rimBarista);
  lights.push({ light: rimBarista, day: 0.2, rain: 0.9 });

  return { group, lights };
}



export function createInterior(MAT) {
  const group = new THREE.Group();

  group.add(createRoom(MAT));
  const bar = createBar(MAT);
  group.add(bar.group);

  const computer = createComputer(MAT);
  group.add(computer.group);

  const cabinet = createCabinet(MAT);
  group.add(cabinet.group);

  const decor = createShelfAndDecor(MAT);
  group.add(decor);
  const interiorDetail = createInteriorDetail(MAT);
  group.add(interiorDetail.group);

  /* Tables and chairs */
  const tables = [];
  const tableData = [
    { x: -4.0, z: -2.6 },
    { x: 3.55, z: -2.7 }
  ];
  for (const data of tableData) {
    const table = createTable(MAT, data.x, data.z);
    group.add(table);
    tables.push(table);
  }

  const chairs = [
    createChair(MAT, -5.0, -2.6, Math.PI / 2),
    createChair(MAT, -3.0, -2.6, -Math.PI / 2),
    createChair(MAT, 2.65, -2.7, Math.PI / 2),
    createChair(MAT, 4.45, -2.7, -Math.PI / 2)
  ];
  for (const chair of chairs) group.add(chair);

  for (const x of [-4.2, -2.5, -0.8]) group.add(createStool(MAT, x, -3.55));

  /* Two regulars share the table by the right window */
  const customerA = createPerson(MAT, {
    top: 'shirtCream', bottom: 'denim', hair: 'hairBrown', hairStyle: 'long',
    skin: 'skinLight', seated: true, scarf: true
  });
  customerA.position.set(2.65, FLOOR, -2.7);
  customerA.rotation.y = Math.PI / 2;
  group.add(customerA);
  const cupA = createCup(MAT, MAT.milk, 1.1);
  cupA.position.set(3.1, FLOOR + 0.77, -2.7);
  group.add(cupA);
  addBox(group, MAT.paper, 0.3, 0.035, 0.22, 3.2, FLOOR + 0.75, -2.98, { rotation: [0, 0.2, 0], cast: false });

  const customerB = createPerson(MAT, {
    top: 'shirtRust', bottom: 'denim', hair: 'hairDark', hairStyle: 'short',
    skin: 'skinWarm', seated: true, hat: true
  });
  customerB.position.set(4.45, FLOOR, -2.7);
  customerB.rotation.y = -Math.PI / 2;
  group.add(customerB);
  const cupB = createCup(MAT, MAT.coffee, 1.1);
  cupB.position.set(4.0, FLOOR + 0.77, -2.7);
  group.add(cupB);
  addBox(group, MAT.metalDark, 0.34, 0.02, 0.24, 3.9, FLOOR + 0.75, -2.48, { rotation: [0, 0.3, 0], cast: false });

  /* A little vase on each table */
  for (const data of tableData) {
    addCylinder(group, MAT.terracotta, 0.055, 0.045, 0.16, data.x, FLOOR + 0.8, data.z, { segments: 12, cast: true });
    const flower = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 1), MAT.foliageLight);
    flower.position.set(data.x, FLOOR + 0.93, data.z);
    group.add(flower);
  }

  /* Barista */
  const barista = createPerson(MAT, {
    top: 'shirtCream', bottom: 'denim', hair: 'hairDark', hairStyle: 'bun',
    skin: 'skinLight', apron: true
  });
  barista.position.set(-2.25, FLOOR, -5.5);
  barista.rotation.y = 0;
  group.add(barista);
  const baristaHome = new THREE.Vector3(-2.25, FLOOR, -5.5);
  const baristaMachine = new THREE.Vector3(-3.6, FLOOR, -5.55);

  /* Soft contact shadows ground the furniture without another shadow map. */
  const shadowGeometry = new THREE.CircleGeometry(1, 24);
  for (const [sx, sz, sw, sd, so] of [
    [3.55, -2.7, 2.6, 1.9, 0.34],
    [-2.3, -4.65, 8.2, 1.2, 0.26],
    [4.95, -5.98, 3.4, 0.9, 0.24],
    [-4.0, -2.6, 2.2, 1.7, 0.22],
    [2.65, -2.7, 0.75, 0.7, 0.2],
    [4.45, -2.7, 0.75, 0.7, 0.2]
  ]) {
    const shadowMesh = new THREE.Mesh(shadowGeometry, MAT.contactShadow);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.scale.set(sw * 0.5, sd * 0.5, 1);
    shadowMesh.position.set(sx, FLOOR + 0.006, sz);
    shadowMesh.renderOrder = 1;
    group.add(shadowMesh);
  }
  /* Pickup cup and machine steam */
  const orderCup = createOrderCup(MAT);
  orderCup.group.position.set(-0.25, FLOOR + 1.16, -4.55);
  group.add(orderCup.group);

  const machineSteam = [];
  for (let i = 0; i < 3; i += 1) {
    const sprite = new THREE.Sprite(MAT.steam.clone());
    sprite.scale.set(0.24, 0.42, 1);
    sprite.position.set(-3.8 + (i - 1) * 0.12, FLOOR + 1.76 + i * 0.04, -6.35);
    sprite.material.opacity = 0;
    group.add(sprite);
    machineSteam.push(sprite);
  }

  /* Interior lights */
  const lights = [];
  for (const [i, light] of bar.pendants.entries()) {
    lights.push({ light, day: 1.7, rain: 5.8 });
  }
  for (const entry of interiorDetail.lights) lights.push(entry);

  const windowLight = new THREE.PointLight(0xffe2be, 1.2, 11, 2);
  windowLight.position.set(0, 2.35, 0.9);
  group.add(windowLight);
  lights.push({ light: windowLight, day: 2.0, rain: 2.6 });

  const backLight = new THREE.PointLight(0xffbd82, 0.8, 8, 2);
  backLight.position.set(-2.2, 1.85, -6.2);
  group.add(backLight);
  lights.push({ light: backLight, day: 0.95, rain: 3.2 });

  const cabinetLight = new THREE.PointLight(0xffc992, 0.55, 4.2, 2);
  cabinetLight.position.set(4.9, 1.8, -6.1);
  group.add(cabinetLight);
  lights.push({ light: cabinetLight, day: 0.85, rain: 2.0 });

  const readingLight = new THREE.PointLight(0xffb877, 0.45, 3.2, 2);
  readingLight.position.set(-6.7, 2.7, -3.3);
  group.add(readingLight);
  lights.push({ light: readingLight, day: 0.55, rain: 1.8 });

  const sunShaft = new THREE.SpotLight(0xffdfb2, 0, 13, 0.58, 0.62, 1.6);
  sunShaft.position.set(-2.4, 2.85, 0.7);
  const shaftTarget = new THREE.Object3D();
  shaftTarget.position.set(0.4, 0.0, -3.8);
  group.add(shaftTarget);
  sunShaft.target = shaftTarget;
  sunShaft.castShadow = true;
  sunShaft.shadow.mapSize.set(1024, 1024);
  sunShaft.shadow.bias = -0.0008;
  group.add(sunShaft);
  lights.push({ light: sunShaft, day: 2.2, rain: 0.3 });

  const coolFill = new THREE.PointLight(0xa8c2ff, 0, 10, 2);
  coolFill.position.set(0.4, 1.9, 0.8);
  group.add(coolFill);
  lights.push({ light: coolFill, day: 0.5, rain: 1.8 });

  const windowBarLight = new THREE.PointLight(0xffbe86, 0.5, 6, 2);
  windowBarLight.position.set(-4.2, 2.25, 0.55);
  group.add(windowBarLight);
  lights.push({ light: windowBarLight, day: 1.1, rain: 3.6 });

  /* A quieter table setting: rug, pendant, floor lamp, clock and pastries. */
  const rugMaterial = new THREE.MeshStandardMaterial({ color: 0xaa8c70, roughness: 0.98, metalness: 0 });
  addBox(group, rugMaterial, 2.7, 0.02, 2.0, 3.55, FLOOR + 0.025, -2.7, { cast: false, receive: true });

  addCylinder(group, MAT.metalDark, 0.01, 0.01, 1.05, 3.55, CEILING - 0.55, -2.7, { segments: 6, cast: false });
  addCylinder(group, MAT.brass, 0.15, 0.23, 0.24, 3.55, CEILING - 0.85, -2.7, { segments: 18, cast: true });
  const tableBulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), MAT.lampGlow);
  tableBulb.position.set(3.55, CEILING - 0.97, -2.7);
  group.add(tableBulb);
  const tableLight = new THREE.PointLight(0xffb675, 0, 4.5, 2);
  tableLight.position.set(3.55, CEILING - 1.08, -2.7);
  group.add(tableLight);
  lights.push({ light: tableLight, day: 1.05, rain: 2.8 });

  addCylinder(group, MAT.brass, 0.018, 0.018, 1.4, 6.45, FLOOR + 0.72, -1.0, { segments: 8, cast: true });
  addCylinder(group, MAT.metalDark, 0.24, 0.28, 0.035, 6.45, FLOOR + 0.04, -1.0, { segments: 16, cast: true });
  addCylinder(group, MAT.fabricCream, 0.18, 0.26, 0.26, 6.45, FLOOR + 1.48, -1.0, { segments: 16, cast: true });
  const floorBulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), MAT.lampGlow);
  floorBulb.position.set(6.45, FLOOR + 1.35, -1.0);
  group.add(floorBulb);
  const floorLight = new THREE.PointLight(0xffb675, 0, 4, 2);
  floorLight.position.set(6.45, FLOOR + 1.3, -1.0);
  group.add(floorLight);
  lights.push({ light: floorLight, day: 0.8, rain: 2.2 });

  /* Wall clock above the counter */
  const clockFace = new THREE.Mesh(
    new THREE.CircleGeometry(0.25, 28),
    new THREE.MeshBasicMaterial({ color: 0xf1e4d1, toneMapped: true })
  );
  clockFace.position.set(1.55, 2.55, -6.92);
  group.add(clockFace);
  const clockRim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.022, 8, 28), MAT.oakDark);
  clockRim.position.copy(clockFace.position);
  group.add(clockRim);
  addBox(group, MAT.metalDark, 0.012, 0.16, 0.012, 1.55, 2.62, -6.9, { rotation: [0, 0, 0.4], cast: false });
  addBox(group, MAT.metalDark, 0.11, 0.012, 0.012, 1.6, 2.55, -6.9, { cast: false });

  /* Cake stand with two pastries on the front counter */
  addCylinder(group, MAT.stone, 0.2, 0.23, 0.035, 1.55, FLOOR + 1.2, -4.82, { segments: 20, cast: true });
  addCylinder(group, MAT.glassDark, 0.025, 0.025, 0.17, 1.55, FLOOR + 1.29, -4.82, { segments: 8, cast: true });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.windowGlass);
  dome.position.set(1.55, FLOOR + 1.29, -4.82);
  dome.scale.y = 0.8;
  group.add(dome);
  for (const [dx, dz] of [[-0.08, 0.03], [0.1, -0.03]]) {
    const pastry = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.035, 6, 14, Math.PI), MAT.oak);
    pastry.position.set(1.55 + dx, FLOOR + 1.23, -4.82 + dz);
    pastry.rotation.x = -Math.PI / 2;
    pastry.castShadow = true;
    group.add(pastry);
  }

  /* A plant beside the display cabinet */
  addCylinder(group, MAT.terracotta, 0.19, 0.15, 0.32, 6.55, FLOOR + 0.16, -0.35, { segments: 14, cast: true });
  addCylinder(group, MAT.hairBrown, 0.03, 0.04, 0.7, 6.55, FLOOR + 0.6, -0.35, { segments: 8, cast: true });
  for (let i = 0; i < 5; i += 1) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17 + (i % 2) * 0.05, 1), i % 2 ? MAT.foliage : MAT.foliageLight);
    leaf.position.set(6.55 + Math.sin(i * 2.2) * 0.2, FLOOR + 0.95 + (i % 3) * 0.13, -0.35 + Math.cos(i * 1.8) * 0.16);
    leaf.scale.y = 0.8;
    leaf.castShadow = true;
    group.add(leaf);
  }

  /* Interactives & camera anchors */
  const interactives = [];
  computer.group.traverse((object) => {
    if (object.isMesh && object.userData.interactive === 'computer') {
      interactives.push(object);
    }
  });
  for (const item of cabinet.drinks) {
    item.group.traverse((object) => {
      if (object.isMesh) {
        object.userData.interactive = 'drink';
        object.userData.drinkId = item.drink.id;
        interactives.push(object);
      }
    });
  }

  const hotspots = [
    { id: 'computer', label: '点单电脑', en: 'ORDER', position: new THREE.Vector3(0.94, 1.6, -4.3), action: 'order' },
    { id: 'cabinet', label: '陈列柜', en: 'DISPLAY', position: new THREE.Vector3(4.95, 1.82, -6.35), action: 'cabinet' }
  ];

  let orderProgress = 0;
  let orderActive = false;
  let served = false;
  let currentDrink = null;
  let orderTime = 0;

  function beginOrder(drink) {
    currentDrink = drink;
    orderActive = true;
    served = false;
    orderProgress = 0;
    orderTime = 0;
    orderCup.group.visible = false;
    orderCup.group.scale.setScalar(0.01);
    orderCup.group.position.set(-0.25, FLOOR + 1.16, -4.55);
    barista.position.copy(baristaHome);
  }

  function finishOrder(drink) {
    currentDrink = drink;
    orderActive = false;
    served = true;
    orderProgress = 1;
    orderCup.group.visible = true;
    orderCup.group.scale.setScalar(1);
    orderCup.group.position.set(-0.25, FLOOR + 1.16, -4.55);
    const drinkColor = drink.category === 'tea'
      ? (drink.id === 'jasmine-grape' ? MAT.teaGreen : drink.id === 'blood-orange' ? MAT.teaRed : MAT.teaPeach)
      : MAT.coffee;
    const liquid = orderCup.cup.children.find((child) => child.geometry && child.geometry.type === 'CylinderGeometry' && child !== orderCup.cup.children[0]);
    if (liquid && liquid.material) liquid.material = drinkColor;
    const steamMat = MAT.steam;
    if (steamMat) steamMat.opacity = 0;
  }

  function resetOrder() {
    currentDrink = null;
    orderActive = false;
    served = false;
    orderProgress = 0;
    orderCup.group.visible = false;
  }

  function update(dt, time, rainAmount) {
    /* Barista idle breathing */
    const parts = barista.userData.parts;
    if (parts) {
      parts.head.rotation.y = Math.sin(time * 0.45) * 0.12;
      parts.armL.rotation.x = Math.sin(time * 0.8) * 0.03;
      parts.armR.rotation.x = Math.sin(time * 0.7 + 0.4) * 0.03;
    }

    if (orderActive) {
      orderTime += dt;
      orderProgress = Math.min(1, orderTime / 5);
      const working = orderProgress < 0.74;
      const target = working ? baristaMachine : baristaHome;
      barista.position.x += (target.x - barista.position.x) * Math.min(1, dt * 2.8);
      barista.position.z += (target.z - barista.position.z) * Math.min(1, dt * 2.8);
      const workPhase = time * 9;
      if (parts) {
        if (working) {
          parts.armR.rotation.x = -1.0 + Math.sin(workPhase) * 0.22;
          parts.armL.rotation.x = -0.3 + Math.cos(workPhase * 0.7) * 0.14;
          parts.head.rotation.z = Math.sin(workPhase * 0.25) * 0.04;
        } else {
          parts.armR.rotation.x = -0.25 + Math.sin(time * 1.2) * 0.04;
          parts.armL.rotation.x = -0.1;
          parts.head.rotation.z = 0;
        }
      }
      const steamVisible = working && orderProgress > 0.22;
      for (const [i, sprite] of machineSteam.entries()) {
        const material = sprite.material;
        material.opacity = steamVisible ? (0.2 + Math.sin(workPhase + i) * 0.08) : 0;
        sprite.position.y = FLOOR + 1.76 + ((time * 0.25 + i * 0.18) % 0.4);
      }
      if (orderProgress > 0.76) {
        orderCup.group.visible = true;
        orderCup.group.scale.setScalar(1);
        const drinkColor = currentDrink?.category === 'tea'
          ? (currentDrink.id === 'jasmine-grape' ? MAT.teaGreen : currentDrink.id === 'blood-orange' ? MAT.teaRed : MAT.teaPeach)
          : MAT.coffee;
        const cupChildren = orderCup.cup.children;
        const liquid = cupChildren[1];
        if (liquid && liquid.material) liquid.material = drinkColor;
        for (const [i, sprite] of orderCup.steam.entries()) {
          sprite.material.opacity = 0.18 + Math.sin(time * 1.5 + i * 0.9) * 0.05;
          sprite.position.y = 0.3 + ((time * 0.2 + i * 0.13) % 0.35);
        }
      } else {
        orderCup.group.visible = false;
      }
      if (orderProgress >= 1) {
        orderActive = false;
        served = true;
      }
    } else if (!served) {
      barista.position.x += (baristaHome.x - barista.position.x) * Math.min(1, dt * 2);
      barista.position.z += (baristaHome.z - barista.position.z) * Math.min(1, dt * 2);
    }

    if (served) {
      for (const [i, sprite] of orderCup.steam.entries()) {
        sprite.material.opacity = 0.16 + Math.sin(time * 1.3 + i) * 0.04;
        sprite.position.y = 0.3 + ((time * 0.16 + i * 0.12) % 0.35);
      }
    }

    const glow = 0.28 + rainAmount * 0.45;
    computer.glow.intensity = 0.25 + rainAmount * 0.18;
    for (const entry of lights) {
      entry.light.intensity = THREE.MathUtils.lerp(entry.day, entry.rain, rainAmount);
    }
    for (const sprite of machineSteam) {
      if (!orderActive) sprite.material.opacity = 0;
    }
    cabinet.glow.material.opacity = glow;
  }

  return {
    group,
    interactives,
    hotspots,
    computer: computer.group,
    cabinet: cabinet.group,
    drinks: cabinet.drinks,
    barista,
    lights,
    beginOrder,
    finishOrder,
    resetOrder,
    getOrderProgress: () => orderProgress,
    isServed: () => served,
    update
  };
}




