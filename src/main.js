import { mountRegionalMap, referenceImage } from "./regional-map.js";
import { availableConversations, conversationTurns } from "./conversations.js";
import { confirmedLocations, distanceMetres } from "./geography.js";
import { googleRequirements, openGoogle3D } from "./google-map.js";
import { CHARACTERS, PLAYER_PERSON_ID, nearbyCharacter } from "./characters.js";
import { VEHICLE_NAMES, VEHICLE_SPECS } from "./fleet.js";
import { FARM_IDS, SITE_IDS, getSiteLayout } from "./sites.js";
import "./style.css";
import { mapReadiness } from "./maps.js";
import { createWorld, drawMap } from "./world.js";
import { createState, step, toggleVehicle, activeSite, travelToSite, approachVehicle, nearestVehicle, blocked, getObstacles, getBounds, localToWorld, vehicleFootprint } from "./simulation.js";
import {
  loadData,
  saveData,
  validateData,
  totals,
  identityName,
  teamFor,
  MODELLED,
} from "./data.js";

const $ = (s) => document.querySelector(s);
const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (n) =>
  new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(n);
$("#app").innerHTML = `
<canvas id="scene" aria-label="Mundo agrícola 3D. Controla a personagem com W A S D; arrasta o rato para rodar a câmara." tabindex="0"></canvas>
<header class="topbar"><a class="brand" href="#" aria-label="Grupo Patrícia Pilar, início"><span class="brand-symbol">❧</span><span>Grupo Patrícia Pilar<small>MUNDO 3D · EXPLORAÇÕES</small></span></a><nav aria-label="Navegação"><button id="explore" class="nav active">Explorar</button><button id="open-map" class="nav">Mapa</button><button id="open-catalog" class="nav">Explorações <span>13</span></button><button id="open-fleet" class="nav">Veículos</button><button id="open-team" class="nav">Equipa</button><button id="open-talk" class="nav">Conversas</button></nav><div class="top-actions"><span class="demo-badge"><i></i> Demonstração local</span><button id="help" class="icon-button" aria-label="Ajuda e controlos">?</button></div></header>
<main class="hud" id="hud"><div class="location"><span class="eyebrow">A EXPLORAR</span><h1 id="location-name">Caminhos da exploração</h1><p id="location-detail">13 explorações e sede</p><button id="site-info" class="text-button">Consultar exploração <span>↗</span></button><div class="location-actions"><button id="aerial-toggle" class="text-button">Vista aérea · B</button><button id="change-site" class="text-button">Mudar local ↗</button><button id="go-to-greenhouses" class="text-button">Ir às estufas →</button></div></div><button class="mission-chip" id="open-day">Dia de campo · <span id="day-count">0/4</span> →</button><div class="scene-note">Cenário 3D aproximado <span>·</span> 14 locais no mapa</div><aside class="minimap-card"><div class="map-caption"><span><i></i> PERCURSO LOCAL</span><button id="expand-map" aria-label="Ampliar mapa">⤢</button></div><canvas id="minimap" width="320" height="245" aria-label="Minimapa esquemático, sem escala geográfica"></canvas><div class="map-footer"><span>▲ A tua posição</span><span>Mapa esquemático</span></div></aside><div class="live-status"><span id="mode">A pé</span><strong id="speed">Pronto a explorar</strong><small id="fps">A medir desempenho…</small></div><div class="interaction" id="interaction"><kbd>E</kbd><span>Entrar no veículo</span></div></main>
<footer class="controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Mover</span><span><kbd>⇧</kbd> Correr</span><span>Arrastar rato · Câmara</span><span><kbd>E</kbd> Veículo</span><span><kbd>M</kbd> Mapa</span><span><kbd>F</kbd> Pessoa</span><span><kbd>R</kbd> Reiniciar</span><button id="pause"><kbd>Esc</kbd> Pausa</button></footer>
<div id="welcome" class="welcome"><div class="welcome-card"><span class="eyebrow">GRUPO PATRÍCIA PILAR</span><h2>Um novo olhar<br>sobre o campo.</h2><p>Um dia de campo: visita as explorações, conhece as pessoas e participa em conversas técnicas simuladas.</p><div class="welcome-sites"><span>13 explorações + sede</span><span>8 veículos conduzíveis · 2 tratores</span></div><button id="start" class="primary">Começar a explorar <span>→</span></button><small>Protótipo para computador · Teclado e rato<br>Cenário e veículos aproximados. Sem rastreio real.</small></div><div class="version">VERSÃO JOGÁVEL <span>0.4</span></div></div>
<dialog id="panel" aria-labelledby="panel-title"><div class="panel-top"><div><span class="eyebrow" id="panel-kicker">GRUPO PATRÍCIA PILAR</span><h2 id="panel-title">Explorações</h2></div><button id="close-panel" class="icon-button" aria-label="Fechar painel">×</button></div><div id="panel-body"></div></dialog>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
`;
let data, warning;
try {
  ({ data, warning } = loadData(localStorage));
} catch {
  ({ data, warning } = loadData({
    getItem() {
      throw Error();
    },
  }));
}
let world;
try {
  world = createWorld($("#scene"));
} catch (e) {
  $("#welcome .welcome-card").innerHTML =
    '<span class="eyebrow">COMPATIBILIDADE</span><h2>O 3D não arrancou.</h2><p>Este protótipo precisa de WebGL e aceleração gráfica. Experimenta um navegador atualizado num computador com suporte 3D.</p><button id="fallback-catalog" class="primary">Consultar catálogo</button>';
  console.error("Não foi possível iniciar WebGL:", e);
  $("#fallback-catalog").onclick = () => openCatalog();
}
let state = createState(),
  started = false,
  paused = false,
  aerialMode = false,
  input = {},
  cameraYaw = 0,
  selected = "tomates_oeste",
  lastSite = null;
const dayProgress = {
  team: false,
  conversation: false,
  vehicle: false,
  sites: new Set(),
};
let toastTimeout, previousFocus, mapController;
const panel = $("#panel");
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(
    () => $("#toast").classList.remove("visible"),
    4800,
  );
}
function show(title, kicker, html, kind = "catalog") {
  mapController?.abort();
  mapController = undefined;
  paused = true;
  input = {};
  $("#panel-title").textContent = title;
  $("#panel-kicker").textContent = kicker;
  $("#panel-body").innerHTML = html;
  panel.scrollTop = 0;
  panel.dataset.kind = kind;
  if (!panel.open) {
    previousFocus = document.activeElement;
    panel.showModal();
  }
}
function closePanel() {
  mapController?.abort();
  mapController = undefined;
  panel.close();
  paused = false;
  input = {};
  if (started) {
    $("#scene").focus();
    requestAnimationFrame(() => {
      if (!panel.open) $("#scene").focus();
    });
  } else previousFocus?.focus();
}
$("#close-panel").onclick = closePanel;
panel.addEventListener("cancel", (e) => {
  e.preventDefault();
  closePanel();
});
panel.addEventListener("close", () => {
  paused = false;
});
function persist(next, message = "Alterações guardadas neste navegador.") {
  try {
    data = saveData(localStorage, next);
    lastSite = undefined;
    toast(message);
    return true;
  } catch (e) {
    toast(`Não foi possível guardar: ${e.message}`);
    return false;
  }
}
function clone() {
  return structuredClone(data);
}
function placeAtFarmEntrance() {
  const layout=getSiteLayout(state.siteId),obstacles=[...getObstacles(state),...[state.car,...state.parkedCars].flatMap(vehicleFootprint)],bounds=getBounds(state);
  const blocks=[...layout.blocks].sort((a,b)=>(b.z+b.d/2)-(a.z+a.d/2));
  for(const block of blocks)for(const side of[1,-1])for(const across of[0,-.28,.28]) {
    const point=localToWorld(block.w*across,side*(block.d/2+6),{x:block.x,z:block.z,yaw:block.rotation||0});
    if(!blocked(point.x,point.z,.45,obstacles,bounds)) {
      Object.assign(state.player,{...point,yaw:(block.rotation||0)+(side<0?Math.PI:0)});
      return true;
    }
  }
  return false;
}
function goToGreenhouses() {
  if(state.driving){toast("Pára e sai do veículo para ir às estufas a pé.");return;}
  placeAtFarmEntrance();aerialMode=false;input={};world?.resetCamera();
  $("#aerial-toggle").textContent="Vista aérea · B";$("#scene").focus();
}
function visitSite(id) {
  if (!world) return;
  state = travelToSite(state, id);
  placeAtFarmEntrance();
  selected = id;
  aerialMode = false;
  $("#aerial-toggle").textContent = "Vista aérea · B";
  cameraYaw = 0;
  world.resetCamera();
  input = {};
  if (!started) {
    started = true;
    document.body.classList.add("started");
    $("#welcome").hidden = true;
  }
  closePanel();
  lastSite = null;
  toast(`A explorar ${getSiteLayout(id).name}. O parque de veículos é uma zona virtual de treino.`);
}
function toggleAerial() {
  if (!started || panel.open) return;
  aerialMode = !aerialMode;
  input = {};
  $("#aerial-toggle").textContent = aerialMode ? "Voltar à personagem · B" : "Vista aérea · B";
  world?.resetCamera();
}
function openFleet() {
  show("Veículos e equipamentos", "OITO VEÍCULOS · CONDUÇÃO SIMULADA", `<p>Carros e carrinhas para acompanhamento, dois camiões para transporte e dois tratores para a operação agrícola. Seleciona um veículo para te aproximares da cabina; carrega em <kbd>E</kbd> para entrar.</p>${state.driving ? '<p class="notice">Pára e sai do veículo atual com E antes de te aproximares de outro.</p>' : ""}<div class="fleet-grid">${Object.entries(VEHICLE_NAMES).map(([kind,name])=>`<article class="fleet-card" data-fleet-kind="${kind}"><span class="eyebrow">${kind.includes("tractor")?"OPERAÇÃO AGRÍCOLA":kind.includes("truck")?"TRANSPORTE":"APOIO TÉCNICO"}</span><h3>${escape(name)}</h3><p>${kind==="truck"?"Cabina e semirreboque articulado; atenção ao espaço de manobra e à marcha-atrás.":kind.includes("tractor")?"Velocidade reduzida, viragem própria e rodas dianteiras direcionais.":"Aceleração, direção, travagem e marcha-atrás simuladas."}</p><button class="secondary" data-approach="${kind}" ${state.driving?"disabled":""}>Ir até ao veículo →</button></article>`).join("")}</div><p class="muted">Modelos aproximados, sem simulação de cargas, hidráulicos ou operações reais. O parque adicional e a presença dos veículos são fictícios.</p>`, "fleet");
  document.querySelectorAll("[data-approach]").forEach(button => button.onclick = () => {
    const message = approachVehicle(state, button.dataset.approach);
    aerialMode = false;
    $("#aerial-toggle").textContent = "Vista aérea · B";
    cameraYaw = 0;
    world?.resetCamera();
    closePanel();
    toast(message);
  });
}
function findPerson(id) {
  if (state.driving) { toast("Pára e sai do veículo para ir ter com uma personagem."); return; }
  const person = state.characters.find(p => p.id === id);
  if (!person) return;
  const obstacles = [...getObstacles(state),...[state.car,...state.parkedCars].flatMap(vehicleFootprint)], bounds = getBounds(state);
  for (const [dx,dz] of [[-2,0],[2,0],[0,2],[0,-2]]) {
    if (!blocked(person.x+dx,person.z+dz,.38,obstacles,bounds)) {
      Object.assign(state.player,{x:person.x+dx,z:person.z+dz,yaw:Math.atan2(-dx,dz)});
      aerialMode=false;world?.resetCamera();closePanel();toast(`Estás junto de ${person.name}. Carrega em F para conversar.`);return;
    }
  }
  toast("Não foi encontrado espaço livre junto da personagem.");
}
function currentSite() {
  return activeSite(state) || selected;
}
function openCatalog(id = selected) {
  selected = id;
  const total = totals(data);
  show(
    "As nossas explorações",
    "PESSOAS, CULTURAS E TERRITÓRIO",
    `
  <div class="catalog-summary"><div><strong>13<span> + sede</span></strong><small>Locais para visitar em 3D</small></div><div><strong>${fmt(total.declared)} <span>ha</span></strong><small>Área declarada · sem Deusas</small></div><div><strong>${fmt(total.projected)} <span>ha</span></strong><small>Deusas · área projetada</small></div></div>
  <div class="catalog-layout"><aside class="site-list" aria-label="Lista de explorações">${data.exploracoes.map((s) => `<button data-site="${s.id}" class="site-row ${s.id === selected ? "selected" : ""}"><span>${escape(s.nome)}</span><small>${MODELLED.includes(s.id) ? "● Cenário disponível" : s.area_e_projetada ? "Construção em 3D" : "Visitar em 3D"}</small></button>`).join("")}<button data-site="sede" class="site-row ${selected === "sede" ? "selected" : ""}"><span>Frutas Patrícia Pilar</span><small>● Sede em 3D</small></button></aside><section class="site-detail" id="site-detail"></section></div>
  <div class="data-tools"><button id="export-data" class="secondary">↓ Exportar dados</button><label class="secondary file-button">↑ Importar dados<input id="import-data" type="file" accept="application/json,.json"></label><span>Guardado localmente · exporta uma cópia para partilhar</span></div>`,
  );
  document
    .querySelectorAll(".site-row[data-site]")
    .forEach((b) => (b.onclick = () => openCatalog(b.dataset.site)));
  $("#export-data").onclick = exportData;
  $("#import-data").onchange = importData;
  renderDetail();
}
function renderDetail() {
  const root = $("#site-detail");
  if (selected === "sede") {
    root.innerHTML = `<span class="pill">SEDE · CENÁRIO EXTERIOR</span><h3>${escape(data.sede.nome)}</h3><p>Receção, embalamento e expedição. Volumes exteriores aproximados da referência aérea; sem planta interior validada.</p><ul>${data.sede.funcoes.map(f=>`<li>${escape(f)}</li>`).join("")}</ul><div class="detail-actions"><button id="resume-site" class="primary">Visitar em 3D →</button><button id="site-location" class="secondary">Localização e fotografia aérea ↗</button></div><h4>Leitura das referências</h4>${getSiteLayout("sede").notes.map(note=>`<p class="muted">${escape(note)}</p>`).join("")}`;
    $("#resume-site").onclick=()=>visitSite("sede");
    $("#site-location").onclick=()=>openGeographicSite("sede");
    return;
  }
  const s = data.exploracoes.find((s) => s.id === selected),
    team = teamFor(data, s.id);
  root.innerHTML = `<span class="pill">${MODELLED.includes(s.id) ? "CENÁRIO APROXIMADO DISPONÍVEL" : "SÓ REGISTO · SEM CENÁRIO"}</span><h3>${escape(s.nome)}</h3><div class="detail-metrics"><div><strong>${fmt(s.area_ha)} ha</strong><small>${s.area_e_projetada ? "Área projetada" : "Área declarada"}</small></div><div><strong>${escape(s.culturas_atuais.join(" · ") || "Por confirmar")}</strong><small>Culturas declaradas na recolha</small></div></div>
  ${s.area_e_projetada ? `<p class="notice">Em construção: ${fmt(s.area_quase_concluida_ha)} ha quase concluídos; ${s.niveis_terreno} patamares. A área projetada não representa área em produção.</p>` : ""}
  ${s.id === "demonstracao" ? '<p class="notice">Referências fotográficas recebidas: entrada branca, vedação verde, painéis de marca e bancada de exposição em madeira. O ponto geográfico foi obtido do link fornecido; a entrada, vedação e bancadas estão representadas no cenário exterior.</p>' : ""}
  <h4>Equipa e apoios</h4><div class="team">${team.map((p) => `<div><span class="person-avatar">${escape(p.name[0])}</span><span><strong>${escape(p.name)}</strong><small>${escape(p.role)}${p.personId.includes("identidade_por_confirmar") ? " · identidade por confirmar" : ""}</small></span></div>`).join("") || '<p class="muted">Responsáveis por confirmar.</p>'}</div>
  ${s.id === "tomates_oeste" ? '<p class="muted">Cristina: supervisão. Emanuel Franco: apoio agronómico.</p>' : ""}
  ${s.observacoes ? `<p class="muted">${escape(s.observacoes)}</p>` : ""}
  <p class="muted">Localização disponível no mapa regional; limites e implantação 3D por validar. ${s.id === "demonstracao" ? "Cerca de 200 variedades; distância de 700 m declarada no pacote original." : ""}</p>
  <div class="detail-actions"><button id="edit-site" class="primary">Editar informação</button><button id="site-location" class="secondary">Localização e fotografia aérea ↗</button>${MODELLED.includes(s.id) ? '<button id="resume-site" class="primary">Visitar em 3D →</button>' : ""}</div>
  <details class="layout-notes"><summary>O que foi aproximado a partir das fotografias</summary>${getSiteLayout(s.id).notes.map(note=>`<p>${escape(note)}</p>`).join("")}</details>
  <h4>Períodos de cultivo</h4><p class="muted">Histórico local, separado das culturas declaradas na recolha. Datas e setores são introduzidos por ti.</p><div class="periods">${s.periodos.map((p) => `<div><strong>${escape(p.cultura)}</strong><span>${escape(p.inicio)} → ${escape(p.fim || "Em curso")} · ${escape(p.setor || "Toda a exploração")}</span></div>`).join("") || '<p class="muted">Sem períodos registados.</p>'}</div>
  <details class="departments"><summary>Equipas transversais · abrangência por confirmar</summary><p>Controlo biológico: Mariana, Lilia. Solaene: Diana. Agropilar: Judite. RH: Andreia. Coordenação: Dulce. Manutenção: Edinaldo. Rega e bombagem: Camacho (carrinha Agropilar).</p><p>${escape(data.equipas_transversais.abrangencia_departamentos)}</p></details>`;
  $("#edit-site").onclick = () => editSite(s.id);
  $("#site-location").onclick = () => openGeographicSite(s.id);
  if ($("#resume-site")) $("#resume-site").onclick = () => visitSite(s.id);
}
function editSite(id) {
  const s = data.exploracoes.find((x) => x.id === id);
  show(
    "Editar exploração",
    s.nome,
    `<form id="site-form" class="edit-form"><div class="form-grid"><label>Nome<input name="nome" value="${escape(s.nome)}" required maxlength="200"></label><label>${s.area_e_projetada ? "Área projetada" : "Área declarada"} (ha)<input name="area" type="number" min="${s.area_e_projetada ? s.area_quase_concluida_ha : 0}" max="100000" step="0.01" value="${s.area_ha}" required></label></div><label>Culturas declaradas (separadas por vírgulas)<input name="culturas" maxlength="500" value="${escape(s.culturas_atuais.join(", "))}"></label><h4>Pessoas associadas</h4><p class="muted">A mesma pessoa pode ter funções em várias explorações. Os dois David permanecem separados.</p><div id="assignments">${data.assignments.map((a, i) => (a.siteId === id ? `<div class="assignment"><span>${escape(data.people.find((p) => p.id === a.personId)?.name)} · ${escape(a.role)}</span><button type="button" data-remove="${i}" aria-label="Remover associação">×</button></div>` : "")).join("")}</div><div class="form-grid"><label>Associar pessoa existente<select name="pessoa"><option value="">Não adicionar</option>${data.people.map((p) => `<option value="${escape(p.id)}">${escape(p.name)}${p.id.includes("identidade_por_confirmar") ? " (manutenção, por confirmar)" : ""}</option>`).join("")}</select></label><label>Ou nova pessoa<input name="novaPessoa" maxlength="100" placeholder="Nome confirmado por ti"></label><label>Função da associação<input name="funcao" maxlength="100" placeholder="Ex.: Apoio técnico"></label></div>${s.periodos.length ? `<h4>Histórico de culturas · editar ou encerrar períodos</h4>${s.periodos.map((p, i) => `<fieldset class="period-edit"><legend>Período ${i + 1}</legend><div class="form-grid"><label>Cultura<input name="pc_${i}" value="${escape(p.cultura)}" required maxlength="100"></label><label>Setor<input name="ps_${i}" value="${escape(p.setor || "")}" maxlength="100"></label><label>Início<input name="pi_${i}" type="date" value="${escape(p.inicio)}" required></label><label>Fim (opcional)<input name="pf_${i}" type="date" value="${escape(p.fim || "")}"></label></div></fieldset>`).join("")}` : ""}<h4>Acrescentar período de cultivo</h4><div class="form-grid"><label>Cultura<input name="culturaPeriodo" maxlength="100" placeholder="Deixa vazio para não adicionar"></label><label>Setor (opcional)<input name="setor" maxlength="100"></label><label>Início<input name="inicio" type="date"></label><label>Fim (opcional)<input name="fim" type="date"></label></div><p id="form-error" class="form-error" role="alert"></p><div class="detail-actions"><button type="submit" class="primary">Guardar alterações</button><button type="button" id="cancel-edit" class="secondary">Cancelar</button></div><p class="muted">As alterações ficam neste navegador. Exporta os dados para os conservar noutro dispositivo.</p></form>`,
  );
  const removed = new Set();
  document.querySelectorAll("[data-remove]").forEach(
    (b) =>
      (b.onclick = () => {
        removed.add(Number(b.dataset.remove));
        b.closest(".assignment").remove();
      }),
  );
  $("#cancel-edit").onclick = () => openCatalog(id);
  $("#site-form").onsubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.target),
      next = clone(),
      target = next.exploracoes.find((x) => x.id === id);
    const value = (name) => String(form.get(name) || "").trim();
    target.nome = value("nome");
    target.area_ha = Number(value("area"));
    target.culturas_atuais = value("culturas")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    next.assignments = next.assignments.filter((_, i) => !removed.has(i));
    let person = value("pessoa");
    if (value("novaPessoa")) {
      const matching = next.people.filter(
        (p) => identityName(p.name) === identityName(value("novaPessoa")),
      );
      if (person) {
        $("#form-error").textContent =
          "Escolhe uma pessoa existente ou indica uma nova pessoa, sem preencher os dois campos.";
        return;
      }
      if (matching.length > 1) {
        $("#form-error").textContent =
          "Há identidades por confirmar com esse nome. Seleciona o registo existente adequado.";
        return;
      }
      if (matching.length === 1) person = matching[0].id;
      else {
        person = crypto.randomUUID();
        next.people.push({ id: person, name: value("novaPessoa") });
      }
    }
    if (person) {
      if (!value("funcao")) {
        $("#form-error").textContent = "Indica a função da pessoa associada.";
        return;
      }
      next.assignments.push({
        personId: person,
        siteId: id,
        role: value("funcao"),
      });
    }
    target.periodos = target.periodos.map((p, i) => ({
      cultura: value(`pc_${i}`),
      inicio: value(`pi_${i}`),
      fim: value(`pf_${i}`) || null,
      setor: value(`ps_${i}`) || null,
    }));
    if (value("culturaPeriodo"))
      target.periodos.push({
        cultura: value("culturaPeriodo"),
        inicio: value("inicio"),
        fim: value("fim") || null,
        setor: value("setor") || null,
      });
    try {
      validateData(next);
    } catch (err) {
      $("#form-error").textContent = err.message;
      return;
    }
    if (persist(next)) openCatalog(id);
  };
}
function openTeam() {
  dayProgress.team = true;
  const featured = [...CHARACTERS.map((c) => c.id), PLAYER_PERSON_ID, "cesar"];
  const ordered = [
    ...featured
      .map((id) => data.people.find((p) => p.id === id))
      .filter(Boolean),
    ...data.people.filter((p) => !featured.includes(p.id)),
  ];
  show(
    "Pessoas e equipas",
    "UMA PESSOA · VÁRIAS EXPLORAÇÕES",
    `<p class="notice">Uma única personagem por pessoa. As explorações e funções são associações ao mesmo registo. Emanuel Franco é a personagem que controlas. Nuno, Hernani, Miguel e Rafael estão representados no cenário em posições de demonstração; isso não indica presença real.</p><div class="people-grid">${ordered
      .map((p) => {
        const c = CHARACTERS.find((c) => c.id === p.id),
          roles = [
            ...new Set(
              data.assignments
                .filter((a) => a.personId === p.id)
                .map((a) => a.role),
            ),
          ];
        return `<button class="person-card" data-person="${escape(p.id)}"><span class="person-avatar">${escape(p.name[0])}</span><strong>${escape(p.name)}</strong><small>${escape(c?.role || roles.join(" · ") || "Funções por confirmar")}</small><span class="person-kind">${p.id === PLAYER_PERSON_ID ? "A tua personagem" : c ? "Personagem no cenário" : "Registo de equipa"}</span></button>`;
      })
      .join(
        "",
      )}</div><p class="muted">Os dois registos David mantêm-se separados enquanto a identidade não estiver confirmada. Consultar várias explorações não cria personagens adicionais.</p>`,
    "team",
  );
  document
    .querySelectorAll("[data-person]")
    .forEach((b) => (b.onclick = () => openPerson(b.dataset.person)));
}
function openPerson(id) {
  const person = data.people.find((p) => p.id === id);
  if (!person) return;
  const character = CHARACTERS.find((c) => c.id === id);
  const sites = data.exploracoes
    .map((s) => ({
      site: s,
      roles: teamFor(data, s.id)
        .filter((p) => p.personId === id)
        .map((p) => p.role),
    }))
    .filter((s) => s.roles.length);
  const supports = data.supportRelations.filter((r) => r.personId === id);
  const description =
    person.description ||
    character?.description ||
    (id === "cesar"
      ? "Técnico responsável da Framboesa Encantada 2, com apoio à Lagoa Bondosa, Várzea Vibrante e Fenómeno Galopante."
      : id === PLAYER_PERSON_ID
        ? "Emanuel Franco acompanha as explorações indicadas abaixo. Uma única personagem, partilhada por todas as associações."
        : "As funções abaixo estão associadas a esta pessoa.");
  show(
    person.name,
    id === PLAYER_PERSON_ID
      ? "A TUA PERSONAGEM · IDENTIDADE ÚNICA"
      : "PESSOA · IDENTIDADE ÚNICA",
    `<p>${escape(description)}</p>${id === "nuno" ? '<p class="notice">Chefia geral de todas as explorações e das pessoas/equipas referidas.</p>' : ""}<h4>Explorações associadas</h4><div class="person-sites">${sites.map(({ site, roles }) => `<button class="site-row" data-person-site="${site.id}"><span>${escape(site.nome)}</span><small>${escape(roles.join(" · "))}</small></button>`).join("") || '<p class="muted">Apoio transversal ou distribuição por exploração ainda por especificar.</p>'}</div>${supports.length ? `<h4>Outros apoios e locais referidos</h4>${supports.map((r) => `<p class="notice"><strong>${escape(r.location)}</strong><br>${escape(r.description)}<br><small>${r.groupMembership === "externo" ? "Produtores externos ao grupo" : "Enquadramento/lista de explorações por confirmar"}</small></p>`).join("")}` : ""}<div class="detail-actions"><button id="talk-person" class="primary">Conversas simuladas</button><button id="back-team" class="secondary">Ver equipa</button>${state.characters.some(p=>p.id===id)?'<button id="find-person" class="secondary">Ir ter com a personagem →</button>':""}<button id="back-game" class="secondary">Retomar exploração</button></div><p class="muted">Avatares genéricos, sem semelhança física real. As posições no cenário são ilustrativas.</p>`,
    "person",
  );
  document
    .querySelectorAll("[data-person-site]")
    .forEach((b) => (b.onclick = () => openCatalog(b.dataset.personSite)));
  if ($("#find-person")) $("#find-person").onclick=()=>findPerson(id);
  $("#talk-person").onclick = () => openConversations(id);
  $("#back-team").onclick = openTeam;
  $("#back-game").onclick = closePanel;
}
function openConversations(personId = null) {
  const scenarios = availableConversations(data, { personId });
  show(
    "Conversas de campo",
    "SIMULAÇÃO · SITUAÇÕES HIPOTÉTICAS",
    `<p class="notice">Exemplos fictícios baseados nas funções indicadas. Não são conversas reais, diagnósticos ou ordens de trabalho. Escolhe uma situação e uma abordagem para acompanhar a interação entre as pessoas.</p>${personId ? `<p>Conversas com <strong>${escape(data.people.find((p) => p.id === personId)?.name || "esta pessoa")}</strong>. <button id="all-conversations" class="text-button dark">Ver todas</button></p>` : ""}<div class="conversation-grid">${scenarios.map((c) => `<button class="conversation-card" data-conversation="${c.id}"><span class="eyebrow">${escape(c.topic)}</span><h3>${escape(c.title)}</h3><p>${c.participants.map((id) => escape(data.people.find((p) => p.id === id)?.name || id)).join(" · ")}</p><span>Iniciar conversa →</span></button>`).join("") || "<p>Ainda não há uma conversa escrita para esta pessoa.</p>"}</div><p class="muted">Cada pessoa mantém o mesmo registo e personagem ao participar em vários cenários. Não há chamadas a serviços de IA ou à API Google.</p>`,
    "conversations",
  );
  document
    .querySelectorAll("[data-conversation]")
    .forEach(
      (b) => (b.onclick = () => openConversation(b.dataset.conversation)),
    );
  if ($("#all-conversations"))
    $("#all-conversations").onclick = () => openConversations();
}
function openConversation(id, choice = null) {
  const scenario = availableConversations(data).find((c) => c.id === id);
  if (!scenario) return;
  const turns = conversationTurns(scenario, choice);
  show(
    scenario.title,
    "CONVERSA SIMULADA · " + scenario.topic.toLocaleUpperCase("pt-PT"),
    `<span class="pill">EXEMPLO HIPOTÉTICO</span><div class="conversation-transcript">${turns.map((t) => `<article class="speech" data-speaker="${t.personId}"><span class="person-avatar">${escape(data.people.find((p) => p.id === t.personId)?.name[0] || "?")}</span><div><strong>${escape(data.people.find((p) => p.id === t.personId)?.name || t.personId)}</strong><p>${escape(t.text)}</p></div></article>`).join("")}</div>${choice === null ? `<h4>Como queres conduzir esta conversa?</h4><div class="dialogue-choices">${scenario.choices.map((c, i) => `<button class="secondary" data-dialogue-choice="${i}">${escape(c.label)} →</button>`).join("")}</div>` : `<p class="notice" id="conversation-outcome"><strong>Próximo passo proposto na simulação</strong><br>${escape(scenario.choices[choice].outcome)}<br><small>Nenhuma tarefa real foi criada e os dados das explorações não foram alterados.</small></p>`}<div class="detail-actions"><button class="primary" id="other-conversations">Outras conversas</button><button class="secondary" id="restart-conversation">Reiniciar conversa</button><button class="secondary" id="export-conversation">Exportar exemplo</button></div>`,
    "conversation",
  );
  document.querySelectorAll("[data-dialogue-choice]").forEach(
    (b) =>
      (b.onclick = () => {
        dayProgress.conversation = true;
        openConversation(id, Number(b.dataset.dialogueChoice));
      }),
  );
  $("#other-conversations").onclick = () => openConversations();
  $("#restart-conversation").onclick = () => openConversation(id);
  $("#export-conversation").onclick = () => {
    const text = [
      "CONVERSA SIMULADA · EXEMPLO HIPOTÉTICO",
      scenario.title,
      "",
      ...turns.map(
        (t) =>
          `${data.people.find((p) => p.id === t.personId)?.name || t.personId}: ${t.text}`,
      ),
      ...(choice === null
        ? []
        : ["", "Próximo passo proposto: " + scenario.choices[choice].outcome]),
      "",
      "Ficção para demonstração. Não é registo de conversa ou tarefa real.",
    ].join("\n\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversa-simulada-${id}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
}
function openDay() {
  const goals = [
    ["Conhecer as pessoas e as suas funções", dayProgress.team],
    ["Explorar uma conversa técnica simulada", dayProgress.conversation],
    ["Conduzir um dos veículos", dayProgress.vehicle],
    [
      "Visitar duas explorações diferentes",
      [...dayProgress.sites].filter(id=>FARM_IDS.includes(id)).length >= 2,
    ],
  ];
  show(
    "Um dia de campo",
    "EXPLORAR · CONVERSAR · ACOMPANHAR",
    `<p>Conhece as equipas, experimenta uma conversa de trabalho e percorre as duas explorações disponíveis. São objetivos desta sessão de demonstração.</p><div class="day-goals">${goals.map(([label, done]) => `<div class="day-goal ${done ? "done" : ""}"><span>${done ? "✓" : "○"}</span>${label}</div>`).join("")}</div><div class="detail-actions"><button id="day-team" class="secondary">Conhecer equipa</button><button id="day-talk" class="primary">Conversas técnicas</button><button id="day-resume" class="secondary">Retomar percurso</button></div><p class="muted">Não regista visitas, presenças ou tarefas reais. O progresso desta sessão não altera os dados das explorações.</p>`,
    "day",
  );
  $("#day-team").onclick = openTeam;
  $("#day-talk").onclick = () => openConversations();
  $("#day-resume").onclick = closePanel;
}
function exportData() {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "patricia-pilar-dados.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Cópia exportada com pessoas, áreas e histórico.");
}
async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000)
      throw Error("O ficheiro excede o limite de 2 MB.");
    const next = validateData(JSON.parse(await file.text()));
    show(
      "Importar cópia de dados",
      "CONFIRMAR SUBSTITUIÇÃO LOCAL",
      `<p>A cópia é válida: 13 explorações, sede e ${next.people.length} pessoas. A importação substitui as edições locais. Exporta primeiro se quiseres conservar a versão atual.</p><div class="detail-actions"><button id="confirm-import" class="primary">Substituir dados locais</button><button id="cancel-import" class="secondary">Cancelar</button><button id="backup-data" class="secondary">Exportar versão atual</button></div>`,
    );
    $("#backup-data").onclick = exportData;
    $("#cancel-import").onclick = () => openCatalog();
    $("#confirm-import").onclick = () => {
      if (persist(next, "Cópia importada e guardada.")) openCatalog();
    };
  } catch (err) {
    toast(`Importação recusada: ${err.message}`);
  }
}
function openMap() {
  const layout=getSiteLayout(state.siteId);
  show(layout.name, "PLANTA LOCAL · DIMENSÕES ESTIMADAS", `<button id="regional-map-open" class="primary">Mapa geográfico · 14 locais ↗</button><canvas id="large-map" width="850" height="630" aria-label="Planta aproximada da exploração atual"></canvas><div class="map-legend"><span>▲ A tua posição</span><span>□ Veículos</span><span>Verde · Estufas</span><span>Azul · Reservatórios</span></div><p class="notice">Planta interpretada da fotografia fornecida. Escala e orientação estimadas, sem levantamento dos limites. O parque a sul é um anexo virtual para experimentar os oito veículos.</p><button id="geographic-settings" class="secondary">Localizações e mapa Google 3D</button><details><summary>Referência e implantação</summary>${layout.notes.map(note=>`<p>${escape(note)}</p>`).join("")}<p id="map-status">${escape(mapReadiness().reason)}</p></details>`, "map");
  drawMap($("#large-map"),state,true);
  $("#regional-map-open").onclick=openGeography;
  $("#geographic-settings").onclick=openGeography;
}
const googleConfig = {
  enabled: import.meta.env.VITE_ENABLE_GOOGLE_MAPS === "true",
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY || "",
};
function openGeography() {
  const locations = confirmedLocations(data),
    requirements = googleRequirements({ ...googleConfig, locations });
  show(
    "Localizações geográficas",
    "COORDENADAS REAIS · MODO GOOGLE OPCIONAL",
    `<p class="notice">${locations.length} de 14 locais com coordenadas confirmadas. Pontos extraídos dos links Maps que forneceste. Norte em cima; posições e distâncias proporcionais, numa projeção métrica regional. Os pontos não definem os limites nem as dimensões das estufas. O cenário jogável continua a ser uma demonstração aproximada.</p><button id="local-map-open" class="secondary">Percurso jogável · mapa local</button><div id="regional-map-host"></div><p class="muted">Arrasta para deslocar · roda para aproximar · clica num ponto para consultar a fotografia aérea e o link original. “Todos os locais” inclui a Lagoa Bondosa.</p><div class="geo-list">${[...data.exploracoes, { ...data.sede, id: "sede" }].map((s) => `<button class="site-row" data-geo-site="${s.id}"><span>${escape(s.nome)}</span><small>${s.coordenadas?.confirmed ? `${s.coordenadas.lat}, ${s.coordenadas.lng} · Confirmado` : s.coordenadas ? "Coordenadas registadas · por confirmar" : "Sem coordenadas"}</small></button>`).join("")}</div><h4>Google Maps 3D</h4><p id="google-requirements">${requirements.ready ? "Configuração presente. Cobertura e ligação ainda precisam de validação." : `Ainda falta: ${escape(requirements.missing.join("; "))}.`}</p><button id="open-google" class="primary" ${requirements.ready ? "" : "disabled"}>Abrir Google 3D · utiliza a API</button><p class="muted">Só carrega o fornecedor depois de configurares a chave, ativares explicitamente o modo e carregares no botão. Pode consumir quota e gerar custos no projeto Google. Os créditos e controlos do Google permanecem no mapa.</p>${
      locations.length > 1
        ? `<h4>Distâncias geográficas aproximadas</h4><p class="muted">Em linha geodésica sobre um modelo esférico da Terra; não são percursos por estrada ou medidas cadastrais.</p>${locations
            .slice(1)
            .map(
              (p) =>
                `<p>${escape(locations[0].name)} → ${escape(p.name)}: ${fmt(distanceMetres(locations[0], p))} m</p>`,
            )
            .join("")}`
        : ""
    }<details><summary>Como obter acesso à API</summary><ol><li>Entrar na Google Cloud Console e criar um projeto.</li><li>Rever os preços atuais e associar faturação apenas se quiseres avançar.</li><li>Ativar a Maps JavaScript API e confirmar o acesso à biblioteca maps3d.</li><li>Criar uma chave de navegador com restrições de websites e da API utilizada.</li><li>Configurar VITE_GOOGLE_MAPS_BROWSER_KEY e, após aceitar os custos, VITE_ENABLE_GOOGLE_MAPS=true. Reiniciar o Vite/recompilar.</li></ol><p>Não envies a chave no chat. É uma chave de navegador, visível no cliente: as restrições são essenciais. O mapa Google é um visualizador geográfico; a personagem e a condução atuais continuam no percurso local.</p></details>`,
    "geo",
  );
  $("#local-map-open").onclick = openMap;
  mountRegionalMap($("#regional-map-host"), data, openGeographicSite);
  document
    .querySelectorAll("[data-geo-site]")
    .forEach((b) => (b.onclick = () => openGeographicSite(b.dataset.geoSite)));
  $("#open-google").onclick = showGoogleMap;
}
function openGeographicSite(id) {
  const site = id === "sede" ? data.sede : data.exploracoes.find(s => s.id === id);
  const image = referenceImage(site);
  show(site.nome, "LOCALIZAÇÃO · REFERÊNCIA FORNECIDA", `<p>${site.coordenadas ? `${site.coordenadas.lat}, ${site.coordenadas.lng}` : "Sem coordenadas"}</p>${site.maps_url ? `<a class="primary map-source-link" href="${escape(site.maps_url)}" target="_blank" rel="noopener noreferrer">Abrir o ponto no Google Maps ↗</a>` : ""}${image ? `<figure class="aerial-reference"><img src="${image}" alt="Referência aérea fornecida de ${escape(site.nome)}"><figcaption>Imagem original fornecida · mantém as anotações e a atribuição da fonte. Não foi usada como textura do terreno.</figcaption></figure>` : ""}<p class="notice">A localização do ponto vem do link fornecido. Os limites desenhados na imagem são uma referência visual; não constituem um levantamento georreferenciado.</p><div class="detail-actions"><button id="visit-geographic" class="primary">Visitar em 3D →</button><button id="back-regional" class="secondary">← Voltar ao mapa</button><button id="edit-point" class="secondary">Editar coordenadas</button></div>`, "geo-site");
  $("#visit-geographic").onclick = () => visitSite(id);
  $("#back-regional").onclick = openGeography;
  $("#edit-point").onclick = () => editCoordinates(id);
}
function editCoordinates(id) {
  const site =
      id === "sede" ? data.sede : data.exploracoes.find((s) => s.id === id),
    coords = site.coordenadas;
  show(
    "Registar coordenadas",
    site.nome,
    `<form id="coordinates-form" class="edit-form"><p class="notice">Introduz latitude e longitude do ponto correto no mapa. Confirmar o ponto não confirma os limites da propriedade, os acessos ou as dimensões das estufas.</p>${site.maps_url ? `<p>Ligação fornecida: <a class="map-source-link" href="${escape(site.maps_url)}" target="_blank" rel="noopener noreferrer">Abrir no Google Maps ↗</a></p>` : "<p>Não foi fornecido um link próprio para este local.</p>"}<div class="form-grid"><label>Latitude (graus decimais)<input name="lat" type="number" min="-90" max="90" step="any" required value="${coords?.lat ?? ""}"></label><label>Longitude (graus decimais)<input name="lng" type="number" min="-180" max="180" step="any" required value="${coords?.lng ?? ""}"></label></div><label class="check-label"><input type="checkbox" name="confirmed" ${coords?.confirmed ? "checked" : ""}> Confirmei que este ponto corresponde ao local.</label><p class="muted">A app não deduz coordenadas pelas imagens. Não introduzimos altitudes ou polígonos sem dados validados.</p><p id="coordinate-error" class="form-error" role="alert"></p><div class="detail-actions"><button class="primary" type="submit">Guardar coordenadas</button><button class="secondary" type="button" id="cancel-coordinates">Cancelar</button></div></form>`,
    "geo-edit",
  );
  $("#cancel-coordinates").onclick = openGeography;
  $("#coordinates-form").onsubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.target),
      next = clone(),
      target =
        id === "sede" ? next.sede : next.exploracoes.find((s) => s.id === id);
    target.coordenadas = {
      lat: Number(form.get("lat")),
      lng: Number(form.get("lng")),
      confirmed: form.get("confirmed") === "on",
    };
    if (
      persist(
        next,
        "Coordenadas guardadas. O cenário local mantém a sua geometria aproximada.",
      )
    )
      openGeography();
  };
}
async function showGoogleMap() {
  const locations = confirmedLocations(data);
  show(
    "Google Maps 3D",
    "VISUALIZAÇÃO GEOGRÁFICA · ESCALA DO FORNECEDOR",
    `<div id="google-map-host"><p>A carregar o fornecedor…</p></div><p id="google-error" role="alert"></p><p class="muted">Mapa georreferenciado, sem compressão do percurso local. A precisão depende dos dados e da cobertura do Google, não é um levantamento topográfico. Este visualizador ainda não contém os controlos de andar/conduzir.</p><button id="back-local-map" class="secondary">Voltar ao mapa local</button>`,
    "google",
  );
  $("#back-local-map").onclick = openMap;
  mapController = new AbortController();
  const signal = mapController.signal;
  const fail = (message) => {
    if (signal.aborted) return;
    $("#google-error").textContent = message;
    $("#google-map-host").replaceChildren();
  };
  try {
    await openGoogle3D($("#google-map-host"), {
      ...googleConfig,
      locations,
      signal,
      onSelect: (id) => openCatalog(id),
      onError: fail,
    });
  } catch (e) {
    fail(`${e.message} A demonstração local continua disponível.`);
  }
}
function help(pause = false) {
  show(
    pause ? "Exploração em pausa" : "Como explorar",
    "TECLADO E RATO",
    `<div class="help-grid"><div><kbd>W A S D</kbd><span>Andar · conduzir (W acelera, S trava/recua)</span></div><div><kbd>Shift</kbd><span>Correr a pé</span></div><div><kbd>Rato</kbd><span>Arrastar: rodar câmara · roda: aproximar</span></div><div><kbd>E</kbd><span>Entrar / sair do carro perto dele; pára para sair</span></div><div><kbd>Espaço</kbd><span>Travão do veículo</span></div><div><kbd>F / T / C</kbd><span>Consultar personagem / equipa / conversas</span></div><div><kbd>B / V</kbd><span>Vista aérea / veículos e equipamentos</span></div><div><kbd>M / I</kbd><span>Mapa / informação da exploração</span></div><div><kbd>R</kbd><span>Reiniciar a posição nesta exploração</span></div><div><kbd>Esc</kbd><span>Pausar / retomar</span></div></div><div class="settings"><label>Qualidade gráfica<select id="quality"><option value="low">Baixa · sem sombras</option><option value="medium" selected>Média</option><option value="high">Alta</option></select></label><p>O contador apresenta o desempenho real deste navegador. As imagens do pacote são referências de intenção, não o resultado deste protótipo.</p></div><p class="notice">Oito veículos conduzíveis: carro técnico, três carrinhas, camião articulado, camião de distribuição, trator agrícola e trator compacto. Modelos aproximados a partir das referências; movimentos simulados. Pessoas sem semelhança real. Cenário exterior com estufas fechadas e colisões básicas. Culturas em 3D dentro de estufas translúcidas, sem atribuição de setores reais. Os 14 pontos geográficos provêm dos links fornecidos; a implantação do cenário jogável continua aproximada.</p><button id="resume" class="primary">${started ? "Retomar exploração" : "Fechar instruções"} →</button>`,
    "help",
  );
  $("#quality").value = quality;
  $("#quality").onchange = (e) => {
    quality = e.target.value;
    world?.quality(quality);
  };
  $("#resume").onclick = closePanel;
}
let quality = world?.recommendedQuality || "low";
world?.quality(quality);
if ($("#start"))
  $("#start").onclick = () => {
    if (!world) return;
    placeAtFarmEntrance();
    world.resetCamera();
    started = true;
    document.body.classList.add("started");
    $("#welcome").hidden = true;
    $("#scene").focus();
    if (warning) toast(warning);
    else toast("Bem-vindo. Usa Explorações para viajar e Veículos para experimentar camiões e tratores. E entra no veículo próximo.");
  };
$("#open-catalog").onclick = () => openCatalog();
$("#open-fleet").onclick = openFleet;
$("#change-site").onclick = () => openCatalog();
$("#aerial-toggle").onclick = toggleAerial;
$("#go-to-greenhouses").onclick = goToGreenhouses;
$("#open-team").onclick = () => openTeam();
$("#open-talk").onclick = () => openConversations();
$("#open-day").onclick = openDay;
$("#open-map").onclick = openGeography;
$("#expand-map").onclick = openMap;
$("#help").onclick = () => help();
$("#pause").onclick = () => help(true);
$("#site-info").onclick = () => openCatalog(currentSite());
$("#explore").onclick = () => {
  if (panel.open) closePanel();
  if (started) $("#scene").focus();
};
$(".brand").onclick = (e) => {
  e.preventDefault();
  if (panel.open) closePanel();
};
function reset() {
  const previousLocations=state.locations;
  state = createState(state.siteId);
  state.locations=previousLocations;
  aerialMode=false;
  $("#aerial-toggle").textContent="Vista aérea · B";
  cameraYaw = 0;
  world?.resetCamera();
  input = {};
  toast("Personagem e veículo reiniciados numa zona livre.");
}
function editing(e) {
  return (
    e.target instanceof HTMLElement &&
    (e.target.matches("input,textarea,select") || e.target.isContentEditable)
  );
}
addEventListener("keydown", (e) => {
  if (editing(e) || panel.open || !started) return;
  const k = e.key.toLowerCase();
  if (
    [
      "w",
      "a",
      "s",
      "d",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
      " ",
      "shift",
      "e",
      "f",
      "t",
      "c",
      "m",
      "i",
      "r",
      "escape",
      "b",
      "v",
    ].includes(k)
  )
    e.preventDefault();
  if (e.repeat && ["e", "f", "t", "c", "m", "i", "r", "b", "v", "escape"].includes(k))
    return;
  if (k === "b") toggleAerial();
  if (k === "v") openFleet();
  if (k === "e" && !aerialMode) toast(toggleVehicle(state));
  if (k === "f") {
    const c = nearbyCharacter(state);
    if (c) openPerson(c.id);
    else toast("Aproxima-te de uma personagem ou abre Equipa.");
  }
  if (k === "t") openTeam();
  if (k === "c") openConversations();
  if (k === "m") openMap();
  if (k === "i") openCatalog(currentSite());
  if (k === "r") reset();
  if (k === "escape") help(true);
  const action = {
    w: "forward",
    arrowup: "forward",
    s: "backward",
    arrowdown: "backward",
    a: "left",
    arrowleft: "left",
    d: "right",
    arrowright: "right",
    shift: "run",
    " ": "brake",
  }[k];
  if (action && !aerialMode) input[action] = true;
});
addEventListener("keyup", (e) => {
  const action = {
    w: "forward",
    arrowup: "forward",
    s: "backward",
    arrowdown: "backward",
    a: "left",
    arrowleft: "left",
    d: "right",
    arrowright: "right",
    shift: "run",
    " ": "brake",
  }[e.key.toLowerCase()];
  if (action) input[action] = false;
});
addEventListener("blur", () => {
  input = {};
  if (started && !panel.open) help(true);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    input = {};
    if (started && !panel.open) help(true);
  }
});
let previous = performance.now(),
  elapsed = 0,
  frames = 0,
  mapElapsed = 0,
  frameMs = [],
  accumulator = 0;
function animate(now) {
  const raw = (now - previous) / 1000,
    dt = Math.min(raw, 0.05);
  previous = now;
  let movement = 0;
  if (started && !paused && !aerialMode) {
    accumulator += Math.min(raw, 0.5);
    while (accumulator >= 1 / 60) {
      movement += step(state, input, 1 / 60, cameraYaw);
      accumulator -= 1 / 60;
    }
  } else accumulator = 0;
  if (world && !paused) cameraYaw = world.render(state, dt, movement, !started || aerialMode);
  if (!paused) {
    elapsed += raw;
    frames++;
    frameMs.push(raw * 1000);
    if (frameMs.length > 120) frameMs.shift();
  }
  mapElapsed += raw;
  if (mapElapsed > 0.1) {
    drawMap($("#minimap"), state);
    mapElapsed = 0;
  }
  const site = activeSite(state);
  if (started && site) dayProgress.sites.add(site);
  if (state.driving) dayProgress.vehicle = true;
  const completed = [
    dayProgress.team,
    dayProgress.conversation,
    dayProgress.vehicle,
    [...dayProgress.sites].filter(id=>FARM_IDS.includes(id)).length >= 2,
  ].filter(Boolean).length;
  $("#day-count").textContent = `${completed}/4`;
  if (site !== lastSite) {
    lastSite = site;
    const s = site === "sede" ? data.sede : data.exploracoes.find((s) => s.id === site);
    $("#location-name").textContent = s?.nome || "Caminhos da exploração";
    $("#location-detail").textContent = s
      ? site === "sede" ? "Receção · embalamento · expedição" : `${fmt(s.area_ha)} ha · ${s.culturas_atuais.join(" e ")}`
      : "Tomates do Oeste & Framboesa Encantada 2";
  }
  const nearest = nearestVehicle(state);
  const near = nearest && nearest.distance <= VEHICLE_SPECS[nearest.vehicle.kind].entryDistance;
  const character = nearbyCharacter(state);
  $("#interaction").hidden =
    !started || (!state.driving && !near && !character);
  $("#interaction kbd").textContent = character ? "F" : "E";
  $("#interaction span").textContent = state.driving
    ? Math.abs(state.car.speed) > 0.7
      ? "Pára para sair do veículo"
      : "Sair do veículo"
    : character
      ? `Consultar ${character.name}`
      : near ? `Entrar · ${VEHICLE_NAMES[nearest.vehicle.kind]}` : "Entrar no veículo";
  $("#mode").textContent = state.driving
    ? VEHICLE_NAMES[state.car.kind]
    : "A pé · Emanuel Franco";
  $("#speed").textContent = state.driving
    ? `${Math.round(Math.abs(state.car.speed) * 3.6)} km/h · simulação`
    : movement
      ? "A explorar"
      : "Pronto a explorar";
  const p = state.driving ? state.car : state.player;
  Object.assign($("#hud").dataset, {
    avatarPerson: PLAYER_PERSON_ID,
    personEntities: JSON.stringify(world?.entityPersonIds || []),
    x: p.x.toFixed(2),
    z: p.z.toFixed(2),
    driving: String(state.driving),
    vehicle: state.car.kind,
    paused: String(paused),
    cameraYaw: cameraYaw.toFixed(3),
    site: site || "caminhos",
    sceneSite: state.siteId,
    speed: state.car.speed.toFixed(3),
    trailerYaw: String(state.car.trailerYaw ?? state.car.yaw),
    vehicleYaw: String(state.car.yaw),
    vehicleCount: String(1+state.parkedCars.length),
    aerial: String(aerialMode),
    blockCount: String(getSiteLayout(state.siteId).blocks.length),
  });
  if (elapsed > 0.75) {
    $("#fps").textContent =
      `${Math.round(frames / elapsed)} FPS · ${(frameMs.reduce((a, b) => a + b, 0) / frameMs.length).toFixed(1)} ms / frame`;
    frames = 0;
    elapsed = 0;
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
