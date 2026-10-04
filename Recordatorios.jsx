import { useState, useEffect } from "react";
import { pushSupported, pushEnabledLocal, enablePush, disablePush } from "./firebase.js";

const C = { navy:"#0F2557", blue:"#1B3F8B", white:"#FFFFFF", mist:"#E4EBF8", ink:"#0D1B3E", slate:"#3D5080", gray:"#7A8DB0", gold:"#C8A84B", goldLight:"#FDF3D7", green:"#1E8E5A", red:"#C0392B" };

export default function RecordatoriosCard({ user }) {
  const [status, setStatus] = useState("loading");   // loading | unsupported | ios-install | off | on | denied
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (!("Notification" in window)) { setStatus(ios && !standalone ? "ios-install" : "unsupported"); return; }
    pushSupported().then(ok => {
      if (!ok) { setStatus("unsupported"); return; }
      if (Notification.permission === "denied") setStatus("denied");
      else setStatus(pushEnabledLocal() ? "on" : "off");
    });
  }, []);

  const activar = async () => {
    setBusy(true); setErr("");
    try { await enablePush(user); setStatus("on"); }
    catch (e) {
      if (e.message === "denied") setStatus("denied");
      else if (e.message === "no-vapid") setErr("Falta la clave de Firebase (archivo pushConfig.js).");
      else setErr("No se pudieron activar los recordatorios. Inténtalo de nuevo.");
    }
    setBusy(false);
  };
  const desactivar = async () => { setBusy(true); await disablePush(); setStatus("off"); setBusy(false); };

  if (status === "loading" || status === "unsupported") return null;

  const texts = {
    off: "Activa los recordatorios para leer la Biblia y mantener tu racha.",
    on: "Activados ✓ Recibirás avisos a las 8:00, 13:00 y 21:00.",
    denied: "Bloqueaste las notificaciones. Actívalas desde los ajustes del navegador o de la app.",
    "ios-install": "En iPhone, instala la app (Compartir ⬆️ → Añadir a pantalla de inicio) y ábrela desde allí para activar los recordatorios.",
  };

  return (
    <div style={{ background: C.white, border: `1px solid ${C.mist}`, borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: C.goldLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>🔔</div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 15, color: C.ink }}>Recordatorios</p>
          <p style={{ margin: 0, fontSize: 12, color: status === "on" ? C.green : C.slate, lineHeight: 1.45, fontWeight: status === "on" ? 700 : 400 }}>{texts[status]}</p>
        </div>
      </div>
      {status === "off" && (
        <button onClick={activar} disabled={busy} style={{ marginTop: 12, width: "100%", padding: 12, border: "none", borderRadius: 12, cursor: "pointer", background: C.blue, color: C.white, fontWeight: 800, fontSize: 14 }}>
          {busy ? "Activando…" : "Activar recordatorios"}
        </button>
      )}
      {status === "on" && (
        <button onClick={desactivar} disabled={busy} style={{ marginTop: 12, padding: "9px 14px", border: `1px solid ${C.mist}`, borderRadius: 12, cursor: "pointer", background: C.white, color: C.gray, fontWeight: 700, fontSize: 12 }}>
          {busy ? "Un momento…" : "Desactivar"}
        </button>
      )}
      {err && <p style={{ margin: "10px 0 0", color: C.red, fontSize: 12, fontWeight: 700 }}>{err}</p>}
    </div>
  );
}
