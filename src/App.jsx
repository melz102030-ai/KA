import { useState, useEffect, useRef, useCallback } from "react";
import { watchSession, nafathSignIn, updateRole, signOutSession } from "./auth.js";
import { useKids, useMessages } from "./data/store.js";

// ─── Google Fonts ────────────────────────────────────────────────────────────
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=Space+Mono:wght@400;700&display=swap');`;

// ─── Global CSS ──────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
${FONTS}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #070711; color: #fff; font-family: 'Tajawal', sans-serif; direction: rtl; }
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 3px; }
button { font-family: 'Tajawal', sans-serif; cursor: pointer; }
input, select { font-family: 'Tajawal', sans-serif; }

@keyframes fadeUp   { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
@keyframes slideIn  { from { opacity:0; transform:translateX(-16px); } to { opacity:1; transform:translateX(0); } }
@keyframes pulseDot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.4; transform:scale(1.3); } }
@keyframes ring     { 0%,100% { transform:scale(1); opacity:.8; } 50% { transform:scale(2.2); opacity:0; } }
@keyframes bounce   { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-7px); } }
@keyframes spin     { to { transform:rotate(360deg); } }
@keyframes carMove  { 0% { transform:translateX(0); } 100% { transform:translateX(170px); } }
@keyframes sosPulse { 0%,100% { box-shadow:0 0 0 0 rgba(239,68,68,0); } 50% { box-shadow:0 0 0 8px rgba(239,68,68,.2); } }
@keyframes notifIn  { from { opacity:0; transform:translateY(-20px) scale(.95); } to { opacity:1; transform:translateY(0) scale(1); } }
@keyframes watchBuzz{ 0%,100%{transform:rotate(-6deg)} 50%{transform:rotate(6deg)} }
@keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes pop      { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
@keyframes scan     { 0%{top:16px} 100%{top:94px} }
@keyframes watchPop { 0%{transform:scale(0)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
`;

// ─── Theme ───────────────────────────────────────────────────────────────────
const T = {
  teal:   "#4ECDC4", tealD: "#2BB5AB",
  blue:   "#45B7D1",
  green:  "#22c55e", greenD: "#16a34a",
  yellow: "#f59e0b",
  red:    "#ef4444",
  purple: "#a78bfa",
  pink:   "#FF6B9D",
  bg:     "#070711",
  card:   "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  text:   "#fff",
  muted:  "#888",
  dim:    "#444",
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
const USER = { name: "أبو أحمد", role: "parent" };

const KIDS = [
  { id:"K1", name:"أحمد محمد الغامدي",  grade:"أول متوسط - أ",   photo:"👦", school:"متوسطة النور", hr:82,  temp:36.7, battery:78, status:"in_class", akbId:"AKB-7X3K-9P2Q" },
  { id:"K2", name:"منى محمد الغامدي",   grade:"ثاني ابتدائي - ب", photo:"👧", school:"ابتدائية الأمل", hr:88, temp:36.5, battery:91, status:"break", akbId:"AKB-4M8T-1L6R" },
];

// ── Mock directory of other Akbadna-ID watches (for "add by ID") ──
const ID_DIRECTORY = [
  { akbId:"AKB-2H5D-8N4W", name:"خالد سعد الدوسري",   photo:"🧒", grade:"ثالث متوسط",   school:"متوسطة النور",   parent:"أبو خالد"  },
  { akbId:"AKB-9R1C-3F7Y",  name:"لينا فيصل الزهراني", photo:"👧", grade:"أول ابتدائي",  school:"ابتدائية الأمل", parent:"أبو فيصل"  },
  { akbId:"AKB-6Q4Z-2K8X",  name:"عمر ناصر القحطاني",  photo:"👦", grade:"ثاني متوسط",   school:"متوسطة النور",   parent:"أبو عمر"   },
];


const SCHEDULE = [
  { id:1, name:"الطابور",      start:"07:00", end:"07:30", icon:"🌅", color:"#FF6B35" },
  { id:2, name:"الحصة الأولى", start:"07:30", end:"08:15", icon:"📚", color:"#4ECDC4" },
  { id:3, name:"الحصة الثانية",start:"08:15", end:"09:00", icon:"✏️", color:"#45B7D1" },
  { id:4, name:"استراحة",      start:"09:00", end:"09:20", icon:"🍎", color:"#22c55e" },
  { id:5, name:"الحصة الثالثة",start:"09:20", end:"10:05", icon:"🔬", color:"#f59e0b" },
  { id:6, name:"الحصة الرابعة",start:"10:05", end:"10:50", icon:"🎨", color:"#a78bfa" },
  { id:7, name:"استراحة كبرى", start:"10:50", end:"11:20", icon:"🍱", color:"#FF6B9D" },
  { id:8, name:"الحصة الخامسة",start:"11:20", end:"12:05", icon:"📐", color:"#22c55e" },
  { id:9, name:"الحصة السادسة",start:"12:05", end:"12:50", icon:"🌍", color:"#4ECDC4" },
  { id:10,name:"الانصراف",     start:"12:50", end:"13:00", icon:"🏠", color:"#22c55e" },
];

const CARPOOL_PARENTS = [
  { id:"P1", name:"أبو خالد الدوسري",  photo:"🧔", car:"GMC يوكون - أسود",    plate:"ز ح ط 9012", seats:3, rating:5.0, trips:78,  distance:"0.5 كم", verified:true,  kids:["خالد (ثالث متوسط)"], dir:"ذهاب + إياب", phone:"0503333333" },
  { id:"P2", name:"أم سارة العتيبي",   photo:"👩",  car:"هونداي H1 - فضي",    plate:"د ه و 5678", seats:2, rating:4.8, trips:32,  distance:"1.2 كم", verified:true,  kids:["سارة (ثاني ابتدائي)"], dir:"ذهاب فقط", phone:"0502222222" },
  { id:"P3", name:"أبو فيصل الشمري",   photo:"👨‍🦱",car:"تويوتا لاند كروزر",  plate:"ي ك ل 3456", seats:4, rating:4.7, trips:19,  distance:"2.1 كم", verified:false, kids:["فيصل (ثاني متوسط)"], dir:"إياب فقط", phone:"0504444444" },
];

const MSGS_INIT = [
  { id:1, from:"المدرسة", text:"اجتماع أولياء الأمور الأحد الساعة 5 مساءً", time:"10:30", type:"school", read:false },
  { id:2, from:"أبو خالد", text:"صباح الخير، هل أحمد جاهز؟ سأكون عندكم خلال 10 دقائق", time:"06:50", type:"carpool", read:false },
  { id:3, from:"أ. سعيد", text:"أحمد أدى اختباراً ممتازاً اليوم، ما شاء الله!", time:"أمس", type:"teacher", read:true },
  { id:4, from:"أكبادنا", text:"تنبيه: نبض أحمد مرتفع قليلاً — 102 bpm", time:"09:15", type:"alert", read:true },
];

const WALLET_TX = [
  { id:1, label:"الكافيتيريا — غداء", amount:-12, time:"12:30", icon:"🍱", color:T.red },
  { id:2, label:"شحن من ولي الأمر",  amount:+50, time:"أمس",   icon:"💳", color:T.green },
  { id:3, label:"الكافيتيريا — عصير", amount:-5,  time:"أمس",   icon:"🧃", color:T.red },
  { id:4, label:"مكافأة حضور",       amount:+10, time:"الأحد", icon:"🏆", color:T.green },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const timeToMins = t => { const [h,m]=t.split(":").map(Number); return h*60+m; };
const fmtTime = d => d.toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit",hour12:true});
const fmtDate = d => d.toLocaleDateString("ar-SA",{weekday:"long",day:"numeric",month:"long"});
const battColor = b => b>50?T.green:b>20?T.yellow:T.red;
const hrColor   = h => h>100?T.red:h>90?T.yellow:T.green;

// ─── Tiny components ──────────────────────────────────────────────────────────
function Dot({ color, size=8, pulse=false }) {
  return (
    <span style={{ position:"relative", display:"inline-flex", width:size, height:size, flexShrink:0 }}>
      {pulse && <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:color, animation:"ring 1.4s ease-out infinite", opacity:.5 }}/>}
      <span style={{ position:"absolute", inset:pulse?1:0, borderRadius:"50%", background:color }}/>
    </span>
  );
}

function Bar({ value, color, max=100, h=5 }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:h, height:h, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${Math.min((value/max)*100,100)}%`, background:color, borderRadius:h, transition:"width .6s ease" }}/>
    </div>
  );
}

function Card({ children, style={}, color, glow=false }) {
  return (
    <div style={{
      background: color ? `linear-gradient(135deg,${color}18,${color}06)` : T.card,
      border: `1px solid ${color ? color+"33" : T.border}`,
      borderRadius:18, padding:16,
      boxShadow: glow && color ? `0 0 20px ${color}22` : "none",
      ...style
    }}>{children}</div>
  );
}

function Btn({ children, color=T.teal, outline=false, small=false, onClick, style={}, disabled=false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? "7px 14px" : "13px 18px",
      borderRadius: small ? 10 : 14,
      border: outline ? `1px solid ${color}55` : "none",
      background: outline ? `${color}15` : disabled ? "rgba(255,255,255,0.07)" : `linear-gradient(135deg,${color},${color}cc)`,
      color: disabled ? T.dim : outline ? color : "#fff",
      fontWeight:700, fontSize: small ? 12 : 14,
      cursor: disabled ? "not-allowed" : "pointer",
      transition:"all .2s",
      ...style
    }}>{children}</button>
  );
}

function Avatar({ emoji, size=44, color=T.teal }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background:`linear-gradient(135deg,${color}33,${color}11)`,
      border:`2px solid ${color}44`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*.45, flexShrink:0
    }}>{emoji}</div>
  );
}

function Stars({ r }) {
  return (
    <span style={{ color:T.yellow, fontSize:12 }}>
      {"★".repeat(Math.floor(r))}{"☆".repeat(5-Math.floor(r))}
      <span style={{ color:T.dim, marginRight:4 }}> {r}</span>
    </span>
  );
}

// ─── Notification toast ───────────────────────────────────────────────────────
function Toast({ msg, onClose }) {
  useEffect(() => { const t=setTimeout(onClose,4000); return ()=>clearTimeout(t); }, []);
  const colors = { success:T.green, alert:T.red, info:T.teal, carpool:T.yellow };
  const c = colors[msg.type] || T.teal;
  return (
    <div style={{
      position:"fixed", top:70, right:0, left:0, margin:"0 16px",
      background:`linear-gradient(135deg,${c}22,${c}11)`,
      border:`1px solid ${c}55`, borderRadius:16,
      padding:"12px 14px", zIndex:200,
      display:"flex", alignItems:"center", gap:10,
      animation:"notifIn .35s ease", boxShadow:`0 8px 24px ${c}22`,
    }}>
      <span style={{ fontSize:22 }}>{msg.icon}</span>
      <div style={{ flex:1 }}>
        <p style={{ margin:0, color:"#fff", fontWeight:700, fontSize:13 }}>{msg.title}</p>
        <p style={{ margin:0, color:T.muted, fontSize:12 }}>{msg.body}</p>
      </div>
      <button onClick={onClose} style={{ background:"none", border:"none", color:T.dim, fontSize:18 }}>✕</button>
    </div>
  );
}

// ─── In-App Request/Approval System ──────────────────────────────────────────
function InAppRequest({ requester, driver, kids, onAccepted, onRejected, onCancel }) {
  const [phase, setPhase]   = useState("sending"); // sending→waiting→driver_view→accepted/rejected
  const [driverDecision, setDriverDecision] = useState(null);
  const [chatMsgs, setChatMsgs] = useState([]);
  const [draft, setDraft]   = useState("");
  const [showChat, setShowChat] = useState(false);

  // Auto advance sending → waiting
  useEffect(() => {
    if (phase !== "sending") return;
    const t = setTimeout(() => setPhase("waiting"), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  const sendMsg = () => {
    if (!draft.trim()) return;
    setChatMsgs(p => [...p, { id:Date.now(), from:"me", text:draft, time: new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"}) }]);
    setDraft("");
    setTimeout(() => {
      setChatMsgs(p => [...p, { id:Date.now()+1, from:"driver", text:"حسناً، سأكون عندكم خلال 10 دقائق إن شاء الله 👍", time: new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"}) }]);
    }, 1500);
  };

  const handleAccept = () => {
    setDriverDecision("accepted");
    setPhase("accepted");
    setChatMsgs(p => [...p, { id:Date.now(), from:"driver", text:"تم قبول الطلب ✅ سأكون عندكم قريباً!", time: new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"}) }]);
    setTimeout(onAccepted, 2500);
  };

  const handleReject = () => {
    setDriverDecision("rejected");
    setPhase("rejected");
    setChatMsgs(p => [...p, { id:Date.now(), from:"driver", text:"عذراً، السيارة ممتلئة اليوم 🙏", time: new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"}) }]);
    setTimeout(onRejected, 2500);
  };

  return (
    <div style={{ padding:"16px 0", animation:"fadeUp .3s ease" }}>

      {/* ── SENDING ── */}
      {phase === "sending" && (
        <Card color={T.teal} style={{ textAlign:"center", padding:28, marginBottom:12 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📤</div>
          <p style={{ color:T.teal, fontWeight:800, fontSize:17, margin:"0 0 8px" }}>جاري إرسال الطلب...</p>
          <p style={{ color:T.muted, fontSize:13, margin:"0 0 16px" }}>
            يتم إرسال طلبك لـ {driver.name} عبر التطبيق
          </p>
          <div style={{ display:"flex", justifyContent:"center", gap:8 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:T.teal, animation:`bounce .8s ease-in-out ${i*.2}s infinite` }}/>
            ))}
          </div>
        </Card>
      )}

      {/* ── WAITING (طرفي: ولي الأمر ينتظر، السائق يرى الطلب) ── */}
      {(phase==="waiting" || phase==="accepted" || phase==="rejected") && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

          {/* === طرف ولي الأمر === */}
          <div style={{
            background:"linear-gradient(135deg,#0d2b45,#1a3c5e)",
            borderRadius:18, padding:16,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <Dot color={T.teal} size={8} pulse/>
              <p style={{ color:T.teal, fontWeight:800, fontSize:13, margin:0 }}>شاشتك — ولي الأمر</p>
            </div>

            <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
              <Avatar emoji={driver.photo} size={50} color={T.green}/>
              <div style={{ flex:1 }}>
                <p style={{ color:"#fff", fontWeight:800, fontSize:15, margin:0 }}>{driver.name}</p>
                <Stars r={driver.rating}/>
                <p style={{ color:T.muted, fontSize:12, margin:"2px 0 0" }}>{driver.car} • {driver.plate}</p>
              </div>
              <div style={{
                background: phase==="accepted" ? T.green+"22" : phase==="rejected" ? T.red+"22" : T.yellow+"22",
                border:`1px solid ${phase==="accepted" ? T.green : phase==="rejected" ? T.red : T.yellow}55`,
                borderRadius:10, padding:"6px 12px", textAlign:"center",
              }}>
                <p style={{ color: phase==="accepted" ? T.green : phase==="rejected" ? T.red : T.yellow, fontWeight:800, fontSize:13, margin:0 }}>
                  {phase==="accepted" ? "✅ قَبِل" : phase==="rejected" ? "❌ رفض" : "⏳ انتظار"}
                </p>
              </div>
            </div>

            {/* Kids requested */}
            <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:10, padding:"8px 12px", marginBottom:10 }}>
              <p style={{ color:T.muted, fontSize:11, margin:"0 0 6px" }}>الأبناء في الطلب:</p>
              <div style={{ display:"flex", gap:6 }}>
                {kids.map(k => (
                  <span key={k.id} style={{
                    background:T.teal+"18", border:`1px solid ${T.teal}33`,
                    borderRadius:20, padding:"3px 10px", color:T.teal, fontSize:11, fontWeight:700,
                  }}>{k.photo} {k.name.split(" ")[0]}</span>
                ))}
              </div>
            </div>

            {/* Status message */}
            {phase==="waiting" && (
              <p style={{ color:T.muted, fontFamily:"Tajawal,sans-serif", fontSize:12, textAlign:"center", margin:0 }}>
                📱 الطلب وصل للسائق — ينظر فيه الآن...
              </p>
            )}
            {phase==="accepted" && (
              <div style={{ background:T.green+"18", border:`1px solid ${T.green}33`, borderRadius:10, padding:"8px 12px", textAlign:"center" }}>
                <p style={{ color:T.green, fontWeight:800, fontSize:14, margin:0 }}>🎉 تم قبول الطلب! السائق في طريقه</p>
              </div>
            )}
            {phase==="rejected" && (
              <div style={{ background:T.red+"18", border:`1px solid ${T.red}33`, borderRadius:10, padding:"8px 12px", textAlign:"center" }}>
                <p style={{ color:T.red, fontWeight:800, fontSize:14, margin:0 }}>السيارة ممتلئة — جرب سائقاً آخر</p>
              </div>
            )}
          </div>

          {/* ─── فاصل ─── */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ flex:1, height:1, background:T.border }}/>
            <p style={{ color:T.dim, fontSize:11, margin:0 }}>شاشة السائق</p>
            <div style={{ flex:1, height:1, background:T.border }}/>
          </div>

          {/* === طرف السائق === */}
          <div style={{
            background:"linear-gradient(135deg,#1a2e1a,#0d1a10)",
            borderRadius:18, padding:16,
            opacity: phase==="sending" ? .5 : 1,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <Dot color={T.green} size={8} pulse={phase==="waiting"}/>
              <p style={{ color:T.green, fontWeight:800, fontSize:13, margin:0 }}>شاشة السائق — {driver.name}</p>
            </div>

            {phase==="waiting" && (
              <>
                {/* طلب وصل للسائق */}
                <div style={{
                  background:"rgba(245,158,11,0.1)", border:`1px solid ${T.yellow}44`,
                  borderRadius:14, padding:14, marginBottom:12,
                }}>
                  <p style={{ color:T.yellow, fontWeight:800, fontSize:14, margin:"0 0 10px" }}>
                    🔔 طلب كاربول جديد!
                  </p>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:10 }}>
                    <Avatar emoji="👨" size={42} color={T.teal}/>
                    <div>
                      <p style={{ color:"#fff", fontWeight:700, fontSize:14, margin:0 }}>{requester.name}</p>
                      <p style={{ color:T.muted, fontSize:12, margin:"2px 0 0" }}>يطلب مقعداً لـ {kids.length} طفل</p>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                    {kids.map(k => (
                      <span key={k.id} style={{
                        background:T.green+"18", border:`1px solid ${T.green}33`,
                        borderRadius:20, padding:"3px 10px", color:T.green, fontSize:11, fontWeight:700,
                      }}>{k.photo} {k.name.split(" ")[0]} — {k.grade}</span>
                    ))}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:12 }}>
                    {[["📍","المسافة","0.8 كم"],["🏫","المدرسة","متوسطة النور"]].map(([ic,lb,vl])=>(
                      <div key={lb} style={{ background:"rgba(255,255,255,0.06)", borderRadius:8, padding:"6px 8px" }}>
                        <p style={{ color:T.muted, fontSize:10, margin:"0 0 2px" }}>{ic} {lb}</p>
                        <p style={{ color:"#fff", fontWeight:700, fontSize:12, margin:0 }}>{vl}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <Btn color={T.red} outline onClick={handleReject} style={{ flex:1 }}>❌ رفض</Btn>
                    <Btn color={T.green} onClick={handleAccept} style={{ flex:2 }}>✅ قبول الطلب</Btn>
                  </div>
                </div>
              </>
            )}

            {phase==="accepted" && (
              <div style={{ background:T.green+"18", border:`1px solid ${T.green}33`, borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
                <p style={{ fontSize:32, margin:"0 0 6px" }}>✅</p>
                <p style={{ color:T.green, fontWeight:800, fontSize:15, margin:0 }}>تم القبول — الطريق إلى المنزل</p>
              </div>
            )}
            {phase==="rejected" && (
              <div style={{ background:T.red+"18", border:`1px solid ${T.red}33`, borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
                <p style={{ fontSize:32, margin:"0 0 6px" }}>❌</p>
                <p style={{ color:T.red, fontWeight:800, fontSize:15, margin:0 }}>تم الرفض — السيارة ممتلئة</p>
              </div>
            )}
          </div>

          {/* ─── محادثة داخلية ─── */}
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:18, overflow:"hidden" }}>
            <button onClick={()=>setShowChat(!showChat)} style={{
              width:"100%", padding:"12px 16px", background:"none", border:"none",
              display:"flex", alignItems:"center", justifyContent:"space-between",
            }}>
              <span style={{ color:"#fff", fontWeight:700, fontSize:14 }}>💬 محادثة مع السائق</span>
              <span style={{ color:T.teal, fontSize:18 }}>{showChat?"▲":"▼"}</span>
            </button>
            {showChat && (
              <div>
                <div style={{ height:160, overflowY:"auto", padding:"0 12px 8px", display:"flex", flexDirection:"column", gap:6 }}>
                  {chatMsgs.length === 0 && (
                    <p style={{ color:T.dim, fontSize:12, textAlign:"center", marginTop:16 }}>ابدأ المحادثة مع السائق</p>
                  )}
                  {chatMsgs.map(m => (
                    <div key={m.id} style={{
                      display:"flex", justifyContent: m.from==="me" ? "flex-start" : "flex-end",
                    }}>
                      <div style={{
                        maxWidth:"75%", padding:"8px 12px", borderRadius:14,
                        background: m.from==="me" ? T.teal+"22" : "rgba(255,255,255,0.06)",
                        border:`1px solid ${m.from==="me" ? T.teal+"33" : T.border}`,
                      }}>
                        <p style={{ color:"#fff", fontSize:13, margin:"0 0 2px" }}>{m.text}</p>
                        <p style={{ color:T.dim, fontSize:10, margin:0 }}>{m.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", gap:8, padding:"8px 12px", borderTop:`1px solid ${T.border}` }}>
                  <input value={draft} onChange={e=>setDraft(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&sendMsg()}
                    placeholder="اكتب رسالة..." style={{
                      flex:1, background:"rgba(255,255,255,0.06)", border:`1px solid ${T.border}`,
                      borderRadius:10, padding:"8px 12px", color:"#fff", fontSize:13, outline:"none",
                    }}/>
                  <Btn small color={T.teal} onClick={sendMsg}>إرسال</Btn>
                </div>
              </div>
            )}
          </div>

          {phase==="waiting" && (
            <Btn color={T.red} outline onClick={onCancel} style={{ width:"100%" }}>إلغاء الطلب</Btn>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
//  PAGES
// ════════════════════════════════════════════════════════

// ─── Home ────────────────────────────────────────────────────────────────────
function HomePage({ now, kids, onPing, unreadMsgs }) {
  const mins = now.getHours()*60+now.getMinutes();
  const current = SCHEDULE.find(s=>mins>=timeToMins(s.start)&&mins<timeToMins(s.end));
  const next = SCHEDULE.find(s=>timeToMins(s.start)>mins);
  const minsToNext = next ? timeToMins(next.start)-mins : null;
  const progress = current
    ? ((mins-timeToMins(current.start))/(timeToMins(current.end)-timeToMins(current.start)))*100 : 0;

  return (
    <div style={{ padding:"0 16px 90px", animation:"fadeUp .35s ease" }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 0 12px" }}>
        <div>
          <p style={{ color:T.muted, fontSize:13, margin:0 }}>مرحباً 👋</p>
          <h2 style={{ color:"#fff", fontSize:22, fontWeight:900, margin:0 }}>{USER.name}</h2>
        </div>
        <div style={{ position:"relative" }}>
          <div style={{ width:46, height:46, borderRadius:"50%", background:`linear-gradient(135deg,${T.teal},${T.blue})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>👨</div>
          {unreadMsgs>0 && (
            <div style={{ position:"absolute", top:-2, left:-2, width:18, height:18, borderRadius:"50%", background:T.red, border:"2px solid #070711", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ color:"#fff", fontSize:9, fontWeight:900 }}>{unreadMsgs}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Big Clock ── */}
      <Card color={T.teal} glow style={{ textAlign:"center", padding:"24px 20px", marginBottom:12, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-30, right:-30, width:100, height:100, borderRadius:"50%", background:`${T.teal}0a` }}/>
        <p style={{ color:T.teal, fontSize:10, fontWeight:700, margin:"0 0 6px", letterSpacing:2 }}>⌚ أكبادنا</p>
        <p style={{ color:"#fff", fontFamily:"Space Mono,monospace", fontSize:52, fontWeight:700, margin:0, letterSpacing:-2, textShadow:`0 0 30px ${T.teal}66` }}>
          {fmtTime(now)}
        </p>
        <p style={{ color:T.muted, fontSize:12, margin:"4px 0 0" }}>{fmtDate(now)}</p>
      </Card>

      {/* ── Current Lesson ── */}
      {current ? (
        <Card color={current.color} style={{ marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <div>
              <p style={{ color:T.muted, fontSize:11, margin:"0 0 2px" }}>الحصة الحالية</p>
              <p style={{ color:"#fff", fontSize:18, fontWeight:800, margin:0 }}>{current.icon} {current.name}</p>
              <p style={{ color:T.muted, fontSize:12, margin:"3px 0 0" }}>{current.start} – {current.end}</p>
            </div>
            <span style={{ background:`${current.color}33`, border:`1px solid ${current.color}55`, borderRadius:8, padding:"4px 10px", color:current.color, fontSize:11, fontWeight:700 }}>جارية</span>
          </div>
          <Bar value={progress} color={current.color}/>
          <p style={{ color:T.muted, fontSize:10, textAlign:"left", marginTop:4 }}>{Math.round(progress)}% مكتملة</p>
        </Card>
      ) : (
        <Card style={{ textAlign:"center", padding:20, marginBottom:10 }}>
          <p style={{ fontSize:32, margin:"0 0 6px" }}>🌙</p>
          <p style={{ color:T.muted, margin:0 }}>لا توجد حصة حالياً</p>
        </Card>
      )}

      {/* ── Next Lesson ── */}
      {next && minsToNext > 0 && (
        <div style={{
          background:T.card, border:`1px solid ${T.border}`,
          borderRadius:14, padding:"12px 14px", marginBottom:12,
          display:"flex", alignItems:"center", gap:12,
        }}>
          <div style={{ width:40, height:40, borderRadius:10, background:`${next.color}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{next.icon}</div>
          <div style={{ flex:1 }}>
            <p style={{ color:T.muted, fontSize:11, margin:0 }}>الحصة التالية</p>
            <p style={{ color:"#fff", fontWeight:700, margin:0 }}>{next.name}</p>
          </div>
          <div style={{ background:`${T.yellow}18`, border:`1px solid ${T.yellow}44`, borderRadius:10, padding:"6px 12px", textAlign:"center" }}>
            <p style={{ color:T.yellow, fontWeight:800, fontSize:18, margin:0 }}>{minsToNext}</p>
            <p style={{ color:T.yellow, fontSize:9, margin:0 }}>دقيقة</p>
          </div>
        </div>
      )}

      {/* ── Kids health cards ── */}
      <p style={{ color:T.muted, fontSize:13, margin:"4px 0 10px" }}>أبنائي</p>
      {kids.map(k => (
        <Card key={k.id} style={{ marginBottom:10 }}>
          <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:10 }}>
            <Avatar emoji={k.photo} size={46} color={T.teal}/>
            <div style={{ flex:1 }}>
              <p style={{ color:"#fff", fontWeight:800, fontSize:15, margin:0 }}>{k.name}</p>
              <p style={{ color:T.muted, fontSize:12, margin:"2px 0 0" }}>{k.grade}</p>
              <p style={{ color:T.purple, fontSize:10, margin:"3px 0 0", fontFamily:"Space Mono,monospace" }}>🆔 {k.akbId}</p>
            </div>
            <div style={{ textAlign:"center" }}>
              <Dot color={T.green} size={8} pulse/>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[
              { l:"نبض",    v:`${Math.round(k.hr)}`,    u:"bpm", c:hrColor(k.hr)  },
              { l:"حرارة",  v:`${k.temp}`,               u:"°",   c:T.teal        },
              { l:"بطارية", v:`${k.battery}`,             u:"%",   c:battColor(k.battery) },
            ].map(x => (
              <div key={x.l} style={{ background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"8px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ color:T.muted, fontSize:9 }}>{x.l}</span>
                  <span style={{ color:x.c, fontWeight:700, fontSize:11 }}>{x.v}{x.u}</span>
                </div>
                <Bar value={parseFloat(x.v)} color={x.c} max={x.u==="bpm"?150:x.u==="°"?40:100} h={4}/>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <Btn small color={T.teal} outline onClick={()=>onPing(k)} style={{ flex:1 }}>📳 نداء</Btn>
            <Btn small color={T.yellow} outline style={{ flex:1 }}>📍 موقع</Btn>
            <Btn small color={T.red} outline style={{ flex:1 }}>🆘 SOS</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
function SchedulePage({ now }) {
  const mins = now.getHours()*60+now.getMinutes();
  return (
    <div style={{ padding:"20px 16px 90px", animation:"fadeUp .3s ease" }}>
      <h2 style={{ color:"#fff", fontSize:22, fontWeight:900, margin:"0 0 16px" }}>📅 جدول اليوم</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {SCHEDULE.map(s => {
          const isCurrent = mins>=timeToMins(s.start)&&mins<timeToMins(s.end);
          const isDone    = timeToMins(s.end)<=mins;
          return (
            <div key={s.id} style={{
              background: isCurrent ? `linear-gradient(135deg,${s.color}18,${s.color}06)` : T.card,
              border:`1px solid ${isCurrent ? s.color+"55" : T.border}`,
              borderRadius:16, padding:"14px 16px",
              display:"flex", alignItems:"center", gap:14,
              opacity: isDone&&!isCurrent ? .45 : 1,
              transition:"all .3s",
            }}>
              <div style={{ width:44, height:44, borderRadius:12, background:`${s.color}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                {isDone&&!isCurrent ? "✓" : s.icon}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ color:"#fff", fontWeight:700, fontSize:15, margin:0 }}>{s.name}</p>
                <p style={{ color:T.muted, fontSize:12, margin:"2px 0 0" }}>{s.start} – {s.end}</p>
              </div>
              {isCurrent && (
                <span style={{ background:`${s.color}33`, border:`1px solid ${s.color}55`, borderRadius:8, padding:"4px 10px", color:s.color, fontSize:11, fontWeight:700 }}>الآن</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Carpool ──────────────────────────────────────────────────────────────────
function CarpoolPage() {
  const [tab,      setTab]      = useState("find");   // find | offer
  const [step,     setStep]     = useState("kids");   // kids→list→confirm→request→active
  const [selKids,  setSelKids]  = useState([]);
  const [selDriver,setSelDriver]= useState(null);
  const [activeTrip,setActive]  = useState(null);
  const [elapsed,  setElapsed]  = useState(0);

  // offer state
  const [offerSeats, setOfferSeats] = useState(2);
  const [offerDir,   setOfferDir]   = useState("both");
  const [offerPosted,setOfferPosted]= useState(false);

  useEffect(()=>{
    if(!activeTrip) return;
    const t=setInterval(()=>setElapsed(e=>e+1),1000);
    return ()=>clearInterval(t);
  },[activeTrip]);

  const eta = Math.max(14-Math.floor(elapsed/4),0);
  const prog= Math.min((elapsed/56)*100,100);
  const toggleKid = id => setSelKids(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  // ── ACTIVE TRIP ──
  if (activeTrip) return (
    <div style={{ padding:"16px 16px 90px", animation:"fadeUp .3s ease" }}>
      <Card color={T.green} style={{ padding:"12px 14px", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Dot color={T.green} size={10} pulse/>
          <p style={{ color:T.green, fontWeight:800, fontSize:14, margin:0 }}>الكاربول في الطريق! 🚗</p>
        </div>
      </Card>

      {/* Animated road map */}
      <div style={{ background:"#08080f", borderRadius:20, overflow:"hidden", border:`1px solid ${T.teal}33`, marginBottom:12 }}>
        <svg viewBox="0 0 300 90" width="100%" style={{ display:"block" }}>
          <rect width={300} height={90} fill="#08080f"/>
          <rect x={25} y={36} width={250} height={16} rx={4} fill="#1a1a2e"/>
          <line x1={25} y1={44} x2={275} y2={44} stroke="#333" strokeWidth={1} strokeDasharray="10 6"/>
          <circle cx={35} cy={44} r={7} fill={T.teal} opacity={.9}/>
          <text x={35} y={28} textAnchor="middle" fill={T.teal} fontSize={8} fontFamily="Tajawal,sans-serif">منزلك</text>
          <circle cx={265} cy={44} r={7} fill={T.green} opacity={.9}/>
          <text x={265} y={28} textAnchor="middle" fill={T.green} fontSize={8} fontFamily="Tajawal,sans-serif">المدرسة</text>
          <g transform={`translate(${25+Math.min(prog*2.1,210)},32)`}>
            <rect x={0} y={0} width={22} height={14} rx={3} fill={T.yellow}/>
            <text x={11} y={10} textAnchor="middle" fontSize={8}>👨</text>
            <circle cx={4}  cy={16} r={2.5} fill="#333"/>
            <circle cx={18} cy={16} r={2.5} fill="#333"/>
          </g>
          <text x={150} y={76} textAnchor="middle" fill={T.yellow} fontSize={10} fontFamily="Space Mono,monospace" fontWeight={700}>
            ETA: {eta} دقيقة
          </text>
        </svg>
      </div>

      <Bar value={prog} color={T.green} h={8}/>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, marginBottom:12 }}>
        <span style={{ color:T.muted, fontSize:11 }}>المنزل</span>
        <span style={{ color:T.muted, fontSize:11 }}>المدرسة</span>
      </div>

      <Card style={{ marginBottom:12 }}>
        <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:10 }}>
          <Avatar emoji={activeTrip.photo} size={52} color={T.green}/>
          <div style={{ flex:1 }}>
            <p style={{ color:"#fff", fontWeight:800, fontSize:16, margin:0 }}>{activeTrip.name}</p>
            <Stars r={activeTrip.rating}/>
            <p style={{ color:T.muted, fontSize:12, margin:"2px 0 0" }}>{activeTrip.car}</p>
          </div>
          <div style={{ background:`${T.teal}18`, border:`1px solid ${T.teal}33`, borderRadius:10, padding:"6px 10px", textAlign:"center" }}>
            <p style={{ color:T.teal, fontFamily:"Space Mono,monospace", fontWeight:700, fontSize:14, margin:0 }}>{activeTrip.plate}</p>
            <p style={{ color:T.muted, fontSize:9, margin:0 }}>اللوحة</p>
          </div>
        </div>
        <div style={{ background:`${T.teal}0a`, borderRadius:10, padding:"8px 12px", marginBottom:10 }}>
          <p style={{ color:T.muted, fontSize:11, margin:"0 0 5px" }}>الأطفال في السيارة:</p>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {[...KIDS.filter(k=>selKids.includes(k.id)),...(activeTrip.kids||[]).map(k=>({name:k,photo:"👦"}))].map((k,i)=>(
              <span key={i} style={{ background:`${T.green}18`, border:`1px solid ${T.green}33`, borderRadius:20, padding:"3px 10px", color:T.green, fontSize:11, fontWeight:700 }}>
                {k.photo} {typeof k.name==="string"?k.name.split(" ")[0]:k.name}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn color={T.green} style={{ flex:1 }}>📞 اتصال</Btn>
          <Btn color={T.teal} outline style={{ flex:1 }}>📍 موقع مباشر</Btn>
        </div>
      </Card>

      {eta===0 && (
        <Btn color={T.green} onClick={()=>{setActive(null);setStep("kids");setSelKids([]);setSelDriver(null);setElapsed(0);}} style={{ width:"100%" }}>
          🎉 وصل الأطفال بأمان — إغلاق الرحلة
        </Btn>
      )}
    </div>
  );

  return (
    <div style={{ padding:"16px 16px 90px" }}>

      {/* Tab switcher */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[["find","🔍 ابحث عن كاربول"],["offer","🚗 أنا رايح"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>{setTab(id);setStep("kids");setSelKids([]);setSelDriver(null);}} style={{
            flex:1, padding:"12px 0", borderRadius:14,
            background: tab===id ? `linear-gradient(135deg,${T.teal},${T.blue})` : T.card,
            border:`1px solid ${tab===id?T.teal:T.border}`,
            color: tab===id?"#fff":T.muted, fontWeight:800, fontSize:14,
          }}>{lbl}</button>
        ))}
      </div>

      {/* ── FIND ── */}
      {tab==="find" && (
        <>
          {/* Step: kids */}
          {step==="kids" && (
            <div style={{ animation:"fadeUp .3s ease" }}>
              <h3 style={{ color:"#fff", fontSize:18, fontWeight:900, margin:"0 0 4px" }}>من تريد توصيله؟</h3>
              <p style={{ color:T.muted, fontSize:13, margin:"0 0 16px" }}>اختر أبناءك</p>
              {KIDS.map(k=>(
                <div key={k.id} onClick={()=>toggleKid(k.id)} style={{
                  background: selKids.includes(k.id) ? `${T.teal}12` : T.card,
                  border:`2px solid ${selKids.includes(k.id)?T.teal:T.border}`,
                  borderRadius:18, padding:16, marginBottom:10, cursor:"pointer",
                  display:"flex", alignItems:"center", gap:14, transition:"all .2s",
                }}>
                  <Avatar emoji={k.photo} size={52} color={selKids.includes(k.id)?T.teal:T.muted}/>
                  <div style={{ flex:1 }}>
                    <p style={{ color:"#fff", fontWeight:800, fontSize:16, margin:0 }}>{k.name}</p>
                    <p style={{ color:T.muted, fontSize:12, margin:"3px 0 0" }}>{k.grade}</p>
                  </div>
                  <div style={{
                    width:26, height:26, borderRadius:"50%",
                    background: selKids.includes(k.id)?T.teal:"rgba(255,255,255,0.06)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    color:"#fff", fontSize:14, transition:"all .2s",
                  }}>{selKids.includes(k.id)?"✓":""}</div>
                </div>
              ))}
              <Btn color={T.teal} disabled={selKids.length===0} onClick={()=>setStep("list")} style={{ width:"100%", marginTop:6 }}>
                بحث عن كاربول 🔍
              </Btn>
            </div>
          )}

          {/* Step: list */}
          {step==="list" && (
            <div style={{ animation:"fadeUp .3s ease" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                <button onClick={()=>setStep("kids")} style={{ background:"none", border:"none", color:T.teal, fontSize:18 }}>←</button>
                <h3 style={{ color:"#fff", fontSize:18, fontWeight:900, margin:0 }}>أولياء الأمور القريبين 📍</h3>
              </div>
              {CARPOOL_PARENTS.map(p=>(
                <div key={p.id} onClick={()=>setSelDriver(p)} style={{
                  background: selDriver?.id===p.id ? `${T.teal}12` : T.card,
                  border:`1px solid ${selDriver?.id===p.id?T.teal:p.verified?`${T.green}33`:T.border}`,
                  borderRadius:18, padding:16, marginBottom:10, cursor:"pointer", transition:"all .2s",
                }}>
                  <div style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:10 }}>
                    <div style={{
                      width:52, height:52, borderRadius:"50%",
                      background:`${T.teal}18`, border:`3px solid ${p.verified?T.green:T.yellow}`,
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0,
                    }}>{p.photo}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                        <div>
                          <p style={{ color:"#fff", fontWeight:800, fontSize:15, margin:0 }}>{p.name}</p>
                          <Stars r={p.rating}/>
                        </div>
                        <div style={{ textAlign:"left" }}>
                          <p style={{ color:T.teal, fontWeight:700, fontSize:13, margin:0 }}>📍{p.distance}</p>
                          <p style={{ color:p.verified?T.green:T.yellow, fontSize:10, margin:"2px 0 0" }}>{p.verified?"✓ موثق":"⚠️ قيد التحقق"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"8px 10px", marginBottom:8 }}>
                    <p style={{ color:T.muted, fontSize:11, margin:"0 0 4px" }}>أبناؤه في نفس المدرسة:</p>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {p.kids.map(k=>(
                        <span key={k} style={{ background:`${T.teal}15`, border:`1px solid ${T.teal}33`, borderRadius:20, padding:"2px 10px", color:T.teal, fontSize:11 }}>👦 {k}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <div>
                      <p style={{ color:T.muted, fontSize:12, margin:0 }}>🚗 {p.car}</p>
                      <p style={{ color:T.dim, fontSize:11, margin:"2px 0 0" }}>💺 {p.seats} مقاعد • 🔄 {p.dir}</p>
                    </div>
                    <div style={{ background:`${T.green}15`, border:`1px solid ${T.green}33`, borderRadius:10, padding:"4px 12px", textAlign:"center" }}>
                      <p style={{ color:T.green, fontWeight:700, fontSize:15, margin:0 }}>{p.trips}</p>
                      <p style={{ color:T.dim, fontSize:9, margin:0 }}>رحلة</p>
                    </div>
                  </div>
                </div>
              ))}
              <Btn color={T.teal} disabled={!selDriver} onClick={()=>setStep("confirm")} style={{ width:"100%" }}>
                طلب الانضمام ←
              </Btn>
            </div>
          )}

          {/* Step: confirm */}
          {step==="confirm" && selDriver && (
            <div style={{ animation:"fadeUp .3s ease" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                <button onClick={()=>setStep("list")} style={{ background:"none", border:"none", color:T.teal, fontSize:18 }}>←</button>
                <h3 style={{ color:"#fff", fontSize:18, fontWeight:900, margin:0 }}>تأكيد الطلب</h3>
              </div>
              <Card style={{ marginBottom:12 }}>
                <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
                  <Avatar emoji={selDriver.photo} size={52} color={T.green}/>
                  <div>
                    <p style={{ color:"#fff", fontWeight:800, fontSize:16, margin:0 }}>{selDriver.name}</p>
                    <Stars r={selDriver.rating}/>
                    <p style={{ color:T.muted, fontSize:12, margin:"2px 0 0" }}>{selDriver.car} — {selDriver.plate}</p>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {[
                    ["👦","أبنائي",KIDS.filter(k=>selKids.includes(k.id)).map(k=>k.name.split(" ")[0]).join(" + ")],
                    ["📍","المسافة",selDriver.distance],
                    ["🔄","الاتجاه",selDriver.dir],
                    ["💰","التكلفة","مجاني — تبادل"],
                  ].map(([ic,lb,vl])=>(
                    <div key={lb} style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"8px 10px" }}>
                      <p style={{ color:T.muted, fontSize:10, margin:"0 0 2px" }}>{ic} {lb}</p>
                      <p style={{ color:"#fff", fontWeight:700, fontSize:12, margin:0 }}>{vl}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card color={T.green} style={{ marginBottom:16, padding:"12px 14px" }}>
                <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                  <span style={{ fontSize:18 }}>🔒</span>
                  <div>
                    <p style={{ color:T.green, fontWeight:700, fontSize:13, margin:"0 0 3px" }}>ضمان الأمان الكامل</p>
                    <p style={{ color:T.muted, fontSize:12, margin:0, lineHeight:1.5 }}>السائق موثق في أكبادنا • الساعة الذكية تتتبع الرحلة • تواصل مباشر داخل التطبيق</p>
                  </div>
                </div>
              </Card>
              <Btn color={T.teal} onClick={()=>setStep("request")} style={{ width:"100%", marginBottom:8 }}>
                📲 إرسال الطلب
              </Btn>
              <Btn color={T.red} outline onClick={()=>setStep("list")} style={{ width:"100%" }}>إلغاء</Btn>
            </div>
          )}

          {/* Step: request (in-app approval system) */}
          {step==="request" && selDriver && (
            <InAppRequest
              requester={USER}
              driver={selDriver}
              kids={KIDS.filter(k=>selKids.includes(k.id))}
              onAccepted={()=>{ setActive(selDriver); setStep("kids"); }}
              onRejected={()=>{ setStep("list"); setSelDriver(null); }}
              onCancel={()=>{ setStep("confirm"); }}
            />
          )}
        </>
      )}

      {/* ── OFFER ── */}
      {tab==="offer" && (
        <div style={{ animation:"fadeUp .3s ease" }}>
          {!offerPosted ? (
            <>
              <h3 style={{ color:"#fff", fontSize:18, fontWeight:900, margin:"0 0 18px" }}>أعلن رحلتك 🚗</h3>
              <p style={{ color:T.muted, fontSize:13, margin:"0 0 10px" }}>كم مقعداً فارغاً؟</p>
              <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:20 }}>
                {[1,2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>setOfferSeats(n)} style={{
                    width:52, height:52, borderRadius:14,
                    border:`2px solid ${offerSeats===n?T.green:T.border}`,
                    background: offerSeats===n?`${T.green}22`:T.card,
                    color: offerSeats===n?T.green:T.muted,
                    fontWeight:900, fontSize:22,
                  }}>{n}</button>
                ))}
              </div>
              <p style={{ color:T.muted, fontSize:13, margin:"0 0 10px" }}>اتجاه الرحلة</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
                {[["both","ذهاب وإياب 🔄"],["go","ذهاب فقط →"],["back","إياب فقط ←"]].map(([id,lbl])=>(
                  <button key={id} onClick={()=>setOfferDir(id)} style={{
                    padding:"12px 16px", borderRadius:14,
                    border:`1px solid ${offerDir===id?T.green:T.border}`,
                    background: offerDir===id?`${T.green}12`:T.card,
                    color: offerDir===id?T.green:T.muted,
                    fontWeight:700, fontSize:14, textAlign:"right",
                  }}>{lbl}</button>
                ))}
              </div>
              <Card color={T.green} style={{ marginBottom:16, padding:"12px 14px" }}>
                <div style={{ display:"flex", gap:8 }}>
                  <span style={{ fontSize:18 }}>🔒</span>
                  <p style={{ color:T.muted, fontSize:12, margin:0, lineHeight:1.5 }}>
                    فقط أولياء الأمور الموثقون في أكبادنا يمكنهم رؤية رحلتك وإرسال طلبات الانضمام
                  </p>
                </div>
              </Card>
              <Btn color={T.green} onClick={()=>setOfferPosted(true)} style={{ width:"100%" }}>
                🚀 نشر الرحلة
              </Btn>
            </>
          ) : (
            <div style={{ animation:"fadeUp .3s ease" }}>
              <Card color={T.green} style={{ textAlign:"center", padding:28, marginBottom:16 }}>
                <div style={{ fontSize:52, marginBottom:12 }}>✅</div>
                <h3 style={{ color:T.green, fontSize:20, fontWeight:900, margin:"0 0 8px" }}>رحلتك منشورة!</h3>
                <p style={{ color:T.muted, fontSize:13, margin:0 }}>أولياء الأمور المجاورون يمكنهم الآن طلب الانضمام</p>
              </Card>
              {/* Simulated incoming request */}
              <Card color={T.yellow} style={{ marginBottom:12 }}>
                <p style={{ color:T.yellow, fontWeight:800, fontSize:14, margin:"0 0 12px" }}>🔔 طلب انضمام جديد!</p>
                <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
                  <Avatar emoji="👨" size={46} color={T.teal}/>
                  <div>
                    <p style={{ color:"#fff", fontWeight:700, fontSize:15, margin:0 }}>أبو عمر القحطاني</p>
                    <p style={{ color:T.muted, fontSize:12, margin:"2px 0 0" }}>0.9 كم • موثق ✓</p>
                  </div>
                </div>
                <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:10, padding:"8px 10px", marginBottom:12 }}>
                  <p style={{ color:T.muted, fontSize:11, margin:"0 0 4px" }}>الأطفال:</p>
                  <span style={{ background:`${T.teal}18`, border:`1px solid ${T.teal}33`, borderRadius:20, padding:"2px 10px", color:T.teal, fontSize:11 }}>👦 عمر — ثالث متوسط</span>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <Btn color={T.red} outline style={{ flex:1 }}>❌ رفض</Btn>
                  <Btn color={T.green} style={{ flex:2 }}>✅ قبول</Btn>
                </div>
              </Card>
              <Btn color={T.red} outline onClick={()=>setOfferPosted(false)} style={{ width:"100%" }}>
                إلغاء نشر الرحلة
              </Btn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────
function MessagesPage({ msgs, setMsgs }) {
  const [sel, setSel] = useState(null);
  const [reply, setReply] = useState("");
  const [thread, setThread] = useState({});

  const open = m => {
    setSel(m);
    setMsgs(p=>p.map(x=>x.id===m.id?{...x,read:true}:x));
    if (!thread[m.id]) setThread(p=>({...p,[m.id]:[{from:"them",text:m.text,time:m.time}]}));
  };

  const sendReply = () => {
    if (!reply.trim()||!sel) return;
    const now = new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"});
    setThread(p=>({...p,[sel.id]:[...(p[sel.id]||[]),{from:"me",text:reply,time:now}]}));
    setReply("");
    // auto reply
    setTimeout(()=>{
      const auto = sel.type==="school" ? "شكراً، سنكون بإذن الله" : sel.type==="carpool" ? "ممتاز، في انتظارك!" : "بارك الله فيك";
      setThread(p=>({...p,[sel.id]:[...p[sel.id],{from:"them",text:auto,time:new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"})}]}));
    },1200);
  };

  const typeColor = { school:T.blue, carpool:T.green, teacher:T.purple, alert:T.red };
  const typeIcon  = { school:"🏫", carpool:"🚗", teacher:"👨‍🏫", alert:"⚠️" };

  if (sel) return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 130px)", padding:"0 16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 0 10px", borderBottom:`1px solid ${T.border}` }}>
        <button onClick={()=>setSel(null)} style={{ background:"none", border:"none", color:T.teal, fontSize:20 }}>←</button>
        <div style={{ width:36, height:36, borderRadius:"50%", background:`${typeColor[sel.type]||T.teal}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{typeIcon[sel.type]}</div>
        <div>
          <p style={{ color:"#fff", fontWeight:700, fontSize:14, margin:0 }}>{sel.from}</p>
          <p style={{ color:T.muted, fontSize:11, margin:0 }}>{sel.type==="school"?"المدرسة":sel.type==="carpool"?"كاربول":"محادثة"}</p>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 0", display:"flex", flexDirection:"column", gap:8 }}>
        {(thread[sel.id]||[]).map((m,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:m.from==="me"?"flex-start":"flex-end" }}>
            <div style={{
              maxWidth:"78%", padding:"10px 14px", borderRadius:16,
              background: m.from==="me"?`${T.teal}22`:"rgba(255,255,255,0.06)",
              border:`1px solid ${m.from==="me"?T.teal+"33":T.border}`,
            }}>
              <p style={{ color:"#fff", fontSize:13, margin:"0 0 3px", lineHeight:1.5 }}>{m.text}</p>
              <p style={{ color:T.dim, fontSize:10, margin:0 }}>{m.time}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, padding:"10px 0", borderTop:`1px solid ${T.border}` }}>
        <input value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendReply()}
          placeholder="اكتب ردك..." style={{
            flex:1, background:T.card, border:`1px solid ${T.border}`,
            borderRadius:12, padding:"10px 14px", color:"#fff", fontSize:13, outline:"none",
          }}/>
        <Btn color={T.teal} onClick={sendReply}>إرسال</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ padding:"20px 16px 90px", animation:"fadeUp .3s ease" }}>
      <h2 style={{ color:"#fff", fontSize:22, fontWeight:900, margin:"0 0 16px" }}>💬 الرسائل</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {msgs.map(m=>(
          <div key={m.id} onClick={()=>open(m)} style={{
            background: !m.read?`${typeColor[m.type]||T.teal}0d`:T.card,
            border:`1px solid ${!m.read?`${typeColor[m.type]||T.teal}33`:T.border}`,
            borderRadius:16, padding:"14px", cursor:"pointer",
            display:"flex", alignItems:"center", gap:12,
          }}>
            <div style={{ width:44, height:44, borderRadius:12, background:`${typeColor[m.type]||T.teal}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
              {typeIcon[m.type]}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <p style={{ color:"#fff", fontWeight:700, fontSize:14, margin:0 }}>{m.from}</p>
                <p style={{ color:T.dim, fontSize:11, margin:0 }}>{m.time}</p>
              </div>
              <p style={{ color:T.muted, fontSize:12, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.text}</p>
            </div>
            {!m.read && <Dot color={typeColor[m.type]||T.teal} size={8}/>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Wallet ───────────────────────────────────────────────────────────────────
function WalletPage() {
  const [balance] = useState(45.00);
  const total = WALLET_TX.reduce((a,t)=>a+t.amount,0);
  return (
    <div style={{ padding:"20px 16px 90px", animation:"fadeUp .3s ease" }}>
      <h2 style={{ color:"#fff", fontSize:22, fontWeight:900, margin:"0 0 16px" }}>💰 المحفظة</h2>
      <Card color={T.yellow} glow style={{ textAlign:"center", padding:"24px 20px", marginBottom:16 }}>
        <p style={{ color:T.muted, fontSize:13, margin:"0 0 6px" }}>الرصيد الحالي</p>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:8, marginBottom:12 }}>
          <span style={{ color:T.yellow, fontFamily:"Space Mono,monospace", fontWeight:700, fontSize:48 }}>{balance.toFixed(2)}</span>
          <span style={{ color:T.yellow, fontWeight:700, fontSize:18 }}>ر.س</span>
        </div>
        <Btn color={T.yellow} style={{ padding:"10px 28px" }}>+ شحن الرصيد</Btn>
      </Card>
      <p style={{ color:T.muted, fontSize:13, margin:"0 0 10px" }}>آخر المعاملات</p>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {WALLET_TX.map(t=>(
          <Card key={t.id} style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:`${t.amount>0?T.green:T.red}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{t.icon}</div>
            <div style={{ flex:1 }}>
              <p style={{ color:"#fff", fontWeight:700, fontSize:14, margin:0 }}>{t.label}</p>
              <p style={{ color:T.muted, fontSize:11, margin:"2px 0 0" }}>{t.time}</p>
            </div>
            <span style={{ color:t.color, fontWeight:800, fontSize:15 }}>{t.amount>0?"+":""}{t.amount} ر.س</span>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Notification bell  ────────────────────────────────────────────────────────
function PingOverlay({ kid, onClose }) {
  useEffect(()=>{ const t=setTimeout(onClose,5000); return()=>clearTimeout(t); },[]);
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.8)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:300, flexDirection:"column", gap:20, padding:20,
      animation:"fadeIn .3s ease",
    }}>
      <style>{`@keyframes watchBuzz2{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}`}</style>
      <div style={{ position:"relative", width:90, height:90 }}>
        {[0,1].map(i=>(
          <div key={i} style={{ position:"absolute", inset:0, borderRadius:"50%", border:`2px solid ${T.teal}`, animation:`ring 1.2s ease-out ${i*.4}s infinite` }}/>
        ))}
        <div style={{ width:90, height:90, borderRadius:"50%", background:`linear-gradient(135deg,${T.teal},${T.blue})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:40, animation:"watchBuzz2 .5s ease-in-out infinite", position:"absolute" }}>
          ⌚
        </div>
      </div>
      <div style={{ textAlign:"center" }}>
        <p style={{ color:T.muted, fontSize:14, margin:"0 0 6px" }}>📳 الساعة تهتز الآن!</p>
        <h3 style={{ color:"#fff", fontSize:22, fontWeight:900, margin:"0 0 4px" }}>{kid.name.split(" ")[0]}</h3>
        <p style={{ color:T.teal, fontSize:14, margin:0 }}>يصله النداء على ساعته</p>
      </div>
      {/* Fake watch */}
      <div style={{ background:"#1a1a2e", border:"3px solid #333", borderRadius:18, padding:"14px 20px", textAlign:"center", boxShadow:`0 0 30px ${T.teal}44`, width:170 }}>
        <p style={{ color:T.teal, fontSize:10, margin:"0 0 4px" }}>⌚ أكبادنا</p>
        <p style={{ color:"#fff", fontSize:13, fontWeight:700, margin:"0 0 2px" }}>📳 نداء من ولي الأمر</p>
        <p style={{ color:T.muted, fontSize:10, margin:0 }}>{fmtTime(new Date())}</p>
      </div>
      <button onClick={onClose} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:"12px 32px", color:T.muted, fontSize:14, fontWeight:700 }}>إغلاق</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  🎴 نظام الحضور والأيموجي — مدمج في أكبادنا
// ══════════════════════════════════════════════════════════════

const AVATAR_SETS = {
  "😊 وجوه":    ["😊","😎","🤩","😍","🥳","😄","🤓","😇","🥸","😏","🤗","😌"],
  "🦁 حيوانات": ["🦁","🐯","🦊","🐺","🐻","🦝","🐼","🦄","🐉","🦋","🦅","🐬"],
  "🚀 مغامرة":  ["🚀","⚡","🌟","🔥","💎","🎯","🏆","👑","⚔️","🛡️","🎮","🌈"],
  "🌺 طبيعة":   ["🌺","🌸","🌻","🍀","🌊","⛰️","🌙","☀️","❄️","🌴","🍁","🦚"],
  "⚽ رياضة":   ["⚽","🏀","🎯","🏊","🤸","🏋️","🧗","🚴","🏇","🤺","🥊","🎾"],
};
const REWARD_EMOJIS = ["🏆","⭐","💎","🥇","🎖️","👑","🌟","🎗️","🏅","✨","🎯","💫"];
const BOOST_EMOJIS  = ["💪","🔥","🚀","⚡","🌟","👏","❤️","🎉","🙌","💡","🏆","😎"];

const CLASS_STUDENTS_INIT = [
  { id:"CS1", name:"أحمد محمد الغامدي",   avatar:"😎", status:null, reward:null, boost:null, points:145, att:{ present:18, absent:1, late:2 }, watch:true  },
  { id:"CS2", name:"سارة عبدالله العتيبي", avatar:"🦁", status:null, reward:null, boost:null, points:198, att:{ present:19, absent:0, late:2 }, watch:true  },
  { id:"CS3", name:"خالد سعد الدوسري",    avatar:"🚀", status:null, reward:null, boost:null, points:112, att:{ present:16, absent:3, late:2 }, watch:true  },
  { id:"CS4", name:"نورة فهد الشمري",     avatar:"🌺", status:null, reward:null, boost:null, points:167, att:{ present:17, absent:1, late:3 }, watch:false },
  { id:"CS5", name:"عمر ناصر القحطاني",   avatar:"⚽", status:null, reward:null, boost:null, points:89,  att:{ present:15, absent:3, late:3 }, watch:true  },
  { id:"CS6", name:"لينا فيصل الزهراني",  avatar:"🌸", status:null, reward:null, boost:null, points:201, att:{ present:20, absent:0, late:1 }, watch:true  },
];
const ATT_STATUS = {
  present:{ label:"حاضر",  color:"#22c55e", icon:"✅" },
  late:   { label:"متأخر", color:"#f59e0b", icon:"⏰" },
  absent: { label:"غائب",  color:"#ef4444", icon:"❌" },
  null:   { label:"—",     color:"#555",    icon:"⏳" },
};

// ── Confetti burst ─────────────────────────────────────────────────────────────
function ConfettiBurst({ active }) {
  if (!active) return null;
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:500, overflow:"hidden" }}>
      {Array.from({length:20},(_,i)=>(
        <div key={i} style={{
          position:"absolute", top:"35%",
          left:`${10+Math.random()*80}%`,
          width:8, height:8, borderRadius:2,
          background:["#4ECDC4","#f59e0b","#22c55e","#ef4444","#a78bfa","#FF6B9D"][i%6],
          animation:`confetti .9s ease-out ${Math.random()*.5}s both`,
        }}/>
      ))}
      <style>{`@keyframes confetti{0%{opacity:1;transform:translateY(0) rotate(0)}100%{opacity:0;transform:translateY(-100px) rotate(720deg)}}`}</style>
    </div>
  );
}

// ── Avatar Picker ──────────────────────────────────────────────────────────────
function AvatarPicker({ current, onSelect, onClose }) {
  const [tab,    setTab]    = useState("😊 وجوه");
  const [picked, setPicked] = useState(current);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.94)", zIndex:300, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
      <div style={{
        background:"#0f0f1a", borderRadius:"24px 24px 0 0",
        padding:"20px 16px 40px", maxHeight:"88vh", overflowY:"auto",
        animation:"fadeUp .3s ease",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h3 style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontSize:19, fontWeight:900 }}>🎨 اختر أيموجيك</h3>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"50%", width:32, height:32, color:"#888", fontSize:16 }}>✕</button>
        </div>
        <div style={{ textAlign:"center", marginBottom:18 }}>
          <div style={{
            width:90, height:90, borderRadius:"50%", margin:"0 auto 8px",
            background:`linear-gradient(135deg,${T.teal}33,${T.teal}11)`,
            border:`3px solid ${T.teal}`, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:54,
            animation:"float 2s ease-in-out infinite",
          }}>{picked}</div>
          <p style={{ color:T.teal, fontSize:12, fontWeight:700 }}>معاينة مباشرة</p>
        </div>
        <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:14, scrollbarWidth:"none" }}>
          {Object.keys(AVATAR_SETS).map(s=>(
            <button key={s} onClick={()=>setTab(s)} style={{
              flexShrink:0, padding:"5px 12px", borderRadius:20,
              background:tab===s?`linear-gradient(135deg,${T.teal},${T.blue})`:"rgba(255,255,255,0.06)",
              border:`1px solid ${tab===s?T.teal:"rgba(255,255,255,0.1)"}`,
              color:tab===s?"#fff":"#888", fontSize:11, fontWeight:700,
            }}>{s}</button>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8, marginBottom:18 }}>
          {AVATAR_SETS[tab].map(em=>(
            <button key={em} onClick={()=>setPicked(em)} style={{
              aspectRatio:"1", borderRadius:14,
              background:picked===em?`${T.teal}22`:"rgba(255,255,255,0.04)",
              border:`2px solid ${picked===em?T.teal:"rgba(255,255,255,0.08)"}`,
              fontSize:26, transform:picked===em?"scale(1.1)":"scale(1)", transition:"all .15s",
            }}>{em}</button>
          ))}
        </div>
        <Btn color={T.teal} onClick={()=>onSelect(picked)} style={{ width:"100%" }}>✅ حفظ الأيموجي</Btn>
      </div>
    </div>
  );
}

// ── Reward Modal ───────────────────────────────────────────────────────────────
function RewardModal({ student, onSend, onClose }) {
  const [reward, setReward] = useState(null);
  const [boost,  setBoost]  = useState(null);
  const [note,   setNote]   = useState("");
  const [done,   setDone]   = useState(false);
  const [conf,   setConf]   = useState(false);

  const send = () => {
    setConf(true);
    setTimeout(()=>{ setConf(false); setDone(true); onSend(student.id, reward, boost); },500);
  };

  if (done) return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:400, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, padding:24 }}>
      <ConfettiBurst active/>
      <div style={{ fontSize:72 }}>🎉</div>
      <h3 style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontSize:22, fontWeight:900 }}>تم الإرسال!</h3>
      <Card color={T.yellow} style={{ textAlign:"center", padding:"16px 28px" }}>
        <p style={{ fontSize:44, margin:"0 0 6px" }}>{student.avatar}</p>
        <p style={{ color:"#fff", fontWeight:800, fontSize:15, margin:0 }}>{student.name}</p>
        <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:8 }}>
          {reward&&<span style={{ fontSize:32 }}>{reward}</span>}
          {boost &&<span style={{ fontSize:32 }}>{boost}</span>}
        </div>
        {note&&<p style={{ color:T.muted, fontSize:12, marginTop:8 }}>"{note}"</p>}
      </Card>
      <p style={{ color:T.teal, fontSize:13, textAlign:"center" }}>📳 وصل إشعار لساعة الطالب وتطبيق ولي الأمر</p>
      <Btn color={T.teal} onClick={onClose}>إغلاق</Btn>
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:300, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
      <div style={{ background:"#0f0f1a", borderRadius:"24px 24px 0 0", padding:"20px 16px 36px", maxHeight:"90vh", overflowY:"auto", animation:"fadeUp .3s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <h3 style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontSize:17, fontWeight:900 }}>🎖️ مكافأة وتحفيز</h3>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"50%", width:32, height:32, color:"#888", fontSize:16 }}>✕</button>
        </div>
        <Card style={{ display:"flex", gap:12, alignItems:"center", marginBottom:14 }}>
          <div style={{ width:48, height:48, borderRadius:"50%", background:`${T.teal}22`, border:`2px solid ${T.teal}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>{student.avatar}</div>
          <div>
            <p style={{ color:"#fff", fontWeight:800, fontSize:14, margin:0 }}>{student.name}</p>
            <p style={{ color:T.yellow, fontSize:12, margin:0 }}>⭐ {student.points} نقطة</p>
          </div>
        </Card>
        <p style={{ color:"#ccc", fontWeight:700, fontSize:13, margin:"0 0 8px" }}>🏆 جائزة</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:7, marginBottom:14 }}>
          {REWARD_EMOJIS.map(em=>(
            <button key={em} onClick={()=>setReward(reward===em?null:em)} style={{
              aspectRatio:"1", borderRadius:12, fontSize:22,
              background:reward===em?`${T.yellow}22`:"rgba(255,255,255,0.04)",
              border:`2px solid ${reward===em?T.yellow:"rgba(255,255,255,0.08)"}`,
              transform:reward===em?"scale(1.1)":"scale(1)", transition:"all .15s",
            }}>{em}</button>
          ))}
        </div>
        <p style={{ color:"#ccc", fontWeight:700, fontSize:13, margin:"0 0 8px" }}>💪 تحفيز</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:7, marginBottom:14 }}>
          {BOOST_EMOJIS.map(em=>(
            <button key={em} onClick={()=>setBoost(boost===em?null:em)} style={{
              aspectRatio:"1", borderRadius:12, fontSize:22,
              background:boost===em?`${T.teal}22`:"rgba(255,255,255,0.04)",
              border:`2px solid ${boost===em?T.teal:"rgba(255,255,255,0.08)"}`,
              transform:boost===em?"scale(1.1)":"scale(1)", transition:"all .15s",
            }}>{em}</button>
          ))}
        </div>
        <p style={{ color:"#ccc", fontWeight:700, fontSize:13, margin:"0 0 8px" }}>💬 رسالة</p>
        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="أحسنت! أداؤك رائع اليوم..." rows={2} style={{
          width:"100%", background:"rgba(255,255,255,0.06)", border:`1px solid ${T.border}`,
          borderRadius:12, padding:"10px 12px", color:"#fff", fontSize:13, outline:"none", resize:"none", marginBottom:14,
        }}/>
        {(reward||boost||note)&&(
          <Card color={T.teal} style={{ textAlign:"center", marginBottom:14, padding:12 }}>
            <p style={{ color:T.muted, fontSize:10, margin:"0 0 6px" }}>معاينة ما سيراه الطالب:</p>
            <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:4 }}>
              {reward&&<span style={{ fontSize:30 }}>{reward}</span>}
              {boost &&<span style={{ fontSize:30 }}>{boost}</span>}
            </div>
            {note&&<p style={{ color:"#fff", fontSize:12 }}>"{note}"</p>}
          </Card>
        )}
        <Btn color={T.yellow} disabled={!reward&&!boost&&!note} onClick={send} style={{ width:"100%" }}>📳 إرسال للساعة والتطبيق</Btn>
      </div>
    </div>
  );
}

// ── Watch Scan Overlay ─────────────────────────────────────────────────────────
function WatchScanOverlay({ student, onDone }) {
  const [phase, setPhase] = useState("scan");
  useEffect(()=>{
    const t1=setTimeout(()=>setPhase("ok"),2000);
    const t2=setTimeout(()=>{ setPhase("done"); onDone(); },3400);
    return()=>{ clearTimeout(t1); clearTimeout(t2); };
  },[]);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:400, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 }}>
      <style>{`@keyframes scanLine{0%{top:16px}100%{top:94px}} @keyframes watchPop{0%{transform:scale(0)}60%{transform:scale(1.15)}100%{transform:scale(1)}}`}</style>
      <div style={{ position:"relative", width:110, height:110 }}>
        {phase==="scan"&&[0,1].map(i=>(
          <div key={i} style={{ position:"absolute", inset:0, borderRadius:"50%", border:`2px solid ${T.teal}`, animation:`ring 1.2s ease-out ${i*.4}s infinite` }}/>
        ))}
        <div style={{
          width:110, height:110, borderRadius:24,
          background:"linear-gradient(135deg,#1a1a2e,#2a2a3e)",
          border:`3px solid ${phase==="ok"?T.green:T.teal}`,
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          boxShadow:`0 0 28px ${phase==="ok"?T.green:T.teal}66`,
          position:"absolute", transition:"border-color .4s",
          animation:"watchPop .4s ease",
        }}>
          {phase==="scan"&&<div style={{ position:"absolute", left:10, right:10, height:2, background:`linear-gradient(90deg,transparent,${T.teal},transparent)`, animation:"scanLine 1s linear infinite" }}/>}
          <span style={{ fontSize:38 }}>{phase==="ok"?"✅":student.avatar}</span>
          <p style={{ color:phase==="ok"?T.green:T.teal, fontSize:8, fontFamily:"Space Mono,monospace", margin:"3px 0 0" }}>
            {phase==="ok"?"VERIFIED":"SCANNING"}
          </p>
        </div>
      </div>
      <div style={{ textAlign:"center" }}>
        <h3 style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontSize:19, fontWeight:900, margin:"0 0 4px" }}>
          {phase==="ok"?"✅ تم التسجيل!":"جاري مسح الساعة..."}
        </h3>
        <p style={{ color:T.muted, fontSize:13 }}>{student.name}</p>
        {phase==="ok"&&<p style={{ color:T.green, fontWeight:700, fontSize:13, marginTop:4 }}>📍 حاضر عبر الساعة الذكية</p>}
      </div>
    </div>
  );
}

// ── Attendance Page (الحضور) ───────────────────────────────────────────────────
function AttendancePage({ userRole, toast: addToast }) {
  const [clsStudents, setClsStudents] = useState(CLASS_STUDENTS_INIT.map(s=>({...s})));
  const [scanning,    setScanning]    = useState(null);
  const [rewarding,   setRewarding]   = useState(null);
  const [showPicker,  setShowPicker]  = useState(false);
  const [myAvatar,    setMyAvatar]    = useState("😎");
  const [bulkScan,    setBulkScan]    = useState(false);
  const [bulkProg,    setBulkProg]    = useState(0);
  const [filter,      setFilter]      = useState("all");
  const [subTab,      setSubTab]      = useState("roll"); // roll | my | board
  const [flashIds,    setFlashIds]    = useState({});
  const [confetti,    setConfetti]    = useState(false);

  const mark = (id, status) => {
    setClsStudents(p=>p.map(s=>s.id===id?{...s,status}:s));
    setFlashIds(p=>({...p,[id]:true}));
    setTimeout(()=>setFlashIds(p=>({...p,[id]:false})),900);
  };

  const sendReward = (id, reward, boost) => {
    setClsStudents(p=>p.map(s=>s.id===id?{...s,reward:reward||s.reward,boost:boost||s.boost,points:s.points+(reward?20:0)+(boost?10:0)}:s));
    setConfetti(true);
    setTimeout(()=>setConfetti(false),1200);
    addToast({ type:"success", icon:"🎖️", title:"تم إرسال المكافأة", body:"وصلت للساعة وتطبيق ولي الأمر" });
  };

  const startBulkScan = () => {
    setBulkScan(true); setBulkProg(0);
    const connected = clsStudents.filter(s=>s.watch&&!s.status);
    let i=0;
    const iv=setInterval(()=>{
      if(i>=connected.length){
        clearInterval(iv);
        setTimeout(()=>{
          setBulkScan(false);
          setClsStudents(p=>p.map(s=>s.watch&&!s.status?{...s,status:"present"}:s));
          addToast({ type:"success", icon:"✅", title:"تم تسجيل الحضور", body:`${connected.length} طالب عبر الساعة` });
        },500);
        return;
      }
      setBulkProg(Math.round(((i+1)/connected.length)*100));
      i++;
    },350);
  };

  const counts = {
    present:  clsStudents.filter(s=>s.status==="present").length,
    late:     clsStudents.filter(s=>s.status==="late").length,
    absent:   clsStudents.filter(s=>s.status==="absent").length,
    unmarked: clsStudents.filter(s=>!s.status).length,
  };
  const filtered = filter==="all"?clsStudents:clsStudents.filter(s=>
    filter==="unmarked"?!s.status:s.status===filter
  );

  return (
    <div style={{ padding:"16px 16px 90px" }}>
      <ConfettiBurst active={confetti}/>

      {/* Modals */}
      {scanning  && <WatchScanOverlay student={scanning} onDone={()=>{ mark(scanning.id,"present"); setScanning(null); addToast({type:"success",icon:"✅",title:"تم التسجيل",body:`${scanning.name.split(" ")[0]} — حاضر`}); }}/>}
      {rewarding && <RewardModal student={rewarding} onSend={sendReward} onClose={()=>setRewarding(null)}/>}
      {showPicker&& <AvatarPicker current={myAvatar} onSelect={em=>{setMyAvatar(em);setShowPicker(false);addToast({type:"info",icon:em,title:"تم تغيير الأيموجي!",body:"يظهر الآن في الكشف"});}} onClose={()=>setShowPicker(false)}/>}

      {/* Bulk scan overlay */}
      {bulkScan&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:400, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 }}>
          <div style={{ fontSize:64, animation:"float 1s ease-in-out infinite" }}>⌚</div>
          <h3 style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontSize:19, fontWeight:900 }}>جاري مسح ساعات الطلاب...</h3>
          <div style={{ width:220, background:"rgba(255,255,255,0.1)", borderRadius:20, height:10, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${bulkProg}%`, background:`linear-gradient(90deg,${T.teal},${T.green})`, borderRadius:20, transition:"width .3s" }}/>
          </div>
          <p style={{ color:T.teal, fontFamily:"Space Mono,monospace", fontSize:14, fontWeight:700 }}>{bulkProg}%</p>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:14 }}>
        <h2 style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontSize:20, fontWeight:900, margin:"0 0 2px" }}>📋 الحضور والأيموجي</h2>
        <p style={{ color:T.muted, fontSize:12, margin:0 }}>الصف الأول المتوسط — أ</p>
      </div>

      {/* Sub tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {[["roll","كشف الحضور","📋",userRole==="teacher"],["my","بطاقتي","🎴",userRole!=="teacher"],["board","المتصدرون","🏆",true]].filter(x=>x[3]).map(([id,lbl,ic])=>(
          <button key={id} onClick={()=>setSubTab(id)} style={{
            flex:1, padding:"10px 4px", borderRadius:12,
            background:subTab===id?`linear-gradient(135deg,${T.teal},${T.blue})`:"rgba(255,255,255,0.05)",
            border:`1px solid ${subTab===id?T.teal:T.border}`,
            color:subTab===id?"#fff":T.muted, fontWeight:800, fontSize:12,
          }}>{ic} {lbl}</button>
        ))}
      </div>

      {/* ── ROLL (teacher) ── */}
      {subTab==="roll" && (
        <div>
          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7, marginBottom:12 }}>
            {[{l:"حاضر",v:counts.present,c:T.green},{l:"متأخر",v:counts.late,c:T.yellow},{l:"غائب",v:counts.absent,c:T.red},{l:"لم يُسجَّل",v:counts.unmarked,c:T.dim}].map(x=>(
              <div key={x.l} style={{ background:T.card, border:`1px solid ${x.c}33`, borderRadius:12, padding:"10px 6px", textAlign:"center" }}>
                <p style={{ color:x.c, fontWeight:900, fontSize:20, margin:0, fontFamily:"Space Mono,monospace" }}>{x.v}</p>
                <p style={{ color:"#555", fontSize:9, margin:0 }}>{x.l}</p>
              </div>
            ))}
          </div>

          {/* Scan buttons */}
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <Btn color={T.teal} onClick={startBulkScan} style={{ flex:2, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>⌚ مسح الكل دفعة واحدة</Btn>
            <Btn color={T.blue} outline onClick={()=>setScanning(clsStudents.find(s=>s.watch&&!s.status)||clsStudents[0])} style={{ flex:1 }}>⌚ طالب</Btn>
          </div>

          {/* Filter */}
          <div style={{ display:"flex", gap:5, marginBottom:12, overflowX:"auto", scrollbarWidth:"none" }}>
            {[["all","الكل"],["present","حاضر"],["late","متأخر"],["absent","غائب"],["unmarked","لم يُسجَّل"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setFilter(id)} style={{
                flexShrink:0, padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:700,
                background:filter===id?`linear-gradient(135deg,${T.teal},${T.blue})`:"rgba(255,255,255,0.05)",
                border:`1px solid ${filter===id?T.teal:T.border}`,
                color:filter===id?"#fff":T.muted,
              }}>{lbl}</button>
            ))}
          </div>

          {/* Student cards */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filtered.map(s=>{
              const st=ATT_STATUS[s.status]||ATT_STATUS.null;
              const pct=Math.round((s.att.present/(s.att.present+s.att.absent+s.att.late))*100);
              return (
                <div key={s.id} style={{
                  background:flashIds[s.id]?`${T.teal}12`:T.card,
                  border:`1px solid ${s.status?st.color+"44":T.border}`,
                  borderRadius:18, padding:14, transition:"all .4s",
                  position:"relative", overflow:"hidden",
                }}>
                  {(s.reward||s.boost)&&(
                    <div style={{ position:"absolute", top:8, left:8, display:"flex", gap:4, zIndex:2 }}>
                      {s.reward&&<span style={{ fontSize:18, animation:"float 2s ease-in-out infinite" }}>{s.reward}</span>}
                      {s.boost &&<span style={{ fontSize:18, animation:"float 2.3s ease-in-out infinite" }}>{s.boost}</span>}
                    </div>
                  )}
                  <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:10 }}>
                    <div style={{ position:"relative" }}>
                      <div style={{
                        width:52, height:52, borderRadius:"50%",
                        background:`${st.color}22`, border:`3px solid ${s.status?st.color:"rgba(255,255,255,0.1)"}`,
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0,
                        boxShadow:s.status?`0 0 12px ${st.color}55`:"none", transition:"all .4s",
                      }}>{s.avatar}</div>
                      <div style={{ position:"absolute", bottom:1, right:1, width:11, height:11, borderRadius:"50%", background:s.watch?T.green:T.red, border:"2px solid #070711" }}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ color:"#fff", fontWeight:800, fontSize:14, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</p>
                      <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:2 }}>
                        <span style={{ color:T.yellow, fontSize:11 }}>⭐{s.points}</span>
                        <span style={{ color:T.dim, fontSize:10 }}>•</span>
                        <span style={{ color:pct>=90?T.green:T.yellow, fontSize:11 }}>{pct}%</span>
                        {!s.watch&&<span style={{ color:T.red, fontSize:10 }}>⌚❌</span>}
                      </div>
                    </div>
                    <div style={{ background:st.icon==="⏳"?"rgba(255,255,255,0.04)":`${st.color}18`, border:`1px solid ${st.color}44`, borderRadius:8, padding:"4px 8px" }}>
                      <span style={{ fontSize:12 }}>{st.icon}</span>
                      <span style={{ color:st.color, fontSize:10, fontWeight:700, marginRight:3 }}>{st.label}</span>
                    </div>
                  </div>
                  {/* Att mini */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:10 }}>
                    {[{l:"حاضر",v:s.att.present,c:T.green},{l:"غائب",v:s.att.absent,c:T.red},{l:"متأخر",v:s.att.late,c:T.yellow}].map(x=>(
                      <div key={x.l} style={{ background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"5px 0", textAlign:"center" }}>
                        <p style={{ color:x.c, fontWeight:800, fontSize:14, margin:0 }}>{x.v}</p>
                        <p style={{ color:"#555", fontSize:9, margin:0 }}>{x.l}</p>
                      </div>
                    ))}
                  </div>
                  {/* Actions */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6 }}>
                    {[{lbl:"✅حاضر",s:"present",c:T.green},{lbl:"⏰متأخر",s:"late",c:T.yellow},{lbl:"❌غائب",s:"absent",c:T.red}].map(a=>(
                      <button key={a.s} onClick={()=>mark(s.id,a.s)} style={{
                        padding:"7px 2px", borderRadius:10, fontSize:10, fontWeight:700,
                        background:s.status===a.s?`${a.c}22`:"rgba(255,255,255,0.04)",
                        border:`1px solid ${s.status===a.s?a.c+"55":T.border}`,
                        color:s.status===a.s?a.c:T.dim, transition:"all .2s",
                      }}>{a.lbl}</button>
                    ))}
                    <button onClick={()=>setRewarding(s)} style={{
                      padding:"7px 2px", borderRadius:10, fontSize:10, fontWeight:700,
                      background:"rgba(245,158,11,0.12)", border:`1px solid ${T.yellow}44`, color:T.yellow,
                    }}>🏆كافئ</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MY CARD (student/parent) ── */}
      {subTab==="my" && (
        <div style={{ animation:"fadeUp .3s ease" }}>
          <div style={{
            background:T.card, border:`1px solid ${T.border}`,
            borderRadius:20, padding:20, marginBottom:12, textAlign:"center",
          }}>
            <div style={{ position:"relative", width:100, margin:"0 auto 12px", cursor:"pointer" }} onClick={()=>setShowPicker(true)}>
              <div style={{
                width:100, height:100, borderRadius:"50%",
                background:`linear-gradient(135deg,${T.teal}33,${T.teal}11)`,
                border:`4px solid ${T.teal}`, display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:58,
                boxShadow:`0 0 24px ${T.teal}44`,
                animation:"float 2.5s ease-in-out infinite",
              }}>{myAvatar}</div>
              <div style={{
                position:"absolute", bottom:4, right:4, width:28, height:28,
                borderRadius:"50%", background:T.teal, border:"2px solid #070711",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:14,
              }}>✏️</div>
            </div>
            <h3 style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontSize:18, fontWeight:900, margin:"0 0 4px" }}>أحمد محمد الغامدي</h3>
            <p style={{ color:T.muted, fontSize:12, margin:"0 0 12px" }}>أول متوسط — أ</p>
            <p style={{ color:T.muted, fontSize:11 }}>اضغط على الأيموجي لتغييره ✏️</p>
          </div>

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
            {[{l:"نقاط",v:"145",c:T.yellow,ic:"⭐"},{l:"حضور%",v:"90%",c:T.green,ic:"📋"},{l:"أيام حاضر",v:"18",c:T.teal,ic:"✅"}].map(x=>(
              <Card key={x.l} style={{ textAlign:"center", padding:"12px 6px" }}>
                <p style={{ fontSize:22, margin:"0 0 4px" }}>{x.ic}</p>
                <p style={{ color:x.c, fontWeight:900, fontSize:20, margin:0 }}>{x.v}</p>
                <p style={{ color:T.muted, fontSize:10, margin:0 }}>{x.l}</p>
              </Card>
            ))}
          </div>

          <Card color={T.yellow} style={{ textAlign:"center", padding:16 }}>
            <p style={{ color:T.yellow, fontWeight:800, fontSize:14, margin:"0 0 8px" }}>🎖️ مكافآت المعلم</p>
            <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
              {["🏆","💪","⭐"].map(em=><span key={em} style={{ fontSize:36, animation:"float 2s ease-in-out infinite" }}>{em}</span>)}
            </div>
            <p style={{ color:T.muted, fontSize:11, marginTop:8 }}>تظهر على ساعتك وفي التطبيق</p>
          </Card>
        </div>
      )}

      {/* ── LEADERBOARD ── */}
      {subTab==="board" && (
        <div style={{ animation:"fadeUp .3s ease" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:20 }}>
            {[...clsStudents].sort((a,b)=>b.points-a.points).slice(0,3).map((s,i)=>(
              <div key={s.id} style={{
                background:i===0?`${T.yellow}15`:i===1?`rgba(192,192,192,.1)`:`rgba(205,127,50,.1)`,
                border:`1px solid ${i===0?T.yellow:i===1?"#C0C0C0":"#CD7F32"}44`,
                borderRadius:18, padding:"16px 8px", textAlign:"center",
                transform:i===0?"scale(1.04)":"scale(1)",
              }}>
                <div style={{ fontSize:36, marginBottom:4 }}>{["🥇","🥈","🥉"][i]}</div>
                <div style={{ fontSize:32, marginBottom:4 }}>{s.avatar}</div>
                <p style={{ color:"#fff", fontWeight:800, fontSize:12, margin:0 }}>{s.name.split(" ")[0]}</p>
                <p style={{ color:T.yellow, fontWeight:700, fontSize:14, margin:"4px 0 0" }}>⭐{s.points}</p>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[...clsStudents].sort((a,b)=>b.points-a.points).map((s,i)=>(
              <div key={s.id} style={{
                background:T.card, border:`1px solid ${T.border}`,
                borderRadius:14, padding:"12px 14px",
                display:"flex", alignItems:"center", gap:12,
              }}>
                <span style={{ color:T.muted, fontFamily:"Space Mono,monospace", fontSize:13, width:20 }}>#{i+1}</span>
                <span style={{ fontSize:26 }}>{s.avatar}</span>
                <div style={{ flex:1 }}>
                  <p style={{ color:"#fff", fontWeight:700, fontSize:13, margin:0 }}>{s.name.split(" ")[0]}</p>
                  <div style={{ display:"flex", gap:4, marginTop:2 }}>
                    {s.reward&&<span style={{ fontSize:14 }}>{s.reward}</span>}
                    {s.boost &&<span style={{ fontSize:14 }}>{s.boost}</span>}
                  </div>
                </div>
                <span style={{ color:T.yellow, fontFamily:"Space Mono,monospace", fontWeight:700, fontSize:15 }}>⭐{s.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Nav Bar ──────────────────────────────────────────────────────────────────
function NavBar({ active, setActive, unreadMsgs }) {
  const items = [
    { id:"home",       icon:"🏠", label:"الرئيسية"  },
    { id:"attendance", icon:"📋", label:"الحضور"    },
    { id:"carpool",    icon:"🚗", label:"كاربول", badge:true },
    { id:"messages",   icon:"💬", label:"رسائل", badge:unreadMsgs>0, badgeCount:unreadMsgs },
    { id:"more",       icon:"⋯",  label:"المزيد"    },
  ];
  return (
    <nav style={{
      position:"fixed", bottom:0, left:0, right:0,
      background:"rgba(7,7,17,0.97)", backdropFilter:"blur(20px)",
      borderTop:`1px solid ${T.border}`,
      display:"flex", justifyContent:"space-around",
      padding:"8px 0 18px", zIndex:100, maxWidth:430, margin:"0 auto",
    }}>
      {items.map(item=>(
        <button key={item.id} onClick={()=>setActive(item.id)} style={{
          background:"none", border:"none",
          display:"flex", flexDirection:"column", alignItems:"center", gap:3,
          padding:"4px 14px", borderRadius:12,
          opacity: active===item.id?1:.4,
          transform: active===item.id?"translateY(-2px)":"none",
          transition:"all .2s", position:"relative",
        }}>
          <span style={{ fontSize:active===item.id?22:18, transition:"all .2s" }}>{item.icon}</span>
          {item.badge && active!==item.id && (
            <div style={{
              position:"absolute", top:0, right:6,
              minWidth:item.badgeCount?16:8, height:item.badgeCount?16:8,
              borderRadius:"50%", background:T.red,
              border:"2px solid #070711",
              display:item.badgeCount?"flex":"block",
              alignItems:"center", justifyContent:"center",
              boxShadow:`0 0 6px ${T.red}`,
            }}>
              {item.badgeCount>0 && <span style={{ color:"#fff", fontSize:8, fontWeight:900 }}>{item.badgeCount}</span>}
            </div>
          )}
          <span style={{ fontSize:10, color:active===item.id?T.teal:"#aaa", fontWeight:700 }}>{item.label}</span>
          {active===item.id && <div style={{ width:4, height:4, borderRadius:"50%", background:T.teal }}/>}
        </button>
      ))}
    </nav>
  );
}

// ══════════════════════════════════════════════════════════════
//  🔐 تسجيل الدخول — محاكاة النفاذ الوطني الموحد
// ══════════════════════════════════════════════════════════════

function NafathLogo({ size=44 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:size*0.28,
      background:"linear-gradient(135deg,#0b5e3d,#0f7a4f)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.5, flexShrink:0,
      boxShadow:"0 0 18px rgba(15,122,79,0.4)",
    }}>🇸🇦</div>
  );
}

function NafathLogin({ onSuccess }) {
  // phases: role → id → connecting → push → confirmed → otp → setup → done
  const [phase,   setPhase]   = useState("role");
  const [role,    setRole]    = useState(null);     // parent | teacher
  const [nid,     setNid]     = useState("");
  const [randNum, setRandNum] = useState(null);
  const [otp,     setOtp]     = useState("");
  const [err,     setErr]     = useState("");
  const [timer,   setTimer]   = useState(60);

  // quick-login setup
  const [pinStep,    setPinStep]    = useState("create"); // create | confirm
  const [pin,        setPin]        = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [faceIdOn,   setFaceIdOn]   = useState(true);
  const [pinErr,     setPinErr]     = useState("");


  // countdown for push approval
  useEffect(()=>{
    if(phase!=="push") return;
    setTimer(60);
    const t=setInterval(()=>setTimer(p=>p>0?p-1:0),1000);
    return ()=>clearInterval(t);
  },[phase]);

  const startVerify = () => {
    if (nid.length!==10 || !/^[12]/.test(nid)) { setErr("رقم الهوية/الإقامة يجب أن يبدأ بـ1 أو 2 ويتكون من 10 أرقام"); return; }
    setErr("");
    setPhase("connecting");
    setTimeout(()=>{
      setRandNum(Math.floor(10+Math.random()*89)); // 2-digit
      setPhase("push");
    },1400);
  };

  const approvePush = () => {
    setPhase("confirmed");
    setTimeout(()=>setPhase("otp"),1200);
  };

  const verifyOtp = () => {
    if (otp.length!==6) { setErr("أدخل الرمز السري المكوّن من 6 أرقام"); return; }
    setErr("");
    setPhase("setup");
  };

  const pressDigit = (d) => {
    setPinErr("");
    if (pinStep==="create") {
      if (pin.length>=4) return;
      const next = pin+d;
      setPin(next);
      if (next.length===4) setTimeout(()=>setPinStep("confirm"),250);
    } else {
      if (pinConfirm.length>=4) return;
      const next = pinConfirm+d;
      setPinConfirm(next);
      if (next.length===4) {
        setTimeout(()=>{
          if (next===pin) {
            setPhase("done");
            setTimeout(()=>onSuccess(role, pin, faceIdOn), 900);
          } else {
            setPinErr("الرمزان غير متطابقين، حاول مجدداً");
            setPin(""); setPinConfirm(""); setPinStep("create");
          }
        },250);
      }
    }
  };
  const pressBackspace = () => {
    setPinErr("");
    if (pinStep==="create") setPin(p=>p.slice(0,-1));
    else setPinConfirm(p=>p.slice(0,-1));
  };
  const skipPin = () => {
    setPhase("done");
    setTimeout(()=>onSuccess(role, null, false), 900);
  };

  return (
    <div style={{ background:T.bg, minHeight:"100vh", maxWidth:430, margin:"0 auto", direction:"rtl", display:"flex", flexDirection:"column" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Header / brand */}
      <div style={{ padding:"40px 24px 20px", textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:18, background:`linear-gradient(135deg,${T.teal},${T.blue})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:34, margin:"0 auto 14px", boxShadow:`0 0 24px ${T.teal}44` }}>⌚</div>
        <h1 style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontSize:24, fontWeight:900, margin:"0 0 4px" }}>أكبادنا</h1>
        <p style={{ color:T.muted, fontFamily:"Tajawal,sans-serif", fontSize:13, margin:0 }}>منصة التعليم الذكية</p>
      </div>

      <div style={{ flex:1, padding:"10px 24px 30px", display:"flex", flexDirection:"column" }}>

        {/* ── Step: role select ── */}
        {phase==="role" && (
          <div style={{ animation:"fadeUp .3s ease" }}>
            <p style={{ color:T.muted, fontSize:13, textAlign:"center", margin:"0 0 20px" }}>سجّل الدخول حسب صفتك</p>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { id:"parent",  label:"ولي الأمر", sub:"تابع أبناءك بأمان", icon:"👨‍👩‍👧", color:T.teal  },
                { id:"teacher", label:"المعلم",    sub:"إدارة الفصل والحضور", icon:"👨‍🏫", color:T.purple },
              ].map(r=>(
                <button key={r.id} onClick={()=>{ setRole(r.id); setPhase("id"); }} style={{
                  padding:"18px 18px", borderRadius:18,
                  border:`1px solid ${r.color}33`,
                  background:`linear-gradient(135deg,${r.color}12,${r.color}05)`,
                  display:"flex", alignItems:"center", gap:14,
                }}>
                  <div style={{ width:52, height:52, borderRadius:14, background:`${r.color}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>{r.icon}</div>
                  <div style={{ textAlign:"right", flex:1 }}>
                    <p style={{ color:"#fff", fontWeight:900, fontSize:16, margin:0 }}>{r.label}</p>
                    <p style={{ color:T.muted, fontSize:12, margin:"2px 0 0" }}>{r.sub}</p>
                  </div>
                  <span style={{ color:r.color, fontSize:20 }}>‹</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step: national ID entry ── */}
        {phase==="id" && (
          <div style={{ animation:"fadeUp .3s ease" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
              <button onClick={()=>{setPhase("role");setErr("");}} style={{ background:"none", border:"none", color:T.teal, fontSize:20 }}>‹</button>
              <p style={{ color:T.muted, fontSize:12, margin:0 }}>
                {role==="parent"?"تسجيل دخول ولي الأمر":"تسجيل دخول المعلم"}
              </p>
            </div>

            <Card style={{ textAlign:"center", padding:24, marginBottom:18 }}>
              <NafathLogo size={56}/>
              <p style={{ color:"#fff", fontWeight:900, fontSize:17, margin:"12px 0 4px" }}>الدخول عبر النفاذ الوطني الموحد</p>
              <p style={{ color:T.muted, fontSize:12, margin:0 }}>Nafath — تحقق آمن من الهوية</p>
            </Card>

            <p style={{ color:"#ccc", fontSize:13, fontWeight:700, margin:"0 0 8px" }}>رقم الهوية الوطنية / الإقامة</p>
            <input
              value={nid}
              onChange={e=>setNid(e.target.value.replace(/\D/g,"").slice(0,10))}
              placeholder="1XXXXXXXXX"
              style={{
                width:"100%", background:"rgba(255,255,255,0.07)", border:`1px solid ${T.border}`,
                borderRadius:12, padding:"14px 16px", color:"#fff", fontSize:18,
                fontFamily:"Space Mono,monospace", outline:"none", direction:"ltr",
                textAlign:"center", letterSpacing:4, marginBottom:10,
              }}
            />
            {err && <p style={{ color:T.red, fontSize:12, margin:"0 0 10px", textAlign:"center" }}>⚠️ {err}</p>}

            <Card color={T.teal} style={{ padding:"10px 14px", marginBottom:18 }}>
              <div style={{ display:"flex", gap:8 }}>
                <span>🔒</span>
                <p style={{ color:T.muted, fontSize:11, margin:0, lineHeight:1.6 }}>
                  سيتم التحقق من هويتك عبر تطبيق "نفاذ" المرتبط بالأحوال المدنية. {role==="teacher"?"للمعلمين يتم التحقق إضافياً من رقم السجل الوظيفي.":"لأولياء الأمور يتم مطابقة الأبناء تلقائياً عبر سجلات المدرسة."}
                </p>
              </div>
            </Card>

            <Btn color={T.teal} onClick={startVerify} style={{ width:"100%" }}>المتابعة إلى نفاذ ←</Btn>
          </div>
        )}

        {/* ── Step: connecting ── */}
        {phase==="connecting" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:18, animation:"fadeUp .3s ease" }}>
            <div style={{
              width:70, height:70, borderRadius:"50%",
              border:`4px solid ${T.teal}33`, borderTop:`4px solid ${T.teal}`,
              animation:"spin 1s linear infinite",
            }}/>
            <p style={{ color:"#fff", fontWeight:800, fontSize:16 }}>جاري الاتصال بنفاذ...</p>
            <p style={{ color:T.muted, fontSize:12 }}>التحقق من رقم الهوية {nid}</p>
          </div>
        )}

        {/* ── Step: push notification ── */}
        {phase==="push" && (
          <div style={{ animation:"fadeUp .3s ease", textAlign:"center" }}>
            <NafathLogo size={56}/>
            <h3 style={{ color:"#fff", fontWeight:900, fontSize:18, margin:"14px 0 6px" }}>افتح تطبيق نفاذ</h3>
            <p style={{ color:T.muted, fontSize:13, margin:"0 0 20px" }}>لديك طلب تحقق جديد بانتظار الموافقة</p>

            <Card color={T.green} glow style={{ padding:24, marginBottom:18 }}>
              <p style={{ color:T.muted, fontSize:12, margin:"0 0 8px" }}>الرقم الظاهر في تطبيق نفاذ</p>
              <p style={{ color:T.green, fontFamily:"Space Mono,monospace", fontWeight:900, fontSize:48, margin:0, letterSpacing:6 }}>{randNum}</p>
              <p style={{ color:T.muted, fontSize:11, margin:"8px 0 0" }}>تأكد من تطابق هذا الرقم مع تطبيق نفاذ ثم اضغط "قبول"</p>
            </Card>

            {/* Countdown */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:18 }}>
              <Dot color={timer>10?T.teal:T.red} size={8} pulse/>
              <span style={{ color:timer>10?T.teal:T.red, fontFamily:"Space Mono,monospace", fontWeight:700 }}>
                ينتهي الطلب خلال {timer} ثانية
              </span>
            </div>

            {/* simulated phone */}
            <div style={{
              background:"#0d0d1a", border:"2px solid #222", borderRadius:20,
              padding:"16px 18px", marginBottom:18, textAlign:"right",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <NafathLogo size={28}/>
                <p style={{ color:"#fff", fontWeight:800, fontSize:13, margin:0 }}>نفاذ — طلب تحقق هوية</p>
              </div>
              <p style={{ color:T.muted, fontSize:12, margin:"0 0 10px" }}>
                {role==="parent"?"تطبيق أكبادنا (ولي الأمر) يطلب تسجيل دخولك":"تطبيق أكبادنا (معلم) يطلب تسجيل دخولك"}
              </p>
              <p style={{ color:T.muted, fontSize:11, margin:"0 0 14px" }}>الرقم: <span style={{ color:T.green, fontWeight:800, fontFamily:"Space Mono,monospace" }}>{randNum}</span></p>
              <div style={{ display:"flex", gap:8 }}>
                <Btn color={T.red} outline small style={{ flex:1 }}>رفض</Btn>
                <Btn color={T.green} small onClick={approvePush} style={{ flex:2 }}>✅ قبول</Btn>
              </div>
            </div>

            <button onClick={()=>{setPhase("id");setErr("");}} style={{ background:"none", border:"none", color:T.muted, fontSize:12 }}>إلغاء والعودة</button>
          </div>
        )}

        {/* ── Step: confirmed ── */}
        {phase==="confirmed" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, animation:"fadeUp .3s ease" }}>
            <div style={{ fontSize:64, animation:"pop .4s ease" }}>✅</div>
            <p style={{ color:T.green, fontWeight:900, fontSize:18 }}>تم التحقق من الهوية بنجاح!</p>
            <p style={{ color:T.muted, fontSize:12 }}>جاري تجهيز خطوة التأكيد الأخيرة...</p>
          </div>
        )}

        {/* ── Step: OTP ── */}
        {phase==="otp" && (
          <div style={{ animation:"fadeUp .3s ease" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
              <button onClick={()=>{setPhase("push");setErr("");}} style={{ background:"none", border:"none", color:T.teal, fontSize:20 }}>‹</button>
              <p style={{ color:T.muted, fontSize:12, margin:0 }}>الخطوة الأخيرة</p>
            </div>
            <Card style={{ textAlign:"center", padding:24, marginBottom:18 }}>
              <div style={{ fontSize:40, marginBottom:8 }}>🔑</div>
              <p style={{ color:"#fff", fontWeight:900, fontSize:16, margin:"0 0 4px" }}>أدخل الرمز السري لنفاذ</p>
              <p style={{ color:T.muted, fontSize:12, margin:0 }}>الرمز المكوّن من 6 أرقام الذي أنشأته عند التسجيل في نفاذ</p>
            </Card>
            <input
              value={otp}
              onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}
              placeholder="••••••"
              style={{
                width:"100%", background:"rgba(255,255,255,0.07)", border:`1px solid ${T.border}`,
                borderRadius:12, padding:"14px 16px", color:"#fff", fontSize:24,
                fontFamily:"Space Mono,monospace", outline:"none", direction:"ltr",
                textAlign:"center", letterSpacing:10, marginBottom:10,
              }}
            />
            {err && <p style={{ color:T.red, fontSize:12, margin:"0 0 10px", textAlign:"center" }}>⚠️ {err}</p>}
            <Btn color={T.green} onClick={verifyOtp} style={{ width:"100%" }}>تسجيل الدخول ✓</Btn>
          </div>
        )}

        {/* ── Step: setup quick-login (PIN + Face ID) ── */}
        {phase==="setup" && (
          <div style={{ animation:"fadeUp .3s ease" }}>
            <Card style={{ textAlign:"center", padding:22, marginBottom:18 }}>
              <div style={{ fontSize:40, marginBottom:8 }}>{pinStep==="create"?"🔢":"🔁"}</div>
              <p style={{ color:"#fff", fontWeight:900, fontSize:16, margin:"0 0 4px" }}>
                {pinStep==="create" ? "أنشئ رمز دخول سريع" : "أكّد الرمز"}
              </p>
              <p style={{ color:T.muted, fontSize:12, margin:0 }}>
                {pinStep==="create"
                  ? "ستستخدمه لفتح أكبادنا بسرعة دون المرور بنفاذ كل مرة"
                  : "أدخل نفس الرمز مرة أخرى للتأكيد"}
              </p>
            </Card>

            {/* PIN dots */}
            <div style={{ display:"flex", justifyContent:"center", gap:14, marginBottom:18 }}>
              {[0,1,2,3].map(i=>{
                const val = pinStep==="create" ? pin : pinConfirm;
                return (
                  <div key={i} style={{
                    width:18, height:18, borderRadius:"50%",
                    background: i<val.length ? T.teal : "rgba(255,255,255,0.1)",
                    border:`2px solid ${i<val.length ? T.teal : T.border}`,
                    transition:"all .15s",
                  }}/>
                );
              })}
            </div>

            {pinErr && <p style={{ color:T.red, fontSize:12, textAlign:"center", margin:"0 0 12px" }}>⚠️ {pinErr}</p>}

            {/* Numeric keypad */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, maxWidth:280, margin:"0 auto 20px" }}>
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d,i)=>(
                d==="" ? <div key={i}/> :
                <button key={i}
                  onClick={()=> d==="⌫" ? pressBackspace() : pressDigit(d)}
                  style={{
                    aspectRatio:"1", borderRadius:"50%", border:`1px solid ${T.border}`,
                    background:"rgba(255,255,255,0.05)", color:"#fff",
                    fontSize:20, fontWeight:700, fontFamily:"Space Mono,monospace",
                  }}>{d}</button>
              ))}
            </div>

            {/* Face ID toggle */}
            <Card style={{ padding:"14px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:26 }}>🪪</span>
              <div style={{ flex:1 }}>
                <p style={{ color:"#fff", fontWeight:700, fontSize:13, margin:0 }}>تفعيل بصمة الوجه (Face ID)</p>
                <p style={{ color:T.muted, fontSize:11, margin:"2px 0 0" }}>دخول أسرع باستخدام وجهك بدل الرمز</p>
              </div>
              <div onClick={()=>setFaceIdOn(p=>!p)} style={{
                width:46, height:26, borderRadius:13, cursor:"pointer",
                background: faceIdOn ? T.green : "#333", position:"relative", transition:"background .3s",
              }}>
                <div style={{
                  position:"absolute", top:3, borderRadius:"50%",
                  width:20, height:20, background:"#fff",
                  right: faceIdOn ? 3 : 23, transition:"right .3s",
                }}/>
              </div>
            </Card>

            <button onClick={skipPin} style={{ background:"none", border:"none", color:T.muted, fontSize:12, display:"block", margin:"0 auto" }}>
              تخطي والدخول بنفاذ في كل مرة
            </button>
          </div>
        )}

        {/* ── Step: done ── */}
        {phase==="done" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, animation:"fadeUp .3s ease" }}>
            <ConfettiBurst active/>
            <div style={{ fontSize:72, animation:"pop .4s ease" }}>🎉</div>
            <h3 style={{ color:"#fff", fontWeight:900, fontSize:20 }}>تم تسجيل الدخول!</h3>
            <p style={{ color:T.muted, fontSize:13 }}>مرحباً بك في أكبادنا — {role==="parent"?"ولي الأمر":"المعلم"}</p>
          </div>
        )}
      </div>

      {/* Footer trust badge */}
      {(phase==="role"||phase==="id") && (
        <div style={{ padding:"0 24px 24px", textAlign:"center" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:.6 }}>
            <NafathLogo size={22}/>
            <p style={{ color:T.muted, fontSize:11, margin:0 }}>محمي بواسطة النفاذ الوطني الموحد — وزارة الداخلية</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  🔓 الدخول السريع — بصمة الوجه أو الرمز السري (للجلسات المحفوظة)
// ══════════════════════════════════════════════════════════════

function QuickUnlock({ session, onUnlock, onUseNafath }) {
  const [mode,    setMode]    = useState(session.faceId ? "face" : "pin"); // face | pin
  const [phase,   setPhase]   = useState("idle"); // idle | scanning | ok | failed
  const [pinIn,   setPinIn]   = useState("");
  const [pinErr,  setPinErr]  = useState("");
  const [shake,   setShake]   = useState(false);

  // Auto-start face scan
  useEffect(()=>{
    if (mode!=="face") return;
    setPhase("scanning");
    const t1 = setTimeout(()=>setPhase("ok"), 1700);
    const t2 = setTimeout(()=>onUnlock(), 2300);
    return ()=>{ clearTimeout(t1); clearTimeout(t2); };
  },[mode]);

  const pressDigit = (d) => {
    if (pinIn.length>=4) return;
    const next = pinIn+d;
    setPinIn(next);
    if (next.length===4) {
      setTimeout(()=>{
        if (next===session.pin) { onUnlock(); }
        else {
          setPinErr("رمز غير صحيح، حاول مجدداً");
          setShake(true);
          setTimeout(()=>{ setShake(false); setPinIn(""); }, 420);
        }
      },150);
    }
  };
  const pressBackspace = () => { setPinErr(""); setPinIn(p=>p.slice(0,-1)); };

  return (
    <div style={{ background:T.bg, minHeight:"100vh", maxWidth:430, margin:"0 auto", direction:"rtl", display:"flex", flexDirection:"column" }}>
      <style>{GLOBAL_CSS}</style>
      <style>{`@keyframes shakeX{0%,100%{transform:translateX(0)}25%{transform:translateX(-10px)}75%{transform:translateX(10px)}}`}</style>

      <div style={{ padding:"60px 24px 20px", textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:18, background:`linear-gradient(135deg,${T.teal},${T.blue})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:34, margin:"0 auto 14px", boxShadow:`0 0 24px ${T.teal}44` }}>⌚</div>
        <h1 style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontSize:22, fontWeight:900, margin:"0 0 4px" }}>أهلاً بعودتك</h1>
        <p style={{ color:T.muted, fontSize:13, margin:0 }}>
          {session.role==="teacher" ? "دخول سريع — المعلم" : "دخول سريع — ولي الأمر"}
        </p>
      </div>

      <div style={{ flex:1, padding:"10px 24px 30px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>

        {/* ── Face ID mode ── */}
        {mode==="face" && (
          <div style={{ textAlign:"center" }}>
            <div style={{ position:"relative", width:140, height:140, margin:"0 auto 24px" }}>
              {phase==="scanning" && [0,1].map(i=>(
                <div key={i} style={{ position:"absolute", inset:0, borderRadius:"50%", border:`2px solid ${T.teal}`, animation:`ring 1.2s ease-out ${i*.4}s infinite` }}/>
              ))}
              <div style={{
                width:140, height:140, borderRadius:"50%",
                background:"linear-gradient(135deg,#1a1a2e,#2a2a3e)",
                border:`3px solid ${phase==="ok"?T.green:T.teal}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:64, position:"absolute",
                boxShadow:`0 0 30px ${phase==="ok"?T.green:T.teal}55`,
                transition:"border-color .3s",
              }}>
                {phase==="ok" ? "✅" : "🙂"}
              </div>
            </div>
            <p style={{ color: phase==="ok" ? T.green : T.teal, fontWeight:800, fontSize:15, marginBottom:4 }}>
              {phase==="ok" ? "تم التعرف على وجهك!" : "جاري مسح بصمة الوجه..."}
            </p>
            <p style={{ color:T.muted, fontSize:12, marginBottom:28 }}>ابقِ وجهك أمام الكاميرا</p>

            <button onClick={()=>{setMode("pin");setPhase("idle");}} style={{
              background:"none", border:"none", color:T.muted, fontSize:13,
            }}>🔢 استخدام الرمز السري بدلاً من ذلك</button>
          </div>
        )}

        {/* ── PIN mode ── */}
        {mode==="pin" && (
          <div style={{ width:"100%", textAlign:"center", animation: shake ? "shakeX .4s ease" : "fadeUp .3s ease" }}>
            <div style={{ fontSize:40, marginBottom:10 }}>🔒</div>
            <p style={{ color:"#fff", fontWeight:800, fontSize:16, marginBottom:4 }}>أدخل الرمز السري</p>
            <p style={{ color:T.muted, fontSize:12, marginBottom:22 }}>الرمز المكوّن من 4 أرقام</p>

            <div style={{ display:"flex", justifyContent:"center", gap:14, marginBottom:14 }}>
              {[0,1,2,3].map(i=>(
                <div key={i} style={{
                  width:18, height:18, borderRadius:"50%",
                  background: i<pinIn.length ? (pinErr?T.red:T.teal) : "rgba(255,255,255,0.1)",
                  border:`2px solid ${i<pinIn.length ? (pinErr?T.red:T.teal) : T.border}`,
                  transition:"all .15s",
                }}/>
              ))}
            </div>
            {pinErr && <p style={{ color:T.red, fontSize:12, marginBottom:10 }}>⚠️ {pinErr}</p>}

            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, maxWidth:280, margin:"0 auto 18px" }}>
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d,i)=>(
                d==="" ? <div key={i}/> :
                <button key={i}
                  onClick={()=> d==="⌫" ? pressBackspace() : pressDigit(d)}
                  style={{
                    aspectRatio:"1", borderRadius:"50%", border:`1px solid ${T.border}`,
                    background:"rgba(255,255,255,0.05)", color:"#fff",
                    fontSize:20, fontWeight:700, fontFamily:"Space Mono,monospace",
                  }}>{d}</button>
              ))}
            </div>

            {session.faceId && (
              <button onClick={()=>{setMode("face");setPinIn("");setPinErr("");}} style={{
                background:"none", border:"none", color:T.muted, fontSize:13,
              }}>🪪 استخدام بصمة الوجه بدلاً من ذلك</button>
            )}
          </div>
        )}
      </div>

      <div style={{ padding:"0 24px 28px", textAlign:"center" }}>
        <button onClick={onUseNafath} style={{ background:"none", border:"none", color:T.dim, fontSize:12 }}>
          🇸🇦 تسجيل الدخول بحساب آخر عبر نفاذ
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  Pages moved to module scope (stable references — prevents
//  remount/flicker that happens when components are redefined
//  inside App() on every render, e.g. every clock tick)
// ══════════════════════════════════════════════════════════════

// ── More Menu page ──
function MorePage({ setActive, userRole, setUserRole, session, handleLogout }) {
  return (
    <div style={{ padding:"16px 16px 90px", animation:"fadeUp .3s ease" }}>
      <h2 style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontSize:20, fontWeight:900, margin:"0 0 6px" }}>
        ⋯ المزيد
      </h2>
      {/* Role switcher */}
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:14, marginBottom:16 }}>
        <p style={{ color:T.muted, fontSize:12, margin:"0 0 10px" }}>وضع المستخدم</p>
        <div style={{ display:"flex", gap:8 }}>
          {[["parent","ولي الأمر","👨"],["teacher","معلم","👨‍🏫"],["student","طالب","👦"]].map(([r,l,ic])=>(
            <button key={r} onClick={()=>setUserRole(r)} style={{
              flex:1, padding:"10px 4px", borderRadius:12,
              background:userRole===r?`linear-gradient(135deg,${T.teal},${T.blue})`:"rgba(255,255,255,0.05)",
              border:`1px solid ${userRole===r?T.teal:T.border}`,
              color:userRole===r?"#fff":T.muted, fontWeight:800, fontSize:12,
            }}>{ic} {l}</button>
          ))}
        </div>
      </div>

      <p style={{ color:T.muted, fontSize:12, margin:"0 0 10px" }}>الأدوات</p>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {[
          { id:"akbid",    icon:"🆔", label:"معرّف أكبادنا (ID)",   sub:"رقم تعريف خاص لربط الساعة بأي شخص", color:T.purple },
          { id:"schedule", icon:"📅", label:"جدول الحصص",          sub:"عرض جدول اليوم كاملاً",          color:T.blue   },
          { id:"tracking", icon:"🗺️", label:"تتبع الخروج",          sub:"توجيه الطالب لموقع الانتظار",    color:T.teal   },
          { id:"health",   icon:"❤️", label:"الصحة والحيويات",      sub:"نبض، حرارة، نشاط الطالب",        color:T.red    },
          { id:"wallet",   icon:"💰", label:"المحفظة المدرسية",      sub:"الرصيد، شحن، سجل المعاملات",     color:T.yellow },
          { id:"noor",     icon:"🏫", label:"ربط نظام نور",          sub:"جلب بيانات الطالب من الوزارة",   color:"#1a5276"},
          { id:"receiver", icon:"📡", label:"لوحة التحكم المباشر",   sub:"تتبع جميع الساعات — للمدرسة",   color:T.purple },
        ].map(item=>(
          <button key={item.id} onClick={()=>setActive(item.id)} style={{
            background:T.card, border:`1px solid ${item.color}33`,
            borderRadius:16, padding:"14px 16px",
            display:"flex", alignItems:"center", gap:14, transition:"all .2s",
          }}>
            <div style={{ width:46, height:46, borderRadius:14, background:`${item.color}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{item.icon}</div>
            <div style={{ flex:1, textAlign:"right" }}>
              <p style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontWeight:800, fontSize:14, margin:0 }}>{item.label}</p>
              <p style={{ color:T.muted, fontFamily:"Tajawal,sans-serif", fontSize:11, margin:"2px 0 0" }}>{item.sub}</p>
            </div>
            <span style={{ color:item.color, fontSize:18 }}>›</span>
          </button>
        ))}
      </div>

      {/* App info */}
      <div style={{ textAlign:"center", marginTop:24, padding:"16px 0" }}>
        <div style={{ width:56, height:56, borderRadius:16, background:`linear-gradient(135deg,${T.teal},${T.blue})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 8px" }}>⌚</div>
        <p style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontWeight:900, fontSize:16, margin:0 }}>أكبادنا</p>
        <p style={{ color:T.muted, fontSize:11, margin:"3px 0 0" }}>منصة التعليم الذكية — الإصدار 2.0</p>
        <p style={{ color:T.dim, fontSize:10, margin:"3px 0 0", fontFamily:"Space Mono,monospace" }}>akbadna.sa</p>
      </div>

      {/* Session info */}
      {session && (
        <Card style={{ marginTop:16, padding:"12px 14px" }}>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:18 }}>{session.faceId ? "🪪" : "🔢"}</span>
            <p style={{ color:T.muted, fontSize:11, margin:0, lineHeight:1.6 }}>
              الدخول السريع مفعّل {session.faceId ? "(بصمة الوجه + رمز سري)" : "(رمز سري)"} — لن تحتاج نفاذ في كل مرة
            </p>
          </div>
        </Card>
      )}

      {/* Logout */}
      <div style={{ marginTop:16 }}>
        <Btn color={T.red} outline onClick={handleLogout} style={{ width:"100%" }}>
          🚪 تسجيل الخروج (مسح الجلسة المحفوظة)
        </Btn>
      </div>
    </div>
  );
}

// ── Akbadna ID page ──
function AkbIdPage({ kids, setActive, setToast }) {
  const [tab, setTab] = useState("mine");      // mine | add | contacts
  const [selKidIdx, setSelKidIdx] = useState(0);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");
  const [contacts, setContacts] = useState([
    { akbId:"AKB-2H5D-8N4W", name:"خالد سعد الدوسري", photo:"🧒", relation:"صديق صف", status:"online" },
  ]);
  const [pendingReq, setPendingReq] = useState(null);
  const [copied, setCopied] = useState(false);

  const myKid = kids[selKidIdx];

  const doSearch = () => {
    setSearchErr(""); setSearchResult(null);
    const clean = searchId.trim().toUpperCase();
    if (!/^AKB-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(clean)) {
      setSearchErr("الصيغة الصحيحة: AKB-XXXX-XXXX"); return;
    }
    setSearching(true);
    setTimeout(()=>{
      setSearching(false);
      const found = ID_DIRECTORY.find(d=>d.akbId===clean);
      if (found) setSearchResult(found);
      else setSearchErr("لم يتم العثور على معرف بهذا الرقم");
    }, 1000);
  };

  const sendRequest = () => {
    const target = searchResult;
    setPendingReq(target);
    setSearchResult(null); setSearchId("");
    setTimeout(()=>{
      setContacts(p=>[...p, { akbId:target.akbId, name:target.name, photo:target.photo, relation:"جهة اتصال جديدة", status:"online" }]);
      setToast({ type:"success", icon:"✅", title:"تم القبول!", body:`${target.name} أصبح ضمن جهات الاتصال` });
      setPendingReq(null);
    },2200);
  };

  const copyId = () => {
    setCopied(true);
    setTimeout(()=>setCopied(false),1800);
  };

  return (
    <div style={{ padding:"16px 16px 90px", animation:"fadeUp .3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <button onClick={()=>setActive("more")} style={{ background:"none", border:"none", color:T.teal, fontSize:20 }}>←</button>
        <h2 style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontSize:20, fontWeight:900, margin:0 }}>🆔 معرّف أكبادنا</h2>
      </div>

      {/* sub tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {[["mine","بطاقتي","🪪"],["add","إضافة بمعرف","➕"],["contacts","جهات الاتصال","👥"]].map(([id,lbl,ic])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            flex:1, padding:"9px 4px", borderRadius:12,
            background:tab===id?`linear-gradient(135deg,${T.purple},${T.blue})`:"rgba(255,255,255,0.05)",
            border:`1px solid ${tab===id?T.purple:T.border}`,
            color:tab===id?"#fff":T.muted, fontWeight:800, fontSize:11.5,
          }}>{ic} {lbl}</button>
        ))}
      </div>

      {/* ── MY CARD ── */}
      {tab==="mine" && (
        <div>
          {/* kid switcher if more than 1 */}
          {kids.length>1 && (
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {kids.map((k,i)=>(
                <button key={k.id} onClick={()=>setSelKidIdx(i)} style={{
                  flex:1, padding:"8px 6px", borderRadius:12,
                  background:selKidIdx===i?`${T.teal}18`:T.card,
                  border:`1px solid ${selKidIdx===i?T.teal:T.border}`,
                  color:selKidIdx===i?T.teal:T.muted, fontWeight:700, fontSize:12,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                }}>{k.photo} {k.name.split(" ")[0]}</button>
              ))}
            </div>
          )}

          {/* ID Card — BBM-PIN style */}
          <div style={{
            background:`linear-gradient(135deg,${T.purple}22,${T.blue}15)`,
            border:`1px solid ${T.purple}44`,
            borderRadius:24, padding:24, marginBottom:16,
            position:"relative", overflow:"hidden",
          }}>
            {/* decorative circles */}
            <div style={{ position:"absolute", top:-30, right:-30, width:110, height:110, borderRadius:"50%", background:`${T.purple}15` }}/>
            <div style={{ position:"absolute", bottom:-40, left:-20, width:100, height:100, borderRadius:"50%", background:`${T.blue}12` }}/>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18, position:"relative" }}>
              <div>
                <p style={{ color:T.muted, fontSize:11, margin:"0 0 2px" }}>⌚ معرّف الساعة الذكية</p>
                <p style={{ color:"#fff", fontWeight:900, fontSize:16, margin:0 }}>{myKid.name}</p>
                <p style={{ color:T.muted, fontSize:11, margin:"2px 0 0" }}>{myKid.grade}</p>
              </div>
              <div style={{
                width:54, height:54, borderRadius:"50%",
                background:`linear-gradient(135deg,${T.teal},${T.blue})`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:28,
                border:"3px solid rgba(255,255,255,0.15)",
              }}>{myKid.photo}</div>
            </div>

            {/* The PIN itself */}
            <div style={{
              background:"rgba(0,0,0,0.25)", borderRadius:16, padding:"16px 18px",
              textAlign:"center", marginBottom:14, position:"relative",
            }}>
              <p style={{ color:T.muted, fontSize:10, margin:"0 0 6px", letterSpacing:1 }}>رقم المعرّف الفريد</p>
              <p style={{
                color:"#fff", fontFamily:"Space Mono,monospace", fontWeight:700,
                fontSize:26, margin:0, letterSpacing:3,
                background:`linear-gradient(90deg,${T.teal},${T.blue},${T.purple})`,
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              }}>{myKid.akbId}</p>
            </div>

            {/* QR-like decorative pattern */}
            <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
              <div style={{
                width:84, height:84, borderRadius:12, background:"#fff",
                display:"grid", gridTemplateColumns:"repeat(7,1fr)", gridTemplateRows:"repeat(7,1fr)",
                padding:6, gap:2,
              }}>
                {Array.from({length:49}).map((_,i)=>{
                  const seed = (myKid.akbId.charCodeAt(i % myKid.akbId.length) + i*7) % 5;
                  return <div key={i} style={{ background: seed<2 ? "#1B2A47":"transparent", borderRadius:1 }}/>;
                })}
              </div>
            </div>

            <div style={{ display:"flex", gap:8 }}>
              <Btn color={T.teal} onClick={copyId} style={{ flex:1, fontSize:13 }}>
                {copied ? "✅ تم النسخ" : "📋 نسخ المعرّف"}
              </Btn>
              <Btn color={T.purple} outline style={{ flex:1, fontSize:13 }}>📤 مشاركة</Btn>
            </div>
          </div>

          <Card color={T.teal} style={{ padding:"12px 14px" }}>
            <div style={{ display:"flex", gap:8 }}>
              <span>🔒</span>
              <p style={{ color:T.muted, fontSize:12, margin:0, lineHeight:1.6 }}>
                هذا المعرف خاص بساعة {myKid.name.split(" ")[0]} فقط. شاركه مع من تثق به — أصدقاء، أقارب، أو معلمين — للتواصل المباشر والآمن عبر أكبادنا، دون الحاجة لرقم جوال.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* ── ADD BY ID ── */}
      {tab==="add" && (
        <div>
          <p style={{ color:T.muted, fontSize:13, margin:"0 0 14px" }}>
            أدخل معرّف أكبادنا للشخص الذي تريد إضافته
          </p>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <input
              value={searchId}
              onChange={e=>setSearchId(e.target.value.toUpperCase())}
              placeholder="AKB-XXXX-XXXX"
              style={{
                flex:1, background:"rgba(255,255,255,0.07)", border:`1px solid ${T.border}`,
                borderRadius:12, padding:"12px 14px", color:"#fff", fontSize:15,
                fontFamily:"Space Mono,monospace", outline:"none", direction:"ltr", textAlign:"center",
                letterSpacing:1.5,
              }}
            />
            <Btn color={T.purple} onClick={doSearch} disabled={searching} style={{ paddingLeft:18, paddingRight:18 }}>
              {searching?"⏳":"🔍"}
            </Btn>
          </div>
          {searchErr && <p style={{ color:T.red, fontSize:12, margin:"0 0 10px" }}>⚠️ {searchErr}</p>}

          {/* example helper */}
          <Card style={{ padding:"10px 14px", marginBottom:16 }}>
            <p style={{ color:T.muted, fontSize:11, margin:0 }}>
              💡 جرّب: <span style={{ fontFamily:"Space Mono,monospace", color:T.teal }}>AKB-2H5D-8N4W</span>
            </p>
          </Card>

          {/* search result */}
          {searchResult && (
            <Card color={T.green} style={{ animation:"fadeUp .3s ease", marginBottom:12 }}>
              <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
                <Avatar emoji={searchResult.photo} size={50} color={T.green}/>
                <div style={{ flex:1 }}>
                  <p style={{ color:"#fff", fontWeight:800, fontSize:15, margin:0 }}>{searchResult.name}</p>
                  <p style={{ color:T.muted, fontSize:12, margin:"2px 0 0" }}>{searchResult.grade} • {searchResult.school}</p>
                  <p style={{ color:T.muted, fontSize:11, margin:"2px 0 0" }}>ولي الأمر: {searchResult.parent}</p>
                </div>
              </div>
              <Btn color={T.green} onClick={sendRequest} style={{ width:"100%" }}>📲 إرسال طلب إضافة</Btn>
            </Card>
          )}

          {/* pending request animation */}
          {pendingReq && (
            <Card color={T.yellow} style={{ textAlign:"center", padding:20 }}>
              <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:10 }}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{ width:9, height:9, borderRadius:"50%", background:T.yellow, animation:`bounce .8s ease-in-out ${i*.2}s infinite` }}/>
                ))}
              </div>
              <p style={{ color:T.yellow, fontWeight:700, fontSize:13 }}>
                بانتظار موافقة {pendingReq.name}...
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ── CONTACTS ── */}
      {tab==="contacts" && (
        <div>
          <p style={{ color:T.muted, fontSize:12, margin:"0 0 12px" }}>
            {contacts.length} جهة اتصال مرتبطة بمعرّف أكبادنا
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {contacts.map(c=>(
              <Card key={c.akbId} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ position:"relative" }}>
                  <Avatar emoji={c.photo} size={46} color={T.teal}/>
                  <div style={{
                    position:"absolute", bottom:0, right:0, width:11, height:11, borderRadius:"50%",
                    background:c.status==="online"?T.green:T.dim, border:"2px solid #070711",
                  }}/>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ color:"#fff", fontWeight:700, fontSize:14, margin:0 }}>{c.name}</p>
                  <p style={{ color:T.muted, fontSize:11, margin:"2px 0 0", fontFamily:"Space Mono,monospace" }}>{c.akbId}</p>
                </div>
                <button style={{
                  background:`${T.teal}18`, border:`1px solid ${T.teal}33`,
                  borderRadius:10, padding:"7px 10px", color:T.teal, fontSize:16,
                }}>📳</button>
              </Card>
            ))}
            {contacts.length===0 && (
              <p style={{ color:T.dim, textAlign:"center", padding:30, fontSize:13 }}>
                لا توجد جهات اتصال بعد — أضف بالمعرّف
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Health page ──
function HealthPage({ kids, setActive }) {
  return (
    <div style={{ padding:"16px 16px 90px", animation:"fadeUp .3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <button onClick={()=>setActive("more")} style={{ background:"none", border:"none", color:T.teal, fontSize:20 }}>←</button>
        <h2 style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontSize:20, fontWeight:900, margin:0 }}>❤️ الصحة</h2>
      </div>
      {kids.map(k=>(
        <Card key={k.id} style={{ marginBottom:12 }}>
          <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:14 }}>
            <Avatar emoji={k.photo} size={50} color={T.teal}/>
            <div>
              <p style={{ color:"#fff", fontWeight:800, fontSize:15, margin:0 }}>{k.name}</p>
              <p style={{ color:T.muted, fontSize:12, margin:"2px 0 0" }}>{k.grade}</p>
            </div>
            <div style={{ marginRight:"auto", background:`${T.green}18`, border:`1px solid ${T.green}33`, borderRadius:8, padding:"4px 10px" }}>
              <span style={{ color:T.green, fontSize:12, fontWeight:700 }}>سليم ✓</span>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              { l:"نبضات القلب", v:`${Math.round(k.hr)}`, u:"bpm", c:hrColor(k.hr),        ic:"❤️" },
              { l:"الحرارة",     v:`${k.temp.toFixed(1)}`, u:"°م",  c:T.teal,               ic:"🌡️" },
              { l:"البطارية",    v:`${Math.round(k.battery)}`, u:"%", c:battColor(k.battery),ic:"🔋" },
              { l:"النشاط",      v:"87",  u:"%",  c:T.yellow,  ic:"⚡" },
            ].map(x=>(
              <div key={x.l} style={{ background:"rgba(255,255,255,0.04)", borderRadius:12, padding:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:18 }}>{x.ic}</span>
                  <span style={{ color:x.c, fontWeight:800, fontSize:15 }}>{x.v}{x.u}</span>
                </div>
                <Bar value={parseFloat(x.v)} color={x.c} max={x.u==="bpm"?150:x.u==="°م"?42:100} h={5}/>
                <p style={{ color:T.muted, fontSize:10, margin:"4px 0 0" }}>{x.l}</p>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Noor page ──
function NoorPage({ setActive }) {
  return (
    <div style={{ padding:"16px 16px 90px", animation:"fadeUp .3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <button onClick={()=>setActive("more")} style={{ background:"none", border:"none", color:T.teal, fontSize:20 }}>←</button>
        <h2 style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontSize:20, fontWeight:900, margin:0 }}>🏫 نظام نور</h2>
      </div>
      <Card color="#1a5276" glow style={{ textAlign:"center", padding:24, marginBottom:14 }}>
        <div style={{ width:64, height:64, borderRadius:18, background:"rgba(26,82,118,0.4)", margin:"0 auto 12px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:34 }}>🏫</div>
        <p style={{ color:"#fff", fontWeight:900, fontSize:16, margin:"0 0 4px" }}>وزارة التعليم — نور</p>
        <p style={{ color:T.muted, fontSize:12, margin:0 }}>ربط بيانات الطالب الرسمية</p>
      </Card>
      <Card style={{ marginBottom:10 }}>
        <p style={{ color:T.muted, fontSize:12, margin:"0 0 8px" }}>رقم هوية ولي الأمر</p>
        <input placeholder="1XXXXXXXXX" style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 12px", color:"#fff", fontSize:15, outline:"none", direction:"ltr" }}/>
      </Card>
      <Card style={{ marginBottom:16 }}>
        <p style={{ color:T.muted, fontSize:12, margin:"0 0 8px" }}>كلمة المرور</p>
        <input type="password" placeholder="••••••••" style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 12px", color:"#fff", fontSize:15, outline:"none" }}/>
      </Card>
      <Btn color="#1a5276" style={{ width:"100%", marginBottom:10 }}>🔗 ربط الحساب</Btn>
      <Card color={T.teal} style={{ padding:"10px 14px" }}>
        <div style={{ display:"flex", gap:8 }}>
          <span>🔒</span>
          <p style={{ color:T.muted, fontSize:12, margin:0, lineHeight:1.5 }}>بياناتك مشفرة ولا تُخزَّن — اتصال مباشر بخوادم الوزارة</p>
        </div>
      </Card>
    </div>
  );
}

// ── Receiver / Live dashboard page ──
function ReceiverPage({ kids, setActive }) {
  const [packets, setPackets] = useState(0);
  const [logs,    setLogs]    = useState([
    { id:1, type:"data",   msg:"[W001] أحمد — نبض:82 حرارة:36.7° بطارية:78%",    time:"07:31" },
    { id:2, type:"data",   msg:"[W002] منى — نبض:88 حرارة:36.5° بطارية:91%",     time:"07:31" },
    { id:3, type:"system", msg:"WebSocket server — 2 ساعات متصلة",               time:"07:30" },
    { id:4, type:"alert",  msg:"[W001] تنبيه: بطارية منخفضة 20%",                time:"07:28" },
  ]);
  useEffect(()=>{
    const t=setInterval(()=>{
      setPackets(p=>p+Math.floor(Math.random()*3+1));
      if(Math.random()>.6) setLogs(p=>[{id:Date.now(),type:"data",msg:`[W00${Math.ceil(Math.random()*2)}] حزمة بيانات مستلمة — ${new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}`,time:new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"})},...p].slice(0,30));
    },2000);
    return()=>clearInterval(t);
  },[]);
  const colors = { data:T.teal, alert:T.red, system:T.muted };
  return (
    <div style={{ padding:"16px 16px 90px", animation:"fadeUp .3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <button onClick={()=>setActive("more")} style={{ background:"none", border:"none", color:T.teal, fontSize:20 }}>←</button>
        <h2 style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontSize:20, fontWeight:900, margin:0 }}>📡 لوحة مباشر</h2>
        <div style={{ marginRight:"auto", display:"flex", alignItems:"center", gap:5, background:`${T.green}15`, border:`1px solid ${T.green}33`, borderRadius:20, padding:"3px 10px" }}>
          <Dot color={T.green} size={6} pulse/>
          <span style={{ color:T.green, fontSize:10, fontWeight:700 }}>مباشر</span>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
        {[{l:"متصل",v:"2/2",c:T.green},{l:"حزم",v:packets,c:T.teal},{l:"SOS",v:"0",c:T.muted}].map(x=>(
          <Card key={x.l} style={{ textAlign:"center", padding:"10px 6px" }}>
            <p style={{ color:x.c, fontWeight:900, fontSize:20, margin:0, fontFamily:"Space Mono,monospace" }}>{x.v}</p>
            <p style={{ color:T.muted, fontSize:10, margin:0 }}>{x.l}</p>
          </Card>
        ))}
      </div>
      {kids.map(k=>(
        <Card key={k.id} style={{ marginBottom:10, padding:"12px 14px" }}>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <Avatar emoji={k.photo} size={40} color={T.teal}/>
            <div style={{ flex:1 }}>
              <p style={{ color:"#fff", fontWeight:700, fontSize:13, margin:0 }}>{k.name.split(" ")[0]}</p>
              <p style={{ color:T.muted, fontSize:11, margin:0 }}>❤️{Math.round(k.hr)} 🌡️{k.temp.toFixed(1)}° 🔋{Math.round(k.battery)}%</p>
            </div>
            <Dot color={T.green} size={8} pulse/>
          </div>
        </Card>
      ))}
      <div style={{ background:"#050510", border:`1px solid ${T.border}`, borderRadius:14, overflow:"hidden" }}>
        <div style={{ padding:"8px 12px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ color:T.muted, fontFamily:"Space Mono,monospace", fontSize:10 }}>LIVE LOG</span>
          <Dot color={T.teal} size={6} pulse/>
        </div>
        <div style={{ height:180, overflowY:"auto" }}>
          {logs.map(l=>(
            <div key={l.id} style={{ display:"flex", gap:8, padding:"6px 12px", borderBottom:`1px solid rgba(255,255,255,0.03)` }}>
              <span style={{ color:T.dim, fontSize:9, fontFamily:"Space Mono,monospace", flexShrink:0, width:38 }}>{l.time}</span>
              <span style={{ color:colors[l.type]||T.muted, fontSize:9, fontFamily:"Space Mono,monospace", flex:1 }}>{l.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tracking page ──
function TrackingPage({ kids, setActive }) {
  const [phase, setPhase] = useState("idle");
  const [waitType, setWaitType] = useState("gate_main");
  const [elapsed, setElapsed] = useState(0);
  const routes = {
    gate_main:{ label:"البوابة الرئيسية", icon:"🚗", color:T.green },
    gate_side:{ label:"البوابة الجانبية", icon:"🚙", color:T.teal  },
    parking:  { label:"موقف السيارات",    icon:"🅿️", color:T.yellow},
  };
  const r = routes[waitType];
  useEffect(()=>{
    if(phase!=="tracking") return;
    const t=setInterval(()=>setElapsed(e=>{if(e>=90){clearInterval(t);setPhase("arrived");return e;}return e+1;}),1000);
    return()=>clearInterval(t);
  },[phase]);
  const eta = Math.max(90-elapsed,0);
  const prog = Math.min((elapsed/90)*100,100);
  return (
    <div style={{ padding:"16px 16px 90px", animation:"fadeUp .3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <button onClick={()=>setActive("more")} style={{ background:"none", border:"none", color:T.teal, fontSize:20 }}>←</button>
        <h2 style={{ color:"#fff", fontFamily:"Tajawal,sans-serif", fontSize:20, fontWeight:900, margin:0 }}>🗺️ تتبع الخروج</h2>
      </div>
      {phase==="idle"&&(
        <>
          <p style={{ color:T.muted, fontSize:13, margin:"0 0 14px" }}>أين تنتظر؟</p>
          {Object.entries(routes).map(([k,rv])=>(
            <div key={k} onClick={()=>setWaitType(k)} style={{
              background:waitType===k?`${rv.color}12`:T.card,
              border:`1px solid ${waitType===k?rv.color:T.border}`,
              borderRadius:16, padding:"14px 16px", marginBottom:10, cursor:"pointer",
              display:"flex", alignItems:"center", gap:12,
            }}>
              <span style={{ fontSize:26 }}>{rv.icon}</span>
              <p style={{ color:"#fff", fontWeight:700, flex:1, margin:0 }}>{rv.label}</p>
              {waitType===k&&<span style={{ color:rv.color }}>✓</span>}
            </div>
          ))}
          <Btn color={T.teal} onClick={()=>setPhase("tracking")} style={{ width:"100%", marginTop:8 }}>📲 طلب خروج الطالب</Btn>
        </>
      )}
      {phase==="tracking"&&(
        <>
          <Card color={r.color} style={{ padding:"12px 14px", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <p style={{ color:"#fff", fontWeight:800, margin:0 }}>الطالب في طريقه!</p>
              <div style={{ background:`${r.color}22`, borderRadius:8, padding:"3px 10px" }}>
                <span style={{ color:r.color, fontSize:11, fontWeight:700 }}>🔴 مباشر</span>
              </div>
            </div>
            <Bar value={prog} color={r.color}/>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
              <span style={{ color:T.muted, fontSize:11 }}>الفصل</span>
              <span style={{ color:r.color, fontWeight:700 }}>{r.icon} {r.label}</span>
            </div>
          </Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ color:T.muted }}>الوقت المتبقي</span>
            <span style={{ color:r.color, fontFamily:"Space Mono,monospace", fontWeight:700, fontSize:22 }}>{eta}ث</span>
          </div>
          {kids.slice(0,1).map(k=>(
            <Card key={k.id} style={{ display:"flex", gap:12, alignItems:"center" }}>
              <Avatar emoji={k.photo} size={44} color={T.teal}/>
              <div style={{ flex:1 }}>
                <p style={{ color:"#fff", fontWeight:700, margin:0 }}>{k.name.split(" ")[0]}</p>
                <p style={{ color:T.teal, fontSize:12, margin:0 }}>📍 يسير في الممر الرئيسي</p>
              </div>
            </Card>
          ))}
          <Btn color={T.red} outline onClick={()=>{setPhase("idle");setElapsed(0);}} style={{ width:"100%", marginTop:10 }}>❌ إلغاء</Btn>
        </>
      )}
      {phase==="arrived"&&(
        <div style={{ textAlign:"center", paddingTop:30 }}>
          <div style={{ fontSize:72, marginBottom:12 }}>🎉</div>
          <h3 style={{ color:T.green, fontWeight:900, fontSize:22, margin:"0 0 8px" }}>وصل الطالب!</h3>
          <p style={{ color:T.muted, margin:"0 0 24px" }}>{r.icon} {r.label}</p>
          <Btn color={T.teal} onClick={()=>{setPhase("idle");setElapsed(0);}} style={{ width:"100%" }}>طلب خروج جديد</Btn>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  ROOT APP
// ═══════════════════════════════════════════════════════
export default function App() {
  const [authed,   setAuthed]   = useState(false);
  const [now,    setNow]    = useState(new Date());
  const [active, setActive] = useState("home");
  const [kids,   setKids]   = useState(KIDS.map(k=>({...k})));
  const [msgs,   setMsgs]   = useState(MSGS_INIT);
  const [ping,   setPing]   = useState(null);
  const [toast,  setToast]  = useState(null);
  const [userRole, setUserRole] = useState("parent"); // parent | teacher | student

  // ── Firebase session state ──
  const [checkingSession, setCheckingSession] = useState(true);
  const [user,            setUser]            = useState(null); // Firebase user
  const [session,         setSession]         = useState(null); // Firestore profile {role, pin, faceId, savedAt}
  const [quickUnlocked,   setQuickUnlocked]   = useState(false);

  // ── Live data from Firestore (seeded on first run) ──
  const { rows: liveKids } = useKids();
  const { rows: liveMsgs } = useMessages();

  // Overlay Firestore kids onto local state, keeping the running vitals sim
  useEffect(() => {
    if (!liveKids.length) return;
    setKids(prev => {
      const sim = Object.fromEntries(prev.map(k => [k.id, k]));
      return liveKids.map(k => sim[k.id]
        ? { ...k, hr: sim[k.id].hr, temp: sim[k.id].temp, battery: sim[k.id].battery }
        : k);
    });
  }, [liveKids]);

  // Merge Firestore messages with locally-added (simulated) ones
  useEffect(() => {
    if (!liveMsgs.length) return;
    setMsgs(prev => {
      const liveIds = new Set(liveMsgs.map(m => String(m.id)));
      const extras = prev.filter(m => !liveIds.has(String(m.id)));
      return [...extras, ...liveMsgs];
    });
  }, [liveMsgs]);

  // Clock tick
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(t); },[]);

  // Vitals simulation
  useEffect(()=>{
    const t=setInterval(()=>{
      setKids(prev=>prev.map(k=>({
        ...k,
        hr:   Math.max(60,Math.min(130,k.hr   +(Math.random()-.5)*4)),
        temp: Math.max(35.5,Math.min(38.5,k.temp+(Math.random()-.5)*.15)),
        battery: Math.max(0,k.battery-.02),
      })));
    },3000);
    return()=>clearInterval(t);
  },[]);

  // Random carpool notification
  useEffect(()=>{
    const t=setTimeout(()=>{
      setMsgs(p=>[{ id:Date.now(), from:"أبو خالد", text:"أنا قريب من منزلك — هل أحمد جاهز؟ 🚗", time:fmtTime(new Date()), type:"carpool", read:false },...p]);
      setToast({ type:"carpool", icon:"🚗", title:"أبو خالد", body:"أنا قريب من منزلك!" });
    },8000);
    return()=>clearTimeout(t);
  },[]);

  // Watch the Firebase auth session (persisted across reloads by Firebase itself)
  useEffect(()=>{
    const unsub = watchSession(({ user, profile }) => {
      setUser(user);
      setSession(profile);
      if (user && profile) {
        setUserRole(profile.role || "parent");
        // no quick-unlock secret set → go straight in
        if (!profile.pin && !profile.faceId) { setQuickUnlocked(true); setAuthed(true); }
      } else {
        setAuthed(false);
        setQuickUnlocked(false);
      }
      setCheckingSession(false);
    });
    return unsub;
  },[]);

  // Called after the Nafath flow succeeds — opens a real Firebase session
  const handleNafathSuccess = async (role, pin, faceId) => {
    try {
      const profile = await nafathSignIn(role, pin, faceId);
      setSession(profile);
    } catch (e) {
      // offline / rules blocked — keep a local-only session so the demo still runs
      setSession({ role, pin, faceId, savedAt: Date.now() });
    }
    setUserRole(role);
    setQuickUnlocked(true);
    setAuthed(true);
  };

  // Called after successful quick unlock (Face ID / PIN)
  const handleQuickUnlock = () => {
    setUserRole(session?.role || "parent");
    setQuickUnlocked(true);
    setAuthed(true);
  };

  // Switch role and persist it to the Firestore profile
  const handleSetRole = (role) => {
    setUserRole(role);
    updateRole(role).catch(()=>{});
  };

  // Force a full Nafath re-login (ends the current Firebase session)
  const handleUseNafathInstead = async () => {
    try { await signOutSession(); } catch(e) {}
    setSession(null);
    setUser(null);
  };

  // Full logout — ends the Firebase session
  const handleLogout = async () => {
    try { await signOutSession(); } catch(e) {}
    setSession(null);
    setUser(null);
    setQuickUnlocked(false);
    setAuthed(false);
  };

  // ── Still checking storage for an existing session ──
  if (checkingSession) {
    return (
      <div style={{ background:T.bg, minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ width:54, height:54, borderRadius:16, background:`linear-gradient(135deg,${T.teal},${T.blue})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>⌚</div>
        <div style={{ width:28, height:28, borderRadius:"50%", border:`3px solid ${T.teal}33`, borderTop:`3px solid ${T.teal}`, animation:"spin 0.8s linear infinite" }}/>
      </div>
    );
  }

  // ── Not authed yet: decide between quick-unlock (saved session) or full Nafath ──
  if (!authed) {
    if (session && (session.pin || session.faceId) && !quickUnlocked) {
      return <QuickUnlock session={session} onUnlock={handleQuickUnlock} onUseNafath={handleUseNafathInstead}/>;
    }
    return <NafathLogin onSuccess={handleNafathSuccess}/>;
  }

  const unreadMsgs = msgs.filter(m=>!m.read).length;
  const onPing = k => { setPing(k); if(navigator.vibrate) navigator.vibrate([200,100,200,100,200]); };

  return (
    <div style={{ background:T.bg, minHeight:"100vh", maxWidth:430, margin:"0 auto", position:"relative", overflowX:"hidden" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Global toast */}
      {toast && <Toast msg={toast} onClose={()=>setToast(null)}/>}

      {/* Ping overlay */}
      {ping && <PingOverlay kid={ping} onClose={()=>setPing(null)}/>}

      {/* ── App Header ── */}
      <div style={{
        background:"rgba(7,7,17,0.97)", backdropFilter:"blur(20px)",
        borderBottom:`1px solid ${T.border}`,
        padding:"12px 16px 10px", position:"sticky", top:0, zIndex:50,
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg,${T.teal},${T.blue})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⌚</div>
          <div>
            <h1 style={{ fontSize:17, fontWeight:900, color:"#fff", lineHeight:1, margin:0 }}>أكبادنا</h1>
            <p style={{ fontSize:9, color:T.teal, margin:0 }}>منصة التعليم الذكية</p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {/* Role badge */}
          <div style={{ background:`${T.purple}18`, border:`1px solid ${T.purple}33`, borderRadius:20, padding:"3px 10px" }}>
            <span style={{ color:T.purple, fontSize:10, fontWeight:700 }}>
              {userRole==="teacher"?"معلم 👨‍🏫":userRole==="student"?"طالب 👦":"ولي أمر 👨"}
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4, background:`${T.green}15`, border:`1px solid ${T.green}33`, borderRadius:20, padding:"3px 8px" }}>
            <Dot color={T.green} size={5} pulse/>
            <span style={{ color:T.green, fontSize:9, fontWeight:700 }}>مباشر</span>
          </div>
          <span style={{ fontFamily:"Space Mono,monospace", color:T.muted, fontSize:10 }}>{fmtTime(now)}</span>
        </div>
      </div>

      {/* ── Pages ── */}
      <div style={{ paddingBottom:2, minHeight:"calc(100vh - 130px)", overflowY:"auto" }}>
        {active==="home"       && <HomePage     now={now} kids={kids} onPing={onPing} unreadMsgs={unreadMsgs}/>}
        {active==="attendance" && <AttendancePage userRole={userRole} toast={setToast}/>}
        {active==="carpool"    && <CarpoolPage/>}
        {active==="messages"   && <MessagesPage msgs={msgs} setMsgs={setMsgs}/>}
        {active==="more"       && <MorePage setActive={setActive} userRole={userRole} setUserRole={handleSetRole} session={session} handleLogout={handleLogout}/>}
        {active==="akbid"      && <AkbIdPage kids={kids} setActive={setActive} setToast={setToast}/>}
        {active==="schedule"   && <SchedulePage now={now}/>}
        {active==="health"     && <HealthPage kids={kids} setActive={setActive}/>}
        {active==="wallet"     && <WalletPage/>}
        {active==="noor"       && <NoorPage setActive={setActive}/>}
        {active==="receiver"   && <ReceiverPage kids={kids} setActive={setActive}/>}
        {active==="tracking"   && <TrackingPage kids={kids} setActive={setActive}/>}
      </div>

      {/* ── Bottom Nav ── */}
      <NavBar active={active} setActive={setActive} unreadMsgs={unreadMsgs}/>
    </div>
  );
}
