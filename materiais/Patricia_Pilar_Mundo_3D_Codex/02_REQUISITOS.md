# Requisitos e plano de implementação

## Experiência pretendida
Mundo 3D com liberdade de movimento inspirado na navegação de jogos como GTA, com identidade própria, contexto agrícola e sem pretensão de reproduzir o orçamento ou complexidade de GTA. Vista em terceira pessoa, andar/correr, conduzir, entrar/sair de veículo, visitar explorações, minimapa e alternância entre mapa geral e exploração a pé. PC como alvo inicial proposto, a validar com o utilizador. Não há requisito de instalação ou motor já escolhido.

## Informação
13 explorações e uma sede: usar dados_exploracoes.json como fonte. Áreas são valores declarados; não são áreas medidas nas imagens. Culturas alteram-se de ano para ano ou dentro do ano: modelar períodos de cultivo com início/fim por setor opcional e preservar histórico. Responsáveis e áreas editáveis; valores desconhecidos nulos. Pessoas com identificadores estáveis e relações de várias pessoas para várias explorações/funções.

Guilherme é o mesmo nas duas Nutriveg; Mariano é o mesmo na Fenómeno Galopante e Várzea; César acompanha Framboesa 2 e apoia Lagoa; Emanuel apoia TO, ambas Nutriveg e Demonstração; Cristina supervisiona TO e apoia Demonstração. Não unificar os dois David até confirmação. Departamentos transversais apresentados em dados; abrangência de alguns ainda por confirmar.

## Geografia e imagens
Coordenadas e polígonos geográficos ainda não obtidos/validados. Links encurtados de TO e Fenómeno não abriram na ferramenta de consulta durante a conversa; os restantes foram recebidos, sem geocodificação validada. Framboesa 2 é vizinha a sudoeste da TO; não recebeu link próprio. Nas capturas a etiqueta Google nem sempre coincide com os limites indicados pelo utilizador. Priorizar a identificação fornecida por ele. Referências com fundos pretos são recortes, não delimitação cadastral exata. Nunca mostrar traços de contorno no resultado final. Alturas, fachadas, acessos e interiores não estão documentados.

Deusas da Montanha: três patamares de terraplanagem, área projetada 18 ha, 4 ha de estufas quase terminados. Não contar como 18 ha em produção; não inventar alturas dos patamares. Nutriveg 2: 11 pequenas estufas baixas com estrutura de madeira. Demonstração: cerca de 200 variedades, 0,73 ha, aproximadamente 700 m de TO segundo o utilizador.

## Sede e logística
Sede recebe todo o tomate colhido nas explorações; embalamento de tomate e outras frutas, incluindo pera Rocha e maçã; leilão; IT, RH, Contabilidade, Compras e outros departamentos a definir. Expedição para clientes como Mercadona (exemplo fornecido, sem afirmar integração comercial). Cenário pode simular transporte exploração → receção → embalamento → expedição. Não existe planta interior, posições de cais ou pessoal por departamento confirmado.

## Veículos e pessoas
Camiões Patrícia Pilar, carros dos técnicos e carrinha Agropilar para Camacho. Desenhos/logótipos/modelos reais pendentes; usar modelos provisórios identificados. Movimentos simulados, sem GPS real ou presença real inferida. Pessoas não têm fotos: usar avatares genéricos sem afirmar semelhança. Equipa operacional de referência 4–8 pessoas/ha é estimativa, não número real de trabalhadores por exploração.

## Primeira entrega proposta
1. Projeto executável e controlos documentados.
2. Personagem em terceira pessoa, andar/correr e câmara controlável.
3. TO e Framboesa 2 reconhecíveis pela disposição das referências; cenário aproximado enquanto geografia não estiver validada.
4. Colisões básicas que impeçam atravessar estufas/edifícios e movimentação coerente.
5. Um veículo conduzível, com entrada/saída sem prender a personagem.
6. Minimapa e painéis com nome, área, culturas, técnico, supervisão e apoios.
7. Catálogo das 13 explorações e sede, distinguindo locais modelados dos que ainda só têm registo.
8. Reiniciar posição; pausar/retomar; instruções de teclado visíveis.
9. Persistência local inicial para edições, com exportação/importação de dados; não exigir backend para experimentar.
10. Adaptar qualidade gráfica ao equipamento e medir desempenho real; não usar mockups como prova de desempenho ou execução.

## Fases seguintes
Confirmar geografia e acessos; integrar mapa real por meio autorizado; modelar restantes explorações e sede; adicionar veículos com desenhos fornecidos; informação de pessoas/departamentos; ensaios e variedades do campo de demonstração; detalhe visual e desempenho. Viagens entre locais devem explicitar se distâncias forem comprimidas na demonstração. Implementar mundo geográfico contínuo apenas após avaliar alcance e dados; não fingir continuidade geográfica com teletransporte oculto.

## Validação
Testar movimento/câmara, colisões, entrada/saída e condução; seleção correta de exploração/pessoas; cálculo das áreas separando obra e projeto; persistência e recuperação; comandos sem conflito com campos de texto; erros de mapas/chaves com fallback claro. Verificar código e visualização em execução quando possível e relatar o que não foi testado. Manter projeto independente, sem acesso a dados reais de outras apps, sem publicação ou custos não autorizados.
