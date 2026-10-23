# Validação — mapa e visita em 3D, versão 1.1

Validado em 23/10/2026, com Node 24.19.0 e Chromium 154 em renderização por software. A versão 1.0 está arquivada em `MAPA_VALIDACAO_v1.0.md`.

## Resultados

- `npm test`: **69 testes aprovados**. Incluem dados, pessoas únicas, coordenadas, as 14 implantações, colisões e veículos, além de chegada segura, presença específica do Rafael nas Deusas e atualização de cópias guardadas sem perder edições.
- `npm run test:explore:browser`: **22 verificações aprovadas** na aplicação autónoma real. Foram renderizados os 14 cenários, com personagem, movimento, câmara, pausa, consulta de fichas, miniatura aérea e planta local, condução de um trator, ida e regresso entre mapa e 3D e controlos de toque em 390 × 844.
- `npm run test:map:browser`: **24 verificações aprovadas** em `MAPA.html?vista=mapa`. Os 14 pontos foram comparados às coordenadas dos links e os 14 PNG incorporados foram comparados por SHA-256 aos originais. Pesquisa, filtros, fichas sem rede, ampliação, exportação KML e disposição móvel continuam verificados.
- Zero erros JavaScript ou de compilação de shaders na bateria 3D; zero erros JavaScript ou pedidos à API Google na bateria do mapa.
- O Rafael tem uma única presença física nas Deusas e uma associação a equipamentos e apoio à construção. Está ausente da descrição geral das outras explorações. As cópias anteriores recuperam essa associação ao serem abertas.
- `npm run map:package` gera o HTML completo e o ZIP 1.1. `MAPA.html`, `docs/mapa.html`, `release/Mapa_Exploracoes_Patricia_Pilar.html` e a cópia dentro do ZIP são idênticos.

HTML final: **6 709 641 bytes**, SHA-256 `26345dd848bd478e66bf27e7d9ea91b5a5aeea1aa8ebf1ea219a1c795333d272`.

A captura real em `visita_3d_v1.1.png` mostra qualidade Equilibrada. No renderizador por software foram observados cerca de 4 FPS nessa vista de computador. As verificações comportamentais usam depois qualidade Leve; o contador final em ecrã móvel indicava 21 FPS. Não são medições de uma GPU física, nem uma garantia de desempenho. Aceleração gráfica é recomendada.

## Representação e precisão

A vista Explorar usa geometria WebGL, personagem animada e movimentos com colisões. Inclui materiais translúcidos, estruturas, folhas recortadas, frutos geométricos, sombras, pátio de visita ilustrativo e veículos. O visual permanece estilizado e abaixo do realismo da imagem de conceito.

As implantações, alturas, acessos, pátios e escala local são aproximados a partir das referências. As mudanças entre explorações são viagens rápidas. Os pontos geográficos continuam separados da simulação local: a personagem só aparece na planta 3D aproximada, sem ser sobreposta como localização GPS na fotografia fornecida. Não foram inventados polígonos cadastrais ou uma rede regional contínua de estradas.

As fotografias originais, a diferença de designação Ritual/Vale da Borra e os valores projetados das Deusas foram preservados. A área declarada de 129,23 ha exclui os 18 ha projetados das Deusas, dos quais cerca de 4 ha quase concluídos.

## Rede e distribuição

O fundo satélite Esri e o mapa de ruas OpenStreetMap foram bloqueados pela ligação da nuvem (erro de túnel 403). Não foi confirmado o seu carregamento nesta máquina; a alternativa vetorial e as fichas/imagens sem rede foram testadas, sem imagens de tiles artificiais. Esses fundos são opcionais e requerem Internet. Não foi configurada chave Google ou faturação.

A política administrativa da nuvem bloqueia `file://` e foi mantida. Foi testado o mesmo HTML completo por HTTP. A abertura direta no equipamento do utilizador depende do navegador, WebGL2 e políticas locais. O ZIP inclui MAPA.html autónomo, instruções, KML e GeoJSON. A entrega continua no mesmo repositório GitHub, sem ativar GitHub Pages ou outro alojamento.
