import * as THREE from 'three';

/* --------------------------------------------------------------------------
   Warm, procedural surfaces for 檐下.
   Everything is painted in the browser: plaster, brick, asphalt, pavement,
   oak, terrazzo, awning stripes and hand-lettered signs.
   -------------------------------------------------------------------------- */

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

function toTexture(canvas, { repeat = [1, 1], srgb = true, anisotropy = 8 } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = anisotropy;
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return texture;
}

function speckle(ctx, width, height, random, count, colors, max = 1.6) {
  for (let i = 0; i < count; i += 1) {
    ctx.fillStyle = colors[(random() * colors.length) | 0];
    const r = 0.3 + random() * max;
    ctx.beginPath();
    ctx.arc(random() * width, random() * height, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function createBumpTexture(seed = 1, size = 512, strength = 1) {
  const { canvas, ctx } = makeCanvas(size, size);
  const random = rng(seed);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 7500; i += 1) {
    const shade = 128 + ((random() - 0.5) * 46 * strength) | 0;
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.42)`;
    const radius = 0.4 + random() * 3.4;
    ctx.beginPath();
    ctx.arc(random() * size, random() * size, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 26; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30 + random() * 100);
    gradient.addColorStop(0, random() > 0.5 ? 'rgba(170,170,170,0.22)' : 'rgba(86,86,86,0.22)');
    gradient.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - 120, y - 120, 240, 240);
  }
  return toTexture(canvas, { repeat: [2, 2], srgb: false });
}

function createGrimeTexture() {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const random = rng(8123);
  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 34; i += 1) {
    const x = random() * size;
    const length = 60 + random() * 330;
    const width = 5 + random() * 30;
    const gradient = ctx.createLinearGradient(x, 0, x, length);
    gradient.addColorStop(0, `rgba(32, 22, 16, ${0.12 + random() * 0.22})`);
    gradient.addColorStop(0.7, `rgba(42, 30, 22, ${0.06 + random() * 0.1})`);
    gradient.addColorStop(1, 'rgba(30, 20, 15, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, 0, width, length);
  }
  for (let i = 0; i < 18; i += 1) {
    const x = random() * size;
    const y = 60 + random() * (size - 120);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30 + random() * 90);
    gradient.addColorStop(0, `rgba(28, 20, 15, ${0.08 + random() * 0.12})`);
    gradient.addColorStop(1, 'rgba(28, 20, 15, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  /* Horizontal damp tide marks. */
  for (let i = 0; i < 8; i += 1) {
    const y = 100 + random() * 360;
    ctx.fillStyle = `rgba(26, 18, 13, ${0.04 + random() * 0.06})`;
    ctx.fillRect(0, y, size, 1 + random() * 4);
  }
  return toTexture(canvas, { repeat: [2, 2] });
}

export function createGlowTexture(kind = 'warm') {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  if (kind === 'violet') {
    gradient.addColorStop(0, 'rgba(220, 170, 255, 0.9)');
    gradient.addColorStop(0.18, 'rgba(160, 95, 235, 0.5)');
    gradient.addColorStop(0.55, 'rgba(95, 55, 160, 0.12)');
    gradient.addColorStop(1, 'rgba(40, 20, 80, 0)');
  } else if (kind === 'cool') {
    gradient.addColorStop(0, 'rgba(220, 238, 255, 0.8)');
    gradient.addColorStop(0.25, 'rgba(145, 180, 230, 0.35)');
    gradient.addColorStop(1, 'rgba(40, 60, 100, 0)');
  } else {
    gradient.addColorStop(0, 'rgba(255, 235, 195, 0.95)');
    gradient.addColorStop(0.16, 'rgba(255, 185, 110, 0.62)');
    gradient.addColorStop(0.52, 'rgba(200, 110, 50, 0.14)');
    gradient.addColorStop(1, 'rgba(80, 35, 15, 0)');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas, { repeat: [1, 1] });
}

export function createReflectionTexture(kind = 'warm') {
  const width = 256;
  const height = 1024;
  const { canvas, ctx } = makeCanvas(width, height);
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  if (kind === 'violet') {
    gradient.addColorStop(0, 'rgba(120, 70, 170, 0)');
    gradient.addColorStop(0.18, 'rgba(170, 95, 235, 0.3)');
    gradient.addColorStop(0.6, 'rgba(80, 50, 140, 0.12)');
    gradient.addColorStop(1, 'rgba(10, 8, 20, 0)');
  } else {
    gradient.addColorStop(0, 'rgba(255, 214, 150, 0)');
    gradient.addColorStop(0.15, 'rgba(255, 180, 100, 0.45)');
    gradient.addColorStop(0.52, 'rgba(220, 120, 55, 0.16)');
    gradient.addColorStop(1, 'rgba(10, 8, 20, 0)');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 80; i += 1) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 1 + Math.random() * 2, 8 + Math.random() * 70);
  }
  return toTexture(canvas, { repeat: [1, 1], srgb: false });
}

/* A luminous painted interior for the shop windows. It is seen only from the
   street side (the interior camera sits in front of it), giving the façade the
   dense, warm depth of a real late-night café without extra geometry. */
function createStorefrontInteriorTexture() {
  const { canvas, ctx } = makeCanvas(1024, 512);
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#8a4c28');
  gradient.addColorStop(0.14, '#f4d2a8');
  gradient.addColorStop(0.34, '#d69a5c');
  gradient.addColorStop(0.56, '#a86636');
  gradient.addColorStop(0.78, '#59331d');
  gradient.addColorStop(1, '#1b100b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);

  const ceiling = ctx.createLinearGradient(0, 0, 0, 185);
  ceiling.addColorStop(0, 'rgba(255, 243, 214, 0.9)');
  ceiling.addColorStop(0.45, 'rgba(255, 190, 110, 0.38)');
  ceiling.addColorStop(1, 'rgba(255, 154, 72, 0)');
  ctx.fillStyle = ceiling;
  ctx.fillRect(0, 0, 1024, 300);

  ctx.fillStyle = '#1a110b';
  ctx.fillRect(0, 124, 1024, 30);
  const bottleColors = ['#b26e34', '#d1a45e', '#72804f', '#e4b979', '#a95534', '#caa16a'];
  for (let row = 0; row < 3; row += 1) {
    const y = 182 + row * 62;
    ctx.fillStyle = '#24170f';
    ctx.fillRect(0, y, 1024, 10);
    for (let i = 0; i < 26; i += 1) {
      const bx = 22 + i * 38;
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = bottleColors[(i + row) % bottleColors.length];
      ctx.fillRect(bx, y - 27, 7, 27);
      ctx.fillRect(bx + 2, y - 34, 3, 7);
      ctx.globalAlpha = 1;
    }
  }

  ctx.fillStyle = '#0e0b09';
  ctx.fillRect(382, 222, 258, 64);
  ctx.strokeStyle = 'rgba(246, 217, 172, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(382, 222, 258, 64);
  ctx.fillStyle = 'rgba(247, 227, 198, 0.8)';
  ctx.fillRect(402, 240, 70, 5);
  ctx.fillRect(402, 254, 120, 3);
  ctx.fillRect(402, 264, 94, 3);

  for (const lx of [150, 512, 870]) {
    ctx.fillStyle = 'rgba(8, 7, 6, 0.9)';
    ctx.fillRect(lx - 2, 0, 4, 64);
    ctx.fillStyle = '#a87543';
    ctx.beginPath();
    ctx.moveTo(lx - 30, 96);
    ctx.lineTo(lx + 30, 96);
    ctx.lineTo(lx + 16, 71);
    ctx.lineTo(lx - 16, 71);
    ctx.closePath();
    ctx.fill();
    const glow = ctx.createRadialGradient(lx, 106, 1, lx, 106, 84);
    glow.addColorStop(0, 'rgba(255, 245, 213, 1)');
    glow.addColorStop(0.1, 'rgba(255, 201, 127, 0.8)');
    glow.addColorStop(0.45, 'rgba(255, 150, 70, 0.14)');
    glow.addColorStop(1, 'rgba(255, 140, 70, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 90, 18, 180, 180);
  }

  const counter = ctx.createLinearGradient(0, 366, 0, 512);
  counter.addColorStop(0, '#2b1b10');
  counter.addColorStop(0.5, '#100c09');
  counter.addColorStop(1, '#080605');
  ctx.fillStyle = counter;
  ctx.fillRect(0, 366, 1024, 146);
  ctx.fillStyle = 'rgba(255, 214, 160, 0.34)';
  ctx.fillRect(0, 370, 1024, 5);
  for (let i = 0; i < 12; i += 1) {
    ctx.fillStyle = `rgba(255, 206, 150, ${0.02 + Math.random() * 0.05})`;
    ctx.fillRect(0, 30 + Math.random() * 330, 1024, 2);
  }

  return toTexture(canvas, { repeat: [1, 1] });
}


export function createPlasterTexture(seed = 3) {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const random = rng(seed);
  ctx.fillStyle = '#e9dcc9';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 34; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const radius = 45 + random() * 160;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, random() > 0.5 ? 'rgba(210,191,166,0.1)' : 'rgba(255,250,240,0.14)');
    grad.addColorStop(1, 'rgba(255,250,240,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  ctx.lineWidth = 1;
  for (let i = 0; i < 18; i += 1) {
    ctx.strokeStyle = random() > 0.5 ? 'rgba(162,140,113,0.06)' : 'rgba(255,250,240,0.07)';
    const x = random() * size;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 16, size * 0.35, x - 12, size * 0.7, x + 6, size);
    ctx.stroke();
  }
  speckle(ctx, size, size, random, 4500, ['rgba(162,140,113,0.12)', 'rgba(255,250,240,0.16)']);
  return toTexture(canvas, { repeat: [2, 2] });
}

export function createBrickTexture(seed = 11) {
  const width = 512;
  const height = 512;
  const { canvas, ctx } = makeCanvas(width, height);
  const random = rng(seed);
  const brickW = 62;
  const brickH = 27;
  ctx.fillStyle = '#a77c62';
  ctx.fillRect(0, 0, width, height);
  for (let row = 0; row < Math.ceil(height / brickH); row += 1) {
    const offset = row % 2 === 0 ? 0 : -brickW / 2;
    for (let col = -1; col < Math.ceil(width / brickW) + 1; col += 1) {
      const x = col * brickW + offset;
      const y = row * brickH;
      const shade = 150 + (random() * 30) | 0;
      ctx.fillStyle = `rgb(${shade + 25}, ${shade - 2}, ${shade - 30})`;
      ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4);
      ctx.fillStyle = `rgba(255, 240, 220, ${0.05 + random() * 0.05})`;
      ctx.fillRect(x + 4, y + 4, brickW - 8, 3);
    }
  }
  speckle(ctx, width, height, random, 3200, ['rgba(86,58,44,0.14)', 'rgba(226,199,172,0.2)']);
  return toTexture(canvas, { repeat: [1, 1] });
}

export function createAsphaltTexture(seed = 21) {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const random = rng(seed);
  ctx.fillStyle = '#45423d';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 26; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const radius = 20 + random() * 90;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, random() > 0.5 ? 'rgba(29,28,26,0.18)' : 'rgba(115,109,98,0.12)');
    grad.addColorStop(1, 'rgba(29,28,26,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  speckle(ctx, size, size, random, 12000, ['rgba(22,21,20,0.4)', 'rgba(128,120,108,0.22)', 'rgba(78,74,68,0.25)'], 1.3);
  ctx.strokeStyle = 'rgba(28,27,25,0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i += 1) {
    ctx.beginPath();
    let x = random() * size;
    let y = random() * size;
    ctx.moveTo(x, y);
    for (let step = 0; step < 4; step += 1) {
      x += (random() - 0.5) * 90;
      y += (random() - 0.5) * 90;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return toTexture(canvas, { repeat: [1, 1] });
}

export function createPavementTexture(seed = 31) {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const random = rng(seed);
  ctx.fillStyle = '#bcb0a0';
  ctx.fillRect(0, 0, size, size);
  const cell = size / 4;
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const shade = 178 + (random() * 18) | 0;
      ctx.fillStyle = `rgb(${shade + 8}, ${shade}, ${shade - 14})`;
      ctx.fillRect(col * cell + 2, row * cell + 2, cell - 4, cell - 4);
      const x = col * cell + cell * (0.2 + random() * 0.6);
      const y = row * cell + cell * (0.2 + random() * 0.6);
      const radius = cell * (0.25 + random() * 0.4);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, random() > 0.5 ? 'rgba(245,238,225,0.2)' : 'rgba(125,113,98,0.13)');
      grad.addColorStop(1, 'rgba(245,238,225,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(col * cell, row * cell, cell, cell);
    }
  }
  ctx.strokeStyle = 'rgba(112,101,88,0.42)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, size);
    ctx.moveTo(0, i * cell);
    ctx.lineTo(size, i * cell);
    ctx.stroke();
  }
  speckle(ctx, size, size, random, 4000, ['rgba(116,103,88,0.15)', 'rgba(246,239,226,0.18)'], 1);
  return toTexture(canvas, { repeat: [1, 1] });
}

export function createOakTexture(seed = 41) {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const random = rng(seed);
  ctx.fillStyle = '#a97d50';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 20; i += 1) {
    const x = random() * size;
    ctx.fillStyle = random() > 0.5 ? 'rgba(109,74,44,0.09)' : 'rgba(222,181,130,0.1)';
    ctx.fillRect(x, 0, 10 + random() * 40, size);
  }
  for (let i = 0; i < 250; i += 1) {
    const x = random() * size;
    const alpha = 0.03 + random() * 0.08;
    ctx.strokeStyle = random() > 0.55 ? `rgba(94,62,36,${alpha})` : `rgba(235,198,151,${alpha})`;
    ctx.lineWidth = 0.5 + random() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, -4);
    ctx.bezierCurveTo(x + (random() - 0.5) * 16, size * 0.33, x + (random() - 0.5) * 16, size * 0.66, x + (random() - 0.5) * 8, size + 4);
    ctx.stroke();
  }
  return toTexture(canvas, { repeat: [1, 2] });
}

export function createTerrazzoTexture(seed = 51) {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const random = rng(seed);
  ctx.fillStyle = '#d8c8b2';
  ctx.fillRect(0, 0, size, size);
  const chips = ['#8a7762', '#b4683f', '#6e7459', '#efe3d2', '#55483c', '#cba980'];
  for (let i = 0; i < 1200; i += 1) {
    ctx.fillStyle = chips[(random() * chips.length) | 0];
    ctx.globalAlpha = 0.2 + random() * 0.45;
    const x = random() * size;
    const y = random() * size;
    const radius = 0.6 + random() * 2.8;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * (0.5 + random() * 0.5), random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return toTexture(canvas, { repeat: [3, 3] });
}

export function createAwningTexture(seed = 61) {
  const width = 512;
  const height = 128;
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.fillStyle = '#efe0ca';
  ctx.fillRect(0, 0, width, height);
  const stripe = 64;
  for (let x = -stripe; x < width + stripe; x += stripe * 2) {
    ctx.fillStyle = '#b4683f';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + stripe, 0);
    ctx.lineTo(x + stripe + 18, height);
    ctx.lineTo(x + 18, height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,250,240,0.12)';
  ctx.fillRect(0, 0, width, 10);
  return toTexture(canvas, { repeat: [1, 1] });
}

export function createRainGlassTexture(seed = 71) {
  const width = 256;
  const height = 512;
  const { canvas, ctx } = makeCanvas(width, height);
  const random = rng(seed);
  ctx.clearRect(0, 0, width, height);
  for (let i = 0; i < 90; i += 1) {
    const x = random() * width;
    const y = random() * height;
    const len = 14 + random() * 90;
    const alpha = 0.06 + random() * 0.2;
    ctx.strokeStyle = `rgba(236,244,242,${alpha})`;
    ctx.lineWidth = 0.6 + random() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + (random() - 0.5) * 7, y + len * 0.35, x + (random() - 0.5) * 8, y + len * 0.7, x + (random() - 0.5) * 5, y + len);
    ctx.stroke();
  }
  for (let i = 0; i < 180; i += 1) {
    ctx.fillStyle = `rgba(240,246,243,${0.03 + random() * 0.14})`;
    const r = 0.5 + random() * 1.6;
    ctx.beginPath();
    ctx.arc(random() * width, random() * height, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = toTexture(canvas, { repeat: [1, 1], srgb: false });
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createSteamTexture() {
  const size = 128;
  const { canvas, ctx } = makeCanvas(size, size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.45)');
  grad.addColorStop(0.35, 'rgba(255,250,242,0.22)');
  grad.addColorStop(1, 'rgba(255,250,242,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas, { repeat: [1, 1] });
}

/* --------------------------------------------------------------------------
   Lettered signs and menus
   -------------------------------------------------------------------------- */

function drawText(ctx, text, x, y, font, color, align = 'center') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

export function createSignTexture({
  width = 1024,
  height = 320,
  background = '#f3e7d6',
  foreground = '#2a211a',
  accent = '#b4683f',
  title = '檐下咖啡',
  subtitle = 'EAVES COFFEE · HANGZHOU',
  vertical = false
} = {}) {
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(42,33,26,0.18)';
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, width - 28, height - 28);

  if (vertical) {
    const chars = [...title];
    const step = (height - 100) / Math.max(1, chars.length);
    chars.forEach((char, i) => {
      drawText(ctx, char, width / 2, 58 + i * step, `600 ${Math.min(100, step * 0.72)}px "Songti SC","STSong","Microsoft YaHei",serif`, foreground);
    });
    drawText(ctx, subtitle, width / 2, height - 46, '500 18px Georgia, serif', accent);
    return toTexture(canvas, { repeat: [1, 1] });
  }

  drawText(ctx, title, width / 2, height * 0.42, '600 132px "Songti SC","STSong","Noto Serif SC","Microsoft YaHei",serif', foreground);
  drawText(ctx, subtitle, width / 2, height * 0.72, '500 28px Georgia, "Times New Roman", serif', accent);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width * 0.38, height * 0.82);
  ctx.lineTo(width * 0.62, height * 0.82);
  ctx.stroke();
  return toTexture(canvas, { repeat: [1, 1] });
}

export function createMenuTexture() {
  const width = 1024;
  const height = 720;
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.fillStyle = '#2f2b25';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(243,232,218,0.22)';
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, width - 44, height - 44);

  drawText(ctx, '檐下咖啡', width / 2, 100, '600 72px "Songti SC","STSong","Microsoft YaHei",serif', '#f1e4d2');
  drawText(ctx, 'EAVES COFFEE · EST. 2026', width / 2, 160, '400 22px Georgia, serif', 'rgba(241,228,210,0.62)');

  const columns = [
    {
      x: 82,
      title: '咖啡 / COFFEE',
      items: [
        ['美式咖啡', 'AMERICANO', '22'],
        ['燕麦拿铁', 'OAT LATTE', '28'],
        ['桂花乌龙冷萃', 'OSMANTHUS COLD BREW', '30'],
        ['海盐焦糖拿铁', 'SEA SALT CARAMEL', '32']
      ]
    },
    {
      x: 560,
      title: '果茶 / FRUIT TEA',
      items: [
        ['蜜桃乌龙', 'PEACH OOLONG', '26'],
        ['青提茉莉', 'JASMINE GRAPE', '26'],
        ['血橙气泡', 'BLOOD ORANGE FIZZ', '24'],
        ['今日手冲', 'POUR OVER', '30']
      ]
    }
  ];

  for (const column of columns) {
    drawText(ctx, column.title, column.x, 245, '500 26px Georgia, "Songti SC", serif', '#d7ad84');
    column.items.forEach(([name, en, price], index) => {
      const y = 305 + index * 82;
      drawText(ctx, name, column.x, y, '500 32px "Songti SC","STSong","Microsoft YaHei",serif', '#f1e4d2', 'left');
      drawText(ctx, en, column.x, y + 30, '400 14px Georgia, serif', 'rgba(241,228,210,0.48)', 'left');
      drawText(ctx, `¥ ${price}`, column.x + 400, y + 8, '400 24px Georgia, serif', '#d7ad84', 'right');
    });
  }
  drawText(ctx, '今日烘焙 · 云南保山 / 手冲豆单请询问咖啡师', width / 2, height - 70, '400 18px "Songti SC","Microsoft YaHei",serif', 'rgba(241,228,210,0.5)');
  return toTexture(canvas, { repeat: [1, 1] });
}

export function createChalkboardTexture() {
  const width = 640;
  const height = 840;
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.fillStyle = '#30342d';
  ctx.fillRect(0, 0, width, height);
  drawText(ctx, '今日', width / 2, 110, '600 76px "Songti SC","STSong","Microsoft YaHei",serif', '#e8ddca');
  drawText(ctx, 'TODAY', width / 2, 172, '400 24px Georgia, serif', 'rgba(232,221,202,0.62)');
  ctx.strokeStyle = 'rgba(232,221,202,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(120, 218);
  ctx.lineTo(width - 120, 218);
  ctx.stroke();
  const lines = [
    ['燕麦拿铁', '28'],
    ['桂花冷萃', '30'],
    ['蜜桃乌龙', '26'],
    ['青提茉莉', '26']
  ];
  lines.forEach(([name, price], i) => {
    drawText(ctx, name, 120, 310 + i * 104, '600 50px "Songti SC","STSong","Microsoft YaHei",serif', '#ede3d2', 'left');
    drawText(ctx, price, width - 120, 310 + i * 104, '400 36px Georgia, serif', '#d7ad84', 'right');
  });
  drawText(ctx, '晴天有光，雨天有檐。', width / 2, height - 90, '400 24px "Songti SC", serif', 'rgba(232,221,202,0.7)');
  return toTexture(canvas, { repeat: [1, 1] });
}

export function createStreetSignTexture(main, sub = '') {
  const width = 512;
  const height = 180;
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.fillStyle = '#e9e3d6';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#2c4b57';
  ctx.fillRect(0, 0, 34, height);
  drawText(ctx, main, 70, sub ? 68 : 90, '500 56px "Songti SC","Microsoft YaHei",sans-serif', '#2c3a3b', 'left');
  if (sub) drawText(ctx, sub, 72, 122, '400 20px Georgia, serif', 'rgba(44,58,59,0.65)', 'left');
  return toTexture(canvas, { repeat: [1, 1] });
}

/* --------------------------------------------------------------------------
   Environment for PBR reflections
   -------------------------------------------------------------------------- */

export function createEnvironmentMap(renderer, mode = 'day') {
  const width = 1024;
  const height = 512;
  const { canvas, ctx } = makeCanvas(width, height);
  const night = mode === 'night';
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  if (night) {
    gradient.addColorStop(0, '#04060f');
    gradient.addColorStop(0.25, '#0f1122');
    gradient.addColorStop(0.45, '#241d35');
    gradient.addColorStop(0.5, '#392a43');
    gradient.addColorStop(0.56, '#17121c');
    gradient.addColorStop(1, '#030204');
  } else {
    gradient.addColorStop(0, '#86a9bb');
    gradient.addColorStop(0.38, '#d7e3df');
    gradient.addColorStop(0.52, '#f0e5d2');
    gradient.addColorStop(0.6, '#cbb79d');
    gradient.addColorStop(1, '#5d5146');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  if (night) {
    /* Cool moon bloom. */
    const moon = ctx.createRadialGradient(width * 0.2, height * 0.3, 2, width * 0.2, height * 0.3, 150);
    moon.addColorStop(0, 'rgba(225, 235, 255, 0.35)');
    moon.addColorStop(0.2, 'rgba(145, 170, 220, 0.16)');
    moon.addColorStop(1, 'rgba(60, 80, 140, 0)');
    ctx.fillStyle = moon;
    ctx.fillRect(0, 0, width, height);

    /* Warm shopfront band and violet neon spill at street level. */
    const warm = ctx.createLinearGradient(0, height * 0.46, 0, height * 0.64);
    warm.addColorStop(0, 'rgba(255, 180, 95, 0)');
    warm.addColorStop(0.45, 'rgba(255, 190, 115, 0.52)');
    warm.addColorStop(1, 'rgba(255, 135, 65, 0)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, height * 0.46, width, height * 0.18);
    const violet = ctx.createRadialGradient(width * 0.38, height * 0.5, 0, width * 0.38, height * 0.5, 210);
    violet.addColorStop(0, 'rgba(165, 95, 240, 0.32)');
    violet.addColorStop(0.4, 'rgba(105, 65, 180, 0.12)');
    violet.addColorStop(1, 'rgba(50, 30, 90, 0)');
    ctx.fillStyle = violet;
    ctx.fillRect(0, 0, width, height);
  } else {
    const sun = ctx.createRadialGradient(width * 0.24, height * 0.32, 2, width * 0.24, height * 0.32, 190);
    sun.addColorStop(0, 'rgba(255,246,224,1)');
    sun.addColorStop(0.2, 'rgba(255,230,190,0.72)');
    sun.addColorStop(1, 'rgba(255,192,128,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, width, height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader?.();
  const env = pmrem.fromEquirectangular(texture).texture;
  texture.dispose();
  pmrem.dispose();
  return env;
}

/* --------------------------------------------------------------------------
   Material library
   -------------------------------------------------------------------------- */

export function createMaterials() {
  const plasterMap = createPlasterTexture(3);
  const plasterMapWarm = createPlasterTexture(17);
  const brickMap = createBrickTexture();
  const asphaltMap = createAsphaltTexture();
  const pavementMap = createPavementTexture();
  const oakMap = createOakTexture();
  const terrazzoMap = createTerrazzoTexture();
  const awningMap = createAwningTexture();
  const rainGlassMap = createRainGlassTexture();
  const steamMap = createSteamTexture();
  const menuMap = createMenuTexture();
  const chalkMap = createChalkboardTexture();
  const plasterBump = createBumpTexture(201, 512, 1.15);
  const asphaltBump = createBumpTexture(211, 512, 1.6);
  const pavementBump = createBumpTexture(221, 512, 0.8);
  const oakBump = createBumpTexture(231, 512, 0.55);
  const barkBump = createBumpTexture(241, 512, 1.2);
  const glowWarmMap = createGlowTexture('warm');
  const glowVioletMap = createGlowTexture('violet');
  const glowCoolMap = createGlowTexture('cool');
  const reflectionWarmMap = createReflectionTexture('warm');
  const reflectionVioletMap = createReflectionTexture('violet');
  const storefrontMap = createStorefrontInteriorTexture();
  const grimeMap = createGrimeTexture();

  const textures = [
    plasterMap, plasterMapWarm, brickMap, asphaltMap, pavementMap, oakMap,
    terrazzoMap, awningMap, rainGlassMap, steamMap, menuMap, chalkMap,
    plasterBump, asphaltBump, pavementBump, oakBump, barkBump,
    glowWarmMap, glowVioletMap, glowCoolMap, reflectionWarmMap, reflectionVioletMap,
    storefrontMap, grimeMap
  ];

  const MAT = {};

  MAT.plaster = new THREE.MeshStandardMaterial({
    color: 0xf3e7d5,
    map: plasterMap,
    bumpMap: plasterBump,
    bumpScale: 0.022,
    roughness: 0.95,
    metalness: 0,
    envMapIntensity: 0.4
  });

  MAT.plasterWarm = new THREE.MeshStandardMaterial({
    color: 0xe8d3b6,
    map: plasterMapWarm,
    bumpMap: plasterBump,
    bumpScale: 0.026,
    roughness: 0.96,
    metalness: 0,
    envMapIntensity: 0.32
  });

  MAT.plasterPale = new THREE.MeshStandardMaterial({
    color: 0xf5efe4,
    map: plasterMap,
    bumpMap: plasterBump,
    bumpScale: 0.02,
    roughness: 0.98,
    metalness: 0,
    envMapIntensity: 0.3
  });

  MAT.brick = new THREE.MeshStandardMaterial({
    color: 0xc79a7b,
    map: brickMap,
    bumpMap: plasterBump,
    bumpScale: 0.045,
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.25
  });

  MAT.brickDark = new THREE.MeshStandardMaterial({
    color: 0x8b6753,
    map: brickMap,
    bumpMap: plasterBump,
    bumpScale: 0.04,
    roughness: 0.95,
    metalness: 0,
    envMapIntensity: 0.2
  });

  MAT.asphalt = new THREE.MeshPhysicalMaterial({
    color: 0x4e4b45,
    map: asphaltMap,
    bumpMap: asphaltBump,
    bumpScale: 0.045,
    roughness: 0.76,
    metalness: 0.02,
    clearcoat: 0.08,
    clearcoatRoughness: 0.6,
    envMapIntensity: 0.4
  });

  MAT.pavement = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: pavementMap,
    bumpMap: pavementBump,
    bumpScale: 0.02,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.28
  });

  MAT.curb = new THREE.MeshStandardMaterial({
    color: 0xb8ad9d,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.25
  });

  MAT.oak = new THREE.MeshStandardMaterial({
    color: 0xb58a5d,
    map: oakMap,
    bumpMap: oakBump,
    bumpScale: 0.012,
    roughness: 0.62,
    metalness: 0,
    envMapIntensity: 0.3
  });

  MAT.oakDark = new THREE.MeshStandardMaterial({
    color: 0x7c5638,
    map: oakMap,
    bumpMap: oakBump,
    bumpScale: 0.014,
    roughness: 0.68,
    metalness: 0,
    envMapIntensity: 0.25
  });

  MAT.oakPale = new THREE.MeshStandardMaterial({
    color: 0xcba87c,
    map: oakMap,
    bumpMap: oakBump,
    bumpScale: 0.01,
    roughness: 0.58,
    metalness: 0,
    envMapIntensity: 0.35
  });

  MAT.terrazzo = new THREE.MeshStandardMaterial({
    color: 0xe1d2bd,
    map: terrazzoMap,
    bumpMap: pavementBump,
    bumpScale: 0.012,
    roughness: 0.42,
    metalness: 0,
    envMapIntensity: 0.55
  });

  MAT.awning = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: awningMap,
    roughness: 0.88,
    metalness: 0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.25
  });

  MAT.glass = new THREE.MeshPhysicalMaterial({
    color: 0xcfdbd8,
    metalness: 0,
    roughness: 0.06,
    transparent: true,
    opacity: 0.16,
    ior: 1.5,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 1.35
  });

  MAT.glassDark = new THREE.MeshPhysicalMaterial({
    color: 0x5d6b6b,
    metalness: 0.05,
    roughness: 0.12,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 1
  });

  MAT.windowGlass = new THREE.MeshPhysicalMaterial({
    color: 0xe6efea,
    metalness: 0,
    roughness: 0.22,
    transparent: true,
    opacity: 0.07,
    ior: 1.45,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 0.16
  });

  MAT.metal = new THREE.MeshStandardMaterial({
    color: 0x4b4540,
    metalness: 0.62,
    roughness: 0.38,
    envMapIntensity: 0.8
  });

  MAT.metalDark = new THREE.MeshStandardMaterial({
    color: 0x2b2724,
    metalness: 0.5,
    roughness: 0.42,
    envMapIntensity: 0.6
  });

  MAT.brass = new THREE.MeshStandardMaterial({
    color: 0xb08654,
    metalness: 0.78,
    roughness: 0.28,
    envMapIntensity: 1.1
  });

  MAT.stone = new THREE.MeshStandardMaterial({
    color: 0xc9bba7,
    roughness: 0.62,
    metalness: 0,
    envMapIntensity: 0.5
  });

  MAT.chrome = new THREE.MeshStandardMaterial({
    color: 0xbfc4c2,
    metalness: 0.92,
    roughness: 0.18,
    envMapIntensity: 1.2
  });

  MAT.rubber = new THREE.MeshStandardMaterial({
    color: 0x1f1d1a,
    roughness: 0.88,
    metalness: 0,
    envMapIntensity: 0.2
  });

  MAT.fabric = new THREE.MeshStandardMaterial({
    color: 0xd8c5ac,
    roughness: 0.98,
    metalness: 0,
    envMapIntensity: 0.12
  });

  MAT.fabricSage = new THREE.MeshStandardMaterial({
    color: 0x77805f,
    roughness: 0.98,
    metalness: 0,
    envMapIntensity: 0.12
  });

  MAT.fabricRust = new THREE.MeshStandardMaterial({
    color: 0x9e5d40,
    roughness: 0.98,
    metalness: 0,
    envMapIntensity: 0.12
  });

  MAT.fabricCream = new THREE.MeshStandardMaterial({
    color: 0xeee2d1,
    roughness: 0.98,
    metalness: 0,
    envMapIntensity: 0.12
  });

  MAT.soil = new THREE.MeshStandardMaterial({
    color: 0x4a382b,
    roughness: 1,
    metalness: 0
  });

  MAT.terracotta = new THREE.MeshStandardMaterial({
    color: 0xa9613d,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.25
  });

  MAT.foliage = new THREE.MeshStandardMaterial({
    color: 0x5e6c49,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.25
  });

  MAT.foliageLight = new THREE.MeshStandardMaterial({
    color: 0x7b875a,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.25
  });

  MAT.foliageDark = new THREE.MeshStandardMaterial({
    color: 0x3f4a35,
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.2
  });

  MAT.paper = new THREE.MeshStandardMaterial({
    color: 0xefe3d0,
    roughness: 0.96,
    metalness: 0
  });

  MAT.blackboard = new THREE.MeshStandardMaterial({
    color: 0x30342d,
    roughness: 0.94,
    metalness: 0
  });

  MAT.menuBoard = new THREE.MeshBasicMaterial({ map: menuMap, toneMapped: true });
  MAT.chalkboard = new THREE.MeshBasicMaterial({ map: chalkMap, toneMapped: true });

  MAT.carCream = new THREE.MeshStandardMaterial({
    color: 0xd8cdbd,
    metalness: 0.35,
    roughness: 0.32,
    envMapIntensity: 1
  });

  MAT.carSage = new THREE.MeshStandardMaterial({
    color: 0x8a9584,
    metalness: 0.32,
    roughness: 0.34,
    envMapIntensity: 1
  });

  MAT.carCharcoal = new THREE.MeshStandardMaterial({
    color: 0x464a4b,
    metalness: 0.45,
    roughness: 0.28,
    envMapIntensity: 1
  });

  MAT.carRust = new THREE.MeshStandardMaterial({
    color: 0xa96145,
    metalness: 0.28,
    roughness: 0.38,
    envMapIntensity: 1
  });

  MAT.busCream = new THREE.MeshStandardMaterial({
    color: 0xe7dcc8,
    metalness: 0.2,
    roughness: 0.45,
    envMapIntensity: 0.85
  });

  MAT.busTeal = new THREE.MeshStandardMaterial({
    color: 0x4f7373,
    metalness: 0.28,
    roughness: 0.4,
    envMapIntensity: 0.9
  });

  MAT.headlight = new THREE.MeshStandardMaterial({
    color: 0xfff4d4,
    emissive: 0xffd28c,
    emissiveIntensity: 1.4,
    roughness: 0.3,
    metalness: 0.1
  });

  MAT.taillight = new THREE.MeshStandardMaterial({
    color: 0x7c2b24,
    emissive: 0x8f2c22,
    emissiveIntensity: 0.8,
    roughness: 0.4,
    metalness: 0.2
  });

  MAT.warmGlow = new THREE.MeshBasicMaterial({
    color: 0xffbf82,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    toneMapped: true
  });

  MAT.windowGlow = new THREE.MeshBasicMaterial({
    color: 0xffd7a3,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    toneMapped: true
  });

  MAT.lampGlow = new THREE.MeshStandardMaterial({
    color: 0xffe6c4,
    emissive: 0xffbd79,
    emissiveIntensity: 1.1,
    roughness: 0.6,
    metalness: 0
  });

  MAT.screen = new THREE.MeshStandardMaterial({
    color: 0x9fc8b7,
    emissive: 0x66b4a1,
    emissiveIntensity: 1.5,
    roughness: 0.4,
    metalness: 0
  });

  MAT.coffee = new THREE.MeshStandardMaterial({
    color: 0x7a4b2c,
    roughness: 0.35,
    metalness: 0,
    envMapIntensity: 0.6
  });

  MAT.milk = new THREE.MeshStandardMaterial({
    color: 0xf0e4d2,
    roughness: 0.55,
    metalness: 0
  });

  MAT.teaGreen = new THREE.MeshStandardMaterial({
    color: 0xa6b571,
    roughness: 0.4,
    metalness: 0,
    envMapIntensity: 0.4
  });

  MAT.teaPeach = new THREE.MeshStandardMaterial({
    color: 0xd98a5c,
    roughness: 0.4,
    metalness: 0,
    envMapIntensity: 0.4
  });

  MAT.teaRed = new THREE.MeshStandardMaterial({
    color: 0xb94f3f,
    roughness: 0.4,
    metalness: 0,
    envMapIntensity: 0.4
  });

  MAT.skin = new THREE.MeshStandardMaterial({
    color: 0xc99773,
    roughness: 0.78,
    metalness: 0,
    envMapIntensity: 0.2
  });

  MAT.skinLight = new THREE.MeshStandardMaterial({
    color: 0xddb28e,
    roughness: 0.78,
    metalness: 0,
    envMapIntensity: 0.2
  });

  MAT.skinWarm = new THREE.MeshStandardMaterial({
    color: 0xb27b56,
    roughness: 0.78,
    metalness: 0,
    envMapIntensity: 0.2
  });

  MAT.hairDark = new THREE.MeshStandardMaterial({
    color: 0x332922,
    roughness: 0.84,
    metalness: 0,
    envMapIntensity: 0.15
  });

  MAT.hairBrown = new THREE.MeshStandardMaterial({
    color: 0x5d4432,
    roughness: 0.84,
    metalness: 0,
    envMapIntensity: 0.15
  });

  MAT.hairGrey = new THREE.MeshStandardMaterial({
    color: 0x8a8276,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.15
  });

  MAT.denim = new THREE.MeshStandardMaterial({
    color: 0x56616c,
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.1
  });

  MAT.shirtBlue = new THREE.MeshStandardMaterial({
    color: 0x7f98a0,
    roughness: 0.88,
    metalness: 0,
    envMapIntensity: 0.1
  });

  MAT.shirtCream = new THREE.MeshStandardMaterial({
    color: 0xe9ddcb,
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.1
  });

  MAT.shirtRust = new THREE.MeshStandardMaterial({
    color: 0x9f5e42,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.1
  });

  MAT.apron = new THREE.MeshStandardMaterial({
    color: 0x5a614c,
    roughness: 0.94,
    metalness: 0,
    envMapIntensity: 0.08
  });

  MAT.shoe = new THREE.MeshStandardMaterial({
    color: 0x342b25,
    roughness: 0.86,
    metalness: 0,
    envMapIntensity: 0.15
  });

  MAT.umbrellaCream = new THREE.MeshStandardMaterial({
    color: 0xe7d8c1,
    roughness: 0.82,
    metalness: 0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.2
  });

  MAT.umbrellaRust = new THREE.MeshStandardMaterial({
    color: 0x9d5a3d,
    roughness: 0.82,
    metalness: 0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.2
  });

  MAT.umbrellaSage = new THREE.MeshStandardMaterial({
    color: 0x6c7660,
    roughness: 0.82,
    metalness: 0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.2
  });

  MAT.rainGlass = new THREE.MeshBasicMaterial({
    map: rainGlassMap,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true
  });

  MAT.grime = new THREE.MeshBasicMaterial({
    map: grimeMap,
    color: 0x2a1c14,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    toneMapped: true
  });

  MAT.trimStone = new THREE.MeshStandardMaterial({
    color: 0x9d8c77,
    roughness: 0.82,
    metalness: 0.02,
    envMapIntensity: 0.35
  });

  MAT.trimWood = new THREE.MeshStandardMaterial({
    color: 0x6f4c33,
    map: oakMap,
    bumpMap: oakBump,
    bumpScale: 0.01,
    roughness: 0.7,
    metalness: 0,
    envMapIntensity: 0.25
  });

  MAT.roofTile = new THREE.MeshStandardMaterial({
    color: 0x9a6248,
    map: brickMap,
    bumpMap: plasterBump,
    bumpScale: 0.02,
    roughness: 0.86,
    metalness: 0.03,
    envMapIntensity: 0.3
  });

  MAT.ventMetal = new THREE.MeshStandardMaterial({
    color: 0x8d9399,
    roughness: 0.48,
    metalness: 0.72,
    envMapIntensity: 0.8
  });

  MAT.pipeCopper = new THREE.MeshStandardMaterial({
    color: 0x8b6245,
    roughness: 0.38,
    metalness: 0.78,
    envMapIntensity: 0.7
  });

  MAT.grille = new THREE.MeshStandardMaterial({
    color: 0x26282b,
    roughness: 0.5,
    metalness: 0.55,
    envMapIntensity: 0.4
  });

  MAT.ceramic = new THREE.MeshStandardMaterial({
    color: 0xd8d2c5,
    roughness: 0.4,
    metalness: 0.02,
    envMapIntensity: 0.5
  });

  MAT.storefrontWash = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.5, 0.72, 0.3),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true
  });

  MAT.storefrontInterior = new THREE.MeshBasicMaterial({
    map: storefrontMap,
    color: new THREE.Color(1.9, 1.6, 1.25),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true
  });

  MAT.neonAmber = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 0.68, 0.18) });
  MAT.neonWarmWhite = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.2, 0.95) });
  MAT.neonViolet = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.05, 0.3, 1.75) });
  MAT.neonPink = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.35, 0.9) });
  MAT.neonGreen = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.28, 1.25, 0.72) });

  MAT.busWindowGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.35, 0.95, 0.55) });

  MAT.glowSpriteWarm = new THREE.SpriteMaterial({
    map: glowWarmMap,
    color: 0xffb56a,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: true
  });

  MAT.glowSpriteViolet = new THREE.SpriteMaterial({
    map: glowVioletMap,
    color: 0x9b63e8,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: true
  });

  MAT.glowSpriteCool = new THREE.SpriteMaterial({
    map: glowCoolMap,
    color: 0x9eb9e8,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: true
  });

  MAT.poolWarm = new THREE.MeshBasicMaterial({
    map: glowWarmMap,
    color: 0xffae62,
    transparent: true,
    opacity: 0.13,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: true
  });

  MAT.poolViolet = new THREE.MeshBasicMaterial({
    map: glowVioletMap,
    color: 0x9c62e5,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: true
  });

  MAT.reflectionWarm = new THREE.MeshBasicMaterial({
    map: reflectionWarmMap,
    color: 0xffb365,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true
  });

  MAT.reflectionViolet = new THREE.MeshBasicMaterial({
    map: reflectionVioletMap,
    color: 0x9c63e8,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true
  });

  MAT.contactShadow = new THREE.MeshBasicMaterial({
    color: 0x000000,
    map: glowWarmMap,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    toneMapped: false
  });

  MAT.steam = new THREE.SpriteMaterial({
    map: steamMap,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.NormalBlending
  });

  MAT.puddle = new THREE.MeshPhysicalMaterial({
    color: 0x9aa6a4,
    metalness: 0.1,
    roughness: 0.05,
    transparent: true,
    opacity: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.6,
    depthWrite: false
  });

  MAT.textures = textures;
  MAT.dispose = () => {
    for (const texture of textures) texture.dispose();
    for (const material of Object.values(MAT)) {
      if (material && material.isMaterial) {
        material.dispose();
      }
    }
  };

  return MAT;
}

export function createSignMaterial(options) {
  const texture = createSignTexture(options);
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: true });
  if (options.brightness) {
    material.color.setScalar(options.brightness);
  }
  return { material, texture };
}

export function createStreetSignMaterial(main, sub) {
  const texture = createStreetSignTexture(main, sub);
  return new THREE.MeshBasicMaterial({ map: texture, toneMapped: true });
}





