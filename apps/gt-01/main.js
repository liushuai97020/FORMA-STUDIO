/* ============================================================================
   GT-01 — FORMA, study 03
   ----------------------------------------------------------------------------
   A procedural electric grand tourer on a studio turntable. Native ES module,
   no framework. The car and studio are generated from code in car.js and
   studio.js; this file owns the renderer, the camera language, the turntable
   interaction, the paint chips, the reveal, and lifecycle clean-up.

   `?cover=1` renders a single, fixed 3/4 front cover frame with every overlay
   hidden — the Lead uses that for the project card.
   ============================================================================ */

import * as THREE from 'three';

/* Fonts are installed at the repository root and bundled by the parent build. */
import '@fontsource-variable/archivo/index.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/jetbrains-mono/400.css';

import { createCar } from './car.js';
import { createStudio } from './studio.js';

const params = new URLSearchParams(window.location.search);
const isCover = params.get('cover') === '1';
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const TARGET = new THREE.Vector3(0, 0.62, 0);
const AUTO_SPEED = 0.155;
const COVER_YAW = 0.0;
const INTRO_DURATION = 1.4;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

if (isCover) {
  document.body.classList.add('is-cover');
  document.documentElement.dataset.gt01Mode = 'cover';
} else {
  document.documentElement.dataset.gt01Mode = 'interactive';
}

init();

function init() {
  const canvas = document.getElementById('stage');
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
    document.body.classList.add('no-webgl', 'is-ready');
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 140);

  const studio = createStudio(scene, renderer);
  const car = createCar();
  scene.add(car.group);

  /* Bounding corners of the whole car in local space, used for the fit. */
  car.group.rotation.set(0, 0, 0);
  car.group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(car.group);
  bounds.min.y -= 0.02;
  bounds.max.y += 0.01;
  const corners = [];
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        corners.push(new THREE.Vector3(x, y, z));
      }
    }
  }

  const state = {
    yaw: 0,
    velocity: 0,
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastTime: 0,
    intro: motionQuery.matches ? 1 : 0,
    cameraDistance: 0,
    aspect: 1,
    ready: false,
  };

  let reducedMotion = motionQuery.matches;
  let rafId = 0;
  let lastFrameTime = 0;
  let disposed = false;

  /* ------------------------------------------------------------ viewport */

  function viewport() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const aspect = width / height;
    state.aspect = aspect;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);

    camera.aspect = aspect;
    camera.fov = isCover ? 26 : aspect < 0.9 ? 38 : 28;
    camera.updateProjectionMatrix();
    return aspect;
  }

  /* -------------------------------------------------------------- camera */

  function cameraDirection(aspect, elevationOffset = 0) {
    const portrait = aspect < 0.95 && !isCover;
    const azimuth = portrait ? 0.31 : 0.58;
    const elevation = (portrait ? 0.2 : 0.145) + elevationOffset;
    return new THREE.Vector3(
      -Math.cos(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      Math.sin(azimuth) * Math.cos(elevation),
    ).normalize();
  }

  function computeFit(aspect, yaw, fillX, fillY, elevationOffset = 0) {
    const direction = cameraDirection(aspect, elevationOffset);
    const forward = direction.clone().negate();
    const right = new THREE.Vector3().crossVectors(forward, WORLD_UP).normalize();
    const cameraUp = new THREE.Vector3().crossVectors(right, forward).normalize();

    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    const tanH = tanV * aspect;
    let distance = 0.1;

    for (const corner of corners) {
      const relative = corner
        .clone()
        .applyAxisAngle(WORLD_UP, yaw)
        .sub(TARGET);
      const x = relative.dot(right);
      const depth = relative.dot(direction);
      const y = relative.dot(cameraUp);
      distance = Math.max(
        distance,
        Math.abs(x) / (fillX * tanH) + depth,
        Math.abs(y) / (fillY * tanV) + depth,
      );
    }

    return { direction, distance: distance + 0.18 };
  }

  function placeCamera(fit) {
    camera.position.copy(TARGET).addScaledVector(fit.direction, state.cameraDistance);
    camera.lookAt(TARGET);
    camera.updateMatrixWorld();
  }

  function updateCamera(dt) {
    const ease = easeOutCubic(state.intro);
    const displayedYaw = state.yaw + (1 - ease) * 0.26;
    car.group.rotation.y = displayedYaw;

    const portrait = state.aspect < 0.95 && !isCover;
    const fillX = isCover ? 0.86 : portrait ? 0.92 : 0.82;
    const fillY = isCover ? 0.72 : portrait ? 0.7 : 0.7;

    const fit = computeFit(
      state.aspect,
      displayedYaw,
      fillX,
      fillY,
      (1 - ease) * 0.055,
    );
    const wanted = fit.distance * (1 + (1 - ease) * 0.16);

    if (state.cameraDistance === 0) {
      state.cameraDistance = wanted;
    } else if (dt > 0) {
      const blend = 1 - Math.exp(-3.2 * dt);
      state.cameraDistance += (wanted - state.cameraDistance) * blend;
    } else {
      state.cameraDistance = wanted;
    }

    placeCamera(fit);
    studio.contact.material.opacity = 0.62 * (0.2 + 0.8 * ease);
  }

  /* ----------------------------------------------------------- lifecycle */

  function frame(now) {
    if (disposed) return;
    rafId = window.requestAnimationFrame(frame);

    const dt = lastFrameTime ? Math.min(0.05, (now - lastFrameTime) / 1000) : 0.016;
    lastFrameTime = now;

    if (!reducedMotion && state.intro < 1) {
      state.intro = Math.min(1, state.intro + dt / INTRO_DURATION);
    }

    if (!state.dragging) {
      if (!reducedMotion) {
        state.yaw += state.velocity * dt;
        state.velocity *= Math.exp(-2.5 * dt);
        const idle = clamp(Math.abs(state.velocity) / 0.32, 0, 1);
        state.yaw += AUTO_SPEED * dt * (1 - idle) * easeOutCubic(state.intro);
      } else {
        state.velocity = 0;
      }
    }

    car.update(dt);
    updateCamera(dt);
    renderer.render(scene, camera);
  }

  function start() {
    if (disposed || isCover) return;
    if (!rafId) {
      lastFrameTime = 0;
      rafId = window.requestAnimationFrame(frame);
    }
  }

  function stop() {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    lastFrameTime = 0;
  }

  function markReady() {
    if (state.ready) return;
    state.ready = true;
    document.body.classList.add('is-ready');
    document.body.dataset.gt01Ready = 'true';
    window.__GT01_READY__ = true;
  }

  function renderCover() {
    viewport();
    state.yaw = COVER_YAW;
    car.group.rotation.y = COVER_YAW;

    const fit = computeFit(viewport(), COVER_YAW, 0.86, 0.72, 0);
    state.cameraDistance = fit.distance;
    placeCamera(fit);

    renderer.compile(scene, camera);
    renderer.render(scene, camera);

    window.requestAnimationFrame(() => {
      if (disposed) return;
      renderer.render(scene, camera);
      document.body.dataset.coverReady = 'true';
      window.__GT01_COVER_READY__ = true;
    });
  }

  /* ------------------------------------------------------------- resize */

  function onResize() {
    const aspect = viewport();
    if (isCover) {
      const fit = computeFit(aspect, COVER_YAW, 0.86, 0.72, 0);
      state.cameraDistance = fit.distance;
      car.group.rotation.y = COVER_YAW;
      placeCamera(fit);
      renderer.render(scene, camera);
    } else if (!state.ready) {
      updateCamera(0);
      renderer.render(scene, camera);
    }
  }

  /* -------------------------------------------------------- interaction */

  function onPointerDown(event) {
    if (isCover || reducedMotion) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    state.dragging = true;
    state.pointerId = event.pointerId;
    state.lastX = event.clientX;
    state.lastTime = performance.now();
    state.velocity = 0;
    document.body.classList.add('is-dragging');
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* Pointer capture is a nicety, not a requirement. */
    }
  }

  function onPointerMove(event) {
    if (!state.dragging || event.pointerId !== state.pointerId) return;
    const now = performance.now();
    const dt = Math.max(1, now - state.lastTime) / 1000;
    const dx = event.clientX - state.lastX;
    const delta = dx * 0.0062;

    state.yaw += delta;
    state.velocity = clamp(delta / dt, -4.5, 4.5);
    state.lastX = event.clientX;
    state.lastTime = now;
  }

  function endDrag(event) {
    if (!state.dragging || event.pointerId !== state.pointerId) return;
    state.dragging = false;
    state.pointerId = null;
    document.body.classList.remove('is-dragging');
    if (performance.now() - state.lastTime > 140) state.velocity = 0;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      /* Already released. */
    }
  }

  function onVisibilityChange() {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  }

  /* ------------------------------------------------------------- paints */

  const paintButtons = Array.from(document.querySelectorAll('.swatch'));

  function selectPaint(button) {
    const id = button.dataset.paint;
    if (!id) return;
    car.setPaint(id);
    for (const entry of paintButtons) {
      const active = entry === button;
      entry.classList.toggle('is-active', active);
      entry.setAttribute('aria-pressed', String(active));
    }
  }

  for (const button of paintButtons) {
    button.addEventListener('click', () => selectPaint(button));
  }

  /* ------------------------------------------------------------- events */

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibilityChange);

  const onMotionChange = (event) => {
    reducedMotion = event.matches;
    if (reducedMotion) {
      state.intro = 1;
      state.velocity = 0;
      state.dragging = false;
      document.body.classList.remove('is-dragging');
    }
  };
  if (motionQuery.addEventListener) {
    motionQuery.addEventListener('change', onMotionChange);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    canvas.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (motionQuery.addEventListener) {
      motionQuery.removeEventListener('change', onMotionChange);
    }

    car.dispose();
    studio.dispose();
    renderer.dispose();
    if (renderer.forceContextLoss) renderer.forceContextLoss();
  }

  window.addEventListener('pagehide', dispose, { once: true });

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    stop();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    if (!isCover) start();
  });

  /* ---------------------------------------------------------------- boot */

  viewport();

  if (isCover) {
    renderCover();
  } else {
    car.setPaintImmediate('sage');
    updateCamera(0);
    renderer.render(scene, camera);
    window.requestAnimationFrame(() => {
      if (disposed) return;
      updateCamera(0);
      renderer.render(scene, camera);
      markReady();
      start();
    });
  }
}


