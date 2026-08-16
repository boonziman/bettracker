import { useEffect, useRef } from "react";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useBook } from "./store";

export function useCloudSync() {
  const { user, isPending } = useCurrentUserState();
  const tickets = useBook((s) => s.tickets);
  const replaceAll = useBook((s) => s.replaceAll);
  const pulled = useRef(false);

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
    }, 800);
    return () => window.clearTimeout(handle);
  }, [tickets, user]);
}
