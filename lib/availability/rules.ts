export type ConflictLevel = "block" | "warn" | "ignore";

export type AvailabilityRules = {
  overlappingShift: "block";
  approvedTimeOff: "block" | "warn";
  declaredUnavailable: "block" | "warn";
  pendingTimeOff: "block" | "warn";
  outsideSubmittedAvailability: "block" | "warn" | "ignore";
};

export const DEFAULT_AVAILABILITY_RULES: AvailabilityRules = {
  overlappingShift: "block",
  approvedTimeOff: "block",
  declaredUnavailable: "block",
  pendingTimeOff: "warn",
  outsideSubmittedAvailability: "warn",
};

export function resolveAvailabilityRules(
  rules?: Partial<AvailabilityRules> | null,
): AvailabilityRules {
  return {
    ...DEFAULT_AVAILABILITY_RULES,
    ...rules,
    overlappingShift: "block",
  };
}
