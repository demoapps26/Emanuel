import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { terrainMaterials,skyEnvironment,contactShadowTexture } from './materials.js';
import { createFarmScenery } from './farm-scenery.js';
import { createActors } from './actors.js';
import { createLightVehicle } from './light-vehicles.js';
import { createHeavyVehicle } from './heavy-vehicles.js';
import { getSiteLayout } from './sites.js';
import { vehicleFootprint } from './simulation.js';
import { VEHICLE_NAMES,VEHICLE_SPECS } from './fleet.js';

export function createWorld(canvas) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.08,3200);
  const sky=new Sky();sky.scale.setScalar(1800);Object.assign(sky.material.uniforms.turbidity,{value:4});sky.material.uniforms.rayleigh.value=1.8;sky.material.uniforms.sunPosition.value.set(-.8,.65,.4);scene.add(sky);
  const environment=skyEnvironment();scene.environment=environment;scene.environmentIntensity=.5;scene.fog=new THREE.Fog(0xcad9dd,650,1800);
  scene.add(new THREE.HemisphereLight(0xe4eff7,0x71754c,1.15));
  const sun=new THREE.DirectionalLight(0xffe6bc,2.8);sun.position.set(-80,110,65);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00015;sun.shadow.normalBias=.025;
  Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:350});scene.add(sun,sun.target);
  const ground=terrainMaterials(),persistentMaterials=new Set(Object.values(ground));
  const landGeo=new THREE.PlaneGeometry(8000,8000);landGeo.rotateX(-Math.PI/2);
  const uv=landGeo.attributes.uv,p=landGeo.attributes.position;
  for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/ground.grass.userData.worldTile,p.getZ(i)/ground.grass.userData.worldTile);
  const land=new THREE.Mesh(landGeo,ground.grass);land.position.y=-.11;land.receiveShadow=true;scene.add(land);
  const actors=createActors();scene.add(actors.player,...actors.npcs.values());
  const fleet={};
  for(const kind of Object.keys(VEHICLE_NAMES)) {
    const rig=['technical','agropilar','biological','agricultural'].includes(kind)?createLightVehicle(kind):createHeavyVehicle(kind);
    fleet[kind]=rig;rig.model.name=`veiculo:${kind}`;scene.add(rig.model);
  }
  const lowMaterials=new Map(),fullMaterials=new Map();let qualityValue='high',farm=null,loadedSite=null,siteLayout=null,cameraObstacles=[];
  function disposeFarm() {
    if(!farm)return;
    const geometries=new Set(),materials=new Set(),textures=new Set();
    farm.group.traverse(m=>{if(m.geometry)geometries.add(m.geometry);if(m.material)for(const mat of(Array.isArray(m.material)?m.material:[m.material]))materials.add(mat);});
    farm.group.removeFromParent();geometries.forEach(g=>g.dispose());
    for(const mat of materials) {
      const original=fullMaterials.get(mat.uuid)||mat;
      if(persistentMaterials.has(original))continue;
      const simple=lowMaterials.get(original.uuid);
      lowMaterials.delete(original.uuid);if(simple){fullMaterials.delete(simple.uuid);simple.dispose();}
      for(const value of Object.values(original))if(value?.isTexture)textures.add(value);
      original.dispose();
    }
    textures.forEach(t=>t.dispose());
    cameraObstacles.forEach(m=>{m.geometry.dispose();m.material.dispose();});cameraObstacles=[];
  }
  function surface(parent,rect,material,margin=0,y=.02) {
    const geo=new THREE.PlaneGeometry(rect.w+margin,rect.d+margin);geo.rotateX(-Math.PI/2);geo.rotateY(-(rect.rotation||0));geo.translate(rect.x,y,rect.z);
    const positions=geo.attributes.position,uv=geo.attributes.uv,tile=material.userData.worldTile||5;
    for(let i=0;i<positions.count;i++)uv.setXY(i,positions.getX(i)/tile,positions.getZ(i)/tile);
    const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;parent.add(mesh);
  }
  function loadSite(state) {
    if(loadedSite===state.siteId)return;
    disposeFarm();siteLayout=getSiteLayout(state.siteId);farm=createFarmScenery(siteLayout);scene.add(farm.group);
    for(const road of siteLayout.roads) {
      surface(farm.group,road,ground.concrete,1.3,.005);
      surface(farm.group,road,siteLayout.id==='sede'?ground.road:ground.concrete,0,.018);
    }
    surface(farm.group,siteLayout.yard,siteLayout.id==='sede'?ground.road:ground.concrete,0,.025);
    // Parking marks belong to the additional simulation yard, not surveyed bays.
    const marks=new THREE.Group();farm.group.add(marks);
    const paint=new THREE.MeshStandardMaterial({color:0xe8e5d7,roughness:1});
    for(const v of Object.values(siteLayout.vehicleSpawns)) {
      for(const side of[-1,1]) {
        const m=new THREE.Mesh(new THREE.BoxGeometry(.06,.01,6),paint);m.position.set(v.x+side*2,.042,v.z);marks.add(m);
      }
    }
    for(const b of [...siteLayout.blocks,...siteLayout.props.filter(p=>p.type==='terrace'&&p.y>.2)]) {
      const h=b.type==='terrace'?b.y:(b.height||6.2)+(b.y||0),m=new THREE.Mesh(new THREE.BoxGeometry(b.w,h,b.d));
      m.position.set(b.x,h/2,b.z);m.rotation.y=-(b.rotation||0);m.updateMatrixWorld();cameraObstacles.push(m);
    }
    loadedSite=state.siteId;first=true;wasDriving=false;orbit=0;zoom=1;
    quality(qualityValue);
  }
  function quality(value) {
    qualityValue=value;sky.visible=value!=='low';scene.background=value==='low'?environment:new THREE.Color(0xcad9dd);scene.environment=value==='low'?null:environment;
    scene.traverse(mesh=>{
      if(!mesh.isMesh||mesh===sky||Array.isArray(mesh.material))return;
      if(mesh.userData.cropInstances)mesh.count=value==='low'?Math.ceil(mesh.userData.cropInstances/4):mesh.userData.cropInstances;
      if(value==='low'&&mesh.material.isMeshStandardMaterial) {
        const original=mesh.material;
        if(!lowMaterials.has(original.uuid)) {
          const simple=new THREE.MeshLambertMaterial({color:original.color,map:original.map,alphaMap:original.alphaMap,alphaTest:original.alphaTest,side:original.side,transparent:original.transparent,opacity:original.opacity,depthWrite:original.depthWrite,vertexColors:original.vertexColors,emissive:original.emissive,emissiveMap:original.emissiveMap});
          lowMaterials.set(original.uuid,simple);fullMaterials.set(simple.uuid,original);
        }
        mesh.material=lowMaterials.get(original.uuid);
      }else if(value!=='low'&&fullMaterials.has(mesh.material.uuid))mesh.material=fullMaterials.get(mesh.material.uuid);
    });
    renderer.shadowMap.enabled=value!=='low';renderer.setPixelRatio(Math.min(devicePixelRatio,value==='high'?1.75:value==='medium'?1.25:.65));
    sun.shadow.mapSize.set(value==='high'?2048:1024,value==='high'?2048:1024);sun.shadow.map?.dispose();sun.shadow.map=null;
  }
  const contacts=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0x1e281b,map:contactShadowTexture(),transparent:true,opacity:.3,depthWrite:false}),Object.keys(fleet).length+actors.entityPersonIds.length+1);
  contacts.frustumCulled=false;scene.add(contacts);const dummy=new THREE.Object3D();
  const raycaster=new THREE.Raycaster(),target=new THREE.Vector3(),desired=new THREE.Vector3(),offset=new THREE.Vector3();
  let orbit=0,pitch=.24,zoom=1,dragging=false,lastX=0,lastY=0,first=true,carOrbit=0,wasDriving=false;
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;orbit-=(e.clientX-lastX)*.005;pitch=Math.max(.10,Math.min(1.15,pitch+(e.clientY-lastY)*.004));lastX=e.clientX;lastY=e.clientY;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.55,Math.min(3,zoom+e.deltaY*.001));},{passive:false});
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  function render(state,dt,movement,overview=false) {
    loadSite(state);actors.update(state,dt,movement);
    // The aerial camera is hundreds of metres away. A larger near plane keeps
    // depth precision sufficient for roads and roofs instead of diagonal flicker.
    const near=overview?10:.08;
    if(camera.near!==near){camera.near=near;camera.updateProjectionMatrix();}
    const vehicles=[state.car,...state.parkedCars];
    for(const v of vehicles) {
      const rig=fleet[v.kind];rig.model.position.set(v.x,v.y||0,v.z);rig.model.rotation.y=-v.yaw;
      if(rig.articulation)rig.articulation.trailer.rotation.y=-((v.trailerYaw??v.yaw)-v.yaw);
      for(const w of rig.wheels) {
        if(state.driving&&v===state.car)w.mesh.rotation.x-=(v.speed||0)*dt/w.radius;
        if(w.steer&&w.steeringParent)w.steeringParent.rotation.y=-(v.steer||0)*(VEHICLE_SPECS[v.kind].steering||.5);
      }
    }
    const contactItems=[{...state.player,w:1.1,d:1.1,visible:!state.driving},...(state.characters||[]).map(c=>({...c,w:1,d:1,visible:true})),...vehicles.flatMap(v=>vehicleFootprint(v).map(r=>({x:r.x,z:r.z,yaw:r.rotation,w:r.w+.5,d:r.d+.4,visible:true})))];
    contactItems.forEach((p,i)=>{dummy.position.set(p.x,.065,p.z);dummy.rotation.set(-Math.PI/2,0,-(p.yaw||0));dummy.scale.set(p.visible?p.w:0,p.visible?p.d:0,1);dummy.updateMatrix();contacts.setMatrixAt(i,dummy.matrix);});contacts.instanceMatrix.needsUpdate=true;
    if(state.driving) {
      if(!wasDriving)carOrbit=state.car.yaw;
      const delta=Math.atan2(Math.sin(state.car.yaw-carOrbit),Math.cos(state.car.yaw-carOrbit));carOrbit+=delta*Math.min(1,dt*2);
    }else if(wasDriving)orbit+=carOrbit;
    const p=state.driving?state.car:state.player,spec=VEHICLE_SPECS[state.car.kind]||{},yaw=orbit+(state.driving?carOrbit:0);
    target.set(p.x,(p.y||0)+(state.driving?(spec.cameraHeight||1.8):1.15),p.z);
    sun.position.set(p.x-80,110,p.z+65);sun.target.position.set(p.x,0,p.z);
    const distance=(state.driving?(spec.cameraDistance||Math.max(9,spec.length*1.25)):6)*zoom;
    desired.set(p.x-Math.sin(yaw)*distance*Math.cos(pitch),target.y+Math.sin(pitch)*distance,p.z+Math.cos(yaw)*distance*Math.cos(pitch));
    offset.copy(desired).sub(target);const length=offset.length();raycaster.set(target,offset.normalize());raycaster.far=length;
    const hits=raycaster.intersectObjects(cameraObstacles,false);if(hits.length)desired.copy(target).addScaledVector(offset,Math.max(.7,hits[0].distance-.4));
    if(overview) {const view=siteLayout.overview;desired.set(view.x,view.y,view.z);target.set(view.targetX||0,0,view.targetZ||0);first=true;}
    farm.update(p,qualityValue,overview);camera.position.lerp(desired,first?1:1-Math.exp(-dt*10));camera.position.y=Math.max(.6,camera.position.y);camera.lookAt(target);renderer.render(scene,camera);first=false;wasDriving=state.driving;return yaw;
  }
  const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),name=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'';
  return {render,quality,loadSite,renderer,entityPersonIds:actors.entityPersonIds,recommendedQuality:/swiftshader|llvmpipe|software/i.test(name)?'low':'high',resetCamera(){orbit=0;pitch=.24;zoom=1;first=true;wasDriving=false;}};
}
export function drawMap(canvas,state,large=false) {
  const layout=getSiteLayout(state.siteId),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,b=layout.bounds;
  const sx=w/(b.maxX-b.minX),sz=h/(b.maxZ-b.minZ),scale=Math.min(sx,sz),ox=(w-(b.maxX-b.minX)*scale)/2,oz=(h-(b.maxZ-b.minZ)*scale)/2;
  const x=v=>ox+(v-b.minX)*scale,z=v=>oz+(v-b.minZ)*scale;
  ctx.fillStyle='#d9e0cc';ctx.fillRect(0,0,w,h);
  function rect(r,color,outline) {ctx.save();ctx.translate(x(r.x),z(r.z));ctx.rotate(r.rotation||0);ctx.fillStyle=color;ctx.fillRect(-r.w*scale/2,-r.d*scale/2,r.w*scale,r.d*scale);if(outline){ctx.strokeStyle=outline;ctx.lineWidth=1;ctx.strokeRect(-r.w*scale/2,-r.d*scale/2,r.w*scale,r.d*scale);}ctx.restore();}
  rect(layout.yard,'#c5c1ab');layout.roads.forEach(r=>rect(r,'#b8b3a0'));
  for(const prop of layout.props||[])if(prop.type==='reservoir'){ctx.fillStyle='#6a9da8';ctx.beginPath();ctx.ellipse(x(prop.x),z(prop.z),prop.w*scale/2,prop.d*scale/2,prop.rotation||0,0,Math.PI*2);ctx.fill();}
  for(const block of layout.blocks)rect(block,block.kind==='construction'?'#b7a17d':block.kind==='warehouse'?'#a8aaa2':block.frame==='wood'?'#b3a780':'#90ae9d','#e4ebdd');
  for(const v of[state.car,...state.parkedCars]) {const spec=VEHICLE_SPECS[v.kind];rect({x:v.x,z:v.z,w:Math.max(spec.width,3/scale),d:Math.max(spec.length,5/scale),rotation:v.yaw},v.kind.includes('tractor')?'#c0a03f':v.kind.includes('truck')?'#ececdf':'#fff','#376d55');}
  for(const person of state.characters||[]){ctx.fillStyle='#42685b';ctx.beginPath();ctx.arc(x(person.x),z(person.z),2,0,Math.PI*2);ctx.fill();}
  const p=state.driving?state.car:state.player;ctx.save();ctx.translate(x(p.x),z(p.z));ctx.rotate(p.yaw);ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(-5,5);ctx.lineTo(0,2);ctx.lineTo(5,5);ctx.closePath();ctx.fillStyle='#edc559';ctx.strokeStyle='#214d3e';ctx.lineWidth=1.5;ctx.fill();ctx.stroke();ctx.restore();
  ctx.fillStyle='#315140';ctx.font=`${large?13:10}px Arial`;ctx.textAlign='right';ctx.fillText('N ↑ aproximado',w-8,15);
  const bar=10**Math.floor(Math.log10((w/4)/scale)),pixels=bar*scale;ctx.strokeStyle='#315140';ctx.beginPath();ctx.moveTo(10,h-15);ctx.lineTo(10+pixels,h-15);ctx.stroke();ctx.textAlign='left';ctx.fillText(`${bar} m estimados`,10,h-3);
}
