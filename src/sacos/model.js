export const STORAGE_KEY = 'pp-gestao-sacos-v1';
export const emptyData = () => ({ version: 1, houses: [] });
export const uid = () => globalThis.crypto.randomUUID();
export const clone = value => structuredClone(value);
export function name(value) {
  const result = String(value ?? '').trim();
  if (!result || result.length > 100) throw Error('Indica um nome entre 1 e 100 caracteres.');
  return result;
}
const identity = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-PT');
export function uniqueName(items, value, exceptId) {
  const result = name(value);
  if (items.some(item => item.id !== exceptId && identity(item.name) === identity(result))) throw Error('Já existe esse nome nesta localização. Escolhe outro nome.');
  return result;
}
export function houseName(houses, value, farm, exceptId) {
  return uniqueName(houses.filter(h => identity(h.farm.trim()) === identity(String(farm).trim())), value, exceptId);
}
export function integer(value, min = 1, max = 10000000) {
  if (String(value).trim() === '') throw Error('Indica uma quantidade inteira.');
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < min || result > max) throw Error(`Indica um número inteiro entre ${min} e ${max}.`);
  return result;
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '9999-12-31') throw Error('Indica uma data válida.');
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw Error('Indica uma data válida.');
  return value;
}
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function totals(houses) {
  const count = { houses: houses.length, sectors: 0, lines: 0, zones: 0, records: 0, bags: 0 };
  for (const house of houses) for (const sector of house.sectors) {
    count.sectors++;
    for (const line of sector.lines) {
      count.lines++; count.zones += line.zones.length;
      for (const record of line.records) { count.records++; count.bags += record.quantity; }
    }
  }
  return count;
}
export function bags(line, zoneId = undefined) {
  return line.records.filter(record => zoneId === undefined || record.zoneId === zoneId).reduce((sum, record) => sum + record.quantity, 0);
}
export function addLines(sector, { count, first, prefix, zoneCount }) {
  count = integer(count, 1, 200); first = integer(first, 1, 100000); zoneCount = integer(zoneCount, 0, 20); prefix = name(prefix);
  if (sector.lines.length + count > 500) throw Error('Cada setor pode ter até 500 linhas.');
  const created = [];
  for (let i = 0; i < count; i++) {
    const lineName = `${prefix} ${first + i}`;
    uniqueName([...sector.lines, ...created], lineName);
    created.push({ id: uid(), name: lineName, zones: Array.from({ length: zoneCount }, (_, z) => ({ id: uid(), name: `Zona ${z + 1}` })), records: [] });
  }
  sector.lines.push(...created);
  return created;
}
// Backup input is untrusted: validate the complete hierarchy, rebuild allowed fields,
// reject dangling zone references, duplicate IDs/names and excessive payloads.
export function validateData(input) {
  if (!input || input.version !== 1) throw Error('Este ficheiro não é uma cópia compatível do programa de sacos.');
  const ids = new Set(); let nodes = 0;
  function id(value) {
    if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value) || ids.has(value)) throw Error('A cópia contém identificadores inválidos ou repetidos.');
    if (++nodes > 100000) throw Error('A cópia excede o limite de 100 000 elementos.');
    ids.add(value); return value;
  }
  function list(value, max) {
    if (!Array.isArray(value) || value.length > max) throw Error('A cópia contém uma lista inválida ou demasiado grande.');
    return value;
  }
  function text(value, max = 300) {
    if (typeof value !== 'string' || value.length > max) throw Error('A cópia contém um campo de texto inválido.');
    return value.trim();
  }
  function namedList(value, max, build, scope = () => true) {
    const output = [];
    for (const item of list(value, max)) {
      if (!item || typeof item !== 'object') throw Error('A cópia contém um elemento inválido.');
      const itemName = uniqueName(output.filter(other => scope(other,item)), item.name);
      output.push(build(item, itemName));
    }
    return output;
  }
  const houses = namedList(input.houses, 200, (h, hName) => ({
    id: id(h.id), name: hName, farm: text(h.farm), notes: text(h.notes, 2000),
    sectors: namedList(h.sectors, 100, (s, sName) => ({
      id: id(s.id), name: sName,
      lines: namedList(s.lines, 500, (l, lName) => {
        const line = { id: id(l.id), name: lName, zones: namedList(l.zones, 100, (z, zName) => ({ id: id(z.id), name: zName })), records: [] };
        line.records = list(l.records, 10000).map(r => {
          if (!r || (r.zoneId !== null && !line.zones.some(z => z.id === r.zoneId))) throw Error('Um registo aponta para uma zona que não existe nesta linha.');
          return { id: id(r.id), zoneId: r.zoneId, date: validDate(r.date), quantity: integer(r.quantity), kind: text(r.kind), supplier: text(r.supplier), notes: text(r.notes, 2000) };
        });
        return line;
      }),
    })),
  }), (other,item) => identity(other.farm) === identity(String(item.farm ?? '').trim()));
  return { version: 1, houses };
}
export function csv(data) {
  const rows = [['Exploração', 'Estufa', 'Setor', 'Linha', 'Zona', 'Data', 'Sacos', 'Tipo / referência', 'Fornecedor', 'Observações']];
  for (const h of data.houses) for (const s of h.sectors) for (const l of s.lines) for (const r of l.records) {
    rows.push([h.farm, h.name, s.name, l.name, l.zones.find(z => z.id === r.zoneId)?.name ?? 'Sem zona', r.date, r.quantity, r.kind, r.supplier, r.notes]);
  }
  const cell = value => {
    let str = String(value);
    if (/^[\s]*[=+\-@]/.test(str)) str = `'${str}`;
    return `"${str.replace(/"/g, '""')}"`;
  };
  return '\ufeff' + rows.map(row => row.map(cell).join(';')).join('\r\n');
}
export function demoData() {
  const h = { id: uid(), name: 'Estufa de demonstração', farm: 'Exemplo · dados fictícios', notes: 'Exemplo para experimentar a organização. Podes apagar esta estufa.', sectors: [] };
  for (const [i, label] of ['Setor A', 'Setor B'].entries()) {
    const sector = { id: uid(), name: label, lines: [] };
    addLines(sector, { count: 8, first: 1, prefix: 'Linha', zoneCount: 3 });
    if (i === 0) for (const [index, line] of sector.lines.entries()) {
      if (index < 6) for (const zone of line.zones) line.records.push({ id: uid(), zoneId: zone.id, date: today(), quantity: 24 + index * 2, kind: 'Saco de exemplo', supplier: '', notes: 'Registo de demonstração' });
    }
    h.sectors.push(sector);
  }
  return { version: 1, houses: [h] };
}
// First-use flow: count one new line and create its sector/zones at the same time.
export function countNewLine(house, { sectorId, sectorName, lineName, date, quantity, zones, kind = '', supplier = '' }) {
  let sector = house.sectors.find(s => s.id === sectorId);
  const newSector = !sector;
  if (newSector && sectorId !== '__new') throw Error('Escolhe um setor válido.');
  if (newSector) sector = { id: uid(), name: uniqueName(house.sectors, sectorName), lines: [] };
  if (sector.lines.length >= 500) throw Error('Cada setor pode ter até 500 linhas.');
  const line = { id: uid(), name: uniqueName(sector.lines, lineName), zones: [], records: [] };
  validDate(date);
  const record = (zoneId, qty) => { if (qty) line.records.push({ id: uid(), zoneId, quantity: qty, date, kind: String(kind).trim(), supplier: String(supplier).trim(), notes: '' }); };
  if (zones !== undefined) {
    if (!Array.isArray(zones) || !zones.length || zones.length > 100) throw Error('Indica entre 1 e 100 zonas.');
    for (const item of zones) {
      const zone = { id: uid(), name: uniqueName(line.zones, item.name) };
      const qty = integer(item.quantity, 0); line.zones.push(zone); record(zone.id, qty);
    }
  } else record(null, integer(quantity));
  if (!bags(line)) throw Error('Indica pelo menos um saco para guardar a contagem.');
  if (newSector) house.sectors.push(sector);
  sector.lines.push(line);
  return { sectorId: sector.id, lineId: line.id };
}
export function nextLineName(sector) {
  let i = 1;
  while (sector?.lines.some(l => identity(l.name) === identity(`Linha ${i}`))) i++;
  return `Linha ${i}`;
}
