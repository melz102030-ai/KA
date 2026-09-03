import { useState } from "react";
import { Alert, View } from "react-native";
import type { WalletTransaction } from "@akbadna/core";
import {
  AppText,
  Button,
  Card,
  EmptyState,
  Icon,
  type IconName,
  Screen,
  SectionHeader,
} from "@/components";
import { useAuth } from "@/lib/auth";
import { useKids, useWallet, useWalletTx } from "@/data/hooks";
import { topUpWallet } from "@/data/mutations";
import { alpha, color, font, radius, space } from "@/theme";

const sar = (h: number) => (h / 100).toFixed(2);

const KIND_ICON: Record<string, IconName> = {
  topup: "card-outline",
  purchase: "cart-outline",
  refund: "return-down-back-outline",
  reward: "ribbon-outline",
  adjustment: "swap-horizontal-outline",
};

const DEMO_TX = [
  {
    id: "1",
    label: "الكافيتيريا — غداء",
    amount: -1200,
    at: Date.now() - 3600_000,
    kind: "purchase",
  },
  { id: "2", label: "شحن من ولي الأمر", amount: 5000, at: Date.now() - 86_400_000, kind: "topup" },
  {
    id: "3",
    label: "الكافيتيريا — عصير",
    amount: -500,
    at: Date.now() - 90_000_000,
    kind: "purchase",
  },
  { id: "4", label: "مكافأة حضور", amount: 1000, at: Date.now() - 200_000_000, kind: "reward" },
];

export default function WalletScreen() {
  const { isDemo } = useAuth();
  const { data: kids } = useKids();
  const [idx, setIdx] = useState(0);
  const kid = kids[Math.min(idx, Math.max(0, kids.length - 1))];
  const { data: acct } = useWallet(isDemo ? undefined : kid?.id);
  const { data: liveTx } = useWalletTx(isDemo ? undefined : kid?.id);
  const [busy, setBusy] = useState(false);

  const balance = isDemo ? 4500 : (acct?.balance.amount ?? 0);
  const tx = isDemo
    ? DEMO_TX
    : liveTx.map((t: WalletTransaction) => ({
        id: t.id,
        label: t.label,
        amount: t.amount.amount,
        at: t.at,
        kind: t.kind,
      }));

  const topUp = async () => {
    if (isDemo || !kid) return;
    setBusy(true);
    try {
      await topUpWallet(kid.id, 5000);
      Alert.alert("تم", "أُضيف 50.00 ر.س للرصيد.");
    } catch (e) {
      Alert.alert("تعذّر", e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

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
        <Button label="شحن الرصيد" size="sm" icon="add-outline" loading={busy} onPress={topUp} />
      </Card>

      <SectionHeader>آخر المعاملات</SectionHeader>
      {tx.length === 0 ? (
        <EmptyState icon="receipt-outline" title="لا توجد معاملات بعد" />
      ) : (
        <View style={{ gap: space.sm }}>
          {tx.map((t) => {
            const credit = t.amount > 0;
            const icon = KIND_ICON[t.kind] ?? "ellipse-outline";
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
                    <Icon name={icon} size={17} color={credit ? color.success : color.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="subtitle">{t.label}</AppText>
                    <AppText variant="label">
                      {new Date(t.at).toLocaleDateString("ar-SA", {
                        day: "numeric",
                        month: "short",
                      })}
                    </AppText>
                  </View>
                  <AppText variant="subtitle" color={credit ? color.success : color.text}>
                    {credit ? "+" : "−"}
                    {sar(Math.abs(t.amount))}
                  </AppText>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
