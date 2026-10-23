# Veículos pesados e equipamentos

`src/heavy-vehicles.js` acrescenta quatro modelos procedurais ao carro e às três carrinhas existentes:

- Camião com semirreboque frigorífico, cabine branca, cinco eixos, rodado de direção e articulação independente. A decoração com frutos e a frase «Da terra para o Mundo.» aproxima as fotografias fornecidas.
- Camião rígido frigorífico de distribuição, mais curto, com dois eixos. É uma variante de demonstração, não a reprodução de um veículo específico fotografado.
- Trator agrícola verde, com rodas traseiras maiores, piso de pneus em relevo, cabine envidraçada, banco, volante, escape, luzes de trabalho e engate traseiro de três pontos.
- Trator compacto laranja, com carroçaria e rodado menores. Não foram atribuídos marca ou modelo reais aos tratores, porque não havia fotografias ou dimensões confirmadas desses equipamentos.

Os modelos têm peças rígidas combinadas por material, mantendo grupos separados para rodar as rodas, orientar as rodas dianteiras e articular o semirreboque. As dimensões são aproximadas para a simulação, não medidas de engenharia ou características dos veículos reais.

## Contrato com a simulação

`createHeavyVehicle(kind, {canvasMaterial?})` devolve `{model, wheels, articulation?, bounds}`. Os `kind` são `truck`, `rigid_truck`, `tractor`, `orchard_tractor`. `createHeavyVehicles` cria os quatro e devolve também os mapas por tipo.

Os modelos recebem uma escala 0,5 na raiz. `bounds` e os raios das rodas já estão nas unidades do mundo; não aplicar a escala novamente. Espelhos e pequenos marcadores podem ultrapassar a largura nominal em poucos centímetros. Frente = −Z; `model.rotation.y = -vehicle.yaw`.

Cada entrada de `wheels` tem `mesh`, `radius`, `steer` e `steeringParent`. O grupo `mesh` roda em X; o `steeringParent`, quando existe, roda em Y.

Para `truck`, `articulation.trailer` é o grupo do semirreboque. O engate está em Z=−4,5 no mundo (`pivotLocalZ=-9` antes da escala). A caixa do semirreboque tem comprimento 15 e centro 6,5 unidades atrás do engate. A rotação relativa é `-(trailerYaw - yaw)`. A cinemática e as colisões pertencem a `simulation.js`; não são deduzidas pela geometria gráfica.

## Verificação

Os quatro modelos foram construídos em Node sem DOM, com verificação de vértices finitos, limites, rodas e pivô. Também foram renderizados em Chromium com SwiftShader numa cena isolada: frente dos quatro tipos e traseira do trator. Foram inspecionadas as capturas reais, o carregamento das artes procedurais e a ausência de erros JavaScript. Isso verifica a geometria, não o desempenho ou condução do jogo integrado.
