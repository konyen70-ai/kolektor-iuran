/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Search, User, Home, QrCode, ArrowRight, AlertCircle, Check, CheckSquare, Square, CreditCard, X, ShieldCheck } from "lucide-react";
import { DbService } from "../services/db";
import { Warga, formatMonthId } from "../types";
import { CURRENT_MONTH_ID } from "../data/dummy";

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

// Helper menentukan bulan yang akan dibayar secara otomatis sesuai aturan prioritas user:
// Priority 1: Bulan berjalan (2026-07) bila belum dibayar
// Priority 2: Bila bulan berjalan sudah dibayar, bayar bulan sebelumnya yang belum dibayar (e.g. 2026-06)
// Priority 3: Bila bulan berjalan & bulan sebelumnya sudah dibayar, bayar bulan sesudahnya (2026-08, dst.)
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

  // State Checklist untuk Pembayaran Massal
  const [selectedWargaIds, setSelectedWargaIds] = useState<string[]>([]);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Periksa apakah user login adalah Administrator
  const isAdmin = currentUser?.role === "Administrator" || currentUser?.username === "admin";

  const loadData = async () => {
    setLoading(true);
    const searchResults = await DbService.searchWarga(query, "SEMUA");
    setResults(searchResults);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    const performSearch = async () => {
      setLoading(true);
      const searchResults = await DbService.searchWarga(query, "SEMUA");
      if (active) {
        setResults(searchResults);
        setLoading(false);
      }
    };
    performSearch();
    return () => {
      active = false;
    };
  }, [query]);

  // Toggle checklist warga individual
  const toggleSelectWarga = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Mencegah membuka halaman detail saat mengklik checkbox
    setSelectedWargaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle Select All
  const toggleSelectAll = () => {
    if (selectedWargaIds.length === results.length) {
      setSelectedWargaIds([]);
    } else {
      setSelectedWargaIds(results.map((w) => w.id));
    }
  };

  // Daftar Warga Terpilih
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
      await loadData();
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
    <div className="flex flex-col space-y-3.5 w-full px-4 pt-3.5" id="manual-search-panel">
      {/* Toast Notifikasi Sukses */}
      {successMessage && (
        <div className="bg-emerald-600 text-white p-3 rounded-xl text-xs font-bold shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1 hover:bg-emerald-700 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Hasil Pencarian ({results.length})
          </span>

          {/* Opsi Checklist & Bayar Massal Khusus Admin */}
          {isAdmin && results.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer bg-blue-50 px-2 py-1 rounded-lg border border-blue-100"
              >
                {selectedWargaIds.length === results.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" /> Batalkan Semua
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" /> Pilih Semua
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Floating Action Bar untuk Admin bila ada warga yang di-checklist */}
        {isAdmin && selectedWargaIds.length > 0 && (
          <div className="mb-3 p-3 bg-blue-600 text-white rounded-xl shadow-md flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-200" />
              <div>
                <span className="text-xs font-black block leading-none">
                  {selectedWargaIds.length} Warga Terpilih
                </span>
                <span className="text-[10px] text-blue-100 font-semibold mt-0.5 block">
                  Total: {formatRupiah(totalBulkNominal)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBulkConfirmModal(true)}
              className="px-3 py-1.5 bg-white text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Bayar Terpilih</span>
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-[10px] font-semibold text-slate-500">Mencari data...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 border border-dashed border-slate-200 rounded-[20px] bg-white text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
            <h5 className="text-xs font-bold text-slate-700">Warga Tidak Ditemukan</h5>
          </div>
        ) : (
          <div className="space-y-2 pb-6">
            {results.map((warga) => {
              const unpaidMonths = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"]
                .filter((b) => !warga.historyPembayaran.includes(b));
              const isLunas = unpaidMonths.length === 0;
              const isSelected = selectedWargaIds.includes(warga.id);
              const targetNextMonth = determineNextMonthToPay(warga.historyPembayaran);

              return (
                <div
                  key={warga.id}
                  onClick={() => onSelectWarga(warga)}
                  className={`w-full text-left bg-white border rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs transition-all cursor-pointer active:scale-[0.99] ${
                    isSelected ? "border-blue-500 bg-blue-50/20 ring-1 ring-blue-500/30" : "border-slate-200/60 hover:border-blue-300"
                  }`}
                >
                  {/* Checkbox Khusus Admin */}
                  {isAdmin && (
                    <div
                      onClick={(e) => toggleSelectWarga(e, warga.id)}
                      className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Pilih untuk pembayaran massal"
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

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-slate-800 text-[11px] truncate max-w-[180px]">
                        {warga.namaKepalaKeluarga}
                      </h4>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[8px] font-mono font-bold text-slate-500">
                        {warga.id}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 mt-1 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Home className={`w-3 h-3 ${getHomeIconColor(warga.id)} shrink-0`} />
                        <span>Rumah No. <strong className="text-slate-700 font-semibold">{warga.nomorRumah}</strong></span>
                        <span>•</span>
                        <span className="bg-slate-100 text-slate-700 font-extrabold px-1.5 py-0.2 rounded text-[9px]">
                          {warga.kategoriIuran}
                        </span>
                      </div>
                      <div className="text-[9.5px] font-mono text-slate-400 truncate">
                        No. KK: <span className="font-bold text-slate-600">{warga.nomorKk}</span>
                      </div>
                    </div>

                    {/* Tag Status Tunggakan Oranye / Lunas Hijau */}
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      {isLunas ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[9px] font-extrabold border border-[0.5px] border-emerald-100/50">
                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                          Lunas S.d Juli 2026
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[9px] font-extrabold border border-[0.5px] border-amber-100/50">
                          <span className="w-1 h-1 rounded-full bg-amber-500" />
                          Tunggakan: {unpaidMonths.length} Bulan
                        </span>
                      )}

                      {/* Info bulan yang akan dibayar bila di-bulk */}
                      {isAdmin && (
                        <span className="text-[8.5px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          Bayar: {formatMonthId(targetNextMonth)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-[0.5px] border-blue-100">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
