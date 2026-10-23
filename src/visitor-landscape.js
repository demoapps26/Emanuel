import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addCanopies } from './agriculture.js';

/** Decorative arrival court for the visitor; not a surveyed farm entrance. */
export function createVisitorLandscape(arrival, ground) {
  const group = new THREE.Group();
  group.name = 'Pátio de visita ilustrativo'; group.position.set(arrival.x, 0, arrival.z); group.rotation.y = -(arrival.yaw || 0);
  const batches = new Map(), box = new THREE.BoxGeometry(1, 1, 1), cylinder = new THREE.CylinderGeometry(1, 1, 1, 9);
  const materials = {
    curb: new THREE.MeshStandardMaterial({ color: 0xc7c4b6, roughness: .96 }),
    mulch: new THREE.MeshStandardMaterial({ color: 0x51452e, roughness: 1 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x4b514e, roughness: .42, metalness: .65 }),
    light: new THREE.MeshStandardMaterial({ color: 0xf1dfb2, emissive: 0xd9ae65, emissiveIntensity: .25 }),
    bark: new THREE.MeshStandardMaterial({ color: 0x74654d, roughness: 1 }),
    paint: new THREE.MeshStandardMaterial({ color: 0xe1dfcc, roughness: 1 }),
  };
  const dummy = new THREE.Object3D();
  function add(geometry, material, x, y, z, sx, sy, sz, angle = 0) {
    dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(0, angle, 0); dummy.updateMatrix();
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(geometry.clone().applyMatrix4(dummy.matrix));
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 36), ground.road);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, .082, 1); floor.receiveShadow = true;
  const uv = floor.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 34 / 5, uv.getY(i) * 36 / 5);
  group.add(floor);
  const crowns = [];
  for (const side of [-1, 1]) {
    for (const z of [-9, 8]) {
      add(box, materials.curb, side * 11, .18, z, 3.6, .24, 8);
      add(box, materials.mulch, side * 11, .31, z, 3.25, .08, 7.65);
      add(cylinder, materials.bark, side * 11, 2.25, z, .18, 4.4, .18);
      crowns.push([side * 11, 5.4, z, 2.7, 3.7, 2.7]);
      for (const dz of [-2.5, 2.5]) crowns.push([side * 11, .75, z + dz, 1.4, .75, 1.2]);
    }
    for (const z of [-14, 15]) {
      add(cylinder, materials.metal, side * 14, 2.8, z, .055, 5.6, .055);
      add(box, materials.metal, side * 14 - side * .3, 5.58, z, .75, .09, .28);
      add(box, materials.light, side * 14 - side * .3, 5.52, z, .62, .025, .23);
    }
  }
  for (const x of [4.2, 9.4]) add(box, materials.paint, x, .088, 5, .075, .008, 6.5);
  add(box, materials.paint, 6.8, .088, 8.25, 5.2, .008, .075);
  addCanopies(group, crowns);
  for (const [material, geometries] of batches) {
    const mesh = new THREE.Mesh(mergeGeometries(geometries), material);
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); geometries.forEach(geometry => geometry.dispose());
  }
  box.dispose(); cylinder.dispose();
  return group;
}
