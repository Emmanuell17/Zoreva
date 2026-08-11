export function daysFromToday(offset: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString();
}

export function hoursFromNow(offset: number): string {
  const date = new Date();
  date.setHours(date.getHours() + offset);
  return date.toISOString();
}
