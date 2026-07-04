import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/format";
import type { StoryCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const HUE_PRESETS = [190, 276, 41, 332, 152, 220];

export default function NewStory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<StoryCategory>("real");
  const [synopsis, setSynopsis] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [accentHue, setAccentHue] = useState(190);
  const [isMature, setIsMature] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean)
        .slice(0, 8);
      const res = await apiRequest("POST", "/api/stories", {
        title: title.trim(),
        synopsis: synopsis.trim(),
        category,
        tags,
        accentHue,
        isMature,
      });
      return res.json();
    },
    onSuccess: (story) => {
      qc.invalidateQueries({ queryKey: ["/api/stories"] });
      qc.invalidateQueries({ queryKey: ["/api/stories/featured"] });
      qc.invalidateQueries({ queryKey: ["/api/stories/mine"] });
      toast({ title: "História criada", description: "Agora escreva o primeiro trecho." });
      navigate(`/historia/${story.id}`);
    },
    onError: (e: any) => setError(e.message || "Erro ao criar história"),
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-3 font-display text-2xl font-bold">Faça login para criar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você precisa estar autenticado para publicar uma história.
        </p>
        <Link href="/entrar?mode=register" className="mt-4 inline-block">
          <Button>Entrar ou cadastrar</Button>
        </Link>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 3) return setError("Título muito curto.");
    if (synopsis.trim().length < 10) return setError("Escreva uma sinopse um pouco maior.");
    mut.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/biblioteca"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Biblioteca
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold">Criar história</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Defina o tom e a modalidade. O conteúdo você escreve no próximo passo.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        {/* category */}
        <div className="space-y-2">
          <Label>Modalidade</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {CATEGORY_ORDER.map((c) => {
              const meta = CATEGORY_META[c];
              const active = category === c;
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                    meta.catClass,
                    active
                      ? "border-primary bg-primary/10 cat-ring"
                      : "border-border/70 bg-card/40 hover:border-primary/40"
                  )}
                  data-testid={`select-cat-${c}`}
                >
                  <span className="text-xl">{meta.emoji}</span>
                  <span className="text-sm font-semibold">{meta.short}</span>
                  <span className="text-[11px] text-muted-foreground">{meta.blurb}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* title */}
        <div className="space-y-1.5">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Um título que prenda a atenção"
            maxLength={120}
            data-testid="input-title"
          />
        </div>

        {/* synopsis */}
        <div className="space-y-1.5">
          <Label htmlFor="synopsis">Sinopse</Label>
          <Textarea
            id="synopsis"
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            placeholder="Em poucas linhas, do que se trata a história?"
            rows={3}
            maxLength={400}
            data-testid="input-synopsis"
          />
          <p className="text-xs text-muted-foreground">{synopsis.length}/400</p>
        </div>

        {/* tags */}
        <div className="space-y-1.5">
          <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
          <Input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="terror, urbano, mistério"
            data-testid="input-tags"
          />
        </div>

        {/* accent hue */}
        <div className="space-y-2">
          <Label>Cor de destaque</Label>
          <div className="flex flex-wrap gap-2">
            {HUE_PRESETS.map((h) => (
              <button
                type="button"
                key={h}
                onClick={() => setAccentHue(h)}
                className={cn(
                  "h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                  accentHue === h ? "ring-primary scale-110" : "ring-transparent"
                )}
                style={{ background: `hsl(${h} 80% 55%)` }}
                aria-label={`Cor ${h}`}
                data-testid={`hue-${h}`}
              />
            ))}
          </div>
        </div>

        {/* mature */}
        <label
          htmlFor="mature"
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-card/40 p-3"
        >
          <Checkbox
            id="mature"
            checked={isMature}
            onCheckedChange={(v) => setIsMature(v === true)}
            data-testid="checkbox-mature"
          />
          <span className="text-sm">
            <span className="font-medium">Conteúdo +18</span>
            <span className="block text-muted-foreground">
              Marque se a história contiver temas sensíveis, violência explícita ou conteúdo adulto.
            </span>
          </span>
        </label>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={mut.isPending}
          className="gap-2"
          data-testid="button-submit-story"
        >
          <Send className="h-4 w-4" />
          {mut.isPending ? "Criando..." : "Criar e começar a escrever"}
        </Button>
      </form>
    </div>
  );
}
