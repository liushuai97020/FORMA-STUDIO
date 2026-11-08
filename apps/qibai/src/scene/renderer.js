import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { canvasTexture } from './helpers.js';

function makeEnvironmentTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#8daeb7');
    sky.addColorStop(0.38, '#d8e4df');
    sky.addColorStop(0.55, '#f3e9d8');
    sky.addColorStop(0.66, '#d8c3a6');
    sky.addColorStop(1, '#7c6b58');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const sun = ctx.createRadialGradient(w * 0.7, h * 0.38, 2, w * 0.7, h * 0.38, 170);
    sun.addColorStop(0, 'rgba(255,246,222,.98)');
    sun.addColorStop(0.17, 'rgba(255,232,188,.78)');
    sun.addColorStop(0.5, 'rgba(255,207,144,.26)');
    sun.addColorStop(1, 'rgba(255,196,130,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * w;
      const y = 60 + Math.random() * 180;
      ctx.beginPath();
      ctx.ellipse(x, y, 40 + Math.random() * 120, 7 + Math.random() * 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { wrap: false, anisotropy: 1 });
}

function makeEnvironmentScene() {
  const envScene = new THREE.Scene();
  const texture = makeEnvironmentTexture();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(60, 32, 20),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide })
  );
  sphere.rotation.y = 0.4;
  envScene.add(sphere);

  const lightPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 7),
    new THREE.MeshBasicMaterial({ color: 0xfff3dc })
  );
  lightPanel.position.set(0, 22, -12);
  lightPanel.rotation.x = Math.PI / 2;
  envScene.add(lightPanel);

  const warmPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 6),
    new THREE.MeshBasicMaterial({ color: 0xffb66f })
  );
  warmPanel.position.set(-22, 4, 13);
  warmPanel.rotation.y = Math.PI / 2;
  envScene.add(warmPanel);

  return envScene;
}

export function createStage(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false
  });
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.setClearColor(0xd9e1dc, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = true;
  container.appendChild(renderer.domElement);

  const quality = {
    mobile: window.matchMedia('(max-width: 760px)').matches,
    lowPower: false,
    petalCount: window.matchMedia('(max-width: 760px)').matches ? 160 : 280,
    blossomCount: window.matchMedia('(max-width: 760px)').matches ? 650 : 980
  };
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.mobile ? 1.5 : 1.8));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd9e1dc);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 180);
  camera.position.set(18.5, 9.5, 22);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.78;
  controls.panSpeed = 0.65;
  controls.screenSpacePanning = true;
  controls.minDistance = 4.2;
  controls.maxDistance = 54;
  controls.minPolarAngle = 0.18;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0.5, 3.2, 1.5);
  controls.update();

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader?.();
  const envScene = makeEnvironmentScene();
  const envRT = pmrem.fromScene(envScene, 0.035, 0.1, 100);
  scene.environment = envRT.texture;
  if ('environmentIntensity' in scene) scene.environmentIntensity = 0.8;

  envScene.traverse((object) => {
    if (object.isMesh) {
      object.geometry.dispose();
      object.material.dispose();
    }
  });
  pmrem.dispose();

  function resize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
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
    quality,
    resize,
    dispose() {
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
    }
  };
}
