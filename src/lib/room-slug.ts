/**
 * First path segments that belong to the app, so they can't be used as room slugs.
 * Kept free of server imports because the proxy uses it too.
 */
export const RESERVED_SLUGS = ['api', 'auth', 'admin', 'dashboard', 'display', 'setup'];

/**
 * Build a URL-safe slug from the part of an email before @
 * e.g. "Nikita.S@gmail.com" -> "nikita-s"
 */
export function slugFromEmail(email: string): string {
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return base || 'room';
}
