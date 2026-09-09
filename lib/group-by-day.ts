import { formatDayLabel } from "@/lib/utils";

export function groupByDay<T extends { date: string | Date }>(
  items: T[],
): Array<{ label: string; items: T[] }> {
  const groups: Array<{ label: string; items: T[] }> = [];

  for (const item of items) {
    const label = formatDayLabel(item.date);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }

  return groups;
}
