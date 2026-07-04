import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Flag, Bot, EyeOff, Trash2, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  ReportWithReporter,
  ReportStatus,
  ModerationFlagWithRelations,
  ModerationFlagStatus,
  ModerationTarget,
  ModerationClass,
} from "@/lib/types";

const STATUS_META: Record<ReportStatus, { label: string; cls: string }> = {
  open: { label: "Aberta", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  reviewing: { label: "Em análise", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  resolved: { label: "Resolvida", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  dismissed: { label: "Arquivada", cls: "bg-muted text-muted-foreground" },
};

const TARGET_LABEL: Record<string, string> = {
  story: "História",
  part: "Trecho",
  comment: "Comentário",
  forum_topic: "Tópico do Bosque",
  forum_post: "Resposta do Bosque",
  character: "Ficha",
  quest: "Quest",
  quest_post: "Trecho de Quest",
};

const CLASS_META: Record<ModerationClass, { label: string; cls: string }> = {
  ok: { label: "OK", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  borderline: { label: "Zona cinza", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  violation: { label: "Violação", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
};

const FLAG_STATUS_LABEL: Record<ModerationFlagStatus, string> = {
  open: "Aberta",
  kept: "Mantido",
  hidden: "Oculto",
  removed: "Removido",
};

type Tab = "reports" | "ai";

export default function Moderation() {
  const [tab, setTab] = useState<Tab>("reports");
  const { user, loading } = useAuth();

  if (!loading && !user?.isModerator) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <Shield className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-3 font-display text-xl font-bold">Área restrita</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta página é exclusiva da equipe de moderação.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="font-display text-xl font-bold">Moderação</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Denúncias da comunidade e sinalizações automáticas da IA de moderação. Avalie cada caso.
      </p>

      <div className="mt-4 inline-flex rounded-xl border border-border/70 bg-card/40 p-1">
        <TabButton active={tab === "reports"} onClick={() => setTab("reports")} icon={Flag} label="Denúncias" testId="tab-reports" />
        <TabButton active={tab === "ai"} onClick={() => setTab("ai")} icon={Bot} label="Sinalizações da IA" testId="tab-ai" />
      </div>

      <div className="mt-5">
        {tab === "reports" ? <ReportsPanel /> : <AiFlagsPanel />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      )}
      data-testid={testId}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ReportsPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<ReportStatus | "all">("all");

  const { data, isLoading } = useQuery<ReportWithReporter[]>({
    queryKey: ["/api/reports"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/reports");
      return res.json();
    },
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ReportStatus }) =>
      apiRequest("PATCH", `/api/reports/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/reports"] }),
  });

  const reports = (data ?? []).filter((r) => filter === "all" || r.status === filter);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {(["all", "open", "reviewing", "resolved", "dismissed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              filter === s ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
            data-testid={`filter-report-${s}`}
          >
            {s === "all" ? "Todas" : STATUS_META[s].label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : reports.length > 0 ? (
        <div className="mt-6 space-y-3">
          {reports.map((r) => {
            const sm = STATUS_META[r.status];
            return (
              <div key={r.id} className="rounded-xl border border-border/70 bg-card/50 p-4" data-testid={`report-${r.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {TARGET_LABEL[r.targetType] ?? r.targetType}
                    </span>
                    <span className="text-xs text-muted-foreground">#{r.targetId}</span>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", sm.cls)}>{sm.label}</span>
                </div>

                <p className="mt-2 text-sm text-foreground/90">{r.reason}</p>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                  <div className="flex items-center gap-2">
                    <Avatar user={r.reporter} size="sm" />
                    <span className="text-xs text-muted-foreground">
                      {r.reporter.username} · {timeAgo(r.createdAt)} · {formatDate(r.createdAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {(["reviewing", "resolved", "dismissed"] as ReportStatus[]).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={r.status === s ? "default" : "outline"}
                        onClick={() => statusMut.mutate({ id: r.id, status: s })}
                        disabled={statusMut.isPending}
                        className="text-xs"
                        data-testid={`button-report-${r.id}-${s}`}
                      >
                        {STATUS_META[s].label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState text="Nenhuma denúncia neste filtro. A cidade está em paz." />
      )}
    </>
  );
}

function AiFlagsPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<ModerationFlagStatus | "all">("open");

  const { data, isLoading } = useQuery<ModerationFlagWithRelations[]>({
    queryKey: ["/api/moderation/flags", filter],
    queryFn: async () => {
      const qs = filter !== "all" ? `?status=${filter}` : "";
      const res = await apiRequest("GET", `/api/moderation/flags${qs}`);
      return res.json();
    },
  });

  const resolveMut = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ModerationFlagStatus }) =>
      apiRequest("PATCH", `/api/moderation/flags/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/moderation/flags"] }),
  });

  const flags = data ?? [];

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {(["all", "open", "kept", "hidden", "removed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              filter === s ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
            data-testid={`filter-flag-${s}`}
          >
            {s === "all" ? "Todas" : FLAG_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : flags.length > 0 ? (
        <div className="mt-6 space-y-3">
          {flags.map((f) => {
            const cm = CLASS_META[f.classification];
            return (
              <div key={f.id} className="rounded-xl border border-border/70 bg-card/50 p-4" data-testid={`flag-${f.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-violet-500" />
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {TARGET_LABEL[f.targetType] ?? f.targetType}
                    </span>
                    <span className="text-xs text-muted-foreground">#{f.targetId}</span>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", cm.cls)}>{cm.label}</span>
                </div>

                <p className="mt-2 rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">{f.snippet}</p>
                <p className="mt-2 text-sm text-foreground/90">
                  <span className="font-medium">IA: </span>
                  {f.reason}
                </p>

                {f.status !== "open" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Resolvido: {FLAG_STATUS_LABEL[f.status]}
                    {f.resolver ? ` por ${f.resolver.username}` : ""}
                    {f.resolvedAt ? ` · ${timeAgo(f.resolvedAt)}` : ""}
                    {f.resolutionNote ? ` — “${f.resolutionNote}”` : ""}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                  <span className="text-xs text-muted-foreground">{timeAgo(f.createdAt)} · {formatDate(f.createdAt)}</span>
                  {f.status === "open" ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveMut.mutate({ id: f.id, status: "kept" })}
                        disabled={resolveMut.isPending}
                        className="gap-1 text-xs"
                        data-testid={`button-flag-${f.id}-kept`}
                      >
                        <Check className="h-3.5 w-3.5" /> Manter
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveMut.mutate({ id: f.id, status: "hidden" })}
                        disabled={resolveMut.isPending}
                        className="gap-1 text-xs"
                        data-testid={`button-flag-${f.id}-hidden`}
                      >
                        <EyeOff className="h-3.5 w-3.5" /> Ocultar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => resolveMut.mutate({ id: f.id, status: "removed" })}
                        disabled={resolveMut.isPending}
                        className="gap-1 text-xs"
                        data-testid={`button-flag-${f.id}-removed`}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remover
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState text="Nenhuma sinalização da IA. O conteúdo está fluindo limpo." />
      )}
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
      <Shield className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
