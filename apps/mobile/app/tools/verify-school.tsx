import { useState } from "react";
import { View } from "react-native";
import { showAlert } from "@/lib/dialog";
import { router } from "expo-router";
import {
  EVIDENCE_MESSAGES,
  SCHOOL_STATUS_LABELS,
  evidenceProblems,
  schoolCapabilities,
  type SchoolEvidence,
} from "@akbadna/core";
import { AppText, Button, Card, Field, Icon, Screen } from "@/components";
import { useAuth } from "@/lib/auth";
import { useMemberships, useSchool } from "@/data/hooks";
import { submitSchoolVerification } from "@/data/mutations";
import { captureLocation, fmtCoord, type Coords } from "@/lib/geo";
import { alpha, color, font, radius, space } from "@/theme";

/**
 * The school's side of verification.
 *
 * Six fields, each one checkable by a person in a few minutes: ring the
 * published landline and ask for the head teacher by name, read the licence
 * number against a public register, look at where the pin fell. None of it
 * touches the Ministry, and none of it can be satisfied from a sofa — the
 * location is captured live, on site.
 *
 * Nothing about this school runs until the operator answers, so the screen's
 * job is to make the file complete on the first try.
 */
export default function VerifySchool() {
  const { isDemo } = useAuth();
  const { data: memberships } = useMemberships();
  const mine = memberships.find((m) => m.role === "school_admin") ?? memberships[0];
  const schoolId = mine?.schoolId;
  const { data: school } = useSchool(schoolId);

  const status = school?.status ?? "pending";
  const caps = schoolCapabilities(status);

  const [name, setName] = useState(school?.name ?? "");
  const [licenceNo, setLicence] = useState(school?.licenceNo ?? "");
  const [headTeacherName, setHead] = useState(school?.headTeacherName ?? "");
  const [headTeacherNationalId, setHeadId] = useState(school?.headTeacherNationalId ?? "");
  const [phone, setPhone] = useState(school?.phone ?? "+966");
  const [location, setLocation] = useState<Coords | null>(school?.location ?? null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const evidence: SchoolEvidence = {
    name,
    licenceNo,
    headTeacherName,
    headTeacherNationalId,
    phone,
    location: location ? { lat: location.lat, lng: location.lng } : undefined,
  };
  const problems = evidenceProblems(evidence);
  const has = (k: (typeof problems)[number]) => touched && problems.includes(k);

  const locate = async () => {
    setLocating(true);
    try {
      const c = await captureLocation();
      if (!c) {
        showAlert(
          "التقاط الموقع غير متاح هنا",
          "افتح التطبيق من متصفّح الجوال وأنت داخل المدرسة، ثم اضغط «التقط موقع المدرسة».",
        );
        return;
      }
      setLocation(c);
    } catch (e) {
      showAlert("تعذّر تحديد الموقع", e instanceof Error ? e.message : "خطأ");
    } finally {
      setLocating(false);
    }
  };

  const send = async () => {
    setTouched(true);
    if (problems.length) return;
    setBusy(true);
    try {
      if (isDemo) {
        showAlert("وضع تجريبي", "سيُرسل الطلب عند الدخول بحساب مدرسة حقيقي.");
      } else if (schoolId) {
        await submitSchoolVerification({ schoolId, evidence });
        showAlert(
          "وصل الطلب",
          "يراجعه مشغّل النظام. ستعمل المدرسة بالكامل فور اعتمادها، ولا حاجة لإرسال الطلب مرة أخرى.",
        );
      }
      router.back();
    } catch (e) {
      showAlert("تعذّر الإرسال", e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  const err = (k: (typeof problems)[number]) =>
    has(k) ? (
      // Spaced below as well as above: an error that hugs the next label reads
      // as a complaint about the wrong field.
      <AppText
        variant="caption"
        color={color.danger}
        style={{ marginTop: 2, marginBottom: space.sm }}
      >
        {EVIDENCE_MESSAGES[k]}
      </AppText>
    ) : null;

  return (
    <Screen>
      {/* Where the request stands — the first thing the school wants to know. */}
      <Card padding={space.md} style={{ marginTop: space.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <Icon
            name={status === "verified" ? "shield-checkmark-outline" : "time-outline"}
            size={18}
            color={status === "verified" ? color.moeGreen : color.warning}
          />
          <AppText variant="subtitle" style={{ flex: 1 }}>
            {SCHOOL_STATUS_LABELS[status]}
          </AppText>
        </View>
        {caps.notice && (
          <AppText variant="caption" style={{ marginTop: space.xs, lineHeight: 20 }}>
            {caps.notice}
          </AppText>
        )}
        {status === "rejected" && school?.rejectionReason ? (
          <View
            style={{
              marginTop: space.sm,
              padding: space.sm,
              borderRadius: radius.sm,
              backgroundColor: alpha(color.danger, 0.08),
            }}
          >
            <AppText variant="caption" color={color.danger}>
              سبب الإعادة: {school.rejectionReason}
            </AppText>
          </View>
        ) : null}
      </Card>

      {!caps.canSubmit ? (
        <AppText variant="caption" style={{ textAlign: "center", marginTop: space.xl }}>
          لا يوجد إجراء مطلوب منك الآن.
        </AppText>
      ) : (
        <>
          <Field
            label="اسم المدرسة كما هو مسجَّل"
            value={name}
            onChangeText={setName}
            placeholder="متوسطة النور"
          />
          {err("no-name")}

          <Field
            label="رقم المدرسة أو رخصتها"
            value={licenceNo}
            onChangeText={(v) => setLicence(v.replace(/\D/g, ""))}
            placeholder="123456"
            keyboardType="number-pad"
          />
          {err("no-licence")}
          {err("bad-licence")}

          <Field
            label="اسم مدير المدرسة"
            value={headTeacherName}
            onChangeText={setHead}
            placeholder="الاسم الثلاثي"
          />
          {err("no-head-teacher")}

          <Field
            label="رقم هوية مدير المدرسة"
            value={headTeacherNationalId}
            onChangeText={(v) => setHeadId(v.replace(/\D/g, "").slice(0, 10))}
            placeholder="1XXXXXXXXX"
            keyboardType="number-pad"
          />
          {err("bad-head-id")}

          <Field
            label="هاتف المدرسة المعلن"
            value={phone}
            onChangeText={(v) => setPhone(v.replace(/[^\d+]/g, "").slice(0, 13))}
            placeholder="+966112345678"
            keyboardType="phone-pad"
          />
          {err("no-phone")}
          {err("bad-phone")}
          <AppText variant="caption" style={{ marginTop: 2 }}>
            الرقم المعلن للمدرسة — لا رقمك الشخصي. يُتصل به للتحقّق.
          </AppText>

          <AppText variant="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>
            موقع المدرسة:
          </AppText>
          <Card padding={space.md}>
            {location ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <Icon name="location-outline" size={18} color={color.moeGreen} />
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontFamily: font.family.num, fontSize: font.size.md }}>
                    {fmtCoord(location.lat)}, {fmtCoord(location.lng)}
                  </AppText>
                  {location.accuracy !== undefined && (
                    <AppText variant="caption">
                      دقة القياس ±{Math.round(location.accuracy)} متر
                      {location.accuracy > 100 ? " — أعد الالتقاط في الفناء" : ""}
                    </AppText>
                  )}
                </View>
              </View>
            ) : (
              <AppText variant="caption" style={{ lineHeight: 20 }}>
                يُلتقط الموقع وأنت داخل المدرسة. هو الشيء الوحيد في هذا النموذج الذي لا يمكن كتابته
                من البيت، وعليه يقوم التحضير بالنطاق لاحقًا.
              </AppText>
            )}
            <Button
              label={location ? "إعادة التقاط الموقع" : "التقط موقع المدرسة"}
              icon="navigate-outline"
              variant="secondary"
              loading={locating}
              onPress={locate}
              style={{ marginTop: space.sm }}
            />
          </Card>
          {err("no-location")}

          <Button
            label="إرسال للتوثيق"
            icon="send-outline"
            loading={busy}
            onPress={send}
            style={{ marginTop: space.xl }}
          />
          {touched && problems.length > 0 && (
            <AppText
              variant="caption"
              color={color.danger}
              style={{ textAlign: "center", marginTop: space.sm }}
            >
              أكمل الحقول الناقصة أعلاه.
            </AppText>
          )}

          <View
            style={{
              flexDirection: "row",
              gap: space.sm,
              marginTop: space.lg,
              padding: space.md,
              borderRadius: radius.md,
              backgroundColor: alpha(color.moeGreen, 0.06),
              borderWidth: 1,
              borderColor: color.border,
            }}
          >
            <Icon name="shield-checkmark-outline" size={16} color={color.textMuted} />
            <AppText variant="caption" style={{ flex: 1, lineHeight: 20 }}>
              لا يُطلب من المدرسة أي ربط بوزارة التعليم أو نور. هذه البيانات يتحقّق منها مشغّل
              النظام بنفسه، ولا تُرى لأولياء الأمور.
            </AppText>
          </View>
        </>
      )}
    </Screen>
  );
}
