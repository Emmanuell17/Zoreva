const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateJoinCode(length = 6): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

export function normalizeJoinCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatJoinCode(value: string): string {
  const code = normalizeJoinCode(value);
  if (code.length === 6) return `${code.slice(0, 3)}-${code.slice(3)}`;
  return code;
}

export function joinPathForCode(value: string): string {
  return `/join/${normalizeJoinCode(value)}`;
}

export function inviteUrlForCode(value: string, origin?: string): string {
  const path = joinPathForCode(value);
  if (origin) return `${origin.replace(/\/$/, "")}${path}`;
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  return path;
}

export function isJoinPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return path === "/join" || path.startsWith("/join/");
}

export function joinCodeFromPath(path: string | null | undefined): string {
  if (!path) return "";
  const match = path.match(/^\/join\/([^/?#]+)/);
  return match ? normalizeJoinCode(decodeURIComponent(match[1])) : "";
}
