import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type { Ticket } from "./types";

export const listCloudTickets = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<{ payload: Ticket | string }>(
      "select payload from tickets where user_id = $1 order by updated_at desc",
      [context.userId],
    );
    return rows.map((r) => (typeof r.payload === "string" ? (JSON.parse(r.payload) as Ticket) : r.payload));
  });

export const saveCloudTickets = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((tickets: Ticket[]) => tickets)
  .handler(async ({ context, data: tickets }) => {
    const sql = await getSql();
    await sql.query("delete from tickets where user_id = $1", [context.userId]);
    for (const t of tickets) {
      await sql.query(
        "insert into tickets (id, user_id, payload, updated_at) values ($1, $2, $3::jsonb, now())",
        [t.id, context.userId, JSON.stringify(t)],
      );
    }
    return { ok: true as const, count: tickets.length };
  });
