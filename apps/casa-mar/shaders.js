/* ==========================================================================
   CASA MAR — sky, sea and pool water shaders
   --------------------------------------------------------------------------
   The horizon is the quietest part of the picture, so the sky and sea are
   written as a matched pair: both fade into the same warm haze, and both
   respond to the same sun direction. The pool reuses the sea palette at a
   smaller scale.
   ========================================================================== */

import * as THREE from 'three';

/* --------------------------------------------------------------------------
   Sky dome
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
  uniform vec3 uZenith;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uSunIntensity;
  uniform float uTime;
  uniform float uCloud;

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

    vec3 color = mix(uHorizon, uMid, smoothstep(-0.01, 0.32, elevation));
    color = mix(color, uZenith, smoothstep(0.22, 0.94, elevation));

    /* A small amount of atmospheric structure keeps the gradient alive. */
    vec2 skyUv = direction.xz / max(0.18, elevation + 0.32);
    float cloudField = noise(skyUv * 1.35 + vec2(uTime * 0.004, 0.0));
    cloudField += 0.5 * noise(skyUv * 2.9 - vec2(uTime * 0.006, 0.0));
    cloudField = smoothstep(0.42, 0.86, cloudField / 1.5);
    color = mix(color, uHorizon * 1.03, cloudField * uCloud * smoothstep(0.02, 0.36, elevation));

    /* Sun bloom and a broad horizon glow. */
    float sunDot = max(dot(direction, normalize(uSunDirection)), 0.0);
    color += uSunColor * pow(sunDot, 1600.0) * 2.6 * uSunIntensity;
    color += uSunColor * pow(sunDot, 64.0) * 0.16 * uSunIntensity;
    color += uSunColor * pow(sunDot, 6.0) * 0.05 * uSunIntensity;

    /* Keep the extreme zenith composed rather than bright. */
    color *= 0.96 + 0.04 * smoothstep(0.0, 0.7, elevation);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createSky() {
  const uniforms = {
    uZenith: { value: new THREE.Color('#a9c5d0') },
    uMid: { value: new THREE.Color('#d7e2e3') },
    uHorizon: { value: new THREE.Color('#f0e5d3') },
    uSunColor: { value: new THREE.Color('#fff1d8') },
    uSunDirection: { value: new THREE.Vector3(-0.5, 0.45, 0.3).normalize() },
    uSunIntensity: { value: 1 },
    uTime: { value: 0 },
    uCloud: { value: 0.32 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: true,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 32), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -2;

  return { mesh, uniforms, material };
}

/* --------------------------------------------------------------------------
   Open sea
   -------------------------------------------------------------------------- */

const SEA_VERTEX = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const SEA_FRAGMENT = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uSunIntensity;
  uniform float uTime;

  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vec2 p = vWorldPosition.xz;
    float time = uTime;

    /* Layered directional ripples, sized for a model seen from a distance. */
    vec2 slope = vec2(0.0);
    slope += vec2(cos(p.x * 0.055 + time * 0.35), cos(p.y * 0.047 - time * 0.28)) * 0.055;
    slope += vec2(cos(p.x * 0.16 - p.y * 0.12 + time * 0.7), sin(p.x * 0.11 + p.y * 0.15 - time * 0.55)) * 0.028;
    slope += vec2(sin(p.x * 0.55 + time * 1.3), cos(p.y * 0.48 - time * 1.1)) * 0.007;

    vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - clamp(dot(normal, viewDirection), 0.0, 1.0), 3.4);

    float far = smoothstep(-60.0, -520.0, vWorldPosition.z);
    vec3 water = mix(uShallow, uDeep, 0.28 + 0.72 * far);
    vec3 color = mix(water, uSky, 0.14 + 0.62 * fresnel);

    vec3 sunDirection = normalize(uSunDirection);
    vec3 reflection = reflect(-sunDirection, normal);
    float glitter = pow(max(dot(reflection, viewDirection), 0.0), 420.0);
    float sheen = pow(max(dot(reflection, viewDirection), 0.0), 28.0);
    color += uSunColor * (glitter * 1.6 + sheen * 0.08) * uSunIntensity;

    /* A quiet, broken horizon line rather than a hard edge. */
    float horizon = smoothstep(160.0, 760.0, distance(cameraPosition.xz, vWorldPosition.xz));
    color = mix(color, uSky * 1.015, horizon * 0.9);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createSea() {
  const uniforms = {
    uDeep: { value: new THREE.Color('#28565e') },
    uShallow: { value: new THREE.Color('#5b8f8c') },
    uSky: { value: new THREE.Color('#dfe7e2') },
    uSunColor: { value: new THREE.Color('#fff1d8') },
    uSunDirection: { value: new THREE.Vector3(-0.5, 0.45, 0.3).normalize() },
    uSunIntensity: { value: 1 },
    uTime: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SEA_VERTEX,
    fragmentShader: SEA_FRAGMENT,
    fog: false,
    toneMapped: true,
  });

  const geometry = new THREE.PlaneGeometry(2600, 2600, 1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, -7.3, -620);
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;

  return { mesh, uniforms, material };
}

/* --------------------------------------------------------------------------
   Pool water
   -------------------------------------------------------------------------- */

const POOL_VERTEX = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const POOL_FRAGMENT = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uSky;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uSunIntensity;
  uniform float uTime;

  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vec2 p = vWorldPosition.xz;
    float time = uTime;

    vec2 slope = vec2(0.0);
    slope += vec2(cos(p.x * 1.1 + time * 0.8), cos(p.y * 0.9 - time * 0.7)) * 0.018;
    slope += vec2(sin(p.x * 2.6 - p.y * 1.7 + time * 1.5), cos(p.x * 1.8 + p.y * 2.4 - time * 1.2)) * 0.009;
    slope += vec2(sin(p.x * 6.2 + time * 2.2), cos(p.y * 5.4 - time * 1.9)) * 0.0025;

    vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - clamp(dot(normal, viewDirection), 0.0, 1.0), 3.0);

    /* Slight lightening towards the inner edge reads as shallow water. */
    float edge = smoothstep(0.0, 0.09, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
    vec3 water = mix(uDeep * 1.18, uDeep, edge);
    vec3 color = mix(water, uSky, 0.18 + 0.58 * fresnel);

    vec3 sunDirection = normalize(uSunDirection);
    vec3 reflection = reflect(-sunDirection, normal);
    float glitter = pow(max(dot(reflection, viewDirection), 0.0), 260.0);
    float sheen = pow(max(dot(reflection, viewDirection), 0.0), 18.0);
    color += uSunColor * (glitter * 1.1 + sheen * 0.05) * uSunIntensity;

    gl_FragColor = vec4(color, 0.86);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createPoolWater() {
  const uniforms = {
    uDeep: { value: new THREE.Color('#275b5c') },
    uSky: { value: new THREE.Color('#dfe9e4') },
    uSunColor: { value: new THREE.Color('#fff1d8') },
    uSunDirection: { value: new THREE.Vector3(-0.5, 0.45, 0.3).normalize() },
    uSunIntensity: { value: 1 },
    uTime: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: POOL_VERTEX,
    fragmentShader: POOL_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true,
  });

  const geometry = new THREE.PlaneGeometry(11.54, 13.29, 1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(-14.0, -0.16, -8.575);
  mesh.renderOrder = 4;

  return { mesh, uniforms, material };
}
