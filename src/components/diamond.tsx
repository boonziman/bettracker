import { cn } from "@/lib/utils";

export function Diamond({
  onFirst,
  onSecond,
  onThird,
  className,
}: {
  onFirst?: boolean;
  onSecond?: boolean;
  onThird?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative size-12 shrink-0", className)} aria-hidden>
      <Base className="top-0 left-1/2 -translate-x-1/2" on={onSecond} />
      <Base className="top-1/2 right-0 -translate-y-1/2" on={onFirst} />
      <Base className="top-1/2 left-0 -translate-y-1/2" on={onThird} />
      <Base className="bottom-0 left-1/2 -translate-x-1/2 bg-faint" />
    </div>
  );
}

function Base({ className, on }: { className?: string; on?: boolean }) {
  return (
    <span
      className={cn(
        "absolute size-3 rotate-45 border-2 border-faint",
        on && "border-threat bg-threat",
        className,
      )}
    />
  );
}

export function CountDots({
  label,
  filled,
  total,
  tone,
}: {
  label: string;
  filled: number;
  total: number;
  tone: "b" | "s" | "o";
}) {
  const fill =
    tone === "b" ? "bg-lean border-lean" : tone === "s" ? "bg-lose border-lose" : "bg-threat border-threat";
  return (
    <div className="flex items-center justify-end gap-1">
      <span className="w-3 text-2xs text-subtle">{label}</span>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-pill border border-faint",
            i < filled && fill,
          )}
        />
      ))}
    </div>
  );
}
