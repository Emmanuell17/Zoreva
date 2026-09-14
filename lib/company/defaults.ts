export const SETUP_PATH = "/setup";
export const LOCAL_OWNER_ID = "local-dev";

export const defaultShiftTemplates = [
  { name: "Morning", startTime: "06:00", endTime: "14:00", slots: 4, positions: "Packer, Picker" },
  { name: "Afternoon", startTime: "14:00", endTime: "22:00", slots: 4, positions: "Packer, Picker" },
  { name: "Evening", startTime: "18:00", endTime: "23:00", slots: 3, positions: "Packer, Loader" },
  { name: "Day", startTime: "08:00", endTime: "16:00", slots: 4, positions: "Operator, Packer" },
  { name: "Split", startTime: "10:00", endTime: "18:00", slots: 3, positions: "Picker, Packer" },
] as const;

export function templateDefaults(index: number) {
  return defaultShiftTemplates[index] ?? {
    name: `Shift ${index + 1}`,
    startTime: "08:00",
    endTime: "16:00",
    slots: 4,
    positions: "Packer, Picker",
  };
}
