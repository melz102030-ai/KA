// ─── Firebase ────────────────────────────────────────────────────────────────
// Web config is safe to ship in client code — it only identifies the project.
// Real protection comes from Firebase Security Rules (Firestore / Storage / Auth),
// so lock those down in the Firebase console before going live.
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCXJ0otoyKsv9k3fSBNOANd2iNbptL18BU",
  authDomain: "kasa-dcabd.firebaseapp.com",
  projectId: "kasa-dcabd",
  storageBucket: "kasa-dcabd.firebasestorage.app",
  messagingSenderId: "89768915740",
  appId: "1:89768915740:web:f5b001743b13b9ed3040d9",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
