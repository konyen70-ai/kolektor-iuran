/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Warga, Transaksi } from "../types";
import { LIST_BULAN_2026, CURRENT_MONTH_ID } from "../data/dummy";
import {
  X,
  Printer,
  FileSpreadsheet,
  Search,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Wallet,
  SlidersHorizontal,
  RotateCcw,
  Eye
} from "lucide-react";
import * as XLSX from "xlsx";

interface LaporanPendapatanModalProps {
  wargaList: Warga[];
  transactions: Transaksi[];
  onClose: () => void;
}

// Format kelipatan 1000 menjadi 'K' (contoh: 45000 -> 45K, 0 -> -)
export const formatK = (amount: number): string => {
  if (!amount || amount === 0) return "-";
  if (amount % 1000 === 0) {
    return `${amount / 1000}K`;
  }
  return `${(amount / 1000).toFixed(1)}K`;
};

// Format Rupiah standar untuk Ringkasan Kas
export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const BULAN_OPTIONS = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const TAHUN_OPTIONS = ["2025", "2026", "2027"];

export default function LaporanPendapatanModal({
  wargaList,
  transactions,
  onClose,
}: LaporanPendapatanModalProps) {
  // State Filter Bulan & Tahun (Default: Juli 2026)
  const [selectedMonth, setSelectedMonth] = useState<string>("07");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  
  // State Pencarian Warga
  const [searchQuery, setSearchQuery] = useState<string>("");

  // State Accordion Collapse & Expand Filter Bulan/Tahun
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Function reset filter ke default (Juli 2026)
  const handleResetFilters = () => {
    setSelectedMonth("07");
    setSelectedYear("2026");
    setSearchQuery("");
  };

  const isFilterModified = selectedMonth !== "07" || selectedYear !== "2026" || searchQuery !== "";

  // State untuk Action Menu & Preview Modal
  const [showActionMenu, setShowActionMenu] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActionMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedMonthId = `${selectedYear}-${selectedMonth}`;
  
  const selectedMonthLabel = useMemo(() => {
    const m = BULAN_OPTIONS.find((b) => b.value === selectedMonth);
    return `${m?.label || "Bulan " + selectedMonth} ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  // Kalkulasi Pendapatan per Warga BERDASARKAN BULAN TRANSAKSI DILAKUKAN (t.tanggal)
  const revenueData = useMemo(() => {
    return wargaList.map((w) => {
      // Cari transaksi warga yang benar-benar TERJADI/DICATAT di bulan terpilih (t.tanggal)
      const txsInMonth = transactions.filter(
        (t) => t.wargaId === w.id && t.tanggal.startsWith(selectedMonthId)
      );

      let monthsPaidCount = 0;

      if (txsInMonth.length > 0) {
        txsInMonth.forEach((t) => {
          monthsPaidCount += t.bulanBayar.length || 1;
        });
      } else if (selectedMonthId === "2026-07" && w.historyPembayaran.includes("2026-07")) {
        // Fallback dummy data awal untuk bulan Juli 2026
        monthsPaidCount = 1;
      }

      let kas = 0;
      let sampah = 0;
      let kematian = 0;
      let sosial = 0;

      if (monthsPaidCount > 0) {
        // Iuran Kas Bulanan (Default 10.000 per bulan yang dibayar)
        kas = 10000 * monthsPaidCount;

        // Iuran Sampah (Sesuai Kategori Warga)
        const tarifSampah =
          w.kategoriIuran === "Warga Usaha"
            ? 25000
            : w.kategoriIuran === "Warga Luar"
            ? 20000
            : 15000;
        sampah = tarifSampah * monthsPaidCount;

        // Iuran Kematian (Default 5.000)
        kematian = 5000 * monthsPaidCount;

        // Iuran Sosial (Default 5.000)
        sosial = 5000 * monthsPaidCount;
      }

      const total = kas + sampah + kematian + sosial;

      return {
        warga: w,
        monthsPaidCount,
        kas,
        sampah,
        kematian,
        sosial,
        total,
      };
    });
  }, [wargaList, transactions, selectedMonthId]);

  // Filter Hasil Berdasarkan Pencarian Nama / No. Rumah
  const filteredData = useMemo(() => {
    return revenueData.filter((item) => {
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const matchNama = item.warga.namaKepalaKeluarga.toLowerCase().includes(q);
        const matchRumah = item.warga.nomorRumah.toLowerCase().includes(q);
        if (!matchNama && !matchRumah) return false;
      }

      return true;
    });
  }, [revenueData, searchQuery]);

  // Ringkasan Kas & Statistik
  const summaryKas = useMemo(() => {
    const totalWarga = filteredData.length;
    const wargaBayarCount = filteredData.filter((d) => d.total > 0).length;

    const totalKas = filteredData.reduce((acc, item) => acc + item.kas, 0);
    const totalSampah = filteredData.reduce((acc, item) => acc + item.sampah, 0);
    const totalKematian = filteredData.reduce((acc, item) => acc + item.kematian, 0);
    const totalSosial = filteredData.reduce((acc, item) => acc + item.sosial, 0);
    const totalPendapatan = totalKas + totalSampah + totalKematian + totalSosial;

    const persentaseBayar = totalWarga > 0 ? Math.round((wargaBayarCount / totalWarga) * 100) : 0;

    return {
      totalWarga,
      wargaBayarCount,
      persentaseBayar,
      totalKas,
      totalSampah,
      totalKematian,
      totalSosial,
      totalPendapatan,
    };
  }, [filteredData]);

  // Handler Export Excel
  const handleExportExcel = () => {
    setShowActionMenu(false);
    const rows = filteredData.map((item, index) => ({
      No: index + 1,
      "Nama Kepala Keluarga": item.warga.namaKepalaKeluarga,
      "No. Rumah": item.warga.nomorRumah,
      "Iuran Bulanan": item.kas,
      "Iuran Sampah": item.sampah,
      "Iuran Kematian": item.kematian,
      "Iuran Sosial": item.sosial,
      "Total Pendapatan": item.total,
    }));

    // Baris Total
    rows.push({
      No: "" as any,
      "Nama Kepala Keluarga": "TOTAL KESELURUHAN",
      "No. Rumah": "",
      "Iuran Bulanan": summaryKas.totalKas,
      "Iuran Sampah": summaryKas.totalSampah,
      "Iuran Kematian": summaryKas.totalKematian,
      "Iuran Sosial": summaryKas.totalSosial,
      "Total Pendapatan": summaryKas.totalPendapatan,
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `Pendapatan_${selectedMonthId}`);
    XLSX.writeFile(wb, `Laporan_Pendapatan_RT05_${selectedMonthId}.xlsx`);
  };

  // Handler Print PDF
  const handlePrintPDF = () => {
    setShowActionMenu(false);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rowsHtml = filteredData
      .map((item, index) => {
        return `
          <tr class="border-b border-slate-200">
            <td class="text-center py-2 px-2 border-r border-slate-200 font-semibold text-slate-500">${index + 1}</td>
            <td class="py-2 px-3 border-r border-slate-200 font-bold text-slate-800">${item.warga.namaKepalaKeluarga}</td>
            <td class="text-center py-2 px-2 border-r border-slate-200 font-mono text-slate-600 font-semibold">${item.warga.nomorRumah}</td>
            <td class="text-right py-2 px-3 border-r border-slate-200 font-mono text-slate-700">${formatK(item.kas)}</td>
            <td class="text-right py-2 px-3 border-r border-slate-200 font-mono text-slate-700">${formatK(item.sampah)}</td>
            <td class="text-right py-2 px-3 border-r border-slate-200 font-mono text-slate-700">${formatK(item.kematian)}</td>
            <td class="text-right py-2 px-3 border-r border-slate-200 font-mono text-slate-700">${formatK(item.sosial)}</td>
            <td class="text-right py-2 px-3 font-mono font-bold text-slate-900 bg-slate-50">${formatK(item.total)}</td>
          </tr>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Pendapatan Bulanan RT 05 - ${selectedMonthLabel}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
            @media print {
              .no-print { display: none !important; }
              body { padding: 0 !important; }
            }
          </style>
        </head>
        <body class="bg-white p-6 font-sans text-slate-800 text-xs">
          <div class="max-w-[1000px] mx-auto">
            <!-- HEADER LAPORAN -->
            <div class="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
              <div>
                <h1 class="text-xl font-black text-slate-900 tracking-wide uppercase">LAPORAN PENDAPATAN BULANAN</h1>
                <p class="text-xs text-slate-600 font-bold mt-0.5">RT 05 RW 02 — Periode: ${selectedMonthLabel}</p>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Cetak</span>
                <span class="text-xs font-mono font-bold text-slate-800">${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            </div>

            <!-- RINGKASAN KAS -->
            <div class="grid grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5">
              <div class="border-r border-slate-200 pr-3">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Pendapatan</span>
                <span class="text-sm font-black text-slate-900 font-mono">${formatRupiah(summaryKas.totalPendapatan)}</span>
              </div>
              <div class="border-r border-slate-200 pr-3">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Iuran Bulanan</span>
                <span class="text-xs font-bold text-slate-800 font-mono">${formatRupiah(summaryKas.totalKas)}</span>
              </div>
              <div class="border-r border-slate-200 pr-3">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Iuran Sampah</span>
                <span class="text-xs font-bold text-slate-800 font-mono">${formatRupiah(summaryKas.totalSampah)}</span>
              </div>
              <div>
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Kematian & Sosial</span>
                <span class="text-xs font-bold text-slate-800 font-mono">${formatRupiah(summaryKas.totalKematian + summaryKas.totalSosial)}</span>
              </div>
            </div>

            <!-- TABEL PENDAPATAN MATRIKS -->
            <table class="w-full border-collapse border border-slate-200 text-xs">
              <thead>
                <tr class="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th class="py-2.5 px-2 border-r border-slate-200 text-center w-8">NO</th>
                  <th class="py-2.5 px-3 border-r border-slate-200 text-left">NAMA WARGA</th>
                  <th class="py-2.5 px-2 border-r border-slate-200 text-center w-14">RUMAH</th>
                  <th class="py-2.5 px-3 border-r border-slate-200 text-right">IURAN BULANAN</th>
                  <th class="py-2.5 px-3 border-r border-slate-200 text-right">IURAN SAMPAH</th>
                  <th class="py-2.5 px-3 border-r border-slate-200 text-right">IURAN KEMATIAN</th>
                  <th class="py-2.5 px-3 border-r border-slate-200 text-right">IURAN SOSIAL</th>
                  <th class="py-2.5 px-3 text-right bg-slate-200 text-slate-900">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
              <tfoot>
                <tr class="bg-slate-200 text-slate-900 font-black uppercase text-[11px] tracking-wider border-t-2 border-slate-400">
                  <td colspan="3" class="py-3 px-3 text-center border-r border-slate-300">TOTAL PENDAPATAN</td>
                  <td class="py-3 px-3 text-right border-r border-slate-300 font-mono">${formatK(summaryKas.totalKas)}</td>
                  <td class="py-3 px-3 text-right border-r border-slate-300 font-mono">${formatK(summaryKas.totalSampah)}</td>
                  <td class="py-3 px-3 text-right border-r border-slate-300 font-mono">${formatK(summaryKas.totalKematian)}</td>
                  <td class="py-3 px-3 text-right border-r border-slate-300 font-mono">${formatK(summaryKas.totalSosial)}</td>
                  <td class="py-3 px-3 text-right font-mono text-slate-900 bg-slate-300">${formatK(summaryKas.totalPendapatan)}</td>
                </tr>
              </tfoot>
            </table>

            <!-- TANDA TANGAN -->
            <div class="mt-10 flex justify-between px-10 text-center font-bold text-xs">
              <div>
                <p class="text-slate-500 mb-14">Ketua RT 05 RW 02</p>
                <p class="text-slate-900 border-b border-slate-900 pb-1 px-4 inline-block">( .................................... )</p>
              </div>
              <div>
                <p class="text-slate-500 mb-14">Bendahara RT 05</p>
                <p class="text-slate-900 border-b border-slate-900 pb-1 px-4 inline-block">( .................................... )</p>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed top-[57px] md:top-[61px] inset-x-0 bottom-0 z-30 bg-slate-50 flex flex-col overflow-hidden animate-in fade-in duration-200">
      
      {/* HEADER MODAL */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-3xs">
        <div className="flex items-center gap-2.5">
          <span className="text-base">📊</span>
          <div>
            <h2 className="text-xs sm:text-sm font-black tracking-wider text-slate-800 uppercase font-sans">
              LAPORAN PENDAPATAN BULANAN
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              RT 05 RW 02
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative" ref={actionMenuRef}>
          {/* Action Buttons (Desktop) */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintPDF}
              className="px-3 py-2 text-blue-600 hover:bg-blue-50/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-500" />
              Cetak PDF
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </button>
          </div>

          {/* Action Menu Dropdown (Outline Printer Icon) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowActionMenu(!showActionMenu)}
              className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                showActionMenu
                  ? "text-blue-600 bg-blue-50/80"
                  : "text-blue-500 hover:text-blue-700 hover:bg-blue-50/60"
              }`}
              title="Opsi Cetak & Pratinjau Laporan"
            >
              <Printer className="w-5 h-5 stroke-[1.75]" />
            </button>

            {showActionMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 w-56 space-y-1 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Opsi Cetak & Laporan
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    setShowPreviewModal(true);
                  }}
                  className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-800 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-blue-600 stroke-[1.75] shrink-0" />
                  <span>Pratinjau / Preview Cetak</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintPDF}
                  className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-800 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-blue-600 stroke-[1.75] shrink-0" />
                  <span>Cetak Langsung PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border-t border-slate-100 mt-1 pt-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 stroke-[1.75] shrink-0" />
                  <span>Export File Excel</span>
                </button>
              </div>
            )}
          </div>

          {/* Close button (X) in RED without frame - exact style as Laporan Bulanan */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
            title="Tutup Laporan"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* COMPACT SEARCH & COLLAPSIBLE FILTER BAR */}
      <div className="px-3 sm:px-4 py-2 border-b border-slate-200 bg-white shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          {/* SEARCH BOX */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama warga atau no. rumah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* EXPAND / COLLAPSE FILTER TOGGLE BUTTON */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              isFilterOpen || isFilterModified
                ? "bg-blue-50 border-blue-300 text-blue-700 shadow-2xs"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
            title="Filter Periode"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
            {isFilterOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {/* RESET FILTER BUTTON (Icon RotateCcw) */}
          {(isFilterOpen || isFilterModified) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200/60 transition-all cursor-pointer shrink-0"
              title="Reset Filter ke Default (Juli 2026)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* COLLAPSIBLE FILTER PANEL */}
        {isFilterOpen && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2.5 transition-all">
            {/* Filter Bulan */}
            <div>
              <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Pilih Bulan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
              >
                {BULAN_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Tahun */}
            <div>
              <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Pilih Tahun
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
              >
                {TAHUN_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* KONTEN UTAMA SCROLLABLE - EFFICIENT & CLEAN SPACING */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 bg-slate-50/60">
        
        {/* RINGKASAN IURAN (CLEAN WHITE CARD STYLE - SOFT & NEUTRAL) */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
          <div className="border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Ringkasan Iuran — {selectedMonthLabel}
              </h3>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
              <strong className="text-slate-800 font-bold">{summaryKas.wargaBayarCount} dari {summaryKas.totalWarga} warga</strong> sudah setor ({summaryKas.persentaseBayar}%)
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {/* Total Pendapatan */}
            <div className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                Total Pendapatan
              </span>
              <p className="text-base font-black font-mono text-slate-900 mt-0.5">
                {formatRupiah(summaryKas.totalPendapatan)}
              </p>
            </div>

            {/* Breakdown Per Jenis Iuran */}
            <div className="bg-slate-50/60 border border-slate-100 rounded-lg p-2.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                Iuran Bulanan
              </span>
              <p className="text-xs font-bold font-mono text-slate-800 mt-0.5">
                {formatRupiah(summaryKas.totalKas)}
              </p>
            </div>

            <div className="bg-slate-50/60 border border-slate-100 rounded-lg p-2.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                Iuran Sampah
              </span>
              <p className="text-xs font-bold font-mono text-slate-800 mt-0.5">
                {formatRupiah(summaryKas.totalSampah)}
              </p>
            </div>

            <div className="bg-slate-50/60 border border-slate-100 rounded-lg p-2.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                Iuran Kematian
              </span>
              <p className="text-xs font-bold font-mono text-slate-800 mt-0.5">
                {formatRupiah(summaryKas.totalKematian)}
              </p>
            </div>

            <div className="bg-slate-50/60 border border-slate-100 rounded-lg p-2.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                Iuran Sosial
              </span>
              <p className="text-xs font-bold font-mono text-slate-800 mt-0.5">
                {formatRupiah(summaryKas.totalSosial)}
              </p>
            </div>
          </div>
        </div>

        {/* TABEL MATRIKS PENDAPATAN (FRAMELESS / SQUARE CORNERS) */}
        <div className="bg-white border border-slate-200/80 rounded-none shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-3 text-center w-10 border-r border-slate-200">NO</th>
                  <th className="py-2.5 px-4 border-r border-slate-200 min-w-[160px]">NAMA WARGA</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-200 w-20">NO. RUMAH</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-200">IURAN BULANAN</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-200">IURAN SAMPAH</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-200">IURAN KEMATIAN</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-200">IURAN SOSIAL</th>
                  <th className="py-2.5 px-4 text-right bg-slate-200/60 text-slate-900 min-w-[120px]">
                    TOTAL PENDAPATAN
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400 font-bold">
                      Tidak ada data warga ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => {
                    const isPaid = item.total > 0;

                    return (
                      <tr
                        key={item.warga.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !isPaid ? "opacity-50 bg-slate-50/20" : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400 border-r border-slate-100">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-800 border-r border-slate-100 text-xs">
                          {item.warga.namaKepalaKeluarga}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-600 border-r border-slate-100">
                          {item.warga.nomorRumah}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-100">
                          {formatK(item.kas)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-100">
                          {formatK(item.sampah)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-100">
                          {formatK(item.kematian)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-100">
                          {formatK(item.sosial)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-extrabold text-slate-900 bg-slate-50/60">
                          {formatK(item.total)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* FOOTER TOTAL MATRIX */}
              {filteredData.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 text-slate-900 font-black text-xs uppercase tracking-wider border-t-2 border-slate-300">
                    <td colSpan={3} className="py-3 px-4 text-center border-r border-slate-200">
                      TOTAL PENDAPATAN
                    </td>
                    <td className="py-3 px-3 text-right font-mono border-r border-slate-200 text-slate-800">
                      {formatK(summaryKas.totalKas)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono border-r border-slate-200 text-slate-800">
                      {formatK(summaryKas.totalSampah)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono border-r border-slate-200 text-slate-800">
                      {formatK(summaryKas.totalKematian)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono border-r border-slate-200 text-slate-800">
                      {formatK(summaryKas.totalSosial)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 bg-slate-200/80">
                      {formatK(summaryKas.totalPendapatan)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>

      {/* MODAL PRATINJAU CETAK (PRINT PREVIEW) */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-200">
            {/* Header Top Bar Pratinjau */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-blue-400 stroke-[1.75]" />
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">Pratinjau Cetak Laporan Pendapatan</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Tampilan dokumen cetak / simpan PDF</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    handlePrintPDF();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4 stroke-[1.75]" />
                  <span>Cetak Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                  title="Tutup Pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Paper Preview Container */}
            <div className="p-4 sm:p-8 bg-slate-100 overflow-y-auto max-h-[80vh]">
              <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 text-slate-800 font-sans text-xs max-w-3xl mx-auto space-y-4">
                {/* Kop Surat */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-wide uppercase">LAPORAN PENDAPATAN IURAN RT 05 RW 02</h1>
                    <p className="text-xs text-slate-600 font-bold mt-0.5">
                      Periode: {BULAN_OPTIONS.find((b) => b.value === selectedMonth)?.label} {selectedYear}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Cetak</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                </div>

                {/* Summary Kas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold">
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Iuran Bulanan</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{formatRupiah(summaryKas.totalKas)}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Iuran Sampah</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{formatRupiah(summaryKas.totalSampah)}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Iuran Kematian</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{formatRupiah(summaryKas.totalKematian)}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Total Pendapatan</span>
                    <span className="text-xs font-mono font-black text-emerald-700">{formatRupiah(summaryKas.totalPendapatan)}</span>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[9.5px] tracking-wider border-b border-slate-200">
                        <th className="py-2 px-2 text-center w-8 border-r border-slate-200">NO</th>
                        <th className="py-2 px-3 text-left border-r border-slate-200">NAMA WARGA</th>
                        <th className="py-2 px-2 text-center w-12 border-r border-slate-200">RUMAH</th>
                        <th className="py-2 px-2 text-right border-r border-slate-200">BULANAN</th>
                        <th className="py-2 px-2 text-right border-r border-slate-200">SAMPAH</th>
                        <th className="py-2 px-2 text-right border-r border-slate-200">KEMATIAN</th>
                        <th className="py-2 px-2 text-right border-r border-slate-200">SOSIAL</th>
                        <th className="py-2 px-2 text-right bg-slate-200 text-slate-900 font-bold">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredData.slice(0, 12).map((item, idx) => (
                        <tr key={item.warga.id} className="hover:bg-slate-50">
                          <td className="py-2 px-2 text-center font-semibold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-200">{item.warga.namaKepalaKeluarga}</td>
                          <td className="py-2 px-2 text-center font-mono text-slate-600 border-r border-slate-200">{item.warga.nomorRumah}</td>
                          <td className="py-2 px-2 text-right font-mono border-r border-slate-200">{formatK(item.kas)}</td>
                          <td className="py-2 px-2 text-right font-mono border-r border-slate-200">{formatK(item.sampah)}</td>
                          <td className="py-2 px-2 text-right font-mono border-r border-slate-200">{formatK(item.kematian)}</td>
                          <td className="py-2 px-2 text-right font-mono border-r border-slate-200">{formatK(item.sosial)}</td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 bg-slate-50">{formatK(item.total)}</td>
                        </tr>
                      ))}
                      {filteredData.length > 12 && (
                        <tr>
                          <td colSpan={8} className="py-2 px-3 text-center italic text-slate-400 bg-slate-50">
                            ... Dan {filteredData.length - 12} warga lainnya
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 text-slate-900 font-black text-[10px] uppercase border-t-2 border-slate-300">
                        <td colSpan={3} className="py-2 px-2 text-center border-r border-slate-200">TOTAL</td>
                        <td className="py-2 px-2 text-right font-mono border-r border-slate-200">{formatK(summaryKas.totalKas)}</td>
                        <td className="py-2 px-2 text-right font-mono border-r border-slate-200">{formatK(summaryKas.totalSampah)}</td>
                        <td className="py-2 px-2 text-right font-mono border-r border-slate-200">{formatK(summaryKas.totalKematian)}</td>
                        <td className="py-2 px-2 text-right font-mono border-r border-slate-200">{formatK(summaryKas.totalSosial)}</td>
                        <td className="py-2 px-2 text-right font-mono text-slate-900 bg-slate-200">{formatK(summaryKas.totalPendapatan)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Signatures */}
                <div className="pt-6 flex justify-between px-10 text-center font-bold text-xs text-slate-700">
                  <div>
                    <p className="text-slate-500 mb-12">Ketua RT 05 RW 02</p>
                    <p className="border-b border-slate-400 pb-1 px-4 font-black text-slate-900">( .................................... )</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-12">Bendahara RT 05</p>
                    <p className="border-b border-slate-400 pb-1 px-4 font-black text-slate-900">( .................................... )</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
