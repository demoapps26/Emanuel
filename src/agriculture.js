import * as THREE from 'three';
/** Deterministic geometric foliage; no aerial imagery is applied to the scene. */
export function leafGeometry() {
  const g = new THREE.BufferGeometry(), p=[], uv=[], idx=[];
  // Curved leaf blade, a raised central vein and a lightly toothed edge.
  for(let j=0;j<=8;j++) {
    const t=j/8, w=Math.sin(t*Math.PI)*(.27+(j%2)*.035);
    for(let k=0;k<3;k++) { const side=k-1;p.push(side*w,t*.17+Math.sin(t*Math.PI)*(.10-Math.abs(side)*.07),t);uv.push(k/2,t); }
  }
  for(let j=0;j<8;j++)for(let k=0;k<2;k++){const a=j*3+k;idx.push(a,a+3,a+1,a+1,a+3,a+4);}
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function addCrops(scene, blocks) {
  let seed=9234;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const leaves=[], fruit=[], stems=[], bags=[], ties=[];
  const d=new THREE.Object3D();
  const push=(list,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>{d.position.set(x,y,z);d.scale.set(sx,sy,sz);d.rotation.set(rx,ry,rz);d.updateMatrix();list.push(d.matrix.clone());};
  for(const b of blocks.filter(b=>b.site!=='armazem')) {
    const bays=Math.round(b.w/10),span=b.w/bays;
    for(let bay=0;bay<bays;bay++)for(const side of [-1,1]) {
      const x=b.x-b.w/2+span*(bay+.5)+side*2.5;
      const depth=Math.min(b.d-4,32);
      push(bags,x,.36,b.z+b.d/2-depth/2-2,.85,.45,depth);
      for(let k=0;k<depth;k+=3.8) {
        const z=b.z+b.d/2-4-k, height=3.8+rand()*.9;
        push(stems,x,height/2,z,.055,height,.055);
        push(ties,x,5.2,z,.012,4.8,.012);
        for(let l=0;l<13;l++) {
          const y=.8+l*.27,angle=l*2.399+rand()*.4;
          push(leaves,x,y,z,.85+rand()*.4,1,1.05+rand()*.55,-.3+rand()*.8,angle,0);
        }
        for(let f=0;f<7;f++) {
          const a=f*2.4, y=.8+f*.25;
          push(fruit,x+Math.sin(a)*.34,y,z+Math.cos(a)*.34,.19+rand()*.08,.24,.23);
        }
      }
    }
  }
  function inst(geometry,material,matrices,shadow=true) {
    const m=new THREE.InstancedMesh(geometry,material,matrices.length);
    const order=[];for(let remainder=0;remainder<4;remainder++)for(let i=remainder;i<matrices.length;i+=4)order.push(matrices[i]);
    order.forEach((v,i)=>m.setMatrixAt(i,v));m.userData.cropInstances=matrices.length;m.castShadow=shadow;m.receiveShadow=true;scene.add(m);return m;
  }
  const foliage=inst(leafGeometry(),new THREE.MeshStandardMaterial({color:0x476d24,roughness:.9,side:THREE.DoubleSide}),leaves);
  // Small colour differences avoid identical, plastic looking vegetation.
  leaves.forEach((_,i)=>foliage.setColorAt(i,new THREE.Color().setHSL(.23+rand()*.06,.38+rand()*.2,.20+rand()*.12)));
  const tomatoes=inst(new THREE.SphereGeometry(1,8,6),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.38}),fruit);
  fruit.forEach((_,i)=>tomatoes.setColorAt(i,new THREE.Color(i%9===0?0x91a638:i%5===0?0xdc7727:0xbe3020)));
  inst(new THREE.CylinderGeometry(1,1,1,4),new THREE.MeshStandardMaterial({color:0x62773b}),stems);
  inst(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xe2e2cf,roughness:1}),bags);
  inst(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xaeb6a1,roughness:1}),ties,false);
}
export function addLeafyTrees(scene, positions) {
  let seed=717;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const count=positions.length*190, mesh=new THREE.InstancedMesh(leafGeometry(),new THREE.MeshStandardMaterial({color:0x547a3f,roughness:.9,side:THREE.DoubleSide}),count),dummy=new THREE.Object3D();
  let i=0;
  for(const [x,z]of positions)for(let j=0;j<190;j++) {
    const a=rand()*Math.PI*2,r=Math.sqrt(rand())*3.7,y=5+rand()*4;
    dummy.position.set(x+Math.sin(a)*r,y,z+Math.cos(a)*r);dummy.rotation.set(rand()*Math.PI,rand()*6.28,rand()*2);dummy.scale.set(.9+rand()*.7,1,1.3+rand());dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new THREE.Color().setHSL(.23+rand()*.07,.22+rand()*.25,.20+rand()*.12));i++;
  }
  mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
}
export function addCanopies(scene, crowns) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');let seed=7171;
  const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  // Thousands of small opaque leaves build an irregular crown silhouette.
  for(let j=0;j<7000;j++) {
    const a=rand()*Math.PI*2,r=Math.sqrt(rand()),x=256+Math.cos(a)*r*220,y=250+Math.sin(a)*r*222;
    const l=18+rand()*19,light=27+rand()*27;
    ctx.fillStyle=`hsl(${80+rand()*28} 25% ${light}%)`;
    ctx.beginPath();ctx.ellipse(x,y,2+rand()*5,2+rand()*7,rand()*Math.PI,0,Math.PI*2);ctx.fill();
  }
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshStandardMaterial({map:tex,alphaTest:.52,side:THREE.DoubleSide,roughness:1});
  const trees=new THREE.InstancedMesh(new THREE.PlaneGeometry(2,2),material,crowns.length*3),dummy=new THREE.Object3D();let i=0;
  for(const [x,y,z,sx,sy,sz]of crowns)for(let side=0;side<3;side++) {
    dummy.position.set(x,y,z);dummy.scale.set(sx*.9,sy*.8,1);dummy.rotation.set(0,side*Math.PI/3+rand()*.2,0);dummy.updateMatrix();trees.setMatrixAt(i,dummy.matrix);trees.setColorAt(i,new THREE.Color().setHSL(.12,.12,.7+rand()*.25));i++;
  }
  trees.castShadow=true;trees.receiveShadow=true;scene.add(trees);
}
