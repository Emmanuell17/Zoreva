export type NavItem = {
  href: string;
  label: string;
};

export const employeeNav: NavItem[] = [
  { href: "/employee", label: "Dashboard" },
  { href: "/employee/availability", label: "Availability" },
  { href: "/employee/shifts", label: "Shifts" },
  { href: "/employee/swaps", label: "Swaps" },
  { href: "/employee/notifications", label: "Notifications" },
];

export const managerNav: NavItem[] = [
  { href: "/manager", label: "Dashboard" },
  { href: "/manager/employees", label: "Employees" },
  { href: "/manager/availability", label: "Availability" },
  { href: "/manager/shifts", label: "Shifts" },
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
  const nested = navItems.find(
    (item) => item.href !== pathname && pathname.startsWith(item.href),
  );
  return nested?.label ?? fallback;
}
