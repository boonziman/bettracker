import type { EvalStatus, TicketStatus } from "./types";

export function statusLabel(s: EvalStatus | TicketStatus) {
  switch (s) {
    case "won":
      return "Hit";
    case "lost":
      return "Miss";
    case "leaning":
      return "Covering";
    case "threat":
      return "Sweating";
    case "push":
      return "Push";
    case "open":
      return "Live";
    case "void":
      return "Void";
    default:
      return "Open";
  }
}

export function statusTone(s: EvalStatus | TicketStatus) {
  if (s === "won") return "won" as const;
  if (s === "lost") return "lost" as const;
  if (s === "leaning") return "leaning" as const;
  if (s === "threat") return "threat" as const;
  if (s === "open") return "live" as const;
  return "pending" as const;
}
