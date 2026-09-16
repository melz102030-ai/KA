import { useState } from "react";
import { View } from "react-native";
import { showAlert } from "@/lib/dialog";
import {
  SCHOOL_STATUS_LABELS,
  arabicCount,
  NOUNS,
  type School,
  type SchoolStatus,
} from "@akbadna/core";
import { AppText, Button, Card, EmptyState, Icon, Screen } from "@/components";
import { useIsOperator, useSchoolsAwaitingReview } from "@/data/hooks";
import { decideSchoolVerification } from "@/data/mutations";
import { alpha, color, font, radius, space } from "@/theme";

/**
 * The top of the chain: the one screen that can make a school real.
 *
 * Everything below it — a teacher's badge, a class roster, a child's location —
 * rests on somebody having checked that this school exists. That somebody is
 * you, and this is where you do it: read the file, ring the published number,
 * then verify or send it back with a reason.
 *
 * Access is not decided here. The account must be listed in config/operators,
 * a document the app cannot write at all, and the database refuses the write
 * to anyone else even if this screen were opened by other means.
 */
export default function OperatorConsole() {
  const isOperator = useIsOperator();
  const { data: schools, loading } = useSchoolsAwaitingReview(isOperator);
  const [busy, setBusy] = useState<string | null>(null);

  if (!isOperator) {
    return (
      <Screen>
        <EmptyState
          icon="lock-closed-outline"
          title="هذه الشاشة لمشغّل النظام"
          subtitle="حسابك غير مُدرَج في قائمة المشغّلين. القائمة تُحرَّر من لوحة Firebase وحدها."
        />
      </Screen>
    );
  }

  const decide = (school: School, to: SchoolStatus, reason?: string) => async () => {
    setBusy(school.id);
    try {
      await decideSchoolVerification({ schoolId: school.id, from: school.status, to, reason });
    } catch (e) {
      showAlert("تعذّر التنفيذ", e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(null);
    }
  };

  const reject = (school: School) => () => {
    const reasons = [
      "رقم الرخصة لا يطابق السجل",
      "لم يُرَد على هاتف المدرسة",
      "الموقع لا يطابق مقر المدرسة",
    ];
    showAlert(
      "إعادة الطلب للتصحيح",
      "اختر السبب — يظهر للمدرسة كما هو.",
      [
        ...reasons.map((r) => ({ text: r, onPress: decide(school, "rejected", r) })),
        { text: "رجوع", style: "cancel" as const },
      ],
      { cancelable: true },
    );
  };

  const row = (label: string, value?: string) => (
    <View key={label} style={{ flexDirection: "row", gap: space.sm, marginTop: space.xs }}>
      <AppText variant="caption" style={{ width: 96 }}>
        {label}
      </AppText>
      <AppText
        style={{ flex: 1, fontFamily: font.family.num, fontSize: font.size.sm, color: color.text }}
      >
        {value ?? "—"}
      </AppText>
    </View>
  );

  return (
    <Screen>
      <View style={{ paddingTop: space.md }}>
        <AppText variant="title">طلبات توثيق المدارس</AppText>
        <AppText variant="caption" style={{ marginTop: space.xs, lineHeight: 20 }}>
          المدرسة لا تعمل قبل اعتمادك. تحقّق بالاتصال على الهاتف المعلن وسؤال مدير المدرسة باسمه، ثم
          قرّر.
        </AppText>
      </View>

      {loading ? (
        <AppText variant="caption" style={{ textAlign: "center", marginTop: space.xl }}>
          جارٍ التحميل…
        </AppText>
      ) : schools.length === 0 ? (
        <EmptyState
          icon="checkmark-done-outline"
          title="لا توجد طلبات معلّقة"
          subtitle="كل المدارس التي أرسلت بياناتها جرى البتّ فيها."
        />
      ) : (
        <>
          <AppText variant="label" style={{ marginBlock: space.md }}>
            {arabicCount(schools.length, NOUNS.school)} بانتظار المراجعة
          </AppText>

          <View style={{ gap: space.sm }}>
            {schools.map((s) => (
              <Card key={s.id} padding={space.md}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <AppText variant="subtitle" style={{ flex: 1 }}>
                    {s.name}
                  </AppText>
                  <View
                    style={{
                      paddingHorizontal: space.sm,
                      paddingVertical: 3,
                      borderRadius: radius.sm,
                      backgroundColor: alpha(color.warning, 0.12),
                    }}
                  >
                    <AppText variant="caption" color={color.warning} weight="bold">
                      {SCHOOL_STATUS_LABELS[s.status]}
                    </AppText>
                  </View>
                </View>

                {row("الرخصة", s.licenceNo)}
                {row("مدير المدرسة", s.headTeacherName)}
                {row("هويته", s.headTeacherNationalId)}
                {row("الهاتف", s.phone)}
                {row(
                  "الموقع",
                  s.location
                    ? `${s.location.lat.toFixed(5)}, ${s.location.lng.toFixed(5)}`
                    : undefined,
                )}

                <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
                  <Button
                    label="توثيق"
                    icon="shield-checkmark-outline"
                    loading={busy === s.id}
                    onPress={decide(s, "verified")}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="إعادة للتصحيح"
                    icon="arrow-undo-outline"
                    variant="secondary"
                    onPress={reject(s)}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            ))}
          </View>
        </>
      )}

      <View
        style={{
          flexDirection: "row",
          gap: space.sm,
          marginTop: space.xl,
          padding: space.md,
          borderRadius: radius.md,
          backgroundColor: alpha(color.moeGreen, 0.06),
          borderWidth: 1,
          borderColor: color.border,
        }}
      >
        <Icon name="information-circle-outline" size={16} color={color.textMuted} />
        <AppText variant="caption" style={{ flex: 1, lineHeight: 20 }}>
          التوثيق يفتح المدرسة بالكامل: التحضير، الدعوات، الجدول، ومتابعة أولياء الأمور. والإيقاف
          يغلقها فورًا دون حذف أي سجل.
        </AppText>
      </View>
    </Screen>
  );
}
