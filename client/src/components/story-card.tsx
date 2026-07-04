import { Link } from "wouter";
import { Heart, MessageCircle, BookOpen, Users } from "lucide-react";
import type { StoryWithRelations } from "@/lib/types";
import { CATEGORY_META, parseTags, timeAgo } from "@/lib/format";
import { Avatar } from "./avatar";
import { cn } from "@/lib/utils";

export function StoryCard({ story }: { story: StoryWithRelations }) {
  const meta = CATEGORY_META[story.category];
  const tags = parseTags(story.tags).slice(0, 3);

  return (
    <Link
      href={`/historia/${story.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card/70 p-5 transition-all",
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
          <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
            +18
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
            <span
              key={t}
              className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Avatar user={story.author} size="sm" />
          <span className="font-medium text-foreground/80">{story.author.username}</span>
        </div>
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
      </div>
    </Link>
  );
}
