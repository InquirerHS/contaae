import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Pencil, Check, BookOpenText, Upload, ImageOff } from "lucide-react";
import { apiRequest, getAuthToken } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar } from "@/components/avatar";
import { StoryCard } from "@/components/story-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import type { StoryWithRelations, SafeUser } from "@/lib/types";

const HUE_PRESETS = [190, 276, 41, 332, 152, 220, 12, 96];

export default function Profile() {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: stories, isLoading } = useQuery<StoryWithRelations[]>({
    queryKey: ["/api/stories/mine"],
    enabled: !!user,
  });

  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio ?? "");
  const [hue, setHue] = useState(user?.avatarHue ?? 200);

  const avatarUser: Pick<SafeUser, "username" | "avatarHue" | "avatarUrl"> = {
    username: user?.username ?? "",
    avatarHue: hue,
    avatarUrl: user?.avatarUrl ?? null,
  };

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

  const avatarMut = useMutation({
    mutationFn: async (file: File) => {
      const res = await fetch(`${getApiBase()}/api/auth/me/avatar`, {
        method: "POST",
        headers: {
          "x-auth-token": getAuthToken() ?? "",
          "content-type": file.type || "image/jpeg",
        },
        body: file,
      });
      if (!res.ok) {
        const txt = await res.text();
        try {
          throw new Error(JSON.parse(txt).message || txt);
        } catch (e: any) {
          throw new Error(txt || res.statusText);
        }
      }
      return res.json();
    },
    onSuccess: async () => {
      await refresh();
      qc.invalidateQueries({ queryKey: ["/api/stories/mine"] });
      qc.invalidateQueries({ queryKey: ["/api/stories"] });
      toast({ title: "Avatar atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro no upload", description: e.message, variant: "destructive" }),
  });

  const removeAvatarMut = useMutation({
    mutationFn: async () => apiRequest("PATCH", "/api/auth/me", { avatarUrl: "" }),
    onSuccess: async () => {
      await refresh();
      toast({ title: "Avatar removido" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({ title: "Selecione uma imagem", variant: "destructive" });
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máximo de 4MB.", variant: "destructive" });
      return;
    }
    avatarMut.mutate(f);
    e.target.value = "";
  };

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
        <Avatar user={avatarUser} size="xl" />
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

      {/* avatar upload */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card/40 p-4">
        <Upload className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">Foto do avatar</p>
          <p className="text-xs text-muted-foreground">PNG, JPG ou WebP até 4MB.</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onPickFile}
          className="hidden"
          data-testid="input-avatar-file"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={avatarMut.isPending}
          className="gap-1.5"
          data-testid="button-upload-avatar"
        >
          <Upload className="h-3.5 w-3.5" />
          {avatarMut.isPending ? "Enviando..." : "Enviar foto"}
        </Button>
        {user.avatarUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeAvatarMut.mutate()}
            disabled={removeAvatarMut.isPending}
            className="gap-1.5 text-muted-foreground"
            data-testid="button-remove-avatar"
          >
            <ImageOff className="h-3.5 w-3.5" />
            Remover
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
              <Label>Cor do avatar (quando sem foto)</Label>
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

function getApiBase() {
  return "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
}
