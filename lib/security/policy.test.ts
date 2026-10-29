import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Company, CompanyMembership } from "@/types";
import {
  JOIN_CODE_MIN_LENGTH,
  canCreateOwnHours,
  canCreateOwnSignup,
  canEditOwnAvailability,
  canPublishRota,
  canReviewTimeOff,
  canReadDraftRota,
  canReadHours,
  canReadPrivateCompany,
  canReadSchedule,
  canRunAdvisor,
  canWriteSchedule,
  draftRotaPayload,
  publishedSchedulePayload,
  companyUpdateAllowed,
  decideManagerAccess,
  isManager,
  joinCodeIsCurrent,
  membershipCreateAllowed,
  privateCompanyPayload,
  redactCompanyForMember,
} from "@/lib/security/policy";

const ownerMembership: CompanyMembership = {
  userId: "owner",
  companyId: "co1",
  employeeId: "co1_owner",
  role: "ADMIN",
};

const employeeMembership: CompanyMembership = {
  userId: "emp",
  companyId: "co1",
  employeeId: "co1_emp",
  role: "EMPLOYEE",
};

function company(): Company {
  return {
    id: "co1",
    ownerId: "owner",
    joinCode: "ABCDE23456",
    joinCodeExpiresAt: "2026-11-26T00:00:00.000Z",
    companyName: "North Cafe",
    managerName: "Ada",
    email: "ada@cafe.test",
    employeeCount: 2,
    shiftTemplates: [],
    employees: [
      {
        id: "co1_emp",
        name: "Sam",
        email: "sam@cafe.test",
        role: "EMPLOYEE",
        companyId: "co1",
        createdAt: "2026-10-26T00:00:00.000Z",
      },
      {
        id: "co1_other",
        name: "Jo",
        email: "jo@cafe.test",
        role: "EMPLOYEE",
        companyId: "co1",
        createdAt: "2026-10-26T00:00:00.000Z",
      },
    ],
    shifts: [],
    signups: [],
    hours: [
      {
        id: "h1",
        shiftId: "s1",
        employeeId: "co1_emp",
        startTime: "09:00",
        endTime: "17:00",
        status: "SUBMITTED",
        submittedAt: "2026-10-26T00:00:00.000Z",
      },
      {
        id: "h2",
        shiftId: "s1",
        employeeId: "co1_other",
        startTime: "09:00",
        endTime: "17:00",
        note: "private",
        status: "SUBMITTED",
        submittedAt: "2026-10-26T00:00:00.000Z",
      },
    ],
    setupCompletedAt: "2026-10-26T00:00:00.000Z",
  };
}

test("signed-out actors cannot read company data", () => {
  const actor = { uid: null, membership: null, ownerId: null };
  assert.equal(canReadPrivateCompany(actor, "co1"), false);
  assert.equal(canReadSchedule(actor, "co1"), false);
  assert.equal(canReadHours(actor, "co1", "co1_emp"), false);
  assert.equal(canRunAdvisor(actor, "co1"), false);
});

test("employees can read the schedule and only their own hours", () => {
  const actor = { uid: "emp", membership: employeeMembership, ownerId: "owner" };
  assert.equal(canReadSchedule(actor, "co1"), true);
  assert.equal(canReadSchedule(actor, "co2"), false);
  assert.equal(canReadPrivateCompany(actor, "co1"), false);
  assert.equal(canWriteSchedule(actor, "co1"), false);
  assert.equal(canPublishRota(actor, "co1"), false);
  assert.equal(canReadDraftRota(actor, "co1"), false);
  assert.equal(canEditOwnAvailability(actor, "co1", "co1_emp"), true);
  assert.equal(canEditOwnAvailability(actor, "co1", "co1_other"), false);
  assert.equal(canEditOwnAvailability(actor, "co2", "co1_emp"), false);
  assert.equal(canReviewTimeOff(actor, "co1"), false);
  assert.equal(canReadHours(actor, "co1", "co1_emp"), true);
  assert.equal(canReadHours(actor, "co1", "co1_other"), false);
  assert.equal(canRunAdvisor(actor, "co1"), false);
});

test("a manager cannot use another company's membership", () => {
  const actor = { uid: "owner", membership: ownerMembership, ownerId: "owner" };
  assert.equal(isManager(actor, "co1"), true);
  assert.equal(canPublishRota(actor, "co1"), true);
  assert.equal(canReadDraftRota(actor, "co1"), true);
  assert.equal(canPublishRota(actor, "co2"), false);
  assert.equal(canReviewTimeOff(actor, "co1"), true);
  assert.equal(canReviewTimeOff(actor, "co2"), false);
  assert.equal(canEditOwnAvailability(actor, "co1", "co1_owner"), false);
  assert.equal(isManager(actor, "co2"), false);
  assert.equal(canReadSchedule(actor, "co2"), false);
  assert.equal(canWriteSchedule(actor, "co2"), false);
  assert.equal(canRunAdvisor(actor, "co2"), false);
  assert.equal(
    decideManagerAccess({
      uid: "owner",
      membership: { ...ownerMembership, companyId: "co2" },
      companyId: "co2",
      companyOwnerId: "owner2",
    }).ok,
    false,
  );
});

test("browser role claims are not an input to manager authorization", () => {
  const employeeTryingAdmin = decideManagerAccess({
    uid: "emp",
    membership: employeeMembership,
    companyId: "co1",
    companyOwnerId: "owner",
  });
  assert.equal(employeeTryingAdmin.ok, false);

  const owner = decideManagerAccess({
    uid: "owner",
    membership: ownerMembership,
    companyId: "co1",
    companyOwnerId: "owner",
  });
  assert.equal(owner.ok, true);
});

test("membership cannot be escalated or reassigned", () => {
  const blocked = membershipCreateAllowed({
    uid: "emp",
    existing: employeeMembership,
    next: { ...employeeMembership, role: "ADMIN" },
    companyOwnerId: "owner",
    joinCodeValid: true,
  });
  assert.equal(blocked.ok, false);

  const forgedAdmin = membershipCreateAllowed({
    uid: "emp",
    existing: null,
    next: {
      userId: "emp",
      companyId: "co1",
      employeeId: "co1_emp",
      role: "ADMIN",
    },
    companyOwnerId: "owner",
    joinCodeValid: true,
  });
  assert.equal(forgedAdmin.ok, false);

  const joined = membershipCreateAllowed({
    uid: "emp",
    existing: null,
    next: employeeMembership,
    companyOwnerId: "owner",
    joinCodeValid: true,
  });
  assert.equal(joined.ok, true);

  const badCode = membershipCreateAllowed({
    uid: "emp",
    existing: null,
    next: employeeMembership,
    companyOwnerId: "owner",
    joinCodeValid: false,
  });
  assert.equal(badCode.ok, false);
});

test("company writes cannot change ownership or embed privileged records", () => {
  const current = company();
  assert.equal(
    companyUpdateAllowed(current, { ...current, ownerId: "emp" }).ok,
    false,
  );
  assert.equal(
    companyUpdateAllowed(current, { ...current, employees: [] }).ok,
    false,
  );
  assert.equal(
    companyUpdateAllowed(current, {
      id: current.id,
      ownerId: current.ownerId,
      setupCompletedAt: current.setupCompletedAt,
      companyName: "South",
    }).ok,
    true,
  );

  const payload = privateCompanyPayload(current);
  assert.equal("employees" in payload, false);
  assert.equal("signups" in payload, false);
  assert.equal("hours" in payload, false);
  assert.equal("shifts" in payload, false);
  assert.equal(payload.joinCode, "ABCDE23456");
});

test("employee views omit the join code, owner contact, and other people's hours", () => {
  const view = redactCompanyForMember(company(), {
    uid: "emp",
    membership: employeeMembership,
  });
  assert.ok(view);
  assert.equal(view?.joinCode, "");
  assert.equal(view?.email, "");
  assert.equal(view?.ownerId, "");
  assert.deepEqual(view?.hours.map((entry) => entry.id), ["h1"]);
  assert.deepEqual(
    view?.availability?.map((window) => window.employeeId) ?? [],
    [],
  );
  assert.equal(view?.employees.find((employee) => employee.id === "co1_other")?.email, "");
});

test("employees can only create their own selected shifts and submitted hours", () => {
  const actor = { uid: "emp", membership: employeeMembership };
  assert.equal(
    canCreateOwnSignup(actor, "co1", { employeeId: "co1_emp", status: "SELECTED" }),
    true,
  );
  assert.equal(
    canCreateOwnSignup(actor, "co1", { employeeId: "co1_other", status: "SELECTED" }),
    false,
  );
  assert.equal(
    canCreateOwnHours(actor, "co1", { employeeId: "co1_other", status: "SUBMITTED" }),
    false,
  );
});

test("join codes must be long and unexpired", () => {
  const future = Date.now() + 60_000;
  assert.equal(joinCodeIsCurrent("ABCDE23456", future), true);
  assert.equal(joinCodeIsCurrent("ABC123", future), false);
  assert.equal(JOIN_CODE_MIN_LENGTH >= 10, true);
  assert.equal(joinCodeIsCurrent("ABCDE23456", Date.now() - 1000), false);
});

test("an employee only sees their own availability and time off", () => {
  const cafe = company();
  cafe.availability = [
    {
      id: "mine",
      employeeId: "co1_emp",
      kind: "recurring",
      weekday: 1,
      date: null,
      startTime: "09:00",
      endTime: "17:00",
      available: true,
      updatedAt: "2026-10-20T00:00:00.000Z",
    },
    {
      id: "theirs",
      employeeId: "co1_other",
      kind: "recurring",
      weekday: 1,
      date: null,
      startTime: "09:00",
      endTime: "17:00",
      available: true,
      updatedAt: "2026-10-20T00:00:00.000Z",
    },
  ];
  cafe.timeOff = [
    {
      id: "mine-off",
      employeeId: "co1_emp",
      startDate: "2026-11-02",
      endDate: "2026-11-02",
      startTime: null,
      endTime: null,
      status: "pending",
      createdAt: "2026-10-20T00:00:00.000Z",
    },
    {
      id: "their-off",
      employeeId: "co1_other",
      startDate: "2026-11-03",
      endDate: "2026-11-03",
      startTime: null,
      endTime: null,
      status: "approved",
      createdAt: "2026-10-20T00:00:00.000Z",
    },
  ];
  const view = redactCompanyForMember(cafe, {
    uid: "emp",
    membership: employeeMembership,
  });
  assert.deepEqual(view?.availability?.map((window) => window.id), ["mine"]);
  assert.deepEqual(view?.timeOff?.map((request) => request.id), ["mine-off"]);
});

test("the published rota leaves drafts for the manager only", () => {
  const cafe = company();
  cafe.shifts = [
    {
      id: "live",
      date: "2026-10-26",
      startTime: "09:00",
      endTime: "17:00",
      slots: 2,
      status: "published",
    },
    {
      id: "plan",
      date: "2026-10-27",
      startTime: "09:00",
      endTime: "17:00",
      slots: 1,
      status: "draft",
      assigneeIds: ["co1_emp"],
    },
  ];
  const published = publishedSchedulePayload(cafe).shifts as Array<{ id: string }>;
  const drafts = draftRotaPayload(cafe).shifts as Array<{ id: string }>;
  assert.deepEqual(
    published.map((shift) => shift.id),
    ["live"],
  );
  assert.deepEqual(
    drafts.map((shift) => shift.id),
    ["plan"],
  );
});

test("firestore rules are default-deny", () => {
  const rules = readFileSync("firestore.rules", "utf8");
  assert.equal(rules.includes("if true"), false);
  assert.equal(rules.includes("joinCode.size() >= 10"), true);
  assert.match(rules, /allow update, delete: if false;/);
});
