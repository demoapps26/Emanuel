import suppliedLocations from "../dados/localizacoes_maps.json" with { type: "json" };

/** Match Portuguese names without requiring accents or a particular letter case. */
export function normalizeSearch(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/\s+/g, " ")
    .trim();
}

/** Descriptive edits are retained; map positions always use the supplied links. */
export function createMapSites(data) {
  const sources = new Map(suppliedLocations.map((point) => [point.id, point]));
  return [...data.exploracoes, { ...data.sede, id: "sede" }].map((original, index) => {
    const site = structuredClone(original);
    const source = sources.get(site.id);
    if (!source || source.status !== "resolved")
      throw Error(`Localização fornecida em falta: ${site.id}`);
    const coordenadas = {
      lat: source.lat,
      lng: source.lng,
      confirmed: true,
      source: "user_shared_maps_link",
      source_url: source.source_url,
      coordinate_kind: source.coordinate_kind,
    };
    return {
      ...site,
      name: site.nome,
      number: index + 1,
      category: site.id === "sede" ? "headquarters" : site.estado === "em_construcao" ? "construction" : "farm",
      region: site.id === "lagoa" ? "Alcochete" : "Oeste",
      coordenadas,
      coordinates: { lat: coordenadas.lat, lng: coordenadas.lng },
      maps_url: site.maps_url || source.source_url,
    };
  });
}

function sitePeople(data, siteId) {
  const ids = new Set(
    (data.assignments || []).filter((assignment) => assignment.siteId === siteId).map((assignment) => assignment.personId),
  );
  for (const role of data.companyRoles || [])
    if (role.scope === "all_farms_and_teams") ids.add(role.personId);
  return (data.people || []).filter((person) => ids.has(person.id));
}

/** Filters use confirmed associations, without assigning support staff to farms. */
export function filterMapSites(sites, data, { query = "", crop = "", person = "" } = {}) {
  const tokens = normalizeSearch(query).split(" ").filter(Boolean);
  const normalizedCrop = normalizeSearch(crop);
  return sites.filter((site) => {
    const people = sitePeople(data, site.id);
    if (person && !people.some((member) => member.id === person)) return false;
    if (crop === "__construction") {
      if (site.category !== "construction") return false;
    } else if (crop === "__headquarters") {
      if (site.category !== "headquarters") return false;
    } else if (normalizedCrop && !(site.culturas_atuais || []).some((value) => normalizeSearch(value) === normalizedCrop)) {
      return false;
    }
    const searchable = normalizeSearch([site.nome, ...(site.culturas_atuais || []), ...people.map((member) => member.name)].join(" "));
    return tokens.every((token) => searchable.includes(token));
  });
}

export function mapSummary(data) {
  const farms = data.exploracoes;
  return {
    farms: farms.length,
    locations: farms.length + 1,
    declaredArea: farms.filter((site) => !site.area_e_projetada).reduce((sum, site) => sum + site.area_ha, 0),
    projectedArea: farms.filter((site) => site.area_e_projetada).reduce((sum, site) => sum + site.area_ha, 0),
    construction: farms.filter((site) => site.estado === "em_construcao").length,
    headquarters: 1,
  };
}
