/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, Home, Calendar, ShieldCheck, ArrowLeft, Send, Sparkles, Check, Edit2, Info, RefreshCw, QrCode } from "lucide-react";
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

  // Hitung nilai awal total iuran berdasarkan bulan yang dipilih
  const tarifDasar = warga.tarifPerBulan;

  useEffect(() => {
    // Inisialisasi awal pilihan bulan
    if (isLunas) {
      // Jika lunas, berarti bayar untuk bulan berjalan selanjutnya
      setSelectedMonths([CURRENT_MONTH_ID]);
      setPilihanMode("BERJALAN");
    } else {
      // Jika ada tunggakan, default tawarkan "Bayar semua tunggakan"
      const unpaidIds = unpaidMonths.map((m) => m.id);
      setSelectedMonths(unpaidIds);
      setPilihanMode("SEMUA_TUNGGAKAN");
    }
  }, [warga, isLunas]);

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
    setSelectedMonths((prev) => {
      if (prev.includes(monthId)) {
        return prev.filter((m) => m !== monthId).sort();
      } else {
        return [...prev, monthId].sort();
      }
    });
  };

  const handleProsesKonfirmasi = () => {
    if (selectedMonths.length === 0) return;
    onSubmitPayment(selectedMonths, customNominal, catatan);
  };

  return (
    <div className="flex flex-col space-y-3 w-full" id="warga-details-container">
      {/* HEADER CARD WARGA */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs relative overflow-hidden">
        <button
          onClick={onBack}
          className="absolute top-3 left-3 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 transition-colors cursor-pointer"
          title="Kembali"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center pt-1.5 pb-0.5 text-center">
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 mb-2">
            <User className="w-5.5 h-5.5 stroke-[2.5]" />
          </div>
          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded">
            ID: {warga.id}
          </span>
          <h3 className="font-extrabold text-sm text-slate-800 leading-tight tracking-tight mt-1">
            {warga.namaKepalaKeluarga}
          </h3>

          <div className="flex flex-col items-center gap-0.5 mt-1.5 text-[11px] text-slate-500 font-semibold">
            <div className="flex items-center gap-1">
              <Home className="w-3 h-3 text-blue-500" />
              <span>No. Rumah: <strong className="text-slate-800 font-extrabold">{warga.nomorRumah}</strong></span>
              <span>•</span>
              <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-black text-[9px]">
                {warga.kategoriIuran}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400 font-mono">
              <QrCode className="w-3 h-3 text-slate-400" />
              <span>No. KK: <strong className="text-slate-600 font-bold">{warga.nomorKk}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* DETEKSI KASUS 1: JIKA TIDAK MEMILIKI TUNGGAKAN */}
      {isLunas ? (
        <div className="space-y-3">
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 text-center space-y-3">
            <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-4.5 h-4.5 stroke-[3]" />
            </div>
            <div>
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">Status Warga</span>
              <h4 className="text-sm font-black text-emerald-950 mt-0.5">Tidak Ada Tunggakan</h4>
              <p className="text-[11px] text-emerald-600 mt-0.5 px-2 leading-relaxed font-medium">
                Warga ini telah melunasi seluruh iuran wajib bulanan s.d bulan berjalan ({formatMonthId(CURRENT_MONTH_ID)}).
              </p>
            </div>

            {/* Rincian Ringkas Kasus 1 */}
            <div className="bg-white rounded-lg p-3 text-left border border-emerald-100 space-y-1.5 text-xs shadow-2xs">
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>Nama Pembayar</span>
                <span className="font-bold text-slate-800">{warga.namaKepalaKeluarga}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>Nomor KK</span>
                <span className="font-bold text-slate-800 font-mono">{warga.nomorKk}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>Kategori Iuran</span>
                <span className="font-bold text-slate-800">{warga.kategoriIuran}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>Bulan Berjalan</span>
                <span className="font-mono font-bold text-slate-800">{formatMonthId(CURRENT_MONTH_ID)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 text-xs font-extrabold text-slate-800">
                <span>Nominal Tagihan</span>
                <span className="font-mono text-blue-700">{formatRupiah(warga.tarifPerBulan)}</span>
              </div>
            </div>
          </div>

          {/* Opsi Catatan Tambahan */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-2xs">
            <label className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider">
              Catatan Pembayaran (Opsional):
            </label>
            <input
              type="text"
              placeholder="Masukkan catatan jika ada..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-semibold"
            />
          </div>

          {/* Tombol Aksi Kasus 1 (BATAL / KONFIRMASI) */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={onBack}
              disabled={isSubmitting}
              className="py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer active:scale-95"
            >
              BATAL
            </button>
            <button
              onClick={handleProsesKonfirmasi}
              disabled={isSubmitting}
              className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl border border-emerald-500 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              {isSubmitting ? "MEMPROSES..." : "KONFIRMASI BAYAR"}
            </button>
          </div>
        </div>
      ) : (
        /* DETEKSI KASUS 2: JIKA MEMILIKI TUNGGAKAN */
        <div className="space-y-3">
          <div className="bg-amber-50/45 border border-amber-200/60 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-500 text-white text-[8.5px] font-black uppercase rounded-full tracking-wider animate-pulse">
                PERINGATAN
              </span>
              <span className="text-[11px] font-bold text-amber-800">
                Memiliki Tunggakan {unpaidMonths.length} Bulan
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-amber-200/40">
                <span className="text-[9.5px] font-bold text-slate-400 block">Tarif per Bulan:</span>
                <span className="font-mono text-xs font-black text-slate-800">{formatRupiah(warga.tarifPerBulan)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-amber-200/40">
                <span className="text-[9.5px] font-bold text-slate-400 block">Total Tunggakan:</span>
                <span className="font-mono text-xs font-black text-amber-700">{formatRupiah(warga.tarifPerBulan * unpaidMonths.length)}</span>
              </div>
            </div>

            {/* List daftar bulan yang menunggak */}
            <div>
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Bulan belum dibayar (s.d {formatMonthId(CURRENT_MONTH_ID)}):
              </span>
              <div className="flex flex-wrap gap-1">
                {unpaidMonths.map((m) => (
                  <span
                    key={m.id}
                    className="px-2 py-0.5 bg-amber-100 text-amber-800 font-mono font-black text-[9.5px] rounded border border-amber-200"
                  >
                    {formatMonthId(m.id)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* PILIHAN METODE PEMBAYARAN CEPAT - Sesuai Aturan Kasus 2 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-2xs">
            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">
              Kombinasi Pembayaran Cepat:
            </span>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handlePilihBulanBerjalan}
                className={`py-2 px-1.5 rounded-lg text-[9.5px] font-black uppercase transition-colors cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                  pilihanMode === "BERJALAN"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>Bulan Berjalan</span>
                <span className="font-mono text-[8.5px] font-medium opacity-80">({formatMonthId(CURRENT_MONTH_ID)})</span>
              </button>

              <button
                type="button"
                onClick={handlePilihSemuaTunggakan}
                className={`py-2 px-1.5 rounded-lg text-[9.5px] font-black uppercase transition-colors cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                  pilihanMode === "SEMUA_TUNGGAKAN"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>Semua Tunggakan</span>
                <span className="font-mono text-[8.5px] font-medium opacity-80">({unpaidMonths.length} Bulan)</span>
              </button>

              <button
                type="button"
                onClick={() => setPilihanMode("MANUAL")}
                className={`py-2 px-1.5 rounded-lg text-[9.5px] font-black uppercase transition-colors cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                  pilihanMode === "MANUAL"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>Pilih Manual</span>
                <span className="font-mono text-[8.5px] font-medium opacity-80">Pilih Bulan</span>
              </button>
            </div>

            {/* Jika memilih manual, tampilkan daftar bulan lengkap */}
            {pilihanMode === "MANUAL" && (
              <div className="pt-2 border-t border-slate-100 mt-1.5">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                  Centang bulan iuran yang akan dibayar:
                </span>
                <div className="grid grid-cols-3 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {LIST_BULAN_2026.map((bulan) => {
                    const isBulanLunas = warga.historyPembayaran.includes(bulan.id);
                    const isCentang = selectedMonths.includes(bulan.id);

                    return (
                      <button
                        key={bulan.id}
                        type="button"
                        disabled={isBulanLunas}
                        onClick={() => handleToggleMonthManual(bulan.id)}
                        className={`p-1.5 rounded-md border text-center relative transition-all cursor-pointer text-xs h-8 flex items-center justify-center font-bold ${
                          isBulanLunas
                            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                            : isCentang
                            ? "bg-blue-50 border-blue-500 text-blue-700 shadow-2xs"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className="font-mono text-[9.5px]">{formatMonthId(bulan.id)}</span>
                        {isBulanLunas && (
                          <span className="absolute top-0 right-0 text-[6.5px] bg-slate-200 text-slate-500 px-0.8 rounded-bl">
                            L
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

          {/* DITAMPILKAN KASUS 2: NOMINAL DAPAT DIUBAH APABILA DIPERLUKAN */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block">
                Nominal Setoran ({selectedMonths.length} Bulan):
              </span>
              <button
                type="button"
                onClick={() => setIsEditingNominal(!isEditingNominal)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                {isEditingNominal ? "Simpan" : "Ubah Nominal"}
              </button>
            </div>

            {isEditingNominal ? (
              <div className="space-y-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">Rp</span>
                  <input
                    type="number"
                    value={customNominal || ""}
                    onChange={(e) => setCustomNominal(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-blue-500 rounded-lg font-mono text-base font-black text-blue-800 outline-none"
                    placeholder="0"
                  />
                </div>
                <p className="text-[9.5px] text-slate-400 flex items-center gap-1 font-medium">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  Anda dapat memodifikasi total nominal iuran yang diterima secara manual.
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[9.5px] text-slate-400 font-bold uppercase">Tarif Standar</span>
                  <span className="text-[10px] font-mono font-medium text-slate-500">
                    {formatRupiah(tarifDasar)} x {selectedMonths.length} bulan
                  </span>
                </div>
                <span className="text-base font-black font-mono text-slate-800">
                  {formatRupiah(customNominal)}
                </span>
              </div>
            )}
          </div>

          {/* Opsi Catatan Tambahan */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-2xs">
            <label className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider">
              Catatan Pembayaran (Opsional):
            </label>
            <input
              type="text"
              placeholder="Masukkan catatan jika ada..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-semibold"
            />
          </div>

          {/* RINGKASAN SUBMIT KASUS 2 */}
          <div className="border-t border-slate-200 pt-2.5">
            <div className="bg-white border border-slate-200 text-slate-800 rounded-xl p-3.5 flex justify-between items-center mb-2.5 shadow-2xs">
              <div className="flex flex-col">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">TOTAL SETORAN</span>
                <span className="text-xs font-bold font-mono mt-0.5 max-w-[150px] truncate text-slate-700">
                  {selectedMonths.map(formatMonthId).join(", ") || "Belum dipilih"}
                </span>
              </div>
              <span className="text-base font-black font-mono text-blue-600">
                {formatRupiah(customNominal)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-1">
              <button
                type="button"
                onClick={onBack}
                disabled={isSubmitting}
                className="py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer active:scale-95"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={handleProsesKonfirmasi}
                disabled={selectedMonths.length === 0 || isSubmitting}
                className={`py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border shadow-sm ${
                  selectedMonths.length === 0 || isSubmitting
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none"
                    : "bg-blue-600 hover:bg-blue-700 text-white border-blue-500 active:scale-[0.98]"
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
                    <Send className="w-4 h-4" />
                    <span>KONFIRMASI BAYAR</span>
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
