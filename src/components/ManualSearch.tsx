/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Search, User, Home, QrCode, ArrowRight, AlertCircle, Check } from "lucide-react";
import { DbService } from "../services/db";
import { Warga } from "../types";

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

interface ManualSearchProps {
  onSelectWarga: (warga: Warga) => void;
  onBackToQR: () => void;
  query: string;
}

export default function ManualSearch({ onSelectWarga, onBackToQR, query }: ManualSearchProps) {
  const [results, setResults] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="flex flex-col space-y-3.5 w-full px-4 pt-3.5" id="manual-search-panel">
      {/* Hasil Realtime */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Hasil Pencarian ({results.length})
          </span>
        </div>

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
              // Menghitung jumlah bulan belum dibayar di 2026 s.d Juli (7 bulan: Jan-Juli)
              const unpaidMonths = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"]
                .filter((b) => !warga.historyPembayaran.includes(b));
              const isLunas = unpaidMonths.length === 0;

              return (
                <button
                  key={warga.id}
                  onClick={() => onSelectWarga(warga)}
                  className="w-full text-left bg-white border border-[0.5px] border-slate-200/60 hover:border-blue-300 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs transition-all cursor-pointer active:scale-[0.99]"
                >
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
                    <div className="mt-1.5 flex items-center">
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
                    </div>
                  </div>

                  <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-[0.5px] border-blue-100">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
