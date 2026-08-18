import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  MASTER_USERNAME,
  credentialPassword,
  isMasterName,
  usernameToEmail,
} from "@/lib/accounts/identity";
import type { Ticket } from "./types";

const MASTER_EMAIL = usernameToEmail(MASTER_USERNAME);

async function assertMaster(userId: string) {
  const sql = await getSql();
  const rows = await sql.query<{ name: string; email: string }>(
    `select name, email from "user" where id = $1`,
    [userId],
  );
  const row = rows[0];
  if (!row || !isMasterName(row.name, row.email)) {
    throw new Error("Forbidden");
  }
}

export const ensureMasterAccount = createServerFn({ method: "POST" }).handler(async () => {
  const sql = await getSql();
  const existing = await sql.query<{ id: string }>(`select id from "user" where email = $1`, [MASTER_EMAIL]);
  if (existing.length) return { ok: true as const, created: false };
  try {
    const { auth } = await import("@/lib/auth/server");
    await auth.api.signUpEmail({
      body: {
        name: MASTER_USERNAME,
        email: MASTER_EMAIL,
        password: credentialPassword("12345"),
      },
    });
    return { ok: true as const, created: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already|exist/i.test(msg)) return { ok: true as const, created: false };
    throw err instanceof Error ? err : new Error(msg);
  }
});

export type DeskUser = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  ticketCount: number;
  stake: number;
};

export type DeskTicket = {
  userId: string;
  username: string;
  ticket: Ticket;
};

export const listDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertMaster(context.userId);
    const sql = await getSql();
    const users = await sql.query<{
      id: string;
      name: string;
      email: string;
      createdAt: string;
    }>(`select id, name, email, "createdAt" from "user" order by "createdAt" desc`);
    const rows = await sql.query<{ user_id: string; payload: Ticket | string }>(
      "select user_id, payload from tickets order by updated_at desc",
    );
    const tickets: DeskTicket[] = rows.map((r) => {
      const ticket = typeof r.payload === "string" ? (JSON.parse(r.payload) as Ticket) : r.payload;
      const owner = users.find((u) => u.id === r.user_id);
      return {
        userId: r.user_id,
        username: owner?.name || owner?.email || r.user_id,
        ticket,
      };
    });
    const deskUsers: DeskUser[] = users.map((u) => {
      const mine = tickets.filter((t) => t.userId === u.id);
      return {
        id: u.id,
        username: u.name || u.email,
        email: u.email,
        createdAt: typeof u.createdAt === "string" ? u.createdAt : String(u.createdAt),
        ticketCount: mine.length,
        stake: mine.reduce((a, t) => a + (t.ticket.stake || 0), 0),
      };
    });
    return { users: deskUsers, tickets };
  });

export type BugRow = {
  id: string;
  userId: string;
  username: string;
  title: string;
  body: string;
  path: string | null;
  createdAt: string;
};

export const submitBug = createServerFn({ method: "POST" })
  .validator((data: { title: string; body: string; path?: string; username?: string }) => ({
    title: data.title.trim().slice(0, 160),
    body: data.body.trim().slice(0, 4000),
    path: (data.path || "").slice(0, 240),
    username: (data.username || "guest").slice(0, 40),
  }))
  .handler(async ({ data }) => {
    if (!data.title || !data.body) throw new Error("Add a title and what went wrong");
    let userId = "guest";
    try {
      const { getSessionUser } = await import("@/lib/auth/verify.server");
      const u = await getSessionUser();
      if (u?.id) userId = u.id;
    } catch {
      /* guest report is fine */
    }
    const sql = await getSql();
    const id = `bug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await sql.query(
      "insert into bug_reports (id, user_id, username, title, body, path) values ($1, $2, $3, $4, $5, $6)",
      [id, userId, data.username, data.title, data.body, data.path || null],
    );
    return { ok: true as const, id };
  });

export const listBugs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertMaster(context.userId);
    const sql = await getSql();
    const rows = await sql.query<{
      id: string;
      user_id: string;
      username: string;
      title: string;
      body: string;
      path: string | null;
      created_at: string;
    }>("select id, user_id, username, title, body, path, created_at from bug_reports order by created_at desc limit 200");
    return rows.map(
      (r): BugRow => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        title: r.title,
        body: r.body,
        path: r.path,
        createdAt: r.created_at,
      }),
    );
  });
