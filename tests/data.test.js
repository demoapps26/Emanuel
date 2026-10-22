import test from "node:test";
import assert from "node:assert/strict";
import {
  initialData,
  validateData,
  loadData,
  saveData,
  totals,
  teamFor,
  STORAGE_KEY,
} from "../src/data.js";
const storage = () => {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
  };
};
test("catalog contains 13 farms plus HQ and separates projected areas", () => {
  const d = initialData();
  assert.equal(d.exploracoes.length, 13);
  assert.equal(d.sede.nome, "Frutas Patrícia Pilar");
  assert.deepEqual(totals(d), { declared: 129.23, projected: 18 });
  assert.equal(validateData(d).schemaVersion, 2);
});
test("confirmed people are shared and the two David identities stay separate", () => {
  const d = initialData();
  for (const name of [
    "César",
    "Guilherme",
    "Mariano",
    "Emanuel Franco",
    "Cristina",
  ])
    assert.equal(d.people.filter((p) => p.name === name).length, 1);
  assert.equal(d.people.filter((p) => p.name === "David").length, 2);
  assert.ok(
    teamFor(d, "lagoa").some(
      (p) => p.name === "César" && p.role === "Apoio técnico",
    ),
  );
  assert.equal(
    teamFor(d, "nutriveg_1").find((p) => p.name === "Guilherme").personId,
    teamFor(d, "nutriveg_2").find((p) => p.name === "Guilherme").personId,
  );
});
test("edits, multi-farm assignments and cultivation history survive a storage roundtrip", () => {
  const d = initialData(),
    s = storage(),
    site = d.exploracoes[0];
  site.area_ha = 16.5;
  site.periodos.push({
    cultura: "Pepino",
    inicio: "2026-01-01",
    fim: "2026-10-01",
    setor: "A",
  });
  site.periodos.push({
    cultura: "Tomate",
    inicio: "2026-10-02",
    fim: null,
    setor: "A",
  });
  d.assignments.push({
    personId: d.people[0].id,
    siteId: "framboesa_2",
    role: "Apoio",
  });
  saveData(s, d);
  assert.deepEqual(loadData(s).data, d);
  assert.equal(loadData(s).warning, null);
});
test("bad data does not erase local storage and returns a warning", () => {
  const s = storage();
  s.setItem(STORAGE_KEY, "broken");
  assert.ok(loadData(s).warning);
  assert.equal(loadData(s).data.exploracoes.length, 13);
  assert.equal(s.getItem(STORAGE_KEY), "broken");
});
test("import rejects duplicate IDs, invalid areas, missing people and forged project status", () => {
  for (const mutate of [
    (d) => (d.exploracoes[1].id = d.exploracoes[0].id),
    (d) => (d.exploracoes[0].area_ha = -1),
    (d) => (d.assignments[0].personId = "missing"),
    (d) =>
      (d.exploracoes.find((x) => x.id === "deusas").area_e_projetada = false),
  ]) {
    const d = initialData();
    mutate(d);
    assert.throws(() => validateData(d));
  }
});
test("history rejects reversed dates and impossible calendar dates", () => {
  for (const dates of [
    { inicio: "2026-11-01", fim: "2026-01-01" },
    { inicio: "2026-02-30", fim: null },
  ]) {
    const d = initialData();
    d.exploracoes[0].periodos = [{ cultura: "Tomate", setor: null, ...dates }];
    assert.throws(() => validateData(d));
  }
});
test("storage failures do not masquerade as successful persistence", () => {
  assert.throws(
    () =>
      saveData(
        {
          setItem() {
            throw Error("quota");
          },
        },
        initialData(),
      ),
    /quota/,
  );
});

test("new people have unique IDs, Nuno leads every farm, and César supports four farms", () => {
  const d = initialData();
  for (const name of [
    "Nuno",
    "Hernani",
    "Miguel",
    "Rafael",
    "Emanuel Franco",
    "César",
  ])
    assert.equal(d.people.filter((p) => p.name === name).length, 1);
  for (const s of d.exploracoes)
    assert.ok(
      teamFor(d, s.id).some(
        (p) => p.personId === "nuno" && p.role === "Chefia geral",
      ),
    );
  assert.equal(d.assignments.filter((a) => a.personId === "cesar").length, 4);
  for (const id of ["framboesa_2", "lagoa", "varzea", "fenomeno"])
    assert.ok(teamFor(d, id).some((p) => p.personId === "cesar"));
  assert.ok(teamFor(d, "greenaura").some((p) => p.personId === "hernani"));
  assert.equal(
    d.exploracoes.some((s) => s.nome === "Vale da Borra"),
    false,
  );
  assert.ok(
    d.supportRelations.some(
      (r) =>
        r.location === "Vale da Borra" && r.groupMembership === "por_confirmar",
    ),
  );
});
test("schema 1 migration preserves edits and adds each shared identity just once", () => {
  const d = initialData();
  d.schemaVersion = 1;
  d.exploracoes[0].area_ha = 16.75;
  d.exploracoes[0].periodos.push({
    cultura: "Tomate",
    inicio: "2026-01-01",
    fim: null,
    setor: null,
  });
  const newIds = new Set(["nuno", "hernani", "miguel", "rafael"]);
  d.people = d.people.filter((p) => !newIds.has(p.id));
  d.assignments = d.assignments.filter((a) => !newIds.has(a.personId));
  delete d.companyRoles;
  delete d.supportRelations;
  const s = storage();
  s.setItem(STORAGE_KEY, JSON.stringify(d));
  const loaded = loadData(s);
  assert.equal(loaded.warning, null);
  assert.equal(loaded.data.schemaVersion, 2);
  assert.equal(loaded.data.exploracoes[0].area_ha, 16.75);
  assert.equal(loaded.data.exploracoes[0].periodos.length, 1);
  const again = validateData(loaded.data);
  assert.equal(again.people.length, loaded.data.people.length);
  assert.equal(again.assignments.length, loaded.data.assignments.length);
  assert.equal(JSON.parse(s.getItem(STORAGE_KEY)).schemaVersion, 1);
});
test("duplicate person names on different IDs are rejected instead of duplicating a shared person", () => {
  const d = initialData();
  d.people.push({ id: "another-cesar", name: "César" });
  assert.throws(() => validateData(d), /Pessoa repetida/);
});

test("imported map links cannot inject script URLs into the coordinates editor", () => {
  const d = initialData();
  d.exploracoes[0].maps_url = "javascript:alert(1)";
  assert.throws(() => validateData(d), /Ligação/);
});
