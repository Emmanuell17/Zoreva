import { getActiveCompany } from "@/lib/company/store";

export const defaultShiftPresets = [
  { label: "Morning", startTime: "06:00", endTime: "14:00", slots: 4, positions: ["Packer", "Picker"] },
  { label: "Afternoon", startTime: "14:00", endTime: "22:00", slots: 3, positions: ["Packer", "Picker"] },
] as const;

export type ShiftPreset = {
  label: string;
  startTime: string;
  endTime: string;
  slots: number;
  positions: string[];
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
      positions: [...template.positions],
    }));
  }

  return defaultShiftPresets.map((preset) => ({
    label: preset.label,
    startTime: preset.startTime,
    endTime: preset.endTime,
    slots: preset.slots,
    positions: [...preset.positions],
  }));
}
