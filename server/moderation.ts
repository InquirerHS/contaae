// IA de moderação — classifica conteúdo gerado por usuários.
//
// Cobertura: todo conteúdo (histórias, trechos, comentários, tópicos/respostas
// do fórum, fichas, quests, posts de quest).
//
// Regras (conforme solicitado pelo usuário):
//   - Conteúdo ofensivo / ilegal => violation
//   - Propaganda partidária / promoção de candidatos e partidos => violation
//   - Conteúdo ideológico com contexto e narrativa => ok (não é propaganda)
//   - Caso ambíguo / politicalmente camuflado => borderline (zona cinza, revisão humana)
//
// A IA NUNCA remove conteúdo. Apenas classifica e (quando borderline/violation)
// cria uma flag para revisão humana em /moderacao.
//
// Usa o mesmo provedor híbrido de server/ai.ts (cloud Anthropic ou local Ollama/LM Studio).

import { llmGenerate } from "./ai";
import type { ModerationClass, ModerationResult, ModerationTarget } from "@shared/schema";

const SYSTEM_PROMPT = [
  "Você é um moderador de conteúdo de uma plataforma brasileira de histórias colaborativas (ContaAê).",
  "Analise o texto quanto a duas classes de problema:",
  "1) Conteúdo ofensivo, odioso, discriminatório, ilegal ou que infrinja a legislação vigente.",
  "2) Propaganda ou promoção partidária — apoio expresso a partido, candidato ou campanha eleitoral.",
  "",
  "Importante:",
  "- Conteúdo ideológico com contexto, história ou reflexão NÃO é violação. Apenas propaganda/promoção direta de partido ou candidato é.",
  "- Terror, suspense e ficção sombria (creepypasta) são permitidos como narrativa.",
  "- Se o trecho for ambíguo ou suspeito de camuflar propaganda partidária, marque como borderline.",
  "- Não seja moralista: narrativa com tensão, conflito ou temas sensíveis é aceitável.",
  "",
  "Responva APENAS com um JSON válido, sem comentários nem markdown, no formato:",
  '{"classification":"ok|borderline|violation","reason":"breve explicação em português"}',
  "Onde classification é 'ok' (sem problema), 'borderline' (zona cinza, precisa de revisão humana) ou 'violation' (infração clara).",
].join("\n");

function targetLabel(t: ModerationTarget): string {
  const map: Record<ModerationTarget, string> = {
    story: "história (título e sinopse)",
    part: "trecho de história",
    comment: "comentário",
    forum_topic: "tópico do fórum Bosque Assombrado",
    forum_post: "resposta no fórum Bosque Assombrado",
    character: "ficha de personagem",
    quest: "quest da Taverna",
    quest_post: "post de narrativa de quest",
  };
  return map[t];
}

function parseResult(raw: string, fallbackText: string): ModerationResult {
  // Extract the first JSON object in the response
  const match = raw.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : raw;
  try {
    const parsed = JSON.parse(jsonStr);
    const cls = String(parsed.classification || "").toLowerCase().trim();
    const reason = String(parsed.reason || "").trim();
    const valid: ModerationClass[] = ["ok", "borderline", "violation"];
    if (valid.includes(cls as ModerationClass)) {
      return { classification: cls as ModerationClass, reason: reason || "Sem justificativa" };
    }
  } catch {
    // fall through to heuristics
  }

  // Fallback: conservative keyword heuristic if the model didn't return parseable JSON
  return heuristicClassify(fallbackText);
}

// Conservative offline fallback — only used if the LLM call fails or is unparseable.
function heuristicClassify(text: string): ModerationResult {
  const t = text.toLowerCase();
  // Detect explicit partisan propaganda signals (Brazilian context)
  const propaganda = /vote\s+em|#\d{2}\b|eleito\s+em\s+\d{4}|voto\s+(útil|de\s+protesto)|apoio\s+(candidato|partido)|presidente\s+\d{4}|deputado\s+(federal|estadual|por)/i;
  if (propaganda.test(t)) {
    return { classification: "borderline", reason: "Possível promoção partidária — encaminhado para revisão humana." };
  }
  const slurs = /bicha|viado|macaco|preto\s+sujo|japa\s+sujo|negão|put(o|a)\s+de\s+merda|retardado|mongol/i;
  if (slurs.test(t)) {
    return { classification: "violation", reason: "Linguagem ofensiva/discriminatória detectada." };
  }
  return { classification: "ok", reason: "Sem infração aparente (heurística de fallback)." };
}

export async function classifyContent(target: ModerationTarget, content: string): Promise<ModerationResult> {
  const user = [
    `Tipo de conteúdo: ${targetLabel(target)}.`,
    "Texto a avaliar:",
    "---",
    content.slice(0, 8000),
    "---",
    "Classifique conforme as regras e responda apenas com o JSON.",
  ].join("\n");

  try {
    const raw = await llmGenerate(SYSTEM_PROMPT, user, { temperature: 0.1, maxTokens: 300 });
    return parseResult(raw, content);
  } catch (err) {
    // If the IA provider is unavailable, use the conservative heuristic so the app never blocks.
    console.warn("[moderation] IA indisponível, usando heurística:", (err as Error)?.message);
    return heuristicClassify(content);
  }
}

// Decide se o resultado deve gerar uma flag para revisão humana.
// 'ok' => nenhuma flag. 'borderline' e 'violation' => cria flag (status open).
export function shouldFlag(result: ModerationResult): boolean {
  return result.classification !== "ok";
}
