/* ==========================================================================
   CASA MAR — procedural textures
   --------------------------------------------------------------------------
   Every surface in the maquette is generated in the browser with the Canvas
   2D API. No image files, no network requests. Textures are intentionally
   quiet: the architecture is read through light, shadow and proportion, not
   through noisy maps.
   ========================================================================== */

import * as THREE from 'three';

/* Seeded pseudo-random so the house looks the same on every visit. */
function makeRandom(seed) {
  let state = seed >>> 0;
  return function random() {
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

function finish(canvas, { repeat = [1, 1], srgb = true, anisotropy = 8 } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = anisotropy;
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return texture;
}

function speckle(ctx, width, height, random, count, colors, maxRadius = 1.6) {
  for (let i = 0; i < count; i += 1) {
    ctx.fillStyle = colors[(random() * colors.length) | 0];
    const radius = 0.4 + random() * maxRadius;
    ctx.beginPath();
    ctx.arc(random() * width, random() * height, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* --------------------------------------------------------------------------
   Limewashed plaster — softly mottled white with a fine mineral grain
   -------------------------------------------------------------------------- */

export function createLimewash() {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const random = makeRandom(11);

  ctx.fillStyle = '#efe8dc';
  ctx.fillRect(0, 0, size, size);

  /* Large, almost invisible mineral clouds. */
  for (let i = 0; i < 30; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const radius = 55 + random() * 170;
    const warm = random() > 0.5;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, warm ? 'rgba(211, 196, 175, 0.10)' : 'rgba(255, 251, 242, 0.12)');
    gradient.addColorStop(1, 'rgba(255, 251, 242, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  /* Faint trowel streaks. */
  ctx.lineWidth = 1;
  for (let i = 0; i < 26; i += 1) {
    ctx.strokeStyle = random() > 0.5 ? 'rgba(203, 188, 168, 0.05)' : 'rgba(255, 252, 245, 0.07)';
    const x = random() * size;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 14, size * 0.35, x - 12, size * 0.7, x + 4, size);
    ctx.stroke();
  }

  speckle(ctx, size, size, random, 5200, [
    'rgba(202, 188, 168, 0.10)',
    'rgba(255, 252, 245, 0.16)',
    'rgba(178, 163, 143, 0.06)',
  ]);

  const map = finish(canvas, { repeat: [2, 2] });

  /* Roughness: a plaster surface is matte, with slight variation. */
  const rough = makeCanvas(256, 256);
  const rCtx = rough.ctx;
  rCtx.fillStyle = '#ececec';
  rCtx.fillRect(0, 0, 256, 256);
  const rRandom = makeRandom(23);
  for (let i = 0; i < 2400; i += 1) {
    const shade = 218 + (rRandom() * 30) | 0;
    rCtx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.35)`;
    const r = 0.6 + rRandom() * 3;
    rCtx.beginPath();
    rCtx.arc(rRandom() * 256, rRandom() * 256, r, 0, Math.PI * 2);
    rCtx.fill();
  }
  const roughnessMap = finish(rough.canvas, { repeat: [2, 2], srgb: false });

  return { map, roughnessMap };
}

/* --------------------------------------------------------------------------
   Travertine / limestone for copings, walls and the cliff base
   -------------------------------------------------------------------------- */

export function createStone() {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const random = makeRandom(47);

  ctx.fillStyle = '#d7cbb8';
  ctx.fillRect(0, 0, size, size);

  /* Sedimentary banding. */
  for (let i = 0; i < 90; i += 1) {
    const y = random() * size;
    const height = 1 + random() * 7;
    ctx.fillStyle = random() > 0.5 ? 'rgba(188, 172, 150, 0.08)' : 'rgba(244, 236, 222, 0.1)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y + random() * 14, size * 0.7, y - random() * 14, size, y + random() * 8);
    ctx.lineTo(size, y + height);
    ctx.lineTo(0, y + height);
    ctx.closePath();
    ctx.fill();
  }

  speckle(ctx, size, size, random, 9000, [
    'rgba(160, 144, 122, 0.14)',
    'rgba(246, 239, 227, 0.18)',
    'rgba(126, 112, 94, 0.07)',
  ], 1.1);

  return finish(canvas, { repeat: [2, 2] });
}

/* --------------------------------------------------------------------------
   Large-format stone paving — 2 x 2 slabs per tile with cut joints
   -------------------------------------------------------------------------- */

export function createPaving() {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const random = makeRandom(83);

  ctx.fillStyle = '#c5b6a2';
  ctx.fillRect(0, 0, size, size);

  const cell = size / 2;
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 2; column += 1) {
      const inset = 2.5;
      const shade = 210 + (random() * 16) | 0;
      ctx.fillStyle = `rgb(${shade + 16}, ${shade + 5}, ${shade - 12})`;
      ctx.fillRect(column * cell + inset, row * cell + inset, cell - inset * 2, cell - inset * 2);

      /* Very soft cloud in each slab. */
      const x = column * cell + cell * (0.25 + random() * 0.5);
      const y = row * cell + cell * (0.25 + random() * 0.5);
      const radius = cell * (0.3 + random() * 0.4);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, random() > 0.5 ? 'rgba(248, 241, 229, 0.16)' : 'rgba(176, 159, 137, 0.1)');
      gradient.addColorStop(1, 'rgba(248, 241, 229, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(column * cell, row * cell, cell, cell);

      /* Fine aggregate. */
      speckle(ctx, size, size, random, 1800, [
        'rgba(148, 132, 112, 0.15)',
        'rgba(250, 244, 232, 0.2)',
      ], 0.9);
    }
  }

  /* Joints drawn last so every slab reads separately. */
  ctx.strokeStyle = 'rgba(139, 124, 105, 0.5)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, cell);
  ctx.lineTo(size, cell);
  ctx.moveTo(cell, 0);
  ctx.lineTo(cell, size);
  ctx.stroke();

  return finish(canvas, { repeat: [4, 4] });
}

/* --------------------------------------------------------------------------
   Oak — a close, quiet grain for soffits, screens, floors and furniture
   -------------------------------------------------------------------------- */

export function createOak() {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const random = makeRandom(131);

  ctx.fillStyle = '#bb9164';
  ctx.fillRect(0, 0, size, size);

  /* Broad tonal bands running with the grain. */
  for (let i = 0; i < 18; i += 1) {
    const x = random() * size;
    const width = 12 + random() * 44;
    ctx.fillStyle = random() > 0.5 ? 'rgba(143, 100, 59, 0.08)' : 'rgba(226, 189, 144, 0.09)';
    ctx.fillRect(x, 0, width, size);
  }

  /* Fine grain lines. */
  for (let i = 0; i < 220; i += 1) {
    const x = random() * size;
    const alpha = 0.04 + random() * 0.09;
    ctx.strokeStyle = random() > 0.6
      ? `rgba(122, 81, 45, ${alpha})`
      : `rgba(232, 197, 152, ${alpha})`;
    ctx.lineWidth = 0.5 + random() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, -4);
    ctx.bezierCurveTo(
      x + (random() - 0.5) * 18,
      size * 0.33,
      x + (random() - 0.5) * 18,
      size * 0.66,
      x + (random() - 0.5) * 8,
      size + 4,
    );
    ctx.stroke();
  }

  /* Two knots, kept far apart. */
  for (let i = 0; i < 2; i += 1) {
    const x = 70 + random() * 360;
    const y = 100 + random() * 300;
    for (let ring = 5; ring > 0; ring -= 1) {
      ctx.strokeStyle = `rgba(114, 76, 42, ${0.04 + ring * 0.012})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, ring * 4, ring * 9, 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  return finish(canvas, { repeat: [1, 2] });
}

/* --------------------------------------------------------------------------
   Sand / dune ground
   -------------------------------------------------------------------------- */

export function createSand() {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  const random = makeRandom(191);

  ctx.fillStyle = '#c7b397';
  ctx.fillRect(0, 0, size, size);
  speckle(ctx, size, size, random, 7000, [
    'rgba(153, 132, 104, 0.18)',
    'rgba(238, 224, 201, 0.24)',
    'rgba(113, 94, 70, 0.08)',
  ], 1.2);

  /* Wind ripples. */
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 34; i += 1) {
    ctx.strokeStyle = random() > 0.5 ? 'rgba(156, 134, 106, 0.07)' : 'rgba(242, 229, 206, 0.08)';
    const y = random() * size;
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.bezierCurveTo(size * 0.3, y - 7, size * 0.7, y + 7, size + 10, y - 2);
    ctx.stroke();
  }

  return finish(canvas, { repeat: [18, 18] });
}

/* --------------------------------------------------------------------------
   Pool mosaic — small square tiles under the water line
   -------------------------------------------------------------------------- */

export function createPoolTile() {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  const random = makeRandom(233);
  const cell = 16;

  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const shade = 92 + (random() * 18) | 0;
      ctx.fillStyle = `rgb(${shade - 22}, ${shade + 12}, ${shade + 10})`;
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    }
  }

  ctx.strokeStyle = 'rgba(226, 238, 230, 0.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= size; i += cell) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  return finish(canvas, { repeat: [5, 5] });
}

/* --------------------------------------------------------------------------
   Equirectangular environment — a tiny procedural sky used for PBR reflections
   -------------------------------------------------------------------------- */

export function createEnvironment(renderer, palette) {
  const width = 1024;
  const height = 512;
  const { canvas, ctx } = makeCanvas(width, height);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, palette.zenith);
  sky.addColorStop(0.3, palette.skyMid);
  sky.addColorStop(0.494, palette.horizon);
  sky.addColorStop(0.506, palette.horizon);
  sky.addColorStop(0.62, palette.groundNear);
  sky.addColorStop(1, palette.groundFar);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  /* A wide, soft sun bloom in the upper-left quadrant. */
  const sunX = width * palette.sunU;
  const sunY = height * palette.sunV;
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, width * 0.22);
  glow.addColorStop(0, palette.sunGlowStrong);
  glow.addColorStop(0.2, palette.sunGlowSoft);
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  /* Horizon haze. */
  const haze = ctx.createLinearGradient(0, height * 0.42, 0, height * 0.56);
  haze.addColorStop(0, 'rgba(255, 255, 255, 0)');
  haze.addColorStop(0.5, palette.haze);
  haze.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, height * 0.42, width, height * 0.14);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const environment = pmrem.fromEquirectangular(texture).texture;
  texture.dispose();
  pmrem.dispose();
  return environment;
}
