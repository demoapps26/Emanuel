import { Sky } from "three/addons/objects/Sky.js";
import { addCrops, addLeafyTrees, addCanopies } from "./agriculture.js";
import {
  terrainMaterials,
  skyEnvironment,
  contactShadowTexture,
} from "./materials.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  CHARACTERS,
  PLAYER_PERSON_ID,
  registerPersonEntity,
} from "./characters.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { pilarLivery } from "./liveries.js";
import * as THREE from "three";
import { BLOCKS, BOUNDS, OBSTACLES } from "./simulation.js";
const C = { green: 0x1a6046, grass: 0xa0ac72, metal: 0xc4d1c2 };
export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc8dce1);
  const sky = new Sky(); sky.scale.setScalar(1200);
  sky.material.uniforms.turbidity.value=4;
  sky.material.uniforms.rayleigh.value=1.6;
  sky.material.uniforms.mieCoefficient.value=.004;
  sky.material.uniforms.mieDirectionalG.value=.82;
  sky.material.uniforms.sunPosition.value.set(-.7,.65,.6);
  scene.add(sky);
  const reflectionEnvironment = skyEnvironment();
  scene.environment = reflectionEnvironment;
  scene.environmentIntensity = 0.45;
  scene.fog = new THREE.Fog(0xc8dce1, 450, 1200);
  const camera = new THREE.PerspectiveCamera(
    58,
    innerWidth / innerHeight,
    0.3,
    1400,
  );
  scene.add(new THREE.HemisphereLight(0xe5f0ff, 0x5c653e, 0.9));
  const sun = new THREE.DirectionalLight(0xffe3b0, 2.8);
  sun.position.set(-160, 230, 130);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -95,
    right: 95,
    top: 95,
    bottom: -95,
    near: 1,
    far: 700,
  });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.15;
  scene.add(sun);
  scene.add(sun.target);
  const mat = (color, opts = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts });
  const ground = terrainMaterials();
  const materials = {
    grass: ground.grass,
    road: ground.road,
    edge: ground.concrete,
    roof: mat(0xbad5df, { metalness: 0.12, roughness: 0.19, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }),
    wall: mat(0xc5dfdf, { metalness: 0.08, roughness: 0.25, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    green: mat(C.green),
    wood: mat(0x7c6648),
    white: mat(0xf3f0e4),
    black: mat(0x27312f),
    glass: mat(0x33585b, { metalness: 0.3, roughness: 0.25 }),
  };
  const boxGeo = new THREE.BoxGeometry(1, 1, 1),
    roundedBoxGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.08);
  function box(x, y, z, w, h, d, material, parent = scene, shadow = true) {
    const m = new THREE.Mesh(
      parent.userData.vehicle && h > 0.7 ? roundedBoxGeo : boxGeo,
      material,
    );
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    if (material.userData.worldTile) {
      m.geometry = boxGeo.clone();
      const positions = m.geometry.attributes.position,
        uv = m.geometry.attributes.uv,
        tile = material.userData.worldTile;
      for (let i = 0; i < positions.count; i++)
        uv.setXY(
          i,
          (x + positions.getX(i) * w) / tile,
          (z + positions.getZ(i) * d) / tile,
        );
    }

    m.castShadow = shadow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  box(0, -0.6, 0, 2000, 1, 2000, materials.grass, scene, false);
  // Deliberately schematic, unreferenced layout; no aerial tiles are used as textures.
  box(0, -0.01, 47, 505, 0.12, 24, materials.edge, scene, false);
  box(0, 0.08, 47, 505, 0.12, 18, materials.road, scene, false);
  box(13, 0, -90, 22, 0.12, 290, materials.edge, scene, false);
  box(13, 0.1, -90, 16, 0.12, 290, materials.road, scene, false);
  box(-5, 0, 111, 24, 0.12, 115, materials.edge, scene, false);
  box(-5, 0.1, 111, 18, 0.12, 115, materials.road, scene, false);
  box(80, 0.05, 94, 170, 0.12, 70, materials.road, scene, false);
  for (let x = -240; x < 250; x += 18)
    box(x, 0.17, 47, 7, 0.05, 0.35, materials.white, scene, false);
  for (let z = -215; z < 28; z += 18)
    box(13, 0.19, z, 0.3, 0.05, 6, materials.white, scene, false);
  for (let x = 45; x < 150; x += 16) {
    for (const z of [84, 113])
      box(x, 0.17, z, 0.25, 0.05, 22, materials.white, scene, false);
  }
  box(126,.11,27,92,.12,30,materials.road,scene,false);
  box(126,.17,14,92,.18,2.5,materials.edge,scene,false);
  // Raised kerbs and safety bollards at the landscaped islands.
  for(const [x,z] of [[35,28],[56,28],[77,28],[34,65],[160,108]]) {
    for(const side of [-1,1]) box(x+side*3.2,.32,z,.28,.55,8.5,materials.edge);
    for(const side of [-1,1]) box(x,.32,z+side*4.2,6.6,.55,.28,materials.edge);
  }
  for(const x of [26,85,172]) {
    box(x,1.25,22,.3,2.5,.3,mat(0xe1c46b));
    box(x,1.9,22,.32,.3,.32,materials.black);
  }
  const canvasMaterial = (canvas) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
  };
  
  const yellow = mat(0xd6b745);
  const greenhouseSkin=new THREE.Group();scene.add(greenhouseSkin);
  const framePositions = [];
  const line = (a, b) => framePositions.push(...a, ...b);
  const plants = [];
  for (const b of BLOCKS) {
    if (b.site === "armazem") {
      box(b.x, 6, b.z, b.w, 12, b.d, materials.white);
      box(b.x, 12.4, b.z, b.w + 2, 1, b.d + 2, materials.green);
      box(
        b.x - 5,
        4,
        b.z + b.d / 2 + 0.1,
        14,
        8,
        0.3,
        materials.metal ?? materials.wall,
      );
      label("APOIO AGRÍCOLA", b.x, 15, b.z, 25);
      continue;
    }
    box(b.x, 0.2, b.z, b.w + 2, 0.4, b.d + 2, materials.edge, scene, false);
    const bays = Math.round(b.w / 10),
      span = b.w / bays;
    for (let bay = 0; bay < bays; bay++) {
      const x = b.x - b.w / 2 + span * (bay + 0.5),
        left = x - span / 2,
        right = x + span / 2;
      // Transparent skin around actual crop geometry; no solid shed beneath it.
      if (bay === 0 || bay === bays - 1)
        box(bay === 0 ? left : right, 2.8, b.z, .06, 5.5, b.d, materials.wall, greenhouseSkin, false);
      for(const end of [-1,1]) box(x,2.8,b.z+end*b.d/2,span-.12,5.5,.04,materials.wall,greenhouseSkin,false);
      const roofPositions=[], roofIndices=[];
      for(let j=0;j<=16;j++) {
        const xx=-span/2+span*j/16, yy=2.6*Math.sin(j*Math.PI/16);
        roofPositions.push(xx,yy,0,xx,yy,b.d);
        if(j<16){const n=j*2;roofIndices.push(n,n+1,n+2,n+2,n+1,n+3);}
      }
      const roofGeo=new THREE.BufferGeometry();
      roofGeo.setAttribute("position",new THREE.Float32BufferAttribute(roofPositions,3));
      roofGeo.setIndex(roofIndices);roofGeo.computeVertexNormals();
      const roof = new THREE.Mesh(roofGeo,materials.roof);
      roof.position.set(x,5.5,b.z-b.d/2);roof.renderOrder=3;greenhouseSkin.add(roof);
      for (let z = b.z - b.d / 2; z <= b.z + b.d / 2; z += 8) {
        line([left, 0, z], [left, 5.5, z]);
        for (let i = 0; i < 8; i++)
          line(
            [left + (span * i) / 8, 5.5 + 2.6 * Math.sin((i / 8) * Math.PI), z],
            [
              left + (span * (i + 1)) / 8,
              5.5 + 2.6 * Math.sin(((i + 1) / 8) * Math.PI),
              z,
            ],
          );
        line([right, 5.5, z], [right, 0, z]);
      }
      line([x, 8.15, b.z - b.d / 2], [x, 8.15, b.z + b.d / 2]);
      for (let z = b.z - b.d / 2; z <= b.z + b.d / 2; z += 10) {
        // A narrow crop strip outside the closed greenhouses suggests agricultural use.
        if (bay === 0) plants.push({ x: left - 2.4, z });
      }
    }
    for (const side of [-1, 1])
      box(
        b.x + side * (b.w / 2 + 0.05),
        2,
        b.z,
        0.12,
        0.15,
        b.d,
        yellow,
        scene,
        false,
      );
    // Front mullions, gutters and door frames follow the modelled spans.
    for (let x=b.x-b.w/2;x<=b.x+b.w/2+.1;x+=span) {
      line([x,0,b.z+b.d/2],[x,5.5,b.z+b.d/2]);
      line([x,2.5,b.z+b.d/2],[Math.min(x+span,b.x+b.w/2),2.5,b.z+b.d/2]);
      line([x,5.5,b.z-b.d/2],[x,5.5,b.z+b.d/2]);
    }
  }
  addCrops(scene,BLOCKS);
  // Metal tubes have physical thickness, highlights and cast shadows.
  const frameParts=[],direction=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  for(let i=0;i<framePositions.length;i+=6) {
    a.fromArray(framePositions,i);b.fromArray(framePositions,i+3);direction.subVectors(b,a);
    if(direction.length()<.01)continue;
    const part=new THREE.CylinderGeometry(.065,.065,direction.length(),5);
    part.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up,direction.clone().normalize()));
    part.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);frameParts.push(part);
  }
  const frameMesh=new THREE.Mesh(mergeGeometries(frameParts),mat(0xadb9b8,{metalness:.72,roughness:.32}));
  frameMesh.castShadow=true;frameMesh.receiveShadow=true;scene.add(frameMesh);frameParts.forEach(g=>g.dispose());
  label("TOMATES DO OESTE", 85, 14, -70, 54);
  label("FRAMBOESA ENCANTADA 2", -132, 13, 163, 60);
  const rng = (seed) => {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };
  const random = rng(64);
  const trunks = [],
    crowns = [];
  for (let i = 0; i < 310; i++) {
    const x = (random() - 0.5) * 1250,
      z = (random() - 0.5) * 1200;
    if (Math.abs(x) < 260 && Math.abs(z) < 245) continue;
    const h = 7 + random() * 10;
    trunks.push([x, h / 2, z, 1.3, h, 1.3]);
    crowns.push([
      x,
      h + 2,
      z,
      6 + random() * 5,
      9 + random() * 5,
      6 + random() * 5,
    ]);
  }
  for (let x = -220; x < 230; x += 25) {
    trunks.push([x, 3, 192, 1, 6, 1]);
    crowns.push([x, 8, 192, 5, 9, 5]);
  }
  function instances(geometry, material, items) {
    const mesh = new THREE.InstancedMesh(geometry, material, items.length),
      dummy = new THREE.Object3D();
    for (let i = 0; i < items.length; i++) {
      const [x, y, z, a, b, c] = items[i];
      dummy.position.set(x, y, z);
      dummy.scale.set(a, b, c);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  instances(new THREE.CylinderGeometry(0.6, 0.8, 1, 6), materials.wood, trunks);
  addCanopies(scene, crowns);
  instances(
    new THREE.IcosahedronGeometry(1, 0),
    mat(0x51783f),
    plants.map((p) => [p.x, 1.1, p.z, 0.8, 1.6, 0.8]),
  );
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2,
      x = Math.sin(angle) * 850,
      z = Math.cos(angle) * 850;
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 12),
      mat(i % 2 ? 0x83936c : 0x71866a),
    );
    hill.position.set(x, -50, z);
    hill.scale.set(
      220 + random() * 200,
      100 + random() * 70,
      210 + random() * 220,
    );
    scene.add(hill);
  }
  const shrubPositions = [];
  for (const [x, z] of [
    [35, 28],
    [56, 28],
    [77, 28],
    [34, 65],
    [160, 108],
  ]) {
    box(x, 0.22, z, 6, 0.6, 8, materials.edge, scene, false);
    for (let i = 0; i < 7; i++)
      shrubPositions.push([
        x + Math.sin(i * 2.4) * 2,
        0.9 + (i % 3) * 0.5,
        z + Math.cos(i * 2.4) * 3,
        1.8,
        1.4,
        1.8,
      ]);
  }
  instances(new THREE.IcosahedronGeometry(1, 1), mat(0x506b3c), shrubPositions);
  for (const [x, z] of [
    [35, 28],
    [77, 28],
    [160, 108],
  ]) {
    pieceTree(x, z);
  }
  function pieceTree(x, z) {
    box(x, 3, z, 0.6, 6, 0.6, materials.wood);
  }
  addLeafyTrees(scene,[[35,28],[77,28],[160,108]]);
  // Generic avatar: no personal likeness is implied.
  const personEntities = new Map();
  const avatar = registerPersonEntity(
    personEntities,
    PLAYER_PERSON_ID,
    new THREE.Group(),
  );
  scene.add(avatar);
  avatar.scale.setScalar(.68);
  const skin = mat(0xc99b78),
    trousers = mat(0x9c8c69),
    hairMaterial = mat(0x3b3025);
  function piece(geometry, material, parent, x, y, z, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const shirtProfile=[new THREE.Vector2(.67,2.47),new THREE.Vector2(.74,2.62),new THREE.Vector2(.72,3.0),new THREE.Vector2(.79,3.6),new THREE.Vector2(.91,4.1),new THREE.Vector2(.78,4.42),new THREE.Vector2(.32,4.55)];
  const shirtGeo=new THREE.LatheGeometry(shirtProfile,24);
  const sp=shirtGeo.attributes.position;
  for(let i=0;i<sp.count;i++){const y=sp.getY(i);sp.setZ(i,sp.getZ(i)*.64);sp.setX(i,sp.getX(i)*(1+Math.sin(y*21+sp.getZ(i)*4)*.018));}shirtGeo.computeVertexNormals();
  piece(shirtGeo,materials.green,avatar,0,0,0);
  piece(new THREE.CylinderGeometry(.70,.70,.13,24),mat(0x483c2b),avatar,0,2.49,0,1,1,.68);
  piece(new THREE.BoxGeometry(.18,.13,.05),mat(0xaaa08c,{metalness:.7}),avatar,0,2.49,-.49);
  for(const side of [-1,1]) {
    piece(new THREE.SphereGeometry(.14,12,8),skin,avatar,side*.51,5.17,0,.65,1.3,.7);
    piece(new THREE.BoxGeometry(.04,.04,.03),mat(0x302820),avatar,side*.20,5.30,-.52);
    piece(new THREE.CapsuleGeometry(.10,.18,3,10),materials.green,avatar,side*.22,4.47,-.2,1,.65,1);
  }
  piece(
    new THREE.CapsuleGeometry(0.68, 0.35, 4, 12),
    trousers,
    avatar,
    0,
    2.25,
    0,
    1,
    0.6,
    0.65,
  );
  piece(
    new THREE.SphereGeometry(0.63, 20, 16),
    skin,
    avatar,
    0,
    5.18,
    0,
    0.85,
    1.08,
    0.87,
  );
  piece(
    new THREE.SphereGeometry(0.65, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.54),
    hairMaterial,
    avatar,
    0,
    5.32,
    0.02,
    0.88,
    1,
    0.9,
  );
  piece(
    new THREE.CylinderGeometry(0.24, 0.27, 0.45, 12),
    skin,
    avatar,
    0,
    4.65,
    0,
  );
  piece(
    new THREE.SphereGeometry(0.13, 10, 8),
    skin,
    avatar,
    0,
    5.17,
    -0.56,
    0.7,
    1,
    1.2,
  );
  const limbs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.4, 2.35, 0);
    leg.userData.phase = side < 0 ? 0 : Math.PI;
    avatar.add(leg);
    limbs.push(leg);
    piece(
      new THREE.CapsuleGeometry(0.27, 1.5, 4, 10),
      trousers,
      leg,
      0,
      -0.95,
      0,
    );
    piece(
      new THREE.SphereGeometry(1, 12, 10),
      materials.black,
      leg,
      0,
      -2.08,
      -0.16,
      0.32,
      0.24,
      0.58,
    );
    const arm = new THREE.Group();
    arm.position.set(side * 0.97, 4.22, 0);
    arm.userData.phase = side < 0 ? Math.PI : 0;
    avatar.add(arm);
    limbs.push(arm);
    piece(
      new THREE.CapsuleGeometry(0.25, 0.58, 4, 10),
      materials.green,
      arm,
      0,
      -0.38,
      0,
    );
    piece(new THREE.CapsuleGeometry(0.18, 0.48, 4, 10), skin, arm, 0, -1.12, 0);
    piece(
      new THREE.SphereGeometry(0.21, 10, 8),
      skin,
      arm,
      0,
      -1.58,
      -0.03,
      0.8,
      1.2,
      1,
    );
  }
  const shirtCanvas = document.createElement("canvas");
  shirtCanvas.width = shirtCanvas.height = 128;
  const shirtCtx = shirtCanvas.getContext("2d");
  shirtCtx.strokeStyle = "#d7e6bd";
  shirtCtx.lineWidth = 7;
  shirtCtx.beginPath();
  shirtCtx.moveTo(50, 100);
  shirtCtx.quadraticCurveTo(20, 55, 43, 25);
  shirtCtx.quadraticCurveTo(83, 23, 59, 72);
  shirtCtx.moveTo(52, 90);
  shirtCtx.quadraticCurveTo(90, 83, 101, 37);
  shirtCtx.quadraticCurveTo(57, 31, 52, 90);
  shirtCtx.stroke();
  const shirtTexture = new THREE.CanvasTexture(shirtCanvas);
  shirtTexture.colorSpace = THREE.SRGBColorSpace;
  const shirtBadge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.55),
    new THREE.MeshStandardMaterial({
      map: shirtTexture,
      transparent: true,
      depthWrite: false,
      roughness: 1,
    }),
  );
  shirtBadge.position.set(0, 4, 0.58);
  avatar.add(shirtBadge);
  const npcModels = [];
  for (const c of CHARACTERS) {
    const model = registerPersonEntity(
      personEntities,
      c.id,
      avatar.clone(true),
    );
    const shirt = mat(c.color);
    model.traverse((child) => {
      if (child.isMesh && child.material === materials.green)
        child.material = shirt;
    });
    model.position.set(c.x, 0, c.z);
    model.rotation.y = Math.PI;
    scene.add(model);
    npcModels.push(model);
    label(c.name.toLocaleUpperCase("pt-PT"), c.x, 8, c.z, 10);
  }
  // Separate automotive paint keeps reflections out of foliage and cloth.
  const carPaint=new THREE.MeshPhysicalMaterial({color:0xe9ece7,metalness:.22,roughness:.24,clearcoat:.6,clearcoatRoughness:.17});
  const car = new THREE.Group();
  car.userData.vehicle = true;
  scene.add(car);
  // Shaped body panels include the wheel openings instead of a rectangular slab.
  const carOutline=new THREE.Shape();
  carOutline.moveTo(-4.2,.85);carOutline.lineTo(-4.25,1.65);carOutline.quadraticCurveTo(-4.15,2.25,-3.65,2.4);
  carOutline.lineTo(-1.5,2.55);carOutline.lineTo(3.5,2.55);carOutline.quadraticCurveTo(4.2,2.4,4.2,1.9);carOutline.lineTo(4.2,.85);
  carOutline.lineTo(3.65,.95);carOutline.absarc(2.6,.95,1.05,0,Math.PI,false);
  carOutline.lineTo(-1.45,.95);carOutline.absarc(-2.5,.95,1.05,0,Math.PI,false);carOutline.closePath();
  const bodyGeo=new THREE.ExtrudeGeometry(carOutline,{depth:4.25,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.08,bevelThickness:.08,curveSegments:16});
  bodyGeo.rotateY(-Math.PI/2);bodyGeo.translate(2.125,0,0);
  const body=new THREE.Mesh(bodyGeo,materials.white);body.castShadow=true;car.add(body);
  const windshield = box(0, 2.85, -1.68, 3.6, 1.7, .08, materials.glass, car);
  windshield.rotation.x = -.40;
  const cabinShape=new THREE.Shape();cabinShape.moveTo(-1.9,2.45);cabinShape.lineTo(-1.2,3.65);cabinShape.quadraticCurveTo(-.9,3.85,-.5,3.85);cabinShape.lineTo(1.7,3.85);cabinShape.quadraticCurveTo(2.5,3.8,3.4,2.45);cabinShape.closePath();
  const cabinGeo=new THREE.ExtrudeGeometry(cabinShape,{depth:3.65,bevelEnabled:true,bevelSegments:3,bevelSize:.08,bevelThickness:.08});cabinGeo.rotateY(-Math.PI/2);cabinGeo.translate(1.825,0,0);
  const cabin=new THREE.Mesh(cabinGeo,materials.glass);cabin.castShadow=true;car.add(cabin);
  const bonnet=box(0,2.35,-2.85,4.3,.45,2.2,materials.white,car);bonnet.rotation.x=.08;
  for(const side of [-1,1]) {
    const pillar=box(side*1.86,2.9,-1.7,.14,1.85,.17,materials.white,car);pillar.rotation.x=-.4;
    box(side*1.93,2.83,.4,.13,1.7,.15,materials.white,car);
    box(side*2.1,2.8,-1.65,.55,.35,.65,materials.black,car);
    box(side*2.24,1.7,.1,.06,.12,.5,materials.black,car);
    box(side*1.6,3.91,.5,.12,.10,3.6,mat(0x7a8180,{metalness:.7}),car);
  }
  box(0, 3.86, .55, 3.72, .16, 2.9, materials.white, car);
  box(0, 1.25, -4.1, 4.3, 0.55, 0.25, materials.black, car);
  for (const x of [-1.5, 1.5])
    box(
      x,
      2,
      -4.12,
      0.9,
      0.4,
      0.12,
      mat(0xffecc1, { emissive: 0xffcf75, emissiveIntensity: 0.5 }),
      car,
    );
  for (const x of [-1.5, 1.5]) box(x, 2, 4.1, 0.8, 0.3, 0.12, mat(0xb95439), car);
  box(0,1.9,-4.27,2.2,.45,.08,materials.black,car);
  for(let row=0;row<4;row++)box(0,1.73+row*.11,-4.33,2.1,.025,.025,mat(0x9ba3a1,{metalness:.7}),car);
  const wheels = [];
  for (const x of [-2.2, 2.2])
    for (const z of [-2.5, 2.6]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 0.95, 0.65, 32),
        materials.black,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.95, z);
      wheel.castShadow = true;
      car.add(wheel);
      wheels.push(wheel);
    }
  for(const wheel of wheels) {
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.64,.64,.68,24),mat(0x9ca4a5,{metalness:.8,roughness:.28}));
    hub.position.copy(wheel.position);hub.rotation.z=Math.PI/2;car.add(hub);
    for(let i=0;i<5;i++) {
      const a=i*Math.PI*2/5;
      const bolt=new THREE.Mesh(new THREE.SphereGeometry(.08,6,4),materials.black);
      bolt.position.set(wheel.position.x+Math.sign(wheel.position.x)*.35,.95+Math.sin(a)*.30,wheel.position.z+Math.cos(a)*.30);car.add(bolt);
    }
  }
  // Canvas marks are provisional text, not supplied brand artwork.
  const badgeCanvas = document.createElement("canvas");
  badgeCanvas.width = 512;
  badgeCanvas.height = 128;
  const bc = badgeCanvas.getContext("2d");
  bc.fillStyle = "#f3f0e4";
  bc.fillRect(0, 0, 512, 128);
  bc.fillStyle = "#1a6046";
  bc.font = "bold 48px Georgia";
  bc.textAlign = "center";
  bc.fillText("Patrícia Pilar", 256, 63);
  bc.font = "19px sans-serif";
  bc.fillText("VEÍCULO DE DEMONSTRAÇÃO", 256, 103);
  const badgeTexture = new THREE.CanvasTexture(badgeCanvas);
  badgeTexture.colorSpace = THREE.SRGBColorSpace;
  for (const side of [-1, 1]) {
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 0.75),
      new THREE.MeshBasicMaterial({ map: badgeTexture }),
    );
    badge.rotation.y = (side * Math.PI) / 2;
    badge.position.set(side * 2.23, 1.9, 0.6);
    car.add(badge);
  }
  // Simplified Agropilar van based on the user's front/rear/side photographs.
  const van = new THREE.Group();
  van.userData.vehicle = true;
  scene.add(van);
  const teal = mat(0x163e49),
    lime = mat(0xb1c83b);
  box(0, 1.55, 0, 4.7, 1.5, 8.6, materials.white, van);
  box(0, 3, 1.15, 4.6, 2.4, 6, materials.white, van);
  box(0, 4.25, 1.1, 4.6, 0.25, 6.2, materials.white, van);
  box(0, 2.8, -2.1, 4.25, 1.65, 1.2, materials.glass, van);
  box(0, 2.35, -3.35, 4.5, 0.45, 2.1, materials.white, van);
  box(0, 1.15, -4.4, 4.65, 0.8, 0.25, materials.black, van);
  box(0, 1.8, -4.43, 2.4, 0.7, 0.12, materials.black, van);
  for (const x of [-1.8, 1.8])
    box(x, 2, -4.44, 1, 0.45, 0.15, mat(0xe6e5c9), van);
  for (const side of [-1, 1]) {
    box(side * 2.36, 3.1, -0.5, 0.1, 1.3, 1.6, materials.glass, van);
    box(side * 2.64, 2.95, -1.9, 0.45, 0.65, 0.7, materials.black, van);
    box(side * 2.37, 2.4, 0.35, 0.1, 0.14, 0.7, materials.black, van);
  }
  function vanLivery(side = 1, back = false) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext("2d");
    ctx.fillStyle = back ? "#163e49" : "#f3f0e4";
    ctx.fillRect(0, 0, 1024, 512);
    if (!back) {
      ctx.save();
      if (side < 0) {
        ctx.translate(1024, 0);
        ctx.scale(-1, 1);
      }
      ctx.fillStyle = "#163e49";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(250, 0);
      ctx.lineTo(490, 512);
      ctx.lineTo(0, 512);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#b1c83b";
      ctx.beginPath();
      ctx.arc(155, 355, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(300, 443, 52, 100, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const logoX = back ? 160 : 450,
      logoY = back ? 150 : 150;
    ctx.fillStyle = back ? "#f1f1e3" : "#17444b";
    ctx.beginPath();
    ctx.ellipse(logoX - 47, logoY - 28, 15, 28, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(logoX - 18, logoY - 35, 14, 25, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = back ? "#f1f1e3" : "#b1c83b";
    ctx.beginPath();
    ctx.ellipse(logoX - 42, logoY + 7, 12, 21, -0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = back ? "#f1f1e3" : "#17444b";
    ctx.font = "bold 65px Arial";
    ctx.fillText("agropilar", logoX + 8, logoY + 18);
    ctx.fillStyle = "#b1c83b";
    ctx.fillRect(0, 460, 1024, 52);
    ctx.fillStyle = "#163e49";
    for (let x = 0; x < 1024; x += 60) {
      ctx.beginPath();
      ctx.ellipse(x + 28, 486, 24, 21, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = "18px Arial";
    ctx.fillStyle = back ? "#d2ddc5" : "#3a5d58";
    ctx.fillText("MODELO APROXIMADO · SIMULAÇÃO", back ? 145 : 390, 420);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: texture });
  }
  for (const side of [-1, 1]) {
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 2.6),
      vanLivery(side),
    );
    decal.rotation.y = (side * Math.PI) / 2;
    decal.position.set(side * 2.36, 2.9, 1.7);
    decal.name = `livery-side:${side}`;
    van.add(decal);
  }
  box(0, 2.9, 4.29, 4.65, 2.8, 0.1, teal, van).name = "rear-panel";
  const rear = new THREE.Mesh(
    new THREE.PlaneGeometry(4.65, 2.8),
    vanLivery(1, true),
  );
  rear.name = "livery-rear";
  rear.position.set(0, 2.9, 4.36);
  van.add(rear);
  box(0, 2.9, 4.4, 0.06, 2.8, 0.06, materials.black, van);
  for (const x of [-2.1, 2.1])
    box(x, 2.4, 4.45, 0.3, 1.5, 0.15, mat(0xb53e2a), van);
  box(0, 1.15, 4.5, 4.7, 0.6, 0.2, materials.black, van);
  const vanWheels = [];
  for (const x of [-2.3, 2.3])
    for (const z of [-2.7, 2.8]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 0.65, 20),
        materials.black,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 1, z);
      wheel.castShadow = true;
      van.add(wheel);
      wheel.name = "wheel";
      vanWheels.push(wheel);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.6, 0.68, 16),
        mat(0x9a9c93, { metalness: 0.6 }),
      );
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(wheel.position);
      van.add(hub);
    }

  const vehicleModels = { technical: car, agropilar: van };
  const wheelSets = { technical: wheels, agropilar: vanWheels };
  for (const kind of ["biological", "agricultural"]) {
    const model = van.clone(true);
    model.getObjectByName("rear-panel").material = materials.white;
    for (const side of [-1, 1])
      model.getObjectByName(`livery-side:${side}`).material = canvasMaterial(
        pilarLivery(kind),
      );
    model.getObjectByName("livery-rear").material = canvasMaterial(
      pilarLivery(kind, { back: true }),
    );
    scene.add(model);
    vehicleModels[kind] = model;
    wheelSets[kind] = [];
    model.traverse((child) => {
      if (child.name === "wheel") wheelSets[kind].push(child);
    });
  }
  // White tractor + decorated three-axle semitrailer, inspired by the supplied photo.
  const truck = new THREE.Group();
  truck.userData.vehicle = true;
  truck.position.set(135, 0, 82);
  scene.add(truck);
  box(0, 7.6, 4, 7.8, 10.6, 30, materials.white, truck);
  box(0, 2.1, 4, 7.5, 0.8, 30, materials.black, truck);
  box(0, 5, -15, 7.2, 8.4, 7, materials.white, truck);
  box(0, 9.3, -14, 7.25, 0.8, 6, materials.white, truck);
  box(0, 6.4, -18.56, 6.4, 2.6, 0.12, materials.glass, truck);
  box(0, 2.5, -18.58, 6.3, 1.7, 0.14, materials.black, truck);
  for (const side of [-1, 1]) {
    box(side * 3.66, 6.5, -15.4, 0.12, 2.5, 3.8, materials.glass, truck);
    box(side * 4.15, 6, -17, 0.8, 1.1, 0.7, materials.black, truck);
    const wrap = new THREE.Mesh(
      new THREE.PlaneGeometry(29.9, 10.4),
      canvasMaterial(pilarLivery("truck")),
    );
    wrap.rotation.y = (side * Math.PI) / 2;
    wrap.position.set(side * 3.92, 7.6, 4);
    truck.add(wrap);
    box(side * 2.7, 2.2, -18.7, 1, 0.6, 0.2, mat(0xf7e4ab), truck);
  }
  const rearWrap = new THREE.Mesh(
    new THREE.PlaneGeometry(7.7, 10.4),
    canvasMaterial(pilarLivery("truck")),
  );
  rearWrap.position.set(0, 7.6, 19.06);
  truck.add(rearWrap);
  box(0, 7.6, 19.1, 0.08, 10.5, 0.1, materials.black, truck);
  for (const x of [-3.7, 3.7])
    for (const z of [-15, -5, 8, 12, 16]) {
      const w = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 0.8, 16),
        materials.black,
      );
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 1.5, z);
      truck.add(w);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 0.85, 12),
        mat(0xa3a49c, { metalness: 0.5 }),
      );
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(w.position);
      truck.add(hub);
    }
  // Combine rigid parts by material to avoid one draw call per body panel.
  function batchRigidParts(group, moving = []) {
    const batches = new Map();
    group.updateMatrixWorld(true);
    const inverse = group.matrixWorld.clone().invert(),
      children = [];
    group.traverse((child) => {
      if (child !== group) children.push(child);
    });
    for (const child of children) {
      if (
        !child.isMesh ||
        moving.includes(child) ||
        Array.isArray(child.material)
      )
        continue;
      const relative = new THREE.Matrix4().multiplyMatrices(
        inverse,
        child.matrixWorld,
      );
      const baked = child.geometry.clone().applyMatrix4(relative);
      const geometry = baked.index ? baked.toNonIndexed() : baked;
      if (geometry !== baked) baked.dispose();
      const key = child.material.uuid;
      if (!batches.has(key))
        batches.set(key, { material: child.material, geometries: [] });
      batches.get(key).geometries.push(geometry);
      child.parent.remove(child);
    }
    for (const { material, geometries } of batches.values()) {
      const merged = mergeGeometries(geometries);
      if (!merged)
        throw Error("Não foi possível preparar a geometria dos veículos.");
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      geometries.forEach((g) => g.dispose());
    }
  }
  for (const [kind, model] of Object.entries(vehicleModels)) {
    model.traverse(m=>{if(m.isMesh && m.material===materials.white)m.material=carPaint;});
    batchRigidParts(model, wheelSets[kind]);
  }
  batchRigidParts(truck);
  batchRigidParts(greenhouseSkin);
  greenhouseSkin.traverse(mesh=>{if(mesh.isMesh)mesh.castShadow=false;});
  npcModels.forEach((model) => batchRigidParts(model));
  function label(text, x, y, z, width) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#164b3e";
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = "#f6f1dd";
    ctx.textAlign = "center";
    ctx.font = "bold 46px sans-serif";
    ctx.fillText(text, 512, 80);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, depthTest: true }),
    );
    sprite.position.set(x, y, z);
    sprite.scale.set(width, width / 8, 1);
    scene.add(sprite);
  }
  const raycaster = new THREE.Raycaster(),
    target = new THREE.Vector3(),
    desired = new THREE.Vector3(),
    offset = new THREE.Vector3();
  // Simplified collision boxes for the camera, avoiding thousands of mesh raycasts.
  const cameraObstacles = OBSTACLES.map((b) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, 10, b.d));
    m.position.set(b.x, 5, b.z);
    m.updateMatrixWorld();
    return m;
  });
  let orbit = 0,
    pitch = 0.22,
    zoom = 1,
    dragging = false,
    lastX = 0,
    lastY = 0;
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointerup", () => (dragging = false));
  canvas.addEventListener("pointercancel", () => (dragging = false));
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    orbit -= (e.clientX - lastX) * 0.005;
    pitch = Math.max(0.12, Math.min(1.15, pitch + (e.clientY - lastY) * 0.004));
    lastX = e.clientX;
    lastY = e.clientY;
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoom = Math.max(0.6, Math.min(2.5, zoom + e.deltaY * 0.001));
    },
    { passive: false },
  );
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x182217,
    map: contactShadowTexture(),
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const contactShadows = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    shadowMaterial,
    10,
  );
  contactShadows.frustumCulled = false;
  scene.add(contactShadows);
  const shadowDummy = new THREE.Object3D();
  function updateContactShadows(state) {
    const items = [
      {
        x: state.player.x,
        z: state.player.z,
        w: 3.6,
        d: 3.6,
        visible: !state.driving,
      },
      ...CHARACTERS.map((c) => ({ ...c, w: 3.6, d: 3.6, visible: true })),
      ...[state.car, ...state.parkedCars].map((v) => ({
        ...v,
        w: 8,
        d: 12,
        visible: true,
      })),
      { x: 135, z: 82, w: 12, d: 42, visible: true },
    ];
    items.forEach((p, i) => {
      shadowDummy.position.set(p.x, 0.19, p.z);
      shadowDummy.rotation.set(-Math.PI / 2, 0, p.yaw || 0);
      shadowDummy.scale.set(p.visible ? p.w : 0, p.visible ? p.d : 0, 1);
      shadowDummy.updateMatrix();
      contactShadows.setMatrixAt(i, shadowDummy.matrix);
    });
    contactShadows.instanceMatrix.needsUpdate = true;
  }
  let walkTime = 0,
    carOrbit = 0,
    wasDriving = false,
    first = true;
  function render(state, dt, movement, overview = false) {
    updateContactShadows(state);
    avatar.position.set(state.player.x, 0, state.player.z);
    avatar.rotation.y = -state.player.yaw;
    avatar.visible = !state.driving;
    for (const v of [state.car, ...state.parkedCars]) {
      const model = vehicleModels[v.kind];
      model.position.set(v.x, 0, v.z);
      model.rotation.y = -v.yaw;
    }
    if (movement && !state.driving) walkTime += dt * 10;
    limbs.forEach(
      (l, i) =>
        (l.rotation.x =
          movement && !state.driving
            ? Math.sin(walkTime + l.userData.phase) * 0.38
            : 0),
    );
    wheelSets[state.car.kind].forEach(
      (w) => (w.rotation.x += state.car.speed * dt),
    );
    if (state.driving) {
      if (!wasDriving) carOrbit = state.car.yaw;
      const delta = Math.atan2(
        Math.sin(state.car.yaw - carOrbit),
        Math.cos(state.car.yaw - carOrbit),
      );
      carOrbit += delta * Math.min(1, dt * 2);
    } else if (wasDriving) orbit += carOrbit;
    const yaw = orbit + (state.driving ? carOrbit : 0),
      p = state.driving ? state.car : state.player;
    target.set(p.x, state.driving ? 3.3 : 2.7, p.z);
    sun.position.set(p.x-100,95,p.z+85);
    sun.target.position.set(p.x,0,p.z);
    const distance = (state.driving ? 25 : 17) * zoom;
    desired.set(
      p.x - Math.sin(yaw) * distance * Math.cos(pitch),
      target.y + Math.sin(pitch) * distance,
      p.z + Math.cos(yaw) * distance * Math.cos(pitch),
    );
    offset.copy(desired).sub(target);
    const length = offset.length();
    raycaster.set(target, offset.normalize());
    raycaster.far = length;
    const hits = raycaster.intersectObjects(cameraObstacles, false);
    if (hits.length)
      desired
        .copy(target)
        .addScaledVector(offset, Math.max(1, hits[0].distance - 0.8));
    if (overview) {
      desired.set(205, 165, 310);
      target.set(-20, 0, -15);
      first = true;
    }
    camera.position.lerp(desired, first ? 1 : 1 - Math.exp(-dt * 10));
    camera.position.y = Math.max(1, camera.position.y);
    camera.lookAt(target);
    renderer.render(scene, camera);
    first = false;
    wasDriving = state.driving;
    return yaw;
  }
  const lowMaterials=new Map(), fullMaterials=new Map();
  function quality(value) {
    sky.visible=value!=="low";
    scene.background=value==="low"?reflectionEnvironment:new THREE.Color(0xc8dce1);
    scene.traverse(mesh=>{
      if(!mesh.isMesh || mesh===sky || Array.isArray(mesh.material))return;
      if(mesh.userData.cropInstances)mesh.count=value==="low"?Math.ceil(mesh.userData.cropInstances/4):mesh.userData.cropInstances;
      if(value==="low" && mesh.material.isMeshStandardMaterial) {
        const original=mesh.material;
        if(!lowMaterials.has(original.uuid)) {
          const simple=new THREE.MeshLambertMaterial({color:original.color,map:original.map,alphaTest:original.alphaTest,side:original.side,transparent:original.transparent,opacity:original.opacity,depthWrite:original.depthWrite,vertexColors:original.vertexColors});
          lowMaterials.set(original.uuid,simple);fullMaterials.set(simple.uuid,original);
        }
        mesh.material=lowMaterials.get(original.uuid);
      } else if(value!=="low" && fullMaterials.has(mesh.material.uuid))mesh.material=fullMaterials.get(mesh.material.uuid);
    });
    scene.environment = value === "low" ? null : reflectionEnvironment;
    Object.values(materials).forEach((m) => {
      if (m.map) m.map.anisotropy = value === "low" ? 1 : 4;
    });
    renderer.shadowMap.enabled = value !== "low";
    renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        value === "high" ? 2 : value === "medium" ? 1.5 : 0.6,
      ),
    );
    sun.shadow.mapSize.set(
      value === "high" ? 2048 : 1024,
      value === "high" ? 2048 : 1024,
    );
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
  }
  return {
    recommendedQuality: (() => {
      const gl = renderer.getContext(), ext = gl.getExtension("WEBGL_debug_renderer_info");
      const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "";
      return /swiftshader|llvmpipe|software/i.test(name) ? "low" : "high";
    })(),
    render,
    quality,
    resetCamera() {
      orbit = 0;
      pitch = 0.22;
      zoom = 1;
      first = true;
    },
    renderer,
    entityPersonIds: Object.freeze([...personEntities.keys()]),
  };
}
export function drawMap(canvas, state, large = false) {
  const ctx = canvas.getContext("2d"),
    w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#dbe1c6";
  ctx.fillRect(0, 0, w, h);
  const sx = w / (BOUNDS.maxX - BOUNDS.minX),
    sz = h / (BOUNDS.maxZ - BOUNDS.minZ);
  const x = (v) => (v - BOUNDS.minX) * sx,
    z = (v) => (v - BOUNDS.minZ) * sz;
  ctx.strokeStyle = "#bbc5a7";
  ctx.lineWidth = 1;
  for (let n = -200; n < 250; n += 50) {
    ctx.beginPath();
    ctx.moveTo(x(n), 0);
    ctx.lineTo(x(n), h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, z(n));
    ctx.lineTo(w, z(n));
    ctx.stroke();
  }
  ctx.fillStyle = "#9a9e8d";
  ctx.fillRect(0, z(38), w, 18 * sz);
  ctx.fillRect(x(5), 0, 16 * sx, z(38));
  ctx.fillRect(x(-14), z(56), 18 * sx, 115 * sz);
  for (const b of BLOCKS) {
    ctx.fillStyle =
      b.site === "framboesa_2"
        ? "#729c83"
        : b.site === "armazem"
          ? "#a19579"
          : "#9cb9ac";
    ctx.fillRect(x(b.x - b.w / 2), z(b.z - b.d / 2), b.w * sx, b.d * sz);
    ctx.strokeStyle = "#e6ecdb";
    ctx.lineWidth = 1;
    for (let n = b.x - b.w / 2; n < b.x + b.w / 2; n += 10) {
      ctx.beginPath();
      ctx.moveTo(x(n), z(b.z - b.d / 2));
      ctx.lineTo(x(n), z(b.z + b.d / 2));
      ctx.stroke();
    }
  }
  ctx.fillStyle = "#234d3e";
  ctx.font = `600 ${large ? 17 : 11}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(large ? "Tomates do Oeste" : "TO", x(88), z(-57));
  ctx.fillText(large ? "Framboesa Encantada 2" : "FE 2", x(-128), z(177));
  for (const v of [state.car, ...state.parkedCars]) {
    ctx.fillStyle =
      v.kind === "agropilar"
        ? "#b1c83b"
        : v.kind === "biological"
          ? "#37a751"
          : v.kind === "agricultural"
            ? "#d36b42"
            : "#ffffff";
    ctx.strokeStyle = "#245c49";
    ctx.lineWidth = 2;
    ctx.fillRect(x(v.x) - 4, z(v.z) - 5, 8, 10);
    ctx.strokeRect(x(v.x) - 4, z(v.z) - 5, 8, 10);
  }
  for (const c of CHARACTERS) {
    ctx.fillStyle = "#4d746e";
    ctx.beginPath();
    ctx.arc(x(c.x), z(c.z), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = state.driving ? state.car : state.player;
  ctx.save();
  ctx.translate(x(p.x), z(p.z));
  ctx.rotate(p.yaw);
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(-6, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(6, 6);
  ctx.closePath();
  ctx.fillStyle = "#e8c35d";
  ctx.strokeStyle = "#244b3c";
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#365445";
  ctx.textAlign = "right";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("N ↑", w - 12, 20);
}
