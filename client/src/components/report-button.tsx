import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ReportTarget } from "@/lib/types";

const REASONS = [
  "Conteúdo ofensivo ou desrespeitoso",
  "Linguagem imprópria para a comunidade",
  "Spam ou conteúdo repetitivo",
  "Desrespeito às regras de convívio",
  "Outro motivo",
];

export function ReportButton({
  targetType,
  targetId,
  storyId,
  size = "icon",
  variant = "ghost",
  label,
}: {
  targetType: ReportTarget;
  targetId: number;
  storyId: number;
  size?: "icon" | "sm";
  variant?: "ghost" | "outline";
  label?: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState("");

  const mut = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/reports", {
        targetType,
        targetId,
        reason: detail ? `${reason} — ${detail}` : reason,
      }),
    onSuccess: () => {
      setOpen(false);
      setDetail("");
      qc.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Denúncia enviada", description: "A moderação irá analisar." });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className="gap-1 text-muted-foreground"
          aria-label="Denunciar"
          data-testid={`button-report-${targetType}-${targetId}`}
        >
          <Flag className="h-3.5 w-3.5" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Denunciar conteúdo</DialogTitle>
          <DialogDescription>
            Ajude a manter a cidade um lugar saudável. Descreva o problema para a moderação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            data-testid="select-report-reason"
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <Textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Detalhe o que aconteceu (opcional)..."
            rows={3}
            maxLength={500}
            data-testid="textarea-report-detail"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            data-testid="button-submit-report"
          >
            {mut.isPending ? "Enviando..." : "Enviar denúncia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
