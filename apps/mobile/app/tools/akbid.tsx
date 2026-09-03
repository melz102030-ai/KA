import { useState } from "react";
import { View } from "react-native";
import { AppText, Avatar, Button, Card, Screen } from "@/components";
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
              label={`${k.photoEmoji} ${k.name.split(" ")[0]}`}
              size="sm"
              variant={i === idx ? "solid" : "outline"}
              accent={color.purple}
              onPress={() => setIdx(i)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
      )}

      <Card
        accent={color.purple}
        glow
        style={{ marginTop: space.md, alignItems: "center", paddingVertical: space.xl }}
      >
        <Avatar emoji={kid.photoEmoji} size={64} accent={color.purple} />
        <AppText variant="heading" style={{ marginTop: space.sm }}>
          {kid.name}
        </AppText>
        <AppText variant="label">{kid.gradeLabel}</AppText>

        <View
          style={{
            marginTop: space.lg,
            paddingVertical: space.md,
            paddingHorizontal: space.xl,
            borderRadius: radius.lg,
            backgroundColor: "rgba(0,0,0,0.25)",
          }}
        >
          <AppText variant="label" style={{ textAlign: "center" }}>
            رقم المعرّف الفريد
          </AppText>
          <AppText
            style={{
              fontFamily: font.family.mono,
              fontSize: 24,
              color: color.text,
              letterSpacing: 3,
              marginTop: 4,
            }}
          >
            {kid.akbadnaId}
          </AppText>
        </View>

        <Button
          label="📋 نسخ المعرّف"
          accent={color.teal}
          size="sm"
          style={{ marginTop: space.lg }}
        />
      </Card>

      <Card
        accent={color.teal}
        style={{ marginTop: space.md, flexDirection: "row", gap: space.sm }}
      >
        <AppText>🔒</AppText>
        <AppText variant="label" style={{ flex: 1 }}>
          شارك هذا المعرّف مع من تثق به فقط — يتيح التواصل الآمن عبر أكبادنا دون الحاجة لرقم جوال.
        </AppText>
      </Card>
    </Screen>
  );
}
