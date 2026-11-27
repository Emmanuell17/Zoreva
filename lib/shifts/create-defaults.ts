export function defaultSelectedDays(days: string[], initialDate?: string): string[] {
  if (initialDate && days.includes(initialDate)) return [initialDate];
  return days[0] ? [days[0]] : [];
}

export function shiftsToCreate(input: {
  severalDays: boolean;
  selectedDayCount: number;
  presetCount: number;
}): number {
  if (input.severalDays) return input.selectedDayCount * input.presetCount;
  return input.presetCount > 0 ? input.presetCount : 1;
}
