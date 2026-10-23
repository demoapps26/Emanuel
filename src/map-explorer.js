import { createWorld, drawMap } from './world.js';
import { createState, travelToSite, step, toggleVehicle, approachVehicle } from './simulation.js';
import { placeVisitor, placeSitePeople, parkVisitorCar } from './explore-model.js';
import { VEHICLE_NAMES } from './fleet.js';
import { referenceImage, escapeHtml as esc } from './map-details.js';
import { nearbyCharacter } from './characters.js';

/** A real WebGL scene with a walking avatar, connected to the geographic map. */
export function createMapExplorer(host, { sites, onMap, onInfo, onCatalog, onPhoto, onMessage }) {
  host.innerHTML = `<canvas id="explore-canvas" tabindex="0" aria-label="Exploração em 3D. WASD move a personagem; arrasta o rato para rodar a câmara."></canvas>
    <section class="explore-location"><span class="explore-location-icon" aria-hidden="true">⌖</span><div><h1 id="explore-title"></h1><p id="explore-subtitle"></p><button id="explore-info">Consultar exploração</button></div></section>
    <span class="explore-accuracy">Cenário 3D · Implantação aproximada</span>
    <button class="world-hotspot" id="explore-hotspot">Consultar exploração <span aria-hidden="true">↗</span></button>
    <div class="explore-tools"><button id="explore-catalog">Mudar exploração</button><button id="explore-photo">Imagem aérea</button><button id="explore-aerial" aria-pressed="false">Vista aérea · B</button><button id="explore-fleet-toggle">Veículos · V</button><label for="explore-quality">Qualidade<select id="explore-quality"><option value="low">Leve</option><option value="medium">Equilibrada</option><option value="high">Alta</option></select></label><span id="explore-performance"></span></div>
    <section class="explore-minimap"><header><strong id="explore-minimap-title"></strong><button id="explore-map" aria-label="Abrir mapa geográfico">Mapa · M</button></header><button class="explore-reference" id="explore-reference" aria-label="Ampliar referência aérea"><img id="explore-reference-image" alt=""></button><canvas id="explore-plan" width="300" height="200" hidden aria-label="Posição da personagem na planta 3D aproximada"></canvas><footer><button id="explore-minimap-mode">Ver posição no cenário 3D</button><span>↑ N</span></footer></section>
    <div class="explore-controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Mover</span><span>Arrastar rato · Câmara</span><span><kbd>Shift</kbd> Correr</span><button id="explore-enter"><kbd>E</kbd> Veículo</button><button id="explore-consult"><kbd>F</kbd> Pessoa</button><button id="explore-controls-map"><kbd>M</kbd> Mapa</button><button id="explore-reset">Repor posição</button></div>
    <div class="explore-touch" aria-label="Movimento por toque"><button data-move="forward" aria-label="Andar em frente">↑</button><div><button data-move="left" aria-label="Andar para a esquerda">←</button><button data-move="backward" aria-label="Andar para trás">↓</button><button data-move="right" aria-label="Andar para a direita">→</button></div></div>
    <div id="explore-fleet" class="explore-fleet" hidden><header><h2>Veículos e equipamentos</h2><button id="explore-fleet-close" aria-label="Fechar veículos">×</button></header><p>Escolhe um veículo para te aproximares. Usa E para entrar; pára antes de sair.</p>${Object.entries(VEHICLE_NAMES).map(([kind, name]) => `<button data-explore-vehicle="${kind}">${esc(name)}</button>`).join('')}</div>
    <button id="explore-pause" class="explore-pause" hidden>Exploração em pausa · Retomar</button>`;
  const $ = selector => host.querySelector(selector), canvas = $('#explore-canvas');
  const world = createWorld(canvas, { cinematic: true });
  let state = createState(), arrival, active = false, paused = false, input = {}, aerial = false, plan = false, cameraYaw = 0, frame, previous = 0, elapsed = 0, frames = 0;
  const visited = new Set();
  let site = sites.find(site => site.id === state.siteId);
  const movingKeys = { w: 'forward', arrowup: 'forward', s: 'backward', arrowdown: 'backward', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', shift: 'run', ' ': 'brake' };
  const quality = world.recommendedQuality === 'low' ? 'medium' : 'high';
  world.quality(quality); $('#explore-quality').value = quality;
  function info() { input = {}; onInfo(state.siteId); }
  function setUpSite() {
    arrival = placeVisitor(state); placeSitePeople(state, arrival);
    if (!visited.has(state.siteId)) parkVisitorCar(state, arrival);
    visited.add(state.siteId);
    world.resetCamera(arrival.yaw + .27); cameraYaw = arrival.yaw + .27;
    site = sites.find(site => site.id === state.siteId);
    $('#explore-title').textContent = site.nome;
    $('#explore-subtitle').textContent = site.id === 'sede' ? 'Sede · Receção e expedição' : `${new Intl.NumberFormat('pt-PT').format(site.area_ha)} ha${site.area_e_projetada ? ' projetados · Em construção' : ` · ${(site.culturas_atuais || []).join(' e ')}`}`;
    $('#explore-minimap-title').textContent = site.nome;
    $('#explore-reference-image').src = referenceImage(site); $('#explore-reference-image').alt = `Imagem aérea original de ${site.nome}`;
    aerial = false; $('#explore-aerial').setAttribute('aria-pressed', 'false');
    input = {}; canvas.focus({ preventScroll: true });
    host.dataset.site = state.siteId;
  }
  function switchSite(id) { if (id !== state.siteId) state = travelToSite(state, id); setUpSite(); }
  function toggleAerial() { aerial = !aerial; input = {}; $('#explore-aerial').setAttribute('aria-pressed', String(aerial)); }
  function closeFleet() { $('#explore-fleet').hidden = true; input = {}; }
  function toggleFleet() { $('#explore-fleet').hidden = !$('#explore-fleet').hidden; input = {}; }
  function resetPosition() { if (state.driving) { onMessage('Pára e sai do veículo para repor a posição da personagem.'); return; } arrival = placeVisitor(state); world.resetCamera(arrival.yaw + .27); input = {}; aerial = false; }
  function consultPerson() { const person = nearbyCharacter(state); onMessage(person ? `${person.name} · ${person.role}. ${person.description}` : 'Aproxima-te de uma pessoa para consultar a sua função.'); }
  function enterVehicle() { onMessage(toggleVehicle(state)); input = {}; }
  function render(now) {
    if (!active) return;
    const raw = previous ? Math.min((now - previous) / 1000, .25) : 1 / 60, dt = Math.min(raw, .05); previous = now;
    const blockedUI = paused || !$('#explore-fleet').hidden || document.querySelector('dialog[open]') || !document.querySelector('#details').hidden || document.body.classList.contains('list-open');
    let movement = 0;
    if (!blockedUI && !aerial) for (let remaining = raw; remaining > .0001; remaining -= 1 / 60) movement += step(state, input, Math.min(remaining, 1 / 60), cameraYaw);
    const rendered = !paused && !blockedUI;
    if (rendered) { cameraYaw = world.render(state, dt, movement, aerial); host.dataset.renderedSite = state.siteId; }
    const point = state.driving ? state.car : state.player;
    Object.assign(host.dataset, { x: point.x.toFixed(3), z: point.z.toFixed(3), yaw: cameraYaw.toFixed(3), driving: String(state.driving), aerial: String(aerial), paused: String(paused || Boolean(blockedUI)), people: state.characters.map(person => person.id).join(','), player: state.player.personId });
    if (plan) drawMap($('#explore-plan'), state);
    const hotspot = world.projectPoint(arrival.x + Math.sin(arrival.yaw) * arrival.distance, 3.2, arrival.z - Math.cos(arrival.yaw) * arrival.distance);
    $('#explore-hotspot').hidden = aerial || !hotspot.visible || blockedUI;
    if (hotspot.visible) { $('#explore-hotspot').style.left = `${hotspot.x}px`; $('#explore-hotspot').style.top = `${hotspot.y}px`; }
    if(rendered){elapsed += raw; frames++;}
    if (elapsed > 1) { $('#explore-performance').textContent = `${Math.round(frames / elapsed)} FPS`; elapsed = 0; frames = 0; }
    frame = requestAnimationFrame(render);
  }
  function activate(value) { active = value; input = {}; previous = 0; cancelAnimationFrame(frame); if (active) { world.resize(); frame = requestAnimationFrame(render); } }
  function editing(event) { return event.target.closest('input,select,textarea,dialog') || document.querySelector('dialog[open]'); }
  addEventListener('keydown', event => {
    if (!active || event.defaultPrevented || editing(event) || event.repeat && !movingKeys[event.key.toLowerCase()]) return;
    const key = event.key.toLowerCase();
    if (movingKeys[key]) { event.preventDefault(); input[movingKeys[key]] = true; }
    if (event.repeat) return;
    if (key === 'm') { input = {}; onMap(state.siteId); }
    if (key === 'i') info();
    if (key === 'e') enterVehicle();
    if (key === 'f') consultPerson();
    if (key === 'b') toggleAerial();
    if (key === 'v') toggleFleet();
    if (key === 'r') resetPosition();
    if (key === 'escape') { paused = !paused; input = {}; $('#explore-pause').hidden = !paused; }
  });
  addEventListener('keyup', event => { const action = movingKeys[event.key.toLowerCase()]; if (action) input[action] = false; });
  addEventListener('blur', () => { input = {}; });
  document.addEventListener('visibilitychange', () => { input = {}; });
  $('#explore-info').onclick = info; $('#explore-hotspot').onclick = info;
  $('#explore-catalog').onclick = () => { input = {}; onCatalog(); };
  $('#explore-photo').onclick = () => { input = {}; onPhoto(state.siteId); };
  $('#explore-reference').onclick = $('#explore-photo').onclick;
  $('#explore-map').onclick = () => onMap(state.siteId); $('#explore-controls-map').onclick = $('#explore-map').onclick;
  $('#explore-aerial').onclick = toggleAerial; $('#explore-enter').onclick = enterVehicle;
  $('#explore-consult').onclick = consultPerson; $('#explore-reset').onclick = resetPosition;
  $('#explore-fleet-toggle').onclick = toggleFleet; $('#explore-fleet-close').onclick = closeFleet;
  $('#explore-fleet').addEventListener('click', event => { const button = event.target.closest('[data-explore-vehicle]'); if (!button) return; onMessage(approachVehicle(state, button.dataset.exploreVehicle)); closeFleet(); canvas.focus(); });
  $('#explore-quality').onchange = event => world.quality(event.target.value);
  $('#explore-pause').onclick = () => { paused = false; $('#explore-pause').hidden = true; canvas.focus(); };
  $('#explore-minimap-mode').onclick = () => { plan = !plan; $('#explore-plan').hidden = !plan; $('#explore-reference').hidden = plan; $('#explore-minimap-mode').textContent = plan ? 'Ver imagem aérea original' : 'Ver posição no cenário 3D'; };
  for (const button of host.querySelectorAll('[data-move]')) {
    button.onpointerdown = event => { event.preventDefault(); button.setPointerCapture(event.pointerId); input[button.dataset.move] = true; };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => input[button.dataset.move] = false);
  }
  setUpSite();
  return { activate, switchSite, getSiteId: () => state.siteId, getState: () => state };
}
