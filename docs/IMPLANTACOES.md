# Implantação das explorações — versão 0.4

`src/sites.js` contém uma cena local para cada uma das **13 explorações** e outra para a **sede**. As 14 fotografias aéreas do pacote foram revistas individualmente. O objetivo é respeitar a organização visível de cada local — forma, alas, orientação relativa, caminhos, água e construção — em vez de repetir o mesmo conjunto de estufas em todos os locais.

Os ficheiros originais, as anotações e a atribuição presente nas imagens foram preservados. Não foram descarregados tiles, imagens adicionais ou malhas do Google, nem ativada uma API paga.

## Referência usada em cada cena

| Local | Leitura da fotografia e representação | Limite principal |
| --- | --- | --- |
| Tomates do Oeste | Cinco volumes: cobertura noroeste que alarga em degraus, grande ala leste e volume sudeste; caminho do lado leste. | Os degraus retangulares aproximam o contorno inclinado, sem delimitar a propriedade. |
| Framboesa Encantada 2 | Três faixas formam o retângulo a sudoeste dos Tomates do Oeste; acesso e reservatório alongado a oeste. | Os dois locais têm cenas próprias, sem inventar uma estrada ou distância de jogo entre elas. |
| Fenómeno Galopante | Três troços sucessivos num eixo oblíquo, norte mais estreito, água a leste/sudeste e caminho a oeste. | Ângulo estimado visualmente. |
| Framboesa Encantada 1 | Cabeça norte e duas alas a sul, com planta escalonada; acesso pelo lado oeste. | O pin e a Rua da Paz orientam a leitura da imagem, sem comprovar o portão exato. |
| Várzea Vibrante | Cobertura comprida e estreita, extremidades menores, reservatórios norte e sul e caminho lateral. | O recorte estreito omite parte do contexto e dos limites laterais. |
| Linos | Sete alas de tamanhos diferentes, corredores interiores, vazio central/sudoeste e reservatório noroeste. | Os 35 ha são área declarada da exploração, não uma medição da cobertura nesta imagem. |
| Ritual Frutado | Faixas compridas separadas por caminhos, ala a sudoeste e grande reservatório na zona sul central. | A fotografia deste ficheiro tem a legenda «Greenhouse Vale da Borra-GPP»; não foi deduzido que Vale da Borra é o mesmo local nem alterado o seu enquadramento no grupo. |
| Deusas da Montanha | Três patamares com estruturas em construção, caminhos de obra e solo de terraplenagem. | Não foram inventadas culturas em produção. As cotas 0/3,5/7 m são apenas visuais; 18 ha projetados e cerca de 4 ha quase concluídos são os valores do requisito. |
| Greenaura | Conjunto compacto, com duas alas principais e troço norte menor; caminho lateral. | A baixa resolução impede validar o número real de vãos e os limites. |
| Nutriveg 2 | Exatamente 11 estufas pequenas, baixas, de madeira e telhado de duas águas, organizadas em três filas com recorte noroeste. | Número, material e cultura de pepino vêm dos requisitos; altura visual de 3,4 m e posição de cada volume são estimadas. |
| Nutriveg 1 | Grande cobertura branca escalonada, ala central mais profunda e alas laterais desiguais; dois reservatórios e apoio a norte. | Não existe polígono medido do contorno ou planta dos setores. |
| Lagoa Bondosa | Quatro setores oblíquos, corredores longitudinal/transversal, água e apoio do lado oeste/noroeste. | As culturas declaradas não foram atribuídas a setores reais específicos. |
| Campo de Demonstração | Pequena cobertura comprida, norte mais estreito, acesso leste e via sul; entrada branca, vedação verde e bancadas usam também as fotografias enviadas. | A posição exata da entrada e das bancadas não foi medida. O parque virtual é maior que o que se pode inferir da pequena parcela de 0,73 ha. |
| Sede | Quatro volumes industriais ortogonais, pátios laterais e reservatório a leste. Não foram criadas estufas agrícolas neste local. | Só exterior; sem planta interior validada, posições reais de departamentos ou cais individuais. |

## O que é estimado e o que é conhecido

Os **14 pontos WGS84** do mapa regional vêm dos links fornecidos pelo utilizador e estão registados separadamente em `dados/localizacoes_maps.json`. A posição de um pin não georreferencia todos os cantos da fotografia, não fornece altitude e não valida a área dos blocos.

As coordenadas das cenas são locais, com unidades aproximadamente métricas e dimensões proporcionais ao porte declarado de cada exploração. As coberturas têm áreas amplamente compatíveis com as áreas declaradas, mas não há equivalência exigida: uma exploração pode incluir caminhos, água, solo aberto, instalações e parcelas que não aparecem integralmente na imagem. As áreas do catálogo não foram recalculadas pelas malhas nem substituídas.

O eixo X é horizontal na planta local e Z aumenta para a zona inferior da referência. Uma `rotation` positiva corresponde a `rotation.y = -rotation` no renderizador. Os ângulos são interpretados da imagem, **não azimutes topográficos medidos**. Não se anuncia escala cadastral, cotas de terreno ou alinhamento exato com Google 3D.

Cada cena recebe um **anexo operacional virtual**, a sul dos volumes de referência, com parque de 140 × 100 unidades e espaço para os oito veículos. Este parque e as posições de pessoas/veículos permitem experimentar as manobras e não pretendem indicar lugares reais. A colocação dos volumes de apoio de posição incerta também é uma aproximação. Os caminhos foram ajustados para evitar atravessar as malhas dos edifícios e estufas.

A mudança de exploração carrega a respetiva cena local; não comprime dezenas de quilómetros numa estrada fictícia nem altera os pontos do mapa regional.

## Dados e validação

- `SITE_IDS`: 13 explorações mais sede.
- `FARM_IDS`: apenas as 13 explorações do catálogo original.
- `SITE_LAYOUTS` / `getSiteLayout(id)`: volumes, caminhos, água, patamares, parque, pontos de entrada e enquadramento de câmara por local.
- `placementAccuracy: estimated_from_reference` e `notes`: proveniência e limites da interpretação.
- `rectangleEnvelope`: enquadramento das formas, incluindo as que rodam na planta.

`tests/sites.test.js` valida a existência e correspondência das 14 referências, as diferenças importantes entre os locais, as 11 estufas de madeira, os três patamares de obra, a dimensão ampla face às áreas declaradas, caminhos sem interseção com blocos, parque e saída livres para pessoas/veículos e limites de cena que contêm a geometria rodada. Estes testes não comprovam que os limites reais da propriedade foram levantados.
