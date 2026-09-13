import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import {
  onAuthStateChanged,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut as fbSignOut,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { arrayUnion, doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { paths, type Role, type UserProfile } from "@akbadna/core";
import { auth, db } from "./firebase";
import { call } from "./functions";
import { USE_FUNCTIONS } from "./config";

type PhoneStep = "idle" | "sent";

type AuthState = {
  initializing: boolean;
  authed: boolean;
  isDemo: boolean;
  user: User | null;
  profile: UserProfile | null;
  /** Phone OTP works on web now; native needs a dev build. */
  phoneAuthAvailable: boolean;
  phoneStep: PhoneStep;
  signInDev: (role: Role, displayName?: string) => Promise<void>;
  /** `role` is the mode to enter as; it becomes the account's active role. */
  signInWithNationalId: (nationalId: string, password: string, role?: Role) => Promise<void>;
  registerWithNationalId: (input: {
    nationalId: string;
    password: string;
    displayName: string;
    phone: string;
    role: Role;
  }) => Promise<void>;
  startPhoneVerification: (e164: string) => Promise<void>;
  confirmPhoneCode: (code: string, role: Role, displayName?: string) => Promise<void>;
  resetPhone: () => void;
  setActiveRole: (role: Role) => Promise<void>;
  signOut: () => Promise<void>;
};

/**
 * Firebase Auth has no "national id" provider, so the id is carried as the local
 * part of an address in a domain we own and never send mail to. The id itself is
 * what the person types; this is only how it is keyed inside Firebase.
 */
const idAsEmail = (nationalId: string) => `${nationalId.trim()}@id.akbadna.sa`;

const Ctx = createContext<AuthState | null>(null);

const makeProfile = (
  role: Role,
  name: string,
  uid: string,
  phone?: string,
  nationalId?: string,
): UserProfile => ({
  uid,
  displayName: name,
  ...(phone ? { phone } : {}),
  ...(nationalId ? { nationalId } : {}),
  roles: [role],
  activeRole: role,
  locale: "ar",
  fcmTokens: [],
  disabled: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

/** Create the profile doc after a real sign-in (client-side, free-plan). */
async function ensureProfileDoc(
  uid: string,
  role: Role,
  name: string,
  phone?: string,
  nationalId?: string,
) {
  if (USE_FUNCTIONS) {
    try {
      await call("bootstrapProfile", { displayName: name, activeRole: role, locale: "ar" });
      return;
    } catch {
      /* fall through to client write */
    }
  }
  const ref = doc(db, paths.user(uid));
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await setDoc(ref, { updatedAt: Date.now() }, { merge: true });
  } else {
    await setDoc(ref, makeProfile(role, name, uid, phone, nationalId));
  }
}

/** Invisible reCAPTCHA for web phone auth. */
function webRecaptcha(): RecaptchaVerifier {
  const id = "akbadna-recaptcha";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.style.display = "none";
    document.body.appendChild(el);
  }
  return new RecaptchaVerifier(auth, id, { size: "invisible" });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [remoteProfile, setRemoteProfile] = useState<UserProfile | null>(null);
  const [demoProfile, setDemoProfile] = useState<UserProfile | null>(null);
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("idle");
  const confirmation = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setRemoteProfile(null);
        setInitializing(false);
      }
    });
  }, []);

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
      await ensureProfileDoc(cred.user.uid, role, name);
    } catch {
      setDemoProfile(makeProfile(role, name, "demo-user"));
    }
  }, []);

  const signInWithNationalId = useCallback<AuthState["signInWithNationalId"]>(
    async (nationalId, password, role) => {
      const cred = await signInWithEmailAndPassword(auth, idAsEmail(nationalId), password);
      if (!role) return;
      // arrayUnion as well as activeRole: leaving `roles` behind would make the
      // profile contradict itself — an active role the account does not hold.
      await setDoc(
        doc(db, paths.user(cred.user.uid)),
        { activeRole: role, roles: arrayUnion(role), updatedAt: Date.now() },
        { merge: true },
      );
    },
    [],
  );

  const registerWithNationalId = useCallback<AuthState["registerWithNationalId"]>(
    async ({ nationalId, password, displayName, phone, role }) => {
      const cred = await createUserWithEmailAndPassword(auth, idAsEmail(nationalId), password);
      await ensureProfileDoc(cred.user.uid, role, displayName, phone, nationalId);
    },
    [],
  );

  const startPhoneVerification = useCallback<AuthState["startPhoneVerification"]>(async (e164) => {
    if (Platform.OS !== "web") throw new Error("دخول الجوال يتطلب نسخة تطوير على الأجهزة");
    const verifier = webRecaptcha();
    confirmation.current = await signInWithPhoneNumber(auth, e164, verifier);
    setPhoneStep("sent");
  }, []);

  const confirmPhoneCode = useCallback<AuthState["confirmPhoneCode"]>(
    async (code, role, displayName) => {
      if (!confirmation.current) throw new Error("لم يُرسل رمز بعد");
      const cred = await confirmation.current.confirm(code);
      const name = displayName?.trim() || (role === "teacher" ? "معلم" : "ولي أمر");
      await ensureProfileDoc(cred.user.uid, role, name, cred.user.phoneNumber ?? undefined);
      confirmation.current = null;
      setPhoneStep("idle");
    },
    [],
  );

  const resetPhone = useCallback(() => {
    confirmation.current = null;
    setPhoneStep("idle");
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
    resetPhone();
    if (auth.currentUser) await fbSignOut(auth);
  }, [resetPhone]);

  const profile = remoteProfile ?? demoProfile;

  const value = useMemo<AuthState>(
    () => ({
      initializing,
      authed: !!(user || demoProfile) && !!profile,
      isDemo: !!demoProfile,
      user,
      profile,
      phoneAuthAvailable: Platform.OS === "web",
      phoneStep,
      signInDev,
      signInWithNationalId,
      registerWithNationalId,
      startPhoneVerification,
      confirmPhoneCode,
      resetPhone,
      setActiveRole,
      signOut,
    }),
    [
      initializing,
      user,
      demoProfile,
      profile,
      phoneStep,
      signInDev,
      signInWithNationalId,
      registerWithNationalId,
      startPhoneVerification,
      confirmPhoneCode,
      resetPhone,
      setActiveRole,
      signOut,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

export async function ensureProfile(uid: string, role: Role): Promise<void> {
  const ref = doc(db, paths.user(uid));
  if ((await getDoc(ref)).exists()) return;
  await setDoc(ref, makeProfile(role, role === "teacher" ? "معلم" : "ولي أمر", uid));
}
