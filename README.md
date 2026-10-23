# Patrícia Pilar · Mapa interativo das explorações

Um mapa para consultar as **13 explorações e a sede**. Clica num ponto ou num nome para abrir a área declarada, culturas, responsáveis, observações e fotografia aérea do local. As localizações vêm dos links Maps que enviaste.

## Abrir o mapa

1. **[Transferir o mapa — ZIP](https://github.com/demoapps26/Emanuel/raw/refs/heads/main/downloads/Mapa_Exploracoes_Patricia_Pilar_v1.0.zip)**.
2. Nas Transferências, clica com o botão direito no ZIP e escolhe **Extrair tudo**.
3. Abre **MAPA.html** no Chrome ou Edge.

O ficheiro MAPA.html contém a aplicação, as fichas e as 14 fotografias aéreas. Não precisas de instalar programas nem de uma chave Google para o usar. O ZIP inclui também as localizações em KML e GeoJSON.

## Consultar uma exploração

- **Clica num ponto ou numa exploração da lista** para ver a ficha.
- **Pesquisa** pelo nome da exploração, cultura ou pessoa; os filtros permitem combinar cultura/tipo com a pessoa associada.
- **Oeste** aproxima os locais dessa região; **Todos os locais** inclui também a Lagoa Bondosa, em Alcochete.
- Usa a roda do rato ou os botões **+ / −** para ampliar o mapa e arrasta para o deslocar.
- Abre a **fotografia aérea** na ficha e amplia-a com os botões ou a roda do rato. Podes arrastar a fotografia para consultar pormenores.
- A ligação **Google Maps** de cada ficha abre o ponto original fornecido.

As fichas distinguem explorações, construção e sede. As pessoas mantêm as suas associações: por exemplo, César é responsável da Framboesa 2 e apoia Lagoa, Várzea e Fenómeno. Responsáveis não identificados aparecem por confirmar.

## Fundos do mapa e utilização sem rede

**Satélite** usa imagens Esri; **Mapa** usa OpenStreetMap. Estes fundos precisam de Internet e mantêm a atribuição dos fornecedores. A cobertura e a data das imagens dependem da fonte; não são imagens em direto.

**Sem rede** apresenta os mesmos pontos sobre uma base vetorial Natural Earth incluída no ficheiro. Esta base dá contexto geográfico, mas não contém ruas ou pormenores das estufas. As fichas e as **14 fotografias fornecidas continuam disponíveis sem Internet**. Se o fundo online não carregar, o mapa mantém essa consulta disponível.

## Informação e precisão

Os pontos indicam as localizações dos links enviados, **não os limites dos terrenos ou de cada estufa individual**. As fotografias originais conservam as anotações e atribuições visíveis.

A informação inicial foi recolhida em **22/10/2026**. O catálogo declara **129,23 ha**, excluindo as Deusas. As **Deusas da Montanha têm 18 ha projetados e cerca de 4 ha quase concluídos**, apresentados separadamente da área declarada das outras explorações.

O link e a fotografia associados a **Ritual Frutado** têm a designação «Greenhouse Vale da Borra-GPP» na fonte. O mapa preserva a associação recebida e assinala esta diferença na ficha, sem fundir as duas identidades.

Se existirem edições descritivas guardadas pela versão anterior no mesmo navegador e origem, o mapa pode recuperá-las. As posições usam sempre os **pontos originais dos links**, mesmo que tenham sido editadas coordenadas na demonstração anterior. Este mapa permite consultar informação; não altera os dados guardados.

Os 21 ficheiros do pacote original permanecem em `materiais/Patricia_Pilar_Mundo_3D_Codex/`. As localizações estão em `dados/localizacoes_maps.json`. A base vetorial em `dados/mapa-contexto.geojson` deriva de [Natural Earth](https://www.naturalearthdata.com/), de domínio público. As fotografias são as referências fornecidas; as atribuições da fonte foram preservadas.

## Desenvolvimento

Requer Node.js 22.12+ e npm. As dependências estão fixadas no lockfile.

```bash
npm ci
npm run map:dev
```

Abre **http://localhost:5174/mapa-entry.html**.

```bash
npm run map:build
```

Gera o mesmo mapa autónomo em `MAPA.html`, `docs/mapa.html` e `release/Mapa_Exploracoes_Patricia_Pilar.html`. O código de desenvolvimento está em `src/map-app.js`, `src/map-model.js`, `src/map-details.js` e `src/map-app.css`; a entrada `mapa-entry.html` pertence ao desenvolvimento.

Para atualizar também o ZIP de entrega:

```bash
npm run map:package
```

O empacotamento do ZIP usa Python 3; isso só é necessário a quem prepara a entrega.

```bash
npm test
npm run test:map:browser
```

O teste de navegador requer um servidor do mapa ativo e Chromium. Os resultados são registados depois da execução; não é necessário executar testes para usar MAPA.html.

Por omissão, o teste abre `http://127.0.0.1:8090/MAPA.html`. Podes servir a pasta do projeto com `python3 -m http.server 8090 --bind 127.0.0.1` noutro terminal ou indicar um URL em `TEST_MAP_BASE_URL`.

Foram aprovados 66 testes e 24 verificações no navegador, incluindo os 14 pontos e as 14 imagens originais. Os resultados e limites da verificação dos fundos online estão em [docs/MAPA_VALIDACAO.md](docs/MAPA_VALIDACAO.md).

Os ficheiros anteriores do jogo foram conservados. A documentação dessa versão está arquivada em [docs/JOGO_v0.4.md](docs/JOGO_v0.4.md). A entrada do projeto atual é **MAPA.html**.
