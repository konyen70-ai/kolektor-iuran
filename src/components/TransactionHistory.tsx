/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Clock, Search, RotateCcw, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { Transaksi } from "../types";

interface TransactionHistoryProps {
  transactions: Transaksi[];
  onSelectTransaction: (tx: Transaksi) => void;
  onResetDb: () => void;
}

export default function TransactionHistory({ transactions, onSelectTransaction, onResetDb }: TransactionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB";
  };

  const filtered = transactions.filter((tx) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      tx.wargaNama.toLowerCase().includes(q) ||
      tx.wargaId.toLowerCase().includes(q) ||
      tx.wargaNomorRumah.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col space-y-4 w-full" id="history-transactions-card">
      {/* Header Riwayat */}
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" />
            Riwayat Setoran Hari Ini
          </h4>
          <p className="text-[10px] text-slate-400">Daftar iuran warga yang masuk sesi ini (Terbaru di atas)</p>
        </div>

        {/* Tombol Reset Demo */}
        <button
          onClick={() => {
            if (confirm("Apakah Anda yakin ingin mereset data warga & riwayat transaksi kembali ke awal?")) {
              onResetDb();
            }
          }}
          className="text-[9px] font-black text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 transition-colors cursor-pointer"
        >
          RESET DATA
        </button>
      </div>

      {/* Input Pencarian Kecil */}
      {transactions.length > 0 && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Cari nama atau nomor rumah..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-8.5 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-bold h-9"
          />
        </div>
      )}

      {/* Daftar Transaksi */}
      {filtered.length === 0 ? (
        <div className="py-8 px-4 border border-dashed border-slate-200 rounded-2xl bg-white text-center text-slate-400">
          <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
          <p className="text-xs font-bold text-slate-700">Belum Ada Setoran Masuk</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {searchQuery ? "Pencarian tidak cocok" : "Lakukan scan QR kartu warga untuk memulai pencatatan iuran."}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {filtered.map((tx) => (
            <button
              key={tx.id}
              onClick={() => onSelectTransaction(tx)}
              className="w-full text-left bg-white border border-slate-200/80 hover:border-blue-300 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs transition-all cursor-pointer active:scale-[0.99]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-800 text-xs truncate">
                    {tx.wargaNama}
                  </span>
                  <span className="text-[8px] font-mono font-bold text-slate-400 bg-slate-50 px-1 py-0.2 rounded border border-slate-100">
                    {tx.wargaId}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-700">Rumah No. {tx.wargaNomorRumah}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-400">{formatTime(tx.tanggal)}</span>
                </div>

                {/* Tag Bulan */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {tx.bulanBayar.map((b) => (
                    <span
                      key={b}
                      className="px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-[9px] font-mono font-black text-blue-700"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sisi Kanan: Nominal, Metode, Status LUNAS */}
              <div className="text-right shrink-0 flex flex-col items-end">
                <span className="text-xs font-black font-mono text-slate-800">
                  {formatRupiah(tx.totalBayar)}
                </span>
                <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-wider mt-1 block">
                  {tx.metode === "QR_CODE" ? "QR Scan" : "Manual"} • LUNAS
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
