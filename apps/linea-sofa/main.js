// ==========================================================================
// Linea Sofa — FORMA study 04
//
// A low modular lounge in a warm, minimal studio. Native ES modules + Three.js,
// no external assets: geometry is procedural, fabric and stone are painted on
// canvases, the studio environment is generated at runtime.
//
// Modes:
//   default      full editorial overlay, damped orbit, gentle idle drift
//   ?cover=1     overlay hidden, fixed 3/4 cover angle, no intro delay
// ==========================================================================

import * as THREE from 'three';
import '@fontsource-variable/archivo/index.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/jetbrains-mono/400.css';

import { createFurniture } from './furniture.js';
import { createOrbit } from './orbit.js';
import { createStudio } from './studio.js';

const params = new URLSearchParams(window.location.search);
const COVER_MODE = params.has('cover');
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.getElementById('scene');
const UP = new THREE.Vector3(0, 1, 0);

if (COVER_MODE) document.documentElement.classList.add('is-cover');

/* -------------------------------------------------------------------------- */
/*  Framing                                                                   */
/* -------------------------------------------------------------------------- */

function computeFraming(camera, aspect, bounds) {
  const portrait = aspect < 0.9;
  const center = bounds.getCenter(new THREE.Vector3());
  const az = COVER_MODE ? -0.62 : portrait ? -0.82 : -0.54;
  const el = COVER_MODE ? 0.235 : portrait ? 0.26 : 0.27;

  const direction = new THREE.Vector3(
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    Math.cos(az) * Math.cos(el),
  );
  const forward = direction.clone().negate();
  const right = new THREE.Vector3().crossVectors(forward, UP).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();

  const min = bounds.min;
  const max = bounds.max;
  const corners = [];
  for (let x = 0; x < 2; x += 1) {
    for (let y = 0; y < 2; y += 1) {
      for (let z = 0; z < 2; z += 1) {
        corners.push(
          new THREE.Vector3(
            x === 0 ? min.x : max.x,
            y === 0 ? min.y : max.y,
            z === 0 ? min.z : max.z,
          ).sub(center),
        );
      }
    }
  }

  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const padding = COVER_MODE ? 1.03 : portrait ? 1.02 : 1.05;

  // Solve the fit per corner: a close corner needs a larger radius because
  // it subtends a wider angle than a far one.
  let radius = 4.2;
  for (let i = 0; i < corners.length; i += 1) {
    const corner = corners[i];
    const depth = corner.dot(direction);
    const lateral = Math.abs(corner.dot(right));
    const vertical = Math.abs(corner.dot(up));
    radius = Math.max(
      radius,
      depth + (lateral * padding) / Math.tan(horizontalFov / 2),
      depth + (vertical * padding) / Math.tan(verticalFov / 2),
    );
  }

  const visibleHeight = 2 * radius * Math.tan(verticalFov / 2);
  const lift = COVER_MODE
    ? visibleHeight * 0.01
    : visibleHeight * (portrait ? 0.05 : 0.034);

  const target = center.clone();
  target.y -= lift;

  // Leave breathing room for the type block while keeping the product whole.
  if (COVER_MODE) {
    target.addScaledVector(right, -Math.min(0.55, radius * 0.08));
  } else if (aspect >= 0.9) {
    target.addScaledVector(right, -Math.min(0.95, radius * 0.155));
  } else {
    target.addScaledVector(right, -Math.min(0.1, radius * 0.008));
  }

  return { az, el, radius, target };
}

/* -------------------------------------------------------------------------- */
/*  Boot                                                                      */
/* -------------------------------------------------------------------------- */

function boot() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    console.warn('Linea Sofa: WebGL is unavailable.', error);
    document.body.classList.add('no-webgl');
    return;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / Math.max(height, 1);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3eee6);
  scene.fog = new THREE.Fog(0xf3eee6, 13, 34);

  const camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 90);

  const studio = createStudio(renderer);
  scene.add(studio.group);
  scene.environment = studio.environment;
  scene.environmentIntensity = 0.6;

  const furniture = createFurniture(renderer);
  scene.add(furniture.group);

  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  furniture.group.traverse((object) => {
    if (object.isMesh && !object.userData.ignoreFraming) bounds.expandByObject(object);
  });
  if (bounds.isEmpty()) bounds.setFromObject(furniture.group);

  const orbit = createOrbit({
    camera,
    dom: canvas,
    reducedMotion: REDUCED_MOTION,
    cover: COVER_MODE,
    onInteract: () => document.body.classList.add('has-interacted'),
  });

  orbit.setFraming(computeFraming(camera, aspect, bounds), { immediate: true });
  orbit.startIntro();

  /* --------------------------------------------------------------- swatches */

  const swatchButtons = Array.from(document.querySelectorAll('.swatch'));
  const swatchNameZh = document.querySelector('.swatches__name-zh');
  const swatchNameEn = document.querySelector('.swatches__name-en');
  const swatchGroup = document.querySelector('.swatches__row');

  function applyChipColours() {
    for (let i = 0; i < swatchButtons.length; i += 1) {
      const button = swatchButtons[i];
      const fabric = furniture.fabrics.find((entry) => entry.id === button.dataset.fabric);
      if (fabric) button.style.setProperty('--chip', fabric.hex);
    }
  }

  function selectFabric(id, { focus = false } = {}) {
    furniture.setFabric(id);
    const fabric = furniture.fabrics.find((entry) => entry.id === id);
    if (!fabric) return;

    for (let i = 0; i < swatchButtons.length; i += 1) {
      const button = swatchButtons[i];
      const active = button.dataset.fabric === id;
      button.setAttribute('aria-checked', active ? 'true' : 'false');
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    }
    if (swatchNameZh) swatchNameZh.textContent = fabric.label;
    if (swatchNameEn) swatchNameEn.textContent = fabric.labelEn;
  }

  for (let i = 0; i < swatchButtons.length; i += 1) {
    const button = swatchButtons[i];
    button.addEventListener('click', () => selectFabric(button.dataset.fabric));
  }

  if (swatchGroup) {
    swatchGroup.addEventListener('keydown', (event) => {
      const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const activeIndex = swatchButtons.findIndex(
        (button) => button.getAttribute('aria-checked') === 'true',
      );
      const lastIndex = swatchButtons.length - 1;
      let nextIndex = activeIndex < 0 ? 0 : activeIndex;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = Math.min(activeIndex + 1, lastIndex);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = Math.max(activeIndex - 1, 0);
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = lastIndex;
      }
      selectFabric(swatchButtons[nextIndex].dataset.fabric, { focus: true });
    });
  }

  applyChipColours();
  selectFabric(furniture.fabricId);

  /* ---------------------------------------------------------------- reveal */

  if (!COVER_MODE) {
    const reveals = () => document.body.classList.add('is-ready');
    if (REDUCED_MOTION) {
      reveals();
    } else {
      const fonts =
        document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      Promise.race([fonts, new Promise((resolve) => window.setTimeout(resolve, 700))]).then(() => {
        window.setTimeout(reveals, 180);
      });
      window.setTimeout(reveals, 1600);
    }
  } else {
    document.body.classList.add('is-ready');
  }

  /* ------------------------------------------------------------------ loop */

  let frameHandle = 0;
  let running = true;
  let disposed = false;
  let lastTime = performance.now();
  let firstFrame = true;

  function renderFrame(now) {
    frameHandle = 0;
    if (!running || disposed) return;
    const dt = Math.min(Math.max((now - lastTime) / 1000, 0), 0.05);
    lastTime = now;
    orbit.update(dt);
    furniture.update(dt);
    renderer.render(scene, camera);

    if (firstFrame) {
      firstFrame = false;
      document.body.classList.add('is-rendered');
      window.__lineaReady = true;
      window.dispatchEvent(new CustomEvent('linea-ready'));
    }

    frameHandle = window.requestAnimationFrame(renderFrame);
  }

  function start() {
    if (disposed || running) return;
    running = true;
    lastTime = performance.now();
    frameHandle = window.requestAnimationFrame(renderFrame);
  }

  function stop() {
    running = false;
    if (frameHandle) window.cancelAnimationFrame(frameHandle);
    frameHandle = 0;
  }

  frameHandle = window.requestAnimationFrame(renderFrame);

  /* --------------------------------------------------------------- resize */

  let resizeFrame = 0;
  function handleResize() {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      if (disposed) return;
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;
      const nextAspect = nextWidth / Math.max(nextHeight, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(nextWidth, nextHeight, false);
      camera.aspect = nextAspect;
      camera.updateProjectionMatrix();
      orbit.setFraming(computeFraming(camera, nextAspect, bounds));
    });
  }

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);

  /* ----------------------------------------------------------- visibility */

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  });

  /* --------------------------------------------------------------- dispose */

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
    orbit.dispose();
    furniture.dispose();
    studio.dispose();
    scene.environment = null;
    renderer.dispose();
    window.__lineaReady = false;
  }

  window.addEventListener('pagehide', dispose, { once: true });
}

boot();
