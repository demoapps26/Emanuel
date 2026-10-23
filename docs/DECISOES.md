# Decisões do mundo jogável — versão 0.4

## Cenas, fotografias e escala

- O alvo é PC com teclado e rato, WebGL2 e aceleração gráfica recomendada. Three.js, JavaScript e Vite permitem jogar no navegador; Node 22.12+ é apenas necessário às ferramentas de desenvolvimento.
- As 13 explorações e a sede têm cenas locais próprias. Carrega-se uma cena de cada vez para limitar o custo gráfico. As viagens rápidas preservam as posições da frota na sessão. Não representam percursos por estrada e não existe uma rede contínua entre explorações.
- Cada implantação foi aproximada a partir do ficheiro de referência correspondente. Foram distinguidos blocos, corredores, orientações, reservatórios, armazéns e recortes visíveis. As 11 estufas pequenas de madeira da Nutriveg 2 e os três patamares em construção das Deusas respeitam os requisitos fornecidos. Os patamares elevados não são vias conduzíveis.
- As unidades locais são usadas como metros aproximados na geometria e na condução. Dimensões, áreas desenhadas, alturas, limites e acessos não foram medidos no terreno. Um pin geográfico não georreferencia um polígono. As áreas declaradas do catálogo mantêm-se separadas das áreas dos modelos.
- O parque operacional de cada cena é um anexo virtual com espaço de manobra. Não é uma posição real da frota, uma parcela confirmada ou uma nova área produtiva.
- Os 14 pontos do mapa regional foram extraídos dos links fornecidos, incluindo a Framboesa 2. O mapa regional mantém projeção e escala métricas aproximadas; as imagens aéreas originais podem ser consultadas por local. Não são aplicadas ao terreno e não se extraíram malhas ou tiles Google.
- O modo Google 3D permanece desligado, sem chave, faturação ou validação real do serviço. O KML exporta pontos, não limites. Vale da Borra continua como relação de apoio com enquadramento/localização/área por confirmar; não foi inventada uma exploração adicional.

## Veículos e renderização

- Há oito tipos conduzíveis: carro técnico, Agropilar, controlo biológico, técnico agrícola, camião articulado, camião rígido, trator agrícola e trator compacto. As carrinhas e o camião aproximam as fotografias; as artes procedurais não são logótipos ou carroçarias oficiais. Não se reproduzem matrículas reais.
- Os tratores são genéricos, porque não foram fornecidas fotografias ou dimensões específicas. Não se inventam marcas, tarefas de maquinaria, hidráulica, acoplamentos operáveis ou certificações reais.
- A simulação diferencia dimensões, direção, aceleração, limites e travagem. Colisões usam retângulos orientados para veículos e edifícios; a cabine e o semirreboque têm volumes próprios e articulação limitada, incluindo marcha-atrás. Subpassos reduzem atravessamentos de obstáculos. Não é física automóvel de engenharia.
- As rodas rodam pela distância e raio e as dianteiras acompanham a direção. A personagem só sai com o veículo parado e numa posição livre. O menu de veículos aproxima-a da cabine, mantendo E como ação de entrada.
- A geometria procedural mantém o jogo independente de serviços externos. As partes rígidas são combinadas por material, preservando rodas, direção e articulação. Estufas translúcidas, culturas geométricas, estruturas e vegetação variam com o modo de qualidade.
- Baixa reduz instâncias, materiais, resolução e sombras para renderizadores por software. Média e Alta usam mais recursos da GPU. O contador mostra o navegador atual; não se garantem 60 FPS ou desempenho validado numa GPU física. O aspeto continua estilizado, aquém da referência fotorrealista.

## Pessoas, dados e ficção

- Cada pessoa tem um ID estável, com várias associações a explorações. Emanuel é a personagem controlada; Nuno, Hernani, Miguel e Rafael têm uma entidade 3D cada, reutilizada ao mudar de cenário. Não se cria uma cópia por exploração. Os restantes nomes estão disponíveis nos perfis; os dois David permanecem separados até confirmação.
- Nuno tem chefia global. César é responsável da Framboesa 2 e apoia Lagoa, Várzea e Fenómeno. Emanuel conserva todas as associações fornecidas. Hernani e Miguel acompanham os agricultores referidos, sem inventar atribuições; Rafael tem responsabilidade de equipamentos e apoio à construção.
- `culturas_atuais` são valores declarados/editáveis; `periodos` contém o histórico introduzido pelo utilizador. Não são inventadas datas de culturas anteriores. As áreas das Deusas distinguem projeto, parte quase concluída e produção.
- As edições ficam em localStorage por navegador e origem. Exportação/importação JSON permite transportar cópias; a importação valida e pede confirmação antes de substituir. A versão 0.3 é preservada e os dados `schemaVersion: 1` migram para `2`. Sem backend, sincronização, GPS real ou acesso a aplicações de gestão anteriores.
- As 11 conversas e 22 abordagens são escritas localmente e usam os IDs existentes. São ficção exportável, sem IA em direto, mensagens a terceiros, diagnósticos por sensores ou ordens de trabalho reais. Dia de campo acompanha objetivos da sessão.

## Entrega e validação

- `npm run standalone` gera o mesmo HTML autónomo em `JOGAR.html`, `docs/index.html` e `release/Patricia_Pilar_Mundo_3D.html`. A entrada JOGAR.html deixou de redirecionar, evitando a dependência de ficheiros que o Windows não extraía quando era aberta de dentro do ZIP.
- Extrair o ZIP completo continua recomendado; o ficheiro JOGAR.html autónomo também pode ser copiado sozinho. O index.html de desenvolvimento da raiz e a compilação normal dist/ continuam a exigir servidor.
- A política administrativa da nuvem bloqueia file:// e não foi desativada. Valida-se o mesmo ficheiro por HTTP; isso não confirma a abertura direta no equipamento do utilizador. Resultados efetivos e limitações de hardware estão em VALIDACAO.md.
