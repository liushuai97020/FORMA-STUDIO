import * as THREE from 'three';
import { LIGHT_MODES } from '../state.js';
import { damp, clamp } from './helpers.js';

const NUMBER_KEYS = [
  'sunIntensity',
  'hemiIntensity',
  'ambient',
  'fogDensity',
  'exposure',
  'star',
  'warm',
  'windowGlow',
  'exteriorLights'
];

const COLOR_KEYS = ['top', 'horizon', 'sun', 'hemiSky', 'hemiGround', 'fog'];

function buildMood(key) {
  const raw = LIGHT_MODES[key];
  const mood = { ...raw, key };
  for (const colorKey of COLOR_KEYS) mood[colorKey] = new THREE.Color(raw[colorKey]);
  mood.sunPosition = new THREE.Vector3().fromArray(raw.sunPosition);
  mood.clouds = key === 'day' ? 0.2 : key === 'dusk' ? 0.13 : 0.04;
  return mood;
}

function cloneMood(mood) {
  const next = { ...mood };
  for (const colorKey of COLOR_KEYS) next[colorKey] = mood[colorKey].clone();
  next.sunPosition = mood.sunPosition.clone();
  return next;
}

export function createLighting({ scene, renderer, sky }) {
  const hemi = new THREE.HemisphereLight(0xb9a9a6, 0x6f5b4b, 0.6);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffb270, 1.95);
  sun.position.set(-26, 14, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -27;
  sun.shadow.camera.right = 27;
  sun.shadow.camera.top = 27;
  sun.shadow.camera.bottom = -27;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.022;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xb8c9d4, 0.2);
  fill.position.set(20, 8, -14);
  scene.add(fill);

  scene.fog = new THREE.FogExp2(0xc8a88f, 0.0062);

  const registry = {
    lights: [],
    exteriorLights: [],
    glowMaterials: [],
    emissiveMaterials: []
  };

  let mode = 'dusk';
  let current = cloneMood(buildMood(mode));
  let target = cloneMood(buildMood(mode));
  let duration = 0;
  let elapsed = 0;

  function apply() {
    sun.color.copy(current.sun);
    sun.intensity = current.sunIntensity;
    sun.position.copy(current.sunPosition);
    sun.target.position.set(0, 0, 0);
    sun.target.updateMatrixWorld();

    hemi.color.copy(current.hemiSky);
    hemi.groundColor.copy(current.hemiGround);
    hemi.intensity = current.hemiIntensity;
    ambient.intensity = current.ambient;
    fill.intensity = 0.18 + current.hemiIntensity * 0.16;

    renderer.toneMappingExposure = current.exposure;
    scene.fog.color.copy(current.fog);
    scene.fog.density = current.fogDensity;

    if (sky) {
      sky.uniforms.uTopColor.value.copy(current.top);
      sky.uniforms.uHorizonColor.value.copy(current.horizon);
      sky.uniforms.uSunColor.value.copy(current.sun);
      sky.uniforms.uSunDirection.value.copy(current.sunPosition).normalize();
      sky.uniforms.uSunStrength.value = 0.62 + current.sunIntensity * 0.18;
      sky.uniforms.uStars.value = current.star;
      sky.uniforms.uClouds.value = current.clouds;
    }

    for (const item of registry.lights) {
      item.light.intensity = item.base * current.warm;
    }
    for (const item of registry.exteriorLights) {
      item.light.intensity = item.base * current.exteriorLights;
    }
    for (const item of registry.glowMaterials) {
      item.material.opacity = clamp(item.base * current.windowGlow, 0, 2);
    }
    for (const item of registry.emissiveMaterials) {
      item.material.emissiveIntensity = item.base * (0.65 + current.windowGlow * 0.55);
    }
  }

  function setMode(nextMode, options = {}) {
    if (!LIGHT_MODES[nextMode]) return;
    mode = nextMode;
    target = cloneMood(buildMood(nextMode));
    if (options.instant) {
      current = cloneMood(target);
      apply();
      duration = 0;
    } else {
      duration = options.duration || 1.25;
      elapsed = 0;
    }
  }

  function update(dt) {
    if (duration > 0) {
      elapsed += dt;
      const progress = clamp(elapsed / duration, 0, 1);
      const rate = 2.4;
      for (const key of NUMBER_KEYS) {
        current[key] = damp(current[key], target[key], rate, dt);
      }
      for (const key of COLOR_KEYS) current[key].lerp(target[key], 1 - Math.exp(-rate * dt));
      current.sunPosition.lerp(target.sunPosition, 1 - Math.exp(-rate * dt));
      current.clouds = damp(current.clouds, target.clouds, rate, dt);
      apply();
      if (progress >= 1) {
        current = cloneMood(target);
        apply();
        duration = 0;
      }
    }
  }

  function registerWarm(options = {}) {
    for (const entry of options.lights || []) {
      const light = entry.light || entry;
      registry.lights.push({ light, base: entry.base ?? light.intensity });
    }
    for (const entry of options.exteriorLights || []) {
      const light = entry.light || entry;
      registry.exteriorLights.push({ light, base: entry.base ?? light.intensity });
    }
    for (const entry of options.glowMaterials || []) {
      const material = entry.material || entry;
      registry.glowMaterials.push({ material, base: entry.base ?? material.opacity });
    }
    for (const entry of options.emissiveMaterials || []) {
      const material = entry.material || entry;
      registry.emissiveMaterials.push({ material, base: entry.base ?? material.emissiveIntensity });
    }
    apply();
  }

  apply();

  return {
    hemi,
    ambient,
    sun,
    fill,
    setMode,
    update,
    registerWarm,
    getMode: () => mode
  };
}
