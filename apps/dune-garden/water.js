// ==========================================================================
// Dune Garden — reflecting pool
//
// A calm sheet of water: analytic ripples bend a gradient sky reflection, with
// fresnel falloff and a dark basin holding the depth of the pool. Shared mood
// uniforms keep the water in step with the sky at dusk.
// ==========================================================================

import * as THREE from 'three';

const POOL_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const POOL_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSkyTop;
  uniform vec3 uSkyHorizon;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uDusk;
  uniform sampler2D uReflection;
  uniform mat4 uTextureMatrix;

  varying vec3 vWorld;

  void main() {
    vec3 toEye = cameraPosition - vWorld;
    float dist = length(toEye);
    vec3 viewDir = toEye / dist;

    vec2 p = vWorld.xz;
    float t = uTime;

    // Ripples as a gradient of a handful of travelling waves.
    vec2 slope = vec2(0.0);
    slope += vec2(0.62, 0.78) * cos(dot(p, vec2(0.62, 0.78)) * 2.2 + t * 0.62) * 0.011;
    slope += vec2(-0.71, 0.52) * cos(dot(p, vec2(-0.71, 0.52)) * 3.6 + t * 0.88) * 0.0075;
    slope += vec2(0.28, -0.96) * cos(dot(p, vec2(0.28, -0.96)) * 6.1 - t * 1.18) * 0.0042;
    slope += vec2(0.94, 0.34) * cos(dot(p, vec2(0.94, 0.34)) * 9.7 + t * 1.55) * 0.0024;
    // Broad, very slow swell.
    slope += vec2(0.4, 0.9) * cos(dot(p, vec2(0.13, 0.21)) + t * 0.22) * 0.0045;

    vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));

    // The mirrored scene, sampled through the projected reflection matrix.
    vec4 projected = uTextureMatrix * vec4(vWorld, 1.0);
    vec2 reflectedUv = projected.xy / max(projected.w, 0.0001);
    reflectedUv += slope * 0.3;
    reflectedUv += vec2(
      sin(t * 0.21 + p.y * 0.4),
      cos(t * 0.17 + p.x * 0.35)
    ) * 0.001;
    reflectedUv = clamp(reflectedUv, vec2(0.003), vec2(0.997));
    vec3 reflectedScene = texture2D(uReflection, reflectedUv).rgb;

    // Reflection direction is still useful for a soft sun glint.
    vec3 reflected = reflect(-viewDir, normal);
    reflected.y = abs(reflected.y) * 0.82 + 0.04;
    reflected = normalize(reflected);
    vec3 sunDir = normalize(uSunDir);
    float sunSpec = max(dot(reflected, sunDir), 0.0);

    float h = clamp(reflected.y, 0.0, 1.0);
    vec3 skyTint = mix(uSkyHorizon, uSkyTop, pow(h, 0.5));
    vec3 reflectedColor = mix(reflectedScene, skyTint, 0.1);
    reflectedColor += uSunColor * pow(sunSpec, 420.0) * 1.6;
    reflectedColor += uSunColor * pow(sunSpec, 26.0) * 0.12;

    // Fresnel — grazing angles turn mirror-like.
    float fresnel = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 2.2);
    float mirror = mix(0.4, 0.97, fresnel);

    // Deep water reads as a dark olive shadow under the courtyard.
    vec3 basin = mix(vec3(0.028, 0.042, 0.036), vec3(0.018, 0.028, 0.026), uDusk);

    vec3 color = mix(basin, reflectedColor, mirror);

    // A faint warm caustic of light at the pool floor edge.
    float edge = smoothstep(0.0, 1.6, 2.2 - abs(vWorld.x) * 0.05);
    color += uSunColor * 0.012 * edge * (0.6 + 0.4 * sin(p.x * 0.8 + p.y * 0.5 + t * 0.4));

    // A soft reflected shadow of the planting along the far edge.
    float farEdge = smoothstep(0.0, 1.2, 1.2 - (vWorld.z * 0.35 + 0.4));
    color = mix(color, vec3(0.1, 0.12, 0.09), farEdge * 0.07);

    // Haze with distance into the scene fog.
    float fog = 1.0 - exp(-pow(uFogDensity * dist, 2.0));
    color = mix(color, uFogColor, clamp(fog, 0.0, 1.0));

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createPool({ width, depth, x = 0, z = 0, y = 0.1, shared }) {
  const geometry = new THREE.PlaneGeometry(width, depth);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: shared.uTime,
      uSkyTop: shared.uSkyTop,
      uSkyHorizon: shared.uSkyHorizon,
      uSunColor: shared.uSunColor,
      uSunDir: shared.uSunDir,
      uFogColor: shared.uFogColor,
      uFogDensity: shared.uFogDensity,
      uDusk: shared.uDusk,
      uReflection: { value: null },
      uTextureMatrix: { value: new THREE.Matrix4() },
    },
    vertexShader: POOL_VERT,
    fragmentShader: POOL_FRAG,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.name = 'reflecting-pool';
  mesh.receiveShadow = false;
  return { mesh, material };
}
