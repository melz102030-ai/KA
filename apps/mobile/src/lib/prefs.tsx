import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CalendarPref } from "@/lib/time";

/**
 * Per-reader display settings.
 *
 * Kept on the device rather than on the user doc on purpose: these are about
 * how this person reads this screen, they must work before sign-in and in demo
 * mode, and writing them to Firestore would cost a round trip for something
 * that has to feel instant.
 */
export type Prefs = {
  calendar: CalendarPref;
};

const DEFAULTS: Prefs = {
  // Hijri leading with the Gregorian under it — what the home card is laid
  // out for. Settings can narrow it to one or the other.
  calendar: "both",
};

const KEY = "akbadna.prefs.v1";

type PrefsState = {
  prefs: Prefs;
  /** False until the stored value has been read, so nothing flashes the default. */
  ready: boolean;
  setCalendar: (c: CalendarPref) => void;
};

const Ctx = createContext<PrefsState | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (live && raw) {
          const saved = JSON.parse(raw) as Partial<Prefs>;
          // Merge over the defaults so a key added in a later version fills in.
          setPrefs({ ...DEFAULTS, ...saved });
        }
      } catch {
        // Unreadable or corrupt storage just means the defaults stand.
      } finally {
        if (live) setReady(true);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      // Fire-and-forget: the UI already has the new value, and a failed write
      // only costs the setting on next launch.
      void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<PrefsState>(
    () => ({ prefs, ready, setCalendar: (calendar) => update({ calendar }) }),
    [prefs, ready, update],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return v;
}
