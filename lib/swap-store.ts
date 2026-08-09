import { mockShiftSwapRequests } from "@/lib/mock-data";
import type { ShiftSwapRequest } from "@/types";

let swapRequests: ShiftSwapRequest[] = mockShiftSwapRequests.map((request) => ({
  ...request,
}));

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getSwapRequests(): ShiftSwapRequest[] {
  return swapRequests;
}

export function addSwapRequest(request: ShiftSwapRequest) {
  swapRequests = [request, ...swapRequests];
  notify();
}

export function updateSwapRequestStatus(
  id: string,
  status: ShiftSwapRequest["status"],
) {
  swapRequests = swapRequests.map((request) =>
    request.id === id ? { ...request, status } : request,
  );
  notify();
}

export function subscribeSwapRequests(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
