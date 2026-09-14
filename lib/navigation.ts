export type NavItem = {
  href: string;
  label: string;
};

export const employeeNav: NavItem[] = [
  { href: "/employee", label: "Home" },
  { href: "/employee/choose", label: "Choose" },
  { href: "/employee/schedule", label: "Schedule" },
  { href: "/employee/hours", label: "Hours" },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Home" },
  { href: "/admin/shifts", label: "Shifts" },
  { href: "/admin/hours", label: "Hours" },
  { href: "/admin/history", label: "History" },
];

export function isNavItemActive(
  pathname: string,
  href: string,
  homeHref: string,
): boolean {
  if (href === homeHref) {
    return pathname === homeHref;
  }
  return pathname.startsWith(href);
}

export function getPageTitle(
  pathname: string,
  navItems: NavItem[],
  fallback = "Zoreva",
): string {
  const exact = navItems.find((item) => item.href === pathname);
  if (exact) return exact.label;
  if (pathname.startsWith("/employee/reminders")) return "Reminders";
  if (pathname.startsWith("/setup")) return "Setup";
  const nested = navItems.find(
    (item) => item.href !== pathname && pathname.startsWith(item.href),
  );
  return nested?.label ?? fallback;
}
