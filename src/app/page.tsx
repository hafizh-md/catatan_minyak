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
  Cloud,
  HardDrive,
  Plus,
  X,
  Info,
  Calendar,
  Filter,
} from "lucide-react";
import {
  FuelSettings,
  DEFAULT_SETTINGS,
  CapitalRefill,
  FuelTransaction,
  FuelTypeOption,
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

  // Modal states
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Form Refill Modal state
  const [refillTanggal, setRefillTanggal] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [refillNominal, setRefillNominal] = useState<string>("1000000");
  const [refillKeterangan, setRefillKeterangan] = useState<string>(
    "Refill Modal Minyak"
  );

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

      // Sync default form values with settings
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

  // Enrich transactions with KM & km/L calculations
  const enrichedTransactions = useMemo(
    () => enrichTransactionsWithKmStats(transactions),
    [transactions]
  );

  // Perhitungan Kantong Modal Minyak (Keseluruhan)
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

  // Daftar bulan yang tersedia untuk filter
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.tanggal && t.tanggal.length >= 7) {
        set.add(t.tanggal.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // Transaksi setelah difilter
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

  // Statistik dari transaksi yang difilter + KM/L keseluruhan
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

    // Hitung rata-rata km/L dari baris yang punya jarakTempuhKm valid
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

    // Juga hitung alternatif metode satunya sebagai perbandingan
    const altKmPerLiterList = txWithDistance
      .map((t) =>
        settings.kmPerLiterMethod === "prev_liter"
          ? t.kmPerLiterFromCurrent
          : t.kmPerLiterFromPrev
      )
      .filter((v): v is number => v !== null && v > 0);

    const altAvgKmPerLiter =
      altKmPerLiterList.length > 0
        ? altKmPerLiterList.reduce((a, b) => a + b, 0) /
          altKmPerLiterList.length
        : null;

    // Cari odometer tertinggi saat ini
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
      altAvgKmPerLiter,
      maxOdometer,
      tripCount: txWithDistance.length,
    };
  }, [filteredTransactions, transactions, settings.kmPerLiterMethod]);

  // Kalkulasi real-time di dalam Form Input BBM
  const formPreview = useMemo(() => {
    const bayar = Number(txTotalBayar) || 0;
    const harga = Number(txHargaPerLiter) || 10000;
    const liter = harga > 0 ? Number((bayar / harga).toFixed(2)) : 0;

    const rawPotong = txPakaiModal
      ? Number(txCustomPotongModal) || settings.subsidyPerFill
      : 0;
    // Batasi potongan modal agar tidak melebihi total bayar
    const potongModal = txPakaiModal ? Math.min(bayar, rawPotong) : 0;
    const uangHarian = Math.max(0, bayar - potongModal);

    // Simulasi KM jika user mengetik KM baru
    const inputKm = Number(txOdometerKm) || 0;
    // Cari transaksi terakhir sebelum transaksi ini
    const otherTxs = editingTxId
      ? transactions.filter((t) => t.id !== editingTxId)
      : transactions;
    const prevTxsWithSmallerKm = otherTxs
      .filter((t) => t.odometerKm > 0 && t.odometerKm < inputKm)
      .sort((a, b) => b.odometerKm - a.odometerKm);

    const prevTx = prevTxsWithSmallerKm[0] || null;
    const selisihKm = prevTx && inputKm > 0 ? inputKm - prevTx.odometerKm : null;
    const estKmPerLPrev =
      selisihKm && prevTx && prevTx.jumlahLiter > 0
        ? Number((selisihKm / prevTx.jumlahLiter).toFixed(2))
        : null;
    const estKmPerLCurr =
      selisihKm && liter > 0 ? Number((selisihKm / liter).toFixed(2)) : null;

    return {
      bayar,
      harga,
      liter,
      potongModal,
      uangHarian,
      prevTx,
      selisihKm,
      estKmPerLPrev,
      estKmPerLCurr,
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

  // Handler Pilih Jenis BBM di Form
  const handleSelectFuelOption = (option: FuelTypeOption) => {
    setTxJenisBbm(option.name);
    setTxHargaPerLiter(option.pricePerLiter);
  };

  // Handler Submit Transaksi BBM
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const bayar = Number(txTotalBayar);
    if (!bayar || bayar <= 0) {
      alert("Masukkan nominal pengisian BBM yang valid.");
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

    // Reset form
    setTxOdometerKm("");
    setTxKeterangan("");
    setTxCustomPotongModal(String(settings.subsidyPerFill));
    await loadAllData();
  };

  // Handler Klik Edit Baris Transaksi
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
    if (!confirm("Hapus catatan pengisian BBM ini?")) return;
    await deleteFuelTransaction(id);
    if (editingTxId === id) {
      handleCancelEdit();
    }
    await loadAllData();
  };

  // Handler Refill Modal
  const handleAddRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = Number(refillNominal);
    if (!nominal || nominal <= 0) {
      alert("Masukkan nominal modal yang valid.");
      return;
    }
    await addCapitalRefill({
      tanggal: refillTanggal,
      nominal,
      keterangan: refillKeterangan.trim() || "Refill Modal Minyak",
    });
    setRefillNominal("500000");
    setRefillKeterangan("Refill Tambahan Modal");
    await loadAllData();
  };

  const handleDeleteRefill = async (id: string) => {
    if (!confirm("Hapus catatan modal ini?")) return;
    await deleteCapitalRefill(id);
    await loadAllData();
  };

  // Handler Simpan Pengaturan BBM & Jatah Sekali Isi
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

  // Handler Export CSV
  const handleExportCsv = () => {
    const headers = [
      "Tanggal",
      "Jenis BBM",
      "Harga/Liter (Rp)",
      "Jumlah Liter",
      "Total Isi (Rp)",
      "Ambil dari Modal?",
      "Potong Modal (Rp)",
      "Uang Harian (Rp)",
      "KM Saat Isi",
      "KM Sebelumnya",
      "Jarak Tempuh (KM)",
      "Rata-rata (km/L dari isi sblm)",
      "Rata-rata (km/L dari isi skrg)",
      "Keterangan",
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
      t.kmPerLiterFromCurrent || "",
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
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Fuel className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Catatan Minyak & BBM
              </h1>
              <p className="text-xs text-slate-500">
                Manajemen Kantong Modal, Uang Harian & Pantauan KM/L
              </p>
            </div>
          </div>

          <div className="no-print flex flex-wrap items-center gap-2">
            {/* Status Database Badge */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                connState === "connected"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
              }`}
              title={
                connState === "connected"
                  ? "Terhubung ke Cloud Firestore (catatan-minyak)"
                  : "Buka tab Rules di Firestore untuk mengaktifkan izin baca/tulis Cloud."
              }
            >
              {connState === "connected" ? (
                <>
                  <Cloud className="h-3.5 w-3.5" />
                  <span>Firebase Cloud Aktif</span>
                </>
              ) : (
                <>
                  <HardDrive className="h-3.5 w-3.5" />
                  <span>
                    {connState === "permission_denied"
                      ? "Menunggu Izin Rules Firebase"
                      : "Penyimpanan Lokal"}
                  </span>
                </>
              )}
            </div>

            <button
              onClick={() => setShowRefillModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>Atur / Refill Modal</span>
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Setting BBM & Jatah</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              title="Download CSV untuk Excel"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              title="Cetak / Simpan PDF"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 pt-6">
        {connState === "permission_denied" && (
          <div className="no-print rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-amber-900">
                ⚡ Satu Langkah Terakhir di Firebase Console: Buka Izin Baca/Tulis (Rules)
              </p>
              <button
                onClick={loadAllData}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-900 px-3 py-1 text-xs font-bold text-white hover:bg-amber-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Cek Ulang Koneksi
              </button>
            </div>
            <p className="mt-1 text-amber-800">
              Konfigurasi project <strong>catatan-minyak</strong> sudah terpasang! Agar aplikasi bisa menyimpan data tanpa login, buka{" "}
              <a
                href="https://console.firebase.google.com/project/catatan-minyak/firestore/databases/-default-/rules"
                target="_blank"
                rel="noreferrer"
                className="font-bold underline"
              >
                Halaman Firestore Rules (Klik di sini)
              </a>
              , ubah <code className="rounded bg-amber-200/70 px-1 font-mono">allow read, write: if false;</code> menjadi{" "}
              <code className="rounded bg-emerald-200 px-1 font-mono font-bold text-emerald-950">
                allow read, write: if true;
              </code>{" "}
              lalu klik tombol <strong>Publish</strong>.
            </p>
          </div>
        )}

        {/* ===================================================== */}
        {/* BAGIAN 1: KANTONG MODAL MINYAK & SIMULASI JATAH NGISI */}
        {/* ===================================================== */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Kartu Utama Kantong Modal */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 text-white shadow-md lg:col-span-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/30">
                  <Wallet className="h-3.5 w-3.5" />
                  Kantong Modal Minyak (Terpisah dari Uang Harian)
                </span>
                <p className="mt-3 text-xs uppercase tracking-wider text-slate-400">
                  Sisa Saldo Modal Saat Ini
                </p>
                <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  {formatRupiah(capitalSummary.sisaModal)}
                </h2>
                <p className="mt-1 text-xs text-slate-300">
                  Dari total modal masuk{" "}
                  <span className="font-semibold text-white">
                    {formatRupiah(capitalSummary.totalModalMasuk)}
                  </span>{" "}
                  • Terpakai{" "}
                  <span className="font-semibold text-amber-300">
                    {formatRupiah(capitalSummary.totalModalTerpakai)}
                  </span>{" "}
                  ({capitalSummary.berapaKaliPakaiModal}x ambil modal)
                </p>
              </div>

              <div className="no-print flex flex-col items-end gap-2">
                <button
                  onClick={() => setShowRefillModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow transition hover:bg-emerald-400"
                >
                  <Plus className="h-4 w-4" />
                  Refill / Tambah Modal
                </button>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="text-xs text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-white"
                >
                  Ubah jatah sekali ngisi ({formatRupiah(capitalSummary.jatahSekaliIsi)})
                </button>
              </div>
            </div>

            {/* Kotak Pembagian Sekali Ngisi */}
            <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl bg-white/10 p-4 backdrop-blur-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-300">Jatah Ambil Sekali Isi</p>
                <p className="mt-0.5 text-lg font-bold text-emerald-300">
                  {formatRupiah(capitalSummary.jatahSekaliIsi)}
                  <span className="text-xs font-normal text-slate-300"> / isi</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-300">Total Kuota Awal Modal</p>
                <p className="mt-0.5 text-lg font-bold text-white">
                  {capitalSummary.kuotaDariTotalModal}x{" "}
                  <span className="text-xs font-normal text-slate-300">
                    ngisi
                  </span>
                </p>
              </div>
              <div className="rounded-lg bg-emerald-500/20 px-3 py-1.5 ring-1 ring-emerald-400/40">
                <p className="text-xs font-medium text-emerald-200">
                  Sisa Kuota dari Modal
                </p>
                <p className="mt-0.5 text-xl font-black text-white">
                  {capitalSummary.sisaKuotaNgisi}x{" "}
                  <span className="text-xs font-normal text-emerald-100">
                    ngisi lagi
                  </span>
                </p>
                {capitalSummary.sisaRecehModal > 0 && (
                  <p className="text-[11px] text-emerald-200">
                    + sisa {formatRupiah(capitalSummary.sisaRecehModal)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Kartu Statistik Keiritan (KM/L) & Uang Harian */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-5">
            {/* Kartu Rata-rata KM/L */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    <Gauge className="h-4 w-4" />
                    Rata-rata Konsumsi
                  </span>
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="no-print text-[11px] font-medium text-slate-400 hover:text-slate-600"
                    title="Ganti rumus acuan km/L"
                  >
                    Ubah metode
                  </button>
                </div>

                <div className="mt-4">
                  {stats.avgKmPerLiter !== null ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-slate-900">
                        {formatNumber(stats.avgKmPerLiter, 2)}
                      </span>
                      <span className="text-sm font-bold text-blue-600">
                        km / Liter
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-slate-400">
                      Butuh min. 2 input KM
                    </p>
                  )}

                  <p className="mt-1 text-xs text-slate-500">
                    {settings.kmPerLiterMethod === "prev_liter"
                      ? "Acuan: Jarak ÷ Liter isi sebelumnya"
                      : "Acuan: Jarak ÷ Liter isi saat itu"}
                  </p>

                  {stats.altAvgKmPerLiter !== null && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      ({settings.kmPerLiterMethod === "prev_liter"
                        ? "Jika ÷ liter isi baru: "
                        : "Jika ÷ liter isi sblm: "}
                      <strong className="text-slate-600">
                        {formatNumber(stats.altAvgKmPerLiter, 2)} km/L
                      </strong>
                      )
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Odometer Terakhir:</span>
                  <strong className="text-slate-900">
                    {stats.maxOdometer > 0
                      ? `${formatNumber(stats.maxOdometer, 0)} KM`
                      : "-"}
                  </strong>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Total Jarak Tercatat:</span>
                  <strong className="text-emerald-700">
                    +{formatNumber(stats.totalJarakKm, 0)} km
                  </strong>
                </div>
              </div>
            </div>

            {/* Kartu Rincian Uang Harian vs Modal */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  <TrendingUp className="h-4 w-4" />
                  Uang Harian Terpakai
                </span>

                <div className="mt-4">
                  <p className="text-2xl font-extrabold text-slate-900">
                    {formatRupiah(stats.totalUangHarian)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Uang tambahan di luar subsidi modal
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Total Beli BBM:</span>
                  <strong className="text-slate-900">
                    {formatRupiah(stats.totalPengeluaran)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Dibantu Modal:</span>
                  <strong className="text-emerald-700">
                    {formatRupiah(stats.totalDariModal)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Total Liter BBM:</span>
                  <strong className="text-blue-700">
                    {formatNumber(stats.totalLiter, 2)} Liter
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* BAGIAN 2: FORM INPUT NGISI BBM & TABEL RIWAYAT        */}
        {/* ===================================================== */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* KOLOM KIRI: FORM CATAT NGISI BBM */}
          <div className="no-print lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    {editingTxId
                      ? "Edit Catatan Ngisi BBM"
                      : "Catat Ngisi BBM Baru"}
                  </h3>
                </div>
                {editingTxId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Batal Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitTransaction} className="mt-4 space-y-4">
                {/* 1. Pilih Jenis BBM (Tinggal Klik) */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      1. Pilih Jenis BBM
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(true)}
                      className="text-[11px] font-semibold text-emerald-600 hover:underline"
                    >
                      Atur Harga BBM
                    </button>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {settings.fuelTypes.map((fuel) => {
                      const active = txJenisBbm === fuel.name;
                      return (
                        <button
                          key={fuel.id}
                          type="button"
                          onClick={() => handleSelectFuelOption(fuel)}
                          className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition ${
                            active
                              ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`text-xs font-bold ${
                              active ? "text-emerald-900" : "text-slate-800"
                            }`}
                          >
                            {fuel.name}
                          </span>
                          <span className="mt-0.5 text-[11px] font-medium text-slate-500">
                            {formatRupiah(fuel.pricePerLiter)}/L
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Tanggal & Nominal Isi (Rp) */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Tanggal Ngisi
                    </label>
                    <input
                      type="date"
                      value={txTanggal}
                      onChange={(e) => setTxTanggal(e.target.value)}
                      required
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Harga BBM / Liter (Rp)
                    </label>
                    <input
                      type="number"
                      value={txHargaPerLiter}
                      onChange={(e) =>
                        setTxHargaPerLiter(Number(e.target.value))
                      }
                      required
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-emerald-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Nominal Total Isi BBM + Tombol Cepat 65rb / 70rb / 75rb */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      2. Total Isi BBM (Rp)
                    </label>
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                      Dapat ≈ {formatNumber(formPreview.liter, 2)} Liter
                    </span>
                  </div>

                  <input
                    type="number"
                    value={txTotalBayar}
                    onChange={(e) => setTxTotalBayar(e.target.value)}
                    placeholder="Contoh: 65000 atau 75000"
                    required
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />

                  {/* Tombol Pilihan Cepat */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[40000, 50000, 65000, 70000, 75000, 100000].map((nom) => (
                      <button
                        key={nom}
                        type="button"
                        onClick={() => setTxTotalBayar(String(nom))}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                          Number(txTotalBayar) === nom
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {nom / 1000}rb
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Penanda Ambil dari Modal vs Tidak */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        3. Ambil Bantuan dari Modal?
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Jatah modal: {formatRupiah(settings.subsidyPerFill)} sekali isi
                      </span>
                    </div>

                    {/* Switch Ya / Tidak */}
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTxPakaiModal(true);
                          setTxCustomPotongModal(
                            String(settings.subsidyPerFill)
                          );
                        }}
                        className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                          txPakaiModal
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Ya, Ambil
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxPakaiModal(false)}
                        className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                          !txPakaiModal
                            ? "bg-slate-800 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Tidak
                      </button>
                    </div>
                  </div>

                  {txPakaiModal && (
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200/80 pt-2.5">
                      <label className="text-xs font-medium text-slate-600">
                        Nominal diambil dari modal (Rp):
                      </label>
                      <input
                        type="number"
                        value={txCustomPotongModal}
                        onChange={(e) => setTxCustomPotongModal(e.target.value)}
                        className="w-28 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-right text-xs font-bold text-emerald-700"
                      />
                    </div>
                  )}

                  {/* Rincian Pembagian Uang */}
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-white p-2.5 text-xs ring-1 ring-slate-200/70">
                    <div>
                      <span className="text-slate-500">Potong dari Modal:</span>
                      <p className="font-bold text-emerald-700">
                        {formatRupiah(formPreview.potongModal)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Pakai Uang Harian:</span>
                      <p className="font-bold text-amber-700">
                        {formatRupiah(formPreview.uangHarian)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Input KM (Odometer) Saat Ngisi */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      4. Odometer / KM Saat Ngisi
                    </label>
                    {stats.maxOdometer > 0 && (
                      <span className="text-[11px] font-medium text-slate-500">
                        KM Terakhir:{" "}
                        <strong className="text-slate-800">
                          {formatNumber(stats.maxOdometer, 0)} KM
                        </strong>
                      </span>
                    )}
                  </div>

                  <input
                    type="number"
                    value={txOdometerKm}
                    onChange={(e) => setTxOdometerKm(e.target.value)}
                    placeholder="Contoh: 200 lalu isi berikutnya 392"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />

                  {/* Preview Otomatis Selisih KM & KM/L */}
                  {formPreview.selisihKm !== null && formPreview.prevTx && (
                    <div className="mt-2 rounded-xl bg-blue-50/80 p-2.5 text-xs text-blue-900 ring-1 ring-blue-200">
                      <div className="flex items-center justify-between font-semibold">
                        <span>
                          Jarak dari KM {formPreview.prevTx.odometerKm} →{" "}
                          {txOdometerKm}:
                        </span>
                        <span className="rounded bg-blue-600 px-1.5 py-0.5 text-white">
                          +{formatNumber(formPreview.selisihKm, 0)} km
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-blue-800">
                        {formPreview.estKmPerLPrev !== null && (
                          <span>
                            • Dari BBM isi sblm ({formPreview.prevTx.jumlahLiter} L):{" "}
                            <strong>{formPreview.estKmPerLPrev} km/L</strong>
                          </span>
                        )}
                        {formPreview.estKmPerLCurr !== null && (
                          <span>
                            • Dari BBM isi skrg ({formPreview.liter} L):{" "}
                            <strong>{formPreview.estKmPerLCurr} km/L</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Catatan Tambahan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Catatan / Keterangan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={txKeterangan}
                    onChange={(e) => setTxKeterangan(e.target.value)}
                    placeholder="Misal: Isi SPBU Sudirman / Perjalanan luar kota"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>
                    {editingTxId
                      ? "Simpan Perubahan Catatan"
                      : "Simpan Catatan Ngisi BBM"}
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* KOLOM KANAN: FILTER & TABEL RIWAYAT NGISI BBM */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Riwayat Pengisian & Perkembangan KM/L
                  </h3>
                  <p className="text-xs text-slate-500">
                    Menampilkan {filteredTransactions.length} catatan pengisian
                    BBM
                  </p>
                </div>

                {/* Filter Bar */}
                <div className="no-print flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <select
                      value={filterBulan}
                      onChange={(e) => setFilterBulan(e.target.value)}
                      className="bg-transparent font-medium text-slate-700 focus:outline-none"
                    >
                      <option value="ALL">Semua Bulan</option>
                      {availableMonths.map((m) => (
                        <option key={m} value={m}>
                          Bulan {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
                    <Fuel className="h-3.5 w-3.5 text-slate-400" />
                    <select
                      value={filterBbm}
                      onChange={(e) => setFilterBbm(e.target.value)}
                      className="bg-transparent font-medium text-slate-700 focus:outline-none"
                    >
                      <option value="ALL">Semua BBM</option>
                      {settings.fuelTypes.map((f) => (
                        <option key={f.id} value={f.name}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <select
                      value={filterModalStatus}
                      onChange={(e) => setFilterModalStatus(e.target.value)}
                      className="bg-transparent font-medium text-slate-700 focus:outline-none"
                    >
                      <option value="ALL">Semua Status Modal</option>
                      <option value="MODAL">Pakai Modal</option>
                      <option value="NO_MODAL">Tanpa Modal</option>
                    </select>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Memuat data catatan...
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    Belum ada catatan pengisian BBM pada filter ini.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Silakan isi form di samping untuk mulai mencatat pengisian
                    BBM dan memantau KM/L.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {filteredTransactions.map((tx) => {
                    const primaryKmPerL =
                      settings.kmPerLiterMethod === "prev_liter"
                        ? tx.kmPerLiterFromPrev
                        : tx.kmPerLiterFromCurrent;
                    const secondaryKmPerL =
                      settings.kmPerLiterMethod === "prev_liter"
                        ? tx.kmPerLiterFromCurrent
                        : tx.kmPerLiterFromPrev;

                    return (
                      <div
                        key={tx.id}
                        className="rounded-xl border border-slate-200/90 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          {/* Kiri: Tanggal, Badge BBM, Liter */}
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-500">
                                {tx.tanggal}
                              </span>
                              <span className="inline-flex items-center rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                                {tx.jenisBbm}
                              </span>
                              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                                {formatNumber(tx.jumlahLiter, 2)} Liter
                              </span>
                              <span className="text-[11px] text-slate-400">
                                (@ {formatRupiah(tx.hargaPerLiter)}/L)
                              </span>
                            </div>

                            {tx.keterangan && (
                              <p className="text-xs text-slate-600">
                                {tx.keterangan}
                              </p>
                            )}
                          </div>

                          {/* Kanan: Total Bayar & Tombol Edit/Hapus */}
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-base font-extrabold text-slate-900">
                                {formatRupiah(tx.totalBayar)}
                              </p>
                              <span className="text-[11px] text-slate-400">
                                Total Isi BBM
                              </span>
                            </div>

                            <div className="no-print flex items-center gap-1">
                              <button
                                onClick={() => handleEditClick(tx)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                title="Edit catatan"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTx(tx.id)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                title="Hapus catatan"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Baris Bawah: Pembagian Modal vs Uang Harian & Statistik Odometer KM/L */}
                        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
                          {/* Info Modal vs Uang Harian */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {tx.pakaiModal ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Ambil Modal: {formatRupiah(tx.potongModal)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                                <XCircle className="h-3.5 w-3.5" />
                                Tanpa Modal
                              </span>
                            )}

                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-800 ring-1 ring-amber-200/80">
                              Uang Harian: {formatRupiah(tx.uangHarian)}
                            </span>
                          </div>

                          {/* Info Odometer & KM/L */}
                          <div className="flex flex-wrap items-center justify-start gap-2 text-xs sm:justify-end">
                            {tx.odometerKm > 0 ? (
                              <>
                                <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                                  {tx.prevOdometerKm ? (
                                    <span className="inline-flex items-center gap-1">
                                      <span>{tx.prevOdometerKm}</span>
                                      <ArrowRight className="h-3 w-3 text-slate-400" />
                                      <span>{tx.odometerKm} KM</span>
                                    </span>
                                  ) : (
                                    <span>KM Awal: {tx.odometerKm} KM</span>
                                  )}
                                </span>

                                {tx.jarakTempuhKm !== null && (
                                  <span className="rounded-md bg-blue-50 px-2 py-1 font-bold text-blue-700">
                                    +{formatNumber(tx.jarakTempuhKm, 0)} km
                                  </span>
                                )}

                                {primaryKmPerL !== null && (
                                  <span
                                    className="rounded-md bg-indigo-600 px-2 py-1 font-bold text-white"
                                    title={
                                      secondaryKmPerL
                                        ? `Metode alternatif: ${secondaryKmPerL} km/L`
                                        : undefined
                                    }
                                  >
                                    {formatNumber(primaryKmPerL, 2)} km/L
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[11px] italic text-slate-400">
                                KM tidak dicatat
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ===================================================== */}
      {/* MODAL 1: ATUR / REFILL SALDO MODAL MINYAK             */}
      {/* ===================================================== */}
      {showRefillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Kantong Modal Minyak & Riwayat Refill
                </h3>
              </div>
              <button
                onClick={() => setShowRefillModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddRefill} className="mt-4 space-y-3">
              <p className="text-xs text-slate-600">
                Tambahkan modal awal atau refill saldo modal kapan saja kamu
                punya uang alokasi untuk minyak.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Tanggal Refill
                  </label>
                  <input
                    type="date"
                    value={refillTanggal}
                    onChange={(e) => setRefillTanggal(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Nominal Modal (Rp)
                  </label>
                  <input
                    type="number"
                    value={refillNominal}
                    onChange={(e) => setRefillNominal(e.target.value)}
                    placeholder="Contoh: 1000000"
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                  />
                </div>
              </div>

              {/* Pilihan Cepat Nominal Modal */}
              <div className="flex flex-wrap gap-1.5">
                {[200000, 500000, 1000000, 1500000, 2000000].map((nom) => (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => setRefillNominal(String(nom))}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {formatRupiah(nom)}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Keterangan
                </label>
                <input
                  type="text"
                  value={refillKeterangan}
                  onChange={(e) => setRefillKeterangan(e.target.value)}
                  placeholder="Contoh: Modal Awal Bulan Ini / Refill Gajian"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700"
              >
                + Tambahkan ke Saldo Modal
              </button>
            </form>

            {/* Daftar Riwayat Modal */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Riwayat Saldo Modal Masuk ({refills.length})
              </h4>
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                {refills.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Belum ada modal yang diinput.
                  </p>
                ) : (
                  refills.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">
                          {formatRupiah(r.nominal)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {r.tanggal} • {r.keterangan}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteRefill(r.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Hapus modal ini"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* MODAL 2: SETTING HARGA BBM & JATAH SEKALI ISI         */}
      {/* ===================================================== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Pengaturan BBM, Jatah Modal & Rumus KM/L
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="mt-4 space-y-4">
              {/* 1. Jatah Sekali Ngisi */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Jatah Ambil dari Modal per Sekali Ngisi (Rp)
                </label>
                <p className="text-[11px] text-slate-500">
                  Misal diatur Rp 40.000, maka setiap ngisi otomatis memotong
                  Rp 40.000 dari modal dan sisanya dari uang harian.
                </p>
                <input
                  type="number"
                  value={editSubsidy}
                  onChange={(e) => setEditSubsidy(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-emerald-700"
                />
              </div>

              {/* 2. Daftar Harga BBM */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Daftar Pilihan BBM & Harga per Liter
                </label>
                <div className="mt-2 space-y-2">
                  {editFuelTypes.map((fuel, idx) => (
                    <div
                      key={fuel.id}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 p-2"
                    >
                      <input
                        type="text"
                        value={fuel.name}
                        onChange={(e) => {
                          const copy = [...editFuelTypes];
                          copy[idx] = { ...fuel, name: e.target.value };
                          setEditFuelTypes(copy);
                        }}
                        className="w-1/2 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold"
                      />
                      <div className="flex flex-1 items-center gap-1">
                        <span className="text-xs text-slate-400">Rp</span>
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
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold"
                        />
                        <span className="text-xs text-slate-400">/L</span>
                      </div>
                      {editFuelTypes.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditFuelTypes(
                              editFuelTypes.filter((_, i) => i !== idx)
                            )
                          }
                          className="rounded p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Tambah BBM Baru */}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={newFuelName}
                    onChange={(e) => setNewFuelName(e.target.value)}
                    placeholder="Nama BBM baru (misal: Dexlite)"
                    className="w-1/2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    value={newFuelPrice}
                    onChange={(e) => setNewFuelPrice(e.target.value)}
                    placeholder="Harga/L (misal: 14500)"
                    className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomFuelType}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    + Tambah
                  </button>
                </div>
              </div>

              {/* 3. Metode Perhitungan KM/L */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Metode Hitung Rata-rata Konsumsi (km/L)
                </label>
                <select
                  value={editKmMethod}
                  onChange={(e) =>
                    setEditKmMethod(
                      e.target.value as "prev_liter" | "current_liter"
                    )
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  <option value="prev_liter">
                    Jarak Tempuh ÷ Liter Pengisian Sebelumnya (BBM yang dipakai
                    jalan)
                  </option>
                  <option value="current_liter">
                    Jarak Tempuh ÷ Liter Pengisian Saat Ini (Metode Full-to-Full)
                  </option>
                </select>
                <p className="mt-1 flex items-start gap-1 text-[11px] text-slate-500">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                  <span>
                    Contoh: Isi ke-1 Rp 65rb (6,5 L) di KM 200, lalu Isi ke-2 Rp
                    75rb (7,5 L) di KM 392 (Jarak 192 km). Metode 1 = 192 ÷ 6,5
                    = 29,54 km/L. Metode 2 = 192 ÷ 7,5 = 25,60 km/L.
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      !confirm(
                        "Reset semua saldo modal dan riwayat pengisian BBM ke 0?"
                      )
                    )
                      return;
                    await resetAllData();
                    setShowSettingsModal(false);
                    await loadAllData();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Reset Semua Data ke Awal (0)
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                  >
                    Simpan Pengaturan
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

