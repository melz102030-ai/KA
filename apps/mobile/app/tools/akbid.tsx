import { useState } from "react";
import { View } from "react-native";
import { AppText, Avatar, Button, Card, Icon, Screen } from "@/components";
import { useKids } from "@/data/hooks";
import { color, font, radius, space } from "@/theme";

export default function AkbIdScreen() {
  const { data: kids } = useKids();
  const [idx, setIdx] = useState(0);
  const kid = kids[Math.min(idx, kids.length - 1)];
  if (!kid) return null;

  return (
    <Screen>
      {kids.length > 1 && (
        <View style={{ flexDirection: "row", gap: space.sm, paddingTop: space.md }}>
          {kids.map((k, i) => (
            <Button
              key={k.id}
              label={k.name.split(" ")[0] ?? ""}
              size="sm"
              variant={i === idx ? "primary" : "secondary"}
              onPress={() => setIdx(i)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
      )}

      <Card style={{ marginTop: space.md, alignItems: "center", paddingVertical: space.xl }}>
        <Avatar name={kid.name} size={60} />
        <AppText variant="subtitle" style={{ marginTop: space.md }}>
          {kid.name}
        </AppText>
        <AppText variant="label">{kid.gradeLabel}</AppText>

        <View style={styles_idbox}>
          <AppText variant="caption" style={{ textAlign: "center" }}>
            رقم المعرّف الفريد
          </AppText>
          <AppText
            style={{
              fontFamily: font.family.mono,
              fontSize: 22,
              color: color.text,
              letterSpacing: 3,
              marginTop: 4,
              textAlign: "center",
            }}
          >
            {kid.akbadnaId}
          </AppText>
        </View>

        <Button
          label="نسخ المعرّف"
          size="sm"
          variant="secondary"
          icon="copy-outline"
          style={{ marginTop: space.lg }}
        />
      </Card>

      <Card padding={space.md} style={{ marginTop: space.md, flexDirection: "row", gap: space.sm }}>
        <Icon name="lock-closed-outline" size={16} color={color.textMuted} />
        <AppText variant="label" style={{ flex: 1 }}>
          شارك هذا المعرّف مع من تثق بهم فقط — يتيح التواصل الآمن عبر أكبادنا دون الحاجة لرقم جوال.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles_idbox = {
  marginTop: space.lg,
  paddingVertical: space.md,
  paddingHorizontal: space.xl,
  borderRadius: radius.md,
  backgroundColor: color.bg,
  borderWidth: 1,
  borderColor: color.border,
};
