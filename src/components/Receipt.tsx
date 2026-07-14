/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Check, Share2, PlusCircle, ArrowRight, ShieldCheck, Sparkles, Home } from "lucide-react";
import { motion } from "motion/react";
import { Transaksi } from "../types";

interface ReceiptProps {
  transaction: Transaksi;
  onNewTransaction: () => void;
  onGoHome?: () => void;
}

export default function Receipt({ transaction, onNewTransaction, onGoHome }: ReceiptProps) {
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " • " + d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const handleShare = () => {
    const shareText = `*Kolektor Iuran RT 04*\n` +
      `---------------------------------\n` +
      `*BUKTI SETORAN KAS RESMI*\n` +
      `No. Kuitansi: ${transaction.id}\n` +
      `Nama Warga: ${transaction.wargaNama}\n` +
      `Alamat: Rumah No. ${transaction.wargaNomorRumah}\n` +
      `Bulan Dibayar: ${transaction.bulanBayar.join(", ")}\n` +
      `Tarif Kategori: ${formatRupiah(transaction.tarifDasar)}/bln\n` +
      `Total Setoran: *${formatRupiah(transaction.totalBayar)}*\n` +
      `Waktu: ${formatDate(transaction.tanggal)}\n` +
      `Metode: ${transaction.metode === "QR_CODE" ? "Scan QR Code" : "Pencarian Manual"}\n` +
      `Status: *LUNAS*\n` +
      `---------------------------------\n` +
      `Terima kasih telah berpartisipasi membayar iuran lingkungan RT 04 tepat waktu!`;

    if (navigator.share) {
      navigator.share({
        title: `Kuitansi Iuran ${transaction.wargaNama}`,
        text: shareText,
      }).catch((err) => {
        console.error("Error sharing:", err);
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Bukti pembayaran telah disalin ke clipboard! Siap dikirim ke WhatsApp warga.");
    }
  };

  return (
    <div className="flex flex-col space-y-5 w-full" id="receipt-screen-container">
      {/* Notifikasi Centang Sukses */}
      <div className="flex flex-col items-center justify-center pt-4">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20"
        >
          <Check className="w-7 h-7 stroke-[3.5]" />
        </motion.div>
        <h3 className="text-lg font-black text-slate-800 tracking-tight mt-4">Pencatatan Berhasil</h3>
        <p className="text-xs text-slate-500 mt-1">Data setoran iuran warga telah tersimpan di sistem.</p>
      </div>

      {/* Lembaran Kuitansi Minimalis */}
      <div className="bg-white border border-slate-200 rounded-[28px] p-5 shadow-xs relative overflow-hidden">
        {/* Jagged paper decorative line */}
        <div className="absolute top-0 inset-x-0 h-1 flex justify-around">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="w-3.5 h-3.5 bg-slate-50 border-b border-slate-200 rounded-full -translate-y-2 shrink-0" />
          ))}
        </div>

        {/* Header Kuitansi */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3 mt-2.5">
          <div>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">No. Transaksi</span>
            <span className="font-mono text-xs font-black text-slate-800">{transaction.id}</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100">
            <Sparkles className="w-3 h-3 text-emerald-500 fill-emerald-500" />
            LUNAS
          </span>
        </div>

        {/* Informasi Pembayar */}
        <div className="py-3.5 space-y-3 border-b border-slate-100 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Kepala Keluarga:</span>
            <span className="text-slate-800 font-extrabold">{transaction.wargaNama}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">No. Rumah:</span>
            <span className="text-slate-800 font-extrabold">No. {transaction.wargaNomorRumah}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Waktu Setor:</span>
            <span className="text-slate-800 font-bold">{formatDate(transaction.tanggal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Metode Verifikasi:</span>
            <span className="text-slate-800 font-bold">{transaction.metode === "QR_CODE" ? "Scan Kartu QR" : "Pencarian Manual"}</span>
          </div>
        </div>

        {/* Rincian Tarif & Bulan */}
        <div className="py-3.5 border-b border-dashed border-slate-200 text-xs space-y-3">
          <div className="flex justify-between text-slate-500">
            <span>Tarif Kategori ({transaction.tarifDasar === 100000 ? "Warga Usaha" : "Warga Biasa"}):</span>
            <span className="font-mono font-bold text-slate-800">{formatRupiah(transaction.tarifDasar)}/bln</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-slate-500">Bulan yang Dibayar:</span>
            <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
              {transaction.bulanBayar.map((b) => (
                <span key={b} className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-md font-mono font-black text-[9px] text-emerald-700">
                  {b}
                </span>
              ))}
            </div>
          </div>

          {transaction.catatan && (
            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] text-slate-600 italic">
              <strong>Catatan:</strong> "{transaction.catatan}"
            </div>
          )}
        </div>

        {/* Total Terbayar */}
        <div className="bg-blue-900 text-white rounded-2xl p-4 flex justify-between items-center mt-3 shadow-inner">
          <span className="text-xs font-black uppercase tracking-wider text-blue-300">Total Setoran</span>
          <span className="text-lg font-black font-mono text-emerald-400">{formatRupiah(transaction.totalBayar)}</span>
        </div>
      </div>

      {/* Tombol Bagikan & Selanjutnya */}
      <div className="flex flex-col gap-2.5 pt-2">
        <button
          onClick={handleShare}
          className="w-full py-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
          id="btn-share-receipt-screen"
        >
          <Share2 className="w-4 h-4 text-slate-600" />
          KIRIM KUITANSI KE WA WARGA
        </button>

        <button
          onClick={onNewTransaction}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl border-2 border-blue-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          id="btn-back-to-scan-receipt-screen"
        >
          <PlusCircle className="w-4 h-4" />
          LANJUT KELILING / SCAN BARU
        </button>

        {onGoHome && (
          <button
            onClick={onGoHome}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            id="btn-go-home-receipt-screen"
          >
            <Home className="w-4 h-4 text-slate-400 shrink-0" />
            SELESAI & KEMBALI KE BERANDA
          </button>
        )}
      </div>
    </div>
  );
}
