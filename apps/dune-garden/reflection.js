// ==========================================================================
// Dune Garden — planar pool reflection
//
// The shallow pool is a real mirror: once per frame the scene is rendered from
// a virtual camera placed below the water plane (with an oblique near plane so
// only geometry above the water is reflected), and the water shader samples
// that buffer through the projected world position, distorted by ripples.
// ==========================================================================

import * as THREE from 'three';
import { POOL } from './layout.js';

export function createReflection({ scene, camera, renderer, water, sea }) {
  const waterY = POOL.waterY;

  const renderTarget = new THREE.WebGLRenderTarget(1024, 640, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
  });

  const virtualCamera = new THREE.PerspectiveCamera();
  const textureMatrix = new THREE.Matrix4();

  const uniforms = water.material.uniforms;
  uniforms.uReflection.value = renderTarget.texture;
  uniforms.uTextureMatrix.value = textureMatrix;

  const reflectorPlane = new THREE.Plane();
  const normal = new THREE.Vector3(0, 1, 0);
  const reflectorWorldPosition = new THREE.Vector3(0, waterY, 0);
  const cameraWorldPosition = new THREE.Vector3();
  const rotationMatrix = new THREE.Matrix4();
  const lookAtPosition = new THREE.Vector3();
  const clipPlane = new THREE.Vector4();
  const view = new THREE.Vector3();
  const target = new THREE.Vector3();
  const q = new THREE.Vector4();
  const size = new THREE.Vector2();

  function setSize() {
    const pixelRatio = renderer.getPixelRatio();
    renderer.getSize(size);
    const width = Math.max(320, Math.floor(size.x * pixelRatio * 0.7));
    const height = Math.max(240, Math.floor(size.y * pixelRatio * 0.7));
    renderTarget.setSize(width, height);
  }
  setSize();

  function update() {
    if (!water.mesh.visible) return;

    cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);

    view.subVectors(reflectorWorldPosition, cameraWorldPosition);
    if (view.dot(normal) > 0) return; // camera below the water line

    view.reflect(normal).negate();
    view.add(reflectorWorldPosition);

    rotationMatrix.extractRotation(camera.matrixWorld);
    lookAtPosition.set(0, 0, -1).applyMatrix4(rotationMatrix).add(cameraWorldPosition);

    target.subVectors(reflectorWorldPosition, lookAtPosition);
    target.reflect(normal).negate();
    target.add(reflectorWorldPosition);

    virtualCamera.position.copy(view);
    virtualCamera.up.set(0, 1, 0).applyMatrix4(rotationMatrix);
    virtualCamera.up.reflect(normal);
    virtualCamera.lookAt(target);
    virtualCamera.far = camera.far;
    virtualCamera.updateMatrixWorld();
    virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

    textureMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0,
    );
    textureMatrix.multiply(virtualCamera.projectionMatrix);
    textureMatrix.multiply(virtualCamera.matrixWorldInverse);

    // Oblique near plane so nothing below the water is mirrored into the pool.
    reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition);
    reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse);
    clipPlane.set(
      reflectorPlane.normal.x,
      reflectorPlane.normal.y,
      reflectorPlane.normal.z,
      reflectorPlane.constant,
    );

    const projectionMatrix = virtualCamera.projectionMatrix;
    q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
    q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
    q.z = -1.0;
    q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];
    clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));

    projectionMatrix.elements[2] = clipPlane.x;
    projectionMatrix.elements[6] = clipPlane.y;
    projectionMatrix.elements[10] = clipPlane.z + 1.0 - 0.003;
    projectionMatrix.elements[14] = clipPlane.w;

    const currentRenderTarget = renderer.getRenderTarget();
    const currentXr = renderer.xr.enabled;
    const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

    water.mesh.visible = false;
    if (sea) sea.visible = false;

    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(renderTarget);
    renderer.state.buffers.depth.setMask(true);
    if (renderer.autoClear === false) renderer.clear();
    renderer.render(scene, virtualCamera);
    renderer.setRenderTarget(currentRenderTarget);

    renderer.xr.enabled = currentXr;
    renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

    water.mesh.visible = true;
    if (sea) sea.visible = true;
  }

  return {
    renderTarget,
    update,
    setSize,
    dispose() {
      renderTarget.dispose();
    },
  };
}
