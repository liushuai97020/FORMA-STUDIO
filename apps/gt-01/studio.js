/* ============================================================================
   GT-01 — warm-grey studio
   ----------------------------------------------------------------------------
   A seamless cyclorama built from a vertex-coloured backdrop sphere, a glossy
   gradient floor, a soft contact shadow and a light rig with one shadow-casting
   key. Reflections come from a procedural PMREM environment of glowing soft
   panels, so the paint and the floor both pick up broad, believable studio
   highlights. No external HDRI, no network.
   ============================================================================ */

import * as THREE from 'three';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* --------------------------------------------------------------- textures */

function makeFloorTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  const base = context.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.05,
    size * 0.5,
    size * 0.5,
    size * 0.52,
  );
  base.addColorStop(0, '#e9e6e0');
  base.addColorStop(0.42, '#e0ddd7');
  base.addColorStop(0.78, '#d4d1cb');
  base.addColorStop(1, '#c9c6bf');
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);

  /* A soft, slightly warm pool under the turntable. */
  const pool = context.createRadialGradient(
    size * 0.5,
    size * 0.52,
    size * 0.02,
    size * 0.5,
    size * 0.52,
    size * 0.26,
  );
  pool.addColorStop(0, 'rgba(255, 252, 245, 0.32)');
  pool.addColorStop(0.55, 'rgba(255, 250, 240, 0.1)');
  pool.addColorStop(1, 'rgba(255, 250, 240, 0)');
  context.fillStyle = pool;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeContactTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.01,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.74)');
  gradient.addColorStop(0.24, 'rgba(0, 0, 0, 0.58)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.26)');
  gradient.addColorStop(0.76, 'rgba(0, 0, 0, 0.07)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* ---------------------------------------------------------- environment */

function glowingPanel(width, height, position, rotation, color, intensity) {
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    side: THREE.DoubleSide,
  });
  material.color.multiplyScalar(intensity);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.copy(position);
  mesh.rotation.copy(rotation);
  return mesh;
}

function buildEnvironment(renderer) {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x6d6961);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshBasicMaterial({ color: 0x37352f }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -4;
  envScene.add(floor);

  /* Ceiling soft box — the long highlight across the hood and roof. */
  envScene.add(
    glowingPanel(
      30,
      18,
      new THREE.Vector3(0, 14, 3),
      new THREE.Euler(Math.PI / 2, 0, 0),
      0xfff4e4,
      3.4,
    ),
  );

  /* Big side soft box. */
  envScene.add(
    glowingPanel(
      20,
      12,
      new THREE.Vector3(-16, 6, 0),
      new THREE.Euler(0, Math.PI / 2, 0),
      0xf7f3ea,
      2.3,
    ),
  );

  /* A narrow strip on the opposite side draws a crisp line down the flank. */
  envScene.add(
    glowingPanel(
      5,
      16,
      new THREE.Vector3(16, 6, 1),
      new THREE.Euler(0, -Math.PI / 2, 0),
      0xfff7ea,
      3.2,
    ),
  );

  /* Cool front fill and a warm rear rim. */
  envScene.add(
    glowingPanel(
      14,
      8,
      new THREE.Vector3(0, 6, 18),
      new THREE.Euler(0, Math.PI, 0),
      0xdfe7ef,
      1.5,
    ),
  );
  envScene.add(
    glowingPanel(
      12,
      8,
      new THREE.Vector3(-4, 7, -16),
      new THREE.Euler(0, 0, 0),
      0xfff0de,
      1.9,
    ),
  );

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(envScene, 0.035, 1, 60);

  envScene.traverse((child) => {
    if (child.isMesh) {
      child.geometry.dispose();
      child.material.dispose();
    }
  });
  pmrem.dispose();

  return target;
}

/* ---------------------------------------------------------------- build */

export function createStudio(scene, renderer) {
  scene.background = new THREE.Color(0xe9e8e4);
  scene.fog = new THREE.Fog(0xf4f2ed, 30, 95);

  /* Backdrop: a giant inverted sphere with a soft cyclorama gradient. */
  const backdropGeometry = new THREE.SphereGeometry(56, 64, 42);
  const backdropPosition = backdropGeometry.getAttribute('position');
  const colors = new Float32Array(backdropPosition.count * 3);

  const top = new THREE.Color(0xfffefb);
  const horizon = new THREE.Color(0xf7f5f0);
  const bottom = new THREE.Color(0xf7f5f0);
  const glow = new THREE.Color(0xfff6ea);
  const glowDirection = new THREE.Vector3(-0.42, 0.38, -0.82).normalize();
  const direction = new THREE.Vector3();
  const color = new THREE.Color();

  for (let i = 0; i < backdropPosition.count; i += 1) {
    direction
      .set(backdropPosition.getX(i), backdropPosition.getY(i), backdropPosition.getZ(i))
      .normalize();

    if (direction.y >= 0) {
      color.copy(horizon).lerp(top, smoothstep(0, 0.8, direction.y));
    } else {
      color.copy(horizon).lerp(bottom, smoothstep(0, 0.5, -direction.y));
    }

    const halo =
      Math.pow(Math.max(0, direction.dot(glowDirection)), 7) *
      0.045 *
      (0.35 + 0.65 * smoothstep(-0.1, 0.6, direction.y));
    color.r += glow.r * halo;
    color.g += glow.g * halo;
    color.b += glow.b * halo;

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  backdropGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const backdropMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial);
  backdrop.renderOrder = -10;
  backdrop.frustumCulled = false;
  scene.add(backdrop);

  /* Environment reflections. */
  const envTarget = buildEnvironment(renderer);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 1.0;

  /* Floor. */
  const floorTexture = makeFloorTexture();
  const floorMaterial = new THREE.MeshPhysicalMaterial({
    map: floorTexture,
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.26,
    clearcoat: 0.72,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.7,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  /* Built-in contact shadow: keeps the car planted under the shadow map. */
  const contactTexture = makeContactTexture();
  const contactMaterial = new THREE.MeshBasicMaterial({
    map: contactTexture,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    color: 0x000000,
    toneMapped: false,
  });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 3.4), contactMaterial);
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, 0.004, 0);
  contact.renderOrder = 1;
  scene.add(contact);

  /* --------------------------------------------------------------- light */

  const hemisphere = new THREE.HemisphereLight(0xfff8ed, 0xbdb7ac, 0.6);
  scene.add(hemisphere);

  const key = new THREE.DirectionalLight(0xfff5e8, 2.35);
  key.position.set(-5.2, 7.6, 5.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -5.4;
  key.shadow.camera.right = 5.4;
  key.shadow.camera.top = 5.4;
  key.shadow.camera.bottom = -5.4;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 24;
  key.shadow.bias = -0.00035;
  key.shadow.normalBias = 0.024;
  key.shadow.radius = 3;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xe8eef4, 0.78);
  fill.position.set(6.5, 3.4, 3.2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffe9d1, 1.0);
  rim.position.set(2.4, 4.8, -6.5);
  scene.add(rim);

  function dispose() {
    scene.remove(backdrop, floor, contact, hemisphere, key, fill, rim);
    backdropGeometry.dispose();
    backdropMaterial.dispose();
    floor.geometry.dispose();
    floorMaterial.dispose();
    floorTexture.dispose();
    contact.geometry.dispose();
    contactMaterial.dispose();
    contactTexture.dispose();
    envTarget.dispose();
    scene.environment = null;
    scene.fog = null;
  }

  return { backdrop, floor, contact, key, dispose };
}


