import { decodeProtectedHeader, importX509, jwtVerify } from "jose";

const CERT_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let cachedCerts: { expiresAt: number; certs: Record<string, string> } | null = null;

async function loadCerts(): Promise<Record<string, string>> {
  if (cachedCerts && cachedCerts.expiresAt > Date.now()) return cachedCerts.certs;
  const response = await fetch(CERT_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not verify sign-in.");
  const certs = (await response.json()) as Record<string, string>;
  const maxAge = Number(response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ?? 3600);
  cachedCerts = {
    certs,
    expiresAt: Date.now() + Math.min(maxAge, 3600) * 1000,
  };
  return certs;
}

export async function verifyFirebaseIdToken(
  token: string,
  projectId: string,
): Promise<{ uid: string; email: string | null }> {
  if (!projectId || token.split(".").length !== 3) {
    throw new Error("Sign in is required.");
  }

  const header = decodeProtectedHeader(token);
  const kid = typeof header.kid === "string" ? header.kid : "";
  const pem = kid ? (await loadCerts())[kid] : undefined;
  if (!pem) throw new Error("Sign in is required.");

  const key = await importX509(pem, "RS256");
  const { payload } = await jwtVerify(token, key, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  const uid = typeof payload.sub === "string" ? payload.sub : "";
  if (!uid || payload.user_id !== uid) throw new Error("Sign in is required.");

  return {
    uid,
    email: typeof payload.email === "string" ? payload.email : null,
  };
}
