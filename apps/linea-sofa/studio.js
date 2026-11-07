// ==========================================================================
// Linea Sofa — the studio
//
// A seamless warm plaster room: floor, back wall, a soft afternoon pool of
// light, a procedural environment for reflections, and a physically-inspired
// light rig with one soft shadow caster.
// ==========================================================================

import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {
  createEnvironmentTexture,
  createLightPoolMap,
  createPlasterMaps,
  disposeTextures,
} from './textures.js';

function makeJointShadowTexture() {
  const width = 16;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(0.65, 'rgba(255, 255, 255, 0.06)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.32)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createStudio(renderer) {
  RectAreaLightUniformsLib.init();

  const textures = [];
  const group = new THREE.Group();
  group.name = 'studio';

  /* ---------------------------------------------------------- environment */

  const environmentSource = createEnvironmentTexture(renderer);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentTarget = pmrem.fromEquirectangular(environmentSource);
  environmentSource.dispose();
  pmrem.dispose();

  /* ------------------------------------------------------------ materials */

  const floorMaps = createPlasterMaps(renderer, { variant: 'floor', size: 512 });
  const wallMaps = createPlasterMaps(renderer, { variant: 'wall', size: 512 });
  textures.push(floorMaps.map, floorMaps.bumpMap, wallMaps.map, wallMaps.bumpMap);

  const floorMaterial = new THREE.MeshStandardMaterial({
    map: floorMaps.map,
    bumpMap: floorMaps.bumpMap,
    bumpScale: 0.01,
    color: 0xfaf3e8,
    roughness: 0.97,
    metalness: 0,
    envMapIntensity: 0.16,
  });

  const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallMaps.map,
    bumpMap: wallMaps.bumpMap,
    bumpScale: 0.006,
    color: 0xf9f2e7,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.1,
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(32, 13), wallMaterial);
  wall.position.set(0, 6.5, -6);
  wall.receiveShadow = true;
  group.add(wall);

  const jointShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 0.9),
    new THREE.MeshBasicMaterial({
      transparent: true,
      map: makeJointShadowTexture(),
      color: 0x6f5c48,
      opacity: 0.5,
      depthWrite: false,
    }),
  );
  jointShadow.position.set(0, 0.45, -5.995);
  group.add(jointShadow);

  /* ------------------------------------------------------------- light pool */

  const poolMap = createLightPoolMap(renderer);
  const poolTexture = poolMap;
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(8.2, 5.6),
    new THREE.MeshBasicMaterial({
      map: poolMap,
      transparent: true,
      blending: THREE.AdditiveBlending,
      color: 0xffe7c8,
      opacity: 0.07,
      depthWrite: false,
      toneMapped: true,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.rotation.z = -0.38;
  pool.position.set(2.7, 0.006, 0.7);
  pool.renderOrder = 1;
  group.add(pool);

  const wallPool = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 6.4),
    new THREE.MeshBasicMaterial({
      map: poolMap,
      transparent: true,
      blending: THREE.AdditiveBlending,
      color: 0xffe9cf,
      opacity: 0.045,
      depthWrite: false,
    }),
  );
  wallPool.position.set(2.7, 3.1, -5.985);
  group.add(wallPool);

  /* ------------------------------------------------------------- lighting */

  const hemisphere = new THREE.HemisphereLight(0xfff6e8, 0xc9b49d, 0.32);
  group.add(hemisphere);

  const ambient = new THREE.AmbientLight(0xfff4e8, 0.06);
  group.add(ambient);

  const key = new THREE.DirectionalLight(0xfff0da, 1.75);
  key.position.set(-4.6, 6.8, 5.2);
  key.target.position.set(-0.2, 0.35, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -6;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 24;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.022;
  key.shadow.radius = 16;
  key.shadow.blurSamples = 24;
  group.add(key);
  group.add(key.target);

  const fill = new THREE.DirectionalLight(0xf2e7d8, 0.3);
  fill.position.set(5.6, 3.2, 4.6);
  fill.target.position.set(0.5, 0.4, 0);
  group.add(fill);
  group.add(fill.target);

  const rim = new THREE.DirectionalLight(0xffe6c4, 1.0);
  rim.position.set(2.6, 4.6, -6.4);
  rim.target.position.set(0.3, 0.6, 0);
  group.add(rim);
  group.add(rim.target);

  const windowLight = new THREE.RectAreaLight(0xfff1dd, 3.2, 4.6, 2.2);
  windowLight.position.set(0.8, 3.5, 2.7);
  windowLight.lookAt(0.2, 0.35, 0);
  group.add(windowLight);

  const wallGlow = new THREE.SpotLight(0xffeed6, 50, 30, 0.62, 1, 2);
  wallGlow.position.set(5.2, 7.0, 5.0);
  wallGlow.target.position.set(1.8, 1.2, -5.6);
  group.add(wallGlow);
  group.add(wallGlow.target);

  /* --------------------------------------------------------------- return */

  function dispose() {
    floor.geometry.dispose();
    wall.geometry.dispose();
    jointShadow.geometry.dispose();
    pool.geometry.dispose();
    wallPool.geometry.dispose();
    floorMaterial.dispose();
    wallMaterial.dispose();
    jointShadow.material.map.dispose();
    jointShadow.material.dispose();
    pool.material.dispose();
    wallPool.material.dispose();
    environmentTarget.dispose();
    poolTexture.dispose();
    disposeTextures(textures);
  }

  return {
    group,
    environment: environmentTarget.texture,
    dispose,
  };
}
