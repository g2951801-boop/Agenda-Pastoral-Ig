import { useState, useEffect } from "react";
import { loadBible } from "./Biblia.jsx";
import { recordReadingDay, dayKey } from "./firebase.js";
import { devocionalDeHoy } from "./devocionales.js";

const C = {
  navy:"#0F2557", blue:"#1B3F8B", white:"#FFFFFF", snow:"#F8FAFF", mist:"#E4EBF8", ink:"#0D1B3E",
  slate:"#3D5080", gray:"#7A8DB0", gold:"#C8A84B", goldLight:"#FDF3D7", green:"#1E8E5A",
};
const grad = "linear-gradient(135deg,#0F2557 0%,#1B3F8B 55%,#2756C5 100%)";
const SERIF = "Georgia, 'Times New Roman', serif";
const DIARY_KEY = "devo_diary_v1";

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const fmtDate = key => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
};
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function Devocional({ userId, onBible }) {
  const hoy = dayKey();
  const dev = devocionalDeHoy();
  const [bible, setBible] = useState(null);
  const [view, setView] = useState("today");          // today | diary
  const [diary, setDiary] = useState(() => store.get(DIARY_KEY, {}));
  const [text, setText] = useState(() => (store.get(DIARY_KEY, {})[hoy]?.text) || "");
  const [dur, setDur] = useState(180);
  const [left, setLeft] = useState(null);             // null = sin iniciar
  const [msg, setMsg] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadBible().then(setBible).catch(() => {}); }, []);
  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  useEffect(() => { if (left === 0) { try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch {} } }, [left]);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(""), 2200); return () => clearTimeout(t); } }, [msg]);

  const book = bible ? bible.books[dev.b - 1] : null;
  const label = book ? `${book.name} ${dev.c}:${dev.v[0]}${dev.v[1] !== dev.v[0] ? "-" + dev.v[1] : ""}` : "";
  let verse = book ? book.chapters[dev.c - 1].slice(dev.v[0] - 1, dev.v[1]).join(" ") : "";
  if (dev.quitar && verse.startsWith(dev.quitar)) verse = verse.slice(dev.quitar.length);

  const done = !!diary[hoy]?.done;

  const save = (nd) => { setDiary(nd); store.set(DIARY_KEY, nd); };

  const complete = async () => {
    if (saving) return;
    setSaving(true);
    const wasDone = done;
    save({ ...diary, [hoy]: { ref: label, tema: dev.tema, text: text.trim(), done: true, at: Date.now() } });
    if (!wasDone && userId) {
      try {
        const r = await recordReadingDay(userId);
        setMsg(r.isNew ? `🔥 Racha: ${r.streak} ${r.streak === 1 ? "día" : "días"}` : "Devocional completado");
      } catch { setMsg("Guardado en tu diario"); }
    } else {
      setMsg(wasDone ? "Cambios guardados" : "Guardado en tu diario");
    }
    setSaving(false);
  };

  const openChapter = () => {
    store.set("bib_pos", { b: dev.b - 1, c: dev.c - 1 });
    onBible && onBible();
  };

  const entries = Object.keys(diary).sort().reverse();

  const card = { background: C.white, border: `1px solid ${C.mist}`, borderRadius: 18, padding: 18, marginBottom: 14 };
  const step = (n, title) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <div style={{ width: 26, height: 26, borderRadius: 13, background: C.blue, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{n}</div>
      <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: C.ink }}>{title}</p>
    </div>
  );
  const tabBtn = (id, labelTxt) => (
    <button key={id} onClick={() => setView(id)}
      style={{ flex: 1, padding: "10px 4px", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 13,
        background: view === id ? C.white : "transparent", color: view === id ? C.blue : "rgba(255,255,255,.8)" }}>{labelTxt}</button>
  );

  return (
    <div style={{ background: C.snow, minHeight: "100vh", paddingBottom: 90 }}>
      <div style={{ background: grad, padding: "22px 16px 14px", color: C.white }}>
        <p style={{ margin: "0 0 2px", fontSize: 12, opacity: .7, fontWeight: 600, textTransform: "capitalize" }}>{fmtDate(hoy)}</p>
        <h2 style={{ margin: "0 0 14px", fontSize: 24, fontFamily: SERIF, fontWeight: 700 }}>Momento con Dios</h2>
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,.14)", borderRadius: 14, padding: 4 }}>
          {tabBtn("today", "Hoy")}
          {tabBtn("diary", `Mi diario${entries.length ? " (" + entries.length + ")" : ""}`)}
        </div>
      </div>

      {view === "today" && (
        <div style={{ padding: 16 }}>
          {done && (
            <div style={{ background: "#E8F6EF", border: `1px solid ${C.green}`, borderRadius: 14, padding: "10px 14px", marginBottom: 14, color: C.green, fontWeight: 800, fontSize: 14 }}>
              ✓ Ya completaste tu devocional de hoy
            </div>
          )}

          <div style={card}>
            {step(1, "Silencio")}
            <p style={{ margin: "0 0 12px", fontSize: 13, color: C.slate, lineHeight: 1.5 }}>
              Aparta el celular, respira hondo y ponte en la presencia de Dios antes de leer.
            </p>
            {left === null ? (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {[60, 180, 300].map(s => (
                    <button key={s} onClick={() => setDur(s)}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 12, cursor: "pointer", fontWeight: 800, fontSize: 14,
                        border: `1.5px solid ${dur === s ? C.blue : C.mist}`, background: dur === s ? C.blue : C.white, color: dur === s ? C.white : C.blue }}>
                      {s / 60} min
                    </button>
                  ))}
                </div>
                <button onClick={() => setLeft(dur)} style={{ width: "100%", padding: 13, border: "none", borderRadius: 12, cursor: "pointer", background: C.goldLight, color: "#8A6A12", fontWeight: 800, fontSize: 14 }}>
                  Comenzar silencio
                </button>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: "4px 0 10px", fontSize: 44, fontWeight: 900, color: left === 0 ? C.green : C.navy, fontFamily: SERIF }}>
                  {left === 0 ? "Amén 🙏" : mmss(left)}
                </p>
                <button onClick={() => setLeft(null)} style={{ padding: "10px 20px", border: `1px solid ${C.mist}`, borderRadius: 12, cursor: "pointer", background: C.white, color: C.blue, fontWeight: 700, fontSize: 13 }}>
                  {left === 0 ? "Listo" : "Terminar antes"}
                </button>
              </div>
            )}
          </div>

          <div style={card}>
            {step(2, "La Palabra")}
            <div style={{ borderLeft: `4px solid ${C.gold}`, paddingLeft: 14 }}>
              {verse ? (
                <>
                  <p style={{ margin: "0 0 8px", fontFamily: SERIF, fontSize: 19, lineHeight: 1.6, color: C.ink }}>{verse}</p>
                  <p style={{ margin: 0, fontWeight: 800, color: C.blue, fontSize: 13 }}>{label} · RV1909</p>
                </>
              ) : (
                <p style={{ margin: 0, color: C.gray, fontSize: 14 }}>Cargando…</p>
              )}
            </div>
            <button onClick={openChapter} style={{ marginTop: 14, padding: "10px 14px", border: `1px solid ${C.mist}`, borderRadius: 12, cursor: "pointer", background: C.white, color: C.blue, fontWeight: 700, fontSize: 13 }}>
              Leer el capítulo completo
            </button>
          </div>

          <div style={card}>
            {step(3, dev.tema)}
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: C.slate }}>{dev.reflexion}</p>
          </div>

          <div style={card}>
            {step(4, "Oración y diario")}
            <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 14, color: C.ink, lineHeight: 1.5 }}>{dev.pregunta}</p>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
              placeholder="Escribe tu oración o lo que Dios te habló hoy…"
              style={{ width: "100%", boxSizing: "border-box", padding: 14, borderRadius: 14, border: `1.5px solid ${C.mist}`, fontSize: 15, lineHeight: 1.5, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
            <p style={{ margin: "8px 2px 0", fontSize: 11, color: C.gray }}>🔒 Tu diario se guarda solo en este teléfono.</p>
          </div>

          <button onClick={complete} disabled={saving}
            style={{ width: "100%", padding: 16, border: "none", borderRadius: 16, cursor: "pointer", background: done ? C.blue : grad, color: C.white, fontWeight: 800, fontSize: 16 }}>
            {done ? "Guardar cambios" : "Terminé mi devocional"}
          </button>
        </div>
      )}

      {view === "diary" && (
        <div style={{ padding: 16 }}>
          {entries.length === 0 && (
            <p style={{ textAlign: "center", color: C.gray, fontSize: 14, lineHeight: 1.6, padding: "30px 10px" }}>
              Tu diario está vacío.<br />Completa tu primer devocional y aparecerá aquí.
            </p>
          )}
          {entries.map(k => {
            const e = diary[k];
            return (
              <div key={k} style={card}>
                <p style={{ margin: "0 0 2px", fontSize: 12, color: C.gray, fontWeight: 700, textTransform: "capitalize" }}>{fmtDate(k)}</p>
                <p style={{ margin: "0 0 8px", fontWeight: 800, color: C.blue, fontSize: 14 }}>{e.tema ? e.tema + " · " : ""}{e.ref}</p>
                <p style={{ margin: "0 0 10px", fontSize: 15, lineHeight: 1.6, color: e.text ? C.ink : C.gray, whiteSpace: "pre-wrap" }}>
                  {e.text || "Sin notas ese día."}
                </p>
                <button
                  onClick={() => {
                    if (confirmDel === k) { const nd = { ...diary }; delete nd[k]; save(nd); setConfirmDel(null); if (k === hoy) setText(""); }
                    else setConfirmDel(k);
                  }}
                  style={{ padding: "8px 12px", border: `1px solid ${confirmDel === k ? "#C0392B" : C.mist}`, borderRadius: 10, cursor: "pointer", background: C.white, color: confirmDel === k ? "#C0392B" : C.gray, fontWeight: 700, fontSize: 12 }}>
                  {confirmDel === k ? "Toca otra vez para borrar" : "Borrar"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {msg && (
        <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: C.navy, color: C.white, padding: "10px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, zIndex: 300 }}>{msg}</div>
      )}
    </div>
  );
}
