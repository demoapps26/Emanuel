const scene = document.querySelector('#landscape');
const map = document.querySelector('#minimap');
const panel = document.querySelector('#panel');
const overview = document.querySelector('#explorations-view');
function showOverview(){overview.hidden=false;const frame=document.querySelector('#regional-map-frame');if(!frame.dataset.checked){frame.dataset.checked='true';fetch('https://www.openstreetmap.org/',{mode:'no-cors',credentials:'omit',signal:AbortSignal.timeout(8000)}).then(()=>{frame.src=frame.dataset.src;frame.classList.add('available');}).catch(()=>{document.querySelector('.map-unavailable').innerHTML='O mapa regional não está disponível nesta ligação.<br>Use “Abrir mapa completo” para consultar o OpenStreetMap.';});}document.querySelector('#back-to-visit').focus();}
function hideOverview(){overview.hidden=true;document.querySelector('#explorations').focus();}
document.querySelector('#explorations').onclick=showOverview;
document.querySelector('#back-to-visit').onclick=hideOverview;
document.querySelector('#open-visit').onclick=hideOverview;
document.querySelector('#select-farm').onclick=()=>{document.querySelector('#select-farm').classList.add('selected');document.querySelector('#open-visit').focus();};
overview.addEventListener('keydown',e=>{if(e.key==='Escape')hideOverview();});
let x = 0, y = 0, zoom = 1, dragging = false, previousX = 0, previousY = 0, toastTimer;
function render() { scene.style.transform = `translate(${x}px,${y}px) scale(${zoom})`; document.querySelector('#map-player').style.translate = `${x / 6}px ${y / 6}px`; }
function move(dx,dy) { x = Math.max(-65,Math.min(65,x+dx)); y = Math.max(-35,Math.min(35,y+dy)); render(); }
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),3500); }
function toggleMap() { showOverview(); }
document.querySelector('#map-toggle').addEventListener('click',toggleMap);
document.querySelector('#map-toggle').setAttribute('aria-expanded','false');
scene.addEventListener('pointerdown',e=>{ dragging=true; previousX=e.clientX;previousY=e.clientY;scene.setPointerCapture(e.pointerId);scene.classList.add('dragging'); });
scene.addEventListener('pointermove',e=>{if(!dragging)return;move((e.clientX-previousX)*.35,(e.clientY-previousY)*.2);previousX=e.clientX;previousY=e.clientY;});
function release(){dragging=false;scene.classList.remove('dragging');}
scene.addEventListener('pointerup',release);scene.addEventListener('pointercancel',release);scene.style.touchAction='none';
document.querySelector('#zoom-in').onclick=()=>{zoom=Math.min(1.4,zoom+.1);render();};
document.querySelector('#zoom-out').onclick=()=>{zoom=Math.max(1,zoom-.1);render();};
const panels={
 farm:{eyebrow:'A NOSSA ORIGEM',title:'Tomates do Oeste',body:'<p>Uma perspetiva sobre a agricultura do Oeste: estufas de tomate e pepino, caminhos entre culturas e a proximidade à terra.</p><div class="facts"><div><strong>16 ha</strong><small>Área da exploração · referência visual</small></div><div><strong>Oeste</strong><small>Região de Portugal</small></div></div><p>Este é um protótipo visual inspirado na imagem de referência. Os dados da exploração devem ser confirmados antes de publicação.</p>'},
 vehicle:{eyebrow:'EXPLORAR A QUINTA',title:'Uma viagem pela origem.',body:'<p>O veículo é um ponto de acesso previsto para os percursos pela exploração.</p><p>Neste protótipo, pode explorar a imagem com o rato, aproximar os detalhes e abrir o minimapa. A condução e os percursos em 3D ainda não estão disponíveis.</p>'},
 about:{eyebrow:'DA TERRA, COM FUTURO',title:'A origem mais perto.',body:'<p>Um conceito de visita digital à exploração, inspirado no universo visual da Patrícia Pilar. Uma forma de aproximar as pessoas da paisagem e de quem a cultiva.</p><p>A cena é uma visualização ilustrativa. A navegação permite deslocar e ampliar a imagem; não representa um modelo 3D ou uma visita em tempo real.</p>'},
 help:{eyebrow:'AO SEU RITMO',title:'Olhe à sua volta.',body:'<p><strong>Arraste a imagem</strong> para mudar o enquadramento. Também pode usar W, A, S e D ou as setas.</p><p>Use <strong>+ e −</strong> para aproximar ou afastar, <strong>M</strong> para abrir o mapa e <strong>E</strong> para consultar o veículo. Selecione os pontos na imagem para descobrir mais.</p><p>Em dispositivos móveis, arraste com o dedo. Prima Escape para fechar uma janela.</p>'}
};
function openPanel(name){const item=panels[name];document.querySelector('#panel-eyebrow').textContent=item.eyebrow;document.querySelector('#panel-title').textContent=item.title;document.querySelector('#panel-body').innerHTML=item.body;if(!panel.open)panel.showModal();}
document.querySelectorAll('[data-panel]').forEach(button=>button.onclick=()=>openPanel(button.dataset.panel));
document.querySelector('#about').onclick=()=>openPanel('about');document.querySelector('#help').onclick=()=>openPanel('help');
document.querySelector('#close').onclick=()=>panel.close();document.querySelector('#panel-action').onclick=()=>panel.close();panel.addEventListener('click',e=>{if(e.target===panel){const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)panel.close();}});
document.addEventListener('keydown',e=>{if(panel.open||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('button,a,input,textarea,select'))return;const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key))e.preventDefault();if(key==='w'||key==='arrowup')move(0,6);if(key==='s'||key==='arrowdown')move(0,-6);if(key==='a'||key==='arrowleft')move(8,0);if(key==='d'||key==='arrowright')move(-8,0);if(key==='m')toggleMap();if(key==='e')openPanel('vehicle');});
document.querySelector('#share').onclick=async()=>{try{if(navigator.share)await navigator.share({title:document.title,url:location.href});else{await navigator.clipboard.writeText(location.href);toast('Ligação copiada. Partilhe esta perspetiva.');}}catch(e){if(e.name!=='AbortError')toast('Não foi possível copiar. Copie o endereço do navegador.');}};
let audioContext, soundOn=false;
document.querySelector('#sound').onclick=async()=>{try{if(!audioContext){audioContext=new AudioContext();const buffer=audioContext.createBuffer(1,audioContext.sampleRate*4,audioContext.sampleRate);const data=buffer.getChannelData(0);let previous=0;for(let i=0;i<data.length;i++){previous=(previous+Math.random()*.02-.01)/1.02;data[i]=previous*3;}const source=audioContext.createBufferSource();source.buffer=buffer;source.loop=true;const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=500;const gain=audioContext.createGain();gain.gain.value=.22;source.connect(filter).connect(gain).connect(audioContext.destination);source.start();}soundOn=!soundOn;if(soundOn)await audioContext.resume();else await audioContext.suspend();document.querySelector('#sound-label').textContent=soundOn?'Som ligado':'Som desligado';document.querySelector('#sound').setAttribute('aria-label',soundOn?'Desativar som ambiente':'Ativar som ambiente');document.querySelector('#sound').setAttribute('aria-pressed',String(soundOn));toast(soundOn?'Som ambiente ilustrativo ativado.':'Som ambiente desligado.');}catch{toast('O navegador não permite reproduzir o som ambiente.');}};
