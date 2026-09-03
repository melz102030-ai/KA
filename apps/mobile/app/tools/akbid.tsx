import { useState } from "react";
import { View } from "react-native";
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Icon,
  Screen,
} from "@/components";
import { useAuth } from "@/lib/auth";
import { useContacts, useKids } from "@/data/hooks";
import { addContact, resolveAkbadnaId } from "@/data/mutations";
import { color, font, radius, space } from "@/theme";

const AKB_RE = /^AKB-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;

export default function AkbIdScreen() {
  const { isDemo } = useAuth();
  const { data: kids } = useKids();
  const [idx, setIdx] = useState(0);
  const [tab, setTab] = useState<"card" | "add" | "contacts">("card");
  const kid = kids[Math.min(idx, Math.max(0, kids.length - 1))];
  if (!kid) return null;

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

      <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
        {(
          [
            ["card", "البطاقة"],
            ["add", "إضافة"],
            ["contacts", "جهات الاتصال"],
          ] as const
        ).map(([t, label]) => (
          <Button
            key={t}
            label={label}
            size="sm"
            variant={tab === t ? "primary" : "secondary"}
            onPress={() => setTab(t)}
            style={{ flex: 1 }}
          />
        ))}
      </View>

      {tab === "card" && <IdCard name={kid.name} grade={kid.gradeLabel} id={kid.akbadnaId} />}
      {tab === "add" && <AddByCode ownerKidId={kid.id} disabled={isDemo} />}
      {tab === "contacts" && <Contacts kidId={kid.id} demo={isDemo} />}
    </Screen>
  );
}

function IdCard({ name, grade, id }: { name: string; grade?: string; id: string }) {
  return (
    <>
      <Card style={{ marginTop: space.md, alignItems: "center", paddingVertical: space.xl }}>
        <Avatar name={name} size={60} />
        <AppText variant="subtitle" style={{ marginTop: space.md }}>
          {name}
        </AppText>
        <AppText variant="label">{grade}</AppText>
        <View style={styles_idbox}>
          <AppText variant="caption" style={{ textAlign: "center" }}>
            رقم المعرّف الفريد
          </AppText>
          <AppText
            style={{
              fontFamily: font.family.mono,
              fontSize: 22,
              color: color.text,
              letterSpacing: 3,
              marginTop: 4,
              textAlign: "center",
            }}
          >
            {id}
          </AppText>
        </View>
        <Button
          label="نسخ المعرّف"
          size="sm"
          variant="secondary"
          icon="copy-outline"
          style={{ marginTop: space.lg }}
        />
      </Card>
      <Card padding={space.md} style={{ marginTop: space.md, flexDirection: "row", gap: space.sm }}>
        <Icon name="lock-closed-outline" size={16} color={color.textMuted} />
        <AppText variant="label" style={{ flex: 1 }}>
          شارك هذا المعرّف مع من تثق بهم فقط — يتيح التواصل الآمن عبر أكبادنا دون الحاجة لرقم جوال.
        </AppText>
      </Card>
    </>
  );
}

function AddByCode({ ownerKidId, disabled }: { ownerKidId: string; disabled: boolean }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<{
    kidId: string;
    displayName: string;
    schoolName?: string;
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const search = async () => {
    setMsg(null);
    setFound(null);
    if (!AKB_RE.test(code.trim())) {
      setMsg("الصيغة: AKB-XXXX-XXXX");
      return;
    }
    setBusy(true);
    try {
      const r = await resolveAkbadnaId(code.trim());
      if (!r) setMsg("لا يوجد معرّف بهذا الرقم");
      else setFound(r);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!found) return;
    setBusy(true);
    try {
      await addContact({ ownerKidId, akbadnaId: code.trim(), displayName: found.displayName });
      setMsg("تمت الإضافة إلى جهات الاتصال");
      setFound(null);
      setCode("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ marginTop: space.md, gap: space.md }}>
      <Field
        label="معرّف أكبادنا"
        value={code}
        onChangeText={(v) => setCode(v.toUpperCase())}
        placeholder="AKB-XXXX-XXXX"
        autoCapitalize="characters"
        style={{ textAlign: "left", fontFamily: font.family.mono, letterSpacing: 2 }}
      />
      <Button
        label="بحث"
        icon="search-outline"
        loading={busy}
        disabled={disabled}
        onPress={search}
      />
      {disabled && <AppText variant="caption">غير متاح في الوضع التجريبي</AppText>}
      {msg && (
        <AppText variant="caption" color={color.textMuted}>
          {msg}
        </AppText>
      )}
      {found && (
        <Card padding={space.md}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <Avatar name={found.displayName} size={40} tone="success" />
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle">{found.displayName}</AppText>
              {found.schoolName && <AppText variant="label">{found.schoolName}</AppText>}
            </View>
          </View>
          <Button
            label="إضافة"
            icon="person-add-outline"
            loading={busy}
            onPress={add}
            style={{ marginTop: space.sm }}
          />
        </Card>
      )}
    </View>
  );
}

function Contacts({ kidId, demo }: { kidId: string; demo: boolean }) {
  const { data: contacts } = useContacts(demo ? undefined : kidId);
  if (contacts.length === 0)
    return (
      <EmptyState
        icon="people-outline"
        title="لا توجد جهات اتصال"
        subtitle="أضف بالمعرّف من التبويب السابق."
      />
    );
  return (
    <View style={{ marginTop: space.md, gap: space.sm }}>
      {contacts.map((c) => (
        <Card key={c.id} padding={space.md}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <Avatar name={c.displayName} size={38} />
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle">{c.displayName}</AppText>
              <AppText variant="mono" style={{ fontSize: 11 }}>
                {c.akbadnaId}
              </AppText>
            </View>
            <Badge
              label={c.status === "accepted" ? "متصل" : c.status}
              tone={c.status === "accepted" ? "success" : "neutral"}
            />
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles_idbox = {
  marginTop: space.lg,
  paddingVertical: space.md,
  paddingHorizontal: space.xl,
  borderRadius: radius.md,
  backgroundColor: color.bg,
  borderWidth: 1,
  borderColor: color.border,
};
