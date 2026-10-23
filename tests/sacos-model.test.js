import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, uid, validateData, addLines, totals, bags, integer, validDate, uniqueName, csv, demoData, countNewLine, nextLineName } from '../src/sacos/model.js';
const fixture = () => ({ version: 1, houses: [{ id: uid(), name: 'Estufa 1', farm: 'Oeste', notes: '', sectors: [] }] });
const sampleCount = () => ({ sectorId: '__new', sectorName: 'Setor A', lineName: 'Linha 1', date: '2026-10-23', quantity: '60', kind: 'Coco', supplier: 'Fornecedor' });
test('empty state has no fabricated greenhouse configuration', () => { assert.deepEqual(totals(emptyData().houses), { houses:0,sectors:0,lines:0,zones:0,records:0,bags:0 }); });
test('first count creates sector, line and introduction with full traceability', () => {
  const d = fixture(); const result = countNewLine(d.houses[0], sampleCount()); const valid = validateData(d);
  assert.equal(valid.houses[0].sectors[0].id, result.sectorId);
  assert.equal(valid.houses[0].sectors[0].lines[0].id,result.lineId);
  assert.deepEqual(totals(valid.houses), { houses:1,sectors:1,lines:1,zones:0,records:1,bags:60 });
  assert.equal(valid.houses[0].sectors[0].lines[0].records[0].kind,'Coco');
});
test('next count uses same sector and suggests next available line', () => {
  const d = fixture(); const h = d.houses[0]; countNewLine(h,sampleCount());
  const sector = h.sectors[0]; assert.equal(nextLineName(sector),'Linha 2');
  countNewLine(h,{...sampleCount(), sectorId:sector.id,lineName:nextLineName(sector),quantity:40});
  assert.equal(h.sectors.length,1); assert.equal(totals(d.houses).bags,100); assert.equal(nextLineName(sector),'Linha 3');
});
test('counting by zone includes zero zones without inventing introduction records', () => {
  const d=fixture(); countNewLine(d.houses[0],{...sampleCount(), zones:[{name:'Entrada',quantity:20},{name:'Meio',quantity:0},{name:'Fundo',quantity:30}]});
  const l = validateData(d).houses[0].sectors[0].lines[0];
  assert.equal(l.zones.length,3);assert.equal(l.records.length,2);assert.equal(bags(l),50);assert.equal(bags(l,l.zones[1].id),0);
});
test('failed counting leaves hierarchy unchanged for duplicate zone, invalid date or zero total', () => {
  for(const options of [{zones:[{name:'A',quantity:20},{name:'a',quantity:5}]},{date:'2026-02-30'},{zones:[{name:'A',quantity:0}]}]){
    const d=fixture();const before=JSON.stringify(d);assert.throws(()=>countNewLine(d.houses[0],{...sampleCount(),...options}));assert.equal(JSON.stringify(d),before);
  }
});
test('bulk setup is atomic and creates no bag quantities',()=>{
  const s={id:uid(),name:'A',lines:[]};addLines(s,{count:5,first:1,prefix:'Linha',zoneCount:3});
  assert.equal(s.lines.length,5);assert.equal(s.lines[4].name,'Linha 5');assert.equal(s.lines[0].zones.length,3);assert.equal(bags(s.lines[0]),0);
  const before=JSON.stringify(s);assert.throws(()=>addLines(s,{count:3,first:4,prefix:'Linha',zoneCount:2}));assert.equal(JSON.stringify(s),before);
});
test('counts reject fractional, negative, missing, non-finite and excessive values',()=>{
  for(const value of ['',null,undefined,'1.5',-1,0,Infinity,NaN,'10000001'])assert.throws(()=>integer(value));
  assert.equal(integer('12'),12);assert.equal(integer(0,0),0);
});
test('calendar dates including leap years are validated',()=>{
  assert.equal(validDate('2024-02-29'),'2024-02-29');
  for(const date of ['2026-02-29','2026-04-31','2026-13-01','23/10/2026','1899-01-01'])assert.throws(()=>validDate(date));
});
test('names unique within parent with accents, case and surrounding space normalized',()=>{
  const items=[{id:'a',name:'Setor Á'}];assert.throws(()=>uniqueName(items,' setor a '));assert.equal(uniqueName(items,'Setor Á','a'),'Setor Á');
});
test('roundtrip backup preserves all hierarchy and metadata and removes unknown fields',()=>{
  const d=demoData();d.unknown='ignored';const valid=validateData(JSON.parse(JSON.stringify(d)));
  assert.equal('unknown' in valid,false);delete d.unknown;assert.deepEqual(valid,d);
  assert.equal(totals(valid.houses).bags,522);assert.equal(totals(valid.houses).lines,16);
});
test('backup rejects repeated IDs, malformed collections and dangling zone references',()=>{
  for(const mutate of [d=>d.houses[0].sectors[0].id=d.houses[0].id,d=>d.houses[0].sectors[0].lines[0].records[0].zoneId='nonexistent',d=>d.houses[0].sectors[0].lines[0].records[0].quantity=-5,d=>d.houses[0].sectors=null,d=>d.version=2]){
    const d=demoData();mutate(d);assert.throws(()=>validateData(d));
  }
});
test('CSV preserves location, quantity, quotes and newlines and neutralizes spreadsheet formulas',()=>{
  const d=fixture();d.houses[0].name='=HYPERLINK("evil")';countNewLine(d.houses[0],sampleCount());const r=d.houses[0].sectors[0].lines[0].records[0];r.notes='Two\nlines; "quote"';r.supplier=' @SUM(1,1)';
  const out=csv(d);assert.ok(out.startsWith('\ufeff'));assert.ok(out.includes(`"'=HYPERLINK(""evil"")"`));assert.ok(out.includes(`"' @SUM(1,1)"`));assert.ok(out.includes('"Two\nlines; ""quote"""'));assert.ok(out.includes('"60"'));
});
test('totals include unzoned and zoned quantities once, without counting empty lines',()=>{
  const d=fixture();countNewLine(d.houses[0],{...sampleCount(),zones:[{name:'A',quantity:10}]});const l=d.houses[0].sectors[0].lines[0];l.records.push({...l.records[0],id:uid(),zoneId:null,quantity:5});
  assert.equal(bags(l),15);assert.equal(bags(l,null),5);assert.equal(bags(l,l.zones[0].id),10);assert.equal(totals(d.houses).bags,15);
});

test('greenhouses can share a name in different farms but not within the same farm',()=>{
  const d=fixture();d.houses.push({...structuredClone(d.houses[0]),id:uid(),farm:'Outra exploração'});assert.equal(validateData(d).houses.length,2);
  d.houses[1].farm=' oeste ';assert.throws(()=>validateData(d));
});
