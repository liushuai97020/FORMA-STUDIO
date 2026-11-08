import * as THREE from 'three';
import { CAMERA, DRINKS, getInitialState, drinkById } from './state.js';
import { createStage } from './scene/renderer.js';
import { createMaterials } from './scene/materials.js';
import { createExterior } from './scene/exterior.js';
import { createInterior } from './scene/interior.js';
import { createWeather } from './scene/weather.js';
import { createUI, orderNote } from './ui/ui.js';

const container = document.getElementById('scene');
const state = getInitialState();
const reducedMotion = state.reducedMotion;
const mobileQuery = window.matchMedia('(max-width: 760px)');
const clock = new THREE.Clock();

function supportsWebGL2() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

function showFallbackStatic() {
  const fallback = document.getElementById('fallback');
  if (fallback) fallback.hidden = false;
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';
  document.body.classList.add('is-ready');
}

boot();

function boot() {
  if (!supportsWebGL2()) {
    showFallbackStatic();
    return;
  }

  let stage;
  try {
    stage = createStage(container);
  } catch (error) {
    console.error('檐下: WebGL stage failed to start.', error);
    showFallbackStatic();
    return;
  }

  const { renderer, scene, camera, controls } = stage;
  const MAT = createMaterials();
  const exterior = createExterior(MAT, {});
  const interior = createInterior(MAT);
  scene.add(exterior.group);
  scene.add(interior.group);

  const weather = createWeather({
    scene,
    renderer,
    MAT,
    exterior,
    interior,
    reducedMotion,
    hero: state.hero
  });

  if (state.hero) {
    weather.setForcedSun(true);
    weather.setWeather('sunny', { instant: true });
    exterior.setHeroPose();
  } else {
    weather.setWeather(state.weather, { instant: true });
  }

  const ui = createUI({
    onWeatherChange: handleWeather,
    onViewToggle: toggleView,
    onOrderRequest: requestOrder,
    onCabinetRequest: () => requestCabinet(null),
    onChooseDrink: startOrder,
    onOrderAgain: reopenMenu,
    onRequestCloseOrder: requestCloseOrder,
    onRequestCloseCabinet: requestCloseCabinet,
    onCabinetStep: stepCabinet,
    onHotspotAction: handleHotspot
  });

  ui.setWeatherUI(state.hero ? 'sunny' : state.weather);
  ui.setLoaderProgress(0.25);

  /* Camera and view state */
  let viewMode = state.hero ? 'exterior' : state.view;
  if (state.hero) viewMode = 'exterior';
  const savedExterior = {
    position: new THREE.Vector3(),
    target: new THREE.Vector3()
  };
  let transition = null;
  let running = true;
  let rafId = 0;
  let elapsed = 0;
  let hidden = document.hidden;
  let offscreen = false;
  let lastMobile = mobileQuery.matches;
  let pointerX = 0;
  let pointerY = 0;
  let hoverCheckAt = 0;
  let downInfo = null;

  const order = {
    active: false,
    served: false,
    drink: null,
    startAt: 0
  };
  let cabinetDrinkId = DRINKS[0]?.id || null;

  function cameraPreset(mode) {
    if (state.hero) return mobileQuery.matches ? CAMERA.coverMobile : CAMERA.cover;
    if (mode === 'interior') return mobileQuery.matches ? CAMERA.interiorMobile : CAMERA.interior;
    if (mode === 'cabinet') return mobileQuery.matches ? CAMERA.cabinetMobile : CAMERA.cabinet;
    return mobileQuery.matches ? CAMERA.exteriorMobile : CAMERA.exterior;
  }

  function setCameraImmediate(mode) {
    const preset = cameraPreset(mode);
    camera.position.fromArray(preset.position);
    controls.target.fromArray(preset.target);
    camera.fov = preset.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(controls.target);
    camera.updateMatrixWorld();
    controls.enabled = !state.hero && mode === 'exterior';
    if (controls.enabled) controls.update();
  }

  setCameraImmediate(viewMode);
  savedExterior.position.copy(camera.position);
  savedExterior.target.copy(controls.target);
  ui.setViewUI(viewMode);

  /* ----------------------------------------------------------------------
     Weather and ambient state
     ---------------------------------------------------------------------- */

  function handleWeather(weatherKey) {
    if (state.hero) return;
    if (weatherKey !== 'sunny' && weatherKey !== 'rainy') return;
    state.weather = weatherKey;
    weather.setWeather(weatherKey);
    ui.setWeatherUI(weatherKey);
    ui.showToast(weatherKey === 'rainy' ? '雨落下来了，檐下有位置。' : '天晴了，光正落在桌上。');
  }

  /* ----------------------------------------------------------------------
     Camera transitions
     ---------------------------------------------------------------------- */

  function easeInOutCubic(value) {
    return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  function goTo(mode, { onDone = null, instant = false } = {}) {
    if (state.hero || transition) return;
    if (viewMode === mode) {
      onDone?.();
      return;
    }

    const fromMode = viewMode;
    if (viewMode === 'exterior') {
      savedExterior.position.copy(camera.position);
      savedExterior.target.copy(controls.target);
    }

    const preset = cameraPreset(mode);
    const toPosition = new THREE.Vector3().fromArray(preset.position);
    const toTarget = new THREE.Vector3().fromArray(preset.target);
    if (mode === 'exterior') {
      toPosition.copy(savedExterior.position);
      toTarget.copy(savedExterior.target);
    }

    viewMode = mode;
    state.view = mode;
    ui.setViewUI(mode);

    const crossing = (fromMode === 'exterior' && (mode === 'interior' || mode === 'cabinet')) ||
      ((fromMode === 'interior' || fromMode === 'cabinet') && mode === 'exterior');

    if (reducedMotion && !instant) {
      const fromPosition = camera.position.clone();
      const fromTarget = controls.target.clone();
      const fromFov = camera.fov;
      transition = {
      elapsed: 0,
      duration: 0.2,
      startAt: performance.now(),
      fromPosition,
      fromTarget,
      fromFov,
      toPosition,
      toTarget,
      toFov: preset.fov,
      onDone,
      crossing,
      controlPoint: null,
      mode
    };
      controls.enabled = false;
      return;
    }

    transition = {
      elapsed: 0,
      duration: mode === 'cabinet' ? 1.05 : 1.5,
      startAt: performance.now(),
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      fromFov: camera.fov,
      toPosition,
      toTarget,
      toFov: preset.fov,
      onDone,
      crossing,
      mode,
      controlPoint: crossing ? new THREE.Vector3(2.16, 2.2, 4.4) : null
    };
    controls.enabled = false;
    ui.setVeil(0);
  }

  const bezier = new THREE.Vector3();
  function updateTransition(dt) {
    if (!transition) return;
    const t = Math.min(1, (performance.now() - transition.startAt) / (transition.duration * 1000));
    const eased = easeInOutCubic(t);
    if (transition.controlPoint) {
      const inv = 1 - eased;
      bezier.set(0, 0, 0);
      bezier.addScaledVector(transition.fromPosition, inv * inv);
      bezier.addScaledVector(transition.controlPoint, 2 * inv * eased);
      bezier.addScaledVector(transition.toPosition, eased * eased);
      camera.position.copy(bezier);
      if (t > 0.1 && t < 0.9) {
        ui.setVeil(Math.sin(Math.PI * t) * (state.hero ? 0 : 0.58));
      }
    } else {
      camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
    }
    controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
    camera.fov = THREE.MathUtils.lerp(transition.fromFov, transition.toFov, eased);
    camera.updateProjectionMatrix();
    camera.lookAt(controls.target);

    if (t >= 1) {
      camera.position.copy(transition.toPosition);
      controls.target.copy(transition.toTarget);
      camera.fov = transition.toFov;
      camera.updateProjectionMatrix();
      controls.enabled = !state.hero && viewMode === 'exterior';
      if (controls.enabled) controls.update();
      ui.setVeil(0);
      const done = transition.onDone;
      transition = null;
      done?.();
      updateHotspots();
    }
  }

  function idleInteriorCamera() {
    const preset = cameraPreset(viewMode);
    const sway = reducedMotion ? 0 : 1;
    camera.position.set(
      preset.position[0] + pointerX * 0.16 * sway,
      preset.position[1] - pointerY * 0.09 * sway,
      preset.position[2] + pointerX * 0.06 * sway
    );
    const target = new THREE.Vector3(
      preset.target[0] + pointerX * 0.2 * sway,
      preset.target[1] - pointerY * 0.12 * sway,
      preset.target[2]
    );
    camera.lookAt(target);
    if (Math.abs(camera.fov - preset.fov) > 0.01) {
      camera.fov = preset.fov;
      camera.updateProjectionMatrix();
    }
  }

  /* ----------------------------------------------------------------------
     View / interaction
     ---------------------------------------------------------------------- */

  function toggleView() {
    if (state.hero || transition) return;
    if (ui.isModalOpen()) {
      if (ui.isModalOpen('order')) requestCloseOrder();
      else requestCloseCabinet();
      return;
    }
    if (viewMode === 'exterior') goTo('interior');
    else goTo('exterior');
  }

  function handleHotspot(action) {
    if (state.hero || transition) return;
    if (action === 'door') goTo('interior');
    else if (action === 'order') requestOrder();
    else if (action === 'cabinet') requestCabinet(null);
  }

  function requestOrder() {
    if (state.hero || transition) return;
    if (viewMode === 'interior') {
      ui.showMenu();
      return;
    }
    goTo('interior', { onDone: () => ui.showMenu() });
  }

  function startOrder(drink) {
    if (state.hero) return;
    if (viewMode !== 'interior') {
      goTo('interior', { onDone: () => startOrder(drink) });
      return;
    }
    order.active = true;
    order.served = false;
    order.drink = drink;
    order.startAt = performance.now();
    interior.beginOrder(drink);
    ui.showOrderPrep(drink);
  }

  function completeOrder() {
    if (!order.drink) return;
    order.active = false;
    order.served = true;
    interior.finishOrder(order.drink);
    ui.updateOrderProgress(order.drink, 1, { note: order.drink.prep[order.drink.prep.length - 1] });
    ui.showOrderServed(order.drink);
    ui.showToast(`${order.drink.name} 好了，请到吧台左侧取餐。`, 3200);
  }

  function resetOrder() {
    order.active = false;
    order.served = false;
    order.drink = null;
    order.startAt = 0;
    interior.resetOrder();
  }

  function reopenMenu() {
    resetOrder();
    ui.showMenu();
  }

  function requestCloseOrder() {
    if (order.active) {
      resetOrder();
      ui.closeModal('order');
      ui.showToast('已取消本次点单。');
      return;
    }
    ui.closeModal('order');
    if (order.served) {
      resetOrder();
    }
  }

  function requestCabinet(drinkId) {
    if (state.hero || transition) return;
    const drink = drinkById(drinkId) || drinkById(cabinetDrinkId) || DRINKS[0];
    cabinetDrinkId = drink.id;
    const index = Math.max(0, DRINKS.findIndex((item) => item.id === drink.id));
    if (viewMode === 'cabinet') {
      ui.openCabinetPanel(drink, index);
      return;
    }
    goTo('cabinet', { onDone: () => ui.openCabinetPanel(drink, index) });
  }

  function stepCabinet(delta) {
    if (viewMode !== 'cabinet') return;
    const currentIndex = Math.max(0, DRINKS.findIndex((drink) => drink.id === cabinetDrinkId));
    const nextIndex = (currentIndex + delta + DRINKS.length) % DRINKS.length;
    const drink = DRINKS[nextIndex];
    cabinetDrinkId = drink.id;
    ui.openCabinetPanel(drink, nextIndex);
  }

  function requestCloseCabinet() {
    ui.closeModal('cabinet');
    if (viewMode === 'cabinet') {
      goTo('interior');
    }
  }

  function exitToStreet() {
    if (ui.isModalOpen()) {
      ui.closeModal('cabinet', { silent: true });
      ui.closeModal('order', { silent: true });
    }
    if (viewMode !== 'exterior') goTo('exterior');
  }

  /* ----------------------------------------------------------------------
     Pointer / raycast
     ---------------------------------------------------------------------- */

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const tempVector = new THREE.Vector3();

  function updatePointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
    pointerY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
  }

  function raycast(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNdc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(pointerNdc, camera);
    let targets = [];
    if (viewMode === 'exterior') targets = exterior.interactives;
    else if (viewMode === 'interior') targets = interior.interactives;
    if (!targets.length) return null;
    const hits = raycaster.intersectObjects(targets, false);
    return hits.find((hit) => hit.object.userData.interactive) || null;
  }

  function handleInteractiveHit(hit) {
    const action = hit.object.userData.interactive;
    if (!action) return;
    if (action === 'door') {
      goTo('interior');
    } else if (action === 'computer') {
      requestOrder();
    } else if (action === 'drink') {
      requestCabinet(hit.object.userData.drinkId);
    }
  }

  renderer.domElement.addEventListener('pointerdown', (event) => {
    updatePointer(event);
    downInfo = { x: event.clientX, y: event.clientY, time: performance.now() };
  });

  renderer.domElement.addEventListener('pointermove', (event) => {
    updatePointer(event);
    if (state.hero || ui.isModalOpen() || transition) return;
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const now = performance.now();
    if (now - hoverCheckAt < 90) return;
    hoverCheckAt = now;
    const hit = raycast(event);
    renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
  });

  renderer.domElement.addEventListener('pointerup', (event) => {
    if (!downInfo) return;
    const moved = Math.hypot(event.clientX - downInfo.x, event.clientY - downInfo.y);
    const elapsedClick = performance.now() - downInfo.time;
    downInfo = null;
    if (state.hero || moved > 7 || elapsedClick > 650) return;
    if (ui.isModalOpen() || transition) return;
    const hit = raycast(event);
    if (hit) handleInteractiveHit(hit);
  });

  renderer.domElement.addEventListener('pointerleave', () => {
    if (!state.hero) renderer.domElement.style.cursor = '';
    pointerX = 0;
    pointerY = 0;
  });

  window.addEventListener('keydown', (event) => {
    if ((event.key === 'e' || event.key === 'E') && !ui.isModalOpen()) {
      toggleView();
    }
  });

  /* ----------------------------------------------------------------------
     Hotspots
     ---------------------------------------------------------------------- */

  const hotspotDefs = {
    door: {
      label: '推门进入',
      action: 'door',
      position: new THREE.Vector3(2.16, 1.72, 2.4)
    },
    order: {
      label: '点单',
      action: 'order',
      position: new THREE.Vector3(0.94, 1.66, -4.25)
    },
    cabinet: {
      label: '陈列柜',
      action: 'cabinet',
      position: new THREE.Vector3(4.95, 1.9, -6.32)
    }
  };

  function projectHotspot(definition) {
    tempVector.copy(definition.position);
    const viewSpace = tempVector.clone().applyMatrix4(camera.matrixWorldInverse);
    if (viewSpace.z > -0.1) return { ...definition, visible: false, x: 0, y: 0 };
    tempVector.project(camera);
    const width = window.innerWidth;
    const height = window.innerHeight;
    const x = (tempVector.x * 0.5 + 0.5) * width;
    const y = (-tempVector.y * 0.5 + 0.5) * height;
    const visible = Math.abs(tempVector.x) < 1.05 && Math.abs(tempVector.y) < 1.05;
    return { ...definition, visible, x, y };
  }

  function updateHotspots() {
    const entries = {};
    const active = !state.hero && !ui.isModalOpen() && !transition;
    if (active && viewMode === 'exterior') {
      entries.door = projectHotspot(hotspotDefs.door);
      entries.order = { label: '点单', action: 'order', x: 0, y: 0, visible: false };
      entries.cabinet = { label: '陈列柜', action: 'cabinet', x: 0, y: 0, visible: false };
    } else if (active && viewMode === 'interior') {
      entries.door = { label: '推门进入', action: 'door', x: 0, y: 0, visible: false };
      entries.order = projectHotspot(hotspotDefs.order);
      entries.cabinet = projectHotspot(hotspotDefs.cabinet);
    } else {
      entries.door = { label: '推门进入', action: 'door', x: 0, y: 0, visible: false };
      entries.order = { label: '点单', action: 'order', x: 0, y: 0, visible: false };
      entries.cabinet = { label: '陈列柜', action: 'cabinet', x: 0, y: 0, visible: false };
    }
    ui.updateHotspotPositions(entries);
  }

  /* ----------------------------------------------------------------------
     Resize / visibility
     ---------------------------------------------------------------------- */

  function handleResize() {
    if (transition) return;
    if (state.hero) {
      setCameraImmediate(viewMode);
      return;
    }
    if (mobileQuery.matches !== lastMobile) {
      lastMobile = mobileQuery.matches;
      if (viewMode === 'exterior') {
        setCameraImmediate('exterior');
        savedExterior.position.copy(camera.position);
        savedExterior.target.copy(controls.target);
      } else {
        setCameraImmediate(viewMode);
      }
    }
  }

  window.addEventListener('resize', handleResize);
  mobileQuery.addEventListener?.('change', handleResize);

  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    syncLoop();
  });

  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];
    offscreen = entry ? !entry.isIntersecting : false;
    syncLoop();
  }, { threshold: 0 });
  observer.observe(container);

  function shouldRun() {
    return !hidden && !offscreen;
  }

  function syncLoop() {
    if (shouldRun() && !running) {
      running = true;
      clock.getDelta();
      rafId = requestAnimationFrame(frame);
    } else if (!shouldRun() && running) {
      running = false;
      cancelAnimationFrame(rafId);
    }
  }

  function stopLoop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  /* ----------------------------------------------------------------------
     Frame
     ---------------------------------------------------------------------- */

  function frame() {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    elapsed += dt;

    const rainAmount = weather.update(Math.min(rawDt, 0.25), elapsed, state.hero ? 0 : state.weather === 'rainy' ? 1 : 0);
    if (!state.hero) {
      exterior.update(dt, elapsed, rainAmount);
      interior.update(dt, elapsed, rainAmount);
    }

    if (transition) {
      updateTransition(dt);
    } else if (viewMode === 'exterior' && !state.hero) {
      controls.update();
      if (controls.enabled) {
        savedExterior.position.copy(camera.position);
        savedExterior.target.copy(controls.target);
      }
    } else if (viewMode === 'interior' || viewMode === 'cabinet') {
      idleInteriorCamera();
    }

    if (order.active) {
      const progress = Math.min(1, (performance.now() - order.startAt) / 5000);
      ui.updateOrderProgress(order.drink, progress, { note: orderNote(order.drink, progress) });
      if (progress >= 1) completeOrder();
    }

    updateHotspots();
    renderer.render(scene, camera);
  }

  /* ----------------------------------------------------------------------
     Init and dispose
     ---------------------------------------------------------------------- */

  ui.setLoaderProgress(0.72);
  const initialRain = weather.update(0, 0, state.hero ? 0 : state.weather === 'rainy' ? 1 : 0);
  exterior.update(0, 0, initialRain);
  interior.update(0, 0, initialRain);

  if (state.hero) {
    viewMode = 'exterior';
    setCameraImmediate('exterior');
    ui.setViewUI('exterior');
    renderer.render(scene, camera);
    ui.hideLoader();
    document.body.classList.add('is-ready');
  } else {
    if (state.view === 'interior' || state.view === 'cabinet') {
      viewMode = state.view;
      ui.setViewUI(viewMode);
      setCameraImmediate(viewMode);
    }
    updateHotspots();
    renderer.render(scene, camera);
    ui.setLoaderProgress(1);
    ui.hideLoader();
    document.body.classList.add('is-ready');
  }

  function disposeScene() {
    stopLoop();
    observer.disconnect();
    window.removeEventListener('resize', handleResize);
    const seenMaterials = new Set();
    const seenGeometries = new Set();
    scene.traverse((object) => {
      if (object.geometry && !seenGeometries.has(object.geometry)) {
        seenGeometries.add(object.geometry);
        object.geometry.dispose();
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material || seenMaterials.has(material)) continue;
        seenMaterials.add(material);
        for (const key of ['map', 'roughnessMap', 'normalMap', 'emissiveMap', 'alphaMap']) {
          if (material[key] && material[key].isTexture) material[key].dispose();
        }
        material.dispose();
      }
    });
    if (scene.environment) scene.environment.dispose();
    if (stage.environment && stage.environment !== scene.environment) stage.environment.dispose();
    stage.dispose();
    renderer.forceContextLoss?.();
  }

  window.addEventListener('pagehide', disposeScene, { once: true });

  clock.getDelta();
  rafId = requestAnimationFrame(frame);
}
