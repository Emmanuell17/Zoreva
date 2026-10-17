function validateAdvisorAnalysis(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const summary = typeof value.summary === "string" ? value.summary.trim() : "";
  if (!summary) return null;
  const missingInformation = Array.isArray(value.missingInformation)
    ? value.missingInformation.filter((item) => typeof item === "string" && item.trim())
    : [];
  const inconsistentRecords = Array.isArray(value.inconsistentRecords)
    ? value.inconsistentRecords.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          Number.isInteger(item.row) &&
          item.row > 0 &&
          typeof item.issue === "string" &&
          item.issue.trim(),
      )
    : [];
  const staffingIssues = Array.isArray(value.staffingIssues)
    ? value.staffingIssues.filter((item) => typeof item === "string" && item.trim())
    : [];
  const recommendations = Array.isArray(value.recommendations)
    ? value.recommendations.filter((item) => typeof item === "string" && item.trim())
    : [];
  if (
    missingInformation.length +
      inconsistentRecords.length +
      staffingIssues.length +
      recommendations.length ===
      0 &&
    summary.length < 12
  ) {
    return null;
  }
  return { summary, missingInformation, inconsistentRecords, staffingIssues, recommendations };
}

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

assert(validateAdvisorAnalysis(null) === null, "null should be rejected");
assert(validateAdvisorAnalysis({ summary: "ok" }) === null, "empty findings with short summary should be rejected");
assert(
  validateAdvisorAnalysis({
    summary: "Two people are double booked on Monday.",
    missingInformation: ["Row 3 has no name"],
    inconsistentRecords: [{ row: 5, issue: "End before start" }],
    staffingIssues: ["Monday asks for 0 people"],
    recommendations: ["Ask managers to fill names"],
  }),
  "valid analysis should pass",
);
assert(
  validateAdvisorAnalysis({
    summary: "Looks fine",
    missingInformation: "nope",
  }) === null,
  "malformed lists should be rejected",
);

console.log("Advisor JSON validation tests passed.");
