/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Warga, formatMonthId } from "../types";
import { LIST_BULAN_2026, CURRENT_MONTH_ID } from "../data/dummy";
import {
  X,
  Printer,
  FileSpreadsheet,
  Search,
  Building2,
  Users,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  UserCheck,
  Check,
  Minus,
  Sparkles,
  Eye
} from "lucide-react";
import * as XLSX from "xlsx";

interface LaporanMatrixModalProps {
  wargaList: Warga[];
  onClose: () => void;
}

export default function LaporanMatrixModal({ wargaList, onClose }: LaporanMatrixModalProps) {
  // Default filter jenis iuran: SAMPAH_BULANAN (Iuran Sampah & Bulanan)
  const [filterJenisIuran, setFilterJenisIuran] = useState<string>("SAMPAH_BULANAN");
  const [filterKolektor, setFilterKolektor] = useState<string>("SEMUA");
  const [filterKategori, setFilterKategori] = useState<string>("SEMUA");
  const [filterStatus, setFilterStatus] = useState<string>("SEMUA");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // State untuk Expand/Collapse Filter Panel
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);

  // State untuk Floating Menu & Preview Modal
  const [showActionMenu, setShowActionMenu] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Close action menu when clicking outside
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

  // Daftar Kolektor
  const listKolektor = useMemo(() => {
    const defaultKolektorList = [
      "Is Tentrem"
    ];

    const existingFromData = new Set<string>();
    wargaList.forEach((w) => {
      if (w.namaKolektor && w.namaKolektor.trim() !== "") {
        existingFromData.add(w.namaKolektor.trim());
      }
    });

    const combined = Array.from(new Set([...defaultKolektorList, ...Array.from(existingFromData)]));
    return combined;
  }, [wargaList]);

  // Total active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterJenisIuran !== "SAMPAH_BULANAN") count++;
    if (filterKolektor !== "SEMUA") count++;
    if (filterKategori !== "SEMUA") count++;
    if (filterStatus !== "SEMUA") count++;
    return count;
  }, [filterJenisIuran, filterKolektor, filterKategori, filterStatus]);

  // Reset Filters to default
  const handleResetFilters = () => {
    setFilterJenisIuran("SAMPAH_BULANAN");
    setFilterKolektor("SEMUA");
    setFilterKategori("SEMUA");
    setFilterStatus("SEMUA");
    setSearchQuery("");
  };

  // Filter Warga
  const filteredWarga = useMemo(() => {
    return wargaList.filter((w) => {
      // 1. Filter Jenis Iuran
      if (filterJenisIuran === "SAMPAH_BULANAN") {
        const hasSampahKas = !w.iuranAktif || w.iuranAktif.some((id) => id === "kas" || id === "sampah");
        if (!hasSampahKas) return false;
      } else if (filterJenisIuran === "KEMATIAN_SOSIAL") {
        const hasKematianSosial = w.iuranAktif && w.iuranAktif.some((id) => id === "kematian" || id === "sosial");
        if (!hasKematianSosial) return false;
      }

      // 2. Filter Kategori Warga
      if (filterKategori !== "SEMUA" && w.kategoriIuran !== filterKategori) {
        return false;
      }

      // 3. Filter Kolektor
      if (filterKolektor !== "SEMUA") {
        const kolektorWarga = w.namaKolektor || "Is Tentrem";
        if (!kolektorWarga.toLowerCase().includes(filterKolektor.toLowerCase().split(" ")[0])) {
          // Check substring matching for clean selection
          if (w.namaKolektor !== filterKolektor) return false;
        }
      }

      // 4. Filter Status Bulan Berjalan (Juli 2026)
      const isLunasBulanIni = w.historyPembayaran.includes(CURRENT_MONTH_ID);
      if (filterStatus === "LUNAS" && !isLunasBulanIni) return false;
      if (filterStatus === "TUNGGAKAN" && isLunasBulanIni) return false;

      // 5. Search Query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const matchNama = w.namaKepalaKeluarga.toLowerCase().includes(q);
        const matchRumah = w.nomorRumah.toLowerCase().includes(q);
        const matchKategori = w.kategoriIuran.toLowerCase().includes(q);
        const matchKolektor = (w.namaKolektor || "").toLowerCase().includes(q);
        if (!matchNama && !matchRumah && !matchKategori && !matchKolektor) return false;
      }

      return true;
    });
  }, [wargaList, filterJenisIuran, filterKolektor, filterKategori, filterStatus, searchQuery]);

  // Ringkasan Statistik
  const totalWargaFiltered = filteredWarga.length;
  const totalLunasBulanIni = filteredWarga.filter((w) => w.historyPembayaran.includes(CURRENT_MONTH_ID)).length;

  // Handler Export Excel Matriks
  const handleExportExcelMatrix = () => {
    setShowActionMenu(false);
    const rows = filteredWarga.map((w, index) => {
      const kolektor = w.namaKolektor || "Is Tentrem";
      const rowData: Record<string, any> = {
        No: index + 1,
        "Nama Kepala Keluarga": w.namaKepalaKeluarga,
        "No. Rumah": w.nomorRumah,
        "Jenis Iuran": filterJenisIuran === "SAMPAH_BULANAN" ? "Iuran Sampah & Bulanan" : filterJenisIuran === "KEMATIAN_SOSIAL" ? "Iuran Kematian & Sosial" : "Semua Iuran",
        "Kolektor Penanggung Jawab": kolektor,
        "Tarif / Bulan": w.tarifPerBulan,
      };

      // Tambahkan kolom status tiap bulan (Jan - Des)
      LIST_BULAN_2026.forEach((bulan) => {
        const isPaid = w.historyPembayaran.includes(bulan.id);
        rowData[bulan.namaBulan] = isPaid ? "LUNAS (✓)" : "BELUM (-)";
      });

      rowData["Total Bulan Lunas"] = `${w.historyPembayaran.length} / 12`;
      return rowData;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Matriks_Iuran_2026");
    XLSX.writeFile(wb, `Laporan_Matriks_Iuran_RT05_${CURRENT_MONTH_ID}.xlsx`);
  };

  // Handler Cetak Laporan Landscape
  const handlePrintMatrixReport = () => {
    setShowActionMenu(false);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const tableRowsHtml = filteredWarga
      .map((w, index) => {
        const kolektor = w.namaKolektor || "Is Tentrem";

        const monthsCellsHtml = LIST_BULAN_2026.map((bulan) => {
          const isPaid = w.historyPembayaran.includes(bulan.id);
          return `
            <td class="text-center py-2 px-1 border border-slate-200">
              ${
                isPaid
                  ? `<span class="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>`
                  : `<span class="inline-block w-2.5 h-2.5 bg-rose-300 rounded-full"></span>`
              }
            </td>
          `;
        }).join("");

        return `
          <tr class="hover:bg-slate-50 transition-colors">
            <td class="text-center py-2 px-2 border border-slate-200 font-semibold text-slate-500">${index + 1}</td>
            <td class="py-2 px-3 border border-slate-200 font-bold text-slate-800">${w.namaKepalaKeluarga}</td>
            <td class="text-center py-2 px-2 border border-slate-200 font-mono text-slate-600 font-semibold">${w.nomorRumah}</td>
            ${monthsCellsHtml}
            <td class="text-center py-2 px-2 border border-slate-200 font-mono font-bold text-blue-700">${w.historyPembayaran.length}/12</td>
          </tr>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Matriks Laporan Iuran Bulanan RT 05 RW 02</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            @media print {
              .no-print { display: none !important; }
              body { padding: 0 !important; }
            }
          </style>
        </head>
        <body class="bg-white p-6 font-sans text-slate-800 text-xs">
          <div class="max-w-[1200px] mx-auto">
            <!-- HEADER REKAP -->
            <div class="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
              <div>
                <h1 class="text-xl font-black text-slate-900 tracking-wide uppercase">LAPORAN MATRIKS PEMBAYARAN IURAN RT 05 RW 02</h1>
                <p class="text-xs text-slate-600 font-bold mt-0.5">Sistem Pengelolaan Iuran Mandiri — Tahun 2026</p>
                <p class="text-[11px] text-blue-700 font-bold mt-0.5">
                  Filter: ${filterJenisIuran === "SAMPAH_BULANAN" ? "Iuran Sampah & Bulanan (Kolektor: Is tentrem)" : filterJenisIuran === "KEMATIAN_SOSIAL" ? "Iuran Kematian & Sosial" : "Semua Jenis Iuran"}
                  ${filterKolektor !== "SEMUA" ? ` | Kolektor: ${filterKolektor}` : ""}
                </p>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Cetak</span>
                <span class="text-xs font-mono font-bold text-slate-800">${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            </div>

            <!-- KETERANGAN / LEGEND -->
            <div class="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-xs font-semibold">
              <div class="flex items-center gap-4">
                <span class="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">Keterangan Status:</span>
                <div class="flex items-center gap-1.5">
                  <span class="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                  <span>Sudah Lunas</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="inline-block w-2.5 h-2.5 bg-rose-300 rounded-full"></span>
                  <span>Belum Lunas</span>
                </div>
              </div>
              <div class="text-slate-600 font-medium">
                Total Warga Ditampilkan: <strong class="text-slate-900">${filteredWarga.length} Warga</strong>
              </div>
            </div>

            <!-- TABEL MATRIKS -->
            <table class="w-full border-collapse border border-slate-200 text-xs">
              <thead>
                <tr class="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider">
                  <th class="py-2.5 px-2 border border-slate-200 text-center w-8">NO</th>
                  <th class="py-2.5 px-3 border border-slate-200 text-left">NAMA WARGA</th>
                  <th class="py-2.5 px-2 border border-slate-200 text-center w-12">RUMAH</th>
                  <th class="py-2.5 px-1 border border-slate-200 text-center w-8">JAN</th>
                  <th class="py-2.5 px-1 border border-slate-200 text-center w-8">FEB</th>
                  <th class="py-2.5 px-1 border border-slate-200 text-center w-8">MAR</th>
                  <th class="py-2.5 px-1 border border-slate-200 text-center w-8">APR</th>
                  <th class="py-2.5 px-1 border border-slate-200 text-center w-8">MEI</th>
                  <th class="py-2.5 px-1 border border-slate-200 text-center w-8">JUN</th>
                  <th class="py-2.5 px-1 border border-slate-200 text-center w-8">JUL</th>
                  <th class="py-2.5 px-1 border border-slate-200 text-center w-8">AGU</th>
                  <th class="py-2.5 px-1 border border-slate-200 text-center w-8">SEP</th>
                  <th class="py-2.5 px-1 border border-slate-200 text-center w-8">OKT</th>
                  <th class="py-2.5 px-1 border border-slate-200 text-center w-8">NOV</th>
                  <th class="py-2.5 px-1 border border-slate-200 text-center w-8">DES</th>
                  <th class="py-2.5 px-2 border border-slate-200 text-center w-14">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>

            <!-- TANDA TANGAN -->
            <div class="mt-10 flex justify-between px-10 text-center font-bold text-xs">
              <div>
                <p class="text-slate-500 mb-14">Mengetahui,<br>Ketua RT 05 RW 02</p>
                <p class="border-b border-slate-400 pb-1 px-4 font-black text-slate-800">( Bpk. Suhartono )</p>
              </div>
              <div>
                <p class="text-slate-500 mb-14">Dibuat Oleh,<br>Kolektor Penanggung Jawab</p>
                <p class="border-b border-slate-400 pb-1 px-4 font-black text-slate-800">( ${filterKolektor !== "SEMUA" ? filterKolektor : (filterJenisIuran === "SAMPAH_BULANAN" ? "Is tentrem" : "Kolektor RT 05")} )</p>
              </div>
            </div>

            <!-- TOMBOL CETAK -->
            <div class="no-print mt-8 flex justify-center">
              <button onclick="window.print()" class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs shadow-lg transition-all cursor-pointer">
                🖨️ CETAK DOKUMEN / SIMPAN PDF
              </button>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-200">
      {/* HEADER BAR (FULL WIDTH) */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-xs shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black tracking-widest leading-none uppercase text-slate-900">
              LAPORAN IURAN RT
            </h1>
            <span className="text-[10px] sm:text-xs text-slate-500 font-bold tracking-wider block mt-1">
              RT 05 RW 02
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Summary pill */}
          <div className="hidden md:flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xs">
            <span>Total Warga: <strong className="text-slate-900">{totalWargaFiltered}</strong></span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700">Lunas Juli: <strong>{totalLunasBulanIni}</strong></span>
          </div>

          {/* Action Menu Dropdown (Outline Printer Icon) */}
          <div className="relative" ref={actionMenuRef}>
            <button
              type="button"
              onClick={() => setShowActionMenu(!showActionMenu)}
              className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer border ${
                showActionMenu
                  ? "text-blue-700 bg-blue-50 border-blue-200 shadow-2xs"
                  : "text-slate-700 bg-white border-slate-200 hover:text-slate-900 hover:bg-slate-50"
              }`}
              title="Opsi Cetak & Export Laporan"
            >
              <Printer className="w-5 h-5 stroke-[1.75]" />
            </button>

            {/* POPUP ACTION MENU DROPDOWN */}
            {showActionMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 w-56 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
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
                  onClick={handlePrintMatrixReport}
                  className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-800 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-blue-600 stroke-[1.75] shrink-0" />
                  <span>Cetak Langsung PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcelMatrix}
                  className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border-t border-slate-100 mt-1 pt-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 stroke-[1.75] shrink-0" />
                  <span>Export File Excel</span>
                </button>
              </div>
            )}
          </div>

          {/* Close button (X) in RED without frame */}
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

      {/* COMPACT SEARCH & COLLAPSIBLE FILTER HEADER BAR */}
      <div className="px-4 sm:px-6 py-2.5 border-b border-slate-200 bg-white shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          {/* SEARCH BOX */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama warga atau no. rumah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
            />
          </div>

          {/* EXPAND / COLLAPSE FILTER TOGGLE BUTTON */}
          <button
            type="button"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={`px-3.5 py-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              isFilterExpanded || activeFilterCount > 0
                ? "bg-blue-50 border-blue-300 text-blue-700 shadow-2xs"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filter Matriks</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 bg-blue-600 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            {isFilterExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {/* RESET FILTER BUTTON IF ACTIVE */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer shrink-0"
              title="Reset Filter ke Default"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* COLLAPSIBLE FILTER PANEL */}
        {isFilterExpanded && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-3 animate-in slide-in-from-top-2 duration-150">
            {/* Filter Jenis Iuran */}
            <div className="space-y-1">
              <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block">
                Jenis Iuran:
              </label>
              <select
                value={filterJenisIuran}
                onChange={(e) => setFilterJenisIuran(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="SAMPAH_BULANAN">Iuran Sampah & Bulanan (Default)</option>
                <option value="KEMATIAN_SOSIAL">Iuran Kematian & Sosial</option>
                <option value="SEMUA">Semua Jenis Iuran</option>
              </select>
            </div>

            {/* Filter Nama Kolektor */}
            <div className="space-y-1">
              <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block">
                Filter Kolektor:
              </label>
              <select
                value={filterKolektor}
                onChange={(e) => setFilterKolektor(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="SEMUA">Semua Kolektor (Tanpa Label Nama)</option>
                {listKolektor.map((kol) => (
                  <option key={kol} value={kol}>
                    {kol}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Kategori Warga */}
            <div className="space-y-1">
              <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block">
                Kategori Warga:
              </label>
              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="SEMUA">Semua Kategori Warga</option>
                <option value="Warga Biasa">Warga Biasa</option>
                <option value="Warga Usaha">Warga Usaha</option>
                <option value="Warga Luar">Warga Luar</option>
              </select>
            </div>

            {/* Filter Status Bulan Ini */}
            <div className="space-y-1">
              <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block">
                Status Bulan Ini (Juli):
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="LUNAS">Hanya Lunas</option>
                <option value="TUNGGAKAN">Hanya Belum Lunas</option>
              </select>
            </div>
          </div>
        )}

        {/* ACTIVE FILTER BADGE INDICATOR IF KOLEKTOR FILTERED */}
        {filterKolektor !== "SEMUA" && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold">
            <UserCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Kolektor Terpilih: <strong>{filterKolektor}</strong></span>
          </div>
        )}
      </div>

      {/* MAIN TABLE AREA (MAXIMIZED FULL PAGE HEIGHT) */}
      <div className="flex-1 overflow-auto bg-slate-100 p-2 sm:p-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden h-full flex flex-col">
          {/* HEADER DI ATAS MATRIKS */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-200/80 px-2 py-0.5 rounded">
                KOLEKTOR
              </span>
              <h3 className="text-xs sm:text-sm font-black tracking-widest leading-none uppercase text-slate-900">
                {filterKolektor !== "SEMUA"
                  ? filterKolektor.toUpperCase()
                  : filterJenisIuran === "SAMPAH_BULANAN"
                  ? "IS TENTREM"
                  : "SEMUA KOLEKTOR"}{" "}
                <span className="text-blue-700 font-black font-mono ml-1">({totalWargaFiltered})</span>
              </h3>
            </div>
            <div className="text-xs font-extrabold text-slate-500 hidden sm:block">
              {filterJenisIuran === "SAMPAH_BULANAN"
                ? "Iuran Sampah & Bulanan"
                : filterJenisIuran === "KEMATIAN_SOSIAL"
                ? "Iuran Kematian & Sosial"
                : "Semua Jenis Iuran"}
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-4 min-w-[180px]">Nama Kepala Keluarga</th>
                  <th className="py-2.5 px-3 text-center w-20">Rumah</th>

                  {/* 12 Bulan Columns */}
                  {LIST_BULAN_2026.map((b) => (
                    <th key={b.id} className="py-2.5 px-1 text-center font-sans font-black w-10">
                      {b.namaBulan.split(" ")[0].substring(0, 3).toUpperCase()}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-center w-16">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-bold">
                {filteredWarga.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="py-16 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-slate-700 text-xs">Data Warga Tidak Ditemukan</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Coba ubah pencarian atau penyaring di atas.</p>
                    </td>
                  </tr>
                ) : (
                  filteredWarga.map((w, index) => {
                    const kolektorName = w.namaKolektor || "Is Tentrem";

                    return (
                      <tr key={w.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 text-[11px] font-mono">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-800 text-[11px]">
                          <div>{w.namaKepalaKeluarga}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600 text-[11px]">
                          {w.nomorRumah}
                        </td>

                        {/* 12 Bulan Columns */}
                        {LIST_BULAN_2026.map((bulan) => {
                          const isPaid = w.historyPembayaran.includes(bulan.id);

                          return (
                            <td key={bulan.id} className="py-2.5 px-1 text-center">
                              {isPaid ? (
                                <span
                                  title={`Lunas (${formatMonthId(bulan.id)})`}
                                  className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full cursor-default align-middle"
                                />
                              ) : (
                                <span
                                  title={`Belum Lunas (${formatMonthId(bulan.id)})`}
                                  className="inline-block w-2.5 h-2.5 bg-rose-300 rounded-full cursor-default align-middle"
                                />
                              )}
                            </td>
                          );
                        })}

                        <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700 text-[11px]">
                          {w.historyPembayaran.length}/12
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL PRATINJAU CETAK (PRINT PREVIEW) */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-200">
            {/* Header Top Bar Pratinjau */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-blue-400 stroke-[1.75]" />
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">Pratinjau Cetak Matriks Laporan Iuran</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Tampilan dokumen cetak / simpan PDF</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    handlePrintMatrixReport();
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

            {/* Simulated Paper A4 Landscape Container */}
            <div className="p-4 sm:p-8 bg-slate-100 overflow-y-auto max-h-[80vh]">
              <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 text-slate-800 font-sans text-xs max-w-4xl mx-auto space-y-4">
                {/* Kop Document */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-wide uppercase">LAPORAN MATRIKS PEMBAYARAN IURAN RT 05 RW 02</h1>
                    <p className="text-xs text-slate-600 font-bold mt-0.5">Sistem Pengelolaan Iuran Mandiri — Tahun 2026</p>
                    <p className="text-[11px] text-blue-700 font-bold mt-0.5">
                      Filter: {filterJenisIuran === "SAMPAH_BULANAN" ? "Iuran Sampah & Bulanan" : filterJenisIuran === "KEMATIAN_SOSIAL" ? "Iuran Kematian & Sosial" : "Semua Jenis Iuran"}
                      {filterKolektor !== "SEMUA" ? ` | Kolektor: ${filterKolektor}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Cetak</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold">
                  <div className="flex items-center gap-4">
                    <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">Status:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                      <span>Lunas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 bg-rose-300 rounded-full"></span>
                      <span>Belum Lunas</span>
                    </div>
                  </div>
                  <div className="text-slate-600 font-medium">
                    Total: <strong className="text-slate-900">{filteredWarga.length} Warga</strong>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[9.5px] tracking-wider border-b border-slate-200">
                        <th className="py-2 px-1 text-center w-8 border-r border-slate-200">NO</th>
                        <th className="py-2 px-3 text-left border-r border-slate-200">NAMA WARGA</th>
                        <th className="py-2 px-1 text-center w-12 border-r border-slate-200">RUMAH</th>
                        {LIST_BULAN_2026.map(b => (
                          <th key={b.id} className="py-2 px-1 text-center w-7 border-r border-slate-200">{b.namaBulan.substring(0, 3).toUpperCase()}</th>
                        ))}
                        <th className="py-2 px-2 text-center w-12">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredWarga.slice(0, 15).map((w, idx) => (
                        <tr key={w.id} className="hover:bg-slate-50">
                          <td className="py-2 px-1 text-center font-semibold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-200">{w.namaKepalaKeluarga}</td>
                          <td className="py-2 px-1 text-center font-mono text-slate-600 border-r border-slate-200">{w.nomorRumah}</td>
                          {LIST_BULAN_2026.map(b => {
                            const isPaid = w.historyPembayaran.includes(b.id);
                            return (
                              <td key={b.id} className="py-2 px-1 text-center border-r border-slate-200">
                                {isPaid ? (
                                  <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full" />
                                ) : (
                                  <span className="inline-block w-2 h-2 bg-rose-300 rounded-full" />
                                )}
                              </td>
                            );
                          })}
                          <td className="py-2 px-2 text-center font-mono font-bold text-blue-700">{w.historyPembayaran.length}/12</td>
                        </tr>
                      ))}
                      {filteredWarga.length > 15 && (
                        <tr>
                          <td colSpan={16} className="py-2 px-3 text-center italic text-slate-400 bg-slate-50">
                            ... Dan {filteredWarga.length - 15} warga lainnya
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Signatures */}
                <div className="pt-6 flex justify-between px-10 text-center font-bold text-xs text-slate-700">
                  <div>
                    <p className="text-slate-500 mb-12">Mengetahui,<br />Ketua RT 05 RW 02</p>
                    <p className="border-b border-slate-400 pb-1 px-4 font-black text-slate-900">( Bpk. Suhartono )</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-12">Dibuat Oleh,<br />Kolektor Penanggung Jawab</p>
                    <p className="border-b border-slate-400 pb-1 px-4 font-black text-slate-900">( {filterKolektor !== "SEMUA" ? filterKolektor : "Is Tentrem"} )</p>
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
