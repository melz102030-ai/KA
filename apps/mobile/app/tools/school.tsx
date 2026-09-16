import { useState } from "react";
import { router } from "expo-router";
import { Alert, View } from "react-native";
import {
  MEMBERSHIP_STATUS_LABELS,
  SCHOOL_STATUS_LABELS,
  canInvite,
  schoolCapabilities,
  type Role,
} from "@akbadna/core";
import { AppText, Button, Card, EmptyState, Icon, ListRow, RowGroup, Screen } from "@/components";
import { useAuth } from "@/lib/auth";
import { useClass, useMemberships, useRoster, useSchool } from "@/data/hooks";
import { createInviteCode } from "@/data/mutations";
import { alpha, color, font, radius, space } from "@/theme";

/**
 * The school's own console: who is on staff, who is enrolled, and the two
 * invitations the school is allowed to issue.
 *
 * This is the middle link of the chain. Without it a school has no way to say
 * who teaches there — anyone could register as a teacher and claim the school,
 * which is exactly what the app allowed before.
 */
export default function SchoolConsole() {
  const { profile, isDemo } = useAuth();
  const { data: memberships } = useMemberships();
  const mine = memberships.find((m) => m.role === "school_admin") ?? memberships[0];
  const schoolId = mine?.schoolId;
  const classId = mine?.classIds[0];

  const { data: school } = useSchool(schoolId);
  const { data: cls } = useClass(schoolId, classId);
  const { data: roster } = useRoster(cls?.studentIds ?? []);

  const [code, setCode] = useState<{ value: string; grants: Role } | null>(null);
  const [busy, setBusy] = useState<Role | null>(null);

  // A sample school so the console shows what it does before one is created.
  const demo = {
    name: "متوسطة النور",
    status: "pending" as const,
    staff: 3,
    students: 6,
    pending: 2,
  };

  const status = isDemo ? demo.status : (school?.status ?? "pending");
  const caps = schoolCapabilities(status);
  const myRole: Role = (profile?.activeRole as Role) ?? "teacher";
  const isAdmin = memberships.some((m) => m.role === "school_admin");

  const invite = (grants: Role) => async () => {
    if (isDemo) {
      setCode({ value: "N7K4QP", grants });
      return;
    }
    if (!schoolId) return;
    setBusy(grants);
    try {
      const value = await createInviteCode({
        schoolId,
        classId: grants === "parent" ? classId : undefined,
        inviterRole: isAdmin ? "school_admin" : myRole,
        grants,
        expiresInDays: 14,
      });
      setCode({ value, grants });
    } catch (e) {
      Alert.alert("تعذّر إصدار الدعوة", e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(null);
    }
  };

  if (!schoolId && !isDemo) {
    return (
      <Screen>
        <AppText variant="title" style={{ paddingVertical: space.md }}>
          المدرسة
        </AppText>
        <EmptyState
          icon="business-outline"
          title="لا توجد مدرسة مرتبطة"
          subtitle="أنشئ مدرسة من شاشة التهيئة، أو انضم لمدرسة قائمة برمز دعوة."
        />
      </Screen>
    );
  }

  const staff = memberships.filter((m) => m.role === "teacher" || m.role === "school_admin");
  const counts = isDemo
    ? { students: demo.students, staff: demo.staff, pending: demo.pending }
    : {
        students: roster.length,
        staff: staff.length,
        pending: roster.filter((k) => k.enrolmentStatus === "pending").length,
      };

  return (
    <Screen>
      <AppText variant="title" style={{ paddingTop: space.md }}>
        {isDemo ? "متوسطة النور" : (school?.name ?? "المدرسة")}
      </AppText>

      {/* Standing — a parent joining deserves to know how far this school has
          been vouched for. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          marginBlock: space.sm,
        }}
      >
        <View
          style={{
            paddingHorizontal: space.sm,
            paddingVertical: 3,
            borderRadius: radius.sm,
            backgroundColor:
              status === "verified" ? color.moeGreenSoft : alpha(color.warning, 0.12),
          }}
        >
          <AppText
            variant="caption"
            color={status === "verified" ? color.moeGreen : color.warning}
            weight="bold"
          >
            {SCHOOL_STATUS_LABELS[status]}
          </AppText>
        </View>
        <AppText variant="caption" style={{ flex: 1 }}>
          {caps.notice ?? "يمكن للمدرسة دعوة المعلمين وأولياء الأمور."}
        </AppText>
      </View>

      <View style={{ flexDirection: "row", gap: space.sm, marginBlock: space.md }}>
        {[
          ["الطلاب", counts.students],
          ["هيئة التدريس", counts.staff],
          ["بانتظار الاعتماد", counts.pending],
        ].map(([label, n]) => (
          <View
            key={String(label)}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: space.sm,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: alpha(color.moeGreen, 0.3),
              backgroundColor: color.moeGreenSoft,
            }}
          >
            <AppText
              style={{ fontFamily: font.family.numBold, fontSize: 20, color: color.moeGreen }}
            >
              {String(n)}
            </AppText>
            <AppText variant="caption">{String(label)}</AppText>
          </View>
        ))}
      </View>

      <AppText variant="label" style={{ marginBottom: space.sm }}>
        دعوة إلى المدرسة
      </AppText>

      {!caps.canRecruit && (
        <Card padding={space.md} style={{ marginBottom: space.sm }}>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Icon name="lock-closed-outline" size={16} color={color.warning} />
            <AppText variant="caption" style={{ flex: 1 }}>
              {caps.notice}
            </AppText>
          </View>
        </Card>
      )}

      <View style={{ gap: space.sm }}>
        <Button
          label="دعوة معلم"
          icon="school-outline"
          variant="secondary"
          loading={busy === "teacher"}
          disabled={!caps.canRecruit || !canInvite(isAdmin ? "school_admin" : myRole, "teacher")}
          onPress={invite("teacher")}
        />
        <Button
          label="دعوة أولياء أمور الفصل"
          icon="people-outline"
          variant="secondary"
          loading={busy === "parent"}
          disabled={!caps.canRecruit}
          onPress={invite("parent")}
        />
      </View>

      {!isAdmin && (
        <AppText variant="caption" style={{ marginTop: space.sm }}>
          دعوة المعلمين لمدير المدرسة وحده — المعلم يدعو أولياء أمور فصله فقط.
        </AppText>
      )}

      {code && (
        <Card style={{ marginTop: space.md, borderColor: color.moeGreen }}>
          <AppText variant="label">
            رمز دعوة {code.grants === "teacher" ? "معلم" : "ولي أمر"} — صالح ١٤ يومًا
          </AppText>
          <AppText
            style={{
              fontFamily: font.family.numBold,
              fontSize: 30,
              letterSpacing: 6,
              color: color.moeGreen,
              textAlign: "center",
              marginBlock: space.sm,
            }}
          >
            {code.value}
          </AppText>
          <AppText variant="caption" style={{ textAlign: "center" }}>
            شاركه مع الشخص المعني. لا يمنح إلا الصفة المكتوبة أعلاه.
          </AppText>
        </Card>
      )}

      <AppText variant="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>
        العام الدراسي
      </AppText>
      <Button
        label="إنهاء العام وترفيع الطلاب"
        icon="calendar-outline"
        variant="secondary"
        onPress={() => router.push("/tools/year-end")}
      />

      <AppText variant="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>
        هيئة التدريس
      </AppText>
      {isDemo ? (
        <RowGroup>
          <ListRow
            icon="shield-checkmark-outline"
            title="أنت"
            subtitle="مدير المدرسة"
            value="معتمَد"
            chevron={false}
          />
          <ListRow
            icon="school-outline"
            title="أ. سعد الحربي"
            subtitle="معلم"
            value="معتمَد"
            chevron={false}
          />
          <ListRow
            icon="school-outline"
            title="أ. ماجد العنزي"
            subtitle="معلم"
            value="بانتظار القبول"
            chevron={false}
          />
        </RowGroup>
      ) : staff.length === 0 ? (
        <EmptyState icon="people-outline" title="لا يوجد معلمون بعد" />
      ) : (
        <RowGroup>
          {staff.map((m) => (
            <ListRow
              key={m.id}
              icon={m.role === "school_admin" ? "shield-checkmark-outline" : "school-outline"}
              title={m.uid === profile?.uid ? "أنت" : m.uid.slice(0, 10)}
              subtitle={m.role === "school_admin" ? "مدير المدرسة" : "معلم"}
              value={MEMBERSHIP_STATUS_LABELS[m.status ?? "active"]}
              chevron={false}
            />
          ))}
        </RowGroup>
      )}
    </Screen>
  );
}
