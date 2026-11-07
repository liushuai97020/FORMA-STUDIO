/* ==========================================================================
   CASA MAR — camera framing
   --------------------------------------------------------------------------
   One shared camera model for every viewport. The orbit is expressed as an
   azimuth and a limited polar angle around a target just above the pool, and
   the distance is solved so the house, the pool and the roof always fit the
   frame with a generous margin. Portrait crops towards the west wing and the
   infinity edge, keeping the composition architectural rather than distant.
   ========================================================================== */

import * as THREE from 'three';

const LANDSCAPE_FOCUS = {
  x0: -21.0,
  x1: 15.0,
  z0: -16.6,
  z1: 2.6,
  y0: -0.2,
  y1: 8.0,
};

const PORTRAIT_FOCUS = {
  x0: -9.0,
  x1: 7.0,
  z0: -16.6,
  z1: 1.0,
  y0: -0.2,
  y1: 8.0,
};

function focusCorners(box) {
  const points = [];
  for (const x of [box.x0, box.x1]) {
    for (const y of [box.y0, box.y1]) {
      for (const z of [box.z0, box.z1]) {
        points.push(new THREE.Vector3(x, y, z));
      }
    }
  }
  return points;
}

function fitDistance(points, target, azimuth, polar, fov, aspect, margin) {
  const direction = new THREE.Vector3(
    Math.sin(azimuth) * Math.cos(polar),
    Math.sin(polar),
    Math.cos(azimuth) * Math.cos(polar),
  );
  const forward = direction.clone().negate();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov) / 2) * margin;
  const tanH = tanV * aspect;
  const relative = new THREE.Vector3();
  let distance = 0;

  for (const point of points) {
    relative.copy(point).sub(target);
    const x = relative.dot(right);
    const y = relative.dot(up);
    const along = relative.dot(direction);
    distance = Math.max(
      distance,
      along + Math.abs(x) / tanH,
      along + Math.abs(y) / tanV,
    );
  }

  return distance + 0.8;
}

export function getView(aspect, { cover = false } = {}) {
  const portrait = aspect < 0.82;
  const shortLandscape = aspect > 1.9;

  const fov = portrait ? 60 : shortLandscape ? 32 : 30;
  const azimuth = portrait ? -0.82 : -0.68;
  const polar = portrait ? 0.2 : 0.17;
  const target = new THREE.Vector3(portrait ? -1.0 : -2.5, portrait ? 2.6 : 2.2, portrait ? -6.0 : -5.0);

  const focus = portrait ? PORTRAIT_FOCUS : LANDSCAPE_FOCUS;
  const points = focusCorners(focus);
  const distance = fitDistance(points, target, azimuth, polar, fov, aspect, portrait ? 0.92 : 1.08);

  return {
    fov,
    azimuth,
    polar,
    target,
    distance,
    cover,
    portrait,
  };
}

export const ORBIT_LIMITS = {
  polarMin: 0.085,
  polarMax: 0.62,
  azimuth: 1.5,
};
