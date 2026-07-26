/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, Home, Calendar, ShieldCheck, ArrowLeft, Send, Sparkles, Check, Edit2, Info, RefreshCw, QrCode, Phone, AlertTriangle, ArrowRight, CheckCircle2, X } from "lucide-react";
import { LIST_BULAN_2026, CURRENT_MONTH_ID } from "../data/dummy";
import { Warga, formatMonthId } from "../types";

interface WargaDetailsProps {
  warga: Warga;
  onBack: () => void;
  onSubmitPayment: (selectedMonths: string[], totalBayar: number, catatan: string) => void;
  isSubmitting: boolean;
}

export default function WargaDetails({ warga, onBack, onSubmitPayment, isSubmitting }: WargaDetailsProps) {
  // Hitung tunggakan warga s.d bulan berjalan (Juli 2026)
  const listBulanUpToCurrent = LIST_BULAN_2026.filter((b) => b.id <= CURRENT_MONTH_ID);
  const unpaidMonths = listBulanUpToCurrent.filter((b) => !warga.historyPembayaran.includes(b.id));

  const isLunas = unpaidMonths.length === 0;

  // State Manajemen
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [customNominal, setCustomNominal] = useState<number>(0);
  const [isEditingNominal, setIsEditingNominal] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [pilihanMode, setPilihanMode] = useState<"BERJALAN" | "SEMUA_TUNGGAKAN" | "MANUAL" | null>(null);

  // State Modal Peringatan Double Pembayaran
  const [warningModal, setWarningModal] = useState<{ targetMonth: string; nextMonth: string | null } | null>(null);

  // Helper untuk mencari bulan berikutnya yang belum dibayar di tahun 2026
  const findNextUnpaidMonth = (targetMonthId?: string): string | null => {
    const unpaid = LIST_BULAN_2026.filter((b) => !warga.historyPembayaran.includes(b.id));
    if (unpaid.length === 0) return null;
    if (targetMonthId) {
      const afterTarget = unpaid.filter((b) => b.id > targetMonthId);
      if (afterTarget.length > 0) return afterTarget[0].id;
    }
    return unpaid[0].id;
  };

  // Hitung nilai awal total iuran berdasarkan bulan yang dipilih
  const tarifDasar = warga.tarifPerBulan;

  useEffect(() => {
    // Inisialisasi awal pilihan bulan
    if (isLunas) {
      // Jika lunas s.d bulan ini, periksa apakah bulan berjalan (Juli) sudah dibayar
      if (warga.historyPembayaran.includes(CURRENT_MONTH_ID)) {
        const nextUnpaid = findNextUnpaidMonth(CURRENT_MONTH_ID);
        // Set pilihan awal ke bulan berjalan dan TAMPILKAN MODAL PERINGATAN
        setSelectedMonths([CURRENT_MONTH_ID]);
        setWarningModal({
          targetMonth: CURRENT_MONTH_ID,
          nextMonth: nextUnpaid,
        });
      } else {
        setSelectedMonths([CURRENT_MONTH_ID]);
      }
      setPilihanMode("BERJALAN");
    } else {
      // Jika ada tunggakan, default tawarkan "Bayar semua tunggakan"
      const unpaidIds = unpaidMonths.map((m) => m.id);
      setSelectedMonths(unpaidIds);
      setPilihanMode("SEMUA_TUNGGAKAN");
    }
  }, [warga.id]);

  useEffect(() => {
    // Sinkronkan nominal bayar otomatis ketika pilihan bulan berubah
    setCustomNominal(tarifDasar * selectedMonths.length);
  }, [selectedMonths, tarifDasar]);

  // Format ke Rupiah
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Pilih mode "Bayar Bulan Berjalan"
  const handlePilihBulanBerjalan = () => {
    if (warga.historyPembayaran.includes(CURRENT_MONTH_ID)) {
      const nextUnpaid = findNextUnpaidMonth(CURRENT_MONTH_ID);
      setWarningModal({
        targetMonth: CURRENT_MONTH_ID,
        nextMonth: nextUnpaid,
      });
      return;
    }
    setSelectedMonths([CURRENT_MONTH_ID]);
    setPilihanMode("BERJALAN");
    setIsEditingNominal(false);
  };

  // Pilih mode "Bayar Semua Tunggakan"
  const handlePilihSemuaTunggakan = () => {
    const unpaidIds = unpaidMonths.map((m) => m.id);
    setSelectedMonths(unpaidIds);
    setPilihanMode("SEMUA_TUNGGAKAN");
    setIsEditingNominal(false);
  };

  // Toggle pilihan bulan tertentu
  const handleToggleMonthManual = (monthId: string) => {
    setPilihanMode("MANUAL");
    // Jika bulan yang diklik SUDAH LUNAS
    if (warga.historyPembayaran.includes(monthId)) {
      const nextUnpaid = findNextUnpaidMonth(monthId);
      setWarningModal({
        targetMonth: monthId,
        nextMonth: nextUnpaid,
      });
      return;
    }

    setSelectedMonths((prev) => {
      if (prev.includes(monthId)) {
        return prev.filter((m) => m !== monthId).sort();
      } else {
        return [...prev, monthId].sort();
      }
    });
  };

  // Eksekusi pengalihan pembayaran dari bulan lunas ke bulan berikutnya yang belum dibayar
  const handleApplyRedirectMonth = (paidMonth: string, newUnpaidMonth: string) => {
    setSelectedMonths((prev) => {
      const filtered = prev.filter((m) => m !== paidMonth);
      if (!filtered.includes(newUnpaidMonth)) {
        return [...filtered, newUnpaidMonth].sort();
      }
      return filtered.sort();
    });
    setWarningModal(null);
  };

  const handleProsesKonfirmasi = () => {
    if (selectedMonths.length === 0) return;

    // Periksa apakah ada bulan yang dipilih yang sebenarnya sudah lunas
    const paidInSelected = selectedMonths.filter((m) => warga.historyPembayaran.includes(m));
    if (paidInSelected.length > 0) {
      const targetMonth = paidInSelected[0];
      const nextUnpaid = findNextUnpaidMonth(targetMonth);
      setWarningModal({
        targetMonth: targetMonth,
        nextMonth: nextUnpaid,
      });
      return;
    }

    onSubmitPayment(selectedMonths, customNominal, catatan);
  };

  return (
    <div className="flex flex-col space-y-2.5 w-full" id="warga-details-container">
      {/* HEADER CARD WARGA */}
      <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-3xs relative overflow-hidden">
        <button
          onClick={onBack}
          className="absolute top-3.5 left-3.5 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 transition-colors cursor-pointer"
          title="Kembali"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center pt-1.5 pb-0.5 text-center">
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 mb-2">
            <User className="w-5.5 h-5.5 stroke-[2.5]" />
          </div>
          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">
            ID: {warga.id}
          </span>
          <h3 className="font-extrabold text-sm text-slate-800 leading-tight tracking-tight mt-1.5">
            {warga.namaKepalaKeluarga}
          </h3>

          <div className="flex flex-col items-center gap-0.5 mt-2 text-[11px] text-slate-500 font-semibold">
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <Home className="w-3.5 h-3.5 text-blue-500" />
              <span>No. Rumah: <strong className="text-slate-800 font-extrabold">{warga.nomorRumah}</strong></span>
              <span>•</span>
              <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-black text-[9px]">
                {warga.kategoriIuran}
              </span>
              <span>•</span>
              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-bold text-[9px]">
                Kolektor: {warga.namaKolektor || "Is Tentrem"}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-mono">
              <QrCode className="w-3.5 h-3.5 text-slate-400" />
              <span>No. KK: <strong className="text-slate-600 font-bold">{warga.nomorKk}</strong></span>
              {warga.nomorHp && (
                <>
                  <span className="text-slate-300 mx-1">•</span>
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>WA: <strong className="text-slate-700 font-bold">{warga.nomorHp}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DETEKSI KASUS 1: JIKA TIDAK MEMILIKI TUNGGAKAN S.D BULAN BERJALAN */}
      {isLunas ? (
        <div className="space-y-2.5">
          <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-3xs space-y-4">
            {/* Status lunas header */}
            <div className="flex items-center gap-3 bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                <Check className="w-4.5 h-4.5 stroke-[3]" />
              </div>
              <div className="text-left">
                <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider block">Status Warga</span>
                <h4 className="text-xs font-black text-emerald-950">
                  Lunas s/d {formatMonthId(CURRENT_MONTH_ID)}
                </h4>
              </div>
            </div>

            {/* Banner Informasi Pengalihan Iuran Lanjutan */}
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 text-[11px] text-blue-900 space-y-1">
              <div className="flex items-center gap-1.5 font-extrabold text-blue-950">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Seluruh iuran s/d {formatMonthId(CURRENT_MONTH_ID)} telah Lunas.</span>
              </div>
              <p className="text-[10.5px] text-blue-800/90 leading-tight">
                Anda dapat memilih iuran lanjutan untuk bulan mendatang, atau klik bulan yang telah lunas di bawah untuk menguji peringatan double bayar.
              </p>
            </div>

            {/* PILIHAN METODE PEMBAYARAN & GRID BULAN */}
            <div className="space-y-1.5 border-t border-slate-100 pt-3.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Pilih Bulan Pembayaran:
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePilihBulanBerjalan}
                  className={`py-2 px-1.5 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                    pilihanMode === "BERJALAN"
                      ? "bg-blue-600 text-white border-blue-600 shadow-3xs"
                      : "bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100"
                  }`}
                >
                  <span>Bulan Berjalan</span>
                  <span className="font-mono text-[8.5px] font-medium opacity-80">({formatMonthId(CURRENT_MONTH_ID)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPilihanMode("MANUAL")}
                  className={`py-2 px-1.5 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                    pilihanMode === "MANUAL" || pilihanMode === null
                      ? "bg-blue-600 text-white border-blue-600 shadow-3xs"
                      : "bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100"
                  }`}
                >
                  <span>Pilih Bulan</span>
                  <span className="font-mono text-[8.5px] font-medium opacity-80">Daftar Bulan 2026</span>
                </button>
              </div>

              {/* Grid Daftar Bulan 2026 */}
              <div className="pt-2 border-t border-slate-100 mt-2">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                  Daftar Bulan Iuran (Klik bulan lunas untuk alihkan):
                </span>
                <div className="grid grid-cols-3 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {LIST_BULAN_2026.map((bulan) => {
                    const isBulanLunas = warga.historyPembayaran.includes(bulan.id);
                    const isCentang = selectedMonths.includes(bulan.id);

                    return (
                      <button
                        key={bulan.id}
                        type="button"
                        onClick={() => handleToggleMonthManual(bulan.id)}
                        className={`p-1.5 rounded-lg border text-center relative transition-all cursor-pointer text-xs h-8 flex items-center justify-center font-bold active:scale-95 ${
                          isBulanLunas
                            ? "bg-amber-50/80 border-amber-200 text-amber-800 hover:border-amber-400 hover:bg-amber-100/80"
                            : isCentang
                            ? "bg-blue-50 border-blue-500 text-blue-700 shadow-3xs"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className="font-mono text-[9.5px]">{formatMonthId(bulan.id)}</span>
                        {isBulanLunas && (
                          <span className="absolute top-0 right-0 text-[6.5px] bg-amber-200 text-amber-900 px-0.8 rounded-bl font-extrabold">
                            Lunas
                          </span>
                        )}
                        {isCentang && !isBulanLunas && (
                          <div className="absolute top-0 right-0 w-2 h-2 bg-blue-600 rounded-full flex items-center justify-center">
                            <div className="w-0.8 h-0.8 bg-white rounded-full" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* NOMINAL SETORAN */}
            <div className="space-y-1.5 border-t border-slate-100 pt-3.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Nominal Setoran ({selectedMonths.length} Bulan):
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingNominal(!isEditingNominal)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer font-sans"
                >
                  <Edit2 className="w-3 h-3" />
                  {isEditingNominal ? "Simpan" : "Ubah Nominal"}
                </button>
              </div>

              {isEditingNominal ? (
                <div className="space-y-1">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-xs">Rp</span>
                    <input
                      type="number"
                      value={customNominal || ""}
                      onChange={(e) => setCustomNominal(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-blue-500 rounded-xl font-mono text-sm font-black text-blue-800 outline-none h-10"
                      placeholder="0"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[8.5px] text-slate-400 font-bold uppercase">Tarif Standar</span>
                    <span className="text-[9px] font-mono font-semibold text-slate-500">
                      {formatRupiah(tarifDasar)} x {selectedMonths.length} bulan
                    </span>
                  </div>
                  <span className="text-sm font-black font-mono text-slate-800">
                    {formatRupiah(customNominal)}
                  </span>
                </div>
              )}
            </div>

            {/* Catatan Pembayaran */}
            <div className="border-t border-slate-100 pt-3.5 space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Catatan Pembayaran (Opsional):
              </label>
              <input
                type="text"
                placeholder="Masukkan catatan jika ada..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200/60 rounded-xl outline-none focus:border-blue-500 focus:bg-white font-semibold transition-all h-10"
              />
            </div>

            {/* RINGKASAN SUBMIT KASUS 1 */}
            <div className="border-t border-slate-100 pt-3.5 flex justify-between items-center">
              <div className="flex flex-col text-left">
                <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-widest">TOTAL SETORAN</span>
                <span className="text-[9.5px] font-bold font-mono text-slate-600 mt-0.5 max-w-[150px] truncate">
                  {selectedMonths.map(formatMonthId).join(", ") || "Belum dipilih"}
                </span>
              </div>
              <span className="text-base font-black font-mono text-blue-600">
                {formatRupiah(customNominal)}
              </span>
            </div>
          </div>

          {/* Tombol Aksi Kasus 1 (BATAL / KONFIRMASI) */}
          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <button
              onClick={onBack}
              disabled={isSubmitting}
              className="py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
            >
              BATAL
            </button>
            <button
              onClick={handleProsesKonfirmasi}
              disabled={selectedMonths.length === 0 || isSubmitting}
              className={`py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border shadow-sm active:scale-95 ${
                selectedMonths.length === 0 || isSubmitting
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500"
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>MEMPROSES...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>KONFIRMASI BAYAR</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* DETEKSI KASUS 2: JIKA MEMILIKI TUNGGAKAN */
        <div className="space-y-2.5">
          <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-3xs space-y-4">
            
            {/* 1. STATUS TUNGGAKAN */}
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[8px] font-black uppercase rounded-md tracking-wider">
                  TUNGGAKAN
                </span>
                <span className="text-[11px] font-bold text-amber-800">
                  Memiliki Tunggakan {unpaidMonths.length} Bulan
                </span>
              </div>
              
              <div className="flex items-center justify-between text-[10.5px] mt-0.5 border-t border-amber-200/30 pt-1.5">
                <div className="text-slate-500 font-semibold">
                  Tarif: <strong className="text-slate-700">{formatRupiah(warga.tarifPerBulan)}</strong>/bln
                </div>
                <div className="text-amber-800 font-extrabold font-mono">
                  Total: {formatRupiah(warga.tarifPerBulan * unpaidMonths.length)}
                </div>
              </div>

              {/* List daftar bulan yang menunggak */}
              <div className="mt-1 flex flex-wrap gap-1 items-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mr-1">Bulan:</span>
                {unpaidMonths.map((m) => (
                  <span
                    key={m.id}
                    className="px-1.5 py-0.2 bg-amber-100 text-amber-800 font-mono font-bold text-[9px] rounded border border-amber-200/50"
                  >
                    {formatMonthId(m.id)}
                  </span>
                ))}
              </div>
            </div>

            {/* 2. PILIHAN METODE PEMBAYARAN CEPAT */}
            <div className="space-y-1.5 border-t border-slate-100 pt-3.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Pilih Metode Bayar:
              </span>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handlePilihBulanBerjalan}
                  className={`py-2 px-1.5 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                    pilihanMode === "BERJALAN"
                      ? "bg-blue-600 text-white border-blue-600 shadow-3xs"
                      : "bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100"
                  }`}
                >
                  <span>Bulan Berjalan</span>
                  <span className="font-mono text-[8.5px] font-medium opacity-80">({formatMonthId(CURRENT_MONTH_ID)})</span>
                </button>

                <button
                  type="button"
                  onClick={handlePilihSemuaTunggakan}
                  className={`py-2 px-1.5 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                    pilihanMode === "SEMUA_TUNGGAKAN"
                      ? "bg-blue-600 text-white border-blue-600 shadow-3xs"
                      : "bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100"
                  }`}
                >
                  <span>Semua Tunggakan</span>
                  <span className="font-mono text-[8.5px] font-medium opacity-80">({unpaidMonths.length} Bln)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPilihanMode("MANUAL")}
                  className={`py-2 px-1.5 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                    pilihanMode === "MANUAL"
                      ? "bg-blue-600 text-white border-blue-600 shadow-3xs"
                      : "bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100"
                  }`}
                >
                  <span>Pilih Manual</span>
                  <span className="font-mono text-[8.5px] font-medium opacity-80">Atur Sendiri</span>
                </button>
              </div>

              {/* Jika memilih manual, tampilkan daftar bulan lengkap */}
              {pilihanMode === "MANUAL" && (
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                    Centang bulan iuran yang akan dibayar:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {LIST_BULAN_2026.map((bulan) => {
                      const isBulanLunas = warga.historyPembayaran.includes(bulan.id);
                      const isCentang = selectedMonths.includes(bulan.id);

                      return (
                        <button
                          key={bulan.id}
                          type="button"
                          onClick={() => handleToggleMonthManual(bulan.id)}
                          className={`p-1.5 rounded-lg border text-center relative transition-all cursor-pointer text-xs h-8 flex items-center justify-center font-bold active:scale-95 ${
                            isBulanLunas
                              ? "bg-slate-100 border-slate-200/80 text-slate-400 hover:border-amber-400 hover:bg-amber-50/60"
                              : isCentang
                              ? "bg-blue-50 border-blue-500 text-blue-700 shadow-3xs"
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <span className="font-mono text-[9.5px]">{formatMonthId(bulan.id)}</span>
                          {isBulanLunas && (
                            <span className="absolute top-0 right-0 text-[6.5px] bg-slate-200 text-slate-600 px-0.8 rounded-bl font-semibold">
                              Lunas
                            </span>
                          )}
                          {isCentang && !isBulanLunas && (
                            <div className="absolute top-0 right-0 w-2 h-2 bg-blue-600 rounded-full flex items-center justify-center">
                              <div className="w-0.8 h-0.8 bg-white rounded-full" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. NOMINAL SETORAN */}
            <div className="space-y-1.5 border-t border-slate-100 pt-3.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Nominal Setoran ({selectedMonths.length} Bulan):
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingNominal(!isEditingNominal)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer font-sans"
                >
                  <Edit2 className="w-3 h-3" />
                  {isEditingNominal ? "Simpan" : "Ubah Nominal"}
                </button>
              </div>

              {isEditingNominal ? (
                <div className="space-y-1">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-xs">Rp</span>
                    <input
                      type="number"
                      value={customNominal || ""}
                      onChange={(e) => setCustomNominal(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-blue-500 rounded-xl font-mono text-sm font-black text-blue-800 outline-none h-10"
                      placeholder="0"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[8.5px] text-slate-400 font-bold uppercase">Tarif Standar</span>
                    <span className="text-[9px] font-mono font-semibold text-slate-500">
                      {formatRupiah(tarifDasar)} x {selectedMonths.length} bulan
                    </span>
                  </div>
                  <span className="text-sm font-black font-mono text-slate-800">
                    {formatRupiah(customNominal)}
                  </span>
                </div>
              )}
            </div>

            {/* 4. CATATAN PEMBAYARAN */}
            <div className="space-y-1.5 border-t border-slate-100 pt-3.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Catatan Pembayaran (Opsional):
              </label>
              <input
                type="text"
                placeholder="Masukkan catatan jika ada..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200/60 rounded-xl outline-none focus:border-blue-500 focus:bg-white font-semibold transition-all h-10"
              />
            </div>

            {/* 5. RINGKASAN SUBMIT */}
            <div className="border-t border-slate-100 pt-3.5 flex justify-between items-center">
              <div className="flex flex-col text-left">
                <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-widest">TOTAL SETORAN</span>
                <span className="text-[9.5px] font-bold font-mono text-slate-600 mt-0.5 max-w-[150px] truncate">
                  {selectedMonths.map(formatMonthId).join(", ") || "Belum dipilih"}
                </span>
              </div>
              <span className="text-base font-black font-mono text-blue-600">
                {formatRupiah(customNominal)}
              </span>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
            >
              BATAL
            </button>
            <button
              type="button"
              onClick={handleProsesKonfirmasi}
              disabled={selectedMonths.length === 0 || isSubmitting}
              className={`py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border shadow-sm active:scale-95 ${
                selectedMonths.length === 0 || isSubmitting
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none"
                  : "bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
              }`}
              id="btn-confirm-payment-kasus-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>MEMPROSES...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>KONFIRMASI BAYAR</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODAL PERINGATAN DOUBLE PEMBAYARAN */}
      {warningModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-amber-200 space-y-4 relative overflow-hidden">
            {/* Tombol Tutup X */}
            <button
              type="button"
              onClick={() => setWarningModal(null)}
              className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Icon Amber */}
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-3xs">
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div className="text-center space-y-1.5">
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                Peringatan Double Pembayaran
              </span>
              <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                Bulan {formatMonthId(warningModal.targetMonth)} Sudah Lunas!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                Warga <strong className="text-slate-800">{warga.namaKepalaKeluarga}</strong> telah melunasi iuran untuk bulan{" "}
                <strong className="text-amber-700 font-mono">{formatMonthId(warningModal.targetMonth)}</strong>.
              </p>
            </div>

            {warningModal.nextMonth ? (
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 text-center space-y-2">
                <p className="text-[11px] text-blue-900 font-medium leading-tight">
                  Apakah Anda ingin mengalihkan pembayaran ke bulan berikutnya yang belum dibayar?
                </p>
                <div className="inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-blue-200 text-blue-800 text-xs font-bold font-mono shadow-2xs">
                  <span className="line-through text-slate-400">{formatMonthId(warningModal.targetMonth)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-emerald-700 font-extrabold">{formatMonthId(warningModal.nextMonth)}</span>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-center">
                <p className="text-xs text-emerald-800 font-bold">
                  🎉 Seluruh iuran warga di tahun 2026 telah lunas sepenuhnya!
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              {warningModal.nextMonth && (
                <button
                  type="button"
                  onClick={() => handleApplyRedirectMonth(warningModal.targetMonth, warningModal.nextMonth!)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  Ya, Alihkan ke {formatMonthId(warningModal.nextMonth)}
                </button>
              )}
              <button
                type="button"
                onClick={() => setWarningModal(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {warningModal.nextMonth ? "Batal" : "Tutup"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
