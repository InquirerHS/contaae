import { Link } from "wouter";
import { Heart, MessageCircle, BookOpen, Users, Star, Sparkles } from "lucide-react";
import type { StoryWithRelations } from "@/lib/types";
import { CATEGORY_META, parseTags, timeAgo } from "@/lib/format";
import { Avatar } from "./avatar";
import { cn } from "@/lib/utils";

function goTo(path: string) {
  window.location.hash = path;
}

export function StoryCard({ story }: { story: StoryWithRelations }) {
  const meta = CATEGORY_META[story.category];
  const tags = parseTags(story.tags).slice(0, 3);

  return (
    <div
      onClick={() => goTo(`/historia/${story.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") goTo(`/historia/${story.id}`);
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border/70 bg-card/70 p-5 transition-all",
        "hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5",
        meta.catClass
      )}
      data-testid={`card-story-${story.id}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold cat-ring cat-text",
            meta.catClass
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full cat-dot", meta.catClass)} />
          {meta.short}
        </span>
        {story.isMature && (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            <span className="h-1 w-1 rounded-full bg-amber-500" />
            Sensível
          </span>
        )}
      </div>

      <h3 className="font-display text-lg font-bold leading-snug text-foreground group-hover:text-primary">
        {story.title}
      </h3>
      <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{story.synopsis}</p>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goTo(`/biblioteca?tag=${encodeURIComponent(t)}`);
              }}
              className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
              data-testid={`tag-${t}`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-muted-foreground">
        <Link
          href={`/u/${story.author.username}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 hover:opacity-80"
        >
          <Avatar user={story.author} size="sm" />
          <span className="font-medium text-foreground/80">{story.author.username}</span>
        </Link>
        <span>{timeAgo(story.updatedAt)}</span>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          {story.category === "roleplay" ? (
            <Users className="h-3.5 w-3.5" />
          ) : (
            <BookOpen className="h-3.5 w-3.5" />
          )}
          {story.partCount} {story.partCount === 1 ? "trecho" : "trechos"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Heart className={cn("h-3.5 w-3.5", story.likedByMe && "fill-destructive text-destructive")} />
          {story.likeCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" />
          {story.commentCount}
        </span>
        {story.aiEnabled && (
          <span
            className="inline-flex items-center gap-1 text-violet-500 dark:text-violet-400"
            title="IA habilitada nesta história"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
        )}
        {story.ratingTotal > 0 && (
          <span className="ml-auto inline-flex items-center gap-1" data-testid={`text-rating-card-${story.id}`}>
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {story.ratingAvg!.toFixed(1)}
            <span className="text-muted-foreground">({story.ratingTotal})</span>
          </span>
        )}
      </div>
    </div>
  );
}
