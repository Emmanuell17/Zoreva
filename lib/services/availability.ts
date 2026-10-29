import {
  deleteAvailabilityRemote,
  deleteTimeOffRemote,
  saveAvailabilityRemote,
  saveTimeOffRemote,
} from "@/lib/company/cloud";
import { getBookingSession, getActiveCompany, updateStaffing } from "@/lib/company/store";
import { canUseFirestore } from "@/lib/firebase/firestore";
import { canEditOwnAvailability, canReviewTimeOff } from "@/lib/security/policy";
import {
  prepareAvailabilityWindow,
  prepareTimeOffRequest,
  reviewTimeOffRequest,
  withAvailability,
  withTimeOff,
  withoutAvailability,
  withoutPendingTimeOff,
} from "@/lib/availability/flow";
import type { TimeOffStatus } from "@/types";

type Result = { ok: true } | { ok: false; reason: string };

function actor() {
  const session = getBookingSession();
  const company = getActiveCompany();
  return { session, company };
}

function canEdit(employeeId: string): Result | null {
  const { session, company } = actor();
  if (!company) return { ok: false, reason: "Join a team before saving availability." };
  if (!canUseFirestore()) {
    if (session && session.employeeId !== employeeId) {
      return { ok: false, reason: "You can only change your own availability." };
    }
    return null;
  }
  if (
    !session ||
    !canEditOwnAvailability(
      {
        uid: session.uid,
        membership: {
          userId: session.uid,
          companyId: session.companyId,
          employeeId: session.employeeId,
          role: session.role,
        },
        ownerId: company.ownerId,
      },
      company.id,
      employeeId,
    )
  ) {
    return { ok: false, reason: "You can only change your own availability." };
  }
  return null;
}

function canReview(): Result | null {
  const { session, company } = actor();
  if (!company) return { ok: false, reason: "Open your team before reviewing time off." };
  if (!canUseFirestore()) {
    if (session && session.role !== "ADMIN") {
      return { ok: false, reason: "Only a manager can review time off." };
    }
    return null;
  }
  if (
    !session ||
    !canReviewTimeOff(
      {
        uid: session.uid,
        membership: {
          userId: session.uid,
          companyId: session.companyId,
          employeeId: session.employeeId,
          role: session.role,
        },
        ownerId: company.ownerId,
      },
      company.id,
    )
  ) {
    return { ok: false, reason: "Only a manager can review time off." };
  }
  return null;
}

export async function saveAvailabilityWindow(input: {
  employeeId: string;
  kind: "recurring" | "date";
  weekday: number | null;
  date: string | null;
  startTime: string;
  endTime: string;
  available: boolean;
  note?: string;
}): Promise<Result> {
  const denied = canEdit(input.employeeId);
  if (denied) return denied;
  const company = getActiveCompany();
  if (!company) return { ok: false, reason: "Join a team before saving availability." };
  const prepared = prepareAvailabilityWindow({
    ...input,
    id: `availability_${Date.now()}`,
    updatedAt: new Date().toISOString(),
  });
  if (!prepared.ok) return prepared;
  if (canUseFirestore()) {
    try {
      await saveAvailabilityRemote(company.id, prepared.window);
    } catch {
      return { ok: false, reason: "Could not save that. Try again." };
    }
  }
  const latest = getActiveCompany();
  if (!latest) return { ok: false, reason: "Join a team before saving availability." };
  const next = withAvailability(
    { availability: latest.availability ?? [], timeOff: latest.timeOff ?? [] },
    prepared.window,
  );
  updateStaffing(next);
  return { ok: true };
}

export async function removeAvailabilityWindow(id: string, employeeId: string): Promise<Result> {
  const denied = canEdit(employeeId);
  if (denied) return denied;
  const company = getActiveCompany();
  if (!company) return { ok: false, reason: "Join a team before saving availability." };
  const removed = withoutAvailability(
    { availability: company.availability ?? [], timeOff: company.timeOff ?? [] },
    id,
    employeeId,
  );
  if ("ok" in removed) return removed;
  if (canUseFirestore()) {
    try {
      await deleteAvailabilityRemote(company.id, id);
    } catch {
      return { ok: false, reason: "Could not remove that. Try again." };
    }
  }
  const latest = getActiveCompany();
  if (!latest) return { ok: true };
  const next = withoutAvailability(
    { availability: latest.availability ?? [], timeOff: latest.timeOff ?? [] },
    id,
    employeeId,
  );
  if ("ok" in next) return { ok: true };
  updateStaffing(next);
  return { ok: true };
}

export async function requestTimeOff(input: {
  employeeId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
}): Promise<Result> {
  const denied = canEdit(input.employeeId);
  if (denied) return denied;
  const company = getActiveCompany();
  if (!company) return { ok: false, reason: "Join a team before requesting time off." };
  const prepared = prepareTimeOffRequest({
    ...input,
    id: `timeoff_${Date.now()}`,
    createdAt: new Date().toISOString(),
  });
  if (!prepared.ok) return prepared;
  if (canUseFirestore()) {
    try {
      await saveTimeOffRemote(company.id, prepared.request);
    } catch {
      return { ok: false, reason: "Could not send that request. Try again." };
    }
  }
  const latest = getActiveCompany();
  if (!latest) return { ok: false, reason: "Join a team before requesting time off." };
  updateStaffing(
    withTimeOff(
      { availability: latest.availability ?? [], timeOff: latest.timeOff ?? [] },
      prepared.request,
    ),
  );
  return { ok: true };
}

export async function cancelTimeOff(id: string, employeeId: string): Promise<Result> {
  const denied = canEdit(employeeId);
  if (denied) return denied;
  const company = getActiveCompany();
  if (!company) return { ok: false, reason: "Join a team before changing time off." };
  const removed = withoutPendingTimeOff(
    { availability: company.availability ?? [], timeOff: company.timeOff ?? [] },
    id,
    employeeId,
  );
  if ("ok" in removed) return removed;
  if (canUseFirestore()) {
    try {
      await deleteTimeOffRemote(company.id, id);
    } catch {
      return { ok: false, reason: "Could not cancel that request. Try again." };
    }
  }
  const latest = getActiveCompany();
  if (!latest) return { ok: true };
  const next = withoutPendingTimeOff(
    { availability: latest.availability ?? [], timeOff: latest.timeOff ?? [] },
    id,
    employeeId,
  );
  if ("ok" in next) return { ok: true };
  updateStaffing(next);
  return { ok: true };
}

export async function reviewTimeOff(
  id: string,
  status: Extract<TimeOffStatus, "approved" | "rejected">,
): Promise<Result> {
  const denied = canReview();
  if (denied) return denied;
  const company = getActiveCompany();
  if (!company) return { ok: false, reason: "Open your team before reviewing time off." };
  const prepared = reviewTimeOffRequest(
    { availability: company.availability ?? [], timeOff: company.timeOff ?? [] },
    id,
    status,
    new Date().toISOString(),
  );
  if (!prepared.ok) return { ok: false, reason: prepared.reason };
  if (canUseFirestore()) {
    try {
      await saveTimeOffRemote(company.id, prepared.request);
    } catch {
      return { ok: false, reason: "Could not save that decision. Try again." };
    }
  }
  const latest = getActiveCompany();
  if (!latest) return { ok: false, reason: "Open your team before reviewing time off." };
  const saved = reviewTimeOffRequest(
    { availability: latest.availability ?? [], timeOff: latest.timeOff ?? [] },
    id,
    status,
    prepared.request.reviewedAt ?? new Date().toISOString(),
  );
  if (!saved.ok) return { ok: false, reason: saved.reason };
  updateStaffing(saved.state);
  return { ok: true };
}
