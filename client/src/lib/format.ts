import type { StoryCategory } from "./types";

export const CATEGORY_META: Record<
  StoryCategory,
  { label: string; short: string; catClass: string; blurb: string; emoji: string }
> = {
  real: {
    label: "Histórias Reais",
    short: "Reais",
    catClass: "cat-real",
    blurb: "Relatos verdadeiros que merecem ser contados.",
    emoji: "🪐",
  },
  roleplay: {
    label: "Role-play Colaborativo",
    short: "Roleplay",
    catClass: "cat-roleplay",
    blurb: "Escrevam juntos, um turno de cada vez.",
    emoji: "🎲",
  },
};

export const CATEGORY_ORDER: StoryCategory[] = ["real", "roleplay"];

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} mês${mo > 1 ? "es" : ""}`;
  const y = Math.floor(mo / 12);
  return `${y} ano${y > 1 ? "s" : ""}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function parseTags(tags: string): string[] {
  try {
    const arr = JSON.parse(tags);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function avatarGradient(hue: number): string {
  return `linear-gradient(135deg, hsl(${hue} 80% 55%), hsl(${(hue + 60) % 360} 75% 45%))`;
}

export function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}
