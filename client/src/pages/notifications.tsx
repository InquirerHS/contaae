import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Heart, MessageCircle, PenLine, CheckCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/format";
import type { AppNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, typeof Heart> = {
  like: Heart,
  comment: MessageCircle,
  part: PenLine,
  report: Bell,
};

export default function Notifications() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<AppNotification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications");
      return res.json();
    },
  });

  const readAllMut = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread"] });
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="font-display text-xl font-bold">Notificações</h1>
        </div>
        {data && data.some((n) => !n.read) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => readAllMut.mutate()}
            disabled={readAllMut.isPending}
            className="gap-1.5"
            data-testid="button-read-all"
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="mt-6 space-y-2">
          {data.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Bell;
            return (
              <Link
                key={n.id}
                href={n.storyId ? `/historia/${n.storyId}` : "/notificacoes"}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4 transition-colors",
                  n.read
                    ? "border-border/50 bg-card/30 hover:bg-card/50"
                    : "border-primary/30 bg-primary/5 hover:bg-primary/10"
                )}
                data-testid={`notification-${n.id}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {n.actor && <Avatar user={n.actor} size="sm" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/90">{n.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.storyTitle ? `“${n.storyTitle}” · ` : ""}
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
          <Bell className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Tudo em silêncio por aqui. Você será avisado quando alguém curtir, comentar ou
            contribuir com suas histórias.
          </p>
        </div>
      )}
    </div>
  );
}
