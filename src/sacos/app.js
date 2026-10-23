import './style.css';
import { STORAGE_KEY, emptyData, uid, clone, uniqueName, houseName, integer, today, totals, bags, addLines, validateData, csv, demoData, countNewLine, nextLineName } from './model.js';

const icons = {
  leaf: '<path d="M20 4C11 3 4 7 5 14c1 5 8 7 12 1 2-3 3-7 3-11Z"/><path d="M4 21 15 10M10 16l-1-5m1 5 5 1"/>',
  house: '<path d="m3 10 9-7 9 7v11H3Z"/><path d="M8 21V11h8v10M12 3v8"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  bag: '<path d="M8 3h8l-2 5c4 3 7 6 6 10-1 4-15 4-16 0-1-4 2-7 6-10Z"/><path d="M8 8h8m-7 7h6m-3-3v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  down: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  up: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  edit: '<path d="m4 16 12-12 4 4L8 20H4Zm10-10 4 4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
const icon = key => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key] ?? icons.grid}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const num = value => new Intl.NumberFormat('pt-PT').format(value);
const fmtDate = value => value.split('-').reverse().join('/');
let data = emptyData(), selectedHouse = '', selectedSector = '', selectedLine = '', zoneFilter = '*', search = '', saved = '', blocked = false, memoryOnly = false, warning = '', damagedRaw = null;
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== null) {
    try { data = validateData(JSON.parse(raw)); }
    catch { blocked = true; damagedRaw = raw; warning = 'Os dados guardados não puderam ser lidos. Descarrega os dados existentes e restaura uma cópia válida. Os dados existentes foram preservados.'; }
  }
} catch { memoryOnly = true; warning = 'O navegador não permite guardar dados. Nesta sessão, usa Exportar cópia antes de fechar a aplicação.'; }
function current(source = data) {
  const house = source.houses.find(h => h.id === selectedHouse);
  const sector = house?.sectors.find(s => s.id === selectedSector);
  const line = sector?.lines.find(l => l.id === selectedLine);
  return { house, sector, line };
}
function reconcile() {
  if (!current().house) selectedHouse = data.houses[0]?.id ?? '';
  if (!current().sector) selectedSector = current().house?.sectors[0]?.id ?? '';
  if (!current().line) selectedLine = '';
  if (zoneFilter !== '*' && zoneFilter !== '' && !current().line?.zones.some(z => z.id === zoneFilter)) zoneFilter = '*';
}
function persist(next, replacing = false) {
  if (blocked && !replacing) throw Error('Os dados foram alterados noutra janela ou não puderam ser lidos. Recarrega a página ou restaura uma cópia para continuar.');
  const valid = validateData(next);
  if (!memoryOnly) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(valid)); }
    catch { throw Error('Não foi possível guardar no navegador. Os dados anteriores continuam intactos. Mantém esta janela aberta, verifica o espaço disponível e tenta novamente.'); }
  }
  data = valid; blocked = false; damagedRaw = null;
  warning = memoryOnly ? 'Modo de sessão: exporta uma cópia antes de fechar.' : '';
  saved = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  reconcile(); render();
}
function change(mutator) { const next = clone(data); const result = mutator(next); persist(next); return result; }
const button = (action, text, type = '', glyph = '', attrs = '') => `<button type="button" data-action="${action}" class="btn ${type}" ${attrs}>${glyph ? icon(glyph) : ''}${text}</button>`;
const smallEmpty = (title, text, action, label) => `<div class="empty compact">${icon('grid')}<h3>${title}</h3><p>${text}</p>${button(action, label, 'primary', 'plus')}</div>`;
function render() {
  reconcile();
  const { house, sector, line } = current();
  const all = totals(data.houses), h = house ? totals([house]) : null;
  const visible = data.houses.filter(h => `${h.name} ${h.farm}`.toLocaleLowerCase('pt-PT').includes(search.toLocaleLowerCase('pt-PT')));
  document.querySelector('#app').innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" aria-label="Gestão de sacos · início"><span class="brand-mark">${icon('leaf')}</span><span><strong>Grupo Patrícia Pilar</strong><small>GESTÃO AGRÍCOLA</small></span></a>
      <div class="product-tab">${icon('bag')}<span>Sacos de substrato</span></div>
      <div class="header-actions">${button('export', 'Exportar cópia', '', 'down')}${button('import', 'Restaurar', 'ghost', 'up')}${button('help', '?', 'help', '', 'aria-label="Ajuda"')}</div>
    </header>
    <aside class="sidebar">
      <div class="sidebar-head"><span class="eyebrow">ORGANIZAÇÃO DA PRODUÇÃO</span><div class="aside-title"><h1>Estufas</h1><span class="count-pill">${all.houses}</span></div><p>Do setor à zona, cada saco no seu lugar.</p>
      <div class="search">${icon('search')}<input id="search" aria-label="Pesquisar estufas" placeholder="Pesquisar estufa ou exploração" value="${esc(search)}"></div>
      ${button('new-house', 'Nova estufa', 'primary full', 'plus')}</div>
      <div class="list-caption"><span>${visible.length} ${visible.length === 1 ? 'estufa' : 'estufas'}</span><span>${num(all.bags)} sacos</span></div>
      <nav class="house-list" aria-label="Estufas">${visible.map(h => { const t = totals([h]); return `<button class="house-card ${h.id === selectedHouse ? 'selected' : ''}" data-house="${h.id}" aria-pressed="${h.id === selectedHouse}"><span class="house-symbol">${icon('house')}</span><span class="house-copy"><strong>${esc(h.name)}</strong><small>${esc(h.farm || 'Sem exploração associada')}</small><span>${t.sectors} setores <i>·</i> ${t.lines} linhas</span></span><span class="house-count">${num(t.bags)}<small>sacos</small></span></button>`; }).join('') || `<p class="list-empty">${search ? 'Nenhuma estufa corresponde à pesquisa.' : 'Começa por criar a tua primeira estufa.'}</p>`}</nav>
      <div class="sidebar-bottom"><span class="save-dot ${memoryOnly || blocked ? 'amber' : ''}"></span><span>${blocked ? 'Gravação suspensa' : memoryOnly ? 'Apenas nesta sessão' : saved ? `Guardado às ${saved}` : 'Guardado neste navegador'}<small>${all.lines} linhas · ${all.zones} zonas</small></span></div>
    </aside>
    <main id="main" class="main ${line ? 'with-detail' : ''}">
      ${warning ? `<div class="notice" role="alert"><span>${esc(warning)}</span>${blocked ? button(damagedRaw !== null ? 'raw-export' : 'reload', damagedRaw !== null ? 'Descarregar dados existentes' : 'Recarregar') : ''}</div>` : ''}
      ${house ? houseView(house, sector, h) : welcome()}
    </main>
    ${line ? lineView(house, sector, line) : ''}
    <footer class="page-footer">Estufa <span>›</span> Setor <span>›</span> Linha <span>›</span> Zona <span class="footer-right">Registos de introdução · quantidades acumuladas</span></footer>`;
}
function welcome() {
  return `<div class="welcome"><span class="eyebrow">SACOS DE SUBSTRATO</span><h2>Uma organização clara.<br>Cada linha, cada zona.</h2><p>Vai contando os sacos. A estufa ganha forma à medida que adicionas as linhas e as zonas de cada setor.</p><div class="welcome-actions">${button('new-house', 'Criar estufa e começar', 'primary', 'plus')}${button('demo', 'Experimentar exemplo', 'ghost')}</div>
    <div class="hierarchy-preview" aria-label="Organização por estufa, setor, linha e zona"><div class="roof"></div><div class="preview-inside"><span class="preview-label">A TUA ESTUFA</span><div class="preview-sectors">${['SETOR A', 'SETOR B'].map(label => `<div><small>${label}</small>${[1,2,3,4].map(i => `<div class="preview-line"><span>${String(i).padStart(2,'0')}</span><i></i><i></i><i></i></div>`).join('')}</div>`).join('')}</div><p>Uma estrutura configurada por ti</p></div></div>
    <div class="welcome-steps"><div><span>01</span><strong>Identificar</strong><p>Dá um nome à estufa onde vais contar.</p></div><div><span>02</span><strong>Contar</strong><p>Regista sacos por linha ou por zona.</p></div><div><span>03</span><strong>Continuar</strong><p>Guarda e passa à próxima linha, no mesmo setor.</p></div></div><p class="local-note">Funciona sem Internet. Os dados ficam neste navegador; exporta uma cópia para os levar para outro computador.</p></div>`;
}
function houseView(house, sector, t) {
  const sectorBags = sector ? sector.lines.reduce((sum, l) => sum + bags(l), 0) : 0;
  return `<div class="breadcrumb">${icon('house')}<span>Estufas</span><b>›</b><span>${esc(house.farm || 'A minha exploração')}</span></div>
    <div class="page-heading"><div><span class="eyebrow">CONFIGURAÇÃO E REGISTOS</span><h2>${esc(house.name)}</h2><p>${esc(house.farm || 'Sem exploração associada')}${house.notes ? ` <span>·</span> ${esc(house.notes)}` : ''}</p></div><div class="heading-actions">${button('edit-house', 'Editar estufa', '', 'edit')}${button('new-sector', 'Novo setor', 'ghost', 'plus')}${button('count-line', 'Contar nova linha', 'primary', 'plus')}</div></div>
    <div class="stats"><div class="stat accent"><span>${icon('bag')}Sacos registados</span><strong>${num(t.bags)}</strong><small>Quantidade acumulada nesta estufa</small></div><div class="stat"><span>${icon('grid')}Setores</span><strong>${t.sectors}</strong><small>Áreas da estufa</small></div><div class="stat"><span>${icon('house')}Linhas e zonas</span><strong>${t.lines}<em>/ ${t.zones}</em></strong><small>Linhas configuradas / zonas</small></div><div class="stat"><span>${icon('clock')}Introduções</span><strong>${num(t.records)}</strong><small>Registos guardados</small></div></div>
    <div class="workspace"><div class="section-heading"><div><span class="eyebrow">PLANTA DA ESTUFA</span><h3>Organização por setor</h3></div><span class="subtle schematic-note">Esquema de organização · sem escala</span></div>
    <div class="sector-tabs" role="group" aria-label="Setores">${house.sectors.map(s => `<button data-sector="${s.id}" class="sector-tab ${s.id === selectedSector ? 'active' : ''}" aria-pressed="${s.id === selectedSector}">${icon('grid')}${esc(s.name)}<span>${s.lines.length}</span></button>`).join('')}${button('new-sector', 'Adicionar', 'ghost small', 'plus')}</div>
    ${sector ? `<div class="sector-heading"><div><h4>${esc(sector.name)}</h4><p>${sector.lines.length} linhas <span>·</span> ${num(sectorBags)} sacos registados</p></div><div>${button('edit-sector', 'Editar setor', 'ghost small', 'edit')}${button('new-lines', 'Configurar linhas', 'ghost small')}${button('count-line', 'Contar nova linha', 'primary small', 'plus')}</div></div>
      ${sector.lines.length ? `<div class="plan-legend"><span><i class="legend-square filled"></i> Com registos</span><span><i class="legend-square"></i> Sem registos</span><span>Clica numa linha para introduzir sacos</span></div><div class="line-grid">${sector.lines.map(l => `<button data-line="${l.id}" class="line-card ${selectedLine === l.id ? 'active' : ''}" aria-pressed="${selectedLine === l.id}"><span class="line-title">${icon('house')}<strong>${esc(l.name)}</strong>${icon('arrow')}</span><span class="zone-strips">${l.zones.length ? l.zones.slice(0,12).map(z => `<span class="zone-strip ${bags(l,z.id) ? 'filled' : ''}" title="${esc(z.name)} · ${num(bags(l,z.id))} sacos"></span>`).join('') : `<span class="zone-strip whole ${bags(l) ? 'filled' : ''}"></span>`}</span><span class="line-bottom"><span>${l.zones.length ? `${l.zones.length} zonas` : 'Sem zonas'}</span><strong>${num(bags(l))} <small>sacos</small></strong></span></button>`).join('')}</div>` : smallEmpty('Configura as linhas deste setor', 'Conta os sacos e a linha será criada com as suas zonas.', 'count-line', 'Contar primeira linha')}` : smallEmpty('Vamos contar a primeira linha', 'Ao contar a primeira linha, o programa cria também o setor e as zonas.', 'count-line', 'Começar a contar')}
    </div><div class="bottom-actions"><p>${icon('down')}Exporta os registos para consultar no Excel.</p>${button('csv', 'Exportar registos · CSV', 'ghost small')}</div>`;
}
function lineView(house, sector, line) {
  const filtered = line.records.filter(r => zoneFilter === '*' || r.zoneId === (zoneFilter || null));
  const ordered = filtered.map((r,index) => ({r,index})).sort((a,b) => b.r.date.localeCompare(a.r.date) || b.index-a.index).map(x => x.r);
  return `<aside class="line-detail" aria-label="Detalhes da linha"><div class="detail-top"><span class="eyebrow">${esc(sector.name)}</span>${button('close-line', '×', 'icon-button', '', 'aria-label="Fechar detalhes da linha"')}</div><div class="detail-heading"><span class="detail-symbol">${icon('house')}</span><div><h2>${esc(line.name)}</h2><p>${esc(house.name)}</p></div>${button('edit-line', icon('edit'), 'icon-button', '', 'aria-label="Editar linha"')}</div>
    <div class="line-total"><span>Sacos nesta linha</span><strong>${num(bags(line))}</strong><small>${line.records.length} registos · ${line.zones.length} zonas</small></div>
    ${button('new-record', 'Introduzir sacos', 'primary full', 'plus')}
    <div class="detail-section-title"><h3>Zonas da linha</h3>${button('new-zone', '+ Zona', 'ghost small')}</div>
    <button class="zone-item ${zoneFilter === '*' ? 'selected' : ''}" data-zone="*"><span>Todas as zonas</span><strong>${num(bags(line))}</strong></button>
    ${line.zones.map(z => `<div class="zone-row"><button data-zone="${z.id}" class="zone-item ${zoneFilter === z.id ? 'selected' : ''}"><span><i class="zone-dot ${bags(line,z.id) ? 'filled' : ''}"></i>${esc(z.name)}</span><strong>${num(bags(line,z.id))}</strong></button><button class="zone-edit" data-edit-zone="${z.id}" aria-label="Editar ${esc(z.name)}">${icon('edit')}</button></div>`).join('')}
    <button data-zone="" class="zone-item unzoned ${zoneFilter === '' ? 'selected' : ''}"><span>Sem zona atribuída</span><strong>${num(bags(line,null))}</strong></button>
    <div class="detail-section-title"><h3>Introduções <span>${filtered.length}</span></h3></div>
    <div class="record-list">${ordered.slice(0,100).map(r => `<button data-record="${r.id}" class="record"><span class="record-icon">${icon('bag')}</span><span class="record-copy"><strong>${esc(line.zones.find(z => z.id === r.zoneId)?.name ?? 'Sem zona atribuída')}</strong><small>${fmtDate(r.date)}${r.kind ? ` · ${esc(r.kind)}` : ''}</small>${r.supplier ? `<small>${esc(r.supplier)}</small>` : ''}</span><span class="record-quantity">${num(r.quantity)}<small>sacos</small></span></button>`).join('') || '<p class="detail-empty">Sem introduções nesta localização.<br>Clica em Introduzir sacos para começar.</p>'}</div>${ordered.length > 100 ? '<p class="subtle">Mostrados os 100 registos mais recentes. O CSV inclui todos.</p>' : ''}
    <p class="detail-footnote">Clica num registo para o corrigir ou eliminar. Os totais representam introduções acumuladas, não o stock disponível.</p>
  </aside>`;
}

const modal = document.createElement('dialog'); modal.id = 'editor'; document.body.append(modal);
let submitModal = null;
function openModal(title, subtitle, fields, submit, { label = 'Guardar', deleteAction = null, wide = false } = {}) {
  submitModal = submit;
  modal.className = wide ? 'wide-modal' : '';
  modal.innerHTML = `<form id="edit-form"><div class="modal-heading"><div><span class="eyebrow">GESTÃO DE SACOS</span><h2>${title}</h2></div><button type="button" data-dismiss aria-label="Fechar janela">×</button></div><p class="modal-subtitle">${subtitle}</p><div class="form-fields">${fields}</div><p class="form-error" role="alert" hidden></p><div class="modal-actions">${deleteAction ? '<button type="button" class="btn danger" data-delete>Eliminar</button>' : ''}<span></span><button type="button" class="btn" data-dismiss>Cancelar</button><button class="btn primary" type="submit">${label}</button></div></form>`;
  modal.querySelectorAll('[data-dismiss]').forEach(el => el.onclick = () => modal.close());
  if (deleteAction) modal.querySelector('[data-delete]').onclick = deleteAction;
  if (!modal.open) modal.showModal();
}

modal.addEventListener('submit', event => {
  event.preventDefault();
  const error = modal.querySelector('.form-error'); error.hidden = true;
  try { submitModal(new FormData(event.target)); modal.close(); }
  catch (e) { error.textContent = e.message; error.hidden = false; }
});
function input(key, label, value = '', attrs = '', type = 'text') {
  return `<label class="field">${label}<input name="${key}" type="${type}" value="${esc(value)}" ${type === 'text' && !attrs.includes('maxlength') ? 'maxlength="100"' : ''} ${attrs}></label>`;
}
function textarea(key, label, value = '') { return `<label class="field">${label}<textarea name="${key}" maxlength="2000" rows="3">${esc(value)}</textarea></label>`; }
function confirmDelete(title, description, mutate) {
  openModal(title, '', `<div class="delete-description">${description}</div><p class="subtle">Esta ação não pode ser anulada. Podes cancelar e exportar uma cópia primeiro.</p>`, () => change(mutate), { label: 'Eliminar definitivamente' });
}
function houseForm(edit) {
  const house = current().house;
  openModal(edit ? 'Editar estufa' : 'Nova estufa', 'Identifica a estufa e associa-a à exploração.', input('name', 'Nome da estufa *', edit ? house.name : '', 'required placeholder="Ex.: Estufa 1"') + input('farm', 'Exploração', edit ? house.farm : '', 'placeholder="Ex.: Tomates do Oeste" maxlength="300"') + textarea('notes', 'Observações', edit ? house.notes : ''), form => {
    let newId;
    change(next => {
      const value = houseName(next.houses, form.get('name'), form.get('farm'), edit ? selectedHouse : null);
      if (edit) Object.assign(current(next).house, { name: value, farm: form.get('farm').trim(), notes: form.get('notes').trim() });
      else { newId = uid(); next.houses.push({ id: newId, name: value, farm: form.get('farm').trim(), notes: form.get('notes').trim(), sectors: [] }); }
    });
    if (newId) { selectedHouse = newId; selectedSector = ''; selectedLine = ''; render(); queueMicrotask(() => countLineForm()); }
  }, { label: edit ? 'Guardar alterações' : 'Criar estufa', deleteAction: edit ? () => confirmDelete('Eliminar estufa?', `<strong>${esc(house.name)}</strong><p>Serão eliminados todos os setores, linhas, zonas e ${totals([house]).records} registos desta estufa.</p>`, next => { next.houses = next.houses.filter(h => h.id !== selectedHouse); }) : null });
}
function sectorForm(edit) {
  const { house, sector } = current();
  if (!house) return;
  openModal(edit ? 'Editar setor' : 'Novo setor', esc(house.name), input('name', 'Nome do setor *', edit ? sector.name : '', 'required placeholder="Ex.: Setor A"'), form => {
    let newId;
    change(next => { const h = current(next).house; const value = uniqueName(h.sectors, form.get('name'), edit ? selectedSector : null);
      if (edit) current(next).sector.name = value;
      else { newId = uid(); h.sectors.push({ id: newId, name: value, lines: [] }); }
    });
    if (newId) { selectedSector = newId; selectedLine = ''; render(); }
  }, { label: edit ? 'Guardar alterações' : 'Criar setor', deleteAction: edit ? () => confirmDelete('Eliminar setor?', `<strong>${esc(sector.name)}</strong><p>Serão eliminadas as ${sector.lines.length} linhas deste setor, com todas as zonas e registos.</p>`, next => { current(next).house.sectors = current(next).house.sectors.filter(s => s.id !== selectedSector); }) : null });
}
function linesForm() {
  if (!current().sector) return;
  openModal('Adicionar linhas', `Cria várias linhas no setor ${esc(current().sector.name)}. Podes dar outro nome a cada linha depois.`, `<div class="field-row">${input('count','Número de linhas *',1,'required min="1" max="200" step="1"','number')}${input('first','Começar no número *',current().sector.lines.length + 1,'required min="1" max="100000" step="1"','number')}</div>${input('prefix','Prefixo *','Linha','required')}<div class="field-row">${input('zoneCount','Zonas por linha *',3,'required min="0" max="20" step="1"','number')}<p class="field-hint">Usa 0 para trabalhar sem zonas. Podes adicionar e renomear as zonas depois.</p></div><p class="inline-note">As novas linhas começam sem sacos registados.</p>`, form => {
    change(next => addLines(current(next).sector, Object.fromEntries(form)));
  }, { label: 'Criar linhas' });
}
function lineForm() {
  const { line, sector } = current(); if (!line) return;
  openModal('Editar linha', esc(sector.name), input('name','Nome da linha *',line.name,'required'), form => change(next => { current(next).line.name = uniqueName(current(next).sector.lines, form.get('name'), selectedLine); }), { label: 'Guardar alterações', deleteAction: () => confirmDelete('Eliminar linha?', `<strong>${esc(line.name)}</strong><p>Serão eliminadas as ${line.zones.length} zonas e ${line.records.length} introduções desta linha.</p>`, next => { current(next).sector.lines = current(next).sector.lines.filter(l => l.id !== selectedLine); }) });
}
function zoneForm(id) {
  const { line } = current(); if (!line) return;
  const zone = line.zones.find(z => z.id === id);
  openModal(zone ? 'Editar zona' : 'Nova zona', esc(line.name), input('name', 'Nome da zona *', zone?.name ?? '', 'required placeholder="Ex.: Entrada, Meio, Fundo…"'), form => {
    let newId;
    change(next => { const l = current(next).line, value = uniqueName(l.zones, form.get('name'), id);
      if (zone) l.zones.find(z => z.id === id).name = value;
      else { newId = uid(); l.zones.push({ id: newId, name: value }); }
    });
    if (newId) { zoneFilter = newId; render(); }
  }, { label: zone ? 'Guardar alterações' : 'Criar zona', deleteAction: zone ? () => confirmDelete('Eliminar zona?', `<strong>${esc(zone.name)}</strong><p>Apenas esta zona será eliminada. Os seus ${line.records.filter(r => r.zoneId === id).length} registos passam para <b>Sem zona atribuída</b> na mesma linha, preservando as quantidades.</p>`, next => {
    const l = current(next).line; l.zones = l.zones.filter(z => z.id !== id); for (const r of l.records) if (r.zoneId === id) r.zoneId = null;
  }) : null });
}
function recordForm(id) {
  const { house, sector, line } = current(); if (!line) return;
  const record = line.records.find(r => r.id === id), selectedZone = record ? record.zoneId ?? '' : zoneFilter === '*' ? '' : zoneFilter;
  const fields = `<div class="record-location">${icon('house')}<span>${esc(house.name)}<b>›</b>${esc(sector.name)}<b>›</b>${esc(line.name)}</span></div><label class="field">Zona<select name="zoneId"><option value="">Sem zona atribuída · linha inteira</option>${line.zones.map(z => `<option value="${z.id}" ${selectedZone === z.id ? 'selected' : ''}>${esc(z.name)}</option>`).join('')}</select></label><div class="field-row">${input('quantity','Quantidade de sacos *',record?.quantity ?? '', 'required min="1" max="10000000" step="1" placeholder="0"','number')}${input('date','Data de introdução *',record?.date ?? today(),'required min="1900-01-01" max="9999-12-31"','date')}</div>${input('kind','Tipo de substrato / referência',record?.kind ?? '','placeholder="Ex.: fibra de coco · 100 × 20 cm" maxlength="300"')}${input('supplier','Fornecedor',record?.supplier ?? '','placeholder="Nome do fornecedor" maxlength="300"')}${textarea('notes','Observações',record?.notes ?? '')}`;
  openModal(record ? 'Editar introdução' : 'Introduzir sacos', 'Regista os sacos introduzidos nesta linha ou numa zona específica.', fields, form => change(next => {
    const l = current(next).line;
    const value = { id: record?.id ?? uid(), zoneId: form.get('zoneId') || null, quantity: integer(form.get('quantity')), date: form.get('date'), kind: form.get('kind').trim(), supplier: form.get('supplier').trim(), notes: form.get('notes').trim() };
    if (record) l.records[l.records.findIndex(r => r.id === id)] = value; else l.records.push(value);
  }), { label: record ? 'Guardar alterações' : 'Guardar introdução', deleteAction: record ? () => confirmDelete('Eliminar introdução?', `<p>Eliminar o registo de <strong>${num(record.quantity)} sacos</strong> de ${fmtDate(record.date)}? O total será recalculado.</p>`, next => { current(next).line.records = current(next).line.records.filter(r => r.id !== id); }) : null });
}
function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 20000);
}
function help() {
  openModal('Como usar', 'Uma estrutura simples, do geral ao pormenor.', `<ol class="help-list"><li>Cria uma <strong>estufa</strong> e indica a exploração.</li><li>Usa <strong>Contar nova linha</strong>: escolhe ou cria o setor e indica os sacos da linha ou de cada zona.</li><li>Guarda e passa à linha seguinte. A estufa fica configurada à medida que contas. Também podes usar <strong>Configurar linhas</strong> para preparar várias linhas sem contagens.</li><li>Clica numa linha e em <strong>Introduzir sacos</strong>. Escolhe uma zona ou regista na linha inteira.</li><li>Clica num registo para corrigir quantidade, data, substrato ou fornecedor.</li></ol><p><strong>Exportar cópia</strong> guarda a estrutura e todos os registos em JSON. Usa <strong>Restaurar</strong> para os recuperar ou levar para outro computador. A restauração substitui os dados atuais.</p><p><strong>Exportar registos · CSV</strong> permite consultar os dados no Excel.</p><p>Os totais somam as introduções; não calculam o stock ou o consumo. Os esquemas mostram a organização, sem representar a posição geográfica das estufas.</p><p class="inline-note">Os dados ficam neste navegador e não são sincronizados entre computadores. Faz cópias regulares. Ao abrir um HTML local, conserva o ficheiro na mesma pasta e usa o mesmo navegador.</p>`, () => {}, { label: 'Entendido', wide: true });
}
const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = '.json,application/json'; fileInput.hidden = true; document.body.append(fileInput);
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0]; fileInput.value = ''; if (!file) return;
  try {
    if (file.size > 15000000) throw Error('A cópia deve ter até 15 MB.');
    const next = validateData(JSON.parse(await file.text())); const count = totals(next.houses);
    openModal('Restaurar cópia de segurança', esc(file.name), `<div class="import-counts"><strong>${count.houses}</strong> estufas · <strong>${count.lines}</strong> linhas · <strong>${num(count.bags)}</strong> sacos</div><p>Esta cópia irá <strong>substituir todos os dados atuais</strong>. Exporta uma cópia dos dados atuais antes de continuar, se precisares de os conservar.</p>`, () => { persist(next, true); selectedHouse = ''; selectedSector = ''; selectedLine = ''; zoneFilter = '*'; search = ''; render(); }, { label: 'Substituir e restaurar' });
  } catch (e) { openModal('Não foi possível restaurar', 'Os dados atuais foram mantidos.', `<p>${esc(e instanceof SyntaxError ? 'O ficheiro não contém um JSON válido.' : e.message)}</p>`, () => {}, { label: 'Fechar' }); }
});
const actions = {
  'new-house': () => houseForm(false), 'edit-house': () => houseForm(true),
  'new-sector': () => sectorForm(false), 'edit-sector': () => sectorForm(true),
  'count-line': () => countLineForm(), 'new-lines': linesForm, 'edit-line': lineForm, 'new-zone': () => zoneForm(), 'new-record': () => recordForm(),
  'close-line': () => { selectedLine = ''; render(); },
  export: () => download(`Sacos_copia_${today()}.json`, JSON.stringify(data, null, 2), 'application/json'),
  csv: () => download(`Sacos_registos_${today()}.csv`, csv(data), 'text/csv;charset=utf-8'),
  import: () => fileInput.click(), help,
  'raw-export': () => download('Sacos_dados_a_recuperar.txt', damagedRaw, 'text/plain'),
  reload: () => location.reload(),
  demo: () => openModal('Experimentar com dados fictícios', '', '<p>Será criada uma estufa de demonstração com dois setores, linhas, zonas e registos de exemplo. Podes eliminar esta estufa quando terminares.</p>', () => change(next => {
    const demo = demoData().houses[0]; demo.name = uniqueName(next.houses, demo.name); next.houses.push(demo); selectedHouse = demo.id; selectedSector = ''; selectedLine = '';
  }), { label: 'Criar demonstração' }),
};
document.querySelector('#app').addEventListener('click', event => {
  const el = event.target.closest('button'); if (!el) return;
  if (el.dataset.house) { selectedHouse = el.dataset.house; selectedSector = ''; selectedLine = ''; zoneFilter = '*'; render(); }
  else if (el.dataset.sector) { selectedSector = el.dataset.sector; selectedLine = ''; zoneFilter = '*'; render(); }
  else if (el.dataset.line) { selectedLine = el.dataset.line; zoneFilter = '*'; render(); }
  else if ('zone' in el.dataset) { zoneFilter = el.dataset.zone; render(); }
  else if (el.dataset.editZone) zoneForm(el.dataset.editZone);
  else if (el.dataset.record) recordForm(el.dataset.record);
  else if (actions[el.dataset.action]) actions[el.dataset.action]();
});
document.querySelector('#app').addEventListener('input', event => {
  if (event.target.id !== 'search') return;
  search = event.target.value; const start = event.target.selectionStart; render(); const field = document.querySelector('#search'); field.focus(); field.setSelectionRange(start,start);
});
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  blocked = true; warning = 'Os dados foram alterados noutra janela. Recarrega a página para abrir a versão mais recente antes de fazer alterações.';
  render();
});
render();

let countingDefaults = {};
function countLineForm(preferences = countingDefaults) {
  const { house, sector } = current(); if (!house) return;
  const defaultSector = house.sectors.find(s => s.id === preferences.sectorId) ?? sector;
  const sectorId = defaultSector?.id ?? '__new';
  const fields = `<div class="count-intro">${icon('bag')}<p>Conta, guarda e avança. A linha e as zonas são criadas com a contagem.</p></div><label class="field">Setor<select name="sectorId" id="count-sector">${house.sectors.map(s => `<option value="${s.id}" ${s.id === sectorId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}<option value="__new" ${sectorId === '__new' ? 'selected' : ''}>+ Criar novo setor</option></select></label><div id="new-sector-field" ${sectorId === '__new' ? '' : 'hidden'}>${input('sectorName', 'Nome do novo setor *', `Setor ${house.sectors.length + 1}`, sectorId === '__new' ? 'required' : 'disabled')}</div><div class="field-row">${input('lineName', 'Linha que estás a contar *', nextLineName(defaultSector), 'required')}${input('date','Data *',preferences.date ?? today(),'required min="1900-01-01" max="9999-12-31"','date')}</div><fieldset class="count-mode"><legend>Como estás a contar?</legend><label><input type="radio" name="mode" value="line" ${preferences.mode !== 'zones' ? 'checked' : ''}> Total da linha</label><label><input type="radio" name="mode" value="zones" ${preferences.mode === 'zones' ? 'checked' : ''}> Zona a zona</label></fieldset><div id="whole-count">${input('quantity', 'Sacos nesta linha *', '', 'required min="1" max="10000000" step="1" autofocus placeholder="Quantidade contada"','number')}</div><div id="zone-count" hidden><div class="zone-count-head"><span>Nome da zona</span><span>Sacos contados</span></div><div id="count-zones">${(preferences.zoneNames?.length ? preferences.zoneNames : ['Zona 1']).map((label,i) => countZoneRow(i + 1,label)).join('')}</div><button type="button" class="btn ghost small" data-count-add-zone>${icon('plus')}Adicionar zona</button></div><details class="count-optional"><summary>Substrato e fornecedor <span>opcional</span></summary>${input('kind','Tipo de substrato / referência',preferences.kind ?? '', 'maxlength="300"')}${input('supplier','Fornecedor',preferences.supplier ?? '', 'maxlength="300"')}</details><label class="continue-count"><input type="checkbox" name="continue" checked>Continuar para a próxima linha</label><p class="inline-note">Cada contagem cria uma nova linha. Para corrigir uma contagem já guardada, abre o registo dessa linha.</p>`;
  openModal('Contar nova linha', esc(house.name), fields, form => {
    let result;
    const options = { sectorId: form.get('sectorId'), sectorName: form.get('sectorName'), lineName: form.get('lineName'), date: form.get('date'), quantity: form.get('quantity'), kind: form.get('kind'), supplier: form.get('supplier') };
    if (form.get('mode') === 'zones') options.zones = form.getAll('zoneName').map((name,i) => ({ name, quantity: form.getAll('zoneQuantity')[i] }));
    change(next => { result = countNewLine(current(next).house, options); });
    selectedSector = result.sectorId; selectedLine = result.lineId; zoneFilter = '*';
    countingDefaults = { sectorId: result.sectorId, mode: form.get('mode'), zoneNames: options.zones?.map(z => z.name), date: options.date, kind: options.kind, supplier: options.supplier };
    render();
    if (form.has('continue')) queueMicrotask(() => countLineForm());
  }, { label: 'Guardar e próxima linha' });
  modal.querySelector('[name="lineName"]').dataset.autoName = nextLineName(defaultSector);
  setCountMode(preferences.mode === 'zones');
}
function countZoneRow(index, label = `Zona ${index}`) {
  return `<div class="count-zone-row">${input('zoneName', 'Zona', label, 'required')}${input('zoneQuantity', 'Sacos', '', 'required min="0" max="10000000" step="1" placeholder="0"', 'number')}<button type="button" data-count-remove-zone class="icon-button" aria-label="Remover zona">×</button></div>`;
}
function setCountMode(zones) {
  for (const [id, hidden] of [['whole-count', zones], ['zone-count', !zones]]) {
    const node = modal.querySelector(`#${id}`); if (!node) return;
    node.hidden = hidden; node.querySelectorAll('input').forEach(el => { el.disabled = hidden; });
  }
}
modal.addEventListener('change', event => {
  const field = event.target;
  if (field.name === 'mode') setCountMode(field.value === 'zones');
  if (field.name === 'continue') modal.querySelector('[type="submit"]').textContent = field.checked ? 'Guardar e próxima linha' : 'Guardar linha';
  if (field.id === 'count-sector') {
    const newField = modal.querySelector('#new-sector-field'); newField.hidden = field.value !== '__new';
    newField.querySelector('input').disabled = newField.hidden; newField.querySelector('input').required = !newField.hidden;
    const lineField = modal.querySelector('[name="lineName"]');
    const proposed = nextLineName(current().house.sectors.find(s => s.id === field.value));
    if (lineField.value === lineField.dataset.autoName) lineField.value = proposed;
    lineField.dataset.autoName = proposed;
  }
});
modal.addEventListener('click', event => {
  if (event.target.closest('[data-count-add-zone]')) {
    const rows = modal.querySelector('#count-zones');
    if (rows.children.length >= 100) return;
    let index = rows.children.length + 1;
    const used = [...rows.querySelectorAll('[name="zoneName"]')].map(el => el.value);
    while (used.includes(`Zona ${index}`)) index++;
    rows.insertAdjacentHTML('beforeend', countZoneRow(index));
    rows.lastElementChild.querySelector('[name="zoneName"]').focus();
  }
  const remove = event.target.closest('[data-count-remove-zone]');
  if (remove && modal.querySelectorAll('.count-zone-row').length > 1) remove.closest('.count-zone-row').remove();
});
