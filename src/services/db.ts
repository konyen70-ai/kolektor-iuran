/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Warga, Transaksi } from "../types";
import { DUMMY_WARGA } from "../data/dummy";

const WARGA_KEY = "kolektor_iuran_warga_v3";
const TRANSAKSI_KEY = "kolektor_iuran_transaksi_v3";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class DbService {
  /**
   * Mengambil semua daftar warga.
   */
  static async getWargaList(): Promise<Warga[]> {
    await delay(100);
    const localData = localStorage.getItem(WARGA_KEY);
    if (!localData) {
      localStorage.setItem(WARGA_KEY, JSON.stringify(DUMMY_WARGA));
      return DUMMY_WARGA;
    }
    return JSON.parse(localData);
  }

  /**
   * Mengambil data warga berdasarkan QR ID atau KK (QR Code yang di-scan).
   * Mendukung format plain text KK ataupun format JSON kependudukan.
   */
  static async getWargaByQrId(qrId: string): Promise<Warga | null> {
    await delay(100);
    const list = await this.getWargaList();
    const cleanId = qrId.trim();

    // Coba parsing jika isi QR Code berupa format JSON
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
      // Bukan JSON, gunakan string aslinya (fallback KK polos)
    }

    const cleanKk = kkFromQr.trim().toUpperCase();
    const cleanOriginal = cleanId.toUpperCase();

    const warga = list.find(
      (w) =>
        w.qrId.toUpperCase() === cleanKk ||
        w.nomorKk.toUpperCase() === cleanKk ||
        w.id.toUpperCase() === cleanKk ||
        w.qrId.toUpperCase() === cleanOriginal ||
        w.nomorKk.toUpperCase() === cleanOriginal
    );
    return warga || null;
  }

  /**
   * Pencarian fleksibel realtime berdasarkan Nama, Nomor KK, Nomor Rumah, atau ID.
   */
  static async searchWarga(query: string, filterType: "SEMUA" | "NAMA" | "NOMOR_RUMAH" | "ID" = "SEMUA"): Promise<Warga[]> {
    await delay(80);
    const list = await this.getWargaList();
    const q = query.toLowerCase().trim();
    if (!q) return list;

    return list.filter((w) => {
      const matchName = w.namaKepalaKeluarga.toLowerCase().includes(q);
      const matchHouse = w.nomorRumah.toLowerCase().includes(q);
      const matchId =
        w.id.toLowerCase().includes(q) ||
        w.nomorKk.toLowerCase().includes(q) ||
        w.qrId.toLowerCase().includes(q);

      if (filterType === "NAMA") return matchName;
      if (filterType === "NOMOR_RUMAH") return matchHouse;
      if (filterType === "ID") return matchId;

      return matchName || matchHouse || matchId;
    });
  }

  /**
   * Menambahkan warga baru ke database lokal.
   */
  static async addWarga(
    namaKepalaKeluarga: string,
    nomorKk: string,
    nomorRumah: string,
    kategoriIuran: "Warga Biasa" | "Warga Usaha",
    tarifPerBulan: number
  ): Promise<Warga> {
    await delay(120);
    const list = await this.getWargaList();
    // Generate simple incremental ID
    const num = list.length > 0 ? Math.max(...list.map((w) => parseInt(w.id.replace("W-", "")) || 0)) + 1 : 1;
    const newId = `W-${String(num).padStart(2, "0")}`;

    const newWarga: Warga = {
      id: newId,
      qrId: nomorKk.trim(), // QR ID is their KK Number as requested!
      nomorKk: nomorKk.trim(),
      namaKepalaKeluarga: namaKepalaKeluarga.trim(),
      nomorRumah: nomorRumah.trim(),
      kategoriIuran: kategoriIuran,
      tarifPerBulan: tarifPerBulan,
      historyPembayaran: [],
    };

    list.push(newWarga);
    localStorage.setItem(WARGA_KEY, JSON.stringify(list));
    return newWarga;
  }

  /**
   * Mengupdate data warga yang sudah ada.
   */
  static async updateWarga(
    wargaId: string,
    namaKepalaKeluarga: string,
    nomorKk: string,
    nomorRumah: string,
    kategoriIuran: "Warga Biasa" | "Warga Usaha",
    tarifPerBulan: number
  ): Promise<Warga> {
    await delay(120);
    const list = await this.getWargaList();
    const idx = list.findIndex((w) => w.id === wargaId);
    if (idx === -1) {
      throw new Error("Warga tidak ditemukan");
    }

    const updatedWarga: Warga = {
      ...list[idx],
      namaKepalaKeluarga: namaKepalaKeluarga.trim(),
      nomorKk: nomorKk.trim(),
      qrId: nomorKk.trim(),
      nomorRumah: nomorRumah.trim(),
      kategoriIuran: kategoriIuran,
      tarifPerBulan: tarifPerBulan,
    };

    list[idx] = updatedWarga;
    localStorage.setItem(WARGA_KEY, JSON.stringify(list));
    return updatedWarga;
  }

  /**
   * Menghapus data warga berdasarkan ID.
   */
  static async deleteWarga(wargaId: string): Promise<void> {
    await delay(100);
    const list = await this.getWargaList();
    const filtered = list.filter((w) => w.id !== wargaId);
    localStorage.setItem(WARGA_KEY, JSON.stringify(filtered));
  }

  /**
   * Mengambil riwayat transaksi.
   */
  static async getTransactions(): Promise<Transaksi[]> {
    await delay(100);
    const localData = localStorage.getItem(TRANSAKSI_KEY);
    if (!localData) {
      return [];
    }
    return JSON.parse(localData);
  }

  /**
   * Mencatat transaksi iuran baru.
   */
  static async recordTransaction(
    wargaId: string,
    bulanBayar: string[],
    tarifDasar: number,
    customTotalBayar: number,
    metode: "QR_CODE" | "MANUAL",
    catatan?: string
  ): Promise<Transaksi> {
    await delay(150);

    const wargaList = await this.getWargaList();
    const wargaIdx = wargaList.findIndex((w) => w.id === wargaId);
    if (wargaIdx === -1) {
      throw new Error("Warga tidak ditemukan");
    }

    const warga = wargaList[wargaIdx];

    // Tambahkan bulan baru ke history pembayaran warga
    const newHistory = [...warga.historyPembayaran];
    bulanBayar.forEach((b) => {
      if (!newHistory.includes(b)) {
        newHistory.push(b);
      }
    });
    newHistory.sort();

    // Simpan data warga terupdate
    wargaList[wargaIdx] = {
      ...warga,
      historyPembayaran: newHistory,
    };
    localStorage.setItem(WARGA_KEY, JSON.stringify(wargaList));

    // Jam & tanggal saat ini
    const now = new Date();

    const newTx: Transaksi = {
      id: `TX-${now.getTime()}`,
      wargaId: warga.id,
      wargaNama: warga.namaKepalaKeluarga,
      wargaNomorRumah: warga.nomorRumah,
      bulanBayar: bulanBayar,
      tarifDasar: tarifDasar,
      totalBayar: customTotalBayar,
      tanggal: now.toISOString(),
      metode: metode,
      status: "LUNAS",
      catatan: catatan,
    };

    const transactions = await this.getTransactions();
    transactions.unshift(newTx);
    localStorage.setItem(TRANSAKSI_KEY, JSON.stringify(transactions));

    return newTx;
  }

  /**
   * Mereset seluruh database local ke semula.
   */
  static async resetDatabase(): Promise<void> {
    await delay(100);
    localStorage.removeItem(WARGA_KEY);
    localStorage.removeItem(TRANSAKSI_KEY);
  }
}
