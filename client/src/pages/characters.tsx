import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IdCard, Plus, Pencil, Trash2, X, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Character } from "@/lib/types";

const MAX_CHARACTERS = 2;

export default function Characters() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Character | "new" | null>(null);
  const [deleting, setDeleting] = useState<Character | null>(null);

  const { data: characters = [], isLoading } = useQuery<Character[]>({
    queryKey: ["/api/characters"],
    enabled: !!user,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/characters");
      return res.json();
    },
  });

  const createMut = useMutation({
    mutationFn: async (data: { name: string; concept: string }) => {
      const res = await apiRequest("POST", "/api/characters", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Ficha criada" });
      qc.invalidateQueries({ queryKey: ["/api/characters"] });
      setEditing(null);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; concept: string } }) => {
      const res = await apiRequest("PATCH", `/api/characters/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Ficha atualizada" });
      qc.invalidateQueries({ queryKey: ["/api/characters"] });
      setEditing(null);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/characters/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Ficha apagada" });
      qc.invalidateQueries({ queryKey: ["/api/characters"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <p className="text-muted-foreground">Entre na sua conta para gerenciar suas fichas.</p>
      </div>
    );
  }

  const slotsLeft = MAX_CHARACTERS - characters.length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2">
        <IdCard className="h-5 w-5 text-primary" />
        <h1 className="font-display text-xl font-bold">Minhas fichas</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Personagens reutilizáveis em quests da Taverna. Você pode ter até {MAX_CHARACTERS} fichas. Se uma não encaixar
        em um quest, apague e crie outra.
      </p>

      {isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {characters.map((c) => (
            <div
              key={c.id}
              className="flex flex-col rounded-xl border border-border/70 bg-card/70 p-5 transition-colors hover:border-primary/40"
              data-testid={`card-character-${c.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-foreground">{c.name}</h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditing(c)}
                    aria-label="Editar ficha"
                    data-testid={`button-edit-character-${c.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleting(c)}
                    aria-label="Apagar ficha"
                    data-testid={`button-delete-character-${c.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm text-muted-foreground">{c.concept}</p>
            </div>
          ))}

          {slotsLeft > 0 && (
            <button
              onClick={() => setEditing("new")}
              className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-card/30 p-5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              data-testid="button-new-character"
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">Criar nova ficha</span>
              <span className="text-xs">{slotsLeft} {slotsLeft === 1 ? "vaga restante" : "vagas restantes"}</span>
            </button>
          )}
        </div>
      )}

      {characters.length === 0 && !isLoading && slotsLeft === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
          <p className="text-muted-foreground">Você atingiu o limite de fichas.</p>
        </div>
      )}

      {editing && (
        <CharacterDialog
          character={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSubmit={(data) => {
            if (editing === "new") createMut.mutate(data);
            else updateMut.mutate({ id: editing.id, data });
          }}
          submitting={createMut.isPending || updateMut.isPending}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar ficha?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  A ficha <strong>{deleting.name}</strong> será removida permanentemente. Se ela estiver em uso em
                  algum quest, será necessário criar uma nova para entrar.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
              data-testid="button-confirm-delete-character"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CharacterDialog({
  character,
  onClose,
  onSubmit,
  submitting,
}: {
  character: Character | null;
  onClose: () => void;
  onSubmit: (data: { name: string; concept: string }) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(character?.name ?? "");
  const [concept, setConcept] = useState(character?.concept ?? "");

  const valid = name.trim().length >= 2 && concept.trim().length >= 10;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {character ? "Editar ficha" : "Nova ficha"}
          </DialogTitle>
          <DialogDescription>
            Descreva como seu personagem se comporta, sua história e personalidade. Quanto mais rico, melhor o GM e os
            outros jogadores poderão interagir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="char-name">Nome do personagem</Label>
            <Input
              id="char-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Kael, o andarilho neon"
              maxLength={60}
              data-testid="input-character-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="char-concept">Conceito e comportamento</Label>
            <Textarea
              id="char-concept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Personalidade, histórico, maneirismos, motivações..."
              rows={7}
              maxLength={2000}
              data-testid="input-character-concept"
            />
            <p className="text-right text-xs text-muted-foreground">{concept.length}/2000</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="mr-1.5 h-4 w-4" /> Cancelar
          </Button>
          <Button
            disabled={!valid || submitting}
            onClick={() => onSubmit({ name: name.trim(), concept: concept.trim() })}
            data-testid="button-save-character"
          >
            {character ? "Salvar alterações" : "Criar ficha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
