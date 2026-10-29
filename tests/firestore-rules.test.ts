import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { civilInterval } from "@/lib/time/interval";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

const LATER = Date.now() + 7 * 24 * 60 * 60 * 1000;
const EARLIER = Date.now() - 60_000;

let testEnv: RulesTestEnvironment;

function openingData(
  slots = 2,
  taken = 0,
  endAt = LATER,
  startTime = "09:00",
  endTime = "17:00",
  date = "2026-10-27",
) {
  return {
    slots,
    taken,
    date,
    startTime,
    endTime,
    endAt,
    heldSignupId: "",
  };
}

function claimData(
  employeeId: string,
  bookings: Array<{ shiftId: string; startTime?: string; endTime?: string; date?: string }>,
) {
  return {
    employeeId,
    bookings: bookings.map((booking) => ({
      shiftId: booking.shiftId,
      date: booking.date ?? "2026-10-27",
      startTime: booking.startTime ?? "09:00",
      endTime: booking.endTime ?? "17:00",
    })),
  };
}

function selectedSignup(employeeId: string, shiftId: string) {
  return {
    shiftId,
    employeeId,
    status: "SELECTED" as const,
    selectedAt: "2026-10-26T00:00:00.000Z",
    confirmedAt: null,
  };
}

function companyData(ownerId: string, id = "co1", joinCode = "ABCDE23456") {
  return {
    id,
    ownerId,
    companyName: "North Cafe",
    managerName: "Ada",
    email: "ada@cafe.test",
    employeeCount: 5,
    shiftTemplates: [],
    setupCompletedAt: "2026-10-26T00:00:00.000Z",
    joinCode,
    joinCodeExpiresAt: LATER,
  };
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-zoreva-rules",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "companies/co1"), companyData("owner1"));
    await setDoc(doc(db, "companies/co2"), companyData("owner2", "co2", "ZZZZZ99999"));
    await setDoc(doc(db, "companies/co1/published/schedule"), {
      companyName: "North Cafe",
      shiftTemplates: [],
      shifts: [{ id: "shift1" }],
    });
    await setDoc(doc(db, "companies/co1/openings/shift1"), openingData());
    await setDoc(doc(db, "companies/co2/published/schedule"), {
      companyName: "South Cafe",
      shiftTemplates: [],
      shifts: [],
    });
    await setDoc(doc(db, "memberships/owner1"), {
      userId: "owner1",
      companyId: "co1",
      employeeId: "co1_owner1",
      role: "ADMIN",
    });
    await setDoc(doc(db, "memberships/owner2"), {
      userId: "owner2",
      companyId: "co2",
      employeeId: "co2_owner2",
      role: "ADMIN",
    });
    await setDoc(doc(db, "memberships/emp1"), {
      userId: "emp1",
      companyId: "co1",
      employeeId: "co1_emp1",
      role: "EMPLOYEE",
    });
    await setDoc(doc(db, "companies/co1/roster/co1_emp1"), {
      id: "co1_emp1",
      name: "Sam",
      role: "EMPLOYEE",
      companyId: "co1",
      createdAt: "2026-10-26T00:00:00.000Z",
    });
    await setDoc(doc(db, "joinCodes/ABCDE23456"), {
      companyId: "co1",
      expiresAt: LATER,
    });
    await setDoc(doc(db, "joinCodes/EXPIRED2345"), {
      companyId: "co1",
      expiresAt: EARLIER,
    });
    await setDoc(doc(db, "joinCodes/SHORT1"), {
      companyId: "co1",
      expiresAt: LATER,
    });
    await setDoc(doc(db, "companies/co1/hours/own"), {
      shiftId: "shift1",
      employeeId: "co1_emp1",
      startTime: "09:00",
      endTime: "17:00",
      note: "",
      status: "SUBMITTED",
      submittedAt: "2026-10-26T00:00:00.000Z",
    });
    await setDoc(doc(db, "companies/co1/hours/other"), {
      shiftId: "shift1",
      employeeId: "co1_other",
      startTime: "09:00",
      endTime: "17:00",
      note: "private note",
      status: "SUBMITTED",
      submittedAt: "2026-10-26T00:00:00.000Z",
    });
  });
});

test("unauthenticated clients cannot read company data or join codes", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "companies/co1")));
  await assertFails(getDocs(collection(db, "companies")));
  await assertFails(getDoc(doc(db, "joinCodes/ABCDE23456")));
  await assertFails(getDocs(collection(db, "joinCodes")));
  await assertFails(getDoc(doc(db, "memberships/emp1")));
  await assertFails(getDoc(doc(db, "companies/co1/published/schedule")));
});

test("employees cannot read another company or private company fields", async () => {
  const db = testEnv.authenticatedContext("emp1", { email: "sam@cafe.test" }).firestore();
  await assertFails(getDoc(doc(db, "companies/co1")));
  await assertFails(getDoc(doc(db, "companies/co2")));
  await assertFails(getDoc(doc(db, "companies/co2/published/schedule")));
  await assertSucceeds(getDoc(doc(db, "companies/co1/published/schedule")));
  await assertFails(
    setDoc(doc(db, "companies/co1/published/schedule"), {
      companyName: "Taken",
      shiftTemplates: [],
      shifts: [],
    }),
  );
});

test("managers cannot read or write another company", async () => {
  const db = testEnv.authenticatedContext("owner1", { email: "ada@cafe.test" }).firestore();
  await assertSucceeds(getDoc(doc(db, "companies/co1")));
  await assertFails(getDoc(doc(db, "companies/co2")));
  await assertFails(getDoc(doc(db, "companies/co2/published/schedule")));
  await assertFails(getDocs(collection(db, "companies")));
});

test("ownership and roles cannot be changed by the client", async () => {
  const employee = testEnv.authenticatedContext("emp1", { email: "sam@cafe.test" }).firestore();
  await assertFails(
    setDoc(doc(employee, "memberships/emp1"), {
      userId: "emp1",
      companyId: "co1",
      employeeId: "co1_emp1",
      role: "ADMIN",
    }),
  );
  await assertFails(updateDoc(doc(employee, "memberships/emp1"), { role: "ADMIN" }));

  const stranger = testEnv.authenticatedContext("stranger").firestore();
  await assertFails(
    setDoc(doc(stranger, "memberships/stranger"), {
      userId: "stranger",
      companyId: "co1",
      employeeId: "co1_stranger",
      role: "ADMIN",
    }),
  );

  const owner = testEnv.authenticatedContext("owner1", { email: "ada@cafe.test" }).firestore();
  await assertFails(setDoc(doc(owner, "companies/co1"), companyData("emp1")));
  await assertSucceeds(setDoc(doc(owner, "companies/co1"), companyData("owner1")));
});

test("employees can write only their own signups and hours", async () => {
  const db = testEnv.authenticatedContext("emp1", { email: "sam@cafe.test" }).firestore();
  await assertFails(
    setDoc(doc(db, "companies/co1/signups/bad"), {
      shiftId: "shift1",
      employeeId: "co1_other",
      status: "SELECTED",
      selectedAt: "2026-10-26T00:00:00.000Z",
      confirmedAt: null,
    }),
  );
  const book = writeBatch(db);
  book.update(doc(db, "companies/co1/openings/shift1"), {
    taken: 1,
    heldSignupId: "co1_emp1~shift1",
  });
  book.set(doc(db, "companies/co1/signups/co1_emp1~shift1"), selectedSignup("co1_emp1", "shift1"));
  book.set(doc(db, "companies/co1/claims/co1_emp1"), claimData("co1_emp1", [{ shiftId: "shift1" }]));
  await assertSucceeds(book.commit());
  await assertFails(getDoc(doc(db, "companies/co1/hours/other")));
  await assertSucceeds(getDoc(doc(db, "companies/co1/hours/own")));
  const ownHours = await getDocs(
    query(collection(db, "companies/co1/hours"), where("employeeId", "==", "co1_emp1")),
  );
  assert.equal(ownHours.size, 1);
  await assertFails(
    updateDoc(doc(db, "companies/co1/hours/own"), { note: "changed" }),
  );
  await assertFails(
    setDoc(doc(db, "companies/co1/hours/forged"), {
      shiftId: "shift1",
      employeeId: "co1_other",
      startTime: "09:00",
      endTime: "17:00",
      note: "",
      status: "SUBMITTED",
      submittedAt: "2026-10-26T00:00:00.000Z",
    }),
  );

  const owner = testEnv.authenticatedContext("owner1", { email: "ada@cafe.test" }).firestore();
  await assertSucceeds(getDoc(doc(owner, "companies/co1/hours/other")));
});

test("join codes cannot be listed, guessed when short or expired, or redeemed as manager", async () => {
  const stranger = testEnv.authenticatedContext("newhire", { email: "new@cafe.test" }).firestore();
  await assertFails(getDocs(collection(stranger, "joinCodes")));
  await assertFails(getDoc(doc(stranger, "joinCodes/SHORT1")));
  await assertFails(getDoc(doc(stranger, "joinCodes/EXPIRED2345")));
  await assertSucceeds(getDoc(doc(stranger, "joinCodes/ABCDE23456")));

  const expired = writeBatch(stranger);
  expired.set(doc(stranger, "memberships/newhire"), {
    userId: "newhire",
    companyId: "co1",
    employeeId: "co1_newhire",
    role: "EMPLOYEE",
  });
  expired.set(doc(stranger, "joinReceipts/newhire"), {
    companyId: "co1",
    code: "EXPIRED2345",
    createdAt: Date.now(),
  });
  await assertFails(expired.commit());

  const escalation = writeBatch(stranger);
  escalation.set(doc(stranger, "memberships/newhire"), {
    userId: "newhire",
    companyId: "co1",
    employeeId: "co1_newhire",
    role: "ADMIN",
  });
  escalation.set(doc(stranger, "joinReceipts/newhire"), {
    companyId: "co1",
    code: "ABCDE23456",
    createdAt: Date.now(),
  });
  await assertFails(escalation.commit());

  const join = writeBatch(stranger);
  join.set(doc(stranger, "memberships/newhire"), {
    userId: "newhire",
    companyId: "co1",
    employeeId: "co1_newhire",
    role: "EMPLOYEE",
  });
  join.set(doc(stranger, "joinReceipts/newhire"), {
    companyId: "co1",
    code: "ABCDE23456",
    createdAt: Date.now(),
  });
  join.set(doc(stranger, "companies/co1/roster/co1_newhire"), {
    id: "co1_newhire",
    name: "New Hire",
    role: "EMPLOYEE",
    companyId: "co1",
    createdAt: "2026-10-26T00:00:00.000Z",
  });
  await assertSucceeds(join.commit());

  const again = writeBatch(stranger);
  again.set(doc(stranger, "memberships/newhire"), {
    userId: "newhire",
    companyId: "co2",
    employeeId: "co2_newhire",
    role: "EMPLOYEE",
  });
  await assertFails(again.commit());
});

test("a new owner can create only their own company", async () => {
  const owner = testEnv.authenticatedContext("owner3", { email: "new@cafe.test" }).firestore();
  const stolen = writeBatch(owner);
  stolen.set(doc(owner, "companies/co9"), companyData("victim", "co9", "OWNER3CODE"));
  stolen.set(doc(owner, "memberships/owner3"), {
    userId: "owner3",
    companyId: "co9",
    employeeId: "co9_owner3",
    role: "ADMIN",
  });
  await assertFails(stolen.commit());

  const created = writeBatch(owner);
  created.set(doc(owner, "companies/co3"), companyData("owner3", "co3", "OWNER3CODE"));
  created.set(doc(owner, "memberships/owner3"), {
    userId: "owner3",
    companyId: "co3",
    employeeId: "co3_owner3",
    role: "ADMIN",
  });
  created.set(doc(owner, "companies/co3/published/schedule"), {
    companyName: "North Cafe",
    shiftTemplates: [],
    shifts: [],
  });
  created.set(doc(owner, "owners/owner3"), { companyId: "co3" });
  created.set(doc(owner, "emails/new@cafe.test"), { companyId: "co3" });
  created.set(doc(owner, "joinCodes/OWNER3CODE"), {
    companyId: "co3",
    expiresAt: LATER,
  });
  await assertSucceeds(created.commit());
});

test("shift booking rules keep the last seat, block duplicates, and require a matched cancel", async () => {
  const employee = testEnv.authenticatedContext("emp1", { email: "sam@cafe.test" }).firestore();
  await assertFails(getDoc(doc(employee, "companies/co2/openings/shift1")));
  await assertFails(
    setDoc(doc(employee, "companies/co1/signups/co1_emp1~shift1"), selectedSignup("co1_emp1", "shift1")),
  );
  await assertFails(
    updateDoc(doc(employee, "companies/co1/openings/shift1"), {
      taken: 1,
      heldSignupId: "co1_emp1~shift1",
    }),
  );
  await assertFails(
    setDoc(doc(employee, "companies/co1/signups/signup_other"), selectedSignup("co1_emp1", "shift1")),
  );

  const book = writeBatch(employee);
  book.update(doc(employee, "companies/co1/openings/shift1"), {
    taken: 1,
    heldSignupId: "co1_emp1~shift1",
  });
  book.set(
    doc(employee, "companies/co1/signups/co1_emp1~shift1"),
    selectedSignup("co1_emp1", "shift1"),
  );
  book.set(
    doc(employee, "companies/co1/claims/co1_emp1"),
    claimData("co1_emp1", [{ shiftId: "shift1" }]),
  );
  await assertSucceeds(book.commit());

  const duplicate = writeBatch(employee);
  duplicate.update(doc(employee, "companies/co1/openings/shift1"), {
    taken: 2,
    heldSignupId: "co1_emp1~shift1",
  });
  duplicate.set(
    doc(employee, "companies/co1/signups/co1_emp1~shift1"),
    selectedSignup("co1_emp1", "shift1"),
  );
  await assertFails(duplicate.commit());

  await assertSucceeds(
    updateDoc(doc(employee, "companies/co1/signups/co1_emp1~shift1"), {
      status: "CONFIRMED",
      confirmedAt: "2026-10-26T01:00:00.000Z",
    }),
  );

  const owner = testEnv.authenticatedContext("owner1", { email: "ada@cafe.test" }).firestore();
  await assertFails(
    updateDoc(doc(owner, "companies/co1/openings/shift1"), { taken: 0, heldSignupId: "" }),
  );
  await assertSucceeds(
    updateDoc(doc(owner, "companies/co1/openings/shift1"), { endTime: "18:00" }),
  );
  await assertFails(
    updateDoc(doc(employee, "companies/co1/openings/shift1"), { endTime: "19:00" }),
  );

  const cancelWithoutSeat = deleteDoc(doc(employee, "companies/co1/signups/co1_emp1~shift1"));
  await assertFails(cancelWithoutSeat);

  const cancel = writeBatch(employee);
  cancel.update(doc(employee, "companies/co1/openings/shift1"), {
    taken: 0,
    heldSignupId: "co1_emp1~shift1",
  });
  cancel.delete(doc(employee, "companies/co1/signups/co1_emp1~shift1"));
  cancel.set(doc(employee, "companies/co1/claims/co1_emp1"), claimData("co1_emp1", []));
  await assertSucceeds(cancel.commit());

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "companies/co1/openings/last"), openingData(1, 0));
    await setDoc(doc(db, "companies/co1/openings/past"), openingData(1, 0, EARLIER));
    await setDoc(doc(db, "companies/co1/openings/am"), openingData(2, 0, LATER, "09:00", "13:00"));
    await setDoc(doc(db, "companies/co1/openings/pm"), openingData(2, 0, LATER, "12:00", "16:00"));
    await setDoc(
      doc(db, "companies/co1/openings/nextday"),
      openingData(2, 0, LATER, "09:00", "12:00", "2026-10-28"),
    );
    await setDoc(doc(db, "companies/co2/openings/shift1"), openingData(1, 0));
    await setDoc(doc(db, "memberships/emp2"), {
      userId: "emp2",
      companyId: "co1",
      employeeId: "co1_emp2",
      role: "EMPLOYEE",
    });
  });

  const past = writeBatch(employee);
  past.update(doc(employee, "companies/co1/openings/past"), {
    taken: 1,
    heldSignupId: "co1_emp1~past",
  });
  past.set(doc(employee, "companies/co1/signups/co1_emp1~past"), selectedSignup("co1_emp1", "past"));
  await assertFails(past.commit());

  const otherCompany = writeBatch(employee);
  otherCompany.update(doc(employee, "companies/co2/openings/shift1"), {
    taken: 1,
    heldSignupId: "co1_emp1~shift1",
  });
  otherCompany.set(
    doc(employee, "companies/co2/signups/co1_emp1~shift1"),
    selectedSignup("co1_emp1", "shift1"),
  );
  await assertFails(otherCompany.commit());

  const first = writeBatch(employee);
  first.update(doc(employee, "companies/co1/openings/last"), {
    taken: 1,
    heldSignupId: "co1_emp1~last",
  });
  first.set(doc(employee, "companies/co1/signups/co1_emp1~last"), selectedSignup("co1_emp1", "last"));
  first.set(doc(employee, "companies/co1/claims/co1_emp1"), claimData("co1_emp1", [{ shiftId: "last" }]));
  await assertSucceeds(first.commit());

  const other = testEnv.authenticatedContext("emp2", { email: "jo@cafe.test" }).firestore();
  const stale = writeBatch(other);
  stale.update(doc(other, "companies/co1/openings/last"), {
    taken: 1,
    heldSignupId: "co1_emp2~last",
  });
  stale.set(doc(other, "companies/co1/signups/co1_emp2~last"), selectedSignup("co1_emp2", "last"));
  await assertFails(stale.commit());

  const overflow = writeBatch(other);
  overflow.update(doc(other, "companies/co1/openings/last"), {
    taken: 2,
    heldSignupId: "co1_emp2~last",
  });
  overflow.set(doc(other, "companies/co1/signups/co1_emp2~last"), selectedSignup("co1_emp2", "last"));
  await assertFails(overflow.commit());

  await assertSucceeds(setDoc(doc(owner, "companies/co1/openings/fresh"), openingData()));
  await assertFails(setDoc(doc(employee, "companies/co1/openings/stolen"), openingData()));

  const morning = writeBatch(other);
  morning.update(doc(other, "companies/co1/openings/am"), {
    taken: 1,
    heldSignupId: "co1_emp2~am",
  });
  morning.set(doc(other, "companies/co1/signups/co1_emp2~am"), selectedSignup("co1_emp2", "am"));
  morning.set(
    doc(other, "companies/co1/claims/co1_emp2"),
    claimData("co1_emp2", [{ shiftId: "am", startTime: "09:00", endTime: "13:00" }]),
  );
  await assertSucceeds(morning.commit());

  const overlap = writeBatch(other);
  overlap.update(doc(other, "companies/co1/openings/pm"), {
    taken: 1,
    heldSignupId: "co1_emp2~pm",
  });
  overlap.set(doc(other, "companies/co1/signups/co1_emp2~pm"), selectedSignup("co1_emp2", "pm"));
  overlap.set(
    doc(other, "companies/co1/claims/co1_emp2"),
    claimData("co1_emp2", [
      { shiftId: "am", startTime: "09:00", endTime: "13:00" },
      { shiftId: "pm", startTime: "12:00", endTime: "16:00" },
    ]),
  );
  await assertFails(overlap.commit());

  const later = writeBatch(other);
  later.update(doc(other, "companies/co1/openings/nextday"), {
    taken: 1,
    heldSignupId: "co1_emp2~nextday",
  });
  later.set(
    doc(other, "companies/co1/signups/co1_emp2~nextday"),
    selectedSignup("co1_emp2", "nextday"),
  );
  later.set(
    doc(other, "companies/co1/claims/co1_emp2"),
    claimData("co1_emp2", [
      { shiftId: "am", startTime: "09:00", endTime: "13:00" },
      { shiftId: "nextday", startTime: "09:00", endTime: "12:00", date: "2026-10-28" },
    ]),
  );
  await assertSucceeds(later.commit());
});

test("only a manager can read or write the draft rota", async () => {
  const employee = testEnv.authenticatedContext("emp1", { email: "sam@cafe.test" }).firestore();
  const owner = testEnv.authenticatedContext("owner1", { email: "ada@cafe.test" }).firestore();
  const signedOut = testEnv.unauthenticatedContext().firestore();

  await assertFails(getDoc(doc(signedOut, "companies/co1/drafts/rota")));
  await assertFails(getDoc(doc(employee, "companies/co1/drafts/rota")));
  await assertFails(setDoc(doc(employee, "companies/co1/drafts/rota"), { shifts: [] }));
  await assertSucceeds(
    setDoc(doc(owner, "companies/co1/drafts/rota"), {
      shifts: [{ id: "draft1", status: "draft" }],
    }),
  );
  await assertSucceeds(getDoc(doc(owner, "companies/co1/drafts/rota")));
  await assertFails(
    setDoc(doc(owner, "companies/co1/drafts/rota"), { shifts: [], note: "extra" }),
  );
  await assertFails(deleteDoc(doc(owner, "companies/co1/drafts/rota")));
});

test("availability and time off stay inside one company and one employee", async () => {
  const employee = testEnv.authenticatedContext("emp1", { email: "sam@cafe.test" }).firestore();
  const owner = testEnv.authenticatedContext("owner1", { email: "ada@cafe.test" }).firestore();
  const otherOwner = testEnv.authenticatedContext("owner2", { email: "other@cafe.test" }).firestore();
  const availability = {
    employeeId: "co1_emp1",
    kind: "recurring",
    weekday: 1,
    date: "",
    startTime: "09:00",
    endTime: "17:00",
    available: true,
    note: "",
    updatedAt: "2026-10-20T00:00:00.000Z",
  };
  const timeOff = {
    employeeId: "co1_emp1",
    startDate: "2026-11-02",
    endDate: "2026-11-02",
    startTime: "",
    endTime: "",
    reason: "Appointment",
    status: "pending",
    reviewNote: "",
    createdAt: "2026-10-20T00:00:00.000Z",
    reviewedAt: "",
  };

  await assertFails(setDoc(doc(employee, "companies/co2/availability/a1"), availability));
  await assertFails(
    setDoc(doc(employee, "companies/co1/availability/a1"), { ...availability, employeeId: "co1_other" }),
  );
  await assertSucceeds(setDoc(doc(employee, "companies/co1/availability/a1"), availability));
  await assertFails(getDoc(doc(otherOwner, "companies/co1/availability/a1")));
  await assertSucceeds(getDoc(doc(owner, "companies/co1/availability/a1")));
  await assertFails(deleteDoc(doc(owner, "companies/co1/availability/a1")));

  await assertFails(
    setDoc(doc(employee, "companies/co1/timeOff/t1"), { ...timeOff, status: "approved" }),
  );
  await assertSucceeds(setDoc(doc(employee, "companies/co1/timeOff/t1"), timeOff));
  await assertFails(
    updateDoc(doc(employee, "companies/co1/timeOff/t1"), { status: "approved", reviewedAt: "2026-10-21T00:00:00.000Z" }),
  );
  await assertFails(getDoc(doc(otherOwner, "companies/co1/timeOff/t1")));
  await assertSucceeds(
    setDoc(doc(owner, "companies/co1/timeOff/t1"), {
      ...timeOff,
      status: "approved",
      reviewedAt: "2026-10-21T00:00:00.000Z",
    }),
  );
  await assertFails(deleteDoc(doc(employee, "companies/co1/timeOff/t1")));
});

function boundedOpening(
  date: string,
  startTime: string,
  endTime: string,
) {
  const span = civilInterval(date, startTime, endTime);
  assert.ok(span);
  return {
    ...openingData(1, 0, LATER, startTime, endTime, date),
    startMin: span.start,
    endMin: span.end,
  };
}

function boundedClaim(
  employeeId: string,
  bookings: Array<{ shiftId: string; date: string; startTime: string; endTime: string }>,
) {
  return {
    employeeId,
    bookings: bookings.map((booking) => {
      const span = civilInterval(booking.date, booking.startTime, booking.endTime);
      assert.ok(span);
      return { ...booking, startMin: span.start, endMin: span.end };
    }),
  };
}

test("overnight bookings overlap across calendar dates when bounds are stored", async () => {
  const employee = testEnv.authenticatedContext("emp1", { email: "sam@cafe.test" }).firestore();
  const night = boundedOpening("2026-10-26", "22:00", "06:00");
  const early = boundedOpening("2026-10-27", "01:00", "03:00");
  const after = boundedOpening("2026-10-27", "06:00", "10:00");

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "companies/co1/openings/night"), night);
    await setDoc(doc(db, "companies/co1/openings/early"), early);
    await setDoc(doc(db, "companies/co1/openings/after"), after);
  });

  const first = writeBatch(employee);
  first.update(doc(employee, "companies/co1/openings/night"), {
    taken: 1,
    heldSignupId: "co1_emp1~night",
  });
  first.set(doc(employee, "companies/co1/signups/co1_emp1~night"), selectedSignup("co1_emp1", "night"));
  first.set(
    doc(employee, "companies/co1/claims/co1_emp1"),
    boundedClaim("co1_emp1", [
      { shiftId: "night", date: "2026-10-26", startTime: "22:00", endTime: "06:00" },
    ]),
  );
  await assertSucceeds(first.commit());

  const overlap = writeBatch(employee);
  overlap.update(doc(employee, "companies/co1/openings/early"), {
    taken: 1,
    heldSignupId: "co1_emp1~early",
  });
  overlap.set(doc(employee, "companies/co1/signups/co1_emp1~early"), selectedSignup("co1_emp1", "early"));
  overlap.set(
    doc(employee, "companies/co1/claims/co1_emp1"),
    boundedClaim("co1_emp1", [
      { shiftId: "night", date: "2026-10-26", startTime: "22:00", endTime: "06:00" },
      { shiftId: "early", date: "2026-10-27", startTime: "01:00", endTime: "03:00" },
    ]),
  );
  await assertFails(overlap.commit());

  const adjacent = writeBatch(employee);
  adjacent.update(doc(employee, "companies/co1/openings/after"), {
    taken: 1,
    heldSignupId: "co1_emp1~after",
  });
  adjacent.set(
    doc(employee, "companies/co1/signups/co1_emp1~after"),
    selectedSignup("co1_emp1", "after"),
  );
  adjacent.set(
    doc(employee, "companies/co1/claims/co1_emp1"),
    boundedClaim("co1_emp1", [
      { shiftId: "night", date: "2026-10-26", startTime: "22:00", endTime: "06:00" },
      { shiftId: "after", date: "2026-10-27", startTime: "06:00", endTime: "10:00" },
    ]),
  );
  await assertSucceeds(adjacent.commit());
});

test("manager assignments share the claim ledger and cannot overlap", async () => {
  const owner = testEnv.authenticatedContext("owner1", { email: "ada@cafe.test" }).firestore();
  const employee = testEnv.authenticatedContext("emp1", { email: "sam@cafe.test" }).firestore();
  const otherOwner = testEnv.authenticatedContext("owner2", { email: "other@cafe.test" }).firestore();
  const signedOut = testEnv.unauthenticatedContext().firestore();
  const night = boundedOpening("2026-10-26", "22:00", "06:00");
  const early = boundedOpening("2026-10-27", "01:00", "03:00");
  const after = boundedOpening("2026-10-27", "06:00", "10:00");

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "companies/co1/openings/assign-night"), night);
    await setDoc(doc(db, "companies/co1/openings/assign-early"), early);
    await setDoc(doc(db, "companies/co1/openings/assign-after"), after);
  });

  const assignment = (
    shiftId: string,
    date: string,
    startTime: string,
    endTime: string,
  ) => {
    const span = civilInterval(date, startTime, endTime);
    assert.ok(span);
    return {
      employeeId: "co1_emp1",
      shiftId,
      date,
      startTime,
      endTime,
      startMin: span.start,
      endMin: span.end,
    };
  };

  await assertFails(getDoc(doc(signedOut, "companies/co1/assignments/co1_emp1~assign-night")));
  await assertFails(
    setDoc(
      doc(employee, "companies/co1/assignments/co1_emp1~assign-night"),
      assignment("assign-night", "2026-10-26", "22:00", "06:00"),
    ),
  );
  await assertFails(
    setDoc(
      doc(otherOwner, "companies/co1/assignments/co1_emp1~assign-night"),
      assignment("assign-night", "2026-10-26", "22:00", "06:00"),
    ),
  );

  const first = writeBatch(owner);
  first.set(
    doc(owner, "companies/co1/claims/co1_emp1"),
    boundedClaim("co1_emp1", [
      { shiftId: "assign-night", date: "2026-10-26", startTime: "22:00", endTime: "06:00" },
    ]),
  );
  first.set(
    doc(owner, "companies/co1/assignments/co1_emp1~assign-night"),
    assignment("assign-night", "2026-10-26", "22:00", "06:00"),
  );
  await assertSucceeds(first.commit());

  const overlap = writeBatch(owner);
  overlap.set(
    doc(owner, "companies/co1/claims/co1_emp1"),
    boundedClaim("co1_emp1", [
      { shiftId: "assign-night", date: "2026-10-26", startTime: "22:00", endTime: "06:00" },
      { shiftId: "assign-early", date: "2026-10-27", startTime: "01:00", endTime: "03:00" },
    ]),
  );
  overlap.set(
    doc(owner, "companies/co1/assignments/co1_emp1~assign-early"),
    assignment("assign-early", "2026-10-27", "01:00", "03:00"),
  );
  await assertFails(overlap.commit());

  const adjacent = writeBatch(owner);
  adjacent.set(
    doc(owner, "companies/co1/claims/co1_emp1"),
    boundedClaim("co1_emp1", [
      { shiftId: "assign-night", date: "2026-10-26", startTime: "22:00", endTime: "06:00" },
      { shiftId: "assign-after", date: "2026-10-27", startTime: "06:00", endTime: "10:00" },
    ]),
  );
  adjacent.set(
    doc(owner, "companies/co1/assignments/co1_emp1~assign-after"),
    assignment("assign-after", "2026-10-27", "06:00", "10:00"),
  );
  await assertSucceeds(adjacent.commit());
});
