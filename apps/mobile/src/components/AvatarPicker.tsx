import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, View } from "react-native";
import { AppText, Button, Icon } from "@/components";
import { EMOJI_CHOICES, useAvatars, type Avatar } from "@/lib/avatars";
import { canCartoonify, cartoonify, pickFromLibrary, takePhoto } from "@/lib/photo";
import { color, radius, space } from "@/theme";

const PREVIEW = 132;

/**
 * Opened by tapping someone's circle. Everything it produces is written to the
 * device only — see the note in lib/avatars.
 */
export function AvatarPicker({
  subjectId,
  name,
  visible,
  onClose,
}: {
  subjectId: string;
  name?: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { get, set, clear } = useAvatars();
  const current = get(subjectId);

  const [draft, setDraft] = useState<Avatar | null>(null);
  const [busy, setBusy] = useState<null | "camera" | "library" | "cartoon">(null);
  const [err, setErr] = useState<string | null>(null);
  // The un-cartooned capture, so the toggle can go back without re-shooting.
  const [original, setOriginal] = useState<string | null>(null);

  const shown = draft ?? current;

  const capture = (source: "camera" | "library") => async () => {
    setErr(null);
    setBusy(source);
    try {
      const res = await (source === "camera" ? takePhoto() : pickFromLibrary());
      if (res && "error" in res) setErr(res.error);
      else if (res) {
        setOriginal(res.uri);
        setDraft({ kind: "photo", uri: res.uri });
      }
    } catch {
      setErr("تعذّر فتح الكاميرا على هذا الجهاز");
    } finally {
      setBusy(null);
    }
  };

  const toCartoon = async () => {
    if (!shown || shown.kind !== "photo") return;
    setErr(null);
    setBusy("cartoon");
    try {
      setDraft({ kind: "photo", uri: await cartoonify(shown.uri) });
    } catch {
      setErr("تعذّر تحويل الصورة");
    } finally {
      setBusy(null);
    }
  };

  const close = () => {
    setDraft(null);
    setOriginal(null);
    setErr(null);
    onClose();
  };

  const save = () => {
    if (draft) set(subjectId, draft);
    close();
  };

  const photoShown = shown?.kind === "photo";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: color.overlay, justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: color.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: space.lg,
            gap: space.md,
            maxHeight: "90%",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <AppText variant="subtitle" style={{ flex: 1 }}>
              صورة {name ?? "المستخدم"}
            </AppText>
            <Pressable onPress={close} hitSlop={12}>
              <Icon name="close" size={22} color={color.textMuted} />
            </Pressable>
          </View>

          <View style={{ alignItems: "center", gap: space.sm }}>
            <View
              style={{
                width: PREVIEW,
                height: PREVIEW,
                borderRadius: PREVIEW / 2,
                backgroundColor: color.primarySoft,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderWidth: 2,
                borderColor: color.border,
              }}
            >
              {shown?.kind === "photo" ? (
                <Image
                  source={{ uri: shown.uri }}
                  style={{ width: PREVIEW, height: PREVIEW }}
                  resizeMode="cover"
                />
              ) : shown?.kind === "emoji" ? (
                <AppText style={{ fontSize: PREVIEW * 0.55 }}>{shown.glyph}</AppText>
              ) : (
                <Icon name="person" size={PREVIEW * 0.5} color={color.primary} />
              )}
            </View>
            {err && (
              <AppText variant="caption" color={color.danger} style={{ textAlign: "center" }}>
                {err}
              </AppText>
            )}
          </View>

          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button
              label="الكاميرا"
              icon="camera-outline"
              variant="secondary"
              loading={busy === "camera"}
              onPress={capture("camera")}
              style={{ flex: 1 }}
            />
            <Button
              label="من الصور"
              icon="images-outline"
              variant="secondary"
              loading={busy === "library"}
              onPress={capture("library")}
              style={{ flex: 1 }}
            />
          </View>

          {photoShown && canCartoonify && (
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Button
                label="حوّلها كرتون"
                icon="color-wand-outline"
                variant="secondary"
                loading={busy === "cartoon"}
                onPress={toCartoon}
                style={{ flex: 1 }}
              />
              {original && (
                <Button
                  label="الأصلية"
                  variant="ghost"
                  onPress={() => setDraft({ kind: "photo", uri: original })}
                />
              )}
            </View>
          )}

          <AppText variant="label">أو اختر رمزًا</AppText>
          <ScrollView style={{ maxHeight: 152 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
              {EMOJI_CHOICES.map((glyph) => {
                const active = shown?.kind === "emoji" && shown.glyph === glyph;
                return (
                  <Pressable
                    key={glyph}
                    onPress={() => setDraft({ kind: "emoji", glyph })}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: radius.md,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? color.primarySoft : color.surfaceAlt,
                      borderWidth: 1,
                      borderColor: active ? color.primary : color.border,
                    }}
                  >
                    <AppText style={{ fontSize: 26 }}>{glyph}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button
              label="حفظ"
              icon="checkmark"
              disabled={!draft}
              onPress={save}
              style={{ flex: 1 }}
            />
            {current && (
              <Button
                label="إزالة"
                variant="danger"
                onPress={() => {
                  clear(subjectId);
                  close();
                }}
              />
            )}
          </View>

          <AppText variant="caption" style={{ textAlign: "center" }}>
            الصورة تُحفظ على هذا الجهاز فقط ولا تُرفع إلى أي خادم.
          </AppText>
        </View>
      </View>
    </Modal>
  );
}

/** The circle itself: shows whatever is stored, opens the picker when tapped. */
export function EditableAvatar({
  subjectId,
  name,
  size = 44,
}: {
  subjectId: string;
  name?: string;
  size?: number;
}) {
  const { get } = useAvatars();
  const [open, setOpen] = useState(false);
  const avatar = get(subjectId);

  return (
    <>
      <Pressable
        onPress={(e) => {
          e?.stopPropagation?.();
          setOpen(true);
        }}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={name ? `تغيير صورة ${name}` : "تغيير الصورة"}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color.primarySoft,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {avatar?.kind === "photo" ? (
            <Image
              source={{ uri: avatar.uri }}
              style={{ width: size, height: size }}
              resizeMode="cover"
            />
          ) : avatar?.kind === "emoji" ? (
            <AppText style={{ fontSize: size * 0.55 }}>{avatar.glyph}</AppText>
          ) : (
            <Icon name="person" size={size * 0.5} color={color.primary} />
          )}
        </View>
        {/* A small pencil so it reads as tappable rather than decorative. */}
        <View
          style={{
            position: "absolute",
            insetInlineStart: 0,
            bottom: 0,
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size * 0.2,
            backgroundColor: color.surface,
            borderWidth: 1,
            borderColor: color.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="camera" size={size * 0.22} color={color.primary} />
        </View>
      </Pressable>

      <AvatarPicker
        subjectId={subjectId}
        name={name}
        visible={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
