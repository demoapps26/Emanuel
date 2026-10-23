# Validação do mapa interativo — versão 1.0

Verificado em 23/10/2026, em Chromium 154 na nuvem, com Node 24.19.0. A aplicação de consulta é independente do jogo anterior.

## Resultados

- `npm test`: **66 testes aprovados**, incluindo cinco específicos do modelo do mapa e os testes anteriores dos dados, pessoas, coordenadas e simulação conservada.
- `npm run map:package`: compilação e ZIP aprovados. `MAPA.html`, `docs/mapa.html` e a cópia em `release/` contêm o mesmo HTML completo.
- `TEST_MAP_BASE_URL=http://127.0.0.1:8090/MAPA.html npm run test:map:browser`: **24 verificações aprovadas** sobre a versão autónoma real, sem `script[src]`, sem redirecionamento e sem cena 3D.
- Os **14 pontos** no DOM do mapa foram comparados às coordenadas originais de `dados/localizacoes_maps.json`.
- As **14 fotografias aéreas incorporadas** foram abertas no navegador e comparadas por SHA-256 aos PNG originais. Não foram substituídas por texturas ou imagens geradas.
- Verificadas as fichas sem rede, culturas, áreas, pessoas associadas, pesquisa sem acentos, filtros combinados, ausência de resultados, dados das Deusas e funções da sede.
- Verificados clique, Enter e Espaço nos pontos, ampliação e deslocação da imagem, reposição do enquadramento, fecho por Escape, abertura de ligação com fragmento, exportação KML e preservação dos dados guardados.
- Verificado ecrã de **390 × 844**, lista, ficha e fotografia sem excesso horizontal ou controlos essenciais fora do ecrã.
- **Zero erros JavaScript e zero pedidos à API Google** durante a bateria.

O HTML final tem SHA-256 `d7fbf5698c0e8c8a16807b2e6c51b49bbc7218829dfaedf420883102eb0f5d49`. O ZIP contém `MAPA.html`, instruções, KML e GeoJSON; o HTML aí incluído é comparado ao ficheiro compilado.

## Imagens online e funcionamento sem rede

Os pedidos reais aos servidores de imagens Esri e OpenStreetMap foram bloqueados pela ligação da nuvem; as sondagens HTTP devolveram erro de túnel 403. **Não foi validado o carregamento efetivo do fundo satélite nesta máquina.** As capturas de teste mostram a base vetorial de referência e as fotografias fornecidas.

A bateria exercita também uma falha de rede controlada e o botão de nova tentativa. Não substitui tiles por imagens artificiais e não anuncia satélite carregado quando há erro. O mapa mantém os pontos e as fichas sobre a base Natural Earth, com aviso claro. O ensaio sem rede confirma que todas as fotografias fornecidas continuam disponíveis.

O fundo satélite e o mapa de ruas são recursos online opcionais. A sua cobertura, data, conectividade e disponibilidade dependem dos fornecedores. Não foi configurada chave Google, API paga ou faturação.

## Precisão e distribuição

Os pontos são os extraídos dos links enviados. As fotografias mantêm as anotações originais, mas não são rasters georreferenciados: abrem como referências na ficha. Não foram inventados polígonos das estufas ou limites cadastrais. As notas Ritual/Vale da Borra e os valores projetados das Deusas são conservados.

A política administrativa do Chromium da nuvem bloqueia `file://` e não foi alterada. Foi testado o conteúdo completo por HTTP. A abertura direta no computador do utilizador ainda depende do navegador e das suas políticas. O ficheiro inclui código, estilos, dados, base vetorial e fotografias; não depende de ficheiros adjacentes.

O projeto é entregue no mesmo repositório GitHub. Não foi ativado GitHub Pages ou criado outro serviço de alojamento. A base vetorial deriva de Natural Earth, de domínio público; Leaflet e os fornecedores dos fundos mantêm a atribuição. Os materiais originais foram preservados.
