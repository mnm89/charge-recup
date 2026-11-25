import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies, type UnsafeUnwrappedCookies } from 'next/headers';

/*
 * Accès staff : un mot de passe unique (STAFF_PASSWORD) donne un cookie signé.
 * Les joueurs n'ont pas de compte : ils ouvrent le lien et répondent.
 */

export const COOKIE = 'cr_staff';
export const MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET manquant ou trop court (16 caractères minimum).');
  }
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createToken(): string {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return `${exp}.${sign(exp)}`;
}

export function verifyToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  const expiry = Number(exp);
  if (!Number.isFinite(expiry) || expiry < Date.now() / 1000) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function checkPassword(input: string): boolean {
  const pw = process.env.STAFF_PASSWORD;
  if (!pw) return false;
  const h = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(h(input), h(pw));
}

/** Vrai si la requête courante porte un cookie staff valide. */
export function isStaff(): boolean {
  return verifyToken((/* @next-codemod-error Await this API and update its callers; remove the temporary UnsafeUnwrappedCookies cast after repairing the migration. */
  cookies() as unknown as UnsafeUnwrappedCookies).get(COOKIE)?.value);
}
