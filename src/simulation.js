import { CHARACTERS, PLAYER_PERSON_ID } from "./characters.js";
import { VEHICLE_KINDS, VEHICLE_NAMES, vehicleSpec } from "./fleet.js";
import { getSiteLayout } from "./sites.js";

export const PLAYER_RADIUS = .38;
const DEFAULT_SITE = "tomates_oeste";
const EPSILON = 1e-7;
const clone = value => structuredClone(value);
const angle = value => Math.atan2(Math.sin(value), Math.cos(value));
const rectYaw = rect => rect.rotation ?? rect.yaw ?? 0;

export function getCharacters(state) {
  if (state.characters) return state.characters;
  const anchor = getSiteLayout(state.siteId || DEFAULT_SITE).npcAnchor;
  return CHARACTERS.map(c => ({
    ...c,
    x: anchor.x + c.x - CHARACTERS[0].x,
    z: anchor.z + c.z - CHARACTERS[0].z,
  }));
}
export function getObstacles(state) {
  const layout = getSiteLayout(state.siteId || DEFAULT_SITE);
  return [
    ...layout.blocks,
    // Raised soil platforms are solid at ground level until vertical terrain
    // traversal is modelled. A zero-height terrace remains a drivable surface.
    ...(layout.props || []).filter(p =>
      ["reservoir", "tank", "office", "display", "fence"].includes(p.type) ||
      (p.type === "terrace" && p.y > .2)
    ).map(p => ({ ...p, w: Math.max(.2, p.w), d: Math.max(.2, p.d) })),
    ...getCharacters(state).map(c => ({ x: c.x, z: c.z, w: .65, d: .65, site: c.id })),
  ];
}
export function getBounds(state) {
  return getSiteLayout(state.siteId || DEFAULT_SITE).bounds;
}
export const BOUNDS = getSiteLayout(DEFAULT_SITE).bounds;
export const BLOCKS = getSiteLayout(DEFAULT_SITE).blocks;
export const OBSTACLES = getObstacles({ siteId: DEFAULT_SITE });

export function createState(siteId = DEFAULT_SITE) {
  const layout = getSiteLayout(siteId);
  const vehicles = VEHICLE_KINDS.map(kind => {
    const spawn = layout.vehicleSpawns[kind];
    if (!spawn) throw Error(`Falta estacionamento de ${kind} em ${siteId}.`);
    return {
      ...spawn, kind, id: `${siteId}:${kind}`, speed: 0, steer: 0,
      ...(vehicleSpec(kind).articulated ? { trailerYaw: spawn.yaw || 0 } : {}),
    };
  });
  const state = {
    siteId: layout.id,
    player: { ...layout.spawn, personId: PLAYER_PERSON_ID },
    car: vehicles[0], parkedCars: vehicles.slice(1),
    driving: false, distance: 0, locations: {},
  };
  state.characters = getCharacters(state);
  placeAtSafeSpawn(state);
  return state;
}
function parkedSnapshot(state) {
  return {
    activeKind: state.car.kind,
    vehicles: [state.car, ...state.parkedCars].map(v => ({ ...v, speed: 0, steer: 0 })),
  };
}
/** Travel unloads a local scene; it never changes geographic coordinates. */
export function travelToSite(state, siteId) {
  const next = createState(siteId);
  const locations = { ...state.locations, [state.siteId]: parkedSnapshot(state) };
  const saved = locations[siteId];
  if (saved) {
    const vehicles = clone(saved.vehicles);
    const current = vehicles.find(v => v.kind === saved.activeKind) || vehicles[0];
    next.car = current;
    next.parkedCars = vehicles.filter(v => v !== current);
  }
  next.distance = state.distance;
  next.locations = locations;
  placeAtSafeSpawn(next);
  return next;
}

export function localToWorld(x, z, pose) {
  const sin = Math.sin(pose.yaw || 0), cos = Math.cos(pose.yaw || 0);
  return { x: pose.x + x * cos - z * sin, z: pose.z + x * sin + z * cos };
}
export function vehicleEntryPoint(vehicle) {
  const offset = vehicleSpec(vehicle.kind).entryOffset;
  return localToWorld(offset.x, offset.z, vehicle);
}
/** The truck has two independent collision rectangles joined at its fifth wheel. */
export function vehicleFootprint(vehicle) {
  const spec = vehicleSpec(vehicle.kind);
  if (!spec.articulated)
    return [{ x: vehicle.x, z: vehicle.z, w: spec.width, d: spec.length, rotation: vehicle.yaw || 0 }];
  const cab = localToWorld(0, spec.cabCenterZ, vehicle);
  const hitch = localToWorld(0, spec.hitchZ, vehicle);
  const trailerPose = { ...hitch, yaw: vehicle.trailerYaw ?? vehicle.yaw ?? 0 };
  const trailer = localToWorld(0, spec.trailerCenterOffset, trailerPose);
  return [
    { ...cab, w: spec.cabWidth, d: spec.cabLength, rotation: vehicle.yaw || 0 },
    { ...trailer, w: spec.trailerWidth, d: spec.trailerLength, rotation: trailerPose.yaw },
  ];
}
export function rectangleCorners(rect) {
  const pose = { ...rect, yaw: rectYaw(rect) };
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z]) => localToWorld(x*rect.w/2,z*rect.d/2,pose));
}
function axes(rect) {
  const yaw = rectYaw(rect);
  return [{ x: Math.cos(yaw), z: Math.sin(yaw) }, { x: -Math.sin(yaw), z: Math.cos(yaw) }];
}
export function rectanglesOverlap(a, b) {
  const ac = rectangleCorners(a), bc = rectangleCorners(b);
  for (const axis of [...axes(a), ...axes(b)]) {
    const ap = ac.map(p => p.x*axis.x+p.z*axis.z), bp = bc.map(p => p.x*axis.x+p.z*axis.z);
    if (Math.max(...ap) <= Math.min(...bp)+EPSILON || Math.max(...bp) <= Math.min(...ap)+EPSILON) return false;
  }
  return true;
}
function circleHitsRect(x, z, radius, rect) {
  const cos = Math.cos(rectYaw(rect)), sin = Math.sin(rectYaw(rect));
  const dx=x-rect.x, dz=z-rect.z;
  const lx=dx*cos+dz*sin, lz=-dx*sin+dz*cos;
  const gapX=lx-Math.max(-rect.w/2,Math.min(lx,rect.w/2));
  const gapZ=lz-Math.max(-rect.d/2,Math.min(lz,rect.d/2));
  return gapX*gapX+gapZ*gapZ < radius*radius-EPSILON;
}
export function blocked(x, z, radius = PLAYER_RADIUS, obstacles = OBSTACLES, bounds = BOUNDS) {
  if (x-radius < bounds.minX || x+radius > bounds.maxX || z-radius < bounds.minZ || z+radius > bounds.maxZ) return true;
  return obstacles.some(rect => circleHitsRect(x,z,radius,rect));
}
export function vehicleBlocked(vehicle, obstacles, bounds = BOUNDS) {
  for (const rect of vehicleFootprint(vehicle)) {
    if (rectangleCorners(rect).some(p => p.x < bounds.minX || p.x > bounds.maxX || p.z < bounds.minZ || p.z > bounds.maxZ)) return true;
    if (obstacles.some(other => rectanglesOverlap(rect,other))) return true;
  }
  return false;
}
export function move(body, dx, dz, radius = PLAYER_RADIUS, obstacles = OBSTACLES, bounds = BOUNDS) {
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.25));
  let hit=false;
  for(let i=0;i<steps;i++) {
    if(!blocked(body.x+dx/steps,body.z,radius,obstacles,bounds))body.x+=dx/steps;
    else hit=true;
    if(!blocked(body.x,body.z+dz/steps,radius,obstacles,bounds))body.z+=dz/steps;
    else hit=true;
  }
  return hit;
}
function allVehicleObstacles(vehicles) {
  return vehicles.flatMap(vehicleFootprint);
}
function placeAtSafeSpawn(state) {
  const origin=getSiteLayout(state.siteId).spawn,bounds=getBounds(state);
  const obstacles=[...getObstacles(state),...allVehicleObstacles([state.car,...state.parkedCars])];
  for(let radius=0;radius<=40;radius++)for(let direction=0;direction<(radius?16:1);direction++) {
    const theta=direction*Math.PI/8;
    const x=origin.x+Math.cos(theta)*radius,z=origin.z+Math.sin(theta)*radius;
    if(!blocked(x,z,PLAYER_RADIUS,obstacles,bounds)) {
      Object.assign(state.player,{x,z,yaw:origin.yaw||0});return;
    }
  }
  throw Error("Não foi encontrado um acesso livre para a personagem nesta exploração.");
}
export function nearestVehicle(state) {
  return [state.car,...state.parkedCars]
    .map(vehicle=>{const point=vehicleEntryPoint(vehicle);return {vehicle,distance:Math.hypot(point.x-state.player.x,point.z-state.player.z)};})
    .sort((a,b)=>a.distance-b.distance)[0] || null;
}
/** A local on-foot shortcut to a vehicle cab; it does not move any vehicle. */
export function approachVehicle(state,kind) {
  if(state.driving)return "Pára e sai do veículo antes de te aproximares de outro.";
  const vehicle=[state.car,...state.parkedCars].find(v=>v.kind===kind);
  if(!vehicle)return "Este veículo não está disponível nesta exploração.";
  const spec=vehicleSpec(kind),side=spec.width/2+PLAYER_RADIUS+.55,cabin=spec.entryOffset;
  const candidates=[[-side,cabin.z],[side,cabin.z],[-side,cabin.z+1],[side,cabin.z+1],[0,cabin.z-2],[0,cabin.z+2]];
  const obstacles=[...getObstacles(state),...allVehicleObstacles([state.car,...state.parkedCars])],bounds=getBounds(state),entry=vehicleEntryPoint(vehicle);
  for(const [x,z]of candidates) {
    const point=localToWorld(x,z,vehicle);
    if(Math.hypot(point.x-entry.x,point.z-entry.z)>spec.entryDistance)continue;
    if(!blocked(point.x,point.z,PLAYER_RADIUS,obstacles,bounds)) {
      Object.assign(state.player,{...point,yaw:Math.atan2(entry.x-point.x,-(entry.z-point.z))});
      return `Estás junto ao ${VEHICLE_NAMES[kind]}. Carrega em E para entrar.`;
    }
  }
  return "Não há espaço livre junto à cabina. Aproxima-te por outro acesso.";
}
export function toggleVehicle(state, obstacles) {
  const staticObstacles=obstacles ?? getObstacles(state), bounds=getBounds(state);
  if(!state.driving) {
    const choices=[state.car,...state.parkedCars].map(v=>({ vehicle:v,distance:Math.hypot(vehicleEntryPoint(v).x-state.player.x,vehicleEntryPoint(v).z-state.player.z) }))
      .filter(p=>p.distance<=vehicleSpec(p.vehicle.kind).entryDistance).sort((a,b)=>a.distance-b.distance);
    if(!choices.length)return "Aproxima-te da cabina ou do lugar do condutor para entrar.";
    const selected=choices[0].vehicle;
    if(selected!==state.car) {
      const index=state.parkedCars.indexOf(selected);
      state.parkedCars[index]=state.car;
      state.car=selected;
    }
    state.driving=true;
    state.car.speed=0;
    state.car.steer=0;
    if(vehicleSpec(state.car.kind).articulated && !Number.isFinite(state.car.trailerYaw))state.car.trailerYaw=state.car.yaw||0;
    Object.assign(state.player,{x:state.car.x,z:state.car.z,yaw:state.car.yaw});
    return `Veículo: ${VEHICLE_NAMES[state.car.kind]}. W/S acelera e recua; A/D vira; Espaço trava.`;
  }
  if(Math.abs(state.car.speed)>.35)return "Pára o veículo antes de sair.";
  const c=state.car,spec=vehicleSpec(c.kind),cabin=spec.entryOffset;
  const sideDistance=spec.width/2+PLAYER_RADIUS+.55;
  const offsets=[
    [sideDistance,cabin.z],[-sideDistance,cabin.z],
    [sideDistance,cabin.z+1.4],[-sideDistance,cabin.z+1.4],
    [0,-spec.length/2-PLAYER_RADIUS-.65],[0,spec.length/2+PLAYER_RADIUS+.65],
  ];
  const solid=[...staticObstacles,...allVehicleObstacles([c,...state.parkedCars])];
  for(const [x,z]of offsets) {
    const point=localToWorld(x,z,c);
    if(!blocked(point.x,point.z,PLAYER_RADIUS,solid,bounds)) {
      Object.assign(state.player,{...point,yaw:c.yaw});
      state.driving=false;c.speed=0;c.steer=0;
      return "Saíste do veículo.";
    }
  }
  return "Não há espaço seguro para sair. Afasta o veículo dos obstáculos.";
}
function drive(state,input,dt,obstacles,bounds) {
  const c=state.car,spec=vehicleSpec(c.kind);
  const throttle=(input.forward?1:0)-(input.backward?1:0);
  const opposing=throttle && Math.sign(c.speed)!==Math.sign(throttle) && Math.abs(c.speed)>.15;
  c.speed += throttle*(opposing?spec.acceleration*2.5:spec.acceleration)*dt;
  c.speed *= Math.exp(-(input.brake ? spec.brake : throttle ? .10 : 1.5)*dt);
  c.speed=Math.max(-spec.maxReverse,Math.min(spec.maxForward,c.speed));
  if(Math.abs(c.speed)<.008)c.speed=0;
  const targetSteer=(input.right?1:0)-(input.left?1:0);
  c.steer=(c.steer||0)+(targetSteer-(c.steer||0))*Math.min(1,dt*7);
  const steerAngle=c.steer*spec.steering/(1+Math.abs(c.speed)/spec.maxForward*.6);
  const yawDelta=c.speed/spec.wheelbase*Math.tan(steerAngle)*dt;
  const steps=Math.max(1,Math.ceil(Math.abs(c.speed*dt)/.15),Math.ceil(Math.abs(yawDelta)*spec.length/.24));
  let collided=false;
  for(let i=0;i<steps;i++) {
    const subdt=dt/steps,dyaw=yawDelta/steps;
    const rear=localToWorld(0,spec.rearAxleOffset,c),newYaw=angle(c.yaw+dyaw),midYaw=c.yaw+dyaw/2;
    rear.x+=Math.sin(midYaw)*c.speed*subdt;rear.z-=Math.cos(midYaw)*c.speed*subdt;
    const next={...c,yaw:newYaw};
    next.x=rear.x+Math.sin(newYaw)*spec.rearAxleOffset;
    next.z=rear.z-Math.cos(newYaw)*spec.rearAxleOffset;
    if(spec.articulated) {
      const beforeHitch=localToWorld(0,spec.hitchZ,c),afterHitch=localToWorld(0,spec.hitchZ,next);
      const previous=c.trailerYaw ?? c.yaw;
      next.trailerYaw=angle(previous+((afterHitch.x-beforeHitch.x)*Math.cos(previous)+(afterHitch.z-beforeHitch.z)*Math.sin(previous))/spec.trailerAxleOffset);
      const oldArt=Math.abs(angle(c.yaw-previous)),newArt=Math.abs(angle(newYaw-next.trailerYaw));
      if(newArt>spec.maxArticulation && newArt>oldArt+EPSILON) { collided=true;break; }
    }
    if(vehicleBlocked(next,obstacles,bounds)) { collided=true;break; }
    Object.assign(c,next);
  }
  if(collided)c.speed=0;
  Object.assign(state.player,{x:c.x,z:c.z,yaw:c.yaw});
}
export function step(state,input,dt,cameraYaw=0,obstacles) {
  dt=Number.isFinite(dt)?Math.max(0,Math.min(dt,.05)):0;
  const solid=obstacles ?? getObstacles(state),bounds=getBounds(state);
  const parked=allVehicleObstacles(state.parkedCars);
  const target=state.driving?state.car:state.player,before={x:target.x,z:target.z};
  if(state.driving)drive(state,input,dt,[...solid,...parked],bounds);
  else {
    let x=(input.right?1:0)-(input.left?1:0),z=(input.backward?1:0)-(input.forward?1:0);
    const length=Math.hypot(x,z);
    if(length) {
      x/=length;z/=length;
      const dx=x*Math.cos(cameraYaw)-z*Math.sin(cameraYaw),dz=x*Math.sin(cameraYaw)+z*Math.cos(cameraYaw),speed=input.run?4.2:1.8;
      move(target,dx*speed*dt,dz*speed*dt,PLAYER_RADIUS,[...solid,...parked,...vehicleFootprint(state.car)],bounds);
      target.yaw=Math.atan2(dx,-dz);
    }
  }
  const moved=Math.hypot(target.x-before.x,target.z-before.z);
  state.distance+=moved;
  return moved;
}
export function activeSite(state) { return state.siteId || DEFAULT_SITE; }
