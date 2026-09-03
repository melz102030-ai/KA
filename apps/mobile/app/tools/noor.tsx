import { useState } from "react";
import { View } from "react-native";
import { AppText, Button, Card, Field, Icon, Screen } from "@/components";
import { color, font, space } from "@/theme";

export default function Noor() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  return (
    <Screen>
      <Card style={{ marginTop: space.md, alignItems: "center", paddingVertical: space.xl }}>
        <View style={styles_mark}>
          <Icon name="business" size={26} color={color.info} />
        </View>
        <AppText variant="subtitle" style={{ marginTop: space.md }}>
          وزارة التعليم — نظام نور
        </AppText>
        <AppText variant="label">ربط بيانات الطالب الرسمية</AppText>
      </Card>

      <View style={{ gap: space.md, marginTop: space.lg }}>
        <Field
          label="رقم هوية ولي الأمر"
          value={id}
          onChangeText={(t) => setId(t.replace(/\D/g, "").slice(0, 10))}
          keyboardType="number-pad"
          placeholder="1XXXXXXXXX"
          style={{ textAlign: "left", fontFamily: font.family.mono }}
        />
        <Field
          label="كلمة المرور"
          value={pw}
          onChangeText={setPw}
          secureTextEntry
          placeholder="••••••••"
        />
      </View>

      <Button
        label="ربط الحساب (قريبًا)"
        icon="link-outline"
        disabled
        style={{ marginTop: space.lg }}
      />

      <Card padding={space.md} style={{ marginTop: space.md, flexDirection: "row", gap: space.sm }}>
        <Icon name="shield-checkmark-outline" size={16} color={color.textMuted} />
        <AppText variant="label" style={{ flex: 1 }}>
          سيتم الربط عبر واجهة رسمية معتمدة من الوزارة عند توفّر الاتفاقية — لا تُخزَّن بيانات
          الدخول في التطبيق.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles_mark = {
  width: 56,
  height: 56,
  borderRadius: 16,
  backgroundColor: color.infoSoft,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
