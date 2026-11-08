import * as THREE from 'three';

/* Procedural but proportion-led figures: tapered torsos, jointed limbs,
   smaller heads and muted clothing. They are intentionally anonymous — no
   cartoon faces — so they read as people in the rain rather than toys. */

function addMesh(parent, geometry, material, position, rotation) {
  const mesh = new THREE.Mesh(geometry, material);
  if (position) mesh.position.set(position[0], position[1], position[2]);
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function capsule(radius, length, capSegments = 4, radialSegments = 12) {
  return new THREE.CapsuleGeometry(radius, length, capSegments, radialSegments);
}

function createTorso(MAT, material, seated = false) {
  const height = seated ? 0.54 : 0.64;
  const profile = seated
    ? [
        [0.155, 0.0],
        [0.17, 0.055],
        [0.155, 0.19],
        [0.168, 0.31],
        [0.185, 0.4],
        [0.18, 0.47],
        [0.12, 0.5],
        [0.062, 0.53]
      ]
    : [
        [0.155, 0.0],
        [0.17, 0.06],
        [0.155, 0.2],
        [0.16, 0.34],
        [0.185, 0.46],
        [0.18, 0.54],
        [0.12, 0.58],
        [0.062, 0.62]
      ];
  const points = profile.map(([radius, y]) => new THREE.Vector2(radius, y * (height / 0.62)));
  const geometry = new THREE.LatheGeometry(points, 18);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.z = 0.78;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createHead(parent, MAT, { skin, hair, style = 'short', y = 1.55 }) {
  const group = new THREE.Group();
  group.position.y = y;
  parent.add(group);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.052, 0.11, 10), MAT[skin]);
  neck.position.y = -0.145;
  neck.castShadow = true;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.102, 20, 16), MAT[skin]);
  head.scale.set(0.9, 1.04, 0.95);
  head.castShadow = true;
  group.add(head);

  /* Ears and a restrained nose keep the profile human without a mask-like face. */
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), MAT[skin]);
    ear.position.set(side * 0.093, 0.002, 0.004);
    ear.scale.set(0.55, 1, 0.75);
    group.add(ear);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.045, 6), MAT[skin]);
  nose.position.set(0, -0.006, 0.098);
  nose.rotation.x = Math.PI / 2;
  group.add(nose);

  const hairMat = MAT[hair];
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.106, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat
  );
  cap.position.y = 0.022;
  cap.scale.set(0.94, 1.04, 0.97);
  cap.castShadow = true;
  group.add(cap);

  if (style === 'long') {
    const back = new THREE.Mesh(capsule(0.075, 0.28), hairMat);
    back.position.set(0, -0.14, -0.048);
    back.scale.set(1.0, 1, 0.65);
    back.castShadow = true;
    group.add(back);
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.045, 0.035), hairMat);
    fringe.position.set(0, 0.053, 0.091);
    fringe.rotation.x = -0.1;
    group.add(fringe);
  } else if (style === 'bun') {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 9), hairMat);
    bun.position.set(0, 0.087, -0.095);
    bun.scale.set(1, 1, 0.9);
    bun.castShadow = true;
    group.add(bun);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 4, 12), MAT.metalDark);
    band.position.set(0, 0.058, -0.085);
    band.rotation.x = 0.3;
    group.add(band);
  } else if (style === 'soft') {
    const side = new THREE.Mesh(capsule(0.055, 0.13), hairMat);
    side.position.set(0.073, -0.035, 0.032);
    side.rotation.z = -0.18;
    side.castShadow = true;
    group.add(side);
    const side2 = side.clone();
    side2.position.x = -0.073;
    side2.rotation.z = 0.18;
    group.add(side2);
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.05, 0.04), hairMat);
    fringe.position.set(0.015, 0.045, 0.086);
    fringe.rotation.z = -0.06;
    group.add(fringe);
  } else {
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.04, 0.045), hairMat);
    fringe.position.set(0.01, 0.045, 0.08);
    fringe.rotation.z = -0.04;
    group.add(fringe);
  }

  return group;
}

function createArm(parent, MAT, sleeveMaterial, skinMaterial, x, y) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  parent.add(pivot);

  const upper = new THREE.Mesh(capsule(0.046, 0.23), sleeveMaterial);
  upper.position.y = -0.145;
  upper.castShadow = true;
  pivot.add(upper);

  const elbow = new THREE.Group();
  elbow.position.y = -0.285;
  pivot.add(elbow);
  const forearm = new THREE.Mesh(capsule(0.038, 0.2), sleeveMaterial);
  forearm.position.y = -0.12;
  forearm.castShadow = true;
  elbow.add(forearm);

  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.038, 0.035, 8), skinMaterial);
  cuff.position.y = -0.235;
  elbow.add(cuff);

  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), skinMaterial);
  hand.scale.set(0.9, 1.15, 0.82);
  hand.position.y = -0.27;
  hand.castShadow = true;
  elbow.add(hand);

  pivot.userData.elbow = elbow;
  return pivot;
}

function createLeg(parent, MAT, bottomMaterial, shoeMaterial, x, hipY) {
  const pivot = new THREE.Group();
  pivot.position.set(x, hipY, 0);
  parent.add(pivot);

  const thigh = new THREE.Mesh(capsule(0.064, 0.3), bottomMaterial);
  thigh.position.y = -0.185;
  thigh.castShadow = true;
  pivot.add(thigh);

  const knee = new THREE.Group();
  knee.position.y = -0.38;
  pivot.add(knee);
  const shin = new THREE.Mesh(capsule(0.052, 0.29), bottomMaterial);
  shin.position.y = -0.17;
  shin.castShadow = true;
  knee.add(shin);

  const ankle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.037, 0.05, 8), shoeMaterial);
  ankle.position.y = -0.335;
  knee.add(ankle);

  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.055, 0.22), shoeMaterial);
  foot.position.set(0, -0.372, 0.045);
  foot.rotation.x = -0.03;
  foot.castShadow = true;
  knee.add(foot);

  return pivot;
}

function addUmbrella(root, MAT, color) {
  const group = new THREE.Group();
  group.position.set(0.3, 0.02, 0.02);
  group.visible = false;
  root.add(group);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.95, 6), MAT.metalDark);
  stem.position.set(0, 1.33, 0);
  stem.castShadow = true;
  group.add(stem);

  /* Domed canopy rather than a party hat. */
  const canopyPoints = [
    new THREE.Vector2(0.0, 0.23),
    new THREE.Vector2(0.13, 0.2),
    new THREE.Vector2(0.3, 0.14),
    new THREE.Vector2(0.48, 0.07),
    new THREE.Vector2(0.62, 0.0)
  ];
  const canopyMaterial = MAT[color]?.clone ? MAT[color].clone() : MAT[color];
  if (canopyMaterial) {
    canopyMaterial.side = THREE.DoubleSide;
    if ('transparent' in canopyMaterial) {
      canopyMaterial.transparent = true;
      canopyMaterial.opacity = 0.94;
    }
  }
  const canopy = new THREE.Mesh(new THREE.LatheGeometry(canopyPoints, 16), canopyMaterial);
  canopy.position.set(0, 1.66, 0);
  canopy.castShadow = true;
  group.add(canopy);

  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 5), MAT.metalDark);
  tip.position.set(0, 1.98, 0);
  group.add(tip);

  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.62, 4), MAT.metalDark);
    rib.position.set(Math.cos(angle) * 0.3, 1.72, Math.sin(angle) * 0.3);
    rib.rotation.z = Math.PI / 2 - 0.28;
    rib.rotation.y = -angle;
    group.add(rib);
  }

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.01, 5, 10, Math.PI), MAT.oakDark);
  handle.position.set(0, 0.88, 0.02);
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
    seated = false,
    coat = false,
    hat = false,
    scarf = false,
    bag = false
  } = options;

  const root = new THREE.Group();
  const skinMaterial = MAT[skin];
  const topMaterial = MAT[top];
  const bottomMaterial = MAT[bottom];
  const shoeMaterial = MAT[shoes];

  if (seated) {
    const hipY = 0.46;

    const torso = createTorso(MAT, topMaterial, true);
    torso.position.y = hipY;
    root.add(torso);

    /* Pelvis / seat mass */
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), bottomMaterial);
    pelvis.scale.set(1, 0.5, 0.8);
    pelvis.position.set(0, hipY + 0.02, 0);
    pelvis.castShadow = true;
    root.add(pelvis);

    /* Thighs forward, shins down — an actual seated silhouette. */
    const legs = [];
    for (const side of [-1, 1]) {
      const thighPivot = new THREE.Group();
      thighPivot.position.set(side * 0.105, hipY + 0.02, 0.03);
      root.add(thighPivot);

      const thigh = new THREE.Mesh(capsule(0.066, 0.32), bottomMaterial);
      thigh.rotation.x = Math.PI / 2;
      thigh.position.z = 0.18;
      thigh.castShadow = true;
      thighPivot.add(thigh);

      const knee = new THREE.Group();
      knee.position.z = 0.36;
      thighPivot.add(knee);
      const shin = new THREE.Mesh(capsule(0.052, 0.34), bottomMaterial);
      shin.position.set(0, -0.18, 0);
      shin.castShadow = true;
      knee.add(shin);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.055, 0.22), shoeMaterial);
      foot.position.set(0, -0.37, 0.07);
      foot.castShadow = true;
      knee.add(foot);
      legs.push(thighPivot);
    }

    const armL = createArm(root, MAT, topMaterial, skinMaterial, 0.205, hipY + 0.48);
    armL.rotation.set(-1.02, 0, 0.13);
    armL.userData.elbow.rotation.x = -0.62;
    const armR = createArm(root, MAT, topMaterial, skinMaterial, -0.205, hipY + 0.48);
    armR.rotation.set(-1.02, 0, -0.13);
    armR.userData.elbow.rotation.x = -0.62;

    const head = createHead(root, MAT, {
      skin,
      hair,
      style: hairStyle,
      y: hipY + 0.68
    });
    head.rotation.x = -0.03;
    if (hat) {
      const hatMaterial = MAT.fabricRust;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.11, 0.13, 14), hatMaterial);
      crown.position.y = 0.079;
      crown.castShadow = true;
      head.add(crown);
      const brim = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.014, 5, 18), hatMaterial);
      brim.rotation.x = Math.PI / 2;
      brim.position.y = 0.018;
      head.add(brim);
    }
    if (scarf) {
      const scarfMesh = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.034, 6, 14), MAT.fabricSage);
      scarfMesh.rotation.x = Math.PI / 2;
      scarfMesh.position.y = -0.15;
      scarfMesh.scale.z = 0.8;
      head.add(scarfMesh);
    }

    root.userData.parts = {
      torso,
      armL,
      armR,
      head,
      legL: legs[0],
      legR: legs[1],
      seated: true
    };
    return root;
  }

  const hipY = 0.84;
  const legL = createLeg(root, MAT, bottomMaterial, shoeMaterial, 0.095, hipY);
  const legR = createLeg(root, MAT, bottomMaterial, shoeMaterial, -0.095, hipY);

  const torso = createTorso(MAT, topMaterial, false);
  torso.position.y = hipY;
  root.add(torso);

  /* Collar and a quiet seam give the jacket a tailored read. */
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.055, 12, 1, true), MAT[top === 'shirtCream' ? 'fabricCream' : top]);
  collar.position.set(0, hipY + 0.585, 0);
  collar.scale.z = 0.8;
  collar.castShadow = true;
  root.add(collar);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.035, 0.19), MAT.apronDark ?? MAT.metalDark);
  belt.position.set(0, hipY + 0.1, 0);
  belt.castShadow = true;
  root.add(belt);

  if (coat) {
    const coatSkirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.24, 0.5, 14, 1, true),
      MAT[top]
    );
    coatSkirt.position.set(0, hipY - 0.16, 0);
    coatSkirt.castShadow = true;
    root.add(coatSkirt);
  }

  const armL = createArm(root, MAT, topMaterial, skinMaterial, 0.205, hipY + 0.52);
  const armR = createArm(root, MAT, topMaterial, skinMaterial, -0.205, hipY + 0.52);
  armL.rotation.z = 0.06;
  armR.rotation.z = -0.06;
  armL.userData.elbow.rotation.x = 0.08;
  armR.userData.elbow.rotation.x = 0.08;

  if (apron) {
    const apronMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.52, 0.026), MAT.apron);
    apronMesh.position.set(0, hipY + 0.16, 0.145);
    apronMesh.castShadow = true;
    root.add(apronMesh);
    const apronBib = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.024), MAT.apron);
    apronBib.position.set(0, hipY + 0.51, 0.142);
    apronBib.castShadow = true;
    root.add(apronBib);
    const straps = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.36, 0.022), MAT.apron);
    for (const side of [-1, 1]) {
      const strap = straps.clone();
      strap.position.set(side * 0.085, hipY + 0.45, 0.115);
      strap.rotation.x = -0.05;
      root.add(strap);
    }
    const towel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.018), MAT.fabricCream);
    towel.position.set(0.17, hipY + 0.22, 0.16);
    towel.rotation.z = 0.06;
    root.add(towel);
  }

  const head = createHead(root, MAT, {
    skin,
    hair,
    style: hairStyle,
    y: hipY + 0.74
  });
  if (hat) {
    const hatMaterial = MAT.hairDark;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.112, 0.14, 14), hatMaterial);
    crown.position.y = 0.085;
    crown.castShadow = true;
    head.add(crown);
    const brim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.014, 5, 18), hatMaterial);
    brim.rotation.x = Math.PI / 2;
    brim.position.y = 0.022;
    head.add(brim);
  }
  if (scarf) {
    const scarfMesh = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.036, 6, 14), MAT.fabricRust);
    scarfMesh.rotation.x = Math.PI / 2;
    scarfMesh.position.y = -0.16;
    scarfMesh.scale.z = 0.8;
    head.add(scarfMesh);
  }
  if (bag) {
    addMesh(root, new THREE.BoxGeometry(0.24, 0.28, 0.09), MAT.fabricRust, [0.27, hipY + 0.18, 0.06], [0, 0, -0.08]);
    addMesh(root, new THREE.BoxGeometry(0.025, 0.55, 0.025), MAT.oakDark, [0.2, hipY + 0.45, 0.02], [0, 0, -0.18]);
  }

  root.userData.parts = {
    legL,
    legR,
    armL,
    armR,
    head,
    torso,
    seated: false
  };
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
