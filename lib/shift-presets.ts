import { getActiveCompany } from "@/lib/company/store";

export const defaultShiftPresets = [
  { label: "Morning", startTime: "06:00", endTime: "14:00", slots: 4 },
  { label: "Afternoon", startTime: "14:00", endTime: "22:00", slots: 3 },
] as const;

export type ShiftPreset = {
  label: string;
  startTime: string;
  endTime: string;
  slots: number;
};

export const shiftPresets = defaultShiftPresets;

export function getShiftPresets(): ShiftPreset[] {
  const company = getActiveCompany();
  if (company && company.shiftTemplates.length > 0) {
    return company.shiftTemplates.map((template) => ({
      label: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      slots: template.slots,
    }));
  }

  return defaultShiftPresets.map((preset) => ({
    label: preset.label,
    startTime: preset.startTime,
    endTime: preset.endTime,
    slots: preset.slots,
  }));
}
