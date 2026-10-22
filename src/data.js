import { validCoordinate } from "./geography.js";
import suppliedLocations from "../dados/localizacoes_maps.json" with { type: "json" };
import {
  CHARACTERS,
  LEADERSHIP,
  EXTERNAL_SUPPORT,
  PLAYER_PERSON_ID,
} from "./characters.js";
import original from "../materiais/Patricia_Pilar_Mundo_3D_Codex/dados_exploracoes.json" with { type: "json" };
export const STORAGE_KEY = "pp-mundo3d-v1";
export const MODELLED = ["tomates_oeste", "framboesa_2"];
const clone = (value) => JSON.parse(JSON.stringify(value));
export const identityName = (name) =>
  name
    .trim()
    .toLocaleLowerCase("pt-PT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
const personId = (name) =>
  name
    .toLocaleLowerCase("pt-PT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_");
export function initialData() {
  const data = clone(original);
  data.schemaVersion = 1;
  data.people = [];
  data.assignments = [];
  const register = (name, site, role, identity = name) => {
    const id = personId(identity);
    if (!data.people.some((p) => p.id === id)) data.people.push({ id, name });
    data.assignments.push({ personId: id, siteId: site, role });
  };
  for (const site of data.exploracoes) {
    site.periodos = [];
    for (const [key, role] of Object.entries({
      tecnico: "Técnico",
      supervisao: "Supervisão",
      agronomo: "Agronomia",
      apoio_agronomico: "Apoio agronómico",
      manutencao: "Manutenção",
    })) {
      if (site[key])
        register(
          site[key],
          site.id,
          role,
          key === "manutencao" && site[key] === "David"
            ? "David manutenção identidade por confirmar"
            : site[key],
        );
    }
  }
  register("César", "lagoa", "Apoio técnico");
  return applySuppliedLocations(upgradePeople(data));
}
export function applySuppliedLocations(data) {
  for (const site of [...data.exploracoes, { ...data.sede, id: "sede" }]) {
    const source = suppliedLocations.find((p) => p.id === site.id && p.status === "resolved");
    if (!source) continue;
    if (site.id === "framboesa_2" && !site.maps_url) site.maps_url = source.source_url;
    if (site.coordenadas !== null) continue;
    const target = site.id === "sede" ? data.sede : site;
    target.coordenadas = {
      lat: source.lat, lng: source.lng, confirmed: true,
      source: "user_shared_maps_link", source_url: source.source_url,
      coordinate_kind: source.coordinate_kind,
    };
  }
  return data;
}
function upgradePeople(source) {
  const data = clone(source);
  data.schemaVersion = 2;
  for (const c of CHARACTERS)
    if (!data.people.some((p) => p.id === c.id))
      data.people.push({ id: c.id, name: c.name, description: c.description });
  data.companyRoles = clone(LEADERSHIP);
  data.supportRelations = clone(EXTERNAL_SUPPORT);
  const add = (personId, siteId, role) => {
    if (
      !data.assignments.some(
        (a) =>
          a.personId === personId && a.siteId === siteId && a.role === role,
      )
    )
      data.assignments.push({ personId, siteId, role });
  };
  add("hernani", "greenaura", "Apoio técnico");
  for (const siteId of ["lagoa", "varzea", "fenomeno"])
    add("cesar", siteId, "Apoio técnico");
  const responsible = data.assignments.find(
    (a) =>
      a.personId === "cesar" &&
      a.siteId === "framboesa_2" &&
      a.role === "Técnico",
  );
  if (responsible) responsible.role = "Técnico responsável";
  return data;
}
export function validateData(data) {
  if (
    data?.schemaVersion === 1 &&
    Array.isArray(data.people) &&
    Array.isArray(data.assignments)
  )
    data = upgradePeople(data);
  if (
    !data ||
    data.schemaVersion !== 2 ||
    !Array.isArray(data.exploracoes) ||
    data.exploracoes.length !== 13
  )
    throw Error(
      "Formato incompatível: são necessárias as 13 explorações e schemaVersion 1 ou 2.",
    );
  const baseline = initialData();
  const ids = new Set();
  const text = (s, max = 200) =>
    typeof s === "string" && s.length > 0 && s.length <= max;
  for (const site of data.exploracoes) {
    if (!baseline.exploracoes.some((x) => x.id === site.id) || ids.has(site.id))
      throw Error("Exploração inválida ou repetida.");
    ids.add(site.id);
    if (!validMapLink(site.maps_url)) throw Error("Ligação de mapa inválida.");
    if (site.coordenadas !== null && !validCoordinate(site.coordenadas))
      throw Error("Coordenadas geográficas inválidas.");
    if (
      !text(site.nome) ||
      !Number.isFinite(site.area_ha) ||
      site.area_ha < 0 ||
      site.area_ha > 100000
    )
      throw Error("Nome ou área inválidos.");
    if (
      !Array.isArray(site.culturas_atuais) ||
      !site.culturas_atuais.every((c) => text(c))
    )
      throw Error("Culturas inválidas.");
    if (!Array.isArray(site.periodos))
      throw Error("Histórico de culturas inválido.");
    for (const period of site.periodos) {
      if (
        !text(period.cultura) ||
        !validDate(period.inicio) ||
        !(period.fim === null || validDate(period.fim)) ||
        (period.fim && period.fim < period.inicio) ||
        !(period.setor === null || text(period.setor))
      )
        throw Error("Período de cultivo inválido.");
    }
    if (site.id !== "deusas" && site.area_e_projetada)
      throw Error("Só as Deusas têm área de projeto declarada neste catálogo.");
    if (
      site.id === "deusas" &&
      (site.area_e_projetada !== true ||
        site.estado !== "em_construcao" ||
        !Number.isFinite(site.area_quase_concluida_ha) ||
        site.area_quase_concluida_ha < 0 ||
        site.area_quase_concluida_ha > site.area_ha)
    )
      throw Error(
        "Preserva a distinção entre área projetada e construção nas Deusas.",
      );
  }
  if (
    !data.equipas_transversais ||
    !text(data.equipas_transversais.abrangencia_departamentos, 1000)
  )
    throw Error("Informação das equipas transversais em falta.");
  if (
    !data.sede ||
    !text(data.sede.nome) ||
    !Array.isArray(data.sede.funcoes) ||
    !data.sede.funcoes.every((f) => text(f))
  )
    throw Error("Sede inválida.");
  if (!validMapLink(data.sede.maps_url))
    throw Error("Ligação de mapa da sede inválida.");
  if (data.sede.coordenadas !== null && !validCoordinate(data.sede.coordenadas))
    throw Error("Coordenadas da sede inválidas.");
  if (!Array.isArray(data.people) || !Array.isArray(data.assignments))
    throw Error("Pessoas e relações em falta.");
  const people = new Set();
  for (const p of data.people) {
    if (!text(p.id) || !text(p.name) || people.has(p.id))
      throw Error("Pessoa inválida ou repetida.");
    people.add(p.id);
  }
  const names = new Map();
  for (const p of data.people) {
    const key = identityName(p.name);
    if (!names.has(key)) names.set(key, []);
    names.get(key).push(p.id);
  }
  const davidIds = baseline.people
    .filter((p) => p.name === "David")
    .map((p) => p.id);
  for (const [name, group] of names)
    if (
      group.length > 1 &&
      !(
        name === "david" &&
        group.length === 2 &&
        group.every((id) => davidIds.includes(id))
      )
    )
      throw Error(
        "Pessoa repetida: associa a pessoa existente em vez de criar outra identidade.",
      );
  if (!people.has(PLAYER_PERSON_ID))
    throw Error("A personagem de Emanuel Franco está em falta.");
  for (const a of data.assignments)
    if (!people.has(a.personId) || !ids.has(a.siteId) || !text(a.role))
      throw Error("Associação de pessoa inválida.");
  if (
    !Array.isArray(data.companyRoles) ||
    !Array.isArray(data.supportRelations)
  )
    throw Error("Funções gerais e relações de apoio em falta.");
  for (const c of CHARACTERS)
    if (!people.has(c.id)) throw Error("Personagem obrigatória em falta.");
  for (const p of data.people)
    if (p.description !== undefined && !text(p.description, 1500))
      throw Error("Descrição de pessoa inválida.");
  for (const r of data.companyRoles)
    if (
      !people.has(r.personId) ||
      !text(r.role) ||
      r.scope !== "all_farms_and_teams"
    )
      throw Error("Função de chefia inválida.");
  for (const r of data.supportRelations)
    if (
      !people.has(r.personId) ||
      !text(r.location) ||
      !text(r.description, 1500) ||
      !["por_confirmar", "externo"].includes(r.groupMembership)
    )
      throw Error("Relação de apoio inválida.");
  return clone(data);
}
function validMapLink(value) {
  if (value === null) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      ["maps.app.goo.gl", "www.google.com", "maps.google.com"].includes(
        url.hostname,
      )
    );
  } catch {
    return false;
  }
}
function validDate(v) {
  return (
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v
  );
}
export function loadData(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return {
      data: raw ? applySuppliedLocations(validateData(JSON.parse(raw))) : initialData(),
      warning: null,
    };
  } catch {
    return {
      data: initialData(),
      warning:
        "Não foi possível ler os dados locais. Foram usados os dados originais; o ficheiro guardado não foi apagado.",
    };
  }
}
export function saveData(storage, data) {
  const clean = validateData(data);
  storage.setItem(STORAGE_KEY, JSON.stringify(clean));
  return clean;
}
export function totals(data) {
  return {
    declared: data.exploracoes
      .filter((x) => !x.area_e_projetada)
      .reduce((s, x) => s + x.area_ha, 0),
    projected: data.exploracoes
      .filter((x) => x.area_e_projetada)
      .reduce((s, x) => s + x.area_ha, 0),
  };
}
export function teamFor(data, id) {
  const general = data.companyRoles.map((r) => ({
    name: data.people.find((p) => p.id === r.personId)?.name ?? "Por confirmar",
    role: r.role,
    personId: r.personId,
  }));
  return [
    ...general,
    ...data.assignments
      .filter((a) => a.siteId === id)
      .map((a) => ({
        name:
          data.people.find((p) => p.id === a.personId)?.name ?? "Por confirmar",
        role: a.role,
        personId: a.personId,
      })),
  ];
}
