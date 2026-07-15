/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { QrCode, Check, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Warga } from "../types";
// @ts-ignore
import jsQR from "jsqr";

interface ScannerSimProps {
  onScanSuccess: (scannedId: string) => void;
  onSwitchToManual: (searchType?: "NAMA" | "NOMOR_RUMAH" | "ID") => void;
  wargaList: Warga[];
}

export default function ScannerSim({ onScanSuccess, onSwitchToManual, wargaList }: ScannerSimProps) {
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanSuccessAnim, setScanSuccessAnim] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [retryTrigger, setRetryTrigger] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Helper to check if scanned ID or parsed JSON exists in wargaList
  const checkWargaExists = (qrId: string): boolean => {
    const cleanId = qrId.trim();
    let kkFromQr = cleanId;
    try {
      const parsed = JSON.parse(cleanId);
      if (parsed && typeof parsed === "object") {
        if (parsed.kk) {
          kkFromQr = String(parsed.kk);
        } else if (parsed.nomorKk) {
          kkFromQr = String(parsed.nomorKk);
        } else if (parsed.nomor_kk) {
          kkFromQr = String(parsed.nomor_kk);
        }
      }
    } catch (e) {
      // Not a JSON string
    }

    const cleanKk = kkFromQr.trim().toUpperCase();
    const cleanOriginal = cleanId.toUpperCase();

    return wargaList.some(
      (w) =>
        w.qrId.toUpperCase() === cleanKk ||
        w.nomorKk.toUpperCase() === cleanKk ||
        w.id.toUpperCase() === cleanKk ||
        w.qrId.toUpperCase() === cleanOriginal ||
        w.nomorKk.toUpperCase() === cleanOriginal
    );
  };

  // Memicu sukses scan dengan animasi transisi
  const triggerScanSuccess = (qrId: string) => {
    const exists = checkWargaExists(qrId);

    if (!exists) {
      setIsError(true);
      setErrorMsg("Kode QR tidak terdaftar!");
      setTimeout(() => {
        setIsError(false);
        setErrorMsg("");
      }, 2200);
      return;
    }

    setScanSuccessAnim(qrId);
    
    // Stop camera track immediately on success to release resource
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setTimeout(() => {
      setScanSuccessAnim(null);
      onScanSuccess(qrId);
    }, 1500);
  };

  // Mulai kamera otomatis
  useEffect(() => {
    let active = true;
    setHasCamera(null);
    setCameraError(null);

    async function startCamera() {
      try {
        let stream: MediaStream;
        try {
          // Coba dengan facingMode environment (kamera belakang) terlebih dahulu
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
          });
        } catch (err1) {
          console.warn("Gagal menggunakan facingMode: environment, mencoba fallback video: true...", err1);
          // Fallback ke kamera default
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        }
        
        if (active) {
          setHasCamera(true);
          setCameraError(null);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute("playsinline", "true");
            videoRef.current.play().catch((e) => console.error("Gagal memulai putar video:", e));
          }
          streamRef.current = stream;
        } else {
          // Bersihkan jika komponen di-unmount di tengah pemrosesan promise
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch (err: any) {
        console.warn("Gagal mendapatkan akses kamera setelah fallback:", err);
        if (active) {
          setHasCamera(false);
          let errMsg = "Akses kamera ditolak atau tidak didukung.";
          if (err.name === "NotAllowedError") {
            errMsg = "Izin kamera ditolak oleh browser atau sistem operasi.";
          } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            errMsg = "Tidak ada perangkat kamera yang terdeteksi.";
          } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
            errMsg = "Kamera sedang digunakan oleh aplikasi lain.";
          } else if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
            errMsg = "Kamera hanya dapat diakses melalui koneksi aman (HTTPS).";
          }
          setCameraError(`${errMsg} (${err.name || "Error"})`);
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [retryTrigger]);

  // Loop pemindaian QR menggunakan jsQR
  useEffect(() => {
    if (!hasCamera || scanSuccessAnim || isError) return;

    let animationFrameId: number;
    let active = true;

    const scanFrame = () => {
      if (!active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert"
            });

            if (code && code.data) {
              active = false;
              triggerScanSuccess(code.data);
              return;
            }
          } catch (e) {
            console.error("Gagal memproses frame kamera:", e);
          }
        }
      }
      animationFrameId = requestAnimationFrame(scanFrame);
    };

    animationFrameId = requestAnimationFrame(scanFrame);

    return () => {
      active = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [hasCamera, scanSuccessAnim]);

  // Simulasi klik scan warga pertama (fallback)
  const handleSimulatedClick = () => {
    if (wargaList.length > 0) {
      const firstWarga = wargaList[0];
      const simulatedJson = JSON.stringify({
        nama: firstWarga.namaKepalaKeluarga,
        kk: firstWarga.nomorKk
      });
      triggerScanSuccess(simulatedJson);
    }
  };

  return (
    <div className="flex flex-col space-y-3.5 w-full" id="qr-scanner-main-card">
      <div className="w-full text-center flex flex-col items-center py-1 px-1">
        <h3 className="text-[20px] font-extrabold text-slate-800 tracking-tight mt-6 mb-4">Pindai Kode QR</h3>

        {/* Kotak Scanner dengan Kamera Live / Fallback */}
        <motion.div
          onClick={hasCamera === false ? handleSimulatedClick : undefined}
          animate={isError ? {
            x: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0],
            transition: { duration: 0.5 }
          } : {}}
          className={`relative w-full aspect-square max-w-[280px] mx-auto rounded-[36px] overflow-hidden bg-[#030614] mt-1 shadow-2xl flex flex-col justify-between p-4 group transition-all duration-300 border-[10px] ${
            isError ? "border-rose-950 shadow-rose-500/20" : "border-[#0c122e]"
          }`}
        >
          {/* Real-time Video Stream - Rendered unconditionally to prevent ref from being null */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover z-0 pointer-events-none ${
              hasCamera && !scanSuccessAnim && !isError ? "block" : "hidden"
            }`}
          />

          {/* Hidden Canvas for Decoding */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Loader ketika meminta izin kamera */}
          {hasCamera === null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-950">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-2.5" />
              <span className="text-[10px] font-mono text-slate-400 tracking-wider">MENGAKTIFKAN KAMERA...</span>
            </div>
          )}

          {/* Overlay jika kamera gagal */}
          {hasCamera === false && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10 bg-[#040815] overflow-y-auto">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-2 shrink-0 animate-bounce" />
              <span className="text-[10px] font-extrabold text-rose-400 tracking-widest">KAMERA TIDAK AKTIF</span>
              <p className="text-[9.5px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-normal">
                {cameraError || "Akses kamera tidak aktif di browser preview."}
              </p>
              
              <div className="mt-3.5 flex flex-col gap-2 w-full px-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSimulatedClick();
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-[10px] rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simulasi Scan Warga Terdaftar</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerScanSuccess("INVALID-QR-CODE-123");
                  }}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-[10px] rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Simulasi Scan QR Gagal</span>
                </button>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRetryTrigger((prev) => prev + 1);
                }}
                className="mt-3.5 text-[9.5px] text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
              >
                Minta Akses Kamera Sungguhan
              </button>
            </div>
          )}

          {/* Laser line animation */}
          {hasCamera && !scanSuccessAnim && !isError && (
            <motion.div
              className="absolute left-0 right-0 h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.9)] z-10 pointer-events-none"
              initial={{ top: "15%" }}
              animate={{ top: "85%" }}
              transition={{
                repeat: Infinity,
                repeatType: "reverse",
                duration: 2.2,
                ease: "easeInOut",
              }}
            />
          )}

          {/* Sudut Frame Bidik - Only show when no success/error */}
          {!scanSuccessAnim && !isError && (
            <>
              <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg pointer-events-none z-10" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg pointer-events-none z-10" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg pointer-events-none z-10" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg pointer-events-none z-10" />
            </>
          )}

          {/* Sensor indicator di bagian atas (Kolektor_Cam_v2) */}
          <div className="w-full flex justify-between items-center text-[10px] font-mono text-slate-300 z-10 select-none bg-[#0a1027]/80 px-3.5 py-1.5 rounded-xl border border-blue-500/30">
            <span>Kolektor_Cam_v2</span>
            <span className="flex items-center gap-1.5 font-bold text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              AKTIF
            </span>
          </div>

          {/* Isi tengah scanner / Animasi Sukses / Animasi Gagal */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 pointer-events-none">
            <AnimatePresence mode="wait">
              {scanSuccessAnim ? (
                <motion.div
                  key="scanned"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center space-y-2 bg-emerald-950/95 p-4 rounded-2xl border border-emerald-500 max-w-[90%] overflow-hidden shadow-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                    <Check className="w-5 h-5 stroke-[3]" />
                  </div>
                  <div className="text-center w-full">
                    <p className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">TERDETEKSI</p>
                    <p className="text-[10px] font-mono text-white mt-0.5 break-all leading-tight">Berhasil membaca Kode QR</p>
                  </div>
                </motion.div>
              ) : isError ? (
                <motion.div
                  key="scan-error"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex flex-col items-center space-y-2 bg-rose-950/95 p-4 rounded-2xl border border-rose-500 max-w-[90%] overflow-hidden shadow-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white shrink-0">
                    <AlertCircle className="w-5 h-5 stroke-[3]" />
                  </div>
                  <div className="text-center w-full">
                    <p className="text-[10px] font-bold text-rose-400 tracking-widest uppercase">TIDAK DIKENAL</p>
                    <p className="text-[10px] font-mono text-white mt-0.5 break-all leading-tight">{errorMsg || "Warga tidak terdaftar!"}</p>
                  </div>
                </motion.div>
              ) : (
                hasCamera && (
                  <motion.div
                    key="scanning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center space-y-2 mt-4"
                  >
                    <QrCode className="w-16 h-16 text-slate-600/30 animate-pulse" />
                    <span className="text-[10px] font-mono text-slate-400/90 tracking-widest bg-[#091024]/90 border border-slate-800/60 px-3.5 py-1.5 rounded-lg">BIDIK KODE QR...</span>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Instruction Bar */}
          <div className="w-full text-center text-[10px] text-white bg-[#060c1f]/95 py-2 px-3 rounded-full border border-blue-500/40 z-10 shadow-lg tracking-wide font-medium">
            {isError ? "Kode QR warga tidak dikenali" : "Arahkan kamera ke Kode QR Warga"}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
