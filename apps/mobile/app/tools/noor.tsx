import { useState } from "react";
import { TextInput, View } from "react-native";
import { AppText, Button, Card, Screen } from "@/components";
import { color, font, radius, space } from "@/theme";

const field = {
  backgroundColor: color.surfaceStrong,
  borderColor: color.border,
  borderWidth: 1,
  borderRadius: radius.md,
  padding: space.md,
  color: color.text,
  fontFamily: font.family.sans,
  fontSize: font.size.md,
};

export default function Noor() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  return (
    <Screen>
      <Card
        accent="#1A5276"
        glow
        style={{ alignItems: "center", paddingVertical: space.xl, marginTop: space.md }}
      >
        <AppText style={{ fontSize: 34 }}>🏫</AppText>
        <AppText variant="heading">وزارة التعليم — نظام نور</AppText>
        <AppText variant="label">ربط بيانات الطالب الرسمية</AppText>
      </Card>

      <AppText variant="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>
        رقم هوية ولي الأمر
      </AppText>
      <TextInput
        value={id}
        onChangeText={(t) => setId(t.replace(/\D/g, "").slice(0, 10))}
        keyboardType="number-pad"
        placeholder="1XXXXXXXXX"
        placeholderTextColor={color.textDim}
        style={[field, { fontFamily: font.family.mono, textAlign: "left" }]}
      />

      <AppText variant="label" style={{ marginTop: space.md, marginBottom: space.sm }}>
        كلمة المرور
      </AppText>
      <TextInput
        value={pw}
        onChangeText={setPw}
        secureTextEntry
        placeholder="••••••••"
        placeholderTextColor={color.textDim}
        style={field}
      />

      <Button
        label="🔗 ربط الحساب (قريبًا)"
        accent="#1A5276"
        disabled
        style={{ marginTop: space.lg }}
      />

      <Card
        accent={color.teal}
        style={{ marginTop: space.md, flexDirection: "row", gap: space.sm }}
      >
        <AppText>🔒</AppText>
        <AppText variant="label" style={{ flex: 1 }}>
          سيتم الربط عبر واجهة رسمية معتمدة من الوزارة عند توفّر الاتفاقية — لا تُخزَّن بيانات
          الدخول في التطبيق.
        </AppText>
      </Card>
      <View style={{ height: space.xxl }} />
    </Screen>
  );
}
