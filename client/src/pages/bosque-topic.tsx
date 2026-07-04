import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ghost, MessageSquare, Reply, Lock, ShieldAlert, ChevronLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/avatar";
import { ReportButton } from "@/components/report-button";
import { timeAgo, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ForumTopicWithRelations, ForumPostWithAuthor } from "@/lib/types";

function goTo(path: string) {
  window.location.hash = path;
}

export default function BosqueTopic({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: topic, isLoading } = useQuery<ForumTopicWithRelations>({
    queryKey: ["/api/forum/topics", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/forum/topics/${id}`);
      if (!res.ok) throw new Error("Tópico não encontrado");
      return res.json();
    },
  });

  const { data: posts = [] } = useQuery<ForumPostWithAuthor[]>({
    queryKey: ["/api/forum/topics", id, "posts"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/forum/topics/${id}/posts`);
      return res.json();
    },
  });

  const [replyTo, setReplyTo] = useState<number | null>(null); // post id being replied to (null = top-level)

  const replyMut = useMutation({
    mutationFn: async (data: { content: string; parentId: number | null }) => {
      const res = await apiRequest("POST", `/api/forum/topics/${id}/posts`, data);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || "Erro ao responder");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Resposta publicada" });
      qc.invalidateQueries({ queryKey: ["/api/forum/topics", id, "posts"] });
      qc.invalidateQueries({ queryKey: ["/api/forum/topics"] });
      qc.invalidateQueries({ queryKey: ["/api/forum/topics", id] });
      setReplyTo(null);
      setDraft("");
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const [draft, setDraft] = useState("");

  function submitReply() {
    if (draft.trim().length < 2) return;
    replyMut.mutate({ content: draft.trim(), parentId: replyTo });
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Skeleton className="h-40 rounded-xl" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <Ghost className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Este tópico se perdeu na névoa.</p>
        <Button variant="outline" className="mt-4" onClick={() => goTo("/bosque")}>
          Voltar ao Bosque
        </Button>
      </div>
    );
  }

  const hue = topic.accentHue ?? 270;
  const closed = topic.status === "closed";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <button
        onClick={() => goTo("/bosque")}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        data-testid="link-back-bosque"
      >
        <ChevronLeft className="h-4 w-4" /> Bosque Assombrado
      </button>

      {/* Topic header */}
      <div
        className="rounded-xl border border-border/70 bg-card/60 p-5"
        style={{ boxShadow: `inset 0 1px 0 hsl(${hue} 80% 60% / 0.08)` }}
        data-testid={`topic-header-${topic.id}`}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: `hsl(${hue} 70% 22%)`, color: `hsl(${hue} 80% 70%)` }}
          >
            <Ghost className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            {closed && <Lock className="h-4 w-4 text-muted-foreground" />}
            {topic.isMature && (
              <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-500">
                +18
              </span>
            )}
          </div>
        </div>
        <h1 className="mt-3 font-display text-xl font-bold leading-tight">{topic.title}</h1>
        <div className="mt-3 flex items-center gap-2">
          <Avatar user={topic.author} size="sm" />
          <span className="text-xs text-muted-foreground">
            {topic.author.username} · {timeAgo(topic.createdAt)} · {formatDate(topic.createdAt)}
          </span>
        </div>
        <div className="prose-invert mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {topic.body}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            {topic.replyCount} {topic.replyCount === 1 ? "resposta" : "respostas"}
          </span>
          <ReportButton targetType="forum_topic" targetId={topic.id} size="sm" variant="outline" label="Denunciar" />
        </div>
      </div>

      {/* Replies (threaded tree) */}
      <div className="mt-6 space-y-3">
        {posts.map((p) => (
          <PostNode key={p.id} post={p} depth={0} replyTo={replyTo} setReplyTo={setReplyTo} />
        ))}
        {posts.length === 0 && !closed && (
          <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            Nenhuma resposta ainda. Quebre o silêncio.
          </p>
        )}
      </div>

      {/* Composer */}
      {user ? (
        closed ? (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-border/70 bg-card/40 p-4 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" /> Este tópico foi encerrado pelo autor.
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-border/70 bg-card/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Reply className="h-4 w-4 text-primary" />
              {replyTo ? `Respondendo à resposta #${replyTo}` : "Responder ao tópico"}
              {replyTo && (
                <button
                  onClick={() => setReplyTo(null)}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                  data-testid="button-cancel-reply"
                >
                  cancelar
                </button>
              )}
            </div>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escreva sua resposta..."
              rows={4}
              maxLength={4000}
              data-testid="input-reply"
            />
            <div className="mt-2 flex justify-end">
              <Button
                onClick={submitReply}
                disabled={draft.trim().length < 2 || replyMut.isPending}
                data-testid="button-submit-reply"
              >
                {replyMut.isPending ? "Enviando..." : "Publicar resposta"}
              </Button>
            </div>
          </div>
        )
      ) : (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Para responder você precisa entrar na sua conta.{" "}
            <button onClick={() => goTo("/entrar")} className="font-semibold underline">
              Entrar
            </button>
          </span>
        </div>
      )}
    </div>
  );
}

function PostNode({
  post,
  depth,
  replyTo,
  setReplyTo,
}: {
  post: ForumPostWithAuthor;
  depth: number;
  replyTo: number | null;
  setReplyTo: (id: number | null) => void;
}) {
  const isReplying = replyTo === post.id;
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/40 p-3",
        depth > 0 && "ml-4 border-l-2 border-l-primary/30"
      )}
      data-testid={`post-${post.id}`}
    >
      <div className="flex items-center gap-2">
        <Avatar user={post.author} size="sm" />
        <span className="text-xs font-medium text-foreground">{post.author.username}</span>
        <span className="text-xs text-muted-foreground">· {timeAgo(post.createdAt)}</span>
      </div>
      <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{post.content}</div>
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={() => setReplyTo(isReplying ? null : post.id)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          data-testid={`button-reply-to-${post.id}`}
        >
          <Reply className="h-3 w-3" /> Responder
        </button>
        <ReportButton targetType="forum_post" targetId={post.id} />
      </div>
      {post.children.length > 0 && (
        <div className="mt-3 space-y-3 border-l border-border/40 pl-3">
          {post.children.map((c) => (
            <PostNode key={c.id} post={c} depth={depth + 1} replyTo={replyTo} setReplyTo={setReplyTo} />
          ))}
        </div>
      )}
    </div>
  );
}
