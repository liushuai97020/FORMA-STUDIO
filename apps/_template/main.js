/**
 * FORMA exhibit template — Chinese-first, light, minimal.
 *
 * Native JavaScript + Three.js. Replace the scene below with your own.
 * `?cover=1` hides the overlay and holds a clean 3/4 composition for covers.
 */
import '@fontsource-variable/archivo/index.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/jetbrains-mono/400.css';
import * as THREE from 'three';

if (new URLSearchParams(window.location.search).has('cover')) {
  document.body.classList.add('is-cover');
}

const ACCENT = new THREE.Color('#b8653f');
const BACKGROUND = new THREE.Color('#f2ece3');

const canvas = document.querySelector('#scene');
const stage = document.querySelector('.stage');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
camera.position.set(0, 0.8, 6.2);

scene.add(new THREE.HemisphereLight('#fff9ee', '#dcc9b4', 1.4));
const key = new THREE.DirectionalLight('#fff3df', 3.2);
key.position.set(3, 5, 4);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key);
const accentLight = new THREE.PointLight(ACCENT, 20, 14);
accentLight.position.set(-3, 1.5, 3);
scene.add(accentLight);

const group = new THREE.Group();
group.position.y = -0.2;
scene.add(group);

const geometry = new THREE.IcosahedronGeometry(1.55, 12);
const material = new THREE.MeshStandardMaterial({
  color: '#f7f1e8',
  roughness: 0.42,
  metalness: 0.12,
});
const sculpture = new THREE.Mesh(geometry, material);
sculpture.castShadow = true;
sculpture.receiveShadow = true;
group.add(sculpture);

const plinth = new THREE.Mesh(
  new THREE.CylinderGeometry(1.9, 1.9, 0.28, 64),
  new THREE.MeshStandardMaterial({ color: '#d8c7ae', roughness: 0.9 }),
);
plinth.position.y = -1.65;
plinth.receiveShadow = true;
group.add(plinth);

const pointer = { x: 0, y: 0 };
const smooth = { x: 0, y: 0 };
let dragging = false;
let lastX = 0;
let yaw = 0;

window.addEventListener('pointermove', (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  if (dragging) {
    yaw += (event.clientX - lastX) * 0.006;
    lastX = event.clientX;
  }
}, { passive: true });
window.addEventListener('pointerdown', (event) => {
  dragging = true;
  lastX = event.clientX;
  document.body.style.cursor = 'grabbing';
});
window.addEventListener('pointerup', () => {
  dragging = false;
  document.body.style.cursor = '';
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function resize() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.position.z = width < 760 ? 7.4 : 6.2;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

let visible = true;
document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  if (!visible) return;
  const time = reducedMotion ? 0.4 : clock.getElapsedTime();
  smooth.x += (pointer.x - smooth.x) * 0.04;
  smooth.y += (pointer.y - smooth.y) * 0.04;
  group.rotation.y = (reducedMotion ? 0 : time * 0.12) + yaw + smooth.x * 0.35;
  group.rotation.x = -smooth.y * 0.2;
  camera.position.y = 0.8 + Math.sin(time * 0.25) * 0.08;
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}
tick();

window.addEventListener('pagehide', () => {
  geometry.dispose();
  material.dispose();
  plinth.geometry.dispose();
  plinth.material.dispose();
  renderer.dispose();
});
