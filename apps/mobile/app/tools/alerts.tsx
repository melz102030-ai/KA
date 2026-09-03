import { doc, setDoc } from "firebase/firestore";
import { View } from "react-native";
import type { AlertKind } from "@akbadna/core";
import { paths } from "@akbadna/core";
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  type IconName,
  Screen,
} from "@/components";
import { db } from "@/lib/firebase";
import { useAlerts, useKids } from "@/data/hooks";
import { color, space } from "@/theme";

const KIND: Record<AlertKind, { icon: IconName; label: string }> = {
  sos: { icon: "warning", label: "استغاثة" },
  geofence_exit: { icon: "exit-outline", label: "خروج من النطاق" },
  geofence_enter: { icon: "enter-outline", label: "دخول نطاق" },
  low_battery: { icon: "battery-dead-outline", label: "بطارية منخفضة" },
  watch_offline: { icon: "cloud-offline-outline", label: "الساعة غير متصلة" },
  abnormal_heart_rate: { icon: "heart-dislike-outline", label: "نبض غير معتاد" },
  abnormal_temperature: { icon: "thermometer-outline", label: "حرارة مرتفعة" },
  fall_detected: { icon: "alert-circle-outline", label: "اشتباه سقوط" },
  sim_removed: { icon: "hardware-chip-outline", label: "إزالة الشريحة" },
};

export default function AlertsScreen() {
  const { data: kids } = useKids();
  const { data: alerts, loading } = useAlerts(kids.map((k) => k.id));

  const ack = (id: string) =>
    setDoc(
      doc(db, `${paths.alerts()}/${id}`),
      { state: "acknowledged", acknowledgedAt: Date.now(), updatedAt: Date.now() },
      { merge: true },
    );

  if (!loading && alerts.length === 0)
    return (
      <Screen>
        <EmptyState
          icon="notifications-off-outline"
          title="لا توجد تنبيهات"
          subtitle="كل شيء على ما يرام."
        />
      </Screen>
    );

  return (
    <Screen>
      <View style={{ gap: space.sm, paddingTop: space.md }}>
        {alerts.map((a) => {
          const k = KIND[a.kind] ?? { icon: "alert-circle-outline" as IconName, label: a.kind };
          const critical = a.severity === "critical";
          return (
            <Card key={a.id} padding={space.md}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <Icon name={k.icon} size={20} color={critical ? color.danger : color.warning} />
                <View style={{ flex: 1 }}>
                  <AppText variant="subtitle">{a.title}</AppText>
                  {a.detail && <AppText variant="label">{a.detail}</AppText>}
                </View>
                <Badge label={critical ? "حرِج" : "تنبيه"} tone={critical ? "danger" : "warning"} />
              </View>
              {a.state === "open" && (
                <Button
                  label="تم الاطلاع"
                  size="sm"
                  variant="secondary"
                  onPress={() => ack(a.id)}
                  style={{ marginTop: space.sm }}
                />
              )}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
