import { DiamondBoard } from "@/components/diamond";
import type { CourtMark, Game, GameDetail, GamePlay, Pitch, PlayerLine, Situation } from "@/lib/espn/types";
import { cn } from "@/lib/utils";

export function PitchStage({
  sit,
  pitches,
  game,
  compact,
}: {
  sit: Situation;
  pitches: Pitch[];
  game?: Game;
  compact?: boolean;
}) {
  const players = game && "players" in game ? ((game as GameDetail).players ?? []) : [];
  const pitcherP = findPlayer(players, sit.pitcherId, sit.pitcher);
  const batterP = findPlayer(players, sit.batterId, sit.batter);
  const pitcherName = sit.pitcher || pitcherP?.shortName || "Pitcher";
  const batterName = sit.batter || batterP?.shortName || "Batter";
  const pitcherShot = sit.pitcherHeadshot || pitcherP?.headshot;
  const batterShot = sit.batterHeadshot || batterP?.headshot;
  const pitcherLine = sit.pitcherLine || lineFrom(pitcherP, "pitch");
  const batterLine = sit.batterLine || lineFrom(batterP, "bat");
  const dots = pitches.filter((p) => p.x != null && p.y != null);
  const list = [...pitches].reverse().slice(0, compact ? 4 : 6);
  const pitcherLogo = teamLogo(game, sit.pitcherTeamId, "pitch");
  const batterLogo = teamLogo(game, sit.batterTeamId, "bat");

  return (
    <div className="mt-3 overflow-hidden rounded-md bg-elevated/70">
      <div className={cn("grid grid-cols-[1fr_auto_1fr] items-center gap-3", compact ? "px-3 pt-3" : "px-4 pt-4")}>
        <SideCard
          kicker="Pitcher"
          name={pitcherName}
          line={pitcherLine}
          tag={sit.pitcherHand ? `${sit.pitcherHand.toUpperCase()}HP` : "P"}
          logo={pitcherLogo}
          align="left"
        />
        <div className="flex items-center gap-2">
          <Headshot src={pitcherShot} name={pitcherName} />
          <span className="text-2xs uppercase tracking-widest text-faint">vs</span>
          <Headshot src={batterShot} name={batterName} />
        </div>
        <SideCard
          kicker="Batter"
          name={batterName}
          line={batterLine}
          tag={sit.batterPos || batterP?.stats?.POS || "AB"}
          logo={batterLogo}
          align="right"
        />
      </div>

      {(sit.pitchCount || sit.onDeck) && (
        <div className={cn("mt-2 flex flex-wrap items-center justify-center gap-x-4 text-2xs tabular text-subtle", compact ? "px-3" : "px-4")}>
          {sit.pitchCount ? (
            <span>
              Pitch <span className="font-medium text-fg">{sit.pitchCount}</span>
            </span>
          ) : null}
          {sit.onDeck ? (
            <span>
              On deck <span className="font-medium text-fg">{sit.onDeck}</span>
            </span>
          ) : null}
        </div>
      )}

      <div className={cn("border-t border-line", compact ? "mt-3 px-3 py-3" : "mt-4 px-4 py-4")}>
        <DiamondBoard sit={sit} size={compact ? "md" : "lg"} />
      </div>

      <div className="grid items-stretch gap-0 border-t border-line grid-cols-1 sm:grid-cols-[1fr_8rem]">
        <div className={cn(compact ? "px-3 py-2" : "px-4 py-3")}>
          <StrikeZone pitches={dots} compact={compact} />
        </div>
        <ol className="border-t border-line sm:border-t-0 sm:border-l">
          {list.length ? (
            list.map((p) => (
              <li key={p.id} className="flex items-center gap-2 border-b border-line px-3 py-1.5 last:border-b-0">
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-2xs font-medium", chip(p.outcome))}>
                  {p.n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-2xs font-medium uppercase tracking-wide text-fg">{labelOf(p)}</span>
                  <span className="flex justify-between gap-2 text-2xs text-subtle">
                    <span className="truncate uppercase">{p.type || "—"}</span>
                    {p.mph ? <span className="shrink-0 tabular">{p.mph} mph</span> : null}
                  </span>
                </span>
              </li>
            ))
          ) : (
            <li className="px-3 py-4 text-2xs text-faint">Waiting on the next pitch</li>
          )}
        </ol>
      </div>
    </div>
  );
}

function findPlayer(players: PlayerLine[], id?: string, name?: string) {
  if (id) {
    const hit = players.find((p) => p.id === id);
    if (hit) return hit;
  }
  if (name) {
    const n = name.toLowerCase();
    return players.find((p) => p.shortName.toLowerCase() === n || p.name.toLowerCase() === n);
  }
  return undefined;
}

function lineFrom(player: PlayerLine | undefined, kind: "pitch" | "bat") {
  if (!player) return undefined;
  if (kind === "pitch") {
    const ip = player.stats.IP;
    const bits = [
      ip && `${ip} IP`,
      player.stats.H && `${player.stats.H}H`,
      player.stats.ER && `${player.stats.ER} ER`,
      player.stats.K && `${player.stats.K} K`,
      player.stats.BB && `${player.stats.BB} BB`,
    ].filter(Boolean);
    return bits.length ? bits.join(", ") : undefined;
  }
  return player.stats["H-AB"] || player.stats["hits-atBats"] || undefined;
}

function teamLogo(game: Game | undefined, teamId: string | undefined, role: "pitch" | "bat") {
  if (game && teamId) {
    if (game.home.id === teamId) return game.home.logo;
    if (game.away.id === teamId) return game.away.logo;
  }
  if (!game) return undefined;
  const bot = /bot/i.test(`${game.shortDetail} ${game.detail}`);
  if (role === "pitch") return bot ? game.away.logo : game.home.logo;
  return bot ? game.home.logo : game.away.logo;
}

function SideCard({
  kicker,
  name,
  line,
  tag,
  logo,
  align,
}: {
  kicker: string;
  name: string;
  line?: string;
  tag?: string;
  logo?: string;
  align: "left" | "right";
}) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <div className={cn("flex items-center gap-1.5", align === "right" && "flex-row-reverse")}>
        {logo ? <img src={logo} alt="" className="size-3.5 object-contain" crossOrigin="anonymous" /> : null}
        <p className="text-2xs font-medium uppercase tracking-widest text-subtle">{kicker}</p>
      </div>
      <p className="truncate text-sm font-medium leading-tight text-lean">
        {name} {tag ? <span className="font-normal text-subtle">{tag}</span> : null}
      </p>
      {line ? <p className="truncate text-2xs tabular text-subtle">{line}</p> : null}
    </div>
  );
}

function Headshot({ src, name }: { src?: string; name: string }) {
  return src ? (
    <img src={src} alt="" className="size-10 shrink-0 rounded-full object-cover ring-1 ring-line-strong" crossOrigin="anonymous" />
  ) : (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-inset text-xs text-muted ring-1 ring-line">
      {name.slice(0, 1)}
    </span>
  );
}

function StrikeZone({ pitches, compact }: { pitches: Pitch[]; compact?: boolean }) {
  const zx = 78;
  const zy = 118;
  const zw = 84;
  const zh = 72;
  return (
    <svg
      viewBox="40 70 200 175"
      className={cn("w-full justify-self-center text-fg", compact ? "h-32" : "h-40")}
    >
      <rect x="40" y="70" width="200" height="175" fill="transparent" />
      <path d="M105 218 L141 218 L154 206 L123 194 L92 206 Z" fill="currentColor" opacity="0.1" />
      {Array.from({ length: 3 }, (_, r) =>
        Array.from({ length: 3 }, (_, c) => {
          const cool = (r + c) % 2 === 0;
          return (
            <rect
              key={`${r}${c}`}
              x={zx + (c * zw) / 3}
              y={zy + (r * zh) / 3}
              width={zw / 3}
              height={zh / 3}
              fill={cool ? "color-mix(in oklab, var(--color-lean) 32%, transparent)" : "color-mix(in oklab, var(--color-lose) 30%, transparent)"}
              stroke="color-mix(in oklab, var(--color-fg) 14%, transparent)"
              strokeWidth="0.5"
            />
          );
        }),
      )}
      <rect
        x={zx}
        y={zy}
        width={zw}
        height={zh}
        fill="none"
        stroke="color-mix(in oklab, var(--color-fg) 55%, transparent)"
        strokeWidth="1.2"
      />
      <BatterSilhouette />
      {pitches.map((p) => (
        <g key={p.id}>
          <circle cx={p.x} cy={p.y} r={6.2} fill={dotFill(p.outcome)} />
          <text
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="7"
            fontWeight="600"
            fill={p.outcome === "ball" ? "var(--color-accent-fg)" : "var(--color-fg)"}
          >
            {p.n}
          </text>
        </g>
      ))}
    </svg>
  );
}

function BatterSilhouette() {
  return (
    <g opacity="0.22" fill="currentColor" transform="translate(168 96) scale(0.92)">
      <circle cx="22" cy="10" r="6.5" />
      <path d="M16 18 C14 28 10 42 12 58 L18 58 C17 44 20 32 24 24 C30 34 36 50 34 62 L40 61 C41 46 36 28 28 18 Z" />
      <path d="M10 36 L2 48 L8 50 L16 38 Z" />
      <rect x="28" y="20" width="3.2" height="28" rx="1" transform="rotate(-18 30 34)" />
    </g>
  );
}

function dotFill(o: Pitch["outcome"]) {
  if (o === "ball") return "var(--color-fg)";
  if (o === "foul") return "var(--color-subtle)";
  if (o === "inplay") return "var(--color-lean)";
  return "var(--color-lose)";
}

function chip(o: Pitch["outcome"]) {
  if (o === "ball") return "bg-fg text-accent-fg";
  if (o === "foul") return "bg-faint text-fg";
  if (o === "inplay") return "bg-lean text-accent-fg";
  return "bg-lose text-accent-fg";
}

function labelOf(p: Pitch) {
  const r = p.result.replace(/^Pitch \d+\s*:\s*/i, "").trim();
  return r || p.outcome;
}

export function CourtStage({
  marks,
  lastPlay,
  plays,
  game,
  compact,
}: {
  marks: CourtMark[];
  lastPlay?: string;
  plays?: GamePlay[];
  game?: Game;
  compact?: boolean;
}) {
  const recent = (plays ?? [])
    .filter((p) => p.text)
    .slice(-4)
    .reverse();
  return (
    <div className="mt-3 overflow-hidden rounded-md bg-elevated/70">
      {game ? (
        <div className="flex items-baseline justify-between gap-2 px-4 pt-3 text-2xs">
          <span className="tabular text-muted">{game.shortDetail}</span>
          <span className="tabular font-medium">
            {game.away.abbr} {game.away.score} · {game.home.abbr} {game.home.score}
          </span>
        </div>
      ) : null}
      <div className="grid items-stretch grid-cols-1 sm:grid-cols-[1fr_8.5rem]">
        <div className="px-3 py-2">
          <BasketCourt marks={marks} tall={compact ? 88 : 110} />
          <p className="mt-1 flex items-center gap-2 text-2xs text-subtle">
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-win" /> made
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full border border-lose" /> miss
            </span>
          </p>
        </div>
        <ol className="border-t border-line sm:border-t-0 sm:border-l">
          {recent.length ? (
            recent.map((p) => (
              <li key={p.id} className="border-b border-line px-3 py-1.5 last:border-b-0">
                <p className="line-clamp-2 text-2xs leading-snug text-muted">
                  {p.clock || p.period ? (
                    <span className="mr-1 tabular text-subtle">{[p.period, p.clock].filter(Boolean).join(" ")}</span>
                  ) : null}
                  {p.text}
                </p>
              </li>
            ))
          ) : lastPlay ? (
            <li className="px-3 py-2 text-2xs text-muted">{lastPlay}</li>
          ) : (
            <li className="px-3 py-4 text-2xs text-faint">Waiting on the next trip</li>
          )}
        </ol>
      </div>
    </div>
  );
}

function BasketCourt({ marks, tall }: { marks: CourtMark[]; tall: number }) {
  const w = 50;
  const h = 47;
  return (
    <svg viewBox="-1 -1 52 49" className="w-full text-fg" style={{ height: tall }}>
      <rect x="0" y="0" width={w} height={h} fill="color-mix(in oklab, var(--color-fg) 3%, transparent)" stroke="color-mix(in oklab, var(--color-fg) 28%, transparent)" strokeWidth="0.55" />
      <rect x="17" y="0" width="16" height="19" fill="color-mix(in oklab, var(--color-lose) 8%, transparent)" stroke="color-mix(in oklab, var(--color-fg) 28%, transparent)" strokeWidth="0.4" />
      <path d="M17 19 A8 8 0 0 0 33 19" fill="none" stroke="color-mix(in oklab, var(--color-fg) 22%, transparent)" strokeWidth="0.4" />
      <circle cx="25" cy="5.25" r="1.6" fill="none" stroke="var(--color-lose)" strokeWidth="0.55" />
      <line x1="19" y1="4" x2="31" y2="4" stroke="color-mix(in oklab, var(--color-fg) 30%, transparent)" strokeWidth="0.35" />
      <path d="M3 0 A22 22 0 0 0 47 0" fill="none" stroke="color-mix(in oklab, var(--color-fg) 16%, transparent)" strokeWidth="0.35" />
      {marks.map((m) => {
        const { x, y } = mapHoop(m.x, m.y);
        return (
          <circle
            key={m.id}
            cx={x}
            cy={y}
            r={m.scoring ? 1.25 : 1.05}
            fill={m.made ? "var(--color-win)" : "transparent"}
            stroke={m.made ? "var(--color-win)" : "var(--color-lose)"}
            strokeWidth="0.45"
          />
        );
      })}
    </svg>
  );
}

function mapHoop(x: number, y: number) {
  let nx = x;
  let ny = y;
  if (x > 50 && x <= 100) nx = x > 50 ? 100 - x : x;
  if (y > 47) ny = y > 47 ? 94 - y : y;
  return { x: Math.max(0, Math.min(50, nx)), y: Math.max(0, Math.min(47, ny)) };
}

export function hasPitchStage(detail: GameDetail | null | undefined, sit?: Situation) {
  if (!sit) return false;
  return Boolean(sit.batter || sit.pitcher || sit.balls != null || (detail?.pitches && detail.pitches.length));
}

export function hasCourtStage(detail: GameDetail | null | undefined) {
  return Boolean(detail?.courtMarks && detail.courtMarks.length);
}
