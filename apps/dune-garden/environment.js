// ==========================================================================
// Dune Garden — environment
//
// A layered coastal backdrop: gradient sky with a real sun, three dune ridges,
// a hazy sea horizon and the light rig that drives the courtyard. The sky, sea
// and pool all share one set of uniforms, so a single mood change (day → dusk)
// flows through every surface at once.
// ==========================================================================

import * as THREE from 'three';
import { createSandTexture } from './textures.js';

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform vec3 uSkyTop;
  uniform vec3 uSkyHorizon;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;

  varying vec3 vDir;

  void main() {
    vec3 dir = normalize(vDir);
    float h = clamp(dir.y, 0.0, 1.0);

    // Vertical gradient, denser near the horizon.
    vec3 col = mix(uSkyHorizon, uSkyTop, pow(h, 0.26));

    // Broad warm halo and a soft sun disc.
    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    col += uSunColor * pow(sunDot, 6.0) * 0.14;
    col += uSunColor * pow(sunDot, 90.0) * 0.34;
    col += uSunColor * pow(sunDot, 2400.0) * 2.6;

    // A little warmth is held low over the sea.
    col = mix(col, uSkyHorizon + uSunColor * 0.05, pow(1.0 - h, 7.0) * 0.7);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const SEA_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const SEA_FRAG = /* glsl */ `
  uniform vec3 uSkyHorizon;
  uniform vec3 uSkyTop;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uTime;

  varying vec3 vWorld;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorld);
    vec3 refl = reflect(-viewDir, vec3(0.0, 1.0, 0.0));

    float h = clamp(refl.y, 0.0, 1.0);
    vec3 col = mix(uSkyHorizon, uSkyTop, pow(h, 0.6));
    col = mix(col, vec3(0.12, 0.25, 0.28), 0.68);

    // A broken path of sun on the water.
    vec3 sunFlat = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
    vec3 reflFlat = normalize(vec3(refl.x, 0.0, refl.z));
    float sunPath = pow(max(dot(reflFlat, sunFlat), 0.0), 16.0);
    float glitter = 0.5 + 0.5 * sin(vWorld.x * 0.9 + vWorld.z * 0.23 + uTime * 0.6);
    col += uSunColor * sunPath * (0.28 + 0.22 * glitter);

    // Distance haze into the sky; the sea keeps a little more of its colour.
    float dist = length(cameraPosition - vWorld);
    float fog = 1.0 - exp(-pow(uFogDensity * dist, 2.0));
    col = mix(col, uFogColor, clamp(fog, 0.0, 1.0) * 0.58);
    col = mix(col, uFogColor * 1.02, smoothstep(0.5, 1.0, fog) * 0.5);

    // Long, slow tonal drifts across the water.
    col += vec3(0.012, 0.014, 0.016) * sin(vWorld.x * 0.025 + uTime * 0.05)
         * sin(vWorld.z * 0.06 - uTime * 0.03);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const TAU = Math.PI * 2;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/* --------------------------------------------------------------------------
   Duneridge — a rounded sand ridge with wind-shaped crests.
   -------------------------------------------------------------------------- */

function createDune({ width, depth, height, z, phase, texture }) {
  const geometry = new THREE.PlaneGeometry(width, depth, 110, 12);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const localZ = position.getZ(i);
    const u = Math.abs(x) / (width * 0.5);
    const edgeFade = smoothstep(1.02, 0.68, u);
    const cross = Math.cos((localZ / (depth * 0.5)) * Math.PI * 0.5);
    const crest =
      0.58 +
      0.3 * Math.sin(x * 0.052 + phase) * Math.sin(x * 0.019 + phase * 1.7) +
      0.12 * Math.sin(x * 0.11 + phase * 2.1);
    const ripple =
      0.14 * Math.sin(x * 0.34 + localZ * 0.5 + phase) +
      0.06 * Math.sin(x * 0.87 + localZ * 1.2 + phase * 3.0);
    const y =
      height * Math.pow(Math.max(0, cross), 1.35) * Math.max(0.32, crest) * edgeFade +
      ripple * edgeFade;
    position.setY(i, y);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xded0b4,
    roughness: 1,
    metalness: 0,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, -0.03, z);
  mesh.receiveShadow = true;
  return mesh;
}

/* --------------------------------------------------------------------------
   Public API
   -------------------------------------------------------------------------- */

export function createEnvironment(scene, shared) {
  const group = new THREE.Group();
  group.name = 'environment';
  scene.add(group);

  /* Sky dome ------------------------------------------------------------- */

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(460, 40, 24),
    new THREE.ShaderMaterial({
      uniforms: {
        uSkyTop: shared.uSkyTop,
        uSkyHorizon: shared.uSkyHorizon,
        uSunColor: shared.uSunColor,
        uSunDir: shared.uSunDir,
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  sky.name = 'sky';
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  group.add(sky);

  /* Sea ------------------------------------------------------------------ */

  const seaUniforms = {
    uSkyHorizon: shared.uSkyHorizon,
    uSkyTop: shared.uSkyTop,
    uSunColor: shared.uSunColor,
    uSunDir: shared.uSunDir,
    uFogColor: shared.uFogColor,
    uFogDensity: shared.uFogDensity,
    uTime: shared.uTime,
  };
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 620),
    new THREE.ShaderMaterial({
      uniforms: seaUniforms,
      vertexShader: SEA_VERT,
      fragmentShader: SEA_FRAG,
      fog: false,
    }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -1.6, -380);
  sea.name = 'sea';
  group.add(sea);

  /* Dunes ---------------------------------------------------------------- */

  const duneTexture = createSandTexture({ size: 512, repeat: [24, 4] });
  const duneTextureBack = createSandTexture({ size: 512, repeat: [34, 5] });

  const dunes = new THREE.Group();
  dunes.name = 'dunes';
  dunes.add(
    createDune({
      width: 220,
      depth: 12,
      height: 1.3,
      z: -20,
      phase: 1.2,
      texture: duneTexture,
    }),
  );
  dunes.add(
    createDune({
      width: 280,
      depth: 18,
      height: 2.6,
      z: -38,
      phase: 3.7,
      texture: duneTexture,
    }),
  );
  dunes.add(
    createDune({
      width: 360,
      depth: 32,
      height: 3.4,
      z: -60,
      phase: 6.1,
      texture: duneTextureBack,
    }),
  );
  group.add(dunes);
  dunes.updateMatrixWorld(true);

  /* Ground plain --------------------------------------------------------- */

  const sandTexture = createSandTexture({ size: 1024, repeat: [64, 64] });
  const groundMaterial = new THREE.MeshStandardMaterial({
    map: sandTexture,
    color: 0xd9cbb2,
    roughness: 1,
    metalness: 0,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(640, 160), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.045, -10);
  ground.receiveShadow = true;
  ground.name = 'ground';
  group.add(ground);

  /* Dune scrub — low coastal vegetation scattered over the far ridges ------ */

  const shrubGeometry = new THREE.IcosahedronGeometry(0.5, 1);
  const shrubMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });
  const shrubColor = new THREE.Color();
  const shrubColors = [0x7d865f, 0x8d9468, 0x697651, 0x939a73];
  const shrubCount = 140;
  const shrubs = new THREE.InstancedMesh(shrubGeometry, shrubMaterial, shrubCount);
  shrubs.name = 'dune-scrub';
  shrubs.frustumCulled = false;
  shrubs.castShadow = false;
  shrubs.receiveShadow = false;

  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const origin = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  const rnd = mulberry32(9177);
  const duneList = dunes.children;

  let placed = 0;
  let guard = 0;
  while (placed < shrubCount && guard < shrubCount * 6) {
    guard += 1;
    const dune = duneList[Math.floor(rnd() * duneList.length)];
    const x = (rnd() - 0.5) * 200;
    const z = (rnd() - 0.5) * 26;
    origin.set(x, 30, z + dune.position.z);
    raycaster.set(origin, down);
    const hit = raycaster.intersectObject(dune, false)[0];
    if (!hit || hit.point.y < 0.15) continue;

    dummy.position.copy(hit.point);
    dummy.position.y -= 0.08;
    dummy.rotation.set(0, rnd() * Math.PI * 2, 0);
    dummy.scale.set(0.55 + rnd() * 1.1, 0.28 + rnd() * 0.32, 0.55 + rnd() * 1.1);
    dummy.updateMatrix();
    shrubs.setMatrixAt(placed, dummy.matrix);
    shrubColor.set(shrubColors[Math.floor(rnd() * shrubColors.length)]);
    shrubColor.multiplyScalar(0.75 + rnd() * 0.5);
    shrubs.setColorAt(placed, shrubColor);
    placed += 1;
  }
  shrubs.count = placed;
  shrubs.instanceMatrix.needsUpdate = true;
  if (shrubs.instanceColor) shrubs.instanceColor.needsUpdate = true;
  group.add(shrubs);

  /* Light rig ------------------------------------------------------------ */

  const hemisphere = new THREE.HemisphereLight(0xdce8e8, 0xbfa37c, 0.95);
  hemisphere.name = 'hemisphere';
  scene.add(hemisphere);

  const ambient = new THREE.AmbientLight(0xfff4e2, 0.12);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff1d5, 3.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 12;
  sun.shadow.camera.far = 200;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 26;
  sun.shadow.camera.bottom = -26;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 2;
  sun.target.position.set(0, 0, -1);
  scene.add(sun);
  scene.add(sun.target);

  return {
    group,
    sky,
    sea,
    ground,
    dunes,
    hemisphere,
    ambient,
    sun,
    update(camera) {
      sky.position.copy(camera.position);
    },
  };
}
