// Gate for /admin/*: requires a shared passphrase (ADMIN_ACCESS_KEY) on top of
// normal SKKU login, so any logged-in student can't reach the scholarship
// auto-register tool. Uses Web Crypto (available in both Node and the Edge
// middleware runtime) instead of Node's crypto module.
export const ADMIN_COOKIE_NAME = "admin_unlocked";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The cookie value that proves the correct key was entered, derived from the
 * server-side secret so the plaintext key never has to be stored client-side. */
export async function computeAdminCookieValue(): Promise<string | null> {
  const key = process.env.ADMIN_ACCESS_KEY;
  if (!key) return null;
  return sha256Hex(key);
}

export function isAdminAccessKeyConfigured(): boolean {
  return Boolean(process.env.ADMIN_ACCESS_KEY);
}

export function isCorrectAdminKey(candidate: string): boolean {
  return Boolean(process.env.ADMIN_ACCESS_KEY) && candidate === process.env.ADMIN_ACCESS_KEY;
}
