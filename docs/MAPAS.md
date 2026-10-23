# Localizações reais e cenário jogável

A pedido do utilizador, **continuamos por agora sem chave API**. O percurso jogável é local, aproximado e independente do Google. O código do visualizador geográfico está preparado, mas está **desativado e não foi validado contra a API real**.

## O que existe

- `src/geography.js`: validação de latitude/longitude, seleção apenas de pontos explicitamente confirmados e cálculo aproximado de distâncias geodésicas em metros.
- **Mapa** abre uma vista regional com os 14 pontos obtidos dos links fornecidos, sem chave ou SDK. Tem deslocação, zoom, norte e escala métrica aproximada. “Oeste” enquadra os 13 locais próximos; “Todos os locais” inclui a Lagoa Bondosa, cerca de 63 km dos Tomates do Oeste em linha geodésica. Cada ponto abre o link original e a fotografia aérea fornecida.
- `dados/localizacoes_maps.json` regista a origem e coordenadas de cada ponto. Foram usados os pins `!3d/!4d` dos links de local, ou as coordenadas explícitas dos links de pesquisa. Os centros de câmara `@lat,lng` não foram usados como localização do local. A Framboesa 2 usa o novo link `https://maps.app.goo.gl/jz5Z8UA2KFo1CiUp8`.
- As referências aéreas são imagens originais fornecidas pelo utilizador, apresentadas intactas com as anotações e atribuição visível. Não são texturas do terreno, nem tiles descarregados pela aplicação.
- Dados guardados antes desta versão recebem os pontos fornecidos onde as coordenadas eram nulas. Coordenadas já editadas são preservadas. A edição manual continua disponível.
- `src/google-map.js`: carregamento condicionado da Maps JavaScript API, biblioteca `maps3d`, `Map3DElement` e marcadores interativos. Contém tratamento de falhas de carregamento/autenticação e mantém os controlos/créditos do fornecedor.
- Os 14 pontos foram resolvidos dos links fornecidos. Isso identifica a localização, sem definir limites, acessos ou dimensões de estufas. Vale da Borra continua sem área ou localização confirmada; é uma relação de apoio, não uma 14.ª exploração do catálogo.
- O SDK só é solicitado depois de existir chave, ativação explícita, pelo menos uma posição confirmada e de o utilizador carregar no botão para abrir o mapa. O modo local não faz chamadas Google.

## Escala e precisão

A vista regional usa projeção equiretangular local, raio médio terrestre, origem 39.15° N, 9.30° W. A escala é consistente dentro dessa projeção, aproximada em relação ao terreno; não é um levantamento nem um mapa de estradas.

A versão 0.4 tem 14 cenas locais (13 explorações e sede). As unidades procuram representar metros: personagens de cerca de 1,8 m e veículos proporcionais, mas os comprimentos, ângulos, alturas e limites de cada exploração foram estimados pelas referências. As áreas declaradas em hectares não são medições das malhas. O minimapa mantém escala local estimada e identifica essa limitação. As viagens entre explorações são rápidas; não existe uma rede contínua de estradas reais que una os locais. Ver `IMPLANTACOES.md`.

O visualizador Google usa coordenadas geográficas e a escala do fornecedor, com parâmetro de câmara `range` em metros. Isso não garante precisão cadastral, dados recentes, reprodução exata dos limites, resolução das estufas ou cobertura 3D nestes locais. Um ponto confirmado identifica o local, mas não os seus limites ou acessos.

O cálculo de distância da app usa uma esfera terrestre de raio médio 6 371 008,8 m. É uma aproximação geodésica entre pontos, não um percurso de condução, levantamento topográfico ou medida de área. Os testes usam coordenadas matemáticas sintéticas, não posições de explorações.

A vista Google preparada é um **visualizador geográfico**. A personagem, os veículos e as colisões continuam nas cenas locais. Alinhar o mundo jogável a escala real, ajustar alturas ao terreno, definir vias e colisores e gerir carregamento a grandes distâncias é trabalho posterior. Não foi implementada extração de malhas ou conversão automática do Google Maps num jogo. A hipótese Map Tiles API/Photorealistic 3D Tiles com outro renderizador só deve ser avaliada se essa integração jogável for necessária e os termos permitirem o uso pretendido.

## Fontes oficiais consultadas

Numa primeira tentativa em 22/10/2026, o proxy devolveu `Tunnel connection failed: 403 Forbidden` nas tentativas de consultar:

- https://developers.google.com/maps/documentation/tile/3d-tiles
- https://developers.google.com/maps/documentation/javascript/3d/overview
- https://developers.google.com/maps/documentation/tile/policies
- Link curto de Tomates do Oeste: `maps.app.goo.gl/hawVq8WysLn2pah29`.

Foi possível consultar o repositório oficial atual de exemplos JavaScript do Google:

- https://github.com/googlemaps-samples/js-api-samples
- https://github.com/googlemaps-samples/js-api-samples/tree/main/samples/3d-simple-map
- https://github.com/googlemaps-samples/js-api-samples/tree/main/samples/3d-marker-click-event
- https://github.com/googlemaps-samples/js-api-samples/tree/main/samples/3d-simple-marker

Foram lidos os ficheiros TypeScript, o HTML de carregamento e os README correspondentes através de `raw.githubusercontent.com`. Confirmam o uso de `importLibrary('maps3d')`, `Map3DElement`, coordenadas geográficas e marcadores. O repositório identifica os exemplos como Apache-2.0 e remete o uso do serviço para os termos Google Maps Platform. Não foram usados os pontos geográficos dos exemplos no catálogo da empresa.

Posteriormente, nesta sessão, os links públicos passaram a responder com redirecionamentos HTTP 302. Os 14 pontos foram obtidos desses links, incluindo a nova ligação da Framboesa 2. Isso não ativou o SDK ou qualquer API paga.

A consulta das políticas completas, dos preços atuais, do acesso à conta e da cobertura específica continua pendente. Não foi ativado projeto Google, faturação, serviço pago ou acesso à API.

## Como obter acesso quando se decidir avançar

1. Entrar em https://console.cloud.google.com/ com uma conta Google e criar um projeto.
2. Consultar preços e condições atuais em https://developers.google.com/maps/billing-and-pricing/overview e definir orçamento, alertas e quotas apropriadas. Alertas de orçamento não são, por si só, limites automáticos de despesa.
3. Associar faturação apenas depois de aceitar os custos e ativar a **Maps JavaScript API**. Confirmar no projeto o acesso ao produto/biblioteca 3D e eventuais requisitos adicionais atuais. Não ativar a Map Tiles API só por ser mencionada como alternativa futura.
4. Em **APIs e serviços → Credenciais**, criar uma chave de navegador. Restringir por websites/referrers que realmente servirão a aplicação e pela API necessária. Rever as instruções atuais da Google para esse tipo de chave.
5. Configurar a chave no ambiente, sem a enviar no chat. Para trabalhar localmente, copiar `.env.example` para `.env.local` e preencher `VITE_GOOGLE_MAPS_BROWSER_KEY`. O ficheiro `.env.local` é ignorado pelo Git. Uma chave de navegador fica visível no cliente/bundle; as restrições por origem e API são indispensáveis. Não usar credenciais de servidor ou de outras aplicações.
6. Depois de aceitar a utilização e custos, definir `VITE_ENABLE_GOOGLE_MAPS=true` e reiniciar o Vite; recompilar se estiver a servir `dist/`. Não existe chave de exemplo funcional ou credencial embutida.
7. Confirmar as coordenadas dos locais no painel da aplicação e abrir o visualizador. Validar autenticação, cobertura, créditos, rede, escala e erros antes de anunciar o modo real como pronto.

## Rede e continuidade

Foram adicionados **ao rascunho** os domínios `developers.google.com`, `maps.app.goo.gl`, `www.google.com` e `maps.google.com` para consultar documentação e links. Guardar o rascunho não altera automaticamente a instância; voltar a testar depois de uma mudança efetiva. Os links públicos foram novamente testados e responderam; a API 3D continua desligada e sem teste autenticado.

O futuro carregamento do SDK usa `maps.googleapis.com` e pode requerer destinos adicionais do fornecedor. A política de rede deverá ser revista com os destinos efetivamente observados quando houver ativação autorizada. Isto não é necessário para a demonstração local.

A atribuição Google é mantida no componente fornecido. Não são extraídos tiles, imagens ou modelos, não são descarregadas imagens/tiles do fornecedor para uso offline pelo SDK e não se usa geocodificação paga. As fotografias do utilizador orientam a modelação e podem ser consultadas como referências no painel de cada local, preservando a atribuição visível.

## Exportação para Google My Maps sem chave

`dados/Exploracoes_Patricia_Pilar.kml` contém os 14 pontos em KML, com nomes e os links de origem. `dados/Exploracoes_Patricia_Pilar.geojson` contém os mesmos pontos em GeoJSON, sempre na ordem longitude, latitude. São pontos fornecidos, não polígonos de propriedades.

Para colocar os pontos num mapa Google próprio, em https://mymaps.google.com/ criar um mapa → Importar → selecionar o KML. Não exige uma chave de desenvolvimento. Isso não ativa a API 3D nem converte os pontos em modelos de estufas. O KML inicial acompanha a entrega ZIP; alterações posteriores feitas no navegador devem ser exportadas por JSON e reconciliadas antes de regenerar os ficheiros geográficos.
