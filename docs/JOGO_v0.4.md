> Documento arquivado da versão 0.4 do jogo. O projeto atual é o [mapa interativo das explorações](../README.md). Os comandos e ficheiros abaixo pertencem à versão anterior.

# Grupo Patrícia Pilar · Mundo 3D — 0.4

Demonstração jogável para computador, em português de Portugal, com **13 explorações e a sede em 14 cenários locais**. Cada cenário tem uma implantação própria, aproximada a partir da fotografia aérea fornecida. Há oito veículos conduzíveis, personagem em terceira pessoa, mapa regional, equipa, edição de dados e conversas técnicas simuladas.

As posições dos **14 pontos do mapa regional** provêm dos links Maps fornecidos. As dimensões, alturas, acessos e limites das malhas 3D continuam **estimados**; não são um levantamento georreferenciado ou uma reprodução fotorrealista. O modo local não exige chave API ou serviços pagos.

## Experimentar no Windows

1. [Transfere o ZIP do jogo 0.4](https://github.com/demoapps26/Emanuel/raw/refs/heads/main/downloads/Patricia_Pilar_Mundo_3D_v0.4.zip). A alternativa com todo o código está em **Code → Download ZIP** no [repositório](https://github.com/demoapps26/Emanuel/tree/main).
2. Nas Transferências, clica com o botão direito no ZIP e escolhe **Extrair tudo**.
3. Na pasta extraída, abre **JOGAR.html** no Chrome ou Edge.
4. Carrega em **Começar a explorar**.

**JOGAR.html é agora o jogo completo num único ficheiro.** Não redireciona para `docs/index.html` e não precisa de ficheiros ao lado para arrancar. Pode ser copiado sozinho para outra pasta. Extrair o ZIP continua a ser a forma recomendada de o obter. O `index.html` da raiz pertence ao desenvolvimento; para experimentar, escolhe JOGAR.html.

Requer WebGL2; recomenda-se aceleração gráfica. O Chromium da nuvem bloqueia `file://` por política administrativa: essa política foi mantida. A versão autónoma é validada por HTTP com o mesmo conteúdo; a abertura direta no computador do utilizador depende das políticas do navegador e ainda precisa de confirmação nesse equipamento.

## Explorar os locais

Em **Explorações**, escolhe um local e carrega em **Visitar em 3D**. O painel de um ponto no **Mapa** também permite visitar o respetivo cenário. A personagem chega perto das fachadas; **Ir às estufas** permite regressar a essa zona. **R** reinicia a personagem e os oito veículos da exploração atual no parque.

As mudanças entre explorações são viagens rápidas. Não existe uma rede contínua de estradas jogáveis entre os 14 locais. As distâncias do mapa regional são geográficas e aproximadas; não correspondem à distância percorrida numa viagem rápida.

As referências orientam as plantas escalonadas, orientações, corredores e reservatórios. A Nutriveg 2 tem **11 estufas pequenas com estrutura de madeira**. As Deusas mostram construção em **três patamares**, sem culturas produtivas inventadas ou condução nos patamares elevados. O Campo de Demonstração inclui entrada, vedação e bancadas inspiradas nas fotografias. A sede tem volumes de armazéns. As notas de cada implantação e as aproximações estão em [docs/IMPLANTACOES.md](IMPLANTACOES.md).

O parque de veículos junto de cada cenário é um **anexo virtual de manobra**, não uma indicação de onde a frota está estacionada nem uma parcela real acrescentada à exploração.

## Condução e controlos

Oito tipos: carro técnico; carrinhas Agropilar, controlo biológico e técnico agrícola; camião com semirreboque; camião rígido frigorífico; trator agrícola verde; trator compacto laranja.

Abre **V / Veículos**, escolhe o equipamento para te aproximares da cabine e carrega em **E** para entrar. Trava antes de sair. Os tipos têm dimensões, aceleração, limites de velocidade e direção próprios. O semirreboque articula nas curvas e em marcha-atrás; as colisões consideram a cabine e o reboque. As rodas acompanham o movimento e a direção. É uma simulação simplificada, sem operações hidráulicas, acoplamento de alfaias ou tarefas reais de equipamentos.

| Comando | Ação |
| --- | --- |
| W A S D / setas | Andar; ao volante, acelerar, virar, travar e recuar |
| Shift | Correr a pé |
| Arrastar rato / roda | Rodar a câmara / aproximar ou afastar |
| E / Espaço | Entrar ou sair depois de parar / travar |
| V / Veículos | Escolher e aproximar-se de um veículo |
| B | Alternar vista aérea da implantação; suspende o movimento |
| F / T | Consultar a pessoa próxima / abrir a equipa |
| C / Conversas | Escolher uma conversa técnica simulada |
| M / I | Mapa local / informação da exploração atual |
| R | Reiniciar a personagem e a frota da exploração atual no parque |
| Esc | Pausar ou fechar painel e retomar |

Em **? → Qualidade gráfica**, escolhe Baixa, Média ou Alta. A baixa reduz a densidade de plantas, os materiais, a resolução e as sombras para renderização por software; Média/Alta usam mais recursos da GPU. O contador mede o navegador atual. Não se garantem 60 FPS ou desempenho validado numa GPU física. As imagens de conceito são referências de intenção, não capturas do resultado atual.

## Pessoas, conversas e dados

Emanuel Franco é a personagem controlada. Nuno, Hernani, Miguel e Rafael têm uma entidade 3D cada, reutilizada nos cenários. Viajar para outra exploração não cria cópias da mesma pessoa. Os restantes membros continuam disponíveis nos perfis e nas associações do catálogo.

Nuno tem chefia geral. César é responsável da Framboesa 2 e apoia Lagoa, Várzea e Fenómeno. Emanuel mantém as suas associações às explorações. Hernani e Miguel acompanham os agricultores referidos; Vale da Borra permanece numa relação separada, com enquadramento, área e localização por confirmar. Rafael tem responsabilidade de equipamentos e apoio à construção. Os dois David continuam separados até confirmação da identidade.

As **11 conversas e 22 abordagens** são exemplos fictícios escritos, associados aos IDs existentes. Podem ser filtrados por pessoa e exportados. Não existe IA em direto, envio de mensagens a pessoas reais, diagnóstico por sensores ou criação de ordens de trabalho. **Dia de campo** acompanha apenas objetivos da sessão.

Em **Explorações → Editar informação**, podes editar áreas e culturas, associar pessoas e acrescentar, editar ou encerrar períodos de cultivo. As alterações ficam no navegador; **Exportar dados** e **Importar dados** permitem transportar cópias JSON, com validação e confirmação antes da substituição. Não existe backend ou sincronização. Cópias da versão 0.3 são preservadas; dados antigos `schemaVersion: 1` migram para `2`. Não é necessário apagar o armazenamento para atualizar. Mudar de ficheiro, navegador ou origem pode mudar o armazenamento disponível: exporta uma cópia antes.

As posições da frota são mantidas **durante a sessão** ao mudar de cenário e regressar; não são localizações reais ou um registo persistente de frota.

Área declarada das explorações sem Deusas: **129,23 ha**. Deusas tem **18 ha projetados**, com cerca de **4 ha quase concluídos**, separados da área em produção. Áreas do catálogo e áreas desenhadas nas malhas são conceitos distintos.

## Mapas e referências

O mapa regional inclui pan, zoom, norte e escala métrica aproximada. Cada ponto abre a imagem aérea original e o link Maps. As imagens fornecidas são preservadas com as anotações e atribuição visível; não são usadas como texturas do terreno. Não foram extraídas malhas ou tiles Google para construir o jogo.

O visualizador Google 3D continua opcional e desligado, sem validação contra uma API real. Não foi ativada faturação. O KML em `dados/Exploracoes_Patricia_Pilar.kml` pode ser importado no Google My Maps sem chave de desenvolvimento; contém os 14 pontos, não os limites das propriedades. Mais informação em [docs/MAPAS.md](MAPAS.md).

## Desenvolvimento e verificação

Node.js 22.12+ e npm; a instância usa Node 24.19.0. As dependências estão fixadas no lockfile.

```bash
npm ci
npm run dev
```

Para compilar a versão autónoma:

```bash
npm run standalone
```

O comando gera o mesmo jogo completo em **JOGAR.html**, **docs/index.html** e **release/Patricia_Pilar_Mundo_3D.html**. A compilação normal `npm run build` cria `dist/`, que deve ser servido por HTTP; `npm run preview` permite consultá-la localmente.

Para atualizar também o ZIP dedicado em `downloads/`, usa `npm run package:download` (requer Python 3 apenas no empacotamento).

```bash
npm test
npm run test:browser
```

O teste de navegador requer um servidor ativo, Chromium em `/usr/bin/chromium` ou `CHROMIUM_PATH`, e aceita `TEST_BASE_URL`. Resultados e capturas ficam em `test-results/`. `node scripts/check-graphics.mjs` permite capturas reais, com `CAPTURE_DIR` e `CAPTURE_QUALITY` opcionais. Consulta os resultados e limites efetivamente medidos em [docs/VALIDACAO.md](VALIDACAO.md).

Código principal: `sites.js` define as implantações; `simulation.js` e `fleet.js` tratam do estado e condução; `world.js`, `agriculture.js` e `heavy-vehicles.js` renderizam os cenários; `data.js` mantém o catálogo e as edições; `main.js` controla a interface. Os 21 ficheiros originais estão preservados em `materiais/Patricia_Pilar_Mundo_3D_Codex/`.
