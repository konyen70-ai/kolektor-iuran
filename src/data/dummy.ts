/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Warga } from "../types";

// Rate configurations for categories
export const TARIF_KATEGORI = {
  "Warga Biasa": 50000,
  "Warga Usaha": 100000,
};

// Generates 4 initial warga with realistic name, 16-digit KK and no block
export const generateDummyWarga = (): Warga[] => {
  return [
    {
      id: "W-01",
      qrId: "3201234567890001",
      nomorKk: "3201234567890001",
      namaKepalaKeluarga: "Budi Santoso",
      nomorRumah: "12",
      kategoriIuran: "Warga Biasa",
      tarifPerBulan: 50000,
      historyPembayaran: ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"],
    },
    {
      id: "W-02",
      qrId: "3201234567890002",
      nomorKk: "3201234567890002",
      namaKepalaKeluarga: "Agus Wijaya",
      nomorRumah: "14",
      kategoriIuran: "Warga Usaha",
      tarifPerBulan: 100000,
      historyPembayaran: ["2026-01", "2026-02", "2026-03", "2026-04"],
    },
    {
      id: "W-03",
      qrId: "3201234567890003",
      nomorKk: "3201234567890003",
      namaKepalaKeluarga: "Siti Rahmawati",
      nomorRumah: "15",
      kategoriIuran: "Warga Biasa",
      tarifPerBulan: 50000,
      historyPembayaran: ["2026-01", "2026-02"],
    },
    {
      id: "W-04",
      qrId: "3201234567890004",
      nomorKk: "3201234567890004",
      namaKepalaKeluarga: "Hendra Saputra",
      nomorRumah: "18",
      kategoriIuran: "Warga Biasa",
      tarifPerBulan: 50000,
      historyPembayaran: [],
    }
  ];
};

export const DUMMY_WARGA: Warga[] = generateDummyWarga();

// Bulan berjalan tahun 2026 untuk transaksi
export const LIST_BULAN_2026 = [
  { id: "2026-01", namaBulan: "Januari 2026", tahun: 2026 },
  { id: "2026-02", namaBulan: "Februari 2026", tahun: 2026 },
  { id: "2026-03", namaBulan: "Maret 2026", tahun: 2026 },
  { id: "2026-04", namaBulan: "April 2026", tahun: 2026 },
  { id: "2026-05", namaBulan: "Mei 2026", tahun: 2026 },
  { id: "2026-06", namaBulan: "Juni 2026", tahun: 2026 },
  { id: "2026-07", namaBulan: "Juli 2026", tahun: 2026 },
  { id: "2026-08", namaBulan: "Agustus 2026", tahun: 2026 },
  { id: "2026-09", namaBulan: "September 2026", tahun: 2026 },
  { id: "2026-10", namaBulan: "Oktober 2026", tahun: 2026 },
  { id: "2026-11", namaBulan: "November 2026", tahun: 2026 },
  { id: "2026-12", namaBulan: "Desember 2026", tahun: 2026 },
];

export const CURRENT_MONTH_ID = "2026-07"; // Bulan berjalan saat ini (Juli 2026)
