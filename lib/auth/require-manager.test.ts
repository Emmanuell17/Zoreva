import assert from "node:assert/strict";
import test from "node:test";
import { authorizeManager, type AuthIo } from "@/lib/auth/require-manager";

function io(docs: Record<string, Record<string, unknown> | null>): AuthIo {
  return {
    projectId: "demo-zoreva",
    async verify(token: string) {
      if (token === "owner-token") return { uid: "owner", email: "ada@cafe.test" };
      if (token === "employee-token") return { uid: "emp", email: "sam@cafe.test" };
      throw new Error("bad token");
    },
    async readDocument(path: string) {
      return docs[path] ?? null;
    },
  };
}

const managerDocs = {
  "memberships/owner": {
    userId: "owner",
    companyId: "co1",
    employeeId: "co1_owner",
    role: "ADMIN",
  },
  "companies/co1": { id: "co1", ownerId: "owner" },
};

test("advisor access rejects missing and invalid tokens", async () => {
  const missing = await authorizeManager(null, io(managerDocs));
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.status, 401);

  const bad = await authorizeManager("Bearer nope", io(managerDocs));
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.status, 401);
});

test("employees and cross-company managers cannot run the advisor", async () => {
  const employee = await authorizeManager(
    "Bearer employee-token",
    io({
      "memberships/emp": {
        userId: "emp",
        companyId: "co1",
        employeeId: "co1_emp",
        role: "EMPLOYEE",
      },
      "companies/co1": { id: "co1", ownerId: "owner" },
    }),
  );
  assert.equal(employee.ok, false);
  if (!employee.ok) assert.equal(employee.status, 403);

  const otherCompany = await authorizeManager(
    "Bearer owner-token",
    io({
      "memberships/owner": {
        userId: "owner",
        companyId: "co1",
        employeeId: "co1_owner",
        role: "ADMIN",
      },
      "companies/co1": { id: "co1", ownerId: "someone-else" },
    }),
  );
  assert.equal(otherCompany.ok, false);
  if (!otherCompany.ok) assert.equal(otherCompany.status, 403);
});

test("the company id comes from the membership document", async () => {
  const allowed = await authorizeManager("Bearer owner-token", io(managerDocs));
  assert.equal(allowed.ok, true);
  if (allowed.ok) {
    assert.equal(allowed.access.uid, "owner");
    assert.equal(allowed.access.companyId, "co1");
  }
});
