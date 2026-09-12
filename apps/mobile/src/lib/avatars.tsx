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

/**
 * What a person's icon shows.
 *
 * `photo` holds a data: URI — the picture never leaves the device. That is the
 * whole point: the Firebase free plan has no Storage bucket, and a child's face
 * is the last thing that should be uploaded somewhere just to render a 44px
 * circle. The capture path caps it at 256² JPEG, so a stored entry is ~30KB.
 */
export type Avatar = { kind: "photo"; uri: string } | { kind: "emoji"; glyph: string };

type Store = Record<string, Avatar>;

const KEY = "akbadna.avatars.v1";

/** Anything above this is a bug in the capture path, not something to persist. */
const MAX_URI_CHARS = 300_000;

type AvatarsState = {
  ready: boolean;
  get: (subjectId?: string) => Avatar | undefined;
  set: (subjectId: string, avatar: Avatar) => void;
  clear: (subjectId: string) => void;
};

const Ctx = createContext<AvatarsState | null>(null);

export function AvatarsProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (live && raw) setStore(JSON.parse(raw) as Store);
      } catch {
        // Corrupt or unavailable storage just means everyone keeps the default glyph.
      } finally {
        if (live) setReady(true);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const write = useCallback((next: Store) => {
    setStore(next);
    void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const value = useMemo<AvatarsState>(
    () => ({
      ready,
      get: (id) => (id ? store[id] : undefined),
      set: (id, avatar) => {
        if (avatar.kind === "photo" && avatar.uri.length > MAX_URI_CHARS) return;
        write({ ...store, [id]: avatar });
      },
      clear: (id) => {
        const next = { ...store };
        delete next[id];
        write(next);
      },
    }),
    [store, ready, write],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAvatars() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAvatars must be used inside <AvatarsProvider>");
  return v;
}

/** Faces first, then the things a child would pick for themselves. */
export const EMOJI_CHOICES = [
  "😀",
  "😎",
  "🤓",
  "🥳",
  "😇",
  "🤗",
  "😺",
  "🦊",
  "🐼",
  "🦁",
  "🐨",
  "🐯",
  "🦄",
  "🐰",
  "🐧",
  "🦉",
  "⚽",
  "🏀",
  "🚀",
  "🌟",
  "🌈",
  "🍎",
  "📚",
  "🎨",
];
