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
export function addCrops(scene, blocks, options={}) {
  let seed=9234;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const leaves=[],roundFruit=[],longFruit=[],flowers=[],stems=[],bags=[],ties=[];
  const d=new THREE.Object3D();
  const push=(list,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>{d.position.set(x,y,z);d.scale.set(sx,sy,sz);d.rotation.set(rx,ry,rz);d.updateMatrix();list.push(d.matrix.clone());};
  const crop=String(options.crop||'tomato').toLowerCase(),cucumber=/pepino|cucumber/.test(crop),courgette=/courgette/.test(crop);
  for(const b of blocks.filter(b=>b.kind!=='construction'&&b.kind!=='warehouse')) {
    const bays=Math.max(1,Math.round(b.w/8)),span=b.w/bays,stride=Math.max(1,Math.ceil(bays/20));
    for(let bay=0;bay<bays;bay+=stride)for(const side of[-1,1]) {
      const x=b.x-b.w/2+span*(bay+.5)+side*Math.min(1.6,span*.22);
      const depth=Math.min(b.d*.45,12);
      for(const end of[-1,1]) {
        push(bags,x,.13,b.z+end*(b.d/2-depth/2-.7),.28,.22,depth);
        for(let k=1;k<depth;k+=2.2) {
          const z=b.z+end*(b.d/2-1-k),height=courgette?.65:Math.min(options.height-.4||3.2,2.8+rand()*.5);
          push(stems,x,height/2,z,.012,height,.012);
          if(!courgette)push(ties,x,(options.height||4)/2,z,.003,options.height||4,.003);
          for(let l=0;l<(courgette?8:12);l++) {
            const y=courgette?.22+rand()*.2:.3+l*(height-.4)/12,angle=l*2.399;
            push(leaves,x,y,z,cucumber?.65:courgette?.8:.42,1,cucumber?.65:courgette?.75:.5,-.35+rand()*.7,angle,0);
          }
          if(courgette) {
            for(let f=0;f<2;f++){const a=f*2.4;push(longFruit,x+Math.sin(a)*.15,.18,z+Math.cos(a)*.15,.045,.24,.045,Math.PI/2,a);push(flowers,x+.18,.42,z,.04,.02,.04);}
          } else if(cucumber) {
            for(let f=0;f<3;f++)push(longFruit,x+(f%2?.13:-.13),.6+f*.45,z,.035,.28,.035);
          } else for(let f=0;f<8;f++) {
            const a=f*2.4;push(roundFruit,x+Math.sin(a)*.13,.45+Math.floor(f/3)*.22,z+Math.cos(a)*.13,.045+rand()*.02,.05,.05);
          }
        }
      }
    }
  }
  // Dense crop rows behind the individual leaves keep large covered areas planted
  // without thousands of distant plants. Front fruit remains geometric.
  const rowCanvas=document.createElement('canvas');rowCanvas.width=rowCanvas.height=128;
  const rowContext=rowCanvas.getContext('2d');rowContext.fillStyle='#304e28';rowContext.fillRect(0,0,128,128);
  for(let i=0;i<650;i++){rowContext.fillStyle=`hsl(${90+rand()*22} ${30+rand()*22}% ${17+rand()*20}%)`;rowContext.beginPath();rowContext.ellipse(rand()*128,rand()*128,2+rand()*5,3+rand()*7,rand()*6,0,Math.PI*2);rowContext.fill();}
  const rowMap=new THREE.CanvasTexture(rowCanvas);rowMap.colorSpace=THREE.SRGBColorSpace;rowMap.wrapS=rowMap.wrapT=THREE.RepeatWrapping;
  const rowMaterial=new THREE.MeshStandardMaterial({map:rowMap,color:0xc1cfac,roughness:1,side:THREE.DoubleSide});
  const rowP=[],rowUv=[],rowI=[];
  for(const b of blocks) {
    const bays=Math.max(1,Math.round(b.w/8)),span=b.w/bays,height=courgette?.55:Math.min((options.height||4)-.5,2.8);
    for(let bay=0;bay<bays;bay++)for(const side of[-1,1]) {
      const x=b.x-b.w/2+span*(bay+.5)+side*Math.min(1.6,span*.22),depth=b.d-4,segments=Math.max(2,Math.ceil(depth/5)),start=rowP.length/3;
      for(let j=0;j<=segments;j++) {
        const z=b.z-depth/2+depth*j/segments,h=height*(.92+rand()*.12);
        rowP.push(x-.35,.15,z,x-.35,h,z,x+.35,h*.96,z,x+.35,.15,z);
        rowUv.push(j*depth/segments/2,0,j*depth/segments/2,h,j*depth/segments/2,h,j*depth/segments/2,0);
        if(j<segments)for(let k=0;k<3;k++){const a=start+j*4+k;rowI.push(a,a+4,a+1,a+1,a+4,a+5);}
      }
    }
  }
  if(rowP.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(rowP,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(rowUv,2));g.setIndex(rowI);g.computeVertexNormals();scene.add(new THREE.Mesh(g,rowMaterial));}
  function inst(geometry,material,matrices,shadow=true) {
    if(!matrices.length){geometry.dispose();material.dispose();return null;}
    const m=new THREE.InstancedMesh(geometry,material,matrices.length),order=[];
    for(let remainder=0;remainder<4;remainder++)for(let i=remainder;i<matrices.length;i+=4)order.push(matrices[i]);
    order.forEach((v,i)=>m.setMatrixAt(i,v));m.userData.cropInstances=matrices.length;m.castShadow=shadow;m.receiveShadow=true;scene.add(m);return m;
  }
  const foliage=inst(leafGeometry(),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9,side:THREE.DoubleSide}),leaves,false);
  leaves.forEach((_,i)=>foliage?.setColorAt(i,new THREE.Color().setHSL(.23+rand()*.06,.4+rand()*.2,.18+rand()*.1)));
  const tomatoes=inst(new THREE.SphereGeometry(1,7,5),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.4}),roundFruit,false);
  roundFruit.forEach((_,i)=>tomatoes?.setColorAt(i,new THREE.Color(i%9===0?0x91a638:i%5===0?0xd46e2a:0xb72c20)));
  const longGeometry=new THREE.CapsuleGeometry(1,1,2,6);longGeometry.scale(1,1/3,1);
  inst(longGeometry,new THREE.MeshStandardMaterial({color:0x274826,roughness:.64}),longFruit,false);
  inst(new THREE.SphereGeometry(1,5,4),new THREE.MeshStandardMaterial({color:0xe0bb37,roughness:1}),flowers,false);
  inst(new THREE.CylinderGeometry(1,1,1,4),new THREE.MeshStandardMaterial({color:0x62773b}),stems,false);
  inst(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xe2e2cf,roughness:1}),bags,false);
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
