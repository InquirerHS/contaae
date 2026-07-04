import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Pencil, Check, BookOpenText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar } from "@/components/avatar";
import { StoryCard } from "@/components/story-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import type { StoryWithRelations } from "@/lib/types";

const HUE_PRESETS = [190, 276, 41, 332, 152, 220, 12, 96];

export default function Profile() {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: stories, isLoading } = useQuery<StoryWithRelations[]>({
    queryKey: ["/api/stories/mine"],
    enabled: !!user,
  });

  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio ?? "");
  const [hue, setHue] = useState(user?.avatarHue ?? 200);

  const updateMut = useMutation({
    mutationFn: async () => apiRequest("PATCH", "/api/auth/me", { bio, avatarHue: hue }),
    onSuccess: async () => {
      await refresh();
      qc.invalidateQueries({ queryKey: ["/api/stories/mine"] });
      setEditing(false);
      toast({ title: "Perfil atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Você não está logado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Entre para ver e editar seu perfil.</p>
        <Link href="/entrar" className="mt-4 inline-block">
          <Button>Entrar</Button>
        </Link>
      </div>
    );
  }

  // keep local state synced if user loads late
  if (!editing && bio === "" && user.bio) setBio(user.bio);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* header */}
      <div className="flex flex-col items-start gap-4 rounded-xl border border-border/70 bg-card/60 p-6 sm:flex-row sm:items-center">
        <Avatar user={{ username: user.username, avatarHue: hue }} size="xl" />
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold">{user.username}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            Na cidade desde {formatDate(user.createdAt)}
          </p>
          {!editing && user.bio && (
            <p className="mt-3 text-sm text-foreground/80">{user.bio}</p>
          )}
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        )}
      </div>

      {/* edit form */}
      {editing && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Conte um pouco sobre você..."
                rows={3}
                maxLength={300}
              />
            </div>
            <div className="space-y-2">
              <Label>Cor do avatar</Label>
              <div className="flex flex-wrap gap-2">
                {HUE_PRESETS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHue(h)}
                    className={`h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all ${
                      hue === h ? "ring-primary scale-110" : "ring-transparent"
                    }`}
                    style={{ background: `hsl(${h} 80% 55%)` }}
                    aria-label={`Cor ${h}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending} className="gap-1.5">
                <Check className="h-4 w-4" />
                Salvar
              </Button>
              <Button variant="ghost" onClick={() => { setEditing(false); setBio(user.bio ?? ""); setHue(user.avatarHue ?? 200); }}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* my stories */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-bold">Minhas histórias</h2>
        {isLoading ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : stories && stories.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {stories.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
            <BookOpenText className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Você ainda não publicou histórias.</p>
            <Link href="/nova-historia" className="mt-3 inline-block">
              <Button size="sm">Criar primeira história</Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
