/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { QrCode, Search, Clock, ShieldCheck, RefreshCw, Plus, Trash2, Printer, X, Check, Users, Home, Info, Sparkles, MoreVertical, Edit, Download, Save, ArrowLeft, ChevronDown, ChevronUp, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Warga, Transaksi, formatMonthId } from "./types";
import { DbService } from "./services/db";
import { LIST_BULAN_2026, CURRENT_MONTH_ID } from "./data/dummy";
import ScannerSim from "./components/ScannerSim";
import ManualSearch from "./components/ManualSearch";
import WargaDetails from "./components/WargaDetails";
import Receipt from "./components/Receipt";
import TransactionHistory from "./components/TransactionHistory";

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

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>("DASHBOARD");
  const [paymentSource, setPaymentSource] = useState<"SCAN" | "MANUAL">("SCAN");
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [transactions, setTransactions] = useState<Transaksi[]>([]);
  const [selectedWarga, setSelectedWarga] = useState<Warga | null>(null);
  const [activeTransaction, setActiveTransaction] = useState<Transaksi | null>(null);
  const [manualSearchType, setManualSearchType] = useState<"SEMUA" | "NAMA" | "NOMOR_RUMAH" | "ID">("SEMUA");
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Form states untuk tambah warga baru
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNama, setNewNama] = useState("");
  const [newKk, setNewKk] = useState("");
  const [newNoRumah, setNewNoRumah] = useState("");
  const [newKategori, setNewKategori] = useState<"Warga Biasa" | "Warga Usaha">("Warga Biasa");
  const [newTarif, setNewTarif] = useState(50000);

  // State untuk modal cetak QR
  const [activeCardWarga, setActiveCardWarga] = useState<Warga | null>(null);

  // State untuk edit warga
  const [editingWarga, setEditingWarga] = useState<Warga | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editNama, setEditNama] = useState("");
  const [editKk, setEditKk] = useState("");
  const [editNoRumah, setEditNoRumah] = useState("");
  const [editKategori, setEditKategori] = useState<"Warga Biasa" | "Warga Usaha">("Warga Biasa");
  const [editTarif, setEditTarif] = useState(50000);

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

  // Load data dari DbService
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

  useEffect(() => {
    loadData();
  }, []);

  // Update tarif standar otomatis ketika kategori form warga diubah
  useEffect(() => {
    setNewTarif(newKategori === "Warga Biasa" ? 50000 : 100000);
  }, [newKategori]);

  // Update tarif standar otomatis ketika kategori form edit warga diubah
  useEffect(() => {
    setEditTarif(editKategori === "Warga Biasa" ? 50000 : 100000);
  }, [editKategori]);

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
      await DbService.addWarga(newNama, newKk, newNoRumah, newKategori, newTarif);
      // Reset form
      setNewNama("");
      setNewKk("");
      setNewNoRumah("");
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
    setEditKategori(warga.kategoriIuran);
    setEditTarif(warga.tarifPerBulan);
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
        editTarif
      );
      // Reset form
      setEditNama("");
      setEditKk("");
      setEditNoRumah("");
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
    const element = document.getElementById("printable-warga-card");
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

      // Ukuran Standar ID Card / Credit Card Fisik (85.6mm x 54mm)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [85.6, 54],
      });

      pdf.addImage(imgData, "PNG", 0, 0, 85.6, 54);
      
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
    const element = document.getElementById("printable-warga-card");
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
      
      if ((userLower === "admin" || userLower === "kolektor") && passTrim === "123456") {
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
      {/* Bingkai Aplikasi Ringkas (Mobile-First responsive container) */}
      <div
        className="w-full max-w-sm bg-white sm:rounded-3xl sm:shadow-xl sm:border border-slate-200 overflow-hidden flex flex-col h-screen sm:h-[760px] relative"
        id="android-phone-frame"
      >
        {/* Sticky Header Wrapper */}
        <div className="shrink-0 flex flex-col w-full bg-white z-10 border-b border-slate-100">
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
          {activeScreen === "MANUAL" ? (
            <header className="bg-white text-slate-850 px-5 py-3.5 shrink-0 shadow-xs relative flex flex-col gap-2.5 border-b border-slate-100 z-30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20">
                    <QrCode className="w-5 h-5 text-white stroke-[2.5]" />
                  </div>
                  <div>
                    <h1 className="text-xs font-black tracking-widest leading-none uppercase text-slate-900">KOLEKTOR IURAN RT</h1>
                    <span className="text-[10px] text-slate-500 font-bold block mt-1 tracking-wider">RT 05 RW 02</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button className="p-2 hover:bg-slate-50 active:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all cursor-pointer" title="Menu Tambahan">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setCurrentUser(null);
                      localStorage.removeItem("kolektor_logged_in_user");
                      setActiveScreen("DASHBOARD");
                    }}
                    className="p-2 hover:bg-rose-50 active:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-full transition-all cursor-pointer flex items-center justify-center"
                    title="Keluar"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Cari nama, rumah, atau No. KK..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-9.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-xs font-semibold h-11 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
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
                  <span className="text-[10px] text-slate-500 font-bold block mt-1 tracking-wider">RT 05 RW 02</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button className="p-2 hover:bg-slate-50 active:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all cursor-pointer" title="Menu Tambahan">
                  <MoreVertical className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setCurrentUser(null);
                    localStorage.removeItem("kolektor_logged_in_user");
                    setActiveScreen("DASHBOARD");
                  }}
                  className="p-2 hover:bg-rose-50 active:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-full transition-all cursor-pointer flex items-center justify-center"
                  title="Keluar"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </header>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* RINGKASAN DATA HARI INI - Selalu terpampang di halaman penjelajahan utama */}
          {(activeScreen === "DASHBOARD" || activeScreen === "SCAN" || activeScreen === "MANAGE") && (
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
                  <div className="flex-1 flex flex-col overflow-y-auto px-1 py-1 min-h-0">
                    <ManualSearch
                      query={searchQuery}
                      onSelectWarga={handleSelectWarga}
                      onBackToQR={() => {}}
                    />
                  </div>
                )}

                {/* 3. LAYAR DATA WARGA / MANAGE (TAMBAH, LIST & CETAK QR) */}
                {activeScreen === "MANAGE" && (
                  <div className="flex flex-col flex-1 space-y-4">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <div>
                        <h3 className="text-[11px] font-black text-slate-800 tracking-tight uppercase">Daftar Warga RT 05</h3>
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={handleResetDb}
                          className="py-1.5 px-2.5 bg-white border border-slate-200 text-rose-500 hover:text-rose-800 font-bold text-[10px] rounded-lg flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                          title="Kosongkan Semua Data"
                        >
                          <Trash2 className="w-3 h-3 text-rose-500" />
                          <span>Kosongkan Data</span>
                        </button>
                        <button
                          onClick={() => {
                            setNewNama("");
                            setNewKk("");
                            setNewNoRumah("");
                            setNewKategori("Warga Biasa");
                            setNewTarif(50000);
                            setActiveScreen("ADD_WARGA");
                          }}
                          className="py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] rounded-lg flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Warga</span>
                        </button>
                      </div>
                    </div>

                    {/* Resident Card List */}
                    <div className="space-y-1 max-h-[490px] overflow-y-auto pr-1">
                      {wargaList.length === 0 ? (
                        <div className="py-10 text-center border border-dashed border-slate-200 rounded-2xl bg-white text-slate-400">
                          <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <h4 className="text-xs font-bold text-slate-700">Database Kosong</h4>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                            Belum ada warga yang terdaftar. Ketuk "+ Tambah Warga" untuk memasukkan data warga pertama Anda.
                          </p>
                        </div>
                      ) : (
                        wargaList.map((w) => {
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
                                    <div className="col-span-2">
                                      <span className="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">Nomor KK (Digital ID)</span>
                                      <span className="font-bold text-slate-700 font-mono tracking-wider">{w.nomorKk}</span>
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
                )}

                {/* 4. LAYAR RINCIAN PEMBAYARAN WARGA */}
                {activeScreen === "PAYMENT" && selectedWarga && (
                  <WargaDetails
                    warga={selectedWarga}
                    onBack={() => {
                      setActiveScreen(paymentSource);
                      setSelectedWarga(null);
                    }}
                    onSubmitPayment={handlePaymentSubmit}
                    isSubmitting={isSubmitting}
                  />
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

                {/* 6. LAYAR TAMBAH WARGA BARU (FULL PAGE) */}
                {activeScreen === "ADD_WARGA" && (
                  <div className="flex flex-col flex-1 space-y-4">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                      <button
                        onClick={() => setActiveScreen("MANAGE")}
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
                        title="Kembali ke Daftar Warga"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-800">Tambah Warga Baru</h3>
                        <p className="text-[10px] text-slate-500">Isi data kepala keluarga baru untuk membuat kartu QR</p>
                      </div>
                    </div>

                    <form
                      onSubmit={handleAddWarga}
                      className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs"
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
                            onChange={(e) => setNewNama(e.target.value)}
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
                              Kategori Iuran:
                            </label>
                            <select
                              value={newKategori}
                              onChange={(e) => setNewKategori(e.target.value as any)}
                              className="w-full px-2.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white h-12"
                            >
                              <option value="Warga Biasa">Warga Biasa</option>
                              <option value="Warga Usaha">Warga Usaha</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col space-y-1.5">
                          <label className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider">
                            Tarif Iuran Bulanan (Rp):
                          </label>
                          <input
                            type="number"
                            required
                            value={newTarif}
                            onChange={(e) => setNewTarif(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white h-12"
                          />
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
                )}

                {/* 7. LAYAR EDIT DATA WARGA (FULL PAGE) */}
                {activeScreen === "EDIT_WARGA" && editingWarga && (
                  <div className="flex flex-col flex-1 space-y-4">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                      <button
                        onClick={() => {
                          setEditingWarga(null);
                          setActiveScreen("MANAGE");
                        }}
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
                        title="Kembali ke Daftar Warga"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-800">Edit Data Warga</h3>
                        <p className="text-[10px] text-slate-500">Perbarui data kepala keluarga dan simpan perubahan</p>
                      </div>
                    </div>

                    <form
                      onSubmit={handleUpdateWarga}
                      className="bg-white border border-amber-200 bg-amber-50/5 rounded-2xl p-5 space-y-4 shadow-xs"
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
                            onChange={(e) => setEditNama(e.target.value)}
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
                              Kategori Iuran:
                            </label>
                            <select
                              value={editKategori}
                              onChange={(e) => setEditKategori(e.target.value as any)}
                              className="w-full px-2.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white h-12"
                            >
                              <option value="Warga Biasa">Warga Biasa</option>
                              <option value="Warga Usaha">Warga Usaha</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col space-y-1.5">
                          <label className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider">
                            Tarif Iuran Bulanan (Rp):
                          </label>
                          <input
                            type="number"
                            required
                            value={editTarif}
                            onChange={(e) => setEditTarif(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white h-12"
                          />
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
            <span>Keamanan Enkripsi Lokal • Offline PWA Ready</span>
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

        {/* Recent Transactions Bottom Sheet Drawer */}
        <AnimatePresence>
          {showHistoryTray && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="absolute bottom-[44px] left-0 right-0 h-[380px] bg-white border-t border-slate-200 shadow-2xl z-30 flex flex-col rounded-t-2xl overflow-hidden"
            >
              {/* Drag handle decoration */}
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto my-2.5 shrink-0" />

              {/* Bottom Sheet Header */}
              <div className="px-5 pb-2.5 flex items-center justify-between border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Riwayat Setoran Terbaru</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">RT 05 RW 02 • Sesi Aktif</p>
                </div>
                <button
                  onClick={() => setShowHistoryTray(false)}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable List Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Clock className="w-8 h-8 text-slate-300 stroke-[1.5] mb-2" />
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
                          className="bg-white border border-slate-100 rounded-xl p-3 shadow-xs hover:border-blue-100/60 transition-all flex justify-between items-center"
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

            {/* Instruction and Action */}
            <div className="w-full mt-4 pt-4 border-t border-slate-100 space-y-3">
              <p className="text-[10px] text-slate-400 flex items-center gap-1 text-center justify-center">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                Format kartu standar ID Card (85.6mm x 54mm) resolusi tinggi.
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
                    const printContent = document.getElementById("printable-warga-card")?.outerHTML;
                    if (printContent) {
                      const printWindow = window.open("", "_blank");
                      printWindow?.document.write(`
                        <html>
                          <head>
                            <title>Cetak Kartu - ${activeCardWarga.namaKepalaKeluarga}</title>
                            <script src="https://cdn.tailwindcss.com"></script>
                            <style>
                              body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f1f5f9; }
                              @media print {
                                body { background-color: white; }
                                .no-print { display: none; }
                              }
                            </style>
                          </head>
                          <body>
                            <div class="p-8">
                              ${printContent}
                              <div class="no-print mt-6 text-center">
                                <button onclick="window.print()" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs">Print / Cetak</button>
                              </div>
                            </div>
                          </body>
                        </html>
                      `);
                      printWindow?.document.close();
                    }
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
    </div>
  );
}
