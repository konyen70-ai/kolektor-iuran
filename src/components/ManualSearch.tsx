/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Search, User, Home, QrCode, ArrowRight, AlertCircle, Check } from "lucide-react";
import { DbService } from "../services/db";
import { Warga } from "../types";

interface ManualSearchProps {
  initialSearchType?: "SEMUA" | "NAMA" | "NOMOR_RUMAH" | "ID";
  onSelectWarga: (warga: Warga) => void;
  onBackToQR: () => void;
}

type FilterType = "SEMUA" | "NAMA" | "NOMOR_RUMAH" | "ID";

export default function ManualSearch({ initialSearchType = "SEMUA", onSelectWarga, onBackToQR }: ManualSearchProps) {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>(initialSearchType);
  const [results, setResults] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If the search mode changed from parent, update internal state
    if (initialSearchType !== "SEMUA") {
      setFilterType(initialSearchType);
    }
  }, [initialSearchType]);

  useEffect(() => {
    let active = true;
    const performSearch = async () => {
      setLoading(true);
      const searchResults = await DbService.searchWarga(query, filterType);
      if (active) {
        setResults(searchResults);
        setLoading(false);
      }
    };
    performSearch();
    return () => {
      active = false;
    };
  }, [query, filterType]);

  const getPlaceholderText = () => {
    if (filterType === "NAMA") return "Ketik nama kepala keluarga...";
    if (filterType === "NOMOR_RUMAH") return "Ketik nomor rumah...";
    if (filterType === "ID") return "Ketik No. KK atau ID Warga...";
    return "Cari nama, rumah, atau No. KK...";
  };

  return (
    <div className="flex flex-col space-y-5 w-full" id="manual-search-panel">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-base font-extrabold text-slate-800">Pencarian Realtime Warga</h3>
        <p className="text-xs text-slate-500 mt-1">
          Ketuk kriteria pencarian untuk mempermudah penemuan data secara cepat.
        </p>
      </div>

      {/* Tipe Filter Pemilih - Touch Target Besar (Rule 4: Seluruh tombol harus besar & mudah ditekan) */}
      <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
        {(["SEMUA", "NAMA", "NOMOR_RUMAH", "ID"] as FilterType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilterType(type)}
            className={`py-2 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer ${
              filterType === type
                ? "bg-white text-blue-700 shadow-sm border border-slate-200/50"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {type === "SEMUA" ? "Semua" : type === "NAMA" ? "Nama" : type === "NOMOR_RUMAH" ? "Rumah" : "No. KK"}
          </button>
        ))}
      </div>

      {/* Input Pencarian */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder={getPlaceholderText()}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold h-12 shadow-xs"
        />
      </div>

      {/* Hasil Realtime */}
      <div className="flex-1 flex flex-col min-h-[300px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            Hasil Pencarian ({results.length})
          </span>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs font-semibold text-slate-500">Mencari data...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 border border-dashed border-slate-200 rounded-[24px] bg-white text-center">
            <AlertCircle className="w-10 h-10 text-slate-300 mb-2" />
            <h5 className="text-sm font-bold text-slate-700">Warga Tidak Ditemukan</h5>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Tidak ada warga yang cocok dengan kata kunci atau filter pencarian ini.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {results.map((warga) => {
              // Menghitung jumlah bulan belum dibayar di 2026 s.d Juli (7 bulan: Jan-Juli)
              const unpaidMonths = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"]
                .filter((b) => !warga.historyPembayaran.includes(b));
              const isLunas = unpaidMonths.length === 0;

              return (
                <button
                  key={warga.id}
                  onClick={() => onSelectWarga(warga)}
                  className="w-full text-left bg-white border border-slate-200/80 hover:border-blue-300 rounded-[22px] p-4 flex items-center justify-between gap-3 shadow-xs hover:shadow-xs transition-all cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-extrabold text-slate-800 text-sm truncate max-w-[180px]">
                        {warga.namaKepalaKeluarga}
                      </h4>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[9px] font-mono font-bold text-slate-500">
                        {warga.id}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 mt-1.5 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Rumah No. <strong className="text-slate-700 font-semibold">{warga.nomorRumah}</strong></span>
                        <span>•</span>
                        <span className="bg-slate-100 text-slate-700 font-extrabold px-1.5 py-0.5 rounded text-[10px]">
                          {warga.kategoriIuran}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        No. KK: <span className="font-bold text-slate-600">{warga.nomorKk}</span>
                      </div>
                    </div>

                    {/* Tag Status Tunggakan Oranye / Lunas Hijau */}
                    <div className="mt-2.5 flex items-center">
                      {isLunas ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-100">
                          <Check className="w-3 h-3 text-emerald-500" />
                          Lunas S.d Juli 2026
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-extrabold border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Tunggakan: {unpaidMonths.length} Bulan
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tombol kembali */}
      <button
        onClick={onBackToQR}
        className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
      >
        <QrCode className="w-4 h-4 text-slate-600" />
        Kembali ke Scan QR
      </button>
    </div>
  );
}
