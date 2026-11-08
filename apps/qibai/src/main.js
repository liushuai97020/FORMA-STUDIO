import * as THREE from 'three';
import {
  LIGHT_MODES,
  ROOMS,
  VIEWS,
  getInitialState,
  syncURL
} from './state.js';
import { createStage } from './scene/renderer.js';
import { createMaterials, PLATE_TEXT } from './scene/materials.js';
import { createSky } from './scene/sky.js';
import { createLighting } from './scene/lighting.js';
import { createVilla } from './scene/villa.js';
import { createInterior } from './scene/interior.js';
import { createCourtyard } from './scene/courtyard.js';
import { createCherry } from './scene/cherry.js';
import { makeCar } from './scene/car.js';
import { createPanels } from './ui/panels.js';
import { createControls } from './ui/controls.js';
import { createHotspots } from './ui/hotspots.js';
import { easeInOutCubic, clamp } from './scene/helpers.js';

const container = document.getElementById('scene');
const params = new URLSearchParams(window.location.search);
const state = getInitialState();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const mobileQuery = window.matchMedia('(max-width: 760px)');
const MOBILE_VIEWS = {
  courtyard: { position: [29, 14, 36], target: [-0.8, 3.8, 0.8], fov: 50 },
  architecture: { position: [20, 9, 27], target: [0, 4.2, -2.5], fov: 46 },
  living: { position: [12, 3.8, 14], target: [-1.2, 1.65, -4.1], fov: 50 },
  bedroom: { position: [-1.2, 12.2, 10.5], target: [-2.6, 4.8, -6.2], fov: 48 },
  parking: { position: [1.0, 3.5, 15.5], target: [9.68, 1.0, 7.1], fov: 46 },
  driveway: { position: [-4.0, 13.2, -0.8], target: [10.2, 1.1, 14.8], fov: 60 },
  tea: { position: [-3.0, 3.5, 10.5], target: [-8.7, 1.35, -3.7], fov: 48 },
  aerial: { position: [25, 24, 31], target: [0, 0.6, 0], fov: 50 }
};

if (!params.has('cutaway') && VIEWS[state.view]?.cutaway) state.cutaway = true;
if (reducedMotion) {
  state.autoOrbit = false;
  state.snapshot = state.snapshot || false;
}

let panels = null;
let setView = () => {};

panels = createPanels({
  onNavigate: (view) => setView(view, { closePanel: true })
});

function supportsWebGL2() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

if (!supportsWebGL2()) {
  panels.showFallback();
} else {
  boot();
}

function boot() {
  panels.setProgress(10);
  let stage;
  try {
    stage = createStage(container);
  } catch (error) {
    console.error('WebGL stage failed:', error);
    panels.showFallback();
    return;
  }

  const { renderer, scene, camera, controls, quality } = stage;
  if (reducedMotion) {
    quality.petalCount = Math.min(quality.petalCount, 120);
    quality.blossomCount = Math.min(quality.blossomCount, 600);
  }

  panels.setProgress(25);
  const M = createMaterials();
  const sky = createSky(scene);
  const lighting = createLighting({ scene, renderer, sky });

  panels.setProgress(38);
  const villa = createVilla(M);
  const interior = createInterior(M);
  scene.add(villa.group);
  scene.add(interior.group);
  interior.group.visible = state.cutaway;

  panels.setProgress(55);
  const courtyard = createCourtyard(M);
  courtyard.group.name = 'courtyard';
  scene.add(courtyard.group);

  panels.setProgress(70);
  const cherry = createCherry(M, quality);
  cherry.group.name = 'cherry';
  scene.add(cherry.group);

  panels.setProgress(82);
  const car = makeCar(M);
  scene.add(car.group);

  // Exterior sconces, interior pendants, lanterns and path lights all get a
  // shared warm-light multiplier from the mood controller.
  lighting.registerWarm({
    lights: interior.warmLights,
    exteriorLights: [...villa.exteriorLights, ...courtyard.exteriorLights],
    glowMaterials: [
      { material: M.windowGlow, base: M.windowGlow.opacity },
      { material: M.warmGlow, base: M.warmGlow.opacity }
    ],
    emissiveMaterials: [
      { material: M.lantern, base: M.lantern.emissiveIntensity },
      { material: M.paper, base: M.paper.emissiveIntensity },
      { material: M.headlight, base: M.headlight.emissiveIntensity }
    ]
  });

  panels.setProgress(92);

  // Initial visual state.
  lighting.setMode(state.light, { instant: true });
  villa.setCutaway(state.cutaway);
  cherry.setWind(state.wind);
  cherry.setPetalsVisible(state.petals);

  let transition = null;
  let currentView = state.view;

  const cameraPreset = (view) => {
    const base = VIEWS[view] || VIEWS.courtyard;
    if (!mobileQuery.matches) return base;
    return { ...base, ...(MOBILE_VIEWS[view] || {}) };
  };

  function applyCamera(view, instant = false) {
    const preset = cameraPreset(view);
    const position = new THREE.Vector3().fromArray(preset.position);
    const target = new THREE.Vector3().fromArray(preset.target);
    if (instant || reducedMotion || state.snapshot) {
      camera.position.copy(position);
      controls.target.copy(target);
      camera.fov = preset.fov;
      camera.updateProjectionMatrix();
      controls.enabled = true;
      transition = null;
      controls.update();
      return;
    }
    transition = {
      elapsed: 0,
      duration: 1.25,
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      fromFov: camera.fov,
      toPosition: position,
      toTarget: target,
      toFov: preset.fov
    };
    controls.enabled = false;
  }

  function updateTransition(dt) {
    if (!transition) return;
    transition.elapsed += dt;
    const t = clamp(transition.elapsed / transition.duration, 0, 1);
    const eased = easeInOutCubic(t);
    camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
    controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
    camera.fov = transition.fromFov + (transition.toFov - transition.fromFov) * eased;
    camera.updateProjectionMatrix();
    if (t >= 1) {
      camera.position.copy(transition.toPosition);
      controls.target.copy(transition.toTarget);
      camera.fov = transition.toFov;
      camera.updateProjectionMatrix();
      transition = null;
      controls.enabled = true;
      controls.update();
    }
  }

  function activeRoomForView(view) {
    if (view === 'courtyard') return 'courtyard';
    if (view === 'parking') return 'parking';
    if (view === 'living') return 'living';
    if (view === 'tea') return 'tea';
    if (view === 'bedroom') return 'bedroom';
    return null;
  }

  function setCutawayState(enabled, { silent = false } = {}) {
    state.cutaway = Boolean(enabled);
    villa.setCutaway(state.cutaway);
    interior.group.visible = state.cutaway;
    hotspots.setMode(state.cutaway ? 'interior' : 'exterior');
    controlsUI.setCutawayUI(state.cutaway);
    if (!silent) syncURL(state);
  }

  function setView(view, { instant = state.snapshot, closePanel = true } = {}) {
    if (!VIEWS[view]) view = 'courtyard';
    currentView = view;
    state.view = view;
    document.body.dataset.view = view;
    state.autoOrbit = false;
    controlsUI.setOrbitUI(false);
    controls.autoRotate = false;
    const preset = VIEWS[view];
    state.cutaway = Boolean(preset.cutaway);
    setCutawayState(state.cutaway, { silent: true });
    applyCamera(view, instant);
    controlsUI.setActiveView(view);
    const roomId = activeRoomForView(view);
    hotspots.setActive(roomId);
    if (closePanel) panels.closeRoom();
    syncURL(state);
  }

  function handleView(view, instant = false) {
    state.autoOrbit = false;
    setView(view, { closePanel: true, instant });
  }

  function handleLight(mode, instant = false) {
    if (!LIGHT_MODES[mode]) return;
    state.light = mode;
    document.body.dataset.light = mode;
    lighting.setMode(mode, { instant });
    controlsUI.setLightUI(mode);
    syncURL(state);
  }

  function handlePetal(enabled) {
    state.petals = Boolean(enabled);
    cherry.setPetalsVisible(state.petals);
    controlsUI.setPetalsUI(state.petals);
    syncURL(state);
    panels.showToast(state.petals ? '樱花雨已开启' : '樱花雨已暂停');
  }

  function handleWind(value) {
    state.wind = clamp(Number(value), 0, 1);
    cherry.setWind(state.wind);
    controlsUI.setWindUI(state.wind);
    syncURL(state);
  }

  function handleCutaway(enabled) {
    const next = Boolean(enabled);
    setCutawayState(next);
    if (!next && VIEWS[currentView]?.interior) {
      setView('courtyard');
    }
  }

  function handleOrbit(enabled) {
    state.autoOrbit = Boolean(enabled);
    controls.autoRotate = state.autoOrbit;
    controls.autoRotateSpeed = 0.55;
    controlsUI.setOrbitUI(state.autoOrbit);
    panels.showToast(state.autoOrbit ? '自动环游已开启，拖动即可暂停' : '自动环游已暂停');
  }

  let carState = 'parked';

  function setCarUI(status) {
    if (status === 'parked') {
      controlsUI.setCarUI({ label: '车辆驶出', sub: 'CAR · PARKED', mode: 'parked' });
    } else if (status === 'outside') {
      controlsUI.setCarUI({ label: '泊回院子', sub: 'CAR · OUTSIDE', mode: 'outside' });
    } else if (status === 'drivingOut') {
      controlsUI.setCarUI({ label: '驶出中…', sub: 'CAR · MOVING', mode: 'driving', disabled: true });
    } else if (status === 'drivingIn') {
      controlsUI.setCarUI({ label: '泊车中…', sub: 'CAR · MOVING', mode: 'driving', disabled: true });
    }
    carState = status;
  }

  function handleCarToggle() {
    if (carState === 'parked') {
      if (state.view !== 'driveway') setView('driveway', { closePanel: true });
      if (car.driveOut()) {
        setCarUI('drivingOut');
        panels.showToast('车辆正在驶出院子');
      }
    } else if (carState === 'outside') {
      if (state.view !== 'driveway') setView('driveway', { closePanel: true });
      if (car.driveIn()) {
        setCarUI('drivingIn');
        panels.showToast('车辆正在泊回院子');
      }
    }
  }

  function handleSelectRoom(roomId) {
    const room = ROOMS[roomId];
    if (!room) return;
    setView(room.view, { closePanel: false });
    hotspots.setActive(roomId);
    panels.openRoom(room);
  }

  const controls2 = createControls({
    state,
    onView: handleView,
    onLight: handleLight,
    onPetal: handlePetal,
    onWind: handleWind,
    onCutaway: handleCutaway,
    onOrbit: handleOrbit,
    onCar: handleCarToggle,
    onAbout: () => panels.openAbout()
  });
  // Keep the local name used below and expose once for clarity.
  const controlsUI = controls2;
  const hotspots = createHotspots(document.getElementById('hotspots'), {
    onSelect: handleSelectRoom
  });
  hotspots.setMode(state.cutaway ? 'interior' : 'exterior');
  setCarUI('parked');
  controls.autoRotate = state.autoOrbit;
  controls.autoRotateSpeed = 0.55;

  controls.addEventListener('start', () => {
    if (state.autoOrbit) {
      state.autoOrbit = false;
      controls.autoRotate = false;
      controlsUI.setOrbitUI(false);
    }
  });

  // Close a room card when the user starts exploring the scene directly.
  renderer.domElement.addEventListener('pointerdown', () => {
    if (panels.getActiveRoom()) panels.closeRoom();
  });

  // Initial camera framing.
  const initialPreset = cameraPreset(state.view);
  if (state.snapshot || reducedMotion) {
    camera.position.fromArray(initialPreset.position);
    controls.target.fromArray(initialPreset.target);
    camera.fov = initialPreset.fov;
    camera.updateProjectionMatrix();
    controls.update();
  } else {
    camera.position.set(28, 17, 34);
    controls.target.set(0, 3.4, 1.2);
    controls.update();
    applyCamera(state.view, false);
  }

  panels.setProgress(100);
  renderer.render(scene, camera);
  window.__VILLA__ = {
    ready: false,
    state,
    plateText: PLATE_TEXT,
    materials: M,
    scene,
    camera,
    renderer,
    setView: (view, instant = true) => handleView(view, instant),
    setLight: (mode, instant = true) => handleLight(mode, instant),
    setCutaway: (enabled) => handleCutaway(enabled),
    setPetals: (enabled) => handlePetal(enabled),
    setWind: (value) => handleWind(value),
    setOrbit: (enabled) => handleOrbit(enabled),
    toggleCar: () => handleCarToggle(),
    carState: () => ({ phase: carState, ...car.getDriveState() }),
    setCarProgress: (t) => {
      const next = car.setDriveProgress(t);
      setCarUI(next.outside ? 'outside' : 'parked');
    },
    hide: (name, visible = false) => {
      const object = scene.getObjectByName(name);
      if (object) object.visible = visible;
    },
    info: () => ({
      view: state.view,
      light: state.light,
      cutaway: state.cutaway,
      petals: state.petals,
      wind: state.wind,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles
    })
  };

  const clockStart = performance.now();
  let last = clockStart;
  let elapsed = 0;
  let firstFrame = true;

  function animate(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;

    lighting.update(dt);
    sky.update(elapsed);
    cherry.update(dt, elapsed);
    const carEvent = car.updateDrive(dt, now);
    if (carEvent === 'outside') {
      setCarUI('outside');
      panels.showToast('车辆已驶出院子');
    } else if (carEvent === 'parked') {
      setCarUI('parked');
      panels.showToast('车辆已停回院子');
    }
    updateTransition(dt);
    controls.update();

    const width = renderer.domElement.clientWidth;
    const height = renderer.domElement.clientHeight;
    hotspots.update(camera, width, height);

    renderer.render(scene, camera);

    if (firstFrame) {
      firstFrame = false;
      window.__VILLA__.ready = true;
      document.documentElement.dataset.ready = 'true';
      window.dispatchEvent(new CustomEvent('villa-ready'));
      panels.finishLoader();
    }
  }

  renderer.setAnimationLoop(animate);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      renderer.setAnimationLoop(null);
    } else {
      last = performance.now();
      renderer.setAnimationLoop(animate);
    }
  });

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    panels.showToast('3D 渲染上下文已丢失，请刷新页面');
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    window.location.reload();
  });

  // Keep the active UI consistent with URL-provided initial state.
  controlsUI.sync(state);
  controlsUI.setActiveView(state.view);
  syncURL(state);
}









