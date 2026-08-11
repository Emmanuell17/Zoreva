import { hoursFromNow } from "@/lib/mocks/dates";
import { CURRENT_EMPLOYEE_ID } from "@/lib/mocks/users";
import type { ShiftSwapRequest } from "@/types";

export const swapRequestsSeed: ShiftSwapRequest[] = [
  {
    id: "swap_1",
    fromShiftId: "shift_2",
    fromEmployeeId: CURRENT_EMPLOYEE_ID,
    toEmployeeId: "emp_demo_2",
    toShiftId: "shift_6",
    message: "Can we trade mid shifts this week?",
    status: "PENDING",
    createdAt: hoursFromNow(-5),
  },
  {
    id: "swap_3",
    fromShiftId: "shift_7",
    fromEmployeeId: "emp_demo_3",
    toEmployeeId: "emp_demo_4",
    toShiftId: null,
    message: "Need coverage for the opening block.",
    status: "PENDING",
    createdAt: hoursFromNow(-12),
  },
  {
    id: "swap_2",
    fromShiftId: "shift_5",
    fromEmployeeId: CURRENT_EMPLOYEE_ID,
    toEmployeeId: "emp_demo_5",
    toShiftId: "shift_9",
    message: null,
    status: "DECLINED",
    createdAt: hoursFromNow(-40),
  },
];
