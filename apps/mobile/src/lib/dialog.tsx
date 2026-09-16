import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { AppText, Button } from "@/components";
import { alpha, color, radius, space } from "@/theme";

/**
 * Dialogs that actually appear.
 *
 * React Native's own Alert is `static alert() {}` on react-native-web — an
 * empty function. The app ships as a web build, so every confirmation, every
 * error and every "saved" message went nowhere: the year-end screen asked for a
 * confirmation that never came, and therefore never closed a year at all.
 *
 * This is the same call shape as Alert.alert, deliberately, so a screen swaps
 * one import and keeps its code. It renders a real Modal, which react-native-web
 * does implement, and works unchanged on a native build.
 */
export type DialogButton = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

type Dialog = { title: string; message?: string; buttons: DialogButton[] };

let present: ((d: Dialog) => void) | null = null;
/** Dialogs raised before the host mounts (e.g. during first render). */
const queued: Dialog[] = [];

export function showAlert(title: string, message?: string, buttons?: DialogButton[]): void {
  const d: Dialog = { title, message, buttons: buttons?.length ? buttons : [{ text: "حسنًا" }] };
  if (present) present(d);
  else queued.push(d);
}

/** Mounted once at the root. Without it, showAlert queues and nothing appears. */
export function DialogHost() {
  const [dialog, setDialog] = useState<Dialog | null>(null);

  useEffect(() => {
    present = setDialog;
    const pending = queued.splice(0, queued.length);
    if (pending.length) setDialog(pending[pending.length - 1]!);
    return () => {
      present = null;
    };
  }, []);

  if (!dialog) return null;

  const close = (b?: DialogButton) => {
    setDialog(null);
    // After the frame, so a button that opens another dialog is not swallowed
    // by the close that follows it.
    setTimeout(() => b?.onPress?.(), 0);
  };

  const cancel = dialog.buttons.find((b) => b.style === "cancel");

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => close(cancel)}>
      <Pressable
        onPress={() => cancel && close(cancel)}
        accessibilityLabel="إغلاق"
        style={{
          flex: 1,
          backgroundColor: alpha("#000000", 0.4),
          alignItems: "center",
          justifyContent: "center",
          padding: space.lg,
        }}
      >
        {/* A press inside the card must not reach the backdrop above. */}
        <Pressable
          onPress={() => {}}
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: color.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: color.border,
            padding: space.lg,
            gap: space.sm,
          }}
        >
          <AppText variant="subtitle" style={{ textAlign: "center" }}>
            {dialog.title}
          </AppText>
          {dialog.message ? (
            <AppText variant="caption" style={{ textAlign: "center", lineHeight: 22 }}>
              {dialog.message}
            </AppText>
          ) : null}

          <View
            style={{
              flexDirection: dialog.buttons.length > 2 ? "column" : "row",
              gap: space.sm,
              marginTop: space.sm,
            }}
          >
            {dialog.buttons.map((b) => (
              <Button
                key={b.text}
                label={b.text}
                variant={
                  b.style === "cancel" ? "ghost" : b.style === "destructive" ? "danger" : "primary"
                }
                onPress={() => close(b)}
                style={dialog.buttons.length > 2 ? undefined : { flex: 1 }}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
