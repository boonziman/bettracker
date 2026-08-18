import { useEffect, useState, useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState, type AppUser, type CurrentUserState } from "@/lib/auth/use-current-user";
import { emailToUsername, isMasterName } from "./identity";
import { getVaultSession } from "./vault";

const listeners = new Set<() => void>();
let cached: AppUser | null = null;
let cachedKey = "";

export function bumpAccount() {
  cached = null;
  cachedKey = "";
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function snapshot(): AppUser | null {
  const local = getVaultSession();
  const key = local ? `${local.id}:${local.username}` : "";
  if (key === cachedKey) return cached;
  cachedKey = key;
  cached = local
    ? {
        id: local.id,
        displayName: local.username,
        primaryEmail: null,
        profileImageUrl: null,
        isDevFallback: false,
      }
    : null;
  return cached;
}

export function useAccount(): CurrentUserState & { username: string; isMaster: boolean } {
  const remote = useCurrentUserState();
  const local = useSyncExternalStore(subscribe, snapshot, () => null);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const spa = import.meta.env.VITE_SPA === "1";
  const user = spa ? (ready ? local : null) : remote.user?.isDevFallback ? local : remote.user ?? (ready ? local : null);
  const username = emailToUsername(user?.primaryEmail, user?.displayName);
  return {
    user,
    isPending: spa ? !ready : !ready || (remote.isPending && !local),
    username,
    isMaster: isMasterName(username, user?.primaryEmail),
  };
}

export async function refreshRemoteSession() {
  try {
    await authClient.getSession();
  } catch {
    /* ignore */
  }
  bumpAccount();
}
