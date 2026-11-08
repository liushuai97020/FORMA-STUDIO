import * as THREE from 'three';
import { canvasTexture, cloneTexture } from './helpers.js';

const PLATE_TEXT = '苏EG59122';

function noiseOverlay(ctx, width, height, count, alpha, palette, size = 2) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
    ctx.globalAlpha = alpha * (0.35 + Math.random() * 0.65);
    const r = size * (0.35 + Math.random() * 1.4);
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function makePlaster() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#efe9dd';
    ctx.fillRect(0, 0, w, h);
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(255,255,255,.12)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,0)');
    gradient.addColorStop(1, 'rgba(115,96,72,.06)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    noiseOverlay(ctx, w, h, 5000, 0.035, ['#b3a185', '#ffffff', '#8e7b61'], 1.15);
    for (let i = 0; i < 28; i++) {
      ctx.strokeStyle = `rgba(128,109,84,${0.015 + Math.random() * 0.025})`;
      ctx.lineWidth = 0.5 + Math.random();
      ctx.beginPath();
      const x = Math.random() * w;
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 8, h * 0.32, x - 6, h * 0.72, x + 3, h);
      ctx.stroke();
    }
    noiseOverlay(ctx, w, h, 750, 0.04, ['#8d7a62'], 2.8);
  }, { repeat: [2, 2] });
}

function makeBump(seed = 1) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, w, h);
    noiseOverlay(ctx, w, h, 4200, 0.11, ['#a0a0a0', '#616161', '#8a8a8a'], 1.45);
    if (seed === 2) {
      ctx.strokeStyle = 'rgba(130,130,130,.18)';
      for (let y = 0; y < h; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y + Math.random() * 4);
        ctx.lineTo(w, y + Math.random() * 4);
        ctx.stroke();
      }
    }
  }, { colorSpace: false, repeat: [2, 2] });
}

function makeWood() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const base = ctx.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, '#a97950');
    base.addColorStop(0.42, '#95653f');
    base.addColorStop(1, '#815433');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 130; i++) {
      const y = Math.random() * h;
      const amp = 2 + Math.random() * 14;
      ctx.strokeStyle = `rgba(${48 + Math.random() * 30}, ${28 + Math.random() * 24}, ${16 + Math.random() * 16}, ${0.05 + Math.random() * 0.14})`;
      ctx.lineWidth = 0.5 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(-10, y);
      ctx.bezierCurveTo(w * 0.22, y - amp, w * 0.58, y + amp, w + 10, y + (Math.random() - 0.5) * 8);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.strokeStyle = 'rgba(65,38,21,.16)';
      ctx.lineWidth = 1;
      for (let r = 2; r < 16; r += 3) {
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.7, r * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    for (let y = 0; y < h; y += 64) {
      ctx.strokeStyle = 'rgba(53,32,17,.15)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  });
}

function makeRoof() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#555b5d';
    ctx.fillRect(0, 0, w, h);
    const rows = 14;
    const cols = 12;
    const rowH = h / rows;
    const colW = w / cols;
    for (let row = 0; row < rows; row++) {
      const offset = row % 2 === 0 ? 0 : colW * 0.5;
      for (let col = -1; col <= cols; col++) {
        const x = col * colW + offset;
        const y = row * rowH;
        const shade = 72 + Math.random() * 18;
        ctx.fillStyle = `rgb(${shade},${shade + 3},${shade + 4})`;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, colW - 2, rowH * 1.15, [0, 0, colW * 0.42, colW * 0.42]);
        ctx.fill();
        ctx.strokeStyle = 'rgba(165,174,174,.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + colW * 0.12, y + 1.5);
        ctx.lineTo(x + colW * 0.12, y + rowH * 0.86);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(8,10,10,.34)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x + colW * 0.5, y + rowH * 1.02, colW * 0.45, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(5,8,8,.08)';
    ctx.fillRect(0, 0, w, h);
  }, { repeat: [7, 4] });
}

function makeStone() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#a5a29a';
    ctx.fillRect(0, 0, w, h);
    noiseOverlay(ctx, w, h, 4200, 0.07, ['#d0ccc2', '#7e7c76', '#b8b2a7'], 2.2);
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = `rgba(76,74,68,${0.04 + Math.random() * 0.08})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(Math.random() * w, Math.random() * h);
      ctx.lineTo(Math.random() * w, Math.random() * h);
      ctx.stroke();
    }
  }, { repeat: [3, 3] });
}

function makeGravel() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#aaa18f';
    ctx.fillRect(0, 0, w, h);
    noiseOverlay(ctx, w, h, 9000, 0.2, ['#d4cbb9', '#7e776a', '#bdb4a2', '#8d877b'], 2.1);
  }, { repeat: [8, 8] });
}

function makeGrass() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#65735c';
    ctx.fillRect(0, 0, w, h);
    noiseOverlay(ctx, w, h, 6000, 0.12, ['#89977a', '#4d5c47', '#738260'], 2.4);
    for (let i = 0; i < 1000; i++) {
      ctx.strokeStyle = `rgba(${60 + Math.random() * 45},${80 + Math.random() * 45},${54 + Math.random() * 34},.32)`;
      ctx.lineWidth = 0.65;
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 8, y - 3 - Math.random() * 8);
      ctx.stroke();
    }
  }, { repeat: [16, 16] });
}

function makePlateTexture() {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#e4f8e7');
    gradient.addColorStop(0.45, '#b9ecc5');
    gradient.addColorStop(1, '#75cf8d');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(5, 5, w - 10, h - 10, 26);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.92)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(13, 13, w - 26, h - 26, 20);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(22,73,39,.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(23, 23, w - 46, h - 46, 14);
    ctx.stroke();

    const chars = [...PLATE_TEXT];
    const fontSize = 112;
    ctx.font = `700 ${fontSize}px "Microsoft YaHei", "Noto Sans SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const gap = 2;
    const widths = chars.map((char) => ctx.measureText(char).width);
    const total = widths.reduce((sum, value) => sum + value, 0) + gap * (chars.length - 1);
    let cursor = (w - total) / 2;
    ctx.fillStyle = '#122018';
    chars.forEach((char, index) => {
      const charWidth = widths[index];
      ctx.fillText(char, cursor + charWidth / 2, h * 0.53);
      cursor += charWidth + gap;
    });

    ctx.fillStyle = 'rgba(30,84,45,.42)';
    for (const x of [39, w - 39]) {
      ctx.beginPath();
      ctx.arc(x, h / 2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.beginPath();
      ctx.arc(x - 2, h / 2 - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(30,84,45,.42)';
    }
  }, { wrap: false, anisotropy: 8 });
}

function makePlaque() {
  return canvasTexture(768, 256, (ctx, w, h) => {
    ctx.fillStyle = '#2d2119';
    ctx.fillRect(0, 0, w, h);
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, 'rgba(255,255,255,.08)');
    gradient.addColorStop(1, 'rgba(0,0,0,.19)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(194,153,95,.6)';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, w - 48, h - 48);
    ctx.fillStyle = '#e4bd7f';
    ctx.font = '500 112px "Noto Serif SC", "STSong", "SimSun", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('栖 白', w / 2, h / 2 - 9);
    ctx.fillStyle = 'rgba(228,189,127,.62)';
    ctx.font = '20px Georgia, serif';
    ctx.fillText('QĪ BÁI  ·  JIANGNAN', w / 2, h - 44);
  }, { wrap: false });
}

function makeShadow() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(0,0,0,.72)');
    gradient.addColorStop(0.45, 'rgba(0,0,0,.32)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }, { wrap: false, colorSpace: false });
}

function makeScroll() {
  return canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#e9dec8';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(71,52,38,.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 20 + i * 29);
      ctx.lineTo(w, 18 + i * 29);
      ctx.stroke();
    }
    ctx.fillStyle = '#4c3f33';
    ctx.font = '500 54px "Noto Serif SC", "STSong", "SimSun", serif';
    ctx.textAlign = 'center';
    ctx.fillText('听', w / 2, 168);
    ctx.fillText('雨', w / 2, 242);
    ctx.fillText('观', w / 2, 316);
    ctx.fillText('花', w / 2, 390);
    ctx.fillStyle = 'rgba(157,61,51,.8)';
    ctx.fillRect(w - 50, h - 82, 25, 25);
  }, { wrap: false });
}

export function createMaterials() {
  const plaster = makePlaster();
  const plasterBump = makeBump(1);
  const wood = makeWood();
  const woodBump = makeBump(2);
  const roof = makeRoof();
  const roofBump = makeBump(3);
  const stone = makeStone();
  const gravel = makeGravel();
  const grass = makeGrass();
  const plateTexture = makePlateTexture();
  const plaqueTexture = makePlaque();
  const shadowTexture = makeShadow();
  const scrollTexture = makeScroll();

  const M = {
    plasterTexture: plaster,
    plateTexture,
    plaqueTexture,
    shadowTexture,

    wall: new THREE.MeshStandardMaterial({
      color: 0xf2ecdf,
      map: plaster,
      bumpMap: plasterBump,
      bumpScale: 0.034,
      roughness: 0.94,
      metalness: 0.0
    }),
    wallWarm: new THREE.MeshStandardMaterial({
      color: 0xeee4d3,
      map: plaster,
      bumpMap: plasterBump,
      bumpScale: 0.03,
      roughness: 0.92
    }),
    wallFacade: null,
    stone: new THREE.MeshStandardMaterial({
      color: 0xc0bcb2,
      map: stone,
      roughness: 0.88,
      metalness: 0.02
    }),
    stoneDark: new THREE.MeshStandardMaterial({
      color: 0x8e8c85,
      map: stone,
      roughness: 0.9
    }),
    paving: new THREE.MeshStandardMaterial({
      color: 0xc0bcb2,
      map: stone,
      roughness: 0.94
    }),
    pavingDark: new THREE.MeshStandardMaterial({
      color: 0x9c9991,
      map: stone,
      roughness: 0.92
    }),
    gravel: new THREE.MeshStandardMaterial({
      color: 0xc4baa5,
      map: gravel,
      roughness: 1
    }),
    asphalt: new THREE.MeshStandardMaterial({
      color: 0x77766f,
      map: gravel,
      roughness: 0.96,
      metalness: 0.02
    }),
    grass: new THREE.MeshStandardMaterial({
      color: 0x7a8a6d,
      map: grass,
      roughness: 1
    }),
    moss: new THREE.MeshStandardMaterial({
      color: 0x667558,
      map: grass,
      roughness: 1
    }),
    roof: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: roof,
      bumpMap: roofBump,
      bumpScale: 0.12,
      roughness: 0.78,
      metalness: 0.08
    }),
    roofDark: new THREE.MeshStandardMaterial({
      color: 0x333735,
      roughness: 0.74,
      metalness: 0.1
    }),
    wood: new THREE.MeshStandardMaterial({
      color: 0xd0a67a,
      map: wood,
      bumpMap: woodBump,
      bumpScale: 0.035,
      roughness: 0.58
    }),
    woodDark: new THREE.MeshStandardMaterial({
      color: 0xa66f49,
      map: wood,
      bumpMap: woodBump,
      bumpScale: 0.03,
      roughness: 0.6
    }),
    woodDeep: new THREE.MeshStandardMaterial({
      color: 0x5a3a28,
      roughness: 0.62
    }),
    woodLight: new THREE.MeshStandardMaterial({
      color: 0xe0bb92,
      map: wood,
      roughness: 0.64
    }),
    floor: new THREE.MeshStandardMaterial({
      color: 0xe0b78a,
      map: cloneTexture(wood, [4, 9]),
      bumpMap: woodBump,
      bumpScale: 0.03,
      roughness: 0.62
    }),
    floorUpper: new THREE.MeshStandardMaterial({
      color: 0xe0b78a,
      map: cloneTexture(wood, [4, 8]),
      bumpMap: woodBump,
      bumpScale: 0.028,
      roughness: 0.65
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x8fa6a8,
      roughness: 0.1,
      metalness: 0.02,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      envMapIntensity: 0.28,
      depthWrite: false
    }),
    glassDark: new THREE.MeshPhysicalMaterial({
      color: 0x182528,
      roughness: 0.06,
      metalness: 0.4,
      transparent: true,
      opacity: 0.8,
      envMapIntensity: 1.5
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0xb28a55,
      metalness: 0.82,
      roughness: 0.28
    }),
    brassDark: new THREE.MeshStandardMaterial({
      color: 0x7b5b36,
      metalness: 0.7,
      roughness: 0.38
    }),
    blackMetal: new THREE.MeshStandardMaterial({
      color: 0x242522,
      metalness: 0.55,
      roughness: 0.44
    }),
    charcoal: new THREE.MeshStandardMaterial({
      color: 0x2e2c27,
      roughness: 0.8
    }),
    liner: new THREE.MeshStandardMaterial({
      color: 0xe2d5c1,
      roughness: 0.96
    }),
    ceiling: new THREE.MeshStandardMaterial({
      color: 0xb4885d,
      map: cloneTexture(wood, [7, 7]),
      bumpMap: woodBump,
      bumpScale: 0.018,
      roughness: 0.82
    }),
    linen: new THREE.MeshStandardMaterial({
      color: 0xd9cbb7,
      roughness: 0.98
    }),
    linenLight: new THREE.MeshStandardMaterial({
      color: 0xeee5d5,
      roughness: 1
    }),
    rug: new THREE.MeshStandardMaterial({
      color: 0xb9aa93,
      roughness: 1
    }),
    rugLight: new THREE.MeshStandardMaterial({
      color: 0xd4c8b6,
      roughness: 1
    }),
    paper: new THREE.MeshStandardMaterial({
      color: 0xf2e2c3,
      emissive: 0xffc477,
      emissiveIntensity: 0.28,
      roughness: 0.92,
      side: THREE.DoubleSide
    }),
    bulb: new THREE.MeshBasicMaterial({
      color: 0xffdca7,
      toneMapped: false
    }),
    windowGlow: new THREE.MeshBasicMaterial({
      color: 0xffb970,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    }),
    warmGlow: new THREE.MeshBasicMaterial({
      color: 0xffb16c,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    }),
    water: new THREE.MeshPhysicalMaterial({
      color: 0x355550,
      roughness: 0.12,
      metalness: 0.28,
      transparent: true,
      opacity: 0.86,
      envMapIntensity: 1.2
    }),
    waterLine: new THREE.MeshBasicMaterial({
      color: 0x9db3a6,
      transparent: true,
      opacity: 0.22
    }),
    blossom: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.87,
      metalness: 0,
      side: THREE.DoubleSide
    }),
    blossomDeep: new THREE.MeshStandardMaterial({
      color: 0xd88d9e,
      roughness: 0.9,
      side: THREE.DoubleSide
    }),
    petal: new THREE.MeshStandardMaterial({
      color: 0xf1b8c1,
      roughness: 0.82,
      metalness: 0,
      side: THREE.DoubleSide
    }),
    bark: new THREE.MeshStandardMaterial({
      color: 0x4d3a2e,
      roughness: 0.96
    }),
    barkLight: new THREE.MeshStandardMaterial({
      color: 0x6a5240,
      roughness: 0.94
    }),
    leaf: new THREE.MeshStandardMaterial({
      color: 0x647655,
      roughness: 0.9,
      side: THREE.DoubleSide
    }),
    bamboo: new THREE.MeshStandardMaterial({
      color: 0x68754f,
      roughness: 0.86
    }),
    bambooLeaf: new THREE.MeshStandardMaterial({
      color: 0x5c704f,
      roughness: 0.9,
      side: THREE.DoubleSide
    }),
    carPaint: new THREE.MeshPhysicalMaterial({
      color: 0xf7f5ee,
      roughness: 0.16,
      metalness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.14,
      envMapIntensity: 1.55
    }),
    carPaintSoft: new THREE.MeshPhysicalMaterial({
      color: 0xeeeae1,
      roughness: 0.22,
      metalness: 0.1,
      clearcoat: 0.9,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.35
    }),
    carGlass: new THREE.MeshPhysicalMaterial({
      color: 0x111a1d,
      roughness: 0.06,
      metalness: 0.48,
      transparent: true,
      opacity: 0.88,
      envMapIntensity: 1.8
    }),
    tire: new THREE.MeshStandardMaterial({
      color: 0x121211,
      roughness: 0.82,
      metalness: 0.05
    }),
    rim: new THREE.MeshStandardMaterial({
      color: 0xb9b9b3,
      roughness: 0.22,
      metalness: 0.9,
      envMapIntensity: 1.4
    }),
    carTrim: new THREE.MeshStandardMaterial({
      color: 0x1f2221,
      roughness: 0.44,
      metalness: 0.4
    }),
    headlight: new THREE.MeshStandardMaterial({
      color: 0xfff9e9,
      emissive: 0xfff1cf,
      emissiveIntensity: 0.85,
      roughness: 0.24
    }),
    taillight: new THREE.MeshStandardMaterial({
      color: 0x7d1c1d,
      emissive: 0xc32e25,
      emissiveIntensity: 0.9,
      roughness: 0.3
    }),
    plate: new THREE.MeshBasicMaterial({
      map: plateTexture,
      transparent: true,
      toneMapped: false,
      side: THREE.DoubleSide
    }),
    plaque: new THREE.MeshStandardMaterial({
      map: plaqueTexture,
      roughness: 0.58,
      metalness: 0.1,
      emissive: 0x2c1b0d,
      emissiveIntensity: 0.15
    }),
    scroll: new THREE.MeshStandardMaterial({
      map: scrollTexture,
      roughness: 0.95,
      side: THREE.DoubleSide
    }),
    lantern: new THREE.MeshStandardMaterial({
      color: 0xffe2b7,
      emissive: 0xffb15f,
      emissiveIntensity: 0.65,
      roughness: 0.65,
      transparent: true,
      opacity: 0.86
    }),
    shadow: new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      toneMapped: false
    }),
    shadowLight: new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      toneMapped: false
    })
  };

  M.wallFacade = M.wall.clone();
  M.wallFacade.transparent = true;
  M.wallFacade.opacity = 1;
  M.wallFacade.depthWrite = true;

  return M;
}

export { PLATE_TEXT };




