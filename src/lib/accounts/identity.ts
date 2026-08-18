/** Username lives in Better Auth as name + a reserved email. */

export const MASTER_USERNAME = "sean";
export const EMAIL_DOMAIN = "slate.book";

export function usernameToEmail(username: string) {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${clean}@${EMAIL_DOMAIN}`;
}

export function emailToUsername(email?: string | null, name?: string | null) {
  if (name?.trim()) return name.trim();
  if (!email) return "";
  const local = email.split("@")[0] ?? "";
  return local;
}

export function isMasterName(username?: string | null, email?: string | null) {
  const u = (username || "").trim().toLowerCase();
  const e = (email || "").trim().toLowerCase();
  return u === MASTER_USERNAME || e === usernameToEmail(MASTER_USERNAME);
}

/** Better Auth rejects passwords under 8. Pad short ones the same way on sign-in and sign-up. */
export function credentialPassword(password: string) {
  const p = password.normalize();
  return p.length >= 8 ? p : `${p}!slate`;
}

export function cleanUsername(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}
