import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addCrops, addCanopies } from './agriculture.js';

const up = new THREE.Vector3(0, 1, 0);
function generator(seed) { let s=seed; return () => ((s=(s*1664525+1013904223)>>>0)/4294967296); }
function batching(parent) {
  const batches=new Map();
  function add(geometry, material, position=[0,0,0], scale=[1,1,1], rotation=[0,0,0], shadow=true) {
    const m=new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale));
    let g=geometry.clone().applyMatrix4(m);
    if (!g.index) { const index=Array.from({length:g.attributes.position.count},(_,i)=>i);g.setIndex(index); }
    if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    const key=material.uuid+shadow;
    if(!batches.has(key))batches.set(key,{material,shadow,geometries:[]});
    batches.get(key).geometries.push(g);
  }
  function flush() {
    for(const {material,shadow,geometries}of batches.values()) {
      const merged=mergeGeometries(geometries);
      if(!merged)throw Error('Não foi possível preparar uma estrutura agrícola.');
      const mesh=new THREE.Mesh(merged,material);mesh.castShadow=shadow;mesh.receiveShadow=true;parent.add(mesh);
      geometries.forEach(g=>g.dispose());
    }
    batches.clear();
  }
  return {add,flush};
}
export function createFarmScenery(layout) {
  const group=new THREE.Group();group.name=`exploracao:${layout.id}`;
  const material=(color,opts={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...opts});
  const mats={
    steel:material(0xaeb9b8,{metalness:.65,roughness:.32}),wood:material(0x8d7050),
    film:material(0xe8ebe1,{roughness:.34,metalness:.05,transparent:true,opacity:.48,depthWrite:false,side:THREE.DoubleSide}),
    wall:material(0xf1f1e4,{roughness:.4,transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide}),
    floor:material(0xe2dfce),trim:material(0x1d5142),dark:material(0x313b37),white:material(0xe6e7dc),
    soil:material(0x9f8965),water:material(0x5d8e98,{roughness:.22,metalness:.35}),gravel:material(0xa9a48f),yellow:material(0xd8b54d),
  };
  const boxGeo=new THREE.BoxGeometry(1,1,1), rodGeo=new THREE.CylinderGeometry(1,1,1,5), frameDetails=[],cropDetails=[];
  const batch=batching(group);
  const box=(x,y,z,w,h,d,mat=mats.white,rotation=0)=>batch.add(boxGeo,mat,[x,y,z],[w,h,d],[0,-rotation,0]);
  function rod(batcher,a,b,r,mat=mats.steel) {
    const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av),length=delta.length();
    if(length<.001)return;
    const rotation=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up,delta.normalize()));
    batcher.add(rodGeo,mat,av.add(bv).multiplyScalar(.5).toArray(),[r,length,r],[rotation.x,rotation.y,rotation.z]);
  }
  for(const block of layout.blocks) {
    const baseY=block.y||0, height=block.height||6.2;
    if(block.kind==='warehouse') {
      box(block.x,baseY+height/2,block.z,block.w,height,block.d,mats.white,block.rotation);
      const building=new THREE.Group();building.position.set(block.x,baseY,block.z);building.rotation.y=-(block.rotation||0);group.add(building);
      const b=batching(building);
      b.add(boxGeo,mats.steel,[0,height+.12,0],[block.w+1,.35,block.d+1]);
      const doors=Math.max(1,Math.min(6,Math.floor(block.w/14)));
      for(let n=0;n<doors;n++) {
        const x=(n-(doors-1)/2)*Math.min(12,block.w/doors);
        b.add(boxGeo,mats.dark,[x,2.1,block.d/2+.06],[4.5,4.2,.15]);
        for(let y=.5;y<4.1;y+=.32)b.add(boxGeo,mats.steel,[x,y,block.d/2+.16],[4.3,.025,.025],[],false);
        b.add(boxGeo,mats.gravel,[x,.3,block.d/2+2],[6,.6,4]);
        for(const side of[-1,1])b.add(boxGeo,mats.yellow,[x+side*2.7,1,block.d/2+.7],[.2,2,.2]);
      }
      b.flush();continue;
    }
    const structure=new THREE.Group();structure.position.set(block.x,baseY,block.z);structure.rotation.y=-(block.rotation||0);group.add(structure);
    const skins=batching(structure),detail=new THREE.Group();structure.add(detail);const frames=batching(detail);
    const wood=block.frame==='wood', frameMat=wood?mats.wood:mats.steel;
    const construction=block.kind==='construction', eave=height*.73,rise=height-eave;
    skins.add(boxGeo,construction?mats.soil:mats.floor,[0,.02,0],[block.w+.5,.12,block.d+.5],[],false);
    const bays=Math.max(1,Math.round(block.w/(wood?6:8))),span=block.w/bays;
    const roofHeight=t=>block.roof==='gable'?rise*(1-Math.abs(t*2-1)):rise*Math.sin(t*Math.PI);
    const roofP=[],roofUv=[],roofI=[];
    for(let bay=0;bay<bays;bay++) {
      const cx=-block.w/2+span*(bay+.5),left=cx-span/2;
      const segments=block.roof==='gable'?2:8;
      if(!construction) {
        const start=roofP.length/3;
        for(let j=0;j<=segments;j++) {
          const x=left+span*j/segments,y=eave+roofHeight(j/segments);
          roofP.push(x,y,-block.d/2,x,y,block.d/2);roofUv.push(j/segments,0,j/segments,1);
          if(j<segments){const a=start+j*2;roofI.push(a,a+1,a+2,a+2,a+1,a+3);}
        }
      }
      const stations=new Set([-block.d/2,block.d/2]);
      for(let z=-block.d/2+16;z<block.d/2;z+=16)stations.add(z);
      // More detail at accessible facades; fewer tubes deep inside large roofs.
      for(const end of [-1,1])for(let z=5;z<Math.min(24,block.d);z+=5)stations.add(end*(block.d/2-z));
      const sampled=construction?[...stations].filter((_,i)=>i%2===0):[...stations];
      for(const z of sampled) {
        rod(frames,[left,0,z],[left,eave,z],wood?.075:.045,frameMat);
        for(let j=0;j<segments;j++)rod(frames,[left+span*j/segments,eave+roofHeight(j/segments),z],[left+span*(j+1)/segments,eave+roofHeight((j+1)/segments),z],wood?.065:.04,frameMat);
      }
      rod(frames,[left,eave,-block.d/2],[left,eave,block.d/2],.055,frameMat);
      rod(frames,[cx,height,-block.d/2],[cx,height,block.d/2],.04,frameMat);
      if(bay===bays-1)for(const z of[-block.d/2,block.d/2])rod(frames,[left+span,0,z],[left+span,eave,z],wood?.075:.045,frameMat);
    }
    if(!construction) {
      const roof=new THREE.BufferGeometry();roof.setAttribute('position',new THREE.Float32BufferAttribute(roofP,3));roof.setAttribute('uv',new THREE.Float32BufferAttribute(roofUv,2));roof.setIndex(roofI);roof.computeVertexNormals();skins.add(roof,mats.film,[0,0,0],[1,1,1],[0,0,0],false);roof.dispose();
      for(const end of[-1,1]) {
        skins.add(boxGeo,mats.wall,[0,eave/2,end*block.d/2],[block.w,eave,.025],[],false);
        for(let x=-block.w/2;x<=block.w/2+.1;x+=span)rod(frames,[x,0,end*block.d/2],[x,eave,end*block.d/2],.045,frameMat);
        rod(frames,[-block.w/2,eave*.5,end*block.d/2],[block.w/2,eave*.5,end*block.d/2],.025,frameMat);
      }
      for(const side of[-1,1])skins.add(boxGeo,mats.wall,[side*block.w/2,eave/2,0],[.025,eave,block.d],[],false);
      // Door frames and insect monitoring strip, as in supplied interior photos.
      for(const x of[-1.5,1.5])rod(frames,[x,0,block.d/2+.04],[x,Math.min(3,eave),block.d/2+.04],.055,frameMat);
      rod(frames,[-1.5,Math.min(3,eave),block.d/2+.04],[1.5,Math.min(3,eave),block.d/2+.04],.055,frameMat);
      skins.add(boxGeo,mats.yellow,[block.w/2+.04,1.9,0],[.035,.16,block.d],[],false);
      const crops=new THREE.Group();structure.add(crops);
      const crop=block.crop||(layout.id==='tomates_oeste'&&layout.blocks.indexOf(block)%2?'cucumber':'tomato');
      if(crop==='mixed') {
        for(const [i,type]of['tomato','cucumber','courgette'].entries())addCrops(crops,[{...block,x:(i-1)*block.w/3,z:0,w:block.w/3,rotation:0,y:0}],{crop:type,height:eave});
      }else addCrops(crops,[{...block,x:0,z:0,rotation:0,y:0}],{crop,height:eave});
      cropDetails.push({group:crops,block});
    }
    skins.flush();frames.flush();frameDetails.push({group:detail,block});
  }
  for(const prop of layout.props||[]) {
    const y=prop.y||0;
    if(prop.type==='reservoir') {
      if(prop.shape==='oval') {
        const water=new THREE.Mesh(new THREE.CircleGeometry(1,40),mats.water);water.rotation.x=-Math.PI/2;water.rotation.z=-(prop.rotation||0);water.position.set(prop.x,y+.06,prop.z);water.scale.set(prop.w/2,prop.d/2,1);water.receiveShadow=true;group.add(water);
        const berm=new THREE.Mesh(new THREE.TorusGeometry(1,.07,5,40),mats.soil);berm.rotation.x=-Math.PI/2;berm.rotation.z=-(prop.rotation||0);berm.position.set(prop.x,y+.12,prop.z);berm.scale.set(prop.w/2,prop.d/2,1.8);group.add(berm);
      } else {
        const pond=new THREE.Group();pond.position.set(prop.x,y,prop.z);pond.rotation.y=-(prop.rotation||0);group.add(pond);
        const bank=new THREE.Mesh(new THREE.BoxGeometry(prop.w,.25,prop.d),mats.soil);bank.position.y=-.02;pond.add(bank);
        const liner=new THREE.Mesh(new THREE.PlaneGeometry(prop.w*.94,prop.d*.93),mats.dark);liner.rotation.x=-Math.PI/2;liner.position.y=.112;pond.add(liner);
        const water=new THREE.Mesh(new THREE.PlaneGeometry(prop.w*.83,prop.d*.82),mats.water);water.rotation.x=-Math.PI/2;water.position.y=.12;pond.add(water);
      }
    } else if(prop.type==='tank') {
      const tank=new THREE.Mesh(new THREE.CylinderGeometry(prop.w/2,prop.w/2,3,24),mats.steel);tank.position.set(prop.x,y+1.5,prop.z);tank.castShadow=true;group.add(tank);
      for(const yy of[.3,1,2,2.8]){const ring=new THREE.Mesh(new THREE.TorusGeometry(prop.w/2,.025,4,24),mats.dark);ring.rotation.x=Math.PI/2;ring.position.set(prop.x,y+yy,prop.z);group.add(ring);}
    } else if(prop.type==='terrace') {
      box(prop.x,y/2-.1,prop.z,prop.w,Math.max(.2,y),prop.d,mats.soil,prop.rotation);
    } else if(prop.type==='office') {
      box(prop.x,y+1.65,prop.z,prop.w,3.3,prop.d,mats.white,prop.rotation);
      box(prop.x,y+3.36,prop.z,prop.w+.25,.15,prop.d+.25,mats.trim,prop.rotation);
      const angle=prop.rotation||0,offset=prop.d/2+.02;
      box(prop.x-Math.sin(angle)*offset,y+1.1,prop.z+Math.cos(angle)*offset,1.05,2.2,.05,mats.trim,angle);
    } else if(prop.type==='display') {
      box(prop.x,y+.85,prop.z,prop.w,1.7,prop.d,mats.wood,prop.rotation);
      box(prop.x,y+1.9,prop.z-.15,prop.w,.7,.12,mats.trim,prop.rotation);
    } else if(prop.type==='fence') {
      const fence=new THREE.Group();fence.position.set(prop.x,y,prop.z);fence.rotation.y=-(prop.rotation||0)-(prop.d>prop.w?Math.PI/2:0);group.add(fence);const f=batching(fence),length=Math.max(prop.w,prop.d);
      for(let x=-length/2;x<=length/2;x+=3)f.add(boxGeo,mats.trim,[x,1,0],[.07,2,.07]);
      for(const yy of[.3,1,1.8])f.add(boxGeo,mats.steel,[0,yy,0],[length,.02,.02],[],false);f.flush();
      const wire=[];for(let x=-length/2;x<length/2;x+=.25)wire.push(x,.3,0,x,1.8,0);for(let yy=.3;yy<=1.8;yy+=.25)wire.push(-length/2,yy,0,length/2,yy,0);
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(wire,3));fence.add(new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0x486448,transparent:true,opacity:.55})));
    }
  }
  // Small sign at the simulation entrance; roofs stay clear of floating billboards.
  const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');
  ctx.fillStyle='#174f3d';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#edf0dd';ctx.textAlign='center';ctx.font='italic 34px Georgia';ctx.fillText('Frutas Patrícia Pilar',512,63);ctx.font='600 43px Arial';
  const title=layout.name.length>39?layout.name.replace('Frutas Patrícia Pilar',''):layout.name;ctx.fillText(title,512,142,970);ctx.font='25px Arial';ctx.fillStyle='#d0dac4';ctx.fillText(layout.id==='deusas'?'Construção de novas estufas':'Da terra para o Mundo.',512,205);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(5,1.25),new THREE.MeshStandardMaterial({map:tex,roughness:.8}));
  const signX=layout.spawn.x-6,signZ=layout.spawn.z-8;sign.position.set(signX,1.8,signZ);group.add(sign);
  for(const x of[signX-1.8,signX+1.8])box(x,.9,signZ,.08,1.8,.08,mats.steel);
  const rand=generator(layout.id.split('').reduce((s,c)=>s+c.charCodeAt(0),21)),crowns=[];
  const b=layout.bounds;
  for(let i=0;i<48;i++) {
    const side=i%4,t=rand(),x=side===0?b.minX-16:side===1?b.maxX+16:b.minX+t*(b.maxX-b.minX),z=side===2?b.minZ-16:side===3?b.maxZ+16:b.minZ+t*(b.maxZ-b.minZ),h=4+rand()*4;
    box(x,h/2,z,.25,h,.25,mats.wood);crowns.push([x,h+1,z,2+rand()*2,3+rand()*2,2+rand()*2]);
  }
  addCanopies(group,crowns);batch.flush();boxGeo.dispose();rodGeo.dispose();
  function distanceToBlock(p,block) {
    const angle=block.rotation||0,dx=p.x-block.x,dz=p.z-block.z;
    const x=dx*Math.cos(angle)+dz*Math.sin(angle),z=-dx*Math.sin(angle)+dz*Math.cos(angle);
    return Math.hypot(Math.max(0,Math.abs(x)-block.w/2),Math.max(0,Math.abs(z)-block.d/2));
  }
  return {group,update(p,quality,overview=false) {
    for(const item of frameDetails)item.group.visible=!overview&&distanceToBlock(p,item.block)<(quality==='low'?115:230);
    for(const item of cropDetails)item.group.visible=!overview&&distanceToBlock(p,item.block)<(quality==='low'?45:90);
  }};
}
