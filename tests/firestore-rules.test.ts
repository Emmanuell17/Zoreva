import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
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
  await assertSucceeds(
    setDoc(doc(db, "companies/co1/signups/mine"), {
      shiftId: "shift1",
      employeeId: "co1_emp1",
      status: "SELECTED",
      selectedAt: "2026-10-26T00:00:00.000Z",
      confirmedAt: null,
    }),
  );
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
