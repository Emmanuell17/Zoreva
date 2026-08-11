"use client";

import { useState, useSyncExternalStore } from "react";
import { ShiftSwapForm } from "@/components/employee/shift-swap-form";
import { ShiftCardList } from "@/components/shifts/shift-card-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  addSwapRequest,
  getEmployeeShifts,
  subscribeShifts,
  updateShiftStatus,
} from "@/lib/services";
import { useInitialLoading } from "@/hooks/use-initial-loading";
import type { Shift, ShiftSwapRequest } from "@/types";

type EmployeeShiftListProps = {
  limit?: number;
  emptyMessage?: string;
  emptyDescription?: string;
};

function useEmployeeShifts(limit?: number) {
  return useSyncExternalStore(
    subscribeShifts,
    () => getEmployeeShifts(undefined, limit),
    () => getEmployeeShifts(undefined, limit),
  );
}

export function EmployeeShiftList({
  limit,
  emptyMessage = "No shifts assigned yet.",
  emptyDescription,
}: EmployeeShiftListProps) {
  const loading = useInitialLoading();
  const visibleShifts = useEmployeeShifts(limit);
  const [cancelTarget, setCancelTarget] = useState<Shift | null>(null);
  const [cancelNote, setCancelNote] = useState("");
  const [swapTarget, setSwapTarget] = useState<Shift | null>(null);
  const [swapMessage, setSwapMessage] = useState<string | null>(null);

  function confirmShift(shiftId: string) {
    updateShiftStatus(shiftId, "CONFIRMED");
  }

  function openCancel(shift: Shift) {
    setCancelTarget(shift);
    setCancelNote(shift.note ?? "");
  }

  function closeCancel() {
    setCancelTarget(null);
    setCancelNote("");
  }

  function submitCancel() {
    if (!cancelTarget) return;

    const note = cancelNote.trim();
    updateShiftStatus(
      cancelTarget.id,
      "CANCELLED",
      note.length > 0 ? note : cancelTarget.note,
    );
    closeCancel();
  }

  function handleSwapSubmit(request: ShiftSwapRequest) {
    addSwapRequest(request);
    setSwapMessage("Swap request sent. Track it under Swaps.");
  }

  return (
    <>
      {swapMessage ? (
        <p className="mb-3 text-xs text-emerald-300">{swapMessage}</p>
      ) : null}

      <ShiftCardList
        shifts={visibleShifts}
        loading={loading}
        emptyMessage={emptyMessage}
        emptyDescription={emptyDescription}
        renderActions={(shift) => {
          if (shift.status === "CANCELLED") return null;

          return (
            <>
              {shift.status === "PENDING" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => confirmShift(shift.id)}
                >
                  Confirm
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSwapTarget(shift)}
              >
                Request swap
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => openCancel(shift)}
              >
                Cancel
              </Button>
            </>
          );
        }}
      />

      <Modal
        open={cancelTarget !== null}
        onClose={closeCancel}
        title="Cancel shift"
        description="Add an optional note so your manager knows why."
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Note (optional)"
            name="cancelNote"
            value={cancelNote}
            onChange={(event) => setCancelNote(event.target.value)}
            placeholder="e.g. Schedule conflict"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={closeCancel}>
              Keep shift
            </Button>
            <Button variant="danger" size="sm" onClick={submitCancel}>
              Cancel shift
            </Button>
          </div>
        </div>
      </Modal>

      <ShiftSwapForm
        open={swapTarget !== null}
        shift={swapTarget}
        onClose={() => setSwapTarget(null)}
        onSubmit={handleSwapSubmit}
      />
    </>
  );
}
