import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  CHARACTERS,
  PLAYER_PERSON_ID,
  registerPersonEntity,
} from "./characters.js";

// Generic people, in metres. No personal likeness is inferred from a name.
const standard = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.88, ...extra });

function addMesh(parent, geometry, material, x, y, z, scale) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function prepareGeometry(geometry) {
  const result = geometry.index ? geometry.toNonIndexed() : geometry;
  if (!result.attributes.uv)
    result.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(result.attributes.position.count * 2, 2),
    );
  return result;
}

// NPCs are static. Player limbs retain their own pivots for walking animation.
function batchMeshes(root, flatten = false) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const items = [];
  if (flatten)
    root.traverse((child) => {
      if (child.isMesh) items.push(child);
    });
  else items.push(...root.children.filter((child) => child.isMesh));
  const batches = new Map();
  for (const item of items) {
    const transformed = item.geometry.clone().applyMatrix4(
      new THREE.Matrix4().multiplyMatrices(inverse, item.matrixWorld),
    );
    const geometry = prepareGeometry(transformed);
    if (geometry !== transformed) transformed.dispose();
    if (!batches.has(item.material.uuid))
      batches.set(item.material.uuid, { material: item.material, geometries: [] });
    batches.get(item.material.uuid).geometries.push(geometry);
    item.removeFromParent();
  }
  for (const { material, geometries } of batches.values()) {
    const merged = mergeGeometries(geometries);
    if (!merged) throw Error("Não foi possível preparar uma personagem.");
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    geometries.forEach((geometry) => geometry.dispose());
  }
  if (!flatten)
    root.children
      .filter((child) => child.isGroup)
      .forEach((child) => batchMeshes(child));
}

function makeShirtGeometry() {
  const profile = [
    [0.167, 0.965],
    [0.182, 1.000],
    [0.173, 1.075],
    [0.185, 1.205],
    [0.220, 1.355],
    [0.239, 1.405],
    [0.202, 1.445],
    [0.071, 1.478],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  const geometry = new THREE.LatheGeometry(profile, 22);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    positions.setZ(i, positions.getZ(i) * 0.61);
    positions.setX(
      i,
      positions.getX(i) * (1 + Math.sin(y * 82 + positions.getZ(i) * 22) * 0.012),
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

function makeHeadGeometry() {
  const points = [
    [0.035, 1.535],
    [0.064, 1.548],
    [0.082, 1.580],
    [0.097, 1.632],
    [0.098, 1.690],
    [0.085, 1.742],
    [0.055, 1.774],
    [0, 1.785],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  const geometry = new THREE.LatheGeometry(points, 20);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const z = positions.getZ(i);
    // A flatter face and a tapered jaw distinguish the head from a toy sphere.
    positions.setZ(i, z < 0 ? Math.max(-0.081, z * 0.91) : z * 0.94);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function leafBadge(parent, material) {
  const leaf = new THREE.Shape();
  leaf.moveTo(0, 0);
  leaf.quadraticCurveTo(-0.030, 0.037, -0.017, 0.070);
  leaf.quadraticCurveTo(0.018, 0.056, 0, 0);
  const first = addMesh(
    parent,
    new THREE.ShapeGeometry(leaf, 5),
    material,
    0,
    1.290,
    0.137,
  );
  const second = first.clone();
  second.scale.set(-0.83, 0.83, 1);
  second.position.set(0.003, 1.290, 0.138);
  parent.add(second);
}

function createPerson(personId, shirtColor, palette, accessory) {
  const root = new THREE.Group();
  root.name = `person:${personId}`;
  const shirt = standard(shirtColor);
  const materials = { ...palette, shirt };
  const { skin, trousers, hair, boot, belt, metal, eyes, badge } = materials;

  addMesh(root, makeShirtGeometry(), shirt, 0, 0, 0);
  addMesh(root, makeHeadGeometry(), skin, 0, 0, 0);
  addMesh(
    root,
    new THREE.CylinderGeometry(0.057, 0.065, 0.09, 12),
    skin,
    0,
    1.510,
    0,
  );
  addMesh(
    root,
    new THREE.SphereGeometry(0.102, 18, 10, 0, Math.PI * 2, 0, 1.58),
    hair,
    0,
    1.695,
    0.004,
    [1, 1, 0.94],
  );

  for (const side of [-1, 1]) {
    addMesh(
      root,
      new THREE.SphereGeometry(0.019, 10, 8),
      skin,
      side * 0.094,
      1.645,
      0,
      [0.51, 1.1, 0.66],
    );
    addMesh(
      root,
      new THREE.SphereGeometry(0.007, 8, 6),
      eyes,
      side * 0.033,
      1.684,
      -0.082,
      [1, 0.55, 0.45],
    );
    const collar = addMesh(
      root,
      new THREE.BoxGeometry(0.045, 0.013, 0.075),
      shirt,
      side * 0.053,
      1.477,
      -0.055,
    );
    collar.rotation.z = side * 0.14;
    collar.rotation.y = side * 0.25;
  }
  const nose = addMesh(
    root,
    new THREE.ConeGeometry(0.012, 0.038, 8),
    skin,
    0,
    1.655,
    -0.092,
  );
  nose.rotation.x = -Math.PI / 2;
  addMesh(root, new THREE.BoxGeometry(0.029, 0.004, 0.003), belt, 0, 1.601, -0.081);

  addMesh(
    root,
    new THREE.CapsuleGeometry(0.12, 0.13, 4, 14),
    trousers,
    0,
    0.948,
    0,
    [1.25, 0.55, 0.80],
  );
  addMesh(
    root,
    new THREE.CylinderGeometry(0.168, 0.168, 0.035, 20),
    belt,
    0,
    0.973,
    0,
    [1, 1, 0.63],
  );
  addMesh(root, new THREE.BoxGeometry(0.037, 0.032, 0.012), metal, 0, 0.975, -0.107);
  leafBadge(root, badge);

  const legs = [], knees = [], arms = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.088, 0.922, 0);
    leg.userData.phase = side < 0 ? 0 : Math.PI;
    root.add(leg);
    legs.push(leg);
    addMesh(
      leg,
      new THREE.CapsuleGeometry(0.074, 0.255, 4, 12),
      trousers,
      0,
      -0.202,
      0,
      [1, 1, 0.92],
    );
    const shin = new THREE.Group();
    shin.position.y = -0.421;
    leg.add(shin);
    knees.push(shin);
    addMesh(leg, new THREE.SphereGeometry(.066, 12, 8), trousers, 0, -.413, 0, [1, 1, .9]);
    addMesh(
      shin,
      new THREE.CapsuleGeometry(0.060, 0.245, 4, 12),
      trousers,
      0,
      -0.177,
      0,
      [0.98, 1, 0.88],
    );
    addMesh(
      shin,
      new THREE.CapsuleGeometry(0.052, 0.08, 3, 10),
      boot,
      0,
      -0.403,
      -0.039,
      [1.22, 0.58, 1.7],
    );
    addMesh(
      shin,
      new THREE.BoxGeometry(0.126, 0.025, 0.225),
      boot,
      0,
      -0.474,
      -0.046,
    );

    const arm = new THREE.Group();
    arm.position.set(side * 0.223, 1.398, 0);
    arm.rotation.z = -side * 0.055;
    arm.userData.phase = side < 0 ? Math.PI : 0;
    root.add(arm);
    arms.push(arm);
    addMesh(
      arm,
      new THREE.CapsuleGeometry(0.060, 0.10, 4, 12),
      shirt,
      0,
      -0.079,
      0,
      [1, 1, 0.90],
    );
    addMesh(
      arm,
      new THREE.CapsuleGeometry(0.047, 0.11, 4, 12),
      skin,
      0,
      -0.219,
      0,
    );
    addMesh(
      arm,
      new THREE.CapsuleGeometry(0.035, 0.12, 4, 10),
      skin,
      0,
      -0.380,
      -0.018,
    );
    addMesh(
      arm,
      new THREE.SphereGeometry(0.037, 10, 8),
      skin,
      0,
      -0.492,
      -0.027,
      [0.72, 1.23, 0.66],
    );
  }

  if (accessory === "clipboard") {
    const tablet = addMesh(
      arms[1],
      new THREE.BoxGeometry(0.125, 0.17, 0.012),
      belt,
      0.024,
      -0.410,
      -0.067,
    );
    tablet.rotation.x = -0.2;
    addMesh(arms[1], new THREE.BoxGeometry(0.102, 0.143, 0.002), palette.paper, 0.024, -0.410, -0.075);
  }
  if (accessory === "equipment") {
    for (const side of [-1, 1])
      addMesh(root, new THREE.BoxGeometry(0.026, 0.30, 0.008), badge, side * 0.14, 1.258, -0.129);
  }

  const animated = personId === PLAYER_PERSON_ID;
  batchMeshes(root, !animated);
  return { root, legs, knees, arms };
}

/** One persistent 3D entity per identity, moved between local farm scenes. */
export function createActors() {
  const registry = new Map();
  const palette = {
    skin: standard(0xbe9476),
    trousers: standard(0xa99977),
    hair: standard(0x382d23),
    boot: standard(0x36332c),
    belt: standard(0x453b2d),
    metal: standard(0x8f9489, { metalness: 0.55, roughness: 0.4 }),
    eyes: standard(0x2d2922),
    badge: standard(0xd2dbb8, { side: THREE.DoubleSide }),
    paper: standard(0xe9e8d9),
  };
  const controlled = createPerson(PLAYER_PERSON_ID, 0x1c6045, palette);
  const player = registerPersonEntity(registry, PLAYER_PERSON_ID, controlled.root);
  const npcs = new Map();
  for (const character of CHARACTERS) {
    const accessory = character.id === "hernani" ? "clipboard" : character.id === "rafael" ? "equipment" : null;
    const person = createPerson(character.id, character.color, palette, accessory);
    person.root.rotation.y = Math.PI;
    npcs.set(character.id, registerPersonEntity(registry, character.id, person.root));
  }
  let phase = 0;
  function update(state, dt, movement = 0) {
    const moving = !state.driving && movement > 0.0001;
    if (moving) phase += Math.min(movement, 0.35) * 4.8;
    player.visible = !state.driving;
    player.position.set(state.player.x, (state.player.y || 0) + (moving ? Math.sin(phase * 2) * 0.008 : 0), state.player.z);
    player.rotation.y = -state.player.yaw;
    controlled.legs.forEach((leg, index) => {
      const cycle = Math.sin(phase + leg.userData.phase);
      leg.rotation.x = moving ? cycle * 0.43 : 0;
      controlled.knees[index].rotation.x = moving ? -Math.max(0, -cycle) * 0.62 : 0;
    });
    controlled.arms.forEach((arm) => {
      arm.rotation.x = moving ? Math.sin(phase + arm.userData.phase) * 0.29 : 0;
    });
    const present = new Map((state.characters || CHARACTERS).map((person) => [person.id, person]));
    for (const [personId, entity] of npcs) {
      const person = present.get(personId);
      entity.visible = Boolean(person);
      if (person) {
        entity.position.set(person.x, person.y || 0, person.z);
        entity.rotation.y = -(person.yaw ?? Math.PI);
      }
    }
  }
  return {
    player,
    npcs,
    entityPersonIds: Object.freeze([...registry.keys()]),
    update,
  };
}
