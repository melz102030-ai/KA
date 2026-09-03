// ─── Auth + session ──────────────────────────────────────────────────────────
// The Nafath / QuickUnlock screens stay as the UI. Behind them:
//   • a real Firebase anonymous auth session (persisted by Firebase across reloads)
//   • the user profile { role, pin, faceId } stored in Firestore at users/{uid}
// So "saved session" = Firebase auth persistence + the Firestore profile doc.
import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase.js";

const profileRef = (uid) => doc(db, "users", uid);

async function loadProfile(uid) {
  const snap = await getDoc(profileRef(uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Fires immediately with the current state, then on every auth change.
 * @param {(state: { user: import('firebase/auth').User|null, profile: object|null }) => void} cb
 * @returns {() => void} unsubscribe
 */
export function watchSession(cb) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return cb({ user: null, profile: null });
    let profile = null;
    try {
      profile = await loadProfile(user.uid);
    } catch {
      /* offline / rules — treat as no profile */
    }
    cb({ user, profile });
  });
}

/** Called by NafathLogin.onSuccess — creates the auth session + profile. */
export async function nafathSignIn(role, pin, faceId) {
  const { user } = await signInAnonymously(auth);
  const profile = {
    role,
    pin: pin ?? null,
    faceId: !!faceId,
    savedAt: Date.now(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(profileRef(user.uid), profile, { merge: true });
  return profile;
}

/** Persist a role switch (More page). */
export async function updateRole(role) {
  if (!auth.currentUser) return;
  await setDoc(
    profileRef(auth.currentUser.uid),
    { role, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/** Full logout — ends the Firebase session. Profile doc is left in place. */
export async function signOutSession() {
  await signOut(auth);
}
