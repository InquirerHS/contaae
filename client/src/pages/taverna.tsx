import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ScrollText,
  Plus,
  Search,
  Users,
  MessageSquare,
  X,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import type { QuestWithRelations, QuestStatus } from "@/lib/types";

function goTo(path: string) {
  window.location.hash = path;
}

const STATUS_META: Record<QuestStatus, { label: string; className: string }> = {
  open: { label: "Recrutando", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  ongoing: { label: "Em andamento", className: "bg-primary/15 text-primary" },
  completed: { label: "Concluído", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  closed: { label: "Encerrado", className: "bg-muted text-muted-foreground" },
};

const STATUS_FILTERS: { key: QuestStatus | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "open", label: "Recrutando" },
  { key: "ongoing", label: "Em andamento" },
  { key: "completed", label: "Concluídos" },
];

export default function Taverna() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuestStatus | "all">("all");
  const [creating, setCreating] = useState(false);

  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (search.trim()) queryParams.set("search", search.trim());

  const { data: quests = [], isLoading } = useQuery<QuestWithRelations[]>({
    queryKey: ["/api/quests", statusFilter, search.trim()],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/quests?${queryParams.toString()}`);
      return res.json();
    },
  });

  const createMut = useMutation({
    mutationFn: async (data: QuestFormData) => {
      const res = await apiRequest("POST", "/api/quests", data);
      return res.json();
    },
    onSuccess: (quest: QuestWithRelations) => {
      toast({ title: "Quest criado" });
      qc.invalidateQueries({ queryKey: ["/api/quests"] });
      qc.invalidateQueries({ queryKey: ["/api/quests/mine"] });
      setCreating(false);
      goTo(`/quest/${quest.id}`);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            <h1 className="font-display text-xl font-bold">Taverna</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Quests de interpretação pura, mediados por um Game Master. Sem dados, sem pontos de vida — só texto e
            imaginação.
          </p>
        </div>
        {user && (
          <Button onClick={() => setCreating(true)} className="shrink-0 gap-1.5" data-testid="button-new-quest">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Montar quest</span>
          </Button>
        )}
      </div>

      {!user && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Para montar ou entrar em quests você precisa entrar na sua conta.{" "}
            <button onClick={() => goTo("/entrar")} className="font-semibold underline">
              Entrar
            </button>
          </span>
        </div>
      )}

      {/* search */}
      <div className="relative mt-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, cenário ou busca..."
          className="pl-9"
          data-testid="input-quest-search"
        />
      </div>

      {/* filter tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              statusFilter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            data-testid={`filter-quest-${f.key}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* grid */}
      {isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : quests.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quests.map((q) => (
            <QuestCard key={q.id} quest={q} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
          <p className="text-muted-foreground">
            {search.trim() || statusFilter !== "all"
              ? "Nenhum quest encontrado para esses filtros."
              : "A taverna está vazia. Seja o primeiro a montar uma mesa."}
          </p>
        </div>
      )}

      {creating && (
        <QuestDialog
          onClose={() => setCreating(false)}
          onSubmit={(data) => createMut.mutate(data)}
          submitting={createMut.isPending}
        />
      )}
    </div>
  );
}

function QuestCard({ quest }: { quest: QuestWithRelations }) {
  const sm = STATUS_META[quest.status];
  const hue = quest.accentHue ?? 190;
  const full = quest.slotsFilled >= quest.slotsTotal && quest.status === "open";

  return (
    <div
      onClick={() => goTo(`/quest/${quest.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && goTo(`/quest/${quest.id}`)}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border/70 bg-card/70 p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
      data-testid={`card-quest-${quest.id}`}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, hsl(${hue} 80% 55%), hsl(${(hue + 60) % 360} 75% 45%))` }}
      />
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge className={cn("border-0", sm.className)}>{sm.label}</Badge>
        {quest.isMature && (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            <span className="h-1 w-1 rounded-full bg-amber-500" />
            Sensível
          </span>
        )}
      </div>

      <h3 className="font-display text-lg font-bold leading-snug text-foreground group-hover:text-primary">
        {quest.title}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{quest.brief}</p>

      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          {quest.seeking}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Avatar user={quest.gm} size="sm" />
          <span className="font-medium text-foreground/80">{quest.gm.username}</span>
        </div>
        <span>{timeAgo(quest.updatedAt)}</span>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1" data-testid={`text-quest-slots-${quest.id}`}>
          <Users className="h-3.5 w-3.5" />
          {quest.slotsFilled}/{quest.slotsTotal}
          {full && <span className="text-amber-500">· cheio</span>}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />
          {quest.postCount} {quest.postCount === 1 ? "trecho" : "trechos"}
        </span>
      </div>
    </div>
  );
}

interface QuestFormData {
  title: string;
  setting: string;
  situation: string;
  brief: string;
  slotsTotal: number;
  seeking: string;
  isMature: boolean;
  accentHue: number;
}

function QuestDialog({
  onClose,
  onSubmit,
  submitting,
}: {
  onClose: () => void;
  onSubmit: (data: QuestFormData) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [setting, setSetting] = useState("");
  const [situation, setSituation] = useState("");
  const [brief, setBrief] = useState("");
  const [slotsTotal, setSlotsTotal] = useState(3);
  const [seeking, setSeeking] = useState("");
  const [isMature, setIsMature] = useState(false);
  const [accentHue, setAccentHue] = useState(190);

  const valid =
    title.trim().length >= 3 &&
    setting.trim().length >= 10 &&
    situation.trim().length >= 10 &&
    brief.trim().length >= 10 &&
    seeking.trim().length >= 3;

  const submit = () =>
    onSubmit({
      title: title.trim(),
      setting: setting.trim(),
      situation: situation.trim(),
      brief: brief.trim(),
      slotsTotal,
      seeking: seeking.trim(),
      isMature,
      accentHue,
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" />
            Montar um quest
          </DialogTitle>
          <DialogDescription>
            Você será o Game Master. Descreva o ambiente, a situação e quem você procura. Os jogadores vão entrar,
            apresentar seus personagens e interpretar. Você media o andamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="q-title">Título do quest</Label>
            <Input
              id="q-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: O Trem Fantasma da Linha 9"
              maxLength={120}
              data-testid="input-quest-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="q-setting">O ambiente</Label>
            <Textarea
              id="q-setting"
              value={setting}
              onChange={(e) => setSetting(e.target.value)}
              placeholder="Onde se passa? Descreva o cenário, a atmosfera, os detalhes que importam."
              rows={3}
              maxLength={2000}
              data-testid="input-quest-setting"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="q-situation">A situação</Label>
            <Textarea
              id="q-situation"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="O que está acontecendo agora? Qual o gancho inicial?"
              rows={3}
              maxLength={2000}
              data-testid="input-quest-situation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="q-brief">Do que você precisa</Label>
            <Textarea
              id="q-brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Que tipo de participação você espera? Quais papéis cabem nessa história?"
              rows={3}
              maxLength={2000}
              data-testid="input-quest-brief"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Quantas pessoas: {slotsTotal}</Label>
              <Slider
                value={[slotsTotal]}
                min={1}
                max={8}
                step={1}
                onValueChange={(v) => setSlotsTotal(v[0])}
                data-testid="slider-quest-slots"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-seeking">Buscando (livre)</Label>
              <Input
                id="q-seeking"
                value={seeking}
                onChange={(e) => setSeeking(e.target.value)}
                placeholder="Ex.: 3 pessoas para fantasia estilo star wars"
                maxLength={500}
                data-testid="input-quest-seeking"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor de destaque</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[accentHue]}
                min={0}
                max={360}
                step={1}
                onValueChange={(v) => setAccentHue(v[0])}
                className="max-w-xs"
                data-testid="slider-quest-hue"
              />
              <span
                className="h-8 w-8 rounded-full border border-border"
                style={{ background: `hsl(${accentHue} 80% 55%)` }}
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm" data-testid="toggle-quest-mature">
            <input
              type="checkbox"
              checked={isMature}
              onChange={(e) => setIsMature(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <span>Conteúdo sensível (marcar para avisar os participantes)</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="mr-1.5 h-4 w-4" /> Cancelar
          </Button>
          <Button disabled={!valid || submitting} onClick={submit} data-testid="button-save-quest">
            {submitting ? "Criando..." : "Criar quest"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
