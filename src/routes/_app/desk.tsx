import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAccount } from "@/lib/accounts/session";
import { listVaultBugs, listVaultUsers } from "@/lib/accounts/vault";
import { RedirectToSignIn } from "@/lib/auth/gates";
import type { BugRow, DeskTicket, DeskUser } from "@/lib/bets/desk-types";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/_app/desk")({
  component: DeskPage,
});

function DeskPage() {
  const { user, isPending, isMaster, username } = useAccount();
  const [users, setUsers] = useState<DeskUser[]>([]);
  const [tickets, setTickets] = useState<DeskTicket[]>([]);
  const [bugs, setBugs] = useState<BugRow[]>([]);
  const [tab, setTab] = useState<"books" | "bugs">("books");
  const [err, setErr] = useState("");

  useEffect(() => {
    const localUsers = listVaultUsers().map((u) => ({
      id: u.id,
      username: u.username,
      email: "",
      createdAt: new Date(u.createdAt).toISOString(),
      ticketCount: u.tickets.length,
      stake: u.tickets.reduce((a, t) => a + t.stake, 0),
    }));
    const localTickets: DeskTicket[] = listVaultUsers().flatMap((u) =>
      u.tickets.map((ticket) => ({ userId: u.id, username: u.username, ticket })),
    );
    const localBugs: BugRow[] = listVaultBugs().map((b) => ({
      id: b.id,
      userId: b.userId,
      username: b.username,
      title: b.title,
      body: b.body,
      path: b.path ?? null,
      createdAt: new Date(b.createdAt).toISOString(),
    }));
    setUsers(localUsers);
    setTickets(localTickets);
    setBugs(localBugs);

    if (import.meta.env.VITE_SPA === "1") return;
    void import("@/lib/bets/desk")
      .then(({ listDesk, listBugs }) =>
        Promise.all([listDesk(), listBugs()]).then(([desk, remoteBugs]) => {
          const byId = new Map(localUsers.map((u) => [u.username, u]));
          for (const u of desk.users) byId.set(u.username, u);
          setUsers([...byId.values()]);
          const seen = new Set(localTickets.map((t) => t.ticket.id));
          setTickets([...localTickets, ...desk.tickets.filter((t) => !seen.has(t.ticket.id))]);
          const bugIds = new Set(localBugs.map((b) => b.id));
          setBugs([...localBugs, ...remoteBugs.filter((b) => !bugIds.has(b.id))]);
        }),
      )
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Desk could not load";
        if (!/bug_reports|does not exist/i.test(msg)) setErr(msg);
      });
  }, []);

  if (isPending) return <div className="h-40 animate-pulse rounded-xl bg-surface" />;
  if (!user) return <RedirectToSignIn />;
  if (!isMaster) {
    return (
      <div className="rounded-xl bg-surface px-5 py-10 text-center shadow-[var(--shadow-border)]">
        <p className="type-display text-2xl italic">Master desk</p>
        <p className="mt-2 text-sm text-muted">This board is only for Sean.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-lean">
          Back to the slate
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-2xs font-medium uppercase tracking-widest text-subtle">Master · {username}</p>
        <h1 className="type-display mt-1 text-3xl italic">The desk</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Every account and every ticket they book. Bug reports land in the second tab.
        </p>
      </div>

      <div className="mb-5 flex gap-1.5">
        {(
          [
            ["books", `Books · ${users.length}`],
            ["bugs", `Bug reports · ${bugs.length}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={
              tab === id
                ? "h-9 rounded-md bg-accent px-3 text-xs text-accent-fg"
                : "h-9 rounded-md bg-elevated px-3 text-xs text-muted"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {err ? <p className="mb-4 text-sm text-threat">{err}</p> : null}

      {tab === "bugs" ? (
        <ul className="space-y-3">
          {bugs.length === 0 ? <p className="text-sm text-muted">No reports yet.</p> : null}
          {bugs.map((b) => (
            <li key={b.id} className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{b.title}</p>
                  <p className="mt-1 text-2xs text-subtle">
                    {b.username} · {b.path || "—"} · {new Date(b.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{b.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-2xs font-medium uppercase tracking-wide text-subtle">Accounts</h2>
            <div className="overflow-x-auto rounded-xl bg-surface shadow-[var(--shadow-border)]">
              <table className="w-full min-w-80 text-sm">
                <thead className="text-2xs uppercase tracking-wide text-subtle">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">User</th>
                    <th className="px-4 py-2.5 text-right font-medium">Tickets</th>
                    <th className="px-4 py-2.5 text-right font-medium">Staked</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-line">
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{u.username}</p>
                        {u.email ? <p className="text-2xs text-subtle">{u.email}</p> : null}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular">{u.ticketCount}</td>
                      <td className="px-4 py-2.5 text-right tabular">{formatMoney(u.stake)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-2xs font-medium uppercase tracking-wide text-subtle">Every ticket</h2>
            <ul className="space-y-2">
              {tickets.length === 0 ? <p className="text-sm text-muted">Nobody has booked yet.</p> : null}
              {tickets.map((row) => (
                <li key={row.ticket.id + row.userId} className="rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{row.ticket.label}</p>
                      <p className="text-2xs text-subtle">
                        {row.username} · {row.ticket.legs.length}-leg · {formatMoney(row.ticket.stake)} at{" "}
                        {row.ticket.odds > 0 ? "+" : ""}
                        {row.ticket.odds}
                      </p>
                    </div>
                    <span className="text-xs tabular text-muted">{formatMoney(row.ticket.toWin)}</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {row.ticket.legs.map((leg) => (
                      <li key={leg.id} className="text-xs text-muted">
                        <span className="text-fg">{leg.selection}</span>
                        <span className="text-subtle"> · {leg.eventLabel}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
