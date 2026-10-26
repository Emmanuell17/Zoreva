import assert from "node:assert/strict";
import test from "node:test";
import { createAdvisorJob, getAdvisorJobForOwner } from "@/lib/advisor/store";

test("advisor jobs are visible only to the manager who uploaded them", () => {
  const job = createAdvisorJob(
    {
      bytes: new Uint8Array([1]),
      filename: "roster.csv",
      mimeType: "text/csv",
    },
    { uid: "owner", companyId: "co1" },
  );

  assert.equal(getAdvisorJobForOwner(job.id, "owner")?.id, job.id);
  assert.equal(getAdvisorJobForOwner(job.id, "emp"), null);
  assert.equal(getAdvisorJobForOwner("missing", "owner"), null);
  assert.equal("file" in (getAdvisorJobForOwner(job.id, "owner") ?? {}), true);
});
