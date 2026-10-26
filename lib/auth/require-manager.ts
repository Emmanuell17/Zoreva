import type { CompanyMembership } from "@/types";
import { readFirestoreDocument } from "@/lib/auth/firestore-rest";
import { verifyFirebaseIdToken } from "@/lib/auth/verify-id-token";
import { decideManagerAccess } from "@/lib/security/policy";

export type ManagerAccess = {
  uid: string;
  companyId: string;
};

export type AuthIo = {
  projectId: string;
  verify: (token: string, projectId: string) => Promise<{ uid: string; email: string | null }>;
  readDocument: (
    path: string,
    token: string,
    projectId: string,
  ) => Promise<Record<string, unknown> | null>;
};

export type AuthResult =
  | { ok: true; access: ManagerAccess }
  | { ok: false; status: number; error: string };

export function readBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

function membershipFromDocument(
  data: Record<string, unknown> | null,
): CompanyMembership | null {
  if (!data) return null;
  const role = data.role === "ADMIN" || data.role === "EMPLOYEE" ? data.role : null;
  if (!role || typeof data.companyId !== "string" || typeof data.employeeId !== "string") {
    return null;
  }
  const userId = typeof data.userId === "string" ? data.userId : "";
  return {
    userId,
    companyId: data.companyId,
    employeeId: data.employeeId,
    role,
  };
}

/**
 * The browser role and company id are ignored. Membership and ownership
 * come from documents read with the caller's own Firebase token.
 */
export async function authorizeManager(
  authorizationHeader: string | null,
  io: AuthIo,
): Promise<AuthResult> {
  const token = readBearerToken(authorizationHeader);
  if (!token) return { ok: false, status: 401, error: "Sign in is required." };
  if (!io.projectId) return { ok: false, status: 503, error: "Firebase is not configured." };

  let uid = "";
  try {
    uid = (await io.verify(token, io.projectId)).uid;
  } catch {
    return { ok: false, status: 401, error: "Sign in is required." };
  }
  if (!uid) return { ok: false, status: 401, error: "Sign in is required." };

  let membershipDoc: Record<string, unknown> | null = null;
  let companyDoc: Record<string, unknown> | null = null;
  try {
    membershipDoc = await io.readDocument(`memberships/${uid}`, token, io.projectId);
    const companyId =
      typeof membershipDoc?.companyId === "string" ? membershipDoc.companyId : "";
    companyDoc = companyId
      ? await io.readDocument(`companies/${companyId}`, token, io.projectId)
      : null;
  } catch {
    return { ok: false, status: 503, error: "Could not verify company access." };
  }

  const membership = membershipFromDocument(membershipDoc);
  const companyId = membership?.companyId ?? "";
  const storedCompanyId = typeof companyDoc?.id === "string" ? companyDoc.id : companyId;
  const decision = decideManagerAccess({
    uid,
    membership,
    companyId: companyDoc ? storedCompanyId : null,
    companyOwnerId: typeof companyDoc?.ownerId === "string" ? companyDoc.ownerId : null,
  });
  if (!decision.ok || !membership) {
    return {
      ok: false,
      status: 403,
      error: decision.ok ? "You do not have access to this company." : decision.reason,
    };
  }

  return { ok: true, access: { uid, companyId: membership.companyId } };
}

export function firebaseProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    ""
  );
}

export async function requireManager(request: Request): Promise<AuthResult> {
  return authorizeManager(request.headers.get("authorization"), {
    projectId: firebaseProjectId(),
    verify: verifyFirebaseIdToken,
    readDocument: readFirestoreDocument,
  });
}
