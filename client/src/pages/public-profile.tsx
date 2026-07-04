import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ArrowLeft, BookOpenText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Avatar } from "@/components/avatar";
import { StoryCard } from "@/components/story-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import type { SafeUser, StoryWithRelations } from "@/lib/types";

export default function PublicProfile({ params }: { params: { username: string } }) {
  const username = decodeURIComponent(params.username);

  const { data, isLoading, isError } = useQuery<{ user: SafeUser; stories: StoryWithRelations[] }>({
    queryKey: ["/api/users", username],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users/${encodeURIComponent(username)}`);
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Perfil não encontrado</h1>
        <p className="mt-2 text-muted-foreground">Este narrador não existe na cidade.</p>
        <Link href="/biblioteca" className="mt-4 inline-block">
          <Button variant="outline">Voltar à biblioteca</Button>
        </Link>
      </div>
    );
  }

  const { user, stories } = data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/biblioteca"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Biblioteca
      </Link>

      <div className="mt-4 flex flex-col items-start gap-4 rounded-xl border border-border/70 bg-card/60 p-6 sm:flex-row sm:items-center">
        <Avatar user={user} size="xl" />
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold" data-testid="text-profile-username">
            {user.username}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            Na cidade desde {formatDate(user.createdAt)}
          </p>
          {user.bio ? (
            <p className="mt-3 text-sm text-foreground/80">{user.bio}</p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground italic">Sem bio ainda.</p>
          )}
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-2 text-center">
          <p className="font-display text-2xl font-bold text-primary" data-testid="text-story-count">
            {stories.length}
          </p>
          <p className="text-xs text-muted-foreground">história(s)</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold">Histórias publicadas</h2>
        {stories.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {stories.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
            <BookOpenText className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Este narrador ainda não publicou histórias.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
