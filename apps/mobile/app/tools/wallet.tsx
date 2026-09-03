import { View } from "react-native";
import { AppText, Button, Card, Icon, type IconName, Screen, SectionHeader } from "@/components";
import { alpha, color, font, radius, space } from "@/theme";

const TX: { id: string; label: string; amount: number; time: string; icon: IconName }[] = [
  {
    id: "1",
    label: "الكافيتيريا — غداء",
    amount: -1200,
    time: "12:30",
    icon: "restaurant-outline",
  },
  { id: "2", label: "شحن من ولي الأمر", amount: 5000, time: "أمس", icon: "card-outline" },
  { id: "3", label: "الكافيتيريا — عصير", amount: -500, time: "أمس", icon: "cafe-outline" },
  { id: "4", label: "مكافأة حضور", amount: 1000, time: "الأحد", icon: "ribbon-outline" },
];

const sar = (h: number) => (h / 100).toFixed(2);

export default function WalletScreen() {
  const balance = 4500;
  return (
    <Screen>
      <Card style={{ marginTop: space.md, alignItems: "center", paddingVertical: space.xl }}>
        <AppText variant="label">الرصيد الحالي</AppText>
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            gap: space.xs,
            marginVertical: space.sm,
          }}
        >
          <AppText style={{ fontFamily: font.family.black, fontSize: 34, color: color.text }}>
            {sar(balance)}
          </AppText>
          <AppText variant="subtitle" color={color.textMuted}>
            ر.س
          </AppText>
        </View>
        <Button label="شحن الرصيد" size="sm" icon="add-outline" />
      </Card>

      <SectionHeader>آخر المعاملات</SectionHeader>
      <View style={{ gap: space.sm }}>
        {TX.map((t) => {
          const credit = t.amount > 0;
          const fg = credit ? color.success : color.text;
          return (
            <Card key={t.id} padding={space.md}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: radius.md,
                    backgroundColor: alpha(credit ? color.success : color.textMuted, 0.1),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={t.icon} size={17} color={credit ? color.success : color.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="subtitle">{t.label}</AppText>
                  <AppText variant="label">{t.time}</AppText>
                </View>
                <AppText variant="subtitle" color={fg}>
                  {credit ? "+" : "−"}
                  {sar(Math.abs(t.amount))}
                </AppText>
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
