import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import original from '../materiais/Patricia_Pilar_Mundo_3D_Codex/dados_exploracoes.json' with {type:'json'};
import { FARM_IDS, SITE_IDS, SITE_LAYOUTS, getSiteLayout, rectangleEnvelope } from '../src/sites.js';

function corners(r) {
  const c=Math.cos(r.rotation||0),s=Math.sin(r.rotation||0);
  return [[-1,-1],[-1,1],[1,1],[1,-1]].map(([x,z])=>({x:r.x+x*r.w/2*c-z*r.d/2*s,z:r.z+x*r.w/2*s+z*r.d/2*c}));
}
// Separating-axis test independent of the runtime's point/vehicle collision code.
function intersects(a,b) {
  const A=corners(a),B=corners(b);
  for(const polygon of [A,B])for(let i=0;i<4;i++) {
    const next=polygon[(i+1)%4],here=polygon[i],axis={x:here.z-next.z,z:next.x-here.x};
    const p=A.map(v=>v.x*axis.x+v.z*axis.z),q=B.map(v=>v.x*axis.x+v.z*axis.z);
    if(Math.max(...p)<=Math.min(...q)+1e-7||Math.max(...q)<=Math.min(...p)+1e-7)return false;
  }
  return true;
}

test('every supplied farm and HQ has its own available scene and original reference', async()=>{
  assert.equal(FARM_IDS.length,13);assert.equal(SITE_IDS.length,14);
  assert.deepEqual(FARM_IDS,original.exploracoes.map(s=>s.id));
  assert.equal(new Set(SITE_IDS).size,14);
  for(const id of SITE_IDS) {
    const site=getSiteLayout(id),source=id==='sede'?original.sede:original.exploracoes.find(s=>s.id===id);
    assert.equal(site.id,id);assert.equal(site.name,source.nome);assert.equal(site.reference,source.referencia_imagem);
    assert.equal(site.placementAccuracy,'estimated_from_reference');
    assert.ok(site.notes.some(note=>note.includes('anexo virtual')));
    assert.equal('coordenadas' in site,false,'local layout is not a surveyed geographic polygon');
    await access(new URL('../materiais/Patricia_Pilar_Mundo_3D_Codex/'+site.reference,import.meta.url));
  }
  assert.equal(getSiteLayout().id,'tomates_oeste');assert.throws(()=>getSiteLayout('inventada'),RangeError);
});

test('photographic distinctions remain: 11 low wooden Nutriveg2 structures, stepped roofs, water and construction',()=>{
  const nutri=getSiteLayout('nutriveg_2');
  assert.equal(nutri.blocks.length,11);
  assert.ok(nutri.blocks.every(b=>b.frame==='wood'&&b.height<4&&b.roof==='gable'&&b.crop==='cucumber'));
  const deusas=getSiteLayout('deusas');
  assert.ok(deusas.blocks.every(b=>b.kind==='construction'));
  assert.deepEqual([...new Set(deusas.blocks.map(b=>b.y))].sort((a,b)=>a-b),[0,3.5,7]);
  assert.equal(deusas.props.filter(p=>p.type==='terrace').length,3);
  assert.ok(getSiteLayout('sede').blocks.every(b=>b.kind==='warehouse'));
  assert.equal(getSiteLayout('nutriveg_1').props.filter(p=>p.type==='reservoir').length,2);
  assert.equal(getSiteLayout('varzea').props.filter(p=>p.type==='reservoir').length,2);
  assert.ok(getSiteLayout('linos').blocks.length>getSiteLayout('framboesa_1').blocks.length);
  assert.ok(getSiteLayout('demonstracao').props.some(p=>p.type==='display'));
  assert.ok(getSiteLayout('demonstracao').props.some(p=>p.type==='fence'));
  assert.equal(new Set(Object.values(SITE_LAYOUTS).map(s=>JSON.stringify(s.blocks.map(b=>[b.x,b.z,b.w,b.d,b.rotation,b.kind])))).size,14,'scenes are distinct layouts, not cloned farm templates');
});

test('all crops are broadly sized to declared areas without changing source hectare records',()=>{
  for(const source of original.exploracoes) {
    const layout=getSiteLayout(source.id),represented=layout.blocks.reduce((area,b)=>area+b.w*b.d,0);
    assert.equal(layout.declaredAreaHa,source.area_ha);
    // A useful sanity bound, deliberately not a measurement or equality assertion:
    // declared land includes gaps, water, paths and land absent from the roofs.
    assert.ok(represented>source.area_ha*10000*.6,source.id+' implausibly tiny');
    assert.ok(represented<source.area_ha*10000*1.2,source.id+' implausibly large');
  }
  assert.equal(getSiteLayout('sede').declaredAreaHa,null);
});

test('source roads and the yard access do not cross buildings, including rotated farm blocks',()=>{
  for(const site of Object.values(SITE_LAYOUTS)) {
    for(const r of site.roads) {
      assert.ok(r.w>0&&r.d>0);
      for(const b of site.blocks)assert.equal(intersects(r,b),false,site.id+' road crosses '+JSON.stringify(b));
      for(const p of site.props.filter(p=>['office','reservoir'].includes(p.type)))
        assert.equal(intersects(r,p),false,site.id+' road crosses '+p.type);
    }
    assert.ok(site.roads.some(r=>r.w>=14&&r.d>=14),'truck access is not a footpath');
  }
});

test('all eight parking positions, the player and four people have space in every local scene',()=>{
  const kinds=['technical','agropilar','biological','agricultural','truck','rigid_truck','tractor','orchard_tractor'];
  for(const site of Object.values(SITE_LAYOUTS)) {
    assert.deepEqual(Object.keys(site.vehicleSpawns).sort(),[...kinds].sort());
    // Conservative 4m x 20m envelopes are larger than all supplied vehicle models.
    const vehicles=Object.entries(site.vehicleSpawns).map(([kind,p])=>({kind,x:p.x,z:p.z,w:4,d:20,rotation:p.yaw}));
    const player={...site.spawn,w:.8,d:.8,rotation:0};
    assert.ok(Math.hypot(player.x-site.vehicleSpawns.technical.x,player.z-site.vehicleSpawns.technical.z)<4,'technical car is immediately reachable');
    for(const [i,v] of vehicles.entries()) {
      for(const b of site.blocks)assert.equal(intersects(v,b),false,site.id+' '+v.kind+' inside crop block');
      for(const other of vehicles.slice(i+1))assert.equal(intersects(v,other),false,site.id+' overlapping parked vehicles');
      assert.equal(intersects(player,v),false,site.id+' player inside vehicle');
    }
    for(const [dx,dz] of [[0,0],[0,15],[15,15],[30,15]]) {
      const npc={x:site.npcAnchor.x+dx,z:site.npcAnchor.z+dz,w:.8,d:.8};
      for(const v of vehicles)assert.equal(intersects(npc,v),false,site.id+' person inside parked vehicle');
      for(const b of site.blocks)assert.equal(intersects(npc,b),false,site.id+' person inside building');
    }
  }
});

test('scene bounds contain rotated geometry and the whole yard with a safe margin',()=>{
  for(const site of Object.values(SITE_LAYOUTS))for(const item of [...site.blocks,...site.roads,...site.props,site.yard]) {
    const e=rectangleEnvelope(item),b=site.bounds;
    assert.ok(e.minX>=b.minX+39&&e.maxX<=b.maxX-39,site.id+' x boundary');
    assert.ok(e.minZ>=b.minZ+39&&e.maxZ<=b.maxZ-39,site.id+' z boundary');
  }
});
