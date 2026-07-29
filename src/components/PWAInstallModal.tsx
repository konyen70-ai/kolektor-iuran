import React, { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Smartphone, Check, Sparkles } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export const PWAInstallModal: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // 1. Cek apakah aplikasi sudah berjalan dalam mode PWA / Standalone (tanpa bilah browser)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true ||
        document.referrer.includes("android-app://");
      
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    const standalone = checkStandalone();

    // 2. Cek status di localStorage
    const installedStorage = localStorage.getItem("pwa_installed") === "true";
    const dismissedSession = sessionStorage.getItem("pwa_install_dismissed") === "true";

    if (standalone || installedStorage) {
      setIsInstalled(true);
      setShowModal(false);
      return;
    }

    // 3. Cek apakah perangkat iOS (Safari)
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // 4. Tangkap event 'beforeinstallprompt' dari browser Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      if (!dismissedSession && !standalone && !installedStorage) {
        setShowModal(true);
      }
    };

    // 5. Tangkap event 'appinstalled' ketika aplikasi berhasil diinstall
    const handleAppInstalled = () => {
      localStorage.setItem("pwa_installed", "true");
      setIsInstalled(true);
      setShowModal(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Jika iOS dan belum standalone serta belum didismiss, tampilkan panduan install iOS
    if (isIosDevice && !standalone && !installedStorage && !dismissedSession) {
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        localStorage.setItem("pwa_installed", "true");
        setIsInstalled(true);
        setShowModal(false);
      } else {
        sessionStorage.setItem("pwa_install_dismissed", "true");
        setShowModal(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("Gagal memicu install PWA:", err);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa_install_dismissed", "true");
    setShowModal(false);
  };

  // Jika sudah standalone / sudah terinstall / modal ditutup, jangan tampilkan apa-apa
  if (isStandalone || isInstalled || !showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-3.5 relative overflow-hidden text-left">
        {/* Tombol Tutup X */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          title="Nanti Saja"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon App */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/80 shadow-xs overflow-hidden shrink-0 flex items-center justify-center p-0.5">
            <img
              src="/icon.png"
              alt="Icon Kolektor Iuran RT"
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => {
                // fallback if image fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100/80">
              Aplikasi Android (PWA)
            </span>
            <h3 className="text-sm font-extrabold text-slate-900 leading-snug mt-0.5">
              Install Kolektor Iuran RT
            </h3>
          </div>
        </div>

        {/* Deskripsi Keunggulan */}
        <p className="text-xs text-slate-600 leading-relaxed font-normal">
          Pasang aplikasi ini di homescreen HP Anda untuk akses cepat tanpa bilah browser, bekerja lebih ringan, dan terasa seperti aplikasi native Android.
        </p>

        {/* Konten Khusus iOS */}
        {isIOS ? (
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Cara Install di iPhone / iPad:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 font-medium">
              <li className="flex items-center gap-1.5">
                <span>1. Ketuk tombol</span>
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-bold text-slate-800">
                  <Share className="w-3 h-3 text-blue-600" /> Bagikan / Share
                </span>
              </li>
              <li className="flex items-center gap-1.5">
                <span>2. Gulir lalu pilih</span>
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-bold text-slate-800">
                  <PlusSquare className="w-3 h-3 text-emerald-600" /> Tambah ke Layar Utama
                </span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-2.5 flex items-center gap-2 text-emerald-900 text-[11px] font-semibold">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Siap diinstall ke layar utama HP dalam 1 kali klik.</span>
          </div>
        )}

        {/* Tombol Aksi */}
        <div className="flex flex-col gap-2 pt-1">
          {!isIOS && deferredPrompt && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-blue-500"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              Install Sekarang ke Homescreen
            </button>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
};
