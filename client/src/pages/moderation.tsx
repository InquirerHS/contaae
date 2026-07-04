import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Flag } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo, formatDate } from "@/lib/format";
import type { ReportWithReporter, ReportStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

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
};

export default function Moderation() {
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
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="font-display text-xl font-bold">Moderação</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Denúncias da comunidade. Avalie e atualize o status de cada caso.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["all", "open", "reviewing", "resolved", "dismissed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              filter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
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
              <div
                key={r.id}
                className="rounded-xl border border-border/70 bg-card/50 p-4"
                data-testid={`report-${r.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {TARGET_LABEL[r.targetType]}
                    </span>
                    <span className="text-xs text-muted-foreground">#{r.targetId}</span>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", sm.cls)}>
                    {sm.label}
                  </span>
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
        <div className="mt-6 rounded-xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
          <Shield className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhuma denúncia neste filtro. A cidade está em paz.
          </p>
        </div>
      )}
    </div>
  );
}
