import { Link } from "wouter";
import { Logo } from "./logo";
import { CATEGORY_ORDER, CATEGORY_META } from "@/lib/format";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border/60 bg-background/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-7 w-7" />
            <span className="font-display text-base font-bold">
              Conta<span className="text-primary">Aê</span>
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Uma cidade futurista onde o tecnológico e o mágico convivem — e onde toda história
            encontra quem queira contá-la.
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">Modalidades</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {CATEGORY_ORDER.map((c) => (
              <li key={c}>
                <Link
                  href={`/biblioteca?cat=${c}`}
                  className="hover:text-primary transition-colors"
                >
                  {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">Navegar</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/biblioteca" className="hover:text-primary transition-colors">
                Biblioteca
              </Link>
            </li>
            <li>
              <Link href="/nova-historia" className="hover:text-primary transition-colors">
                Criar história
              </Link>
            </li>
            <li>
              <Link href="/entrar" className="hover:text-primary transition-colors">
                Entrar / Cadastrar
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-foreground/60">
        © {new Date().getFullYear()} ContaAê — não aceitamos cadastro de menores de idade em razão da legislação vigente.
      </div>
    </footer>
  );
}
