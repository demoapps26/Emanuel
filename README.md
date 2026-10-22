# Grupo Patrícia Pilar · Mundo 3D — 0.3

Primeira versão jogável para computador, em português de Portugal. Demonstração local com Tomates do Oeste e Framboesa Encantada 2, personagem em terceira pessoa, carro técnico e três carrinhas conduzíveis (Agropilar, controlo biológico e técnico agrícola), colisões, câmara, minimapa e catálogo das 13 explorações e sede.

**14 localizações reais obtidas dos links fornecidos; cenário jogável ainda aproximado.** Os percursos têm distâncias comprimidas. Os modelos são provisórios e não têm a qualidade das imagens de conceito. O modo Google está desativado e ainda não foi validado com a API real. Não há GPS ou backend; o modo local funciona sem serviços pagos.

## Experimentar sem instalar ferramentas

1. No GitHub, carrega em **Code → Download ZIP**.
2. No Windows, clica com o botão direito no ZIP e escolhe **Extrair tudo**.
3. Na pasta extraída, abre **JOGAR.html** no Chrome ou Edge e carrega em **Começar a explorar**.

`JOGAR.html` abre a versão autónoma incluída em `docs/index.html`. Não abras o `index.html` da raiz, que é a entrada do código de desenvolvimento. A versão autónoma inclui o código e os dados e funciona sem Node, servidor, chave API ou chamadas a serviços externos no modo local. Requer um navegador de computador com WebGL2.

O botão **Mapa** abre os 14 pontos geográficos em posições proporcionais, com norte, zoom e escala métrica aproximada. Clica num ponto para ver o link e a imagem aérea original. O minimapa e a tecla M mostram o percurso jogável, ainda comprimido. Usa **Equipa** para consultar pessoas e **Conversas** / **C** para as conversas técnicas simuladas. **Dia de campo** apresenta quatro objetivos da sessão. Os diálogos são fictícios e não alteram o catálogo nem criam tarefas reais.

Se o navegador não permitir guardar dados de ficheiros locais, a aplicação apresenta aviso. Exporta os dados para conservar alterações; mover/renomear o HTML pode mudar o armazenamento associado pelo navegador. A versão servida por HTTP continua disponível para desenvolvimento e uso com uma origem estável.

Para gerar novamente o HTML a partir do código:

```bash
npm ci
npm run standalone
```

O ficheiro é criado em `release/Patricia_Pilar_Mundo_3D.html`. Este é um empacotamento específico para ficheiro único; o `dist/index.html` normal continua a precisar de servidor.

## Executar

Requisitos: Node.js 22.12+ (validado em 24.19.0), npm e navegador com WebGL2. Recomenda-se aceleração gráfica. Num terminal na pasta do projeto:

```bash
npm ci
npm run dev
```

Abre no navegador o endereço indicado pelo Vite e escolhe **Começar a explorar**. Na tua máquina local, usa o endereço local apresentado pelo comando. Este onboarding não disponibiliza uma pré-visualização web pública do servidor na nuvem.

Para compilar e testar o resultado de produção:

```bash
npm run build
npm run preview
```

O resultado está em `dist/` e pode ser servido por um servidor estático; não abrir `index.html` diretamente com `file://`. Não foi feita publicação externa. As dependências estão fixadas em `package-lock.json`.

## Controlos

| Comando | Ação |
| --- | --- |
| W A S D / setas | Andar; ao volante, acelerar/virar/travar e recuar |
| Shift | Correr a pé |
| Arrastar o rato | Rodar a câmara |
| Roda do rato | Aproximar/afastar a câmara |
| E | Entrar no veículo mais próximo / sair depois de parar |
| F | Consultar a personagem próxima |
| T / Equipa | Abrir pessoas, funções e explorações associadas |
| C / Conversas | Escolher uma conversa técnica simulada |
| Espaço | Travar o veículo |
| M | Mapa geral esquemático |
| I | Consultar a exploração atual |
| R | Reiniciar personagem e todos os veículos numa posição livre |
| Esc | Pausar / fechar painel e retomar |

A personagem controlada representa Emanuel Franco, com avatar genérico. Nuno, Hernani, Miguel e Rafael têm uma personagem cada no cenário, junto ao parque. As posições são ilustrativas. No início a personagem e o carro técnico estão junto à fachada das estufas dos Tomates do Oeste. R regressa ao ponto livre no parque. A carrinha Agropilar está mais à direita, no parque; as carrinhas de controlo biológico e técnico agrícola encontram-se na fila mais a sul. Os veículos são inspirados nas fotografias enviadas. O camião estacionado tem cabina branca, semirreboque e decoração ilustrada com frutos e a frase «Da terra para o Mundo.». Nenhum destes modelos indica a posição ou presença real de pessoas/veículos.

Na ajuda `?`, escolhe qualidade baixa/média/alta. A qualidade baixa é o padrão; o contador mostra FPS e tempo por frame medidos no navegador em utilização. Teclas de jogo ficam suspensas nos painéis e campos de texto. Perder o foco da janela pausa a exploração.

## Dados e edições

Em **Explorações**, seleciona um local e escolhe **Editar informação** para alterar nome, área e culturas declaradas, associar pessoas a funções e acrescentar/editar/encerrar períodos de cultivo com setor opcional. A mesma pessoa pode trabalhar em vários locais. Os dois David permanecem separados até confirmação.

As alterações ficam no armazenamento local do navegador, separadas por origem. **Exportar dados** cria uma cópia JSON que pode ser importada noutro navegador. A importação valida a estrutura antes de pedir confirmação de substituição; uma cópia inválida não substitui dados existentes. Se o navegador bloquear a gravação ou o limite de armazenamento for atingido, a aplicação apresenta erro. Exporta regularmente: não existe sincronização ou cópia num servidor.

Cada pessoa tem um ID estável e uma única personagem, independentemente do número de explorações que acompanha. A associação de uma pessoa a outra exploração reutiliza o mesmo registo; escrever o nome de uma pessoa já existente na edição também reutiliza essa identidade. Nuno tem chefia geral de todas as explorações/equipas. Hernani apoia Greenaura, Vale da Borra e produtores externos; Miguel acompanha os agricultores referidos, sem atribuições por exploração inventadas. Rafael é responsável por tratores, Manitou e mini giratórias e apoia a construção de estufas. César é técnico responsável da Framboesa 2 e apoia Lagoa, Várzea e Fenómeno. Emanuel tem um único avatar, com todas as suas associações. Vale da Borra fica num registo de apoio separado, com pertença ao grupo, área e localização por confirmar.

Dados antigos `schemaVersion: 1` são migrados em memória para `2`, preservando áreas e históricos editados; guardar/exportar passa a usar o novo formato. A chave de armazenamento do navegador foi mantida para recuperar edições existentes. Não é necessário apagar dados para atualizar.

Em **Mapa**, já estão os 14 pontos dos links fornecidos, incluindo o novo link da Framboesa 2. O registo não altera as posições do percurso comprimido. Continuamos por agora sem chave API: o botão Google fica indisponível e não se fazem chamadas ao serviço. [docs/MAPAS.md](docs/MAPAS.md) explica a escala, o código preparado, o que falta validar e os passos opcionais para obter acesso mais tarde.

`culturas_atuais` são as culturas declaradas na recolha; `periodos` contém o histórico registado pelo utilizador. Não são inventadas datas de culturas anteriores. `people` e `assignments` são a fonte das associações editáveis de equipa; os campos de texto legados do pacote preservam a informação original de contexto.

Área declarada sem Deusas: **129,23 ha**. Deusas tem **18 ha projetados**, com **4 ha quase concluídos**; não é tratada como área em produção. Coordenadas, limites e acessos ainda precisam de validação. Os outros 11 locais e a sede estão apenas no catálogo.

## Verificação

```bash
npm test
```

Testes de movimento, colisões, entrada/saída/condução, seleção do veículo, relações de pessoas, históricos, persistência e fallback de mapas. Os testes não exigem serviços externos.

Com o servidor de desenvolvimento ativo noutro terminal:

```bash
npm run test:browser
```

Usa Chromium instalado em `/usr/bin/chromium`. Noutro sistema, define `CHROMIUM_PATH` para o executável do teu Chromium; `TEST_BASE_URL` permite apontar para outro servidor Vite ou de produção. Usa um perfil de teste isolado, com renderização por software no ambiente de nuvem. Relatório e capturas ficam em `test-results/`, ignorados pelo Git. Não é preciso instalar os browsers do Playwright neste ambiente.

Os testes no navegador exercitam efetivamente movimento, rato/câmara, todos os veículos, travagem/saída, pausa, mapa, catálogo, edição, histórico, recarregamento, exportação/importação e qualidade gráfica. Consulta [docs/VALIDACAO.md](docs/VALIDACAO.md) para resultados e limites medidos.

## Organização e próximos passos

- `src/simulation.js` e `src/fleet.js`: movimento, colisões, estado e identificação dos veículos.
- `src/world.js`: geometria, renderização, câmara e mapas esquemáticos.
- `src/liveries.js`: ilustrações procedurais das decorações e culturas.
- `src/data.js`: dados iniciais, validação e persistência.
- `src/main.js` e `src/style.css`: interface e controlos.
- `src/conversations.js`: 11 situações de trabalho, com 22 variantes e participantes identificados pelos seus IDs existentes.
- `src/materials.js`: texturas procedurais do chão, ambiente e sombras de contacto.
- `src/characters.js`: identidades das personagens e consulta por proximidade.
- `src/geography.js`, `src/maps.js` e `src/google-map.js`: coordenadas, modo local e código do visualizador Google opcional, desligado e ainda sem validação real.
- `materiais/Patricia_Pilar_Mundo_3D_Codex/`: pacote original de requisitos e referências, preservado.
- [docs/CONVERSAS_SIMULADAS.md](docs/CONVERSAS_SIMULADAS.md): todas as conversas e variantes escritas.
- [docs/DECISOES.md](docs/DECISOES.md): escolhas técnicas e aproximações.
- [docs/REFERENCIAS_FOTOGRAFICAS.md](docs/REFERENCIAS_FOTOGRAFICAS.md): aspetos visuais recebidos e aproximações implementadas.
- [docs/MAPAS.md](docs/MAPAS.md): investigação bloqueada e requisitos para integração autorizada.

A seguir: validar geografia e acessos; melhorar a fidelidade dos modelos e dos interiores com as referências recebidas; confirmar identidades/abrangências pendentes; acrescentar Campo de Demonstração quando a localização estiver confirmada. Projeto independente das aplicações de gestão anteriores, sem acesso a credenciais ou bases de dados dessas aplicações.

## Conversas e dia de campo

Em **Conversas** escolhe uma situação e uma abordagem. Há exemplos sobre organização do dia (Nuno, Emanuel e Rafael), Framboesa 2, apoio à Lagoa, coordenação de Várzea/Fenómeno (César e Mariano), Nutriveg (Guilherme, Emanuel, Isabel e Natália), Greenaura (Hernani, Francisco e Maria), produtores externos (Hernani e Miguel), equipamentos, construção nas Deusas, variedades no Campo de Demonstração e observação/monitorização de culturas.

Os perfis permitem filtrar conversas em que a pessoa participa. Cada pessoa continua a ser a mesma identidade e personagem nas várias situações. Há 11 situações e 22 abordagens escritas, com um próximo passo proposto dentro da ficção. Podes reiniciar para explorar a alternativa e exportar o texto do exemplo. Não são diálogos de IA em direto nem aconselhamento baseado em medições reais.

O botão **Dia de campo** acompanha apenas esta sessão: consultar a equipa, concluir uma abordagem de conversa, conduzir e visitar as duas explorações modeladas. Não é um registo de presenças ou de trabalho da empresa. **R** reinicia posições sem apagar os dados locais do catálogo.

O aspeto gráfico foi melhorado com chão texturado, coberturas curvas, vegetação, personagens de forma arredondada, animação de braços/pernas e sombras de contacto. A qualidade baixa reduz resolução e desativa reflexos/sombras dinâmicas para compatibilidade. A representação continua estilizada; as imagens de conceito fotorrealistas não representam o nível gráfico já alcançado.

## Alterações visuais da versão 0.3

Estufas com cobertura e paredes translúcidas, tubos metálicos com espessura, plantas e frutos em geometria 3D, sacos de cultivo e fios de condução. Céu atmosférico, sombras próximas, pintura automóvel, carro técnico com carroçaria e cavas de rodas modeladas, vegetação com folhas, asfalto com relevo e lancis. Avatares genéricos com proporções e roupa revistas. Não constitui reprodução fotorrealista ou implantação georreferenciada das estufas.

A qualidade alta usa iluminação e reflexos completos em computadores com GPU. A baixa reduz plantas, materiais e resolução, e desliga sombras/ambiente refletido para renderizadores por software. Em **? → Qualidade gráfica** podes mudar de modo; o contador apresenta o desempenho medido. Não foram afirmados 60 FPS nem validado desempenho numa GPU física.

`node scripts/check-graphics.mjs` guarda capturas reais do jogo e do mapa em `test-results/graphics/`, com verificação dos 14 pontos e carregamento da referência aérea. Aceita `TEST_BASE_URL`, `CAPTURE_DIR`, `CAPTURE_QUALITY` e `CHROMIUM_PATH`. A captura em Alta pode ser muito lenta em renderização por software.
