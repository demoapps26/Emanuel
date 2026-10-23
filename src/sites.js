// Local scene plans interpreted from the user's aerial references. Their metres,
// rotations and parcel limits are estimates, not a georeferenced survey. Real
// WGS84 location points remain in dados/localizacoes_maps.json.
import original from '../materiais/Patricia_Pilar_Mundo_3D_Codex/dados_exploracoes.json' with { type: 'json' };

const rad = degrees => degrees * Math.PI / 180;
const block = (x,z,w,d,extra={}) => ({x,z,w,d,rotation:0,kind:'greenhouse',roof:'arch',...extra});
const road = (x,z,w,d,rotation=0) => ({x,z,w,d,rotation});
const prop = (type,x,z,w,d,rotation=0,extra={}) => ({type,x,z,w,d,rotation,...(type==='reservoir'?{shape:'rect'}:{}),...extra});
function turn(items, degrees) {
  const angle=rad(degrees), c=Math.cos(angle),s=Math.sin(angle);
  return items.map(item=>({...item,x:item.x*c-item.z*s,z:item.x*s+item.z*c,rotation:(item.rotation||0)+angle}));
}
function scale(items, factor) {
  return items.map(item=>({...item,x:item.x*factor,z:item.z*factor,w:item.w*factor,d:item.d*factor}));
}

const plans = {
  tomates_oeste: {
    blocks:[
      block(-56,-187,90,78), block(-91,-94,155,108), block(-129,20,230,116),
      block(94,-86,202,252), block(94,118,202,130),
    ],
    roads:[road(213,-12,18,470),road(-256,-35,13,290)],
    props:[prop('office',245,161,13,18)],
    notes:[
      'A referência mostra uma cobertura noroeste que alarga em degraus para sul, um grande bloco a leste e uma ala sudeste. Foram reproduzidos esses volumes, em vez de três retângulos iguais.',
      'A via lateral leste acompanha a Rua Forno da Cal na referência. A Framboesa 2 aparece a sudoeste, mas é visitada numa cena própria; não foi fundida com a área dos Tomates do Oeste.',
    ],
  },
  framboesa_2: {
    blocks:[block(-100,0,78,278),block(5,0,118,278),block(103,-5,66,268)],
    roads:[road(-160,5,15,320),road(0,153,320,13)],
    props:[prop('reservoir',-188,50,38,105)],
    notes:[
      'O contorno assinalado na fotografia corresponde ao conjunto retangular a sudoeste dos Tomates do Oeste; três faixas de coberturas mantêm a largura e profundidade relativas desse conjunto.',
      'O reservatório alongado e o caminho do lado oeste foram aproximados a partir da imagem. O ponto real vem do novo link fornecido pelo utilizador.',
    ],
  },
  fenomeno: {
    blocks:turn([block(-27,-94,140,80),block(0,0,190,100),block(0,111,190,112)],-21),
    roads:turn([road(-119,8,13,338)],-21),
    props:turn([prop('reservoir',137,112,48,87),prop('office',115,-12,16,24)],-21),
    notes:[
      'Três troços consecutivos seguem o eixo oblíquo do conjunto fotografado. O troço norte é mais estreito, respeitando o recorte visível.',
      'Foi mantida uma bacia de água a leste/sudeste e um acesso longitudinal a oeste. O ângulo foi estimado visualmente, sem medição cadastral.',
    ],
  },
  framboesa_1: {
    blocks:turn([block(27,-94,90,100),block(-42,30,94,119),block(62,26,99,120)],-10),
    roads:turn([road(-114,-8,13,285)],-10),
    props:turn([prop('office',-137,-87,12,18)],-10),
    notes:[
      'O conjunto fotografado tem uma cabeça norte e duas alas a sul, com perímetro em degraus; esses três volumes foram separados na cena.',
      'O acesso do lado oeste segue a posição relativa da Rua da Paz. O pin da fotografia identifica o local, não uma entrada topograficamente levantada.',
    ],
  },
  varzea: {
    blocks:turn([block(0,-205,135,30),block(0,5,150,386),block(0,213,135,30)],10),
    roads:turn([road(91,0,13,450)],10),
    props:turn([prop('reservoir',-84,-246,43,40),prop('reservoir',-30,269,95,46),prop('office',117,119,13,18)],10),
    notes:[
      'A imagem é um recorte estreito: foi mantida a forma comprida da cobertura, com extremidades mais estreitas, e não uma implantação larga quadrada.',
      'Os reservatórios visíveis nas extremidades norte e sul foram aproximados. A leitura dos limites laterais é incerta por causa do recorte da imagem.',
    ],
  },
  linos: {
    blocks:scale([
      block(-239,-154,118,247),block(-71,-166,170,156),block(155,-133,218,160),
      block(0,71,190,168),block(226,185,225,231),block(3,288,230,163),
      block(-164,9,77,81),
    ],1.15),
    roads:scale([road(105,-26,430,12),road(-111,79,12,205),road(-171,181,130,12),road(-236,290,12,220)],1.15),
    props:scale([prop('reservoir',-214,-321,120,76,0,{shape:'oval'}),prop('office',118,103,24,21)],1.15),
    notes:[
      'A referência mostra vários blocos separados, caminhos interiores, uma zona aberta a sudoeste e água a noroeste. A cena usa sete alas de tamanhos diferentes e mantém esse vazio central/sudoeste.',
      'As dimensões são uma aproximação ampla para a exploração declarada de 35 ha. Os 35 ha não foram tratados como uma área de cobertura medida na fotografia.',
    ],
  },
  ritual: {
    blocks:[
      block(-157,-76,97,386),block(-11,-76,122,302),block(194,-19,220,420),
      block(-157,221,105,186),
    ],
    roads:[road(-80,-2,16,600),road(65,-51,16,475),road(185,260,200,15,rad(-14))],
    props:[prop('reservoir',-10,211,87,200),prop('reservoir',104,207,47,32),prop('office',-13,89,33,18)],
    notes:[
      'A fotografia mostra faixas compridas, corredores longitudinais, uma grande bacia de água na zona sul central e um volume adicional a sudoeste; estes elementos foram conservados.',
      'A imagem fornecida para Ritual contém a legenda «Greenhouse Vale da Borra-GPP». Mantém-se a associação ao ficheiro Ritual do pacote, sem concluir que Vale da Borra seja a mesma exploração ou alterar as relações de pessoas.',
    ],
  },
  deusas: {
    blocks:[
      block(30,-224,240,169,{kind:'construction',y:7}),
      block(-25,-10,260,173,{kind:'construction',y:3.5}),
      block(23,212,292,174,{kind:'construction',y:0}),
    ],
    roads:[road(-244,0,18,660),road(0,-120,400,17),road(0,100,420,17)],
    props:[
      prop('terrace',0,-224,370,198,0,{y:7}),
      prop('terrace',0,-10,410,198,0,{y:3.5}),
      prop('terrace',0,212,440,198,0,{y:0}),
    ],
    notes:[
      'A fotografia mostra sobretudo movimentação de terras; a cena usa estruturas em construção e três patamares, conforme os requisitos fornecidos, sem culturas produtivas inventadas.',
      'Os 18 ha são área projetada e cerca de 4 ha estavam quase concluídos no requisito. As alturas 0/3,5/7 m são apenas uma representação visual dos três níveis, não cotas reais.',
    ],
  },
  greenaura: {
    blocks:[block(-62,-1,99,178),block(51,-1,115,178),block(-68,-115,88,32)],
    roads:[road(-126,0,13,240),road(0,-143,260,13)],
    props:[prop('office',-149,72,15,25)],
    notes:[
      'A referência pequena mostra um conjunto compacto, com cobertura mais clara a oeste e faixas azuis a leste. Foram mantidas duas alas principais e um troço norte menor.',
      'A baixa resolução não permite contar todos os vãos nem validar os limites; o pormenor das estruturas permanece estimado.',
    ],
  },
  nutriveg_2: {
    blocks:[
      ...[-18,18,54].map(x=>block(x,-76,31,67,{height:3.4,frame:'wood',roof:'gable',crop:'cucumber'})),
      ...[-54,-18,18,54].map(x=>block(x,0,31,67,{height:3.4,frame:'wood',roof:'gable',crop:'cucumber'})),
      ...[-54,-18,18,54].map(x=>block(x,76,31,67,{height:3.4,frame:'wood',roof:'gable',crop:'cucumber'})),
    ],
    roads:[road(0,-38,160,7),road(0,38,160,7),road(88,0,12,260)],
    props:[prop('office',107,-104,12,16)],
    notes:[
      'São exatamente 11 estufas pequenas, baixas e com estrutura de madeira, conforme o requisito; a implantação em três filas deixa recortado o canto noroeste observado na fotografia.',
      'A cultura de pepino vem do catálogo, sem atribuir cultivares, ciclos ou números reais a cada setor. Os 3,4 m são uma altura visual estimada.',
    ],
  },
  nutriveg_1: {
    blocks:[
      block(0,9,200,316),block(-139,-34,64,199),block(141,21,70,268),
      block(0,-180,110,51),block(15,201,125,65),
    ],
    roads:[road(-190,0,14,450),road(199,0,14,450),road(0,-252,350,14)],
    props:[prop('reservoir',-75,-214,34,34,0,{shape:'oval'}),prop('reservoir',76,-214,34,34,0,{shape:'oval'}),prop('office',0,-224,58,29)],
    notes:[
      'O grande conjunto branco mantém uma planta escalonada, com ala central mais profunda e alas laterais de comprimentos diferentes.',
      'Os dois reservatórios escuros e o pequeno volume de apoio ficam a norte, como na referência. A planta não é um levantamento dos limites da propriedade.',
    ],
  },
  lagoa: {
    blocks:turn([
      block(-100,-119,178,209,{crop:'mixed'}),block(100,-119,178,209,{crop:'mixed'}),
      block(-100,119,178,209,{crop:'mixed'}),block(100,119,178,209,{crop:'mixed'}),
    ],31),
    roads:turn([road(0,0,15,480),road(0,0,395,18),road(-203,0,14,490)],31),
    props:turn([prop('reservoir',-246,-228,48,43),prop('reservoir',-256,158,52,42),prop('office',-239,-14,24,22)],31),
    notes:[
      'As coberturas oblíquas foram agrupadas em quatro grandes setores, separados por um corredor transversal e outro longitudinal, reproduzindo a organização visível.',
      'Os reservatórios e o apoio ficam no bordo oeste/noroeste. Tomate, pepino e courgete são culturas declaradas do local, sem localização real de cada cultura dentro dos setores.',
    ],
  },
  demonstracao: {
    blocks:[block(5,-49,35,29),block(0,0,55,65),block(0,49,45,30)],
    roads:[road(43,0,10,147),road(0,76,127,12,rad(-12))],
    props:[
      prop('office',61,28,13,10),prop('fence',36,0,1,120),
      prop('display',61,8,5,3),prop('display',61,-6,5,3),
    ],
    notes:[
      'Foi respeitada a pequena cobertura alongada da referência aérea, com acesso pelo lado leste e via no bordo sul; o recorte norte aparece mais estreito.',
      'A entrada branca, vedação verde e bancadas de demonstração usam as fotografias enviadas como referência visual. A posição exata desses elementos dentro da parcela não foi medida.',
      'A área declarada de 0,73 ha é pequena: o parque de veículos acrescentado para experimentar a condução é um anexo virtual, não uma ampliação real da exploração.',
    ],
  },
  sede: {
    blocks:[
      block(-5,-20,140,190,{kind:'warehouse',height:9,roof:'gable'}),
      block(101,-18,50,230,{kind:'warehouse',height:9,roof:'gable'}),
      block(-17,118,100,45,{kind:'warehouse',height:7,roof:'gable'}),
      block(-106,11,39,95,{kind:'warehouse',height:5,roof:'gable'}),
    ],
    roads:[road(-146,0,17,340),road(146,0,18,350),road(0,-155,330,18)],
    props:[prop('reservoir',192,-30,54,76),prop('office',-112,111,31,28),prop('fence',224,17,1,320)],
    notes:[
      'A sede usa volumes industriais ortogonais, pátios laterais e reservatório a leste, como na referência; não foram criadas estufas agrícolas na sede.',
      'Receção e expedição são apenas representações exteriores. Não existe planta interior validada, nem localização real dos departamentos ou cais individuais.',
    ],
  },
};

/** Axis-aligned envelope of an oriented rectangle, used to frame the local scene. */
export function rectangleEnvelope(item) {
  const angle=item.rotation||0,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
  const hx=(item.w*c+item.d*s)/2,hz=(item.w*s+item.d*c)/2;
  return {minX:item.x-hx,maxX:item.x+hx,minZ:item.z-hz,maxZ:item.z+hz};
}
function envelope(items) {
  const all=items.map(rectangleEnvelope);
  return {minX:Math.min(...all.map(p=>p.minX)),maxX:Math.max(...all.map(p=>p.maxX)),minZ:Math.min(...all.map(p=>p.minZ)),maxZ:Math.max(...all.map(p=>p.maxZ))};
}
function assemble(id, plan) {
  const record=id==='sede'?original.sede:original.exploracoes.find(p=>p.id===id);
  const blocks=plan.blocks.map(b=>({...b,site:id}));
  const initialExtent=envelope([...blocks,...plan.props,...plan.roads]);
  const yard={x:0,z:initialExtent.maxZ+75,w:140,d:100};
  const frontZ=initialExtent.maxZ+12.5;
  const roads=[...plan.roads,
    road((initialExtent.minX+initialExtent.maxX)/2,frontZ,Math.max(180,initialExtent.maxX-initialExtent.minX+36),15),
    road(0,(frontZ+yard.z)/2,16,yard.z-frontZ+16),
  ];
  const positions={technical:[-36,-20],agropilar:[-25,-20],biological:[-14,-20],agricultural:[-3,-20],truck:[24,-10],rigid_truck:[46,-10],tractor:[-26,18],orchard_tractor:[-13,18]};
  const vehicleSpawns=Object.fromEntries(Object.entries(positions).map(([kind,[x,z]])=>[kind,{x,z:yard.z+z,yaw:0}]));
  const whole=envelope([...blocks,...plan.props,...roads,yard]);
  const bounds={minX:Math.floor(whole.minX-40),maxX:Math.ceil(whole.maxX+40),minZ:Math.floor(whole.minZ-40),maxZ:Math.ceil(whole.maxZ+40)};
  const extent=Math.max(bounds.maxX-bounds.minX,bounds.maxZ-bounds.minZ);
  return {
    id,name:record.nome,reference:record.referencia_imagem,declaredAreaHa:record.area_ha??null,
    placementAccuracy:'estimated_from_reference',
    notes:[...plan.notes,'A posição e o tamanho dos blocos são estimados a partir da imagem fornecida; os pontos geográficos reais não validam estes limites, alturas, entradas ou dimensões.','O parque operacional a sul é um anexo virtual para experimentar os oito veículos, com espaço de manobra; não é uma posição de frota ou parcela real.'],
    bounds,blocks,roads,yard,vehicleSpawns,props:plan.props,
    spawn:{x:-39.5,z:yard.z-20,yaw:0},npcAnchor:{x:0,z:yard.z+20},
    overview:{x:initialExtent.maxX+extent*.22,y:Math.max(140,extent*.62),z:bounds.maxZ+extent*.16,targetX:(initialExtent.minX+initialExtent.maxX)/2,targetZ:(initialExtent.minZ+initialExtent.maxZ)/2},
  };
}

export const FARM_IDS=original.exploracoes.map(site=>site.id);
export const SITE_IDS=[...FARM_IDS,'sede'];
export const SITE_LAYOUTS=Object.fromEntries(SITE_IDS.map(id=>[id,assemble(id,plans[id])]));
export function getSiteLayout(id='tomates_oeste') {
  const layout=SITE_LAYOUTS[id];
  if(!layout)throw new RangeError(`Local desconhecido: ${id}`);
  return layout;
}
