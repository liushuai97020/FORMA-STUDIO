/* ==========================================================================
   CASA MAR — material library
   --------------------------------------------------------------------------
   One quiet, coastal palette: limewash, travertine, oak, bronze, glass and a
   few warm interior surfaces. All maps are procedural and local.
   ========================================================================== */

import * as THREE from 'three';
import {
  createLimewash,
  createOak,
  createPaving,
  createPoolTile,
  createSand,
  createStone,
} from './textures.js';

const SURFACE = {
  lime: 0xf6f0e6,
  limeShade: 0xefe7da,
  stone: 0xd9cdb9,
  stoneDark: 0xb9a992,
  oak: 0xc7a376,
  oakDark: 0xa17b51,
  bronze: 0x4c443a,
  glass: 0xcfdedc,
  interiorWall: 0xe9e0d2,
  interiorFloor: 0x9c7450,
  fabric: 0xe7ddcd,
  fabricWarm: 0xd6c2a9,
  rug: 0xc7b59c,
  teak: 0x8a6644,
  ceramic: 0xb6a38a,
  foliage: 0x5d6a46,
  bark: 0x7e6c56,
  headland: 0x9aa6a0,
};

export function createMaterials() {
  const limewash = createLimewash();
  const oakMap = createOak();
  const pavingMap = createPaving();
  const stoneMap = createStone();
  const poolTileMap = createPoolTile();
  const sandMap = createSand();

  const materials = {};
  const textures = [
    limewash.map,
    limewash.roughnessMap,
    oakMap,
    pavingMap,
    stoneMap,
    poolTileMap,
    sandMap,
  ];

  materials.lime = new THREE.MeshStandardMaterial({
    color: SURFACE.lime,
    map: limewash.map,
    roughnessMap: limewash.roughnessMap,
    roughness: 0.94,
    metalness: 0,
    envMapIntensity: 0.45,
  });

  materials.limeShade = new THREE.MeshStandardMaterial({
    color: SURFACE.limeShade,
    map: limewash.map,
    roughness: 0.96,
    metalness: 0,
    envMapIntensity: 0.4,
  });

  materials.stone = new THREE.MeshStandardMaterial({
    color: SURFACE.stone,
    map: stoneMap,
    roughness: 0.86,
    metalness: 0,
    envMapIntensity: 0.45,
  });

  materials.stoneDark = new THREE.MeshStandardMaterial({
    color: SURFACE.stoneDark,
    map: stoneMap,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.35,
  });

  materials.paving = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: pavingMap,
    roughness: 0.8,
    metalness: 0,
    envMapIntensity: 0.5,
  });

  materials.cliff = new THREE.MeshStandardMaterial({
    color: 0xbfae97,
    map: stoneMap,
    roughness: 0.95,
    metalness: 0,
    envMapIntensity: 0.25,
  });

  materials.oak = new THREE.MeshStandardMaterial({
    color: SURFACE.oak,
    map: oakMap,
    roughness: 0.62,
    metalness: 0,
    envMapIntensity: 0.35,
  });

  materials.oakDark = new THREE.MeshStandardMaterial({
    color: SURFACE.oakDark,
    map: oakMap,
    roughness: 0.66,
    metalness: 0,
    envMapIntensity: 0.3,
  });

  materials.oakFloor = new THREE.MeshStandardMaterial({
    color: 0xb08a5f,
    map: oakMap,
    roughness: 0.5,
    metalness: 0,
    envMapIntensity: 0.4,
  });

  materials.bronze = new THREE.MeshStandardMaterial({
    color: SURFACE.bronze,
    roughness: 0.34,
    metalness: 0.72,
    envMapIntensity: 1,
  });

  materials.glass = new THREE.MeshPhysicalMaterial({
    color: SURFACE.glass,
    metalness: 0,
    roughness: 0.055,
    transparent: true,
    opacity: 0.18,
    ior: 1.5,
    specularIntensity: 1,
    clearcoat: 0.6,
    clearcoatRoughness: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 1.5,
  });

  materials.glassRail = new THREE.MeshPhysicalMaterial({
    color: 0xd8e2de,
    metalness: 0,
    roughness: 0.04,
    transparent: true,
    opacity: 0.12,
    ior: 1.5,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 1.2,
  });

  materials.interiorWall = new THREE.MeshStandardMaterial({
    color: SURFACE.interiorWall,
    roughness: 0.95,
    metalness: 0,
    envMapIntensity: 0.25,
  });

  materials.interiorFloor = new THREE.MeshStandardMaterial({
    color: SURFACE.interiorFloor,
    map: oakMap,
    roughness: 0.56,
    metalness: 0,
    envMapIntensity: 0.4,
  });

  materials.interiorCeiling = new THREE.MeshStandardMaterial({
    color: 0xf1e9dc,
    roughness: 0.98,
    metalness: 0,
    envMapIntensity: 0.2,
  });

  materials.fabric = new THREE.MeshStandardMaterial({
    color: SURFACE.fabric,
    roughness: 0.98,
    metalness: 0,
    envMapIntensity: 0.15,
  });

  materials.fabricWarm = new THREE.MeshStandardMaterial({
    color: SURFACE.fabricWarm,
    roughness: 0.98,
    metalness: 0,
    envMapIntensity: 0.15,
  });

  materials.rug = new THREE.MeshStandardMaterial({
    color: SURFACE.rug,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.1,
  });

  materials.teak = new THREE.MeshStandardMaterial({
    color: SURFACE.teak,
    map: oakMap,
    roughness: 0.7,
    metalness: 0,
    envMapIntensity: 0.3,
  });

  materials.ceramic = new THREE.MeshStandardMaterial({
    color: SURFACE.ceramic,
    roughness: 0.85,
    metalness: 0,
    envMapIntensity: 0.4,
  });

  materials.foliage = new THREE.MeshStandardMaterial({
    color: SURFACE.foliage,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.25,
  });

  materials.bark = new THREE.MeshStandardMaterial({
    color: SURFACE.bark,
    roughness: 0.98,
    metalness: 0,
    envMapIntensity: 0.15,
  });

  materials.headland = new THREE.MeshStandardMaterial({
    color: SURFACE.headland,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.1,
  });

  materials.poolTile = new THREE.MeshStandardMaterial({
    color: 0x8fb3a6,
    map: poolTileMap,
    roughness: 0.42,
    metalness: 0,
    envMapIntensity: 0.6,
  });

  materials.sand = new THREE.MeshStandardMaterial({
    color: 0xd3c0a3,
    map: sandMap,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.12,
  });

  materials.seal = new THREE.MeshStandardMaterial({
    color: 0x29241f,
    roughness: 0.7,
    metalness: 0.1,
    envMapIntensity: 0.2,
  });

  materials.palmLeaf = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.82,
    metalness: 0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.3,
  });

  materials.palmTrunk = new THREE.MeshStandardMaterial({
    color: 0x8a785f,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.12,
  });

  materials.grass = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.2,
  });

  /* Emissive surfaces are driven by the day / dusk transition. */
  materials.windowGlow = new THREE.MeshStandardMaterial({
    color: 0xffd7a3,
    emissive: 0xffa75a,
    emissiveIntensity: 0.1,
    roughness: 1,
    metalness: 0,
  });

  materials.stripGlow = new THREE.MeshBasicMaterial({
    color: 0xffbd82,
    transparent: true,
    opacity: 0.1,
    toneMapped: false,
    depthWrite: false,
  });

  materials.downlight = new THREE.MeshStandardMaterial({
    color: 0xffe3bd,
    emissive: 0xffb26d,
    emissiveIntensity: 0.3,
    roughness: 1,
    metalness: 0,
  });

  materials.poolLamp = new THREE.MeshStandardMaterial({
    color: 0xbbf0e2,
    emissive: 0x6fd8c4,
    emissiveIntensity: 0,
    roughness: 1,
    metalness: 0,
  });

  const disposalList = [...textures, ...Object.values(materials)];
  materials.dispose = () => {
    for (const texture of textures) texture.dispose();
    for (const material of Object.values(materials)) {
      if (material && material.isMaterial) material.dispose();
    }
    disposalList.length = 0;
  };

  return materials;
}
