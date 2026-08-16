import { createFileRoute } from "@tanstack/react-router";
import { loadGameDetail } from "@/lib/espn/api";

export const Route = createFileRoute("/api/espn/game")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const league = url.searchParams.get("league") ?? "";
        const event = url.searchParams.get("event") ?? "";
        if (!league || !event) {
          return Response.json({ error: "league and event required" }, { status: 400 });
        }
        const game = await loadGameDetail(league, event);
        return Response.json(game);
      },
    },
  },
});
