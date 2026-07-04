import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  total,
  myRating,
  onRate,
  onClear,
  readOnly,
  size = "sm",
}: {
  value: number | null;
  total?: number;
  myRating?: number | null;
  onRate?: (score: number) => void;
  onClear?: () => void;
  readOnly?: boolean;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const active = myRating ?? Math.round(value ?? 0);
  return (
    <div className="flex items-center gap-1" data-testid="star-rating">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onRate?.(s)}
            className={cn(
              "transition-transform",
              !readOnly && "hover:scale-110 cursor-pointer",
              readOnly && "cursor-default"
            )}
            aria-label={`${s} estrela${s > 1 ? "s" : ""}`}
            data-testid={`star-${s}`}
          >
            <Star
              className={cn(
                dim,
                s <= active
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground/40"
              )}
            />
          </button>
        ))}
      </div>
      {value !== null && total !== undefined && (
        <span className="text-xs text-muted-foreground" data-testid="text-rating-summary">
          {value.toFixed(1)} ({total})
        </span>
      )}
      {!readOnly && myRating && onClear && (
        <button
          onClick={onClear}
          className="ml-1 text-xs text-muted-foreground hover:text-foreground underline"
          data-testid="button-clear-rating"
        >
          limpar
        </button>
      )}
    </div>
  );
}
