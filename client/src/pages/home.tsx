import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles, Users, Shield, BookOpen } from "lucide-react";
import { CityBackdrop } from "@/components/city-backdrop";
import { StoryCard } from "@/components/story-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import type { StoryWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Home() {
  const { user } = useAuth();
  const { data: featured, isLoading } = useQuery<StoryWithRelations[]>({
    queryKey: ["/api/stories/featured"],
  });

  return (
    <div>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden border-b border-border/60">
        <CityBackdrop />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 md:py-36">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Se perca entre a realidade e a ficção neste espaço entre dimensões
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Toda história
              <br />
              encontra seu
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {" "}
                destino.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Compartilhe relatos reais, explore o Bosque Assombrado ou junte-se a outras
              pessoas para criar histórias colaborativas, um turno de cada vez — como num RPG de
              palavras.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link href="/nova-historia">
                  <Button size="lg" className="gap-2" data-testid="button-hero-create">
                    Começar a escrever
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Link href="/entrar?mode=register">
                  <Button size="lg" className="gap-2" data-testid="button-hero-join">
                    Entrar na cidade
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Link href="/biblioteca">
                <Button size="lg" variant="outline" data-testid="button-hero-explore">
                  Explorar biblioteca
                </Button>
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Maioridade legal
              </span>
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Role-play por turnos
              </span>
              <span className="inline-flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                3 modalidades
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- CATEGORIES ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="font-display text-xl font-bold">Escolha seu caminho</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Três formas de narrar. Uma única cidade para abrigar todas.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CATEGORY_ORDER.map((c) => {
            const meta = CATEGORY_META[c];
            return (
              <Link
                key={c}
                href={`/biblioteca?cat=${c}`}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-border/70 bg-card/60 p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
                  meta.catClass
                )}
                data-testid={`link-cat-${c}`}
              >
                <div className="text-3xl">{meta.emoji}</div>
                <h3 className="mt-3 font-display text-lg font-bold">{meta.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{meta.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium cat-text">
                  Ver histórias
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---------- FEATURED ---------- */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Em destaque</h2>
            <p className="mt-1 text-sm text-muted-foreground">As histórias mais curtadas da cidade.</p>
          </div>
          <Link href="/biblioteca">
            <Button variant="ghost" size="sm" className="gap-1">
              Ver todas
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : featured && featured.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
            <p className="text-muted-foreground">
              A cidade ainda está silenciosa. Seja a primeira voz a ecoar.
            </p>
            {user ? (
              <Link href="/nova-historia" className="mt-4 inline-block">
                <Button>Criar a primeira história</Button>
              </Link>
            ) : (
              <Link href="/entrar?mode=register" className="mt-4 inline-block">
                <Button>Criar conta e começar</Button>
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
