import { getSiteLayout, rectangleEnvelope } from './sites.js';
import { blocked, getObstacles, getBounds, localToWorld, vehicleFootprint, vehicleBlocked } from './simulation.js';

/** A safe visitor arrival, distinct from the real coordinates of the shared pin. */
export function placeVisitor(state) {
  const layout = getSiteLayout(state.siteId), obstacles = [...getObstacles(state), ...[state.car, ...state.parkedCars].flatMap(vehicleFootprint)];
  const blocks = [...layout.blocks].sort((a, b) => rectangleEnvelope(b).maxZ - rectangleEnvelope(a).maxZ);
  for (const block of blocks) for (const side of [1, -1]) for (const distance of [18, 26, 10]) for (const across of [.1, 0, -.2]) {
    const pose = { x: block.x, z: block.z, yaw: block.rotation || 0 };
    const point = localToWorld(block.w * across, side * (block.d / 2 + distance), pose);
    if (!blocked(point.x, point.z, .6, obstacles, getBounds(state))) {
      Object.assign(state.player, point, { yaw: pose.yaw + (side < 0 ? Math.PI : 0) });
      return { ...state.player, block, side, distance };
    }
  }
  return { ...state.player, block: blocks[0], side: 1, distance: 18 };
}

/** Roles with a supplied site association; never clone one person per farm. */
export function placeSitePeople(state, arrival) {
  const present = state.characters.filter(person => person.id === 'nuno' || (person.id === 'hernani' && state.siteId === 'greenaura') || (person.id === 'rafael' && state.siteId === 'deusas'));
  state.characters = [];
  for (const [index, person] of present.entries()) {
    const point = localToWorld(-5 - index * 2.4, -4, arrival);
    if (!blocked(point.x, point.z, .45, getObstacles(state), getBounds(state))) state.characters.push({ ...person, ...point, yaw: arrival.yaw + Math.PI / 3 });
    else state.characters.push(person);
  }
}

export function parkVisitorCar(state, arrival) {
  const car = [state.car, ...state.parkedCars].find(vehicle => vehicle.kind === 'technical');
  if (!car) return;
  for (const side of [1, -1]) {
    const point = localToWorld(side * 7, 3, arrival), next = { ...car, ...point, yaw: arrival.yaw - side * .1 };
    const obstacles = [...getObstacles(state), ...[state.car, ...state.parkedCars].filter(vehicle => vehicle !== car).flatMap(vehicleFootprint)];
    if (!vehicleBlocked(next, obstacles, getBounds(state))) { Object.assign(car, next); return; }
  }
}
