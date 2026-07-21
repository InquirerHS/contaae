# 🤝 Guia de Contribuição — ContaAê

Obrigado pelo interesse em contribuir com o ContaAê! Este documento explica como rodar o projeto localmente e como enviar suas mudanças.

> 📖 A referência técnica completa (modelo de dados, todas as rotas da API, regras de negócio e decisões de produto) está em [DOCUMENTACAO.md](DOCUMENTACAO.md). Leia antes de mexer em áreas que você não conhece.

## 📋 Índice

- [Código de Conduta](#-código-de-conduta)
- [Stack e estrutura](#-stack-e-estrutura)
- [Rodando localmente](#-rodando-localmente)
- [Regras da plataforma](#-regras-da-plataforma-não-quebre)
- [Reportando bugs e sugerindo melhorias](#-reportando-bugs)
- [Enviando código](#-enviando-código)
- [Padrões de código](#-padrões-de-código)

---

## 📜 Código de Conduta

- ✅ Seja respeitoso e inclusivo
- ✅ Aceite críticas construtivas
- ✅ Foque no que é melhor para a comunidade
- ❌ Não use linguagem ofensiva
- ❌ Não faça ataques pessoais

---

## 🧱 Stack e estrutura

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Estilo | Tailwind CSS v3 + shadcn/ui |
| Roteamento | wouter (hash routing) |
| Estado/servidor | TanStack Query v5 |
| Backend | Express (Node.js) |
| Banco | SQLite via Drizzle ORM + better-sqlite3 (síncrono) |
| IA | Anthropic SDK (cloud) ou endpoint OpenAI-compatível (local) |

```
├── shared/schema.ts     # Modelos Drizzle + schemas Zod (fonte única de verdade)
├── server/              # Express: rotas, storage, IA, moderação
├── client/src/          # React: páginas, componentes, hooks, lib
└── script/              # build.ts, moderador.mjs
```

**Regra de ouro:** tipos e validações vivem em `shared/schema.ts` e são importados por client e server. Não duplique schemas.

---

## 🚀 Rodando localmente

```bash
git clone https://github.com/InquirerHS/ContaAe.git
cd ContaAe
npm install
cp .env.example .env      # opcional: preencha ANTHROPIC_API_KEY para a IA
npm run dev               # Express + Vite juntos em http://localhost:5000
```

Scripts úteis:

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 5000) |
| `npm run build` | Build de produção (`dist/`) |
| `npm run check` | Typecheck (`tsc`) |
| `node seed.mjs` | Popula o banco com contas e histórias de demonstração |
| `node script/moderador.mjs <username>` | Promove um usuário a moderador (`--remover` rebaixa) |

Notas:

- O banco `data.db` é criado/migrado automaticamente no boot e **não é versionado**.
- Sem `ANTHROPIC_API_KEY`, o app funciona normalmente: a narração por IA fica indisponível e a moderação usa um fallback heurístico. Para IA local, use `AI_PROVIDER=local` com Ollama/LM Studio (veja `.env.example`).
- Contas de demonstração do seed: `lyra_neon` / `terno_sombrio` / `mago_arkan` / `cronista_anon` (`@neoarcana.city`, senha `senha123`).

---

## 🛡️ Regras da plataforma (não quebre!)

Algumas invariantes são intencionais e não devem ser removidas em PRs:

1. **Maioridade**: cadastro exige 18+ (validação de `birthDate` no Zod).
2. **Pseudônimos obrigatórios**: nomes de usuário que pareçam nome real são rejeitados (`looksLikeRealName` em `shared/schema.ts`); a IA de moderação sinaliza conteúdo que exponha pessoas reais.
3. **Privacidade**: e-mail e data de nascimento só aparecem para a própria conta. Payloads públicos usam a projeção `PublicUser` — nunca devolva o objeto `users` cru numa rota.
4. **Moderação nunca é automática**: a IA apenas sinaliza (`borderline`/`violation`); ocultar ou remover é sempre decisão humana de um moderador (`is_moderator`).
5. **Intercalação da IA narradora**: a IA nunca escreve dois trechos seguidos.
6. **Drizzle síncrono**: queries terminam com `.get()` (1 linha) ou `.all()` (array). Nunca desconstrua o query builder.

---

## 🐛 Reportando Bugs

Abra uma Issue com:

1. **Título claro** descrevendo o bug
2. **Passos para reproduzir**
3. **Comportamento esperado** vs. **atual**
4. **Screenshots** se aplicável
5. **Ambiente** (navegador, dispositivo, SO)

## 💡 Sugerindo Melhorias

Abra uma Issue com título claro, descrição da funcionalidade, por que seria útil e mockups/exemplos se possível. A seção "Próximos passos sugeridos" da [DOCUMENTACAO.md](DOCUMENTACAO.md) lista ideias já mapeadas.

---

## 💻 Enviando Código

1. **Fork** o repositório e **clone** seu fork
2. **Crie uma branch**: `git checkout -b feature/minha-feature`
3. **Faça suas alterações** (client e/ou server)
4. **Verifique** antes de abrir o PR:
   ```bash
   npm run check   # não introduza erros de tipo novos
   npm run dev     # teste o fluxo afetado manualmente
   ```
5. **Commit** com mensagem clara (veja convenção abaixo) e **push**
6. **Abra um Pull Request** descrevendo o que mudou e como testou

---

## 📝 Padrões de Código

### TypeScript / React

```tsx
// ✅ Bom: validação compartilhada via Zod em shared/schema.ts
const data = insertStorySchema.parse(req.body);

// ✅ Bom: TanStack Query para dados do servidor
const { data: stories } = useQuery<StoryWithRelations[]>({
  queryKey: ["/api/stories"],
});

// ❌ Ruim: fetch solto com estado manual quando useQuery resolve
const [stories, setStories] = useState([]);
useEffect(() => { fetch("/api/stories").then(/* ... */); }, []);

// ✅ Bom: autorização verificada no storage/rota, nunca só no client
if (!quest || quest.gmId !== gmId) return undefined;
```

### Estilo (Tailwind + shadcn/ui)

- Use os componentes de `client/src/components/ui/` antes de criar novos.
- Cores sempre pelas variáveis do design system (`bg-card`, `text-muted-foreground`...), nunca hex solto — o tema claro/escuro depende disso.
- Textos da interface em **português brasileiro**, no tom da plataforma.

### Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

| Tipo | Uso |
|------|-----|
| `feat:` | Nova funcionalidade |
| `fix:` | Correção de bug |
| `docs:` | Documentação |
| `style:` | Formatação (não afeta código) |
| `refactor:` | Refatoração |
| `test:` | Testes |
| `chore:` | Manutenção |

**Exemplos:**
```
feat: adiciona notificações de eventos da Taverna
fix: corrige contagem de vagas ao remover participante
docs: atualiza DOCUMENTACAO com novas rotas
```

---

## 🏷️ Labels de Issues

| Label | Descrição |
|-------|-----------|
| `bug` | Algo não está funcionando |
| `enhancement` | Nova funcionalidade |
| `good first issue` | Bom para iniciantes |
| `help wanted` | Precisa de ajuda |
| `documentation` | Melhorias na documentação |
| `question` | Dúvida |

---

## ❓ Dúvidas?

Abra uma Issue com a label `question`.

---

**Obrigado por contribuir! 🎉**
