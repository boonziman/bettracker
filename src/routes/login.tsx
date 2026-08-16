import { Link, createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm">
        <Link to="/" className="type-display text-3xl italic">
          Slate
        </Link>
        <p className="mt-2 text-sm text-muted">
          Sign in to keep the book across devices. Guests still track locally on this phone.
        </p>
        <div className="mt-6 space-y-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                variant="secondary"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                Continue with {p.label}
              </Button>
            ))
          ) : (
            <p className="text-sm text-subtle">Sign-in is disabled.</p>
          )}
        </div>
        <Link to="/" className="mt-6 inline-block text-sm text-muted hover:text-fg">
          Back to the slate
        </Link>
      </div>
    </main>
  );
}
