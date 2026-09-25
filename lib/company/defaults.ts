export const SETUP_PATH = "/setup";
export const JOIN_PATH = "/join";
export const LOCAL_OWNER_ID = "local-dev";

export const defaultShiftTemplates = [
  { name: "Morning", startTime: "06:00", endTime: "14:00", slots: 4 },
  { name: "Afternoon", startTime: "14:00", endTime: "22:00", slots: 4 },
  { name: "Evening", startTime: "18:00", endTime: "23:00", slots: 3 },
  { name: "Day", startTime: "08:00", endTime: "16:00", slots: 4 },
  { name: "Split", startTime: "10:00", endTime: "18:00", slots: 3 },
] as const;

export function templateDefaults(index: number) {
  return defaultShiftTemplates[index] ?? {
    name: `Shift ${index + 1}`,
    startTime: "08:00",
    endTime: "16:00",
    slots: 4,
  };
}
