import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Home,
  QrCode,
  Search,
  Users,
  Clock,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Upload,
  Settings,
  Smartphone,
  Download,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  FileText,
  UserCheck,
  Layers,
  Sparkles
} from "lucide-react";

type ScreenType = "DASHBOARD" | "SCAN" | "MANUAL" | "MANAGE" | "PAYMENT" | "RECEIPT" | "EDIT_WARGA" | "ADD_WARGA";
type ModalType = "NONE" | "LAPORAN" | "EXPORT" | "IMPORT" | "PENGATURAN" | "PWA_GUIDE";

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { username: string; role: string } | null;
  isOnline: boolean;
  onNavigate: (screen: ScreenType) => void;
  onOpenHistoryTray: () => void;
  onOpenMatrixModal: () => void;
  onOpenPendapatanModal: () => void;
  onOpenModal: (modal: ModalType) => void;
  onLogout: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  isOnline,
  onNavigate,
  onOpenHistoryTray,
  onOpenMatrixModal,
  onOpenPendapatanModal,
  onOpenModal,
  onLogout,
}) => {
  // State untuk expand/collapse sub-menu overlay (default collapsed)
  const [openSubMenus, setOpenSubMenus] = useState<{ [key: string]: boolean }>({
    laporan: false,
    data: false,
    sistem: false,
  });

  const toggleSubMenu = (menuKey: string) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  const handleSelectScreen = (screen: ScreenType) => {
    onNavigate(screen);
    onClose();
  };

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Latar Belakang Gelap / Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-50 cursor-pointer"
          />

          {/* Side Drawer Panel (Slide dari Kiri) */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "0%" }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="absolute top-0 bottom-0 left-0 w-[82%] max-w-[310px] bg-white z-50 shadow-2xl flex flex-col border-r border-slate-200/80 overflow-hidden text-left"
          >
            {/* Drawer Header (Warna sama dengan Header Utama Aplikasi) */}
            <div className="bg-white border-b border-slate-200/80 p-4 shrink-0 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-xs">
                    <QrCode className="w-4 h-4 text-white stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black tracking-widest uppercase text-slate-900 leading-none">
                      KOLEKTOR RT
                    </h2>
                    <span className="text-[9px] text-slate-400 font-bold tracking-wider mt-0.5 block">
                      RT 05 RW 02
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  title="Tutup Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Menu Items Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
              {/* GROUP 1: UTAMA (Icon Berwarna-warni) */}
              <div>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1.5">
                  Navigasi Utama
                </span>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => handleSelectScreen("DASHBOARD")}
                    className="w-full px-3 py-2 rounded-xl text-xs font-normal text-slate-700 hover:text-blue-600 hover:bg-blue-50/80 flex items-center gap-3 transition-all cursor-pointer group"
                  >
                    <Home className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Beranda Utama</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectScreen("SCAN")}
                    className="w-full px-3 py-2 rounded-xl text-xs font-normal text-slate-700 hover:text-emerald-600 hover:bg-emerald-50/80 flex items-center gap-3 transition-all cursor-pointer group"
                  >
                    <QrCode className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.2]" />
                    <span>Pindai QR Kartu Warga</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectScreen("MANUAL")}
                    className="w-full px-3 py-2 rounded-xl text-xs font-normal text-slate-700 hover:text-amber-600 hover:bg-amber-50/80 flex items-center gap-3 transition-all cursor-pointer group"
                  >
                    <Search className="w-4 h-4 text-amber-500 shrink-0 stroke-[2.2]" />
                    <span>Bayar Manual / Cari Warga</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectScreen("MANAGE")}
                    className="w-full px-3 py-2 rounded-xl text-xs font-normal text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/80 flex items-center gap-3 transition-all cursor-pointer group"
                  >
                    <Users className="w-4 h-4 text-indigo-500 shrink-0 stroke-[2.2]" />
                    <span>Kelola Data Warga</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction(onOpenHistoryTray)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-normal text-slate-700 hover:text-rose-600 hover:bg-rose-50/80 flex items-center gap-3 transition-all cursor-pointer group"
                  >
                    <Clock className="w-4 h-4 text-rose-500 shrink-0 stroke-[2.2]" />
                    <span>Riwayat Setoran Sesi Ini</span>
                  </button>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* GROUP 2: SUB-MENU LAPORAN & REKAP (COLLAPSIBLE / OVERLAY SUB-MENU) */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleSubMenu("laporan")}
                  className="w-full px-2 py-1.5 flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                    Laporan & Analitik
                  </span>
                  {openSubMenus["laporan"] ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {openSubMenus["laporan"] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden space-y-0.5 pt-1 pl-2 border-l-2 border-blue-100 ml-2"
                    >
                      <button
                        type="button"
                        onClick={() => handleAction(onOpenMatrixModal)}
                        className="w-full px-3 py-2 rounded-xl text-xs font-normal text-slate-700 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-2.5 transition-all cursor-pointer"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Matrix Status Bulanan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction(onOpenPendapatanModal)}
                        className="w-full px-3 py-2 rounded-xl text-xs font-normal text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 flex items-center gap-2.5 transition-all cursor-pointer"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Laporan Pendapatan RT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction(() => onOpenModal("LAPORAN"))}
                        className="w-full px-3 py-2 rounded-xl text-xs font-normal text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 flex items-center gap-2.5 transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Rekap Detail Setoran</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* GROUP 3: SUB-MENU OLAH DATA EXCEL */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleSubMenu("data")}
                  className="w-full px-2 py-1.5 flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    Olah Data & Excel
                  </span>
                  {openSubMenus["data"] ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {openSubMenus["data"] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden space-y-0.5 pt-1 pl-2 border-l-2 border-emerald-100 ml-2"
                    >
                      <button
                        type="button"
                        onClick={() => handleAction(() => onOpenModal("EXPORT"))}
                        className="w-full px-3 py-2 rounded-xl text-xs font-normal text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 flex items-center gap-2.5 transition-all cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Export Data Excel</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction(() => onOpenModal("IMPORT"))}
                        className="w-full px-3 py-2 rounded-xl text-xs font-normal text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 flex items-center gap-2.5 transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Import Data Excel</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* GROUP 4: SUB-MENU PENGATURAN & SISTEM */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleSubMenu("sistem")}
                  className="w-full px-2 py-1.5 flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    Pengaturan & Aplikasi
                  </span>
                  {openSubMenus["sistem"] ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {openSubMenus["sistem"] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden space-y-0.5 pt-1 pl-2 border-l-2 border-slate-200 ml-2"
                    >
                      <button
                        type="button"
                        onClick={() => handleAction(() => onOpenModal("PENGATURAN"))}
                        className="w-full px-3 py-2 rounded-xl text-xs font-normal text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-2.5 transition-all cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Pengaturan Tarif & Akses</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction(() => onOpenModal("PWA_GUIDE"))}
                        className="w-full px-3 py-2 rounded-xl text-xs font-normal text-slate-700 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-2.5 transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Install Aplikasi (PWA)</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Drawer Footer (Logout) */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/80 shrink-0 space-y-2">
              <button
                type="button"
                onClick={() => handleAction(onLogout)}
                className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-rose-200/60"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Log Out</span>
              </button>

              <div className="text-center">
                <span className="text-[8.5px] font-bold text-slate-400 block uppercase tracking-wider">
                  Kolektor Iuran RT 05 RW 02
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
