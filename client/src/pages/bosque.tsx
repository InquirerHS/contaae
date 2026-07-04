import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ghost, Plus, MessageSquare, X, ShieldAlert, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/avatar";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ForumTopicWithRelations } from "@/lib/types";

function goTo(path: string) {
  window.location.hash = path;
}

export default function Bosque() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: topics = [], isLoading } = useQuery<ForumTopicWithRelations[]>({
    queryKey: ["/api/forum/topics"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/forum/topics");
      return res.json();
    },
  });

  const createMut = useMutation({
    mutationFn: async (data: { title: string; body: string; accentHue: number; isMature: boolean }) => {
      const res = await apiRequest("POST", "/api/forum/topics", data);
      return res.json();
    },
    onSuccess: (topic: ForumTopicWithRelations) => {
      toast({ title: "Tópico publicado no Bosque" });
      qc.invalidateQueries({ queryKey: ["/api/forum/topics"] });
      setCreating(false);
      goTo(`/bosque/${topic.id}`);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Ghost className="h-5 w-5 text-primary" />
            <h1 className="font-display text-xl font-bold">Bosque Assombrado</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Histórias arrepiantes em formato de fórum. Abra um tópico, deixe um susto no ar e veja para onde a
            noite te leva.
          </p>
        </div>
        {user && (
          <Button onClick={() => setCreating(true)} className="shrink-0 gap-1.5" data-testid="button-new-topic">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo tópico</span>
          </Button>
        )}
      </div>

      {!user && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Para criar tópicos e responder você precisa entrar na sua conta.{" "}
            <button onClick={() => goTo("/entrar")} className="font-semibold underline">
              Entrar
            </button>
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : topics.length > 0 ? (
        <div className="mt-6 space-y-2">
          {topics.map((t) => {
            const hue = t.accentHue ?? 270;
            return (
              <button
                key={t.id}
                onClick={() => goTo(`/bosque/${t.id}`)}
                className="group flex w-full items-start gap-3 rounded-xl border border-border/70 bg-card/50 p-4 text-left transition-colors hover:border-primary/40 hover:bg-card"
                data-testid={`topic-${t.id}`}
              >
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `hsl(${hue} 70% 22%)`, color: `hsl(${hue} 80% 70%)` }}
                >
                  <Ghost className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-foreground group-hover:text-primary">
                      {t.title}
                    </h3>
                    {t.status === "closed" && (
                      <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    {t.isMature && (
                      <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-500">
                        +18
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                    {t.body.replace(/\s+/g, " ").slice(0, 160)}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {t.replyCount} {t.replyCount === 1 ? "resposta" : "respostas"}
                    </span>
                    <span>·</span>
                    <span>{t.author.username}</span>
                    <span>·</span>
                    <span>{timeAgo(t.updatedAt)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
          <Ghost className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            O bosque está em silêncio. Seja o primeiro a sussurrar uma história.
          </p>
        </div>
      )}

      <CreateTopicDialog
        open={creating}
        onClose={() => setCreating(false)}
        submitting={createMut.isPending}
        onSubmit={(d) => createMut.mutate(d)}
      />
    </div>
  );
}

function CreateTopicDialog({
  open,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (d: { title: string; body: string; accentHue: number; isMature: boolean }) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [accentHue, setAccentHue] = useState(270);
  const [isMature, setIsMature] = useState(false);

  const valid = title.trim().length >= 3 && body.trim().length >= 20;

  function submit() {
    if (!valid) return;
    onSubmit({ title: title.trim(), body: body.trim(), accentHue, isMature });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ghost className="h-4 w-4 text-primary" />
            Novo tópico no Bosque
          </DialogTitle>
          <DialogDescription>
            Conte uma história arrepiante. Os leitores poderão responder e tecer a narrativa com você, em
            respostas encadeadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="t-title">Título</Label>
            <Input
              id="t-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: O elevador que subia sozinho às 3:33"
              maxLength={140}
              data-testid="input-topic-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-body">A história</Label>
            <Textarea
              id="t-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escreva o relato, a creepypasta ou o mistério. Quanto mais atmosfera, melhor."
              rows={8}
              maxLength={8000}
              data-testid="input-topic-body"
            />
          </div>

          <div className="space-y-2">
            <Label>Atmosfera (cor)</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[accentHue]}
                min={0}
                max={360}
                step={1}
                onValueChange={(v) => setAccentHue(v[0])}
                className="max-w-xs"
                data-testid="slider-topic-hue"
              />
              <span
                className="h-8 w-8 rounded-full border border-border"
                style={{ background: `hsl(${accentHue} 80% 55%)` }}
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm" data-testid="toggle-topic-mature">
            <input
              type="checkbox"
              checked={isMature}
              onChange={(e) => setIsMature(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <span>Conteúdo sensível (avise os leitores)</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="mr-1.5 h-4 w-4" /> Cancelar
          </Button>
          <Button disabled={!valid || submitting} onClick={submit} data-testid="button-save-topic">
            {submitting ? "Publicando..." : "Publicar tópico"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
