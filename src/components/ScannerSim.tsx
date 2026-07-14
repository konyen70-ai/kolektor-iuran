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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Memicu sukses scan dengan animasi transisi
  const triggerScanSuccess = (qrId: string) => {
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
        console.error("Gagal mendapatkan akses kamera setelah fallback:", err);
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Loop pemindaian QR menggunakan jsQR
  useEffect(() => {
    if (!hasCamera || scanSuccessAnim) return;

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
        <h3 className="text-base font-extrabold text-slate-800">Pindai Kode QR</h3>

        {/* Kotak Scanner dengan Kamera Live / Fallback */}
        <div
          onClick={hasCamera === false ? handleSimulatedClick : undefined}
          className="relative w-full aspect-square max-w-[240px] mx-auto rounded-3xl overflow-hidden border-4 border-slate-900 bg-slate-950 mt-3 shadow-md flex flex-col justify-between p-4 group"
        >
          {/* Real-time Video Stream */}
          {hasCamera && !scanSuccessAnim && (
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
            />
          )}

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
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10 bg-slate-900/95 overflow-y-auto">
              <AlertCircle className="w-9 h-9 text-rose-500 mb-2 shrink-0 animate-bounce" />
              <span className="text-[10px] font-extrabold text-rose-400 tracking-wider">KAMERA TIDAK AKTIF</span>
              <p className="text-[9.5px] text-slate-300 mt-1 max-w-[200px] mx-auto leading-normal font-medium">
                {cameraError || "Akses kamera ditolak atau tidak didukung oleh browser Anda."}
              </p>
              <div className="mt-2.5 p-2 bg-slate-950/80 rounded-xl border border-slate-800 text-[8.5px] text-slate-400 text-left w-full leading-relaxed">
                <strong className="text-blue-400">💡 Tips untuk HP:</strong> Jangan buka di dalam chat preview. Salin link di atas lalu buka langsung menggunakan Google Chrome atau Safari di HP Anda!
              </div>
            </div>
          )}

          {/* Laser line animation */}
          {hasCamera && !scanSuccessAnim && (
            <motion.div
              className="absolute left-0 right-0 h-1 bg-blue-500 shadow-[0_0_12px_#3b82f6] z-10 pointer-events-none"
              initial={{ top: "10%" }}
              animate={{ top: "90%" }}
              transition={{
                repeat: Infinity,
                repeatType: "reverse",
                duration: 2,
                ease: "easeInOut",
              }}
            />
          )}

          {/* Sudut Frame Bidik */}
          <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg pointer-events-none z-10" />
          <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg pointer-events-none z-10" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg pointer-events-none z-10" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg pointer-events-none z-10" />

          {/* Isi tengah scanner / Animasi Sukses */}
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
              ) : (
                hasCamera && (
                  <motion.div
                    key="scanning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center space-y-1.5"
                  >
                    <QrCode className="w-12 h-12 text-slate-400/40 animate-pulse" />
                    <span className="text-[9px] font-mono text-slate-400 tracking-wider bg-slate-900/60 px-2 py-0.5 rounded">BIDIK KODE QR...</span>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>

          {/* Sensor indicator */}
          <div className="w-full flex justify-between text-[9px] font-mono text-slate-400 z-10 select-none bg-slate-900/50 p-1.5 rounded-lg border border-slate-800/40">
            <span>Kolektor_Cam_v2</span>
            <span className="flex items-center gap-1 font-bold text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              AKTIF
            </span>
          </div>

          <div className="w-full text-center text-[9px] text-slate-300 bg-slate-900/90 py-1.5 px-2 rounded-full border border-slate-800 z-10 shadow-xs">
            Arahkan kamera ke Kode QR Warga
          </div>
        </div>
      </div>
    </div>
  );
}
