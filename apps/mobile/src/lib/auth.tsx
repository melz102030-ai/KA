import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { paths, type Role, type UserProfile } from "@akbadna/core";
import { auth, db } from "./firebase";
import { call } from "./functions";

type AuthState = {
  initializing: boolean;
  user: User | null;
  profile: UserProfile | null;
  /** Native phone auth needs a dev build; false means only dev sign-in is offered. */
  phoneAuthAvailable: boolean;
  signInDev: (role: Role, displayName?: string) => Promise<void>;
  setActiveRole: (role: Role) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setInitializing(false);
      }
    });
  }, []);

  // Live profile subscription
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, paths.user(user.uid));
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
        setInitializing(false);
      },
      () => setInitializing(false),
    );
    return unsub;
  }, [user]);

  const signInDev = useCallback<AuthState["signInDev"]>(async (role, displayName) => {
    const cred = await signInAnonymously(auth);
    const name = displayName?.trim() || (role === "teacher" ? "معلم" : "ولي أمر");
    try {
      await call("bootstrapProfile", { displayName: name, activeRole: role, locale: "ar" });
    } catch {
      // functions not deployed yet — fall back to a client-written profile
      await setDoc(
        doc(db, paths.user(cred.user.uid)),
        {
          uid: cred.user.uid,
          displayName: name,
          roles: [role],
          activeRole: role,
          locale: "ar",
          fcmTokens: [],
          disabled: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    }
  }, []);

  const setActiveRole = useCallback<AuthState["setActiveRole"]>(
    async (role) => {
      if (!user) return;
      await setDoc(
        doc(db, paths.user(user.uid)),
        { activeRole: role, updatedAt: Date.now() },
        { merge: true },
      );
    },
    [user],
  );

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      initializing,
      user,
      profile,
      phoneAuthAvailable: Platform.OS === "web",
      signInDev,
      setActiveRole,
      signOut,
    }),
    [initializing, user, profile, signInDev, setActiveRole, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

/** Best-effort: ensure a profile doc exists for `uid` (used by tests/tools). */
export async function ensureProfile(uid: string, role: Role): Promise<void> {
  const ref = doc(db, paths.user(uid));
  if ((await getDoc(ref)).exists()) return;
  await setDoc(ref, {
    uid,
    displayName: role === "teacher" ? "معلم" : "ولي أمر",
    roles: [role],
    activeRole: role,
    locale: "ar",
    fcmTokens: [],
    disabled: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}
