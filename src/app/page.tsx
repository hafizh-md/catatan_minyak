"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Fuel,
  Wallet,
  Gauge,
  PlusCircle,
  Settings,
  Download,
  Printer,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Plus,
  X,
  Calendar,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
} from "lucide-react";
import {
  FuelSettings,
  DEFAULT_SETTINGS,
  CapitalRefill,
  FuelTransaction,
  FuelTypeOption,
  EnrichedFuelTransaction,
} from "@/types/fuel";
import {
  getSettings,
  saveSettings,
  getCapitalRefills,
  addCapitalRefill,
  deleteCapitalRefill,
  getFuelTransactions,
  addFuelTransaction,
  updateFuelTransaction,
  deleteFuelTransaction,
  enrichTransactionsWithKmStats,
  getFirestoreConnectionState,
  FirestoreConnectionState,
  resetAllData,
} from "@/lib/storage";
import { isFirebaseConfigured } from "@/lib/firebase";

function formatRupiah(num: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(num));
}

function formatNumber(num: number, maxDecimals = 2): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(num);
}

export default function CatatanMinyakPage() {
  const [loading, setLoading] = useState(true);
  const [connState, setConnState] = useState<FirestoreConnectionState>(
    isFirebaseConfigured ? "connected" : "local_only"
  );
  const [settings, setSettings] = useState<FuelSettings>(DEFAULT_SETTINGS);
  const [refills, setRefills] = useState<CapitalRefill[]>([]);
  const [transactions, setTransactions] = useState<FuelTransaction[]>([]);
  const [showNavMenu, setShowNavMenu] = useState(false);

  // Modal states
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Form Refill Modal state
  const [refillTanggal, setRefillTanggal] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [refillNominal, setRefillNominal] = useState<string>("1000000");
  const [refillKeterangan, setRefillKeterangan] = useState<string>("Refill Modal");

  // Form Settings state
  const [editSubsidy, setEditSubsidy] = useState<string>("40000");
  const [editFuelTypes, setEditFuelTypes] = useState<FuelTypeOption[]>(
    DEFAULT_SETTINGS.fuelTypes
  );
  const [editKmMethod, setEditKmMethod] = useState<
    "prev_liter" | "current_liter"
  >("prev_liter");
  const [newFuelName, setNewFuelName] = useState("");
  const [newFuelPrice, setNewFuelPrice] = useState("");

  // Form Transaksi Isi BBM state
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txTanggal, setTxTanggal] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [txJenisBbm, setTxJenisBbm] = useState<string>("Pertalite");
  const [txHargaPerLiter, setTxHargaPerLiter] = useState<number>(10000);
  const [txTotalBayar, setTxTotalBayar] = useState<string>("65000");
  const [txPakaiModal, setTxPakaiModal] = useState<boolean>(true);
  const [txCustomPotongModal, setTxCustomPotongModal] = useState<string>("40000");
  const [txOdometerKm, setTxOdometerKm] = useState<string>("");
  const [txKeterangan, setTxKeterangan] = useState<string>("");

  // Filter states
  const [filterBulan, setFilterBulan] = useState<string>("ALL");
  const [filterBbm, setFilterBbm] = useState<string>("ALL");
  const [filterModalStatus, setFilterModalStatus] = useState<string>("ALL");

  // View mode & Kalender states
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [loadedSettings, loadedRefills, loadedTx] = await Promise.all([
        getSettings(),
        getCapitalRefills(),
        getFuelTransactions(),
      ]);
      setSettings(loadedSettings);
      setRefills(loadedRefills);
      setTransactions(loadedTx);
      setConnState(getFirestoreConnectionState());

      setEditSubsidy(String(loadedSettings.subsidyPerFill));
      setEditFuelTypes(loadedSettings.fuelTypes);
      setEditKmMethod(loadedSettings.kmPerLiterMethod);
      setTxCustomPotongModal(String(loadedSettings.subsidyPerFill));

      if (loadedSettings.fuelTypes.length > 0) {
        const firstFuel = loadedSettings.fuelTypes[0];
        setTxJenisBbm(firstFuel.name);
        setTxHargaPerLiter(firstFuel.pricePerLiter);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const enrichedTransactions = useMemo(
    () => enrichTransactionsWithKmStats(transactions),
    [transactions]
  );

  const capitalSummary = useMemo(() => {
    const totalModalMasuk = refills.reduce((acc, r) => acc + r.nominal, 0);
    const totalModalTerpakai = transactions.reduce(
      (acc, t) => acc + (t.pakaiModal ? t.potongModal : 0),
      0
    );
    const sisaModal = Math.max(0, totalModalMasuk - totalModalTerpakai);
    const jatahSekaliIsi = settings.subsidyPerFill || 40000;

    const kuotaDariTotalModal =
      jatahSekaliIsi > 0 ? Math.floor(totalModalMasuk / jatahSekaliIsi) : 0;
    const sisaKuotaNgisi =
      jatahSekaliIsi > 0 ? Math.floor(sisaModal / jatahSekaliIsi) : 0;
    const sisaRecehModal =
      jatahSekaliIsi > 0 ? sisaModal % jatahSekaliIsi : 0;
    const berapaKaliPakaiModal = transactions.filter((t) => t.pakaiModal).length;

    return {
      totalModalMasuk,
      totalModalTerpakai,
      sisaModal,
      jatahSekaliIsi,
      kuotaDariTotalModal,
      sisaKuotaNgisi,
      sisaRecehModal,
      berapaKaliPakaiModal,
    };
  }, [refills, transactions, settings.subsidyPerFill]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.tanggal && t.tanggal.length >= 7) {
        set.add(t.tanggal.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // Transaksi dikelompokkan per tanggal untuk tampilan Kalender
  const txByDate = useMemo(() => {
    const map = new Map<string, EnrichedFuelTransaction[]>();
    enrichedTransactions.forEach((tx) => {
      const existing = map.get(tx.tanggal) || [];
      existing.push(tx);
      map.set(tx.tanggal, existing);
    });
    return map;
  }, [enrichedTransactions]);

  // Perhitungan Data Grid Kalender Bulanan
  const calendarData = useMemo(() => {
    const [year, month] = calendarMonth.split("-").map(Number);
    const dateObj = new Date(year, month - 1, 1);
    const monthName = dateObj.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    // 0 = Senin, 6 = Minggu
    const firstDayIndex = (new Date(year, month - 1, 1).getDay() + 6) % 7;

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      transactions: EnrichedFuelTransaction[];
      totalSpent: number;
    }> = [];

    // Kotak kosong sebelum tanggal 1
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({
        dateStr: "",
        dayNumber: 0,
        isCurrentMonth: false,
        isToday: false,
        transactions: [],
        totalSpent: 0,
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    let monthTotalSpent = 0;
    let monthTotalLiter = 0;
    let monthTxCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayFormatted = d < 10 ? `0${d}` : `${d}`;
      const dateStr = `${calendarMonth}-${dayFormatted}`;
      const dayTxs = txByDate.get(dateStr) || [];
      const dayTotal = dayTxs.reduce((sum, t) => sum + t.totalBayar, 0);
      const dayLiter = dayTxs.reduce((sum, t) => sum + t.jumlahLiter, 0);

      monthTotalSpent += dayTotal;
      monthTotalLiter += dayLiter;
      monthTxCount += dayTxs.length;

      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        transactions: dayTxs,
        totalSpent: dayTotal,
      });
    }

    return {
      monthName,
      days,
      monthTotalSpent,
      monthTotalLiter,
      monthTxCount,
    };
  }, [calendarMonth, txByDate]);

  const handlePrevMonth = () => {
    const [y, m] = calendarMonth.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    setCalendarMonth(prev.toISOString().slice(0, 7));
    setSelectedCalendarDate(null);
  };

  const handleNextMonth = () => {
    const [y, m] = calendarMonth.split("-").map(Number);
    const next = new Date(y, m, 1);
    setCalendarMonth(next.toISOString().slice(0, 7));
    setSelectedCalendarDate(null);
  };

  const filteredTransactions = useMemo(() => {
    return enrichedTransactions.filter((t) => {
      if (filterBulan !== "ALL" && !t.tanggal.startsWith(filterBulan)) {
        return false;
      }
      if (filterBbm !== "ALL" && t.jenisBbm !== filterBbm) {
        return false;
      }
      if (filterModalStatus === "MODAL" && !t.pakaiModal) {
        return false;
      }
      if (filterModalStatus === "NO_MODAL" && t.pakaiModal) {
        return false;
      }
      return true;
    });
  }, [enrichedTransactions, filterBulan, filterBbm, filterModalStatus]);

  const stats = useMemo(() => {
    const totalPengeluaran = filteredTransactions.reduce(
      (sum, t) => sum + t.totalBayar,
      0
    );
    const totalDariModal = filteredTransactions.reduce(
      (sum, t) => sum + (t.pakaiModal ? t.potongModal : 0),
      0
    );
    const totalUangHarian = filteredTransactions.reduce(
      (sum, t) => sum + t.uangHarian,
      0
    );
    const totalLiter = filteredTransactions.reduce(
      (sum, t) => sum + t.jumlahLiter,
      0
    );

    const txWithDistance = filteredTransactions.filter(
      (t) => t.jarakTempuhKm !== null && t.jarakTempuhKm > 0
    );
    const totalJarakKm = txWithDistance.reduce(
      (sum, t) => sum + (t.jarakTempuhKm || 0),
      0
    );

    const validKmPerLiterList = txWithDistance
      .map((t) =>
        settings.kmPerLiterMethod === "prev_liter"
          ? t.kmPerLiterFromPrev
          : t.kmPerLiterFromCurrent
      )
      .filter((v): v is number => v !== null && v > 0);

    const avgKmPerLiter =
      validKmPerLiterList.length > 0
        ? validKmPerLiterList.reduce((a, b) => a + b, 0) /
          validKmPerLiterList.length
        : null;

    const maxOdometer =
      transactions.length > 0
        ? Math.max(...transactions.map((t) => t.odometerKm || 0))
        : 0;

    return {
      totalPengeluaran,
      totalDariModal,
      totalUangHarian,
      totalLiter,
      totalJarakKm,
      avgKmPerLiter,
      maxOdometer,
    };
  }, [filteredTransactions, transactions, settings.kmPerLiterMethod]);

  const formPreview = useMemo(() => {
    const bayar = Number(txTotalBayar) || 0;
    const harga = Number(txHargaPerLiter) || 10000;
    const liter = harga > 0 ? Number((bayar / harga).toFixed(2)) : 0;

    const rawPotong = txPakaiModal
      ? Number(txCustomPotongModal) || settings.subsidyPerFill
      : 0;
    const potongModal = txPakaiModal ? Math.min(bayar, rawPotong) : 0;
    const uangHarian = Math.max(0, bayar - potongModal);

    const inputKm = Number(txOdometerKm) || 0;
    const otherTxs = editingTxId
      ? transactions.filter((t) => t.id !== editingTxId)
      : transactions;
    const prevTxsWithSmallerKm = otherTxs
      .filter((t) => t.odometerKm > 0 && t.odometerKm < inputKm)
      .sort((a, b) => b.odometerKm - a.odometerKm);

    const prevTx = prevTxsWithSmallerKm[0] || null;
    const selisihKm = prevTx && inputKm > 0 ? inputKm - prevTx.odometerKm : null;
    const estKmPerL =
      selisihKm && prevTx && prevTx.jumlahLiter > 0
        ? Number((selisihKm / prevTx.jumlahLiter).toFixed(2))
        : null;

    return {
      bayar,
      harga,
      liter,
      potongModal,
      uangHarian,
      prevTx,
      selisihKm,
      estKmPerL,
    };
  }, [
    txTotalBayar,
    txHargaPerLiter,
    txPakaiModal,
    txCustomPotongModal,
    txOdometerKm,
    settings.subsidyPerFill,
    transactions,
    editingTxId,
  ]);

  const handleSelectFuelOption = (option: FuelTypeOption) => {
    setTxJenisBbm(option.name);
    setTxHargaPerLiter(option.pricePerLiter);
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const bayar = Number(txTotalBayar);
    if (!bayar || bayar <= 0) {
      alert("Masukkan nominal isi yang valid.");
      return;
    }

    const payload = {
      tanggal: txTanggal,
      jenisBbm: txJenisBbm,
      hargaPerLiter: Number(txHargaPerLiter) || 10000,
      totalBayar: bayar,
      jumlahLiter: formPreview.liter,
      pakaiModal: txPakaiModal,
      potongModal: formPreview.potongModal,
      uangHarian: formPreview.uangHarian,
      odometerKm: Number(txOdometerKm) || 0,
      keterangan: txKeterangan.trim(),
    };

    if (editingTxId) {
      await updateFuelTransaction(editingTxId, payload);
      setEditingTxId(null);
    } else {
      await addFuelTransaction(payload);
    }

    setTxOdometerKm("");
    setTxKeterangan("");
    setTxCustomPotongModal(String(settings.subsidyPerFill));
    await loadAllData();
  };

  const handleEditClick = (tx: FuelTransaction) => {
    setEditingTxId(tx.id);
    setTxTanggal(tx.tanggal);
    setTxJenisBbm(tx.jenisBbm);
    setTxHargaPerLiter(tx.hargaPerLiter);
    setTxTotalBayar(String(tx.totalBayar));
    setTxPakaiModal(tx.pakaiModal);
    setTxCustomPotongModal(
      String(tx.pakaiModal ? tx.potongModal : settings.subsidyPerFill)
    );
    setTxOdometerKm(tx.odometerKm > 0 ? String(tx.odometerKm) : "");
    setTxKeterangan(tx.keterangan || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingTxId(null);
    setTxOdometerKm("");
    setTxKeterangan("");
    setTxCustomPotongModal(String(settings.subsidyPerFill));
  };

  const handleDeleteTx = async (id: string) => {
    if (!confirm("Hapus catatan ini?")) return;
    await deleteFuelTransaction(id);
    if (editingTxId === id) handleCancelEdit();
    await loadAllData();
  };

  const handleAddRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = Number(refillNominal);
    if (!nominal || nominal <= 0) {
      alert("Masukkan nominal yang valid.");
      return;
    }
    await addCapitalRefill({
      tanggal: refillTanggal,
      nominal,
      keterangan: refillKeterangan.trim() || "Refill Modal",
    });
    setRefillNominal("500000");
    setRefillKeterangan("Refill Modal");
    setShowRefillModal(false);
    await loadAllData();
  };

  const handleDeleteRefill = async (id: string) => {
    if (!confirm("Hapus catatan modal ini?")) return;
    await deleteCapitalRefill(id);
    await loadAllData();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const subsidy = Number(editSubsidy) || 40000;
    const newSettings: FuelSettings = {
      subsidyPerFill: subsidy,
      fuelTypes: editFuelTypes,
      kmPerLiterMethod: editKmMethod,
    };
    await saveSettings(newSettings);
    setSettings(newSettings);
    setTxCustomPotongModal(String(subsidy));
    setShowSettingsModal(false);
  };

  const handleAddCustomFuelType = () => {
    if (!newFuelName.trim() || !Number(newFuelPrice)) return;
    const id = newFuelName.trim().toLowerCase().replace(/\s+/g, "-");
    setEditFuelTypes((prev) => [
      ...prev,
      {
        id: `${id}-${Date.now()}`,
        name: newFuelName.trim(),
        pricePerLiter: Number(newFuelPrice),
        color: "amber",
      },
    ]);
    setNewFuelName("");
    setNewFuelPrice("");
  };

  const handleExportCsv = () => {
    const headers = [
      "Tanggal",
      "BBM",
      "Harga/L",
      "Liter",
      "Total Bayar",
      "Pakai Modal",
      "Potong Modal",
      "Uang Harian",
      "KM",
      "KM Sebelum",
      "Jarak (KM)",
      "km/L",
      "Catatan",
    ];

    const rows = filteredTransactions.map((t) => [
      t.tanggal,
      t.jenisBbm,
      t.hargaPerLiter,
      t.jumlahLiter,
      t.totalBayar,
      t.pakaiModal ? "Ya" : "Tidak",
      t.potongModal,
      t.uangHarian,
      t.odometerKm || "",
      t.prevOdometerKm || "",
      t.jarakTempuhKm || "",
      t.kmPerLiterFromPrev || "",
      `"${(t.keterangan || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `catatan_minyak_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowNavMenu(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 text-slate-900">
      {/* ===================================================== */}
      {/* NAVBAR SIMPEL & RESPONSIF (ICON-FIRST DI HP)          */}
      {/* ===================================================== */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5">
          {/* Logo & Judul */}
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
              <img
                src="/logo.jpg"
                alt="Logo Catatan Minyak"
                className="h-full w-full object-cover p-0.5"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900">
                Catatan Minyak
              </h1>
              {/* Status Dot Indikator Cloud */}
              <span
                title={
                  connState === "connected"
                    ? "Cloud Aktif"
                    : "Penyimpanan Lokal"
                }
                className="inline-flex items-center"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    connState === "connected"
                      ? "bg-emerald-500 animate-pulse ring-2 ring-emerald-200"
                      : "bg-amber-500 ring-2 ring-amber-200"
                  }`}
                />
              </span>
            </div>
          </div>

          {/* Action Buttons Navbar (Icon-Only di Layar HP) */}
          <div className="no-print flex items-center gap-1.5">
            {/* Tombol Refill Modal Utama */}
            <button
              onClick={() => setShowRefillModal(true)}
              className="inline-flex h-8 w-8 sm:h-auto sm:w-auto items-center justify-center sm:gap-1.5 rounded-lg bg-emerald-600 text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 sm:px-2.5 sm:py-1.5 text-xs font-semibold"
              title="Refill Modal Minyak"
            >
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">+ Refill</span>
            </button>

            {/* Tombol Pengaturan */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="inline-flex h-8 w-8 sm:h-auto sm:w-auto items-center justify-center sm:gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 sm:px-2.5 sm:py-1.5 text-xs font-medium"
              title="Pengaturan BBM & Jatah"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Setting</span>
            </button>

            {/* Tombol Export / Print Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setShowNavMenu(!showNavMenu)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:scale-95"
                title="Menu Lainnya (Export / Print)"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {showNavMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNavMenu(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      onClick={handleExportCsv}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-400" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowNavMenu(false);
                        window.print();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-400" />
                      <span>Print Laporan</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 pt-5">
        {/* ===================================================== */}
        {/* BAGIAN 1: KANTONG MODAL & STATISTIK RINGKAS           */}
        {/* ===================================================== */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Kartu Utama Kantong Modal */}
          <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-5 text-white shadow-xs lg:col-span-7">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                  <Wallet className="h-3 w-3" />
                  Saldo Modal Minyak
                </span>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {formatRupiah(capitalSummary.sisaModal)}
                </h2>
                <p className="mt-1 text-xs text-slate-300">
                  Masuk: {formatRupiah(capitalSummary.totalModalMasuk)} • Terpakai:{" "}
                  <span className="text-amber-300">
                    {formatRupiah(capitalSummary.totalModalTerpakai)}
                  </span>{" "}
                  ({capitalSummary.berapaKaliPakaiModal}x)
                </p>
              </div>

              <button
                onClick={() => setShowSettingsModal(true)}
                className="text-right text-[11px] text-slate-300 underline underline-offset-4 hover:text-white"
              >
                Jatah: {formatRupiah(capitalSummary.jatahSekaliIsi)} / isi
              </button>
            </div>

            {/* 3 Kotak Ringkasan Kuota */}
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-white/10 p-3 text-center backdrop-blur-xs">
              <div>
                <p className="text-[11px] text-slate-300">Jatah / Isi</p>
                <p className="mt-0.5 text-sm font-bold text-emerald-300">
                  {formatRupiah(capitalSummary.jatahSekaliIsi)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-300">Total Kuota</p>
                <p className="mt-0.5 text-sm font-bold text-white">
                  {capitalSummary.kuotaDariTotalModal}x
                </p>
              </div>
              <div className="rounded-lg bg-emerald-500/20 py-1 ring-1 ring-emerald-400/30">
                <p className="text-[11px] font-medium text-emerald-200">
                  Sisa Kuota
                </p>
                <p className="mt-0.5 text-base font-extrabold text-white">
                  {capitalSummary.sisaKuotaNgisi}x
                </p>
              </div>
            </div>
          </div>

          {/* 2 Kartu Statistik: KM/L & Uang Harian */}
          <div className="grid grid-cols-2 gap-3 lg:col-span-5">
            {/* Kartu Rata-rata KM/L */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600">
                  <Gauge className="h-3.5 w-3.5 text-blue-600" />
                  Konsumsi BBM
                </span>
              </div>
              <div className="my-2">
                {stats.avgKmPerLiter !== null ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                      {formatNumber(stats.avgKmPerLiter, 2)}
                    </span>
                    <span className="text-xs font-bold text-blue-600">km/L</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Belum cukup data</p>
                )}
              </div>
              <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                Odo: {stats.maxOdometer > 0 ? `${formatNumber(stats.maxOdometer, 0)} KM` : "-"}
                {stats.totalJarakKm > 0 && ` (+${formatNumber(stats.totalJarakKm, 0)} km)`}
              </div>
            </div>

            {/* Kartu Uang Harian */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600">
                <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                Uang Harian
              </span>
              <div className="my-2">
                <p className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                  {formatRupiah(stats.totalUangHarian)}
                </p>
              </div>
              <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                Beli: {formatRupiah(stats.totalPengeluaran)}
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* BAGIAN 2: FORM CATAT NGISI BBM & RIWAYAT              */}
        {/* ===================================================== */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* FORM INPUT PENGISIAN BBM */}
          <div className="no-print lg:col-span-5">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <PlusCircle className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingTxId ? "Edit Catatan" : "Catat Isi BBM"}
                  </h3>
                </div>
                {editingTxId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Batal
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitTransaction} className="mt-3.5 space-y-3.5">
                {/* 1. Pilihan Jenis BBM */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600">
                      Jenis BBM
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(true)}
                      className="text-[10px] font-semibold text-emerald-600 hover:underline"
                    >
                      Ubah Harga
                    </button>
                  </div>
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                    {settings.fuelTypes.map((fuel) => {
                      const active = txJenisBbm === fuel.name;
                      return (
                        <button
                          key={fuel.id}
                          type="button"
                          onClick={() => handleSelectFuelOption(fuel)}
                          className={`rounded-xl border p-2 text-center transition ${
                            active
                              ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`block text-xs font-bold ${
                              active ? "text-emerald-900" : "text-slate-800"
                            }`}
                          >
                            {fuel.name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {formatRupiah(fuel.pricePerLiter)}/L
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Tanggal & Total Bayar */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      value={txTanggal}
                      onChange={(e) => setTxTanggal(e.target.value)}
                      required
                      className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-600">
                        Total Bayar (Rp)
                      </label>
                    </div>
                    <input
                      type="number"
                      value={txTotalBayar}
                      onChange={(e) => setTxTotalBayar(e.target.value)}
                      placeholder="65000"
                      required
                      className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-sm font-bold text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Chips Nominal Cepat & Info Liter */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex flex-wrap gap-1">
                    {[50000, 65000, 70000, 75000, 100000].map((nom) => (
                      <button
                        key={nom}
                        type="button"
                        onClick={() => setTxTotalBayar(String(nom))}
                        className={`rounded-lg border px-2 py-0.5 text-[11px] font-semibold transition ${
                          Number(txTotalBayar) === nom
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {nom / 1000}rb
                      </button>
                    ))}
                  </div>
                  <span className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                    {formatNumber(formPreview.liter, 2)} L
                  </span>
                </div>

                {/* 3. Ambil dari Modal (Toggle Simpel) */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Pakai Subsidi Modal?
                    </span>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setTxPakaiModal(true);
                          setTxCustomPotongModal(String(settings.subsidyPerFill));
                        }}
                        className={`rounded-md px-2.5 py-0.5 font-bold transition ${
                          txPakaiModal
                            ? "bg-emerald-600 text-white"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Ya
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxPakaiModal(false)}
                        className={`rounded-md px-2.5 py-0.5 font-bold transition ${
                          !txPakaiModal
                            ? "bg-slate-800 text-white"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Tidak
                      </button>
                    </div>
                  </div>

                  {/* Rincian Potongan */}
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-xs ring-1 ring-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-500">Modal:</span>{" "}
                      <strong className="text-emerald-700">
                        {formatRupiah(formPreview.potongModal)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Harian:</span>{" "}
                      <strong className="text-amber-700">
                        {formatRupiah(formPreview.uangHarian)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 4. Odometer (KM) */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Odometer (KM)
                    </label>
                    {stats.maxOdometer > 0 && (
                      <span className="text-[10px] text-slate-400">
                        Terakhir: {formatNumber(stats.maxOdometer, 0)} KM
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={txOdometerKm}
                    onChange={(e) => setTxOdometerKm(e.target.value)}
                    placeholder="Contoh: 200, 392..."
                    className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                  />

                  {formPreview.selisihKm !== null && (
                    <div className="mt-1.5 flex items-center justify-between rounded-lg bg-blue-50 px-2.5 py-1 text-xs text-blue-900">
                      <span>Jarak: +{formatNumber(formPreview.selisihKm, 0)} km</span>
                      {formPreview.estKmPerL !== null && (
                        <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                          ≈ {formatNumber(formPreview.estKmPerL, 2)} km/L
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 5. Catatan / Lokasi */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={txKeterangan}
                    onChange={(e) => setTxKeterangan(e.target.value)}
                    placeholder="Lokasi SPBU / keperluan"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-98"
                >
                  {editingTxId ? "Simpan Perubahan" : "Simpan Catatan"}
                </button>
              </form>
            </div>
          </div>

          {/* TABEL RIWAYAT NGISI BBM & KALENDER */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Riwayat
                  </h3>
                  {/* Segment Toggle: Daftar vs Kalender */}
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs transition ${
                        viewMode === "list"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <List className="h-3 w-3" />
                      <span>Daftar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("calendar")}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs transition ${
                        viewMode === "calendar"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <CalendarDays className="h-3 w-3" />
                      <span>Kalender</span>
                    </button>
                  </div>
                </div>

                {/* Filter / Navigasi Kalender */}
                {viewMode === "list" ? (
                  <div className="no-print flex items-center gap-1.5 text-xs">
                    {availableMonths.length > 0 && (
                      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <select
                          value={filterBulan}
                          onChange={(e) => setFilterBulan(e.target.value)}
                          className="bg-transparent text-xs text-slate-700 focus:outline-hidden"
                        >
                          <option value="ALL">Semua Bulan</option>
                          {availableMonths.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                      <Filter className="h-3 w-3 text-slate-400" />
                      <select
                        value={filterBbm}
                        onChange={(e) => setFilterBbm(e.target.value)}
                        className="bg-transparent text-xs text-slate-700 focus:outline-hidden"
                      >
                        <option value="ALL">Semua BBM</option>
                        {settings.fuelTypes.map((f) => (
                          <option key={f.id} value={f.name}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="no-print flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 active:scale-95"
                      title="Bulan Sebelumnya"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-28 text-center text-xs font-bold capitalize text-slate-800">
                      {calendarData.monthName}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 active:scale-95"
                      title="Bulan Berikutnya"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10 text-xs text-slate-500">
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Memuat data...
                </div>
              ) : viewMode === "list" ? (
                filteredTransactions.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-xs font-medium text-slate-500">
                      Belum ada riwayat pengisian.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2.5">
                    {filteredTransactions.map((tx) => {
                      const kmPerL =
                        settings.kmPerLiterMethod === "prev_liter"
                          ? tx.kmPerLiterFromPrev
                          : tx.kmPerLiterFromCurrent;

                      return (
                        <div
                          key={tx.id}
                          className="rounded-xl border border-slate-200/80 bg-white p-3 transition hover:border-slate-300"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] font-bold text-slate-500">
                                  {tx.tanggal}
                                </span>
                                <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {tx.jenisBbm}
                                </span>
                                <span className="text-xs font-bold text-blue-700">
                                  {formatNumber(tx.jumlahLiter, 2)} L
                                </span>
                              </div>
                              {tx.keterangan && (
                                <p className="mt-0.5 text-xs text-slate-600">
                                  {tx.keterangan}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="text-sm font-extrabold text-slate-900">
                                  {formatRupiah(tx.totalBayar)}
                                </p>
                              </div>
                              <div className="no-print flex items-center">
                                <button
                                  onClick={() => handleEditClick(tx)}
                                  className="rounded p-1 text-slate-400 hover:text-slate-700"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTx(tx.id)}
                                  className="rounded p-1 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Rincian Modal, Harian & Odo */}
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-100 pt-2 text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-700">
                                Modal: {formatRupiah(tx.potongModal)}
                              </span>
                              <span className="text-amber-800">
                                Harian: {formatRupiah(tx.uangHarian)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {tx.odometerKm > 0 && (
                                <span className="font-semibold text-slate-600">
                                  {tx.prevOdometerKm
                                    ? `${tx.prevOdometerKm} → ${tx.odometerKm} KM`
                                    : `${tx.odometerKm} KM`}
                                </span>
                              )}
                              {tx.jarakTempuhKm !== null && (
                                <span className="rounded bg-blue-50 px-1.5 py-0.5 font-bold text-blue-700">
                                  +{formatNumber(tx.jarakTempuhKm, 0)} km
                                </span>
                              )}
                              {kmPerL !== null && (
                                <span className="rounded bg-emerald-600 px-1.5 py-0.5 font-bold text-white">
                                  {formatNumber(kmPerL, 2)} km/L
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* TAMPILAN KALENDER */
                <div className="mt-3 space-y-3">
                  {/* Ringkasan Bulan Ini di Kalender */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 text-xs">
                    <span className="font-semibold text-slate-600">
                      Total {calendarData.monthName}:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {formatRupiah(calendarData.monthTotalSpent)}
                      </span>
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">
                        {formatNumber(calendarData.monthTotalLiter, 1)} L
                      </span>
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        {calendarData.monthTxCount}x isi
                      </span>
                    </div>
                  </div>

                  {/* Kalender Grid 7 Hari */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((dayName) => (
                      <div
                        key={dayName}
                        className="py-1 text-[11px] font-bold text-slate-400"
                      >
                        {dayName}
                      </div>
                    ))}

                    {calendarData.days.map((item, index) => {
                      if (!item.isCurrentMonth) {
                        return (
                          <div
                            key={`empty-${index}`}
                            className="min-h-12 rounded-lg bg-slate-50/40"
                          />
                        );
                      }

                      const isSelected = selectedCalendarDate === item.dateStr;
                      const hasTx = item.transactions.length > 0;

                      return (
                        <button
                          key={item.dateStr}
                          type="button"
                          onClick={() =>
                            setSelectedCalendarDate(
                              isSelected ? null : item.dateStr
                            )
                          }
                          className={`flex min-h-12 flex-col items-center justify-between rounded-xl border p-1 text-center transition ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500"
                              : hasTx
                              ? "border-emerald-200 bg-emerald-50/30 hover:border-emerald-400 hover:bg-emerald-50"
                              : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                              item.isToday
                                ? "bg-emerald-600 text-white"
                                : isSelected
                                ? "text-emerald-900"
                                : "text-slate-700"
                            }`}
                          >
                            {item.dayNumber}
                          </span>

                          {hasTx ? (
                            <span className="mt-0.5 w-full truncate rounded bg-emerald-600 px-1 py-0.5 text-[9px] font-bold text-white shadow-2xs">
                              {Math.round(item.totalSpent / 1000)}rb
                            </span>
                          ) : (
                            <span className="h-3.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Rincian Transaksi Tanggal yang Diklik di Kalender */}
                  {selectedCalendarDate && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/30 p-3">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                        <span className="text-xs font-bold text-emerald-900">
                          Catatan Tanggal: {selectedCalendarDate}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedCalendarDate(null)}
                          className="rounded p-0.5 text-slate-400 hover:text-slate-700"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {txByDate.get(selectedCalendarDate)?.length ? (
                        <div className="mt-2 space-y-2">
                          {txByDate.get(selectedCalendarDate)!.map((tx) => (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    {tx.jenisBbm}
                                  </span>
                                  <span className="font-bold text-slate-800">
                                    {formatRupiah(tx.totalBayar)}
                                  </span>
                                  <span className="text-[11px] text-blue-700">
                                    ({formatNumber(tx.jumlahLiter, 2)} L)
                                  </span>
                                </div>
                                {tx.keterangan && (
                                  <p className="mt-0.5 text-[11px] text-slate-500">
                                    {tx.keterangan}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(tx)}
                                  className="rounded p-1 text-slate-400 hover:text-slate-700"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTx(tx.id)}
                                  className="rounded p-1 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span>Tidak ada catatan di tanggal ini.</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTxTanggal(selectedCalendarDate);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="font-bold text-emerald-700 hover:underline"
                          >
                            + Catat di Tanggal Ini
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ===================================================== */}
      {/* MODAL 1: REFILL MODAL                                 */}
      {/* ===================================================== */}
      {showRefillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">Refill Modal</h3>
              <button
                onClick={() => setShowRefillModal(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddRefill} className="mt-3 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={refillTanggal}
                  onChange={(e) => setRefillTanggal(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Nominal (Rp)
                </label>
                <input
                  type="number"
                  value={refillNominal}
                  onChange={(e) => setRefillNominal(e.target.value)}
                  placeholder="500000"
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-sm font-bold"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {[200000, 500000, 1000000].map((nom) => (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => setRefillNominal(String(nom))}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {formatRupiah(nom)}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={refillKeterangan}
                  onChange={(e) => setRefillKeterangan(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
              >
                + Tambah Modal
              </button>
            </form>

            {/* Riwayat Modal Ringkas */}
            {refills.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <h4 className="text-[11px] font-bold text-slate-500">
                  Riwayat Refill ({refills.length})
                </h4>
                <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto pr-1">
                  {refills.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-1.5 text-xs"
                    >
                      <div>
                        <strong className="text-slate-800">
                          {formatRupiah(r.nominal)}
                        </strong>
                        <span className="ml-1 text-[10px] text-slate-400">
                          {r.tanggal}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteRefill(r.id)}
                        className="rounded p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* MODAL 2: PENGATURAN                                  */}
      {/* ===================================================== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">Pengaturan</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="mt-3 space-y-3.5">
              {/* Jatah Sekali Isi */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700">
                  Jatah Subsidi Modal / Sekali Isi
                </label>
                <input
                  type="number"
                  value={editSubsidy}
                  onChange={(e) => setEditSubsidy(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-emerald-700"
                />
              </div>

              {/* Harga BBM */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700">
                  Harga BBM / Liter
                </label>
                <div className="mt-1.5 space-y-1.5">
                  {editFuelTypes.map((fuel, idx) => (
                    <div
                      key={fuel.id}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 p-1.5"
                    >
                      <input
                        type="text"
                        value={fuel.name}
                        onChange={(e) => {
                          const copy = [...editFuelTypes];
                          copy[idx] = { ...fuel, name: e.target.value };
                          setEditFuelTypes(copy);
                        }}
                        className="w-1/2 rounded border border-slate-200 px-1.5 py-0.5 text-xs font-semibold"
                      />
                      <div className="flex flex-1 items-center gap-1">
                        <span className="text-[10px] text-slate-400">Rp</span>
                        <input
                          type="number"
                          value={fuel.pricePerLiter}
                          onChange={(e) => {
                            const copy = [...editFuelTypes];
                            copy[idx] = {
                              ...fuel,
                              pricePerLiter: Number(e.target.value),
                            };
                            setEditFuelTypes(copy);
                          }}
                          className="w-full rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metode Hitung */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700">
                  Rumus km/L
                </label>
                <select
                  value={editKmMethod}
                  onChange={(e) =>
                    setEditKmMethod(
                      e.target.value as "prev_liter" | "current_liter"
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1.5 text-xs text-slate-800"
                >
                  <option value="prev_liter">Jarak ÷ Liter Isi Sebelumnya</option>
                  <option value="current_liter">Jarak ÷ Liter Isi Sekarang</option>
                </select>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Reset semua data modal dan riwayat ke 0?"))
                      return;
                    await resetAllData();
                    setShowSettingsModal(false);
                    await loadAllData();
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Reset ke 0
                </button>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
