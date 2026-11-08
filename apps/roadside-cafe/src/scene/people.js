import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

function addMesh(parent, geometry, material, position, rotation) {
  const mesh = new THREE.Mesh(geometry, material);
  if (position) mesh.position.set(position[0], position[1], position[2]);
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function capsule(radius, length, capSegments = 4, radialSegments = 10) {
  return new THREE.CapsuleGeometry(radius, length, capSegments, radialSegments);
}

function createLeg(parent, material, x, y, z) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  parent.add(pivot);
  const leg = new THREE.Mesh(capsule(0.072, 0.48), material);
  leg.position.y = -0.31;
  leg.castShadow = true;
  leg.receiveShadow = true;
  pivot.add(leg);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.27), material);
  foot.position.set(0, -0.64, 0.055);
  foot.castShadow = true;
  pivot.add(foot);
  return pivot;
}

function createArm(parent, material, x, y, z) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  parent.add(pivot);
  const arm = new THREE.Mesh(capsule(0.052, 0.36), material);
  arm.position.y = -0.23;
  arm.castShadow = true;
  arm.receiveShadow = true;
  pivot.add(arm);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), material);
  hand.position.y = -0.46;
  hand.castShadow = true;
  pivot.add(hand);
  return pivot;
}

function createHead(parent, MAT, { skin, hair, style = 'short', y = 1.55 }) {
  const group = new THREE.Group();
  group.position.y = y;
  parent.add(group);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.12, 8), MAT[skin]);
  neck.position.y = -0.14;
  neck.castShadow = true;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), MAT[skin]);
  head.scale.set(0.92, 1.05, 0.94);
  head.castShadow = true;
  group.add(head);

  const hairMat = MAT[hair];
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.123, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
  cap.position.y = 0.035;
  cap.scale.set(0.98, 1.02, 0.98);
  cap.castShadow = true;
  group.add(cap);

  if (style === 'long') {
    const back = new THREE.Mesh(capsule(0.095, 0.25), hairMat);
    back.position.set(0, -0.11, -0.055);
    back.castShadow = true;
    group.add(back);
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.04), hairMat);
    fringe.position.set(0, 0.055, 0.11);
    group.add(fringe);
  } else if (style === 'bun') {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), hairMat);
    bun.position.set(0, 0.1, -0.11);
    bun.castShadow = true;
    group.add(bun);
  } else if (style === 'soft') {
    const side = new THREE.Mesh(capsule(0.07, 0.13), hairMat);
    side.position.set(0.08, -0.04, 0.045);
    side.rotation.z = -0.2;
    group.add(side);
    const side2 = side.clone();
    side2.position.x = -0.08;
    side2.rotation.z = 0.2;
    group.add(side2);
  }

  return group;
}

function addUmbrella(root, MAT, color) {
  const group = new THREE.Group();
  group.position.set(0.28, 0.02, 0.02);
  group.visible = false;
  root.add(group);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.95, 6), MAT.metalDark);
  stem.position.set(0, 1.35, 0);
  stem.castShadow = true;
  group.add(stem);

  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.64, 0.22, 10, 1, true), MAT[color]);
  canopy.position.set(0, 1.88, 0);
  canopy.castShadow = true;
  group.add(canopy);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.008, 4, 20), MAT.metalDark);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 1.77, 0);
  group.add(rim);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 5, 10, Math.PI), MAT.oakDark);
  handle.position.set(0, 0.86, 0.02);
  handle.rotation.z = Math.PI / 2;
  group.add(handle);

  root.userData.umbrella = group;
  return group;
}

export function createPerson(MAT, options = {}) {
  const {
    skin = 'skin',
    hair = 'hairDark',
    hairStyle = 'short',
    top = 'shirtCream',
    bottom = 'denim',
    shoes = 'shoe',
    apron = false,
    umbrella = null,
    seated = false
  } = options;

  const root = new THREE.Group();

  if (seated) {
    const hipY = 0.52;
    // torso
    const torso = new THREE.Mesh(capsule(0.17, 0.34), MAT[top]);
    torso.position.set(0, hipY + 0.37, 0);
    torso.scale.set(1, 1, 0.82);
    torso.castShadow = true;
    root.add(torso);

    // thighs
    for (const side of [-1, 1]) {
      const thigh = new THREE.Mesh(capsule(0.075, 0.3), MAT[bottom]);
      thigh.rotation.x = Math.PI / 2;
      thigh.position.set(side * 0.1, hipY - 0.03, 0.22);
      thigh.castShadow = true;
      root.add(thigh);

      const shin = new THREE.Mesh(capsule(0.065, 0.32), MAT[bottom]);
      shin.position.set(side * 0.1, 0.26, 0.45);
      shin.castShadow = true;
      root.add(shin);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.065, 0.24), MAT[shoes]);
      foot.position.set(side * 0.1, 0.045, 0.53);
      foot.castShadow = true;
      root.add(foot);
    }

    // arms resting towards a table in front of the body
    const armL = createArm(root, MAT[top], 0.23, hipY + 0.63, 0);
    armL.rotation.set(-0.9, 0, 0.16);
    const armR = createArm(root, MAT[top], -0.23, hipY + 0.63, 0);
    armR.rotation.set(-0.9, 0, -0.16);

    const head = createHead(root, MAT, {
      skin,
      hair,
      style: hairStyle,
      y: hipY + 0.95
    });
    head.rotation.x = -0.04;

    root.userData.parts = { torso, armL, armR, head, seated: true };
    return root;
  }

  const hipY = 0.84;
  const legL = createLeg(root, MAT[bottom], 0.105, hipY, 0);
  const legR = createLeg(root, MAT[bottom], -0.105, hipY, 0);

  const torso = new THREE.Mesh(capsule(0.17, 0.4), MAT[top]);
  torso.position.set(0, hipY + 0.31, 0);
  torso.scale.set(1, 1, 0.82);
  torso.castShadow = true;
  root.add(torso);

  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), MAT[top]);
  shoulder.position.set(0, hipY + 0.62, 0);
  shoulder.scale.set(1, 0.55, 0.82);
  shoulder.castShadow = true;
  root.add(shoulder);

  const armL = createArm(root, MAT[top], 0.225, hipY + 0.55, 0);
  const armR = createArm(root, MAT[top], -0.225, hipY + 0.55, 0);
  armL.rotation.z = 0.08;
  armR.rotation.z = -0.08;

  if (apron) {
    const apronMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.48, 0.035), MAT.apron);
    apronMesh.position.set(0, hipY + 0.16, 0.15);
    apronMesh.castShadow = true;
    root.add(apronMesh);
    const apronBib = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.03), MAT.apron);
    apronBib.position.set(0, hipY + 0.53, 0.145);
    root.add(apronBib);
    const towel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.02), MAT.fabricCream);
    towel.position.set(0.19, hipY + 0.24, 0.16);
    towel.rotation.z = 0.08;
    root.add(towel);
  }

  const head = createHead(root, MAT, {
    skin,
    hair,
    style: hairStyle,
    y: hipY + 0.81
  });

  root.userData.parts = { legL, legR, armL, armR, head, torso, seated: false };
  root.userData.baseY = 0;

  if (umbrella) addUmbrella(root, MAT, umbrella);
  return root;
}

export function createCat(MAT) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.28, 4, 10), MAT.hairBrown);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0.14, 0);
  body.scale.set(1, 1, 0.9);
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 10), MAT.hairBrown);
  head.position.set(0.22, 0.2, 0);
  head.scale.set(1.1, 0.92, 1);
  head.castShadow = true;
  group.add(head);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.09, 4), MAT.hairBrown);
    ear.position.set(0.22, 0.31, side * 0.07);
    ear.rotation.z = -0.1;
    ear.castShadow = true;
    group.add(ear);
  }

  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.03, 5, 14, Math.PI * 1.25), MAT.hairBrown);
  tail.position.set(-0.24, 0.14, 0);
  tail.rotation.x = Math.PI / 2;
  tail.rotation.z = 0.3;
  tail.castShadow = true;
  group.add(tail);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), MAT.terracotta);
  nose.position.set(0.32, 0.19, 0);
  group.add(nose);

  return group;
}

export function createSteamSprite(MAT) {
  const material = MAT.steam.clone();
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.4, 0.55, 1);
  return sprite;
}
