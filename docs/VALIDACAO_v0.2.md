# Validação — versão 0.2

Validado no ambiente de nuvem em 22/10/2026, com Node 24.19.0, npm 11.9.0 e Chromium 154.0.8037.57. O alvo final foi o **HTML autónomo entregue ao utilizador**, servido localmente por HTTP.

## Resultados confirmados

- Instalação reprodutível a partir do lockfile validada com `npm ci`; as dependências não mudaram nesta iteração.
- `npm test`: **38 testes executados e aprovados**, zero falhas, skips ou cancelamentos. Cobrem movimento, corrida, colisões/subpassos, vias de ligação, limites, condução/travagem/saída, quatro veículos, camião sólido, identidade única das pessoas, chefia/apoios, migração de dados, persistência, importação, geografia, requisitos do modo Google e 11 conversas/22 variantes.
- `npm run standalone`: compilação aprovada e HTML gerado com JavaScript/CSS incorporados. O Vite emite um aviso de tamanho do bundle (~622 kB minificado, ~170 kB gzip); não é uma falha de compilação.
- `node scripts/standalone.mjs /workspace/entregas/Patricia_Pilar_Mundo_3D.html`: entrega gerada e comparada com `release/Patricia_Pilar_Mundo_3D.html`.
- O HTML entregue respondeu por HTTP e o corpo servido foi comparado byte a byte com o ficheiro em disco.
- `TEST_BASE_URL=http://127.0.0.1:8090/Patricia_Pilar_Mundo_3D.html npm run test:browser`: **24 verificações aprovadas**, com saída 0 e sem erros JavaScript de execução.
- Os testes do navegador verificam também **zero pedidos à API Google** no modo local. Não foram usados projeto, chave, faturação, geocodificação ou serviço de IA em direto.
- Foi corrigida uma condição de corrida em que o evento de fecho de um diálogo apagava uma tecla premida logo depois. Um teste de retoma dos controlos após consultar o perfil passou três vezes seguidas; o percurso completo voltou a passar.

O teste de navegador exercitou efetivamente:

1. Arranque WebGL e ecrã inicial.
2. Movimento a pé e reinício.
3. Rotação da câmara com rato.
4. Entrada, condução, travagem e saída do carro técnico.
5. Entrada/condução/saída da Agropilar.
6. Entrada/condução/saída da carrinha de controlo biológico.
7. Entrada/condução/saída da carrinha de técnico agrícola.
8. Perfis e identidades únicas de Emanuel, Nuno, Hernani, Miguel e Rafael, chefia de Nuno nas 13 explorações e associações de César às quatro explorações.
9. Aproximação a Nuno e consulta com F.
10. Conversas técnicas com participantes e resultados distintos por escolha, exportação e ausência de alterações aos dados do catálogo.
11. Filtro de conversas por pessoa.
12. Objetivos do dia de campo atualizados pela sessão.
13. Pausa e retoma.
14. Mapa local e avisos de geografia aproximada.
15. Modo Google desativado, registo de coordenadas apenas após entrada do utilizador e confirmação separada.
16. Catálogo de 13 explorações mais sede e distinção das áreas de projeto/construção.
17. Edição e gravação de culturas, áreas, períodos e relações de pessoas sem mover a personagem.
18. Encerramento de período sem perda do histórico.
19. Recuperação das edições após recarregar.
20. Reutilização de César ao escrever o nome existente, sem criar outro ID.
21. Exportação válida e rejeição de importação inválida sem perder edições.
22. Confirmação antes de substituir dados por uma cópia importada.
23. Alteração de qualidade e retoma do jogo.
24. Acesso ao catálogo/controlos em janela menor.

O perfil do navegador é temporário e isolado. Áreas, culturas ou coordenadas sintéticas introduzidas pelos testes não alteram os dados fonte nem o navegador do utilizador. Relatório e capturas estão em `test-results/`, ignorados pelo Git. Os testes de distância usam pontos matemáticos, não posições inventadas para explorações.

## Abertura do ficheiro e limitações

A navegação direta `file://` é bloqueada por política administrativa no Chromium da nuvem (`ERR_BLOCKED_BY_ADMINISTRATOR`). Essa política foi mantida. Foi testado o **mesmo HTML** por HTTP; não se afirma que a abertura direta do ficheiro foi validada neste navegador. O HTML incorpora o código, CSS e dados, sem dependências externas no modo local, e foi preparado para abrir em navegadores de computador que permitam ficheiros locais. O armazenamento local depende da origem/políticas do navegador; a aplicação apresenta avisos se estiver indisponível. `COMECAR_AQUI.txt` e README explicam as opções.

O teste usou SwiftShader, renderização por software e qualidade baixa. O contador no final mostrou **12 FPS e 114,9 ms de média por frame**. O FPS usa uma janela curta e a média usa os últimos 120 frames, pelo que não são inversos exatos. Não é um benchmark estável nem uma medição de GPU real. Aceleração gráfica é recomendada; não se afirma fluidez de 60 FPS ou compatibilidade com todos os equipamentos.

A representação continua estilizada, com exterior aproximado e percursos comprimidos. Não há interiores navegáveis, escala geográfica validada, física automóvel real, vozes/IA em direto ou backend. As imagens de conceito fotorrealistas são referências de intenção. As carroçarias e decorações seguem as fotografias por aproximação, sem reprodução dimensional ou arte oficial exatas.

O visualizador Google tem código preparado e guardas testadas, mas **não foi validado com a API real**: faltam configuração autorizada, coordenadas confirmadas, cobertura e revisão dos custos/termos. O utilizador decidiu continuar sem chave por agora. Ver `MAPAS.md`.

## Configuração e continuidade

Foram guardados `install_script` e `start_skill` no rascunho do ambiente, incluindo a geração da entrega HTML, arranque de desenvolvimento, testes e controlos. Também foram guardadas as quatro adições de rede para investigar documentação/links Google, descritas em `MAPAS.md`. A persistência do rascunho foi confirmada; isso não prova aplicação à instância ou publicação.

O código continua local no checkout; não foram feitos commit, push ou publicação externa. O utilizador pode rever/guardar as definições e publicar o ambiente para criar o snapshot reutilizável. Não foi validado um restauro numa nova tarefa. A entrega HTML e os ZIPs permitem conservar os ficheiros independentemente dos processos da nuvem.
