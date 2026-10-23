import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, blocked, getObstacles, getBounds, vehicleFootprint } from '../src/simulation.js';
import { placeVisitor, placeSitePeople, parkVisitorCar } from '../src/explore-model.js';
import { SITE_IDS } from '../src/sites.js';
import { initialData, loadData, STORAGE_KEY } from '../src/data.js';

test('visitor arrivals remain outside buildings and parked vehicles in all fourteen sites', () => {
  for (const id of SITE_IDS) {
    const state = createState(id), arrival = placeVisitor(state);
    assert.ok(arrival.block, id);
    assert.ok(!blocked(state.player.x, state.player.z, .4, [...getObstacles(state), ...[state.car, ...state.parkedCars].flatMap(vehicleFootprint)], getBounds(state)), id);
    assert.equal(state.player.personId, 'emanuel_franco');
  }
});
test('Rafael has one physical presence at Deusas and no general presence on other visits', () => {
  for (const id of SITE_IDS) {
    const state = createState(id), arrival = placeVisitor(state);
    placeSitePeople(state, arrival); parkVisitorCar(state, arrival);
    assert.equal(state.characters.filter(person => person.id === 'rafael').length, id === 'deusas' ? 1 : 0, id);
    assert.equal(new Set(state.characters.map(person => person.id)).size, state.characters.length);
    assert.ok(!blocked(state.player.x, state.player.z, .4, [...getObstacles(state), ...[state.car, ...state.parkedCars].flatMap(vehicleFootprint)], getBounds(state)), id);
  }
});
test('older saved copies acquire the confirmed Deusas assignment without losing edited information', () => {
  const source = initialData();
  source.assignments = source.assignments.filter(a => a.personId !== 'rafael');
  source.exploracoes[0].area_ha = 17.25;
  const storage = { getItem: key => key === STORAGE_KEY ? JSON.stringify(source) : null };
  const { data, warning } = loadData(storage);
  assert.equal(warning, null); assert.equal(data.exploracoes[0].area_ha, 17.25);
  assert.deepEqual(data.assignments.filter(a => a.personId === 'rafael'), [{ personId: 'rafael', siteId: 'deusas', role: 'Equipamentos e apoio à construção' }]);
  assert.ok(!data.companyRoles.some(role => role.personId === 'rafael'));
});
