import { createFileRoute } from "@tanstack/react-router";

const spa = import.meta.env.VITE_SPA === "1";

export const Route = createFileRoute("/api/auth/$")(
  spa
    ? {}
    : {
        server: {
          handlers: {
            GET: async ({ request }) => {
              const { auth } = await import("@/lib/auth/server");
              return auth.handler(request);
            },
            POST: async ({ request }) => {
              const { auth } = await import("@/lib/auth/server");
              return auth.handler(request);
            },
          },
        },
      },
);
