import React, { useState } from "react";
import {
  Users,
  Search,
  UserPlus,
  QrCode,
  Edit,
  Trash2,
  FileSpreadsheet,
  Upload,
  Table,
  Grid,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  Filter,
  X,
  CreditCard
} from "lucide-react";
import { Warga, KategoriIuran } from "../types";

interface PcWargaManageViewProps {
  wargaList: Warga[];
  wargaSearchQuery: string;
  setWargaSearchQuery: (query: string) => void;
  currentMonthId: string;
  formatRupiah: (num: number) => string;
  onOpenAddWarga: () => void;
  onOpenEditWarga: (warga: Warga) => void;
  onDeleteWarga: (id: string) => void;
  onSelectPayWarga: (warga: Warga) => void;
  onPrintQr: (warga: Warga) => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
}

export const PcWargaManageView: React.FC<PcWargaManageViewProps> = ({
  wargaList,
  wargaSearchQuery,
  setWargaSearchQuery,
  currentMonthId,
  formatRupiah,
  onOpenAddWarga,
  onOpenEditWarga,
  onDeleteWarga,
  onSelectPayWarga,
  onPrintQr,
  onOpenExport,
  onOpenImport
}) => {
  const [selectedKategori, setSelectedKategori] = useState<string>("SEMUA");
  const [viewFormat, setViewFormat] = useState<"TABLE" | "CARD">("TABLE");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter warga
  const filteredWarga = wargaList.filter((w) => {
    // Filter Kategori
    if (selectedKategori !== "SEMUA" && w.kategoriIuran !== selectedKategori) {
      return false;
    }
    // Filter Search
    if (!wargaSearchQuery.trim()) return true;
    const q = wargaSearchQuery.toLowerCase().trim();
    return (
      w.namaKepalaKeluarga.toLowerCase().includes(q) ||
      w.nomorRumah.toLowerCase().includes(q) ||
      w.nomorKk.toLowerCase().includes(q) ||
      w.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-slate-50/80">
      {/* Top Header & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>DIREKTORI DATA WARGA RT 05 RW 02</span>
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Kelola data warga, status tarif iuran, cetak Kartu QR, dan pantau status pembayaran bulanan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenExport}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={onOpenImport}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs rounded-xl border border-blue-200 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Import Excel</span>
            </button>

            <button
              onClick={onOpenAddWarga}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-sm shadow-blue-600/20 transition-all cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4.5 h-4.5" />
              <span>+ Tambah Warga Baru</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama warga, nomor rumah, atau nomor KK..."
              value={wargaSearchQuery}
              onChange={(e) => setWargaSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none transition-all text-slate-800 placeholder:text-slate-400"
            />
            {wargaSearchQuery && (
              <button
                onClick={() => setWargaSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {["SEMUA", "Warga Biasa", "Warga Usaha", "Warga Luar"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedKategori(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedKategori === cat
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Table vs Card View Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewFormat("TABLE")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
                viewFormat === "TABLE"
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Tampilan Tabel Data"
            >
              <Table className="w-4 h-4" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
            <button
              onClick={() => setViewFormat("CARD")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
                viewFormat === "CARD"
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Tampilan Kartu Grid"
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">Kartu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Data View */}
      {filteredWarga.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-3 stroke-[1.5]" />
          <h3 className="text-sm font-bold text-slate-700">Warga Tidak Ditemukan</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Tidak ada data warga yang sesuai dengan pencarian atau filter yang dipilih.
          </p>
        </div>
      ) : viewFormat === "TABLE" ? (
        /* TABLE VIEW FOR DESKTOP */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 text-[11px] font-black uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 w-12 text-center">NO</th>
                  <th className="py-3 px-4">NAMA KEPALA KELUARGA</th>
                  <th className="py-3 px-4">NO. KK</th>
                  <th className="py-3 px-4">NO. RUMAH</th>
                  <th className="py-3 px-4">KATEGORI IURAN</th>
                  <th className="py-3 px-4 text-right">TARIF / BULAN</th>
                  <th className="py-3 px-4 text-center">STATUS BULAN INI ({currentMonthId})</th>
                  <th className="py-3 px-4 text-center w-48">AKSI APLIKASI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800 font-semibold">
                {filteredWarga.map((w, index) => {
                  const isLunas = w.historyPembayaran.includes(currentMonthId);
                  return (
                    <tr key={w.id} className="hover:bg-blue-50/40 transition-colors group">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono">{index + 1}</td>
                      <td className="py-3 px-4 font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                        {w.namaKepalaKeluarga}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{w.nomorKk || "-"}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{w.nomorRumah || "-"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border ${
                            w.kategoriIuran === "Warga Biasa"
                              ? "bg-slate-100 text-slate-700 border-slate-200"
                              : w.kategoriIuran === "Warga Usaha"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-purple-50 text-purple-800 border-purple-200"
                          }`}
                        >
                          {w.kategoriIuran}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        {formatRupiah(w.tarifPerBulan)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isLunas ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-extrabold uppercase">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Lunas</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-extrabold uppercase">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Belum Bayar</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {deleteConfirmId === w.id ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                onDeleteWarga(w.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-1 bg-rose-600 text-white rounded text-[10px] font-black hover:bg-rose-700 cursor-pointer"
                            >
                              Hapus
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[10px] font-black hover:bg-slate-300 cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onSelectPayWarga(w)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-all cursor-pointer"
                              title="Bayar Iuran"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onPrintQr(w)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all cursor-pointer"
                              title="Cetak Kartu QR"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onOpenEditWarga(w)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 transition-all cursor-pointer"
                              title="Edit Data Warga"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(w.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition-all cursor-pointer"
                              title="Hapus Warga"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD GRID VIEW FOR DESKTOP */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredWarga.map((w) => {
            const isLunas = w.historyPembayaran.includes(currentMonthId);
            return (
              <div
                key={w.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">{w.namaKepalaKeluarga}</h3>
                      <span className="text-[10.5px] text-slate-500 font-semibold block mt-0.5">
                        No. Rumah: <strong className="text-slate-800">{w.nomorRumah || "-"}</strong> • KK: {w.nomorKk || "-"}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-md text-[9.5px] font-extrabold uppercase shrink-0 border ${
                        w.kategoriIuran === "Warga Biasa"
                          ? "bg-slate-100 text-slate-700 border-slate-200"
                          : w.kategoriIuran === "Warga Usaha"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-purple-50 text-purple-800 border-purple-200"
                      }`}
                    >
                      {w.kategoriIuran}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Tarif Bulanan</span>
                      <span className="text-sm font-black text-slate-900 font-mono">
                        {formatRupiah(w.tarifPerBulan)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Status Bulan Ini</span>
                      {isLunas ? (
                        <span className="text-xs font-black text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Lunas</span>
                        </span>
                      ) : (
                        <span className="text-xs font-black text-amber-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Belum Bayar</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => onSelectPayWarga(w)}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Bayar Iuran</span>
                  </button>

                  <button
                    onClick={() => onPrintQr(w)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-all cursor-pointer"
                    title="Cetak Kartu QR"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onOpenEditWarga(w)}
                    className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl border border-amber-200 transition-all cursor-pointer"
                    title="Edit Data Warga"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteWarga(w.id)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition-all cursor-pointer"
                    title="Hapus Warga"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
