import React from "react";
import {
  QrCode,
  Search,
  Users,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Upload,
  Settings,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight
} from "lucide-react";
import { Warga, Transaksi, KategoriIuran } from "../types";

interface PcDashboardViewProps {
  currentUser: { username: string; role: string } | null;
  wargaList: Warga[];
  transactions: Transaksi[];
  totalTransaksiHariIni: number;
  totalUangDiterimaHariIni: number;
  formatRupiah: (num: number) => string;
  onNavigate: (screen: any) => void;
  onOpenMatrix: () => void;
  onOpenPendapatan: () => void;
  onOpenModal: (modal: any) => void;
  onSelectTransaction: (tx: Transaksi) => void;
  currentMonthId: string;
}

export const PcDashboardView: React.FC<PcDashboardViewProps> = ({
  currentUser,
  wargaList,
  transactions,
  totalTransaksiHariIni,
  totalUangDiterimaHariIni,
  formatRupiah,
  onNavigate,
  onOpenMatrix,
  onOpenPendapatan,
  onOpenModal,
  onSelectTransaction,
  currentMonthId
}) => {
  // Hitung statistik warga
  const totalWarga = wargaList.length;
  const wargaBiasa = wargaList.filter((w) => w.kategoriIuran === "Warga Biasa").length;
  const wargaUsaha = wargaList.filter((w) => w.kategoriIuran === "Warga Usaha").length;
  const wargaLuar = wargaList.filter((w) => w.kategoriIuran === "Warga Luar").length;

  // Hitung lunas bulan ini
  const lunasBulanIniCount = wargaList.filter((w) =>
    w.historyPembayaran.includes(currentMonthId)
  ).length;
  const belumLunasCount = Math.max(0, totalWarga - lunasBulanIniCount);
  const percentLunas = totalWarga > 0 ? Math.round((lunasBulanIniCount / totalWarga) * 100) : 0;

  // Hitung total estimasi kas terbayar bulan ini
  const totalKasBulanIni = transactions
    .filter((t) => t.bulanBayar.includes(currentMonthId))
    .reduce((sum, t) => sum + t.totalBayar, 0);

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/70">
      {/* Top Banner & Quick Stat Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Main Stats & Core Actions) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Welcome Bar */}
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md relative overflow-hidden flex items-center justify-between">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
            <div className="relative z-10 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-md text-blue-100">
                  {currentUser?.username === "admin" ? "AKUN ADMINISTRATOR" : "AKUN KOLEKTOR SESI"}
                </span>
                <span className="text-xs text-blue-100/90 font-medium">
                  • {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              <h2 className="text-xl font-black text-white capitalize tracking-wide">
                Selamat Datang, {currentUser?.username || "Petugas"}!
              </h2>
              <p className="text-xs text-blue-100/90 font-medium max-w-xl">
                Pantau real-time setoran iuran warga RT 05 RW 02, lakukan pencatatan transaksi cepat, atau cetak laporan dalam sekali klik.
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-3 relative z-10 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20">
              <div className="text-right">
                <span className="text-[9px] font-black uppercase tracking-wider text-blue-100 block">SETORAN HARI INI</span>
                <span className="text-lg font-black font-mono text-white block">{formatRupiah(totalUangDiterimaHariIni)}</span>
                <span className="text-[10px] text-blue-200 font-semibold block">{totalTransaksiHariIni} transaksi masuk</span>
              </div>
            </div>
          </div>

          {/* 3 Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Metric 1: Total Warga */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">TOTAL WARGA TERDAFTAR</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 font-mono">{totalWarga}</span>
                <span className="text-xs text-slate-500 font-semibold">KK / Rumah</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">{wargaBiasa} Biasa</span>
                <span className="px-1.5 py-0.5 bg-amber-50 rounded text-amber-700">{wargaUsaha} Usaha</span>
                <span className="px-1.5 py-0.5 bg-purple-50 rounded text-purple-700">{wargaLuar} Luar</span>
              </div>
            </div>

            {/* Metric 2: Estimated Month Income */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">KAS TERKUMPUL BULAN INI</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-black text-emerald-700 font-mono block truncate">
                  {formatRupiah(totalKasBulanIni)}
                </span>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentLunas}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 pt-1">
                <span>Pencapaian: {percentLunas}%</span>
                <span className="text-emerald-700">{lunasBulanIniCount} Lunas</span>
              </div>
            </div>

            {/* Metric 3: Lunas vs Belum Lunas */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">STATUS LUNAS RT ({currentMonthId})</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-emerald-50/80 p-2 rounded-xl border border-emerald-100">
                  <span className="text-[9px] font-extrabold text-emerald-800 uppercase block">Lunas</span>
                  <span className="text-base font-black text-emerald-900 font-mono">{lunasBulanIniCount}</span>
                </div>
                <div className="bg-amber-50/80 p-2 rounded-xl border border-amber-100">
                  <span className="text-[9px] font-extrabold text-amber-800 uppercase block">Belum</span>
                  <span className="text-base font-black text-amber-900 font-mono">{belumLunasCount}</span>
                </div>
              </div>
              <button
                onClick={onOpenMatrix}
                className="w-full text-center text-[10px] font-extrabold text-blue-600 hover:text-blue-800 pt-1 flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Lihat Matriks Laporan</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* 4 Core Quick Access Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Akses Cepat Pengelolaan Iuran</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Core Action 1: QR Scan */}
              <div
                onClick={() => onNavigate("SCAN")}
                className="bg-white hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-2xl p-5 cursor-pointer transition-all shadow-2xs hover:shadow-md group flex items-start justify-between"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-blue-600 group-hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 transition-colors">
                    <QrCode className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                      Pindai QR Kartu Warga
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Gunakan kamera PC atau simulator untuk memindai kartu QR warga dan catat setoran secara instan.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0 mt-2" />
              </div>

              {/* Core Action 2: Manual Payment */}
              <div
                onClick={() => onNavigate("MANUAL")}
                className="bg-white hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-2xl p-5 cursor-pointer transition-all shadow-2xs hover:shadow-md group flex items-start justify-between"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-emerald-600 group-hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-600/20 transition-colors">
                    <Search className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                      Cari & Bayar Manual
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Cari warga berdasarkan nama, nomor rumah, atau KK untuk melakukan pencatatan pembayaran manual.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0 mt-2" />
              </div>

              {/* Core Action 3: Manage Warga Directory */}
              <div
                onClick={() => onNavigate("MANAGE")}
                className="bg-white hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-2xl p-5 cursor-pointer transition-all shadow-2xs hover:shadow-md group flex items-start justify-between"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-indigo-600 group-hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/20 transition-colors">
                    <Users className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                      Kelola Data Warga
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Direktori lengkap warga RT 05 RW 02. Tambah warga baru, edit profil, hapus, dan cetak Kartu QR.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all shrink-0 mt-2" />
              </div>

              {/* Core Action 4: Reports & Matrix */}
              <div
                onClick={onOpenMatrix}
                className="bg-white hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-2xl p-5 cursor-pointer transition-all shadow-2xs hover:shadow-md group flex items-start justify-between"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-amber-600 group-hover:bg-amber-700 text-white rounded-xl flex items-center justify-center shadow-md shadow-amber-600/20 transition-colors">
                    <BarChart3 className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-amber-700 transition-colors">
                      Laporan & Matriks Iuran
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Lihat matriks rekapitulasi status iuran bulanan per warga dan ekspor ke Excel/PDF.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all shrink-0 mt-2" />
              </div>
            </div>
          </div>

          {/* Data Tools Bar (Export, Import, Settings) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-black text-slate-800 uppercase block leading-none">
                  Pengolahan & Ekspor Data Excel
                </span>
                <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                  Unduh atau impor seluruh database warga dan transaksi iuran.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenModal("EXPORT")}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>

              <button
                onClick={() => onOpenModal("IMPORT")}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs rounded-xl border border-blue-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>Import Excel</span>
              </button>

              <button
                onClick={() => onOpenModal("PENGATURAN")}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Settings className="w-4 h-4" />
                <span>Pengaturan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (Live Transactions Stream Panel on PC) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs p-5 flex flex-col h-[760px]">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Riwayat Setoran Terbaru</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                Total {transactions.length} transaksi tercatat
              </span>
            </div>
            <button
              onClick={onOpenPendapatan}
              className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              Lihat Kas →
            </button>
          </div>

          {/* Stream List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
            {transactions.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-600">Belum ada transaksi setoran</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Gunakan Pindai QR atau Bayar Manual untuk mencatat setoran warga.
                </p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  className="bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-200 p-3 rounded-xl cursor-pointer transition-all space-y-1.5 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                      {tx.wargaNama}
                    </span>
                    <span className="text-xs font-black font-mono text-emerald-700">
                      {formatRupiah(tx.totalBayar)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <span>No. Rumah: {tx.wargaNomorRumah}</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[9.5px]">
                      {tx.bulanBayar.join(", ")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>{new Date(tx.tanggal).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
                    <span className="text-blue-600 font-bold group-hover:underline flex items-center gap-0.5">
                      <Printer className="w-3 h-3" />
                      <span>Cetak Struk</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400 font-semibold shrink-0">
            Klik transaksi di atas untuk membuka kuitansi digital.
          </div>
        </div>
      </div>
    </div>
  );
};
