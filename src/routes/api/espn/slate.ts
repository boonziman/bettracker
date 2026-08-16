import { createFileRoute } from "@tanstack/react-router";
import { DEFAULT_LEAGUE_IDS } from "@/lib/espn/leagues";
import { loadSlate } from "@/lib/espn/api";

export const Route = createFileRoute("/api/espn/slate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const raw = url.searchParams.get("leagues") ?? "";
        const leagues = raw.split(",").map((s) => s.trim()).filter(Boolean);
        const ids = leagues.length ? leagues : DEFAULT_LEAGUE_IDS;
        const games = await loadSlate(ids);
        return Response.json(games);
      },
    },
  },
});
