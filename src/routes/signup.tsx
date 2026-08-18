import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { signUpUsername } from "@/lib/accounts/actions";
import { ensureLocalMaster } from "@/lib/accounts/vault";
import { useAccount } from "@/lib/accounts/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const { user, isPending } = useAccount();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void ensureLocalMaster().finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!isPending && user) void navigate({ to: "/" });
  }, [isPending, user, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signUpUsername(username, password);
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm">
        <Link to="/" className="type-display text-3xl italic">
          Slate
        </Link>
        <h1 className="mt-4 text-lg font-medium">Create an account</h1>
        <p className="mt-1 text-sm text-muted">Username and password. Your book stays on this desk.</p>

        <form className="mt-6 space-y-3" onSubmit={(e) => void submit(e)}>
          <div>
            <Label htmlFor="user">Username</Label>
            <Input
              id="user"
              className="mt-1.5"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your name"
            />
          </div>
          <div>
            <Label htmlFor="pass">Password</Label>
            <Input
              id="pass"
              className="mt-1.5"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-lose">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={busy || !ready}>
            {busy ? "Working…" : "Sign up"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-muted">
          Already have one?{" "}
          <Link to="/login" className="text-fg hover:underline">
            Sign in
          </Link>
        </p>
        <Link to="/" className="mt-6 block text-sm text-subtle hover:text-fg">
          Back to the slate
        </Link>
      </div>
    </main>
  );
}
