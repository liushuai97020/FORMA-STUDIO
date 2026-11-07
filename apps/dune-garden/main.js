// ==========================================================================
// Dune Garden — FORMA study 05
//
// A warm, light architectural maquette of a coastal courtyard garden:
// sand-toned paving, a reflecting pool, raised dune-grass beds, sculptural
// cacti and olives, and a slatted timber pavilion between the house and the sea.
//
// Interaction: damped 3/4 orbit (drag / scroll / pinch) with a slow auto drift,
// plus a DAY / DUSK lighting transition. `?cover=1` serves a clean, fixed cover
// frame with no overlay; `prefers-reduced-motion` calms the wind and the camera.
// ==========================================================================

import * as THREE from 'three';
import '@fontsource-variable/archivo/index.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/jetbrains-mono/400.css';

import { createEnvironment } from './environment.js';
import { createArchitecture } from './architecture.js';
import { createPlanting } from './planting.js';
import { createReflection } from './reflection.js';

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const smoothstep = (x) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

const params = new URLSearchParams(window.location.search);
const COVER = params.get('cover') === '1';
const START_MODE = params.get('mode') === 'dusk' ? 'dusk' : 'day';
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (COVER) document.documentElement.classList.add('is-cover');

const canvas = document.getElementById('scene');

/* --------------------------------------------------------------------------
   Mood palettes
   -------------------------------------------------------------------------- */

const MOODS = {
  day: {
    skyTop: new THREE.Color(0x6fa2bd),
    skyHorizon: new THREE.Color(0xf1e4ce),
    sunColor: new THREE.Color(0xffedd3),
    sunDir: new THREE.Vector3(-0.5, 0.55, -0.62).normalize(),
    fog: new THREE.Color(0xd9d4c8),
    fogDensity: 0.002,
    hemiSky: new THREE.Color(0xd6e4ea),
    hemiGround: new THREE.Color(0xc2a985),
    hemiIntensity: 0.6,
    ambient: 0.05,
    sunIntensity: 4.0,
    exposure: 1.02,
  },
  dusk: {
    skyTop: new THREE.Color(0x5f7292),
    skyHorizon: new THREE.Color(0xf0b884),
    sunColor: new THREE.Color(0xffc187),
    sunDir: new THREE.Vector3(-0.3, 0.07, -0.95).normalize(),
    fog: new THREE.Color(0xcfb6a0),
    fogDensity: 0.0026,
    hemiSky: new THREE.Color(0x8a97ad),
    hemiGround: new THREE.Color(0x6d5340),
    hemiIntensity: 0.4,
    ambient: 0.05,
    sunIntensity: 2.5,
    exposure: 1.05,
  },
};

/* --------------------------------------------------------------------------
   Shared uniforms — sky, sea, pool and fog all read the same values
   -------------------------------------------------------------------------- */

const shared = {
  uTime: { value: 0 },
  uSkyTop: { value: new THREE.Color() },
  uSkyHorizon: { value: new THREE.Color() },
  uSunColor: { value: new THREE.Color() },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uFogColor: { value: new THREE.Color() },
  uFogDensity: { value: MOODS.day.fogDensity },
  uDusk: { value: 0 },
};

const windUniform = { value: 0 };

/* --------------------------------------------------------------------------
   Overlay reveal
   -------------------------------------------------------------------------- */

function revealOverlay() {
  document.body.classList.add('is-ready');
}

function scheduleReveal() {
  if (COVER) {
    revealOverlay();
    return;
  }
  const fonts =
    document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fonts, new Promise((resolve) => setTimeout(resolve, 900))]).then(() => {
    window.setTimeout(revealOverlay, 80);
  });
  window.setTimeout(revealOverlay, 2400);
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */

function boot() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
  } catch (error) {
    console.warn('Dune Garden: WebGL is unavailable.', error);
    document.body.classList.add('is-static');
    const message = document.createElement('p');
    message.className = 'noscript';
    message.textContent =
      'This study needs WebGL. Please open it in a browser with hardware acceleration enabled.';
    document.body.appendChild(message);
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = shared.uFogColor.value;
  scene.fog = new THREE.FogExp2(MOODS.day.fog, MOODS.day.fogDensity);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 900);
  camera.position.set(16, 11, 22);

  /* Scene --------------------------------------------------------------- */

  const environment = createEnvironment(scene, shared);
  const architecture = createArchitecture(shared);
  const planting = createPlanting(windUniform);

  scene.add(architecture.group);
  scene.add(planting.group);

  const reflection = createReflection({
    scene,
    camera,
    renderer,
    water: architecture.water,
    sea: environment.sea,
  });

  /* Camera state -------------------------------------------------------- */

  const view = {
    target: new THREE.Vector3(0.4, 1.45, -1.8),
    targetDest: new THREE.Vector3(0.4, 1.45, -1.8),
    yaw: 0.6,
    yawDest: 0.6,
    pitch: 0.195,
    pitchDest: 0.195,
    radius: 26,
    radiusDest: 26,
  };

  function framingFor(aspect) {
    if (aspect < 0.85) {
      return {
        radius: 30,
        pitch: 0.32,
        target: new THREE.Vector3(0.1, 1.4, -2.1),
      };
    }
    if (aspect > 2.0) {
      return {
        radius: 24.5,
        pitch: 0.2,
        target: new THREE.Vector3(0.6, 1.4, -1.6),
      };
    }
    return {
      radius: 26,
      pitch: 0.195,
      target: new THREE.Vector3(0.4, 1.45, -1.8),
    };
  }

  function applyFraming(aspect) {
    const framing = framingFor(aspect);
    view.radiusDest = framing.radius;
    view.pitchDest = framing.pitch;
    view.targetDest.copy(framing.target);

    if (COVER) {
      view.radius = framing.radius;
      view.pitch = framing.pitch;
      view.target.copy(framing.target);
      view.yaw = 0.6;
      view.yawDest = 0.6;
    }
  }

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
    reflection.setSize();
    applyFraming(camera.aspect);
  }

  resize();

  if (COVER) {
    view.radius = view.radiusDest;
    view.pitch = view.pitchDest;
    view.target.copy(view.targetDest);
    view.yaw = 0.6;
    view.yawDest = 0.6;
  }

  /* Mood state ---------------------------------------------------------- */

  let blend = START_MODE === 'dusk' ? 1 : 0;
  let blendTarget = blend;

  const buttons = Array.from(document.querySelectorAll('[data-mode]'));

  function setMode(mode) {
    blendTarget = mode === 'dusk' ? 1 : 0;
    for (const button of buttons) {
      const active = button.dataset.mode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  for (const button of buttons) {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  }
  setMode(START_MODE);

  const dayColors = {
    skyTop: MOODS.day.skyTop,
    skyHorizon: MOODS.day.skyHorizon,
    sunColor: MOODS.day.sunColor,
    fog: MOODS.day.fog,
    hemiSky: MOODS.day.hemiSky,
    hemiGround: MOODS.day.hemiGround,
  };
  const duskColors = {
    skyTop: MOODS.dusk.skyTop,
    skyHorizon: MOODS.dusk.skyHorizon,
    sunColor: MOODS.dusk.sunColor,
    fog: MOODS.dusk.fog,
    hemiSky: MOODS.dusk.hemiSky,
    hemiGround: MOODS.dusk.hemiGround,
  };

  function applyMood(t) {
    const day = MOODS.day;
    const dusk = MOODS.dusk;

    shared.uSkyTop.value.lerpColors(dayColors.skyTop, duskColors.skyTop, t);
    shared.uSkyHorizon.value.lerpColors(dayColors.skyHorizon, duskColors.skyHorizon, t);
    shared.uSunColor.value.lerpColors(dayColors.sunColor, duskColors.sunColor, t);
    shared.uSunDir.value.lerpVectors(day.sunDir, dusk.sunDir, t).normalize();
    shared.uFogColor.value.lerpColors(dayColors.fog, duskColors.fog, t);
    shared.uFogDensity.value = lerp(day.fogDensity, dusk.fogDensity, t);
    shared.uDusk.value = t;

    scene.fog.color.copy(shared.uFogColor.value);
    scene.fog.density = shared.uFogDensity.value;

    environment.hemisphere.color.lerpColors(
      dayColors.hemiSky,
      duskColors.hemiSky,
      t,
    );
    environment.hemisphere.groundColor.lerpColors(
      dayColors.hemiGround,
      duskColors.hemiGround,
      t,
    );
    environment.hemisphere.intensity = lerp(day.hemiIntensity, dusk.hemiIntensity, t);
    environment.ambient.intensity = lerp(day.ambient, dusk.ambient, t);

    environment.sun.color.copy(shared.uSunColor.value);
    environment.sun.intensity = lerp(day.sunIntensity, dusk.sunIntensity, t);
    environment.sun.position
      .copy(shared.uSunDir.value)
      .multiplyScalar(75)
      .add(new THREE.Vector3(0, 0, -1));

    renderer.toneMappingExposure = lerp(day.exposure, dusk.exposure, t);
    architecture.setDusk(t);
  }

  /* Interaction --------------------------------------------------------- */

  const pointers = new Map();
  let dragId = null;
  let lastX = 0;
  let lastY = 0;
  let pinchStartDistance = 0;
  let pinchStartRadius = 0;
  let isDragging = false;
  let driftMix = REDUCED ? 0 : 1;

  function pointerDistance() {
    const list = Array.from(pointers.values());
    return Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y);
  }

  function onPointerDown(event) {
    if (COVER) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture?.(event.pointerId);

    if (pointers.size === 1) {
      dragId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      isDragging = true;
      document.body.classList.add('is-dragging');
    } else if (pointers.size === 2) {
      pinchStartDistance = Math.max(1, pointerDistance());
      pinchStartRadius = view.radiusDest;
    }
  }

  function onPointerMove(event) {
    if (COVER) return;
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2) {
      const distance = Math.max(1, pointerDistance());
      view.radiusDest = clamp(
        pinchStartRadius * (pinchStartDistance / distance),
        16,
        46,
      );
      return;
    }

    if (event.pointerId !== dragId) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;

    view.yawDest -= dx * 0.0042;
    view.pitchDest = clamp(view.pitchDest + dy * 0.0032, 0.08, 0.82);
  }

  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (event.pointerId === dragId) {
      dragId = null;
      isDragging = false;
      document.body.classList.remove('is-dragging');
    }
    if (pointers.size < 2) pinchStartDistance = 0;
  }

  function onWheel(event) {
    if (COVER) return;
    event.preventDefault();
    view.radiusDest = clamp(
      view.radiusDest * Math.exp(event.deltaY * 0.0011),
      16,
      46,
    );
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', endPointer);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  /* Loop ---------------------------------------------------------------- */

  let rafId = 0;
  let lastTime = performance.now();
  let elapsed = 0;
  let introTime = 0;
  let disposed = false;
  const INTRO_DURATION = 1.45;

  function updateCamera(dt) {
    const damp = 1 - Math.exp(-dt * 5.5);
    view.yaw += (view.yawDest - view.yaw) * damp;
    view.pitch += (view.pitchDest - view.pitch) * damp;
    view.radius += (view.radiusDest - view.radius) * damp;
    view.target.lerp(view.targetDest, 1 - Math.exp(-dt * 3.6));

    driftMix += ((isDragging || REDUCED || COVER ? 0 : 1) - driftMix) * (1 - Math.exp(-dt * 2.2));

    const drift =
      (Math.sin(elapsed * 0.11) * 0.05 + Math.sin(elapsed * 0.043 + 1.3) * 0.022) *
      driftMix;

    const intro = COVER || REDUCED ? 1 : smoothstep(introTime / INTRO_DURATION);
    const radius = view.radius + (1 - intro) * 5.5;
    const pitch = view.pitch + (1 - intro) * -0.075;
    const yaw = view.yaw + drift + (1 - intro) * -0.09;
    const targetY = view.target.y + (1 - intro) * 0.3;

    const cosPitch = Math.cos(pitch);
    camera.position.set(
      view.target.x + Math.sin(yaw) * cosPitch * radius,
      targetY + Math.sin(pitch) * radius,
      view.target.z + Math.cos(yaw) * cosPitch * radius,
    );
    camera.lookAt(view.target.x, targetY, view.target.z);
  }

  function frame(now) {
    if (disposed) return;
    rafId = window.requestAnimationFrame(frame);

    const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    elapsed += dt;
    if (!COVER) introTime += dt;

    const speed = REDUCED ? 0.22 : 1;
    shared.uTime.value = elapsed * speed;
    windUniform.value = elapsed * speed;

    blend += (blendTarget - blend) * (1 - Math.exp(-dt * 3.2));
    applyMood(smoothstep(blend));

    updateCamera(dt);
    camera.updateMatrixWorld();
    reflection.update();

    environment.update(camera);
    renderer.render(scene, camera);
  }

  function startLoop() {
    if (rafId || disposed) return;
    lastTime = performance.now();
    rafId = window.requestAnimationFrame(frame);
  }

  function stopLoop() {
    if (!rafId) return;
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /* Visibility, resize, reveal ------------------------------------------ */

  function onVisibilityChange() {
    if (document.hidden) stopLoop();
    else startLoop();
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('resize', resize);

  /* Disposal ------------------------------------------------------------ */

  function dispose() {
    if (disposed) return;
    disposed = true;
    stopLoop();

    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', endPointer);
    canvas.removeEventListener('pointercancel', endPointer);
    canvas.removeEventListener('pointerleave', endPointer);
    canvas.removeEventListener('wheel', onWheel);

    const textures = new Set();
    scene.traverse((object) => {
      if (object.isMesh || object.isInstancedMesh) {
        object.geometry?.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const material of materials) {
          if (!material) continue;
          for (const value of Object.values(material)) {
            if (value && value.isTexture) textures.add(value);
          }
          material.dispose();
        }
        if (object.isInstancedMesh) object.dispose?.();
      }
    });
    for (const texture of textures) texture.dispose();
    reflection.dispose();

    scene.clear();
    renderer.dispose();
    renderer.forceContextLoss?.();
  }

  window.addEventListener('pagehide', dispose);

  /* Go ------------------------------------------------------------------ */

  applyMood(smoothstep(blend));
  updateCamera(0);
  environment.update(camera);
  renderer.render(scene, camera);

  startLoop();
  scheduleReveal();
}

boot();
