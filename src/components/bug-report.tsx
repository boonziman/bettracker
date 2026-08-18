import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Bug } from "lucide-react";
import { useAccount } from "@/lib/accounts/session";
import { addVaultBug } from "@/lib/accounts/vault";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { username } = useAccount();

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Add a short title and what broke");
      return;
    }
    setBusy(true);
    addVaultBug({
      userId: username || "guest",
      username: username || "guest",
      title: title.trim(),
      body: body.trim(),
      path,
    });
    try {
      if (import.meta.env.VITE_SPA !== "1") {
        const { submitBug } = await import("@/lib/bets/desk");
        await submitBug({
          data: { title: title.trim(), body: body.trim(), path, username: username || "guest" },
        });
      }
      toast.success("Report sent");
      setTitle("");
      setBody("");
      setOpen(false);
    } catch (err) {
      toast.success("Saved on this device — Sean will see it on the desk");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Bug report"
        className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-xs text-muted hover:bg-elevated hover:text-fg"
      >
        <Bug className="size-3.5" />
        <span className="hidden sm:inline">Bug report</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Bug report</DialogTitle>
          <p className="mt-1 text-sm text-muted">Tell Sean what broke. It lands on the master desk.</p>
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="bug-title">Title</Label>
              <Input
                id="bug-title"
                className="mt-1.5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Totals not ticking on the fight"
              />
            </div>
            <div>
              <Label htmlFor="bug-body">What happened</Label>
              <textarea
                id="bug-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="mt-1.5 w-full rounded-md bg-inset px-3 py-2 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="What you tapped, what you expected, what you saw."
              />
            </div>
            <p className="text-2xs text-subtle">Page {path}</p>
            <Button className="w-full" onClick={() => void send()} disabled={busy}>
              {busy ? "Sending…" : "Send report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
