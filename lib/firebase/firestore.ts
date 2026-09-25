import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseApp, isFirebaseConfigured } from "@/lib/firebase/config";

let firestoreInstance: Firestore | null = null;

export function getFirebaseFirestore(): Firestore {
  if (typeof window === "undefined") {
    throw new Error("Firestore is only available in the browser.");
  }

  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getFirebaseApp());
  }

  return firestoreInstance;
}

export function canUseFirestore(): boolean {
  return typeof window !== "undefined" && isFirebaseConfigured();
}
