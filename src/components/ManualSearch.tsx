/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Search,
  User,
  Home,
  QrCode,
  ArrowRight,
  AlertCircle,
  Check,
  CheckSquare,
  Square,
  CreditCard,
  X,
  ShieldCheck,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Calendar,
  Sparkles,
  DollarSign
} from "lucide-react";
import { DbService } from "../services/db";
import { Warga, formatMonthId } from "../types";
import { CURRENT_MONTH_ID, LIST_BULAN_2026 } from "../data/dummy";

const getHomeIconColor = (id: string) => {
  const colors = [
    "text-amber-500",
    "text-emerald-500",
    "text-indigo-500",
    "text-sky-500",
    "text-rose-500",
    "text-violet-500",
    "text-teal-500",
    "text-cyan-500"
  ];
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    sum += id.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

// Helper menentukan bulan yang akan dibayar secara otomatis sesuai aturan prioritas user
export const determineNextMonthToPay = (history: string[]): string => {
  const currentMonth = CURRENT_MONTH_ID; // "2026-07"
  
  // 1. Cek bulan berjalan
  if (!history.includes(currentMonth)) {
    return currentMonth;
  }

  // 2. Cek bulan sebelumnya di tahun 2026
  const pastMonths = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
  const unpaidPast = pastMonths.find((m) => !history.includes(m));
  if (unpaidPast) {
    return unpaidPast;
  }

  // 3. Cek bulan sesudahnya
  const futureMonths = ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12"];
  const unpaidFuture = futureMonths.find((m) => !history.includes(m));
  if (unpaidFuture) {
    return unpaidFuture;
  }

  return "2026-08"; // Fallback
};

// Format Rupiah
const formatRupiah = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

interface ManualSearchProps {
  onSelectWarga: (warga: Warga) => void;
  onBackToQR: () => void;
  query: string;
  currentUser?: { username: string; role: string } | null;
  onRefreshData?: () => void;
}

export default function ManualSearch({
  onSelectWarga,
  onBackToQR,
  query,
  currentUser,
  onRefreshData,
}: ManualSearchProps) {
  const [results, setResults] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(false);
  const [localQuery, setLocalQuery] = useState(query);
  const [filterStatus, setFilterStatus] = useState<"SEMUA" | "TUNGGAKAN" | "LUNAS">("SEMUA");

  // State Checklist untuk Pembayaran Massal
  const [selectedWargaIds, setSelectedWargaIds] = useState<string[]>([]);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State untuk Preview Warga Terpilih di Sisi Kanan PC
  const [previewWarga, setPreviewWarga] = useState<Warga | null>(null);

  // Periksa apakah user login adalah Administrator
  const isAdmin = currentUser?.role === "Administrator" || currentUser?.username === "admin";

  const loadData = async (qStr: string) => {
    setLoading(true);
    const searchResults = await DbService.searchWarga(qStr, "SEMUA");
    setResults(searchResults);
    setLoading(false);
  };

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  useEffect(() => {
    let active = true;
    const performSearch = async () => {
      setLoading(true);
      const searchResults = await DbService.searchWarga(localQuery, "SEMUA");
      if (active) {
        setResults(searchResults);
        // Default set preview warga ke yang pertama jika ada
        if (searchResults.length > 0 && !previewWarga) {
          setPreviewWarga(searchResults[0]);
        }
        setLoading(false);
      }
    };
    performSearch();
    return () => {
      active = false;
    };
  }, [localQuery]);

  // Filtered List berdasarkan Filter Chips
  const filteredResults = results.filter((w) => {
    const unpaid = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"].filter(
      (b) => !w.historyPembayaran.includes(b)
    );
    if (filterStatus === "TUNGGAKAN") return unpaid.length > 0;
    if (filterStatus === "LUNAS") return unpaid.length === 0;
    return true;
  });

  // Toggle checklist warga individual
  const toggleSelectWarga = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedWargaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle Select All
  const toggleSelectAll = () => {
    if (selectedWargaIds.length === filteredResults.length) {
      setSelectedWargaIds([]);
    } else {
      setSelectedWargaIds(filteredResults.map((w) => w.id));
    }
  };

  // Daftar Warga Terpilih untuk Pembayaran Massal
  const selectedWargaList = results.filter((w) => selectedWargaIds.includes(w.id));

  // Hitung Total Bayar Massal
  const totalBulkNominal = selectedWargaList.reduce(
    (acc, w) => acc + (w.tarifPerBulan || 25000),
    0
  );

  // Eksekusi Pembayaran Massal (Admin Only)
  const handleProcessBulkPayment = async () => {
    if (selectedWargaList.length === 0) return;
    setIsProcessing(true);

    try {
      for (const warga of selectedWargaList) {
        const targetMonth = determineNextMonthToPay(warga.historyPembayaran);
        await DbService.recordTransaction(
          warga.id,
          [targetMonth],
          warga.tarifPerBulan,
          warga.tarifPerBulan,
          "MANUAL",
          `Pembayaran Massal (Admin) - Bulan ${formatMonthId(targetMonth)}`
        );
      }

      setSuccessMessage(`Berhasil memproses pembayaran massal untuk ${selectedWargaList.length} warga!`);
      setSelectedWargaIds([]);
      setShowBulkConfirmModal(false);
      await loadData(localQuery);
      if (onRefreshData) onRefreshData();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err) {
      console.error("Gagal melakukan pembayaran massal:", err);
      alert("Terjadi kesalahan saat memproses pembayaran massal.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4" id="manual-search-panel">
      {/* Toast Notifikasi Sukses */}
      {successMessage && (
        <div className="bg-emerald-600 text-white p-3.5 rounded-2xl text-xs font-bold shadow-lg flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1 hover:bg-emerald-700 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER BANNER UNTUK LAPTOP / PC */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-100">
                Pencarian & Bayar Manual
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-[11px] font-semibold text-slate-500">
                Petugas: <strong>{currentUser?.username || "Admin"}</strong>
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide uppercase mt-1">
              CARI & PROSES BAYAR IURAN WARGA
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Ketik nama kepala keluarga, nomor rumah, atau nomor KK untuk memproses pembayaran iuran secara langsung.
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Hasil</span>
              <span className="text-xs font-black text-slate-900 font-mono">{filteredResults.length} Warga</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl text-center">
              <span className="text-[9px] font-bold text-emerald-600 uppercase block">Tarif Rata-rata</span>
              <span className="text-xs font-black text-emerald-800 font-mono">Rp 25.000 / bln</span>
            </div>
          </div>
        </div>

        {/* Input Pencarian Interaktif */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="Cari berdasarkan Nama, Nomor Rumah, atau KK (Contoh: AHMAD, A12, 32750...)"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {localQuery && (
              <button
                type="button"
                onClick={() => setLocalQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Status Chips */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 shrink-0 w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => setFilterStatus("SEMUA")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                filterStatus === "SEMUA"
                  ? "bg-white text-blue-700 shadow-2xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua ({results.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("TUNGGAKAN")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                filterStatus === "TUNGGAKAN"
                  ? "bg-amber-50 text-amber-800 shadow-2xs border border-amber-200"
                  : "text-slate-600 hover:text-amber-700"
              }`}
            >
              Ada Tunggakan
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("LUNAS")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                filterStatus === "LUNAS"
                  ? "bg-emerald-50 text-emerald-800 shadow-2xs border border-emerald-200"
                  : "text-slate-600 hover:text-emerald-700"
              }`}
            >
              Lunas S.d Juli
            </button>
          </div>
        </div>
      </div>

      {/* DUA KOLOM LAYOUT PC / LAPTOP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* KOLOM KIRI: DAFTAR WARGA (COL-SPAN-7 / 8) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Daftar Hasil Warga ({filteredResults.length})
            </span>

            {/* Opsi Checklist Massal Khusus Admin */}
            {isAdmin && filteredResults.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[11px] font-extrabold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 cursor-pointer bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg border border-blue-200/80 transition-all"
              >
                {selectedWargaIds.length === filteredResults.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Batalkan Semua</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>Pilih Semua untuk Bayar Massal</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Floating Banner Bayar Massal Admin */}
          {isAdmin && selectedWargaIds.length > 0 && (
            <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-md flex items-center justify-between animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-blue-200 shrink-0" />
                <div>
                  <span className="text-xs font-black block leading-none">
                    {selectedWargaIds.length} Warga Terpilih untuk Pembayaran Massal
                  </span>
                  <span className="text-[10px] text-blue-100 font-semibold mt-0.5 block">
                    Total Estimasi Setoran: {formatRupiah(totalBulkNominal)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBulkConfirmModal(true)}
                className="px-3.5 py-2 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 shrink-0"
              >
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Bayar Massal Sekarang</span>
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl py-12 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
              <span className="text-xs font-bold text-slate-500">Mencari data warga...</span>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">
                Warga Tidak Ditemukan
              </h4>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto font-medium">
                Coba ubah kata kunci pencarian atau sesuaikan filter status lunas/tunggakan di bagian atas.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredResults.map((warga) => {
                const unpaidMonths = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"].filter(
                  (b) => !warga.historyPembayaran.includes(b)
                );
                const isLunas = unpaidMonths.length === 0;
                const isSelected = selectedWargaIds.includes(warga.id);
                const isPreviewActive = previewWarga?.id === warga.id;
                const targetNextMonth = determineNextMonthToPay(warga.historyPembayaran);

                return (
                  <div
                    key={warga.id}
                    onClick={() => {
                      setPreviewWarga(warga);
                    }}
                    className={`bg-white border rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-2xs transition-all cursor-pointer ${
                      isPreviewActive
                        ? "border-blue-500 ring-2 ring-blue-500/15 bg-blue-50/10"
                        : isSelected
                        ? "border-blue-300 bg-blue-50/20"
                        : "border-slate-200/80 hover:border-blue-300 hover:shadow-xs"
                    }`}
                  >
                    {/* Checkbox Admin */}
                    {isAdmin && (
                      <div
                        onClick={(e) => toggleSelectWarga(e, warga.id)}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Centang untuk pembayaran massal"
                      >
                        {isSelected ? (
                          <div className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded border-2 border-slate-300 bg-slate-50 hover:border-blue-400" />
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                          {warga.namaKepalaKeluarga}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[9px] font-mono font-bold text-slate-600">
                          {warga.id}
                        </span>
                        <span className="bg-blue-50 text-blue-700 font-extrabold px-2 py-0.5 rounded-md text-[9.5px] border border-blue-100">
                          {warga.kategoriIuran}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        <div className="flex items-center gap-1 font-semibold text-slate-700">
                          <Home className={`w-3.5 h-3.5 ${getHomeIconColor(warga.id)}`} />
                          <span>Rumah No. <strong>{warga.nomorRumah}</strong></span>
                        </div>
                        <span>•</span>
                        <div className="font-mono text-slate-500">
                          KK: <span className="font-bold text-slate-700">{warga.nomorKk}</span>
                        </div>
                        <span>•</span>
                        <div className="font-mono font-bold text-blue-700">
                          Rp {formatRupiah(warga.tarifPerBulan)}/bln
                        </div>
                      </div>

                      {/* Status Badges Row */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {isLunas ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200/80">
                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                            Lunas S.d Juli 2026
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 text-[10px] font-extrabold border border-amber-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Tunggakan: {unpaidMonths.length} Bulan
                          </span>
                        )}

                        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                          Prioritas Bayar: {formatMonthId(targetNextMonth)}
                        </span>
                      </div>
                    </div>

                    {/* Action Button: Langsung Ke Halaman Bayar */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectWarga(warga);
                        }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        <span>Pilih & Bayar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* KOLOM KANAN: RINGKASAN & QUICK ACTION WARGA TERPILIH (COL-SPAN-5 / 4) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3 sticky top-20">
          <div className="px-1">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Detail Warga Terpilih
            </span>
          </div>

          {previewWarga ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
              {/* Header Profile Warga */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[9px] font-black uppercase text-blue-600 tracking-wider block">
                    ID WARGA: {previewWarga.id}
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                    {previewWarga.namaKepalaKeluarga}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mt-1">
                    <Home className={`w-3.5 h-3.5 ${getHomeIconColor(previewWarga.id)}`} />
                    <span>Rumah No. {previewWarga.nomorRumah}</span>
                    <span>•</span>
                    <span className="text-blue-700">{previewWarga.kategoriIuran}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectWarga(previewWarga)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>Buka Form</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Rincian Tarif & Status */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                    Tarif Iuran Bulanan
                  </span>
                  <span className="text-xs font-black text-blue-800 font-mono mt-0.5 block">
                    {formatRupiah(previewWarga.tarifPerBulan)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                    Target Bayar
                  </span>
                  <span className="text-xs font-black text-emerald-700 font-mono mt-0.5 block">
                    {formatMonthId(determineNextMonthToPay(previewWarga.historyPembayaran))}
                  </span>
                </div>
              </div>

              {/* Grid 12 Bulan Pembayaran Visual Matrix */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Status Pembayaran Tahun 2026:
                </span>
                <div className="grid grid-cols-4 gap-1.5 text-[10px] font-extrabold text-center">
                  {LIST_BULAN_2026.map((m) => {
                    const isPaid = previewWarga.historyPembayaran.includes(m.id);
                    const isNextTarget = determineNextMonthToPay(previewWarga.historyPembayaran) === m.id;

                    return (
                      <div
                        key={m.id}
                        className={`p-2 rounded-xl border transition-all ${
                          isPaid
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : isNextTarget
                            ? "bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-500/20"
                            : "bg-slate-50 border-slate-200/80 text-slate-400"
                        }`}
                      >
                        <span className="block text-[9px] font-bold uppercase">{m.namaBulan.slice(0, 3)}</span>
                        <span className="block mt-0.5 text-[8px] font-mono">
                          {isPaid ? "LUNAS" : isNextTarget ? "BAYAR" : "-"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={() => onSelectWarga(previewWarga)}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <CreditCard className="w-4 h-4" />
                <span>Proses Pembayaran {previewWarga.namaKepalaKeluarga}</span>
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center space-y-3">
              <Info className="w-8 h-8 text-blue-500 mx-auto" />
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Pilih Warga Di Sisi Kiri
              </h4>
              <p className="text-[11px] text-slate-400 font-medium">
                Klik salah satu data warga dari hasil pencarian di sebelah kiri untuk melihat rincian pembayaran 12 bulan dan langsung memproses setoran iuran.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL KONFIRMASI PEMBAYARAN MASSAL */}
      {showBulkConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Konfirmasi Pembayaran Massal
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">Khusus Akses Administrator</p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkConfirmModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Rincian Warga Terpilih */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Daftar Pembayaran ({selectedWargaList.length} Warga):
              </span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50">
                {selectedWargaList.map((w) => {
                  const targetMonth = determineNextMonthToPay(w.historyPembayaran);
                  return (
                    <div
                      key={w.id}
                      className="flex items-center justify-between text-[11px] p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800 block">{w.namaKepalaKeluarga}</span>
                        <span className="text-[9.5px] text-slate-500">
                          Rumah: {w.nomorRumah} • Bulan: <strong className="text-blue-700">{formatMonthId(targetMonth)}</strong>
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">
                        {formatRupiah(w.tarifPerBulan || 25000)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total Ringkasan */}
            <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-xl flex items-center justify-between">
              <span className="text-xs font-black text-blue-900 uppercase">Total Pembayaran</span>
              <span className="text-sm font-black font-mono text-blue-800">
                {formatRupiah(totalBulkNominal)}
              </span>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed italic">
              * Pembayaran akan mencatat transaksi 1 bulan per warga sesuai aturan prioritas (Bulan Berjalan → Bulan Sebelumnya → Bulan Sesudahnya).
            </p>

            {/* Tombol Aksi */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkConfirmModal(false)}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessBulkPayment}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Proses Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
