import * as THREE from 'three';
import { PLATE_TEXT } from './materials.js';
import { box, plane, roundedBox, cylinder, addContactShadow, mulberry32, easeInOutCubic, clamp } from './helpers.js';

const DRIVE_POINTS = [
  [9.68, 0, 7.25],
  [9.68, 0, 9.75],
  [9.68, 0, 12.25],
  [9.68, 0, 14.05],
  [10.35, 0, 15.4],
  [11.8, 0, 17.25]
];

function makeWheel(M, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0.38, z);
  const tire = cylinder(0.38, 0.38, 0.25, M.tire, [0, 0, 0], {
    radialSegments: 28,
    rotation: [0, 0, Math.PI / 2]
  });
  group.add(tire);
  const rim = cylinder(0.24, 0.24, 0.26, M.rim, [0, 0, 0], {
    radialSegments: 22,
    rotation: [0, 0, Math.PI / 2],
    cast: false
  });
  group.add(rim);
  const cap = cylinder(0.09, 0.09, 0.272, M.blackMetal, [0, 0, 0], {
    radialSegments: 16,
    rotation: [0, 0, Math.PI / 2],
    cast: false
  });
  group.add(cap);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.015, 8, 28), M.rim);
  ring.rotation.y = Math.PI / 2;
  ring.position.x = Math.sign(x) * 0.135;
  ring.castShadow = false;
  group.add(ring);
  for (let index = 0; index < 5; index++) {
    const pivot = new THREE.Group();
    pivot.position.set(Math.sign(x) * 0.137, 0, 0);
    pivot.rotation.x = (index / 5) * Math.PI * 2;
    const bar = box(0.022, 0.025, 0.35, M.rim, [0, 0, 0], { cast: false });
    bar.position.z = 0;
    pivot.add(bar);
    group.add(pivot);
  }
  return group;
}

function makePlate(M, z, y, rotate = false) {
  const group = new THREE.Group();
  group.position.set(0, y, z);
  if (rotate) group.rotation.y = Math.PI;
  group.add(box(0.82, 0.26, 0.028, M.carTrim, [0, 0, -0.018], { cast: false }));
  const plate = plane(0.76, 0.19, M.plate, [0, 0, 0.002]);
  plate.castShadow = false;
  group.add(plate);
  for (const x of [-0.32, 0.32]) {
    const screw = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), M.rim);
    screw.position.set(x, 0, 0.012);
    group.add(screw);
  }
  return group;
}

function makeCar(M) {
  const group = new THREE.Group();
  group.name = 'white-car';
  group.position.set(9.68, 0, 7.25);
  const wheels = [];
  const frontWheels = [];
  const rearWheels = [];

  // Lower body and shoulder.
  group.add(roundedBox(1.86, 0.34, 4.62, 0.14, M.carPaint, [0, 0.55, 0], { segments: 6 }));
  group.add(roundedBox(1.8, 0.28, 4.4, 0.12, M.carPaint, [0, 0.79, 0], { segments: 5 }));
  group.add(roundedBox(1.9, 0.1, 4.32, 0.06, M.carTrim, [0, 0.39, 0], { cast: false }));
  group.add(roundedBox(1.82, 0.12, 4.48, 0.06, M.carTrim, [0, 0.88, 0], { cast: false }));

  // Hood and trunk.
  const hood = roundedBox(1.7, 0.16, 1.12, 0.08, M.carPaint, [0, 0.99, 1.55], { segments: 5 });
  hood.rotation.x = -0.02;
  group.add(hood);
  group.add(roundedBox(1.7, 0.14, 0.94, 0.07, M.carPaint, [0, 0.98, -1.63], { segments: 5 }));

  // Cabin and roof: a tapered greenhouse reads more like a sedan than a box.
  const cabinGeometry = new THREE.BoxGeometry(1.66, 0.46, 2.56, 1, 1, 1);
  const cabinPositions = cabinGeometry.attributes.position;
  for (let index = 0; index < cabinPositions.count; index++) {
    if (cabinPositions.getY(index) > 0) {
      cabinPositions.setX(index, cabinPositions.getX(index) * 0.86);
      cabinPositions.setZ(index, cabinPositions.getZ(index) * 0.74 - 0.07);
    }
  }
  cabinPositions.needsUpdate = true;
  cabinGeometry.computeVertexNormals();
  const cabin = new THREE.Mesh(cabinGeometry, M.carPaintSoft);
  cabin.position.set(0, 1.08, -0.05);
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  group.add(cabin);
  group.add(roundedBox(1.4, 0.075, 1.88, 0.055, M.carPaint, [0, 1.32, -0.15], { segments: 5 }));

  // Side glass bands, with a white pillar dividing the doors.
  for (const side of [-1, 1]) {
    group.add(roundedBox(0.02, 0.28, 1.9, 0.015, M.carGlass, [side * 0.805, 1.14, -0.06], { cast: false }));
    group.add(roundedBox(0.018, 0.27, 0.17, 0.012, M.carPaint, [side * 0.819, 1.14, -0.12], { cast: false }));
    group.add(roundedBox(0.018, 0.27, 0.12, 0.012, M.carPaint, [side * 0.819, 1.14, 0.8], { cast: false }));
    group.add(roundedBox(0.018, 0.27, 0.18, 0.012, M.carPaint, [side * 0.819, 1.14, -0.98], { cast: false }));
    group.add(box(0.018, 0.012, 2.0, M.rim, [side * 0.815, 1.0, -0.06], { cast: false }));
  }

  // Windscreens.
  const windshield = roundedBox(1.46, 0.36, 0.035, 0.025, M.carGlass, [0, 1.12, 1.04], { rotation: [-0.62, 0, 0], cast: false });
  group.add(windshield);
  const rearGlass = roundedBox(1.42, 0.32, 0.035, 0.025, M.carGlass, [0, 1.11, -1.2], { rotation: [0.64, 0, 0], cast: false });
  group.add(rearGlass);

  // Wheels and wheel wells.
  for (const x of [-1, 1]) {
    for (const z of [-1.46, 1.47]) {
      const wheel = makeWheel(M, x * 0.9, z);
      wheels.push(wheel);
      if (z > 0) frontWheels.push(wheel);
      else rearWheels.push(wheel);
      group.add(wheel);
      const well = cylinder(0.43, 0.43, 0.08, M.charcoal, [x * 0.82, 0.4, z], {
        radialSegments: 22,
        rotation: [0, 0, Math.PI / 2],
        cast: false
      });
      group.add(well);
    }
  }

  // Front face: grille, intake, headlights and plate.
  group.add(box(0.82, 0.2, 0.06, M.carTrim, [0, 0.63, 2.31], { cast: false }));
  for (let index = 0; index < 5; index++) {
    group.add(box(0.76, 0.012, 0.02, M.rim, [0, 0.57 + index * 0.027, 2.345], { cast: false }));
  }
  group.add(box(1.02, 0.13, 0.05, M.carTrim, [0, 0.43, 2.28], { cast: false }));
  group.add(box(0.47, 0.07, 0.04, M.headlight, [-0.57, 0.88, 2.315], { cast: false }));
  group.add(box(0.47, 0.07, 0.04, M.headlight, [0.57, 0.88, 2.315], { cast: false }));
  group.add(box(0.38, 0.035, 0.025, M.carTrim, [0, 0.95, 2.34], { cast: false }));
  group.add(makePlate(M, 2.37, 0.62));

  // Rear face.
  group.add(box(0.72, 0.1, 0.04, M.taillight, [-0.5, 0.91, -2.32], { cast: false }));
  group.add(box(0.72, 0.1, 0.04, M.taillight, [0.5, 0.91, -2.32], { cast: false }));
  group.add(box(0.88, 0.045, 0.03, M.taillight, [0, 1.0, -2.34], { cast: false }));
  group.add(box(0.5, 0.17, 0.05, M.carTrim, [0, 0.6, -2.31], { cast: false }));
  group.add(makePlate(M, -2.37, 0.62, true));

  // Mirrors, handles and side detailing.
  for (const side of [-1, 1]) {
    const mirror = new THREE.Group();
    mirror.position.set(side * 0.98, 1.02, 0.82);
    group.add(mirror);
    mirror.add(roundedBox(0.23, 0.1, 0.09, 0.035, M.carPaint, [0, 0, 0], { cast: true }));
    mirror.add(roundedBox(0.2, 0.07, 0.065, 0.025, M.carGlass, [side * 0.02, 0, 0.005], { cast: false }));
    mirror.add(cylinder(0.028, 0.028, 0.2, M.carPaintSoft, [-side * 0.12, -0.005, -0.02], {
      radialSegments: 8,
      rotation: [0, 0, Math.PI / 2],
      cast: false
    }));
    for (const z of [0.34, -0.66]) {
      group.add(roundedBox(0.025, 0.045, 0.23, 0.02, M.rim, [side * 0.925, 0.95, z], { cast: false }));
    }
    group.add(box(0.012, 0.025, 3.7, M.carTrim, [side * 0.94, 0.94, -0.05], { cast: false }));
    group.add(box(0.08, 0.18, 0.1, M.carPaint, [side * 0.9, 1.05, 1.03], { cast: false }));
  }

  // Soft contact shadow and petals caught on the car.
  addContactShadow(group, M.shadowTexture, [0, 0.045, 0], [3.6, 6.7], 0.38);
  const rng = mulberry32(1009);
  for (let index = 0; index < 12; index++) {
    const petal = plane(0.11, 0.052, M.petal, [
      -0.8 + rng() * 1.6,
      1.36 + rng() * 0.03,
      -1.4 + rng() * 2.7
    ]);
    petal.rotation.set(-Math.PI / 2, rng() * Math.PI, (rng() - 0.5) * 0.5);
    group.add(petal);
  }
  for (let index = 0; index < 5; index++) {
    const petal = plane(0.1, 0.05, M.petal, [
      -0.7 + rng() * 1.4,
      1.07 + rng() * 0.02,
      1.15 + rng() * 0.55
    ]);
    petal.rotation.set(-Math.PI / 2, rng() * Math.PI, (rng() - 0.5) * 0.4);
    group.add(petal);
  }

  group.traverse((object) => {
    if (!object.isMesh) return;
    if (object.material === M.plate) {
      object.castShadow = false;
      object.receiveShadow = false;
    }
  });

  const driveCurve = new THREE.CatmullRomCurve3(
    DRIVE_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    'catmullrom',
    0.2
  );
  const driveLength = driveCurve.getLength();
  let driveT = 0;
  let animation = null;

  function applyDrivePosition(t) {
    const clamped = clamp(t, 0, 1);
    const point = driveCurve.getPointAt(clamped);
    const tangent = driveCurve.getTangentAt(clamped);
    group.position.set(point.x, 0, point.z);
    group.rotation.y = Math.atan2(tangent.x, tangent.z);
  }

  function startDrive(out) {
    if (animation) return false;
    const target = out ? 1 : 0;
    if (Math.abs(target - driveT) < 0.0005) return false;
    animation = {
      from: driveT,
      to: target,
      startedAt: performance.now(),
      duration: 2.35 + Math.abs(target - driveT) * 0.65
    };
    return true;
  }

  function updateDrive(dt, now = performance.now()) {
    if (!animation) return null;
    const previous = driveT;
    const raw = clamp((now - animation.startedAt) / (animation.duration * 1000), 0, 1);
    const eased = easeInOutCubic(raw);
    driveT = animation.from + (animation.to - animation.from) * eased;
    applyDrivePosition(driveT);
    const deltaDistance = (driveT - previous) * driveLength;
    for (const wheel of wheels) {
      wheel.rotation.x -= deltaDistance / 0.38;
    }
    const steering = Math.sin(Math.PI * raw) * 0.13;
    for (const wheel of frontWheels) wheel.rotation.y = steering;
    if (raw >= 1) {
      const result = animation.to === 1 ? 'outside' : 'parked';
      animation = null;
      for (const wheel of frontWheels) wheel.rotation.y = 0;
      applyDrivePosition(driveT);
      return result;
    }
    return 'driving';
  }

  function getDriveState() {
    return {
      progress: driveT,
      outside: driveT > 0.995,
      parked: driveT < 0.005,
      driving: Boolean(animation)
    };
  }

  function setDriveProgress(t) {
    animation = null;
    driveT = clamp(t, 0, 1);
    applyDrivePosition(driveT);
    for (const wheel of frontWheels) wheel.rotation.y = 0;
    return getDriveState();
  }

  return {
    group,
    plateText: PLATE_TEXT,
    driveOut: () => startDrive(true),
    driveIn: () => startDrive(false),
    updateDrive,
    getDriveState,
    setDriveProgress,
    driveCurve,
    anchors: {
      car: [9.68, 1.2, 7.25],
      plate: [9.68, 0.62, 9.62]
    },
    emissiveMaterials: [M.headlight]
  };
}

export { makeCar };

