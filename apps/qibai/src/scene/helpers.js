import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const Y_AXIS = new THREE.Vector3(0, 1, 0);

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTexture(width, height, draw, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = options.colorSpace === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (options.wrap !== false) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }
  if (options.repeat) texture.repeat.set(options.repeat[0], options.repeat[1]);
  texture.anisotropy = options.anisotropy || 4;
  texture.needsUpdate = true;
  return texture;
}

export function cloneTexture(texture, repeat) {
  const next = texture.clone();
  next.wrapS = THREE.RepeatWrapping;
  next.wrapT = THREE.RepeatWrapping;
  next.repeat.set(repeat[0], repeat[1]);
  next.needsUpdate = true;
  return next;
}

export function box(width, height, depth, material, position = [0, 0, 0], options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  if (options.rotation) mesh.rotation.set(options.rotation[0], options.rotation[1], options.rotation[2]);
  return mesh;
}

export function roundedBox(width, height, depth, radius, material, position = [0, 0, 0], options = {}) {
  const geometry = new RoundedBoxGeometry(width, height, depth, options.segments || 4, radius);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  if (options.rotation) mesh.rotation.set(options.rotation[0], options.rotation[1], options.rotation[2]);
  return mesh;
}

export function cylinder(radiusTop, radiusBottom, height, material, position = [0, 0, 0], options = {}) {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, options.radialSegments || 12, 1, options.openEnded || false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  if (options.rotation) mesh.rotation.set(options.rotation[0], options.rotation[1], options.rotation[2]);
  return mesh;
}

export function plane(width, height, material, position = [0, 0, 0], options = {}) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(options.rotation ? options.rotation[0] : 0, options.rotation ? options.rotation[1] : 0, options.rotation ? options.rotation[2] : 0);
  mesh.castShadow = false;
  mesh.receiveShadow = options.receive === true;
  return mesh;
}

export function groupAt(position = [0, 0, 0]) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  return group;
}

export function addMesh(parent, mesh) {
  parent.add(mesh);
  return mesh;
}

export function markShadows(root, cast = true, receive = true) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = cast;
    object.receiveShadow = receive;
  });
  return root;
}

export function makeBeamBetween(start, end, radiusBottom, radiusTop, material, radialSegments = 7) {
  const startV = new THREE.Vector3().fromArray(start);
  const endV = new THREE.Vector3().fromArray(end);
  const direction = new THREE.Vector3().subVectors(endV, startV);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, radialSegments, 1);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(startV).add(endV).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function addContactShadow(parent, map, position, size, opacity = 0.3, rotationZ = 0) {
  const material = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rotationZ;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.renderOrder = 2;
  parent.add(mesh);
  return mesh;
}

export function makeSeededRng(seed = 1) {
  return mulberry32(seed);
}

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function addEdges(mesh, color = 0x2d2a24, opacity = 0.2, threshold = 25) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, threshold),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  );
  edges.position.copy(mesh.position);
  edges.rotation.copy(mesh.rotation);
  edges.scale.copy(mesh.scale);
  mesh.parent?.add(edges);
  return edges;
}
