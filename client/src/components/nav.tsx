import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Library, Home, LogOut, User as UserIcon, Menu, X, Bell, Shield, ScrollText, IdCard, Ghost } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Avatar } from "./avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Início", icon: Home },
  { href: "/biblioteca", label: "Biblioteca", icon: Library },
  { href: "/bosque", label: "Bosque", icon: Ghost },
  { href: "/taverna", label: "Taverna", icon: ScrollText },
];

export function Nav() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: unread } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread"],
    enabled: !!user,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications/unread");
      return res.json();
    },
    refetchInterval: 30000,
  });
  const unreadCount = unread?.count ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          data-testid="link-home"
        >
          <Logo className="h-8 w-8 animate-float-slow" />
          <span className="font-display text-lg font-bold tracking-tight">
            Conta<span className="text-primary text-glow-cyan">Aê</span>
          </span>
        </Link>

        {/* desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => {
            const active = location === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
                data-testid={`link-${l.label.toLowerCase()}`}
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
          {user && (
            <Link href="/nova-historia">
              <Button size="sm" className="ml-2 gap-1.5" data-testid="link-new-story">
                <Plus className="h-4 w-4" />
                Nova história
              </Button>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />

          {user && (
            <Link
              href="/moderacao"
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground md:inline-flex"
              aria-label="Moderação"
              data-testid="link-moderation"
            >
              <Shield className="h-4 w-4" />
            </Link>
          )}

          {user && (
            <Link
              href="/notificacoes"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              aria-label="Notificações"
              data-testid="link-notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
                  data-testid="badge-unread"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/perfil"
                className="flex items-center gap-2 rounded-full border border-border/70 py-1 pl-1 pr-3 transition-colors hover:border-primary/40"
                data-testid="link-profile"
              >
                <Avatar user={user} size="sm" />
                <span className="text-sm font-medium">{user.username}</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                aria-label="Sair"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/entrar">
                <Button variant="ghost" size="sm" data-testid="link-login">
                  Entrar
                </Button>
              </Link>
              <Link href="/entrar?mode=register">
                <Button size="sm" data-testid="link-register">
                  Criar conta
                </Button>
              </Link>
            </div>
          )}

          {/* mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-border/60 bg-background/95 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href="/fichas"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                >
                  <IdCard className="h-4 w-4" />
                  Minhas fichas
                </Link>
                <Link
                  href="/nova-historia"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/60"
                >
                  <Plus className="h-4 w-4" />
                  Nova história
                </Link>
                <Link
                  href="/notificacoes"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/60"
                >
                  <Bell className="h-4 w-4" />
                  Notificações
                  {unreadCount > 0 && (
                    <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/moderacao"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/60"
                >
                  <Shield className="h-4 w-4" />
                  Moderação
                </Link>
                <Link
                  href="/perfil"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/60"
                >
                  <UserIcon className="h-4 w-4" />
                  Meu perfil
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-muted/60"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </>
            ) : (
              <div className="mt-2 flex gap-2">
                <Link href="/entrar" onClick={() => setMobileOpen(false)} className="flex-1">
                  <Button variant="outline" className="w-full" size="sm">
                    Entrar
                  </Button>
                </Link>
                <Link
                  href="/entrar?mode=register"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1"
                >
                  <Button className="w-full" size="sm">
                    Criar conta
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
