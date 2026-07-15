/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Warga, Transaksi } from "../types";
import { DUMMY_WARGA } from "../data/dummy";
import { db } from "./firebase";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
} from "firebase/firestore";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const auth = getAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export class DbService {
  /**
   * Mengambil semua daftar warga.
   * Jika database Firestore masih kosong, akan diisi dengan DUMMY_WARGA (Seeding).
   */
  static async getWargaList(): Promise<Warga[]> {
    const path = "warga";
    try {
      const colRef = collection(db, path);
      const snapshot = await getDocs(colRef);
      
      const isSeeded = localStorage.getItem("firebase_seeded_v4") === "true";
      if (snapshot.empty && !isSeeded) {
        const batch = writeBatch(db);
        DUMMY_WARGA.forEach((w) => {
          batch.set(doc(db, path, w.id), w);
        });
        await batch.commit();
        localStorage.setItem("firebase_seeded_v4", "true");
        return DUMMY_WARGA.sort((a, b) => a.namaKepalaKeluarga.localeCompare(b.namaKepalaKeluarga, "id"));
      }

      const list: Warga[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Warga);
      });

      if (list.length > 0) {
        localStorage.setItem("firebase_seeded_v4", "true");
      }

      return list.sort((a, b) => a.namaKepalaKeluarga.localeCompare(b.namaKepalaKeluarga, "id"));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  /**
   * Mengambil data warga berdasarkan QR ID atau KK (QR Code yang di-scan).
   * Mendukung format plain text KK ataupun format JSON kependudukan.
   */
  static async getWargaByQrId(qrId: string): Promise<Warga | null> {
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
  static async searchWarga(queryStr: string, filterType: "SEMUA" | "NAMA" | "NOMOR_RUMAH" | "ID" = "SEMUA"): Promise<Warga[]> {
    const list = await this.getWargaList();
    const q = queryStr.toLowerCase().trim();
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
   * Menambahkan warga baru ke database Firestore.
   */
  static async addWarga(
    namaKepalaKeluarga: string,
    nomorKk: string,
    nomorRumah: string,
    kategoriIuran: "Warga Biasa" | "Warga Usaha",
    tarifPerBulan: number
  ): Promise<Warga> {
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

    const path = `warga/${newId}`;
    try {
      await setDoc(doc(db, "warga", newId), newWarga);
      return newWarga;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
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
    const path = `warga/${wargaId}`;
    try {
      const docRef = doc(db, "warga", wargaId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error("Warga tidak ditemukan");
      }

      const existingData = docSnap.data() as Warga;
      const updatedWarga: Warga = {
        ...existingData,
        namaKepalaKeluarga: namaKepalaKeluarga.trim(),
        nomorKk: nomorKk.trim(),
        qrId: nomorKk.trim(),
        nomorRumah: nomorRumah.trim(),
        kategoriIuran: kategoriIuran,
        tarifPerBulan: tarifPerBulan,
      };

      await setDoc(docRef, updatedWarga);
      return updatedWarga;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Menghapus data warga berdasarkan ID.
   */
  static async deleteWarga(wargaId: string): Promise<void> {
    const path = `warga/${wargaId}`;
    try {
      await deleteDoc(doc(db, "warga", wargaId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  /**
   * Mengambil riwayat transaksi.
   */
  static async getTransactions(): Promise<Transaksi[]> {
    const path = "transactions";
    try {
      const colRef = collection(db, path);
      const snapshot = await getDocs(colRef);
      
      const list: Transaksi[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Transaksi);
      });

      return list.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
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
    const wargaPath = `warga/${wargaId}`;
    let warga: Warga;
    try {
      const wargaRef = doc(db, "warga", wargaId);
      const wargaSnap = await getDoc(wargaRef);
      if (!wargaSnap.exists()) {
        throw new Error("Warga tidak ditemukan");
      }
      warga = wargaSnap.data() as Warga;

      // Tambahkan bulan baru ke history pembayaran warga
      const newHistory = [...warga.historyPembayaran];
      bulanBayar.forEach((b) => {
        if (!newHistory.includes(b)) {
          newHistory.push(b);
        }
      });
      newHistory.sort();

      // Simpan data warga terupdate
      await updateDoc(wargaRef, {
        historyPembayaran: newHistory,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, wargaPath);
    }

    // Jam & tanggal saat ini
    const now = new Date();
    const newTxId = `TX-${now.getTime()}`;

    const newTx: Transaksi = {
      id: newTxId,
      wargaId: warga.id,
      wargaNama: warga.namaKepalaKeluarga,
      wargaNomorRumah: warga.nomorRumah,
      bulanBayar: bulanBayar,
      tarifDasar: tarifDasar,
      totalBayar: customTotalBayar,
      tanggal: now.toISOString(),
      metode: metode,
      status: "LUNAS",
      catatan: catatan || "",
    };

    const txPath = `transactions/${newTxId}`;
    try {
      await setDoc(doc(db, "transactions", newTxId), newTx);
      return newTx;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, txPath);
    }
  }

  /**
   * Mereset seluruh database Firestore dan Local ke semula.
   */
  static async resetDatabase(): Promise<void> {
    localStorage.removeItem("firebase_seeded_v4");

    try {
      // Hapus seluruh warga
      const wargaSnap = await getDocs(collection(db, "warga"));
      const wargaBatch = writeBatch(db);
      wargaSnap.forEach((d) => {
        wargaBatch.delete(d.ref);
      });
      await wargaBatch.commit();

      // Hapus seluruh transaksi
      const txSnap = await getDocs(collection(db, "transactions"));
      const txBatch = writeBatch(db);
      txSnap.forEach((d) => {
        txBatch.delete(d.ref);
      });
      await txBatch.commit();

      // Reseed
      await this.getWargaList();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "all");
    }
  }

  /**
   * Berlangganan (Subscribe) perubahan warga secara real-time.
   */
  static subscribeWarga(callback: (warga: Warga[]) => void) {
    const path = "warga";
    const colRef = collection(db, path);
    return onSnapshot(colRef, (snapshot) => {
      const list: Warga[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Warga);
      });
      const sorted = list.sort((a, b) => a.namaKepalaKeluarga.localeCompare(b.namaKepalaKeluarga, "id"));
      callback(sorted);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  }

  /**
   * Berlangganan (Subscribe) perubahan transaksi secara real-time.
   */
  static subscribeTransactions(callback: (txs: Transaksi[]) => void) {
    const path = "transactions";
    const colRef = collection(db, path);
    return onSnapshot(colRef, (snapshot) => {
      const list: Transaksi[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Transaksi);
      });
      const sorted = list.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
      callback(sorted);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  }
}
