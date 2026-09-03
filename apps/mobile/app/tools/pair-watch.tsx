import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { Imei } from "@akbadna/core";
import { AppText, Button, Card, Screen } from "@/components";
import { useAuth } from "@/lib/auth";
import { useKids } from "@/data/hooks";
import { call } from "@/lib/functions";
import { color, font, radius, space } from "@/theme";

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
      setError("رقم IMEI يجب أن يكون 15 رقمًا (اطبع *#06# على الساعة).");
      return;
    }
    setBusy(true);
    try {
      if (isDemo) {
        setPending({
          watchId: "demo-watch",
          code: String(Math.floor(100000 + Math.random() * 900000)),
          expiresAt: Date.now() + 10 * 60_000,
        });
      } else {
        const res = await call("startWatchPairing", { kidId, imei });
        setPending({ watchId: res.watchId, code: res.pairingCode, expiresAt: res.expiresAt });
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
        <Card
          accent={left > 0 ? color.teal : color.red}
          glow
          style={{ alignItems: "center", paddingVertical: space.xl, marginTop: space.md }}
        >
          <AppText variant="label">رمز الاقتران</AppText>
          <AppText
            style={{
              fontFamily: font.family.mono,
              fontSize: 44,
              letterSpacing: 8,
              color: color.text,
              marginVertical: space.sm,
            }}
          >
            {pending.code}
          </AppText>
          <AppText variant="label" color={left > 60 ? color.teal : color.red}>
            {left > 0 ? `ينتهي خلال ${left} ثانية` : "انتهت صلاحية الرمز"}
          </AppText>
        </Card>

        <Card style={{ marginTop: space.md, gap: space.sm }}>
          <AppText variant="heading">الخطوات على الساعة</AppText>
          <AppText variant="label">١. شغّل تطبيق أكبادنا على ساعة KT37.</AppText>
          <AppText variant="label">٢. اختر «اقتران» وأدخل الرمز أعلاه.</AppText>
          <AppText variant="label">٣. تأكد أن الساعة متصلة بالإنترنت (WiFi أو شريحة).</AppText>
        </Card>

        <Button
          label="رمز جديد"
          accent={color.teal}
          variant="outline"
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
            label={`${k.photoEmoji} ${k.name.split(" ")[0]}`}
            size="sm"
            variant={kidId === k.id ? "solid" : "outline"}
            accent={color.teal}
            onPress={() => setKidId(k.id)}
          />
        ))}
      </View>

      <AppText variant="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>
        IMEI الساعة
      </AppText>
      <TextInput
        value={imei}
        onChangeText={(t) => setImei(t.replace(/\D/g, "").slice(0, 15))}
        keyboardType="number-pad"
        placeholder="١٥ رقمًا"
        placeholderTextColor={color.textDim}
        style={{
          backgroundColor: color.surfaceStrong,
          borderColor: color.border,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: space.md,
          color: color.text,
          fontFamily: font.family.mono,
          fontSize: font.size.lg,
          letterSpacing: 2,
          textAlign: "left",
        }}
      />
      {error && (
        <AppText variant="label" color={color.red} style={{ marginTop: space.sm }}>
          {error}
        </AppText>
      )}

      <Button
        label="بدء الاقتران"
        accent={color.teal}
        loading={busy}
        onPress={start}
        style={{ marginTop: space.lg }}
      />
      {isDemo && (
        <AppText variant="label" style={{ textAlign: "center", marginTop: space.sm }}>
          وضع تجريبي — سيُنشأ رمز وهمي
        </AppText>
      )}
    </Screen>
  );
}
