# Validação — versão 0.3

Validado em 23/10/2026 (Lisboa), Node 24.19.0, npm 11.9.0 e Chromium 154, com SwiftShader por software. A versão 0.2 está documentada separadamente em `VALIDACAO_v0.2.md`.

## Resultados

- `npm test`: 39 testes aprovados, sem falhas ou skips. Incluem dados, pessoas únicas, simulação/colisões, quatro veículos, conversas, pontos dos links e projeção métrica regional.
- `npm run standalone`: compilação aprovada; HTML autónomo com 6 414 189 bytes, incluindo as referências aéreas fornecidas. O aviso de bundle grande corresponde sobretudo às imagens incorporadas; não é erro de compilação.
- A entrega foi comparada byte a byte com `release/Patricia_Pilar_Mundo_3D.html`, e o corpo servido por HTTP é idêntico.
- `TEST_BASE_URL=http://127.0.0.1:8090/Patricia_Pilar_Mundo_3D.html npm run test:browser`: 24 verificações aprovadas, saída 0, zero erros JavaScript e zero pedidos à API Google.
- Verificação SHA-256: os 21 ficheiros do ZIP original continuam intactos.
- Os 14 pontos KML foram verificados na ordem longitude, latitude. São os pontos dos links do utilizador, não limites de propriedades.

O navegador exercitou arranque, movimento real por teclado, reinício, rotação por rato, entrada/condução/travagem/saída dos quatro veículos, consulta de personagens por aproximação e por perfil, identidade única, conversas e variantes, objetivos da sessão, pausa, mapa local, mapa regional com 13 pontos no Oeste/14 incluindo Lagoa, imagem aérea, edição de coordenadas, Google desativado, catálogo, edições/históricos, persistência após recarregar, importação/exportação, qualidade gráfica e janela pequena. Os testes usam perfil temporário; as coordenadas e áreas de teste não alteram a fonte.

Os testes foram ajustados para manter a aceleração durante a tentativa de sair do carro em movimento, alinhar a personagem a passo com carrinhas próximas e distinguir os botões do catálogo dos atributos de diagnóstico do HUD. Isso evita depender de fricção, overshoot ou seletores ambíguos em renderização por software.

## Gráficos e limites

Capturas reais foram inspeccionadas durante a revisão: estufas translúcidas, tubos metálicos, plantas/frutos geométricos, sombras, carroçaria e vegetação. A qualidade alta ficou muito lenta em SwiftShader. O teste completo terminou em qualidade baixa com **4 FPS e 234,8 ms/frame**; a janela curta do FPS e a média de frames diferem. Isso não é um benchmark de GPU. Não se afirma 60 FPS, compatibilidade universal ou desempenho validado em GPU física.

O modo baixo reduz instâncias de culturas e resolução, simplifica materiais e desliga sombras/reflexos. O alto restaura materiais, densidade e iluminação. O cenário continua estilizado e ainda não reproduz o realismo da referência de conceito. A implantação jogável é aproximada, distinta dos 14 pontos geográficos reais. Não foram levantados polígonos, acessos, altitudes ou dimensões das estufas. A comparação visual inclui uma nova posição inicial mais próxima das fachadas; não é uma comparação controlada com câmara idêntica.

## Abertura e distribuição

A política do Chromium da nuvem bloqueia `file://`; não foi alterada. Foi validado o mesmo HTML por HTTP. A abertura direta no computador do utilizador depende do navegador, políticas locais e aceleração WebGL2. O HTML inclui código, CSS e dados; as imagens aéreas estão incorporadas. Os links externos exigem Internet, o jogo local não pede chave API.

Na interface de chat, o link HTML pode abrir uma pré-visualização de código em vez de transferir/executar o ficheiro. Um caminho de ficheiro no ambiente não deve ser anunciado como URL pública. O utilizador reportou falha dos links ZIP e uma vista de código HTML. Foram dadas instruções para guardar o ficheiro original com extensão `.html` e abri-lo no Chrome/Edge; o download/abertura no computador do utilizador ainda não foi confirmado.

O GitHub API devolveu `Forbidden` nesta rede ao verificar uma alternativa de publicação. Não foi publicada aplicação, criado serviço público, feito push ou ativado GitHub Pages. A API Google e faturação continuam desligadas. O rascunho das instruções do ambiente foi guardado; aplicar/publicar esse rascunho e restaurar noutra sessão não foram verificados.
