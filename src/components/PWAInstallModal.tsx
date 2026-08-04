import React, { useState, useEffect } from "react";
import { Download, X, Share, Smartphone, Check, Sparkles, ExternalLink } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PWAInstallModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [internalShowModal, setInternalShowModal] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Modal tampil jika dipicu eksternal (via menu) ATAU dipicu internal (otomatis)
  const isVisible = externalIsOpen !== undefined ? externalIsOpen : internalShowModal;

  const getCleanUrl = () => {
    if (typeof window === "undefined") return "";
    return window.location.origin + (window.location.pathname || "/");
  };

  const handleCopyUrl = () => {
    const url = getCleanUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    } else {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  useEffect(() => {
    // 0. Cek apakah berada dalam iFrame (Preview AI Studio / Cloud Run)
    const inIframe = typeof window !== "undefined" && window.self !== window.top;
    setIsInIframe(inIframe);

    // 1. Cek apakah aplikasi sudah berjalan dalam mode PWA Standalone (Tanpa Bilah Browser)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true ||
        document.referrer.includes("android-app://");
      
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    const standalone = checkStandalone();
    const installedStorage = localStorage.getItem("pwa_installed") === "true";
    const dismissedSession = sessionStorage.getItem("pwa_install_dismissed") === "true";

    if (standalone || installedStorage) {
      setIsInstalled(true);
    }

    // 2. Tangkap event 'beforeinstallprompt' dari browser Chrome / Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredPwaPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      if (!dismissedSession && !standalone && !installedStorage && externalIsOpen === undefined) {
        setInternalShowModal(true);
      }
    };

    // 3. Tangkap event 'appinstalled' ketika aplikasi berhasil diinstall
    const handleAppInstalled = () => {
      localStorage.setItem("pwa_installed", "true");
      setIsInstalled(true);
      setInternalShowModal(false);
      setDeferredPrompt(null);
      if (externalOnClose) externalOnClose();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if ((window as any).__deferredPwaPrompt) {
      setDeferredPrompt((window as any).__deferredPwaPrompt);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [externalIsOpen, externalOnClose]);

  const handleInstallClick = async () => {
    const activePrompt = deferredPrompt || (window as any).__deferredPwaPrompt;

    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choiceResult = await activePrompt.userChoice;

        if (choiceResult && choiceResult.outcome === "accepted") {
          localStorage.setItem("pwa_installed", "true");
          setIsInstalled(true);
          setInternalShowModal(false);
          if (externalOnClose) externalOnClose();
        } else {
          sessionStorage.setItem("pwa_install_dismissed", "true");
          setInternalShowModal(false);
          if (externalOnClose) externalOnClose();
        }
        setDeferredPrompt(null);
        (window as any).__deferredPwaPrompt = null;
        return;
      } catch (err) {
        console.error("Gagal memicu install PWA:", err);
      }
    }

    // Jika di dalam iframe dan prompt belum siap, buka di tab baru dengan URL bersih
    if (isInIframe) {
      const url = getCleanUrl();
      if (url) {
        window.open(url, "_blank");
      } else {
        window.open("/", "_blank");
      }
      return;
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa_install_dismissed", "true");
    setInternalShowModal(false);
    if (externalOnClose) externalOnClose();
  };

  if (!isVisible) {
    return null;
  }

  const promptAvailable = Boolean(deferredPrompt || (typeof window !== "undefined" && (window as any).__deferredPwaPrompt));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-3.5 relative overflow-hidden text-left">
        {/* Tombol Tutup X */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer z-10"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon App */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 border border-blue-500 shadow-xs overflow-hidden shrink-0 flex items-center justify-center p-2 text-white font-black">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100/80">
              Aplikasi Native (Standalone)
            </span>
            <h3 className="text-sm font-extrabold text-slate-900 leading-snug mt-0.5">
              Install Kolektor Iuran RT
            </h3>
          </div>
        </div>

        {/* Status Info */}
        {isStandalone ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-emerald-950 text-xs">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block text-emerald-900">Aplikasi Sudah Terpasang!</span>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Aplikasi ini sudah aktif beroperasi secara native (tanpa bilah browser) di perangkat Anda.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-600 leading-relaxed font-normal">
            Pasang aplikasi ini di layar utama agar bisa dibuka langsung seperti aplikasi native HP — lebih cepat, tanpa bilah alamat browser, dan hemat kuota.
          </p>
        )}

        {/* Status Prompt & Petunjuk */}
        {!isStandalone && (
          <>
            {isInIframe && !promptAvailable ? (
              <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3 space-y-1.5 text-xs text-amber-950">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Buka di Tab Baru untuk Install:</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                  Browser membatasi install otomatis di dalam bingkai preview AI Studio. Ketuk tombol di bawah untuk membuka tab baru lalu install secara native.
                </p>
              </div>
            ) : promptAvailable ? (
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-emerald-900 text-[11px] font-bold">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Siap diinstall! Ketuk tombol di bawah untuk memasang ke layar utama.</span>
              </div>
            ) : (
              <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3 space-y-2 text-xs text-blue-950">
                <div className="flex items-center gap-2 font-bold text-blue-900">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Petunjuk Install Manual (Chrome):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-900 font-medium">
                  <li>1. Ketuk menu titik tiga (<b>⋮</b>) di pojok kanan atas browser.</li>
                  <li>2. Pilih <b>"Install Aplikasi"</b> atau <b>"Tambahkan ke Layar Utama"</b>.</li>
                </ol>
              </div>
            )}
          </>
        )}

        {/* Tombol Aksi Utama */}
        <div className="flex flex-col gap-2 pt-1">
          {!isStandalone && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-blue-500 uppercase tracking-wide"
            >
              {promptAvailable ? (
                <>
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>INSTALL APLIKASI SEKARANG</span>
                </>
              ) : isInIframe ? (
                <>
                  <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                  <span>BUKA TAB BARU UNTUK INSTALL</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>INSTALL APLIKASI (NATIVE)</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyUrl}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-extrabold">Tautan Berhasil Disalin!</span>
              </>
            ) : (
              <>
                <Share className="w-3.5 h-3.5 text-slate-500" />
                <span>Salin Tautan Aplikasi</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2 bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-medium text-xs rounded-xl transition-all cursor-pointer text-center"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
