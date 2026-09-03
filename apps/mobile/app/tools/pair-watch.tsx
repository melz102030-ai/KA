import { useEffect, useState } from "react";
import { View } from "react-native";
import { Imei } from "@akbadna/core";
import { AppText, Badge, Button, Card, Field, RowGroup, Screen } from "@/components";
import { useAuth } from "@/lib/auth";
import { useKids } from "@/data/hooks";
import { call } from "@/lib/functions";
import { USE_FUNCTIONS } from "@/lib/config";
import { color, font, space } from "@/theme";

type Pending = { watchId: string; code: string; expiresAt: number };

export default function PairWatch() {
  const { isDemo } = useAuth();
  const { data: kids } = useKids();
  const [kidId, setKidId] = useState(kids[0]?.id ?? "");
  const [imei, setImei] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((pending.expiresAt - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [pending]);

  const start = async () => {
    setError(null);
    if (!Imei.safeParse(imei).success) {
      setError("رقم IMEI يجب أن يكون 15 رقمًا (اطبع ‎*#06#‎ على الساعة).");
      return;
    }
    setBusy(true);
    try {
      if (USE_FUNCTIONS && !isDemo) {
        const res = await call("startWatchPairing", { kidId, imei });
        setPending({ watchId: res.watchId, code: res.pairingCode, expiresAt: res.expiresAt });
      } else {
        // free plan / demo: preview the code; binding happens once Functions are on
        setPending({
          watchId: "local",
          code: String(Math.floor(100000 + Math.random() * 900000)),
          expiresAt: Date.now() + 10 * 60_000,
        });
      }
    } catch {
      setError("تعذّر بدء الاقتران — تأكد من نشر الدوال والاتصال.");
    } finally {
      setBusy(false);
    }
  };

  if (pending) {
    return (
      <Screen>
        <Card style={{ marginTop: space.md, alignItems: "center", paddingVertical: space.xl }}>
          <AppText variant="label">رمز الاقتران</AppText>
          <AppText
            style={{
              fontFamily: font.family.mono,
              fontSize: 40,
              letterSpacing: 8,
              color: color.text,
              marginVertical: space.sm,
            }}
          >
            {pending.code}
          </AppText>
          <Badge
            label={left > 0 ? `ينتهي خلال ${left} ثانية` : "انتهت صلاحية الرمز"}
            tone={left > 60 ? "primary" : "danger"}
            icon="time-outline"
          />
        </Card>

        <AppText variant="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>
          الخطوات على الساعة
        </AppText>
        <RowGroup>
          <StepRow n="1" text="شغّل تطبيق أكبادنا على ساعة KT37." />
          <StepRow n="2" text="اختر «اقتران» وأدخل الرمز أعلاه." />
          <StepRow n="3" text="تأكد أن الساعة متصلة بالإنترنت (WiFi أو شريحة)." />
        </RowGroup>

        <Button
          label="رمز جديد"
          variant="secondary"
          icon="refresh-outline"
          onPress={() => setPending(null)}
          style={{ marginTop: space.md }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="label" style={{ marginTop: space.md, marginBottom: space.sm }}>
        الطفل
      </AppText>
      <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
        {kids.map((k) => (
          <Button
            key={k.id}
            label={k.name.split(" ")[0] ?? ""}
            size="sm"
            variant={kidId === k.id ? "primary" : "secondary"}
            onPress={() => setKidId(k.id)}
          />
        ))}
      </View>

      <View style={{ marginTop: space.lg }}>
        <Field
          label="IMEI الساعة"
          value={imei}
          onChangeText={(t) => setImei(t.replace(/\D/g, "").slice(0, 15))}
          keyboardType="number-pad"
          placeholder="15 رقمًا"
          style={{ textAlign: "left", fontFamily: font.family.mono, letterSpacing: 2 }}
          error={error ?? undefined}
        />
      </View>

      <Button
        label="بدء الاقتران"
        icon="link-outline"
        loading={busy}
        onPress={start}
        style={{ marginTop: space.lg }}
      />
      {(isDemo || !USE_FUNCTIONS) && (
        <AppText variant="caption" style={{ textAlign: "center", marginTop: space.sm }}>
          يُنشأ رمز للمعاينة — الربط الفعلي بالساعة يُفعَّل مع الدوال عند وصول العتاد
        </AppText>
      )}
    </Screen>
  );
}

function StepRow({ n, text }: { n: string; text: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        borderBottomWidth: 1,
        borderBottomColor: color.border,
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: color.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AppText variant="caption" color={color.primary}>
          {n}
        </AppText>
      </View>
      <AppText variant="body" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}
