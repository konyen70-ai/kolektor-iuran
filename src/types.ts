/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type KategoriIuran = "Warga Biasa" | "Warga Usaha" | "Warga Luar";

export interface IuranItemConfig {
  id: string;
  nama: string;
  isKategoriBased?: boolean; // true for items like Iuran Sampah
  nominalDefault?: number; // for flat items
  nominalByKategori?: {
    "Warga Biasa": number;
    "Warga Usaha": number;
    "Warga Luar": number;
  };
}

export interface Warga {
  id: string; // ID warga internal (misal: "W-01")
  qrId: string; // ID QR Code unik (misal: "KK-3201...")
  nomorKk: string; // Nomor Kartu Keluarga (16 digit)
  namaKepalaKeluarga: string;
  nomorRumah: string;
  nomorHp?: string; // Nomor WA / HP (misal: "081234567890")
  kategoriIuran: KategoriIuran;
  iuranAktif?: string[]; // List ID iuran yang aktif dibayar oleh warga ini
  tarifPerBulan: number; // Total tarif bulanan berdasarkan iuran aktif
  historyPembayaran: string[]; // List of paid year-months, format: "YYYY-MM" (e.g. ["2026-01", "2026-02"])
  namaKolektor?: string; // Nama Kolektor Penanggung Jawab (e.g. "Pak Ahmad RT 05")
}

export interface Transaksi {
  id: string;
  wargaId: string;
  wargaNama: string;
  wargaNomorRumah: string;
  wargaNomorHp?: string;
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

export const formatMonthId = (monthId: string): string => {
  if (!monthId) return "";
  const parts = monthId.split("-");
  if (parts.length !== 2) return monthId;
  const year = parts[0];
  const month = parts[1];
  const monthsMap: { [key: string]: string } = {
    "01": "JAN",
    "02": "FEB",
    "03": "MAR",
    "04": "APR",
    "05": "MEI",
    "06": "JUN",
    "07": "JUL",
    "08": "AGU",
    "09": "SEP",
    "10": "OKT",
    "11": "NOV",
    "12": "DES"
  };
  return `${monthsMap[month] || month}-${year}`;
};

