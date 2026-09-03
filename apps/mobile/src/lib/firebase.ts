import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// `@react-native-async-storage/async-storage` is a dependency, so on React Native
// firebase-js-sdk (v11+) auto-selects AsyncStorage-backed auth persistence.
import "@react-native-async-storage/async-storage";

/**
 * Firebase web config is not a secret (it identifies the project). Override per
 * environment with EXPO_PUBLIC_FIREBASE_* if needed; falls back to `kasa-dcabd`.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyCXJ0otoyKsv9k3fSBNOANd2iNbptL18BU",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "kasa-dcabd.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "kasa-dcabd",
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "kasa-dcabd.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID ?? "89768915740",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "1:89768915740:web:f5b001743b13b9ed3040d9",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "europe-west1");
