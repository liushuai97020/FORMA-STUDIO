import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/* A final sRGB grade: cold violet shadows, warm highlights, vignette and film
   grain. Rainy-night bloom is what gives the storefront its cinematic halo. */

const CinematicGrade = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uNight: { value: 0 },
    uVignette: { value: 0.32 },
    uGrain: { value: 0.026 },
    uResolution: { value: new THREE.Vector2(1, 1) }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uNight;
    uniform float uVignette;
    uniform float uGrain;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 center = uv - 0.5;

      /* Very subtle lens separation, only at the edges. */
      float aberration = 0.0007 + uNight * 0.0011;
      vec3 color;
      color.r = texture2D(tDiffuse, uv + center * aberration).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, uv - center * aberration).b;

      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));

      /* Split-tone: lifted blue-violet shadows, warm smoky highlights. */
      vec3 shadowTint = vec3(0.025, 0.018, 0.075);
      vec3 highlightTint = vec3(0.055, 0.02, -0.012);
      color += shadowTint * (1.0 - smoothstep(0.02, 0.5, luma)) * uNight;
      color += highlightTint * smoothstep(0.5, 1.0, luma) * uNight;

      /* Gentle contrast and night desaturation. */
      color = (color - 0.5) * (1.025 + uNight * 0.045) + 0.5;
      float grey = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(grey), color, 1.0 - uNight * 0.12);
      color = clamp(color, 0.0, 1.0);

      /* Vignette */
      float radius = length(center * vec2(1.15, 1.0));
      float vig = 1.0 - smoothstep(0.24, 0.78, radius);
      color *= mix(1.0 - uVignette, 1.0, vig);

      /* Film grain */
      float grain = hash(floor(uv * uResolution) + fract(uTime) * 19.7) - 0.5;
      color += grain * uGrain;

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export function createPostFX({ renderer, scene, camera, mobile = false }) {
  const enabled = !mobile && renderer.capabilities?.isWebGL2 !== false;

  if (!enabled) {
    return {
      enabled: false,
      render() {
        renderer.render(scene, camera);
      },
      setSize() {},
      setNight() {},
      setTime() {},
      dispose() {}
    };
  }

  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(size.x, size.y);

  const renderPass = new RenderPass(scene, camera);
  const ssao = new SSAOPass(scene, camera, size.x, size.y);
  ssao.kernelRadius = 0.45;
  ssao.minDistance = 0.0005;
  ssao.maxDistance = 0.055;
  ssao.output = SSAOPass.OUTPUT.Default;
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.9, 0.68, 0.72);
  const smaa = new SMAAPass();
  const output = new OutputPass();
  const grade = new ShaderPass(CinematicGrade);
  grade.material.depthTest = false;
  grade.material.depthWrite = false;

  composer.addPass(renderPass);
  composer.addPass(ssao);
  composer.addPass(bloom);
  composer.addPass(smaa);
  composer.addPass(output);
  composer.addPass(grade);

  let night = 0;

  return {
    enabled: true,
    setNight(value) {
      night = Math.max(0, Math.min(1, value));
      bloom.strength = THREE.MathUtils.lerp(0.06, 0.58, night);
      bloom.radius = THREE.MathUtils.lerp(0.3, 0.58, night);
      bloom.threshold = THREE.MathUtils.lerp(0.86, 0.9, night);
      grade.uniforms.uNight.value = night;
      grade.uniforms.uVignette.value = THREE.MathUtils.lerp(0.18, 0.46, night);
      grade.uniforms.uGrain.value = THREE.MathUtils.lerp(0.014, 0.032, night);
    },
    setTime(time, rainAmount = 0) {
      grade.uniforms.uTime.value = time;
      grade.uniforms.uGrain.value = (0.012 + night * 0.02) + rainAmount * 0.008;
    },
    setSize(width, height) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
      bloom.resolution.set(width, height);
      grade.uniforms.uResolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
    },
    render(dt) {
      composer.render(dt);
    },
    dispose() {
      composer.dispose();
      ssao.dispose?.();
      bloom.dispose?.();
      smaa.dispose?.();
      output.dispose?.();
      grade.dispose?.();
    }
  };
}




