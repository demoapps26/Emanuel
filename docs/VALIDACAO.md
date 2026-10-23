# Validação — versão 0.4

Validado em 23/10/2026, com Node 24.19.0, npm 11.9.0 e Chromium 154. O navegador da nuvem usa SwiftShader por software, sem GPU física. Os registos anteriores estão em `VALIDACAO_v0.3.md` e `VALIDACAO_v0.2.md`.

## Verificações

- `npm test`: **61 testes aprovados**, sem falhas ou skips. Incluem as 14 implantações, oito tipos de veículo, 112 combinações de local e veículo para aproximação/entrada/saída, colisões orientadas, articulação e marcha-atrás, patamares elevados, identidades únicas, conversas e dados existentes.
- `npm run standalone`: compilação aprovada. O jogo completo tem **6 454 528 bytes** e o mesmo SHA-256 em `JOGAR.html`, `docs/index.html` e `release/Patricia_Pilar_Mundo_3D.html`: `9267e68d03c6b5da475dde590c9bfb1706fce0b5161f8cfd17fa9327a11b0bc8`.
- A compilação avisa do tamanho do bundle, que inclui as 14 imagens aéreas fornecidas. É intencional para a distribuição num único ficheiro.
- O teste completo de navegador cobre **44 verificações**, incluindo arranque WebGL, teclado e rato, condução/travagem/marcha-atrás/saída dos oito veículos, articulação do semirreboque, visita às 14 cenas, conservação da frota ao regressar e vista aérea com movimento suspenso.
- A mesma bateria cobre perfis, pessoa próxima, conversas/variantes, objetivos, pausa, mapas, carregamento das 14 imagens, edição e persistência, importação/exportação, mudança de qualidade e janela pequena. Verifica ausência de erros JavaScript e de pedidos à API Google.
- Além da compilação servida pelo Vite, a bateria foi executada contra o **HTML autónomo real** em `http://127.0.0.1:8090/JOGAR.html`. A verificação de arranque exige zero `script[src]`, nenhum redirecionamento e um módulo incorporado.
- Um ensaio separado desliga a rede do navegador depois do arranque, visita Nutriveg 2, Deusas, Lagoa e Campo de Demonstração, alterna a vista aérea e entra no camião. As capturas são imagens do jogo, não imagens de conceito.
- SHA-256 dos **21 ficheiros originais** comparado com o ZIP fornecido: todos preservados.

O último ajuste gráfico aumenta o plano próximo da câmara apenas na vista aérea para reduzir o tremeluzir das superfícies coplanares à distância. O ensaio de capturas e funcionamento sem rede verifica também esse ajuste; não altera a simulação ou os dados.

## Alcance visual e geográfico

Foram inspeccionadas capturas de arranque, camião, Nutriveg 2, Lagoa, Deusas e Campo de Demonstração. Cada implantação tem blocos e orientação próprios, baseados na respetiva referência. As 11 pequenas estufas de madeira da Nutriveg 2 e os três patamares de construção das Deusas têm verificações específicas. Culturas, estruturas, carroçarias e pessoas são procedurais e continuam estilizadas. **O resultado ainda não iguala o realismo da imagem de conceito.**

Os 14 pontos regionais vêm dos links fornecidos. Polígonos, acessos, alturas, dimensões e escala das malhas são estimados a partir das imagens; não constituem um levantamento. O parque de manobra é um anexo virtual identificado como tal. As mudanças entre explorações são viagens rápidas, sem estradas contínuas modeladas entre os locais.

A qualidade baixa é selecionada automaticamente no renderizador por software. Reduz resolução, materiais, culturas e sombras. No final da bateria do HTML autónomo foram medidos **8 FPS e 170,0 ms/frame**; as duas métricas usam janelas diferentes. As medições dessa máquina não representam uma placa gráfica de computador; não se garantem 60 FPS ou desempenho em GPU física. Os modos médio e alto estão disponíveis no painel de ajuda.

## Entrega e abertura

**JOGAR.html contém agora o jogo completo**, sem depender de `docs/index.html` ou de ficheiros adjacentes. Corrige a dependência do antigo atalho que falhava quando o Windows o abria a partir de uma pasta temporária do ZIP. O ZIP dedicado em `downloads/` inclui o jogo, instruções e KML; não inclui a entrada HTML de desenvolvimento.

A política administrativa do Chromium da nuvem bloqueia `file://` e foi mantida. Validou-se o mesmo conteúdo por HTTP e com a rede desligada após carregar. Isto não confirma a abertura direta no computador do utilizador, que depende do navegador, WebGL2 e políticas locais. A recomendação é **Extrair tudo → abrir JOGAR.html no Chrome ou Edge**.

A atualização é entregue no mesmo repositório GitHub. Não foi ativado GitHub Pages nem um novo serviço público. Não foram ativadas chave Google, API paga ou faturação. Os links Maps continuam a ser ligações externas opcionais.
