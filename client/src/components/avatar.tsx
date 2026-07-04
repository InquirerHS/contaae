import { avatarGradient, initials } from "@/lib/format";
import type { SafeUser } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AvatarProps {
  user: Pick<SafeUser, "username" | "avatarHue">;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-20 w-20 text-xl",
};

export function Avatar({ user, size = "md", className }: AvatarProps) {
  const hue = user.avatarHue ?? 200;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white ring-2 ring-background/60",
        sizes[size],
        className
      )}
      style={{ backgroundImage: avatarGradient(hue) }}
      aria-label={`Avatar de ${user.username}`}
    >
      {initials(user.username)}
    </span>
  );
}
