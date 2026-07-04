// Hybrid LLM generator for the "Conte com a IA" feature.
//
// Two backends, chosen by env vars:
//   AI_PROVIDER=cloud  -> Anthropic SDK (model from AI_MODEL, default claude_haiku_4_5)
//   AI_PROVIDER=local  -> OpenAI-compatible endpoint at AI_BASE_URL
//                         (works with Ollama http://localhost:11434 and LM Studio http://localhost:1234)
//
// Cloud requires start_server with api_credentials=["llm-api:website"].
// Local requires no credentials — but only works when the app runs on a machine
// that can reach the local LLM server (i.e. `npm run dev` on the user's own computer),
// NOT in the deployed cloud preview.

import type { Story, StoryPart } from "@shared/schema";

export interface AiContext {
  story: Pick<Story, "title" | "synopsis" | "category" | "tags" | "isMature">;
  parts: Pick<StoryPart, "content" | "isAi" | "order">[];
}

function buildMessages(ctx: AiContext): { system: string; user: string } {
  const toneByCategory: Record<string, string> = {
    real: "um tom realista e cotidiano",
    creepy: "um tom de terror e suspense atmosférico",
    roleplay: "um tom narrativo colaborativo, como num RPG",
  };
  const tone = toneByCategory[ctx.story.category] ?? "narrativo envolvente";

  const tags = (() => {
    try {
      const arr = JSON.parse(ctx.story.tags);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  })();

  const system = [
    "Você é um co-narrador criativo que escreve em português brasileiro.",
    `Mantenha ${tone}, coerente com o que já foi escrito.`,
    "Escreva APENAS o próximo trecho da história (uma cena ou parágrafo, entre 150 e 800 palavras).",
    "NÃO conclua a história inteira — deixe espaço para continuação.",
    "Não adicione títulos, marcadores, metadados nem comentários fora da narrativa.",
    "Não use aspas envolvendo o texto nem diga quem está falando.",
    ctx.story.isMature
      ? "O conteúdo é marcado como sensível: pode incluir tensão e conflito, mas sem conteúdo sexual explícito."
      : "Mantenha o conteúdo apropriado para a comunidade.",
  ].join(" ");

  const recent = ctx.parts.slice(-5);
  const transcript = recent.length
    ? recent
        .map((p, i) => {
          const who = p.isAi ? "Narrador IA" : `Trecho ${i + 1}`;
          return `--- ${who} ---\n${p.content}`;
        })
        .join("\n\n")
    : "(a história ainda começou — você abrirá a narrativa)";

  const user = [
    `Título: ${ctx.story.title}`,
    `Sinopse: ${ctx.story.synopsis}`,
    tags.length ? `Tags: ${tags.join(", ")}` : "",
    "",
    "Trechos anteriores:",
    transcript,
    "",
    "Escreva agora o próximo trecho, dando sequência natural ao que veio antes.",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

function trimContent(raw: string): string {
  let out = raw.trim();
  // strip surrounding quotes if the model wrapped the whole thing
  if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith("“") && out.endsWith("”"))) {
    out = out.slice(1, -1).trim();
  }
  // strip a leading "Próximo trecho:" label if present
  out = out.replace(/^(pr[oó]ximo\s+trecho|trecho|continua[cç][aã]o)\s*[:\-—]?\s*/i, "");
  if (out.length > 6000) out = out.slice(0, 6000);
  return out;
}

// Generic LLM call shared by narration + moderation. Returns raw text.
export async function llmGenerate(system: string, user: string, opts: { temperature?: number; maxTokens?: number } = {}): Promise<string> {
  const provider = (process.env.AI_PROVIDER || "cloud").toLowerCase();
  if (provider === "local") {
    return generateLocalTunable(system, user, opts);
  }
  return generateCloudTunable(system, user, opts);
}

async function generateCloudTunable(system: string, user: string, opts: { temperature?: number; maxTokens?: number }): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const model = process.env.AI_MODEL || "claude_haiku_4_5";
  const message = await client.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 1500,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = message.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  if (!text) throw new Error("A IA não retornou conteúdo");
  return text;
}

async function generateLocalTunable(system: string, user: string, opts: { temperature?: number; maxTokens?: number }): Promise<string> {
  const base = process.env.AI_BASE_URL || "http://localhost:11434";
  const model = process.env.AI_MODEL || "llama3.1";
  const res = await fetch(`${base.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: opts.temperature ?? 0.85,
      max_tokens: opts.maxTokens ?? 1500,
      stream: false,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Erro no servidor local de IA (${res.status}). Verifique se Ollama/LM Studio está rodando em ${base}. ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("O servidor local de IA não retornou conteúdo");
  return text;
}

export async function generateNextPart(ctx: AiContext): Promise<string> {
  const { system, user } = buildMessages(ctx);
  const raw = await llmGenerate(system, user, { temperature: 0.85, maxTokens: 1500 });
  const content = trimContent(raw);
  if (content.length < 20) throw new Error("A IA retornou um trecho muito curto. Tente novamente.");
  return content;
}

export function aiConfigSummary() {
  const provider = (process.env.AI_PROVIDER || "cloud").toLowerCase();
  if (provider === "local") {
    return {
      provider: "local",
      baseUrl: process.env.AI_BASE_URL || "http://localhost:11434",
      model: process.env.AI_MODEL || "llama3.1",
    };
  }
  return {
    provider: "cloud",
    model: process.env.AI_MODEL || "claude_haiku_4_5",
  };
}
