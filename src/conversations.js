// Authored hypothetical dialogues. No sensors, real incidents, prescriptions or live AI calls.
const turn = (personId, text) => ({ personId, text });
const option = (label, turns, outcome) => ({ label, turns, outcome });
export const CONVERSATIONS = [
  {
    id: "prioridades",
    title: "Organizar o dia de campo",
    topic: "Coordenação",
    siteIds: [],
    participants: ["nuno", "emanuel_franco", "rafael"],
    intro: [
      turn(
        "nuno",
        "Vamos organizar as visitas e o apoio de hoje. Que informação precisamos de reunir antes de definir prioridades?",
      ),
      turn(
        "emanuel_franco",
        "Estado das culturas, pedidos dos responsáveis de cada exploração e trabalhos previstos. Assim comparamos necessidades sem presumir que todas as situações são iguais.",
      ),
      turn(
        "rafael",
        "Da minha parte, confirmo disponibilidade e estado dos equipamentos antes de reservar qualquer máquina.",
      ),
    ],
    choices: [
      option(
        "Começar pelas necessidades das culturas",
        [
          turn(
            "nuno",
            "Cada responsável recolhe observações e explica a urgência do pedido.",
          ),
          turn(
            "emanuel_franco",
            "Separamos observações confirmadas de hipóteses e combinamos o acompanhamento com a equipa da exploração.",
          ),
        ],
        "Preparar uma ronda com informação de cada responsável.",
      ),
      option(
        "Começar pela coordenação dos equipamentos",
        [
          turn(
            "rafael",
            "Organizo os pedidos por equipamento, local e operação. Um trator, um Manitou e uma mini giratória não são intercambiáveis.",
          ),
          turn(
            "nuno",
            "Depois cruzamos essa disponibilidade com as prioridades das explorações e da construção.",
          ),
        ],
        "Preparar uma lista de necessidades e disponibilidade, sem atribuir máquinas reais.",
      ),
    ],
  },
  {
    id: "framboesa",
    title: "Ronda técnica à Framboesa Encantada 2",
    topic: "Tomate",
    siteIds: ["framboesa_2"],
    participants: ["cesar", "ernestina", "emanuel_franco"],
    intro: [
      turn(
        "cesar",
        "Como técnico responsável da Framboesa 2, proponho comparar o vigor das plantas, a evolução dos frutos e os registos de rega.",
      ),
      turn(
        "ernestina",
        "Posso organizar as observações da equipa por setor e indicar onde a evolução parece diferente.",
      ),
      turn(
        "emanuel_franco",
        "Nesta conversa de exemplo, começamos por observar e recolher dados. Uma diferença visual, sozinha, não determina a causa.",
      ),
    ],
    choices: [
      option(
        "Há diferenças de vigor entre duas linhas",
        [
          turn(
            "cesar",
            "Verifico se a diferença coincide com rega, drenagem, distribuição das plantas ou condições de luz.",
          ),
          turn(
            "emanuel_franco",
            "Convém comparar plantas equivalentes e confirmar os registos antes de propor alterações.",
          ),
          turn(
            "ernestina",
            "Fica combinada uma nova observação das mesmas linhas para acompanhar a evolução.",
          ),
        ],
        "Recolher observações comparáveis e rever os registos.",
      ),
      option(
        "A equipa quer discutir a maturação dos frutos",
        [
          turn(
            "cesar",
            "Comparamos cachos e estados de maturação em plantas representativas, sem tirar conclusões a partir de um único fruto.",
          ),
          turn(
            "ernestina",
            "Organizo a informação para a equipa perceber o que deve voltar a observar.",
          ),
          turn(
            "emanuel_franco",
            "A decisão técnica deve considerar o ciclo e os dados disponíveis, não um calendário inventado.",
          ),
        ],
        "Acompanhar maturação em pontos representativos.",
      ),
    ],
  },
  {
    id: "lagoa",
    title: "Apoio à Lagoa Bondosa",
    topic: "Acompanhamento",
    siteIds: ["lagoa"],
    participants: ["cesar", "etivaldo", "ana"],
    intro: [
      turn(
        "etivaldo",
        "Quero comparar as observações das culturas e perceber o que merece acompanhamento mais próximo.",
      ),
      turn(
        "cesar",
        "Dou apoio à Lagoa. Vamos tratar cada cultura e cada setor de acordo com os seus registos.",
      ),
      turn(
        "ana",
        "A equipa pode separar as observações e evitar misturar situações de talhões diferentes.",
      ),
    ],
    choices: [
      option(
        "Organizar a ronda por cultura",
        [
          turn(
            "etivaldo",
            "Agrupamos as observações por cultura e fase de desenvolvimento.",
          ),
          turn(
            "cesar",
            "Depois comparamos plantas equivalentes e identificamos o que ainda precisa de confirmação.",
          ),
          turn(
            "ana",
            "Combino com a equipa os pontos que devem ser observados novamente.",
          ),
        ],
        "Preparar uma ronda organizada por cultura e setor.",
      ),
      option(
        "Dar seguimento a um pedido da equipa",
        [
          turn(
            "ana",
            "Primeiro esclareço o local, a data e aquilo que foi observado.",
          ),
          turn(
            "cesar",
            "Com o Etivaldo, distinguimos o relato inicial das medições e observações que consigamos confirmar.",
          ),
          turn(
            "etivaldo",
            "Fico a acompanhar a evolução e a consolidar os registos da exploração.",
          ),
        ],
        "Esclarecer o pedido antes de decidir uma intervenção.",
      ),
    ],
  },
  {
    id: "apoios_cesar",
    title: "Coordenar Várzea e Fenómeno",
    topic: "Apoio entre explorações",
    siteIds: ["varzea", "fenomeno"],
    participants: ["cesar", "mariano", "nuno"],
    intro: [
      turn(
        "mariano",
        "Acompanho a Várzea e a Fenómeno. Gostava de organizar os temas em que precisamos de apoio.",
      ),
      turn(
        "cesar",
        "Além da responsabilidade na Framboesa 2 e do apoio à Lagoa, também dou apoio a estas duas explorações.",
      ),
      turn(
        "nuno",
        "Vamos coordenar os pedidos sem duplicar pessoas ou confundir as responsabilidades de cada local.",
      ),
    ],
    choices: [
      option(
        "Planear visitas distintas",
        [
          turn(
            "mariano",
            "Preparo um resumo separado de cada exploração, com as observações e dúvidas próprias.",
          ),
          turn(
            "cesar",
            "Assim uso o mesmo acompanhamento técnico, mas não trato duas situações diferentes como se fossem uma só.",
          ),
        ],
        "Preparar dois resumos e uma agenda de apoio.",
      ),
      option(
        "Comparar um tema comum",
        [
          turn(
            "cesar",
            "Podemos comparar o método de observação e os registos, mantendo separados os resultados de cada exploração.",
          ),
          turn(
            "mariano",
            "Reúno dados equivalentes e identifico diferenças de contexto.",
          ),
          turn(
            "nuno",
            "Depois definimos as prioridades com base no que estiver confirmado.",
          ),
        ],
        "Comparar métodos e dados sem generalizar conclusões.",
      ),
    ],
  },
  {
    id: "nutriveg",
    title: "Apoio às duas Nutriveg",
    topic: "Culturas e registos",
    siteIds: ["nutriveg_1", "nutriveg_2"],
    participants: ["guilherme", "emanuel_franco", "isabel", "natalia"],
    intro: [
      turn(
        "guilherme",
        "Acompanho as duas Nutriveg. Quero manter os pedidos e os históricos de cada exploração bem separados.",
      ),
      turn(
        "emanuel_franco",
        "Dou apoio agronómico às duas. Podemos partilhar critérios de observação sem misturar culturas, setores ou períodos.",
      ),
      turn("isabel", "Na Nutriveg 1 organizo as observações da equipa."),
      turn("natalia", "E eu faço essa articulação na Nutriveg 2."),
    ],
    choices: [
      option(
        "Rever os períodos de cultivo",
        [
          turn(
            "guilherme",
            "Confirmamos o início, o fim e o setor de cada período, sem apagar o histórico anterior.",
          ),
          turn(
            "emanuel_franco",
            "Se faltar uma data, fica por confirmar em vez de a inventarmos.",
          ),
        ],
        "Rever os períodos e conservar o histórico.",
      ),
      option(
        "Comparar observações das equipas",
        [
          turn(
            "isabel",
            "Levo as observações da Nutriveg 1 com a identificação do local.",
          ),
          turn("natalia", "Faço o mesmo para a Nutriveg 2."),
          turn(
            "emanuel_franco",
            "Depois o Guilherme e eu analisamos cada situação no respetivo contexto.",
          ),
        ],
        "Consolidar dois conjuntos de observações identificados.",
      ),
    ],
  },
  {
    id: "greenaura",
    title: "Visita de apoio à Greenaura",
    topic: "Apoio técnico",
    siteIds: ["greenaura"],
    participants: ["hernani", "francisco", "maria"],
    intro: [
      turn(
        "francisco",
        "Quero aproveitar o apoio técnico para rever as observações da exploração.",
      ),
      turn(
        "hernani",
        "Dou apoio à Greenaura. Antes de discutir soluções, explica-me o que foi observado e quais os registos disponíveis.",
      ),
      turn(
        "maria",
        "Posso reunir o relato da equipa e assinalar as zonas a acompanhar.",
      ),
    ],
    choices: [
      option(
        "Esclarecer uma observação de plantas",
        [
          turn(
            "hernani",
            "Precisamos de saber onde ocorre, desde quando e se está concentrada ou dispersa.",
          ),
          turn(
            "francisco",
            "Organizo os registos e confirmo o estado das plantas nesses pontos.",
          ),
          turn(
            "maria",
            "A equipa volta aos mesmos locais para comparar a evolução.",
          ),
        ],
        "Definir pontos de observação e recolher contexto.",
      ),
      option(
        "Organizar o acompanhamento",
        [
          turn(
            "francisco",
            "Distingo aquilo que consigo acompanhar localmente do que preciso de discutir contigo.",
          ),
          turn(
            "hernani",
            "Combinamos os temas a rever, sem inventar uma periodicidade ou uma presença minha no local.",
          ),
        ],
        "Preparar os temas do próximo contacto técnico.",
      ),
    ],
  },
  {
    id: "produtores",
    title: "Hernani e Miguel: apoio a agricultores",
    topic: "Produtores e visitas",
    siteIds: [],
    participants: ["hernani", "miguel"],
    intro: [
      turn(
        "hernani",
        "Também apoio produtores que não fazem parte do grupo. Precisamos de manter claros os pedidos e o enquadramento de cada exploração.",
      ),
      turn(
        "miguel",
        "Também dou apoio a esses agricultores. Vamos confirmar quem acompanha cada pedido antes de prometer uma visita.",
      ),
      turn(
        "hernani",
        "Vale da Borra é outro local que referi no meu apoio técnico; ainda falta registar o seu enquadramento e localização.",
      ),
    ],
    choices: [
      option(
        "Receber um novo pedido de apoio",
        [
          turn(
            "miguel",
            "Recolho o contacto autorizado, a cultura, a fase e uma descrição objetiva do pedido.",
          ),
          turn(
            "hernani",
            "Depois confirmamos a localização e a disponibilidade de acompanhamento, sem assumir que pertence ao grupo.",
          ),
        ],
        "Preparar um pedido de apoio com dados por confirmar.",
      ),
      option(
        "Evitar sobreposição de visitas",
        [
          turn(
            "hernani",
            "Partilhamos o estado dos pedidos que acompanhamos e esclarecemos quem fará cada contacto.",
          ),
          turn(
            "miguel",
            "Assim o mesmo agricultor não recebe duas indicações contraditórias nem fica sem seguimento.",
          ),
        ],
        "Coordenar os contactos e o seguimento dos pedidos.",
      ),
    ],
  },
  {
    id: "equipamentos",
    title: "Rafael: preparar um equipamento",
    topic: "Equipamentos",
    siteIds: [],
    participants: ["rafael", "nuno", "emanuel_franco"],
    intro: [
      turn(
        "rafael",
        "Sou responsável pelos equipamentos: tratores, Manitou e mini giratórias. Que operação está a ser planeada?",
      ),
      turn(
        "nuno",
        "Neste exemplo, precisamos de coordenar a disponibilidade com o trabalho previsto.",
      ),
      turn(
        "emanuel_franco",
        "Vamos esclarecer a tarefa e as condições no local antes de escolher a máquina.",
      ),
    ],
    choices: [
      option(
        "É uma operação de movimentação de materiais",
        [
          turn(
            "rafael",
            "Confirmo a adequação do equipamento, manutenção, condições de acesso e organização da zona de trabalho.",
          ),
          turn(
            "nuno",
            "A operação só fica planeada depois de serem confirmados os meios e as pessoas habilitadas para a executar.",
          ),
        ],
        "Preparar os requisitos da operação e verificar disponibilidade.",
      ),
      option(
        "É um pedido relacionado com nova estufa",
        [
          turn(
            "rafael",
            "Articulo as necessidades de movimentação e apoio à construção com a equipa responsável pela obra.",
          ),
          turn(
            "emanuel_franco",
            "Convém manter separadas as zonas de trabalho e as necessidades da exploração em atividade.",
          ),
        ],
        "Articular equipamentos e necessidades da construção.",
      ),
    ],
  },
  {
    id: "construcao",
    title: "Construção: projeto e área quase concluída",
    topic: "Novas estufas",
    siteIds: ["deusas"],
    participants: ["rafael", "nuno"],
    intro: [
      turn(
        "nuno",
        "Nas Deusas temos uma área projetada de 18 hectares e 4 hectares de estufas quase terminados, segundo os dados fornecidos.",
      ),
      turn(
        "rafael",
        "Dou uma mão na operação de construção de novas estufas. Vamos separar necessidades de equipamento e estado de cada trabalho.",
      ),
      turn(
        "nuno",
        "Não vamos tratar a área projetada como se já estivesse toda em produção.",
      ),
    ],
    choices: [
      option(
        "Rever o registo do estado da obra",
        [
          turn(
            "rafael",
            "Identificamos o que está concluído, quase concluído ou ainda por executar, sem inventar percentagens.",
          ),
          turn(
            "nuno",
            "Mantemos os totais de projeto separados dos dados de produção confirmados.",
          ),
        ],
        "Rever estados sem confundir projeto com produção.",
      ),
      option(
        "Preparar necessidades de equipamentos",
        [
          turn(
            "rafael",
            "Recolho a sequência prevista das operações e verifico os equipamentos adequados e disponíveis.",
          ),
          turn(
            "nuno",
            "Depois coordenamos os pedidos da obra e das restantes explorações.",
          ),
        ],
        "Preparar uma lista de necessidades, sem marcar operações reais.",
      ),
    ],
  },
  {
    id: "demonstracao",
    title: "Planear uma visita ao Campo de Demonstração",
    topic: "Ensaios e variedades",
    siteIds: ["demonstracao"],
    participants: ["emanuel_franco", "cristina", "nuno"],
    intro: [
      turn(
        "emanuel_franco",
        "No Campo de Demonstração acompanhamos uma diversidade de variedades. Podemos preparar uma visita com critérios de observação claros.",
      ),
      turn(
        "cristina",
        "Organizo a articulação da equipa e a informação que precisamos de apresentar.",
      ),
      turn(
        "nuno",
        "Neste exemplo, o objetivo é comparar de forma útil, sem anunciar resultados ou visitas que não aconteceram.",
      ),
    ],
    choices: [
      option(
        "Comparar características dos frutos",
        [
          turn(
            "emanuel_franco",
            "Registamos variedade, estado de maturação e características observadas, usando amostras comparáveis.",
          ),
          turn(
            "cristina",
            "Mantemos a identificação das amostras para não misturar conclusões.",
          ),
        ],
        "Preparar uma ficha de observação de variedades.",
      ),
      option(
        "Preparar a visita de agricultores",
        [
          turn(
            "cristina",
            "Definimos os pontos da apresentação e confirmamos os acessos antes de combinar o percurso.",
          ),
          turn(
            "emanuel_franco",
            "As perguntas dos visitantes ficam associadas à variedade ou tema certo.",
          ),
          turn(
            "nuno",
            "A localização no mundo geográfico só será publicada depois de confirmada.",
          ),
        ],
        "Organizar uma visita hipotética sem inventar agenda ou acessos.",
      ),
    ],
  },
  {
    id: "monitorizacao",
    title: "Observar antes de decidir",
    topic: "Sanidade e monitorização",
    siteIds: ["tomates_oeste", "framboesa_2"],
    participants: ["emanuel_franco", "cesar"],
    intro: [
      turn(
        "cesar",
        "Numa situação hipotética, a equipa encontra sinais que não reconhece numa planta. Como começamos?",
      ),
      turn(
        "emanuel_franco",
        "Registamos a planta, a zona e o aspeto observado. Procuramos saber se é um caso isolado e o que mudou recentemente.",
      ),
      turn(
        "cesar",
        "Se for necessário, articulamos as observações com a equipa de controlo biológico, sem assumir um diagnóstico.",
      ),
    ],
    choices: [
      option(
        "Recolher observações para análise",
        [
          turn(
            "emanuel_franco",
            "Comparamos plantas próximas e zonas equivalentes, mantendo as fotografias e notas identificadas.",
          ),
          turn(
            "cesar",
            "Levo informação objetiva para a discussão técnica e acompanho a evolução.",
          ),
        ],
        "Recolher evidência antes de formular hipóteses.",
      ),
      option(
        "A equipa pede uma solução imediata",
        [
          turn(
            "cesar",
            "Primeiro esclareço o que está confirmado e o que ainda é uma hipótese.",
          ),
          turn(
            "emanuel_franco",
            "Não se escolhe um produto, dose ou alteração de rega a partir de uma conversa simulada. A decisão real exige avaliação e os dados do caso.",
          ),
        ],
        "Pedir avaliação do caso real antes de prescrever uma intervenção.",
      ),
    ],
  },
];
export function availableConversations(
  data,
  { personId = null, siteId = null } = {},
) {
  const people = new Set(data.people.map((p) => p.id));
  return CONVERSATIONS.filter(
    (c) =>
      c.participants.every((id) => people.has(id)) &&
      (!personId || c.participants.includes(personId)) &&
      (!siteId || !c.siteIds.length || c.siteIds.includes(siteId)),
  );
}
export function conversationTurns(scenario, choice = null) {
  return choice === null
    ? scenario.intro
    : [...scenario.intro, ...scenario.choices[choice].turns];
}
