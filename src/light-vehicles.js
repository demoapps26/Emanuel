import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { drawBrand, pilarLivery } from "./liveries.js";

// Approximate photographic models in metres. All face -Z and use the footprint centre.
const SUPPORTED = new Set(["technical", "agropilar", "biological", "agricultural"]);
const surface = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .78, ...options });
function textureMaterial(image) {
  const map = new THREE.CanvasTexture(image);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return surface(0xffffff, { map, roughness: .48 });
}
function mergeRigid(group) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert(), batches = new Map(), remove = [];
  group.traverse(mesh => {
    if (!mesh.isMesh) return;
    const baked = mesh.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
    const geometry = baked.index ? baked.toNonIndexed() : baked;
    if (geometry !== baked) baked.dispose();
    if (!batches.has(mesh.material)) batches.set(mesh.material, []);
    batches.get(mesh.material).push(geometry); remove.push(mesh);
  });
  remove.forEach(mesh => mesh.removeFromParent());
  for (const [material, parts] of batches) {
    const geometry = mergeGeometries(parts);
    if (!geometry) throw Error("Não foi possível preparar a carroçaria.");
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    parts.forEach(part => part.dispose());
  }
}
function brandImage() {
  const image = document.createElement("canvas"); image.width = 512; image.height = 256;
  const ctx = image.getContext("2d"); ctx.fillStyle = "#eef0e9"; ctx.fillRect(0, 0, 512, 256);
  drawBrand(ctx, 130, 126, 95);
  ctx.fillStyle = "#2b6146"; ctx.font = "28px Georgia"; ctx.fillText("Patrícia Pilar", 255, 112);
  ctx.font = "16px Arial"; ctx.fillText("APOIO AGRÍCOLA", 255, 151);
  return image;
}
function agroImage(back = false, side = 1) {
  const image = document.createElement("canvas"); image.width = 1024; image.height = 512;
  const ctx = image.getContext("2d");
  ctx.fillStyle = back ? "#17424b" : "#eef0e9"; ctx.fillRect(0, 0, 1024, 512);
  if (!back) {
    ctx.save();
    if (side < 0) { ctx.translate(1024, 0); ctx.scale(-1, 1); }
    ctx.fillStyle = "#17424b"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(150, 0);
    ctx.lineTo(455, 512); ctx.lineTo(0, 512); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#b0c637";
    ctx.beginPath(); ctx.ellipse(90, 300, 95, 105, .1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(267, 478, 55, 110, -.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  const x = back ? 222 : 470;
  ctx.fillStyle = back ? "#f4f3e9" : "#17424b";
  for (const [dx, dy, a] of [[-54,-24,-.5],[-26,-28,.4],[-48,9,-.7]]) {
    ctx.beginPath(); ctx.ellipse(x+dx, 175+dy, 15, 27, a, 0, Math.PI*2); ctx.fill();
  }
  ctx.font = "bold 70px Arial"; ctx.fillText("agropilar", x, 192);
  ctx.fillStyle = "#b0c637"; ctx.fillRect(0, 455, 1024, 57);
  ctx.fillStyle = "#17424b";
  for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.ellipse(28+i*59, 483, 25, 23, -.4, 0, Math.PI*2); ctx.fill(); }
  ctx.font = "24px Arial"; ctx.fillText("agropilar.pt", back ? 270 : 620, 350);
  return image;
}
function makeWheel(materials, x, radius, z, steering) {
  const steeringParent = new THREE.Group(); steeringParent.position.set(x, radius, z);
  const roll = new THREE.Group(); steeringParent.add(roll);
  const tyreGeo = new THREE.CylinderGeometry(radius, radius, .24, 28); tyreGeo.rotateZ(Math.PI / 2);
  const tyre = new THREE.Mesh(tyreGeo, materials.rubber); roll.add(tyre);
  const rimGeo = new THREE.CylinderGeometry(radius * .67, radius * .67, .255, 24); rimGeo.rotateZ(Math.PI / 2);
  roll.add(new THREE.Mesh(rimGeo, materials.alloy));
  const centreGeo = new THREE.CylinderGeometry(radius * .20, radius * .20, .275, 16); centreGeo.rotateZ(Math.PI / 2);
  roll.add(new THREE.Mesh(centreGeo, materials.rubber));
  for (const side of [-1, 1]) {
    const beadGeo = new THREE.TorusGeometry(radius * .85, radius * .11, 6, 24); beadGeo.rotateY(Math.PI / 2); beadGeo.translate(side * .105, 0, 0);
    roll.add(new THREE.Mesh(beadGeo, materials.rubber));
    for (let j = 0; j < 5; j++) {
      const a = j * Math.PI * 2 / 5;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(.03, .035, radius * 1.15), materials.alloy);
      spoke.position.x = side * .132; spoke.rotation.x = a; roll.add(spoke);
    }
  }
  mergeRigid(roll);
  return { mesh: roll, radius, steer: steering, steeringParent };
}
function profileGeometry(shape, width, bevel = .035) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, steps: 1, curveSegments: 12 });
  geometry.rotateY(-Math.PI / 2); geometry.translate(width / 2, 0, 0); return geometry;
}

export function createLightVehicle(kind) {
  if (!SUPPORTED.has(kind)) throw Error(`Veículo ligeiro desconhecido: ${kind}`);
  const isCar = kind === "technical";
  const model = new THREE.Group(); model.name = `vehicle:${kind}`; model.userData.vehicle = kind;
  const rigid = new THREE.Group(); model.add(rigid);
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xeef0e9, roughness: .28, metalness: .18, clearcoat: .48, clearcoatRoughness: .22 });
  const materials = {
    paint, trim: surface(0x25302f), rubber: surface(0x242826, { roughness: .96 }),
    glass: surface(0x35545c, { metalness: .28, roughness: .18 }),
    alloy: surface(0xa4abad, { metalness: .74, roughness: .3 }),
    red: surface(0x913a2b, { emissive: 0x4a1008, emissiveIntensity: .18 }),
    lamp: surface(0xf1ebd3, { emissive: 0xe8d49f, emissiveIntensity: .16 }),
  };
  const add = (geometry, material, x = 0, y = 0, z = 0, parent = rigid) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const box = (x,y,z,w,h,d,mat = paint, radius = .025) => add(new RoundedBoxGeometry(w,h,d,2,Math.min(radius,w*.2,h*.2,d*.2)),mat,x,y,z);
  const sidePanel = (side, z, y, w, h, material) => {
    const mesh = add(new THREE.PlaneGeometry(w,h),material,side*(isCar?1.043:1.04),y,z);
    mesh.rotation.y = side * Math.PI / 2; return mesh;
  };
  const wheels = [];
  const frontAxle = isCar ? -1.4 : -1.4, rearAxle = isCar ? 1.35 : 1.4;
  const radius = isCar ? .38 : .355;
  const body = new THREE.Shape();
  if (isCar) {
    body.moveTo(-2.25,.39); body.lineTo(-2.27,.82); body.quadraticCurveTo(-2.2,1.0,-1.87,1.10);
    body.lineTo(-1.15,1.14); body.lineTo(1.88,1.15); body.quadraticCurveTo(2.24,1.13,2.25,.87); body.lineTo(2.25,.39);
    body.lineTo(rearAxle+.43,radius); body.absarc(rearAxle,radius,.43,0,Math.PI,false);
    body.lineTo(frontAxle+.43,radius); body.absarc(frontAxle,radius,.43,0,Math.PI,false); body.closePath();
    add(profileGeometry(body,2.02,.025),paint);
    const cabin = new THREE.Shape(); cabin.moveTo(-1.25,1.12); cabin.lineTo(-.67,1.73); cabin.quadraticCurveTo(-.55,1.82,-.25,1.82);
    cabin.lineTo(.95,1.82); cabin.quadraticCurveTo(1.20,1.78,1.74,1.16); cabin.closePath();
    add(profileGeometry(cabin,1.75,.018),materials.glass);
    box(0,1.83,.36,1.83,.11,1.45,paint,.03);
    const brandMaterial=textureMaterial(brandImage());
    for (const side of [-1,1]) {
      const aPillar=box(side*.88,1.47,-.95,.065,.83,.06,paint,.01); aPillar.rotation.x=-.76;
      const rearPillar=box(side*.88,1.45,1.37,.075,.80,.075,paint,.01); rearPillar.rotation.x=.69;
      box(side*.90,1.46,.23,.065,.63,.055,materials.trim,.005);
      box(side*.99,1.12,.45,.055,.055,2.72,materials.trim,.005);
      box(side*1.05,1.40,-.92,.10,.17,.27,materials.trim,.025);
      box(side*1.045,1.01,.52,.035,.035,.22,materials.alloy,.005);
      box(side*.73,1.92,.35,.035,.045,1.33,materials.alloy,.01);
      sidePanel(side,.35,.84,1.65,.48,brandMaterial);
    }
    box(0,.49,-2.26,2.06,.20,.08,materials.trim,.025);
    box(0,.73,-2.285,.92,.23,.025,materials.trim,.006);
    for(let j=0;j<4;j++)box(0,.65+j*.045,-2.302,.90,.012,.012,materials.alloy,.003);
    for(const side of [-1,1]) {
      box(side*.79,.91,-2.235,.45,.15,.055,materials.lamp,.03);
      box(side*.79,.96,2.245,.38,.15,.04,materials.red,.025);
    }
    box(0,.48,2.25,2.04,.16,.07,materials.trim,.025);
    box(0,1.22,1.84,1.56,.045,.32,paint,.025);
  } else {
    body.moveTo(-2.34,.37); body.lineTo(-2.35,.80); body.quadraticCurveTo(-2.33,1.02,-2.01,1.12);
    body.lineTo(-1.43,1.17); body.lineTo(-.82,1.83); body.quadraticCurveTo(-.70,1.94,-.47,1.94);
    body.lineTo(1.96,1.94); body.quadraticCurveTo(2.35,1.91,2.35,1.64); body.lineTo(2.35,.37);
    body.lineTo(rearAxle+.405,radius);body.absarc(rearAxle,radius,.405,0,Math.PI,false);
    body.lineTo(frontAxle+.405,radius);body.absarc(frontAxle,radius,.405,0,Math.PI,false);body.closePath();
    add(profileGeometry(body,1.98,.025),paint);
    // Glazed cab surfaces follow the short bonnet and sloping windscreen.
    const screen = box(0,1.49,-1.135,1.72,.84,.035,materials.glass,.01); screen.rotation.x=-.74;
    const commonLivery=kind==='agropilar'?null:textureMaterial(pilarLivery(kind));
    for(const side of [-1,1]) {
      const points = side>0 ? [0,1.18,-1.39,0,1.77,-.84,0,1.78,-.39,0,1.18,-.39] : [0,1.18,-.39,0,1.78,-.39,0,1.77,-.84,0,1.18,-1.39];
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setIndex([0,1,2,0,2,3]);geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,0,1,1,1,1,0],2));geo.computeVertexNormals();
      add(geo,materials.glass,side*1.018);
      box(side*1.05,1.40,-1.18,.10,.20,.28,materials.trim,.03);
      box(side*1.025,1.02,-.24,.045,.035,.22,materials.trim,.006);
      box(side*1.027,.65,.18,.045,.14,2.9,materials.trim,.025);
      box(side*1.027,1.03,1.71,.045,.035,.20,materials.trim,.006);
      const material=commonLivery||textureMaterial(agroImage(false,side));
      sidePanel(side,.84,1.27,2.62,1.10,material);
      // Sliding door reveal is a thin recess, not a second protruding body panel.
      box(side*1.026,1.28,-.34,.015,1.18,.014,materials.trim,.002);
      box(side*.85,.91,-2.35,.40,.18,.045,materials.lamp,.025);
      box(side*.91,1.01,2.37,.13,.58,.035,materials.red,.02);
    }
    const rearMaterial=textureMaterial(kind==='agropilar'?agroImage(true):pilarLivery(kind,{back:true}));
    add(new THREE.PlaneGeometry(1.76,1.26),rearMaterial,0,1.19,2.381);
    box(0,1.22,2.39,.018,1.37,.015,materials.trim,.002);
    box(0,.88,2.395,.30,.055,.005,materials.trim,.01);
    box(0,1.81,2.39,.35,.045,.022,materials.red,.008);
    box(0,.48,-2.35,2.04,.26,.08,materials.trim,.04);
    box(0,.71,-2.385,.87,.26,.022,materials.trim,.01);
    for(let j=0;j<4;j++)box(0,.625+j*.054,-2.397,.80,.014,.005,materials.alloy,.003);
    box(0,.43,2.34,2.05,.19,.11,materials.trim,.025);
    const bonnet=box(0,1.09,-1.89,1.93,.075,.67,paint,.035);bonnet.rotation.x=.05;
    box(0,1.97,.63,1.85,.045,2.63,paint,.02);
  }
  for(const side of [-1,1])for(const z of [frontAxle,rearAxle]) {
    const wheel=makeWheel(materials,side*.95,radius,z,z===frontAxle);model.add(wheel.steeringParent);wheels.push(wheel);
  }
  mergeRigid(rigid);
  // Factory bounds include mirrors and modest trim, matching the collision envelope.
  return { model,wheels,bounds:{width:2.2,length:isCar?4.6:4.8} };
}
