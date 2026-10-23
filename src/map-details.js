import { referenceImage } from './regional-map.js';

export { referenceImage };

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

const number = value => new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 }).format(value);
const safe = escapeHtml;
const initials = name => name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('pt-PT');
const list = values => `<ul class="detail-list">${values.map(value => `<li>${safe(value)}</li>`).join('')}</ul>`;

function coordinate(site) {
  const point = site.coordenadas;
  return point && Number.isFinite(point.lat) && Number.isFinite(point.lng)
    && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180
    ? `${point.lat.toFixed(7)}, ${point.lng.toFixed(7)}` : null;
}

function mapsLink(site) {
  const source = site.maps_url || site.coordenadas?.source_url;
  try {
    const url = new URL(source);
    if (url.protocol === 'https:' && !url.username && !url.password
      && ['maps.app.goo.gl', 'www.google.com', 'maps.google.com'].includes(url.hostname)) return url.href;
  } catch { /* A missing or invalid source should not become an executable link. */ }
  return null;
}

function teamRows(site, data) {
  const rows = new Map();
  for (const assignment of data.assignments || []) {
    if (assignment.siteId !== site.id) continue;
    const person = data.people?.find(candidate => candidate.id === assignment.personId);
    if (!person) continue;
    if (!rows.has(person.id)) rows.set(person.id, { person, roles: [] });
    const roles = rows.get(person.id).roles;
    if (!roles.includes(assignment.role)) roles.push(assignment.role);
  }
  if (!rows.size) return '<p class="detail-note">Responsáveis por confirmar nos dados fornecidos.</p>';
  return `<div class="detail-team">${[...rows.values()].map(({ person, roles }) => `
    <div class="person-row" data-person-id="${safe(person.id)}">
      <span class="person-avatar" aria-hidden="true">${safe(initials(person.name))}</span>
      <span class="person-name">${safe(person.name)}</span>
      <span class="person-role">${safe(roles.join(' · '))}</span>
    </div>`).join('')}</div>`;
}

function generalTeam(data) {
  const rows = [];
  for (const role of data.companyRoles || []) {
    const person = data.people?.find(candidate => candidate.id === role.personId);
    if (person) rows.push(`${person.name} — ${role.role}`);
  }
  const equipment = data.people?.find(person => person.id === 'rafael');
  if (equipment) rows.push(`${equipment.name} — equipamentos e apoio à construção de novas estufas`);
  return rows.length ? `<section class="detail-section detail-general">
    <h3>Responsabilidades transversais</h3>
    ${list(rows)}
  </section>` : '';
}

function history(site) {
  if (!site.periodos?.length) return '';
  return `<section class="detail-section detail-history"><h3>Histórico de culturas</h3>${list(
    site.periodos.map(period => `${period.cultura}${period.setor ? ` · ${period.setor}` : ''} — ${period.inicio} a ${period.fim || 'em curso'}`),
  )}</section>`;
}

/** Read-only information supplied for a farm; geographic pins are not footprints. */
export function renderSiteDetails(site, data) {
  const image = referenceImage(site);
  const headquarters = site.id === 'sede';
  const construction = site.estado === 'em_construcao';
  const point = coordinate(site);
  const source = mapsLink(site);
  const special = [];
  if (site.numero_estufas) special.push(`${number(site.numero_estufas)} estufas`);
  if (site.estrutura) special.push(site.estrutura);
  if (site.niveis_terreno) special.push(`${number(site.niveis_terreno)} níveis de terreno`);
  if (site.numero_variedades_aproximado) special.push(`Cerca de ${number(site.numero_variedades_aproximado)} variedades de tomate`);
  if (site.observacoes) special.push(site.observacoes);
  if (site.identidade_david_manutencao) special.push(site.identidade_david_manutencao);
  const crops = (site.culturas_atuais || []).map(crop => `<span class="crop-pill">${safe(crop)}</span>`).join('');
  return `
    <div class="detail-hero">
      ${image ? `<button class="detail-photo" data-enlarge-photo="${safe(site.id)}" aria-label="Ampliar imagem aérea de ${safe(site.nome)}">
        <img src="${safe(image)}" alt="Imagem aérea fornecida de ${safe(site.nome)}" decoding="async">
        <span class="detail-photo-expand" aria-hidden="true">Ampliar ↗</span>
      </button>` : '<div class="detail-photo-missing">Imagem aérea não fornecida</div>'}
      <p class="detail-photo-caption">Imagem aérea enviada · referência guardada, sem atualização em direto</p>
    </div>
    <div class="detail-heading">
      <p class="detail-kicker detail-eyebrow">${headquarters ? 'Sede e logística' : site.tipo === 'demonstracao_ensaios' ? 'Demonstração e ensaios' : 'Exploração agrícola'}</p>
      <h2 class="detail-title">${safe(site.nome)}</h2>
      <div class="detail-meta"><span class="detail-badge${construction ? ' detail-badge-construction' : ''}">${headquarters ? 'Receção e expedição' : construction ? 'Em construção' : 'Culturas declaradas'}</span></div>
    </div>
    ${!headquarters && Number.isFinite(site.area_ha) ? `<div class="detail-grid">
      <div class="detail-stat"><span>${site.area_e_projetada ? 'Área projetada' : 'Área declarada'}</span><strong>${number(site.area_ha)} <small>ha</small></strong></div>
      ${construction && Number.isFinite(site.area_quase_concluida_ha) ? `<div class="detail-stat"><span>Quase concluída</span><strong>≈ ${number(site.area_quase_concluida_ha)} <small>ha</small></strong></div>` : `<div class="detail-stat"><span>Culturas</span><strong>${number(site.culturas_atuais?.length || 0)}</strong></div>`}
    </div>` : ''}
    ${headquarters ? `<section class="detail-section"><h3>Atividade da sede</h3>${list(site.funcoes || [])}</section>` : `<section class="detail-section">
      <h3>${construction ? 'Situação da exploração' : 'Culturas atuais'}</h3>
      ${construction ? '<p class="detail-note">Construção de novas estufas. A área projetada e a área quase concluída não representam área em produção.</p>' : crops ? `<div class="detail-crops">${crops}</div>` : '<p class="detail-note">Culturas por confirmar.</p>'}
    </section>`}
    ${special.length ? `<section class="detail-section"><h3>Sobre este local</h3>${list(special)}</section>` : ''}
    ${site.tipologias?.length ? `<section class="detail-section"><h3>Tipologias em demonstração</h3>${list(site.tipologias)}</section>` : ''}
    ${!headquarters ? `<section class="detail-section"><h3>Equipa desta exploração</h3>${teamRows(site, data)}</section>` : ''}
    ${generalTeam(data)}
    ${history(site)}
    <section class="detail-section detail-location">
      <h3>Localização</h3>
      ${point ? `<div class="coordinate-box"><code>${safe(point)}</code><button type="button" data-copy-coordinates="${safe(point)}" aria-label="Copiar coordenadas de ${safe(site.nome)}">Copiar</button></div>
        <p class="detail-note">${site.coordenadas.source === 'user_shared_maps_link' ? 'Ponto do link Maps fornecido.' : 'Coordenadas guardadas para este local.'} O ponto não define o limite de cada estufa.</p>` : '<p class="detail-note">Coordenadas ainda por confirmar.</p>'}
      ${source ? `<div class="detail-actions"><a class="external-link" href="${safe(source)}" target="_blank" rel="noopener noreferrer">Abrir o link original no Google Maps <span aria-hidden="true">↗</span></a></div>` : ''}
      ${site.id === 'ritual' ? '<p class="detail-note detail-provenance">O link e a imagem fornecidos para Ritual Frutado apresentam a designação «Greenhouse Vale da Borra-GPP». A correspondência dos nomes continua por confirmar; os locais não foram fundidos.</p>' : ''}
    </section>`;
}

/** The enclosing native dialog and its close behavior are owned by the app. */
export function renderPhotoDialogContent(site) {
  const image = referenceImage(site);
  return `<div class="photo-dialog-heading"><h2>${safe(site.nome)}</h2><button type="button" data-close-photo aria-label="Fechar imagem aérea">Fechar ×</button></div>
    ${image ? `<img class="photo-dialog-image" src="${safe(image)}" alt="Imagem aérea original fornecida de ${safe(site.nome)}">` : '<p>Imagem aérea não fornecida.</p>'}
    <p class="photo-dialog-caption">Referência aérea fornecida para este local. A imagem mantém as anotações e atribuições originais; não é uma fotografia em direto.</p>`;
}
