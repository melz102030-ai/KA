import { View } from "react-native";
import { AppText, Button, Card, Screen, SectionTitle } from "@/components";
import { color, font, radius, space } from "@/theme";

const TX = [
  { id: "1", label: "الكافيتيريا — غداء", amount: -1200, time: "12:30", icon: "🍱" },
  { id: "2", label: "شحن من ولي الأمر", amount: 5000, time: "أمس", icon: "💳" },
  { id: "3", label: "الكافيتيريا — عصير", amount: -500, time: "أمس", icon: "🧃" },
  { id: "4", label: "مكافأة حضور", amount: 1000, time: "الأحد", icon: "🏆" },
];

const sar = (halalas: number) => (halalas / 100).toFixed(2);

export default function WalletScreen() {
  const balance = 4500;
  return (
    <Screen>
      <Card
        accent={color.yellow}
        glow
        style={{ alignItems: "center", paddingVertical: space.xl, marginTop: space.md }}
      >
        <AppText variant="label">الرصيد الحالي</AppText>
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            gap: space.sm,
            marginVertical: space.sm,
          }}
        >
          <AppText style={{ fontFamily: font.family.mono, fontSize: 40, color: color.yellow }}>
            {sar(balance)}
          </AppText>
          <AppText variant="heading" color={color.yellow}>
            ر.س
          </AppText>
        </View>
        <Button label="+ شحن الرصيد" accent={color.yellow} size="sm" />
      </Card>

      <SectionTitle>آخر المعاملات</SectionTitle>
      <View style={{ gap: space.sm }}>
        {TX.map((t) => (
          <Card key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: `${t.amount > 0 ? color.green : color.red}22`,
              }}
            >
              <AppText style={{ fontSize: 20 }}>{t.icon}</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">{t.label}</AppText>
              <AppText variant="label">{t.time}</AppText>
            </View>
            <AppText variant="heading" color={t.amount > 0 ? color.green : color.red}>
              {t.amount > 0 ? "+" : ""}
              {sar(t.amount)}
            </AppText>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
