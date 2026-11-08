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
  controls.rotateSpeed = 0.46;
  controls.zoomSpeed = 0.68;
  controls.enablePan = false;
  controls.minDistance = 18;
  controls.maxDistance = 58;
  controls.minPolarAngle = 0.48;
  controls.maxPolarAngle = 1.23;
  controls.minAzimuthAngle = -0.95;
  controls.maxAzimuthAngle = 0.95;
  controls.target.set(0.2, 0.6, -1.6);
  controls.update();

  const environmentDay = createEnvironmentMap(renderer, 'day');
  const environmentNight = createEnvironmentMap(renderer, 'night');
  const environment = environmentNight;
  scene.environment = environment;
  if ('environmentIntensity' in scene) scene.environmentIntensity = 0.36;

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
    environments: { day: environmentDay, night: environmentNight },
    resize,
    dispose() {
      observer.disconnect();
      controls.dispose();
      environmentDay.dispose();
      environmentNight.dispose();
      renderer.dispose();
    }
  };
}

