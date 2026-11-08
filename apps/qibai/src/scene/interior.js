import * as THREE from 'three';
import { box, cylinder, roundedBox, plane, markShadows, addContactShadow } from './helpers.js';

function makeRug(M, width, depth, position, material = M.rug, baseY = 0.065) {
  const rug = box(width, 0.025, depth, material, [position[0], baseY, position[1]], { cast: false, receive: true });
  return rug;
}

function makeSofa(M, position) {
  const group = new THREE.Group();
  group.position.set(position[0], 0, position[1]);
  group.add(roundedBox(2.95, 0.34, 1.0, 0.14, M.linen, [0, 0.35, 0]));
  group.add(roundedBox(2.95, 0.55, 0.22, 0.1, M.linen, [0, 0.66, -0.38]));
  group.add(roundedBox(0.25, 0.55, 1.0, 0.1, M.linen, [-1.35, 0.53, 0]));
  group.add(roundedBox(0.25, 0.55, 1.0, 0.1, M.linen, [1.35, 0.53, 0]));
  group.add(roundedBox(1.15, 0.16, 0.82, 0.07, M.linenLight, [-0.68, 0.57, 0.06]));
  group.add(roundedBox(1.15, 0.16, 0.82, 0.07, M.linenLight, [0.68, 0.57, 0.06]));
  group.add(roundedBox(0.7, 0.42, 0.16, 0.07, M.rugLight, [0.65, 0.72, -0.22], { rotation: [0.1, 0, 0.05] }));
  group.add(roundedBox(0.62, 0.4, 0.15, 0.07, M.rug, [-0.62, 0.7, -0.22], { rotation: [-0.1, 0, -0.08] }));
  for (const x of [-1.25, 1.25]) {
    for (const z of [-0.35, 0.35]) {
      group.add(cylinder(0.035, 0.045, 0.28, M.woodDeep, [x, 0.14, z], { radialSegments: 8 }));
    }
  }
  markShadows(group, true, true);
  return group;
}

function makeCoffeeTable(M, position) {
  const group = new THREE.Group();
  group.position.set(position[0], 0, position[1]);
  const top = cylinder(0.76, 0.8, 0.11, M.wood, [0, 0.45, 0], { radialSegments: 40 });
  top.scale.z = 0.72;
  group.add(top);
  for (const [x, z] of [[-0.48, -0.24], [0.48, -0.24], [-0.48, 0.24], [0.48, 0.24]]) {
    group.add(cylinder(0.035, 0.05, 0.4, M.woodDeep, [x, 0.2, z], { radialSegments: 8 }));
  }
  group.add(box(0.36, 0.035, 0.26, M.paper, [0.12, 0.53, 0.04], { cast: false }));
  group.add(cylinder(0.08, 0.1, 0.08, M.brass, [-0.25, 0.54, -0.08], { radialSegments: 14, cast: false }));
  return group;
}

function makeSideTable(M, position) {
  const group = new THREE.Group();
  group.position.set(position[0], 0, position[1]);
  group.add(cylinder(0.27, 0.24, 0.08, M.wood, [0, 0.5, 0], { radialSegments: 24 }));
  group.add(cylinder(0.035, 0.06, 0.47, M.woodDeep, [0, 0.25, 0], { radialSegments: 8 }));
  group.add(cylinder(0.23, 0.23, 0.02, M.woodDeep, [0, 0.04, 0], { radialSegments: 20, cast: false }));
  return group;
}

function makeFloorLamp(M, position) {
  const group = new THREE.Group();
  group.position.set(position[0], 0, position[1]);
  group.add(cylinder(0.26, 0.28, 0.035, M.blackMetal, [0, 0.03, 0], { radialSegments: 20, cast: false }));
  group.add(cylinder(0.018, 0.018, 1.55, M.brassDark, [0, 0.8, 0], { radialSegments: 8, cast: false }));
  const arm = box(0.5, 0.022, 0.022, M.brassDark, [0.2, 1.55, 0], { cast: false });
  arm.rotation.z = 0.05;
  group.add(arm);
  const shade = cylinder(0.17, 0.28, 0.32, M.paper, [0.4, 1.43, 0], { radialSegments: 22 });
  group.add(shade);
  const light = new THREE.PointLight(0xffb66e, 6.5, 5.5, 2);
  light.position.set(0.4, 1.35, 0);
  group.add(light);
  return { group, light };
}

function makePendant(M, position, options = {}) {
  const group = new THREE.Group();
  group.position.set(position[0], 0, position[1]);
  const height = options.height ?? 2.85;
  const cord = cylinder(0.008, 0.008, height - 0.4, M.blackMetal, [0, height - 0.2, 0], { radialSegments: 4, cast: false });
  group.add(cord);
  const shade = cylinder(0.12, options.radius ?? 0.42, options.shadeHeight ?? 0.38, options.material || M.paper, [0, height - 0.48, 0], { radialSegments: 26 });
  group.add(shade);
  group.add(cylinder(0.035, 0.035, 0.05, M.brass, [0, height - 0.28, 0], { radialSegments: 12, cast: false }));
  const light = new THREE.PointLight(0xffb265, options.intensity ?? 9, options.distance ?? 6.5, 2);
  light.position.set(0, height - 0.62, 0);
  group.add(light);
  return { group, light };
}

function makeBookshelf(M, position, rotationY = 0) {
  const group = new THREE.Group();
  group.position.set(position[0], 0, position[1]);
  group.rotation.y = rotationY;
  group.add(box(1.75, 2.0, 0.32, M.woodDark, [0, 1.08, 0]));
  for (let index = 0; index < 5; index++) {
    group.add(box(1.57, 0.045, 0.26, M.wood, [0, 0.36 + index * 0.38, 0.04], { cast: false }));
  }
  const colors = [0x7c5c4d, 0xc1b49f, 0x5a665d, 0x9d645a, 0xd6c6ac, 0x3f4b4a];
  for (let shelf = 0; shelf < 5; shelf++) {
    let x = -0.72;
    while (x < 0.64) {
      const width = 0.08 + Math.random() * 0.08;
      const height = 0.2 + Math.random() * 0.11;
      const material = new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)], roughness: 0.85 });
      group.add(box(width, height, 0.19, material, [x + width / 2, 0.39 + shelf * 0.38 + height / 2, 0.04], { cast: false }));
      x += width + 0.025;
    }
  }
  return group;
}

function makeChair(M, position, rotationY = 0) {
  const group = new THREE.Group();
  group.position.set(position[0], 0, position[1]);
  group.rotation.y = rotationY;
  group.add(box(0.46, 0.06, 0.46, M.wood, [0, 0.48, 0]));
  group.add(box(0.46, 0.55, 0.06, M.wood, [0, 0.78, -0.2]));
  group.add(box(0.42, 0.06, 0.4, M.linen, [0, 0.53, 0], { cast: false }));
  for (const [x, z] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) {
    group.add(cylinder(0.025, 0.032, 0.47, M.woodDeep, [x, 0.23, z], { radialSegments: 6 }));
  }
  return group;
}

function makeDining(M, position) {
  const group = new THREE.Group();
  group.position.set(position[0], 0, position[1]);
  const top = cylinder(1.5, 1.5, 0.08, M.wood, [0, 0.75, 0], { radialSegments: 40 });
  top.scale.z = 0.6;
  group.add(top);
  group.add(cylinder(0.2, 0.28, 0.7, M.woodDeep, [0, 0.38, 0], { radialSegments: 16 }));
  group.add(cylinder(0.68, 0.68, 0.035, M.woodDeep, [0, 0.03, 0], { radialSegments: 26, cast: false }));
  for (const [x, z, rot] of [[-0.95, 0.66, Math.PI], [0.95, 0.66, Math.PI], [-0.95, -0.66, 0], [0.95, -0.66, 0]]) {
    group.add(makeChair(M, [x, z], rot));
  }
  group.add(cylinder(0.08, 0.12, 0.22, M.brass, [0.32, 0.86, 0.05], { radialSegments: 16, cast: false }));
  group.add(cylinder(0.12, 0.12, 0.03, M.paper, [-0.22, 0.8, -0.02], { radialSegments: 16, cast: false }));
  const vase = cylinder(0.06, 0.09, 0.24, M.charcoal, [0.3, 0.95, 0], { radialSegments: 16, cast: false });
  group.add(vase);
  for (let index = 0; index < 3; index++) {
    const stem = cylinder(0.006, 0.006, 0.36, M.leaf, [0.3 + (index - 1) * 0.04, 1.22, 0], { radialSegments: 4, cast: false });
    stem.rotation.z = (index - 1) * 0.3;
    group.add(stem);
    group.add(roundedBox(0.08, 0.13, 0.02, 0.04, M.petal, [0.3 + (index - 1) * 0.08, 1.39, 0.01], { cast: false }));
  }
  markShadows(group, true, true);
  return group;
}

function makeBed(M, position, width = 2.1, depth = 2.2) {
  const group = new THREE.Group();
  group.position.set(position[0], 0, position[1]);
  group.add(roundedBox(width, 0.25, depth, 0.12, M.woodDark, [0, 0.45, 0]));
  group.add(roundedBox(width - 0.08, 0.24, depth - 0.12, 0.1, M.linenLight, [0, 0.67, 0]));
  group.add(roundedBox(width - 0.2, 0.12, depth * 0.55, 0.06, M.linen, [0, 0.82, 0.36]));
  group.add(roundedBox(1.0, 0.17, 0.52, 0.08, M.linenLight, [-0.42, 0.88, -0.55], { rotation: [-0.08, 0, 0] }));
  group.add(roundedBox(1.0, 0.17, 0.52, 0.08, M.linenLight, [0.42, 0.88, -0.55], { rotation: [-0.08, 0, 0] }));
  group.add(box(width + 0.1, 1.05, 0.12, M.woodDark, [0, 0.98, -depth / 2 + 0.06]));
  group.add(box(width + 0.14, 0.11, 0.22, M.woodDeep, [0, 1.54, -depth / 2 + 0.06]));
  for (const x of [-width / 2 - 0.08, width / 2 + 0.08]) {
    group.add(cylinder(0.03, 0.04, 0.4, M.woodDeep, [x, 0.22, -depth / 2 + 0.2], { radialSegments: 8 }));
    group.add(cylinder(0.03, 0.04, 0.4, M.woodDeep, [x, 0.22, depth / 2 - 0.2], { radialSegments: 8 }));
  }
  return group;
}

function makeBedside(M, position, side = 1) {
  const group = new THREE.Group();
  group.position.set(position[0], 0, position[1]);
  group.add(roundedBox(0.48, 0.42, 0.42, 0.05, M.woodDark, [0, 0.32, 0]));
  group.add(cylinder(0.045, 0.06, 0.28, M.brass, [0, 0.67, 0], { radialSegments: 12 }));
  const shade = cylinder(0.1, 0.18, 0.2, M.paper, [0, 0.86, 0], { radialSegments: 18 });
  group.add(shade);
  const light = new THREE.PointLight(0xffb474, 3.2, 3.4, 2);
  light.position.set(0, 0.86, 0);
  group.add(light);
  return { group, light };
}

function makeStairs(M) {
  const group = new THREE.Group();
  const steps = 14;
  const rise = 3.15 / steps;
  const run = 0.29;
  for (let index = 0; index < steps; index++) {
    group.add(box(1.15, rise, 0.32, M.wood, [5.64, rise / 2 + index * rise, -2.25 - index * run]));
  }
  group.add(box(0.07, 0.95, 4.3, M.woodDark, [5.02, 2.65, -4.09], { rotation: [-0.55, 0, 0], cast: false }));
  group.add(box(0.07, 0.95, 4.3, M.woodDark, [6.26, 2.65, -4.09], { rotation: [-0.55, 0, 0], cast: false }));
  for (let index = 0; index < 8; index++) {
    const y = 0.42 + index * 0.38;
    const z = -2.15 - index * 0.49;
    group.add(box(0.06, 0.86, 0.06, M.woodDark, [5.08, y, z], { cast: false }));
    group.add(box(0.06, 0.86, 0.06, M.woodDark, [6.2, y, z], { cast: false }));
  }
  return group;
}

function makeTeaRoom(M) {
  const group = new THREE.Group();
  const floor = box(3.8, 0.13, 4.6, M.linen, [-8.62, 0.18, -3.45], { cast: false });
  group.add(floor);
  const platform = box(3.15, 0.2, 2.65, M.linen, [-8.65, 0.33, -3.45], { cast: false });
  group.add(platform);
  group.add(box(3.04, 0.04, 2.55, M.rugLight, [-8.65, 0.45, -3.45], { cast: false }));
  group.add(roundedBox(1.4, 0.07, 0.72, 0.04, M.woodDark, [-8.65, 0.61, -3.4]));
  for (const [x, z] of [[-8.65, -4.1], [-8.65, -2.7], [-9.4, -3.4], [-7.9, -3.4]]) {
    group.add(roundedBox(0.42, 0.1, 0.42, 0.1, M.rug, [x, 0.55, z], { cast: false }));
  }
  const teapot = cylinder(0.08, 0.12, 0.15, M.charcoal, [-8.5, 0.71, -3.4], { radialSegments: 16, cast: false });
  group.add(teapot);
  group.add(cylinder(0.035, 0.035, 0.04, M.brass, [-8.2, 0.65, -3.28], { radialSegments: 12, cast: false }));
  group.add(cylinder(0.035, 0.035, 0.04, M.brass, [-8.8, 0.65, -3.55], { radialSegments: 12, cast: false }));

  // Scroll on the rear wall.
  const scroll = plane(0.72, 1.45, M.scroll, [-8.65, 1.8, -6.05]);
  scroll.rotation.y = 0;
  group.add(scroll);
  group.add(cylinder(0.018, 0.018, 0.85, M.woodDark, [-8.65, 2.6, -6.02], { radialSegments: 6, rotation: [0, 0, Math.PI / 2], cast: false }));

  // Bamboo blind at the front glazing.
  for (let index = 0; index < 15; index++) {
    group.add(box(0.035, 1.9, 0.035, M.woodLight, [-10.2 + index * 0.23, 2.15, -1.06], { cast: false }));
  }
  group.add(box(3.6, 0.04, 0.06, M.woodDark, [-8.65, 3.1, -1.06], { cast: false }));

  // Low shelf.
  group.add(box(1.5, 0.52, 0.36, M.woodDark, [-9.9, 0.3, -5.5]));
  group.add(box(0.25, 0.32, 0.2, M.linen, [-9.95, 0.72, -5.5], { cast: false }));
  return group;
}

function makeKitchen(M) {
  const group = new THREE.Group();
  group.add(box(3.0, 0.82, 0.62, M.woodDark, [3.85, 0.42, -9.65]));
  group.add(box(3.1, 0.07, 0.72, M.stone, [3.85, 0.86, -9.62], { cast: false }));
  group.add(box(3.0, 0.82, 0.28, M.wood, [3.85, 2.02, -9.84]));
  group.add(box(3.1, 0.12, 0.38, M.stoneDark, [3.85, 2.41, -9.74], { cast: false }));
  group.add(box(0.9, 0.52, 0.05, M.stoneDark, [2.55, 1.1, -9.31], { cast: false }));
  group.add(cylinder(0.03, 0.03, 0.36, M.brass, [2.55, 1.22, -9.27], { radialSegments: 8, rotation: [Math.PI / 2, 0, 0], cast: false }));
  for (let index = 0; index < 5; index++) {
    group.add(box(0.5, 0.74, 0.05, M.wood, [2.55 + index * 0.62, 1.9, -9.66], { cast: false }));
  }
  group.add(box(0.7, 0.42, 0.38, M.charcoal, [3.85, 1.66, -9.75], { cast: false }));
  return group;
}

function makeFireplace(M) {
  const group = new THREE.Group();
  group.position.set(-6.17, 0, -4.48);
  group.add(box(0.26, 1.5, 1.5, M.stone, [0, 0.78, 0]));
  group.add(box(0.18, 1.02, 1.06, M.charcoal, [0.08, 0.52, 0]));
  group.add(box(0.03, 0.42, 0.65, M.warmGlow, [0.18, 0.45, 0], { cast: false }));
  group.add(box(0.48, 0.08, 1.8, M.woodDeep, [0.04, 1.54, 0]));
  const light = new THREE.PointLight(0xff8f4a, 6.5, 4.6, 2);
  light.position.set(0.3, 0.55, 0);
  group.add(light);
  return { group, light };
}

export function createInterior(M) {
  const group = new THREE.Group();
  group.name = 'interior';
  const warmLights = [];

  // Interior floors.
  group.add(box(12.9, 0.06, 9.35, M.floor, [0, 0.07, -5.55], { cast: false }));
  group.add(box(12.9, 0.06, 9.35, M.floorUpper, [0, 3.33, -5.55], { cast: false }));

  // Warm wall linings and ceiling beams.
  group.add(box(13.0, 0.06, 9.5, M.ceiling, [0, 3.0, -5.5], { cast: false }));
  for (const x of [-4.9, -2.9, -0.9, 1.1, 3.1, 5.1]) {
    group.add(box(0.16, 0.22, 9.3, M.woodDeep, [x, 2.87, -5.5], { cast: false }));
  }

  // Ground floor partition between the entrance hall and kitchen, and the
  // upper floor bedroom wall.
  group.add(box(0.18, 2.75, 3.0, M.wallWarm, [1.45, 1.6, -8.5]));
  group.add(box(0.18, 2.95, 8.7, M.wallWarm, [1.35, 4.68, -5.45]));
  group.add(box(0.18, 2.8, 1.8, M.wallWarm, [1.35, 4.67, -1.8]));

  // Rugs.
  group.add(makeRug(M, 4.5, 3.35, [-2.75, -5.7], M.rug));
  group.add(makeRug(M, 3.1, 2.7, [3.8, -6.55], M.rugLight));
  group.add(makeRug(M, 3.7, 2.8, [-2.2, 4.92], M.rugLight, 3.39));
  group.add(makeRug(M, 2.6, 2.1, [4.25, 4.86], M.rug, 3.39));

  // Living room.
  group.add(makeSofa(M, [-2.65, -7.9]));
  group.add(makeCoffeeTable(M, [-2.65, -5.95]));
  group.add(makeSideTable(M, [-4.45, -5.4]));
  const floorLamp = makeFloorLamp(M, [-4.55, -8.3]);
  group.add(floorLamp.group);
  warmLights.push({ light: floorLamp.light, base: 11 });
  group.add(makeBookshelf(M, [-5.4, -10.02], 0));
  const fireplace = makeFireplace(M);
  group.add(fireplace.group);
  warmLights.push({ light: fireplace.light, base: 11 });

  const livingPendant = makePendant(M, [-2.65, -5.55], { height: 2.78, radius: 0.34, intensity: 10, distance: 7.5 });
  group.add(livingPendant.group);
  warmLights.push({ light: livingPendant.light, base: 16 });

  // Soft warm fill so the cutaway reads as a lit interior rather than a
  // shadow box. These lights do not cast shadows.
  const livingFill = new THREE.PointLight(0xffc38a, 9, 11, 2);
  livingFill.position.set(-1.8, 2.25, -5.2);
  group.add(livingFill);
  warmLights.push({ light: livingFill, base: 9 });

  // Vertical timber feature wall behind the sofa.
  for (let x = -4.65; x <= -0.35; x += 0.16) {
    group.add(box(0.065, 2.55, 0.045, M.woodDark, [x, 1.5, -10.08], { cast: false }));
  }
  group.add(box(4.5, 0.08, 0.13, M.woodDeep, [-2.5, 2.8, -10.04], { cast: false }));
  group.add(box(4.5, 0.08, 0.13, M.woodDeep, [-2.5, 0.22, -10.04], { cast: false }));

  // A round mirror and low console break up the long west wall.
  const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.62, 44), M.glassDark);
  mirror.position.set(-6.36, 1.72, -4.25);
  mirror.rotation.y = Math.PI / 2;
  group.add(mirror);
  const mirrorRim = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.032, 8, 44), M.brass);
  mirrorRim.position.copy(mirror.position);
  mirrorRim.rotation.y = Math.PI / 2;
  group.add(mirrorRim);
  group.add(box(0.38, 0.74, 1.48, M.woodDark, [-6.22, 0.38, -4.25]));
  group.add(cylinder(0.09, 0.12, 0.26, M.charcoal, [-6.2, 0.9, -4.62], { radialSegments: 16, cast: false }));
  for (let index = 0; index < 3; index++) {
    const stem = cylinder(0.008, 0.008, 0.42, M.leaf, [-6.2 + (index - 1) * 0.035, 1.22, -4.62], { radialSegments: 4, cast: false });
    stem.rotation.z = (index - 1) * 0.25;
    group.add(stem);
    group.add(roundedBox(0.12, 0.2, 0.02, 0.04, M.leaf, [-6.2 + (index - 1) * 0.1, 1.45, -4.61], { cast: false }));
  }

  // Dining room.
  group.add(makeDining(M, [3.95, -6.55]));
  const diningPendant = makePendant(M, [3.95, -6.55], { height: 2.73, radius: 0.38, shadeHeight: 0.32, intensity: 9, distance: 6.8 });
  group.add(diningPendant.group);
  warmLights.push({ light: diningPendant.light, base: 14 });

  // Kitchen.
  group.add(makeKitchen(M));

  // Stairs.
  group.add(makeStairs(M));

  // Tea room.
  group.add(makeTeaRoom(M));
  const teaPendant = makePendant(M, [-8.65, -3.4], { height: 2.7, radius: 0.28, intensity: 6.5, distance: 5.5 });
  group.add(teaPendant.group);
  warmLights.push({ light: teaPendant.light, base: 11 });

  // Master bedroom.
  const bed = makeBed(M, [-2.55, -7.8], 2.2, 2.25);
  bed.position.y = 3.33;
  group.add(bed);
  group.add(box(3.2, 0.055, 0.03, M.brassDark, [0, 1.72, -8.85], { cast: false }));
  const bedsideLeft = makeBedside(M, [-4.15, -8.95]);
  const bedsideRight = makeBedside(M, [-0.95, -8.95]);
  bedsideLeft.group.position.y = 3.33;
  bedsideRight.group.position.y = 3.33;
  group.add(bedsideLeft.group, bedsideRight.group);
  warmLights.push({ light: bedsideLeft.light, base: 9 }, { light: bedsideRight.light, base: 9 });
  group.add(makeRug(M, 3.8, 2.3, [-2.55, -5.85], M.linen, 3.39));
  const bedBench = new THREE.Group();
  bedBench.position.set(-2.55, 3.33, -6.0);
  bedBench.add(roundedBox(2.0, 0.16, 0.52, 0.06, M.woodDark, [0, 0.47, 0]));
  bedBench.add(roundedBox(1.85, 0.12, 0.42, 0.05, M.linen, [0, 0.61, 0]));
  for (const x of [-0.82, 0.82]) {
    bedBench.add(box(0.08, 0.45, 0.42, M.woodDeep, [x, 0.22, 0]));
  }
  group.add(bedBench);
  const bedroomPlant = new THREE.Group();
  bedroomPlant.position.set(-5.5, 3.33, -2.55);
  bedroomPlant.add(cylinder(0.24, 0.2, 0.42, M.charcoal, [0, 0.21, 0], { radialSegments: 16 }));
  for (let index = 0; index < 5; index++) {
    const leaf = plane(0.28, 0.7, M.leaf, [(index - 2) * 0.07, 0.72 + index * 0.035, (index % 2) * 0.04]);
    leaf.rotation.z = (index - 2) * 0.17;
    bedroomPlant.add(leaf);
  }
  group.add(bedroomPlant);

  group.add(box(1.8, 2.25, 0.55, M.woodDark, [-5.7, 4.48, -7.8]));
  for (let index = 0; index < 3; index++) {
    group.add(box(0.03, 2.15, 0.56, M.woodDeep, [-6.2 + index * 0.5, 4.48, -7.5], { cast: false }));
  }
  const masterPendant = makePendant(M, [-2.55, -5.95], { height: 5.75, radius: 0.24, intensity: 5.5, distance: 4.5 });
  group.add(masterPendant.group);
  warmLights.push({ light: masterPendant.light, base: 9 });

  const upperFill = new THREE.PointLight(0xffbe82, 7, 10, 2);
  upperFill.position.set(-1.7, 5.6, -5.1);
  group.add(upperFill);
  warmLights.push({ light: upperFill, base: 7 });

  // Timber headboard wall in the master suite.
  for (let x = -4.35; x <= -0.65; x += 0.16) {
    group.add(box(0.06, 2.2, 0.045, M.woodDark, [x, 4.72, -10.08], { cast: false }));
  }
  group.add(box(3.95, 0.08, 0.13, M.woodDeep, [-2.5, 5.83, -10.04], { cast: false }));

  // Second bedroom / study.
  const secondBed = makeBed(M, [4.25, -8.15], 1.75, 2.05);
  secondBed.position.y = 3.33;
  group.add(secondBed);
  const upperSide = makeSideTable(M, [2.95, -8.95]);
  upperSide.position.y = 3.33;
  group.add(upperSide);
  group.add(box(2.2, 0.07, 0.7, M.wood, [4.45, 4.0, -3.95]));
  group.add(box(0.06, 0.6, 0.06, M.woodDeep, [3.42, 3.7, -3.95]));
  group.add(box(0.06, 0.6, 0.06, M.woodDeep, [5.48, 3.7, -3.95]));
  const studyPendant = makePendant(M, [4.15, -6.2], { height: 5.8, radius: 0.2, intensity: 4.5, distance: 4.2 });
  group.add(studyPendant.group);
  warmLights.push({ light: studyPendant.light, base: 7.5 });

  // Stair opening railing on the upper floor.
  for (let index = 0; index < 8; index++) {
    group.add(box(0.04, 0.9, 0.04, M.woodDark, [5.04, 3.8, -2.2 - index * 0.44], { cast: false }));
    group.add(box(0.04, 0.9, 0.04, M.woodDark, [6.25, 3.8, -2.2 - index * 0.44], { cast: false }));
  }
  group.add(box(0.07, 0.07, 3.5, M.woodDeep, [5.04, 4.24, -3.75], { cast: false }));
  group.add(box(0.07, 0.07, 3.5, M.woodDeep, [6.25, 4.24, -3.75], { cast: false }));

  // Soft shadows beneath large pieces.
  for (const [x, z, w, d] of [[-2.65, -7.9, 3.5, 1.6], [3.95, -6.55, 3.2, 2.0], [-2.55, -7.8, 3.0, 2.8], [4.25, -8.15, 2.6, 2.7]]) {
    addContactShadow(group, M.shadowTexture, [x, 0.1, z], [w, d], 0.22);
  }

  markShadows(group, true, true);
  group.traverse((object) => {
    if (object.isMesh && object.material === M.windowGlow) object.castShadow = false;
  });

  return {
    group,
    warmLights,
    glowMaterials: [M.windowGlow],
    emissiveMaterials: [M.paper, M.lantern, M.warmGlow]
  };
}



