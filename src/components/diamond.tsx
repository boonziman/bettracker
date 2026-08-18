import type { Situation } from "@/lib/espn/types";
import { cn } from "@/lib/utils";

type DiamondSize = "sm" | "md" | "lg";

const SIZE: Record<DiamondSize, string> = {
  sm: "size-12",
  md: "size-28",
  lg: "size-32 sm:size-36",
};

export function Diamond({
  onFirst,
  onSecond,
  onThird,
  size = "sm",
  className,
}: {
  onFirst?: boolean;
  onSecond?: boolean;
  onThird?: boolean;
  size?: DiamondSize;
  className?: string;
}) {
  const occupied = [onFirst && "first", onSecond && "second", onThird && "third"].filter(Boolean);
  const label = occupied.length
    ? `Runners on ${occupied.join(" and ")}`
    : "Bases empty";

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("shrink-0 text-fg", SIZE[size], className)}
      role="img"
      aria-label={label}
    >
      <polygon
        points="50,10 90,50 50,90 10,50"
        fill="color-mix(in oklab, var(--color-threat) 22%, var(--color-inset))"
      />
      <polygon
        points="50,26 74,50 50,74 26,50"
        fill="color-mix(in oklab, var(--color-win) 14%, var(--color-elevated))"
      />
      <polyline
        points="50,82 82,50 50,18 18,50 50,82"
        fill="none"
        stroke="color-mix(in oklab, var(--color-threat) 38%, var(--color-faint))"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <circle
        cx="50"
        cy="52"
        r="4.2"
        fill="color-mix(in oklab, var(--color-threat) 30%, var(--color-elevated))"
        stroke="color-mix(in oklab, var(--color-fg) 18%, transparent)"
        strokeWidth="0.7"
      />
      <BasePad cx={82} cy={50} on={onFirst} />
      <BasePad cx={50} cy={18} on={onSecond} />
      <BasePad cx={18} cy={50} on={onThird} />
      <HomePlate />
    </svg>
  );
}

function BasePad({ cx, cy, on }: { cx: number; cy: number; on?: boolean }) {
  const r = 6.4;
  return (
    <polygon
      points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
      fill={on ? "var(--color-threat)" : "var(--color-elevated)"}
      stroke={on ? "var(--color-threat)" : "var(--color-faint)"}
      strokeWidth="1.35"
      className={on ? "diamond-base-on" : undefined}
    />
  );
}

function HomePlate() {
  return (
    <polygon
      points="44,80 56,80 56,86 50,92 44,86"
      fill="var(--color-muted)"
      stroke="color-mix(in oklab, var(--color-fg) 28%, transparent)"
      strokeWidth="0.8"
    />
  );
}

export function DiamondBoard({
  sit,
  size = "lg",
}: {
  sit: Situation;
  size?: DiamondSize;
}) {
  return (
    <div className="flex items-center gap-4">
      <Diamond
        size={size}
        onFirst={sit.onFirst}
        onSecond={sit.onSecond}
        onThird={sit.onThird}
      />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="space-y-1">
          <CountDots label="B" filled={sit.balls ?? 0} total={4} tone="b" />
          <CountDots label="S" filled={sit.strikes ?? 0} total={3} tone="s" />
          <CountDots label="O" filled={sit.outs ?? 0} total={3} tone="o" />
        </div>
        <ul className="space-y-0.5 text-xs">
          <RunnerRow label="1B" on={sit.onFirst} name={sit.runnerFirst} />
          <RunnerRow label="2B" on={sit.onSecond} name={sit.runnerSecond} />
          <RunnerRow label="3B" on={sit.onThird} name={sit.runnerThird} />
        </ul>
      </div>
    </div>
  );
}

function RunnerRow({ label, on, name }: { label: string; on?: boolean; name?: string }) {
  return (
    <li className="flex items-baseline gap-2">
      <span className="w-5 shrink-0 text-2xs font-medium uppercase tracking-wide text-subtle">{label}</span>
      <span className={cn("truncate", on ? "text-fg" : "text-faint")}>{on ? name || "On" : "Empty"}</span>
    </li>
  );
}

export function CountDots({
  label,
  filled,
  total,
  tone,
  className,
}: {
  label: string;
  filled: number;
  total: number;
  tone: "b" | "s" | "o";
  className?: string;
}) {
  const fill =
    tone === "b" ? "bg-lean border-lean" : tone === "s" ? "bg-lose border-lose" : "bg-threat border-threat";
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="w-3 text-2xs font-medium uppercase tracking-wide text-subtle">{label}</span>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-2 rounded-pill border border-faint transition-colors duration-150",
            i < filled && fill,
          )}
        />
      ))}
    </div>
  );
}
