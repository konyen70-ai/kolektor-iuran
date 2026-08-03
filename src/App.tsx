/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { QrCode, Search, Clock, ShieldCheck, RefreshCw, Plus, Trash2, Printer, X, Check, Users, Home, Info, Sparkles, Menu, Edit, Download, Save, ArrowLeft, ArrowRight, ChevronDown, ChevronUp, LogOut, Wifi, WifiOff, FileSpreadsheet, Upload, Database, Lock, KeyRound, AlertCircle, BarChart3, TrendingUp, Settings, Smartphone, Phone, MessageSquare, UserPlus, ArrowUpToLine } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { Warga, Transaksi, formatMonthId, KategoriIuran, IuranItemConfig } from "./types";
import { DbService } from "./services/db";
import { LIST_BULAN_2026, CURRENT_MONTH_ID, DEFAULT_IURAN_CONFIG, calculateTotalTarif } from "./data/dummy";
import ScannerSim from "./components/ScannerSim";
import ManualSearch from "./components/ManualSearch";
import { db } from "./services/firebase";
import { doc, setDoc } from "firebase/firestore";
import WargaDetails from "./components/WargaDetails";
import Receipt from "./components/Receipt";
import TransactionHistory from "./components/TransactionHistory";
import LaporanMatrixModal from "./components/LaporanMatrixModal";
import LaporanPendapatanModal from "./components/LaporanPendapatanModal";
import { PWAInstallModal } from "./components/PWAInstallModal";
import { NavigationDrawer } from "./components/NavigationDrawer";

type ScreenType = "DASHBOARD" | "SCAN" | "MANUAL" | "MANAGE" | "PAYMENT" | "RECEIPT" | "EDIT_WARGA" | "ADD_WARGA";

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

const formatWithDots = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>("DASHBOARD");
  const [paymentSource, setPaymentSource] = useState<"SCAN" | "MANUAL">("SCAN");
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [transactions, setTransactions] = useState<Transaksi[]>([]);
  const [selectedWarga, setSelectedWarga] = useState<Warga | null>(null);
  const [activeTransaction, setActiveTransaction] = useState<Transaksi | null>(null);
  const [manualSearchType, setManualSearchType] = useState<"SEMUA" | "NAMA" | "NOMOR_RUMAH" | "ID">("SEMUA");
  const [searchQuery, setSearchQuery] = useState("");
  const [wargaSearchQuery, setWargaSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingWarga, setIsRefreshingWarga] = useState(false);
  const [showManualScrollTop, setShowManualScrollTop] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // State Pengaturan Jenis & Tarif Iuran
  const [iuranConfigList, setIuranConfigList] = useState<IuranItemConfig[]>(() => {
    const saved = localStorage.getItem("kolektor_iuran_config");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_IURAN_CONFIG;
  });
  const [iuranSaveMessage, setIuranSaveMessage] = useState<string | null>(null);

  // Form states untuk tambah warga baru
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNama, setNewNama] = useState("");
  const [newKk, setNewKk] = useState("");
  const [newNoRumah, setNewNoRumah] = useState("");
  const [newNomorHp, setNewNomorHp] = useState("");
  const [newKategori, setNewKategori] = useState<KategoriIuran>("Warga Biasa");
  const [newNamaKolektor, setNewNamaKolektor] = useState("Is Tentrem");
  const [newIuranMode, setNewIuranMode] = useState<"SEMUA" | "KUSTOM">("SEMUA");
  const [newIuranAktif, setNewIuranAktif] = useState<string[]>([]);
  const [newTarif, setNewTarif] = useState(35000);

  // State untuk modal cetak QR
  const [activeCardWarga, setActiveCardWarga] = useState<Warga | null>(null);

  // State untuk edit warga
  const [editingWarga, setEditingWarga] = useState<Warga | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editNama, setEditNama] = useState("");
  const [editKk, setEditKk] = useState("");
  const [editNoRumah, setEditNoRumah] = useState("");
  const [editNomorHp, setEditNomorHp] = useState("");
  const [editKategori, setEditKategori] = useState<KategoriIuran>("Warga Biasa");
  const [editNamaKolektor, setEditNamaKolektor] = useState("Is Tentrem");
  const [editIuranMode, setEditIuranMode] = useState<"SEMUA" | "KUSTOM">("SEMUA");
  const [editIuranAktif, setEditIuranAktif] = useState<string[]>([]);
  const [editTarif, setEditTarif] = useState(35000);

  // State Pra-tinjau Laporan Matrix
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [showPendapatanModal, setShowPendapatanModal] = useState(false);

  // State untuk konfirmasi hapus warga (alternatif confirm browser agar aman di iframe)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // State untuk melacak warga mana yang sedang diekspand detailnya
  const [expandedWargaId, setExpandedWargaId] = useState<string | null>(null);

  // Splash Screen & Auth states
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showHistoryTray, setShowHistoryTray] = useState(false);

  // PWA Install States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  // States untuk Menu Tambahan (Laporan, Export, Import, Pengaturan)
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"NONE" | "LAPORAN" | "EXPORT" | "IMPORT" | "PENGATURAN" | "PWA_GUIDE">("NONE");

  // State Laporan
  const [reportFilterMonth, setReportFilterMonth] = useState(CURRENT_MONTH_ID);
  const [reportSearchQuery, setReportSearchQuery] = useState("");

  // State Pengaturan
  const [settingsRoleToChange, setSettingsRoleToChange] = useState<"admin" | "kolektor">("admin");
  const [settingsOldPassword, setSettingsOldPassword] = useState("");
  const [settingsNewPassword, setSettingsNewPassword] = useState("");
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState("");
  const [settingsMessage, setSettingsMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // State Import Excel
  const [importDragOver, setImportDragOver] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importParsedWarga, setImportParsedWarga] = useState<Warga[]>([]);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  // Ref untuk mendeteksi event popstate guna menghindari loop pushState ganda
  const isPopStateRef = useRef(false);

  useEffect(() => {
    // Check saved session
    const savedUser = localStorage.getItem("kolektor_logged_in_user");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }

    // Ganti state awal browser history dengan DASHBOARD agar kembali dengan back button berjalan mulus
    window.history.replaceState({ screen: "DASHBOARD" }, "");

    // Splash Screen timeout
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  // Effect untuk mendeteksi event instalasi PWA
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    console.log("[PWA Status] Display mode standalone:", isStandalone);
    console.log("[PWA Status] User Agent:", navigator.userAgent);

    if (isStandalone) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log("[PWA Prompt] 'beforeinstallprompt' event caught successfully! PWA prompt is ready to trigger.", e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsAppInstalled(true);
      console.log("[PWA Status] App was installed successfully as native/standalone PWA.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to the install prompt: ${outcome}`);
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      isPopStateRef.current = true;
      if (event.state && event.state.screen) {
        setActiveScreen(event.state.screen);
        if (event.state.screen === "DASHBOARD") {
          setEditingWarga(null);
          setSelectedWarga(null);
          setActiveTransaction(null);
        }
      } else {
        setActiveScreen("DASHBOARD");
        setEditingWarga(null);
        setSelectedWarga(null);
        setActiveTransaction(null);
      }
      setTimeout(() => {
        isPopStateRef.current = false;
      }, 50);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (isPopStateRef.current) return;
    
    const currentHistoryState = window.history.state;
    if (!currentHistoryState || currentHistoryState.screen !== activeScreen) {
      window.history.pushState({ screen: activeScreen }, "");
    }
  }, [activeScreen]);

  // Lacak status koneksi internet browser secara realtime
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Hubungkan dengan Firebase Firestore secara real-time
  useEffect(() => {
    setIsLoading(true);
    
    let unsubscribeWarga: (() => void) | null = null;
    let unsubscribeTransactions: (() => void) | null = null;

    async function initDb() {
      try {
        // Pastikan database ter-seed jika kosong
        await DbService.getWargaList();
        
        unsubscribeWarga = DbService.subscribeWarga((list) => {
          setWargaList(list);
          setIsLoading(false);
        });

        unsubscribeTransactions = DbService.subscribeTransactions((txs) => {
          setTransactions(txs);
        });
      } catch (err) {
        console.error("Gagal inisialisasi database real-time:", err);
        setIsLoading(false);
      }
    }

    initDb();

    return () => {
      if (unsubscribeWarga) unsubscribeWarga();
      if (unsubscribeTransactions) unsubscribeTransactions();
    };
  }, []);

  // Load data dari DbService (sebagai fallback/penyegar manual)
  const loadData = async () => {
    setIsLoading(true);
    try {
      const list = await DbService.getWargaList();
      const txs = await DbService.getTransactions();
      setWargaList(list);
      setTransactions(txs);
    } catch (err) {
      console.error("Gagal memuat data dari database", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync newIuranAktif & newTarif ketika kategori/mode/iuranConfig berubah
  useEffect(() => {
    if (newIuranMode === "SEMUA") {
      const allIds = iuranConfigList.map((item) => item.id);
      setNewIuranAktif(allIds);
      setNewTarif(calculateTotalTarif(newKategori, allIds, iuranConfigList));
    } else {
      setNewTarif(calculateTotalTarif(newKategori, newIuranAktif, iuranConfigList));
    }
  }, [newKategori, newIuranMode, iuranConfigList]);

  useEffect(() => {
    if (newIuranMode === "KUSTOM") {
      setNewTarif(calculateTotalTarif(newKategori, newIuranAktif, iuranConfigList));
    }
  }, [newIuranAktif]);

  // Sync editIuranAktif & editTarif ketika kategori/mode/iuranConfig berubah
  useEffect(() => {
    if (editIuranMode === "SEMUA") {
      const allIds = iuranConfigList.map((item) => item.id);
      setEditIuranAktif(allIds);
      setEditTarif(calculateTotalTarif(editKategori, allIds, iuranConfigList));
    } else {
      setEditTarif(calculateTotalTarif(editKategori, editIuranAktif, iuranConfigList));
    }
  }, [editKategori, editIuranMode, iuranConfigList]);

  useEffect(() => {
    if (editIuranMode === "KUSTOM") {
      setEditTarif(calculateTotalTarif(editKategori, editIuranAktif, iuranConfigList));
    }
  }, [editIuranAktif]);

  // Handler Scan QR Berhasil
  const handleScanSuccess = async (scannedId: string) => {
    setIsLoading(true);
    const warga = await DbService.getWargaByQrId(scannedId);
    setIsLoading(false);
    if (warga) {
      setPaymentSource("SCAN");
      setSelectedWarga(warga);
      setActiveScreen("PAYMENT");
    } else {
      alert("No. KK atau ID Warga tidak dikenali atau salah!");
    }
  };

  // Handler Pilih Warga dari Manual Search
  const handleSelectWarga = (warga: Warga) => {
    setPaymentSource("MANUAL");
    setSelectedWarga(warga);
    setActiveScreen("PAYMENT");
  };

  // Handler Kirim / Konfirmasi Pembayaran
  const handlePaymentSubmit = async (selectedMonths: string[], totalBayar: number, catatan: string) => {
    if (!selectedWarga) return;

    // Safeguard check for already paid months
    const alreadyPaidMonths = selectedMonths.filter((m) => selectedWarga.historyPembayaran.includes(m));
    if (alreadyPaidMonths.length > 0) {
      alert(`Peringatan Double Bayar: Bulan ${alreadyPaidMonths.map(formatMonthId).join(", ")} sudah lunas! Silakan alihkan ke bulan lain yang belum dibayar.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const txMethod = activeScreen === "MANUAL" ? "MANUAL" : "QR_CODE";
      const newTx = await DbService.recordTransaction(
        selectedWarga.id,
        selectedMonths,
        selectedWarga.tarifPerBulan,
        totalBayar,
        txMethod,
        catatan
      );

      // Refresh data
      await loadData();

      // Atur transaksi aktif dan ganti screen ke kuitansi digital
      setActiveTransaction(newTx);
      setActiveScreen("RECEIPT");
    } catch (err) {
      console.error(err);
      alert("Gagal memproses pembayaran iuran.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Tambah Warga Baru
  const handleAddWarga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim() || !newKk.trim() || !newNoRumah.trim()) {
      alert("Harap lengkapi semua field!");
      return;
    }

    if (newKk.trim().length !== 16) {
      alert("Nomor KK harus tepat 16 digit!");
      return;
    }

    setIsSubmitting(true);
    try {
      await DbService.addWarga(
        newNama,
        newKk,
        newNoRumah,
        newKategori,
        newTarif,
        newIuranAktif,
        newNomorHp,
        newNamaKolektor
      );
      // Reset form
      setNewNama("");
      setNewKk("");
      setNewNoRumah("");
      setNewNomorHp("");
      setNewKategori("Warga Biasa");
      setNewNamaKolektor("Is Tentrem");
      setNewIuranMode("SEMUA");
      setNewIuranAktif(iuranConfigList.map((i) => i.id));
      // Refresh list
      await loadData();
      setActiveScreen("MANAGE");
    } catch (err) {
      console.error(err);
      alert("Gagal menambahkan data warga.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Pilih Warga Untuk Diedit
  const handleEditWarga = (warga: Warga) => {
    setEditingWarga(warga);
    setEditNama(warga.namaKepalaKeluarga);
    setEditKk(warga.nomorKk);
    setEditNoRumah(warga.nomorRumah);
    setEditNomorHp(warga.nomorHp || "");
    setEditKategori(warga.kategoriIuran || "Warga Biasa");
    setEditNamaKolektor(warga.namaKolektor || "Is Tentrem");

    const allIds = iuranConfigList.map((i) => i.id);
    const currentAktif = warga.iuranAktif && warga.iuranAktif.length > 0 ? warga.iuranAktif : allIds;
    setEditIuranAktif(currentAktif);

    if (currentAktif.length === allIds.length && allIds.every((id) => currentAktif.includes(id))) {
      setEditIuranMode("SEMUA");
    } else {
      setEditIuranMode("KUSTOM");
    }

    setEditTarif(warga.tarifPerBulan || calculateTotalTarif(warga.kategoriIuran || "Warga Biasa", currentAktif, iuranConfigList));
    setActiveScreen("EDIT_WARGA");
  };

  // Handler Update Warga
  const handleUpdateWarga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarga) return;

    if (!editNama.trim() || !editKk.trim() || !editNoRumah.trim()) {
      alert("Harap lengkapi semua field!");
      return;
    }

    if (editKk.trim().length !== 16) {
      alert("Nomor KK harus tepat 16 digit!");
      return;
    }

    setIsSubmitting(true);
    try {
      await DbService.updateWarga(
        editingWarga.id,
        editNama,
        editKk,
        editNoRumah,
        editKategori,
        editTarif,
        editIuranAktif,
        editNomorHp,
        editNamaKolektor
      );
      // Reset form
      setEditNama("");
      setEditKk("");
      setEditNoRumah("");
      setEditNomorHp("");
      setEditingWarga(null);
      // Refresh list
      await loadData();
      setActiveScreen("MANAGE");
    } catch (err) {
      console.error(err);
      alert("Gagal memperbarui data warga.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Download PDF Kartu QR
  const handleDownloadPDF = async () => {
    if (!activeCardWarga) return;
    const element = document.getElementById("only-qr-and-name-print");
    if (!element) return;

    setIsDownloadingPdf(true);
    let originalSrc = "";
    let imgElement: HTMLImageElement | null = null;

    try {
      // Temukan elemen gambar QR untuk menggantinya dengan Data URI agar bebas CORS taint
      imgElement = element.querySelector("img") as HTMLImageElement;
      if (imgElement && imgElement.src) {
        originalSrc = imgElement.src;
        try {
          const response = await fetch(originalSrc);
          const blob = await response.blob();
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          imgElement.src = base64Data;
        } catch (fetchErr) {
          console.warn("Gagal konversi gambar ke Base64, mencoba fallback standar:", fetchErr);
        }
      }

      // Tunggu sebentar untuk memastikan gambar termuat ulang dalam format base64
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        scale: 4, // Skala tinggi untuk kualitas cetak sangat tajam
        backgroundColor: "#ffffff", // Latar belakang putih bersih
        onclone: (clonedDoc) => {
          // Bersihkan semua color function 'oklch' dari stylesheet di dokumen kloningan
          // agar html2canvas tidak crash saat memparsing CSS.
          const styleElements = clonedDoc.getElementsByTagName("style");
          for (let i = 0; i < styleElements.length; i++) {
            const style = styleElements[i];
            if (style.innerHTML) {
              style.innerHTML = style.innerHTML.replace(/oklch\([^)]+\)/g, "rgb(100, 116, 139)");
            }
          }

          // Juga bersihkan inline styles dari elemen-elemen di dokumen kloningan jika ada yang mengandung oklch
          const allElements = clonedDoc.getElementsByTagName("*");
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            if (el.style && el.style.cssText) {
              if (el.style.cssText.includes("oklch")) {
                el.style.cssText = el.style.cssText.replace(/oklch\([^)]+\)/g, "rgb(100, 116, 139)");
              }
            }
          }
        }
      });

      const imgData = canvas.toDataURL("image/png");

      // Ukuran Square Cetak Minimalis (80mm x 80mm)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [80, 80],
      });

      pdf.addImage(imgData, "PNG", 0, 0, 80, 80);
      
      // Simpan dengan format QR_Nama Warga.pdf
      const safeName = activeCardWarga.namaKepalaKeluarga.trim().replace(/\s+/g, "_");
      pdf.save(`KARTU_QR_${safeName}.pdf`);
    } catch (error) {
      console.error("Gagal mendownload PDF:", error);
      alert("Gagal mengunduh PDF. Silakan gunakan tombol Print atau screenshot sebagai alternatif.");
    } finally {
      // Kembalikan src asli jika sempat diubah
      if (imgElement && originalSrc) {
        imgElement.src = originalSrc;
      }
      setIsDownloadingPdf(false);
    }
  };

  // Handler Download Gambar PNG Kartu QR
  const handleDownloadPNG = async () => {
    if (!activeCardWarga) return;
    const element = document.getElementById("only-qr-and-name-print");
    if (!element) return;

    setIsDownloadingPdf(true); // Share loading state
    let originalSrc = "";
    let imgElement: HTMLImageElement | null = null;

    try {
      imgElement = element.querySelector("img") as HTMLImageElement;
      if (imgElement && imgElement.src) {
        originalSrc = imgElement.src;
        try {
          const response = await fetch(originalSrc);
          const blob = await response.blob();
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          imgElement.src = base64Data;
        } catch (fetchErr) {
          console.warn("Gagal konversi gambar ke Base64 untuk PNG:", fetchErr);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        scale: 4, // Gambar resolusi tinggi
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          const styleElements = clonedDoc.getElementsByTagName("style");
          for (let i = 0; i < styleElements.length; i++) {
            const style = styleElements[i];
            if (style.innerHTML) {
              style.innerHTML = style.innerHTML.replace(/oklch\([^)]+\)/g, "rgb(100, 116, 139)");
            }
          }
          const allElements = clonedDoc.getElementsByTagName("*");
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            if (el.style && el.style.cssText) {
              if (el.style.cssText.includes("oklch")) {
                el.style.cssText = el.style.cssText.replace(/oklch\([^)]+\)/g, "rgb(100, 116, 139)");
              }
            }
          }
        }
      });

      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const safeName = activeCardWarga.namaKepalaKeluarga.trim().replace(/\s+/g, "_");
      link.download = `KARTU_QR_${safeName}.png`;
      link.href = imgData;
      link.click();
    } catch (error) {
      console.error("Gagal mendownload Gambar:", error);
      alert("Gagal mengunduh gambar PNG.");
    } finally {
      if (imgElement && originalSrc) {
        imgElement.src = originalSrc;
      }
      setIsDownloadingPdf(false);
    }
  };

  // Handler Hapus Warga
  const handleDeleteWarga = async (wargaId: string, nama: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus warga "${nama}" dari database?`)) {
      setIsLoading(true);
      try {
        await DbService.deleteWarga(wargaId);
        await loadData();
      } catch (err) {
        console.error(err);
        alert("Gagal menghapus warga.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handler Reset Database Demo
  const handleResetDb = async () => {
    if (confirm("Apakah Anda yakin ingin menghapus bersih seluruh data warga dan transaksi dari database?")) {
      await DbService.resetDatabase();
      setSelectedWarga(null);
      setActiveTransaction(null);
      setActiveScreen("DASHBOARD");
      await loadData();
    }
  };



  // Sesi Tracker - Ringkasan Hari Ini
  const totalTransaksiHariIni = transactions.length;
  const totalUangDiterimaHariIni = transactions.reduce((acc, curr) => acc + curr.totalBayar, 0);

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatWithDots = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Handler Ganti Password
  const handleChangePassword = () => {
    setSettingsMessage(null);
    if (!settingsOldPassword || !settingsNewPassword || !settingsConfirmPassword) {
      setSettingsMessage({ text: "Harap isi semua kolom sandi!", isError: true });
      return;
    }

    if (settingsNewPassword.length < 4) {
      setSettingsMessage({ text: "Sandi baru minimal 4 karakter!", isError: true });
      return;
    }

    if (settingsNewPassword !== settingsConfirmPassword) {
      setSettingsMessage({ text: "Konfirmasi sandi baru tidak cocok!", isError: true });
      return;
    }

    const savedPasswordKey = settingsRoleToChange === "admin" ? "admin_password" : "kolektor_password";
    const currentPass = localStorage.getItem(savedPasswordKey) || "123456";

    if (settingsOldPassword !== currentPass) {
      setSettingsMessage({ text: "Sandi lama Anda salah!", isError: true });
      return;
    }

    localStorage.setItem(savedPasswordKey, settingsNewPassword);
    setSettingsMessage({ text: `Sandi ${settingsRoleToChange === "admin" ? "Administrator" : "Kolektor"} berhasil diperbarui!`, isError: false });
    
    // Clear fields
    setSettingsOldPassword("");
    setSettingsNewPassword("");
    setSettingsConfirmPassword("");
  };

  // Handler Export Excel
  const handleExportToExcel = () => {
    // Create citizen data rows
    const wargaRows = wargaList.map((w, index) => ({
      "No": index + 1,
      "ID Warga": w.id,
      "Nama Kepala Keluarga": w.namaKepalaKeluarga,
      "Nomor KK": w.nomorKk,
      "Nomor Rumah": w.nomorRumah,
      "Nomor WA / HP": w.nomorHp || "",
      "Kategori Iuran": w.kategoriIuran,
      "Tarif Bulanan (Rp)": w.tarifPerBulan,
      "Riwayat Bayar": w.historyPembayaran.join(", ")
    }));

    // Create transactions rows
    const txRows = transactions.map((t, index) => ({
      "No": index + 1,
      "ID Transaksi": t.id,
      "ID Warga": t.wargaId,
      "Nama Warga": t.wargaNama,
      "Nomor Rumah": t.wargaNomorRumah,
      "Bulan Dibayar": t.bulanBayar.join(", "),
      "Tarif Dasar (Rp)": t.tarifDasar,
      "Total Bayar (Rp)": t.totalBayar,
      "Tanggal": new Date(t.tanggal).toLocaleString("id-ID"),
      "Metode": t.metode,
      "Status": t.status,
      "Catatan": t.catatan || ""
    }));

    const wb = XLSX.utils.book_new();
    
    const wsWarga = XLSX.utils.json_to_sheet(wargaRows);
    XLSX.utils.book_append_sheet(wb, wsWarga, "Daftar_Warga");
    
    const wsTx = XLSX.utils.json_to_sheet(txRows);
    XLSX.utils.book_append_sheet(wb, wsTx, "Riwayat_Iuran");
    
    XLSX.writeFile(wb, "Laporan_Iuran_RT05_RW02.xlsx");
  };

  // Handler Import Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) return;
        const wb = XLSX.read(bstr, { type: "binary" });
        
        // Look for a sheet (first sheet or sheet named "Daftar_Warga")
        const sheetName = wb.SheetNames.find(name => name.toLowerCase().includes("warga")) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json<any>(ws);

        if (rawData.length === 0) {
          setImportError("File Excel kosong atau format tidak sesuai!");
          return;
        }

        // Map rows
        const parsed: Warga[] = [];
        rawData.forEach((row: any, index: number) => {
          let nama = "";
          let kk = "";
          let noRumah = "";
          let noHp = "";
          let kategori: KategoriIuran = "Warga Biasa";
          let tarif = 35000;
          let history: string[] = [];

          for (const key of Object.keys(row)) {
            const lowerKey = key.toLowerCase();
            const val = String(row[key]).trim();

            if (lowerKey.includes("nama")) {
              nama = val;
            } else if (lowerKey.includes("kk") || lowerKey.includes("keluarga")) {
              kk = val;
            } else if (lowerKey.includes("rumah")) {
              noRumah = val;
            } else if (lowerKey.includes("hp") || lowerKey.includes("wa") || lowerKey.includes("telp") || lowerKey.includes("phone")) {
              noHp = val;
            } else if (lowerKey.includes("kategori")) {
              if (val.toLowerCase().includes("luar")) kategori = "Warga Luar";
              else if (val.toLowerCase().includes("usaha")) kategori = "Warga Usaha";
              else kategori = "Warga Biasa";
            } else if (lowerKey.includes("tarif") || lowerKey.includes("iuran")) {
              const num = parseInt(val.replace(/[^\d]/g, ""));
              if (!isNaN(num)) tarif = num;
            } else if (lowerKey.includes("history") || lowerKey.includes("riwayat") || lowerKey.includes("bulan")) {
              if (val) {
                history = val.split(",").map(m => m.trim()).filter(m => m.match(/^\d{4}-\d{2}$/));
              }
            }
          }

          // Set default tarif if not provided
          if (!row.hasOwnProperty("Tarif") && !row.hasOwnProperty("tarif")) {
            tarif = calculateTotalTarif(kategori, undefined, iuranConfigList);
          }

          if (nama && kk) {
            parsed.push({
              id: row["ID Warga"] || row["id"] || `W-TEMP-${index}`,
              qrId: kk,
              nomorKk: kk,
              namaKepalaKeluarga: nama,
              nomorRumah: noRumah || "-",
              nomorHp: noHp || "",
              kategoriIuran: kategori,
              tarifPerBulan: tarif,
              historyPembayaran: history
            });
          }
        });

        if (parsed.length === 0) {
          setImportError("Tidak dapat memetakan data. Pastikan file Excel memiliki kolom nama dan nomor KK.");
        } else {
          setImportParsedWarga(parsed);
          setImportError(null);
        }
      } catch (err: any) {
        setImportError(`Gagal membaca Excel: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveImportedData = async () => {
    setIsSubmitting(true);
    try {
      let addCount = 0;
      let updateCount = 0;

      for (const warga of importParsedWarga) {
        const existing = wargaList.find(w => w.nomorKk === warga.nomorKk);
        
        if (existing) {
          const docRef = doc(db, "warga", existing.id);
          const mergedHistory = Array.from(new Set([...existing.historyPembayaran, ...warga.historyPembayaran])).sort();
          
          await setDoc(docRef, {
            ...existing,
            namaKepalaKeluarga: warga.namaKepalaKeluarga,
            nomorRumah: warga.nomorRumah,
            nomorHp: warga.nomorHp || existing.nomorHp || "",
            kategoriIuran: warga.kategoriIuran,
            tarifPerBulan: warga.tarifPerBulan,
            historyPembayaran: mergedHistory
          });
          updateCount++;
        } else {
          const currentList = await DbService.getWargaList();
          const num = currentList.length > 0 ? Math.max(...currentList.map((w) => parseInt(w.id.replace("W-", "")) || 0)) + 1 : 1;
          const newId = `W-${String(num).padStart(2, "0")}`;

          const docRef = doc(db, "warga", newId);
          await setDoc(docRef, {
            id: newId,
            qrId: warga.nomorKk,
            nomorKk: warga.nomorKk,
            namaKepalaKeluarga: warga.namaKepalaKeluarga,
            nomorRumah: warga.nomorRumah,
            nomorHp: warga.nomorHp || "",
            kategoriIuran: warga.kategoriIuran,
            tarifPerBulan: warga.tarifPerBulan,
            historyPembayaran: warga.historyPembayaran
          });
          addCount++;
        }
      }

      await loadData();
      setImportSuccessCount(addCount + updateCount);
      setImportParsedWarga([]);
    } catch (err: any) {
      setImportError(`Gagal menyimpan data ke database: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReport = (monthId: string) => {
    const monthName = LIST_BULAN_2026.find(m => m.id === monthId)?.namaBulan || monthId;
    
    const lunasWarga = wargaList.filter(w => w.historyPembayaran.includes(monthId));
    const belumLunasWarga = wargaList.filter(w => !w.historyPembayaran.includes(monthId));
    const totalTerkumpul = lunasWarga.reduce((sum, w) => sum + w.tarifPerBulan, 0);
    const totalTunggakan = belumLunasWarga.reduce((sum, w) => sum + w.tarifPerBulan, 0);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let lunasRowsHtml = "";
    lunasWarga.forEach(w => {
      lunasRowsHtml += "<tr>" +
        "<td class='py-2 font-semibold text-slate-800'>" + w.namaKepalaKeluarga + "</td>" +
        "<td class='py-2 text-slate-500'>" + w.nomorRumah + "</td>" +
        "<td class='py-2 text-right font-mono text-slate-750'>Rp " + formatWithDots(w.tarifPerBulan) + "</td>" +
        "<td class='py-2 text-right font-black text-emerald-600'>LUNAS</td>" +
        "</tr>";
    });

    let belumLunasHtml = "";
    if (belumLunasWarga.length === 0) {
      belumLunasHtml = "<p class='text-xs text-slate-400 italic py-2'>Semua warga telah melunasi iuran bulan ini.</p>";
    } else {
      let rows = "";
      belumLunasWarga.forEach(w => {
        rows += "<tr>" +
          "<td class='py-2 font-semibold text-slate-800'>" + w.namaKepalaKeluarga + "</td>" +
          "<td class='py-2 text-slate-500'>" + w.nomorRumah + "</td>" +
          "<td class='py-2 text-right font-mono text-slate-750 font-semibold'>Rp " + formatWithDots(w.tarifPerBulan) + "</td>" +
          "<td class='py-2 text-right font-black text-amber-600'>BELUM LUNAS</td>" +
          "</tr>";
      });
      belumLunasHtml = "<table class='w-full text-xs text-left'>" +
        "<thead>" +
        "<tr class='text-slate-400 uppercase font-bold border-b text-[10px]'>" +
        "<th class='py-1'>Nama</th>" +
        "<th class='py-1'>No. Rumah</th>" +
        "<th class='py-1 text-right'>Tarif</th>" +
        "<th class='py-1 text-right'>Status</th>" +
        "</tr>" +
        "</thead>" +
        "<tbody class='divide-y'>" + rows + "</tbody>" +
        "</table>";
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Bulanan RT 05 - ${monthName}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body class="bg-white p-8 font-sans">
          <div class="max-w-3xl mx-auto border border-slate-200 p-8 rounded-2xl shadow-sm">
            <div class="text-center border-b pb-4 mb-6">
              <h1 class="text-2xl font-black text-slate-900 tracking-wide">LAPORAN PENERIMAAN IURAN RT 05 RW 02</h1>
              <p class="text-xs text-slate-500 font-semibold mt-1">Sistem Keuangan Mandiri - Periode: ${monthName}</p>
            </div>
            
            <div class="grid grid-cols-3 gap-4 mb-6">
              <div class="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Terkumpul</span>
                <span class="text-lg font-black text-blue-600 mt-1 block">Rp ${formatWithDots(totalTerkumpul)}</span>
              </div>
              <div class="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tunggakan</span>
                <span class="text-lg font-black text-amber-600 mt-1 block">Rp ${formatWithDots(totalTunggakan)}</span>
              </div>
              <div class="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status Bayar</span>
                <span class="text-lg font-black text-emerald-600 mt-1 block">${lunasWarga.length} / ${wargaList.length} Warga</span>
              </div>
            </div>

            <div class="mb-6">
              <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 pb-1 border-b">Daftar Warga Lunas (${lunasWarga.length})</h3>
              <table class="w-full text-xs text-left">
                <thead>
                  <tr class="text-slate-400 uppercase font-bold border-b text-[10px]">
                    <th class="py-1">Nama</th>
                    <th class="py-1">No. Rumah</th>
                    <th class="py-1 text-right">Tarif</th>
                    <th class="py-1 text-right">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  ${lunasRowsHtml}
                </tbody>
              </table>
            </div>

            <div>
              <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 pb-1 border-b">Daftar Warga Belum Lunas (${belumLunasWarga.length})</h3>
              ${belumLunasHtml}
            </div>

            <div class="no-print mt-8 flex justify-center">
              <button onclick="window.print()" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md">Cetak Laporan</button>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (showSplash) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-0 sm:p-5 md:p-8 font-sans selection:bg-blue-200">
        <div
          className="w-full max-w-sm bg-[#FAF9F5] sm:rounded-3xl sm:shadow-xl sm:border border-slate-200/80 overflow-hidden flex flex-col items-center justify-center h-screen sm:h-[760px] relative p-8 text-center"
          id="android-phone-frame"
        >
          {/* Subtle gradient background decoration */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center space-y-6 relative z-10"
          >
            {/* Elegant Logo / Shield */}
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <QrCode className="w-9 h-9 text-white stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black tracking-widest uppercase text-slate-950 font-sans">
                KOLEKTOR IURAN RT
              </h1>
              <span className="text-xs text-blue-600 font-extrabold block tracking-widest uppercase">
                RT 05 RW 02 • MANDIRI
              </span>
            </div>
            
            {/* Walking/moving small circles (progress bar) */}
            <div className="pt-8 flex flex-col items-center space-y-3">
              <div className="flex space-x-2.5 items-center justify-center">
                {[0, 1, 2, 3, 4].map((index) => (
                  <motion.div
                    key={index}
                    className="w-2.5 h-2.5 bg-blue-600 rounded-full"
                    animate={{
                      y: ["0%", "-120%", "0%"],
                      scale: [1, 1.25, 1],
                      backgroundColor: ["#2563eb", "#60a5fa", "#2563eb"],
                    }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      delay: index * 0.15,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase animate-pulse">
                Memuat Aplikasi
              </span>
            </div>
          </motion.div>

          {/* Footer of the splash */}
          <div className="absolute bottom-8 left-0 right-0 text-center relative z-10">
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
              Sistem Digital Mandiri © 2026
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    const handleLogin = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const userLower = loginUsername.trim().toLowerCase();
      const passTrim = loginPassword.trim();
      
      const adminPass = localStorage.getItem("admin_password") || "123456";
      const kolektorPass = localStorage.getItem("kolektor_password") || "123456";
      
      if (
        (userLower === "admin" && passTrim === adminPass) ||
        ((userLower === "kolektor" || userLower === "kolektor_sesi") && passTrim === kolektorPass)
      ) {
        const loggedInUser = {
          username: userLower,
          role: userLower === "admin" ? "Administrator" : "Kolektor Sesi"
        };
        setCurrentUser(loggedInUser);
        localStorage.setItem("kolektor_logged_in_user", JSON.stringify(loggedInUser));
        setLoginError("");
        setLoginUsername("");
        setLoginPassword("");
      } else {
        setLoginError("Username atau Password salah!");
      }
    };

    const handleQuickLogin = (username: string) => {
      const loggedInUser = {
        username: username,
        role: username === "admin" ? "Administrator" : "Kolektor Sesi"
      };
      setCurrentUser(loggedInUser);
      localStorage.setItem("kolektor_logged_in_user", JSON.stringify(loggedInUser));
      setLoginError("");
      setLoginUsername("");
      setLoginPassword("");
    };

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-0 sm:p-5 md:p-8 font-sans selection:bg-blue-200">
        <div
          className="w-full max-w-sm bg-white sm:rounded-3xl sm:shadow-xl sm:border border-slate-200 overflow-hidden flex flex-col h-screen sm:h-[760px] relative justify-between p-6"
          id="android-phone-frame"
        >
          {/* Status Bar */}
          <div className="hidden sm:flex bg-slate-50 text-slate-700/80 px-6 py-2 justify-between items-center text-[10px] font-bold tracking-widest select-none shrink-0 border-b border-slate-100/60 -mx-6 -mt-6 mb-4">
            <span>09:41</span>
            <div className="w-20 h-4 bg-slate-200/60 rounded-full flex items-center justify-center border border-slate-200 text-[8px] text-slate-500 font-extrabold uppercase scale-90">
              Kolektor PWA
            </div>
            <div className="flex items-center gap-1">
              <span>LTE</span>
              <div className="w-4 h-2 border border-slate-300 rounded-xs relative flex items-center p-px">
                <div className="w-2.5 h-full bg-blue-600 rounded-2xs" />
              </div>
            </div>
          </div>

          {/* Header area with app identity */}
          <div className="flex flex-col items-center text-center mt-4 space-y-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20">
              <QrCode className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-widest uppercase">MASUK PETUGAS</h2>
              <span className="text-[10px] text-slate-500 font-bold block mt-1 tracking-wider">RT 05 RW 02 - KOLEKTOR</span>
            </div>
          </div>

          {/* Form area */}
          <form onSubmit={handleLogin} className="flex-1 flex flex-col justify-center space-y-4 my-4 max-w-[300px] mx-auto w-full">
            {loginError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold text-center"
              >
                {loginError}
              </motion.div>
            )}

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Username</label>
              <input
                type="text"
                placeholder="admin / kolektor"
                value={loginUsername}
                onChange={(e) => {
                  setLoginUsername(e.target.value);
                  setLoginError("");
                }}
                className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-xs font-semibold h-11 transition-all text-slate-800"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Password</label>
              <input
                type="password"
                placeholder="••••••"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  setLoginError("");
                }}
                className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-xs font-semibold h-11 transition-all text-slate-800"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/10 transition-all cursor-pointer text-center hover:shadow-lg hover:shadow-blue-600/20 active:scale-95 mt-2"
            >
              Masuk Sekarang
            </button>

            {/* Quick Fill Accounts (for easy testing as requested) */}
            <div className="pt-4 border-t border-slate-100 text-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">PILIH AKUN INSTAN</span>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => handleQuickLogin("admin")}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 border border-slate-200 text-[10px] font-black text-slate-700 hover:text-blue-700 rounded-lg transition-all cursor-pointer active:scale-95"
                >
                  👤 Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin("kolektor")}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 border border-slate-200 text-[10px] font-black text-slate-700 hover:text-blue-700 rounded-lg transition-all cursor-pointer active:scale-95"
                >
                  👤 Kolektor
                </button>
              </div>
            </div>
          </form>

          {/* Footer of login */}
          <div className="text-center mb-4">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">PASSWORD DEFAULT: 123456</span>
            <span className="text-[8px] text-slate-300 font-bold uppercase tracking-widest block mt-1">Sistem Digital RT v1.1</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-0 sm:p-5 md:p-8 font-sans selection:bg-blue-200">
      {/* Modal PWA Install Prompt */}
      <PWAInstallModal />

      {/* Bingkai Aplikasi Ringkas (Mobile-First responsive container) */}
      <div
        className="w-full max-w-sm bg-white sm:rounded-3xl sm:shadow-xl sm:border border-slate-200 overflow-hidden flex flex-col h-screen sm:h-[760px] relative"
        id="android-phone-frame"
      >
        {/* Navigation Drawer Overlay */}
        <NavigationDrawer
          isOpen={isHeaderMenuOpen}
          onClose={() => setIsHeaderMenuOpen(false)}
          currentUser={currentUser}
          isOnline={isOnline}
          onNavigate={(screen) => setActiveScreen(screen)}
          onOpenHistoryTray={() => setShowHistoryTray(true)}
          onOpenMatrixModal={() => setShowMatrixModal(true)}
          onOpenPendapatanModal={() => setShowPendapatanModal(true)}
          onOpenModal={(modal) => setActiveModal(modal)}
          onLogout={() => {
            setCurrentUser(null);
            localStorage.removeItem("kolektor_logged_in_user");
            setActiveScreen("DASHBOARD");
          }}
        />
        {/* Sticky Header Wrapper */}
        <div className="shrink-0 flex flex-col w-full bg-white z-40 border-b border-slate-100 relative">
          {/* Android Status Bar */}
          <div className="hidden sm:flex bg-slate-50 text-slate-700/80 px-6 py-2 justify-between items-center text-[10px] font-bold tracking-widest select-none shrink-0 border-b border-slate-100/60">
            <span>09:41</span>
            <div className="w-20 h-4 bg-slate-200/60 rounded-full flex items-center justify-center border border-slate-200 text-[8px] text-slate-500 font-extrabold uppercase scale-90">
              Kolektor PWA
            </div>
            <div className="flex items-center gap-1">
              <span>LTE</span>
              <div className="w-4 h-2 border border-slate-300 rounded-xs relative flex items-center p-px">
                <div className="w-2.5 h-full bg-blue-600 rounded-2xs" />
              </div>
            </div>
          </div>

          {/* Header App Bar - Putih, Bersih, Sederhana, Modern */}
          {activeScreen === "ADD_WARGA" || activeScreen === "EDIT_WARGA" || activeScreen === "PAYMENT" ? null : activeScreen === "MANAGE" ? (
            <header className="bg-white text-slate-850 px-5 py-3.5 shrink-0 shadow-xs relative flex flex-col gap-2.5 border-b border-slate-100 z-30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveScreen("DASHBOARD");
                    }}
                    className="p-1.5 -ml-1 hover:bg-blue-50 active:bg-blue-100 text-blue-600 hover:text-blue-800 rounded-full transition-all cursor-pointer flex items-center justify-center"
                    title="Kembali ke Beranda"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-xs font-black tracking-widest leading-none uppercase text-slate-900">
                      DATA WARGA
                    </h1>
                    <span className="text-[9.5px] text-slate-400 font-bold tracking-wider mt-0.5 block">
                      RT 05 RW 02 • Total {wargaList.length} Warga
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Tombol Tambah Warga */}
                  <button
                    onClick={() => {
                      setNewNama("");
                      setNewKk("");
                      setNewNoRumah("");
                      setNewKategori("Warga Biasa");
                      setNewTarif(0);
                      setActiveScreen("ADD_WARGA");
                    }}
                    className="p-1.5 hover:bg-blue-50 active:bg-blue-100 text-blue-600 hover:text-blue-800 rounded-full transition-all cursor-pointer flex items-center justify-center"
                    title="Tambah Data Warga Baru"
                  >
                    <UserPlus className="w-5 h-5 stroke-[2.2]" />
                  </button>
                  {/* Tombol Menu Drawer */}
                  <button
                    onClick={() => setIsHeaderMenuOpen(true)}
                    className="p-1.5 hover:bg-blue-50 active:bg-blue-100 text-slate-600 hover:text-blue-600 rounded-full transition-all cursor-pointer flex items-center justify-center"
                    title="Menu Utama & Drawer Navigasi"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Kolom Pencarian + Tombol Refresh (Tanpa Frame) */}
              <div className="flex items-center gap-2 w-full">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari nama, no. rumah, atau no. KK..."
                    value={wargaSearchQuery}
                    onChange={(e) => setWargaSearchQuery(e.target.value)}
                    className="block w-full pl-9 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/60 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:outline-none rounded-xl text-xs font-semibold h-9 transition-all text-slate-800 placeholder:text-slate-400"
                  />
                  {wargaSearchQuery && (
                    <button
                      onClick={() => setWargaSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={async () => {
                    setIsRefreshingWarga(true);
                    try {
                      await loadData();
                    } finally {
                      setTimeout(() => {
                        setIsRefreshingWarga(false);
                      }, 500);
                    }
                  }}
                  className="p-2 hover:bg-blue-50 active:bg-blue-100 text-slate-500 hover:text-blue-600 rounded-full transition-all cursor-pointer shrink-0"
                  title="Refresh Data Warga"
                >
                  <RefreshCw className={`w-4 h-4 transition-transform ${isRefreshingWarga || isLoading ? "animate-spin text-blue-600" : ""}`} />
                </button>
              </div>
            </header>
          ) : activeScreen === "MANUAL" ? (
            <header className="bg-white text-slate-850 px-5 py-3 shrink-0 shadow-xs relative flex flex-col gap-2 border-b border-slate-100 z-30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveScreen("DASHBOARD");
                    }}
                    className="p-1.5 -ml-1 hover:bg-blue-50 active:bg-blue-100 text-blue-600 hover:text-blue-800 rounded-full transition-all cursor-pointer flex items-center justify-center"
                    title="Kembali ke Beranda"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-xs font-black tracking-widest leading-none uppercase text-slate-900">
                      BAYAR MANUAL
                    </h1>
                    <span className="text-[9.5px] text-slate-400 font-bold tracking-wider mt-0.5 block">
                      RT 05 RW 02 • Pilih Warga
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsHeaderMenuOpen(true)}
                  className="p-1.5 hover:bg-blue-50 active:bg-blue-100 text-slate-600 hover:text-blue-600 rounded-full transition-all cursor-pointer flex items-center justify-center"
                  title="Menu Utama & Drawer Navigasi"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>

              {/* Kolom Pencarian + Tombol Refresh (Ukuran Presisi Sama Dengan Data Warga) */}
              <div className="flex items-center gap-2 w-full">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari nama, no. rumah, atau no. KK..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-9 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/60 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:outline-none rounded-xl text-xs font-semibold h-9 transition-all text-slate-800 placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={async () => {
                    setIsRefreshingWarga(true);
                    try {
                      await loadData();
                    } finally {
                      setTimeout(() => {
                        setIsRefreshingWarga(false);
                      }, 500);
                    }
                  }}
                  className="p-2 hover:bg-blue-50 active:bg-blue-100 text-slate-500 hover:text-blue-600 rounded-full transition-all cursor-pointer shrink-0"
                  title="Muat Ulang Data"
                >
                  <RefreshCw className={`w-4 h-4 transition-transform ${isRefreshingWarga || isLoading ? "animate-spin text-blue-600" : ""}`} />
                </button>
              </div>
            </header>
          ) : (
            <header className="bg-white text-slate-850 px-5 py-4 shrink-0 shadow-xs relative flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20">
                  <QrCode className="w-5 h-5 text-white stroke-[2.5]" />
                </div>
                <div>
                  <h1 className="text-xs font-black tracking-widest leading-none uppercase text-slate-900">KOLEKTOR IURAN RT</h1>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-slate-500 font-bold tracking-wider">RT 05 RW 02</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold tracking-wider uppercase transition-all shrink-0 select-none bg-slate-100 text-slate-600">
                      {isOnline ? (
                        <>
                          <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-green-600">Cloud</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                          <span className="text-amber-600">Offline</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 relative">
                {!showMatrixModal && !showPendapatanModal && activeModal !== "LAPORAN" && activeScreen !== "DASHBOARD" && (
                  <button
                    onClick={() => {
                      setActiveScreen("DASHBOARD");
                    }}
                    className="p-2 hover:bg-blue-50 active:bg-blue-100 text-blue-600 hover:text-blue-800 rounded-full transition-all cursor-pointer flex items-center justify-center"
                    title="Kembali ke Beranda"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}

                <button
                  onClick={() => setIsHeaderMenuOpen(true)}
                  className="p-2 hover:bg-blue-50 active:bg-blue-100 text-blue-600 hover:text-blue-800 rounded-full transition-all cursor-pointer"
                  title="Menu Utama & Drawer Navigasi"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            </header>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* RINGKASAN DATA HARI INI - Selalu terpampang di halaman penjelajahan utama */}
          {(activeScreen === "DASHBOARD" || activeScreen === "SCAN") && (
            <div className="bg-white border-b border-slate-100/40 py-2.5 px-4 grid grid-cols-2 gap-2.5 shadow-none shrink-0">
              {/* Widget 1: Jumlah Transaksi Hari Ini */}
              <div className="bg-slate-50/50 border border-slate-200/50 rounded-xl p-2.5 flex flex-col justify-center">
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Setoran Sesi Ini</span>
                <div className="flex items-baseline gap-0.5 mt-0.5">
                  <span className="text-sm font-black text-slate-800 font-mono leading-none">{totalTransaksiHariIni}</span>
                  <span className="text-[9px] font-bold text-slate-500 leading-none">Warga</span>
                </div>
              </div>

              {/* Widget 2: Total Uang Diterima Hari Ini */}
              <div className="bg-blue-50/30 border border-blue-100/50 rounded-xl p-2.5 flex flex-col justify-center">
                <span className="text-[8.5px] font-black text-blue-500 uppercase tracking-widest block">Uang Terkumpul</span>
                <span className="text-xs font-black text-blue-800 font-mono mt-0.5 truncate leading-none">
                  {formatRupiah(totalUangDiterimaHariIni)}
                </span>
              </div>
            </div>
          )}



        {/* Loading utama */}
        {isLoading && activeScreen === "SCAN" && wargaList.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-slate-50">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <span className="text-xs font-bold text-slate-600">Sinkronisasi data warga...</span>
          </div>
        ) : (
          /* Area Isi Layar Dinamis */
          <main className={`flex-1 flex flex-col bg-slate-50 ${
            activeScreen === "MANUAL"
              ? "p-0 overflow-hidden"
              : activeScreen === "SCAN"
                ? "p-3.5 overflow-hidden"
                : "p-3.5 overflow-y-auto"
          }`}>
            <div className="flex flex-col flex-1 min-h-0">
                 {/* 0. LAYAR BERANDA / DASHBOARD */}
                {activeScreen === "DASHBOARD" && (
                  <div className="flex flex-col flex-1 justify-center space-y-3 py-1.5">
                    {/* Welcome banner */}
                    <div className="bg-blue-50/60 border border-[0.5px] border-blue-100/50 rounded-xl p-3 shadow-xs relative overflow-hidden flex justify-between items-center">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                      <div className="relative z-10">
                        <span className="text-[9px] font-black tracking-widest text-blue-600 uppercase block">
                          PETUGAS ({currentUser?.username === "admin" ? "ADMIN" : "KOLEKTOR"})
                        </span>
                        <h2 className="text-sm font-black text-slate-900 mt-0.5 font-sans capitalize">
                          {currentUser?.username || "Petugas Sesi"}
                        </h2>
                      </div>
                    </div>

                    {/* Core Quick Access Actions */}
                    <div className="space-y-2.5">
                      {/* Primary Giant Scan Action */}
                      <button
                        onClick={() => setActiveScreen("SCAN")}
                        className="w-full py-3 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-between shadow-md shadow-blue-600/20 group cursor-pointer transition-all duration-200 active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-9.5 h-9.5 bg-white/10 rounded-lg flex items-center justify-center border border-white/10 shrink-0">
                            <QrCode className="w-4.5 h-4.5 text-white" />
                          </div>
                          <div className="text-left">
                            <span className="text-[8px] font-black text-blue-200 uppercase tracking-widest block leading-none">
                              Mulai Pemindaian
                            </span>
                            <span className="text-[10.5px] font-black tracking-wide block mt-1 leading-none">
                              PINDAI QR KARTU WARGA
                            </span>
                          </div>
                        </div>
                        <div className="w-6.5 h-6.5 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/5 text-xs font-bold shrink-0">
                          →
                        </div>
                      </button>

                      {/* Secondary Actions in Grid */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          onClick={() => {
                            setManualSearchType("SEMUA");
                            setActiveScreen("MANUAL");
                          }}
                          className="p-3 bg-slate-50/80 hover:bg-slate-100/60 border border-[0.5px] border-slate-200/50 rounded-xl flex flex-col items-start gap-1.5 text-left transition-all cursor-pointer active:scale-[0.98] shadow-2xs"
                        >
                          <div className="w-8 h-8 bg-white border border-slate-200/40 rounded-lg flex items-center justify-center shadow-3xs shrink-0">
                            <Search className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <div>
                            <span className="text-[10.5px] font-black text-slate-800 block leading-none">Cari Manual</span>
                            <span className="text-[8px] text-slate-400 block mt-1 leading-tight">Nama / No. Rumah</span>
                          </div>
                        </button>

                        <button
                          onClick={() => setActiveScreen("MANAGE")}
                          className="p-3 bg-slate-50/80 hover:bg-slate-100/60 border border-[0.5px] border-slate-200/50 rounded-xl flex flex-col items-start gap-1.5 text-left transition-all cursor-pointer active:scale-[0.98] shadow-2xs"
                        >
                          <div className="w-8 h-8 bg-white border border-slate-200/40 rounded-lg flex items-center justify-center shadow-3xs shrink-0">
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <div>
                            <span className="text-[10.5px] font-black text-slate-800 block leading-none">Data Warga</span>
                            <span className="text-[8px] text-slate-400 block mt-1 leading-tight">Kelola & Cetak QR</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1. LAYAR SCAN QR CODE */}
                {activeScreen === "SCAN" && (
                  <div className="flex flex-col flex-1 justify-center items-center space-y-5 w-full max-w-sm mx-auto h-full overflow-hidden">
                    <ScannerSim
                      wargaList={wargaList}
                      onScanSuccess={handleScanSuccess}
                      onSwitchToManual={(searchType) => {
                        setManualSearchType(searchType || "SEMUA");
                        setActiveScreen("MANUAL");
                      }}
                    />
                    <button
                      onClick={() => setActiveScreen("DASHBOARD")}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-2xl transition-all cursor-pointer text-center shrink-0"
                    >
                      KEMBALI KE BERANDA
                    </button>
                  </div>
                )}

                {/* 2. LAYAR CARI MANUAL */}
                {activeScreen === "MANUAL" && (
                  <div
                    className="flex-1 flex flex-col overflow-y-auto px-1 py-1 min-h-0 relative scroll-smooth"
                    id="manual-scroll-container"
                    onScroll={(e) => {
                      setShowManualScrollTop(e.currentTarget.scrollTop > 80);
                    }}
                  >
                    <ManualSearch
                      query={searchQuery}
                      onSelectWarga={handleSelectWarga}
                      onBackToQR={() => {}}
                      currentUser={currentUser}
                      onRefreshData={() => {
                        DbService.getWargaList().then(setWargaList);
                        DbService.getTransactions().then(setTransactions);
                      }}
                    />

                    {/* Floating Panah Atas Dengan Garis (Back To Top - Lingkaran Transparan & Hilang di Atas) */}
                    {showManualScrollTop && (
                      <button
                        onClick={() => {
                          const el = document.getElementById("manual-scroll-container");
                          if (el) {
                            el.scrollTo({ top: 0, behavior: "smooth" });
                          } else {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        }}
                        className="sticky bottom-4 right-4 ml-auto mr-3 my-2 z-40 p-2.5 bg-white/40 backdrop-blur-md hover:bg-white/80 active:scale-95 text-blue-600 rounded-full shadow-md flex items-center justify-center transition-all cursor-pointer border border-blue-300/80 shrink-0"
                        title="Kembali Ke Atas"
                      >
                        <ArrowUpToLine className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                )}

                {/* 3. LAYAR DATA WARGA / MANAGE (LIST & CETAK QR) */}
                {activeScreen === "MANAGE" && (() => {
                  const filteredWarga = wargaList.filter((w) => {
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
                    <div className="flex flex-col flex-1 space-y-3">
                      {/* Resident Card List */}
                      <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                        {filteredWarga.length === 0 ? (
                          <div className="py-10 text-center border border-dashed border-slate-200 rounded-2xl bg-white text-slate-400">
                            <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                            <h4 className="text-xs font-bold text-slate-700">
                              {wargaSearchQuery ? "Warga Tidak Ditemukan" : "Database Kosong"}
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                              {wargaSearchQuery
                                ? `Tidak ada warga yang cocok dengan kata kunci "${wargaSearchQuery}".`
                                : "Belum ada warga yang terdaftar. Ketuk tombol + di pojok kanan atas untuk memasukkan data warga."}
                            </p>
                          </div>
                        ) : (
                          filteredWarga.map((w) => {
                          const isExpanded = expandedWargaId === w.id;
                          return (
                            <div
                              key={w.id}
                              className={`bg-white border ${isExpanded ? 'border-blue-200 shadow-xs' : 'border-[0.5px] border-slate-200/60'} rounded-xl p-2.5 flex flex-col justify-between gap-1.5 shadow-2xs hover:border-blue-100 transition-all`}
                            >
                              {deleteConfirmId === w.id && (
                                <div className="bg-rose-50 border border-rose-100 rounded-xl p-2.5 flex flex-col gap-2 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                    <p className="text-[10px] font-extrabold text-rose-800 leading-tight">
                                      Hapus warga <strong>{w.namaKepalaKeluarga}</strong> secara permanen?
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 self-end">
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setIsLoading(true);
                                        try {
                                          await DbService.deleteWarga(w.id);
                                          await loadData();
                                          setDeleteConfirmId(null);
                                        } catch (err) {
                                          console.error(err);
                                          alert("Gagal menghapus data warga.");
                                        } finally {
                                          setIsLoading(false);
                                        }
                                      }}
                                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[9px] rounded-md transition-all cursor-pointer active:scale-95 shadow-2xs"
                                    >
                                      Ya, Hapus
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmId(null);
                                      }}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[9px] rounded-md transition-all cursor-pointer active:scale-95"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Card Header: Clickable to toggle details */}
                              <div
                                onClick={() => setExpandedWargaId(isExpanded ? null : w.id)}
                                className="flex justify-between items-center cursor-pointer select-none group"
                              >
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="font-bold text-slate-800 text-[11px] truncate group-hover:text-blue-600 transition-colors">
                                      {w.namaKepalaKeluarga}
                                    </h4>
                                    {isExpanded ? (
                                      <ChevronUp className="w-3 h-3 text-slate-400 shrink-0 group-hover:text-blue-500 transition-colors" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 group-hover:text-blue-500 transition-colors" />
                                    )}
                                  </div>
                                  <div className="text-[9.5px] text-slate-500 font-semibold flex items-center gap-1.5 flex-wrap">
                                    <Home className={`w-3 h-3 ${getHomeIconColor(w.id)} shrink-0`} />
                                    <span>No. Rumah: {w.nomorRumah}</span>
                                  </div>
                                </div>

                                <span className="text-[10.5px] font-bold font-mono text-slate-700 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md shrink-0">
                                  {formatRupiah(w.tarifPerBulan)}
                                </span>
                              </div>

                              {/* Expanded details */}
                              {isExpanded && (
                                <div className="border-t border-slate-100 pt-2.5 mt-1 space-y-2.5">
                                  <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                                    <div>
                                      <span className="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">ID Warga</span>
                                      <span className="font-bold text-slate-700 font-mono">{w.id}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">Kategori Iuran</span>
                                      <span className="font-bold text-slate-700">{w.kategoriIuran}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">Nomor KK (Digital ID)</span>
                                      <span className="font-bold text-slate-700 font-mono tracking-wider">{w.nomorKk}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">No. WhatsApp / HP</span>
                                      <span className="font-bold text-slate-700 font-mono flex items-center gap-1">
                                        {w.nomorHp ? (
                                          <>
                                            <Phone className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                            <span>{w.nomorHp}</span>
                                          </>
                                        ) : (
                                          <span className="text-slate-400 italic font-sans font-normal text-[9px]">Belum diisi</span>
                                        )}
                                      </span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">Riwayat Pembayaran</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {w.historyPembayaran.length === 0 ? (
                                          <span className="text-slate-400 italic text-[9px] block py-0.5">Belum ada riwayat pembayaran</span>
                                        ) : (
                                          w.historyPembayaran.map((m) => (
                                            <span key={m} className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5 text-[8px] font-bold font-mono">
                                              {formatMonthId(m)}
                                            </span>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                                    {/* QR Mini Preview Trigger button */}
                                    <button
                                      onClick={() => setActiveCardWarga(w)}
                                      className="py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-[9px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 active:scale-95 border border-blue-100/60"
                                    >
                                      <Printer className="w-3 h-3" />
                                      <span>Cetak Kartu QR</span>
                                    </button>

                                    <div className="flex items-center gap-1.5">
                                      {/* Edit button */}
                                      <button
                                        onClick={() => handleEditWarga(w)}
                                        className="p-1.5 bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-md transition-colors cursor-pointer border border-slate-100"
                                        title="Edit Data Warga"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>

                                      {/* Hapus button */}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(w.id); }}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md transition-colors cursor-pointer border border-rose-100/30"
                                        title="Hapus Warga"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}

                {/* 4. LAYAR RINCIAN PEMBAYARAN WARGA */}
                {activeScreen === "PAYMENT" && selectedWarga && (
                  <div className="flex-1 flex flex-col overflow-y-auto px-1 py-1 min-h-0 relative scroll-smooth w-full" id="payment-scroll-container">
                    <WargaDetails
                      warga={selectedWarga}
                      onBack={() => {
                        setActiveScreen(paymentSource);
                        setSelectedWarga(null);
                      }}
                      onSubmitPayment={handlePaymentSubmit}
                      isSubmitting={isSubmitting}
                    />
                  </div>
                )}

                {/* 5. LAYAR BUKTI PEMBAYARAN / KUITANSI DIGITAL */}
                {activeScreen === "RECEIPT" && activeTransaction && (
                  <Receipt
                    transaction={activeTransaction}
                    onNewTransaction={() => {
                      setActiveTransaction(null);
                      setSelectedWarga(null);
                      setActiveScreen("SCAN");
                    }}
                    onGoHome={() => {
                      setActiveTransaction(null);
                      setSelectedWarga(null);
                      setActiveScreen("DASHBOARD");
                    }}
                  />
                )}

                {/* 6. LAYAR TAMBAH WARGA BARU (SUB-HALAMAN / MODAL) */}
                {activeScreen === "ADD_WARGA" && (
                  <div className="flex flex-col flex-1 w-full space-y-3">
                    <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-4 shadow-sm w-full">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="text-xs font-black tracking-widest uppercase text-slate-900">
                            TAMBAH WARGA BARU
                          </h3>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">
                            Isi data kepala keluarga baru untuk membuat kartu QR
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveScreen("MANAGE")}
                          className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-full transition-colors cursor-pointer shrink-0"
                          title="Tutup Modal"
                        >
                          <X className="w-5 h-5 stroke-[2.5]" />
                        </button>
                      </div>

                      <form
                        onSubmit={handleAddWarga}
                        className="space-y-4"
                      >
                      <div className="space-y-4">
                        <div className="flex flex-col space-y-1.5">
                          <label className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider">
                            Nama Kepala Keluarga:
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Ahmad Subardjo"
                            value={newNama}
                            onChange={(e) => setNewNama(e.target.value.toUpperCase())}
                            className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white h-12"
                          />
                        </div>

                        <div className="flex flex-col space-y-1.5">
                          <label className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider">
                            Nomor KK (Kartu Keluarga - 16 Digit):
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={16}
                            placeholder="Masukkan 16 digit nomor KK..."
                            value={newKk}
                            onChange={(e) => setNewKk(e.target.value.replace(/\D/g, ""))}
                            className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white h-12"
                          />
                          <p className="text-[9.5px] text-slate-400">
                            *Nomor KK ini akan menjadi dasar pembuatan QR Code unik warga secara otomatis.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider">
                              Nomor Rumah:
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Contoh: 15"
                              value={newNoRumah}
                              onChange={(e) => setNewNoRumah(e.target.value)}
                              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white h-12"
                            />
                          </div>

                          <div className="flex flex-col space-y-1.5">
                            <label className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider">
                              No. WhatsApp / HP:
                            </label>
                            <input
                              type="text"
                              placeholder="Contoh: 081234567890"
                              value={newNomorHp}
                              onChange={(e) => setNewNomorHp(e.target.value.replace(/[^\d+]/g, ""))}
                              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white h-12"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider">
                              Kategori Warga:
                            </label>
                            <select
                              value={newKategori}
                              onChange={(e) => setNewKategori(e.target.value as KategoriIuran)}
                              className="w-full px-2.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white h-12"
                            >
                              <option value="Warga Biasa">Warga Biasa</option>
                              <option value="Warga Usaha">Warga Usaha</option>
                              <option value="Warga Luar">Warga Luar</option>
                            </select>
                          </div>

                          <div className="flex flex-col space-y-1.5">
                            <label className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider">
                              Nama Kolektor:
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Contoh: Is Tentrem"
                              value={newNamaKolektor}
                              onChange={(e) => setNewNamaKolektor(e.target.value)}
                              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white h-12"
                            />
                          </div>
                        </div>

                        {/* Pilihan Jenis Iuran Warga */}
                        <div className="space-y-2.5 pt-1">
                          <label className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider block">
                            Pilihan Jenis Iuran Warga:
                          </label>

                          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => {
                                setNewIuranMode("SEMUA");
                                setNewIuranAktif(iuranConfigList.map((i) => i.id));
                              }}
                              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                                newIuranMode === "SEMUA"
                                  ? "bg-blue-50/70 border-blue-500 text-blue-900 shadow-3xs"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${newIuranMode === "SEMUA" ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}>
                                {newIuranMode === "SEMUA" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                              </div>
                              <div>
                                <div className="font-extrabold text-[11px]">Pilih Semua ({iuranConfigList.length} Jenis)</div>
                                <div className="text-[9px] text-slate-400 font-medium">Standard Default</div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setNewIuranMode("KUSTOM")}
                              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                                newIuranMode === "KUSTOM"
                                  ? "bg-blue-50/70 border-blue-500 text-blue-900 shadow-3xs"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${newIuranMode === "KUSTOM" ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}>
                                {newIuranMode === "KUSTOM" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                              </div>
                              <div>
                                <div className="font-extrabold text-[11px]">Pilih Kustom</div>
                                <div className="text-[9px] text-slate-400 font-medium">Centang Mandiri</div>
                              </div>
                            </button>
                          </div>

                          {/* Checkbox List for Iuran Items */}
                          <div className="space-y-1.5 bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                            {iuranConfigList.map((item) => {
                              const isChecked = newIuranAktif.includes(item.id);
                              const itemPrice = item.isKategoriBased && item.nominalByKategori
                                ? (item.nominalByKategori[newKategori] ?? 0)
                                : (item.nominalDefault ?? 0);

                              return (
                                <label
                                  key={item.id}
                                  className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                                    isChecked
                                      ? "bg-white border-blue-300/80 shadow-3xs text-slate-800"
                                      : "bg-slate-100/60 border-transparent text-slate-400 opacity-60"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={newIuranMode === "SEMUA"}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setNewIuranAktif([...newIuranAktif, item.id]);
                                        } else {
                                          setNewIuranAktif(newIuranAktif.filter((id) => id !== item.id));
                                        }
                                      }}
                                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="text-xs font-extrabold">{item.nama}</span>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-blue-700">
                                    Rp {formatWithDots(itemPrice)} / bln
                                  </span>
                                </label>
                              );
                            })}

                            {/* Ringkasan Total Tarif */}
                            <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
                              <div>
                                <span className="text-[10px] font-extrabold text-blue-900 uppercase tracking-tight block">
                                  Total Iuran Harus Dibayar
                                </span>
                                <span className="text-[9px] font-semibold text-blue-700">
                                  {newIuranAktif.length} dari {iuranConfigList.length} jenis iuran aktif
                                </span>
                              </div>
                              <span className="text-sm font-mono font-black text-blue-800">
                                Rp {formatWithDots(newTarif)} / bln
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveScreen("MANAGE")}
                          className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl text-center cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                        >
                          {isSubmitting ? "Menyimpan..." : (
                            <>
                              <Plus className="w-4 h-4 text-white" />
                              <span>Simpan Warga Baru</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

                {/* 7. LAYAR EDIT DATA WARGA (SUB-HALAMAN / MODAL) */}
                {activeScreen === "EDIT_WARGA" && editingWarga && (
                  <div className="flex flex-col flex-1 w-full space-y-3">
                    <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-4 shadow-sm w-full">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="text-xs font-black tracking-widest uppercase text-slate-900">
                            EDIT DATA WARGA
                          </h3>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">
                            Perbarui data kepala keluarga dan simpan perubahan
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingWarga(null);
                            setActiveScreen("MANAGE");
                          }}
                          className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-full transition-colors cursor-pointer shrink-0"
                          title="Tutup Modal"
                        >
                          <X className="w-5 h-5 stroke-[2.5]" />
                        </button>
                      </div>

                      <form
                        onSubmit={handleUpdateWarga}
                        className="space-y-4"
                      >
                      <div className="space-y-4">
                        <div className="flex flex-col space-y-1.5">
                          <label className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider">
                            Nama Kepala Keluarga:
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Ahmad Subardjo"
                            value={editNama}
                            onChange={(e) => setEditNama(e.target.value.toUpperCase())}
                            className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white h-12"
                          />
                        </div>

                        <div className="flex flex-col space-y-1.5">
                          <label className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider">
                            Nomor KK (Kartu Keluarga - 16 Digit):
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={16}
                            placeholder="Masukkan 16 digit nomor KK..."
                            value={editKk}
                            onChange={(e) => setEditKk(e.target.value.replace(/\D/g, ""))}
                            className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white h-12"
                          />
                          <p className="text-[9.5px] text-slate-400">
                            *Mengubah nomor KK juga akan memperbarui kode QR warga secara otomatis.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider">
                              Nomor Rumah:
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Contoh: 15"
                              value={editNoRumah}
                              onChange={(e) => setEditNoRumah(e.target.value)}
                              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white h-12"
                            />
                          </div>

                          <div className="flex flex-col space-y-1.5">
                            <label className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider">
                              No. WhatsApp / HP:
                            </label>
                            <input
                              type="text"
                              placeholder="Contoh: 081234567890"
                              value={editNomorHp}
                              onChange={(e) => setEditNomorHp(e.target.value.replace(/[^\d+]/g, ""))}
                              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white h-12"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider">
                              Kategori Warga:
                            </label>
                            <select
                              value={editKategori}
                              onChange={(e) => setEditKategori(e.target.value as KategoriIuran)}
                              className="w-full px-2.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white h-12"
                            >
                              <option value="Warga Biasa">Warga Biasa</option>
                              <option value="Warga Usaha">Warga Usaha</option>
                              <option value="Warga Luar">Warga Luar</option>
                            </select>
                          </div>

                          <div className="flex flex-col space-y-1.5">
                            <label className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider">
                              Nama Kolektor:
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Contoh: Is Tentrem"
                              value={editNamaKolektor}
                              onChange={(e) => setEditNamaKolektor(e.target.value)}
                              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white h-12"
                            />
                          </div>
                        </div>

                        {/* Pilihan Jenis Iuran Warga */}
                        <div className="space-y-2.5 pt-1">
                          <label className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider block">
                            Pilihan Jenis Iuran Warga:
                          </label>

                          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => {
                                setEditIuranMode("SEMUA");
                                setEditIuranAktif(iuranConfigList.map((i) => i.id));
                              }}
                              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                                editIuranMode === "SEMUA"
                                  ? "bg-blue-50/70 border-blue-500 text-blue-900 shadow-3xs"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${editIuranMode === "SEMUA" ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}>
                                {editIuranMode === "SEMUA" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                              </div>
                              <div>
                                <div className="font-extrabold text-[11px]">Pilih Semua ({iuranConfigList.length} Jenis)</div>
                                <div className="text-[9px] text-slate-400 font-medium">Standard Default</div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditIuranMode("KUSTOM")}
                              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                                editIuranMode === "KUSTOM"
                                  ? "bg-blue-50/70 border-blue-500 text-blue-900 shadow-3xs"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${editIuranMode === "KUSTOM" ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}>
                                {editIuranMode === "KUSTOM" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                              </div>
                              <div>
                                <div className="font-extrabold text-[11px]">Pilih Kustom</div>
                                <div className="text-[9px] text-slate-400 font-medium">Centang Mandiri</div>
                              </div>
                            </button>
                          </div>

                          {/* Checkbox List for Iuran Items */}
                          <div className="space-y-1.5 bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                            {iuranConfigList.map((item) => {
                              const isChecked = editIuranAktif.includes(item.id);
                              const itemPrice = item.isKategoriBased && item.nominalByKategori
                                ? (item.nominalByKategori[editKategori] ?? 0)
                                : (item.nominalDefault ?? 0);

                              return (
                                <label
                                  key={item.id}
                                  className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                                    isChecked
                                      ? "bg-white border-blue-300/80 shadow-3xs text-slate-800"
                                      : "bg-slate-100/60 border-transparent text-slate-400 opacity-60"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={editIuranMode === "SEMUA"}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setEditIuranAktif([...editIuranAktif, item.id]);
                                        } else {
                                          setEditIuranAktif(editIuranAktif.filter((id) => id !== item.id));
                                        }
                                      }}
                                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="text-xs font-extrabold">{item.nama}</span>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-blue-700">
                                    Rp {formatWithDots(itemPrice)} / bln
                                  </span>
                                </label>
                              );
                            })}

                            {/* Ringkasan Total Tarif */}
                            <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
                              <div>
                                <span className="text-[10px] font-extrabold text-blue-900 uppercase tracking-tight block">
                                  Total Iuran Harus Dibayar
                                </span>
                                <span className="text-[9px] font-semibold text-blue-700">
                                  {editIuranAktif.length} dari {iuranConfigList.length} jenis iuran aktif
                                </span>
                              </div>
                              <span className="text-sm font-mono font-black text-blue-800">
                                Rp {formatWithDots(editTarif)} / bln
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWarga(null);
                            setActiveScreen("MANAGE");
                          }}
                          className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl text-center cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                        >
                          {isSubmitting ? "Menyimpan..." : (
                            <>
                              <Save className="w-4 h-4 text-white" />
                              <span>Simpan Perubahan</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </main>
        )}

        </div>

        {/* Footer info perlindungan & branding */}
        <footer className="bg-white border-t border-slate-100 text-[10px] text-slate-500 py-3 text-center shrink-0 flex items-center justify-center relative select-none min-h-[44px]">
          {activeScreen !== "DASHBOARD" && (
            <button
              onClick={() => {
                setSearchQuery("");
                setEditingWarga(null);
                setSelectedWarga(null);
                setActiveTransaction(null);
                setActiveScreen("DASHBOARD");
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-800 active:scale-90 transition-all flex items-center justify-center cursor-pointer p-1"
              title="Kembali ke Beranda"
              id="back-to-home-btn"
            >
              <ArrowLeft className="w-5.5 h-5.5 stroke-[1.5]" />
            </button>
          )}
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>RT 05 RW 02 Cilangkap Tapos Depok</span>
          </div>
        </footer>

        {/* Backdrop for history tray */}
        <AnimatePresence>
          {showHistoryTray && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryTray(false)}
              className="absolute inset-0 bg-slate-900/30 z-20"
            />
          )}
        </AnimatePresence>

        {/* Floating Recent Transactions Toggle Arrow */}
        {activeScreen === "DASHBOARD" && (
          <div className="absolute bottom-14 right-4 z-40">
            <button
              onClick={() => setShowHistoryTray(!showHistoryTray)}
              className="w-8 h-8 bg-white hover:bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center shadow-md shadow-blue-500/5 cursor-pointer transition-all duration-200 active:scale-90"
              title="Riwayat Transaksi Terbaru"
            >
              <ChevronUp
                className={`w-4 h-4 text-blue-500 stroke-[1.5] transition-transform duration-300 ${
                  showHistoryTray ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        )}

        {/* Recent Transactions Full Drawer (Stops right under Header) */}
        <AnimatePresence>
          {showHistoryTray && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="absolute top-[68px] sm:top-[96px] bottom-0 left-0 right-0 bg-white shadow-2xl z-30 flex flex-col border-t border-slate-200 overflow-hidden"
            >
              {/* Bottom Sheet Header */}
              <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100 shrink-0 bg-white shadow-2xs">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    Riwayat Transaksi Setoran
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    RT 05 RW 02 • Total {transactions.length} Setoran Masuk
                  </p>
                </div>
                <button
                  onClick={() => setShowHistoryTray(false)}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
                  title="Tutup Riwayat"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Scrollable List Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Clock className="w-10 h-10 text-slate-300 stroke-[1.5] mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Belum ada transaksi</p>
                    <p className="text-[9px] text-slate-400 mt-1 text-center px-6">
                      Setoran iuran warga yang berhasil dicatat akan muncul di sini.
                    </p>
                  </div>
                ) : (
                  [...transactions]
                    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                    .map((tx) => {
                      // Format Date
                      const d = new Date(tx.tanggal);
                      const day = d.getDate();
                      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
                      const hh = String(d.getHours()).padStart(2, '0');
                      const mm = String(d.getMinutes()).padStart(2, '0');
                      const formattedDate = `${day} ${monthNames[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;

                      // Format Period (From... To...)
                      const sortedMonths = [...tx.bulanBayar].sort();
                      const periodLabel = sortedMonths.length === 0 
                        ? "-" 
                        : sortedMonths.length === 1 
                        ? formatMonthId(sortedMonths[0]) 
                        : `${formatMonthId(sortedMonths[0])} s/d ${formatMonthId(sortedMonths[sortedMonths.length - 1])}`;

                      return (
                        <div
                          key={tx.id}
                          onClick={() => {
                            setActiveTransaction(tx);
                            setActiveScreen("RECEIPT");
                            setShowHistoryTray(false);
                          }}
                          className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all flex justify-between items-center cursor-pointer active:scale-[0.99]"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-800">{tx.wargaNama}</span>
                              <span className="text-[9px] font-extrabold text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded-md">
                                No. {tx.wargaNomorRumah}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                              <span className="text-blue-600 font-bold bg-blue-50/70 px-1.5 py-0.5 rounded-sm text-[9px]">
                                Bulan: {periodLabel}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-slate-400 text-[9px]">{formattedDate}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-black text-slate-900 font-mono block">
                              {formatRupiah(tx.totalBayar)}
                            </span>
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1 py-0.5 rounded-sm">
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OVERLAY MODAL INTERAKTIF UNTUK MENU HEADER (LAPORAN, EXPORT, IMPORT, PENGATURAN) */}
        <AnimatePresence>
          {activeModal !== "NONE" && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="absolute inset-0 z-50 bg-slate-50 flex flex-col overflow-hidden"
            >
              {/* Header Overlay Modal */}
              <div className="shrink-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between shadow-3xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">
                    {activeModal === "LAPORAN" && "📊"}
                    {activeModal === "EXPORT" && "📤"}
                    {activeModal === "IMPORT" && "📥"}
                    {activeModal === "PENGATURAN" && "⚙️"}
                    {activeModal === "PWA_GUIDE" && "📱"}
                  </span>
                  <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase font-sans">
                    {activeModal === "LAPORAN" && "LAPORAN PENDAPATAN"}
                    {activeModal === "EXPORT" && "EXPORT EXCEL"}
                    {activeModal === "IMPORT" && "IMPORT EXCEL"}
                    {activeModal === "PENGATURAN" && "PENGATURAN & STORAGE"}
                    {activeModal === "PWA_GUIDE" && "PANDUAN INSTAL APLIKASI HANDPHONE"}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setActiveModal("NONE");
                    setSettingsMessage(null);
                    setImportError(null);
                    setImportParsedWarga([]);
                    setImportSuccessCount(null);
                  }}
                  className="p-1.5 hover:bg-slate-100 active:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-all cursor-pointer flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Isi Konten Overlay */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 1. VIEW LAPORAN */}
                {activeModal === "LAPORAN" && (
                  <div className="space-y-4">
                    {/* Pemilihan Periode */}
                    <div className="bg-white border border-slate-200/60 rounded-xl p-3.5 space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                        Pilih Periode Iuran
                      </label>
                      <select
                        value={reportFilterMonth}
                        onChange={(e) => setReportFilterMonth(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/15 focus:outline-none transition-all"
                      >
                        {LIST_BULAN_2026.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.namaBulan}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Ringkasan Data Laporan */}
                    {(() => {
                      const lunasList = wargaList.filter((w) => w.historyPembayaran.includes(reportFilterMonth));
                      const belumLunasList = wargaList.filter((w) => !w.historyPembayaran.includes(reportFilterMonth));
                      const totalTerkumpul = lunasList.reduce((sum, w) => sum + w.tarifPerBulan, 0);
                      const totalTunggakan = belumLunasList.reduce((sum, w) => sum + w.tarifPerBulan, 0);

                      const q = reportSearchQuery.toLowerCase().trim();
                      const filteredLunas = lunasList.filter(
                        (w) =>
                          w.namaKepalaKeluarga.toLowerCase().includes(q) ||
                          w.nomorRumah.toLowerCase().includes(q)
                      );
                      const filteredBelumLunas = belumLunasList.filter(
                        (w) =>
                          w.namaKepalaKeluarga.toLowerCase().includes(q) ||
                          w.nomorRumah.toLowerCase().includes(q)
                      );

                      return (
                        <>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="bg-emerald-50 border border-emerald-100/50 p-3 rounded-xl">
                              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block">
                                Uang Terkumpul
                              </span>
                              <span className="text-xs font-black text-emerald-800 font-mono block mt-0.5">
                                {formatRupiah(totalTerkumpul)}
                              </span>
                              <span className="text-[9px] text-emerald-600/80 font-bold block mt-1">
                                {lunasList.length} Warga Lunas
                              </span>
                            </div>
                            <div className="bg-amber-50 border border-amber-100/50 p-3 rounded-xl">
                              <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest block">
                                Belum Terbayar
                              </span>
                              <span className="text-xs font-black text-amber-800 font-mono block mt-0.5">
                                {formatRupiah(totalTunggakan)}
                              </span>
                              <span className="text-[9px] text-amber-600/80 font-bold block mt-1">
                                {belumLunasList.length} Warga Belum Bayar
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handlePrintReport(reportFilterMonth)}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                          >
                            <Printer className="w-4 h-4" />
                            CETAK LAPORAN (PDF)
                          </button>

                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                              type="text"
                              placeholder="Cari nama atau no. rumah..."
                              value={reportSearchQuery}
                              onChange={(e) => setReportSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                            />
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                Lunas ({lunasList.length})
                              </h4>
                              {filteredLunas.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic bg-white p-2.5 border rounded-xl text-center">
                                  Tidak ada warga lunas yang cocok
                                </p>
                              ) : (
                                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                  {filteredLunas.map((w) => (
                                    <div
                                      key={w.id}
                                      className="bg-white border border-slate-100 p-2 rounded-lg flex items-center justify-between text-xs font-semibold"
                                    >
                                      <div>
                                        <p className="text-slate-800 font-bold">{w.namaKepalaKeluarga}</p>
                                        <p className="text-[9px] text-slate-400">Rumah {w.nomorRumah}</p>
                                      </div>
                                      <span className="text-[8.5px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                        LUNAS
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                Belum Bayar ({belumLunasList.length})
                              </h4>
                              {filteredBelumLunas.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic bg-white p-2.5 border rounded-xl text-center">
                                  Semua warga telah melunasi iuran bulan ini
                                </p>
                              ) : (
                                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                  {filteredBelumLunas.map((w) => (
                                    <div
                                      key={w.id}
                                      className="bg-white border border-slate-100 p-2 rounded-lg flex items-center justify-between text-xs font-semibold"
                                    >
                                      <div>
                                        <p className="text-slate-800 font-bold">{w.namaKepalaKeluarga}</p>
                                        <p className="text-[9px] text-slate-400">Rumah {w.nomorRumah}</p>
                                      </div>
                                      <span className="text-[8.5px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                        BELUM
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* 2. VIEW EXPORT */}
                {activeModal === "EXPORT" && (
                  <div className="space-y-4">
                    <div className="bg-white border border-slate-200/60 rounded-xl p-4 text-center space-y-3 shadow-2xs">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-800">Export ke Format Excel</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                          Seluruh basis data warga dan riwayat pembayaran transaksi iuran akan diunduh ke dalam satu file Excel multi-sheet (.xlsx).
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-100/50 rounded-xl p-3.5 space-y-2 border border-slate-200/40 text-[10px] text-slate-500 font-semibold leading-relaxed">
                      <p className="font-bold text-slate-700">📋 Informasi Sheet yang Diekspor:</p>
                      <ul className="list-disc list-inside space-y-1 pl-1">
                        <li>Sheet <strong className="text-slate-800">Daftar_Warga</strong>: ID, Nama, No. KK, No. Rumah, Kategori, Tarif, dan Riwayat Pembayaran.</li>
                        <li>Sheet <strong className="text-slate-800">Riwayat_Iuran</strong>: Semua histori kuitansi transaksi pembayaran terkumpul.</li>
                      </ul>
                    </div>

                    <button
                      onClick={handleExportToExcel}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <Download className="w-4 h-4" />
                      DOWNLOAD FILE EXCEL (.xlsx)
                    </button>
                  </div>
                )}

                {/* 3. VIEW IMPORT */}
                {activeModal === "IMPORT" && (
                  <div className="space-y-4">
                    <div className="bg-white border border-slate-200/60 rounded-xl p-4 text-center space-y-3 shadow-2xs">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-800">Unggah File Spreadsheet</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-semibold font-sans">
                          Sistem mendeteksi kolom nama, nomor KK, nomor rumah, kategori, dan iuran bulanan secara otomatis dari file Excel (.xlsx).
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 space-y-1.5 text-left text-[10px] text-blue-800 leading-relaxed font-semibold">
                      <p className="font-extrabold text-blue-900 flex items-center gap-1.5">
                        💡 Format Riwayat Pembayaran (History):
                      </p>
                      <p>
                        Jika warga sudah membayar beberapa bulan sebelumnya (misal sampai Juni 2026), Anda dapat mengisi kolom <strong className="text-blue-950 font-black">History</strong> di Excel dengan format nama bulan <strong className="text-blue-950 font-black">YYYY-MM</strong> yang dipisahkan koma, seperti:
                      </p>
                      <p className="font-mono bg-blue-100/50 p-1.5 rounded text-blue-900 text-[9.5px] font-bold border border-blue-200">
                        2026-01, 2026-02, 2026-03, 2026-04, 2026-05, 2026-06
                      </p>
                      <p>
                        *Aplikasi mendeteksi format ini secara otomatis agar warga langsung berstatus Lunas hingga bulan Juni!
                      </p>
                    </div>

                    {importSuccessCount === null && importParsedWarga.length === 0 && (
                      <div
                        onDragOver={(e) => { e.preventDefault(); setImportDragOver(true); }}
                        onDragLeave={() => setImportDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setImportDragOver(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) {
                            const inputEl = document.getElementById("file-import-input") as HTMLInputElement;
                            if (inputEl) {
                              const dt = new DataTransfer();
                              dt.items.add(file);
                              inputEl.files = dt.files;
                              const event = { target: inputEl } as any;
                              handleImportExcel(event);
                            }
                          }
                        }}
                        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                          importDragOver ? "border-indigo-500 bg-indigo-50/40" : "border-slate-200 hover:border-indigo-400 bg-white"
                        }`}
                        onClick={() => document.getElementById("file-import-input")?.click()}
                      >
                        <input
                          id="file-import-input"
                          type="file"
                          accept=".xlsx, .xls"
                          onChange={handleImportExcel}
                          className="hidden"
                        />
                        <Upload className="w-7 h-7 text-indigo-500 animate-pulse" />
                        <p className="text-xs font-black text-slate-700">Tarik & Lepas File di Sini</p>
                        <p className="text-[9px] text-slate-400 font-semibold">atau ketuk untuk memilih file (.xlsx)</p>
                      </div>
                    )}

                    {importError && (
                      <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-[10px] font-semibold flex items-start gap-1.5 animate-fadeIn">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{importError}</span>
                      </div>
                    )}

                    {importSuccessCount !== null && (
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-center space-y-3 animate-fadeIn">
                        <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                          <Check className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-emerald-800">Impor Berhasil!</h4>
                          <p className="text-[10px] text-emerald-600 font-bold leading-relaxed">
                            Sebanyak {importSuccessCount} data warga berhasil disinkronkan dan disimpan secara aman di cloud database.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setImportSuccessCount(null);
                            setImportParsedWarga([]);
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg transition-colors cursor-pointer"
                        >
                          SELESAI
                        </button>
                      </div>
                    )}

                    {importParsedWarga.length > 0 && (
                      <div className="space-y-2.5 animate-fadeIn">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                            Pratinjau Data ({importParsedWarga.length} Warga)
                          </h4>
                          <button
                            onClick={() => setImportParsedWarga([])}
                            className="text-[10px] font-bold text-rose-550 hover:underline cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>

                        <div className="space-y-1 max-h-48 overflow-y-auto border border-slate-200/50 rounded-xl bg-white p-1.5 divide-y">
                          {importParsedWarga.map((w, idx) => {
                            const isExisting = wargaList.some((ex) => ex.nomorKk === w.nomorKk);
                            return (
                              <div key={idx} className="py-2 px-1.5 flex items-center justify-between text-xs font-semibold">
                                <div>
                                  <p className="text-slate-800 font-black">{w.namaKepalaKeluarga}</p>
                                  <p className="text-[9px] text-slate-400">No. Rumah: {w.nomorRumah} • KK: {w.nomorKk.slice(0, 4)}...</p>
                                </div>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                  isExisting ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                }`}>
                                  {isExisting ? "Update" : "Baru"}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          onClick={handleSaveImportedData}
                          disabled={isSubmitting}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-blue-400 transition-all active:scale-[0.98]"
                        >
                          <Save className="w-4 h-4" />
                          {isSubmitting ? "MENYIMPAN DATA..." : "KONFIRMASI & SIMPAN KE DATABASE"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. VIEW PENGATURAN */}
                {activeModal === "PENGATURAN" && (
                  <div className="space-y-4">
                    {/* Pengaturan Jenis & Tarif Iuran (Fitur Utama Paling Atas) */}
                    <div className="bg-white border border-slate-200/60 rounded-xl p-3.5 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-blue-600 shrink-0" />
                          <div>
                            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-tight font-sans">
                              Pengaturan Jenis & Tarif Iuran
                            </h4>
                            <p className="text-[9px] text-slate-400 font-medium">
                              Atur nama dan besaran iuran secara dinamis
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                        {iuranConfigList.map((item, index) => (
                          <div key={item.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                value={item.nama}
                                onChange={(e) => {
                                  const updated = [...iuranConfigList];
                                  updated[index].nama = e.target.value;
                                  setIuranConfigList(updated);
                                }}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex-1"
                                placeholder="Nama Jenis Iuran"
                              />
                              {iuranConfigList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = iuranConfigList.filter((_, i) => i !== index);
                                    setIuranConfigList(updated);
                                  }}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Iuran Ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Mode Tarif: Sama Semua vs Beda Kategori */}
                            <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-600 bg-white/80 p-1.5 rounded-lg border border-slate-150">
                              <span>Sifat Tarif:</span>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...iuranConfigList];
                                    updated[index].isKategoriBased = false;
                                    if (updated[index].nominalDefault === undefined) {
                                      updated[index].nominalDefault = 10000;
                                    }
                                    setIuranConfigList(updated);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold transition-all cursor-pointer ${
                                    !item.isKategoriBased ? "bg-blue-600 text-white shadow-3xs" : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  Flat Semua
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...iuranConfigList];
                                    updated[index].isKategoriBased = true;
                                    if (!updated[index].nominalByKategori) {
                                      updated[index].nominalByKategori = {
                                        "Warga Biasa": 15000,
                                        "Warga Usaha": 25000,
                                        "Warga Luar": 20000,
                                      };
                                    }
                                    setIuranConfigList(updated);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold transition-all cursor-pointer ${
                                    item.isKategoriBased ? "bg-blue-600 text-white shadow-3xs" : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  Per Kategori
                                </button>
                              </div>
                            </div>

                            {!item.isKategoriBased ? (
                              <div>
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">
                                  Besar Tarif Bulanan (Rp)
                                </label>
                                <input
                                  type="text"
                                  value={formatWithDots(item.nominalDefault ?? 0)}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0;
                                    const updated = [...iuranConfigList];
                                    updated[index].nominalDefault = val;
                                    setIuranConfigList(updated);
                                  }}
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                                <div>
                                  <label className="text-[8px] font-black text-slate-500 block mb-0.5 truncate">
                                    Warga Biasa
                                  </label>
                                  <input
                                    type="text"
                                    value={formatWithDots(item.nominalByKategori?.["Warga Biasa"] ?? 0)}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0;
                                      const updated = [...iuranConfigList];
                                      if (!updated[index].nominalByKategori) {
                                        updated[index].nominalByKategori = { "Warga Biasa": 0, "Warga Usaha": 0, "Warga Luar": 0 };
                                      }
                                      updated[index].nominalByKategori!["Warga Biasa"] = val;
                                      setIuranConfigList(updated);
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] font-black text-slate-500 block mb-0.5 truncate">
                                    Warga Usaha
                                  </label>
                                  <input
                                    type="text"
                                    value={formatWithDots(item.nominalByKategori?.["Warga Usaha"] ?? 0)}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0;
                                      const updated = [...iuranConfigList];
                                      if (!updated[index].nominalByKategori) {
                                        updated[index].nominalByKategori = { "Warga Biasa": 0, "Warga Usaha": 0, "Warga Luar": 0 };
                                      }
                                      updated[index].nominalByKategori!["Warga Usaha"] = val;
                                      setIuranConfigList(updated);
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] font-black text-slate-500 block mb-0.5 truncate">
                                    Warga Luar
                                  </label>
                                  <input
                                    type="text"
                                    value={formatWithDots(item.nominalByKategori?.["Warga Luar"] ?? 0)}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0;
                                      const updated = [...iuranConfigList];
                                      if (!updated[index].nominalByKategori) {
                                        updated[index].nominalByKategori = { "Warga Biasa": 0, "Warga Usaha": 0, "Warga Luar": 0 };
                                      }
                                      updated[index].nominalByKategori!["Warga Luar"] = val;
                                      setIuranConfigList(updated);
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const newId = `iuran_${Date.now()}`;
                            setIuranConfigList([
                              ...iuranConfigList,
                              {
                                id: newId,
                                nama: `Iuran Tambahan ${iuranConfigList.length + 1}`,
                                isKategoriBased: false,
                                nominalDefault: 5000,
                              },
                            ]);
                          }}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Jenis Iuran Baru</span>
                        </button>
                      </div>

                      {iuranSaveMessage && (
                        <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-[9px] font-bold text-emerald-700 text-center animate-fadeIn">
                          {iuranSaveMessage}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          localStorage.setItem("kolektor_iuran_config", JSON.stringify(iuranConfigList));
                          setIuranSaveMessage("Pengaturan jenis & tarif iuran berhasil disimpan!");
                          setTimeout(() => setIuranSaveMessage(null), 3000);
                        }}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>SIMPAN PENGATURAN IURAN</span>
                      </button>
                    </div>

                    {/* Form Ganti Password */}
                    <div className="bg-white border border-slate-200/60 rounded-xl p-3.5 space-y-3 shadow-2xs">
                      <div className="flex items-center gap-2 pb-1 border-b">
                        <Lock className="w-4 h-4 text-blue-600" />
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-tight font-sans">Ganti Kata Sandi Petugas</h4>
                      </div>

                      <div className="flex bg-slate-50 rounded-lg p-1 border border-slate-200/50 grid grid-cols-2 text-center text-[10px] font-black">
                        <button
                          onClick={() => { setSettingsRoleToChange("admin"); setSettingsMessage(null); }}
                          className={`py-1 rounded-md transition-all ${settingsRoleToChange === "admin" ? "bg-white text-slate-800 shadow-3xs" : "text-slate-400 hover:text-slate-600 cursor-pointer"}`}
                        >
                          Administrator
                        </button>
                        <button
                          onClick={() => { setSettingsRoleToChange("kolektor"); setSettingsMessage(null); }}
                          className={`py-1 rounded-md transition-all ${settingsRoleToChange === "kolektor" ? "bg-white text-slate-800 shadow-3xs" : "text-slate-400 hover:text-slate-600 cursor-pointer"}`}
                        >
                          Kolektor Sesi
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                            Sandi Lama
                          </label>
                          <input
                            type="password"
                            value={settingsOldPassword}
                            onChange={(e) => setSettingsOldPassword(e.target.value)}
                            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                            placeholder="Masukkan sandi saat ini"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                            Sandi Baru
                          </label>
                          <input
                            type="password"
                            value={settingsNewPassword}
                            onChange={(e) => setSettingsNewPassword(e.target.value)}
                            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                            placeholder="Minimal 4 karakter"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                            Konfirmasi Sandi Baru
                          </label>
                          <input
                            type="password"
                            value={settingsConfirmPassword}
                            onChange={(e) => setSettingsConfirmPassword(e.target.value)}
                            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                            placeholder="Ulangi sandi baru"
                          />
                        </div>
                      </div>

                      {settingsMessage && (
                        <div className={`p-2.5 rounded-xl text-[9px] font-semibold text-center animate-fadeIn ${settingsMessage.isError ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
                          {settingsMessage.text}
                        </div>
                      )}

                      <button
                        onClick={handleChangePassword}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition-all active:scale-[0.98]"
                      >
                        SIMPAN SANDI BARU
                      </button>
                    </div>

                    {/* Info Storage */}
                    <div className="bg-white border border-slate-200/60 rounded-xl p-3.5 space-y-3 shadow-2xs">
                      <div className="flex items-center gap-2 pb-1 border-b">
                        <Database className="w-4 h-4 text-blue-600" />
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-tight font-sans">Kapasitas Penyimpanan</h4>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-slate-500">Firebase Cloud (Firestore)</span>
                          <span className="text-slate-800 font-mono">
                            {(wargaList.length + transactions.length)} Dokumen / 1 GB Quota
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(1, ((wargaList.length + transactions.length) / 50000) * 100))}%` }}
                          />
                        </div>
                        <div className="text-[8.5px] text-slate-400 font-bold leading-relaxed flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
                          <span>Penyimpanan awan berkapasitas besar. Sisa kuota harian: 100%.</span>
                        </div>
                      </div>

                      {(() => {
                        const localLengthBytes = JSON.stringify(localStorage).length;
                        const localLengthKB = localLengthBytes / 1024;
                        const percentUsed = (localLengthKB / 5120) * 100;

                        return (
                          <div className="space-y-1.5 pt-2 border-t border-dashed">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-slate-500">Penyimpanan Browser Lokal</span>
                              <span className="text-slate-800 font-mono">
                                {localLengthKB.toFixed(2)} KB / 5.00 MB
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(1, percentUsed))}%` }}
                              />
                            </div>
                            <div className="text-[8.5px] text-slate-400 font-bold leading-relaxed flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                              <span>Digunakan sebagai cadangan cache aman saat offline.</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* MODAL PANDUAN PWA DIHAPUS */}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL / POPUP CETAK KARTU QR WARGA (DIRECTLY SHOWING QR CODE CREATION!) */}
      {activeCardWarga && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[28px] max-w-sm w-full p-6 border border-slate-200 relative shadow-2xl flex flex-col items-center text-center">
            <button
              onClick={() => setActiveCardWarga(null)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
              Kartu QR Iuran RT 05 RW 02
            </span>
            <h3 className="text-base font-extrabold text-slate-800">Kartu Keluarga Digital</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Tempel QR Code ini di depan pintu rumah atau simpan di HP warga untuk iuran cepat.
            </p>

            {/* Printable Visual Card Area */}
            <div
              className="bg-white text-slate-900 rounded-3xl p-6 w-full mt-5 border border-slate-200 shadow-xl text-left relative flex flex-col justify-between"
              id="printable-warga-card"
              style={{
                backgroundColor: "#ffffff",
                color: "#0f172a",
                width: "360px",
                height: "226px",
                border: "1.5px solid #e2e8f0",
                boxSizing: "border-box",
                padding: "20px",
                fontFamily: "system-ui, -apple-system, sans-serif"
              }}
            >
              {/* Card Header decoration */}
              <div
                className="flex justify-between items-start border-b border-slate-100 pb-2.5"
                style={{ borderBottom: "1px solid #f1f5f9" }}
              >
                <div>
                  <h4
                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none"
                    style={{ color: "#2563eb" }}
                  >
                    KARTU IURAN WARGA
                  </h4>
                  <span
                    className="text-[9px] text-slate-400 font-extrabold block mt-1.5"
                    style={{ color: "#94a3b8" }}
                  >
                    RT 05 RW 02 Cilangkap Tapos Depok
                  </span>
                </div>
                <div
                  className="text-blue-600 text-[8px] font-black tracking-wider uppercase"
                  style={{
                    color: "#2563eb",
                  }}
                >
                  DIGITAL CARD
                </div>
              </div>

              {/* Card Content & QR */}
              <div className="flex justify-between items-center gap-3 mt-1.5">
                <div className="space-y-2 min-w-0 flex-1">
                  <div>
                    <span
                      className="text-[8px] text-slate-400 font-black uppercase tracking-wider block"
                      style={{ color: "#94a3b8" }}
                    >
                      Nama Kepala Keluarga
                    </span>
                    <span
                      className="text-xs font-black text-slate-800 block mt-0.5 break-words"
                      style={{ color: "#1e293b" }}
                    >
                      {activeCardWarga.namaKepalaKeluarga}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span
                        className="text-[8px] text-slate-400 font-black uppercase tracking-wider block"
                        style={{ color: "#94a3b8" }}
                      >
                        Nomor Rumah
                      </span>
                      <span
                        className="text-xs font-black text-slate-700 block mt-0.5"
                        style={{ color: "#334155" }}
                      >
                        No. {activeCardWarga.nomorRumah}
                      </span>
                    </div>
                    <div>
                      <span
                        className="text-[8px] text-slate-400 font-black uppercase tracking-wider block"
                        style={{ color: "#94a3b8" }}
                      >
                        Kategori Iuran
                      </span>
                      <span
                        className="text-xs font-black text-slate-700 block mt-0.5"
                        style={{ color: "#334155" }}
                      >
                        {activeCardWarga.kategoriIuran}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span
                      className="text-[8px] text-slate-400 font-black uppercase tracking-wider block"
                      style={{ color: "#94a3b8" }}
                    >
                      Nomor KK (Basis QR)
                    </span>
                    <span
                      className="text-[9px] font-mono font-bold text-slate-500 tracking-tight block mt-0.5"
                      style={{ color: "#64748b" }}
                    >
                      {activeCardWarga.nomorKk}
                    </span>
                  </div>
                </div>

                {/* High Resolution scan-ready QR Code Image */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className="w-[88px] h-[88px] bg-slate-50 p-1 rounded-xl flex items-center justify-center border border-slate-200"
                    style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}
                  >
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        JSON.stringify({
                          nama: activeCardWarga.namaKepalaKeluarga,
                          kk: activeCardWarga.nomorKk
                        })
                      )}`}
                      alt="Kartu QR Warga"
                      className="w-full h-full object-contain"
                      style={{ imageRendering: "pixelated", display: "block" }}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                    />
                  </div>
                  <span
                    className="text-[7px] font-mono font-black text-slate-400 mt-1 uppercase tracking-wider"
                    style={{ color: "#94a3b8" }}
                  >
                    KODE QR
                  </span>
                </div>
              </div>
            </div>

            {/* Hidden Printable Area for QR & Name Only */}
            <div
              id="only-qr-and-name-print"
              style={{
                position: "absolute",
                left: "-9999px",
                top: "-9999px",
                backgroundColor: "#ffffff",
                width: "400px",
                height: "400px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                boxSizing: "border-box",
                fontFamily: "system-ui, -apple-system, sans-serif",
                textAlign: "center"
              }}
            >
              <div
                style={{
                  width: "260px",
                  height: "260px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                  backgroundColor: "#ffffff"
                }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
                    JSON.stringify({
                      nama: activeCardWarga.namaKepalaKeluarga,
                      kk: activeCardWarga.nomorKk
                    })
                  )}`}
                  alt="Kartu QR Warga"
                  style={{ width: "260px", height: "260px", objectFit: "contain", imageRendering: "pixelated", display: "block" }}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              </div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#000000",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  lineHeight: "1.2"
                }}
              >
                {activeCardWarga.namaKepalaKeluarga}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#4b5563",
                  marginTop: "6px",
                  fontWeight: "600"
                }}
              >
                No. Rumah: {activeCardWarga.nomorRumah} • RT 05 RW 02
              </div>
            </div>

            {/* Instruction and Action */}
            <div className="w-full mt-4 pt-4 border-t border-slate-100 space-y-3">
              <p className="text-[10px] text-slate-400 flex items-center gap-1 text-center justify-center">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                Layar menampilkan kartu iuran, namun hasil cetak/unduh hanya berupa QR Code & nama warga.
              </p>

              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPdf}
                  className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-[10px] rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Unduh file PDF Kartu QR"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isDownloadingPdf ? "Proses..." : "Unduh PDF"}
                </button>
                <button
                  onClick={handleDownloadPNG}
                  disabled={isDownloadingPdf}
                  className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-extrabold text-[10px] rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Unduh file Gambar PNG Kartu QR"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isDownloadingPdf ? "Proses..." : "Unduh PNG"}
                </button>
                <button
                  onClick={() => {
                    const qrImg = document.querySelector("#only-qr-and-name-print img") as HTMLImageElement;
                    const qrSrc = qrImg ? qrImg.src : "";
                    const printWindow = window.open("", "_blank");
                    printWindow?.document.write(`
                      <html>
                        <head>
                          <title>Cetak QR - ${activeCardWarga.namaKepalaKeluarga}</title>
                          <script src="https://cdn.tailwindcss.com"></script>
                          <style>
                            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: white; margin: 0; }
                            @media print {
                              body { background-color: white; }
                              .no-print { display: none; }
                            }
                          </style>
                        </head>
                        <body>
                          <div class="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-3xl shadow-md text-center max-w-[300px]">
                            <div class="w-[200px] h-[200px] mb-4 flex items-center justify-center">
                              <img src="${qrSrc}" alt="QR" class="w-full h-full object-contain" />
                            </div>
                            <h2 class="text-lg font-black text-slate-900 uppercase tracking-wide">${activeCardWarga.namaKepalaKeluarga}</h2>
                            <p class="text-xs text-slate-500 mt-1 font-semibold">No. Rumah: ${activeCardWarga.nomorRumah} • RT 05 RW 02</p>
                            
                            <div class="no-print mt-6 flex justify-center">
                              <button onclick="window.print()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md">Print / Cetak</button>
                            </div>
                          </div>
                        </body>
                      </html>
                    `);
                    printWindow?.document.close();
                  }}
                  className="py-2.5 px-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[10px] rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak / Print
                </button>
                <button
                  onClick={() => setActiveCardWarga(null)}
                  className="py-2.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* FLOATING ACTION BUTTON UNTUK KEMBALI KE BERANDA (DIHAPUS & DIPINDAHKAN KE FOOTER SESUAI KEINGINAN USER) */}
      {/* Modal Pra-tinjau Matrix Laporan Bulanan */}
      {showMatrixModal && (
        <LaporanMatrixModal
          wargaList={wargaList}
          onClose={() => setShowMatrixModal(false)}
        />
      )}

      {/* Modal Laporan Pendapatan (Matrix Iuran & Ringkasan Kas) */}
      {showPendapatanModal && (
        <LaporanPendapatanModal
          wargaList={wargaList}
          transactions={transactions}
          onClose={() => setShowPendapatanModal(false)}
        />
      )}
    </div>
  );
}
