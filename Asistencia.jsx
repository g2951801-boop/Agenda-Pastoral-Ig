import { useState, useEffect } from "react";
import {
  dayKey, getTodayCode, generateTodayCode, getAttendanceInfo, getMyAttendance,
  checkIn, listenTodayAttendance, getRecentServices,
} from "./firebase.js";

const C = {
  navy:"#0F2557", blue:"#1B3F8B", white:"#FFFFFF", snow:"#F8FAFF", mist:"#E4EBF8", ink:"#0D1B3E",
  slate:"#3D5080", gray:"#7A8DB0", gold:"#C8A84B", goldLight:"#FDF3D7", green:"#1E8E5A", red:"#C0392B",
};
const grad = "linear-gradient(135deg,#0F2557 0%,#1B3F8B 55%,#2756C5 100%)";
const SERIF = "Georgia, 'Times New Roman', serif";

const fmtDate = key => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
};
const fmtTime = ts => new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
const weeks = n => `${n} ${n === 1 ? "semana" : "semanas"}`;

/* ───────── Tarjeta para las pantallas de inicio ───────── */
export function AsistenciaCard({ user, onOpen }) {
  const isMember = (user?.role || "member") === "member";
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (isMember && user?.id) getAttendanceInfo(user.id).then(setInfo).catch(() => {});
  }, [isMember, user?.id]);

  return (
    <div style={{ background: C.white, border: `1px solid ${C.mist}`, borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: C.goldLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>✅</div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 15, color: C.ink }}>Asistencia al servicio</p>
          <p style={{ margin: 0, fontSize: 12, color: C.slate, lineHeight: 1.45 }}>
            {isMember
              ? info && info.weekStreak > 0
                ? `📅 ${weeks(info.weekStreak)} seguidas asistiendo`
                : "Registra tu asistencia con el código del día."
              : "Genera el código del servicio y mira quién asistió."}
          </p>
        </div>
      </div>
      <button onClick={onOpen} style={{ marginTop: 12, width: "100%", padding: 12, border: "none", borderRadius: 12, cursor: "pointer", background: C.blue, color: C.white, fontWeight: 800, fontSize: 14 }}>
        {isMember ? "Registrar asistencia" : "Abrir asistencia"}
      </button>
    </div>
  );
}

/* ───────── Pantalla completa ───────── */
export default function Asistencia({ user, onBack }) {
  const isStaff = user?.role === "pastor" || user?.role === "secretary";
  return (
    <div style={{ background: C.snow, minHeight: "100vh", paddingBottom: 90 }}>
      <div style={{ background: grad, padding: "22px 16px 18px", color: C.white }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,.18)", border: "none", color: C.white, borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 700, marginBottom: 12 }}>‹ Inicio</button>
        <p style={{ margin: "0 0 2px", fontSize: 12, opacity: .7, fontWeight: 600, textTransform: "capitalize" }}>{fmtDate(dayKey())}</p>
        <h2 style={{ margin: 0, fontSize: 24, fontFamily: SERIF, fontWeight: 700 }}>Asistencia</h2>
      </div>
      {isStaff ? <StaffView user={user} /> : <MemberView user={user} />}
    </div>
  );
}

/* ── Miembro: escribe el código del día ── */
function MemberView({ user }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);   // {type, text}
  const [info, setInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const hoy = dayKey();

  const refresh = () => {
    getAttendanceInfo(user.id).then(setInfo).catch(() => {});
    getMyAttendance(user.id).then(setHistory).catch(() => {});
  };
  useEffect(() => { refresh(); }, []);

  const already = history.some(h => h.date === hoy);

  const submit = async () => {
    if (busy || code.trim().length < 4) return;
    setBusy(true); setResult(null);
    try {
      const r = await checkIn(user.id, user.name, code);
      if (!r.ok) {
        setResult(r.reason === "nocode"
          ? { type: "err", text: "Todavía no hay un código para hoy. Pídelo en la entrada." }
          : { type: "err", text: "Código incorrecto. Revisa e inténtalo de nuevo." });
      } else {
        setResult({ type: "ok", text: r.already ? "Ya habías registrado tu asistencia hoy." : "¡Gracias por venir! Tu asistencia quedó registrada.", info: r.info });
        setCode("");
        refresh();
      }
    } catch {
      setResult({ type: "err", text: "No se pudo registrar. Revisa tu conexión." });
    }
    setBusy(false);
  };

  const card = { background: C.white, border: `1px solid ${C.mist}`, borderRadius: 18, padding: 18, marginBottom: 14 };

  return (
    <div style={{ padding: 16 }}>
      <div style={card}>
        {already ? (
          <p style={{ margin: 0, color: C.green, fontWeight: 800, fontSize: 15 }}>✓ Hoy ya registraste tu asistencia</p>
        ) : (
          <>
            <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 15, color: C.ink }}>Escribe el código del servicio</p>
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric" placeholder="0000" maxLength={4}
              style={{ width: "100%", boxSizing: "border-box", textAlign: "center", fontSize: 34, letterSpacing: 12, fontWeight: 900, padding: "14px 0", borderRadius: 14, border: `1.5px solid ${C.mist}`, outline: "none", color: C.navy }} />
            <button onClick={submit} disabled={busy || code.length < 4}
              style={{ marginTop: 12, width: "100%", padding: 15, border: "none", borderRadius: 14, cursor: "pointer", background: code.length < 4 ? C.mist : grad, color: code.length < 4 ? C.gray : C.white, fontWeight: 800, fontSize: 16 }}>
              {busy ? "Registrando…" : "Registrar asistencia"}
            </button>
            <p style={{ margin: "10px 2px 0", fontSize: 11, color: C.gray }}>El código se anuncia o se muestra durante el servicio.</p>
          </>
        )}
        {result && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 12, fontWeight: 700, fontSize: 14,
            background: result.type === "ok" ? "#E8F6EF" : "#FBEAEA", color: result.type === "ok" ? C.green : C.red }}>
            {result.text}
            {result.type === "ok" && result.info && result.info.weekStreak > 0 && (
              <p style={{ margin: "6px 0 0", fontWeight: 800 }}>📅 {weeks(result.info.weekStreak)} seguidas asistiendo</p>
            )}
          </div>
        )}
      </div>

      <div style={card}>
        <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 15, color: C.ink }}>Tu constancia</p>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            ["📅", info ? info.weekStreak : 0, "semanas seguidas"],
            ["🏆", info ? info.weekBest : 0, "mejor racha"],
            ["⛪", info ? info.total : 0, "asistencias"],
          ].map(([ic, v, l]) => (
            <div key={l} style={{ flex: 1, textAlign: "center", background: C.snow, borderRadius: 14, padding: "12px 4px" }}>
              <p style={{ margin: 0, fontSize: 18 }}>{ic}</p>
              <p style={{ margin: "2px 0", fontSize: 22, fontWeight: 900, color: C.navy }}>{v}</p>
              <p style={{ margin: 0, fontSize: 10, color: C.gray, fontWeight: 600 }}>{l}</p>
            </div>
          ))}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 11, color: C.gray }}>La racha cuenta semanas seguidas con al menos una asistencia.</p>
      </div>

      {history.length > 0 && (
        <div style={card}>
          <p style={{ margin: "0 0 10px", fontWeight: 800, fontSize: 15, color: C.ink }}>Últimas asistencias</p>
          {history.map((h, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: i ? `1px solid ${C.mist}` : "none", fontSize: 13 }}>
              <span style={{ color: C.ink, fontWeight: 600, textTransform: "capitalize" }}>{fmtDate(h.date)}</span>
              <span style={{ color: C.gray }}>{h.service}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Pastor / Secretaría: genera el código y ve quién asistió ── */
function StaffView({ user }) {
  const [codeDoc, setCodeDoc] = useState(undefined);   // undefined = cargando, null = sin código
  const [list, setList] = useState([]);
  const [recent, setRecent] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getTodayCode().then(setCodeDoc).catch(() => setCodeDoc(null));
    getRecentServices().then(setRecent).catch(() => {});
    const unsub = listenTodayAttendance(setList);
    return () => unsub && unsub();
  }, []);

  const gen = async () => {
    setBusy(true); setErr("");
    try { setCodeDoc(await generateTodayCode(user.name)); }
    catch { setErr("No se pudo generar el código. Revisa tu conexión."); }
    setBusy(false);
  };

  const card = { background: C.white, border: `1px solid ${C.mist}`, borderRadius: 18, padding: 18, marginBottom: 14 };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ ...card, textAlign: "center" }}>
        <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 15, color: C.ink }}>Código de hoy</p>
        {codeDoc === undefined ? (
          <p style={{ color: C.gray, fontSize: 14 }}>Cargando…</p>
        ) : codeDoc ? (
          <>
            <p style={{ margin: "6px 0", fontSize: 56, fontWeight: 900, letterSpacing: 10, color: C.navy, fontFamily: SERIF }}>{codeDoc.code}</p>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: C.slate }}>{codeDoc.label} · anúncialo o proyéctalo en el servicio</p>
          </>
        ) : (
          <p style={{ margin: "8px 0 14px", fontSize: 14, color: C.slate, lineHeight: 1.5 }}>Aún no hay código para hoy. Genera uno y compártelo con los asistentes.</p>
        )}
        <button onClick={gen} disabled={busy || codeDoc === undefined}
          style={{ width: "100%", padding: 14, border: "none", borderRadius: 14, cursor: "pointer", background: codeDoc ? C.goldLight : grad, color: codeDoc ? "#8A6A12" : C.white, fontWeight: 800, fontSize: 15 }}>
          {busy ? "Generando…" : codeDoc ? "Cambiar código" : "Generar código de hoy"}
        </button>
        {err && <p style={{ margin: "10px 0 0", color: C.red, fontSize: 13, fontWeight: 700 }}>{err}</p>}
      </div>

      <div style={card}>
        <p style={{ margin: "0 0 10px", fontWeight: 800, fontSize: 15, color: C.ink }}>Asistentes de hoy ({list.length})</p>
        {list.length === 0 && <p style={{ margin: 0, fontSize: 13, color: C.gray }}>Todavía nadie ha registrado su asistencia.</p>}
        {list.map((a, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: i ? `1px solid ${C.mist}` : "none", fontSize: 14 }}>
            <span style={{ color: C.ink, fontWeight: 600 }}>{a.name || "Sin nombre"}</span>
            <span style={{ color: C.gray }}>{fmtTime(a.at)}</span>
          </div>
        ))}
      </div>

      {recent.length > 0 && (
        <div style={card}>
          <p style={{ margin: "0 0 10px", fontWeight: 800, fontSize: 15, color: C.ink }}>Últimos servicios</p>
          {recent.map((r, i) => (
            <div key={r.date} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: i ? `1px solid ${C.mist}` : "none", fontSize: 13 }}>
              <span style={{ color: C.ink, fontWeight: 600, textTransform: "capitalize" }}>{fmtDate(r.date)}</span>
              <span style={{ color: C.slate, fontWeight: 700 }}>{r.count} {r.count === 1 ? "persona" : "personas"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
