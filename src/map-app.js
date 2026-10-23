import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './map-app.css';
import { loadData } from './data.js';
import { createMapSites, filterMapSites, mapSummary } from './map-model.js';
import { renderSiteDetails, referenceImage, escapeHtml as esc } from './map-details.js';
import contextText from '../dados/mapa-contexto.geojson?raw';
import kmlText from '../dados/Exploracoes_Patricia_Pilar.kml?raw';

const icons = {
  leaf: '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M26 5C10 4 5 12 9 20c7 6 17 0 17-15Z" fill="currentColor"/><path d="M6 27 21 12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="1.7"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
};
let storage;
try { storage = localStorage; } catch { storage = { getItem: () => null }; }
const { data, warning } = loadData(storage);
const sites = createMapSites(data), summary = mapSummary(data);
const format = value => new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 }).format(value);
const crops = [...new Set(sites.flatMap(site => site.culturas_atuais || []))].sort((a, b) => a.localeCompare(b, 'pt'));
const assigned = new Set([...data.assignments.map(a => a.personId), ...data.companyRoles.map(r => r.personId)]);
const people = data.people.filter(p => assigned.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'pt'));

document.querySelector('#app').innerHTML = `
  <header class="topbar" id="topbar">
    <a class="brand" href="#" aria-label="Mapa das explorações · início"><span class="brand-mark">${icons.leaf}</span><span class="brand-copy"><strong>Grupo Patrícia Pilar</strong><small>MAPA DAS EXPLORAÇÕES</small></span></a>
    <span class="header-count">${summary.locations} locais · ${summary.farms} explorações e sede</span>
    <nav class="header-actions" aria-label="Navegação do mapa">
      <button class="button button-ghost" id="show-list" aria-controls="sidebar" aria-expanded="false">Explorações</button>
      <button class="button button-ghost" id="fit-west">Oeste</button>
      <button class="button button-primary" id="fit-all">Todos os locais</button>
      <button class="button button-ghost help-button" id="help" aria-label="Ajuda e origem dos dados">?</button>
    </nav>
  </header>
  <aside id="sidebar" aria-label="Explorações e filtros">
    <div class="sidebar-heading"><span class="eyebrow">DA TERRA PARA O MUNDO</span><h1>As nossas explorações</h1><p class="sidebar-subtitle">Escolhe um local no mapa ou na lista.</p></div>
    <div class="summary-bar"><div class="summary-stat"><strong>${summary.farms}</strong><small>explorações</small></div><div class="summary-stat"><strong>${format(summary.declaredArea)} <span>ha</span></strong><small>área declarada¹</small></div><div class="summary-stat"><strong>${format(summary.projectedArea)} <span>ha</span></strong><small>em projeto</small></div></div>
    <div class="filters"><label class="search-label" for="search">Pesquisar local, cultura ou pessoa</label><div class="search-box">${icons.search}<input id="search" type="search" placeholder="Ex.: Framboesa, pepino, César…" autocomplete="off"></div>
      <div class="filter-row"><div class="filter-field"><label for="crop-filter">Cultura / tipo</label><select id="crop-filter"><option value="">Todos os tipos</option>${crops.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}<option value="__construction">Em construção</option><option value="__headquarters">Sede e logística</option></select></div><div class="filter-field"><label for="person-filter">Pessoa associada</label><select id="person-filter"><option value="">Todas as pessoas</option>${people.map(p => `<option value="${esc(p.id)}">${esc(p.name)}${p.id.includes('manutencao') ? ' · manutenção' : ''}</option>`).join('')}</select></div></div>
    </div>
    <div class="results-heading"><span id="result-count" role="status" aria-live="polite"></span><button id="clear-filters" class="text-button" hidden>Limpar filtros</button></div>
    <div id="site-list"></div>
    <p class="sidebar-footnote">¹ Área declarada das explorações, excluindo o projeto das Deusas. Pontos dos links Maps enviados.</p>
  </aside>
  <main class="map-shell" aria-label="Mapa interativo">
    <div id="map" aria-label="Localizações das explorações" data-selected="" data-layer="satellite"></div>
    <div class="map-layer-switch" role="group" aria-label="Fundo do mapa"><button class="map-layer-button active" data-layer="satellite" aria-pressed="true">Satélite</button><button class="map-layer-button" data-layer="streets" aria-pressed="false">Mapa</button><button class="map-layer-button" data-layer="reference" aria-pressed="false">Sem rede</button></div>
    <div class="map-intro" id="map-intro">${icons.pin}<span><strong>Uma localização, toda a informação.</strong><br>Clica num ponto para ver culturas, equipa e imagem aérea.</span></div>
    <div class="map-legend"><span><i class="legend-dot"></i>Exploração</span><span><i class="legend-dot construction"></i>Construção</span><span><i class="legend-dot headquarters"></i>Sede</span></div>
    <div id="map-status" role="status" aria-live="polite"><span id="map-status-text">A carregar o fundo satélite…</span><button id="retry-tiles" class="status-retry" hidden>Tentar novamente</button></div>
  </main>
  <aside id="details" aria-label="Informação do local" hidden><button class="close-details" id="close-details" aria-label="Fechar informação do local">×</button><div id="detail-content"></div></aside>
  <dialog id="photo-dialog" aria-labelledby="photo-title"><header class="photo-toolbar"><h2 id="photo-title"></h2><div class="photo-tools"><button id="photo-zoom-out" aria-label="Afastar imagem">−</button><span id="photo-zoom-label" aria-live="polite">100%</span><button id="photo-zoom-in" aria-label="Ampliar imagem">+</button><button id="photo-reset">Ajustar</button><button id="photo-close" aria-label="Fechar imagem aérea">Fechar ×</button></div></header><div id="photo-stage" class="photo-stage"><img id="full-photo" alt="" draggable="false"></div><p class="photo-caption">Imagem aérea fornecida · Arrasta para deslocar e usa + / − ou a roda para ampliar. As anotações e atribuições originais são preservadas.</p></dialog>
  <dialog id="help-dialog" aria-labelledby="help-title"><div class="dialog-card"><button class="close-dialog" id="close-help" aria-label="Fechar ajuda">×</button><span class="eyebrow">SOBRE ESTE MAPA</span><h2 id="help-title">Os locais e a informação que enviaste.</h2><p>Este mapa mostra os <strong>14 pontos dos links Maps fornecidos</strong>, incluindo Framboesa Encantada 2 e a sede. Os pontos não delimitam os terrenos ou cada estufa individual.</p><p>Clica num ponto ou escolhe uma exploração na lista. Podes pesquisar por nome, cultura ou pessoa e ampliar a imagem aérea enviada.</p><p><strong>Imagens aéreas:</strong> as fotografias de referência ficam incluídas neste ficheiro. O fundo satélite Esri e o mapa OpenStreetMap precisam de Internet e têm datas e cobertura próprias; não são imagens em direto.</p><p><strong>Sem ligação:</strong> os pontos, as fichas e as imagens enviadas continuam disponíveis sobre uma base vetorial de referência Natural Earth. Essa base não inclui ruas ou pormenores das estufas.</p><p>Os dados descritivos vêm dos materiais fornecidos e das edições guardadas neste navegador, quando disponíveis. As posições usam os pontos originais dos links. Não foram inventados limites das estufas ou responsáveis em falta.</p><button class="button button-primary" id="download-kml">Transferir localizações · KML</button><p class="data-date">Dados iniciais recolhidos em 22/10/2026 · 13 explorações + sede</p></div></dialog>
  <div id="toast" role="status" aria-live="polite" hidden></div>`;

const $ = selector => document.querySelector(selector);
const mapElement = $('#map'), detailPanel = $('#details');
const map = L.map(mapElement, { zoomControl: false, minZoom: 5, maxZoom: 20, preferCanvas: true, fadeAnimation: false });
L.control.zoom({ position: 'topleft' }).addTo(map);
L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);
map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>');
map.createPane('offline-context');
map.getPane('offline-context').style.zIndex = 150;
L.geoJSON(JSON.parse(contextText), { pane: 'offline-context', interactive: false, style: { color: '#a3b7a6', weight: 1, fillColor: '#e4eadc', fillOpacity: 1 }, attribution: 'Base vetorial: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a> · domínio público' }).addTo(map);

const labels = L.layerGroup();
for (const [name, lat, lng] of [['Torres Vedras', 39.0911, -9.2586], ['Lourinhã', 39.2417, -9.3125], ['Bombarral', 39.2673, -9.1578], ['Campelos', 39.1976, -9.2377], ['Alcochete', 38.7553, -8.9616], ['Lisboa', 38.7223, -9.1393]]) {
  L.marker([lat, lng], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'context-place', html: esc(name), iconSize: [110, 20], iconAnchor: [55, 10] }) }).addTo(labels);
}
let selectedId = null, shown = sites, currentLayer = 'satellite', activeTiles = null, tileFailures = 0, tileLoaded = 0, loadTimer;
const markers = new Map();
function pinIcon(site, selected = false) {
  return L.divIcon({ className: `farm-pin ${site.category === 'construction' ? 'construction' : site.category === 'headquarters' ? 'headquarters' : ''}${selected ? ' selected' : ''}`, html: `<span class="pin-inner" data-pin="${esc(site.id)}" data-lat="${site.coordenadas.lat}" data-lng="${site.coordenadas.lng}">${String(site.number).padStart(2, '0')}</span>`, iconSize: [36, 44], iconAnchor: [18, 42], tooltipAnchor: [0, -40] });
}
for (const site of sites) {
  const marker = L.marker([site.coordenadas.lat, site.coordenadas.lng], { icon: pinIcon(site), keyboard: true, title: site.nome, alt: `Abrir ${site.nome}`, riseOnHover: true });
  marker.bindTooltip(esc(site.nome), { direction: 'top', className: 'site-tooltip' });
  marker.on('click', () => selectSite(site.id));
  marker.on('keydown', event => {
    if (event.originalEvent.key === 'Enter' || event.originalEvent.key === ' ') {
      L.DomEvent.stop(event.originalEvent);
      selectSite(site.id);
    }
  });
  markers.set(site.id, marker);
}
function toast(message) {
  $('#toast').textContent = message; $('#toast').hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').hidden = true, 4200);
}
function setListOpen(open) {
  document.body.classList.toggle('list-open', open); $('#show-list').setAttribute('aria-expanded', String(open));
  setTimeout(() => map.invalidateSize(), 100);
}
function renderList() {
  $('#result-count').textContent = `${shown.length} ${shown.length === 1 ? 'local' : 'locais'}`;
  $('#clear-filters').hidden = !($('#search').value || $('#crop-filter').value || $('#person-filter').value);
  $('#site-list').innerHTML = shown.length ? shown.map(site => `<button class="site-card${site.id === selectedId ? ' selected' : ''}" data-site="${esc(site.id)}" aria-pressed="${site.id === selectedId}"><span class="site-thumb"><img src="${esc(referenceImage(site))}" alt="" loading="lazy" decoding="async"><span class="site-number">${String(site.number).padStart(2, '0')}</span></span><span class="site-card-copy"><h3>${esc(site.nome)}</h3><span class="site-meta">${site.id === 'sede' ? 'Sede e logística' : `${format(site.area_ha)} ha${site.area_e_projetada ? ' projetados' : ''}`} · ${esc(site.region)}</span><span class="site-badges">${site.category === 'construction' ? '<span class="site-badge construction">Em construção</span>' : site.id === 'sede' ? '<span class="site-badge headquarters">Sede</span>' : (site.culturas_atuais || []).map(crop => `<span class="site-badge">${esc(crop)}</span>`).join('')}</span></span><span class="site-arrow" aria-hidden="true">↗</span></button>`).join('') : '<div class="empty-state"><strong>Nenhum local encontrado.</strong><p>Experimenta outro nome, cultura ou pessoa.</p><button class="button" data-clear-filters>Limpar filtros</button></div>';
  for (const [id, marker] of markers) {
    const visible = shown.some(site => site.id === id);
    if (visible && !map.hasLayer(marker)) marker.addTo(map);
    if (!visible && map.hasLayer(marker)) marker.remove();
    marker.setIcon(pinIcon(sites.find(site => site.id === id), id === selectedId));
    if (id === selectedId) marker.setZIndexOffset(1000);
    else marker.setZIndexOffset(0);
  }
  mapElement.dataset.visibleCount = shown.length;
}
function fitSites(subset) {
  if (!subset.length) return;
  const bounds = L.latLngBounds(subset.map(site => [site.coordenadas.lat, site.coordenadas.lng]));
  map.fitBounds(bounds, { paddingTopLeft: [50, 85], paddingBottomRight: [50, 85], maxZoom: subset.length === 1 ? 16 : 14, animate: false });
}
function focusSite(site) {
  map.setView([site.coordenadas.lat, site.coordenadas.lng], 16, { animate: false });
  if (innerWidth > 760) map.panBy([detailPanel.getBoundingClientRect().width / 2 + 8, 0], { animate: false });
  else map.panBy([0, detailPanel.getBoundingClientRect().height / 2 - 12], { animate: false });
}
function selectSite(id, focus = true) {
  const site = sites.find(site => site.id === id);
  if (!site) return;
  selectedId = id; $('#detail-content').innerHTML = renderSiteDetails(site, data); detailPanel.hidden = false;
  $('#map-intro').hidden = true; mapElement.dataset.selected = id;
  document.body.classList.add('detail-open'); setListOpen(false); renderList();
  if (focus) focusSite(site);
  try { history.replaceState(null, '', `#${encodeURIComponent(id)}`); } catch { /* Some local HTML viewers restrict history changes. */ }
}
function closeDetails() {
  detailPanel.hidden = true; document.body.classList.remove('detail-open');
  selectedId = null; mapElement.dataset.selected = ''; renderList();
  try { history.replaceState(null, '', `${location.pathname}${location.search}`); } catch { /* Local viewers may restrict history. */ }
}
function applyFilters() {
  shown = filterMapSites(sites, data, { query: $('#search').value, crop: $('#crop-filter').value, person: $('#person-filter').value });
  if (selectedId && !shown.some(site => site.id === selectedId)) closeDetails();
  renderList(); fitSites(shown);
}
function clearFilters() { $('#search').value = ''; $('#crop-filter').value = ''; $('#person-filter').value = ''; applyFilters(); }
function mapStatus(message, offline = false) {
  $('#map-status-text').textContent = message; $('#map-status').classList.toggle('warning', offline);
  $('#retry-tiles').hidden = !offline;
}
function offlineFallback(layer) {
  if (activeTiles !== layer) return;
  layer.remove(); activeTiles = null; clearTimeout(loadTimer); labels.addTo(map);
  mapElement.dataset.baseState = 'offline';
  mapStatus('Fundo indisponível nesta ligação. Localizações e fotos enviadas continuam acessíveis.', true);
}
function setLayer(kind) {
  clearTimeout(loadTimer);
  if (activeTiles) { activeTiles.off(); activeTiles.remove(); }
  activeTiles = null; currentLayer = kind; tileFailures = 0; tileLoaded = 0;
  mapElement.dataset.layer = kind;
  for (const button of document.querySelectorAll('[data-layer].map-layer-button')) {
    button.classList.toggle('active', button.dataset.layer === kind); button.setAttribute('aria-pressed', String(button.dataset.layer === kind));
  }
  if (kind === 'reference') {
    labels.addTo(map); mapElement.dataset.baseState = 'reference';
    mapStatus('Base vetorial de referência · Sem ruas ou imagem satélite · Fotos enviadas nas fichas.'); return;
  }
  labels.remove();
  const layer = kind === 'satellite'
    ? L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 19, maxZoom: 20, attribution: 'Imagens © Esri · Esri, Maxar, Earthstar Geographics e comunidade GIS', keepBuffer: 1, updateWhenIdle: true, crossOrigin: true })
    : L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxNativeZoom: 19, maxZoom: 20, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors', keepBuffer: 1, updateWhenIdle: true, crossOrigin: true });
  activeTiles = layer; mapElement.dataset.baseState = 'loading';
  mapStatus(kind === 'satellite' ? 'A carregar o fundo satélite…' : 'A carregar o mapa de ruas…');
  layer.on('tileload', () => { if (activeTiles !== layer) return; tileLoaded++; clearTimeout(loadTimer); mapElement.dataset.baseState = 'available'; mapStatus(kind === 'satellite' ? 'Fundo satélite · Esri · Fotografias enviadas na ficha de cada local.' : 'Mapa de ruas · OpenStreetMap · Pontos dos links fornecidos.'); });
  layer.on('tileerror', () => { if (activeTiles === layer && ++tileFailures >= 3 && !tileLoaded) offlineFallback(layer); });
  layer.addTo(map);
  loadTimer = setTimeout(() => { if (!tileLoaded) offlineFallback(layer); }, 12000);
}

let photoScale = 1, photoX = 0, photoY = 0, photoDrag = null, previousPhotoFocus = null;
function renderPhotoTransform() {
  $('#full-photo').style.transform = `translate(${photoX}px,${photoY}px) scale(${photoScale})`;
  $('#photo-zoom-label').textContent = `${Math.round(photoScale * 100)}%`;
  $('#photo-stage').dataset.scale = photoScale; $('#photo-stage').classList.toggle('zoomed', photoScale > 1);
}
function zoomPhoto(factor) { photoScale = Math.max(1, Math.min(6, photoScale * factor)); if (photoScale === 1) photoX = photoY = 0; renderPhotoTransform(); }
function openPhoto(id) {
  const site = sites.find(site => site.id === id), image = site && referenceImage(site);
  if (!image) return;
  previousPhotoFocus = document.activeElement;
  $('#photo-title').textContent = site.nome; $('#full-photo').src = image; $('#full-photo').alt = `Imagem aérea original de ${site.nome}`;
  photoScale = 1; photoX = photoY = 0; renderPhotoTransform(); $('#photo-dialog').showModal();
}
$('#photo-zoom-in').onclick = () => zoomPhoto(1.3);
$('#photo-zoom-out').onclick = () => zoomPhoto(1 / 1.3);
$('#photo-reset').onclick = () => { photoScale = 1; photoX = photoY = 0; renderPhotoTransform(); };
$('#photo-close').onclick = () => $('#photo-dialog').close();
$('#photo-dialog').addEventListener('close', () => { photoDrag = null; previousPhotoFocus?.focus(); });
$('#photo-stage').addEventListener('wheel', event => { event.preventDefault(); zoomPhoto(event.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
$('#photo-stage').addEventListener('pointerdown', event => { if (photoScale <= 1) return; photoDrag = { x: event.clientX, y: event.clientY, ox: photoX, oy: photoY }; event.currentTarget.setPointerCapture(event.pointerId); });
$('#photo-stage').addEventListener('pointermove', event => { if (!photoDrag) return; photoX = photoDrag.ox + event.clientX - photoDrag.x; photoY = photoDrag.oy + event.clientY - photoDrag.y; renderPhotoTransform(); });
for (const event of ['pointerup', 'pointercancel']) $('#photo-stage').addEventListener(event, () => photoDrag = null);
$('#detail-content').addEventListener('click', async event => {
  const photo = event.target.closest('[data-enlarge-photo]'); if (photo) openPhoto(photo.dataset.enlargePhoto);
  const copy = event.target.closest('[data-copy-coordinates]');
  if (copy) {
    try { await navigator.clipboard.writeText(copy.dataset.copyCoordinates); toast('Coordenadas copiadas.'); }
    catch { const text = copy.parentElement.querySelector('code'); const selection = getSelection(), range = document.createRange(); range.selectNodeContents(text); selection.removeAllRanges(); selection.addRange(range); toast('Coordenadas selecionadas. Usa Ctrl+C para copiar.'); }
  }
});
$('#site-list').addEventListener('click', event => { const button = event.target.closest('[data-site]'); if (button) selectSite(button.dataset.site); if (event.target.closest('[data-clear-filters]')) clearFilters(); });
$('#close-details').onclick = closeDetails;
$('#search').addEventListener('input', applyFilters);
$('#crop-filter').onchange = applyFilters; $('#person-filter').onchange = applyFilters;
$('#clear-filters').onclick = clearFilters;
$('#show-list').onclick = () => { if (!detailPanel.hidden) closeDetails(); setListOpen(!document.body.classList.contains('list-open')); };
$('#fit-all').onclick = () => { clearFilters(); closeDetails(); setListOpen(false); fitSites(sites); $('#map-intro').hidden = false; };
$('#fit-west').onclick = () => { closeDetails(); setListOpen(false); fitSites(shown.filter(site => site.region === 'Oeste')); };
for (const button of document.querySelectorAll('.map-layer-button')) button.onclick = () => setLayer(button.dataset.layer);
$('#retry-tiles').onclick = () => setLayer(currentLayer);
$('#help').onclick = () => $('#help-dialog').showModal(); $('#close-help').onclick = () => $('#help-dialog').close();
$('#download-kml').onclick = () => { const url = URL.createObjectURL(new Blob([kmlText], { type: 'application/vnd.google-earth.kml+xml' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'Exploracoes_Patricia_Pilar.kml'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
$('.brand').onclick = event => { event.preventDefault(); $('#fit-all').click(); };
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#photo-dialog').open && !$('#help-dialog').open) { closeDetails(); setListOpen(false); } });
addEventListener('resize', () => { map.invalidateSize(); if (selectedId) focusSite(sites.find(site => site.id === selectedId)); });
renderList(); fitSites(sites); setLayer('satellite');
if (innerWidth <= 760) setListOpen(true);
let initialId = '';
try { initialId = decodeURIComponent(location.hash.slice(1)); } catch { /* Ignore malformed URL fragments. */ }
if (sites.some(site => site.id === initialId)) selectSite(initialId);
if (warning) toast(warning);
