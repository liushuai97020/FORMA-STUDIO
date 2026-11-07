/* ============================================================================
   SOLSTICE HOUSE — a quiet room by the sea
   ----------------------------------------------------------------------------
   A cutaway contemporary living room rendered in Three.js. Every surface,
   texture and object is procedural: warm lime plaster, oiled oak, bouclé
   upholstery, travertine, ceramics, linen sheers and a soft Mediterranean
   horizon. Drag to orbit within a limited arc; Day / Evening drives the sun
   and the warm interior lamp glow.
   ========================================================================== */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

/* Fonts are installed at the repository root and bundled by the parent build. */
import '@fontsource-variable/archivo/index.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/jetbrains-mono/400.css';

import {
  makeArtworkTexture,
  makeBoucleBump,
  makeEnvironmentTexture,
  makeLinenTexture,
  makeOakTextures,
  makePlasterTextures,
  makeRadialTexture,
  makeRugTextures,
  makeSeaBump,
  makeTravertineTextures,
} from './textures.js';

/* ============================================================================
   Setup
   ============================================================================ */

const params = new URLSearchParams(window.location.search);
const isCover = params.get('cover') === '1';
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('stage');

if (isCover) document.body.classList.add('is-cover');

const ROOM = {
  width: 7.4,
  depth: 6.4,
  height: 3.05,
  minZ: -3.2,
  maxZ: 3.2,
  minX: -3.7,
  maxX: 3.7,
};

const DAY = {
  skyTop: new THREE.Color('#96b2c5'),
  skyHorizon: new THREE.Color('#f1e4cf'),
  sunSky: new THREE.Color('#ffefd2'),
  sunColor: new THREE.Color('#ffe8c4'),
  sunIntensity: 6.6,
  sunPosition: new THREE.Vector3(7.5, 6.2, -14.5),
  hemiSky: new THREE.Color('#e6eff3'),
  hemiGround: new THREE.Color('#8a7360'),
  hemiIntensity: 0.22,
  ambient: new THREE.Color('#f8f0e3'),
  ambientIntensity: 0.05,
  fillColor: new THREE.Color('#fff1e0'),
  fillIntensity: 1.5,
  bounceIntensity: 0.35,
  fog: new THREE.Color('#eadcc8'),
  sea: new THREE.Color('#7d95a1'),
  seaRoughness: 0.2,
  seaMetalness: 0.04,
  exposure: 1.0,
  lamp: 0.0,
  shadeGlow: 0.05,
  coveGlow: 0.1,
  coveLight: 0.0,
  downGlow: 0.22,
  downLight: 0.0,
  dust: 0.5,
  sunSprite: 0.16,
  sunSpriteScale: 75,
  ridgeNear: new THREE.Color('#8e9a9d'),
  ridgeFar: new THREE.Color('#a6afb1'),
  curtain: new THREE.Color('#efe7d8'),
};

const EVENING = {
  skyTop: new THREE.Color('#647485'),
  skyHorizon: new THREE.Color('#e8a97c'),
  sunSky: new THREE.Color('#ffcf9a'),
  sunColor: new THREE.Color('#ffb878'),
  sunIntensity: 1.45,
  sunPosition: new THREE.Vector3(10, 3.1, -18),
  hemiSky: new THREE.Color('#8f8c90'),
  hemiGround: new THREE.Color('#4d4034'),
  hemiIntensity: 0.4,
  ambient: new THREE.Color('#efd3b5'),
  ambientIntensity: 0.16,
  fillColor: new THREE.Color('#e9bd94'),
  fillIntensity: 1.2,
  bounceIntensity: 0.5,
  fog: new THREE.Color('#bd9273'),
  sea: new THREE.Color('#4a555f'),
  seaRoughness: 0.32,
  seaMetalness: 0.1,
  exposure: 0.98,
  lamp: 17,
  shadeGlow: 1.6,
  coveGlow: 1.6,
  coveLight: 5,
  downGlow: 1.3,
  downLight: 10,
  dust: 0.18,
  sunSprite: 0.72,
  sunSpriteScale: 280,
  ridgeNear: new THREE.Color('#48545b'),
  ridgeFar: new THREE.Color('#67737a'),
  curtain: new THREE.Color('#e6d6bf'),
};

const roundBox = (width, height, depth, radius, segments = 4) =>
  new RoundedBoxGeometry(width, height, depth, segments, radius);

const lathe = (profile, segments = 40) =>
  new THREE.LatheGeometry(
    profile.map(([x, y]) => new THREE.Vector2(x, y)),
    segments,
  );

init();

/* ============================================================================
   Boot
   ============================================================================ */

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    document.body.classList.add('no-webgl');
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = DAY.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#efe9df');
  scene.fog = new THREE.Fog(DAY.fog.clone(), 24, 380);

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.05, 6000);

  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures = buildTextures(anisotropy);

  const environment = makeEnvironmentTexture();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentTarget = pmrem.fromEquirectangular(environment);
  pmrem.dispose();
  environment.dispose();
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = 0.4;

  const world = buildWorld(scene, textures);

  /* ------------------------------------------------------------- view state */

  const view = {
    yaw: 0.5,
    pitch: 0.085,
    radius: 7.5,
    target: new THREE.Vector3(0.05, 1.4, -0.55),
    portrait: false,
  };

  const orbit = {
    dragging: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
    yaw: 0,
    pitch: 0,
    velocityYaw: 0,
    velocityPitch: 0,
  };

  const startMode = params.get('light') === 'evening' ? 1 : 0;
  const mode = { value: startMode, target: startMode };

  /* -------------------------------------------------------------------- UI */

  const buttons = Array.from(document.querySelectorAll('.light__option'));

  function selectMode(next) {
    mode.target = next === 'evening' ? 1 : 0;
    for (const button of buttons) {
      const active = button.dataset.mode === next;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  for (const button of buttons) {
    button.addEventListener('click', () => selectMode(button.dataset.mode));
  }
  selectMode(startMode ? 'evening' : 'day');

  /* ------------------------------------------------------------- measurement */

  function measure() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    const portrait = aspect < 0.95;
    const short = height < 480;

    view.portrait = portrait;
    camera.aspect = aspect;
    camera.fov = portrait ? 44 : short ? 42 : 38;

    const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitWidth = portrait ? 3.15 : aspect > 1.95 ? 8.0 : 8.2;
    const fitHeight = portrait ? 4.95 : short ? 4.0 : 4.4;
    view.radius = Math.max(
      fitWidth / (2 * halfTan * aspect),
      fitHeight / (2 * halfTan),
    );

    view.yaw = portrait ? 0.42 : 0.5;
    view.pitch = portrait ? 0.13 : short ? 0.1 : 0.12;
    view.target.set(0.05, portrait ? 1.28 : short ? 1.3 : 1.3, -0.55);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.updateProjectionMatrix();
  }

  /* ---------------------------------------------------------------- camera */

  const driftTime = { value: 0 };

  function placeCamera(introValue, coverAngle) {
    const motion = prefersReducedMotion ? 0 : 1;
    let yaw = view.yaw;
    let pitch = view.pitch;

    if (coverAngle) {
      yaw = 0.52;
      pitch = 0.112;
    } else {
      const drift =
        motion * (Math.sin(driftTime.value * 0.11) * 0.038 + Math.sin(driftTime.value * 0.037) * 0.02);
      yaw += orbit.yaw + drift;
      pitch += orbit.pitch;
    }

    const distance = coverAngle
      ? view.radius * 0.985
      : view.radius + (1 - introValue) * 1.3;

    camera.position.set(
      view.target.x + Math.sin(yaw) * Math.cos(pitch) * distance,
      view.target.y + Math.sin(pitch) * distance,
      view.target.z + Math.cos(yaw) * Math.cos(pitch) * distance,
    );
    camera.lookAt(view.target);
  }

  /* -------------------------------------------------------------- interaction */

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (orbit.dragging) return;
    orbit.dragging = true;
    orbit.pointerId = event.pointerId;
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;
    orbit.velocityYaw = 0;
    orbit.velocityPitch = 0;
    canvas.setPointerCapture(event.pointerId);
    document.body.classList.add('is-dragging');
  }

  function onPointerMove(event) {
    if (!orbit.dragging || event.pointerId !== orbit.pointerId) return;

    const dx = event.clientX - orbit.lastX;
    const dy = event.clientY - orbit.lastY;
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;

    orbit.yaw = THREE.MathUtils.clamp(orbit.yaw + dx * 0.0031, -0.44, 0.44);
    orbit.pitch = THREE.MathUtils.clamp(orbit.pitch - dy * 0.0015, -0.055, 0.22);

    orbit.velocityYaw = dx * 0.0011;
    orbit.velocityPitch = -dy * 0.0006;
  }

  function onPointerUp(event) {
    if (!orbit.dragging) return;
    if (event && event.pointerId !== orbit.pointerId) return;
    orbit.dragging = false;
    if (event && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    document.body.classList.remove('is-dragging');
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('lostpointercapture', onPointerUp);
  window.addEventListener('resize', measure);

  /* ------------------------------------------------------------------ modes */

  const tmpA = new THREE.Color();
  const tmpB = new THREE.Color();
  const sunDirection = new THREE.Vector3();

  function applyMode(mix) {
    const lerp = THREE.MathUtils.lerp;
    const mixColor = (target, day, evening) => target.copy(day).lerp(evening, mix);

    mixColor(world.sky.material.uniforms.uTop.value, DAY.skyTop, EVENING.skyTop);
    mixColor(world.sky.material.uniforms.uHorizon.value, DAY.skyHorizon, EVENING.skyHorizon);
    mixColor(world.sky.material.uniforms.uSunColor.value, DAY.sunSky, EVENING.sunSky);

    sunDirection.copy(DAY.sunPosition).lerp(EVENING.sunPosition, mix).normalize();
    world.sky.material.uniforms.uSunDir.value.copy(sunDirection);

    mixColor(world.sun.color, DAY.sunColor, EVENING.sunColor);
    world.sun.intensity = lerp(DAY.sunIntensity, EVENING.sunIntensity, mix);
    world.sun.position.copy(DAY.sunPosition).lerp(EVENING.sunPosition, mix);

    mixColor(world.hemi.color, DAY.hemiSky, EVENING.hemiSky);
    mixColor(world.hemi.groundColor, DAY.hemiGround, EVENING.hemiGround);
    world.hemi.intensity = lerp(DAY.hemiIntensity, EVENING.hemiIntensity, mix);

    mixColor(world.ambient.color, DAY.ambient, EVENING.ambient);
    world.ambient.intensity = lerp(DAY.ambientIntensity, EVENING.ambientIntensity, mix);

    mixColor(world.windowFill.color, DAY.fillColor, EVENING.fillColor);
    world.windowFill.intensity = lerp(DAY.fillIntensity, EVENING.fillIntensity, mix);

    world.bounce.intensity = lerp(DAY.bounceIntensity, EVENING.bounceIntensity, mix);

    mixColor(scene.fog.color, DAY.fog, EVENING.fog);
    mixColor(world.seaMaterial.color, DAY.sea, EVENING.sea);
    world.seaMaterial.roughness = lerp(DAY.seaRoughness, EVENING.seaRoughness, mix);
    world.seaMaterial.metalness = lerp(DAY.seaMetalness, EVENING.seaMetalness, mix);

    mixColor(world.ridgeNear.material.color, DAY.ridgeNear, EVENING.ridgeNear);
    mixColor(world.ridgeFar.material.color, DAY.ridgeFar, EVENING.ridgeFar);

    world.lampLight.intensity = lerp(DAY.lamp, EVENING.lamp, mix);
    world.lampShade.emissiveIntensity = lerp(DAY.shadeGlow, EVENING.shadeGlow, mix);
    world.lampGlow.material.opacity = lerp(0.03, 0.8, mix);
    world.lampGlow.scale.setScalar(lerp(0.5, 1.25, mix));

    world.coveMaterial.emissiveIntensity = lerp(DAY.coveGlow, EVENING.coveGlow, mix);
    world.coveLight.intensity = lerp(DAY.coveLight, EVENING.coveLight, mix);
    world.downMaterial.emissiveIntensity = lerp(DAY.downGlow, EVENING.downGlow, mix);
    world.downLight.intensity = lerp(DAY.downLight, EVENING.downLight, mix);

    world.dustMaterial.opacity = lerp(DAY.dust, EVENING.dust, mix);

    world.sunSprite.material.opacity = lerp(DAY.sunSprite, EVENING.sunSprite, mix);
    const spriteScale = lerp(DAY.sunSpriteScale, EVENING.sunSpriteScale, mix);
    world.sunSprite.scale.set(spriteScale, spriteScale, 1);
    world.sunSprite.position.copy(sunDirection).multiplyScalar(1400);

    mixColor(world.curtainMaterial.color, DAY.curtain, EVENING.curtain);

    renderer.toneMappingExposure = lerp(DAY.exposure, EVENING.exposure, mix);
  }

  /* -------------------------------------------------------------- cover mode */

  function renderCover() {
    measure();
    applyMode(mode.value);
    placeCamera(1, true);
    world.update(0, mode.value);
    renderer.render(scene, camera);
    document.body.classList.add('is-ready');
    window.__SOLSTICE_READY__ = true;
  }

  /* ------------------------------------------------------------------- loop */

  const clock = new THREE.Clock();
  const intro = {
    start: performance.now() + 80,
    duration: prefersReducedMotion ? 0 : 1450,
  };

  let rafId = 0;
  let disposed = false;
  let visible = true;
  let firstFrame = true;

  function frame() {
    rafId = requestAnimationFrame(frame);
    if (disposed) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    /* Intro easing. */
    const progress = intro.duration
      ? Math.min(1, Math.max(0, (performance.now() - intro.start) / intro.duration))
      : 1;
    const introValue = 1 - Math.pow(1 - progress, 3);

    /* Lighting transition. */
    if (prefersReducedMotion) {
      mode.value = mode.target;
    } else {
      mode.value = THREE.MathUtils.damp(mode.value, mode.target, 1.55, dt);
    }
    applyMode(mode.value);

    /* Orbit inertia and damping. */
    if (!orbit.dragging) {
      orbit.yaw = THREE.MathUtils.clamp(orbit.yaw + orbit.velocityYaw, -0.44, 0.44);
      orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + orbit.velocityPitch, -0.055, 0.22);
      const damping = prefersReducedMotion ? 8 : 2.6;
      orbit.velocityYaw = THREE.MathUtils.damp(orbit.velocityYaw, 0, damping, dt);
      orbit.velocityPitch = THREE.MathUtils.damp(orbit.velocityPitch, 0, damping, dt);
    }

    driftTime.value += dt;
    placeCamera(introValue, false);
    world.update(time, mode.value);

    renderer.render(scene, camera);

    if (firstFrame) {
      firstFrame = false;
      document.body.classList.add('is-ready');
      window.__SOLSTICE_READY__ = true;
    }
  }

  /* ------------------------------------------------------------- visibility */

  function onVisibilityChange() {
    if (document.hidden) {
      visible = false;
      cancelAnimationFrame(rafId);
      rafId = 0;
    } else if (!visible && !disposed) {
      visible = true;
      clock.getDelta();
      rafId = requestAnimationFrame(frame);
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  /* ------------------------------------------------------------------ resize */

  function onResize() {
    measure();
    if (isCover) {
      applyMode(mode.value);
      placeCamera(1, true);
      world.update(0, mode.value);
      renderer.render(scene, camera);
    }
  }
  window.addEventListener('resize', onResize);

  /* ---------------------------------------------------------------- teardown */

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(rafId);
    rafId = 0;

    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('resize', measure);
    window.removeEventListener('resize', onResize);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    canvas.removeEventListener('lostpointercapture', onPointerUp);

    const disposedTextures = new Set();
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : object.material
          ? [object.material]
          : [];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value && value.isTexture) disposedTextures.add(value);
        }
        material.dispose();
      }
    });
    for (const texture of disposedTextures) texture.dispose();

    environmentTarget.dispose();
    scene.environment = null;
    scene.clear();
    renderer.dispose();
  }

  function onPageHide(event) {
    if (event.persisted) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    } else {
      dispose();
    }
  }

  function onPageShow(event) {
    if (event.persisted && !disposed && !rafId) {
      clock.getDelta();
      rafId = requestAnimationFrame(frame);
    }
  }

  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);

  /* ------------------------------------------------------------------ start */

  measure();

  if (isCover) {
    renderCover();
  } else {
    rafId = requestAnimationFrame(frame);
  }
}

/* ============================================================================
   Textures
   ============================================================================ */

function buildTextures(anisotropy) {
  return {
    plaster: makePlasterTextures(anisotropy),
    oak: makeOakTextures(anisotropy),
    boucle: makeBoucleBump(anisotropy),
    travertine: makeTravertineTextures(anisotropy),
    rug: makeRugTextures(anisotropy),
    artwork: makeArtworkTexture(anisotropy),
    linen: makeLinenTexture(anisotropy),
    seaBump: makeSeaBump(anisotropy),
  };
}

/* ============================================================================
   World
   ============================================================================ */

function buildWorld(scene, T) {
  const glowTexture = makeRadialTexture(128, [
    [0, 'rgba(255, 246, 228, 1)'],
    [0.2, 'rgba(255, 226, 184, 0.62)'],
    [0.55, 'rgba(255, 192, 132, 0.16)'],
    [1, 'rgba(255, 184, 112, 0)'],
  ]);
  const contactTexture = makeRadialTexture(256, [
    [0, 'rgba(0, 0, 0, 0.55)'],
    [0.48, 'rgba(0, 0, 0, 0.24)'],
    [1, 'rgba(0, 0, 0, 0)'],
  ]);
  const dustTexture = makeRadialTexture(64, [
    [0, 'rgba(255, 244, 222, 0.9)'],
    [0.45, 'rgba(255, 224, 182, 0.35)'],
    [1, 'rgba(255, 214, 160, 0)'],
  ]);

  /* ------------------------------------------------------------- materials */

  const M = {
    plaster: new THREE.MeshStandardMaterial({
      map: T.plaster.map,
      bumpMap: T.plaster.bump,
      bumpScale: 0.035,
      roughness: 0.97,
      metalness: 0,
      color: '#e7ddcc',
      envMapIntensity: 0.34,
    }),
    section: new THREE.MeshStandardMaterial({
      color: '#f4ecde',
      roughness: 0.94,
      metalness: 0,
      envMapIntensity: 0.28,
    }),
    concrete: new THREE.MeshStandardMaterial({
      color: '#b8a993',
      roughness: 0.92,
      metalness: 0,
      envMapIntensity: 0.25,
    }),
    oak: new THREE.MeshStandardMaterial({
      map: T.oak.map,
      bumpMap: T.oak.bump,
      bumpScale: 0.02,
      roughness: 0.48,
      metalness: 0.02,
      color: '#c6a57c',
      envMapIntensity: 0.5,
    }),
    oakFurniture: new THREE.MeshStandardMaterial({
      map: T.oak.map,
      bumpMap: T.oak.bump,
      bumpScale: 0.012,
      roughness: 0.62,
      metalness: 0.01,
      envMapIntensity: 0.42,
      color: '#cdb693',
    }),
    travertine: new THREE.MeshStandardMaterial({
      map: T.travertine.map,
      bumpMap: T.travertine.bump,
      bumpScale: 0.012,
      roughness: 0.82,
      metalness: 0,
      color: '#d3c4ac',
      envMapIntensity: 0.42,
    }),
    boucle: new THREE.MeshStandardMaterial({
      color: '#ded3c0',
      bumpMap: T.boucle,
      bumpScale: 0.03,
      roughness: 0.97,
      metalness: 0,
      envMapIntensity: 0.36,
    }),
    boucleSeat: new THREE.MeshStandardMaterial({
      color: '#e6dccb',
      bumpMap: T.boucle,
      bumpScale: 0.03,
      roughness: 0.99,
      metalness: 0,
      envMapIntensity: 0.32,
    }),
    pillowCream: new THREE.MeshStandardMaterial({
      color: '#e7ddcc',
      bumpMap: T.boucle,
      bumpScale: 0.018,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.28,
    }),
    pillowClay: new THREE.MeshStandardMaterial({
      color: '#bd9478',
      bumpMap: T.boucle,
      bumpScale: 0.018,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.28,
    }),
    pillowStone: new THREE.MeshStandardMaterial({
      color: '#b6ac9b',
      bumpMap: T.boucle,
      bumpScale: 0.018,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.28,
    }),
    throw: new THREE.MeshStandardMaterial({
      color: '#d8ccb8',
      bumpMap: T.boucle,
      bumpScale: 0.014,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.25,
    }),
    piping: new THREE.MeshStandardMaterial({
      color: '#cdbfa8',
      roughness: 0.96,
      metalness: 0,
      envMapIntensity: 0.22,
    }),
    rug: new THREE.MeshStandardMaterial({
      map: T.rug.map,
      bumpMap: T.rug.bump,
      bumpScale: 0.022,
      roughness: 1,
      metalness: 0,
      color: '#b7aa94',
      envMapIntensity: 0.16,
    }),
    bronze: new THREE.MeshStandardMaterial({
      color: '#3c352b',
      roughness: 0.42,
      metalness: 0.68,
      envMapIntensity: 0.9,
    }),
    darkOak: new THREE.MeshStandardMaterial({
      color: '#5a4430',
      roughness: 0.5,
      metalness: 0.05,
      envMapIntensity: 0.4,
    }),
    ceramicChalk: new THREE.MeshPhysicalMaterial({
      color: '#eee6d8',
      roughness: 0.5,
      metalness: 0,
      clearcoat: 0.32,
      clearcoatRoughness: 0.5,
      envMapIntensity: 0.65,
    }),
    ceramicClay: new THREE.MeshPhysicalMaterial({
      color: '#b8896a',
      roughness: 0.62,
      metalness: 0,
      clearcoat: 0.22,
      clearcoatRoughness: 0.6,
      envMapIntensity: 0.55,
    }),
    ceramicStone: new THREE.MeshPhysicalMaterial({
      color: '#8d8271',
      roughness: 0.66,
      metalness: 0,
      clearcoat: 0.16,
      clearcoatRoughness: 0.7,
      envMapIntensity: 0.5,
    }),
    ceramicDark: new THREE.MeshPhysicalMaterial({
      color: '#47413a',
      roughness: 0.55,
      metalness: 0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.5,
      envMapIntensity: 0.6,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#dfe9e9',
      roughness: 0.06,
      metalness: 0,
      transparent: true,
      opacity: 0.13,
      envMapIntensity: 1.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    curtain: new THREE.MeshPhysicalMaterial({
      map: T.linen.map,
      bumpMap: T.linen.bump,
      bumpScale: 0.012,
      color: DAY.curtain,
      roughness: 0.94,
      metalness: 0,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
      sheen: 0.6,
      sheenColor: new THREE.Color('#fff5e6'),
      sheenRoughness: 0.8,
      envMapIntensity: 0.35,
    }),
    leaf: new THREE.MeshStandardMaterial({
      color: '#6f7a5b',
      roughness: 0.78,
      metalness: 0,
      side: THREE.DoubleSide,
      envMapIntensity: 0.4,
    }),
    branch: new THREE.MeshStandardMaterial({
      color: '#6d5a44',
      roughness: 0.9,
      metalness: 0,
    }),
    pot: new THREE.MeshStandardMaterial({
      color: '#a98f74',
      roughness: 0.88,
      metalness: 0,
      bumpMap: T.plaster.bump,
      bumpScale: 0.01,
      envMapIntensity: 0.3,
    }),
    soil: new THREE.MeshStandardMaterial({ color: '#40352a', roughness: 1 }),
    paper: new THREE.MeshStandardMaterial({ color: '#e6dccb', roughness: 0.95 }),
    paperDark: new THREE.MeshStandardMaterial({ color: '#9c8d78', roughness: 0.95 }),
    artFrame: new THREE.MeshStandardMaterial({
      color: '#b08a5e',
      roughness: 0.55,
      metalness: 0.02,
      envMapIntensity: 0.4,
    }),
    artCanvas: new THREE.MeshStandardMaterial({
      map: T.artwork,
      roughness: 0.88,
      metalness: 0,
      envMapIntensity: 0.22,
    }),
  };

  M.curtainMaterial = M.curtain;

  const add = (geometry, material, options = {}) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = options.cast !== false;
    mesh.receiveShadow = options.receive !== false;
    if (options.position) mesh.position.fromArray(options.position);
    if (options.rotation) mesh.rotation.fromArray(options.rotation);
    if (options.rotationY !== undefined) mesh.rotation.y = options.rotationY;
    scene.add(mesh);
    return mesh;
  };

  /* ------------------------------------------------------------- architecture */

  // Oak floor plane over a cutaway slab.
  const floorSlab = add(
    new THREE.BoxGeometry(ROOM.width + 0.4, 0.24, ROOM.depth + 0.2),
    M.concrete,
    { position: [0, -0.12, -0.05], cast: false },
  );
  floorSlab.receiveShadow = true;

  const floor = add(
    new THREE.PlaneGeometry(ROOM.width + 0.4, ROOM.depth + 0.2),
    M.oak,
    { position: [0, 0.004, -0.05], rotation: [-Math.PI / 2, 0, 0], cast: false },
  );
  floor.receiveShadow = true;

  // Left wall — ends in a clean cutaway at z = 1.9.
  const leftWall = add(
    new THREE.BoxGeometry(0.16, ROOM.height, 5.1),
    [M.plaster, M.plaster, M.plaster, M.plaster, M.section, M.plaster],
    { position: [-3.78, ROOM.height / 2, -0.65] },
  );

  // Right wall — a shorter return, leaving the front-right corner open.
  const rightWall = add(
    new THREE.BoxGeometry(0.16, ROOM.height, 2.4),
    [M.plaster, M.plaster, M.plaster, M.plaster, M.section, M.plaster],
    { position: [3.78, ROOM.height / 2, -2.0] },
  );

  // Back-wall piers either side of the glazing.
  add(new THREE.BoxGeometry(0.6, ROOM.height, 0.18), M.plaster, {
    position: [-3.4, ROOM.height / 2, -3.2],
  });
  add(new THREE.BoxGeometry(0.6, ROOM.height, 0.18), M.plaster, {
    position: [3.4, ROOM.height / 2, -3.2],
  });

  // Ceiling / soffit, cut away toward the viewer.
  const ceiling = add(
    new THREE.BoxGeometry(ROOM.width, 0.16, 3.8),
    [M.plaster, M.plaster, M.plaster, M.plaster, M.section, M.plaster],
    { position: [0, ROOM.height + 0.08, -1.3] },
  );
  ceiling.receiveShadow = true;

  // Shadow gap at the base of each plaster wall.
  add(new THREE.BoxGeometry(0.026, 0.026, 5.1), M.darkOak, {
    position: [-3.685, 0.014, -0.65],
    cast: false,
  });
  add(new THREE.BoxGeometry(0.026, 0.026, 2.4), M.darkOak, {
    position: [3.685, 0.014, -2.0],
    cast: false,
  });

  /* ---------------------------------------------------------------- glazing */

  const frameGroup = new THREE.Group();
  scene.add(frameGroup);

  const glass = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.95), M.glass);
  glass.position.set(0, 1.505, -3.18);
  glass.renderOrder = 2;
  frameGroup.add(glass);

  const mullionGeometry = new THREE.BoxGeometry(0.055, 3.0, 0.075);
  const mullionPositions = [-3.1, -1.55, 0, 1.55, 3.1];
  for (const x of mullionPositions) {
    const mullion = new THREE.Mesh(mullionGeometry, M.bronze);
    mullion.position.set(x, 1.5, -3.18);
    mullion.castShadow = true;
    mullion.receiveShadow = true;
    frameGroup.add(mullion);
  }

  const topRail = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.11, 0.09), M.bronze);
  topRail.position.set(0, 2.995, -3.18);
  topRail.castShadow = true;
  frameGroup.add(topRail);

  const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.055, 0.1), M.bronze);
  bottomRail.position.set(0, 0.035, -3.17);
  bottomRail.castShadow = true;
  frameGroup.add(bottomRail);

  // Track that carries the linen sheers.
  const track = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 6.3, 12), M.bronze);
  track.rotation.z = Math.PI / 2;
  track.position.set(0, 2.92, -3.05);
  frameGroup.add(track);

  function buildCurtain(x, mirrored) {
    const width = 0.95;
    const height = 2.86;
    const geometry = new THREE.PlaneGeometry(width, height, 52, 8);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      const px = position.getX(i);
      const py = position.getY(i);
      const u = px / width + 0.5;
      const v = py / height + 0.5;
      const gathers =
        Math.sin(u * Math.PI * 2 * 5.5 + (mirrored ? 1.1 : 0.4)) * 0.05 +
        Math.sin(u * Math.PI * 2 * 12 + 0.7) * 0.017;
      const bow = Math.sin(v * Math.PI) * 0.035;
      position.setZ(i, gathers * (0.7 + 0.3 * v) + bow);
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, M.curtain);
    mesh.position.set(x, height / 2 + 0.03, -3.03);
    mesh.rotation.y = mirrored ? 0.14 : -0.14;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;
    frameGroup.add(mesh);
    return mesh;
  }

  const curtainLeft = buildCurtain(-2.78, false);
  const curtainRight = buildCurtain(2.78, true);

  // Ceiling linear light, recessed near the glazing.
  const coveMaterial = new THREE.MeshStandardMaterial({
    color: '#fff2dc',
    emissive: new THREE.Color('#ffbe83'),
    emissiveIntensity: DAY.coveGlow,
    roughness: 0.6,
    metalness: 0,
  });
  const coveStrip = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.035, 0.075), coveMaterial);
  coveStrip.position.set(0, 3.035, -2.55);
  coveStrip.castShadow = false;
  coveStrip.receiveShadow = false;
  scene.add(coveStrip);

  const downMaterial = new THREE.MeshStandardMaterial({
    color: '#fff2dd',
    emissive: new THREE.Color('#ffcb93'),
    emissiveIntensity: DAY.downGlow,
    roughness: 0.5,
  });
  const downDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 24), downMaterial);
  downDisc.position.set(-3.25, 3.044, -1.45);
  scene.add(downDisc);

  /* ---------------------------------------------------------------- rug */

  const rug = add(
    new THREE.PlaneGeometry(4.45, 3.3),
    M.rug,
    { position: [0.05, 0.014, -0.95], rotation: [-Math.PI / 2, 0, 0], cast: false },
  );
  rug.receiveShadow = true;

  /* ---------------------------------------------------------------- sofa */

  const sofa = buildSofa(M, roundBox);
  sofa.position.set(-0.3, 0, -1.8);
  scene.add(sofa);

  /* ---------------------------------------------------------- coffee table */

  function buildTable() {
    const group = new THREE.Group();

    const top = new THREE.Mesh(roundBox(1.34, 0.1, 0.74, 0.035), M.travertine);
    top.position.y = 0.3;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    for (const x of [-0.44, 0.44]) {
      const leg = new THREE.Mesh(roundBox(0.12, 0.27, 0.5, 0.02), M.travertine);
      leg.position.set(x, 0.135, 0);
      leg.castShadow = true;
      leg.receiveShadow = true;
      group.add(leg);
    }

    // Ceramic bowl.
    const bowl = new THREE.Mesh(
      lathe([
        [0.005, 0],
        [0.09, 0.006],
        [0.14, 0.03],
        [0.155, 0.07],
        [0.138, 0.082],
        [0.118, 0.052],
        [0.01, 0.018],
      ]),
      M.ceramicChalk,
    );
    bowl.position.set(-0.28, 0.35, 0.03);
    bowl.castShadow = true;
    bowl.receiveShadow = true;
    group.add(bowl);

    // Two books.
    const bookA = new THREE.Mesh(roundBox(0.26, 0.032, 0.18, 0.004, 2), M.paperDark);
    bookA.position.set(0.34, 0.367, -0.09);
    bookA.rotation.y = 0.16;
    bookA.castShadow = true;
    bookA.receiveShadow = true;
    group.add(bookA);

    const bookB = new THREE.Mesh(roundBox(0.23, 0.028, 0.16, 0.004, 2), M.paper);
    bookB.position.set(0.35, 0.397, -0.08);
    bookB.rotation.y = 0.04;
    bookB.castShadow = true;
    bookB.receiveShadow = true;
    group.add(bookB);

    // Small bud vase with a dried stem.
    const bud = new THREE.Mesh(
      lathe([
        [0.005, 0],
        [0.048, 0.008],
        [0.058, 0.09],
        [0.04, 0.155],
        [0.026, 0.17],
        [0.024, 0.19],
      ]),
      M.ceramicClay,
    );
    bud.position.set(0.08, 0.35, 0.18);
    bud.castShadow = true;
    group.add(bud);

    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, 0.53, 0.18),
      new THREE.Vector3(0.075, 0.7, 0.17),
      new THREE.Vector3(0.1, 0.84, 0.15),
      new THREE.Vector3(0.16, 0.94, 0.12),
    ]);
    const stem = new THREE.Mesh(
      new THREE.TubeGeometry(stemCurve, 18, 0.004, 5, false),
      M.branch,
    );
    stem.castShadow = true;
    group.add(stem);

    group.position.set(0.55, 0, -0.15);
    return group;
  }
  scene.add(buildTable());

  /* --------------------------------------------------------------- console */

  function buildConsole() {
    const group = new THREE.Group();

    for (const z of [-0.82, 0.82]) {
      for (const x of [-0.16, 0.16]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.15, 10), M.darkOak);
        leg.position.set(x, 0.075, z);
        leg.castShadow = true;
        group.add(leg);
      }
    }

    const body = new THREE.Mesh(roundBox(0.42, 0.3, 1.86, 0.02, 3), M.oakFurniture);
    body.position.y = 0.3;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const top = new THREE.Mesh(roundBox(0.47, 0.045, 1.94, 0.012, 3), M.oakFurniture);
    top.position.y = 0.472;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // Two door grooves on the front face.
    for (const z of [-0.04]) {
      const groove = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.24, 0.016), M.darkOak);
      groove.position.set(0.212, 0.3, z);
      group.add(groove);
    }

    // Tall ceramic vessel with a dry branch.
    const vase = new THREE.Mesh(
      lathe([
        [0.005, 0],
        [0.13, 0.01],
        [0.165, 0.12],
        [0.15, 0.26],
        [0.1, 0.35],
        [0.085, 0.38],
        [0.09, 0.4],
      ]),
      M.ceramicStone,
    );
    vase.position.set(0.02, 0.495, -0.5);
    vase.castShadow = true;
    vase.receiveShadow = true;
    group.add(vase);

    const branchMaterial = M.branch;
    for (let b = 0; b < 3; b += 1) {
      const angle = b * 2.1 + 0.4;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.02, 0.87, -0.5),
        new THREE.Vector3(0.02 + Math.cos(angle) * 0.1, 1.08, -0.5 + Math.sin(angle) * 0.1),
        new THREE.Vector3(0.02 + Math.cos(angle) * 0.2, 1.32, -0.5 + Math.sin(angle) * 0.2),
        new THREE.Vector3(0.02 + Math.cos(angle) * 0.3, 1.5, -0.5 + Math.sin(angle) * 0.3),
      ]);
      const branch = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.0045, 5, false), branchMaterial);
      branch.castShadow = true;
      group.add(branch);
    }

    // A small stone object and a bowl.
    const bowl = new THREE.Mesh(
      lathe([
        [0.005, 0],
        [0.085, 0.01],
        [0.11, 0.055],
        [0.09, 0.065],
        [0.012, 0.03],
      ]),
      M.ceramicDark,
    );
    bowl.position.set(0.02, 0.495, 0.24);
    bowl.castShadow = true;
    group.add(bowl);

    const books = new THREE.Mesh(roundBox(0.24, 0.05, 0.34, 0.004, 2), M.paper);
    books.position.set(0.02, 0.52, 0.62);
    books.rotation.y = -0.1;
    books.castShadow = true;
    group.add(books);

    const pebble = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 16), M.ceramicChalk);
    pebble.scale.set(1, 0.72, 1.18);
    pebble.position.set(0.02, 0.555, 0.62);
    pebble.castShadow = true;
    group.add(pebble);

    group.position.set(-3.44, 0, -1.45);
    return group;
  }
  scene.add(buildConsole());

  /* -------------------------------------------------------------- artwork */

  function buildArtwork() {
    const group = new THREE.Group();

    const frameWidth = 1.64;
    const frameHeight = 1.26;
    const bar = 0.038;
    const depth = 0.05;

    const top = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, bar, depth), M.artFrame);
    top.position.set(0, frameHeight / 2, 0);
    top.castShadow = true;
    group.add(top);

    const bottom = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, bar, depth), M.artFrame);
    bottom.position.set(0, -frameHeight / 2, 0);
    bottom.castShadow = true;
    group.add(bottom);

    for (const x of [-frameWidth / 2 + bar / 2, frameWidth / 2 - bar / 2]) {
      const side = new THREE.Mesh(
        new THREE.BoxGeometry(bar, frameHeight, depth),
        M.artFrame,
      );
      side.position.set(x, 0, 0);
      side.castShadow = true;
      group.add(side);
    }

    const art = new THREE.Mesh(new THREE.PlaneGeometry(1.56, 1.18), M.artCanvas);
    art.position.set(0, 0, 0.024);
    art.receiveShadow = true;
    group.add(art);

    group.position.set(-3.688, 1.89, -1.45);
    group.rotation.y = Math.PI / 2;
    return group;
  }
  scene.add(buildArtwork());

  /* ------------------------------------------------------------ floor lamp */

  function buildLamp() {
    const group = new THREE.Group();

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.035, 32), M.bronze);
    base.position.y = 0.018;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.03, 0),
      new THREE.Vector3(0.015, 0.62, 0.015),
      new THREE.Vector3(0.1, 1.2, 0.01),
      new THREE.Vector3(0.27, 1.58, 0.02),
    ]);
    const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 32, 0.014, 8, false), M.bronze);
    stem.castShadow = true;
    group.add(stem);

    const shadeMaterial = new THREE.MeshStandardMaterial({
      map: T.linen.map,
      bumpMap: T.linen.bump,
      bumpScale: 0.008,
      color: '#f0e4d0',
      emissive: new THREE.Color('#ffb877'),
      emissiveIntensity: DAY.shadeGlow,
      roughness: 0.97,
      metalness: 0,
      side: THREE.DoubleSide,
      envMapIntensity: 0.3,
    });

    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.155, 0.225, 0.3, 40, 1, true),
      shadeMaterial,
    );
    shade.position.set(0.27, 1.57, 0.02);
    shade.castShadow = false;
    shade.receiveShadow = true;
    group.add(shade);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#ffd8a0' }),
    );
    bulb.position.set(0.27, 1.5, 0.02);
    group.add(bulb);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: new THREE.Color('#ffb877'),
        transparent: true,
        opacity: 0.03,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    glow.position.set(0.27, 1.55, 0.02);
    glow.scale.setScalar(0.5);
    group.add(glow);

    const light = new THREE.PointLight(new THREE.Color('#ffb877'), DAY.lamp, 9, 2);
    light.position.set(0.27, 1.5, 0.06);
    group.add(light);

    group.position.set(2.35, 0, -1.55);
    return { group, shadeMaterial, glow, light };
  }

  const lamp = buildLamp();
  scene.add(lamp.group);

  /* ---------------------------------------------------------------- plant */

  function buildPlant() {
    const group = new THREE.Group();
    const foliage = new THREE.Group();

    const pot = new THREE.Mesh(
      lathe([
        [0.055, 0],
        [0.2, 0.012],
        [0.235, 0.03],
        [0.255, 0.16],
        [0.24, 0.34],
        [0.215, 0.43],
        [0.225, 0.47],
        [0.208, 0.47],
      ], 36),
      M.pot,
    );
    pot.position.y = 0;
    pot.castShadow = true;
    pot.receiveShadow = true;
    group.add(pot);

    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.02, 24), M.soil);
    soil.position.y = 0.455;
    soil.receiveShadow = true;
    group.add(soil);

    // Trunk.
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.44, 0),
      new THREE.Vector3(0.02, 0.72, 0.01),
      new THREE.Vector3(-0.015, 1.02, 0.015),
      new THREE.Vector3(0.03, 1.32, 0),
    ]);
    const trunk = new THREE.Mesh(
      new THREE.TubeGeometry(trunkCurve, 24, 0.026, 7, false),
      M.branch,
    );
    trunk.castShadow = true;
    foliage.add(trunk);

    // Branches.
    const branchPoints = [];
    const branchCount = 7;
    for (let i = 0; i < branchCount; i += 1) {
      const angle = (i / branchCount) * Math.PI * 2 + 0.6;
      const startT = 0.52 + (i % 3) * 0.14;
      const start = trunkCurve.getPoint(startT);
      const reach = 0.55 + (i % 4) * 0.14;
      const lift = 0.42 + (i % 3) * 0.18;

      const end = new THREE.Vector3(
        start.x + Math.cos(angle) * reach,
        start.y + lift,
        start.z + Math.sin(angle) * reach * 0.82,
      );

      const mid = new THREE.Vector3(
        (start.x + end.x) / 2 + Math.cos(angle + 1.2) * 0.12,
        (start.y + end.y) / 2 + 0.12,
        (start.z + end.z) / 2 + Math.sin(angle + 1.2) * 0.1,
      );

      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      const branch = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 14, 0.011, 6, false),
        M.branch,
      );
      branch.castShadow = true;
      foliage.add(branch);

      for (let t = 0.34; t <= 1.001; t += 0.075) {
        const point = curve.getPoint(t);
        branchPoints.push(point);
      }
      // A couple of short twigs.
      for (let s = 0; s < 2; s += 1) {
        const origin = curve.getPoint(0.5 + s * 0.25);
        const twigEnd = new THREE.Vector3(
          origin.x + Math.cos(angle + 0.8 + s) * 0.22,
          origin.y + 0.24,
          origin.z + Math.sin(angle + 0.8 + s) * 0.2,
        );
        const twigCurve = new THREE.CatmullRomCurve3([origin, twigEnd]);
        const twig = new THREE.Mesh(
          new THREE.TubeGeometry(twigCurve, 8, 0.006, 4, false),
          M.branch,
        );
        foliage.add(twig);
        for (let t = 0.35; t <= 1.001; t += 0.16) {
          branchPoints.push(twigCurve.getPoint(t));
        }
      }
    }

    // Instanced olive leaves.
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.bezierCurveTo(0.02, 0.018, 0.026, 0.058, 0, 0.112);
    leafShape.bezierCurveTo(-0.026, 0.058, -0.02, 0.018, 0, 0);
    const leafGeometry = new THREE.ShapeGeometry(leafShape, 5);

    const leafCount = branchPoints.length * 2;
    const leaves = new THREE.InstancedMesh(leafGeometry, M.leaf, leafCount);
    leaves.castShadow = true;
    leaves.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const randomRotation = new THREE.Euler();
    let index = 0;
    for (const point of branchPoints) {
      for (let k = 0; k < 2; k += 1) {
        dummy.position.set(
          point.x + (Math.random() - 0.5) * 0.16,
          point.y + (Math.random() - 0.5) * 0.14,
          point.z + (Math.random() - 0.5) * 0.16,
        );
        randomRotation.set(
          Math.random() * Math.PI - Math.PI / 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI - Math.PI / 2,
        );
        dummy.rotation.copy(randomRotation);
        const scale = 0.55 + Math.random() * 0.65;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        leaves.setMatrixAt(index, dummy.matrix);
        index += 1;
      }
    }
    leaves.instanceMatrix.needsUpdate = true;
    foliage.add(leaves);

    foliage.position.y = 0;
    foliage.castShadow = true;
    group.add(foliage);

    group.position.set(-2.7, 0, 1.5);
    return { group, foliage };
  }

  const plant = buildPlant();
  scene.add(plant.group);

  /* ------------------------------------------------------ contact shadows */

  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: contactTexture,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    color: '#1a1511',
  });

  function addContactShadow(width, depth, x, z, opacity, y = 0.018) {
    const material = shadowMaterial.clone();
    material.opacity = opacity;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(x, y, z);
    plane.renderOrder = 1;
    scene.add(plane);
    return plane;
  }

  addContactShadow(3.9, 2.1, -0.3, -1.55, 0.55, 0.02);
  addContactShadow(1.7, 1.1, 0.55, -0.15, 0.34, 0.021);
  addContactShadow(0.75, 0.75, 2.35, -1.55, 0.4, 0.022);
  addContactShadow(0.95, 0.95, -2.7, 1.5, 0.42, 0.006);
  addContactShadow(0.75, 2.3, -3.4, -1.45, 0.34, 0.006);

  /* ------------------------------------------------------------- exterior */

  const exterior = buildExterior(scene, glowTexture);

  /* ---------------------------------------------------------------- lights */

  const hemi = new THREE.HemisphereLight(DAY.hemiSky, DAY.hemiGround, DAY.hemiIntensity);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(DAY.ambient, DAY.ambientIntensity);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(DAY.sunColor, DAY.sunIntensity);
  sun.position.copy(DAY.sunPosition);
  sun.target.position.set(0, 0.8, -0.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 45;
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9;
  sun.shadow.camera.bottom = -9;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  scene.add(sun.target);

  const windowFill = new THREE.RectAreaLight(DAY.fillColor, DAY.fillIntensity, 6.0, 2.9);
  windowFill.position.set(0, 1.55, -3.02);
  windowFill.lookAt(0, 1.25, 3);
  scene.add(windowFill);

  const bounce = new THREE.PointLight(new THREE.Color('#ffe9d2'), DAY.bounceIntensity, 9, 2);
  bounce.position.set(0.4, 0.4, 1.4);
  scene.add(bounce);

  const coveLight = new THREE.PointLight(new THREE.Color('#ffc48b'), DAY.coveLight, 6.5, 2);
  coveLight.position.set(-0.6, 2.86, -2.35);
  scene.add(coveLight);

  const downLight = new THREE.SpotLight(
    new THREE.Color('#ffd8ad'),
    DAY.downLight,
    8,
    0.62,
    0.55,
    2,
  );
  downLight.position.set(-3.25, 2.96, -1.45);
  downLight.target.position.set(-3.45, 0.75, -1.45);
  scene.add(downLight);
  scene.add(downLight.target);

  /* ------------------------------------------------------------- dust motes */

  const dustCount = 240;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustBase = new Float32Array(dustCount * 3);
  const dustPhase = new Float32Array(dustCount);

  for (let i = 0; i < dustCount; i += 1) {
    const x = -2.9 + Math.random() * 5.9;
    const y = 0.25 + Math.random() * 2.55;
    const z = -2.95 + Math.random() * 4.0;
    dustBase[i * 3] = x;
    dustBase[i * 3 + 1] = y;
    dustBase[i * 3 + 2] = z;
    dustPositions[i * 3] = x;
    dustPositions[i * 3 + 1] = y;
    dustPositions[i * 3 + 2] = z;
    dustPhase[i] = Math.random() * Math.PI * 2;
  }

  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMaterial = new THREE.PointsMaterial({
    map: dustTexture,
    color: new THREE.Color('#ffe6c4'),
    size: 0.018,
    sizeAttenuation: true,
    transparent: true,
    opacity: DAY.dust,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.frustumCulled = false;
  scene.add(dust);

  /* --------------------------------------------------------------- updates */

  function update(time) {
    const positions = dustGeometry.attributes.position.array;
    const drift = prefersReducedMotion ? 0 : 1;
    for (let i = 0; i < dustCount; i += 1) {
      const phase = dustPhase[i];
      const x = dustBase[i * 3] + Math.sin(time * 0.19 + phase) * 0.07 * drift;
      let y = dustBase[i * 3 + 1] + Math.sin(time * 0.11 + phase * 1.7) * 0.06 * drift;
      const z = dustBase[i * 3 + 2] + Math.cos(time * 0.16 + phase) * 0.06 * drift;
      y = 0.25 + ((y - 0.25 + time * 0.012 * drift) % 2.55 + 2.55) % 2.55;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    dustGeometry.attributes.position.needsUpdate = true;

    if (!prefersReducedMotion) {
      plant.foliage.rotation.z = Math.sin(time * 0.24) * 0.006;
      curtainLeft.rotation.z = Math.sin(time * 0.31) * 0.0035;
      curtainRight.rotation.z = Math.sin(time * 0.29 + 1.4) * 0.0035;
      exterior.seaMaterial.bumpMap.offset.x = time * 0.0035;
      exterior.seaMaterial.bumpMap.offset.y = time * 0.0016;
    }
  }

  /* ---------------------------------------------------------------- return */

  return {
    sky: exterior.sky,
    sun,
    hemi,
    ambient,
    windowFill,
    bounce,
    coveLight,
    coveMaterial,
    downLight,
    downMaterial,
    seaMaterial: exterior.seaMaterial,
    ridgeNear: exterior.ridgeNear,
    ridgeFar: exterior.ridgeFar,
    sunSprite: exterior.sunSprite,
    lampLight: lamp.light,
    lampShade: lamp.shadeMaterial,
    lampGlow: lamp.glow,
    dustMaterial,
    curtainMaterial: M.curtain,
    update,
  };
}

/* ============================================================================
   Sofa — low bouclé sectional
   ============================================================================ */

function buildSofa(M, roundBoxGeometry) {
  const group = new THREE.Group();
  const box = roundBoxGeometry;

  // Shadow-gap legs.
  const legGeometry = new THREE.CylinderGeometry(0.026, 0.021, 0.085, 8);
  const legPositions = [
    [-1.0, -0.42],
    [-1.0, 0.4],
    [0.2, -0.42],
    [0.2, 0.4],
    [1.4, -0.42],
    [1.4, 0.4],
    [-1.6, 1.25],
  ];
  for (const [x, z] of legPositions) {
    const leg = new THREE.Mesh(legGeometry, M.darkOak);
    leg.position.set(x, 0.043, z);
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);
  }

  // Main platform.
  const base = new THREE.Mesh(box(2.55, 0.26, 1.0, 0.09), M.boucle);
  base.position.set(0.2, 0.2, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Chaise platform.
  const chaiseBase = new THREE.Mesh(box(1.15, 0.26, 1.6, 0.09), M.boucle);
  chaiseBase.position.set(-1.15, 0.2, 0.3);
  chaiseBase.castShadow = true;
  chaiseBase.receiveShadow = true;
  group.add(chaiseBase);

  // Right arm.
  const arm = new THREE.Mesh(box(0.26, 0.55, 1.0, 0.1), M.boucle);
  arm.position.set(1.61, 0.305, 0);
  arm.castShadow = true;
  arm.receiveShadow = true;
  group.add(arm);

  // Low back.
  const back = new THREE.Mesh(box(2.72, 0.6, 0.24, 0.09), M.boucle);
  back.position.set(0.2, 0.5, -0.44);
  back.castShadow = true;
  back.receiveShadow = true;
  group.add(back);

  // Seat cushions.
  const seatGeometry = box(1.08, 0.16, 0.88, 0.07);
  for (const x of [-0.52, 0.64]) {
    const cushion = new THREE.Mesh(seatGeometry, M.boucleSeat);
    cushion.position.set(x, 0.345, 0.03);
    cushion.rotation.y = (x < 0 ? 1 : -1) * 0.012;
    cushion.castShadow = true;
    cushion.receiveShadow = true;
    group.add(cushion);
  }

  const chaiseCushion = new THREE.Mesh(box(1.04, 0.16, 1.44, 0.07), M.boucleSeat);
  chaiseCushion.position.set(-1.15, 0.345, 0.36);
  chaiseCushion.castShadow = true;
  chaiseCushion.receiveShadow = true;
  group.add(chaiseCushion);

  // Piping along the seat fronts — a quiet seam line.
  const seatPipeGeometry = new THREE.CylinderGeometry(0.011, 0.011, 1.06, 10);
  for (const x of [-0.52, 0.64]) {
    const pipe = new THREE.Mesh(seatPipeGeometry, M.piping);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(x, 0.408, 0.474);
    pipe.receiveShadow = true;
    group.add(pipe);
  }
  const chaisePipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 1.02, 10),
    M.piping,
  );
  chaisePipe.rotation.z = Math.PI / 2;
  chaisePipe.position.set(-1.15, 0.408, 1.086);
  chaisePipe.receiveShadow = true;
  group.add(chaisePipe);
  // Back cushions.
  const backCushionGeometry = box(0.8, 0.4, 0.2, 0.08);
  for (const x of [-0.5, 0.4, 1.26]) {
    const cushion = new THREE.Mesh(backCushionGeometry, M.boucleSeat);
    cushion.position.set(x, 0.63, -0.29);
    cushion.rotation.x = -0.16;
    cushion.rotation.y = (x - 0.4) * 0.02;
    cushion.castShadow = true;
    cushion.receiveShadow = true;
    group.add(cushion);
  }

  const chaiseBack = new THREE.Mesh(box(1.0, 0.4, 0.2, 0.08), M.boucleSeat);
  chaiseBack.position.set(-1.15, 0.63, -0.29);
  chaiseBack.rotation.x = -0.16;
  chaiseBack.castShadow = true;
  group.add(chaiseBack);

  // Throw pillows.
  const pillowGeometry = box(0.42, 0.41, 0.14, 0.06);
  const pillows = [
    { position: [-0.62, 0.56, -0.16], rotation: [-0.2, 0.22, 0.04], material: M.pillowCream },
    { position: [0.32, 0.56, -0.14], rotation: [-0.22, -0.18, -0.05], material: M.pillowClay },
    { position: [-1.2, 0.56, -0.16], rotation: [-0.18, 0.5, 0.08], material: M.pillowStone },
  ];
  for (const pillow of pillows) {
    const mesh = new THREE.Mesh(pillowGeometry, pillow.material);
    mesh.position.fromArray(pillow.position);
    mesh.rotation.set(pillow.rotation[0], pillow.rotation[1], pillow.rotation[2]);
    mesh.scale.set(1, 1, 0.74);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // A folded throw over the chaise.
  const folded = new THREE.Mesh(box(0.52, 0.1, 0.7, 0.04), M.throw);
  folded.position.set(-1.22, 0.47, 0.72);
  folded.rotation.y = 0.16;
  folded.rotation.z = -0.02;
  folded.castShadow = true;
  folded.receiveShadow = true;
  group.add(folded);

  return group;
}

/* ============================================================================
   Exterior — terrace, sea, sky, headlands
   ============================================================================ */

function buildExterior(scene, glowTexture) {
  /* Sky dome. */
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: DAY.skyTop.clone() },
      uHorizon: { value: DAY.skyHorizon.clone() },
      uSunColor: { value: DAY.sunSky.clone() },
      uSunDir: { value: DAY.sunPosition.clone().normalize() },
      uSunSize: { value: 0.055 },
      uGlow: { value: 0.9 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      uniform float uSunSize;
      uniform float uGlow;
      varying vec3 vDirection;

      void main() {
        vec3 dir = normalize(vDirection);
        float h = clamp(dir.y, -1.0, 1.0);
        float up = smoothstep(-0.03, 0.62, h);
        vec3 color = mix(uHorizon, uTop, pow(up, 0.92));
        color = mix(color, uHorizon, exp(-max(h, 0.0) * 9.0) * 0.55);

        float d = max(dot(dir, normalize(uSunDir)), 0.0);
        float disc = smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.35, d);
        float halo = pow(d, 200.0) * 0.7 + pow(d, 18.0) * 0.5;
        color += uSunColor * (disc * 1.25 + halo * uGlow);

        float band = sin(dir.x * 4.0 + dir.y * 14.0) * 0.5 + sin(dir.x * 9.0 - dir.y * 22.0) * 0.5;
        color += uHorizon * smoothstep(0.02, 0.38, h) * smoothstep(0.62, 0.12, h) * band * 0.018;

        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });

  const sky = new THREE.Mesh(new THREE.SphereGeometry(2800, 48, 24), skyMaterial);
  sky.renderOrder = -10;
  scene.add(sky);

  /* Terrace outside the glazing. */
  const terraceMaterial = new THREE.MeshStandardMaterial({
    map: null,
    color: '#c6b8a4',
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.25,
  });
  const terrace = new THREE.Mesh(new THREE.BoxGeometry(13, 0.2, 3.8), terraceMaterial);
  terrace.position.set(0, -0.255, -5.0);
  terrace.receiveShadow = true;
  terrace.castShadow = true;
  scene.add(terrace);

  const terraceLine = new THREE.Mesh(
    new THREE.BoxGeometry(13, 0.05, 0.08),
    new THREE.MeshStandardMaterial({ color: '#9f9080', roughness: 0.9 }),
  );
  terraceLine.position.set(0, -0.14, -6.88);
  scene.add(terraceLine);

  /* Sea. */
  const seaMaterial = new THREE.MeshStandardMaterial({
    color: DAY.sea,
    roughness: DAY.seaRoughness,
    metalness: DAY.seaMetalness,
    bumpMap: makeSeaBump(8),
    bumpScale: 0.035,
    envMapIntensity: 1.5,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4200, 4200), seaMaterial);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -1.4, -900);
  sea.receiveShadow = false;
  scene.add(sea);

  /* Headlands on the horizon. */
  function buildRidge(z, width, height, color, seed) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, -2);
    const steps = 90;
    for (let i = 0; i <= steps; i += 1) {
      const x = -width / 2 + (width * i) / steps;
      const ridge =
        Math.sin(i * 0.24 + seed) * 0.5 +
        Math.sin(i * 0.11 + seed * 2) * 0.34 +
        Math.sin(i * 0.53 + seed * 3) * 0.16;
      const y = -1.35 + Math.max(0.15, 0.55 + ridge * 0.7) * height;
      shape.lineTo(x, y);
    }
    shape.lineTo(width / 2, -2);
    shape.closePath();

    const material = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      fog: true,
      toneMapped: true,
    });
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
    mesh.position.set(-8, 0, z);
    scene.add(mesh);
    return mesh;
  }

  const ridgeNear = buildRidge(-250, 520, 3.1, DAY.ridgeNear, 1.7);
  const ridgeFar = buildRidge(-330, 900, 4.4, DAY.ridgeFar, 4.2);

  /* Sun halo. */
  const sunSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: new THREE.Color('#ffedcf'),
      transparent: true,
      opacity: DAY.sunSprite,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  sunSprite.position.copy(DAY.sunPosition).normalize().multiplyScalar(1400);
  sunSprite.scale.set(DAY.sunSpriteScale, DAY.sunSpriteScale, 1);
  scene.add(sunSprite);

  return { sky, seaMaterial, ridgeNear, ridgeFar, sunSprite };
}
