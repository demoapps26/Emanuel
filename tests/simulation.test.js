import test from "node:test";
import assert from "node:assert/strict";
import {
  createState, step, blocked, move, toggleVehicle, activeSite, travelToSite,
  getBounds, getObstacles, getCharacters, vehicleFootprint, vehicleBlocked, approachVehicle, nearestVehicle,
  vehicleEntryPoint, rectanglesOverlap, rectangleCorners, localToWorld, PLAYER_RADIUS,
} from "../src/simulation.js";
import { VEHICLE_KINDS, vehicleSpec } from "../src/fleet.js";
import { SITE_IDS, getSiteLayout } from "../src/sites.js";
import { PLAYER_PERSON_ID } from "../src/characters.js";
const huge={minX:-1000,maxX:1000,minZ:-1000,maxZ:1000};
const run=(s,input,seconds,yaw=0,obstacles=[])=>{
  for(let i=0;i<Math.round(seconds*60);i++)step(s,input,1/60,yaw,obstacles);
};
function clearState(kind="technical") {
  const s=createState();
  s.car={...s.car,kind,id:`test:${kind}`,x:0,z:0,yaw:0,speed:0,steer:0};
  if(vehicleSpec(kind).articulated)s.car.trailerYaw=0;
  s.parkedCars=[];
  s.player={x:-3,z:0,yaw:0,personId:PLAYER_PERSON_ID};
  s.driving=false;
  return s;
}
function enter(s,kind) {
  const target=[s.car,...s.parkedCars].find(v=>v.kind===kind),point=vehicleEntryPoint(target);
  Object.assign(s.player,{x:point.x-vehicleSpec(kind).width/2-.7,z:point.z});
  toggleVehicle(s,[]);
}

test("all 14 scenes spawn one player and eight non-overlapping vehicles outside structures", () => {
  for(const id of SITE_IDS) {
    const s=createState(id),obstacles=getObstacles(s),bounds=getBounds(s),vehicles=[s.car,...s.parkedCars];
    assert.equal(s.siteId,id);assert.equal(s.player.personId,PLAYER_PERSON_ID);
    assert.equal(vehicles.length,8);assert.equal(new Set(vehicles.map(v=>v.id)).size,8);
    assert.equal(blocked(s.player.x,s.player.z,PLAYER_RADIUS,[...obstacles,...vehicles.flatMap(vehicleFootprint)],bounds),false,`${id}:player`);
    for(const v of vehicles) {
      assert.equal(vehicleBlocked(v,obstacles,bounds),false,`${id}:${v.kind}`);
      for(const other of vehicles.filter(o=>o!==v))for(const a of vehicleFootprint(v))for(const b of vehicleFootprint(other))
        assert.equal(rectanglesOverlap(a,b),false,`${id}:${v.kind}/${other.kind}`);
    }
    toggleVehicle(s);assert.equal(s.driving,true,`${id}:nearby technical entry`);
    toggleVehicle(s);assert.equal(s.driving,false,`${id}:safe exit`);
  }
});
test("walking, running and camera-relative motion use the same distance scale", () => {
  const a=clearState(),b=clearState(),c=clearState();
  for(const s of [a,b,c]){s.player.x=20;s.player.z=0;}
  run(a,{forward:true},1);run(b,{forward:true,run:true},1);run(c,{forward:true},1,Math.PI/2);
  assert.ok(Math.abs(a.player.z+1.8)<1e-9);
  assert.ok(Math.abs(b.player.z+4.2)<1e-9);
  assert.ok(Math.abs(c.player.x-21.8)<1e-9);assert.ok(Math.abs(c.player.z)<1e-9);
});
test("diagonal walking is normalized", () => {
  const a=clearState(),b=clearState();
  a.player.x=b.player.x=20;
  run(a,{forward:true},1);run(b,{forward:true,right:true},1);
  assert.ok(Math.abs(a.distance-b.distance)<1e-9);
});
test("rotated greenhouse walls collide with circles in their true orientation", () => {
  const wall={x:0,z:0,w:20,d:1,rotation:Math.PI/4};
  assert.equal(blocked(6,6,.4,[wall],huge),true);
  assert.equal(blocked(6,-6,.4,[wall],huge),false);
  const p={x:6,z:-6};
  move(p,-12,12,.4,[wall],huge);
  assert.equal(blocked(p.x,p.z,.4,[wall],huge),false);
  assert.ok((p.z-p.x)/Math.sqrt(2)<=-.89);
});
test("large walking displacement cannot tunnel through a wall and permits tangential sliding", () => {
  const wall={x:0,z:0,w:20,d:1},p={x:0,z:5};
  move(p,0,-100,.4,[wall],huge);
  assert.ok(p.z>=.9);assert.equal(blocked(p.x,p.z,.4,[wall],huge),false);
  const side={x:-10.5,z:0};move(side,1,4,.4,[{...wall,d:20}],huge);
  assert.ok(side.x<=-10.4);assert.ok(side.z>3.9);
});
test("walking and full vehicle corners respect site boundaries", () => {
  const p={x:0,z:0};move(p,-5000,5000,.4,[],huge);
  assert.ok(p.x>=huge.minX+.4);assert.ok(p.z<=huge.maxZ-.4);
  const v={kind:"rigid_truck",x:998,z:0,yaw:Math.PI/4};
  assert.equal(vehicleBlocked(v,[],huge),true);
});
test("each of the eight vehicles drives, reverses, brakes, and exits independently", () => {
  for(const kind of VEHICLE_KINDS) {
    const s=clearState(kind);enter(s,kind);assert.equal(s.driving,true,kind);
    const before={...s.car};run(s,{forward:true},1);
    assert.ok(s.car.z<before.z-.2,`${kind}:forward`);
    assert.ok(s.car.speed>0,`${kind}:speed`);
    toggleVehicle(s,[]);assert.equal(s.driving,true,`${kind}:cannot exit in motion`);
    run(s,{brake:true},2);assert.ok(Math.abs(s.car.speed)<.35);
    toggleVehicle(s,[]);assert.equal(s.driving,false,`${kind}:safe exit`);
    assert.equal(blocked(s.player.x,s.player.z,PLAYER_RADIUS,vehicleFootprint(s.car),getBounds(s)),false);
    enter(s,kind);const z=s.car.z;run(s,{backward:true},1);
    assert.ok(s.car.z>z+.2,`${kind}:reverse`);assert.ok(s.car.speed<0);
  }
});
test("truck entry is near its cab and cannot be triggered from the trailer rear", () => {
  const s=clearState("truck");s.player.x=0;s.player.z=8;
  toggleVehicle(s,[]);assert.equal(s.driving,false);
  s.player.x=-2.8;s.player.z=-7.25;
  toggleVehicle(s,[]);assert.equal(s.driving,true);
});
test("proximity selects the nearest cab and preserves every parked vehicle", () => {
  const s=createState(),vehicles=structuredClone([s.car,...s.parkedCars]);
  enter(s,"tractor");assert.equal(s.car.kind,"tractor");assert.equal(s.driving,true);
  const parked=structuredClone(s.parkedCars),before={...s.car};
  run(s,{forward:true},1);
  assert.ok(s.car.z<before.z);assert.deepEqual(s.parkedCars,parked);
  assert.equal(new Set([s.car,...s.parkedCars].map(v=>v.id)).size,vehicles.length);
});
test("different vehicle types have different forward and reverse limits", () => {
  for(const kind of VEHICLE_KINDS) {
    const s=clearState(kind);s.driving=true;
    s.car.speed=999;step(s,{forward:true},1/60,0,[]);
    assert.ok(s.car.speed<=vehicleSpec(kind).maxForward);
    s.car.speed=-999;step(s,{backward:true},1/60,0,[]);
    assert.ok(s.car.speed>=-vehicleSpec(kind).maxReverse);
  }
  assert.ok(vehicleSpec("tractor").maxForward<vehicleSpec("technical").maxForward);
});
test("steering is left/right consistent and reverse steering changes yaw in the opposite direction", () => {
  const forward=clearState(),reverse=clearState();forward.driving=reverse.driving=true;
  run(forward,{forward:true,left:true},1);run(reverse,{backward:true,left:true},1);
  assert.ok(forward.car.yaw<-.05);
  assert.ok(reverse.car.yaw>.05);
});
test("a long truck stops at a wall with its nose even while its centre is far away", () => {
  const s=clearState("truck");s.driving=true;s.car.speed=8;
  const wall={x:0,z:-11,w:20,d:.1};run(s,{forward:true},2,0,[wall]);
  assert.equal(s.car.speed,0);
  assert.ok(s.car.z>=-1.45-.01);
  assert.equal(vehicleBlocked(s.car,[wall],getBounds(s)),false);
});
test("vehicle substeps stop high-speed motion at a thin obstacle", () => {
  const s=clearState();s.driving=true;s.car.speed=13;
  const wall={x:0,z:-8,w:20,d:.05};run(s,{forward:true},2,0,[wall]);
  assert.ok(s.car.z>=-5.675-.01);
  assert.equal(s.car.speed,0);assert.equal(vehicleBlocked(s.car,[wall],getBounds(s)),false);
});
test("rotating a long footprint is tested by its corners, not a radius around the centre", () => {
  const v={kind:"rigid_truck",x:0,z:0,yaw:Math.PI/4};
  const corner=rectangleCorners(vehicleFootprint(v)[0])[0];
  const post={x:corner.x*.98,z:corner.z*.98,w:.2,d:.2};
  assert.equal(vehicleBlocked(v,[post],huge),true);
  assert.equal(vehicleBlocked({...v,yaw:0},[post],huge),false);
});
test("articulated trailer follows with a distinct yaw and its swept area collides", () => {
  const s=clearState("truck");s.driving=true;
  run(s,{forward:true,left:true},3);
  assert.ok(Math.abs(s.car.yaw-s.car.trailerYaw)>.02);
  assert.ok(Math.abs(s.car.yaw-s.car.trailerYaw)<=vehicleSpec("truck").maxArticulation+.001);
  const v={kind:"truck",x:0,z:0,yaw:0,trailerYaw:Math.PI/3},parts=vehicleFootprint(v);
  assert.equal(parts.length,2);
  const post={x:parts[1].x,z:parts[1].z,w:.2,d:.2};
  assert.equal(rectanglesOverlap(parts[0],post),false);
  assert.equal(vehicleBlocked(v,[post],huge),true);
});
test("reverse articulation stays bounded instead of folding through the cab", () => {
  const s=clearState("truck");s.driving=true;
  run(s,{backward:true,right:true},12);
  const difference=Math.atan2(Math.sin(s.car.yaw-s.car.trailerYaw),Math.cos(s.car.yaw-s.car.trailerYaw));
  assert.ok(Math.abs(difference)<=vehicleSpec("truck").maxArticulation+.00001);
  assert.equal(vehicleBlocked(s.car,[],getBounds(s)),false);
});
test("parked trucks and tractors block walking over their complete footprint", () => {
  for(const kind of ["truck","rigid_truck","tractor","orchard_tractor"]) {
    const v={kind,x:0,z:0,yaw:0,trailerYaw:0},parts=vehicleFootprint(v),rear=vehicleSpec(kind).length/2;
    const p={x:0,z:rear+3};move(p,0,-20,PLAYER_RADIUS,parts,huge);
    assert.ok(p.z>=rear+PLAYER_RADIUS-.01,kind);
  }
});
test("exit tries another side and refuses when all clearances are blocked", () => {
  const s=clearState();enter(s,"technical");
  const point=vehicleEntryPoint(s.car),rightWall={x:3,z:point.z,w:3,d:5};
  toggleVehicle(s,[rightWall]);assert.equal(s.driving,false);assert.ok(s.player.x<0);
  enter(s,"technical");toggleVehicle(s,[{x:0,z:0,w:40,d:40}]);assert.equal(s.driving,true);
});
test("the driven truck is not retained as a static obstacle against itself", () => {
  const s=createState();enter(s,"truck");assert.equal(s.driving,true);
  assert.ok(!getObstacles(s).some(p=>p.site==="camiao"));
  const before=s.car.z;for(let i=0;i<60;i++)step(s,{forward:true},1/60);
  assert.ok(s.car.z<before-.5);
});
test("travel preserves fleet poses per site and keeps a single player identity", () => {
  let s=createState("tomates_oeste");s.car.x+=2;s.distance=25;s.car.speed=2;s.driving=true;
  const pose={...s.car};
  const away=travelToSite(s,"framboesa_2");
  assert.equal(away.siteId,"framboesa_2");assert.equal(away.driving,false);assert.equal(away.distance,25);
  away.car.z-=3;
  const returned=travelToSite(away,"tomates_oeste");
  assert.equal(returned.car.x,pose.x);assert.equal(returned.car.z,pose.z);
  assert.equal(returned.car.speed,0);assert.equal(returned.player.personId,PLAYER_PERSON_ID);
  assert.equal(new Set([returned.car,...returned.parkedCars].map(v=>v.id)).size,8);
  assert.equal(new Set(getCharacters(returned).map(c=>c.id)).size,4);
  assert.deepEqual(s.car,pose,"travel does not mutate the previous state");
});
test("active local site is explicit for every farm and HQ, independent of geographic coordinates", () => {
  for(const id of SITE_IDS)assert.equal(activeSite(createState(id)),id);
  assert.throws(()=>createState("unknown-site"));
  const s=createState();assert.throws(()=>travelToSite(s,"unknown-site"));
  assert.equal(s.siteId,"tomates_oeste");
});
test("non-finite and oversized frame deltas do not cause unbounded physics jumps", () => {
  const s=clearState();s.driving=true;const before=s.car.z;
  step(s,{forward:true},Infinity,0,[]);assert.equal(s.car.z,before);
  step(s,{forward:true},999,0,[]);assert.ok(Math.abs(s.car.z-before)<.1);
});

test("approaching any vehicle finds a safe cab position without moving fleet or changing identity", () => {
  for(const id of SITE_IDS)for(const kind of VEHICLE_KINDS) {
    const s=createState(id),fleet=structuredClone([s.car,...s.parkedCars]);
    const message=approachVehicle(s,kind),nearest=nearestVehicle(s);
    assert.match(message,/Carrega em E/);
    assert.equal(nearest.vehicle.kind,kind);
    assert.ok(nearest.distance<=vehicleSpec(kind).entryDistance);
    assert.equal(s.player.personId,PLAYER_PERSON_ID);
    assert.deepEqual([s.car,...s.parkedCars],fleet);
    toggleVehicle(s);assert.equal(s.car.kind,kind);assert.equal(s.driving,true);
  }
});
test("approach shortcut refuses while driving and preserves state for an invalid vehicle", () => {
 const s=createState();toggleVehicle(s);const player={...s.player};
 assert.match(approachVehicle(s,"tractor"),/sai do veículo/);assert.deepEqual(s.player,player);
 toggleVehicle(s);const position={...s.player};assert.match(approachVehicle(s,"unknown"),/não está disponível/);assert.deepEqual(s.player,position);
});

test("returning to a site finds a safe player spawn when a parked vehicle covers the original arrival point", () => {
  const s=createState(),spawn=getSiteLayout(s.siteId).spawn;
  s.car.x=spawn.x;s.car.z=spawn.z;
  const back=travelToSite(travelToSite(s,"framboesa_2"),s.siteId);
  assert.equal(back.car.x,spawn.x);assert.equal(back.car.z,spawn.z);
  assert.equal(blocked(back.player.x,back.player.z,PLAYER_RADIUS,[...getObstacles(back),...[back.car,...back.parkedCars].flatMap(vehicleFootprint)],getBounds(back)),false);
  assert.ok(Math.hypot(back.player.x-spawn.x,back.player.z-spawn.z)>1);
});

test("raised construction terraces are solid for people and vehicles at ground level", () => {
  const s=createState("deusas"),layout=getSiteLayout(s.siteId),obstacles=getObstacles(s),bounds=getBounds(s);
  const raised=layout.props.filter(p=>p.type==="terrace"&&p.y>.2);
  assert.equal(raised.length,2);
  for(const terrace of raised) {
    const point={x:terrace.x+terrace.w/2-3,z:terrace.z};
    assert.equal(blocked(point.x,point.z,PLAYER_RADIUS,layout.blocks,bounds),false,"point is outside the narrower construction frame");
    assert.equal(blocked(point.x,point.z,PLAYER_RADIUS,obstacles,bounds),true,"the surrounding raised earth is also solid");
    const tractor={kind:"tractor",...point,yaw:0};
    assert.equal(vehicleBlocked(tractor,obstacles,bounds),true);
  }
  const upper=raised.find(p=>p.y===7),edge=upper.x-upper.w/2;
  Object.assign(s.player,{x:edge-4,z:upper.z,yaw:0});
  for(let i=0;i<6*60;i++)step(s,{right:true},1/60);
  assert.ok(s.player.x<=edge-PLAYER_RADIUS+.01);
  const vehicle=s.parkedCars.find(v=>v.kind==="tractor");
  s.parkedCars=s.parkedCars.filter(v=>v!==vehicle);s.parkedCars.push(s.car);s.car=vehicle;
  Object.assign(s.car,{x:edge-4,z:upper.z,yaw:Math.PI/2,speed:0,steer:0});s.driving=true;
  for(let i=0;i<4*60;i++)step(s,{forward:true},1/60);
  assert.ok(s.car.x<=edge-vehicleSpec("tractor").length/2+.02);
  assert.equal(s.car.speed,0);
});
test("a zero-height terrace is drivable outside its construction frame", () => {
 const s=createState("deusas"),layout=getSiteLayout(s.siteId),ground=layout.props.find(p=>p.type==="terrace"&&p.y===0),obstacles=getObstacles(s),bounds=getBounds(s);
 const point={x:ground.x+ground.w/2-4,z:ground.z};
 assert.equal(obstacles.some(p=>p.type==="terrace"&&p.y===0),false);
 assert.equal(blocked(point.x,point.z,PLAYER_RADIUS,obstacles,bounds),false);
 assert.equal(vehicleBlocked({kind:"tractor",...point,yaw:0},obstacles,bounds),false);
 const frame=layout.blocks.find(b=>b.kind==="construction"&&b.y===0);
 assert.equal(blocked(frame.x,frame.z,PLAYER_RADIUS,obstacles,bounds),true,"the construction footprint itself stays closed");
});
