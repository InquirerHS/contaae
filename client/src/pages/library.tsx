import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Library as LibraryIcon, Filter, ChevronLeft, ChevronRight, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { StoryCard } from "@/components/story-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/format";
import type { StoryCategory, PaginatedStories } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | StoryCategory;

function readParam(name: string): string | null {
  const hash = window.location.hash;
  const match = hash.match(new RegExp(`[?&]${name}=([^&]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function Library() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tag, setTag] = useState<string | null>(null);
  const [authorId, setAuthorId] = useState<number | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);

  useEffect(() => {
    setFilter((readParam("cat") as Filter) ?? "all");
    setTag(readParam("tag"));
    const aId = readParam("authorId");
    setAuthorId(aId ? Number(aId) : null);
    setAuthorName(readParam("author"));
    setPage(1);
  }, []);

  // debounced-ish search: reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filter, search, tag, authorId]);

  const queryParams = new URLSearchParams();
  if (filter !== "all") queryParams.set("cat", filter);
  if (search.trim()) queryParams.set("search", search.trim());
  if (tag) queryParams.set("tag", tag);
  if (authorId) queryParams.set("authorId", String(authorId));
  queryParams.set("page", String(page));

  const { data, isLoading } = useQuery<PaginatedStories>({
    queryKey: ["/api/stories", filter, search.trim(), tag, authorId, page],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stories?${queryParams.toString()}`);
      return res.json();
    },
  });

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "Todas" },
    ...CATEGORY_ORDER.map((c) => ({ key: c as Filter, label: CATEGORY_META[c].short })),
  ];

  const clearFilters = () => {
    setFilter("all");
    setSearch("");
    setTag(null);
    setAuthorId(null);
    setAuthorName(null);
    setPage(1);
    window.location.hash = "#/biblioteca";
  };

  const hasActiveFilter = filter !== "all" || search.trim() || tag || authorId;
  const stories = data?.items ?? [];
  const pages = data?.pages ?? 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2">
        <LibraryIcon className="h-5 w-5 text-primary" />
        <h1 className="font-display text-xl font-bold">Biblioteca</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Explore todas as histórias da cidade, por modalidade, tag ou busca livre.
      </p>

      {/* search */}
      <div className="relative mt-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, sinopse ou tag..."
          className="pl-9"
          data-testid="input-search"
        />
      </div>

      {/* filter tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              filter === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            data-testid={`filter-${t.key}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* active filter chips */}
      {hasActiveFilter && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {tag && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
              #{tag}
              <button onClick={() => setTag(null)} aria-label="Remover tag" data-testid="chip-clear-tag">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {authorId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
              Autor: {authorName ?? authorId}
              <button onClick={() => setAuthorId(null)} aria-label="Remover autor" data-testid="chip-clear-author">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline">
            Limpar tudo
          </button>
        </div>
      )}

      {/* grid */}
      {isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : stories.length > 0 ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>

          {/* pagination */}
          {pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="gap-1"
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="px-3 text-sm text-muted-foreground" data-testid="text-page-info">
                Página {page} de {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="gap-1"
                data-testid="button-next-page"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
          <p className="text-muted-foreground">
            {hasActiveFilter
              ? "Nenhuma história encontrada para esses filtros."
              : "Ainda não há histórias aqui."}
          </p>
        </div>
      )}
    </div>
  );
}
