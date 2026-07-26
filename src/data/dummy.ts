/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Warga, IuranItemConfig, KategoriIuran } from "../types";

// Default configuration for 4 initial iuran types
export const DEFAULT_IURAN_CONFIG: IuranItemConfig[] = [
  {
    id: "kas",
    nama: "Iuran Kas Bulanan",
    isKategoriBased: false,
    nominalDefault: 10000,
  },
  {
    id: "sampah",
    nama: "Iuran Sampah",
    isKategoriBased: true,
    nominalByKategori: {
      "Warga Biasa": 15000,
      "Warga Usaha": 25000,
      "Warga Luar": 20000,
    },
  },
  {
    id: "kematian",
    nama: "Iuran Kematian",
    isKategoriBased: false,
    nominalDefault: 5000,
  },
  {
    id: "sosial",
    nama: "Iuran Sosial",
    isKategoriBased: false,
    nominalDefault: 5000,
  },
];

export const calculateTotalTarif = (
  kategori: KategoriIuran,
  iuranAktifIds: string[] | undefined,
  configList: IuranItemConfig[] = DEFAULT_IURAN_CONFIG
): number => {
  const activeIds = (!iuranAktifIds || iuranAktifIds.length === 0)
    ? configList.map((item) => item.id)
    : iuranAktifIds;

  return configList.reduce((total, item) => {
    if (activeIds.includes(item.id)) {
      if (item.isKategoriBased && item.nominalByKategori) {
        return total + (item.nominalByKategori[kategori] ?? 0);
      }
      return total + (item.nominalDefault ?? 0);
    }
    return total;
  }, 0);
};

// Rate configurations for categories
export const TARIF_KATEGORI = {
  "Warga Biasa": 35000,
  "Warga Usaha": 45000,
  "Warga Luar": 40000,
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
      nomorHp: "081234567890",
      kategoriIuran: "Warga Biasa",
      iuranAktif: ["kas", "sampah", "kematian", "sosial"],
      tarifPerBulan: 35000,
      historyPembayaran: [],
      namaKolektor: "Is Tentrem",
    },
    {
      id: "W-02",
      qrId: "3201234567890002",
      nomorKk: "3201234567890002",
      namaKepalaKeluarga: "Agus Wijaya",
      nomorRumah: "14",
      nomorHp: "081987654321",
      kategoriIuran: "Warga Usaha",
      iuranAktif: ["kas", "sampah", "kematian", "sosial"],
      tarifPerBulan: 45000,
      historyPembayaran: [],
      namaKolektor: "Is Tentrem",
    },
    {
      id: "W-03",
      qrId: "3201234567890003",
      nomorKk: "3201234567890003",
      namaKepalaKeluarga: "Siti Rahmawati",
      nomorRumah: "15",
      nomorHp: "085712345678",
      kategoriIuran: "Warga Biasa",
      iuranAktif: ["kas", "sampah", "kematian", "sosial"],
      tarifPerBulan: 35000,
      historyPembayaran: [],
      namaKolektor: "Is Tentrem",
    },
    {
      id: "W-04",
      qrId: "3201234567890004",
      nomorKk: "3201234567890004",
      namaKepalaKeluarga: "Hendra Saputra",
      nomorRumah: "18",
      nomorHp: "082134567899",
      kategoriIuran: "Warga Biasa",
      iuranAktif: ["kas", "sampah", "kematian", "sosial"],
      tarifPerBulan: 35000,
      historyPembayaran: [],
      namaKolektor: "Is Tentrem",
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
