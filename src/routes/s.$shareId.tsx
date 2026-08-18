import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { TicketDesk } from "@/components/ticket-desk";
import { readVaultShare } from "@/lib/accounts/vault";
import { decodeSharePayload, previewCopy, type SharedSlip } from "@/lib/bets/share";
import { useSlate, useTicketDetails } from "@/lib/espn/hooks";
import type { Game } from "@/lib/espn/types";

type ShareSearch = { p?: string };

export const Route = createFileRoute("/s/$shareId")({
  validateSearch: (s: Record<string, unknown>): ShareSearch => ({
    p: typeof s.p === "string" ? s.p : undefined,
  }),
  loader: async ({ params, location }) => {
    let slip: SharedSlip | null = null;
    if (import.meta.env.VITE_SPA !== "1") {
      try {
        const { readShare } = await import("@/lib/bets/share-server");
        slip = await readShare({ data: params.shareId });
      } catch {
        slip = null;
      }
    }
    if (!slip) {
      const q =
        typeof location.search === "object" && location.search && "p" in location.search
          ? (location.search as ShareSearch).p
          : undefined;
      if (q) slip = decodeSharePayload(q);
    }
    let preview = {
      title: "Shared slip · Slate",
      description: "Open this slip to watch live scores, trackers, and the gamecast.",
    };
    if (slip) {
      try {
        preview = await previewCopy(slip.ticket);
      } catch {
        preview = {
          title: `${slip.ticket.label} · Slate`,
          description: slip.ticket.legs.map((l) => l.selection).join(" · ").slice(0, 220),
        };
      }
    }
    return { slip, preview };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.preview.title ?? "Shared slip · Slate";
    const description =
      loaderData?.preview.description ?? "Live scores, trackers, and the gamecast for this ticket.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
    };
  },
  component: SharedSlipPage,
});

function SharedSlipPage() {
  const { shareId } = Route.useParams();
  const { p } = Route.useSearch();
  const loaded = Route.useLoaderData();
  const slip = useMemo(() => {
    if (loaded.slip) return loaded.slip;
    if (p) return decodeSharePayload(p);
    return readVaultShare(shareId);
  }, [loaded.slip, p, shareId]);

  const extraLeagues = slip?.ticket.legs.map((l) => l.leagueId) ?? [];
  const enabled = extraLeagues.length ? [...new Set(extraLeagues)] : ["mlb", "ufc"];
  const { data: games = [] } = useSlate(enabled);
  const details = useTicketDetails(
    games,
    (slip?.ticket.legs ?? []).map((l) => ({ eventId: l.eventId, leagueId: l.leagueId })),
  );
  const gameMap = new Map<string, Game>(games.map((g) => [g.id, g]));

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="type-display text-2xl italic">
            Slate
          </Link>
          <p className="text-2xs uppercase tracking-widest text-subtle">Shared slip</p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        {slip ? (
          <>
            <p className="mb-4 text-sm text-muted">
              From {slip.owner || "a desk"} · live scores and trackers update on this page.
            </p>
            <TicketDesk ticket={slip.ticket} games={gameMap} details={details} readOnly />
          </>
        ) : (
          <div className="rounded-xl bg-surface px-5 py-10 text-center shadow-[var(--shadow-border)]">
            <p className="type-display text-2xl italic">Slip not found</p>
            <p className="mt-2 text-sm text-muted">The link may be old. Ask them to send it again.</p>
            <Link to="/" className="mt-5 inline-block text-sm text-lean">
              Open the slate
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
