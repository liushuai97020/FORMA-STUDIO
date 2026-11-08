import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createEnvironmentMap } from './materials.js';

export function createStage(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false
  });
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.08, 260);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.52;
  controls.zoomSpeed = 0.7;
  controls.enablePan = false;
  controls.minDistance = 10;
  controls.maxDistance = 36;
  controls.minPolarAngle = 0.85;
  controls.maxPolarAngle = 1.42;
  controls.minAzimuthAngle = -0.82;
  controls.maxAzimuthAngle = 0.82;
  controls.target.set(0.2, 2.9, 0.1);
  controls.update();

  const environment = createEnvironmentMap(renderer);
  scene.environment = environment;
  if ('environmentIntensity' in scene) scene.environmentIntensity = 0.78;

  function resize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  return {
    renderer,
    scene,
    camera,
    controls,
    environment,
    resize,
    dispose() {
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
    }
  };
}
