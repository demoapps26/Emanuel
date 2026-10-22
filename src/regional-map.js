import { confirmedLocations, projectMetres } from './geography.js';
const images = import.meta.glob(['../materiais/Patricia_Pilar_Mundo_3D_Codex/referencias/*.png', '!../materiais/Patricia_Pilar_Mundo_3D_Codex/referencias/conceito_visual_*.png'], { eager: true, query: '?inline', import: 'default' });
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, text = '') => {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  node.textContent = text;
  return node;
};
export function mountRegionalMap(host, data, onSelect) {
  const locations = confirmedLocations(data);
  const origin = { lat: 39.15, lng: -9.30 };
  const points = locations.map(p => ({ ...p, ...projectMetres(p, origin) }));
  const controls = document.createElement('div'); controls.className = 'regional-controls';
  controls.innerHTML = '<button class="secondary" data-fit="north">Oeste</button><button class="secondary" data-fit="all">Todos os locais</button><button class="secondary" data-zoom="in" aria-label="Aproximar mapa">+</button><button class="secondary" data-zoom="out" aria-label="Afastar mapa">−</button>';
  host.append(controls);
  const svg = el('svg', { viewBox: '0 0 900 540', role: 'img', 'aria-label': 'Localizações geográficas extraídas dos links fornecidos. Norte em cima; escala métrica aproximada.' });
  svg.classList.add('regional-map'); host.append(svg);
  let view, drag;
  function fit(all) {
    const subset = points.filter(p => all || p.lat > 39);
    if (!subset.length) return;
    const xs = subset.map(p => p.x), ys = subset.map(p => p.y);
    const w = Math.max(1000, Math.max(...xs) - Math.min(...xs)), h = Math.max(1000, Math.max(...ys) - Math.min(...ys));
    const span = Math.max(w * 1.35, h * 1.35 * 900 / 540);
    view = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, span };
    draw();
  }
  function draw() {
    svg.replaceChildren();
    const scale = 900 / view.span;
    const at = p => ({ x: 450 + (p.x - view.x) * scale, y: 270 + (p.y - view.y) * scale });
    svg.append(el('rect', { x: 0, y: 0, width: 900, height: 540, fill: '#e7ede3' }));
    const grid = 10 ** Math.floor(Math.log10(view.span / 5));
    for (let x = Math.floor((view.x-view.span/2)/grid)*grid; x < view.x+view.span/2; x += grid) {
      const px = at({x,y:0}).x;
      svg.append(el('path', { d:`M ${px} 0 V 540`, stroke:'#ccd6c7', 'stroke-width':1 }));
    }
    for (let y = Math.floor((view.y-view.span*.3)/grid)*grid; y < view.y+view.span*.3; y += grid) {
      const py = at({x:0,y}).y;
      svg.append(el('path', { d:`M 0 ${py} H 900`, stroke:'#ccd6c7', 'stroke-width':1 }));
    }
    for (const [i,p] of points.entries()) {
      const pos = at(p);
      if (pos.x < -20 || pos.x > 920 || pos.y < -20 || pos.y > 560) continue;
      const g = el('g', { 'data-location':p.id, tabindex:0, role:'button', 'aria-label':p.name });
      g.append(el('circle', { cx:pos.x,cy:pos.y,r:10,fill:p.id==='sede'?'#b27537':'#17664b',stroke:'white','stroke-width':3 }));
      const t = el('text', { x:pos.x+14,y:pos.y+(i%2?19:-12),fill:'#143b2f','font-size':13,'paint-order':'stroke',stroke:'#e7ede3','stroke-width':4,'stroke-linejoin':'round' },p.name);
      g.append(t,el('title',{},`${p.name} · ${p.lat}, ${p.lng}`));
      g.onclick = () => onSelect(p.id);
      g.onkeydown = e => { if (e.key==='Enter'||e.key===' ') {e.preventDefault();onSelect(p.id);} };
      svg.append(g);
    }
    const barMetres = 10 ** Math.floor(Math.log10(view.span / 5));
    const bar = Math.max(1,Math.floor(view.span/5/barMetres))*barMetres;
    svg.append(el('rect',{x:20,y:484,width:210,height:42,rx:5,fill:'#fff',opacity:.9}));
    svg.append(el('path',{d:`M 32 499 v 9 h ${bar*scale} v -9`,stroke:'#153e30','stroke-width':2,fill:'none'}));
    svg.append(el('text',{x:32,y:521,'font-size':12,fill:'#153e30'},bar>=1000?`${bar/1000} km`:`${bar} m`));
    svg.append(el('text',{x:859,y:32,'font-size':18,fill:'#153e30'},'↑ N'));
  }
  function zoom(factor) { view.span=Math.min(250000,Math.max(250,view.span*factor));draw(); }
  controls.querySelector('[data-fit="north"]').onclick=()=>fit(false);
  controls.querySelector('[data-fit="all"]').onclick=()=>fit(true);
  controls.querySelector('[data-zoom="in"]').onclick=()=>zoom(.65);
  controls.querySelector('[data-zoom="out"]').onclick=()=>zoom(1.5);
  svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.2:.8);},{passive:false});
  svg.addEventListener('pointerdown',e=>{ if(e.target.closest('[data-location]'))return; drag={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y};svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove',e=>{if(!drag)return;const s=view.span/svg.getBoundingClientRect().width;view.x=drag.vx-(e.clientX-drag.x)*s;view.y=drag.vy-(e.clientY-drag.y)*s;draw();});
  svg.addEventListener('pointerup',()=>drag=null);
  svg.addEventListener('pointercancel',()=>drag=null);
  fit(false);
}
export function referenceImage(site) {
  const path = '../materiais/Patricia_Pilar_Mundo_3D_Codex/'+site.referencia_imagem;
  return images[path] || null;
}
