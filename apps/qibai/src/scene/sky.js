import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vDirection = normalize(worldPosition.xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec3 vDirection;

  uniform vec3 uTopColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uSunStrength;
  uniform float uStars;
  uniform float uTime;
  uniform float uClouds;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise2(p);
      p = p * 2.02 + 19.1;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 dir = normalize(vDirection);
    float height = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    float horizonMix = smoothstep(0.44, 0.78, height);
    vec3 sky = mix(uHorizonColor, uTopColor, horizonMix);

    float sunDot = max(dot(dir, normalize(uSunDirection)), 0.0);
    float sunDisc = smoothstep(0.9985, 0.9997, sunDot);
    float sunGlow = pow(sunDot, 8.0) * 0.22 + pow(sunDot, 64.0) * 0.28;
    sky += uSunColor * (sunDisc * 1.2 + sunGlow) * uSunStrength;

    float lowHaze = smoothstep(0.5, 0.18, height) * (1.0 - smoothstep(0.18, 0.42, height));
    sky = mix(sky, uHorizonColor * 1.04, lowHaze * 0.24);

    if (uClouds > 0.001 && dir.y > 0.02) {
      vec2 cloudUv = dir.xz / (dir.y + 0.45);
      float cloud = fbm(cloudUv * 1.1 + vec2(uTime * 0.004, 0.0));
      cloud = smoothstep(0.52, 0.76, cloud) * uClouds;
      sky = mix(sky, mix(uHorizonColor, vec3(1.0), 0.55), cloud * 0.32);
    }

    if (uStars > 0.001 && dir.y > 0.02) {
      vec3 grid = floor(dir * 330.0);
      float star = hash31(grid);
      float stars = smoothstep(0.992, 1.0, star) * smoothstep(0.0, 0.24, dir.y);
      stars *= 0.55 + 0.45 * sin(uTime * 1.7 + star * 38.0);
      sky += vec3(0.78, 0.84, 0.92) * stars * (uStars * 1.8);
    }

    float dither = (hash21(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(sky + dither, 1.0);
  }
`;

export function createSky(scene) {
  const uniforms = {
    uTopColor: { value: new THREE.Color('#64708a') },
    uHorizonColor: { value: new THREE.Color('#e8aa76') },
    uSunColor: { value: new THREE.Color('#ffb270') },
    uSunDirection: { value: new THREE.Vector3(-0.55, 0.36, 0.74).normalize() },
    uSunStrength: { value: 1.0 },
    uStars: { value: 0.08 },
    uTime: { value: 0 },
    uClouds: { value: 0.12 }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(92, 48, 28), material);
  mesh.name = 'sky';
  mesh.renderOrder = -10;
  scene.add(mesh);

  return {
    mesh,
    uniforms,
    update(time) {
      uniforms.uTime.value = time;
    }
  };
}

