import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import {
  FuelSettings,
  DEFAULT_SETTINGS,
  CapitalRefill,
  FuelTransaction,
  EnrichedFuelTransaction,
} from "@/types/fuel";

const LS_SETTINGS_KEY = "catatan_minyak_settings_v2";
const LS_REFILLS_KEY = "catatan_minyak_refills_v2";
const LS_TRANSACTIONS_KEY = "catatan_minyak_transactions_v2";

// Bersihkan sisa data contoh lama (v1) di browser jika ada
if (typeof window !== "undefined") {
  localStorage.removeItem("catatan_minyak_settings_v1");
  localStorage.removeItem("catatan_minyak_refills_v1");
  localStorage.removeItem("catatan_minyak_transactions_v1");
  localStorage.removeItem("catatan_minyak_seeded_v1");
}

export type FirestoreConnectionState =
  | "connected"
  | "permission_denied"
  | "error"
  | "local_only";

let lastConnectionState: FirestoreConnectionState = isFirebaseConfigured
  ? "connected"
  : "local_only";

export function getFirestoreConnectionState(): FirestoreConnectionState {
  return lastConnectionState;
}

function handleFirestoreError(err: unknown) {
  const code = (err as { code?: string })?.code || "";
  if (code.includes("permission-denied")) {
    lastConnectionState = "permission_denied";
  } else {
    lastConnectionState = "error";
  }
  console.warn("Firestore fallback ke penyimpanan lokal:", code, err);
}

// ==========================================
// 1. SETTINGS (Jatah Modal & Harga BBM)
// ==========================================
export async function getSettings(): Promise<FuelSettings> {
  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, "app_config", "fuel_settings");
      const snap = await getDoc(ref);
      lastConnectionState = "connected";
      if (snap.exists()) {
        const data = snap.data() as Partial<FuelSettings>;
        const merged: FuelSettings = {
          subsidyPerFill: data.subsidyPerFill ?? DEFAULT_SETTINGS.subsidyPerFill,
          fuelTypes:
            data.fuelTypes && data.fuelTypes.length > 0
              ? data.fuelTypes
              : DEFAULT_SETTINGS.fuelTypes,
          kmPerLiterMethod:
            data.kmPerLiterMethod ?? DEFAULT_SETTINGS.kmPerLiterMethod,
        };
        if (typeof window !== "undefined") {
          localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(merged));
        }
        return merged;
      }
    } catch (err) {
      handleFirestoreError(err);
    }
  }

  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<FuelSettings>;
        return {
          subsidyPerFill:
            parsed.subsidyPerFill ?? DEFAULT_SETTINGS.subsidyPerFill,
          fuelTypes:
            parsed.fuelTypes && parsed.fuelTypes.length > 0
              ? parsed.fuelTypes
              : DEFAULT_SETTINGS.fuelTypes,
          kmPerLiterMethod:
            parsed.kmPerLiterMethod ?? DEFAULT_SETTINGS.kmPerLiterMethod,
        };
      } catch {
        // ignore parse error
      }
    }
  }

  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: FuelSettings): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
  }

  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, "app_config", "fuel_settings");
      await setDoc(ref, settings, { merge: true });
      lastConnectionState = "connected";
    } catch (err) {
      handleFirestoreError(err);
    }
  }
}

// ==========================================
// 2. MODAL MINYAK / REFILL SALDO
// ==========================================
function getLocalRefills(): CapitalRefill[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LS_REFILLS_KEY);
  if (!raw) return [];
  try {
    const items = JSON.parse(raw) as CapitalRefill[];
    return items.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function getCapitalRefills(): Promise<CapitalRefill[]> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, "capital_refills"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      lastConnectionState = "connected";
      const cloudItems = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CapitalRefill, "id">),
      }));

      if (typeof window !== "undefined") {
        localStorage.setItem(LS_REFILLS_KEY, JSON.stringify(cloudItems));
      }
      return cloudItems;
    } catch (err) {
      handleFirestoreError(err);
    }
  }

  return getLocalRefills();
}

export async function addCapitalRefill(
  data: Omit<CapitalRefill, "id" | "createdAt">
): Promise<CapitalRefill> {
  const payload = {
    ...data,
    createdAt: Date.now(),
  };

  if (isFirebaseConfigured && db) {
    try {
      const docRef = await addDoc(collection(db, "capital_refills"), payload);
      lastConnectionState = "connected";
      const created = { id: docRef.id, ...payload };
      if (typeof window !== "undefined") {
        const existing = getLocalRefills();
        localStorage.setItem(
          LS_REFILLS_KEY,
          JSON.stringify([created, ...existing])
        );
      }
      return created;
    } catch (err) {
      handleFirestoreError(err);
    }
  }

  const newItem: CapitalRefill = {
    id: `refill_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...payload,
  };
  if (typeof window !== "undefined") {
    const existing = getLocalRefills();
    localStorage.setItem(
      LS_REFILLS_KEY,
      JSON.stringify([newItem, ...existing])
    );
  }
  return newItem;
}

export async function deleteCapitalRefill(id: string): Promise<void> {
  if (typeof window !== "undefined") {
    const existing = getLocalRefills();
    localStorage.setItem(
      LS_REFILLS_KEY,
      JSON.stringify(existing.filter((item) => item.id !== id))
    );
  }

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, "capital_refills", id));
      lastConnectionState = "connected";
    } catch (err) {
      handleFirestoreError(err);
    }
  }
}

// ==========================================
// 3. TRANSAKSI PENGISIAN BBM
// ==========================================
function getLocalTransactions(): FuelTransaction[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LS_TRANSACTIONS_KEY);
  if (!raw) return [];
  try {
    const items = JSON.parse(raw) as FuelTransaction[];
    return items.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function getFuelTransactions(): Promise<FuelTransaction[]> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, "fuel_transactions"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      lastConnectionState = "connected";
      const cloudItems = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<FuelTransaction, "id">),
      }));

      if (typeof window !== "undefined") {
        localStorage.setItem(LS_TRANSACTIONS_KEY, JSON.stringify(cloudItems));
      }
      return cloudItems;
    } catch (err) {
      handleFirestoreError(err);
    }
  }

  return getLocalTransactions();
}

export async function addFuelTransaction(
  data: Omit<FuelTransaction, "id" | "createdAt">
): Promise<FuelTransaction> {
  const payload = {
    ...data,
    createdAt: Date.now(),
  };

  if (isFirebaseConfigured && db) {
    try {
      const docRef = await addDoc(collection(db, "fuel_transactions"), payload);
      lastConnectionState = "connected";
      const created = { id: docRef.id, ...payload };
      if (typeof window !== "undefined") {
        const existing = getLocalTransactions();
        localStorage.setItem(
          LS_TRANSACTIONS_KEY,
          JSON.stringify([created, ...existing])
        );
      }
      return created;
    } catch (err) {
      handleFirestoreError(err);
    }
  }

  const newItem: FuelTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...payload,
  };
  if (typeof window !== "undefined") {
    const existing = getLocalTransactions();
    localStorage.setItem(
      LS_TRANSACTIONS_KEY,
      JSON.stringify([newItem, ...existing])
    );
  }
  return newItem;
}

export async function updateFuelTransaction(
  id: string,
  data: Omit<FuelTransaction, "id" | "createdAt">
): Promise<void> {
  if (typeof window !== "undefined") {
    const existing = getLocalTransactions();
    const updated = existing.map((item) =>
      item.id === id ? { ...item, ...data } : item
    );
    localStorage.setItem(LS_TRANSACTIONS_KEY, JSON.stringify(updated));
  }

  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, "fuel_transactions", id), { ...data });
      lastConnectionState = "connected";
    } catch (err) {
      handleFirestoreError(err);
    }
  }
}

export async function deleteFuelTransaction(id: string): Promise<void> {
  if (typeof window !== "undefined") {
    const existing = getLocalTransactions();
    localStorage.setItem(
      LS_TRANSACTIONS_KEY,
      JSON.stringify(existing.filter((item) => item.id !== id))
    );
  }

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, "fuel_transactions", id));
      lastConnectionState = "connected";
    } catch (err) {
      handleFirestoreError(err);
    }
  }
}

// ==========================================
// 4. RESET SEMUA DATA KE AWAL (KOSONG)
// ==========================================
export async function resetAllData(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LS_REFILLS_KEY);
    localStorage.removeItem(LS_TRANSACTIONS_KEY);
  }

  if (isFirebaseConfigured && db) {
    try {
      const [refillSnap, txSnap] = await Promise.all([
        getDocs(collection(db, "capital_refills")),
        getDocs(collection(db, "fuel_transactions")),
      ]);

      const deletions: Promise<void>[] = [];
      refillSnap.docs.forEach((d) => {
        deletions.push(deleteDoc(doc(db!, "capital_refills", d.id)));
      });
      txSnap.docs.forEach((d) => {
        deletions.push(deleteDoc(doc(db!, "fuel_transactions", d.id)));
      });
      await Promise.all(deletions);
      lastConnectionState = "connected";
    } catch (err) {
      handleFirestoreError(err);
    }
  }
}

// ==========================================
// 5. PERHITUNGAN ODOMETER (KM) & RATA-RATA KM/L
// ==========================================
export function enrichTransactionsWithKmStats(
  transactions: FuelTransaction[]
): EnrichedFuelTransaction[] {
  const chronological = [...transactions].sort((a, b) => {
    if (a.tanggal !== b.tanggal) {
      return a.tanggal.localeCompare(b.tanggal);
    }
    if (a.odometerKm !== b.odometerKm) {
      return a.odometerKm - b.odometerKm;
    }
    return a.createdAt - b.createdAt;
  });

  const enrichedMap = new Map<string, EnrichedFuelTransaction>();
  let lastValidTx: FuelTransaction | null = null;

  for (const tx of chronological) {
    let prevOdometerKm: number | null = null;
    let jarakTempuhKm: number | null = null;
    let kmPerLiterFromPrev: number | null = null;
    let kmPerLiterFromCurrent: number | null = null;
    let biayaPerKm: number | null = null;

    if (tx.odometerKm > 0) {
      if (lastValidTx && tx.odometerKm > lastValidTx.odometerKm) {
        prevOdometerKm = lastValidTx.odometerKm;
        jarakTempuhKm = tx.odometerKm - lastValidTx.odometerKm;

        if (lastValidTx.jumlahLiter > 0) {
          kmPerLiterFromPrev = Number(
            (jarakTempuhKm / lastValidTx.jumlahLiter).toFixed(2)
          );
        }
        if (tx.jumlahLiter > 0) {
          kmPerLiterFromCurrent = Number(
            (jarakTempuhKm / tx.jumlahLiter).toFixed(2)
          );
        }
        if (jarakTempuhKm > 0) {
          biayaPerKm = Math.round(tx.totalBayar / jarakTempuhKm);
        }
      }
      lastValidTx = tx;
    }

    enrichedMap.set(tx.id, {
      ...tx,
      prevOdometerKm,
      jarakTempuhKm,
      kmPerLiterFromPrev,
      kmPerLiterFromCurrent,
      biayaPerKm,
    });
  }

  return [...chronological]
    .reverse()
    .map((tx) => enrichedMap.get(tx.id)!);
}
