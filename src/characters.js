// Generic visual representations; these positions are only staging in the local demo.
export const CHARACTERS = [
  {
    id: "nuno",
    name: "Nuno",
    x: 25,
    z: 105,
    color: 0x284b45,
    role: "Chefia geral",
    description:
      "Chefe de todas as explorações e das pessoas e equipas referidas neste projeto.",
  },
  {
    id: "hernani",
    name: "Hernani",
    x: 25,
    z: 120,
    color: 0x3a6b70,
    role: "Técnico · apoio a explorações",
    description:
      "Dá apoio técnico à Greenaura, a Vale da Borra e a outros produtores que não fazem parte do grupo.",
  },
  {
    id: "miguel",
    name: "Miguel",
    x: 40,
    z: 120,
    color: 0x667945,
    role: "Apoio a agricultores",
    description:
      "Também dá apoio aos agricultores referidos no acompanhamento de Hernani. A lista individual de produtores e a distribuição das explorações ainda não foram especificadas.",
  },
  {
    id: "rafael",
    name: "Rafael",
    x: 55,
    z: 120,
    color: 0xb8863e,
    role: "Equipamentos e apoio à construção",
    description:
      "Responsável pelos equipamentos, incluindo tratores, Manitou e mini giratórias. Também apoia a operação de construção de novas estufas.",
  },
];
export const LEADERSHIP = [
  { personId: "nuno", role: "Chefia geral", scope: "all_farms_and_teams" },
];
export const EXTERNAL_SUPPORT = [
  {
    personId: "hernani",
    location: "Vale da Borra",
    groupMembership: "por_confirmar",
    description:
      "Apoio técnico confirmado; área, localização e pertença ao grupo por confirmar.",
  },
  {
    personId: "hernani",
    location: "Outros produtores externos",
    groupMembership: "externo",
    description:
      "Apoio a produtores que não fazem parte do grupo; nomes e localizações não fornecidos.",
  },
  {
    personId: "miguel",
    location: "Agricultores acompanhados por Hernani",
    groupMembership: "por_confirmar",
    description:
      "Apoio aos agricultores referidos; lista de produtores e distribuição por exploração a confirmar.",
  },
];
export function nearbyCharacter(state, radius = 6) {
  if (state.driving) return null;
  return (
    (state.characters || CHARACTERS).map((c) => ({
      ...c,
      distance: Math.hypot(c.x - state.player.x, c.z - state.player.z),
    }))
      .filter((c) => c.distance < radius)
      .sort((a, b) => a.distance - b.distance)[0] || null
  );
}

export const PLAYER_PERSON_ID = "emanuel_franco";
export function registerPersonEntity(registry, personId, entity) {
  if (registry.has(personId))
    throw Error(`Já existe uma personagem para ${personId}.`);
  registry.set(personId, entity);
  entity.userData.personId = personId;
  return entity;
}
