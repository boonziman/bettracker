import { createServerFn } from "@tanstack/react-start";
import { evaluateTicket } from "@/lib/bets/evaluate";
import { statusLabel } from "@/lib/bets/status";
import type { Ticket } from "@/lib/bets/types";
import { loadGameDetail, loadLeagueScoreboard } from "@/lib/espn/api";
import { leagueById } from "@/lib/espn/leagues";
import type { Game, GameDetail } from "@/lib/espn/types";
import { uid } from "@/lib/utils";

export type SharedSlip = {
  id: string;
  ticket: Ticket;
  owner: string;
  createdAt: number;
};

export function encodeSharePayload(slip: SharedSlip) {
  const json = JSON.stringify(slip);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeSharePayload(raw: string): SharedSlip | null {
  try {
    const pad = raw.length % 4 === 0 ? "" : "=".repeat(4 - (raw.length % 4));
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as SharedSlip;
  } catch {
    return null;
  }
}

export function sharePath(id: string, payload?: string) {
  return payload ? `/s/${id}?p=${payload}` : `/s/${id}`;
}

export const publishShare = createServerFn({ method: "POST" })
  .validator((data: SharedSlip) => data)
  .handler(async ({ data }) => {
    const sql = await (await import("@/lib/db")).getSql();
    const id = data.id || uid("s");
    await sql.query(
      `insert into shares (id, user_id, username, payload) values ($1, $2, $3, $4::jsonb)
       on conflict (id) do update set payload = excluded.payload, username = excluded.username`,
      [id, "share", data.owner || "guest", JSON.stringify({ ...data, id })],
    );
    return { id };
  });

export const readShare = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const sql = await (await import("@/lib/db")).getSql();
    const rows = await sql.query<{ payload: SharedSlip | string }>(
      "select payload from shares where id = $1",
      [id],
    );
    if (!rows[0]) return null;
    const payload = typeof rows[0].payload === "string" ? JSON.parse(rows[0].payload) : rows[0].payload;
    return payload as SharedSlip;
  });

export async function previewCopy(ticket: Ticket) {
  const unique = [...new Map(ticket.legs.map((l) => [l.eventId, l])).values()];
  const games = new Map<string, Game>();
  const details = new Map<string, GameDetail | null>();
  const leagues = [...new Set(ticket.legs.map((l) => l.leagueId))];
  await Promise.all(
    leagues.map(async (leagueId) => {
      const def = leagueById(leagueId);
      if (!def) return;
      try {
        const board = await loadLeagueScoreboard(def);
        for (const g of board) games.set(g.id, g);
      } catch {
        /* skip */
      }
    }),
  );
  await Promise.all(
    unique.map(async (leg) => {
      try {
        const g = await loadGameDetail(leg.leagueId, leg.eventId, games.get(leg.eventId));
        if (g) details.set(g.id, g);
      } catch {
        /* skip */
      }
    }),
  );
  const ev = evaluateTicket(ticket, games, details);
  const lines = ticket.legs.map((leg, i) => {
    const evl = ev.legs[i];
    const game = details.get(leg.eventId) ?? games.get(leg.eventId);
    const score = game && game.format !== "field" ? `${game.away.score}–${game.home.score}` : "";
    const live = evl?.readout || evl?.note || statusLabel(evl?.status ?? "pending");
    return `${leg.selection}${score ? ` · ${score}` : ""} · ${live}`;
  });
  const title = `${ticket.label} · ${statusLabel(ev.status)} · ${ev.hits}/${ticket.legs.length}`;
  const description = lines.join(" · ").slice(0, 220);
  return { title, description, hits: ev.hits, status: ev.status };
}
