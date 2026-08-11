import { swapRequestsSeed } from "@/lib/mocks/swaps";
import type { ShiftSwapRequest } from "@/types";

let swapRequests: ShiftSwapRequest[] = swapRequestsSeed.map((request) => ({
  ...request,
}));
let swapRequestsSnapshot = swapRequests.map((request) => ({ ...request }));

const listeners = new Set<() => void>();

function notify() {
  swapRequestsSnapshot = swapRequests.map((request) => ({ ...request }));
  listeners.forEach((listener) => listener());
}

export function getSwapRequests(): ShiftSwapRequest[] {
  return swapRequestsSnapshot;
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
