import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Send,
  Users,
  Sparkles,
  ScrollText,
  Trash2,
  Check,
  X,
  MessageSquareWarning,
  Pencil,
  IdCard,
  Crown,
  ShieldCheck,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { timeAgo, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  QuestWithRelations,
  QuestParticipantWithRelations,
  QuestPostWithRelations,
  Character,
  QuestStatus,
} from "@/lib/types";

const STATUS_META: Record<QuestStatus, { label: string; className: string }> = {
  open: { label: "Recrutando", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  ongoing: { label: "Em andamento", className: "bg-primary/15 text-primary" },
  completed: { label: "Concluído", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  closed: { label: "Encerrado", className: "bg-muted text-muted-foreground" },
};

export default function QuestDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [joinOpen, setJoinOpen] = useState(false);

  const { data: quest, isLoading } = useQuery<QuestWithRelations>({
    queryKey: ["/api/quests", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/quests/${id}`);
      return res.json();
    },
  });

  const { data: participants = [] } = useQuery<QuestParticipantWithRelations[]>({
    queryKey: ["/api/quests", id, "participants"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/quests/${id}/participants`);
      return res.json();
    },
  });

  const { data: posts = [], refetch: refetchPosts } = useQuery<QuestPostWithRelations[]>({
    queryKey: ["/api/quests", id, "posts"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/quests/${id}/posts`);
      return res.json();
    },
  });

  const statusMut = useMutation({
    mutationFn: async (status: QuestStatus) => {
      const res = await apiRequest("PATCH", `/api/quests/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Status atualizado" });
      qc.invalidateQueries({ queryKey: ["/api/quests", id] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-4 h-40 rounded-xl" />
        <Skeleton className="mt-4 h-64 rounded-xl" />
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <p className="text-muted-foreground">Quest não encontrado.</p>
        <Link href="/taverna" className="mt-3 inline-block text-primary underline">
          Voltar à Taverna
        </Link>
      </div>
    );
  }

  const isGm = !!user && user.id === quest.gmId;
  const myPart = quest.myParticipation;
  const isParticipant = !!myPart && myPart.status === "active";
  const sm = STATUS_META[quest.status];
  const hue = quest.accentHue ?? 190;
  const slotsLeft = quest.slotsTotal - quest.slotsFilled;
  const canJoin = user && !isGm && !myPart && (quest.status === "open" || quest.status === "ongoing") && slotsLeft > 0;
  const canPost =
    user && (isGm || isParticipant) && quest.status !== "closed" && quest.status !== "completed";

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["/api/quests", id] });
    qc.invalidateQueries({ queryKey: ["/api/quests", id, "posts"] });
    qc.invalidateQueries({ queryKey: ["/api/quests", id, "participants"] });
    refetchPosts();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/taverna"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        data-testid="link-back-taverna"
      >
        <ArrowLeft className="h-4 w-4" />
        Taverna
      </Link>

      {/* header */}
      <div
        className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-card/70"
        data-testid="card-quest-header"
      >
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, hsl(${hue} 80% 55%), hsl(${(hue + 60) % 360} 75% 45%))` }}
        />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("border-0", sm.className)}>{sm.label}</Badge>
            {quest.isMature && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                Conteúdo sensível
              </span>
            )}
            {isGm && (
              <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
                <Crown className="h-3 w-3" /> Você é o GM
              </Badge>
            )}
          </div>

          <h1 className="mt-3 font-display text-2xl font-bold leading-tight">{quest.title}</h1>

          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar user={quest.gm} size="sm" />
            <span>
              GM: <span className="font-medium text-foreground/80">{quest.gm.username}</span>
            </span>
            <span>· {formatDate(quest.createdAt)}</span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <QuestField label="O ambiente" content={quest.setting} />
            <QuestField label="A situação" content={quest.situation} />
          </div>
          <div className="mt-4">
            <QuestField label="Do que o GM precisa" content={quest.brief} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {quest.seeking}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {quest.slotsFilled}/{quest.slotsTotal} vagas
              {slotsLeft > 0 && quest.status === "open" && (
                <span className="text-emerald-500">· {slotsLeft} livre{slotsLeft > 1 ? "s" : ""}</span>
              )}
            </span>
          </div>

          {/* GM status controls */}
          {isGm && (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
              <span className="text-xs text-muted-foreground">Mudar status:</span>
              {(["open", "ongoing", "completed", "closed"] as QuestStatus[]).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={quest.status === s ? "default" : "outline"}
                  disabled={statusMut.isPending}
                  onClick={() => statusMut.mutate(s)}
                  data-testid={`button-quest-status-${s}`}
                >
                  {STATUS_META[s].label}
                </Button>
              ))}
            </div>
          )}

          {/* join CTA */}
          {canJoin && (
            <div className="mt-5 border-t border-border/60 pt-4">
              <Button onClick={() => setJoinOpen(true)} className="gap-1.5" data-testid="button-join-quest">
                <IdCard className="h-4 w-4" />
                Entrar no quest
              </Button>
            </div>
          )}
          {!user && (
            <div className="mt-5 border-t border-border/60 pt-4 text-sm text-muted-foreground">
              <Link href="/entrar" className="text-primary underline">
                Entre na sua conta
              </Link>{" "}
              para participar deste quest.
            </div>
          )}
          {user && !isGm && myPart && myPart.status === "removed" && (
            <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              Você foi removido deste quest pelo GM.
            </div>
          )}
        </div>
      </div>

      {/* participants */}
      <div className="mt-6 rounded-xl border border-border/70 bg-card/40 p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-bold">
          <Users className="h-4 w-4 text-primary" />
          Participantes
        </h2>
        {participants.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Ninguém entrou ainda.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {participants.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "rounded-lg border p-3",
                  p.status === "active"
                    ? "border-border/60 bg-background/40"
                    : "border-amber-500/30 bg-amber-500/5 opacity-70"
                )}
                data-testid={`card-participant-${p.userId}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar user={p.user} size="sm" />
                    <div>
                      <span className="text-sm font-medium text-foreground">{p.user.username}</span>
                      <span className="ml-2 text-xs text-muted-foreground">como {p.character.name}</span>
                    </div>
                  </div>
                  {p.status === "removed" && (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
                      Removido
                    </Badge>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{p.intro}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* narrative */}
      <div className="mt-6">
        <h2 className="flex items-center gap-2 font-display text-base font-bold">
          <ScrollText className="h-4 w-4 text-primary" />
          Narrativa
        </h2>

        {posts.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border/70 bg-card/30 p-10 text-center text-sm text-muted-foreground">
            {isGm
              ? "Comece a narrar para abrir o quest aos jogadores."
              : "Ainda não há trechos. Aguarde o GM iniciar."}
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            {posts.map((post) => (
              <PostItem
                key={post.id}
                post={post}
                questId={id}
                isGm={isGm}
                viewerId={user?.id}
                gmId={quest.gmId}
                onChanged={invalidateAll}
              />
            ))}
          </div>
        )}

        {canPost && (
          <PostComposer questId={id} isGm={isGm} myCharacterId={myPart?.characterId ?? null} onDone={invalidateAll} />
        )}
      </div>

      {joinOpen && (
        <JoinDialog
          questId={id}
          onClose={() => setJoinOpen(false)}
          onJoined={() => {
            setJoinOpen(false);
            invalidateAll();
          }}
        />
      )}
    </div>
  );
}

function QuestField({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{content}</p>
    </div>
  );
}

// ---------- POST ITEM (with moderation) ----------
function PostItem({
  post,
  questId,
  isGm,
  viewerId,
  gmId,
  onChanged,
}: {
  post: QuestPostWithRelations;
  questId: number;
  isGm: boolean;
  viewerId?: number;
  gmId: number;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [removeOpen, setRemoveOpen] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [argueOpen, setArgueOpen] = useState(false);

  const isAuthor = viewerId === post.authorId;
  const isNarration = post.characterId === null;
  const removed = post.status === "removed";
  const pending = post.status === "pending";
  const hasPendingArg = post.arguments.some((a) => a.status === "pending");

  const removeMut = useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiRequest("DELETE", `/api/quest-posts/${post.id}`, { reason });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Trecho removido" });
      setRemoveOpen(false);
      onChanged();
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const approveMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/quest-posts/${post.id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Revisão aprovada" });
      onChanged();
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const resolveArgMut = useMutation({
    mutationFn: async ({ argId, accepted, note }: { argId: number; accepted: boolean; note?: string }) => {
      const res = await apiRequest("POST", `/api/quest-arguments/${argId}/resolve`, { accepted, note });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Argumento resolvido" });
      onChanged();
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        pending
          ? "border-primary/40 bg-primary/5"
          : removed
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border/70 bg-card/60"
      )}
      data-testid={`card-post-${post.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar user={post.author} size="sm" />
          <div>
            <span className="text-sm font-medium text-foreground">{post.author.username}</span>
            {isNarration ? (
              <span className="ml-2 inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                <Crown className="h-2.5 w-2.5" /> Narração do GM
              </span>
            ) : post.character ? (
              <span className="ml-2 text-xs text-muted-foreground">como {post.character.name}</span>
            ) : null}
          </div>
          <span className="ml-1 text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
        </div>
        {pending && (
          <Badge className="border-0 bg-primary/20 text-primary">Aguardando revisão do GM</Badge>
        )}
        {removed && <Badge className="border-0 bg-amber-500/20 text-amber-600 dark:text-amber-400">Removido</Badge>}
      </div>

      {pending && (
        <p className="mt-2 text-xs text-primary/80">
          Esta é uma revisão enviada pelo autor. Como GM, você pode aprová-la ou ignorá-la.
        </p>
      )}

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{post.content}</p>

      {removed && post.removedReason && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
          <strong>Motivo do GM:</strong> {post.removedReason}
        </div>
      )}

      {/* arguments thread */}
      {post.arguments.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-border/60 pl-3">
          {post.arguments.map((a) => (
            <div key={a.id} className="text-xs" data-testid={`card-argument-${a.id}`}>
              <div className="flex items-center gap-1.5">
                <MessageSquareWarning className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium text-foreground/80">{a.author.username}</span>
                argumentou · {timeAgo(a.createdAt)}
                {a.status === "accepted" && (
                  <Badge className="border-0 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">Aceito</Badge>
                )}
                {a.status === "rejected" && (
                  <Badge className="border-0 bg-muted text-muted-foreground">Rejeitado</Badge>
                )}
              </div>
              <p className="mt-0.5 text-muted-foreground">{a.content}</p>
              {a.gmNote && (
                <p className="mt-0.5 text-foreground/70">
                  <strong>GM:</strong> {a.gmNote}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* GM: remove an active post */}
        {isGm && post.status === "active" && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setRemoveOpen(true)} data-testid={`button-remove-post-${post.id}`}>
            <Trash2 className="h-3.5 w-3.5" /> Remover trecho
          </Button>
        )}
        {/* GM: approve a pending revision */}
        {isGm && pending && (
          <Button size="sm" className="gap-1.5" disabled={approveMut.isPending} onClick={() => approveMut.mutate()} data-testid={`button-approve-post-${post.id}`}>
            <Check className="h-3.5 w-3.5" /> Aprovar revisão
          </Button>
        )}
        {/* author of a removed post: rewrite */}
        {isAuthor && removed && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setReviseOpen(true)} data-testid={`button-revise-post-${post.id}`}>
            <Pencil className="h-3.5 w-3.5" /> Reescrever
          </Button>
        )}
        {/* author of a removed post: argue (if no pending argument) */}
        {isAuthor && removed && !hasPendingArg && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setArgueOpen(true)} data-testid={`button-argue-post-${post.id}`}>
            <MessageSquareWarning className="h-3.5 w-3.5" /> Argumentar
          </Button>
        )}
      </div>

      {/* GM resolve pending arguments */}
      {isGm && post.arguments.filter((a) => a.status === "pending").length > 0 && (
        <div className="mt-3 space-y-2">
          {post.arguments
            .filter((a) => a.status === "pending")
            .map((a) => (
              <ResolveArgument
                key={a.id}
                argumentId={a.id}
                content={a.content}
                author={a.author.username}
                onResolve={(accepted, note) => resolveArgMut.mutate({ argId: a.id, accepted, note })}
                pending={resolveArgMut.isPending}
              />
            ))}
        </div>
      )}

      {removeOpen && (
        <RemovePostDialog
          onClose={() => setRemoveOpen(false)}
          onConfirm={(reason) => removeMut.mutate(reason)}
          submitting={removeMut.isPending}
        />
      )}
      {reviseOpen && (
        <ReviseDialog
          questId={questId}
          postId={post.id}
          originalContent={post.content}
          characterId={post.characterId}
          onClose={() => setReviseOpen(false)}
          onDone={() => {
            setReviseOpen(false);
            onChanged();
          }}
        />
      )}
      {argueOpen && (
        <ArgueDialog
          postId={post.id}
          onClose={() => setArgueOpen(false)}
          onDone={() => {
            setArgueOpen(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function ResolveArgument({
  argumentId,
  content,
  author,
  onResolve,
  pending,
}: {
  argumentId: number;
  content: string;
  author: string;
  onResolve: (accepted: boolean, note?: string) => void;
  pending: boolean;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3" data-testid={`card-resolve-${argumentId}`}>
      <p className="text-xs text-muted-foreground">
        <strong className="text-foreground/80">{author}</strong> argumentou:
      </p>
      <p className="mt-1 text-sm text-foreground/80">{content}</p>
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota do GM (opcional)..."
        className="mt-2"
        maxLength={500}
        data-testid={`input-arg-note-${argumentId}`}
      />
      <div className="mt-2 flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => onResolve(true, note.trim() || undefined)} data-testid={`button-accept-arg-${argumentId}`}>
          <Check className="mr-1 h-3.5 w-3.5" /> Aceitar (restaurar)
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => onResolve(false, note.trim() || undefined)} data-testid={`button-reject-arg-${argumentId}`}>
          <X className="mr-1 h-3.5 w-3.5" /> Rejeitar
        </Button>
      </div>
    </div>
  );
}

// ---------- POST COMPOSER ----------
function PostComposer({
  questId,
  isGm,
  myCharacterId,
  onDone,
}: {
  questId: number;
  isGm: boolean;
  myCharacterId: number | null;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [asNarration, setAsNarration] = useState(isGm);

  const mut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/quests/${questId}/posts`, {
        characterId: asNarration ? null : myCharacterId,
        content: content.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      setContent("");
      toast({ title: "Trecho publicado" });
      onDone();
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const valid = content.trim().length >= 20;

  return (
    <div className="mt-4 rounded-xl border border-border/70 bg-card/60 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Send className="h-4 w-4 text-primary" />
        {isGm ? "Narrar como GM" : "Escrever seu trecho"}
      </h3>
      {isGm && (
        <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground" data-testid="toggle-gm-narration">
          <input
            type="checkbox"
            checked={asNarration}
            onChange={(e) => setAsNarration(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border"
          />
          Postar como narração do GM (ambiente/NPCs)
        </label>
      )}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escreva seu trecho da narrativa..."
        rows={5}
        maxLength={6000}
        className="mt-2"
        data-testid="input-post-content"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{content.length}/6000</span>
        <Button size="sm" disabled={!valid || mut.isPending} onClick={() => mut.mutate()} data-testid="button-submit-post">
          {mut.isPending ? "Publicando..." : "Publicar trecho"}
        </Button>
      </div>
    </div>
  );
}

// ---------- JOIN DIALOG ----------
function JoinDialog({
  questId,
  onClose,
  onJoined,
}: {
  questId: number;
  onClose: () => void;
  onJoined: () => void;
}) {
  const { toast } = useToast();
  const [characterId, setCharacterId] = useState<string>("");
  const [intro, setIntro] = useState("");

  const { data: characters = [] } = useQuery<Character[]>({
    queryKey: ["/api/characters"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/characters");
      return res.json();
    },
  });

  const joinMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/quests/${questId}/join`, {
        characterId: Number(characterId),
        intro: intro.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Você entrou no quest" });
      onJoined();
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const valid = !!characterId && intro.trim().length >= 10;
  const noChars = characters.length === 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IdCard className="h-4 w-4 text-primary" />
            Entrar no quest
          </DialogTitle>
          <DialogDescription>
            Escolha uma das suas fichas e escreva sua entrada — como seu personagem chega na cena.
          </DialogDescription>
        </DialogHeader>

        {noChars ? (
          <div className="py-4 text-sm text-muted-foreground">
            Você ainda não tem fichas.{" "}
            <Link href="/fichas" className="text-primary underline">
              Crie uma ficha
            </Link>{" "}
            antes de entrar.
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="join-char">Personagem</Label>
              <Select value={characterId} onValueChange={setCharacterId}>
                <SelectTrigger id="join-char" data-testid="select-join-character">
                  <SelectValue placeholder="Escolha uma ficha..." />
                </SelectTrigger>
                <SelectContent>
                  {characters.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-intro">Sua entrada</Label>
              <Textarea
                id="join-intro"
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="Como seu personagem aparece nessa história?"
                rows={4}
                maxLength={2000}
                data-testid="input-join-intro"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!valid || joinMut.isPending || noChars} onClick={() => joinMut.mutate()} data-testid="button-confirm-join">
            {joinMut.isPending ? "Entrando..." : "Entrar no quest"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- REMOVE POST DIALOG ----------
function RemovePostDialog({
  onClose,
  onConfirm,
  submitting,
}: {
  onClose: () => void;
  onConfirm: (reason: string) => void;
  submitting: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" />
            Remover trecho
          </DialogTitle>
          <DialogDescription>
            Explique o motivo. O autor verá e poderá argumentar ou reescrever o trecho.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex.: O personagem agiu fora do combinado para a cena..."
          rows={4}
          maxLength={500}
          data-testid="input-remove-reason"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={reason.trim().length < 3 || submitting}
            onClick={() => onConfirm(reason.trim())}
            data-testid="button-confirm-remove-post"
          >
            Remover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- REVISE DIALOG ----------
function ReviseDialog({
  questId,
  postId,
  originalContent,
  characterId,
  onClose,
  onDone,
}: {
  questId: number;
  postId: number;
  originalContent: string;
  characterId: number | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [content, setContent] = useState(originalContent);

  const mut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/quests/${questId}/posts/${postId}/revise`, {
        characterId,
        content: content.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Revisão enviada", description: "Aguarde o GM aprovar." });
      onDone();
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Reescrever trecho
          </DialogTitle>
          <DialogDescription>
            Sua nova versão ficará pendente até o GM aprovar. O trecho original removido continuará visível para você.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={7}
          maxLength={6000}
          data-testid="input-revise-content"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={content.trim().length < 20 || mut.isPending} onClick={() => mut.mutate()} data-testid="button-confirm-revise">
            {mut.isPending ? "Enviando..." : "Enviar revisão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- ARGUE DIALOG ----------
function ArgueDialog({
  postId,
  onClose,
  onDone,
}: {
  postId: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [content, setContent] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/quest-posts/${postId}/argue`, {
        content: content.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Argumento enviado", description: "O GM vai avaliar." });
      onDone();
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareWarning className="h-4 w-4 text-primary" />
            Argumentar
          </DialogTitle>
          <DialogDescription>
            Explique por que seu trecho deveria ser mantido. O GM pode aceitar (restaurando o trecho) ou rejeitar.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Ex.: O personagem tinha motivo para agir assim, conforme a ficha..."
          data-testid="input-argue-content"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={content.trim().length < 10 || mut.isPending} onClick={() => mut.mutate()} data-testid="button-confirm-argue">
            {mut.isPending ? "Enviando..." : "Enviar argumento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
