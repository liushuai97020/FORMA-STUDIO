/* ==========================================================================
   CASA MAR — FORMA, study 01
   --------------------------------------------------------------------------
   A real-time architectural maquette of a cliffside beach house in Comporta.

   Scene graph
     scene
     ├─ villa      (stone deck, pool, two volumes, roof, fins, interiors)
     ├─ landscape  (dune shelf, palms, grasses, sea, sky, distant headland)
     └─ light rig  (sun, sky bounce, interior warmth, eave downlights)

   Interaction: drag to orbit with damped inertia and a slow auto-orbit, a
   gentle pointer parallax on the sun, and a day / dusk light transition.
   No external assets, no network requests, no page scroll hijacking.
   ========================================================================== */

import * as THREE from 'three';
import '@fontsource-variable/archivo/index.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/jetbrains-mono/400.css';

import { createMaterials } from './materials.js';
import { createVilla } from './architecture.js';
import { createLandscape } from './landscape.js';
import { getView, ORBIT_LIMITS } from './framing.js';
import { createEnvironment } from './textures.js';

/* --------------------------------------------------------------------------
   Environment
   -------------------------------------------------------------------------- */

const canvas = document.getElementById('stage');
const toggle = document.getElementById('light-toggle');
const params = new URLSearchParams(window.location.search);
const COVER = params.get('cover') === '1';
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = window.matchMedia('(pointer: coarse)').matches;
const MOBILE = COARSE || Math.min(window.innerWidth, window.innerHeight) < 700;

document.body.classList.toggle('is-cover', COVER);

const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;
const UP = new THREE.Vector3(0, 1, 0);

/* --------------------------------------------------------------------------
   Palettes
   -------------------------------------------------------------------------- */

function colour(hex) {
  return new THREE.Color(hex);
}

const DAY = {
  skyZenith: colour('#a7c6d3'),
  skyMid: colour('#d4e1e2'),
  skyHorizon: colour('#f2e6d3'),
  cloud: 0.34,
  sunColour: colour('#fff2da'),
  sunDirection: new THREE.Vector3(-0.7, 0.55, 0.35).normalize(),
  sunIntensity: 2.5,
  hemiSky: colour('#dfebeb'),
  hemiGround: colour('#c6b198'),
  hemiIntensity: 1.15,
  fillIntensity: 0.32,
  fog: colour('#e8dfd0'),
  exposure: 1.0,
  envIntensity: 0.85,
  seaDeep: colour('#2a5961'),
  seaShallow: colour('#5d908c'),
  seaSky: colour('#e2e9e3'),
  poolDeep: colour('#265a5c'),
  poolSky: colour('#dfe9e4'),
  windowGlow: 0.08,
  stripGlow: 0.05,
  downlightGlow: 0.15,
  poolLampGlow: 0,
};

const DUSK = {
  skyZenith: colour('#6f7d90'),
  skyMid: colour('#b18f88'),
  skyHorizon: colour('#f0b083'),
  cloud: 0.2,
  sunColour: colour('#ffb178'),
  sunDirection: new THREE.Vector3(-0.82, 0.2, 0.12).normalize(),
  sunIntensity: 1.15,
  hemiSky: colour('#626d7f'),
  hemiGround: colour('#4b3b31'),
  hemiIntensity: 0.5,
  fillIntensity: 0.1,
  fog: colour('#c49c8b'),
  exposure: 1.06,
  envIntensity: 0.5,
  seaDeep: colour('#1c3b49'),
  seaShallow: colour('#3b606b'),
  seaSky: colour('#dba487'),
  poolDeep: colour('#1c414b'),
  poolSky: colour('#d9a486'),
  windowGlow: 1.35,
  stripGlow: 0.8,
  downlightGlow: 1.4,
  poolLampGlow: 1.6,
};

const DAY_ENVIRONMENT = {
  zenith: '#dcecf3',
  skyMid: '#e6eeed',
  horizon: '#f7ebda',
  groundNear: '#cbbaa3',
  groundFar: '#958876',
  sunU: 0.2,
  sunV: 0.3,
  sunGlowStrong: 'rgba(255, 246, 226, 1)',
  sunGlowSoft: 'rgba(255, 233, 201, 0.5)',
  haze: 'rgba(255, 250, 242, 0.5)',
};

const DUSK_ENVIRONMENT = {
  zenith: '#7b8799',
  skyMid: '#a58c8e',
  horizon: '#f2b98c',
  groundNear: '#6f5546',
  groundFar: '#3f3734',
  sunU: 0.12,
  sunV: 0.44,
  sunGlowStrong: 'rgba(255, 190, 130, 1)',
  sunGlowSoft: 'rgba(255, 150, 92, 0.5)',
  haze: 'rgba(255, 203, 160, 0.45)',
};

/* --------------------------------------------------------------------------
   Renderer / scene / camera
   -------------------------------------------------------------------------- */

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
  });
} catch (error) {
  console.warn('Casa Mar: WebGL is unavailable.', error);
}

if (!renderer) {
  document.body.classList.add('no-webgl', 'is-ready');
} else {
  boot(renderer);
}

function boot(renderer) {

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = DAY.exposure;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.setClearColor(DAY.fog, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(DAY.fog.clone(), 120, 820);

const camera = new THREE.PerspectiveCamera(
  30,
  window.innerWidth / Math.max(1, window.innerHeight),
  0.1,
  2600,
);

let view = getView(camera.aspect, { cover: COVER });
camera.fov = view.fov;
camera.updateProjectionMatrix();
camera.position.set(0, 18, 50);
camera.lookAt(view.target);

/* --------------------------------------------------------------------------
   Materials, architecture, landscape
   -------------------------------------------------------------------------- */

const materials = createMaterials();
const villa = createVilla(materials);
const landscape = createLandscape(materials);
scene.add(villa.group, landscape.group);

const envDay = createEnvironment(renderer, DAY_ENVIRONMENT);
const envDusk = COVER ? envDay : createEnvironment(renderer, DUSK_ENVIRONMENT);
scene.environment = envDay;
scene.environmentIntensity = DAY.envIntensity;

/* --------------------------------------------------------------------------
   Light rig
   -------------------------------------------------------------------------- */

const hemi = new THREE.HemisphereLight(DAY.hemiSky, DAY.hemiGround, DAY.hemiIntensity);
scene.add(hemi);

const sunTarget = new THREE.Object3D();
sunTarget.position.set(0, 0.6, -4.5);
scene.add(sunTarget);

const sun = new THREE.DirectionalLight(DAY.sunColour, DAY.sunIntensity);
sun.target = sunTarget;
sun.castShadow = true;
const shadowSize = MOBILE ? 1024 : 2048;
sun.shadow.mapSize.set(shadowSize, shadowSize);
sun.shadow.camera.left = -38;
sun.shadow.camera.right = 42;
sun.shadow.camera.top = 38;
sun.shadow.camera.bottom = -34;
sun.shadow.camera.near = 22;
sun.shadow.camera.far = 190;
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.032;
sun.shadow.radius = MOBILE ? 2 : 3.4;
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun);

const fill = new THREE.DirectionalLight(colour('#c7d8dc'), DAY.fillIntensity);
fill.position.set(34, 20, 52);
scene.add(fill);

/* --------------------------------------------------------------------------
   Shader references
   -------------------------------------------------------------------------- */

const sky = landscape.sky;
const sea = landscape.sea;
const pool = villa.water;

const allInteriorLights = villa.lights.interiorLights;
const allDuskLights = villa.lights.duskLights;
const poolLamps = villa.poolLamps;

/* --------------------------------------------------------------------------
   View / interaction state
   -------------------------------------------------------------------------- */

const state = {
  duskTarget: 0,
  dusk: 0,
  pointerX: 0,
  pointerY: 0,
  pointerTargetX: 0,
  pointerTargetY: 0,
  azimuthOffset: 0,
  polarOffset: 0,
  azimuthVelocity: 0,
  polarVelocity: 0,
  autoPhase: 0,
  intro: COVER || REDUCED ? 1 : 0,
  introDuration: 1.45,
  lastInteract: 0,
  elapsed: 0,
};

const drag = {
  active: false,
  pointerId: null,
  lastX: 0,
  lastY: 0,
  lastTime: 0,
};

let running = true;
let rafId = 0;
const clock = new THREE.Clock();

/* --------------------------------------------------------------------------
   Palette application
   -------------------------------------------------------------------------- */

let activeEnvironment = envDay;

function applyPalette(mix) {
  sky.uniforms.uZenith.value.lerpColors(DAY.skyZenith, DUSK.skyZenith, mix);
  sky.uniforms.uMid.value.lerpColors(DAY.skyMid, DUSK.skyMid, mix);
  sky.uniforms.uHorizon.value.lerpColors(DAY.skyHorizon, DUSK.skyHorizon, mix);
  sky.uniforms.uSunColor.value.lerpColors(DAY.sunColour, DUSK.sunColour, mix);
  sky.uniforms.uCloud.value = THREE.MathUtils.lerp(DAY.cloud, DUSK.cloud, mix);

  sea.uniforms.uDeep.value.lerpColors(DAY.seaDeep, DUSK.seaDeep, mix);
  sea.uniforms.uShallow.value.lerpColors(DAY.seaShallow, DUSK.seaShallow, mix);
  sea.uniforms.uSky.value.lerpColors(DAY.seaSky, DUSK.seaSky, mix);
  sea.uniforms.uSunColor.value.lerpColors(DAY.sunColour, DUSK.sunColour, mix);

  pool.uniforms.uDeep.value.lerpColors(DAY.poolDeep, DUSK.poolDeep, mix);
  pool.uniforms.uSky.value.lerpColors(DAY.poolSky, DUSK.poolSky, mix);
  pool.uniforms.uSunColor.value.lerpColors(DAY.sunColour, DUSK.sunColour, mix);

  hemi.color.lerpColors(DAY.hemiSky, DUSK.hemiSky, mix);
  hemi.groundColor.lerpColors(DAY.hemiGround, DUSK.hemiGround, mix);
  hemi.intensity = THREE.MathUtils.lerp(DAY.hemiIntensity, DUSK.hemiIntensity, mix);

  sun.color.lerpColors(DAY.sunColour, DUSK.sunColour, mix);
  sun.intensity = THREE.MathUtils.lerp(DAY.sunIntensity, DUSK.sunIntensity, mix);
  fill.intensity = THREE.MathUtils.lerp(DAY.fillIntensity, DUSK.fillIntensity, mix);

  scene.fog.color.lerpColors(DAY.fog, DUSK.fog, mix);
  renderer.setClearColor(scene.fog.color, 1);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(DAY.exposure, DUSK.exposure, mix);
  scene.environmentIntensity = THREE.MathUtils.lerp(DAY.envIntensity, DUSK.envIntensity, mix);

  materials.windowGlow.emissiveIntensity = THREE.MathUtils.lerp(DAY.windowGlow, DUSK.windowGlow, mix);
  materials.stripGlow.opacity = THREE.MathUtils.lerp(DAY.stripGlow, DUSK.stripGlow, mix);
  materials.downlight.emissiveIntensity = THREE.MathUtils.lerp(DAY.downlightGlow, DUSK.downlightGlow, mix);
  materials.poolLamp.emissiveIntensity = THREE.MathUtils.lerp(DAY.poolLampGlow, DUSK.poolLampGlow, mix);

  for (const entry of allInteriorLights) {
    entry.light.intensity = THREE.MathUtils.lerp(entry.day, entry.dusk, mix);
  }
  for (const entry of allDuskLights) {
    entry.light.intensity = THREE.MathUtils.lerp(entry.day, entry.dusk, mix);
  }

  const nextEnvironment = mix > 0.5 ? envDusk : envDay;
  if (nextEnvironment !== activeEnvironment) {
    activeEnvironment = nextEnvironment;
    scene.environment = activeEnvironment;
  }
}

/* --------------------------------------------------------------------------
   Camera helpers
   -------------------------------------------------------------------------- */

const orbitTarget = new THREE.Vector3();
const orbitDirection = new THREE.Vector3();

function updateCamera(dt) {
  const base = view;
  const now = state.elapsed;
  const idle = state.lastInteract === 0 || now - state.lastInteract > 2.4;

  if (!REDUCED && !COVER && idle && !drag.active) {
    state.autoPhase += dt * 0.16;
  }
  const autoAzimuth = REDUCED || COVER ? 0 : Math.sin(state.autoPhase) * 0.055;
  const autoPolar = REDUCED || COVER ? 0 : Math.sin(state.autoPhase * 0.7) * 0.008;

  /* Inertia after a drag. */
  if (!drag.active) {
    state.azimuthOffset += state.azimuthVelocity * dt;
    state.polarOffset += state.polarVelocity * dt;
    const friction = Math.exp(-3.4 * dt);
    state.azimuthVelocity *= friction;
    state.polarVelocity *= friction;
  }

  state.azimuthOffset = clamp(state.azimuthOffset, -ORBIT_LIMITS.azimuth, ORBIT_LIMITS.azimuth);
  state.polarOffset = clamp(state.polarOffset, -0.16, 0.26);

  const intro = state.intro;
  const eased = 1 - Math.pow(1 - intro, 3);

  const azimuth = base.azimuth + state.azimuthOffset + autoAzimuth;
  const polar = clamp(
    base.polar + state.polarOffset + autoPolar + (1 - eased) * 0.05,
    ORBIT_LIMITS.polarMin,
    ORBIT_LIMITS.polarMax,
  );

  orbitTarget.copy(base.target);
  orbitTarget.x += state.pointerX * 0.42;
  orbitTarget.y += -state.pointerY * 0.22;
  orbitTarget.y += (1 - eased) * 0.45;

  const distance =
    base.distance *
    (1 + Math.abs(state.azimuthOffset) * 0.1) *
    (1 + (1 - eased) * 0.3);

  orbitDirection.set(
    Math.sin(azimuth) * Math.cos(polar),
    Math.sin(polar),
    Math.cos(azimuth) * Math.cos(polar),
  );
  camera.position.copy(orbitTarget).addScaledVector(orbitDirection, distance);
  camera.lookAt(orbitTarget);
}

function updateSun() {
  const mix = state.dusk;
  const sunDirection = new THREE.Vector3()
    .lerpVectors(DAY.sunDirection, DUSK.sunDirection, mix)
    .normalize();

  if (!REDUCED) {
    sunDirection.applyAxisAngle(UP, state.pointerX * 0.045);
    sunDirection.y = clamp(sunDirection.y - state.pointerY * 0.018, 0.08, 0.92);
    sunDirection.normalize();
  }

  sun.position.copy(sunTarget.position).addScaledVector(sunDirection, 95);
  sun.target.updateMatrixWorld();
  sky.uniforms.uSunDirection.value.copy(sunDirection);
  sea.uniforms.uSunDirection.value.copy(sunDirection);
  pool.uniforms.uSunDirection.value.copy(sunDirection);
  sky.uniforms.uSunIntensity.value = THREE.MathUtils.lerp(1.0, 1.2, mix);
  sea.uniforms.uSunIntensity.value = THREE.MathUtils.lerp(1.0, 0.85, mix);
  pool.uniforms.uSunIntensity.value = THREE.MathUtils.lerp(1.0, 0.8, mix);
}

function updateShaderTime() {
  const time = REDUCED ? 0.35 : state.elapsed * 0.5;
  sky.uniforms.uTime.value = time;
  sea.uniforms.uTime.value = time;
  pool.uniforms.uTime.value = time * 1.4;
}

/* --------------------------------------------------------------------------
   Pointer interaction
   -------------------------------------------------------------------------- */

function setPointer(event) {
  const rect = canvas.getBoundingClientRect();
  state.pointerTargetX = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
  state.pointerTargetY = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
}

function onPointerDown(event) {
  if (event.button !== undefined && event.button !== 0) return;
  if (drag.active) return;
  drag.active = true;
  drag.pointerId = event.pointerId;
  drag.lastX = event.clientX;
  drag.lastY = event.clientY;
  drag.lastTime = performance.now();
  state.azimuthVelocity = 0;
  state.polarVelocity = 0;
  state.lastInteract = state.elapsed;
  canvas.setPointerCapture(event.pointerId);
  document.body.classList.add('is-dragging');
  setPointer(event);
}

function onPointerMove(event) {
  setPointer(event);
  if (!drag.active || event.pointerId !== drag.pointerId) return;

  const now = performance.now();
  const dt = Math.max(8, now - drag.lastTime) / 1000;
  const dx = event.clientX - drag.lastX;
  const dy = event.clientY - drag.lastY;
  drag.lastX = event.clientX;
  drag.lastY = event.clientY;
  drag.lastTime = now;

  state.azimuthOffset = clamp(
    state.azimuthOffset + dx * 0.0052,
    -ORBIT_LIMITS.azimuth,
    ORBIT_LIMITS.azimuth,
  );
  state.polarOffset = clamp(state.polarOffset + dy * 0.0028, -0.16, 0.26);
  state.azimuthVelocity = (dx / dt) * 0.0019;
  state.polarVelocity = (dy / dt) * 0.001;
  state.lastInteract = state.elapsed;
}

function endDrag(event) {
  if (!drag.active || (event && event.pointerId !== drag.pointerId)) return;
  drag.active = false;
  if (event && canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  document.body.classList.remove('is-dragging');
  state.lastInteract = state.elapsed;
}

function onPointerLeave() {
  if (!drag.active) {
    state.pointerTargetX = 0;
    state.pointerTargetY = 0;
  }
}

canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('lostpointercapture', endDrag);
canvas.addEventListener('pointerleave', onPointerLeave);

/* --------------------------------------------------------------------------
   Day / dusk
   -------------------------------------------------------------------------- */

function setDusk(next) {
  state.duskTarget = next ? 1 : 0;
  document.body.classList.toggle('is-dusk', Boolean(next));
  if (toggle) {
    toggle.setAttribute('aria-checked', next ? 'true' : 'false');
  }
}

if (toggle) {
  toggle.addEventListener('click', () => {
    setDusk(state.duskTarget < 0.5);
  });
}

/* --------------------------------------------------------------------------
   Resize
   -------------------------------------------------------------------------- */

function resize() {
  const width = window.innerWidth;
  const height = Math.max(1, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  view = getView(camera.aspect, { cover: COVER });
  camera.fov = view.fov;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);

/* --------------------------------------------------------------------------
   Frame loop
   -------------------------------------------------------------------------- */

function frame() {
  if (!running) return;
  rafId = window.requestAnimationFrame(frame);

  const dt = Math.min(clock.getDelta(), 0.05);
  state.elapsed += dt;

  if (!COVER && !REDUCED && state.intro < 1) {
    state.intro = Math.min(1, state.intro + dt / state.introDuration);
  } else {
    state.intro = 1;
  }

  state.dusk = damp(state.dusk, state.duskTarget, 2.1, dt);
  if (Math.abs(state.dusk - state.duskTarget) < 0.001) state.dusk = state.duskTarget;

  state.pointerX = damp(state.pointerX, state.pointerTargetX, 3.4, dt);
  state.pointerY = damp(state.pointerY, state.pointerTargetY, 3.4, dt);

  applyPalette(state.dusk);
  updateSun();
  updateShaderTime();
  updateCamera(dt);

  renderer.render(scene, camera);
}

/* --------------------------------------------------------------------------
   Lifecycle
   -------------------------------------------------------------------------- */

function reveal() {
  document.body.classList.add('is-ready');
}

function start() {
  applyPalette(0);
  updateSun();
  updateShaderTime();
  updateCamera(0);
  renderer.render(scene, camera);
  window.setTimeout(reveal, COVER ? 0 : 80);
  rafId = window.requestAnimationFrame(frame);
}

function stop() {
  running = false;
  window.cancelAnimationFrame(rafId);
}

function resume() {
  if (running) return;
  running = true;
  clock.getDelta();
  rafId = window.requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stop();
  } else {
    resume();
  }
});

function dispose() {
  stop();
  const seenMaterials = new Set();
  const seenGeometries = new Set();

  scene.traverse((object) => {
    if (object.geometry && !seenGeometries.has(object.geometry)) {
      seenGeometries.add(object.geometry);
      object.geometry.dispose();
    }
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) {
      if (!material || seenMaterials.has(material)) continue;
      seenMaterials.add(material);
      for (const key of ['map', 'roughnessMap', 'normalMap', 'alphaMap', 'emissiveMap']) {
        if (material[key] && material[key].isTexture) material[key].dispose();
      }
      material.dispose();
    }
  });

  if (envDay) envDay.dispose();
  if (envDusk && envDusk !== envDay) envDusk.dispose();
  renderer.dispose();
  renderer.forceContextLoss?.();
}

window.addEventListener('pagehide', dispose, { once: true });

window.addEventListener('keydown', (event) => {
  if (event.key === 'd' || event.key === 'D') {
    setDusk(state.duskTarget < 0.5);
  }
});

start();
}
