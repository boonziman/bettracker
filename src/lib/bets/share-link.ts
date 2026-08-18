import { saveVaultShare } from "@/lib/accounts/vault";
import { encodeSharePayload, sharePath, type SharedSlip } from "./share";
import type { Ticket } from "./types";
import { uid } from "@/lib/utils";

export async function createShareLink(ticket: Ticket, owner: string) {
  const slip: SharedSlip = {
    id: uid("s"),
    ticket,
    owner: owner || "guest",
    createdAt: Date.now(),
  };
  saveVaultShare(slip);
  const payload = encodeSharePayload(slip);
  if (import.meta.env.VITE_SPA !== "1") {
    try {
      const { publishShare } = await import("./share");
      const published = await publishShare({ data: slip });
      slip.id = published.id;
    } catch {
      /* payload URL still works */
    }
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base === "/" ? "" : base.replace(/\/$/, "");
  const path = sharePath(slip.id, payload);
  return `${origin}${prefix}${path}`;
}
