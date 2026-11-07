// ==========================================================================
// Linea Sofa — hand-rolled orbit
//
// Damped pointer orbit with a limited elevation, a little release inertia and
// a slow idle drift. The camera framing (distance, target, home angles) is
// computed by main.js from the furniture bounds and passed in, so the same
// controller works in landscape, portrait and cover mode.
// ==========================================================================

import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

export function createOrbit({ camera, dom, reducedMotion = false, cover = false, onInteract }) {
  const state = {
    target: new THREE.Vector3(),
    az: 0,
    el: 0.28,
    radius: 7,
    targetAz: 0,
    targetEl: 0.28,
    targetRadius: 7,
    homeAz: 0,
    homeEl: 0.28,
    homeRadius: 7,
    homeTarget: new THREE.Vector3(),

    velAz: 0,
    velEl: 0,
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    lastDx: 0,
    lastDy: 0,
    lastInteraction: typeof performance !== 'undefined' ? performance.now() : 0,
    intro: 1,
    introAz: 0,
    introEl: 0.28,
    introRadius: 7,

    driftPhase: 0,
    driftRamp: 0,
    hasFraming: false,
  };

  const minElevation = 0.09;
  const maxElevation = 0.62;

  function writeCamera(az, el, radius) {
    const cosEl = Math.cos(el);
    camera.position.set(
      state.target.x + Math.sin(az) * cosEl * radius,
      state.target.y + Math.sin(el) * radius,
      state.target.z + Math.cos(az) * cosEl * radius,
    );
    camera.lookAt(state.target);
  }

  function setFraming(framing, { immediate = false } = {}) {
    const first = !state.hasFraming;
    const previousAz = state.homeAz;
    const previousEl = state.homeEl;

    state.homeAz = framing.az;
    state.homeEl = framing.el;
    state.homeRadius = framing.radius;
    state.homeTarget.copy(framing.target);
    state.target.copy(framing.target);
    state.hasFraming = true;

    if (immediate || first) {
      state.az = framing.az;
      state.el = framing.el;
      state.radius = framing.radius;
      state.targetAz = framing.az;
      state.targetEl = framing.el;
      state.targetRadius = framing.radius;
      state.velAz = 0;
      state.velEl = 0;
      writeCamera(state.az, state.el, state.radius);
      return;
    }

    // Keep whatever angle the visitor had chosen, rebased onto the new framing.
    const azOffset = state.targetAz - previousAz;
    const elOffset = state.targetEl - previousEl;
    state.targetAz = framing.az + azOffset;
    state.targetEl = clamp(framing.el + elOffset, minElevation, maxElevation);
    state.targetRadius = framing.radius;
  }

  function startIntro() {
    if (cover || reducedMotion) {
      state.intro = 1;
      state.az = state.homeAz;
      state.el = state.homeEl;
      state.radius = state.homeRadius;
      state.targetAz = state.homeAz;
      state.targetEl = state.homeEl;
      state.targetRadius = state.homeRadius;
      writeCamera(state.az, state.el, state.radius);
      return;
    }
    state.intro = 0;
    state.introAz = state.homeAz - 0.2;
    state.introEl = state.homeEl + 0.06;
    state.introRadius = state.homeRadius * 1.045;
    state.az = state.introAz;
    state.el = state.introEl;
    state.radius = state.introRadius;
    state.targetAz = state.homeAz;
    state.targetEl = state.homeEl;
    state.targetRadius = state.homeRadius;
    writeCamera(state.az, state.el, state.radius);
  }

  /* ------------------------------------------------------------- pointers */

  function onPointerDown(event) {
    if (cover) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (state.dragging) return;
    state.dragging = true;
    state.pointerId = event.pointerId;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    state.lastDx = 0;
    state.lastDy = 0;
    state.velAz = 0;
    state.velEl = 0;
    state.lastInteraction = performance.now();
    dom.classList.add('is-dragging');
    dom.setPointerCapture?.(event.pointerId);
    if (onInteract) onInteract('down');
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!state.dragging || event.pointerId !== state.pointerId) return;
    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    if (dx === 0 && dy === 0) return;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    state.lastDx = dx;
    state.lastDy = dy;

    const speed = 0.0046;
    state.targetAz -= dx * speed;
    state.targetEl = clamp(state.targetEl - dy * speed * 0.72, minElevation, maxElevation);
    state.lastInteraction = performance.now();
    event.preventDefault();
  }

  function endDrag() {
    if (!state.dragging) return;
    state.dragging = false;
    dom.classList.remove('is-dragging');
    if (state.pointerId !== null) {
      try {
        dom.releasePointerCapture?.(state.pointerId);
      } catch (error) {
        /* pointer capture may already be gone */
      }
    }
    state.pointerId = null;
    state.velAz = clamp(-state.lastDx * 0.0046 * 26, -1.1, 1.1);
    state.velEl = clamp(-state.lastDy * 0.0046 * 0.72 * 26, -0.45, 0.45);
    state.lastInteraction = performance.now();
    if (onInteract) onInteract('up');
  }

  function onPointerUp(event) {
    if (!state.dragging || event.pointerId !== state.pointerId) return;
    endDrag();
  }

  function onPointerCancel() {
    endDrag();
  }

  function onPointerLeave(event) {
    if (state.dragging && event.pointerId === state.pointerId && !dom.hasPointerCapture?.(event.pointerId)) {
      endDrag();
    }
  }

  if (!cover) {
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerCancel);
    dom.addEventListener('pointerleave', onPointerLeave);
  }

  /* ---------------------------------------------------------------- frame */

  function update(dt) {
    const step = Math.min(Math.max(dt, 0.0001), 0.05);

    if (state.intro < 1) {
      state.intro = Math.min(1, state.intro + step / 1.5);
      const eased = easeOutCubic(state.intro);
      state.az = THREE.MathUtils.lerp(state.introAz, state.homeAz, eased);
      state.el = THREE.MathUtils.lerp(state.introEl, state.homeEl, eased);
      state.radius = THREE.MathUtils.lerp(state.introRadius, state.homeRadius, eased);
      state.targetAz = state.az;
      state.targetEl = state.el;
      state.targetRadius = state.radius;
      writeCamera(state.az, state.el, state.radius);
      return;
    }

    if (cover) {
      writeCamera(state.homeAz, state.homeEl, state.homeRadius);
      return;
    }

    const now = performance.now();
    const idle = !state.dragging && now - state.lastInteraction > 2600;

    if (!state.dragging) {
      state.targetAz += state.velAz * step;
      state.targetEl = clamp(state.targetEl + state.velEl * step, minElevation, maxElevation);
      state.velAz *= Math.exp(-3.1 * step);
      state.velEl *= Math.exp(-3.1 * step);
    }

    const driftGoal = idle && !reducedMotion ? 1 : 0;
    state.driftRamp += (driftGoal - state.driftRamp) * (1 - Math.exp(-1.3 * step));
    state.driftPhase += step * 0.16;

    const damping = 1 - Math.exp(-8.5 * step);
    state.az += (state.targetAz - state.az) * damping;
    state.el += (state.targetEl - state.el) * damping;
    state.radius += (state.targetRadius - state.radius) * damping;

    const driftAz = Math.sin(state.driftPhase) * 0.03 * state.driftRamp;
    const driftEl = Math.sin(state.driftPhase * 0.72 + 1.4) * 0.012 * state.driftRamp;
    const az = state.az + driftAz;
    const el = clamp(state.el + driftEl, minElevation, maxElevation);
    writeCamera(az, el, state.radius);
  }

  function dispose() {
    if (!cover) {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointercancel', onPointerCancel);
      dom.removeEventListener('pointerleave', onPointerLeave);
    }
    dom.classList.remove('is-dragging');
  }

  return {
    setFraming,
    startIntro,
    update,
    dispose,
    state,
  };
}
