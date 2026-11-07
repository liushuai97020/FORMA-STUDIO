// ==========================================================================
// Dune Garden — procedural material maps
//
// Every surface in the courtyard is drawn to a canvas at runtime: sand-toned
// paving with running-bond joints, board-formed concrete, weathered timber,
// decking, soil and bark. No image files, no network requests.
// ==========================================================================

import * as THREE from 'three';

const TAU = Math.PI * 2;

/* Deterministic pseudo-random so the garden is identical on every load. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function toTexture(canvas, { repeat = [1, 1], srgb = true } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 8;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function softBlob(ctx, x, y, rx, ry, color, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(1, ry / Math.max(rx, 0.001));
  ctx.translate(-x, -y);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(rx, ry), 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* --------------------------------------------------------------------------
   Paving — warm limestone in a 2:1 running bond. The map covers 4.8 m.
   -------------------------------------------------------------------------- */

export function createPavingTexture({ size = 1024, repeat = [4.5, 4.5] } = {}) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(74291);

  ctx.fillStyle = '#b3a68e';
  ctx.fillRect(0, 0, size, size);

  const tileW = size / 4;
  const tileH = size / 8;
  const tones = [
    '#d9ceb9',
    '#d4c8b2',
    '#cfc2aa',
    '#ddd2be',
    '#d6cab4',
    '#cabca4',
    '#d1c5ae',
    '#dbd0bb',
  ];

  for (let row = 0; row < 8; row += 1) {
    const offset = (row % 2) * tileW * 0.5;
    for (let col = -1; col < 5; col += 1) {
      const x = col * tileW + offset;
      const y = row * tileH;
      const inset = 2.2;
      const w = tileW - inset * 2;
      const h = tileH - inset * 2;
      ctx.fillStyle = tones[Math.floor(rnd() * tones.length)];
      ctx.fillRect(x + inset, y + inset, w, h);

      // Limestone cloudiness inside every slab.
      for (let m = 0; m < 5; m += 1) {
        const bx = x + inset + rnd() * w;
        const by = y + inset + rnd() * h;
        const r = 12 + rnd() * 46;
        const tone = rnd() > 0.5 ? 'rgba(255,250,238,' : 'rgba(120,108,86,';
        softBlob(ctx, bx, by, r, r * (0.4 + rnd() * 0.5), tone + '0.16)', 1);
      }

      // A hairline of wear along each slab edge.
      ctx.strokeStyle = 'rgba(126,114,92,0.16)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + inset + 0.5, y + inset + 0.5, w - 1, h - 1);
    }
  }

  // Sand drift and fine aggregate.
  for (let i = 0; i < 26000; i += 1) {
    const x = rnd() * size;
    const y = rnd() * size;
    const light = rnd() > 0.5;
    ctx.fillStyle = light
      ? `rgba(255,249,235,${0.04 + rnd() * 0.14})`
      : `rgba(102,90,70,${0.03 + rnd() * 0.1})`;
    const r = rnd() < 0.92 ? 1 : 2;
    ctx.fillRect(x, y, r, r);
  }

  // Broad tonal variation so large paving fields never look flat.
  for (let i = 0; i < 22; i += 1) {
    softBlob(
      ctx,
      rnd() * size,
      rnd() * size,
      80 + rnd() * 200,
      60 + rnd() * 160,
      rnd() > 0.5 ? 'rgba(120,104,78,0.1)' : 'rgba(255,248,232,0.12)',
      1,
    );
  }

  return toTexture(canvas, { repeat });
}

/* --------------------------------------------------------------------------
   Dune sand — very fine grain with wind ripples. The map covers ~10 m.
   -------------------------------------------------------------------------- */

export function createSandTexture({ size = 1024, repeat = [26, 26] } = {}) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(51207);

  ctx.fillStyle = '#ddcdad';
  ctx.fillRect(0, 0, size, size);

  // Broad tonal drift, kept quiet so large sand fields stay calm.
  for (let i = 0; i < 42; i += 1) {
    softBlob(
      ctx,
      rnd() * size,
      rnd() * size,
      90 + rnd() * 240,
      70 + rnd() * 180,
      rnd() > 0.45 ? 'rgba(238,225,199,0.14)' : 'rgba(170,151,120,0.1)',
      1,
    );
  }

  // Faint wind drift lines.
  ctx.lineWidth = 3.5;
  for (let i = 0; i < 26; i += 1) {
    const y = rnd() * size;
    const amp = 2 + rnd() * 6;
    const freq = 0.002 + rnd() * 0.004;
    const phase = rnd() * TAU;
    ctx.strokeStyle =
      rnd() > 0.5 ? 'rgba(246,235,213,0.07)' : 'rgba(160,140,108,0.06)';
    ctx.beginPath();
    for (let x = -20; x <= size + 20; x += 14) {
      const yy = y + Math.sin(x * freq + phase) * amp;
      if (x === -20) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  // Fine grains.
  for (let i = 0; i < 62000; i += 1) {
    const x = rnd() * size;
    const y = rnd() * size;
    const light = rnd() > 0.42;
    ctx.fillStyle = light
      ? `rgba(255,247,228,${0.05 + rnd() * 0.16})`
      : `rgba(128,108,78,${0.03 + rnd() * 0.12})`;
    ctx.fillRect(x, y, rnd() < 0.92 ? 1 : 2, 1);
  }

  // Sparse dry vegetation flecks so the far sand is not sterile.
  for (let i = 0; i < 260; i += 1) {
    ctx.fillStyle = `rgba(116,112,80,${0.08 + rnd() * 0.18})`;
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd() * 3);
  }

  return toTexture(canvas, { repeat });
}

/* --------------------------------------------------------------------------
   Board-formed concrete. The map covers 2.4 m × 1.8 m; boards run horizontally.
   -------------------------------------------------------------------------- */

export function createConcreteTexture({ size = 1024, repeat = [1, 1] } = {}) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(33119);

  ctx.fillStyle = '#b9b0a0';
  ctx.fillRect(0, 0, size, size);

  const bands = 12;
  const bandH = size / bands;
  const bandTones = ['#bdb5a5', '#b8af9f', '#c1b9a9', '#b4ab9b', '#beb6a6'];

  for (let b = 0; b < bands; b += 1) {
    const y = b * bandH;
    ctx.fillStyle = bandTones[Math.floor(rnd() * bandTones.length)];
    ctx.fillRect(0, y, size, bandH);

    // Wood-grain lines left by the formwork boards.
    for (let i = 0; i < 26; i += 1) {
      const gy = y + 2 + rnd() * (bandH - 4);
      ctx.strokeStyle = `rgba(96,88,74,${0.04 + rnd() * 0.1})`;
      ctx.lineWidth = 0.8 + rnd() * 1.3;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      for (let x = 0; x <= size; x += 64) {
        ctx.lineTo(x, gy + Math.sin(x * 0.01 + rnd() * 6) * 1.6 + (rnd() - 0.5) * 1.2);
      }
      ctx.stroke();
    }

    // Shadowed board joint.
    ctx.fillStyle = 'rgba(70,63,52,0.5)';
    ctx.fillRect(0, y, size, 2.2);
    ctx.fillStyle = 'rgba(255,250,238,0.26)';
    ctx.fillRect(0, y + 2.2, size, 1.4);
    const jointShade = ctx.createLinearGradient(0, y + 3, 0, y + bandH * 0.35);
    jointShade.addColorStop(0, 'rgba(70,63,52,0.12)');
    jointShade.addColorStop(1, 'rgba(70,63,52,0)');
    ctx.fillStyle = jointShade;
    ctx.fillRect(0, y + 3, size, bandH * 0.35);
  }

  // Form tie marks.
  for (let i = 0; i < 6; i += 1) {
    const x = (i + 0.5) * (size / 6);
    for (let j = 0; j < 6; j += 1) {
      const y = (j + 0.5) * (size / 6);
      ctx.fillStyle = 'rgba(90,82,68,0.18)';
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,250,238,0.14)';
      ctx.beginPath();
      ctx.arc(x - 0.8, y - 0.8, 1.4, 0, TAU);
      ctx.fill();
    }
  }

  // Concrete mottling and a few rain streaks.
  for (let i = 0; i < 900; i += 1) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,248,234,0.1)' : 'rgba(92,84,70,0.07)';
    ctx.fillRect(x, y, 1 + rnd() * 3, 1 + rnd() * 2);
  }
  for (let i = 0; i < 14; i += 1) {
    const x = rnd() * size;
    const w = 3 + rnd() * 18;
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, 'rgba(88,78,62,0.13)');
    gradient.addColorStop(1, 'rgba(88,78,62,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, 0, w, size * (0.3 + rnd() * 0.6));
  }

  return toTexture(canvas, { repeat });
}

/* --------------------------------------------------------------------------
   Weathered timber — long grain for pergola members. Covers ~1.2 m.
   -------------------------------------------------------------------------- */

export function createTimberTexture({ size = 512, repeat = [1, 1] } = {}) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(88013);

  ctx.fillStyle = '#ab8154';
  ctx.fillRect(0, 0, size, size);

  // Length-wise grain, slightly wavy.
  for (let i = 0; i < 340; i += 1) {
    const y = rnd() * size;
    const dark = rnd() > 0.48;
    ctx.strokeStyle = dark
      ? `rgba(94,64,34,${0.05 + rnd() * 0.14})`
      : `rgba(228,196,148,${0.04 + rnd() * 0.12})`;
    ctx.lineWidth = 0.6 + rnd() * 2.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 32) {
      ctx.lineTo(x, y + Math.sin(x * 0.017 + y * 0.05) * (1 + rnd() * 2));
    }
    ctx.stroke();
  }

  // Knots.
  for (let i = 0; i < 4; i += 1) {
    const x = rnd() * size;
    const y = rnd() * size;
    for (let ring = 5; ring > 0; ring -= 1) {
      ctx.strokeStyle = `rgba(74,46,22,${0.06 + ring * 0.03})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(x, y, ring * 2.6, ring * 4.6, 0, 0, TAU);
      ctx.stroke();
    }
  }

  return toTexture(canvas, { repeat });
}

/* --------------------------------------------------------------------------
   Decking — narrow boards with shadow gaps. Covers 1.0 m.
   -------------------------------------------------------------------------- */

export function createDeckTexture({ size = 512, repeat = [1, 1] } = {}) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(19441);

  ctx.fillStyle = '#6f5540';
  ctx.fillRect(0, 0, size, size);

  const boards = 7;
  const boardH = size / boards;
  const tones = ['#a98d68', '#a2864f', '#af9470', '#9d815b', '#a68a62'];

  for (let b = 0; b < boards; b += 1) {
    const y = b * boardH;
    ctx.fillStyle = tones[Math.floor(rnd() * tones.length)];
    ctx.fillRect(0, y + 1.5, size, boardH - 3);
    for (let i = 0; i < 34; i += 1) {
      const gy = y + 3 + rnd() * (boardH - 6);
      ctx.strokeStyle = `rgba(76, 56, 34, ${0.05 + rnd() * 0.11})`;
      ctx.lineWidth = 0.7 + rnd();
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(size * 0.3, gy + 2, size * 0.6, gy - 2, size, gy + 1);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(52, 38, 22, 0.4)';
    ctx.fillRect(0, y, size, 2);
  }

  return toTexture(canvas, { repeat });
}

/* --------------------------------------------------------------------------
   Soil and bark
   -------------------------------------------------------------------------- */

export function createSoilTexture({ size = 512, repeat = [1, 1] } = {}) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(66012);

  ctx.fillStyle = '#413224';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 6000; i += 1) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 1 + rnd() * 4;
    ctx.fillStyle =
      rnd() > 0.55
        ? `rgba(96,74,52,${0.1 + rnd() * 0.22})`
        : `rgba(22,16,10,${0.1 + rnd() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  for (let i = 0; i < 60; i += 1) {
    ctx.fillStyle = `rgba(150,128,98,${0.1 + rnd() * 0.2})`;
    ctx.beginPath();
    ctx.arc(rnd() * size, rnd() * size, 2 + rnd() * 5, 0, TAU);
    ctx.fill();
  }

  return toTexture(canvas, { repeat });
}

export function createBarkTexture({ size = 256, repeat = [1, 1] } = {}) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(10477);

  ctx.fillStyle = '#7d6f5c';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 240; i += 1) {
    const x = rnd() * size;
    const dark = rnd() > 0.45;
    ctx.strokeStyle = dark
      ? `rgba(58,50,40,${0.08 + rnd() * 0.24})`
      : `rgba(190,176,150,${0.05 + rnd() * 0.18})`;
    ctx.lineWidth = 0.7 + rnd() * 2.4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= size; y += 16) {
      ctx.lineTo(x + Math.sin(y * 0.06 + x) * 2.2, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 30; i += 1) {
    ctx.fillStyle = `rgba(48,40,30,${0.1 + rnd() * 0.2})`;
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 4 + rnd() * 22);
  }

  return toTexture(canvas, { repeat });
}

/* --------------------------------------------------------------------------
   Lime plaster — a quiet mottled finish for the house wall. Covers ~2.4 m.
   -------------------------------------------------------------------------- */

export function createPlasterTexture({ size = 512, repeat = [1, 1] } = {}) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(57391);

  ctx.fillStyle = '#e7decc';
  ctx.fillRect(0, 0, size, size);

  // Soft trowel clouds.
  for (let i = 0; i < 40; i += 1) {
    softBlob(
      ctx,
      rnd() * size,
      rnd() * size,
      30 + rnd() * 120,
      20 + rnd() * 80,
      rnd() > 0.5 ? 'rgba(255,250,238,0.06)' : 'rgba(178,163,140,0.035)',
      1,
    );
  }

  // Fine chalk grain.
  for (let i = 0; i < 26000; i += 1) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle =
      rnd() > 0.5
        ? `rgba(255,252,243,${0.04 + rnd() * 0.12})`
        : `rgba(150,136,113,${0.03 + rnd() * 0.1})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // A couple of hairline settlement cracks.
  for (let i = 0; i < 3; i += 1) {
    let x = rnd() * size;
    let y = rnd() * size;
    ctx.strokeStyle = `rgba(128,114,94,${0.05 + rnd() * 0.05})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 14; s += 1) {
      x += (rnd() - 0.5) * 22;
      y += rnd() * 18;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  return toTexture(canvas, { repeat });
}
