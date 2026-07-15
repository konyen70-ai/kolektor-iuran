import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  Firestore,
} from "firebase/firestore";

// Konfigurasi dari firebase-applet-config.json
const firebaseConfig = {
  projectId: "fiery-flight-v5xj8",
  appId: "1:470838041915:web:bce61b61e519fb7048ab1e",
  apiKey: "AIzaSyDgLQsRiLuU8jh6ZRj8CKzuIRMggyzOOTw",
  authDomain: "fiery-flight-v5xj8.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-kolektoriuranrt-e79d64f5-ea83-4273-9934-fa47e4338aef",
  storageBucket: "fiery-flight-v5xj8.firebasestorage.app",
  messagingSenderId: "470838041915",
};

export const app = initializeApp(firebaseConfig);

let db: Firestore;

try {
  // Gunakan cache lokal persisten (offline-first) dengan tab manager otomatis
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  }, firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.warn("Gagal menginisialisasi cache persisten lokal, menggunakan Firestore standar:", error);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export { db };
