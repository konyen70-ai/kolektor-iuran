/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type KategoriIuran = "Warga Biasa" | "Warga Usaha";

export interface Warga {
  id: string; // ID warga internal (misal: "W-01")
  qrId: string; // ID QR Code unik (misal: "KK-3201...")
  nomorKk: string; // Nomor Kartu Keluarga (16 digit)
  namaKepalaKeluarga: string;
  nomorRumah: string;
  kategoriIuran: KategoriIuran;
  tarifPerBulan: number; // Tarif berdasarkan kategori iuran
  historyPembayaran: string[]; // List of paid year-months, format: "YYYY-MM" (e.g. ["2026-01", "2026-02"])
}

export interface Transaksi {
  id: string;
  wargaId: string;
  wargaNama: string;
  wargaNomorRumah: string;
  bulanBayar: string[]; // e.g. ["2026-07"]
  tarifDasar: number;
  totalBayar: number; // can be customized/modified manually if needed
  tanggal: string; // ISO string (with exact hour)
  metode: "QR_CODE" | "MANUAL";
  status: "LUNAS";
  catatan?: string;
}

export interface IuranBulan {
  id: string; // "YYYY-MM"
  namaBulan: string; // "Januari 2026"
  tahun: number;
}

