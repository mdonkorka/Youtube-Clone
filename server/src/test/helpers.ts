import { prisma } from '../lib/prisma.js';

export interface ParsedCookie {
  value: string;
  [key: string]: string | undefined;
}

export async function truncateDb(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "refresh_tokens",
      "comments",
      "video_likes",
      "playlist_videos",
      "playlists",
      "system_playlists",
      "subscriptions",
      "videos",
      "channels",
      "users"
    CASCADE;
  `);
}

export function parseCookies(
  setCookieHeader: string | string[] | undefined
): Record<string, ParsedCookie> {
  const cookies: Record<string, ParsedCookie> = {};
  if (!setCookieHeader) return cookies;

  const headerArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const str of headerArray) {
    const parts = str.split(';').map((p) => p.trim());
    const main = parts[0];
    if (!main) continue;
    const flags = parts.slice(1);
    const eqIdx = main.indexOf('=');
    if (eqIdx === -1) continue;
    const name = main.slice(0, eqIdx);
    const value = main.slice(eqIdx + 1);

    const cookieObj: ParsedCookie = { value };
    for (const flag of flags) {
      const fEq = flag.indexOf('=');
      if (fEq === -1) {
        cookieObj[flag.toLowerCase()] = 'true';
      } else {
        const flagName = flag.slice(0, fEq).toLowerCase();
        const flagVal = flag.slice(fEq + 1);
        cookieObj[flagName] = flagVal;
      }
    }
    cookies[name] = cookieObj;
  }
  return cookies;
}

