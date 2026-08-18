import { useMemo, useState } from "react";
import { FAMILIES, LEAGUES, type LeagueFamily } from "@/lib/espn/leagues";
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
  const [family, setFamily] = useState<LeagueFamily | "all" | "live">("all");
  const liveCount = (id: string) => games.filter((g) => g.leagueId === id && g.state === "in").length;
  const gameCount = (id: string) => games.filter((g) => g.leagueId === id).length;

  const shown = useMemo(() => {
    let list = LEAGUES;
    if (family === "live") list = list.filter((l) => liveCount(l.id) > 0);
    else if (family !== "all") list = list.filter((l) => l.family === family);
    return [...list].sort((a, b) => {
      const la = liveCount(a.id);
      const lb = liveCount(b.id);
      if (lb !== la) return lb - la;
      return gameCount(b.id) - gameCount(a.id);
    });
  }, [family, games]);

  return (
    <div className="space-y-2">
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
        {FAMILIES.map((f) => (
          <Chip
            key={f.id}
            active={family === f.id}
            onClick={() => {
              setFamily(f.id);
              if (f.id === "live") onFilter("live");
              else if (f.id === "all") onFilter("all");
              else onFilter(`family:${f.id}`);
            }}
          >
            {f.label}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {shown.map((l) => {
          const on = enabled.includes(l.id);
          const live = liveCount(l.id);
          const n = gameCount(l.id);
          return (
            <Chip
              key={l.id}
              active={filter === l.id}
              dim={!on || n === 0}
              onClick={() => {
                if (!on) onToggle(l.id);
                if (filter === l.id) onFilter("all");
                else onFilter(l.id);
              }}
              onHold={() => onToggle(l.id)}
            >
              {l.short}
              {live > 0 ? <span className="ml-1 text-live">{live}</span> : n > 0 ? <span className="ml-1 text-faint">{n}</span> : null}
            </Chip>
          );
        })}
      </div>
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
