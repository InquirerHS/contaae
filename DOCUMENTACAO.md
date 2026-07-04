# ContaAê — Documentação

> **Se perca entre a realidade e a ficção neste espaço entre dimensões.**
>
> Web app de contação de histórias: relatos reais, creepypastas, role-play colaborativo por turnos, integração com IA narradora e a **Taverna** — quests de interpretação pura mediados por um Game Master.

---

## 1. Visão geral

O ContaAê é uma plataforma colaborativa onde pessoas criam, desenvolvem e moderam histórias em conjunto. O sistema combina quatro modalidades de narrativa:

| Modalidade | Descrição |
|---|---|
| **Histórias Reais** | Relatos verdadeiros que merecem ser contados. |
| **Creepypastas** | Narrativas de terror para arrepiar. |
| **Role-play Colaborativo** | Escrita em conjunto, um turno de cada vez. |
| **Taverna (Quests)** | RP puro mediado por GM, sem dados nem pontos de vida — só texto e imaginação. |

### Identidade visual ("arcane cyberpunk")
- **Tema:** dark-first, com neon ciano (#22d3ee) + violeta (#a855f7) + âmbar.
- **Fontes:** Oxanium (display), Plus Jakarta Sans (corpo), Source Serif 4 (leitura).
- **Cidade futurista** que mistura magia e tecnologia — um mago e um cara de terno convivem.

### Restrição de idade
Não é aceito cadastro de menores de idade, em razão da legislação vigente. A validação ocorre no cadastro (data de nascimento) e a linguagem evita o termo "+18" (que soa inadequado).

### Pseudônimos obrigatórios (sem nomes reais)
Para proteger a identidade de quem escreve e de terceiros citados em relatos:
- **Cadastro:** o nome de usuário não pode parecer um nome real. A validação (`looksLikeRealName` em `shared/schema.ts`) bloqueia combinações de primeiro nome + sobrenome comuns no Brasil ("joao_silva", "anaoliveira"), tanto separadas quanto coladas. Primeiro nome sozinho ("pedro_lobo") passa. Usernames aceitam apenas letras, números e `. _ -`.
- **Conteúdo:** a IA de moderação sinaliza textos que exponham pessoas reais (nome completo, sobretudo junto de endereço/telefone/trabalho = violation; nome completo plausível sem outros dados = borderline). Personagens claramente fictícios e referências culturais não são sinalizados. O fallback heurístico também detecta pares "PrimeiroNome Sobrenome" comuns.
- **Privacidade da API:** e-mail e data de nascimento só aparecem para a própria conta (`/api/auth/me`, login, registro). Todos os payloads públicos (autores, GMs, comentaristas, perfis) usam a projeção `PublicUser` (sem senha, e-mail e nascimento).

---

## 2. Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite + TypeScript |
| Estilo | Tailwind CSS v3 + shadcn/ui |
| Roteamento | wouter com `useHashLocation` (hash routing) |
| Estado/servidor | TanStack Query v5 |
| Backend | Express (Node.js) |
| ORM | Drizzle ORM |
| Banco | SQLite (`data.db`, modo WAL, via better-sqlite3) |
| IA | `@anthropic-ai/sdk` (cloud) ou endpoint OpenAI-compatível (local) |

### Por que hash routing?
O app é servido dentro de um iframe (sandbox). Rotas baseadas em path quebram após o deploy. O `useArcaneLocation` (em `client/src/lib/use-location.ts`) envolve o `useHashLocation` do wouter e remove a query string para fins de matching de rota, mantendo a navegação intacta.

### Por que autenticação in-memory?
Cookies, `localStorage`, `sessionStorage` e `indexedDB` são bloqueados no iframe sandbox. O token de auth vive em memória (`let authToken` em `queryClient.ts`), transmitido via header `x-auth-token`. Ele sobrevive à navegação SPA, mas se perde em um refresh completo da página.

> **Importante:** ao fazer login/registro, o `AuthProvider` invalida todo o cache do TanStack Query (`queryClient.invalidateQueries()`), e ao fazer logout o limpa (`queryClient.clear()`). Isso evita que dados de um usuário fiquem "stale" ao trocar de conta.

---

## 3. Estrutura do projeto

```
neoarcana/
├── shared/
│   └── schema.ts          # Modelos Drizzle + schemas Zod + tipos (fonte única de verdade)
├── server/
│   ├── index.ts           # Bootstrap do Express
│   ├── routes.ts          # Todas as rotas da API (auth, stories, taverna...)
│   ├── storage.ts         # Interface IStorage + DatabaseStorage (Drizzle/better-sqlite3)
│   ├── ai.ts              # Geração de trechos (cloud ou local)
│   ├── vite.ts            # Integração Vite + Express (dev)
│   └── static.ts          # Servimento de estáticos (prod)
├── client/
│   ├── src/
│   │   ├── App.tsx        # Roteador principal
│   │   ├── components/    # Nav, footer, cards, avatar, star-rating...
│   │   │   └── ui/        # Componentes shadcn/ui
│   │   ├── pages/         # auth, home, library, story-detail, taverna, quest-detail, characters...
│   │   ├── hooks/         # useToast, use-mobile
│   │   └── lib/           # auth, queryClient, types, format, use-location
│   └── public/uploads/    # Avatares enviados
├── script/build.ts        # Build (Vite client + esbuild server bundle)
├── data.db                # Banco SQLite
└── migrations_taverna.sql # Migração das tabelas da Taverna
```

---

## 4. Modelo de dados

Todo o modelo vive em `shared/schema.ts`. Cada tabela tem um `createInsertSchema` (validação Zod) e tipos `Insert*` / `Select` derivados.

### 4.1 Núcleo de histórias

**users** — contas (com validação de idade no cadastro)
**stories** — título, sinopse, categoria (`real` | `roleplay`), status (`open` | `ongoing` | `completed`), tags (JSON), `aiEnabled`, `isMature`, `accentHue`
**story_parts** — trechos numerados por `order`; `isAi` marca trechos gerados pela IA
**likes** — curtidas (único por usuário por história)
**comments** — comentários
**ratings** — nota 1–5 estrelas (única por usuário por história)
**reports** — denúncias (`story` | `part` | `comment`), com status de moderação
**notifications** — notificações in-app (like, comment, part, report)

### 4.2 Taverna (quests com GM)

| Tabela | Propósito |
|---|---|
| `characters` | Fichas de personagem reutilizáveis (máx 2 por usuário). Campos: `name`, `concept`. |
| `quests` | O quest em si: `title`, `gmId`, `setting` (ambiente), `situation`, `brief`, `slotsTotal`, `seeking` (texto livre), `isMature`, `status`, `accentHue`. |
| `quest_participants` | Quem entrou, com qual ficha e a intro. `status` (`active` \| `removed`). UNIQUE(quest_id, user_id). |
| `quest_posts` | A narrativa. `characterId` nulo = narração do GM. `status` (`active` \| `removed` \| `pending`). Revisões apontam para o original via `replacedById`. |
| `quest_arguments` | Argumentos do autor contra uma remoção. `status` (`pending` \| `accepted` \| `rejected`) + `gmNote`. |

### Regras de negócio (implementadas em `storage.ts`)

- **Fichas:** máximo de 2 por usuário; podem ser apagadas e recriadas.
- **Entrada em quest:** a ficha deve pertencer ao usuário; o quest deve estar `open` ou `ongoing`; deve haver vaga; não pode entrar duas vezes.
- **Postagem:** só o GM ou participantes `active` postam. Posts do GM podem ser narração (sem ficha).
- **Revisões:** só o autor reescreve; ficam `pending`; só GM e autor veem.
- **Argumentos:** só o autor do trecho argumenta; um argumento `pending` por vez.
- **Resolução de argumento:** se o GM aceita, o trecho original é restaurado.
- **Intercalação da IA:** a IA nunca escreve duas vezes seguidas (enforced em `canAiAddPart`).

### 4.3 Bosque Assombrado + moderação por IA

| Tabela | Propósito |
|---|---|
| `forum_topics` | Tópicos do fórum Bosque Assombrado: `title`, `body`, `authorId`, `isMature`, `accentHue`, `status` (`open` \| `closed`), `replyCount`. |
| `forum_posts` | Respostas encadeadas via `parentId` (auto-referência); `topicId`, `authorId`, `content`. |
| `moderation_flags` | Sinalizações da IA: `targetType` (`forum_topic` \| `forum_post` \| `story` \| `part` \| `comment` \| `character` \| `quest` \| `quest_post`), `targetId`, `classification` (`ok` \| `borderline` \| `violation`), `reason`, `status` (`open` \| `kept` \| `hidden` \| `removed`). |

### Regras de moderação (implementadas em `server/moderation.ts`)

- **Pós-publicação e assíncrona:** a classificação roda fire-and-forget após criar qualquer conteúdo — nunca bloqueia a publicação.
- **Classificação da IA** (`classifyContent`): `ok` / `borderline` / `violation`, com `reason` em português.
- **Violação** = conteúdo ofensivo/ilegal (racismo, ódio, discriminação) ou propaganda partidária / promoção de candidatos.
- **Zona cinza** = conteúdo ideológico com contexto e narrativa (permitido); ambíguo vira `borderline` para revisão humana.
- **Fallback heurístico:** se a IA estiver indisponível, uma classificação conservadora por palavras-chave mantém proteção mínima.
- **Sinalizações viram flags** apenas para `borderline`/`violation`; o conteúdo NUNCA é removido automaticamente.
- **Resolução humana** na página `/moderacao` → aba "Sinalizações da IA": Manter / Ocultar / Remover.
- **Denúncia manual** permanece como complemento (botão em tópicos e respostas).

---

## 5. API

Todas as rotas estão em `server/routes.ts`. Autenticação via header `x-auth-token`.

### 5.1 Auth e usuários
```
POST   /api/auth/register          # cadastro (valida idade >= 18)
POST   /api/auth/login
GET    /api/auth/me                 # requer auth
PATCH  /api/auth/me                 # bio, avatarHue, avatarUrl
POST   /api/auth/me/avatar          # upload de avatar (raw body, até 5mb)
GET    /api/users/:username         # perfil público + histórias
```

### 5.2 Histórias e trechos
```
GET    /api/stories                 # ?category&search&tag&authorId&page
GET    /api/stories/featured        # até 6 mais curtidas
GET    /api/stories/mine            # requer auth
POST   /api/stories                 # requer auth
GET    /api/stories/:id
DELETE /api/stories/:id             # só o autor

GET    /api/stories/:id/parts
POST   /api/stories/:id/parts       # respeita turno (roleplay) / autor (demais)
PATCH  /api/stories/:id/parts/:partId   # só o autor do trecho
DELETE /api/stories/:id/parts/:partId   # só o autor do trecho
GET    /api/stories/:id/can-contribute
```

### 5.3 Interações
```
POST   /api/stories/:id/like        # toggle
GET    /api/stories/:id/comments
POST   /api/stories/:id/comments
PATCH  /api/stories/:id/comments/:commentId
DELETE /api/stories/:id/comments/:commentId
POST   /api/stories/:id/rate        # 1–5 estrelas (upsert)
DELETE /api/stories/:id/rate
POST   /api/reports                 # denúncia
GET    /api/reports
PATCH  /api/reports/:id             # status da moderação
```

### 5.4 Notificações
```
GET    /api/notifications
GET    /api/notifications/unread    # { count }
POST   /api/notifications/read-all
```

### 5.5 IA narradora ("Conte com a IA")
```
POST   /api/stories/:id/invite-ai   # gera próximo trecho (respeita intercalação)
```

### 5.6 Taverna
```
# Fichas (máx 2 por usuário)
GET    /api/characters              # requer auth
POST   /api/characters
PATCH  /api/characters/:id
DELETE /api/characters/:id

# Quests
GET    /api/quests                  # ?status&search
GET    /api/quests/mine             # quests onde sou GM
POST   /api/quests                  # cria (autor vira GM)
GET    /api/quests/:id              # inclui myParticipation
PATCH  /api/quests/:id/status       # só GM
DELETE /api/quests/:id              # só GM

# Participantes
GET    /api/quests/:id/participants
POST   /api/quests/:id/join         # valida ficha, vaga, duplicidade
DELETE /api/quests/:id/participants/:userId   # GM remove

# Narrativa
GET    /api/quests/:id/posts        # revisões pending só visíveis p/ autor+GM
POST   /api/quests/:id/posts        # GM ou participante ativo
POST   /api/quests/:id/posts/:postId/revise  # autor reescreve (cria pending)
DELETE /api/quest-posts/:id         # GM remove com motivo
POST   /api/quest-posts/:id/approve # GM aprova revisão pending

# Argumentos
POST   /api/quest-posts/:id/argue   # autor argumenta (um pending por vez)
POST   /api/quest-arguments/:id/resolve   # GM aceita (restaura) ou rejeita
```

### 5.7 Bosque Assombrado (fórum)
```
GET    /api/forum/topics            # ?search  (lista de tópicos)
POST   /api/forum/topics            # requer auth  (cria tópico)
GET    /api/forum/topics/:id        # detalhe do tópico (com autor)
PATCH  /api/forum/topics/:id/close  # só o autor encerra o tópico
GET    /api/forum/topics/:id/posts  # árvore de respostas (parentId → children)
POST   /api/forum/topics/:id/posts # requer auth  (resposta, opcional parentId p/ aninhar)
```

### 5.8 Moderação (sinalizações da IA)
```
GET    /api/moderation/flags        # ?status  (requer auth)
PATCH  /api/moderation/flags/:id    # { status: kept|hidden|removed, note? }
```

---

## 6. IA narradora (arquitetura híbrida)

Definida em `server/ai.ts`. Dois provedores, selecionados por `AI_PROVIDER`:

### Cloud (padrão)
- Usa `@anthropic-ai/sdk` (SDK oficial — NÃO o pacote stub `anthropic`, que é v0.0.0 neste ambiente).
- Modelo: `AI_MODEL` (padrão `claude_haiku_4_5`).
- Requer as credenciais injetadas via `pplx-tool start_server` com `api_credentials=["llm-api:website"]`.

### Local
- Endpoint OpenAI-compatível em `AI_BASE_URL` (padrão `http://localhost:11434` — Ollama).
- Modelo: `AI_MODEL` (padrão `llama3.1`).
- Compatível com Ollama, LM Studio e SillyTavern. Só funciona quando o app roda na máquina do usuário.

### Princípios
- **Gatilho manual:** qualquer participante logado clica em "Convidar a IA".
- **Intercalação:** a IA nunca escreve duas vezes seguidas.
- **Transparência:** a IA tem conta própria (`narrador_ia`, avatarHue 280) e seus trechos são marcados com um ícone de sparkle.
- **Nunca substitui:** a IA co-narra; a história continua sendo das pessoas.

### Função compartilhada `llmGenerate(system, user, opts)`
- Extraída em `server/ai.ts` e reutilizada pela narração (`generateNextPart`) e pela moderação (`classifyContent` em `server/moderation.ts`).
- Moderação usa `temperature: 0.1`, `maxTokens: 300` para classificações deterministas.
- Se a IA estiver indisponível, a moderação cai no fallback heurístico (palavras-chave conservadoras).

---

## 7. Frontend — páginas

| Rota | Página | Função |
|---|---|---|
| `/` | Home | Destaques + categorias |
| `/entrar` | Auth | Login / registro (com age gate) |
| `/biblioteca` | Library | Lista com busca, filtros, paginação, tags |
| `/historia/:id` | StoryDetail | Sinopse, trechos, comentários, curtir, avaliar, convidar IA |
| `/nova-historia` | NewStory | Criar história (toggle "Permitir IA") |
| `/perfil` | Profile | Bio, avatar, minhas histórias |
| `/u/:username` | PublicProfile | Perfil público de outro usuário |
| `/notificacoes` | Notifications | Lista de notificações |
| `/moderacao` | Moderation | Aba Denúncias + aba Sinalizações da IA (Manter/Ocultar/Remover) |
| `/bosque` | Bosque | Lista de tópicos do fórum + criar tópico |
| `/bosque/:id` | BosqueTopic | Tópico + respostas encadeadas + composer |
| `/taverna` | Taverna | Lista de quests + criar |
| `/quest/:id` | QuestDetail | Detalhe, participantes, narrativa, moderação GM |
| `/fichas` | Characters | Minhas fichas (máx 2) |

### Navegação
- Nav desktop com links (Início, Biblioteca, Bosque, Taverna) + botão "Nova história".
- Nav mobile em drawer, incluindo "Minhas fichas", Notificações, Moderação, Perfil, Sair.
- Badge de notificações não lidas (refetch a cada 30s).

### Componentes reutilizáveis
- `StoryCard` — card de história com curtidas, comentários, trechos, rating, badge de IA.
- `StarRating` — widget de avaliação 1–5.
- `Avatar` — gradiente por `avatarHue` ou imagem enviada.
- `ReportButton` — denúncia genérica (story/part/comment).
- `CityBackdrop` — cenário de fundo animado.

---

## 8. Taverna — fluxo de moderação

O coração da feature é o ciclo de mediação do GM:

```
GM posta narração inicial
        │
        ▼
Jogador entra (ficha + intro) ──► posta trecho
        │
        ▼
GM não gostou? Remove trecho COM MOTIVO
        │
        ├─► Jogador ARGUMENTA ──► GM aceita? → restaura trecho
        │                              └─► rejeita? → mantém remoção (com nota)
        │
        └─► Jogador REESCREVE ──► revisão PENDING (só autor+GM veem)
                                        └─► GM aprova? → vira active
                                        └─► ignora? → permanece pending
```

**Sem dados, sem PV, sem rolagem.** Brigas e ações são resolvidas por descrição textual; o GM é o árbitro.

### Decisões de produto registradas
1. **Seção separada** no menu — não dentro da Biblioteca.
2. **Fichas reutilizáveis** (máx 2) — podem ser apagadas e recriadas.
3. **Recrutamento meio-termo** — GM define `slotsTotal` (número) + `seeking` (texto livre, ex.: "3 pessoas para fantasia estilo star wars").
4. Revisões pending só visíveis para autor e GM.
5. Um argumento pending por trecho por usuário.

---

## 9. Build, deploy e execução

### Variáveis de ambiente
| Variável | Padrão | Descrição |
|---|---|---|
| `AI_PROVIDER` | `cloud` | `cloud` (Anthropic) ou `local` (Ollama/LM Studio) |
| `AI_MODEL` | `claude_haiku_4_5` (cloud) / `llama3.1` (local) | Modelo usado |
| `AI_BASE_URL` | `http://localhost:11434` | Endpoint local (modo local) |

### Comandos
```bash
npm install          # dependências
npm run dev          # dev server (Express + Vite na mesma porta 5000)
npm run build        # build de produção (tsx script/build.ts)
```

### Executar em produção (com IA cloud)
O servidor deve ser iniciado via `pplx-tool start_server` com `api_credentials=["llm-api:website"]` — isso injeta `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, etc. no ambiente do processo Node.

```bash
NODE_ENV=production node dist/index.cjs
```

### Deploy
O deploy é feito para um asset `/computer/a/...` (preview inline na conversa). A porta 5000 é a única não-firewalled; o `queryClient.ts` usa `__PORT_5000__` que é substituído no deploy para o caminho de proxy.

### Banco
- SQLite em `data.db`, modo WAL, foreign keys ON.
- Drizzle com driver better-sqlite3 **síncrono**: queries terminam com `.get()` (1 linha) ou `.all()` (array). Nunca desconstruir o query builder.
- Migração da Taverna: `migrations_taverna.sql` (já aplicada).

---

## 10. QA

O fluxo da Taverna foi validado com Playwright (desktop 1280px e mobile 375px):

1. GM cria quest → posta narração inicial.
2. Jogador registra ficha → entra no quest (ficha + intro).
3. Jogador posta trecho narrativo.
4. GM remove o trecho com motivo.
5. Jogador vê o motivo → argumenta.
6. GM aceita o argumento → trecho restaurado.
7. GM remove de novo → jogador reescreve (revisão pending).
8. GM aprova a revisão → vira active.

Todos os estados visuais (badges Removido/Aceito/Aguardando revisão, painel de resolução do GM, campos de motivo/nota) foram verificados sem defeitos de layout em desktop e mobile.

### 10.1 Bosque Assombrado + IA de moderação

Fluxo validado com Playwright (desktop 1600px e mobile 390px) e via API:

1. Lista de tópicos do fórum em `/bosque` (cards com ghost icon, excerpt, respostas, autor, tempo).
2. Criar tópico via modal (título, corpo, slider de "Atmosfera/cor", checkbox conteúdo sensível).
3. Detalhe do tópico em `/bosque/:id` com respostas encadeadas (parentId → children).
4. Resposta de topo + resposta aninhada (composer muda para "Respondendo à resposta #N").
5. Botão "Denunciar" em tópicos e respostas.
6. IA de moderação sinaliza automaticamente violações (conteúdo racista e propaganda partidária) com `reason` em português.
7. Conteúdo ideológico com contexto narrativo NÃO é sinalizado (zona cinza respeitada).
8. Página `/moderacao` → aba "Sinalizações da IA" mostra flags com snippet + justificativa da IA.
9. Resolução humana: Manter / Ocultar / Remover (flag sai do filtro "Aberta").

Sem defeitos de layout em desktop e mobile; footer com aviso de maioridade presente em todas as páginas.

---

## 11. Contas de teste

| Usuário | E-mail | Senha |
|---|---|---|
| lyra_neon | lyra@neoarcana.city | senha123 |
| terno_sombrio | terno@neoarcana.city | senha123 |
| mago_arkan | mago@neoarcana.city | senha123 |
| cronista_anon | cronista@neoarcana.city | senha123 |
| teste_usuario | teste@neoarcana.city | senha123 |
| narrador_ia | ia@contae.local | __ai__ (conta automática da IA) |

---

## 12. Histórico de evolução

1. Scaffold do template fullstack + features base (histórias, trechos, comentários, curtidas).
2. Rename para **ContaAê** + correção da linguagem do age gate.
3. Melhorias: editar/apagar trechos e comentários, denúncias, busca, notificações, paginação, avatares.
4. IA narradora híbrida (cloud + local), gatilho manual, intercalação, notas 1–5.
5. **Taverna** — quests com GM, fichas reutilizáveis, fluxo completo de moderação (remover → argumentar/reescrever → resolver/aprovar).
6. **Bosque Assombrado + IA de moderação** — creepypastas viram fórum com respostas encadeadas; IA classifica todo conteúdo (ofensivo/ilegal e propaganda partidária = violação; ideológico com contexto = ok/zone cinza), sinaliza para revisão humana (Manter/Ocultar/Remover). Categoria `creepy` removida das histórias. ← *atual*

---

## 13. Próximos passos sugeridos

- Publicar num link `pplx.app` permanente ou via conector Vercel.
- Notificações para eventos da Taverna (alguém entrou no quest, GM removeu, argumento resolvido).
- Listagem de "meus quests" (como GM e como participante) na Taverna.
- Filtros adicionais na Taverna (por GM, por `seeking`).
- Edição do quest pelo GM (além do status).
- Histórico/arquivo de quests concluídos.
- Notificações de moderação (conteúdo sinalizado/ocultado/removido).
- Painel de moderação com paginação e busca de flags.
- Edição de tópicos/respostas do Bosque pelo autor.
- Fixar tópicos importantes no topo do Bosque.
