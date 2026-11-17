# DESAFIOX Web — Guia de desenvolvimento

Documento norte do projeto `desafiox-web-gamming`: aplicação web do jogo DESAFIOX, voltada a despertar curiosidade no visitante e converter a ação real em conta.

A marca em textos de produto é **DESAFIOX**. Wordmark: DESAFIO (foreground) + X (primary `#e10600`). URL pode permanecer `desafiox.app`.

Este guia descreve o que construir aqui. Mudanças de API ficam no repositório `desafiox-api-gamming` e entram só como dependência (seção 8).

---

## 1. Objetivo

O visitante percorre desafios, mercado e a evolução de um desafio sem criar conta. Botões de descoberta ficam sempre disponíveis. A confirmação (comprar, propor, depositar, sacar, palpitar) pede cadastro ou entrada, com o acesso visível no header e de novo ao lado da ação bloqueada.

Quem entra pode usar Google ou formulário. Conta Google ainda precisa de WhatsApp e data de nascimento. Só maiores de 18 anos. O código do WhatsApp pode ser confirmado na hora ou ficar pendente na área do cliente.

A interface segue o app `desafiox` (dark, Gantari, tokens shadcn) e as regras de `desafiox-brand/IDENTIDADE-VISUAL.md`.

## 2. O que este repositório não faz

- Alterar a API, o app nativo, o painel, o backoffice ou o site institucional.
- Implementar depósito Pix automático. A carteira web nasce no modo manual já existente no app (comprovante + solicitação de saque).
- Publicar o app em loja, push nativo ou empacotamento Capacitor.
- Inventar paleta, wordmark ou tom visual fora da marca.

## 3. Domínio que a web deve respeitar

A web consome o modelo que já existe. Não cria status paralelos.

### Desafio

| Status na API | Leitura na interface |
|---|---|
| `DRAFT` | Não aparece para o público |
| `OPEN_TO_BUY_TICKETS` | Não iniciado, vendas liberadas |
| `RUNNING` | Em andamento |
| `FINISHED` | Finalizado |

- Tipo em produção: `SURVIVAL` (sobrevivência). O modelo compartilhado tem o valor `SCORE_PREDICTOR_POOL`, e o app não implementa bolão de placar. A web segue o app e não desenha fluxo de placar.
- Visibilidade: `PUBLIC` ou `PRIVATE`. Privado só para dono e contas convidadas.
- Esporte: `championship.modality` (`SOCCER`, `BASKETBALL`, `TENNIS`, `VOLLEYBALL`, `HANDBALL`, `GOLF`, `BASEBALL`, `HOCKEY`, `AMERICAN_FOOTBALL`, `RUGBY`).
- Campeonato: `championship.name`.
- Prêmio exibido no app: `budgetAccumulated`.
- Janelas de venda: `pricing[]` com `initDateTime`, `endDateTime` e `value`. A janela vigente é a que contém o agora.
- Regras: `descriptionLong` (HTML). Se vazio, o app usa um HTML de fallback de regras.
- Slug: campo `slug` obrigatório. A URL pública usa o slug.
- Rodadas: `roundStartIndex`, `roundCurrentIndex`, `roundEndIndex`, `roundCurrentStatus`.

No app, o card e o resumo ficam em `ChallengeDetail` (`/app/challenge/:id`). A evolução (kanban de rodadas, palpites, compra e proposta de ticket já em jogo) fica em `TicketDetail` (`/app/tickets/evaluate/:challengeId`). Na web as duas experiências moram na mesma URL amigável e trocam de conteúdo conforme o status.

### Ticket

| Campo | Uso na web |
|---|---|
| `code` | Código exibido no mercado |
| `account` | Dono. Na UI pública, apelido (`nickName`), nunca nome civil, e-mail, telefone ou documento |
| `statusInGamming` | `READY` e `SCALLING` contam como ativos; `DROPPED` como eliminado |
| `statusFinancial` | Só `PAID` entra em listagem de jogo e de mercado |
| `saleAuthorized` | `true` = compra direta; `false` = proposta |
| `marketValue.value` | Valor de mercado. Ausente = não exibir número inventado |
| `points` | Campo do modelo. A web de sobrevivência não usa placar de bolão |

“Ativos/total” no card do desafio, para usuário logado: tickets pagos não eliminados / tickets pagos daquela conta naquele desafio.

### Transferência (mercado)

Status: `REQUESTED`, `PROCESSING`, `COMPLETED`, `CANCELLED`, `FAILED`.

“Em negociação” na interface = transferência `REQUESTED` ou `PROCESSING` daquele ticket. Para o visitante o card fica indisponível: sem valor de mercado e sem partes da proposta. Compra direta e proposta seguem os diálogos do app. O pagamento, desde a primeira versão da web, é saldo da carteira ou checkout InfinitePay, com retorno para `/desafios/:slug`.

### Conta e sessão

- Formulário atual do app: nome, apelido (`a-z`, `0-9`, `_`), e-mail, senha forte, data de nascimento e telefone. CPF (`socialId`) e chave Pix são opcionais no app.
- O array `phones` será descontinuado na API. A conta passa a ter um único `phone`, o WhatsApp, usado também para entrar. Os dados existentes serão ajustados para esse campo único. Enquanto a lib `c2-desafiox` não publicar o campo, a web tipa isso em `src/types`.
- Confirmação de conta hoje é por e-mail (`checked`, `tokenConfirmChecking`). Não há OTP de WhatsApp. Entrar com o número não exige o código já confirmado; o código continua sendo o portão das ações de jogo e de dinheiro (RF-18).
- Google: `POST /signup/google` cria a conta se necessário e devolve JWT. A API já exige `bornDate` quando a conta não existe. WhatsApp obrigatório depois do Google é requisito novo da web.
- Idade: 18 anos, data `dd/mm/aaaa`, dia civil sem deslocar fuso (mesma regra de `desafiox/src/lib/birthDate.ts`).
- Carteira: saldo pelo último movimento `COMPLETED`; extrato com depósito, saque, compra, venda e premiação. Depósito manual envia valor e comprovante. Saque usa a chave Pix da conta.

### Leitura autenticada hoje

Em `CloseRoutes`, desafio, ticket, campeonato, pedido, transferência e carteira exigem sessão. Visitante anônimo **não consegue** montar a home com a API atual. Isso é dependência bloqueante (seção 8), não trabalho deste repositório.

Não existe coleção de banner, patrocínio ou promoção.

## 4. Princípios de produto

1. Visitante vê o jogo inteiro que for público. A barreira aparece na confirmação.
2. Toda consulta pede só os campos da tela, com `populate` e `select`. Sem payload de admin, sem palpite alheio antes do fechamento da janela, sem PII.
3. Uma tag por grupo de filtro. “Todos” limpa o grupo. Grupos que dependem de sessão somem para o visitante.
4. Ação bloqueada permanece visível e desabilitada, com Signup/Entrar ao lado, no mesmo diálogo.
5. Depois do cadastro ou da entrada, a pessoa volta à ação que originou o fluxo (mesmo desafio, mesmo ticket, mesmo diálogo).
6. Desktop é o layout de referência. No navegador do celular a mesma página continua legível: banner baixo, filtros com scroll horizontal, cards em uma coluna, diálogos em tela cheia.
7. Texto de interface em português do Brasil. Valores em real. Datas em `dd/mm/aaaa` e fuso `America/Sao_Paulo`.

## 5. Informação e rotas

Shell único: header, área principal, rodapé.

| Rota | Quem acessa | Conteúdo |
|---|---|---|
| `/` | Todos | Home. Aba Desafios aberta por padrão |
| `/mercado` | Todos | Listagem de tickets negociáveis |
| `/carteira` | Todos veem a estrutura; dados e confirmação exigem sessão | Saldo, extrato, depositar, sacar |
| `/desafios/:slug` | Todos, se o desafio for visível para aquela sessão | Evolução, ou vitrine de compra se ainda não iniciou |
| `/entrar` | Visitante | Entrada por e-mail ou celular e senha |
| `/cadastrar` | Visitante | Formulário ou Google |
| `/cadastrar/completar` | Sessão Google incompleta | WhatsApp e data de nascimento |
| `/conta` | Sessão | Perfil, WhatsApp pendente, chave Pix, sair |
| `/conta/whatsapp` | Sessão | Informar ou confirmar o código |
| Tutoriais, quem somos, contato | Todos | Nesta entrega apontam para `https://desafiox.app`. Quem somos e contato ainda não existem no site e caem na raiz, com TODO no código. Tutoriais também apontam para o site, com TODO para o futuro `desafiox-academy` |
| Política de privacidade, termos, exclusão de dados | Todos | URLs canônicas do site: `/politica-de-privacidade`, `/termos-de-servico`, `/exclusao-de-dados` |

Query de aba na home (`/?aba=desafios`) é desnecessária: Desafios é `/`, Mercado e Carteira têm rota própria para o visitante poder compartilhar e voltar pelo navegador. O menu horizontal destaca a rota atual.

Header, visitante: wordmark, menu (Desafios, Mercado, Carteira) e Signup/Entrar sempre visíveis.

Header, sessão: wordmark, as mesmas três áreas, saldo em destaque (`highlight`) e acesso à conta. Signup/Entrar saem.

Banner fica só na home, acima do menu, altura contida (teto visual em torno de 160px no desktop e 120px no celular). Slides de promoção ou patrocínio, com pausa, indicador e controle anterior/próximo. Sem autoplay agressivo que impeça leitura.

Rodapé em todas as páginas: tutoriais, quem somos, contato, política de privacidade, termos.

## 6. Requisitos funcionais

Cada item é testável. “Pronto” significa o critério de aceite desta seção mais os não funcionais da seção 7.

### 6.1 Shell e descoberta

**RF-01 Header persistente.** O header permanece visível na rolagem. Visitante sempre encontra Signup e Entrar. Sessão autenticada sempre encontra a conta e o saldo.

**RF-02 Menu principal.** Desafios, Mercado e Carteira ficam num menu horizontal. Desafios abre em `/`. No celular o menu rola na horizontal sem quebrar o wordmark.

**RF-03 Banner.** A home exibe um carrossel baixo de peças de promoção ou patrocínio. Cada slide tem imagem, texto alternativo e link opcional. Sem peças, a faixa some e o menu sobe. A primeira entrega usa uma lista estática versionada no front, no formato de slide. Quando a API tiver coleção pública, a mesma faixa passa a ler de lá sem mudar o componente.

**RF-04 Rodapé institucional.** Links para tutoriais, quem somos, contato, política de privacidade e termos. Política, termos e exclusão de dados usam as URLs do site. Quem somos e contato apontam para a raiz do site, com TODO no código, até existirem lá. Tutoriais apontam para o site, com TODO para o projeto `desafiox-academy`. O mapa dos hrefs está em `src/content/institutional.ts`.

**RF-05 Estados vazios e de erro.** Lista sem resultado, falha de rede e recurso inexistente têm mensagem e uma ação (limpar filtro, tentar de novo ou voltar). Sem tela em branco.

**RF-06 Retorno à intenção.** Signup e Entrar guardam a rota e o diálogo de origem. Ao concluir, a pessoa volta para esse ponto com o diálogo reaberto se a ação ainda for válida.

### 6.2 Acesso anônimo e portões

**RF-07 Navegação anônima.** Sem sessão, `/`, `/mercado`, `/desafios/:slug` de desafio público e as páginas institucionais carregam. Carteira mostra a estrutura (saldo oculto, extrato vazio explicado, botões de depósito e saque que abrem o diálogo).

**RF-08 Portão de confirmação.** Comprar ticket, enviar proposta, aceitar compra, depositar, sacar e registrar palpite exigem sessão. O botão de confirmação fica desabilitado e o diálogo mostra Signup e Entrar. Os botões que apenas abrem o diálogo continuam habilitados para o visitante.

**RF-09 Grupos de filtro que exigem sessão.** “Meus tickets” e “Dono: Eu” não aparecem para o visitante. “Dono: Outros” também não aparece sozinho; o visitante vê o mercado público sem esse grupo.

**RF-10 Desafio privado.** Fora da lista pública. Com sessão, só dono ou convidado abre `/desafios/:slug`. Os demais recebem não encontrado, sem revelar que o slug existe.

### 6.3 Cadastro, entrada e maioridade

**RF-11 Dois caminhos de cadastro.** Formulário próprio ou Google. Os dois terminam em sessão válida.

**RF-12 Formulário.** Campos obrigatórios: nome, apelido, e-mail, senha, confirmação de senha, data de nascimento e um único WhatsApp (`phone`). Apelido só `a-z`, `0-9` e `_`. Senha segue a mesma política do app. CPF e chave Pix continuam opcionais no cadastro; a chave Pix passa a ser exigida só na confirmação do saque.

**RF-13 Google.** Depois do retorno do provedor, se a conta é nova ou está sem WhatsApp ou sem data de nascimento, a web abre `/cadastrar/completar` e não libera o restante da sessão nas ações protegidas até esses dois campos existirem. Maioridade é validada antes de gravar.

**RF-14 Maior de 18.** Data inválida, futura ou de quem ainda não completou 18 anos impede o cadastro. A comparação usa o dia civil em `America/Sao_Paulo`. A mesma regra vale para o formulário e para o Google.

**RF-15 Código de WhatsApp.** Ao informar o número, a web pede o envio do código. A pessoa pode digitar o código na hora ou seguir com a validação pendente. Pendente fica visível na área do cliente, com reenvio.

**RF-16 Entrada.** E-mail ou o WhatsApp único da conta (`phone`), mais senha. O array `phones` não é identificador. Recuperação de senha entra na primeira entrega, no mesmo fluxo do app (pedir código, token inválido, definir senha nova).

**RF-17 Sessão.** JWT guardado de forma persistente no navegador, enviado só nas rotas autenticadas. Resposta 401 limpa a sessão e devolve o visitante ao contexto, com o portão de entrada. Sair é explícito na área da conta.

**RF-18 Conta incompleta.** WhatsApp não verificado permite navegar, ver a própria carteira e ver os próprios tickets. Comprar, propor, depositar, sacar e palpitar exigem WhatsApp verificado. A pendência fica visível no header e na área do cliente.

### 6.4 Home — Desafios

**RF-19 Listagem.** Cards em grade no desktop e em coluna única no celular, com paginação (página, tamanho e total vindos da API). Tamanho padrão: 12.

**RF-20 Busca.** Campo de texto no topo, com atraso curto antes da consulta, pesquisando pelo nome do desafio. Limpar o campo restaura a lista.

**RF-21 Filtros exclusivos.** Grupos:

- Status: Não iniciado (`OPEN_TO_BUY_TICKETS`), Em andamento (`RUNNING`), Finalizado (`FINISHED`). Um status por vez. `DRAFT` nunca entra.
- Meus tickets (somente sessão): Ativos, Eliminados. Um por vez.

Selecionar de novo a tag ativa limpa o grupo.

**RF-22 Card do desafio.** Exibe nome, esporte (modalidade do campeonato), status, nome do campeonato, prêmio (`budgetAccumulated`) e botões “Ler regras” e “Ver evolução”.

- Sessão: também “ativos/total” dos tickets da conta.
- Não iniciado: janelas de venda (período e valor de cada faixa, com a faixa vigente destacada) e botão “Comprar tickets”.

**RF-23 Regras.** “Ler regras” abre o HTML de `descriptionLong` num diálogo, sem navegar. HTML é renderizado como conteúdo confiável da operação, sem executar script.

**RF-24 Evolução a partir do card.** “Ver evolução” vai para `/desafios/:slug`.

**RF-25 Comprar tickets.** O diálogo segue o de compra do app para desafio não iniciado: quantidade, valor da faixa vigente, saldo quando houver sessão, pagamento com saldo da carteira e checkout InfinitePay. Os dois meios entram na primeira versão. Visitante abre o diálogo e vê o resumo; confirmar fica desabilitado com Signup/Entrar. Sem saldo suficiente, a sessão autenticada vê o caminho para a carteira e também o checkout. Retorno do checkout externo reabre o diálogo na mesma URL do desafio (`ticketOrderId`), como o app já faz.

### 6.5 Mercado

**RF-26 Listagem de tickets.** O mercado lista tickets, não desafios. Cards paginados, mesma busca por texto (código do ticket, nome do desafio ou do campeonato).

**RF-27 Quem entra na lista.** Ticket `PAID`, desafio `RUNNING`, dono diferente da sessão quando a ação for comprar ou propor o próprio ticket. Ticket do próprio usuário pode aparecer para gestão se o filtro “Eu” estiver ativo, sem botão de comprar a si mesmo.

**RF-28 Filtros exclusivos.**

- Disponibilidade: Venda liberada (`saleAuthorized`), Enviar propostas (`saleAuthorized` falso e sem transferência aberta), Em negociação (transferência `REQUESTED` ou `PROCESSING`).
- Dono (somente sessão): Eu, Outros.

**RF-29 Card do ticket.** Dono (sempre o `nickName`), código, nome do desafio, nome do campeonato, rodada atual e última (`roundCurrentIndex` / `roundEndIndex`), ícone de venda liberada quando `saleAuthorized`, valor de mercado, prêmio do desafio.

- Venda liberada: botão Comprar.
- Venda não liberada: botão Fazer proposta.
- Em negociação: o card fica indisponível para o visitante. Sem valor de mercado, sem valor da proposta e sem as contas da negociação. Os botões Comprar e Fazer proposta saem.

**RF-30 Diálogos de compra e proposta.** Mesmo desenho e mesmas regras do app para ticket de desafio já iniciado (valor, aceite das regras do desafio, saldo ou checkout, estados de proposta já enviada, em processamento ou conflito). Confirmar só com sessão e WhatsApp verificado. Visitante vê Signup/Entrar no diálogo.

### 6.6 Carteira

**RF-31 Paridade com o app, sem Pix automático.** Saldo, extrato (tipo, valor, status, data) e os dois diálogos: Depositar e Solicitar saque.

**RF-32 Depósito manual.** Valor e comprovante. A confirmação cria movimento `DEPOSIT` pendente. O diálogo explica que a compensação é conferida pela operação. Não há QR Code de Pix automático nesta versão.

**RF-33 Saque.** Valor até o saldo disponível e chave Pix. Sem chave, o diálogo leva a cadastrá-la na conta antes de confirmar. Confirmação cria `WITHDRAW` pendente.

**RF-34 Portão.** Visitante abre os diálogos, vê a explicação e encontra Signup/Entrar no lugar da confirmação. Não há saldo nem extrato de terceiros.

### 6.7 Tela de evolução

**RF-35 URL.** `/desafios/:slug` resolve o desafio público (ou privado permitido). Slug desconhecido mostra não encontrado. A página tem título com o nome do desafio.

**RF-36 Antes de iniciar.** Status `OPEN_TO_BUY_TICKETS`: a página apresenta o desafio no padrão do resumo do app (status, modalidade, campeonato, tipo, descrição curta, janelas, prêmio, intervalo de rodadas) e o botão Comprar tickets, com o mesmo diálogo de RF-25.

**RF-37 Em jogo e encerrado.** Status `RUNNING` ou `FINISHED`: a página segue a evolução do app. Foco na trajetória até o encerramento: rodada atual, janela de palpites quando `roundCurrentStatus` estiver aberta, tickets da conta, kanban das rodadas, sobreviventes e eliminados, e vencedores quando finalizado. Comprar ticket de inscrição não aparece. Compra e proposta de ticket de outro jogador seguem RF-30, nos mesmos pontos em que o app oferece.

**RF-38 Palpite.** Na janela aberta, a conta com ticket ativo registra o palpite da rodada no mesmo formato do app (um time ainda não usado, no sobrevivência). Visitante vê que a janela está aberta e o convite para entrar; não vê o palpite ainda editável dos outros. Depois que a rodada fecha, o resultado público da rodada pode aparecer.

**RF-39 Regras e compra na evolução.** “Ler regras” continua disponível. Se o status voltar a não representar venda de inscrição, o botão Comprar tickets de inscrição não é exibido.

### 6.8 Área do cliente

**RF-40 Conta.** Nome, apelido, e-mail, WhatsApp (verificado ou pendente), data de nascimento (somente leitura depois de gravada), chave Pix editável e sair.

**RF-41 Pendência de WhatsApp.** Estado pendente tem destaque na conta e um atalho no header. Dali a pessoa pede novo código e confirma.

**RF-42 Exclusão de conta.** Entra na primeira entrega. O link aponta para `https://desafiox.app/exclusao-de-dados`. A web não apaga a conta direto no cliente.

## 7. Requisitos não funcionais

**RNF-01 Marca.** Tokens do app: fundo `#0a0a0a`, texto `#f2f2f2`, card `#171717`, primary `#e10600`, accent `#ff6a00`, highlight `#ffc300`, borda `#262626`. Fonte Gantari 400–900. Wordmark `font-black` com tracking tight. Tema escuro como padrão. Sem emoji na identidade, sem paleta clara como base, sem cores fora da marca para status de produto (sucesso e erro usam os tokens `--success` e `--destructive` já definidos).

**RNF-02 Paridade de componentes.** Botões, diálogos, inputs, toasts e cards partem da mesma linguagem do app (Radix/shadcn, raio, borda interna, sombra suave). Copiar o visual, não o empacotamento Capacitor.

**RNF-03 Responsivo.** Larguras de referência: 1280 (desktop), 768 (tablet) e 390 (celular). Sem scroll horizontal da página. Alvo de toque mínimo 44px nos controles principais do celular. Diálogo longo vira painel de tela cheia abaixo de 768px.

**RNF-04 Consultas enxutas.** Cada tela documenta no cliente a string de `populate` e `select`. É proibido buscar o documento inteiro “por conveniência”. Paginação obrigatória nas listas. A busca não dispara a cada tecla.

**RNF-05 Privacidade.** Resposta de listagem pública não inclui e-mail, telefone, documento, senha, chave Pix, saldo de terceiros nem palpite de rodada ainda aberta. Dono de ticket no mercado é o apelido.

**RNF-06 Desempenho.** Primeira listagem da home utilizável em rede comum de escritório sem skeleton infinito. Imagens de banner e thumb com tamanho máximo definido e formato moderno. Fonte com `display=swap`.

**RNF-07 Acessibilidade.** Contraste do texto sobre o fundo da marca, foco visível, rótulos nos campos, diálogo prende foco e fecha por Escape, carrossel tem botões com nome e não depende só de cor para status.

**RNF-08 SEO das páginas públicas.** `/`, `/mercado`, `/desafios/:slug` e institucionais têm título, descrição e URL canônica. O slug do desafio é indexável. A aplicação é Next.js na Vercel: essas rotas saem montadas no servidor, com o conteúdo do desafio já no HTML.

**RNF-09 Segurança no cliente.** Sem segredo no bundle. Token não vai para a query string. HTML de regras não executa script. Links externos de checkout abrem de forma explícita e o retorno só confia no identificador do pedido da própria sessão.

**RNF-10 Idioma e formato.** pt-BR, real, datas civis, fuso `America/Sao_Paulo`. Um único idioma nesta versão.

**RNF-11 Resiliência.** Falha de uma lista não derruba o shell. Ação de escrita mostra carregamento no botão e impede duplo envio. Erro da API aparece com a mensagem retornada quando ela for segura para o usuário.

**RNF-12 Observabilidade de produto.** Fora da primeira entrega. O produto nasce sem ferramenta de medição. O contrato dos eventos fica reservado na seção 12 para quando a medição entrar.

**RNF-13 Qualidade.** TypeScript estrito. Testes de componente nos portões (visitante não confirma; tag exclusiva; maioridade; card com e sem sessão) e um teste de fluxo do diálogo de compra com API simulada. Lint no CI.

**RNF-14 Ambientes.** `development` e `production` com a URL da API por variável pública de ambiente. Sem credencial de Google no repositório; o client id é variável pública, o segredo fica na API.

## 8. Dependências da API

Nada desta lista se implementa neste repositório. A web só consome o contrato. Enquanto o endpoint não existir, a tela lê a fixture em `src/mocks`. Tipos que a lib `c2-desafiox` ainda não tem ficam em `src/types`. Enums e modelos já publicados são importados da lib.

| ID | Necessidade | Por quê |
|---|---|---|
| API-01 | Leitura pública de desafios `PUBLIC` fora de `DRAFT`, com `populate` de campeonato (nome, modalidade) e `select` dos campos do card, paginação, `searchText` e um status | Home anônima |
| API-02 | Leitura pública de um desafio por `slug` único | URL amigável |
| API-03 | Contagem ativos/total dos tickets da sessão por desafio, só com sessão | Card logado |
| API-04 | Leitura pública do quadro de evolução sem palpites de janela aberta; com sessão, inclui os tickets e palpites da própria conta | Tela de evolução |
| API-05 | Listagem pública de tickets de mercado (campos do card, apelido do dono, flag de negociação sem detalhe alheio), com os filtros de RF-28 | Mercado anônimo |
| API-06 | Entrada por e-mail ou pelo WhatsApp único (`phone`) e senha. O array `phones` será removido e os cadastros atuais migrados para um telefone | RF-16 |
| API-07 | WhatsApp obrigatório no complemento Google, envio de código, confirmação e reenvio, estado pendente na conta | RF-13 e RF-15 |
| API-08 | Slug único e estável | RNF-08 |
| API-09 | Coleção de slides do banner (imagem, texto alternativo, link, ordem, vigência), leitura pública | Substitui a lista estática de RF-03 quando existir. Não bloqueia a primeira entrega |
| API-10 | Garantir que os endpoints atuais de compra, proposta, palpite, depósito manual e saque continuam iguais aos que o app usa | Diálogos |

`populate` e `select` de referência (a API pode nomear os caminhos reais; a web não pede o restante):

- Card de desafio: `name`, `slug`, `status`, `type`, `budgetAccumulated`, `pricing`, `descriptionLong`, `roundStartIndex`, `roundEndIndex`, `championship.name`, `championship.modality`.
- Card de mercado: `code`, `saleAuthorized`, `marketValue.value`, `account.nickName`, `challenge.name`, `challenge.slug`, `challenge.budgetAccumulated`, `challenge.roundCurrentIndex`, `challenge.roundEndIndex`, `challenge.championship.name`, e um booleano `inNegotiation` calculado na API.
- Evolução autenticada: o conjunto que o kanban do app já pede, restrito ao dono quando o campo for palpite ou ticket da conta.

## 9. Decisões fechadas e lacunas

### Fechadas

- **WhatsApp pendente.** A pessoa navega, vê a própria carteira e os próprios tickets. Comprar, propor, depositar, sacar e palpitar esperam o código confirmado (RF-18).
- **Evolução.** A primeira versão entrega o ciclo completo que o app já tem: kanban, palpite, compra de inscrição e negociação de ticket. Não há bolão de placar no produto.
- **Banner.** Lista estática no front na primeira entrega, componente pronto para a API depois (RF-03). A lista vive em `src/mocks/banner.ts`.
- **Stack.** Next.js na Vercel. Rotas públicas (`/`, `/mercado`, `/desafios/:slug` e institucionais) montadas no servidor. Diálogos, sessão e ações da conta no cliente. Visual alinhado ao app (React, TypeScript, Tailwind, shadcn). A Vercel executa esse servidor sem máquina própria (RNF-08).
- **Telefone único.** `phones[]` será descontinuado. A conta tem um `phone` (WhatsApp), identificador de entrada junto com o e-mail. Cadastros existentes serão migrados para esse campo (RF-12, RF-16).
- **Institucional.** Política, termos e exclusão de dados apontam para o site. Quem somos e contato apontam para a raiz do site, com TODO, até a página existir. Tutoriais apontam para o site, com TODO para `desafiox-academy` (RF-04).
- **Pagamento.** Saldo da carteira e checkout InfinitePay desde a primeira versão, com retorno em `/desafios/:slug` (RF-25).
- **Dono no mercado.** Sempre o `nickName`. Não há anonimato adicional nesta versão (RF-29).
- **Em negociação.** O visitante vê o card indisponível, sem valor e sem as partes da proposta (RF-29).
- **Recuperação de senha e exclusão de conta.** Entram na primeira entrega (RF-16, RF-42).
- **Medição.** Fora da primeira entrega. Os eventos ficam na seção 12 (RNF-12).

### Gaps já resolvidos neste guia

- “Não iniciado” é `OPEN_TO_BUY_TICKETS`. Rascunho não entra na web.
- O mercado lista tickets. A frase “listar os desafios” do pedido foi lida como contexto; o card descrito é o do ticket.
- Esporte vem da modalidade do campeonato.
- Prêmio é `budgetAccumulated`, como no app.
- Ativos/total só com sessão, e só tickets pagos.
- “Meus tickets” e “Dono: Eu” não existem para visitante.
- Comprar inscrição e negociar ticket são diálogos diferentes, nos mesmos pontos do app.
- A evolução e o resumo com compra convivem em `/desafios/:slug`, separados pelo status.
- Leitura anônima é contrato novo de API, fora deste repositório.
- OTP de WhatsApp não existe hoje; e-mail verificado não substitui o requisito novo.
- Dono do ticket no mercado é sempre o apelido.

## 10. Ordem de construção

A ordem evita tela que depende de contrato ainda inexistente sem um substituto honesto.

1. **Fundação.** App shell, tokens da marca, header, menu, rodapé, rotas, cliente HTTP com `populate`/`select`, sessão e portão de confirmação. Critério: visitante e sessão trocam o header; diálogo de exemplo bloqueia a confirmação.
2. **Desafios.** Home com busca, filtros, cards e paginação, contra API-01. Banner com lista estática. Diálogo de compra contra os endpoints atuais, com portão.
3. **Evolução.** `/desafios/:slug` nos dois modos (venda e kanban), contra API-02 e API-04. Palpite de sobrevivência.
4. **Mercado.** Lista e diálogos, contra API-05 e os endpoints de transferência atuais.
5. **Carteira.** Extrato, depósito manual e saque, com portão e chave Pix.
6. **Conta.** Formulário, Google, complemento, OTP quando API-07 existir, entrada por e-mail e pelo `phone` quando API-06 existir, recuperação de senha e link de exclusão. O rodapé usa os hrefs de `src/content/institutional.ts`.

Cada etapa só mistura arquivos da sua issue. Issue de melhoria usa branch `feat/issue_{numero}_{descricao}`; correção usa `bugfix/issue_{numero}_{descricao}`.

## 11. Pronto da primeira versão jogável

- Visitante abre a home, filtra, lê regras, entra num desafio pelo slug e abre mercado e carteira sem conta.
- Nenhuma confirmação dispara sem sessão, e o caminho de cadastro está no header e no diálogo.
- Conta nova por formulário ou Google grava nascimento de maior de 18 anos e WhatsApp.
- Código de WhatsApp pode ser confirmado na hora ou ficar pendente. Com pendência, a pessoa vê carteira e tickets e não confirma compra, proposta, depósito, saque nem palpite.
- Usuário logado compra inscrição de desafio não iniciado, vê ativos/total, acompanha a evolução, palpite na janela, compra ou propõe ticket no mercado e pede depósito manual ou saque.
- Celular no navegador completa esses fluxos sem perda de conteúdo.
- Consultas das telas usam `populate` e `select` revistos no PR.
- Marca conferida contra `IDENTIDADE-VISUAL.md`.

## 12. Planejamento futuro

Medição de produto, fora da primeira entrega. Quando entrar, os eventos não carregam PII:

- visita anônima à home
- abertura do diálogo de compra ou de proposta
- início de cadastro
- cadastro concluído
- compra confirmada

A ferramenta fica para essa etapa. O rodapé de tutoriais, hoje apontando para o site, passa ao projeto `desafiox-academy` quando ele existir. O banner estático passa a ler a coleção pública quando a API-09 existir.
