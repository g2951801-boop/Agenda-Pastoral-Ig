import { useState, useEffect } from "react";

const KEY = "pwa_banner_hidden_at";
const DAYS = 7;

export default function InstallBanner() {
  const [evt, setEvt] = useState(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (standalone) return;
    try {
      const t = Number(localStorage.getItem(KEY) || 0);
      if (t && Date.now() - t < DAYS * 86400000) return;
    } catch {}
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) { setIos(true); setShow(true); return; }
    const h = (e) => { e.preventDefault(); setEvt(e); setShow(true); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const hide = () => { setShow(false); try { localStorage.setItem(KEY, String(Date.now())); } catch {} };
  const install = async () => {
    if (!evt) return;
    evt.prompt();
    try { await evt.userChoice; } catch {}
    setEvt(null); setShow(false);
  };

  if (!show) return null;
  return (
    <div style={{ position: "fixed", left: 12, right: 12, bottom: 88, zIndex: 250, background: "#fff", border: "1px solid #E4EBF8",
      borderRadius: 18, padding: 14, boxShadow: "0 8px 30px rgba(15,37,87,.22)", display: "flex", alignItems: "center", gap: 12 }}>
      <img src="/icon-192.png" alt="" width="44" height="44" style={{ borderRadius: 12, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 14, color: "#0D1B3E" }}>Instala Mi Casa de Avivamiento</p>
        <p style={{ margin: 0, fontSize: 12, color: "#3D5080", lineHeight: 1.4 }}>
          {ios ? "Toca Compartir ⬆️ y luego «Añadir a pantalla de inicio»." : "Ábrela como una app, directo desde tu pantalla de inicio."}
        </p>
      </div>
      {!ios && (
        <button onClick={install} style={{ padding: "10px 14px", border: "none", borderRadius: 12, cursor: "pointer", background: "#1B3F8B", color: "#fff", fontWeight: 800, fontSize: 13 }}>Instalar</button>
      )}
      <button onClick={hide} aria-label="Cerrar" style={{ border: "none", background: "transparent", color: "#7A8DB0", fontSize: 18, cursor: "pointer", padding: 4 }}>✕</button>
    </div>
  );
}
