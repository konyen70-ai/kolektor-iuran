import React from "react";
import {
  QrCode,
  Home,
  Users,
  Search,
  BarChart3,
  TrendingUp,
  UserPlus,
  Menu,
  Monitor,
  Smartphone,
  Sparkles,
  Wifi,
  WifiOff,
  LogOut
} from "lucide-react";

type ScreenType = "DASHBOARD" | "SCAN" | "MANUAL" | "MANAGE" | "PAYMENT" | "RECEIPT" | "EDIT_WARGA" | "ADD_WARGA";

interface PcHeaderProps {
  activeScreen: ScreenType;
  setActiveScreen: (screen: ScreenType) => void;
  wargaCount: number;
  currentUser: { username: string; role: string } | null;
  isOnline: boolean;
  viewMode: "AUTO" | "MOBILE" | "DESKTOP";
  onViewModeChange: (mode: "AUTO" | "MOBILE" | "DESKTOP") => void;
  onOpenMatrix: () => void;
  onOpenPendapatan: () => void;
  onOpenAddWarga: () => void;
  onOpenMenu: () => void;
}

export const PcHeader: React.FC<PcHeaderProps> = ({
  activeScreen,
  setActiveScreen,
  wargaCount,
  currentUser,
  isOnline,
  viewMode,
  onViewModeChange,
  onOpenMatrix,
  onOpenPendapatan,
  onOpenAddWarga,
  onOpenMenu
}) => {
  return (
    <header className="bg-white border-b border-slate-200/90 px-6 py-3.5 flex items-center justify-between shadow-2xs z-30 shrink-0">
      {/* Brand Logo & Location Title */}
      <div className="flex items-center gap-3">
        <div
          onClick={() => setActiveScreen("DASHBOARD")}
          className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-600/20 cursor-pointer hover:bg-blue-700 transition-all shrink-0"
        >
          <QrCode className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div onClick={() => setActiveScreen("DASHBOARD")} className="cursor-pointer">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black tracking-wider uppercase text-slate-900 leading-none">
              KOLEKTOR IURAN RT 05 RW 02
            </h1>
            <span className="bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase">
              TAPOS DEPOK
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 block mt-1">
            Sistem Digital Pengelolaan & Penagihan Iuran Mandiri • Total {wargaCount} Warga
          </span>
        </div>
      </div>

      {/* Main Navigation Tabs for PC */}
      <nav className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
        <button
          onClick={() => setActiveScreen("DASHBOARD")}
          className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeScreen === "DASHBOARD"
              ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Home className="w-4 h-4 text-blue-600" />
          <span>Beranda</span>
        </button>

        <button
          onClick={() => setActiveScreen("MANAGE")}
          className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeScreen === "MANAGE" || activeScreen === "ADD_WARGA" || activeScreen === "EDIT_WARGA"
              ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Users className="w-4 h-4 text-blue-600" />
          <span>Kelola Data Warga</span>
        </button>

        <button
          onClick={() => setActiveScreen("MANUAL")}
          className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeScreen === "MANUAL"
              ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Search className="w-4 h-4 text-blue-600" />
          <span>Bayar Manual</span>
        </button>

        <button
          onClick={() => setActiveScreen("SCAN")}
          className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeScreen === "SCAN"
              ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <QrCode className="w-4 h-4 text-blue-600" />
          <span>Pindai QR</span>
        </button>

        <button
          onClick={onOpenMatrix}
          className="px-3.5 py-2 rounded-lg font-bold text-xs text-slate-600 hover:text-blue-700 hover:bg-white transition-all cursor-pointer flex items-center gap-2"
        >
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span>Matriks Iuran</span>
        </button>

        <button
          onClick={onOpenPendapatan}
          className="px-3.5 py-2 rounded-lg font-bold text-xs text-slate-600 hover:text-emerald-700 hover:bg-white transition-all cursor-pointer flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Rekap Kas</span>
        </button>
      </nav>

      {/* Action Controls & Profile info */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenAddWarga}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm shadow-blue-600/20 transition-all cursor-pointer active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Tambah Warga</span>
        </button>

        <button
          onClick={onOpenMenu}
          className="p-2 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-all cursor-pointer"
          title="Buka Menu Navigasi Samping"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
