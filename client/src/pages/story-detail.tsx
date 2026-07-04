import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  MessageCircle,
  Users,
  BookOpen,
  ArrowLeft,
  Send,
  Lock,
  PenLine,
  CalendarDays,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_META,
  parseTags,
  timeAgo,
  formatDate,
} from "@/lib/format";
import type {
  StoryWithRelations,
  PartWithAuthor,
  CommentWithAuthor,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export default function StoryDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [partText, setPartText] = useState("");
  const [commentText, setCommentText] = useState("");

  const storyQ = useQuery<StoryWithRelations>({
    queryKey: ["/api/stories", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stories/${id}`);
      return res.json();
    },
  });

  const partsQ = useQuery<PartWithAuthor[]>({
    queryKey: ["/api/stories", id, "parts"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stories/${id}/parts`);
      return res.json();
    },
  });

  const commentsQ = useQuery<CommentWithAuthor[]>({
    queryKey: ["/api/stories", id, "comments"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stories/${id}/comments`);
      return res.json();
    },
  });

  const canContributeQ = useQuery<{ allowed: boolean; reason?: string }>({
    queryKey: ["/api/stories", id, "can-contribute"],
    enabled: !!user,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stories/${id}/can-contribute`);
      return res.json();
    },
  });

  const likeMut = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/stories/${id}/like`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/stories", id] });
      qc.invalidateQueries({ queryKey: ["/api/stories/featured"] });
      qc.invalidateQueries({ queryKey: ["/api/stories"] });
    },
  });

  const partMut = useMutation({
    mutationFn: async (content: string) =>
      apiRequest("POST", `/api/stories/${id}/parts`, { content }),
    onSuccess: () => {
      setPartText("");
      qc.invalidateQueries({ queryKey: ["/api/stories", id, "parts"] });
      qc.invalidateQueries({ queryKey: ["/api/stories", id] });
      qc.invalidateQueries({ queryKey: ["/api/stories", id, "can-contribute"] });
      toast({ title: "Trecho publicado", description: "Sua contribuição entrou na história." });
    },
    onError: (e: any) => toast({ title: "Não foi possível publicar", description: e.message, variant: "destructive" }),
  });

  const commentMut = useMutation({
    mutationFn: async (content: string) =>
      apiRequest("POST", `/api/stories/${id}/comments`, { content }),
    onSuccess: () => {
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["/api/stories", id, "comments"] });
      qc.invalidateQueries({ queryKey: ["/api/stories", id] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (storyQ.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-4 h-4 w-1/3" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  if (!storyQ.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">História não encontrada</h1>
        <p className="mt-2 text-muted-foreground">
          Talvez ela tenha sido apagada ou nunca existiu.
        </p>
        <Link href="/biblioteca" className="mt-4 inline-block">
          <Button variant="outline">Voltar à biblioteca</Button>
        </Link>
      </div>
    );
  }

  const story = storyQ.data;
  const meta = CATEGORY_META[story.category];
  const tags = parseTags(story.tags);
  const isRoleplay = story.category === "roleplay";
  const isOwner = user?.id === story.authorId;
  const canContribute = canContributeQ.data;
  const showContribute = !!user && !!canContribute?.allowed;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/biblioteca"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Biblioteca
      </Link>

      {/* header */}
      <header className={cn("mt-4 rounded-xl border border-border/70 bg-card/60 p-6", meta.catClass)}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold cat-ring cat-text", meta.catClass)}>
            <span className={cn("h-1.5 w-1.5 rounded-full cat-dot", meta.catClass)} />
            {meta.label}
          </span>
          {story.isMature && (
            <Badge variant="destructive" className="text-[10px]">+18</Badge>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span className={cn("h-1.5 w-1.5 rounded-full", story.status === "completed" ? "bg-muted-foreground" : "bg-primary animate-pulse-glow")} />
            {story.status === "open" ? "Aberta" : story.status === "ongoing" ? "Em andamento" : "Concluída"}
          </span>
        </div>

        <h1 className="mt-3 font-display text-2xl font-bold leading-tight sm:text-3xl">
          {story.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{story.synopsis}</p>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <div className="flex items-center gap-2">
            <Avatar user={story.author} size="md" />
            <div>
              <p className="text-sm font-medium">{story.author.username}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {formatDate(story.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={story.likedByMe ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (!user) {
                  toast({ title: "Faça login para curtir", variant: "destructive" });
                  return;
                }
                likeMut.mutate();
              }}
              className="gap-1.5"
              data-testid="button-like"
            >
              <Heart className={cn("h-4 w-4", story.likedByMe && "fill-current")} />
              {story.likeCount}
            </Button>
            <span className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2.5 py-1.5 text-xs text-muted-foreground">
              <MessageCircle className="h-3.5 w-3.5" />
              {story.commentCount}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2.5 py-1.5 text-xs text-muted-foreground">
              {isRoleplay ? <Users className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
              {story.partCount} {story.partCount === 1 ? "trecho" : "trechos"}
            </span>
          </div>
        </div>
      </header>

      {/* parts / reading */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-bold">
          {isRoleplay ? "A narrativa em construção" : "A história"}
        </h2>

        {partsQ.isLoading ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : partsQ.data && partsQ.data.length > 0 ? (
          <div className="mt-4 space-y-5">
            {partsQ.data.map((part, idx) => (
              <article
                key={part.id}
                className="relative rounded-xl border border-border/60 bg-card/40 p-5"
                data-testid={`part-${part.id}`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 font-display text-xs font-bold text-primary">
                      {idx + 1}
                    </span>
                    <Avatar user={part.author} size="sm" />
                    <span className="text-sm font-medium">{part.author.username}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(part.createdAt)}</span>
                </div>
                <div className="prose-arcane whitespace-pre-wrap text-foreground/90">
                  {part.content}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-card/40 p-8 text-center text-muted-foreground">
            {isRoleplay
              ? "A história aguarda o primeiro narrador."
              : "Esta história ainda não tem conteúdo."}
          </div>
        )}
      </section>

      {/* contribute / add chapter */}
      <section className="mt-8">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-bold">
              {isRoleplay ? "Continuar a história" : "Adicionar capítulo"}
            </h2>
          </div>
          {!user ? (
            <p className="mt-2 text-sm text-muted-foreground">
              <Link href="/entrar" className="font-medium text-primary hover:underline">
                Entre na sua conta
              </Link>{" "}
              {isRoleplay ? "para contribuir com a narrativa colaborativa." : "para escrever."}
            </p>
          ) : showContribute ? (
            <div className="mt-3 space-y-3">
              <Textarea
                value={partText}
                onChange={(e) => setPartText(e.target.value)}
                placeholder={
                  isRoleplay
                    ? "Escreva o próximo trecho da história... (mín. 20 caracteres)"
                    : "Escreva o conteúdo deste capítulo... (mín. 20 caracteres)"
                }
                rows={5}
                data-testid="textarea-part"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {partText.length}/6000{" "}
                  {isRoleplay ? "· você não pode escrever duas vezes seguidas." : "· novo capítulo da sua história."}
                </span>
                <Button
                  onClick={() => partMut.mutate(partText)}
                  disabled={!partText || partText.length < 20 || partMut.isPending}
                  className="gap-1.5"
                  data-testid="button-submit-part"
                >
                  <Send className="h-4 w-4" />
                  {isRoleplay ? "Publicar trecho" : "Publicar capítulo"}
                </Button>
              </div>
            </div>
          ) : canContribute ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              {canContribute.reason}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
          )}
        </div>
      </section>

      {/* comments */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-bold">
          Comentários{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({commentsQ.data?.length ?? 0})
          </span>
        </h2>

        {user ? (
          <div className="mt-3 flex gap-3">
            <Avatar user={user} size="md" />
            <div className="flex-1 space-y-2">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Comente algo sobre essa história..."
                rows={2}
                data-testid="textarea-comment"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => commentMut.mutate(commentText)}
                  disabled={!commentText.trim() || commentMut.isPending}
                  className="gap-1.5"
                  data-testid="button-submit-comment"
                >
                  <Send className="h-3.5 w-3.5" />
                  Comentar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            <Link href="/entrar" className="font-medium text-primary hover:underline">
              Faça login
            </Link>{" "}
            para comentar.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {commentsQ.data?.map((c) => (
            <div
              key={c.id}
              className="flex gap-3 rounded-lg border border-border/50 bg-card/30 p-3"
              data-testid={`comment-${c.id}`}
            >
              <Avatar user={c.author} size="sm" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.author.username}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-sm text-foreground/90 whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          ))}
        </div>

        {isOwner && <DeleteStoryBlock id={id} />}
      </section>
    </div>
  );
}

function DeleteStoryBlock({ id }: { id: number }) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const remove = async () => {
    setPending(true);
    try {
      await apiRequest("DELETE", `/api/stories/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stories/featured"] });
      window.location.hash = "#/biblioteca";
      toast({ title: "História excluída" });
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    } finally {
      setPending(false);
      setConfirming(false);
    }
  };

  return (
    <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm text-muted-foreground">
        Você é o autor desta história. Excluí-la removerá todos os trechos, curtidas e
        comentários permanentemente.
      </p>
      {confirming ? (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm font-medium text-destructive">Confirmar exclusão definitiva?</span>
          <Button variant="destructive" size="sm" onClick={remove} disabled={pending} data-testid="button-confirm-delete">
            {pending ? "Excluindo..." : "Sim, excluir"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          variant="destructive"
          size="sm"
          className="mt-3"
          onClick={() => setConfirming(true)}
          data-testid="button-delete-story"
        >
          Excluir história
        </Button>
      )}
    </div>
  );
}
