import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { pilarLivery, drawBrand } from "./liveries.js";

// Model construction uses the established artwork units, then converts to local
// approximate metres. Forward is -Z. Simulation yaw is applied as rotation.y=-yaw.
const MODEL_SCALE = 0.5;
const UP = new THREE.Vector3(0, 1, 0);
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const SOFT_BOX = new RoundedBoxGeometry(1, 1, 1, 2, 0.09);

function palette() {
  const standard = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...opts });
  return {
    paint: new THREE.MeshPhysicalMaterial({ color: 0xf0f0e9, roughness: 0.31, metalness: 0.14, clearcoat: 0.4, clearcoatRoughness: 0.25 }),
    green: new THREE.MeshPhysicalMaterial({ color: 0x367244, roughness: 0.34, metalness: 0.12, clearcoat: 0.3 }),
    orange: new THREE.MeshPhysicalMaterial({ color: 0xb74e2e, roughness: 0.36, metalness: 0.1, clearcoat: 0.25 }),
    rubber: standard(0x22272a, { roughness: 0.94 }),
    dark: standard(0x303735, { roughness: 0.74 }),
    frame: standard(0x46504c, { roughness: 0.6, metalness: 0.55 }),
    metal: standard(0x969e9c, { roughness: 0.32, metalness: 0.8 }),
    hub: standard(0xb5b6aa, { roughness: 0.37, metalness: 0.65 }),
    redHub: standard(0x9c3f2b, { roughness: 0.42, metalness: 0.4 }),
    darkGlass: standard(0x304b52, { roughness: 0.16, metalness: 0.35, transparent: true, opacity: 0.68, depthWrite: false, side: THREE.DoubleSide }),
    seat: standard(0x303532, { roughness: 1 }),
    light: standard(0xeee4cb, { roughness: 0.2, emissive: 0xffd995, emissiveIntensity: 0.25 }),
    redLight: standard(0xa62c25, { roughness: 0.25, emissive: 0xb3221a, emissiveIntensity: 0.15 }),
    amber: standard(0xd79330, { roughness: 0.25, emissive: 0xc87819, emissiveIntensity: 0.1 }),
    whiteRim: standard(0xd5d6c7, { roughness: 0.44, metalness: 0.3 }),
  };
}

function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = !material.transparent;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
function box(parent, material, x, y, z, w, h, d, rounded = false) {
  const object = mesh(rounded ? SOFT_BOX : UNIT_BOX, material, parent, x, y, z);
  object.scale.set(w, h, d);
  return object;
}
function tube(parent, material, a, b, radius = 0.06, sides = 8) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
  const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), sides);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize()));
  return mesh(geometry, material, parent, ...start.add(end).multiplyScalar(0.5).toArray());
}
function plane(parent, material, x, y, z, w, h, ry = 0, rx = 0) {
  const object = mesh(new THREE.PlaneGeometry(w, h), material, parent, x, y, z);
  object.rotation.set(rx, ry, 0);
  object.castShadow = false;
  return object;
}
function profile(parent, material, shape, width, bevel = 0.12) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, steps: 1, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 10 });
  geo.rotateY(-Math.PI / 2);
  geo.translate(width / 2 - bevel, 0, 0);
  return mesh(geo, material, parent);
}
function canvasMaterial(canvas, makeMaterial) {
  if (makeMaterial) return makeMaterial(canvas);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.75 });
}
function truckLivery(p, options) {
  return typeof document === "undefined" ? p.paint : canvasMaterial(pilarLivery("truck"), options.canvasMaterial);
}
function brandLivery(p, options) {
  if (typeof document === "undefined") return p.paint;
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f1f1e9"; ctx.fillRect(0, 0, 512, 256);
  drawBrand(ctx, 122, 127, 94);
  ctx.fillStyle = "#244b33"; ctx.font = "bold 30px Arial";
  ctx.fillText("APOIO", 262, 111); ctx.fillText("AGRÍCOLA", 262, 151);
  return canvasMaterial(canvas, options.canvasMaterial);
}

/** Merge only rigid descendants; moving wheel/steering/articulation groups survive. */
function batchRigid(group) {
  group.updateWorldMatrix(true, true);
  const inverse = group.matrixWorld.clone().invert(), batches = new Map(), selected = [];
  function collect(parent) {
    for (const child of [...parent.children]) {
      if (child.userData.vehicleMoving) continue;
      if (child.isMesh && !Array.isArray(child.material)) selected.push(child);
      else collect(child);
    }
  }
  collect(group);
  for (const child of selected) {
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, child.matrixWorld));
    const baked = geometry.index ? geometry.toNonIndexed() : geometry;
    if (baked !== geometry) geometry.dispose();
    const item = batches.get(child.material.uuid) || { material: child.material, geometries: [], shadow: false };
    item.geometries.push(baked); item.shadow ||= child.castShadow;
    batches.set(child.material.uuid, item);
    child.parent.remove(child);
  }
  for (const { material, geometries, shadow } of batches.values()) {
    const geometry = mergeGeometries(geometries);
    if (!geometry) throw Error("Não foi possível combinar as peças do equipamento.");
    const combined = mesh(geometry, material, group);
    combined.castShadow = shadow;
    geometries.forEach(g => g.dispose());
  }
}

function wheel(parent, p, list, x, z, radius, width, { y = radius, steer = false, agricultural = false, rim = p.metal } = {}) {
  const steering = new THREE.Group();
  steering.name = steer ? "steered-axle" : "fixed-axle";
  steering.userData.vehicleMoving = true;
  steering.position.set(x, y, z);
  parent.add(steering);
  const spin = new THREE.Group(); spin.name = "wheel-spin"; steering.add(spin);
  // The complete wheel, including hubs and tread, rotates about its local X axle.
  const tyre = mesh(new THREE.TorusGeometry(radius * 0.77, radius * 0.23, 10, 36), p.rubber, spin);
  tyre.rotation.y = Math.PI / 2;
  tyre.scale.z = width / (radius * 0.46);
  const sidewall = mesh(new THREE.CylinderGeometry(radius * 0.87, radius * 0.87, width * 0.87, 28), p.rubber, spin);
  sidewall.rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    const hub = mesh(new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, width * 0.08, 24), rim, spin, side * width * 0.47, 0, 0);
    hub.rotation.z = Math.PI / 2;
    const cap = mesh(new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, width * 0.16, 16), p.metal, spin, side * width * 0.50, 0, 0);
    cap.rotation.z = Math.PI / 2;
    for (let bolt = 0; bolt < (agricultural ? 6 : 8); bolt++) {
      const angle = bolt * Math.PI * 2 / (agricultural ? 6 : 8);
      const nut = mesh(new THREE.CylinderGeometry(radius * 0.045, radius * 0.045, 0.07, 6), p.rubber, spin, side * width * 0.53, Math.cos(angle) * radius * 0.34, Math.sin(angle) * radius * 0.34);
      nut.rotation.z = Math.PI / 2;
    }
  }
  if (agricultural) {
    for (let i = 0; i < 22; i++) for (const side of [-1, 1]) {
      const a = (i + (side < 0 ? 0.26 : 0)) * Math.PI * 2 / 22;
      const block = box(spin, p.rubber, side * width * 0.23, Math.cos(a) * radius * 0.96, Math.sin(a) * radius * 0.96, width * 0.55, radius * 0.08, radius * 0.31);
      block.rotation.set(a, 0, side * 0.5);
    }
  } else {
    for (let i = 0; i < 24; i++) {
      const a = i * Math.PI * 2 / 24;
      const tread = box(spin, p.rubber, 0, Math.cos(a) * radius * 0.985, Math.sin(a) * radius * 0.985, width * 0.84, radius * 0.025, radius * 0.12);
      tread.rotation.x = a;
    }
  }
  batchRigid(spin);
  list.push({ mesh: spin, radius: radius * MODEL_SCALE, steer, steeringParent: steer ? steering : null });
  return steering;
}

function truckCab(group, p, wheels, { frontZ, rearZ, width = 7.1, cabHeight = 9.9, frontAxleZ, rearAxleZ, brand }) {
  const front = frontZ, rear = rearZ;
  const glassCenter = cabHeight < 9 ? 6.65 : 7.05;
  const glassHeight = cabHeight < 9 ? 2.1 : 2.35;
  const sill = glassCenter - glassHeight / 2;
  const glassTop = glassCenter + glassHeight / 2;
  box(group, p.frame, 0, 2.35, (front + rear) / 2, width * 0.77, 0.65, rear - front);
  for (const side of [-1, 1]) {
    box(group, p.dark, side * 2.55, 1.92, (front + rear) / 2, 0.22, 0.85, rear - front - 0.4);
    box(group, p.metal, side * 2.6, 2.32, rear - 0.6, 1.1, 1.15, 2.6, true);
  }
  const outline = new THREE.Shape();
  outline.moveTo(front + 0.25, 2.6); outline.lineTo(front - 0.08, 4.0);
  outline.lineTo(front + 0.16, sill); outline.lineTo(rear, sill);
  outline.lineTo(rear, 2.6); outline.closePath();
  profile(group, p.paint, outline, width, 0.10);
  // Cab glazing is set between pillars; there is no opaque box behind it.
  box(group, p.paint, 0, (cabHeight+sill)/2, rear-1.53, width, cabHeight-sill, 2.95, true);
  box(group, p.paint, 0, (cabHeight+glassTop)/2, front+.23, width-.2, cabHeight-glassTop, .36, true);
  box(group, p.paint, 0, cabHeight+.08, (front+rear)/2+.10, width+.02, .30, rear-front-.30, true);
  for(const side of [-1,1]) {
    tube(group,p.paint,[side*(width/2-.10),sill,front+.20],[side*(width/2-.10),cabHeight,front+.65],.11);
    tube(group,p.paint,[side*(width/2-.08),sill,front+3.90],[side*(width/2-.08),cabHeight,front+4.10],.095);
  }
  // Large windscreen and side panes expose a modest cockpit instead of a black box.
  plane(group, p.darkGlass, 0, glassCenter, front - 0.005, width - 0.62, glassHeight, Math.PI, 0.035);
  for (const side of [-1, 1]) {
    plane(group, p.darkGlass, side * (width / 2 + 0.012), glassCenter, front + 2.15, 3.28, glassHeight, side * Math.PI / 2);
    tube(group, p.frame, [side * 2.2, 5.85, front + 0.12], [side * 0.15, 5.75, front + 0.06], 0.045);
    box(group, p.frame, side * (width / 2 + 0.09), 4.98, front + 2.2, 0.07, 0.12, 0.70);
    tube(group, p.frame, [side * 3.2, 7.0, front + 0.8], [side * 3.72, 7.1, front + 0.2], 0.075);
    box(group, p.dark, side * 3.78, 6.75, front + 0.2, 0.42, 1.14, 0.5, true);
    plane(group, p.metal, side * 3.79, 6.75, front + 0.475, 0.34, 1.0);
    box(group, p.frame, side * 3.0, 2.92, front + 2.1, 0.8, 0.19, 1.9);
    box(group, p.metal, side * 3.08, 3.48, front + 2.1, 0.63, 0.16, 1.4);
    for (let line = 0; line < 4; line++) box(group, p.dark, side * 3.5, 4.6 + line * 0.23, rear - 0.72, 0.07, 0.08, 0.74);
    box(group, p.light, side * 2.7, 3.4, front - 0.15, 1.05, 0.54, 0.15, true);
    box(group, p.amber, side * 3.18, 3.42, front - 0.16, 0.20, 0.5, 0.16, true);
    if (brand) plane(group, brand, side * (width / 2 + 0.03), 5.4, rear - 1.56, 2.6, 1.32, side * Math.PI / 2);
    const seat = box(group, p.seat, side * 1.6, 5.15, front + 2.0, 1.35, 1.75, 0.55, true); seat.rotation.x = -0.12;
    box(group, p.seat, side * 1.6, 4.46, front + 1.5, 1.4, 0.38, 1.4, true);
  }
  box(group, p.dark, 0, 5.06, front - 0.18, width - 1.8, 1.0, 0.12, true);
  for (let n = 0; n < 5; n++) box(group, p.frame, 0, 4.76 + n * 0.14, front - 0.27, width - 2.0, 0.035, 0.05);
  box(group, p.frame, 0, 2.72, front - 0.23, width + 0.04, 0.5, 0.30, true);
  // Roof aero-cap and marker lamps.
  box(group, p.paint, 0, cabHeight + 0.18, rear - 2.2, width - 0.5, 0.48, 3.8, true);
  for (const x of [-2.5, -1.2, 0, 1.2, 2.5]) box(group, p.amber, x, cabHeight + 0.44, rear - 3.9, 0.20, 0.1, 0.18);
  wheel(group, p, wheels, -3.04, frontAxleZ, 1.33, 0.86, { steer: true });
  wheel(group, p, wheels, 3.04, frontAxleZ, 1.33, 0.86, { steer: true });
  wheel(group, p, wheels, -3.18, rearAxleZ, 1.38, 1.0);
  wheel(group, p, wheels, 3.18, rearAxleZ, 1.38, 1.0);
}

function refrigeratedBody(group, p, wheels, { centerZ, length, width, top = 12.5, livery, axles, frontFridge = true }) {
  const bottom = 3.04, h = top - bottom, centerY = (top + bottom) / 2;
  box(group, p.paint, 0, centerY, centerZ, width, h, length, true);
  box(group, p.frame, 0, 2.9, centerZ, width - 0.28, 0.35, length);
  for (const side of [-1, 1]) {
    plane(group, livery, side * (width / 2 + 0.018), centerY, centerZ, length - 0.18, h - 0.15, side * Math.PI / 2);
    // Aluminium perimeter rails and small amber markers.
    for (const y of [bottom + 0.1, top - 0.1]) box(group, p.metal, side * (width / 2 + 0.02), y, centerZ, 0.10, 0.12, length - 0.12);
    for (const end of [-1, 1]) box(group, p.metal, side * (width / 2 + 0.02), centerY, centerZ + end * (length / 2 - 0.06), 0.11, h - 0.12, 0.13);
    for (let z = centerZ - length / 2 + 2; z < centerZ + length / 2 - 1; z += 4.5) box(group, p.amber, side * (width / 2 + 0.065), bottom + 0.26, z, 0.07, 0.14, 0.3);
    box(group, p.frame, side * (width / 2 - 0.35), 1.9, centerZ - 3.2, 0.14, 0.16, Math.max(1, length - 15));
  }
  const rear = centerZ + length / 2;
  // Hinged rear doors, latch rods and underrun bar.
  plane(group, livery, 0, centerY, rear + 0.025, width - 0.23, h - 0.12);
  box(group, p.frame, 0, centerY, rear + 0.06, 0.07, h - 0.12, 0.08);
  for (const side of [-1, 1]) {
    box(group, p.metal, side * width * 0.18, centerY, rear + 0.11, 0.07, h - 0.6, 0.07);
    for (const y of [bottom + 1.0, centerY, top - 1.0]) box(group, p.metal, side * (width / 2 - 0.16), y, rear + 0.12, 0.30, 0.11, 0.11);
    box(group, p.redLight, side * (width / 2 - 0.7), 2.69, rear + 0.11, 0.8, 0.34, 0.12);
    box(group, p.amber, side * (width / 2 - 0.2), 2.69, rear + 0.11, 0.18, 0.34, 0.13);
  }
  box(group, p.metal, 0, 1.73, rear + 0.05, width - 0.5, 0.22, 0.18);
  if (frontFridge) {
    const front = centerZ - length / 2;
    box(group, p.paint, 0, top - 1.55, front - 0.29, 3.6, 2.75, 0.62, true);
    box(group, p.frame, 0, top - 1.25, front - 0.62, 2.95, 1.55, 0.08, true);
    for (const side of [-1, 1]) {
      const fan = mesh(new THREE.TorusGeometry(0.53, 0.06, 8, 20), p.metal, group, side * 0.8, top - 1.25, front - 0.69);
      fan.rotation.y = Math.PI;
      for (let slat = 0; slat < 4; slat++) box(group, p.frame, side * 0.8, top - 1.64 + slat * 0.26, front - 0.73, 0.93, 0.035, 0.03);
    }
  }
  for (const z of axles) {
    tube(group, p.frame, [-3.4, 1.38, z], [3.4, 1.38, z], 0.17);
    wheel(group, p, wheels, -width / 2 + 0.5, z, 1.38, 0.95);
    wheel(group, p, wheels, width / 2 - 0.5, z, 1.38, 0.95);
    for (const side of [-1, 1]) box(group, p.dark, side * (width / 2 - 0.1), 1.05, z + 1.3, 0.18, 1.8, 0.35);
  }
}

function articulatedTruck(p, options) {
  const model = new THREE.Group(); model.name = "Patrícia Pilar · semirreboque";
  const wheels = [], brand = brandLivery(p, options), wrap = truckLivery(p, options);
  const cab = new THREE.Group(); model.add(cab);
  truckCab(cab, p, wheels, { frontZ: -18.55, rearZ: -10.5, width: 7.1, frontAxleZ: -15.9, rearAxleZ: -8.0, brand });
  box(cab, p.frame, 0, 2.15, -8.5, 5.7, 0.45, 5.7);
  const fifthWheel = mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.16, 24), p.dark, cab, 0, 2.75, -9);
  fifthWheel.scale.z = 0.7;
  for (const side of [-1, 1]) {
    box(cab, p.redLight, side * 2.7, 2.0, -5.9, 0.7, 0.25, 0.12);
    tube(cab, p.dark, [side * 0.4, 4.2, -10.4], [side * 0.6, 3.0, -8.9], 0.08);
  }
  const trailer = new THREE.Group(); trailer.name = "articulated-trailer";
  trailer.userData.vehicleMoving = true; trailer.position.z = -9; model.add(trailer);
  refrigeratedBody(trailer, p, wheels, { centerZ: 13, length: 30, width: 7.8, livery: wrap, axles: [17, 21, 25] });
  for (const side of [-1, 1]) {
    box(trailer, p.metal, side * 2.55, 2.12, 4.4, 0.25, 1.7, 0.32);
    box(trailer, p.frame, side * 2.55, 1.22, 4.4, 0.6, 0.12, 0.6);
  }
  batchRigid(cab); batchRigid(trailer); batchRigid(model);
  return { model, wheels, articulation: { trailer, pivotZ: -4.5, pivotLocalZ: -9 }, bounds: { width: 3.9, length: 19, height: 6.25 } };
}

function rigidTruck(p, options) {
  const model = new THREE.Group(); model.name = "Patrícia Pilar · camião de distribuição";
  const wheels = [], brand = brandLivery(p, options), wrap = truckLivery(p, options);
  // A shorter two-axle refrigerated delivery vehicle, not a shortened semitrailer.
  const cab = new THREE.Group(); cab.scale.x=.81; model.add(cab);
  truckCab(cab, p, wheels, { frontZ: -9.75, rearZ: -3.8, width: 7.1, cabHeight: 8.5, frontAxleZ: -7.4, rearAxleZ: 6.2, brand });
  box(model,p.frame,0,2.38,0,4.5,.50,18.5);
  batchRigid(cab);
  refrigeratedBody(model, p, [], { centerZ: 3.35, length: 12.8, width: 6.5, top: 10.8, livery: wrap, axles: [] });
  batchRigid(model);
  return { model, wheels, bounds: { width: 3.25, length: 10, height: 5.4 } };
}

function tractor(p, options, orchard = false) {
  const model = new THREE.Group(); model.name = orchard ? "Trator compacto de apoio" : "Trator agrícola";
  const wheels = [], color = orchard ? p.orange : p.green, body = new THREE.Group(); model.add(body);
  const scale = orchard ? 0.77 : 1;
  body.scale.setScalar(scale);
  // Low chassis and sculpted tapered engine hood.
  box(body, p.frame, 0, 1.22, -0.2, 1.65, 0.65, 6.7, true);
  box(body, p.frame, 0, 1.04, 1.8, 2.2, 0.9, 1.6, true);
  const hood = new THREE.Shape();
  hood.moveTo(-3.5, 1.65); hood.lineTo(-3.55, 2.7); hood.quadraticCurveTo(-3.25, 3.45, -2.8, 3.58);
  hood.lineTo(-0.4, 3.73); hood.lineTo(0.0, 2.8); hood.lineTo(0, 1.65); hood.closePath();
  profile(body, color, hood, 2.15, 0.13);
  box(body, p.dark, 0, 2.62, -3.59, 1.68, 1.28, 0.08, true);
  for (let i = 0; i < 9; i++) box(body, p.frame, -0.71 + i * 0.177, 2.64, -3.65, 0.025, 1.07, 0.035);
  for (const side of [-1, 1]) {
    box(body, p.light, side * 0.82, 3.22, -3.56, 0.45, 0.35, 0.15, true);
    for (let i = 0; i < 6; i++) box(body, p.dark, side * 1.09, 2.6 + i * 0.10, -1.5, 0.04, 0.045, 1.4);
    box(body, p.frame, side * 1.2, 1.7, -0.12, 0.6, 0.15, 1.1);
    box(body, p.metal, side * 1.33, 1.22, -0.20, 0.48, 0.12, 0.8);
    box(body, color, side * 1.75, 3.26, 1.72, 1.06, 0.22, 3.05, true);
    box(body, color, side * 2.18, 2.82, 1.75, 0.14, 1.05, 2.9, true);
  }
  box(body, p.frame, 0, 1.17, -3.77, 1.98, 0.75, 0.38, true);
  for (let i = 0; i < 4; i++) box(body, p.dark, -0.69 + i * 0.46, 1.18, -3.99, 0.04, 0.54, 0.03);
  // Front axle, steering linkages and rear transmission housing.
  tube(body, p.frame, [-1.58, 0.98, -2.2], [1.58, 0.98, -2.2], 0.16);
  tube(body, p.frame, [-1.78, 1.47, 1.8], [1.78, 1.47, 1.8], 0.25);
  tube(body, p.metal, [-1.4, 0.88, -2.2], [1.4, 0.88, -2.2], 0.055);
  // Glazed cabin with individual roll-over pillars and a genuinely visible seat.
  box(body, p.dark, 0, 2.42, 1.02, 2.3, 0.3, 2.65, true);
  for (const side of [-1, 1]) {
    tube(body, p.frame, [side * 1.02, 2.48, -0.1], [side * 1.0, 5.64, 0.15], 0.095);
    tube(body, p.frame, [side * 1.04, 2.48, 2.35], [side * 0.94, 5.64, 2.16], 0.095);
    tube(body, p.frame, [side * 1.0, 3.23, 0.0], [side * 1.04, 3.23, 2.32], 0.055);
    plane(body, p.darkGlass, side * 1.045, 4.2, 1.16, 2.21, 2.63, side * Math.PI / 2);
    box(body, p.frame, side * 1.12, 3.61, 0.3, 0.06, 0.09, 0.36);
    tube(body, p.frame, [side * 1.0, 4.7, 0.1], [side * 1.54, 4.65, -0.12], 0.055);
    box(body, p.dark, side * 1.54, 4.59, -0.12, 0.24, 0.52, 0.35, true);
    box(body, p.light, side * 0.87, 5.65, 0.01, 0.36, 0.26, 0.31, true);
    box(body, p.light, side * 0.87, 5.65, 2.28, 0.36, 0.26, 0.31, true);
    box(body, p.redLight, side * 1.89, 3.20, 3.07, 0.42, 0.24, 0.12, true);
  }
  const frontGlass = plane(body, p.darkGlass, 0, 4.27, 0.004, 1.91, 2.54, Math.PI); frontGlass.rotation.x = -0.075;
  plane(body, p.darkGlass, 0, 4.20, 2.36, 1.88, 2.58);
  box(body, color, 0, 5.77, 1.20, 2.51, 0.30, 2.88, true);
  tube(body, p.frame, [0.9, 5.93, 1.8], [0.9, 6.35, 1.8], 0.055);
  mesh(new THREE.CylinderGeometry(0.17, 0.20, 0.3, 12), p.amber, body, 0.9, 6.38, 1.8);
  box(body, p.seat, 0, 3.02, 1.20, 1.15, 0.33, 1.16, true);
  const backrest = box(body, p.seat, 0, 3.55, 1.75, 1.17, 1.25, 0.34, true); backrest.rotation.x = -0.12;
  tube(body, p.frame, [0, 2.78, 0.16], [0, 3.72, 0.30], 0.06);
  const steeringWheel = mesh(new THREE.TorusGeometry(0.38, 0.045, 8, 20), p.dark, body, 0, 3.8, 0.30); steeringWheel.rotation.x = -0.70;
  for (const side of [-1, 1]) tube(body, p.frame, [0, 3.8, 0.30], [side * 0.34, 3.8, 0.30], 0.027);
  tube(body, p.frame, [0.63, 2.82, 1.0], [0.74, 3.38, 0.86], 0.035);
  mesh(new THREE.SphereGeometry(0.085, 8, 6), p.dark, body, 0.74, 3.38, 0.86);
  // Offset exhaust has heat shield rings and a short turned cap.
  tube(body, p.frame, [-0.91, 2.1, -0.68], [-0.91, 5.02, -0.68], 0.12);
  tube(body, p.dark, [-0.91, 5.02, -0.68], [-0.91, 5.3, -0.46], 0.13);
  for (let i = 0; i < 9; i++) mesh(new THREE.TorusGeometry(0.135, 0.018, 6, 10), p.metal, body, -0.91, 3.30 + i * 0.12, -0.68).rotation.x = Math.PI / 2;
  // Three-point rear hitch and PTO shaft.
  for (const side of [-1, 1]) {
    tube(body, p.frame, [side * 0.65, 1.8, 2.7], [side * 0.95, 1.0, 3.72], 0.10);
    tube(body, p.metal, [side * 0.65, 2.45, 2.62], [side * 0.85, 1.08, 3.56], 0.05);
  }
  tube(body, p.frame, [0, 2.6, 2.7], [0, 2.25, 3.72], 0.07);
  box(body, p.metal, 0, 1.06, 3.73, 2.0, 0.17, 0.24);
  const pto = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.4, 10), p.metal, body, 0, 1.55, 3.08); pto.rotation.x = Math.PI / 2;
  wheel(body, p, wheels, -1.76, 1.80, 1.48, 0.96, { agricultural: true, rim: orchard ? p.whiteRim : p.redHub });
  wheel(body, p, wheels, 1.76, 1.80, 1.48, 0.96, { agricultural: true, rim: orchard ? p.whiteRim : p.redHub });
  wheel(body, p, wheels, -1.55, -2.2, 0.98, 0.63, { steer: true, agricultural: true, rim: p.whiteRim });
  wheel(body, p, wheels, 1.55, -2.2, 0.98, 0.63, { steer: true, agricultural: true, rim: p.whiteRim });
  if (orchard) wheels.forEach(w => w.radius *= scale);
  batchRigid(body);
  return { model, wheels, bounds: { width: orchard ? 1.9 : 2.4, length: orchard ? 3 : 4, height: (orchard ? scale : 1) * 3.27 } };
}

/**
 * Heavy equipment factory, independent of the scene or simulation singleton.
 * Returned dimensions and wheel radii are in world metres. Models carry the
 * artwork-to-world scale; callers must not scale a second time.
 *
 * wheels[].mesh rotates about X; steeringParent rotates about Y.
 * Trailer relative rotation is -(trailerYaw - vehicleYaw), in radians.
 */
export function createHeavyVehicle(kind, options = {}) {
  const p = palette();
  let result;
  if (kind === "truck") result = articulatedTruck(p, options);
  else if (kind === "rigid_truck") result = rigidTruck(p, options);
  else if (kind === "tractor") result = tractor(p, options, false);
  else if (kind === "orchard_tractor") result = tractor(p, options, true);
  else throw Error(`Equipamento desconhecido: ${kind}`);
  result.model.scale.setScalar(MODEL_SCALE);
  result.model.userData.vehicle = true;
  result.model.userData.kind = kind;
  result.model.userData.modelledDimensions = result.bounds;
  return result;
}

export function createHeavyVehicles(options = {}) {
  const kinds = ["truck", "rigid_truck", "tractor", "orchard_tractor"];
  const models = {}, wheelSets = {}, articulated = {}, vehicles = {};
  for (const kind of kinds) {
    const item = createHeavyVehicle(kind, options);
    vehicles[kind] = item; models[kind] = item.model;
    wheelSets[kind] = item.wheels;
    if (item.articulation) articulated[kind] = item.articulation;
  }
  return { models, wheelSets, articulated, vehicles };
}
