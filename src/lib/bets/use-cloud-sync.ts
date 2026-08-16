import { useEffect, useRef } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listCloudTickets, saveCloudTickets } from "./sync";
import { useBook } from "./store";

export function useCloudSync() {
  const { user, isPending } = useCurrentUserState();
  const tickets = useBook((s) => s.tickets);
  const replaceAll = useBook((s) => s.replaceAll);
  const pulled = useRef(false);

  useEffect(() => {
    if (isPending || !user || pulled.current) return;
    pulled.current = true;
    void listCloudTickets()
      .then((cloud) => {
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
      })
      .catch(() => {});
  }, [isPending, user, replaceAll, tickets.length]);

  useEffect(() => {
    if (!user || !pulled.current) return;
    const handle = window.setTimeout(() => {
      void saveCloudTickets({ data: useBook.getState().tickets }).catch(() => {});
    }, 800);
    return () => window.clearTimeout(handle);
  }, [tickets, user]);
}
