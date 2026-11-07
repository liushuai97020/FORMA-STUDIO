// ==========================================================================
// Linea Sofa — procedural texture atelier
//
// Every surface in the study is generated here on 2D canvases: bouclé wool,
// a woven throw, warm plaster, travertine, fine ceramic speckle, soft contact
// shadows and the equirectangular studio environment used for reflections.
// Nothing is fetched from the network.
// ==========================================================================

import * as THREE from 'three';

const TAU = Math.PI * 2;

/* -------------------------------------------------------------------------- */
/*  Deterministic randomness                                                  */
/* -------------------------------------------------------------------------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function makeValueNoise(seed, cells) {
  const random = mulberry32(seed);
  const stride = cells + 1;
  const grid = new Float32Array(stride * stride);
  for (let i = 0; i < grid.length; i += 1) grid[i] = random();

  return function sample(u, v) {
    const x = u * cells;
    const y = v * cells;
    let x0 = Math.floor(x);
    let y0 = Math.floor(y);
    const fx = smoothstep(x - x0);
    const fy = smoothstep(y - y0);
    if (x0 < 0) x0 = 0;
    if (y0 < 0) y0 = 0;
    if (x0 > cells) x0 = cells;
    if (y0 > cells) y0 = cells;
    const x1 = Math.min(x0 + 1, cells);
    const y1 = Math.min(y0 + 1, cells);
    const a = grid[y0 * stride + x0];
    const b = grid[y0 * stride + x1];
    const c = grid[y1 * stride + x0];
    const d = grid[y1 * stride + x1];
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  };
}

function makeFbm(seed, octaves = 5) {
  const layers = [];
  let cells = 2;
  for (let o = 0; o < octaves; o += 1) {
    layers.push({ sample: makeValueNoise(seed + o * 131, cells), amplitude: 1 / 2 ** o });
    cells *= 2;
  }
  const total = layers.reduce((sum, layer) => sum + layer.amplitude, 0);
  return function fbm(u, v) {
    let sum = 0;
    for (let i = 0; i < layers.length; i += 1) {
      sum += layers[i].sample(u, v) * layers[i].amplitude;
    }
    return sum / total;
  };
}

/* -------------------------------------------------------------------------- */
/*  Canvas helpers                                                            */
/* -------------------------------------------------------------------------- */

function makeCanvas(width, height = width) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function canvasTexture(canvas, renderer, { srgb = false, repeat = [1, 1] } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = renderer
    ? Math.min(8, renderer.capabilities.getMaxAnisotropy())
    : 4;
  texture.needsUpdate = true;
  return texture;
}

function paintGrain(ctx, size, random, amount, alpha) {
  for (let i = 0; i < amount; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const shade = random() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${alpha * random()})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

function canvasNormalTexture(heightCanvas, renderer, { repeat = [1, 1], strength = 1.8 } = {}) {
  const size = heightCanvas.width;
  const source = heightCanvas.getContext('2d').getImageData(0, 0, size, size).data;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  const heightAt = (x, y) =>
    source[((((y + size) % size) * size + ((x + size) % size)) * 4 + 1)] / 255;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (heightAt(x - 1, y) - heightAt(x + 1, y)) * strength;
      const dy = (heightAt(x, y - 1) - heightAt(x, y + 1)) * strength;
      const inverse = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const index = (y * size + x) * 4;
      image.data[index] = Math.round((dx * inverse * 0.5 + 0.5) * 255);
      image.data[index + 1] = Math.round((dy * inverse * 0.5 + 0.5) * 255);
      image.data[index + 2] = Math.round((inverse * 0.5 + 0.5) * 255);
      image.data[index + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvasTexture(canvas, renderer, { repeat });
}

/* -------------------------------------------------------------------------- */
/*  Bouclé wool — colour and relief                                           */
/* -------------------------------------------------------------------------- */

export function createFabricMaps(renderer) {
  const size = 512;
  const random = mulberry32(48151);
  const loops = [];

  // One shared loop field so colour and relief line up exactly.
  for (let i = 0; i < 2800; i += 1) {
    loops.push({
      x: random() * size,
      y: random() * size,
      radius: 3.6 + random() * 5.2,
      start: random() * TAU,
      sweep: 1.5 + random() * 3.9,
      width: 1.1 + random() * 1.9,
      tone: random(),
    });
  }

  // ---- colour map: warm chalk-white with the softest woolly mottling
  const colorCanvas = makeCanvas(size);
  const color = colorCanvas.getContext('2d');
  color.fillStyle = '#f4f0e9';
  color.fillRect(0, 0, size, size);

  for (let i = 0; i < 22; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const radius = 36 + random() * 100;
    const gradient = color.createRadialGradient(x, y, 0, x, y, radius);
    const dark = random() < 0.5;
    gradient.addColorStop(0, dark ? 'rgba(74, 62, 48, 0.02)' : 'rgba(255, 254, 247, 0.055)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    color.fillStyle = gradient;
    color.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  for (let i = 0; i < loops.length; i += 1) {
    const loop = loops[i];
    color.strokeStyle =
      loop.tone < 0.52
        ? `rgba(54, 44, 32, ${0.07 + loop.tone * 0.13})`
        : `rgba(255, 253, 246, ${0.09 + (loop.tone - 0.52) * 0.15})`;
    color.lineWidth = loop.width;
    color.beginPath();
    color.arc(loop.x, loop.y, loop.radius, loop.start, loop.start + loop.sweep);
    color.stroke();
  }
  paintGrain(color, size, random, 5200, 0.03);

  // ---- bump map: each loop is a small pillow of light against a soft shadow
  const bumpCanvas = makeCanvas(size);
  const bump = bumpCanvas.getContext('2d');
  bump.fillStyle = '#808080';
  bump.fillRect(0, 0, size, size);

  for (let i = 0; i < loops.length; i += 1) {
    const loop = loops[i];
    bump.globalAlpha = 0.26 + loop.tone * 0.22;
    bump.strokeStyle = '#303030';
    bump.lineWidth = loop.width + 0.7;
    bump.beginPath();
    bump.arc(loop.x + 0.8, loop.y + 1.0, loop.radius, loop.start, loop.start + loop.sweep);
    bump.stroke();

    bump.globalAlpha = 0.3 + (1 - loop.tone) * 0.22;
    bump.strokeStyle = '#f2f2f2';
    bump.lineWidth = loop.width;
    bump.beginPath();
    bump.arc(loop.x, loop.y, loop.radius, loop.start, loop.start + loop.sweep);
    bump.stroke();
  }
  bump.globalAlpha = 1;
  paintGrain(bump, size, random, 5400, 0.14);

  return {
    map: canvasTexture(colorCanvas, renderer, { srgb: true, repeat: [1.35, 1.22] }),
    bumpMap: canvasTexture(bumpCanvas, renderer, { repeat: [1.35, 1.22] }),
    normalMap: canvasNormalTexture(bumpCanvas, renderer, {
      repeat: [1.35, 1.22],
      strength: 2.3,
    }),
  };
}

/* -------------------------------------------------------------------------- */
/*  Woven wool for the folded throw                                           */
/* -------------------------------------------------------------------------- */

export function createWoolMaps(renderer) {
  const size = 512;
  const random = mulberry32(90125);

  const colorCanvas = makeCanvas(size);
  const color = colorCanvas.getContext('2d');
  color.fillStyle = '#ded0b9';
  color.fillRect(0, 0, size, size);

  for (let i = 0; i < 500; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const radius = 8 + random() * 46;
    const gradient = color.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, random() < 0.5 ? 'rgba(92, 78, 60, 0.05)' : 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    color.fillStyle = gradient;
    color.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // A fine diagonal twill, crossed by a whisper of the opposite thread.
  for (let d = -size; d < size * 2; d += 3) {
    color.strokeStyle = 'rgba(84, 67, 49, 0.14)';
    color.lineWidth = 1;
    color.beginPath();
    color.moveTo(d, 0);
    color.lineTo(d + size, size);
    color.stroke();

    color.strokeStyle = 'rgba(255, 252, 243, 0.1)';
    color.beginPath();
    color.moveTo(d + 1.4, 0);
    color.lineTo(d + size + 1.4, size);
    color.stroke();
  }
  paintGrain(color, size, random, 9000, 0.045);

  const bumpCanvas = makeCanvas(size);
  const bump = bumpCanvas.getContext('2d');
  bump.fillStyle = '#808080';
  bump.fillRect(0, 0, size, size);
  for (let d = -size; d < size * 2; d += 3) {
    bump.strokeStyle = 'rgba(40, 40, 40, 0.22)';
    bump.lineWidth = 1.2;
    bump.beginPath();
    bump.moveTo(d, 0);
    bump.lineTo(d + size, size);
    bump.stroke();
    bump.strokeStyle = 'rgba(228, 228, 228, 0.26)';
    bump.beginPath();
    bump.moveTo(d + 1.6, 0);
    bump.lineTo(d + size + 1.6, size);
    bump.stroke();
  }
  paintGrain(bump, size, random, 6000, 0.12);

  return {
    map: canvasTexture(colorCanvas, renderer, { srgb: true, repeat: [3.4, 2.6] }),
    bumpMap: canvasTexture(bumpCanvas, renderer, { repeat: [3.4, 2.6] }),
  };
}

/* -------------------------------------------------------------------------- */
/*  Plaster — floor and wall                                                  */
/* -------------------------------------------------------------------------- */

export function createPlasterMaps(renderer, { variant = 'wall', size = 512 } = {}) {
  const wall = variant === 'wall';
  const base = wall ? [243, 236, 226] : [225, 214, 199];
  const cloudAmplitude = wall ? 9 : 13;
  const fineAmplitude = wall ? 3.4 : 5;
  const fbm = makeFbm(wall ? 7121 : 3317, 5);
  const random = mulberry32(wall ? 5501 : 8823);

  const colorCanvas = makeCanvas(size);
  const colorCtx = colorCanvas.getContext('2d');
  const colorImage = colorCtx.createImageData(size, size);

  const bumpCanvas = makeCanvas(size);
  const bumpCtx = bumpCanvas.getContext('2d');
  const bumpImage = bumpCtx.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    const v = y / (size - 1);
    for (let x = 0; x < size; x += 1) {
      const u = x / (size - 1);
      const cloud = fbm(u, v) - 0.5;
      const fine = random() - 0.5;
      const value = cloud * cloudAmplitude + fine * fineAmplitude;
      const index = (y * size + x) * 4;
      colorImage.data[index] = base[0] + value;
      colorImage.data[index + 1] = base[1] + value * 0.98;
      colorImage.data[index + 2] = base[2] + value * 0.94;
      colorImage.data[index + 3] = 255;

      const height = 128 + cloud * 34 + fine * 16;
      bumpImage.data[index] = height;
      bumpImage.data[index + 1] = height;
      bumpImage.data[index + 2] = height;
      bumpImage.data[index + 3] = 255;
    }
  }

  const pores = wall ? 220 : 460;
  for (let i = 0; i < pores; i += 1) {
    const x = random() * size;
    const y = random() * size;
    colorCtx.fillStyle = `rgba(118, 100, 80, ${0.035 + random() * 0.05})`;
    colorCtx.beginPath();
    colorCtx.ellipse(x, y, 0.6 + random() * 2.2, 0.5 + random() * 1.1, 0, 0, TAU);
    colorCtx.fill();
    bumpCtx.fillStyle = `rgba(30, 30, 30, ${0.12 + random() * 0.16})`;
    bumpCtx.beginPath();
    bumpCtx.ellipse(x, y, 0.6 + random() * 2.2, 0.5 + random() * 1.1, 0, 0, TAU);
    bumpCtx.fill();
  }

  colorCtx.putImageData(colorImage, 0, 0);
  bumpCtx.putImageData(bumpImage, 0, 0);

  return {
    map: canvasTexture(colorCanvas, renderer, {
      srgb: true,
      repeat: wall ? [2.4, 1.4] : [7, 7],
    }),
    bumpMap: canvasTexture(bumpCanvas, renderer, {
      repeat: wall ? [2.4, 1.4] : [7, 7],
    }),
  };
}

/* -------------------------------------------------------------------------- */
/*  Travertine — banded, pitted, warm                                          */
/* -------------------------------------------------------------------------- */

export function createTravertineMaps(renderer) {
  const size = 512;
  const random = mulberry32(20417);
  const colorCanvas = makeCanvas(size);
  const color = colorCanvas.getContext('2d');
  const bumpCanvas = makeCanvas(size);
  const bump = bumpCanvas.getContext('2d');

  color.fillStyle = '#bfa27a';
  color.fillRect(0, 0, size, size);
  bump.fillStyle = '#8a8a8a';
  bump.fillRect(0, 0, size, size);

  // Horizontal sedimentary bands.
  for (let y = 0; y < size; y += 1) {
    const v = y / size;
    const wave =
      Math.sin(v * TAU * 7.3 + 0.4) * 4.2 +
      Math.sin(v * TAU * 21.7 + 2.1) * 2.1 +
      (random() - 0.5) * 2.8;
    color.fillStyle = `rgb(${Math.round(197 + wave)}, ${Math.round(173 + wave * 0.86)}, ${Math.round(140 + wave * 0.72)})`;
    color.fillRect(0, y, size, 1);
    const shade = Math.round(138 + wave * 1.6);
    bump.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
    bump.fillRect(0, y, size, 1);
  }

  // Fine wavy strata lines.
  for (let i = 0; i < 26; i += 1) {
    const y0 = random() * size;
    const amplitude = 1.5 + random() * 5;
    color.strokeStyle = `rgba(${150 + random() * 20}, ${123 + random() * 16}, ${92 + random() * 12}, ${0.1 + random() * 0.16})`;
    color.lineWidth = 0.5 + random() * 1.3;
    color.beginPath();
    for (let x = 0; x <= size; x += 8) {
      const y = y0 + Math.sin((x / size) * TAU * (0.8 + random() * 0.02) + i) * amplitude;
      if (x === 0) color.moveTo(x, y);
      else color.lineTo(x, y);
    }
    color.stroke();
  }

  // Elongated pores, each with a lit rim.
  for (let i = 0; i < 620; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const rx = 0.7 + random() * 4.2;
    const ry = 0.4 + random() * rx * 0.55;
    const rotation = (random() - 0.5) * 0.2;
    color.fillStyle = `rgba(${118 + random() * 20}, ${94 + random() * 18}, ${68 + random() * 14}, ${0.14 + random() * 0.24})`;
    color.beginPath();
    color.ellipse(x, y, rx, ry, rotation, 0, TAU);
    color.fill();
    color.fillStyle = `rgba(255, 248, 232, ${0.08 + random() * 0.18})`;
    color.beginPath();
    color.ellipse(x - rx * 0.35, y - ry * 0.4, rx * 0.55, ry * 0.45, rotation, 0, TAU);
    color.fill();

    bump.fillStyle = `rgba(18, 18, 18, ${0.25 + random() * 0.3})`;
    bump.beginPath();
    bump.ellipse(x, y, rx, ry, rotation, 0, TAU);
    bump.fill();
  }

  paintGrain(color, size, random, 7000, 0.05);
  paintGrain(bump, size, random, 7000, 0.1);

  return {
    map: canvasTexture(colorCanvas, renderer, { srgb: true, repeat: [1, 1] }),
    bumpMap: canvasTexture(bumpCanvas, renderer, { repeat: [1, 1] }),
  };
}

/* -------------------------------------------------------------------------- */
/*  Ceramic glaze speckle                                                     */
/* -------------------------------------------------------------------------- */

export function createCeramicBump(renderer) {
  const size = 256;
  const random = mulberry32(4481);
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 6200; i += 1) {
    const shade = Math.round(96 + random() * 72);
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.1 + random() * 0.2})`;
    const r = 0.4 + random() * 1.2;
    ctx.beginPath();
    ctx.arc(random() * size, random() * size, r, 0, TAU);
    ctx.fill();
  }
  return canvasTexture(canvas, renderer, { repeat: [3, 3] });
}

/* -------------------------------------------------------------------------- */
/*  Contact shadow (alpha)                                                    */
/* -------------------------------------------------------------------------- */

export function createContactShadowMap(renderer) {
  const size = 512;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(1, 0.64);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.32, 'rgba(255, 255, 255, 0.94)');
  gradient.addColorStop(0.62, 'rgba(255, 255, 255, 0.42)');
  gradient.addColorStop(0.84, 'rgba(255, 255, 255, 0.11)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Soften the perfect ellipse with a little erosion.
  const random = mulberry32(6621);
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 22; i += 1) {
    const angle = random() * TAU;
    const radius = size * (0.3 + random() * 0.17);
    const x = size / 2 + Math.cos(angle) * radius;
    const y = size / 2 + Math.sin(angle) * radius * 0.64;
    const r = size * (0.07 + random() * 0.12);
    const edge = ctx.createRadialGradient(x, y, 0, x, y, r);
    edge.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    edge.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  const texture = canvasTexture(canvas, renderer);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/* -------------------------------------------------------------------------- */
/*  Gentle pool of window light                                              */
/* -------------------------------------------------------------------------- */

export function createLightPoolMap(renderer) {
  const size = 512;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(1, 0.66);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.62)');
  gradient.addColorStop(0.62, 'rgba(255, 255, 255, 0.2)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, TAU);
  ctx.fill();
  ctx.restore();
  const texture = canvasTexture(canvas, renderer);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/* -------------------------------------------------------------------------- */
/*  Equirectangular studio environment                                        */
/* -------------------------------------------------------------------------- */

export function createEnvironmentTexture(renderer) {
  const width = 1024;
  const height = 512;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#fffaf1');
  sky.addColorStop(0.3, '#f8eee0');
  sky.addColorStop(0.48, '#ede0cf');
  sky.addColorStop(0.535, '#d4c1aa');
  sky.addColorStop(0.65, '#9d8770');
  sky.addColorStop(1, '#5c4a39');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Broad warm window on one side.
  const left = ctx.createRadialGradient(
    width * 0.235,
    height * 0.31,
    0,
    width * 0.235,
    height * 0.31,
    width * 0.24,
  );
  left.addColorStop(0, 'rgba(255, 253, 247, 0.96)');
  left.addColorStop(0.4, 'rgba(255, 247, 232, 0.5)');
  left.addColorStop(1, 'rgba(255, 245, 226, 0)');
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, width, height);

  // A second, softer source opposite keeps the sheen dimensional.
  const right = ctx.createRadialGradient(
    width * 0.74,
    height * 0.28,
    0,
    width * 0.74,
    height * 0.28,
    width * 0.16,
  );
  right.addColorStop(0, 'rgba(255, 240, 219, 0.7)');
  right.addColorStop(0.45, 'rgba(255, 236, 210, 0.26)');
  right.addColorStop(1, 'rgba(255, 236, 210, 0)');
  ctx.fillStyle = right;
  ctx.fillRect(0, 0, width, height);

  // Ceiling bounce.
  const ceiling = ctx.createLinearGradient(0, 0, 0, height * 0.26);
  ceiling.addColorStop(0, 'rgba(255, 255, 252, 0.9)');
  ceiling.addColorStop(1, 'rgba(255, 249, 238, 0)');
  ctx.fillStyle = ceiling;
  ctx.fillRect(0, 0, width, height * 0.3);

  // Faint dark studio flag, for a believable tonal edge in reflections.
  ctx.fillStyle = 'rgba(88, 70, 54, 0.2)';
  ctx.beginPath();
  ctx.ellipse(width * 0.55, height * 0.56, width * 0.16, height * 0.1, 0, 0, TAU);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/* -------------------------------------------------------------------------- */

export function disposeTextures(textures) {
  for (let i = 0; i < textures.length; i += 1) {
    if (textures[i]) textures[i].dispose();
  }
}
