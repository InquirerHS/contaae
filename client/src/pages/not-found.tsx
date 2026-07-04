import { Link } from "wouter";
import { Compass, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="relative mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-20 text-center">
      <Logo className="h-14 w-14 animate-float-slow" />
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <Compass className="h-3.5 w-3.5" />
        Sinal perdido na cidade
      </div>
      <h1 className="mt-4 font-display text-3xl font-bold">404</h1>
      <p className="mt-2 text-muted-foreground">
        Esta página não existe ou foi levada pela néon. Que tal voltar para a biblioteca e
        descobrir uma nova história?
      </p>
      <Link href="/" className="mt-6 inline-block">
        <Button variant="outline" className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </Button>
      </Link>
    </div>
  );
}
