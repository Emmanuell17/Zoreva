export type LocalWorkforceFindings = {
  rowCount: number;
  missingInformation: string[];
  inconsistentRecords: Array<{ row: number; issue: string }>;
  staffingIssues: string[];
};
