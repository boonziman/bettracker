import { authClient } from "@/lib/auth/client";
import { useBook } from "@/lib/bets/store";
import { cleanUsername, credentialPassword, usernameToEmail } from "./identity";
import { bumpAccount, refreshRemoteSession } from "./session";
import {
  ensureLocalMaster,
  saveVaultTickets,
  vaultSignIn,
  vaultSignOut,
  vaultSignUp,
} from "./vault";

const spa = () => import.meta.env.VITE_SPA === "1";

export async function signInUsername(username: string, password: string) {
  const name = cleanUsername(username);
  if (!name || !password) throw new Error("Enter a username and password");
  await ensureLocalMaster();

  if (!spa()) {
    const { error } = await authClient.signIn.email({
      email: usernameToEmail(name),
      password: credentialPassword(password),
    });
    if (!error) {
      try {
        await vaultSignIn(name, password);
      } catch {
        try {
          await vaultSignUp(name, password);
        } catch {
          /* local cache is optional when the server session is live */
        }
      }
      await refreshRemoteSession();
      return;
    }
  }

  await vaultSignIn(name, password);
  bumpAccount();
}

export async function signUpUsername(username: string, password: string) {
  const name = cleanUsername(username);
  if (name.length < 2) throw new Error("Username needs at least 2 characters");
  if (!password) throw new Error("Enter a password");
  await ensureLocalMaster();

  if (!spa()) {
    const { error } = await authClient.signUp.email({
      email: usernameToEmail(name),
      password: credentialPassword(password),
      name,
    });
    if (error) {
      const msg = error.message || "Could not create the account";
      if (!/already|exist/i.test(msg)) throw new Error(msg);
    } else {
      try {
        await vaultSignUp(name, password);
      } catch {
        /* already cached */
      }
      await refreshRemoteSession();
      return;
    }
  }

  await vaultSignUp(name, password);
  bumpAccount();
}

export async function signOutAccount() {
  const { tickets } = useBook.getState();
  const session = (await import("./vault")).getVaultSession();
  if (session) saveVaultTickets(session.username, tickets);
  vaultSignOut();
  if (!spa()) {
    try {
      const { signOut } = await import("@/lib/auth/client");
      await signOut("/");
      return;
    } catch {
      /* fall through */
    }
  }
  bumpAccount();
  window.location.href = "/";
}
