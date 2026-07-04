import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Library as LibraryIcon, Filter } from "lucide-react";
import { StoryCard } from "@/components/story-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/format";
import type { StoryCategory, StoryWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | StoryCategory;

function readCatParam(): Filter {
  const hash = window.location.hash;
  const match = hash.match(/[?&]cat=(real|creepy|roleplay)/);
  return (match?.[1] as Filter) ?? "all";
}

export default function Library() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setFilter(readCatParam());
  }, []);

  const { data, isLoading } = useQuery<StoryWithRelations[]>({
    queryKey: ["/api/stories"],
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((s) => {
      const matchCat = filter === "all" || s.category === filter;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.synopsis.toLowerCase().includes(q) ||
        s.author.username.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [data, filter, search]);

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "Todas" },
    ...CATEGORY_ORDER.map((c) => ({ key: c as Filter, label: CATEGORY_META[c].short })),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2">
        <LibraryIcon className="h-5 w-5 text-primary" />
        <h1 className="font-display text-xl font-bold">Biblioteca</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Explore todas as histórias da cidade, por modalidade ou busca livre.
      </p>

      {/* search */}
      <div className="relative mt-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, sinopse ou autor..."
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

      {/* grid */}
      {isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <StoryCard key={s.id} story={s} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
          <p className="text-muted-foreground">
            {search ? "Nenhuma história encontrada para essa busca." : "Ainda não há histórias aqui."}
          </p>
        </div>
      )}
    </div>
  );
}
