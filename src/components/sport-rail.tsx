import { LEAGUES } from "@/lib/espn/leagues";
import type { Game } from "@/lib/espn/types";
import { cn } from "@/lib/utils";

export function SportRail({
  enabled,
  onToggle,
  games,
  filter,
  onFilter,
}: {
  enabled: string[];
  onToggle: (id: string) => void;
  games: Game[];
  filter: string;
  onFilter: (id: string) => void;
}) {
  const liveCount = (id: string) => games.filter((g) => g.leagueId === id && g.state === "in").length;

  return (
    <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
      <Chip active={filter === "all"} onClick={() => onFilter("all")}>
        All
      </Chip>
      <Chip active={filter === "live"} onClick={() => onFilter("live")}>
        Live
      </Chip>
      {LEAGUES.map((l) => {
        const on = enabled.includes(l.id);
        const live = liveCount(l.id);
        return (
          <Chip
            key={l.id}
            active={filter === l.id}
            dim={!on}
            onClick={() => {
              if (filter === l.id) onFilter("all");
              else onFilter(l.id);
            }}
            onHold={() => onToggle(l.id)}
          >
            {l.short}
            {live > 0 ? <span className="ml-1 text-live">{live}</span> : null}
          </Chip>
        );
      })}
    </div>
  );
}

function Chip({
  active,
  dim,
  onClick,
  onHold,
  children,
}: {
  active?: boolean;
  dim?: boolean;
  onClick: () => void;
  onHold?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={(e) => {
        if (!onHold) return;
        e.preventDefault();
        onHold();
      }}
      className={cn(
        "h-9 shrink-0 rounded-pill px-3 text-xs font-medium",
        active ? "bg-accent text-accent-fg" : "bg-surface text-muted shadow-[var(--shadow-border)]",
        dim && !active && "opacity-40",
      )}
    >
      {children}
    </button>
  );
}
