import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { canUseFirestore, getFirebaseFirestore } from "@/lib/firebase/firestore";
import { normalizeJoinCode } from "@/lib/company/join-code";
import { normalizeEmail } from "@/lib/company/email";
import type { Company, CompanyMembership } from "@/types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function saveCompanyRemote(company: Company): Promise<void> {
  if (!canUseFirestore()) return;
  const db = getFirebaseFirestore();
  const payload = clone(company);
  const emailKey = normalizeEmail(company.email);
  await Promise.all([
    setDoc(doc(db, "companies", company.id), payload),
    setDoc(doc(db, "owners", company.ownerId), {
      companyId: company.id,
      email: emailKey,
    }),
    emailKey
      ? setDoc(doc(db, "emails", emailKey), {
          companyId: company.id,
          ownerId: company.ownerId,
        })
      : Promise.resolve(),
    setDoc(doc(db, "joinCodes", normalizeJoinCode(company.joinCode)), {
      companyId: company.id,
      ownerId: company.ownerId,
    }),
  ]);
}

export async function saveMembershipRemote(
  membership: CompanyMembership,
): Promise<void> {
  if (!canUseFirestore()) return;
  const db = getFirebaseFirestore();
  await setDoc(doc(db, "memberships", membership.userId), clone(membership));
}

export async function loadCompanyRemote(
  companyId: string | null | undefined,
): Promise<Company | null> {
  if (!companyId || !canUseFirestore()) return null;
  const snap = await getDoc(doc(getFirebaseFirestore(), "companies", companyId));
  return snap.exists() ? (snap.data() as Company) : null;
}

export async function loadCompanyIdForOwnerRemote(
  ownerId: string | null | undefined,
): Promise<string | null> {
  if (!ownerId || !canUseFirestore()) return null;
  const snap = await getDoc(doc(getFirebaseFirestore(), "owners", ownerId));
  if (!snap.exists()) return null;
  const companyId = snap.data()?.companyId;
  return typeof companyId === "string" ? companyId : null;
}

export async function loadCompanyIdForEmailRemote(
  email: string | null | undefined,
): Promise<string | null> {
  if (!canUseFirestore()) return null;
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const db = getFirebaseFirestore();
  const byKey = await getDoc(doc(db, "emails", normalized));
  if (byKey.exists()) {
    const companyId = byKey.data()?.companyId;
    if (typeof companyId === "string") return companyId;
  }

  try {
    const snapshots = await getDocs(
      query(collection(db, "companies"), where("email", "==", normalized), limit(1)),
    );
    if (!snapshots.empty) return snapshots.docs[0].id;

    const original = (email ?? "").trim();
    if (original && original !== normalized) {
      const mixed = await getDocs(
        query(collection(db, "companies"), where("email", "==", original), limit(1)),
      );
      if (!mixed.empty) return mixed.docs[0].id;
    }
  } catch {
    return null;
  }

  return null;
}

export async function loadCompanyIdForJoinCodeRemote(
  code: string,
): Promise<string | null> {
  if (!canUseFirestore()) return null;
  const normalized = normalizeJoinCode(code);
  if (!normalized) return null;
  const snap = await getDoc(doc(getFirebaseFirestore(), "joinCodes", normalized));
  if (!snap.exists()) return null;
  const companyId = snap.data()?.companyId;
  return typeof companyId === "string" ? companyId : null;
}

export async function loadMembershipRemote(
  userId: string | null | undefined,
): Promise<CompanyMembership | null> {
  if (!userId || !canUseFirestore()) return null;
  const snap = await getDoc(doc(getFirebaseFirestore(), "memberships", userId));
  return snap.exists() ? (snap.data() as CompanyMembership) : null;
}

export function watchCompanyRemote(
  companyId: string,
  onCompany: (company: Company) => void,
): Unsubscribe | null {
  if (!canUseFirestore()) return null;
  return onSnapshot(doc(getFirebaseFirestore(), "companies", companyId), (snap) => {
    if (!snap.exists()) return;
    onCompany(snap.data() as Company);
  });
}
