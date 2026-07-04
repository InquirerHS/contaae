import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Mail, Lock, User, Calendar, ShieldCheck, AlertCircle } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { CityBackdrop } from "@/components/city-backdrop";

export default function Auth() {
  const initialMode = useMemo(() => {
    const hash = window.location.hash;
    return hash.includes("mode=register") ? "register" : "login";
  }, []);
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    birthDate: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "register") {
      if (form.username.trim().length < 3)
        return setError("Nome de usuário precisa de ao menos 3 caracteres.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        return setError("Informe um e-mail válido.");
      if (form.password.length < 6)
        return setError("A senha precisa de ao menos 6 caracteres.");
      if (!form.birthDate) return setError("Informe sua data de nascimento.");
      const birth = new Date(form.birthDate);
      const age = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 18)
        return setError("Você precisa ter 18 anos ou mais para participar da NeoArcana.");
    }

    setPending(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        toast({ title: "Bem-vindo de volta", description: "Login realizado com sucesso." });
      } else {
        await register({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          birthDate: form.birthDate,
        });
        toast({ title: "Conta criada", description: "Bem-vindo à NeoArcana." });
      }
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Algo deu errado. Tente novamente.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden">
      <CityBackdrop />
      <div className="relative mx-auto flex max-w-md flex-col items-center px-4 py-12 sm:py-16">
        <Logo className="h-12 w-12 animate-float-slow" />
        <h1 className="mt-4 font-display text-2xl font-bold">
          {mode === "register" ? "Crie sua conta" : "Entrar na NeoArcana"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {mode === "register"
            ? "Junte-se à cidade onde histórias ganham vida."
            : "Bem-vindo de volta, narrador."}
        </p>

        {/* mode tabs */}
        <div className="mt-6 grid w-full grid-cols-2 gap-1 rounded-lg bg-muted/60 p-1">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`rounded-md py-2 text-sm font-medium transition-colors ${
                mode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${m}`}
            >
              {m === "login" ? "Entrar" : "Cadastrar"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 w-full space-y-4">
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="username">Nome de usuário</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => set("username", e.target.value)}
                  placeholder="narrador_noturno"
                  className="pl-9"
                  data-testid="input-username"
                  autoComplete="username"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="voce@exemplo.com"
                className="pl-9"
                data-testid="input-email"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="••••••••"
                className="pl-9"
                data-testid="input-password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>
          </div>

          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Data de nascimento</Label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => set("birthDate", e.target.value)}
                  className="pl-9"
                  data-testid="input-birthdate"
                />
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                A NeoArcana é um espaço para maiores de 18 anos.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={pending}
            data-testid="button-submit-auth"
          >
            {pending
              ? "Processando..."
              : mode === "login"
                ? "Entrar"
                : "Criar conta"}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          {mode === "login" ? (
            <>
              Ainda não tem conta?{" "}
              <button
                onClick={() => setMode("register")}
                className="font-medium text-primary hover:underline"
              >
                Cadastre-se
              </button>
            </>
          ) : (
            <>
              Já tem uma conta?{" "}
              <button
                onClick={() => setMode("login")}
                className="font-medium text-primary hover:underline"
              >
                Entrar
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
