import { useEffect, useRef } from "react";
import { useAccount } from "@/lib/accounts/session";
import { getVaultSession, listVaultUsers, saveVaultTickets } from "@/lib/accounts/vault";
import { authEnabled } from "@/lib/auth/client";
import { useBook } from "./store";

export function useCloudSync() {
  const { user, isPending, username } = useAccount();
  const tickets = useBook((s) => s.tickets);
  const replaceAll = useBook((s) => s.replaceAll);
  const pulled = useRef(false);
  const lastUser = useRef("");

  useEffect(() => {
    if (!username || lastUser.current === username) return;
    lastUser.current = username;
    const vault = listVaultUsers().find((u) => u.username === username);
    if (vault?.tickets.length) {
      const local = useBook.getState().tickets;
      const map = new Map(vault.tickets.map((t) => [t.id, t]));
      for (const t of local) if (!map.has(t.id)) map.set(t.id, t);
      replaceAll([...map.values()].sort((a, b) => b.createdAt - a.createdAt));
    }
  }, [username, replaceAll]);

  useEffect(() => {
    if (username) saveVaultTickets(username, tickets);
  }, [tickets, username]);

  useEffect(() => {
    if (import.meta.env.VITE_SPA === "1") return;
    if (!authEnabled || user?.isDevFallback) return;
    if (isPending || !user || pulled.current) return;
    pulled.current = true;
    void import("./sync")
      .then(({ listCloudTickets, saveCloudTickets }) =>
        listCloudTickets().then((cloud) => {
          if (!cloud.length) {
            if (tickets.length) void saveCloudTickets({ data: tickets }).catch(() => {});
            return;
          }
          const local = useBook.getState().tickets;
          if (!local.length) {
            replaceAll(cloud);
            return;
          }
          const map = new Map(cloud.map((t) => [t.id, t]));
          for (const t of local) {
            const existing = map.get(t.id);
            if (!existing || t.createdAt >= existing.createdAt) map.set(t.id, t);
          }
          const merged = [...map.values()].sort((a, b) => b.createdAt - a.createdAt);
          replaceAll(merged);
          void saveCloudTickets({ data: merged }).catch(() => {});
        }),
      )
      .catch(() => {});
  }, [isPending, user, replaceAll, tickets.length]);

  useEffect(() => {
    if (import.meta.env.VITE_SPA === "1") return;
    if (!authEnabled || user?.isDevFallback) return;
    if (!user || !pulled.current) return;
    const handle = window.setTimeout(() => {
      void import("./sync")
        .then(({ saveCloudTickets }) => saveCloudTickets({ data: useBook.getState().tickets }))
        .catch(() => {});
      const session = getVaultSession();
      if (session) saveVaultTickets(session.username, useBook.getState().tickets);
    }, 800);
    return () => window.clearTimeout(handle);
  }, [tickets, user]);
}
