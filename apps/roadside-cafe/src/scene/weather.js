import * as THREE from 'three';

/* --------------------------------------------------------------------------
   Weather and light: two complete moods.
   Daylight is a soft coastal afternoon. Rain is a blue-violet city night:
   deep sky, amber shopfront, wet streets, volumetric rain and light pooled
   on the pavement. Rain amount also drives the night grade.
   -------------------------------------------------------------------------- */

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
  uniform vec3 uCityColor;
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
    vec3 color = mix(uHorizon, uTop, smoothstep(-0.02, 0.28, elevation));

    /* Slow rain clouds, more present at night. */
    vec2 skyUv = direction.xz / max(0.24, elevation + 0.36);
    float cloudField = noise(skyUv * 1.2 + vec2(uTime * 0.003, 0.0));
    cloudField += 0.55 * noise(skyUv * 2.6 - vec2(uTime * 0.004, 0.0));
    cloudField = smoothstep(0.42, 0.94, cloudField / 1.55);
    vec3 cloudColor = mix(uHorizon * 1.02, vec3(0.16, 0.18, 0.24), uRain * 0.72);
    color = mix(color, cloudColor, cloudField * (0.15 + uRain * 0.38) * smoothstep(0.02, 0.35, elevation));

    /* Moon / sun bloom */
    float sunDot = max(dot(direction, normalize(uSunDirection)), 0.0);
    color += uSunColor * pow(sunDot, 1600.0) * (1.5 - uRain * 1.25) * uSunIntensity;
    color += uSunColor * pow(sunDot, 64.0) * (0.08 - uRain * 0.04) * uSunIntensity;
    color += uSunColor * pow(sunDot, 7.0) * (0.018 + uRain * 0.01) * uSunIntensity;

    /* City glow bulging up from the horizon, plus a violet aurora of neon. */
    float horizonBand = exp(-max(elevation, 0.0) * 17.0);
    color += uCityColor * horizonBand * (0.025 + uRain * 0.055);
    color += vec3(0.045, 0.025, 0.095) * horizonBand * uRain;

    /* Thick rain haze at the horizon. */
    float haze = smoothstep(0.2, -0.01, elevation) * (0.08 + uRain * 0.26);
    color = mix(color, uHorizon, haze);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const DAY_COLORS = {
  top: new THREE.Color('#3c6f9b'),
  horizon: new THREE.Color('#a8c3d1'),
  sun: new THREE.Color('#fff1cd'),
  city: new THREE.Color('#ffd09a'),
  fog: new THREE.Color('#b9c7c5'),
  hemiSky: new THREE.Color('#cfe3e9'),
  hemiGround: new THREE.Color('#a6937d')
};

const NIGHT_COLORS = {
  top: new THREE.Color('#04060f'),
  horizon: new THREE.Color('#1e1e39'),
  sun: new THREE.Color('#a9b9df'),
  city: new THREE.Color('#9170dc'),
  fog: new THREE.Color('#0d1020'),
  hemiSky: new THREE.Color('#1b2740'),
  hemiGround: new THREE.Color('#08070d')
};

/* --------------------------------------------------------------------------
   Rain field
   -------------------------------------------------------------------------- */

function createRain() {
  const count = 2600;
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
    const x = -48 + random() * 96;
    const y = 0.5 + random() * 20;
    const z = -12 + random() * 38;
    const length = 0.35 + random() * 0.9;
    positions[i * 6] = x;
    positions[i * 6 + 1] = y;
    positions[i * 6 + 2] = z;
    positions[i * 6 + 3] = x - 0.055;
    positions[i * 6 + 4] = y - length;
    positions[i * 6 + 5] = z;
    velocities[i] = 13 + random() * 10;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0xb9c9e9,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: true
  });
  const rain = new THREE.LineSegments(geometry, material);
  rain.frustumCulled = false;
  rain.visible = false;
  rain.userData = { velocities, count };
  return rain;
}

/* Splash ripples, drawn as point sprites in a single draw call. */
function createSplashes() {
  const count = 280;
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const random = (() => {
    let s = 99173;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  })();
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = -12 + random() * 29;
    positions[i * 3 + 1] = 0.035;
    positions[i * 3 + 2] = 1.5 + random() * 11.5;
    phases[i] = random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uSize: { value: 44 },
    uColor: { value: new THREE.Color('#aebfe4') }
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: true,
    vertexShader: `
      uniform float uTime;
      uniform float uSize;
      attribute float aPhase;
      varying float vPhase;
      void main() {
        vPhase = fract(uTime * 0.7 + aPhase);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * (0.4 + vPhase) / max(1.0, -mv.z) * 10.0;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying float vPhase;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p) * 2.0;
        float radius = mix(0.12, 0.92, vPhase);
        float ring = smoothstep(radius - 0.16, radius, d) * (1.0 - smoothstep(radius, radius + 0.16, d));
        float alpha = ring * (1.0 - vPhase) * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;
  return { points, uniforms };
}

export function createWeather({ scene, renderer, MAT, exterior, interior, environments, reducedMotion = false }) {
  const skyUniforms = {
    uTop: { value: NIGHT_COLORS.top.clone() },
    uHorizon: { value: NIGHT_COLORS.horizon.clone() },
    uSunColor: { value: NIGHT_COLORS.sun.clone() },
    uCityColor: { value: NIGHT_COLORS.city.clone() },
    uSunDirection: { value: new THREE.Vector3(-0.65, 0.4, 0.35).normalize() },
    uSunIntensity: { value: 1 },
    uTime: { value: 0 },
    uRain: { value: 1 }
  };
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 28), skyMaterial);
  sky.renderOrder = -2;
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(NIGHT_COLORS.hemiSky, NIGHT_COLORS.hemiGround, 0.24);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 0.04);
  scene.add(ambient);

  const sunTarget = new THREE.Object3D();
  sunTarget.position.set(0, 1.0, -2.0);
  scene.add(sunTarget);

  const sun = new THREE.DirectionalLight(NIGHT_COLORS.sun, 0.1);
  sun.target = sunTarget;
  sun.castShadow = true;
  const shadowSize = Math.min(window.innerWidth, window.innerHeight) < 700 ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -24;
  sun.shadow.camera.near = 6;
  sun.shadow.camera.far = 110;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 2.8;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x9fb6dc, 0.16);
  fill.position.set(14, 8, 18);
  scene.add(fill);

  const rain = createRain();
  scene.add(rain);
  const splashes = createSplashes();
  scene.add(splashes.points);

  scene.fog = new THREE.FogExp2(NIGHT_COLORS.fog.clone(), 0.0125);
  renderer.setClearColor(NIGHT_COLORS.fog, 1);

  const state = {
    indoor: false,
    rainTarget: 1,
    rain: 1,
    sunPhase: 0,
    forcedSun: false,
    activeEnv: null
  };

  const sunDirection = new THREE.Vector3();
  const dryAsphalt = new THREE.Color(0x4e4b45);
  const wetAsphalt = new THREE.Color(0x10131b);
  const dryPavement = new THREE.Color(0xffffff);
  const wetPavement = new THREE.Color(0x60646d);

  function setWeather(weather, { instant = false } = {}) {
    state.rainTarget = weather === 'rainy' ? 1 : 0;
    if (instant) state.rain = state.rainTarget;
  }

  function update(dt, time, targetRain) {
    state.rainTarget = targetRain;
    const rate = reducedMotion ? 8 : 2.2;
    state.rain += (state.rainTarget - state.rain) * Math.min(1, dt * rate);
    if (Math.abs(state.rain - state.rainTarget) < 0.001) state.rain = state.rainTarget;
    const rainAmount = state.rain;
    const particleDt = Math.min(dt, 0.05);

    /* Sun/moon arc; at night this is a faint blue moon. */
    const phase = state.forcedSun || reducedMotion ? 0.35 : time * 0.07;
    const azimuth = -0.62 + Math.sin(phase) * 0.22;
    const elevation = 0.72 + Math.sin(phase * 0.63 + 0.8) * 0.14;
    sunDirection.set(
      Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      Math.cos(azimuth) * Math.cos(elevation)
    ).normalize();
    skyUniforms.uSunDirection.value.copy(sunDirection);
    sun.position.copy(sunTarget.position).addScaledVector(sunDirection, 42);
    sun.target.updateMatrixWorld();

    const daySun = 2.7 + Math.sin(phase * 0.83) * 0.28;
    const sunIntensity = THREE.MathUtils.lerp(daySun, 0.08, rainAmount);
    sun.intensity = sunIntensity;
    sun.color.lerpColors(DAY_COLORS.sun, NIGHT_COLORS.sun, rainAmount);

    skyUniforms.uTop.value.lerpColors(DAY_COLORS.top, NIGHT_COLORS.top, rainAmount);
    skyUniforms.uHorizon.value.lerpColors(DAY_COLORS.horizon, NIGHT_COLORS.horizon, rainAmount);
    skyUniforms.uSunColor.value.lerpColors(DAY_COLORS.sun, NIGHT_COLORS.sun, rainAmount);
    skyUniforms.uCityColor.value.lerpColors(DAY_COLORS.city, NIGHT_COLORS.city, rainAmount);
    skyUniforms.uSunIntensity.value = THREE.MathUtils.lerp(1, 0.5, rainAmount);
    skyUniforms.uRain.value = rainAmount;
    skyUniforms.uTime.value = time;

    hemi.color.lerpColors(DAY_COLORS.hemiSky, NIGHT_COLORS.hemiSky, rainAmount);
    hemi.groundColor.lerpColors(DAY_COLORS.hemiGround, NIGHT_COLORS.hemiGround, rainAmount);
    hemi.intensity = THREE.MathUtils.lerp(0.54, 0.28, rainAmount);
    ambient.intensity = THREE.MathUtils.lerp(0.04, 0.055, rainAmount);
    fill.intensity = THREE.MathUtils.lerp(0.18, 0.08, rainAmount);

    scene.fog.color.lerpColors(DAY_COLORS.fog, NIGHT_COLORS.fog, rainAmount);
    scene.fog.density = THREE.MathUtils.lerp(0.0038, 0.0125, rainAmount);
    renderer.setClearColor(scene.fog.color, 1);
    renderer.toneMappingExposure = THREE.MathUtils.lerp(0.9, 1.08, rainAmount);

    const activeEnv = rainAmount > 0.5 ? environments.night : environments.day;
    if (activeEnv !== state.activeEnv) {
      state.activeEnv = activeEnv;
      scene.environment = activeEnv;
    }
    if ('environmentIntensity' in scene) {
      scene.environmentIntensity = THREE.MathUtils.lerp(0.7, 0.34, rainAmount);
    }

    /* Time-varying downpour. */
    const rainPulse = 0.55 + 0.27 * Math.sin(time * 0.62) + 0.18 * Math.sin(time * 1.73 + 1.2);
    const intensity = Math.max(0.3, Math.min(1, rainPulse));
    rain.visible = rainAmount > 0.02;
    if (rain.visible) {
      const positions = rain.geometry.attributes.position.array;
      const velocities = rain.userData.velocities;
      const count = rain.userData.count;
      const drawCount = Math.floor(count * intensity);
      rain.geometry.setDrawRange(0, drawCount * 2);
      rain.material.opacity = rainAmount * (0.32 + 0.26 * intensity);
      const speedScale = 0.8 + intensity * 0.5;
      for (let i = 0; i < drawCount; i += 1) {
        const idx = i * 6;
        const speed = velocities[i] * speedScale;
        const dy = speed * particleDt;
        positions[idx + 1] -= dy;
        positions[idx + 4] -= dy;
        if (positions[idx + 1] < 0.15) {
          const newY = 13 + Math.random() * 8;
          const length = 0.35 + Math.random() * 0.9;
          positions[idx + 1] = newY;
          positions[idx + 4] = newY - length;
        }
      }
      rain.geometry.attributes.position.needsUpdate = true;
    }

    const splashOpacity = rainAmount * (0.24 + intensity * 0.3);
    splashes.points.visible = splashOpacity > 0.01;
    if (state.indoor) {
      rain.visible = false;
      splashes.points.visible = false;
    }
    splashes.uniforms.uTime.value = time;
    splashes.uniforms.uOpacity.value = splashOpacity;

    /* Wet surfaces. */
    MAT.asphalt.color.lerpColors(dryAsphalt, wetAsphalt, rainAmount);
    MAT.asphalt.roughness = THREE.MathUtils.lerp(0.76, 0.13, rainAmount);
    MAT.asphalt.metalness = THREE.MathUtils.lerp(0.02, 0.16, rainAmount);
    MAT.asphalt.clearcoat = THREE.MathUtils.lerp(0.08, 1.0, rainAmount);
    MAT.asphalt.clearcoatRoughness = THREE.MathUtils.lerp(0.6, 0.08, rainAmount);
    MAT.asphalt.envMapIntensity = THREE.MathUtils.lerp(0.4, 1.2, rainAmount);
    MAT.pavement.color.lerpColors(dryPavement, wetPavement, rainAmount);
    MAT.pavement.roughness = THREE.MathUtils.lerp(0.9, 0.3, rainAmount);
    MAT.pavement.envMapIntensity = THREE.MathUtils.lerp(0.28, 0.9, rainAmount);
    for (const puddle of exterior.puddles) {
      puddle.material.opacity = rainAmount * 0.78;
      puddle.visible = rainAmount > 0.02;
    }
    for (const glass of exterior.rainGlass) {
      glass.material.opacity = rainAmount * 0.11;
      glass.visible = rainAmount > 0.02;
    }
    MAT.windowGlow.opacity = THREE.MathUtils.lerp(0.2, 0.82, rainAmount);
    MAT.lampGlow.emissiveIntensity = THREE.MathUtils.lerp(0.9, 2.0, rainAmount);
    MAT.headlight.emissiveIntensity = THREE.MathUtils.lerp(1.0, 2.6, rainAmount);
    MAT.taillight.emissiveIntensity = THREE.MathUtils.lerp(0.6, 1.8, rainAmount);

    /* Neon signage brightness is independent material-wise, but glow sprites
       and light pools are scaled by this multiplier. */
    for (const sprite of exterior.glowSprites || []) {
      sprite.material.opacity = THREE.MathUtils.lerp(0.12, sprite.userData.baseOpacity ?? 0.55, rainAmount);
    }
    for (const pool of exterior.lightPools || []) {
      pool.material.opacity = THREE.MathUtils.lerp(0.08, pool.userData.baseOpacity ?? 0.4, rainAmount);
    }
    for (const reflection of exterior.reflections || []) {
      reflection.material.opacity = rainAmount * (reflection.userData.baseOpacity ?? 0.6);
      reflection.visible = rainAmount > 0.02;
    }

    return rainAmount;
  }

  return {
    sky,
    sun,
    hemi,
    rain,
    splashes,
    state,
    setWeather,
    setIndoor(value) {
      state.indoor = value;
      if (value) {
        rain.visible = false;
        splashes.points.visible = false;
      }
    },
    update,
    setForcedSun(value = true) {
      state.forcedSun = value;
    }
  };
}











