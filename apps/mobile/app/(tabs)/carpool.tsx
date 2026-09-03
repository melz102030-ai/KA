import { View } from "react-native";
import { AppText, Card, Screen } from "@/components";
import { color, space } from "@/theme";

const STEPS = [
  { icon: "🔍", title: "ابحث أو أعلن", body: "اعثر على رحلة قريبة أو أعلن مقاعدك الفارغة" },
  { icon: "🤝", title: "طلب وموافقة", body: "نظام طلب/قبول داخل التطبيق مع محادثة مباشرة" },
  { icon: "🛰️", title: "تتبع مباشر", body: "الساعة تتتبع الرحلة والوصول لحظيًا مع ETA" },
];

export default function Carpool() {
  return (
    <Screen>
      <AppText variant="title" style={{ paddingVertical: space.lg }}>
        🚗 كاربول
      </AppText>

      <Card
        accent={color.teal}
        glow
        style={{ alignItems: "center", paddingVertical: space.xl, marginBottom: space.lg }}
      >
        <AppText style={{ fontSize: 40, marginBottom: space.sm }}>🚗</AppText>
        <AppText variant="heading">شبكة توصيل أولياء الأمور</AppText>
        <AppText variant="label" style={{ textAlign: "center", marginTop: space.xs }}>
          قيد التطوير — الشاشة القادمة في خارطة الطريق
        </AppText>
      </Card>

      <View style={{ gap: space.md }}>
        {STEPS.map((s) => (
          <Card key={s.title} style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
            <AppText style={{ fontSize: 26 }}>{s.icon}</AppText>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">{s.title}</AppText>
              <AppText variant="label">{s.body}</AppText>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
