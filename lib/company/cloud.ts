import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { canUseFirestore, getFirebaseFirestore } from "@/lib/firebase/firestore";
import { normalizeEmail } from "@/lib/company/email";
import { normalizeJoinCode } from "@/lib/company/join-code";
import {
  joinCodeIsCurrent,
  privateCompanyPayload,
  publishedSchedulePayload,
  rosterPayload,
} from "@/lib/security/policy";
import {
  decideBooking,
  decideCancellation,
  decideConfirmation,
  openingFromShift,
  openingWrite,
  readOpening,
  signupDocumentId,
  MAX_TRACKED_SHIFTS,
  type BookedSignup,
  type HeldShift,
  type ShiftWriteResult,
} from "@/lib/shifts/booking";
import type {
  Company,
  CompanyMembership,
  HoursEntry,
  Shift,
  ShiftSignup,
  ShiftTemplate,
  User,
} from "@/types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function isPermissionDenied(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  const code = String((error as { code?: string }).code);
  return code === "permission-denied" || code === "permission_denied";
}

function isoFromMillis(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === "string" && value) return value;
  return undefined;
}

function stamp(value: unknown): string {
  if (typeof value === "string" && value) return value;
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
}

export async function loadMembershipRemote(
  userId: string | null | undefined,
): Promise<CompanyMembership | null> {
  if (!userId || !canUseFirestore()) return null;
  try {
    const snap = await getDoc(doc(getFirebaseFirestore(), "memberships", userId));
    if (!snap.exists()) return null;
    const data = snap.data();
    const role = data.role === "ADMIN" || data.role === "EMPLOYEE" ? data.role : null;
    if (!role || typeof data.companyId !== "string" || typeof data.employeeId !== "string") {
      return null;
    }
    return {
      userId: typeof data.userId === "string" ? data.userId : userId,
      companyId: data.companyId,
      employeeId: data.employeeId,
      role,
    };
  } catch {
    return null;
  }
}

export async function loadCompanyIdForOwnerRemote(
  ownerId: string | null | undefined,
): Promise<string | null> {
  if (!ownerId || !canUseFirestore()) return null;
  try {
    const snap = await getDoc(doc(getFirebaseFirestore(), "owners", ownerId));
    if (!snap.exists()) return null;
    const companyId = snap.data()?.companyId;
    return typeof companyId === "string" ? companyId : null;
  } catch {
    return null;
  }
}

export async function loadCompanyIdForEmailRemote(
  email: string | null | undefined,
): Promise<string | null> {
  if (!canUseFirestore()) return null;
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  try {
    const snap = await getDoc(doc(getFirebaseFirestore(), "emails", normalized));
    if (!snap.exists()) return null;
    const companyId = snap.data()?.companyId;
    return typeof companyId === "string" ? companyId : null;
  } catch {
    return null;
  }
}

export async function loadCompanyIdForJoinCodeRemote(code: string): Promise<string | null> {
  if (!canUseFirestore()) return null;
  const normalized = normalizeJoinCode(code);
  if (normalized.length < 10) return null;
  try {
    const snap = await getDoc(doc(getFirebaseFirestore(), "joinCodes", normalized));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!joinCodeIsCurrent(normalized, typeof data.expiresAt === "number" ? data.expiresAt : null)) {
      return null;
    }
    return typeof data.companyId === "string" ? data.companyId : null;
  } catch {
    return null;
  }
}

function userFromRoster(data: Record<string, unknown>, email = ""): User {
  return {
    id: asString(data.id),
    name: asString(data.name, "Employee"),
    email,
    role: "EMPLOYEE",
    companyId: asString(data.companyId),
    createdAt: asString(data.createdAt, new Date().toISOString()),
  };
}

function signupFromDoc(id: string, data: Record<string, unknown>): ShiftSignup {
  return {
    id,
    shiftId: asString(data.shiftId),
    employeeId: asString(data.employeeId),
    status: data.status === "CONFIRMED" ? "CONFIRMED" : "SELECTED",
    selectedAt: asString(data.selectedAt, new Date().toISOString()),
    confirmedAt: typeof data.confirmedAt === "string" ? data.confirmedAt : null,
  };
}

function hoursFromDoc(id: string, data: Record<string, unknown>): HoursEntry {
  return {
    id,
    shiftId: asString(data.shiftId),
    employeeId: asString(data.employeeId),
    startTime: asString(data.startTime),
    endTime: asString(data.endTime),
    note: typeof data.note === "string" && data.note ? data.note : null,
    status: "SUBMITTED",
    submittedAt: asString(data.submittedAt, new Date().toISOString()),
  };
}

function asShifts(value: unknown): Shift[] {
  if (!Array.isArray(value)) return [];
  return clone(value) as Shift[];
}

function asTemplates(value: unknown): ShiftTemplate[] {
  if (!Array.isArray(value)) return [];
  return clone(value) as ShiftTemplate[];
}

function profileIsLegacy(data: Record<string, unknown>): boolean {
  return (
    "employees" in data ||
    "signups" in data ||
    "hours" in data ||
    "shifts" in data ||
    !joinCodeIsCurrent(
      asString(data.joinCode),
      typeof data.joinCodeExpiresAt === "number" ? data.joinCodeExpiresAt : null,
    )
  );
}

export type ManagerLoad = {
  company: Company;
  legacy: boolean;
};

function companyFromParts(input: {
  companyId: string;
  profile: Record<string, unknown> | null;
  schedule: Record<string, unknown> | null;
  roster: User[];
  signups: ShiftSignup[];
  hours: HoursEntry[];
  legacyEmployees?: User[];
}): Company {
  const profile = input.profile ?? {};
  const schedule = input.schedule ?? {};
  const employees = input.roster.length > 0 ? input.roster : (input.legacyEmployees ?? []);
  return {
    id: input.companyId,
    ownerId: asString(profile.ownerId),
    joinCode: asString(profile.joinCode),
    joinCodeExpiresAt: isoFromMillis(profile.joinCodeExpiresAt),
    companyName: asString(schedule.companyName, asString(profile.companyName, "Your team")),
    managerName: asString(profile.managerName),
    email: asString(profile.email),
    employeeCount:
      typeof profile.employeeCount === "number" ? profile.employeeCount : employees.length,
    shiftTemplates: asTemplates(schedule.shiftTemplates ?? profile.shiftTemplates),
    employees,
    shifts: asShifts(schedule.shifts ?? profile.shifts),
    signups: input.signups,
    hours: input.hours,
    setupCompletedAt: asString(profile.setupCompletedAt, new Date().toISOString()),
  };
}

export async function loadManagerCompanyRemote(
  companyId: string | null | undefined,
): Promise<ManagerLoad | null> {
  if (!companyId || !canUseFirestore()) return null;
  const db = getFirebaseFirestore();
  try {
    const profileSnap = await getDoc(doc(db, "companies", companyId));
    if (!profileSnap.exists()) return null;
    const profile = asRecord(profileSnap.data());
    if (asString(profile.ownerId) === "") return null;

    let scheduleSnap: Awaited<ReturnType<typeof getDoc>> | null = null;
    let rosterSnap: Awaited<ReturnType<typeof getDocs>> | null = null;
    let signupSnap: Awaited<ReturnType<typeof getDocs>> | null = null;
    let hoursSnap: Awaited<ReturnType<typeof getDocs>> | null = null;
    let directorySnap: Awaited<ReturnType<typeof getDocs>> | null = null;
    try {
      scheduleSnap = await getDoc(doc(db, "companies", companyId, "published", "schedule"));
      rosterSnap = await getDocs(collection(db, "companies", companyId, "roster"));
      signupSnap = await getDocs(collection(db, "companies", companyId, "signups"));
      hoursSnap = await getDocs(collection(db, "companies", companyId, "hours"));
      directorySnap = await getDocs(collection(db, "companies", companyId, "directory"));
    } catch {
      // Membership may not exist yet. The owner can still read the company document.
    }

    const emails = new Map<string, string>();
    directorySnap?.forEach((item) => {
      const email = asRecord(item.data()).email;
      if (typeof email === "string") emails.set(item.id, email);
    });

    const roster = (rosterSnap?.docs ?? []).map((item) =>
      userFromRoster(asRecord(item.data()), emails.get(item.id) ?? ""),
    );
    const legacyEmployees = Array.isArray(profile.employees)
      ? (clone(profile.employees) as User[])
      : [];

    return {
      legacy: profileIsLegacy(profile) || !scheduleSnap?.exists(),
      company: companyFromParts({
        companyId,
        profile,
        schedule: scheduleSnap?.exists() ? asRecord(scheduleSnap.data()) : null,
        roster,
        legacyEmployees,
        signups: (signupSnap?.docs ?? []).map((item) =>
          signupFromDoc(item.id, asRecord(item.data())),
        ),
        hours: (hoursSnap?.docs ?? []).map((item) => hoursFromDoc(item.id, asRecord(item.data()))),
      }),
    };
  } catch {
    return null;
  }
}

export async function loadEmployeeCompanyRemote(
  companyId: string,
  employeeId: string,
): Promise<Company | null> {
  if (!canUseFirestore()) return null;
  const db = getFirebaseFirestore();
  try {
    const scheduleSnap = await getDoc(doc(db, "companies", companyId, "published", "schedule"));
    const [rosterSnap, signupSnap, hoursSnap, directorySnap] = await Promise.all([
      getDocs(collection(db, "companies", companyId, "roster")),
      getDocs(collection(db, "companies", companyId, "signups")),
      getDocs(
        query(
          collection(db, "companies", companyId, "hours"),
          where("employeeId", "==", employeeId),
        ),
      ),
      getDoc(doc(db, "companies", companyId, "directory", employeeId)).catch(() => null),
    ]);

    const ownEmail =
      directorySnap && directorySnap.exists() && typeof directorySnap.data().email === "string"
        ? directorySnap.data().email
        : "";
    const roster = rosterSnap.docs.map((item) =>
      userFromRoster(asRecord(item.data()), item.id === employeeId ? ownEmail : ""),
    );

    return companyFromParts({
      companyId,
      profile: null,
      schedule: scheduleSnap.exists() ? asRecord(scheduleSnap.data()) : { companyName: "Your team" },
      roster,
      signups: signupSnap.docs.map((item) => signupFromDoc(item.id, asRecord(item.data()))),
      hours: hoursSnap.docs.map((item) => hoursFromDoc(item.id, asRecord(item.data()))),
    });
  } catch {
    return null;
  }
}

function privateDoc(company: Company): Record<string, unknown> {
  const payload = privateCompanyPayload(company);
  const count = Math.trunc(company.employeeCount);
  payload.employeeCount = Math.min(500, Math.max(1, Number.isFinite(count) && count > 0 ? count : 1));
  return clone(payload);
}

export async function createManagerWorkspaceRemote(
  company: Company,
  authEmail?: string | null,
): Promise<void> {
  if (!canUseFirestore()) return;
  const db = getFirebaseFirestore();
  const batch = writeBatch(db);
  const code = normalizeJoinCode(company.joinCode);
  batch.set(doc(db, "companies", company.id), privateDoc(company));
  batch.set(doc(db, "memberships", company.ownerId), {
    userId: company.ownerId,
    companyId: company.id,
    employeeId: `${company.id}_${company.ownerId}`,
    role: "ADMIN",
  });
  batch.set(
    doc(db, "companies", company.id, "published", "schedule"),
    clone(publishedSchedulePayload(company)),
  );
  batch.set(doc(db, "owners", company.ownerId), { companyId: company.id });
  const emailKey = normalizeEmail(authEmail ?? company.email);
  if (emailKey && emailKey === normalizeEmail(company.email)) {
    batch.set(doc(db, "emails", emailKey), { companyId: company.id });
  }
  batch.set(doc(db, "joinCodes", code), {
    companyId: company.id,
    expiresAt: Date.parse(company.joinCodeExpiresAt ?? ""),
  });
  await batch.commit();
  await writeRoster(company);
  await syncShiftOpeningsRemote(company.id, company.shifts, company.signups);
}

export async function ensureOwnerMembershipRemote(company: Company): Promise<void> {
  if (!canUseFirestore()) return;
  const db = getFirebaseFirestore();
  await setDoc(doc(db, "memberships", company.ownerId), {
    userId: company.ownerId,
    companyId: company.id,
    employeeId: `${company.id}_${company.ownerId}`,
    role: "ADMIN",
  });
}

export async function migrateManagerWorkspaceRemote(
  company: Company,
  previousJoinCode: string | null,
): Promise<void> {
  if (!canUseFirestore()) return;
  const db = getFirebaseFirestore();
  const code = normalizeJoinCode(company.joinCode);
  const previous = previousJoinCode ? normalizeJoinCode(previousJoinCode) : "";
  const batch = writeBatch(db);
  batch.set(doc(db, "companies", company.id), privateDoc(company));
  batch.set(
    doc(db, "companies", company.id, "published", "schedule"),
    clone(publishedSchedulePayload(company)),
  );
  await batch.commit();
  try {
    await setDoc(doc(db, "joinCodes", code), {
      companyId: company.id,
      expiresAt: Date.parse(company.joinCodeExpiresAt ?? ""),
    });
  } catch {
    // Join codes are create-only. A denied write means this code is already published.
  }
  await writeRoster(company);
  await writeDirectory(company);
  if (previous && previous !== code) {
    try {
      await deleteDoc(doc(db, "joinCodes", previous));
    } catch {
      // A missing or already removed code should not block the new one.
    }
  }
  await syncShiftOpeningsRemote(company.id, company.shifts, company.signups);
}

async function writeRoster(company: Company): Promise<void> {
  const db = getFirebaseFirestore();
  await Promise.all(
    company.employees.map(async (employee) => {
      const payload = rosterPayload(employee, company.id);
      if (!payload || payload.id !== employee.id) return;
      await setDoc(doc(db, "companies", company.id, "roster", employee.id), payload);
    }),
  );
}

async function writeDirectory(company: Company): Promise<void> {
  const db = getFirebaseFirestore();
  await Promise.all(
    company.employees.map(async (employee) => {
      const email = normalizeEmail(employee.email);
      if (!email.includes("@") || employee.role === "ADMIN") return;
      try {
        await setDoc(doc(db, "companies", company.id, "directory", employee.id), { email });
      } catch {
        // Placeholder addresses are not login emails and may be rejected.
      }
    }),
  );
}

export async function updatePublishedScheduleRemote(company: Company): Promise<void> {
  if (!canUseFirestore()) return;
  await setDoc(
    doc(getFirebaseFirestore(), "companies", company.id, "published", "schedule"),
    clone(publishedSchedulePayload(company)),
  );
  await syncShiftOpeningsRemote(company.id, company.shifts, company.signups);
}

export class JoinFailed extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JoinFailed";
  }
}

export async function joinCompanyRemote(input: {
  userId: string;
  code: string;
  name: string;
  email: string;
}): Promise<{ companyId: string; employeeId: string }> {
  if (!canUseFirestore()) {
    throw new JoinFailed("Firebase is not configured.");
  }
  const code = normalizeJoinCode(input.code);
  if (code.length < 10) {
    throw new JoinFailed("Enter the 10-character code from your manager.");
  }

  const owned = await loadCompanyIdForOwnerRemote(input.userId);
  if (owned) {
    throw new JoinFailed(
      "This Google account manages a company. Sign out and use a different account to join as an employee.",
    );
  }

  const existing = await loadMembershipRemote(input.userId);
  if (existing?.role === "ADMIN") {
    throw new JoinFailed(
      "This Google account manages a company. Sign out and use a different account to join as an employee.",
    );
  }
  if (existing?.role === "EMPLOYEE") {
    throw new JoinFailed("This account already joined a company.");
  }

  const companyId = await loadCompanyIdForJoinCodeRemote(code);
  if (!companyId) {
    throw new JoinFailed(
      "That code was not found. Check it with your manager, or ask them to open Zoreva if they just created it.",
    );
  }

  const db = getFirebaseFirestore();
  const employeeId = `${companyId}_${input.userId}`;
  const batch = writeBatch(db);
  batch.set(doc(db, "memberships", input.userId), {
    userId: input.userId,
    companyId,
    employeeId,
    role: "EMPLOYEE",
  });
  batch.set(doc(db, "joinReceipts", input.userId), {
    companyId,
    code,
    createdAt: Date.now(),
  });
  batch.set(doc(db, "companies", companyId, "roster", employeeId), {
    id: employeeId,
    name: input.name.trim().slice(0, 80) || "Employee",
    role: "EMPLOYEE",
    companyId,
    createdAt: new Date().toISOString(),
  });
  try {
    await batch.commit();
  } catch (error) {
    if (isPermissionDenied(error)) {
      throw new JoinFailed(
        "That code was not found. Check it with your manager, or ask them to open Zoreva if they just created it.",
      );
    }
    throw new JoinFailed("Could not join right now. Check your connection and try again.");
  }

  const email = normalizeEmail(input.email);
  if (email.includes("@")) {
    try {
      await setDoc(doc(db, "companies", companyId, "directory", employeeId), { email });
    } catch {
      // The membership is already saved. A directory mismatch should not undo the join.
    }
  }

  return { companyId, employeeId };
}

function remoteBookingError(error: unknown): { ok: false; reason: string } {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  if (
    code === "permission-denied" ||
    code === "aborted" ||
    code === "failed-precondition" ||
    code === "already-exists"
  ) {
    return {
      ok: false,
      reason: "This shift changed while you were booking. Look at the latest spots and try again.",
    };
  }
  return {
    ok: false,
    reason: "Could not save the shift. Check your connection and try again.",
  };
}

function asBookedSignup(id: string, data: Record<string, unknown>): BookedSignup {
  const signup = signupFromDoc(id, data);
  return {
    id: signup.id,
    shiftId: signup.shiftId,
    employeeId: signup.employeeId,
    status: signup.status,
    selectedAt: stamp(signup.selectedAt),
    confirmedAt: typeof signup.confirmedAt === "string" ? signup.confirmedAt : null,
  };
}

export async function syncShiftOpeningsRemote(
  companyId: string,
  shifts: Shift[],
  signups: { shiftId: string }[] = [],
): Promise<void> {
  if (!canUseFirestore() || shifts.length === 0) return;
  const db = getFirebaseFirestore();
  try {
    for (const shift of shifts) {
      if (!/^\d{2}:\d{2}$/.test(shift.startTime) || !/^\d{2}:\d{2}$/.test(shift.endTime)) {
        continue;
      }
      const ref = doc(db, "companies", companyId, "openings", shift.id);
      const knownTaken = signups.filter((signup) => signup.shiftId === shift.id).length;
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        if (!snap.exists()) {
          transaction.set(ref, openingWrite(openingFromShift(shift, knownTaken), ""));
          return;
        }
        const current = readOpening(shift.id, asRecord(snap.data()));
        const opening = openingFromShift(shift, current?.taken ?? 0);
        transaction.update(ref, {
          slots: opening.slots,
          date: opening.date,
          startTime: opening.startTime,
          endTime: opening.endTime,
          endAt: opening.endAt,
        });
      });
    }
  } catch {
    // A counter sync can be retried on the next schedule save. It must not undo company setup.
  }
}

function readClaimBookings(data: Record<string, unknown> | null): HeldShift[] | null {
  if (!data) return [];
  if (!Array.isArray(data.bookings)) return null;
  const bookings: HeldShift[] = [];
  for (const item of data.bookings) {
    const record = asRecord(item);
    const shiftId = asString(record.shiftId);
    const date = asString(record.date);
    const startTime = asString(record.startTime);
    const endTime = asString(record.endTime);
    if (!shiftId || !date || !startTime || !endTime) return null;
    bookings.push({ shiftId, date, startTime, endTime });
  }
  return bookings;
}

function ownsSignup(data: Record<string, unknown>, employeeId: string, shiftId: string): boolean {
  return asString(data.employeeId) === employeeId && asString(data.shiftId) === shiftId;
}

export async function bookShiftRemote(
  companyId: string,
  employeeId: string,
  shiftId: string,
  knownSignupIds: string[] = [],
): Promise<ShiftWriteResult> {
  if (!canUseFirestore()) {
    return remoteBookingError(new Error("offline"));
  }
  const signupId = signupDocumentId(employeeId, shiftId);
  if (!signupId) {
    return { ok: false, reason: "That shift is no longer available." };
  }
  if (knownSignupIds.length > MAX_TRACKED_SHIFTS) {
    return {
      ok: false,
      reason: "You have too many saved shifts to book another right now.",
    };
  }
  const db = getFirebaseFirestore();
  try {
    return await runTransaction(db, async (transaction) => {
      const openingRef = doc(db, "companies", companyId, "openings", shiftId);
      const signupRef = doc(db, "companies", companyId, "signups", signupId);
      const claimRef = doc(db, "companies", companyId, "claims", employeeId);
      const extraIds = [...new Set(knownSignupIds)].filter((id) => id && id !== signupId);
      const openingSnap = await transaction.get(openingRef);
      const signupSnap = await transaction.get(signupRef);
      const claimSnap = await transaction.get(claimRef);
      const extraSnaps = [];
      for (const id of extraIds) {
        extraSnaps.push(await transaction.get(doc(db, "companies", companyId, "signups", id)));
      }
      if (signupSnap.exists()) {
        return {
          ok: true as const,
          alreadyBooked: true,
          signup: asBookedSignup(signupSnap.id, asRecord(signupSnap.data())),
        };
      }
      for (const extra of extraSnaps) {
        if (!extra.exists()) continue;
        const data = asRecord(extra.data());
        if (!ownsSignup(data, employeeId, shiftId)) continue;
        return {
          ok: true as const,
          alreadyBooked: true,
          signup: asBookedSignup(extra.id, data),
        };
      }

      const claimed = readClaimBookings(claimSnap.exists() ? asRecord(claimSnap.data()) : null);
      if (!claimed || claimed.some((booking) => booking.shiftId === shiftId)) {
        return {
          ok: false as const,
          reason: "Could not check your other shifts. Try again.",
        };
      }
      const held: HeldShift[] = [...claimed];
      for (const extra of extraSnaps) {
        if (!extra.exists()) continue;
        const data = asRecord(extra.data());
        if (asString(data.employeeId) !== employeeId) continue;
        const otherShiftId = asString(data.shiftId);
        if (!otherShiftId || otherShiftId === shiftId || held.some((booking) => booking.shiftId === otherShiftId)) {
          continue;
        }
        const otherSnap = await transaction.get(
          doc(db, "companies", companyId, "openings", otherShiftId),
        );
        const other = readOpening(otherShiftId, otherSnap.exists() ? asRecord(otherSnap.data()) : null);
        if (!other) {
          return { ok: false as const, reason: "Could not check your other shifts. Try again." };
        }
        held.push({
          shiftId: other.shiftId,
          date: other.date,
          startTime: other.startTime,
          endTime: other.endTime,
        });
      }

      const opening = readOpening(shiftId, openingSnap.exists() ? asRecord(openingSnap.data()) : null);
      const decision = decideBooking({
        companyId,
        memberCompanyId: companyId,
        employeeId,
        memberEmployeeId: employeeId,
        shiftId,
        now: Date.now(),
        opening,
        signupExists: false,
        held,
      });
      if (!decision.ok || !opening) {
        return {
          ok: false as const,
          reason: decision.ok ? "That shift is not open for booking yet." : decision.reason,
        };
      }

      const signup: BookedSignup = {
        id: decision.signupId,
        shiftId,
        employeeId,
        status: "SELECTED",
        selectedAt: decision.selectedAt,
        confirmedAt: null,
      };
      transaction.update(openingRef, {
        taken: decision.taken,
        heldSignupId: decision.signupId,
      });
      transaction.set(signupRef, {
        shiftId,
        employeeId,
        status: "SELECTED",
        selectedAt: decision.selectedAt,
        confirmedAt: null,
      });
      transaction.set(claimRef, {
        employeeId,
        bookings: [
          ...claimed,
          {
            shiftId: opening.shiftId,
            date: opening.date,
            startTime: opening.startTime,
            endTime: opening.endTime,
          },
        ],
      });
      return { ok: true as const, alreadyBooked: false, signup };
    });
  } catch (error) {
    return remoteBookingError(error);
  }
}

export async function cancelShiftRemote(
  companyId: string,
  employeeId: string,
  shiftId: string,
  knownSignupId?: string | null,
): Promise<ShiftWriteResult> {
  if (!canUseFirestore()) return remoteBookingError(new Error("offline"));
  const signupId = signupDocumentId(employeeId, shiftId);
  if (!signupId) return { ok: false, reason: "That shift is no longer available." };
  const db = getFirebaseFirestore();
  try {
    return await runTransaction(db, async (transaction) => {
      const openingRef = doc(db, "companies", companyId, "openings", shiftId);
      const signupRef = doc(db, "companies", companyId, "signups", signupId);
      const claimRef = doc(db, "companies", companyId, "claims", employeeId);
      const knownRef =
        knownSignupId && knownSignupId !== signupId
          ? doc(db, "companies", companyId, "signups", knownSignupId)
          : null;
      const openingSnap = await transaction.get(openingRef);
      const signupSnap = await transaction.get(signupRef);
      const claimSnap = await transaction.get(claimRef);
      const knownSnap = knownRef ? await transaction.get(knownRef) : null;
      const match = signupSnap.exists()
        ? signupSnap
        : knownSnap?.exists() && ownsSignup(asRecord(knownSnap.data()), employeeId, shiftId)
          ? knownSnap
          : null;
      const opening = readOpening(shiftId, openingSnap.exists() ? asRecord(openingSnap.data()) : null);
      const decision = decideCancellation({
        companyId,
        memberCompanyId: companyId,
        employeeId,
        memberEmployeeId: employeeId,
        shiftId,
        now: Date.now(),
        opening,
        signupExists: Boolean(match),
      });
      if (!decision.ok) return { ok: false as const, reason: decision.reason };
      if (decision.alreadyCancelled || !match) {
        return { ok: true as const, alreadyCancelled: true, signup: null };
      }
      if (match.id === signupId) {
        const claimed = readClaimBookings(claimSnap.exists() ? asRecord(claimSnap.data()) : null);
        if (!claimed) {
          return { ok: false as const, reason: "Could not update that shift. Try again." };
        }
        const bookings = claimed.filter((booking) => booking.shiftId !== shiftId);
        if (bookings.length + 1 !== claimed.length) {
          return { ok: false as const, reason: "Could not update that shift. Try again." };
        }
        transaction.set(claimRef, { employeeId, bookings });
      }
      transaction.update(openingRef, {
        taken: decision.taken,
        heldSignupId: match.id,
      });
      transaction.delete(match.ref);
      return { ok: true as const, alreadyCancelled: false, signup: null };
    });
  } catch (error) {
    return remoteBookingError(error);
  }
}

export async function confirmShiftRemote(
  companyId: string,
  employeeId: string,
  shiftId: string,
  knownSignupId?: string | null,
): Promise<ShiftWriteResult> {
  if (!canUseFirestore()) return remoteBookingError(new Error("offline"));
  const signupId = signupDocumentId(employeeId, shiftId);
  if (!signupId) return { ok: false, reason: "That shift is no longer available." };
  const db = getFirebaseFirestore();
  try {
    return await runTransaction(db, async (transaction) => {
      const signupRef = doc(db, "companies", companyId, "signups", signupId);
      const knownRef =
        knownSignupId && knownSignupId !== signupId
          ? doc(db, "companies", companyId, "signups", knownSignupId)
          : null;
      const openingSnap = await transaction.get(doc(db, "companies", companyId, "openings", shiftId));
      const signupSnap = await transaction.get(signupRef);
      const knownSnap = knownRef ? await transaction.get(knownRef) : null;
      const match = signupSnap.exists()
        ? signupSnap
        : knownSnap?.exists() && ownsSignup(asRecord(knownSnap.data()), employeeId, shiftId)
          ? knownSnap
          : null;
      const signup = match ? asBookedSignup(match.id, asRecord(match.data())) : null;
      const decision = decideConfirmation({
        companyId,
        memberCompanyId: companyId,
        employeeId,
        memberEmployeeId: employeeId,
        now: Date.now(),
        opening: readOpening(shiftId, openingSnap.exists() ? asRecord(openingSnap.data()) : null),
        signup,
      });
      if (!decision.ok) return { ok: false as const, reason: decision.reason };
      if (!match || !signup || decision.alreadyConfirmed) {
        return { ok: true as const, signup };
      }
      const confirmedAt = new Date().toISOString();
      transaction.update(match.ref, {
        status: "CONFIRMED",
        confirmedAt,
      });
      return {
        ok: true as const,
        signup: { ...signup, status: "CONFIRMED", confirmedAt },
      };
    });
  } catch (error) {
    return remoteBookingError(error);
  }
}

function hoursPayload(entry: HoursEntry): Record<string, unknown> {
  return {
    shiftId: entry.shiftId,
    employeeId: entry.employeeId,
    startTime: entry.startTime,
    endTime: entry.endTime,
    note: entry.note?.trim() ?? "",
    status: "SUBMITTED",
    submittedAt: stamp(entry.submittedAt),
  };
}

export async function syncEmployeeActivityRemote(
  companyId: string,
  employeeId: string,
  previous: { signups: ShiftSignup[]; hours: HoursEntry[] },
  next: { signups: ShiftSignup[]; hours: HoursEntry[] },
): Promise<void> {
  if (!canUseFirestore()) return;
  // Signup writes go through bookShiftRemote, confirmShiftRemote, and cancelShiftRemote
  // so a timed-out retry cannot create a second assignment.
  const db = getFirebaseFirestore();
  const previousHours = new Set(
    previous.hours.filter((entry) => entry.employeeId === employeeId).map((entry) => entry.id),
  );
  for (const entry of next.hours) {
    if (entry.employeeId !== employeeId || previousHours.has(entry.id)) continue;
    await setDoc(doc(db, "companies", companyId, "hours", entry.id), hoursPayload(entry));
  }
}

type WatchParts = {
  profile: Record<string, unknown> | null;
  schedule: Record<string, unknown> | null;
  roster: User[];
  signups: ShiftSignup[];
  hours: HoursEntry[];
  emails: Map<string, string>;
};

export function watchManagerWorkspace(
  companyId: string,
  onCompany: (company: Company) => void,
): Unsubscribe | null {
  if (!canUseFirestore()) return null;
  const db = getFirebaseFirestore();
  const parts: WatchParts = {
    profile: null,
    schedule: null,
    roster: [],
    signups: [],
    hours: [],
    emails: new Map(),
  };

  const emit = () => {
    if (!parts.profile) return;
    const roster = parts.roster.map((employee) => ({
      ...employee,
      email: parts.emails.get(employee.id) ?? employee.email,
    }));
    onCompany(
      companyFromParts({
        companyId,
        profile: parts.profile,
        schedule: parts.schedule,
        roster,
        signups: parts.signups,
        hours: parts.hours,
      }),
    );
  };

  const unsubs = [
    onSnapshot(
      doc(db, "companies", companyId),
      (snap) => {
        if (!snap.exists()) return;
        parts.profile = asRecord(snap.data());
        emit();
      },
      () => undefined,
    ),
    onSnapshot(
      doc(db, "companies", companyId, "published", "schedule"),
      (snap) => {
        parts.schedule = snap.exists() ? asRecord(snap.data()) : null;
        emit();
      },
      () => undefined,
    ),
    onSnapshot(
      collection(db, "companies", companyId, "roster"),
      (snap) => {
        parts.roster = snap.docs.map((item) => userFromRoster(asRecord(item.data())));
        emit();
      },
      () => undefined,
    ),
    onSnapshot(
      collection(db, "companies", companyId, "signups"),
      (snap) => {
        parts.signups = snap.docs.map((item) => signupFromDoc(item.id, asRecord(item.data())));
        emit();
      },
      () => undefined,
    ),
    onSnapshot(
      collection(db, "companies", companyId, "hours"),
      (snap) => {
        parts.hours = snap.docs.map((item) => hoursFromDoc(item.id, asRecord(item.data())));
        emit();
      },
      () => undefined,
    ),
    onSnapshot(
      collection(db, "companies", companyId, "directory"),
      (snap) => {
        parts.emails = new Map();
        snap.forEach((item) => {
          const email = item.data().email;
          if (typeof email === "string") parts.emails.set(item.id, email);
        });
        emit();
      },
      () => undefined,
    ),
  ];

  return () => {
    unsubs.forEach((stop) => stop());
  };
}

export function watchEmployeeWorkspace(
  companyId: string,
  employeeId: string,
  onCompany: (company: Company) => void,
): Unsubscribe | null {
  if (!canUseFirestore()) return null;
  const db = getFirebaseFirestore();
  const parts: WatchParts = {
    profile: null,
    schedule: null,
    roster: [],
    signups: [],
    hours: [],
    emails: new Map(),
  };

  const emit = () => {
    if (!parts.schedule) return;
    onCompany(
      companyFromParts({
        companyId,
        profile: null,
        schedule: parts.schedule,
        roster: parts.roster.map((employee) => ({
          ...employee,
          email: employee.id === employeeId ? (parts.emails.get(employee.id) ?? "") : "",
        })),
        signups: parts.signups,
        hours: parts.hours.filter((entry) => entry.employeeId === employeeId),
      }),
    );
  };

  const unsubs = [
    onSnapshot(
      doc(db, "companies", companyId, "published", "schedule"),
      (snap) => {
        if (!snap.exists()) return;
        parts.schedule = asRecord(snap.data());
        emit();
      },
      () => undefined,
    ),
    onSnapshot(
      collection(db, "companies", companyId, "roster"),
      (snap) => {
        parts.roster = snap.docs.map((item) => userFromRoster(asRecord(item.data())));
        emit();
      },
      () => undefined,
    ),
    onSnapshot(
      collection(db, "companies", companyId, "signups"),
      (snap) => {
        parts.signups = snap.docs.map((item) => signupFromDoc(item.id, asRecord(item.data())));
        emit();
      },
      () => undefined,
    ),
    onSnapshot(
      query(
        collection(db, "companies", companyId, "hours"),
        where("employeeId", "==", employeeId),
      ),
      (snap) => {
        parts.hours = snap.docs.map((item) => hoursFromDoc(item.id, asRecord(item.data())));
        emit();
      },
      () => undefined,
    ),
    onSnapshot(
      doc(db, "companies", companyId, "directory", employeeId),
      (snap) => {
        if (snap.exists() && typeof snap.data().email === "string") {
          parts.emails.set(employeeId, snap.data().email);
        }
        emit();
      },
      () => undefined,
    ),
  ];

  return () => {
    unsubs.forEach((stop) => stop());
  };
}
