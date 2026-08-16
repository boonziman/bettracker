import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Toaster } from "sonner";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AuthProvider } from "@/lib/auth/provider";
import appCss from "../styles.css?url";

const APP_NAME = "Slate";
const isSpa = import.meta.env.VITE_SPA === "1";
const base = import.meta.env.BASE_URL || "/";
const host = import.meta.env.VITE_PUBLIC_HOSTNAME;
const pagesOrigin = import.meta.env.VITE_PAGES_ORIGIN as string | undefined;
const ogImage = pagesOrigin
  ? `${pagesOrigin.replace(/\/$/, "")}/og.jpg`
  : host
    ? `https://${host}/og.jpg`
    : undefined;

function pub(path: string) {
  return `${base}${path.replace(/^\//, "")}`;
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Slate — The desk" },
      { name: "description", content: "Live bet desk for every sport. Track parlays, props, and lines against real ESPN Gamecast." },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "theme-color", content: "#080808" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Slate — The desk" },
      { property: "og:description", content: "Your book. Live scores, prop tickers, every sport." },
      ...(ogImage
        ? [
            { property: "og:image", content: ogImage },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
          ]
        : []),
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: pub("favicon.svg") },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: pub("__grok/manifest.webmanifest") },
      { rel: "apple-touch-icon", href: pub("__grok/icon-180.png") },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,500&display=swap",
      },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  const app = (
    <>
      <PreviewHostBridge />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Outlet />
          <Toaster
            theme="dark"
            position="top-center"
            toastOptions={{
              style: {
                background: "var(--color-elevated)",
                color: "var(--color-fg)",
                border: "1px solid var(--color-line)",
              },
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </>
  );

  if (isSpa) return app;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {app}
        <Scripts />
      </body>
    </html>
  );
}
