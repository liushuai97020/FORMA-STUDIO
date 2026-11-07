/* ============================================================================
   SOLSTICE HOUSE — procedural texture library
   ----------------------------------------------------------------------------
   Every surface in the room is generated on a canvas at boot. No images, no
   fetches. Colour maps are sRGB; bump / roughness maps stay linear.
   ========================================================================== */

import * as THREE from 'three';

const clamp255 = (value) => (value < 0 ? 0 : value > 255 ? 255 : value);

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function toTexture(canvas, { srgb = true, repeat = [1, 1], aniso = 8 } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = aniso;
  texture.needsUpdate = true;
  return texture;
}

function addGrain(context, width, height, amount = 8, warm = 0) {
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    data[i] = clamp255(data[i] + n + warm);
    data[i + 1] = clamp255(data[i + 1] + n);
    data[i + 2] = clamp255(data[i + 2] + n - warm * 0.5);
  }
  context.putImageData(image, 0, 0);
}

function blurred(canvas, pixels) {
  const target = createCanvas(canvas.width, canvas.height);
  const context = target.getContext('2d');
  context.filter = `blur(${pixels}px)`;
  context.drawImage(canvas, 0, 0);
  return target;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

/* --------------------------------------------------------------------------
   Generic radial texture — glows, contact shadows
   -------------------------------------------------------------------------- */

export function makeRadialTexture(size, stops) {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/* --------------------------------------------------------------------------
   Warm plaster — soft mottled lime render
   -------------------------------------------------------------------------- */

export function makePlasterTextures(aniso = 8) {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const context = canvas.getContext('2d');

  context.fillStyle = '#e9e1d3';
  context.fillRect(0, 0, size, size);

  // Broad travelling mottling — lime render is never one flat tone.
  for (let i = 0; i < 150; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = randomBetween(50, 300);
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    const warm = Math.random() > 0.5;
    gradient.addColorStop(
      0,
      warm ? 'rgba(248, 241, 230, 0.055)' : 'rgba(198, 184, 163, 0.055)',
    );
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  // Trowel sweeps.
  context.save();
  context.lineCap = 'round';
  for (let i = 0; i < 46; i += 1) {
    context.globalAlpha = randomBetween(0.02, 0.05);
    context.strokeStyle = Math.random() > 0.5 ? '#f4ecdf' : '#c9bba6';
    context.lineWidth = randomBetween(14, 46);
    context.beginPath();
    const x = Math.random() * size;
    const y = Math.random() * size;
    context.moveTo(x, y);
    context.bezierCurveTo(
      x + randomBetween(-180, 180),
      y + randomBetween(-90, 90),
      x + randomBetween(-260, 260),
      y + randomBetween(-140, 140),
      x + randomBetween(-320, 320),
      y + randomBetween(-180, 180),
    );
    context.stroke();
  }
  context.restore();

  addGrain(context, size, size, 6, 2);

  // Bump: same mottling, blurred to a soft hand-finished surface.
  const bump = createCanvas(512, 512);
  const bumpContext = bump.getContext('2d');
  bumpContext.fillStyle = '#808080';
  bumpContext.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = randomBetween(12, 90);
    const gradient = bumpContext.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    bumpContext.fillStyle = gradient;
    bumpContext.beginPath();
    bumpContext.arc(x, y, radius, 0, Math.PI * 2);
    bumpContext.fill();
  }
  addGrain(bumpContext, 512, 512, 26, 0);
  const bumpSoft = blurred(bump, 1.1);

  return {
    map: toTexture(canvas, { repeat: [2.2, 1.8], aniso }),
    bump: toTexture(bumpSoft, { srgb: false, repeat: [2.2, 1.8], aniso }),
  };
}

/* --------------------------------------------------------------------------
   Oak floor — narrow planks with straight grain, warm oiled finish
   -------------------------------------------------------------------------- */

export function makeOakTextures(aniso = 8) {
  const width = 512;
  const height = 1024;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');

  const tones = ['#b98f66', '#c39a70', '#ad835c', '#c9a077', '#b38960', '#bd9369', '#aa805a', '#c69c72'];
  const plankWidth = width / tones.length;

  for (let column = 0; column < tones.length; column += 1) {
    const x0 = column * plankWidth;
    const tone = tones[column];
    context.fillStyle = tone;
    context.fillRect(x0, 0, plankWidth, height);

    // A gentle tonal wash across each plank.
    const gradient = context.createLinearGradient(x0, 0, x0 + plankWidth, 0);
    gradient.addColorStop(0, 'rgba(255, 236, 208, 0.1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, 'rgba(74, 48, 26, 0.12)');
    context.fillStyle = gradient;
    context.fillRect(x0, 0, plankWidth, height);

    // Long grain lines.
    for (let line = 0; line < 30; line += 1) {
      const baseX = x0 + randomBetween(4, plankWidth - 4);
      context.beginPath();
      context.moveTo(baseX, 0);
      const segments = 4;
      for (let s = 1; s <= segments; s += 1) {
        const y = (height / segments) * s;
        const x = baseX + Math.sin(s * 1.7 + column + line) * randomBetween(1, 4);
        context.lineTo(x, y);
      }
      context.strokeStyle = `rgba(84, 56, 32, ${randomBetween(0.03, 0.12)})`;
      context.lineWidth = randomBetween(0.6, 1.8);
      context.stroke();
    }

    // Plank end joints, staggered per column.
    let joint = randomBetween(80, 380);
    while (joint < height - 60) {
      context.fillStyle = 'rgba(62, 40, 22, 0.34)';
      context.fillRect(x0 + 1, joint, plankWidth - 2, 1.6);
      context.fillStyle = 'rgba(255, 236, 208, 0.14)';
      context.fillRect(x0 + 1, joint + 1.6, plankWidth - 2, 1.2);
      joint += randomBetween(220, 460);
    }
    // Butt seam between planks.
    context.fillStyle = 'rgba(58, 38, 20, 0.42)';
    context.fillRect(x0 - 0.8, 0, 1.6, height);
  }

  // A few knots.
  for (let i = 0; i < 7; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    for (let ring = 3; ring >= 0; ring -= 1) {
      context.beginPath();
      context.ellipse(x, y, 2.5 + ring * 2.4, 6 + ring * 4.2, 0.2, 0, Math.PI * 2);
      context.strokeStyle = `rgba(72, 46, 24, ${0.12 + ring * 0.03})`;
      context.lineWidth = 1;
      context.stroke();
    }
  }

  addGrain(context, width, height, 5, 2);

  // Bump: grain + seams only.
  const bump = createCanvas(width, height);
  const bumpContext = bump.getContext('2d');
  bumpContext.fillStyle = '#8a8a8a';
  bumpContext.fillRect(0, 0, width, height);
  for (let column = 0; column < tones.length; column += 1) {
    const x0 = column * plankWidth;
    for (let line = 0; line < 24; line += 1) {
      const baseX = x0 + randomBetween(4, plankWidth - 4);
      const light = Math.random() > 0.5;
      bumpContext.strokeStyle = light ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.2)';
      bumpContext.lineWidth = randomBetween(0.7, 1.6);
      bumpContext.beginPath();
      bumpContext.moveTo(baseX, 0);
      for (let s = 1; s <= 4; s += 1) {
        bumpContext.lineTo(baseX + Math.sin(s * 2.1 + column) * 2, (height / 4) * s);
      }
      bumpContext.stroke();
    }
  }
  const bumpSoft = blurred(bump, 0.7);

  return {
    map: toTexture(canvas, { repeat: [5, 2], aniso }),
    bump: toTexture(bumpSoft, { srgb: false, repeat: [5, 2], aniso }),
  };
}

/* --------------------------------------------------------------------------
   Bouclé — looped wool pile, used as a bump map
   -------------------------------------------------------------------------- */

export function makeBoucleBump(aniso = 8) {
  const size = 512;
  const canvas = createCanvas(size, size);
  const context = canvas.getContext('2d');
  context.fillStyle = '#808080';
  context.fillRect(0, 0, size, size);

  for (let i = 0; i < 3400; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = randomBetween(1.4, 4.6);
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.strokeStyle =
      Math.random() > 0.5
        ? `rgba(255, 255, 255, ${randomBetween(0.1, 0.3)})`
        : `rgba(0, 0, 0, ${randomBetween(0.1, 0.32)})`;
    context.lineWidth = randomBetween(0.8, 1.7);
    context.stroke();
  }

  const soft = blurred(canvas, 0.8);
  return toTexture(soft, { srgb: false, repeat: [3, 3], aniso });
}

/* --------------------------------------------------------------------------
   Travertine — horizontal sediment bands and open pores
   -------------------------------------------------------------------------- */

export function makeTravertineTextures(aniso = 8) {
  const width = 1024;
  const height = 512;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');

  context.fillStyle = '#d9cdbb';
  context.fillRect(0, 0, width, height);

  for (let band = 0; band < 22; band += 1) {
    const centerY = randomBetween(0, height);
    const light = Math.random() > 0.45;
    const frequency = randomBetween(0.004, 0.01);
    const amplitude = randomBetween(3, 14);
    context.beginPath();
    for (let x = -10; x <= width + 10; x += 10) {
      const y =
        centerY +
        Math.sin(x * frequency + band) * amplitude +
        Math.sin(x * 0.002 + band * 2) * 8;
      if (x === -10) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = light
      ? `rgba(249, 242, 230, ${randomBetween(0.12, 0.34)})`
      : `rgba(169, 150, 124, ${randomBetween(0.1, 0.3)})`;
    context.lineWidth = randomBetween(3, 20);
    context.stroke();
  }

  for (let i = 0; i < 460; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    context.beginPath();
    context.ellipse(
      x,
      y,
      randomBetween(0.7, 3.2),
      randomBetween(0.4, 1.6),
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    context.fillStyle = `rgba(94, 76, 56, ${randomBetween(0.05, 0.17)})`;
    context.fill();
  }

  addGrain(context, width, height, 5, 1);

  const bump = createCanvas(512, 256);
  const bumpContext = bump.getContext('2d');
  bumpContext.fillStyle = '#8a8a8a';
  bumpContext.fillRect(0, 0, 512, 256);
  for (let band = 0; band < 26; band += 1) {
    const y = Math.random() * 256;
    bumpContext.beginPath();
    bumpContext.moveTo(0, y);
    for (let x = 0; x <= 512; x += 16) {
      bumpContext.lineTo(x, y + Math.sin(x * 0.02 + band) * 6);
    }
    bumpContext.strokeStyle =
      Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
    bumpContext.lineWidth = randomBetween(2, 10);
    bumpContext.stroke();
  }
  for (let i = 0; i < 260; i += 1) {
    bumpContext.beginPath();
    bumpContext.arc(Math.random() * 512, Math.random() * 256, randomBetween(0.5, 2), 0, Math.PI * 2);
    bumpContext.fillStyle = 'rgba(0,0,0,0.22)';
    bumpContext.fill();
  }
  const bumpSoft = blurred(bump, 0.8);

  return {
    map: toTexture(canvas, { repeat: [1, 1], aniso }),
    bump: toTexture(bumpSoft, { srgb: false, repeat: [1, 1], aniso }),
  };
}

/* --------------------------------------------------------------------------
   Hand-knotted wool rug — quiet border, dense abrash
   -------------------------------------------------------------------------- */

export function makeRugTextures(aniso = 8) {
  const width = 1024;
  const height = 736;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');

  context.fillStyle = '#c4b7a2';
  context.fillRect(0, 0, width, height);

  // A quiet taupe border field, woven a shade deeper than the pile.
  const borderField = 78;
  context.fillStyle = 'rgba(108, 94, 74, 0.2)';
  context.fillRect(0, 0, width, borderField);
  context.fillRect(0, height - borderField, width, borderField);
  context.fillRect(0, 0, borderField, height);
  context.fillRect(width - borderField, 0, borderField, height);

  // Abrash: soft horizontal tonal bands.
  for (let band = 0; band < 11; band += 1) {
    context.fillStyle =
      Math.random() > 0.5 ? 'rgba(247, 240, 224, 0.05)' : 'rgba(120, 104, 80, 0.05)';
    context.fillRect(0, Math.random() * height, width, randomBetween(20, 90));
  }

  // Wool pile — thousands of short fibres.
  for (let i = 0; i < 11000; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const angle = randomBetween(-0.7, 0.7);
    const length = randomBetween(1.5, 5);
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.strokeStyle =
      Math.random() > 0.5
        ? `rgba(245, 237, 220, ${randomBetween(0.04, 0.11)})`
        : `rgba(96, 82, 64, ${randomBetween(0.04, 0.1)})`;
    context.lineWidth = randomBetween(0.6, 1.4);
    context.stroke();
  }

  // Border: two fine cream rules, tucked in from the edge.
  context.strokeStyle = 'rgba(236, 227, 208, 0.62)';
  context.lineWidth = 2.4;
  context.strokeRect(46, 46, width - 92, height - 92);
  context.lineWidth = 5;
  context.strokeStyle = 'rgba(222, 210, 188, 0.5)';
  context.strokeRect(62, 62, width - 124, height - 124);

  addGrain(context, width, height, 5, 1);

  const bump = createCanvas(512, 368);
  const bumpContext = bump.getContext('2d');
  bumpContext.fillStyle = '#808080';
  bumpContext.fillRect(0, 0, 512, 368);
  addGrain(bumpContext, 512, 368, 52, 0);
  const bumpSoft = blurred(bump, 0.7);

  return {
    map: toTexture(canvas, { repeat: [1, 1], aniso }),
    bump: toTexture(bumpSoft, { srgb: false, repeat: [2, 2], aniso }),
  };
}

/* --------------------------------------------------------------------------
   Framed artwork — a warm abstract study, "the sun over the water"
   -------------------------------------------------------------------------- */

export function makeArtworkTexture(aniso = 8) {
  const width = 720;
  const height = 560;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');

  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#d9c8ae');
  background.addColorStop(1, '#c6b193');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  // A pale field, slightly off-square.
  context.fillStyle = 'rgba(235, 223, 202, 0.86)';
  context.fillRect(64, 56, 262, 252);

  // Rust sea, with a soft hand-painted edge.
  context.beginPath();
  context.moveTo(0, 330);
  context.bezierCurveTo(150, 312, 320, 348, 470, 326);
  context.bezierCurveTo(580, 310, 660, 330, width, 316);
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();
  const sea = context.createLinearGradient(0, 306, 0, height);
  sea.addColorStop(0, '#b06f4b');
  sea.addColorStop(1, '#875037');
  context.fillStyle = sea;
  context.fill();

  // The sun, a chalk disc resting on the horizon.
  const sun = context.createRadialGradient(500, 268, 10, 500, 268, 104);
  sun.addColorStop(0, 'rgba(244, 233, 211, 1)');
  sun.addColorStop(0.72, 'rgba(236, 220, 193, 0.94)');
  sun.addColorStop(1, 'rgba(226, 205, 171, 0.14)');
  context.fillStyle = sun;
  context.beginPath();
  context.arc(500, 268, 104, 0, Math.PI * 2);
  context.fill();

  // A thin charcoal horizon line.
  context.strokeStyle = 'rgba(36, 31, 27, 0.8)';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(58, 338);
  context.lineTo(width - 54, 326);
  context.stroke();

  // A muted olive vertical, and a hairline mark.
  context.fillStyle = 'rgba(92, 88, 62, 0.74)';
  context.fillRect(168, 128, 20, 300);
  context.strokeStyle = 'rgba(48, 42, 36, 0.48)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(88, 108);
  context.lineTo(274, 102);
  context.stroke();

  // A quiet charcoal arc echoing the sun's path.
  context.strokeStyle = 'rgba(50, 44, 37, 0.42)';
  context.lineWidth = 2.4;
  context.beginPath();
  context.arc(588, 122, 74, Math.PI * 0.18, Math.PI * 1.12);
  context.stroke();

  // Canvas grain and a few pigment specks.
  addGrain(context, width, height, 9, 2);
  for (let i = 0; i < 120; i += 1) {
    context.fillStyle = `rgba(60, 50, 40, ${randomBetween(0.04, 0.12)})`;
    context.fillRect(Math.random() * width, Math.random() * height, 1, 1);
  }

  return toTexture(canvas, { srgb: true, repeat: [1, 1], aniso });
}

/* --------------------------------------------------------------------------
   Linen — sheer curtain weave
   -------------------------------------------------------------------------- */

export function makeLinenTexture(aniso = 8) {
  const width = 256;
  const height = 512;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');

  context.fillStyle = '#eee6d8';
  context.fillRect(0, 0, width, height);

  // Warp and slubs.
  for (let x = 0; x < width; x += 3) {
    context.fillStyle = `rgba(255, 250, 241, ${randomBetween(0.04, 0.12)})`;
    context.fillRect(x, 0, 1, height);
  }
  for (let i = 0; i < 260; i += 1) {
    context.fillStyle = `rgba(196, 182, 160, ${randomBetween(0.05, 0.14)})`;
    context.fillRect(Math.random() * width, Math.random() * height, randomBetween(3, 12), 1);
  }
  addGrain(context, width, height, 6, 1);

  const bump = createCanvas(width, height);
  const bumpContext = bump.getContext('2d');
  bumpContext.fillStyle = '#808080';
  bumpContext.fillRect(0, 0, width, height);
  for (let x = 0; x < width; x += 3) {
    bumpContext.fillStyle = `rgba(255,255,255,${randomBetween(0.1, 0.24)})`;
    bumpContext.fillRect(x, 0, 1, height);
  }
  for (let i = 0; i < 180; i += 1) {
    bumpContext.fillStyle = `rgba(0,0,0,${randomBetween(0.08, 0.18)})`;
    bumpContext.fillRect(Math.random() * width, Math.random() * height, randomBetween(3, 12), 1);
  }
  addGrain(bumpContext, width, height, 18, 0);

  return {
    map: toTexture(canvas, { repeat: [1, 1], aniso }),
    bump: toTexture(blurred(bump, 0.5), { srgb: false, repeat: [1, 1], aniso }),
  };
}

/* --------------------------------------------------------------------------
   Sea — a small tiling ripple bump
   -------------------------------------------------------------------------- */

export function makeSeaBump(aniso = 8) {
  const size = 256;
  const canvas = createCanvas(size, size);
  const context = canvas.getContext('2d');
  context.fillStyle = '#808080';
  context.fillRect(0, 0, size, size);

  for (let i = 0; i < 260; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = randomBetween(4, 28);
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, Math.random() > 0.5 ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.13)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  addGrain(context, size, size, 34, 0);

  return toTexture(blurred(canvas, 1.4), { srgb: false, repeat: [70, 70], aniso });
}

/* --------------------------------------------------------------------------
   Environment — a soft equirectangular sky for reflections
   -------------------------------------------------------------------------- */

export function makeEnvironmentTexture() {
  const width = 1024;
  const height = 512;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');

  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#d7e2ea');
  sky.addColorStop(0.42, '#eef0ec');
  sky.addColorStop(0.5, '#f4e9d8');
  sky.addColorStop(0.56, '#d8c4a8');
  sky.addColorStop(0.72, '#9a8166');
  sky.addColorStop(1, '#5f4d3b');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  // Sun, high and warm on the left-of-centre meridian.
  const sun = context.createRadialGradient(700, 150, 4, 700, 150, 170);
  sun.addColorStop(0, 'rgba(255, 244, 222, 1)');
  sun.addColorStop(0.16, 'rgba(255, 233, 198, 0.82)');
  sun.addColorStop(0.5, 'rgba(255, 216, 168, 0.18)');
  sun.addColorStop(1, 'rgba(255, 210, 160, 0)');
  context.fillStyle = sun;
  context.beginPath();
  context.arc(700, 150, 170, 0, Math.PI * 2);
  context.fill();

  // A cool bounce from the sea side.
  const bounce = context.createRadialGradient(360, 330, 20, 360, 330, 300);
  bounce.addColorStop(0, 'rgba(196, 214, 219, 0.3)');
  bounce.addColorStop(1, 'rgba(196, 214, 219, 0)');
  context.fillStyle = bounce;
  context.fillRect(0, 0, width, height);

  // Faint soft cloud bands near the horizon.
  for (let i = 0; i < 10; i += 1) {
    context.fillStyle = `rgba(255, 249, 238, ${randomBetween(0.04, 0.1)})`;
    context.beginPath();
    context.ellipse(
      Math.random() * width,
      randomBetween(180, 250),
      randomBetween(80, 240),
      randomBetween(8, 26),
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  return texture;
}
