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
  /** True once there is a usable session (real or local demo). */
  authed: boolean;
  /** True when running on a local demo session (Firebase not reachable / not set up). */
  isDemo: boolean;
  user: User | null;
  profile: UserProfile | null;
  /** Native phone auth needs a dev build; false means only dev sign-in is offered. */
  phoneAuthAvailable: boolean;
  signInDev: (role: Role, displayName?: string) => Promise<void>;
  setActiveRole: (role: Role) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

const makeProfile = (role: Role, name: string, uid = "demo-user"): UserProfile => ({
  uid,
  displayName: name,
  roles: [role],
  activeRole: role,
  locale: "ar",
  fcmTokens: [],
  disabled: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [remoteProfile, setRemoteProfile] = useState<UserProfile | null>(null);
  const [demoProfile, setDemoProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setRemoteProfile(null);
        setInitializing(false);
      }
    });
  }, []);

  // Live profile subscription (real sessions only)
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, paths.user(user.uid));
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setRemoteProfile(snap.exists() ? (snap.data() as UserProfile) : null);
        setInitializing(false);
      },
      () => setInitializing(false),
    );
    return unsub;
  }, [user]);

  const signInDev = useCallback<AuthState["signInDev"]>(async (role, displayName) => {
    const name = displayName?.trim() || (role === "teacher" ? "معلم" : "ولي أمر");
    try {
      const cred = await signInAnonymously(auth);
      try {
        await call("bootstrapProfile", { displayName: name, activeRole: role, locale: "ar" });
      } catch {
        // functions not deployed — write the profile from the client
        await setDoc(doc(db, paths.user(cred.user.uid)), makeProfile(role, name, cred.user.uid), {
          merge: true,
        });
      }
    } catch {
      // Firebase not set up yet (Anonymous auth off / no Firestore) — run a local demo session
      setDemoProfile(makeProfile(role, name));
    }
  }, []);

  const setActiveRole = useCallback<AuthState["setActiveRole"]>(
    async (role) => {
      if (demoProfile) {
        setDemoProfile((p) => (p ? { ...p, activeRole: role } : p));
        return;
      }
      if (!user) return;
      await setDoc(
        doc(db, paths.user(user.uid)),
        { activeRole: role, updatedAt: Date.now() },
        { merge: true },
      );
    },
    [user, demoProfile],
  );

  const signOut = useCallback(async () => {
    setDemoProfile(null);
    if (auth.currentUser) await fbSignOut(auth);
  }, []);

  const profile = remoteProfile ?? demoProfile;

  const value = useMemo<AuthState>(
    () => ({
      initializing,
      authed: !!(user || demoProfile) && !!profile,
      isDemo: !!demoProfile,
      user,
      profile,
      phoneAuthAvailable: Platform.OS === "web",
      signInDev,
      setActiveRole,
      signOut,
    }),
    [initializing, user, demoProfile, profile, signInDev, setActiveRole, signOut],
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
  await setDoc(ref, makeProfile(role, role === "teacher" ? "معلم" : "ولي أمر", uid));
}
