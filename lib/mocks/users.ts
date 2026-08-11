import { daysFromToday } from "@/lib/mocks/dates";
import type { User } from "@/types";

export const CURRENT_EMPLOYEE_ID = "emp_demo_1";

export const usersSeed: User[] = [
  {
    id: CURRENT_EMPLOYEE_ID,
    name: "Alex Morgan",
    email: "alex.morgan@zoreva.app",
    role: "EMPLOYEE",
    createdAt: daysFromToday(-120),
  },
  {
    id: "emp_demo_2",
    name: "Jordan Lee",
    email: "jordan.lee@zoreva.app",
    role: "EMPLOYEE",
    createdAt: daysFromToday(-95),
  },
  {
    id: "emp_demo_3",
    name: "Sam Rivera",
    email: "sam.rivera@zoreva.app",
    role: "EMPLOYEE",
    createdAt: daysFromToday(-64),
  },
  {
    id: "emp_demo_4",
    name: "Casey Nguyen",
    email: "casey.nguyen@zoreva.app",
    role: "EMPLOYEE",
    createdAt: daysFromToday(-40),
  },
  {
    id: "emp_demo_5",
    name: "Riley Brooks",
    email: "riley.brooks@zoreva.app",
    role: "EMPLOYEE",
    createdAt: daysFromToday(-18),
  },
  {
    id: "mgr_demo_1",
    name: "Taylor Quinn",
    email: "taylor.quinn@zoreva.app",
    role: "MANAGER",
    createdAt: daysFromToday(-200),
  },
];
