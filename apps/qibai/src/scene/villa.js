import * as THREE from 'three';
import { box, cylinder, plane, markShadows } from './helpers.js';

function createLatticeWindow(M, width, height, cols = 3, rows = 3, options = {}) {
  const group = new THREE.Group();
  const frame = options.frame || M.woodDark;
  const bar = 0.055;
  const depth = 0.1;
  const outer = options.outer ?? 0.075;

  group.add(box(width, outer, depth, frame, [0, height / 2 - outer / 2, 0]));
  group.add(box(width, outer, depth, frame, [0, -height / 2 + outer / 2, 0]));
  group.add(box(outer, height, depth, frame, [-width / 2 + outer / 2, 0, 0]));
  group.add(box(outer, height, depth, frame, [width / 2 - outer / 2, 0, 0]));

  for (let index = 1; index < cols; index++) {
    const x = -width / 2 + (width / cols) * index;
    group.add(box(bar, height - outer * 1.1, depth * 0.82, frame, [x, 0, 0.012]));
  }
  for (let index = 1; index < rows; index++) {
    const y = -height / 2 + (height / rows) * index;
    group.add(box(width - outer * 1.1, bar, depth * 0.82, frame, [0, y, 0.012]));
  }

  const glass = plane(width - outer * 1.8, height - outer * 1.8, M.glass, [0, 0, -0.004]);
  glass.castShadow = false;
  group.add(glass);

  if (options.glow !== false) {
    const glow = plane(width * 0.9, height * 0.9, M.windowGlow, [0, 0, -0.035]);
    glow.castShadow = false;
    group.add(glow);
  }

  return group;
}

function createPictureWindow(M, width, height) {
  const group = new THREE.Group();
  const bar = 0.06;
  const frame = M.woodDark;
  group.add(box(width, 0.08, 0.12, frame, [0, height / 2, 0]));
  group.add(box(width, 0.08, 0.12, frame, [0, -height / 2, 0]));
  group.add(box(0.08, height, 0.12, frame, [-width / 2, 0, 0]));
  group.add(box(0.08, height, 0.12, frame, [width / 2, 0, 0]));
  for (const ratio of [0.33, 0.66]) {
    group.add(box(bar, height, 0.11, frame, [-width / 2 + width * ratio, 0, 0.01]));
  }
  const glass = plane(width - 0.12, height - 0.12, M.glass, [0, 0, -0.004]);
  group.add(glass);
  const glow = plane(width * 0.94, height * 0.94, M.windowGlow, [0, 0, -0.035]);
  group.add(glow);
  return group;
}

function createGableEnd(M, zEaveFront, zEaveBack, eaveY, ridgeY, x, direction) {
  const shape = new THREE.Shape();
  if (direction === 'right') {
    shape.moveTo(-zEaveFront, eaveY);
    shape.lineTo(-zEaveBack, eaveY);
    shape.lineTo(-(zEaveFront + zEaveBack) / 2, ridgeY);
  } else {
    shape.moveTo(zEaveBack, eaveY);
    shape.lineTo(zEaveFront, eaveY);
    shape.lineTo((zEaveFront + zEaveBack) / 2, ridgeY);
  }
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  const material = M.wall;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = direction === 'right' ? 'gable-right' : 'gable-left';
  mesh.rotation.y = direction === 'right' ? Math.PI / 2 : -Math.PI / 2;
  mesh.position.x = x;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createEaveTip(M, start, end) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
    new THREE.Vector3(end[0] + Math.sign(end[0]) * 0.14, end[1] + 0.18, end[2] + 0.12)
  ]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.055, 6, false), M.roofDark);
}

function createMainRoof(M) {
  const group = new THREE.Group();
  const eaveY = 6.52;
  const ridgeY = 8.46;
  const ridgeZ = -5.5;
  const frontEaveZ = 0.28;
  const backEaveZ = -11.28;
  const width = 14.75;

  const frontDepth = Math.hypot(frontEaveZ - ridgeZ, ridgeY - eaveY);
  const backDepth = Math.hypot(ridgeZ - backEaveZ, ridgeY - eaveY);
  const angle = Math.atan2(ridgeY - eaveY, frontEaveZ - ridgeZ);

  const front = box(width, 0.16, frontDepth, M.roof, [0, (ridgeY + eaveY) / 2, (ridgeZ + frontEaveZ) / 2]);
  front.rotation.x = angle;
  group.add(front);

  const back = box(width, 0.16, backDepth, M.roof, [0, (ridgeY + eaveY) / 2, (ridgeZ + backEaveZ) / 2]);
  back.rotation.x = -angle;
  group.add(back);

  group.add(box(width + 0.12, 0.24, 0.22, M.woodDeep, [0, eaveY - 0.03, frontEaveZ + 0.02]));
  group.add(box(width + 0.12, 0.24, 0.22, M.woodDeep, [0, eaveY - 0.03, backEaveZ - 0.02]));

  const ridge = cylinder(0.14, 0.14, width + 0.2, M.roofDark, [0, ridgeY + 0.04, ridgeZ], {
    radialSegments: 10,
    rotation: [0, 0, Math.PI / 2]
  });
  group.add(ridge);

  const ridgeBeam = box(width + 0.1, 0.16, 0.34, M.woodDeep, [0, ridgeY - 0.08, ridgeZ]);
  group.add(ridgeBeam);

  const tips = [
    [[-width / 2, eaveY - 0.02, frontEaveZ], [-width / 2 - 0.18, eaveY + 0.16, frontEaveZ + 0.12]],
    [[width / 2, eaveY - 0.02, frontEaveZ], [width / 2 + 0.18, eaveY + 0.16, frontEaveZ + 0.12]],
    [[-width / 2, eaveY - 0.02, backEaveZ], [-width / 2 - 0.18, eaveY + 0.16, backEaveZ - 0.12]],
    [[width / 2, eaveY - 0.02, backEaveZ], [width / 2 + 0.18, eaveY + 0.16, backEaveZ - 0.12]]
  ];
  for (const [start, end] of tips) group.add(createEaveTip(M, start, end));

  group.add(createGableEnd(M, frontEaveZ, backEaveZ, eaveY + 0.03, ridgeY - 0.03, 6.64, 'right'));
  group.add(createGableEnd(M, frontEaveZ, backEaveZ, eaveY + 0.03, ridgeY - 0.03, -6.64, 'left'));

  markShadows(group, true, true);
  group.traverse((object) => {
    if (object.isMesh && object.material === M.windowGlow) object.castShadow = false;
  });
  return group;
}

function createWingRoof(M) {
  const group = new THREE.Group();
  const eaveY = 3.08;
  const ridgeY = 4.26;
  const ridgeX = -8.7;
  const leftEaveX = -11.08;
  const rightEaveX = -6.38;
  const depth = 6.05;
  const angle = Math.atan2(ridgeY - eaveY, Math.abs(leftEaveX - ridgeX));
  const slope = Math.hypot(ridgeY - eaveY, Math.abs(leftEaveX - ridgeX));

  const left = box(slope, 0.14, depth, M.roof, [(ridgeX + leftEaveX) / 2, (ridgeY + eaveY) / 2, -3.5]);
  left.rotation.z = angle;
  group.add(left);

  const right = box(slope, 0.14, depth, M.roof, [(ridgeX + rightEaveX) / 2, (ridgeY + eaveY) / 2, -3.5]);
  right.rotation.z = -angle;
  group.add(right);

  group.add(box(0.2, 0.2, depth, M.woodDeep, [leftEaveX - 0.02, eaveY - 0.03, -3.5]));
  group.add(box(0.2, 0.2, depth, M.woodDeep, [rightEaveX + 0.02, eaveY - 0.03, -3.5]));

  const ridge = cylinder(0.12, 0.12, depth + 0.18, M.roofDark, [ridgeX, ridgeY + 0.03, -3.5], {
    radialSegments: 10,
    rotation: [Math.PI / 2, 0, 0]
  });
  group.add(ridge);

  markShadows(group, true, true);
  return group;
}

function createPorchRoof(M) {
  const group = new THREE.Group();
  const canopy = box(4.9, 0.13, 2.5, M.roof, [0, 3.14, 0.55]);
  canopy.rotation.x = 0.12;
  group.add(canopy);
  const fascia = box(5.0, 0.16, 0.18, M.woodDeep, [0, 3.02, 1.74]);
  group.add(fascia);
  markShadows(group, true, true);
  return group;
}

function createPlaque(M) {
  const group = new THREE.Group();
  const backing = box(1.62, 0.54, 0.08, M.woodDeep, [0, 0, 0]);
  group.add(backing);
  const face = plane(1.48, 0.43, M.plaque, [0, 0, 0.046]);
  face.material = M.plaque;
  group.add(face);
  return group;
}

function createSconce(M) {
  const group = new THREE.Group();
  group.add(box(0.12, 0.38, 0.14, M.brassDark, [0, 0, 0]));
  const shade = cylinder(0.1, 0.13, 0.32, M.lantern, [0, -0.18, 0.14], { radialSegments: 10, cast: false });
  group.add(shade);
  const light = new THREE.PointLight(0xffb46b, 2.2, 4.5, 2);
  light.position.set(0, -0.18, 0.28);
  group.add(light);
  return { group, light };
}

export function createVilla(M) {
  const group = new THREE.Group();
  group.name = 'villa';

  const shell = new THREE.Group();
  shell.name = 'villa-shell';
  const facade = new THREE.Group();
  facade.name = 'villa-facade';
  const roof = new THREE.Group();
  roof.name = 'villa-roof';
  const details = new THREE.Group();
  details.name = 'villa-details';
  group.add(shell, facade, roof, details);

  const warmLights = [];
  const exteriorLights = [];

  // Foundation and floor slabs.
  shell.add(box(14.0, 0.32, 10.3, M.stoneDark, [0, 0.16, -5.6], { cast: false }));
  shell.add(box(13.4, 0.24, 9.8, M.wallWarm, [0, 3.17, -5.6], { cast: true }));

  // Main exterior shell: back and two side walls.
  shell.add(box(13.4, 6.34, 0.3, M.wall, [0, 3.33, -10.34]));
  shell.add(box(0.3, 6.34, 9.6, M.wall, [-6.55, 3.33, -5.5]));
  shell.add(box(0.3, 6.34, 9.6, M.wall, [6.55, 3.33, -5.5]));

  // Side wing shell.
  shell.add(box(0.3, 3.2, 5.6, M.wall, [-10.92, 1.72, -3.5]));
  shell.add(box(4.5, 3.2, 0.3, M.wall, [-8.7, 1.72, -6.25]));
  shell.add(box(4.5, 0.12, 5.8, M.stoneDark, [-8.7, 0.08, -3.5], { cast: false }));

  // Side windows.
  const rightWindow = createLatticeWindow(M, 1.55, 1.7, 3, 3);
  rightWindow.rotation.y = Math.PI / 2;
  rightWindow.position.set(6.72, 4.65, -7.2);
  facade.add(rightWindow);
  const leftWindow = createLatticeWindow(M, 1.35, 1.55, 3, 3);
  leftWindow.rotation.y = -Math.PI / 2;
  leftWindow.position.set(-6.72, 4.5, -7.8);
  facade.add(leftWindow);

  // Ground floor front facade: piers, glazing and entrance.
  facade.add(box(1.2, 3.18, 0.26, M.wall, [-6.0, 1.58, -0.82]));
  facade.add(box(1.7, 3.18, 0.26, M.wall, [5.72, 1.58, -0.82]));
  facade.add(box(13.2, 0.18, 0.26, M.wall, [0, 3.17, -0.82]));

  const livingGlass = createPictureWindow(M, 4.8, 2.64);
  livingGlass.position.set(-2.65, 1.5, -0.72);
  facade.add(livingGlass);

  const diningGlass = createLatticeWindow(M, 2.1, 2.64, 2, 4);
  diningGlass.position.set(3.55, 1.5, -0.72);
  facade.add(diningGlass);

  // Entrance door set into the center.
  facade.add(box(2.7, 0.18, 0.35, M.stoneDark, [0.15, 0.12, 0.9]));
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0.15, 0.2, -0.72);
  for (const side of [-1, 1]) {
    const door = box(1.12, 2.45, 0.1, M.woodDeep, [side * 0.59, 1.23, 0]);
    doorGroup.add(door);
    for (let index = 0; index < 4; index++) {
      doorGroup.add(box(0.015, 2.1, 0.012, M.woodDark, [side * 0.59 - 0.4 + index * 0.26, 1.28, 0.056], { cast: false }));
    }
    const handle = cylinder(0.035, 0.035, 0.18, M.brass, [side * 0.12, 1.16, 0.1], {
      radialSegments: 10,
      rotation: [Math.PI / 2, 0, 0],
      cast: false
    });
    doorGroup.add(handle);
  }
  facade.add(doorGroup);

  const transom = createLatticeWindow(M, 2.4, 0.62, 4, 1, { glow: true });
  transom.position.set(0.15, 3.03, -0.71);
  facade.add(transom);

  // Entrance porch, columns and steps.
  for (const x of [-2.03, 1.9]) {
    const post = box(0.2, 3.0, 0.2, M.woodDeep, [x, 1.55, 1.42]);
    facade.add(post);
    facade.add(box(0.34, 0.12, 0.34, M.stoneDark, [x, 0.1, 1.42], { cast: false }));
  }
  facade.add(box(4.55, 0.16, 0.34, M.woodDeep, [0, 3.07, 1.42]));
  facade.add(box(4.6, 0.16, 0.4, M.stoneDark, [0, 0.08, 0.72], { cast: false }));
  facade.add(box(4.2, 0.16, 0.34, M.stone, [0, 0.2, 0.62], { cast: false }));
  facade.add(box(3.8, 0.16, 0.3, M.stone, [0, 0.36, 0.52], { cast: false }));

  const plaque = createPlaque(M);
  plaque.position.set(0.15, 2.92, -0.63);
  facade.add(plaque);

  // Wall sconces beside the door.
  for (const x of [-1.45, 1.7]) {
    const sconce = createSconce(M);
    sconce.group.position.set(x, 2.34, -0.62);
    facade.add(sconce.group);
    exteriorLights.push({ light: sconce.light, base: 2.2 });
  }

  // Upper floor front volume, windows and balcony.
  facade.add(box(13.2, 3.15, 0.28, M.wall, [0, 4.72, -0.82]));
  facade.add(box(13.5, 0.2, 0.36, M.woodDeep, [0, 6.26, -0.8]));

  const upperLeft = createLatticeWindow(M, 2.5, 1.35, 4, 3);
  upperLeft.position.set(-4.4, 4.64, -0.67);
  facade.add(upperLeft);
  const upperCenter = createLatticeWindow(M, 1.5, 1.25, 3, 3);
  upperCenter.position.set(-1.1, 4.64, -0.67);
  facade.add(upperCenter);

  const balcony = new THREE.Group();
  balcony.position.set(3.15, 3.16, 0.5);
  facade.add(balcony);
  balcony.add(box(5.5, 0.18, 1.68, M.wood, [0, 0, 0]));
  balcony.add(box(5.5, 0.12, 0.1, M.woodDeep, [0, 0.81, 0.78]));
  balcony.add(box(5.5, 0.07, 0.07, M.woodDeep, [0, 0.36, 0.78]));
  for (let x = -2.65; x <= 2.65; x += 0.16) {
    balcony.add(box(0.045, 0.8, 0.045, M.woodDark, [x, 0.4, 0.78], { cast: false }));
  }
  balcony.add(box(0.1, 0.86, 1.68, M.woodDeep, [-2.7, 0.4, 0]));
  balcony.add(box(0.1, 0.86, 1.68, M.woodDeep, [2.7, 0.4, 0]));
  balcony.add(box(0.08, 0.08, 1.65, M.woodDeep, [-2.7, 0.8, 0]));
  balcony.add(box(0.08, 0.08, 1.65, M.woodDeep, [2.7, 0.8, 0]));

  const balconyDoor = createPictureWindow(M, 3.1, 2.25);
  balconyDoor.position.set(3.15, 4.43, -0.65);
  facade.add(balconyDoor);

  // Vertical timber screen on the upper left.
  for (let x = -6.95; x < -5.86; x += 0.12) {
    facade.add(box(0.05, 1.85, 0.15, M.woodDark, [x, 4.66, -0.55], { cast: false }));
  }

  // Side wing glass front and tea room window.
  const teaGlass = createPictureWindow(M, 3.5, 2.35);
  teaGlass.position.set(-8.65, 1.45, -0.72);
  facade.add(teaGlass);
  const teaSide = createLatticeWindow(M, 2.2, 1.65, 4, 3);
  teaSide.rotation.y = -Math.PI / 2;
  teaSide.position.set(-10.74, 1.65, -3.35);
  facade.add(teaSide);

  // Rain-chain detail at the right eave.
  const chain = new THREE.Group();
  for (let index = 0; index < 13; index++) {
    chain.add(cylinder(0.018, 0.018, 0.16, M.brassDark, [0, 6.2 - index * 0.18, 0], { radialSegments: 6, cast: false }));
  }
  chain.position.set(6.2, 0, 0.35);
  details.add(chain);

  // Roof groups.
  roof.add(createMainRoof(M));
  roof.add(createWingRoof(M));
  roof.add(createPorchRoof(M));

  // Timber brackets under the main front eave.
  for (let x = -6.35; x <= 6.35; x += 1.27) {
    roof.add(box(0.16, 0.46, 0.16, M.woodDeep, [x, 6.28, 0.18], { cast: false }));
    roof.add(box(0.58, 0.12, 0.16, M.woodDeep, [x, 6.11, 0.2], { cast: false }));
    roof.add(box(0.12, 0.28, 0.52, M.woodDark, [x, 6.2, -0.04], { cast: false }));
  }

  // Subtle foundation planting strip at the base.
  shell.add(box(13.6, 0.18, 0.36, M.moss, [0, 0.27, -0.38], { cast: false }));

  markShadows(shell, true, true);
  markShadows(facade, true, true);
  markShadows(details, true, true);

  // Register the shared window glow material later in main; keep a list of
  // unique materials for emissive registration.
  const emissiveMaterials = [M.lantern];
  const glowMaterials = [M.windowGlow];

  function setCutaway(enabled) {
    facade.visible = !enabled;
    roof.visible = !enabled;
    details.visible = !enabled;
  }

  return {
    group,
    shell,
    facade,
    roof,
    details,
    setCutaway,
    warmLights,
    exteriorLights,
    glowMaterials,
    emissiveMaterials,
    anchors: {
      entrance: [0, 2.2, 0.4],
      balcony: [3.1, 4.4, 0.9]
    }
  };
}


