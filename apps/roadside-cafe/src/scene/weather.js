import * as THREE from 'three';

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vDirection = normalize(worldPosition.xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uSunIntensity;
  uniform float uTime;
  uniform float uRain;
  varying vec3 vDirection;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    vec3 direction = normalize(vDirection);
    float elevation = direction.y;
    vec3 color = mix(uHorizon, uTop, smoothstep(-0.02, 0.58, elevation));

    /* Slow, soft clouds — more present when it rains. */
    vec2 skyUv = direction.xz / max(0.24, elevation + 0.36);
    float cloudField = noise(skyUv * 1.2 + vec2(uTime * 0.0035, 0.0));
    cloudField += 0.55 * noise(skyUv * 2.6 - vec2(uTime * 0.005, 0.0));
    cloudField = smoothstep(0.42, 0.94, cloudField / 1.55);
    vec3 cloudColor = mix(uHorizon * 1.03, vec3(0.78, 0.82, 0.84), uRain * 0.42);
    color = mix(color, cloudColor, cloudField * (0.18 + uRain * 0.3) * smoothstep(0.02, 0.35, elevation));

    float sunDot = max(dot(direction, normalize(uSunDirection)), 0.0);
    color += uSunColor * pow(sunDot, 1600.0) * 2.2 * uSunIntensity;
    color += uSunColor * pow(sunDot, 64.0) * 0.14 * uSunIntensity;
    color += uSunColor * pow(sunDot, 7.0) * 0.05 * uSunIntensity;

    /* Horizon haze, thicker in rain. */
    float haze = smoothstep(0.2, -0.01, elevation) * (0.08 + uRain * 0.2);
    color = mix(color, uHorizon, haze);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const DAY_COLORS = {
  top: new THREE.Color('#86adbe'),
  horizon: new THREE.Color('#f2e2ca'),
  sun: new THREE.Color('#fff0d2'),
  fog: new THREE.Color('#d9ddd7'),
  hemiSky: new THREE.Color('#d7e6e8'),
  hemiGround: new THREE.Color('#b7a58c')
};

const RAIN_COLORS = {
  top: new THREE.Color('#4f5a5d'),
  horizon: new THREE.Color('#9aa29b'),
  sun: new THREE.Color('#c8d0d0'),
  fog: new THREE.Color('#969d96'),
  hemiSky: new THREE.Color('#8b9697'),
  hemiGround: new THREE.Color('#666157')
};

function createRain() {
  const count = 1900;
  const positions = new Float32Array(count * 2 * 3);
  const velocities = new Float32Array(count);
  const random = (() => {
    let s = 1234567;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  })();

  for (let i = 0; i < count; i += 1) {
    const x = -42 + random() * 84;
    const y = 0.5 + random() * 17;
    const z = -8 + random() * 32;
    const length = 0.22 + random() * 0.5;
    positions[i * 6] = x;
    positions[i * 6 + 1] = y;
    positions[i * 6 + 2] = z;
    positions[i * 6 + 3] = x - 0.045;
    positions[i * 6 + 4] = y - length;
    positions[i * 6 + 5] = z;
    velocities[i] = 10 + random() * 8;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0xcdd9da,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: true
  });
  const rain = new THREE.LineSegments(geometry, material);
  rain.frustumCulled = false;
  rain.visible = false;
  rain.userData = { velocities, count };
  return rain;
}

export function createWeather({ scene, renderer, MAT, exterior, interior, reducedMotion = false }) {
  /* Sky */
  const skyUniforms = {
    uTop: { value: DAY_COLORS.top.clone() },
    uHorizon: { value: DAY_COLORS.horizon.clone() },
    uSunColor: { value: DAY_COLORS.sun.clone() },
    uSunDirection: { value: new THREE.Vector3(-0.65, 0.62, 0.45).normalize() },
    uSunIntensity: { value: 1 },
    uTime: { value: 0 },
    uRain: { value: 0 }
  };
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(280, 40, 24), skyMaterial);
  sky.renderOrder = -2;
  scene.add(sky);

  /* Lights */
  const hemi = new THREE.HemisphereLight(DAY_COLORS.hemiSky, DAY_COLORS.hemiGround, 1.0);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 0.14);
  scene.add(ambient);

  const sunTarget = new THREE.Object3D();
  sunTarget.position.set(0, 1.2, -2.0);
  scene.add(sunTarget);

  const sun = new THREE.DirectionalLight(DAY_COLORS.sun, 2.8);
  sun.target = sunTarget;
  sun.castShadow = true;
  const shadowSize = Math.min(window.innerWidth, window.innerHeight) < 700 ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -20;
  sun.shadow.camera.near = 8;
  sun.shadow.camera.far = 95;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 2.4;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xcfdfe6, 0.22);
  fill.position.set(8, 9, 14);
  scene.add(fill);

  /* Rain */
  const rain = createRain();
  scene.add(rain);

  scene.fog = new THREE.FogExp2(DAY_COLORS.fog.clone(), 0.0062);
  renderer.setClearColor(DAY_COLORS.fog, 1);

  const state = {
    rainTarget: 0,
    rain: 0,
    sunPhase: 0,
    forcedSun: false
  };

  const sunDirection = new THREE.Vector3();
  const tmpColor = new THREE.Color();

  function setWeather(weather, { instant = false } = {}) {
    state.rainTarget = weather === 'rainy' ? 1 : 0;
    if (instant) state.rain = state.rainTarget;
  }

  function update(dt, time, targetRain) {
    state.rainTarget = targetRain;
    const rate = reducedMotion ? 8 : 2.4;
    state.rain += (state.rainTarget - state.rain) * Math.min(1, dt * rate);
    if (Math.abs(state.rain - state.rainTarget) < 0.001) state.rain = state.rainTarget;
    const rainAmount = state.rain;
    const particleDt = Math.min(dt, 0.05);

    /* Sunny light keeps moving; rain flattens and cools it. */
    const phase = state.forcedSun || reducedMotion ? 0.35 : time * 0.07;
    const azimuth = -0.62 + Math.sin(phase) * 0.22;
    const elevation = 0.78 + Math.sin(phase * 0.63 + 0.8) * 0.14;
    sunDirection.set(
      Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      Math.cos(azimuth) * Math.cos(elevation)
    ).normalize();
    skyUniforms.uSunDirection.value.copy(sunDirection);
    sun.position.copy(sunTarget.position).addScaledVector(sunDirection, 46);
    sun.target.updateMatrixWorld();

    const sunIntensity = THREE.MathUtils.lerp(
      2.9 + Math.sin(phase * 0.83) * 0.35,
      0.38,
      rainAmount
    );
    sun.intensity = sunIntensity;
    sun.color.lerpColors(DAY_COLORS.sun, RAIN_COLORS.sun, rainAmount);

    skyUniforms.uTop.value.lerpColors(DAY_COLORS.top, RAIN_COLORS.top, rainAmount);
    skyUniforms.uHorizon.value.lerpColors(DAY_COLORS.horizon, RAIN_COLORS.horizon, rainAmount);
    skyUniforms.uSunColor.value.lerpColors(DAY_COLORS.sun, RAIN_COLORS.sun, rainAmount);
    skyUniforms.uSunIntensity.value = THREE.MathUtils.lerp(1, 0.22, rainAmount);
    skyUniforms.uRain.value = rainAmount;
    skyUniforms.uTime.value = time;

    hemi.color.lerpColors(DAY_COLORS.hemiSky, RAIN_COLORS.hemiSky, rainAmount);
    hemi.groundColor.lerpColors(DAY_COLORS.hemiGround, RAIN_COLORS.hemiGround, rainAmount);
    hemi.intensity = THREE.MathUtils.lerp(0.88, 0.58, rainAmount);
    ambient.intensity = THREE.MathUtils.lerp(0.1, 0.18, rainAmount);
    fill.intensity = THREE.MathUtils.lerp(0.22, 0.1, rainAmount);

    scene.fog.color.lerpColors(DAY_COLORS.fog, RAIN_COLORS.fog, rainAmount);
    scene.fog.density = THREE.MathUtils.lerp(0.0058, 0.009, rainAmount);
    renderer.setClearColor(scene.fog.color, 1);
    renderer.toneMappingExposure = THREE.MathUtils.lerp(1.03, 0.95, rainAmount);
    if ('environmentIntensity' in scene) {
      scene.environmentIntensity = THREE.MathUtils.lerp(0.72, 0.42, rainAmount);
    }

    /* Rain particle field: intensity ebbs and flows. */
    const rainPulse = 0.55 + 0.28 * Math.sin(time * 0.62) + 0.17 * Math.sin(time * 1.73 + 1.2);
    const intensity = Math.max(0.28, Math.min(1, rainPulse));
    rain.visible = rainAmount > 0.02;
    if (rain.visible) {
      const positions = rain.geometry.attributes.position.array;
      const velocities = rain.userData.velocities;
      const count = rain.userData.count;
      const drawCount = Math.floor(count * intensity);
      rain.geometry.setDrawRange(0, drawCount * 2);
      rain.material.opacity = rainAmount * (0.28 + 0.3 * intensity);
      const speedScale = 0.7 + intensity * 0.6;
      for (let i = 0; i < drawCount; i += 1) {
        const idx = i * 6;
        const speed = velocities[i] * speedScale;
        const dy = speed * particleDt;
        positions[idx + 1] -= dy;
        positions[idx + 4] -= dy;
        if (positions[idx + 1] < 0.2) {
          const newY = 12 + Math.random() * 6;
          const length = 0.22 + Math.random() * 0.5;
          positions[idx + 1] = newY;
          positions[idx + 4] = newY - length;
        }
      }
      rain.geometry.attributes.position.needsUpdate = true;
    }

    /* Wet surfaces */
    MAT.asphalt.color.lerpColors(new THREE.Color(0x4e4b45), new THREE.Color(0x373a39), rainAmount);
    MAT.asphalt.roughness = THREE.MathUtils.lerp(0.76, 0.26, rainAmount);
    MAT.asphalt.clearcoat = THREE.MathUtils.lerp(0.08, 0.72, rainAmount);
    MAT.asphalt.envMapIntensity = THREE.MathUtils.lerp(0.4, 1.05, rainAmount);
    for (const puddle of exterior.puddles) {
      puddle.material.opacity = rainAmount * 0.55;
      puddle.visible = rainAmount > 0.02;
    }
    for (const glass of exterior.rainGlass) {
      glass.material.opacity = rainAmount * 0.42;
      glass.visible = rainAmount > 0.02;
    }
    MAT.windowGlow.opacity = THREE.MathUtils.lerp(0.2, 0.46, rainAmount);
    MAT.lampGlow.emissiveIntensity = THREE.MathUtils.lerp(0.8, 1.7, rainAmount);

    return rainAmount;
  }

  return {
    sky,
    sun,
    hemi,
    rain,
    state,
    setWeather,
    update,
    setForcedSun(value = true) {
      state.forcedSun = value;
    }
  };
}
