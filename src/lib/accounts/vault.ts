import {
  MASTER_USERNAME,
  cleanUsername,
  credentialPassword,
  isMasterName,
} from "./identity";
import type { Ticket } from "@/lib/bets/types";
import type { SharedSlip } from "@/lib/bets/share";

const KEY = "slate-vault-v1";

export type VaultUser = {
  id: string;
  username: string;
  pass: string;
  createdAt: number;
  tickets: Ticket[];
};

export type BugNote = {
  id: string;
  userId: string;
  username: string;
  title: string;
  body: string;
  path?: string;
  createdAt: number;
};

type Vault = {
  users: VaultUser[];
  session: { username: string } | null;
  bugs: BugNote[];
  shares: SharedSlip[];
};

const empty = (): Vault => ({ users: [], session: null, bugs: [], shares: [] });

function read(): Vault {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Vault;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      session: parsed.session ?? null,
      bugs: Array.isArray(parsed.bugs) ? parsed.bugs : [],
      shares: Array.isArray(parsed.shares) ? parsed.shares : [],
    };
  } catch {
    return empty();
  }
}

function write(v: Vault) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(v));
}

async function digest(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`slate:${value}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function listVaultUsers() {
  return read().users.map(({ pass: _p, ...u }) => u);
}

export function getVaultSession() {
  const v = read();
  if (!v.session) return null;
  return v.users.find((u) => u.username === v.session?.username) ?? null;
}

export async function vaultSignUp(username: string, password: string) {
  const name = cleanUsername(username);
  if (name.length < 2) throw new Error("Username needs at least 2 characters");
  if (!password) throw new Error("Enter a password");
  const v = read();
  if (v.users.some((u) => u.username === name)) throw new Error("That username is taken");
  const user: VaultUser = {
    id: `loc_${name}`,
    username: name,
    pass: await digest(credentialPassword(password)),
    createdAt: Date.now(),
    tickets: [],
  };
  v.users.push(user);
  v.session = { username: name };
  write(v);
  return user;
}

export async function vaultSignIn(username: string, password: string) {
  const name = cleanUsername(username);
  const v = read();
  const user = v.users.find((u) => u.username === name);
  if (!user) throw new Error("No account with that username");
  const ok = user.pass === (await digest(credentialPassword(password)));
  if (!ok) throw new Error("Wrong password");
  v.session = { username: name };
  write(v);
  return user;
}

export function vaultSignOut() {
  const v = read();
  v.session = null;
  write(v);
}

export function saveVaultTickets(username: string, tickets: Ticket[]) {
  const v = read();
  const user = v.users.find((u) => u.username === username);
  if (!user) return;
  user.tickets = tickets;
  write(v);
}

export function addVaultBug(note: Omit<BugNote, "id" | "createdAt">) {
  const v = read();
  const row: BugNote = { ...note, id: `bug_${Date.now()}`, createdAt: Date.now() };
  v.bugs.unshift(row);
  write(v);
  return row;
}

export function listVaultBugs() {
  return read().bugs;
}

export function saveVaultShare(slip: SharedSlip) {
  const v = read();
  v.shares = [slip, ...v.shares.filter((s) => s.id !== slip.id)].slice(0, 80);
  write(v);
}

export function readVaultShare(id: string) {
  return read().shares.find((s) => s.id === id) ?? null;
}

export async function ensureLocalMaster() {
  const v = read();
  if (v.users.some((u) => isMasterName(u.username))) return;
  v.users.push({
    id: `loc_${MASTER_USERNAME}`,
    username: MASTER_USERNAME,
    pass: await digest(credentialPassword("12345")),
    createdAt: Date.now(),
    tickets: [],
  });
  write(v);
}
