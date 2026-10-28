import assert from "node:assert/strict";
import test from "node:test";
import {
  decideBooking,
  decideCancellation,
  decideConfirmation,
  openingFromShift,
  signupDocumentId,
  type BookedSignup,
  type HeldShift,
  type OpeningState,
} from "@/lib/shifts/booking";

const NOW = Date.parse("2026-10-26T12:00:00.000Z");

function opening(partial: Partial<OpeningState> & Pick<OpeningState, "shiftId">): OpeningState {
  return openingFromShift(
    {
      id: partial.shiftId,
      date: partial.date ?? "2026-10-27",
      startTime: partial.startTime ?? "09:00",
      endTime: partial.endTime ?? "17:00",
      slots: partial.slots ?? 1,
    },
    partial.taken ?? 0,
  );
}

function future(shift: OpeningState): OpeningState {
  return { ...shift, endAt: NOW + 60_000 };
}

type Seat = {
  openings: Map<string, OpeningState>;
  signups: Map<string, BookedSignup>;
};

function member(employeeId: string, shiftId: string, seat: Seat, held: HeldShift[] = []) {
  return {
    companyId: "co1",
    memberCompanyId: "co1",
    employeeId,
    memberEmployeeId: employeeId,
    shiftId,
    now: NOW,
    opening: seat.openings.get(shiftId) ?? null,
    signupExists: [...seat.signups.values()].some(
      (signup) => signup.employeeId === employeeId && signup.shiftId === shiftId,
    ),
    held,
  };
}

function heldFor(seat: Seat, employeeId: string): HeldShift[] {
  const held: HeldShift[] = [];
  for (const signup of seat.signups.values()) {
    if (signup.employeeId !== employeeId) continue;
    const shift = seat.openings.get(signup.shiftId);
    if (!shift) continue;
    held.push({
      shiftId: shift.shiftId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
    });
  }
  return held;
}

function applyBook(seat: Seat, employeeId: string, shiftId: string) {
  const decision = decideBooking(member(employeeId, shiftId, seat, heldFor(seat, employeeId)));
  if (decision.ok && !decision.alreadyBooked) {
    const current = seat.openings.get(shiftId);
    if (current) seat.openings.set(shiftId, { ...current, taken: decision.taken });
    seat.signups.set(decision.signupId, {
      id: decision.signupId,
      shiftId,
      employeeId,
      status: "SELECTED",
      selectedAt: decision.selectedAt,
      confirmedAt: null,
    });
  }
  return decision;
}

function applyCancel(seat: Seat, employeeId: string, shiftId: string) {
  const decision = decideCancellation({
    companyId: "co1",
    memberCompanyId: "co1",
    employeeId,
    memberEmployeeId: employeeId,
    shiftId,
    now: NOW,
    opening: seat.openings.get(shiftId) ?? null,
    signupExists: [...seat.signups.values()].some(
      (signup) => signup.employeeId === employeeId && signup.shiftId === shiftId,
    ),
  });
  if (decision.ok && !decision.alreadyCancelled) {
    const current = seat.openings.get(shiftId);
    if (current) seat.openings.set(shiftId, { ...current, taken: decision.taken });
    for (const [id, signup] of seat.signups) {
      if (signup.employeeId === employeeId && signup.shiftId === shiftId) {
        seat.signups.delete(id);
      }
    }
  }
  return decision;
}

class TransactionLedger {
  private chain: Promise<unknown> = Promise.resolve();
  readonly seat: Seat = { openings: new Map(), signups: new Map() };

  constructor(openings: OpeningState[]) {
    for (const item of openings) this.seat.openings.set(item.shiftId, { ...item });
  }

  book(employeeId: string, shiftId: string) {
    return this.exclusive(() => applyBook(this.seat, employeeId, shiftId));
  }

  cancel(employeeId: string, shiftId: string) {
    return this.exclusive(() => applyCancel(this.seat, employeeId, shiftId));
  }

  private exclusive<T>(fn: () => T): Promise<T> {
    const run = this.chain.then(() => fn());
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

test("signup ids stay stable for the same employee and shift", () => {
  assert.equal(signupDocumentId("co1_emp", "shift_1"), "co1_emp~shift_1");
  assert.equal(
    signupDocumentId("co1_emp", "shift_1"),
    signupDocumentId("co1_emp", "shift_1"),
  );
  assert.equal(signupDocumentId("co1_emp~bad", "shift_1"), null);
});

test("a stale read lets two employees accept the last seat", () => {
  const seat: Seat = {
    openings: new Map([["shift1", future(opening({ shiftId: "shift1", slots: 1 }))]]),
    signups: new Map(),
  };
  const first = decideBooking(member("empA", "shift1", seat));
  const second = decideBooking(member("empB", "shift1", seat));
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
});

test("a booking transaction lets only one employee take the last seat", async () => {
  const ledger = new TransactionLedger([future(opening({ shiftId: "shift1", slots: 1 }))]);
  const [first, second] = await Promise.all([
    ledger.book("empA", "shift1"),
    ledger.book("empB", "shift1"),
  ]);
  const accepted = [first, second].filter((result) => result.ok);
  const rejected = [first, second].filter((result) => !result.ok);
  assert.equal(accepted.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0]?.ok, false);
  if (!rejected[0]?.ok) assert.equal(rejected[0].reason, "This shift is full.");
  assert.equal(ledger.seat.openings.get("shift1")?.taken, 1);
  assert.equal(ledger.seat.signups.size, 1);
});

test("retrying a booking does not create a second assignment", async () => {
  const ledger = new TransactionLedger([future(opening({ shiftId: "shift1", slots: 2 }))]);
  const saved = await ledger.book("empA", "shift1");
  assert.equal(saved.ok, true);
  const retried = await ledger.book("empA", "shift1");
  assert.equal(retried.ok, true);
  if (retried.ok) assert.equal(retried.alreadyBooked, true);
  assert.equal(ledger.seat.signups.size, 1);
  assert.equal(ledger.seat.openings.get("shift1")?.taken, 1);
});

test("a saved booking is still the same assignment after it is reloaded", () => {
  const seat: Seat = {
    openings: new Map([["shift1", future(opening({ shiftId: "shift1", slots: 2 }))]]),
    signups: new Map(),
  };
  applyBook(seat, "empA", "shift1");
  const restored: Seat = {
    openings: new Map(
      JSON.parse(JSON.stringify([...seat.openings.entries()])) as Array<[string, OpeningState]>,
    ),
    signups: new Map(
      JSON.parse(JSON.stringify([...seat.signups.entries()])) as Array<[string, BookedSignup]>,
    ),
  };
  const again = applyBook(restored, "empA", "shift1");
  assert.equal(again.ok, true);
  if (again.ok) assert.equal(again.alreadyBooked, true);
  assert.equal(restored.signups.size, 1);
  assert.equal(restored.openings.get("shift1")?.taken, 1);
});

test("overlapping shifts for one employee are rejected and a free seat stays free", () => {
  const seat: Seat = {
    openings: new Map([
      ["morning", future(opening({ shiftId: "morning", startTime: "09:00", endTime: "13:00", slots: 2 }))],
      ["midday", future(opening({ shiftId: "midday", startTime: "12:00", endTime: "16:00", slots: 2 }))],
    ]),
    signups: new Map(),
  };
  assert.equal(applyBook(seat, "empA", "morning").ok, true);
  const overlap = applyBook(seat, "empA", "midday");
  assert.equal(overlap.ok, false);
  if (!overlap.ok) assert.equal(overlap.reason, "This overlaps another shift you already chose.");
  assert.equal(seat.openings.get("midday")?.taken, 0);
  assert.equal(applyBook(seat, "empB", "midday").ok, true);
});

test("adjacent shifts and shifts on different days can both be booked", () => {
  const seat: Seat = {
    openings: new Map([
      ["early", future(opening({ shiftId: "early", startTime: "09:00", endTime: "12:00" }))],
      ["late", future(opening({ shiftId: "late", startTime: "12:00", endTime: "16:00" }))],
      ["next", future(opening({ shiftId: "next", date: "2026-10-28", startTime: "09:00", endTime: "12:00" }))],
    ]),
    signups: new Map(),
  };
  assert.equal(applyBook(seat, "empA", "early").ok, true);
  assert.equal(applyBook(seat, "empA", "late").ok, true);
  assert.equal(applyBook(seat, "empA", "next").ok, true);
  assert.equal(seat.signups.size, 3);
});

test("cancellation frees the seat and a second cancel does not drop below zero", () => {
  const seat: Seat = {
    openings: new Map([["shift1", future(opening({ shiftId: "shift1", slots: 1 }))]]),
    signups: new Map(),
  };
  applyBook(seat, "empA", "shift1");
  const left = applyCancel(seat, "empA", "shift1");
  assert.equal(left.ok, true);
  assert.equal(seat.openings.get("shift1")?.taken, 0);
  assert.equal(seat.signups.size, 0);
  const again = applyCancel(seat, "empA", "shift1");
  assert.equal(again.ok, true);
  if (again.ok) assert.equal(again.alreadyCancelled, true);
  assert.equal(seat.openings.get("shift1")?.taken, 0);
  assert.equal(applyBook(seat, "empB", "shift1").ok, true);
  assert.equal(seat.openings.get("shift1")?.taken, 1);
});

test("two cancellations of different seats both succeed once", async () => {
  const ledger = new TransactionLedger([
    future(opening({ shiftId: "shift1", slots: 2, taken: 2 })),
  ]);
  const idA = signupDocumentId("empA", "shift1");
  const idB = signupDocumentId("empB", "shift1");
  assert.ok(idA && idB);
  ledger.seat.signups.set(idA, {
    id: idA,
    shiftId: "shift1",
    employeeId: "empA",
    status: "SELECTED",
    selectedAt: "2026-10-26T00:00:00.000Z",
    confirmedAt: null,
  });
  ledger.seat.signups.set(idB, {
    id: idB,
    shiftId: "shift1",
    employeeId: "empB",
    status: "SELECTED",
    selectedAt: "2026-10-26T00:00:00.000Z",
    confirmedAt: null,
  });
  const [first, second] = await Promise.all([
    ledger.cancel("empA", "shift1"),
    ledger.cancel("empB", "shift1"),
  ]);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(ledger.seat.openings.get("shift1")?.taken, 0);
  assert.equal(ledger.seat.signups.size, 0);
});

test("an employee cannot book or cancel inside another company", () => {
  const seat: Seat = {
    openings: new Map([["shift1", future(opening({ shiftId: "shift1", slots: 2 }))]]),
    signups: new Map(),
  };
  const booked = decideBooking({
    ...member("empA", "shift1", seat),
    memberCompanyId: "co2",
  });
  assert.equal(booked.ok, false);
  if (!booked.ok) assert.equal(booked.code, "wrong-company");
  assert.equal(seat.signups.size, 0);
  const cancelled = decideCancellation({
    companyId: "co1",
    memberCompanyId: "co2",
    employeeId: "empA",
    memberEmployeeId: "empA",
    shiftId: "shift1",
    now: NOW,
    opening: seat.openings.get("shift1") ?? null,
    signupExists: true,
  });
  assert.equal(cancelled.ok, false);
});

test("confirmation is idempotent and a missing signup is not confirmed", () => {
  const shift = future(opening({ shiftId: "shift1" }));
  const signup: BookedSignup = {
    id: "empA~shift1",
    shiftId: "shift1",
    employeeId: "empA",
    status: "SELECTED",
    selectedAt: "2026-10-26T00:00:00.000Z",
    confirmedAt: null,
  };
  const confirmed = decideConfirmation({
    companyId: "co1",
    memberCompanyId: "co1",
    employeeId: "empA",
    memberEmployeeId: "empA",
    now: NOW,
    opening: shift,
    signup,
  });
  assert.equal(confirmed.ok, true);
  const repeat = decideConfirmation({
    companyId: "co1",
    memberCompanyId: "co1",
    employeeId: "empA",
    memberEmployeeId: "empA",
    now: NOW,
    opening: shift,
    signup: { ...signup, status: "CONFIRMED", confirmedAt: "2026-10-26T12:00:00.000Z" },
  });
  assert.equal(repeat.ok, true);
  if (repeat.ok) assert.equal(repeat.alreadyConfirmed, true);
  const missing = decideConfirmation({
    companyId: "co1",
    memberCompanyId: "co1",
    employeeId: "empA",
    memberEmployeeId: "empA",
    now: NOW,
    opening: shift,
    signup: null,
  });
  assert.equal(missing.ok, false);
});

test("a finished shift cannot be booked", () => {
  const seat: Seat = {
    openings: new Map([
      ["shift1", { ...opening({ shiftId: "shift1" }), endAt: NOW - 1 }],
    ]),
    signups: new Map(),
  };
  const decision = applyBook(seat, "empA", "shift1");
  assert.equal(decision.ok, false);
  if (!decision.ok) assert.equal(decision.reason, "This shift has already finished.");
  assert.equal(seat.signups.size, 0);
});
