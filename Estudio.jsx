import { useState, useEffect, useMemo } from "react";
import { loadBible } from "./Biblia.jsx";
import {
  listenStudies, saveStudy, archiveStudy, getMyStudyProgress, markStudyDay,
  getStudyProgressAll, recordReadingDay,
} from "./firebase.js";
import { ESTUDIOS, overlaps } from "./estudios.js";

const C = {
  navy:"#0F2557", blue:"#1B3F8B", white:"#FFFFFF", snow:"#F8FAFF", mist:"#E4EBF8", ink:"#0D1B3E",
  slate:"#3D5080", gray:"#7A8DB0", gold:"#C8A84B", goldLight:"#FDF3D7", green:"#1E8E5A", red:"#C0392B",
};
const grad = "linear-gradient(135deg,#0F2557 0%,#1B3F8B 55%,#2756C5 100%)";
const SERIF = "Georgia, 'Times New Roman', serif";
const ANS_KEY = "study_ans_v1";

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const cardS = { background: C.white, border: `1px solid ${C.mist}`, borderRadius: 18, padding: 16, marginBottom: 12 };
const inputS = { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${C.mist}`, fontSize: 15, fontFamily: "inherit", outline: "none", background: C.white };
const smallBtn = (primary) => ({ padding: "10px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 13,
  border: primary ? "none" : `1px solid ${C.mist}`, background: primary ? C.blue : C.white, color: primary ? C.white : C.blue });

/* ───────── Tarjeta para las pantallas de inicio ───────── */
export function EstudioCard({ onOpen }) {
  return (
    <div style={{ ...cardS }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: C.goldLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>📚</div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 15, color: C.ink }}>Estudio bíblico</p>
          <p style={{ margin: 0, fontSize: 12, color: C.slate, lineHeight: 1.45 }}>Sigue un plan día a día y crece en la Palabra.</p>
        </div>
      </div>
      <button onClick={onOpen} style={{ marginTop: 12, width: "100%", padding: 12, border: "none", borderRadius: 12, cursor: "pointer", background: C.blue, color: C.white, fontWeight: 800, fontSize: 14 }}>
        Ver estudios
      </button>
    </div>
  );
}

const Hdr = ({ title, sub, back, backLabel = "‹ Atrás" }) => (
  <div style={{ background: grad, padding: "22px 16px 18px", color: C.white }}>
    <button onClick={back} style={{ background: "rgba(255,255,255,.18)", border: "none", color: C.white, borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 700, marginBottom: 12 }}>{backLabel}</button>
    {sub && <p style={{ margin: "0 0 2px", fontSize: 12, opacity: .7, fontWeight: 600 }}>{sub}</p>}
    <h2 style={{ margin: 0, fontSize: 23, fontFamily: SERIF, fontWeight: 700 }}>{title}</h2>
  </div>
);
const Bar = ({ done, total }) => (
  <div style={{ height: 8, borderRadius: 4, background: C.mist, overflow: "hidden" }}>
    <div style={{ width: `${total ? (done / total) * 100 : 0}%`, height: "100%", background: done === total && total ? C.green : C.blue, borderRadius: 4 }} />
  </div>
);
const Shell = ({ children, msg }) => (
  <div style={{ background: C.snow, minHeight: "100vh", paddingBottom: 90 }}>
    {children}
    {msg && <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: C.navy, color: C.white, padding: "10px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, zIndex: 300 }}>{msg}</div>}
  </div>
);


/* ───────── Pantalla completa ───────── */
export default function Estudio({ user, onBack }) {
  const isPastor = user?.role === "pastor";
  const [bible, setBible] = useState(null);
  const [custom, setCustom] = useState([]);
  const [prog, setProg] = useState({});
  const [view, setView] = useState({ v: "list" });
  const [ans, setAns] = useState(() => store.get(ANS_KEY, {}));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => { loadBible().then(setBible).catch(() => {}); }, []);
  useEffect(() => { const u = listenStudies(setCustom); return () => u && u(); }, []);
  useEffect(() => { if (user?.id) getMyStudyProgress(user.id).then(setProg).catch(() => {}); }, [user?.id]);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(""), 2200); return () => clearTimeout(t); } }, [msg]);

  const all = useMemo(() => [...ESTUDIOS, ...custom], [custom]);
  const study = view.id ? all.find(s => s.id === view.id) : null;

  const label = (d) => {
    const bk = bible && bible.books[d.b - 1];
    return `${bk ? bk.name : "?"} ${d.c}:${d.v1}${d.v2 !== d.v1 ? "-" + d.v2 : ""}`;
  };
  const passage = (d) => {
    if (!bible) return [];
    const ch = bible.books[d.b - 1]?.chapters[d.c - 1];
    return ch ? ch.slice(d.v1 - 1, d.v2).map((t, k) => ({ n: d.v1 + k, t })) : [];
  };

  /* ---------- LISTA ---------- */
  if (view.v === "list") {
    return (
      <Shell msg={msg}>
        <Hdr title="Estudio bíblico" sub="Crece día a día en la Palabra" back={onBack} backLabel="‹ Inicio" />
        <div style={{ padding: 16 }}>
          {isPastor && (
            <button onClick={() => setView({ v: "edit", study: null })}
              style={{ width: "100%", padding: 14, border: `1.5px dashed ${C.blue}`, borderRadius: 16, cursor: "pointer", background: C.white, color: C.blue, fontWeight: 800, fontSize: 14, marginBottom: 14 }}>
              ＋ Crear un estudio nuevo
            </button>
          )}
          {all.map(s => {
            const done = (prog[s.id] || []).length;
            return (
              <button key={s.id} onClick={() => setView({ v: "study", id: s.id })}
                style={{ ...cardS, display: "block", width: "100%", textAlign: "left", cursor: "pointer" }}>
                <p style={{ margin: "0 0 4px", fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: C.navy }}>{s.title}</p>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: C.slate, lineHeight: 1.45 }}>{s.description}</p>
                <Bar done={done} total={s.days.length} />
                <p style={{ margin: "6px 0 0", fontSize: 11, color: C.gray, fontWeight: 600 }}>
                  {done} de {s.days.length} días{s.builtin ? "" : ` · Creado por ${s.createdByName || "un pastor"}`}
                </p>
              </button>
            );
          })}
        </div>
      </Shell>
    );
  }

  if (!study && view.v !== "edit") { setTimeout(() => setView({ v: "list" }), 0); return <Shell msg={msg} />; }

  /* ---------- DETALLE DEL ESTUDIO ---------- */
  if (view.v === "study") {
    const done = prog[study.id] || [];
    return (
      <Shell msg={msg}>
        <Hdr title={study.title} sub={`${study.days.length} días`} back={() => { setConfirmDel(false); setView({ v: "list" }); }} backLabel="‹ Estudios" />
        <div style={{ padding: 16 }}>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: C.slate, lineHeight: 1.55 }}>{study.description}</p>
          <div style={{ marginBottom: 16 }}>
            <Bar done={done.length} total={study.days.length} />
            <p style={{ margin: "6px 0 0", fontSize: 12, color: done.length === study.days.length ? C.green : C.gray, fontWeight: 700 }}>
              {done.length === study.days.length ? "🎉 ¡Terminaste este estudio!" : `${done.length} de ${study.days.length} días completados`}
            </p>
          </div>
          {study.days.map((d, i) => (
            <button key={i} onClick={() => setView({ v: "day", id: study.id, i })}
              style={{ ...cardS, display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", cursor: "pointer", padding: 14, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 17, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14,
                background: done.includes(i) ? C.green : C.snow, color: done.includes(i) ? C.white : C.blue, border: done.includes(i) ? "none" : `1.5px solid ${C.mist}` }}>
                {done.includes(i) ? "✓" : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: C.ink }}>{d.titulo}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray }}>{label(d)}</p>
              </div>
            </button>
          ))}
          {isPastor && (
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={async () => { setView({ v: "progress", id: study.id, rows: null }); try { const rows = await getStudyProgressAll(study.id); setView({ v: "progress", id: study.id, rows }); } catch { setView({ v: "progress", id: study.id, rows: [] }); } }}
                style={smallBtn(true)}>👥 Ver avance de los miembros</button>
              {!study.builtin && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setView({ v: "edit", study })} style={{ ...smallBtn(false), flex: 1 }}>Editar</button>
                  <button onClick={async () => {
                      if (!confirmDel) { setConfirmDel(true); return; }
                      try { await archiveStudy(study.id); setConfirmDel(false); setView({ v: "list" }); setMsg("Estudio eliminado"); } catch { setMsg("No se pudo eliminar"); }
                    }}
                    style={{ ...smallBtn(false), flex: 1, color: confirmDel ? C.red : C.gray, borderColor: confirmDel ? C.red : C.mist }}>
                    {confirmDel ? "Toca otra vez para eliminar" : "Eliminar"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </Shell>
    );
  }

  /* ---------- AVANCE (solo pastores) ---------- */
  if (view.v === "progress") {
    const rows = view.rows;
    return (
      <Shell msg={msg}>
        <Hdr title="Avance de los miembros" sub={study.title} back={() => setView({ v: "study", id: study.id })} backLabel="‹ Estudio" />
        <div style={{ padding: 16 }}>
          {rows === null && <p style={{ color: C.gray, textAlign: "center" }}>Cargando…</p>}
          {rows && rows.length === 0 && <p style={{ color: C.gray, textAlign: "center", lineHeight: 1.6, padding: "24px 10px" }}>Todavía nadie ha completado días de este estudio.</p>}
          {rows && rows.length > 0 && <p style={{ margin: "0 0 12px", fontSize: 12, color: C.gray, fontWeight: 700 }}>{rows.length} {rows.length === 1 ? "participante" : "participantes"}</p>}
          {rows && rows.map((r, i) => (
            <div key={i} style={{ ...cardS, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{r.name || "Sin nombre"}</span>
                <span style={{ fontSize: 13, color: C.slate, fontWeight: 700 }}>{(r.done || []).length}/{study.days.length}</span>
              </div>
              <Bar done={(r.done || []).length} total={study.days.length} />
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  /* ---------- DÍA ---------- */
  if (view.v === "day") {
    const i = view.i, d = study.days[i];
    const done = (prog[study.id] || []).includes(i);
    const key = `${study.id}_${i}`;
    const setText = (t) => { const n = { ...ans, [key]: t }; setAns(n); store.set(ANS_KEY, n); };
    const go = (k) => setView({ v: "day", id: study.id, i: k });
    const complete = async () => {
      if (busy) return;
      setBusy(true);
      try {
        const doneArr = await markStudyDay(study.id, user.id, user.name, i, study.days.length);
        setProg(p => ({ ...p, [study.id]: doneArr }));
        if (!done) {
          try {
            const r = await recordReadingDay(user.id);
            setMsg(r.isNew ? `🔥 Racha: ${r.streak} ${r.streak === 1 ? "día" : "días"}` : "✓ Día completado");
          } catch { setMsg("✓ Día completado"); }
        } else setMsg("Respuestas guardadas");
      } catch { setMsg("No se pudo guardar. Revisa tu conexión."); }
      setBusy(false);
    };
    return (
      <Shell msg={msg}>
        <Hdr title={d.titulo} sub={`${study.title} · Día ${i + 1} de ${study.days.length}`} back={() => setView({ v: "study", id: study.id })} backLabel="‹ Estudio" />
        <div style={{ padding: 16 }}>
          <div style={cardS}>
            <p style={{ margin: "0 0 10px", fontWeight: 800, color: C.blue, fontSize: 13 }}>{label(d)} · RV1909</p>
            <div style={{ borderLeft: `4px solid ${C.gold}`, paddingLeft: 14 }}>
              {passage(d).length === 0 && <p style={{ margin: 0, color: C.gray }}>Cargando…</p>}
              {passage(d).map(p => (
                <p key={p.n} style={{ margin: "0 0 8px", fontFamily: SERIF, fontSize: 17, lineHeight: 1.6, color: C.ink }}>
                  <sup style={{ fontSize: 10, color: C.gold, fontWeight: 800, marginRight: 4, fontFamily: "system-ui,sans-serif" }}>{p.n}</sup>{p.t}
                </p>
              ))}
            </div>
          </div>
          {d.idea && (
            <div style={{ ...cardS, background: C.goldLight, borderColor: C.gold }}>
              <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 12, color: "#8A6A12" }}>PARA TENER EN CUENTA</p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: C.navy }}>{d.idea}</p>
            </div>
          )}
          {d.preguntas && d.preguntas.length > 0 && (
            <div style={cardS}>
              <p style={{ margin: "0 0 10px", fontWeight: 800, fontSize: 15, color: C.ink }}>Preguntas</p>
              {d.preguntas.map((q, k) => (
                <p key={k} style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.55, color: C.slate }}>
                  <b style={{ color: C.blue }}>{k + 1}.</b> {q}
                </p>
              ))}
              <textarea value={ans[key] || ""} onChange={e => setText(e.target.value)} rows={5}
                placeholder="Escribe tus respuestas y lo que aprendiste…" style={{ ...inputS, resize: "vertical", lineHeight: 1.5, marginTop: 6 }} />
              <p style={{ margin: "8px 2px 0", fontSize: 11, color: C.gray }}>🔒 Tus respuestas se guardan solo en este teléfono.</p>
            </div>
          )}
          <button onClick={complete} disabled={busy}
            style={{ width: "100%", padding: 16, border: "none", borderRadius: 16, cursor: "pointer", background: done ? C.blue : grad, color: C.white, fontWeight: 800, fontSize: 16, marginBottom: 12 }}>
            {busy ? "Guardando…" : done ? "✓ Completado · Guardar respuestas" : "Marcar día como completado"}
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => go(i - 1)} disabled={i === 0} style={{ ...smallBtn(false), flex: 1, padding: 13, opacity: i === 0 ? .4 : 1 }}>‹ Anterior</button>
            <button onClick={() => go(i + 1)} disabled={i === study.days.length - 1} style={{ ...smallBtn(false), flex: 1, padding: 13, opacity: i === study.days.length - 1 ? .4 : 1 }}>Siguiente ›</button>
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------- EDITOR (solo pastores) ---------- */
  if (view.v === "edit") {
    if (!isPastor) { setTimeout(() => setView({ v: "list" }), 0); return <Shell msg={msg} />; }
    if (!bible) return <Shell msg={msg}><Hdr title="Nuevo estudio" back={() => setView({ v: "list" })} backLabel="‹ Estudios" /><p style={{ padding: 24, color: C.gray, textAlign: "center" }}>Cargando la Biblia…</p></Shell>;
    return <Editor key={view.study?.id || "new"} initial={view.study} bible={bible} all={all} user={user} label={label}
      onCancel={() => setView({ v: "list" })}
      onSaved={(id) => { setMsg("Estudio guardado"); setView({ v: "study", id }); }} />;
  }
  return <Shell msg={msg} />;
}

/* ───────── Editor de estudios ───────── */
function Editor({ initial, bible, all, user, label, onCancel, onSaved }) {
  const blank = () => ({ titulo: "", b: 43, c: 1, v1: 1, v2: 1, idea: "", preguntas: "" });
  const [s, setS] = useState(() => initial
    ? { ...initial, days: initial.days.map(d => ({ ...d, preguntas: (d.preguntas || []).join("\n") })) }
    : { title: "", description: "", days: [blank()] });
  const [warn, setWarn] = useState([]);
  const [ack, setAck] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const setDay = (i, patch) => { setAck(false); setWarn([]); setS(p => ({ ...p, days: p.days.map((d, k) => k === i ? { ...d, ...patch } : d) })); };
  const dayErr = (d) => {
    const ch = bible.books[d.b - 1]?.chapters[d.c - 1];
    if (!ch) return `${bible.books[d.b - 1]?.name} solo tiene ${bible.books[d.b - 1]?.chapters.length} capítulos`;
    if (!(d.v1 >= 1 && d.v2 >= d.v1 && d.v2 <= ch.length)) return `Ese capítulo tiene ${ch.length} versículos (revisa "desde" y "hasta")`;
    return "";
  };
  const preview = (d) => {
    if (dayErr(d)) return "";
    const t = bible.books[d.b - 1].chapters[d.c - 1].slice(d.v1 - 1, d.v2).join(" ");
    return t.length > 150 ? t.slice(0, 150) + "…" : t;
  };

  const save = async () => {
    setErr("");
    if (!s.title.trim()) return setErr("Ponle un título al estudio.");
    for (let i = 0; i < s.days.length; i++) {
      if (!s.days[i].titulo.trim()) return setErr(`Falta el título del día ${i + 1}.`);
      const e = dayErr(s.days[i]);
      if (e) return setErr(`Día ${i + 1}: ${e}.`);
    }
    // Evitar pasajes repetidos
    const conflicts = [];
    const others = all.filter(x => x.id !== s.id);
    s.days.forEach((d, i) => {
      others.forEach(o => o.days.forEach((od, j) => {
        if (overlaps(d, od)) conflicts.push(`Día ${i + 1} (${label(d)}) ya está en «${o.title}», día ${j + 1}.`);
      }));
      s.days.forEach((d2, k) => { if (k > i && overlaps(d, d2)) conflicts.push(`Los días ${i + 1} y ${k + 1} repiten el mismo pasaje.`); });
    });
    if (conflicts.length && !ack) { setWarn(conflicts); setAck(true); return; }

    setSaving(true);
    try {
      const data = {
        title: s.title.trim(),
        description: (s.description || "").trim(),
        days: s.days.map(d => ({
          titulo: d.titulo.trim(), b: Number(d.b), c: Number(d.c), v1: Number(d.v1), v2: Number(d.v2),
          idea: (d.idea || "").trim(),
          preguntas: (d.preguntas || "").split("\n").map(x => x.trim()).filter(Boolean),
        })),
        createdBy: s.createdBy || user.id,
        createdByName: s.createdByName || user.name,
      };
      if (s.id) data.id = s.id;
      const id = await saveStudy(data);
      onSaved(id);
    } catch { setErr("No se pudo guardar. Revisa tu conexión."); }
    setSaving(false);
  };

  const lab = { margin: "10px 0 4px", fontSize: 11, fontWeight: 800, color: C.gray, textTransform: "uppercase" };
  return (
    <div style={{ background: C.snow, minHeight: "100vh", paddingBottom: 90 }}>
      <div style={{ background: grad, padding: "22px 16px 18px", color: C.white }}>
        <button onClick={onCancel} style={{ background: "rgba(255,255,255,.18)", border: "none", color: C.white, borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 700, marginBottom: 12 }}>‹ Cancelar</button>
        <h2 style={{ margin: 0, fontSize: 23, fontFamily: SERIF }}>{initial ? "Editar estudio" : "Nuevo estudio"}</h2>
      </div>
      <div style={{ padding: 16 }}>
        <div style={cardS}>
          <p style={{ ...lab, marginTop: 0 }}>Título</p>
          <input value={s.title} onChange={e => setS({ ...s, title: e.target.value })} placeholder="Ej: La fe de Abraham" style={inputS} />
          <p style={lab}>Descripción</p>
          <textarea value={s.description} onChange={e => setS({ ...s, description: e.target.value })} rows={2} placeholder="¿De qué trata este estudio?" style={{ ...inputS, resize: "vertical" }} />
        </div>

        {s.days.map((d, i) => {
          const e = dayErr(d), bk = bible.books[d.b - 1];
          return (
            <div key={i} style={cardS}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0, fontWeight: 800, color: C.blue, fontSize: 14 }}>Día {i + 1}</p>
                {s.days.length > 1 && <button onClick={() => { setAck(false); setWarn([]); setS(p => ({ ...p, days: p.days.filter((_, k) => k !== i) })); }} style={{ ...smallBtn(false), padding: "6px 10px", color: C.red }}>Quitar</button>}
              </div>
              <p style={lab}>Título del día</p>
              <input value={d.titulo} onChange={e2 => setDay(i, { titulo: e2.target.value })} placeholder="Ej: El llamado" style={inputS} />
              <p style={lab}>Pasaje</p>
              <select value={d.b} onChange={e2 => setDay(i, { b: Number(e2.target.value), c: 1, v1: 1, v2: 1 })} style={inputS}>
                {bible.books.map(b => <option key={b.n} value={b.n}>{b.name}</option>)}
              </select>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {[["c", "Capítulo"], ["v1", "Desde"], ["v2", "Hasta"]].map(([f, l]) => (
                  <div key={f} style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 3px", fontSize: 10, color: C.gray, fontWeight: 700 }}>{l}</p>
                    <input type="number" min="1" inputMode="numeric" value={d[f]} onChange={e2 => setDay(i, { [f]: Number(e2.target.value) })} style={inputS} />
                  </div>
                ))}
              </div>
              {e ? <p style={{ margin: "8px 0 0", fontSize: 12, color: C.red, fontWeight: 700 }}>{e}</p>
                : <p style={{ margin: "8px 0 0", fontSize: 12, color: C.slate, lineHeight: 1.5 }}><b>{label(d)}:</b> {preview(d)}</p>}
              <p style={lab}>Idea para tener en cuenta (opcional)</p>
              <textarea value={d.idea} onChange={e2 => setDay(i, { idea: e2.target.value })} rows={2} placeholder="Una breve guía sobre el pasaje" style={{ ...inputS, resize: "vertical" }} />
              <p style={lab}>Preguntas (una por línea)</p>
              <textarea value={d.preguntas} onChange={e2 => setDay(i, { preguntas: e2.target.value })} rows={3} placeholder={"¿Qué dice el pasaje?\n¿Cómo lo aplico hoy?"} style={{ ...inputS, resize: "vertical" }} />
            </div>
          );
        })}

        {s.days.length < 31 && (
          <button onClick={() => { setAck(false); setWarn([]); setS(p => ({ ...p, days: [...p.days, blank()] })); }}
            style={{ width: "100%", padding: 13, border: `1.5px dashed ${C.blue}`, borderRadius: 14, cursor: "pointer", background: C.white, color: C.blue, fontWeight: 800, fontSize: 14, marginBottom: 14 }}>
            ＋ Agregar un día
          </button>
        )}

        {warn.length > 0 && (
          <div style={{ background: C.goldLight, border: `1px solid ${C.gold}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
            <p style={{ margin: "0 0 6px", fontWeight: 800, color: "#8A6A12", fontSize: 13 }}>Pasajes repetidos</p>
            {warn.map((w, k) => <p key={k} style={{ margin: "0 0 4px", fontSize: 13, color: C.navy, lineHeight: 1.45 }}>• {w}</p>)}
            <p style={{ margin: "6px 0 0", fontSize: 12, color: C.slate }}>Puedes cambiar los pasajes o guardar de todos modos.</p>
          </div>
        )}
        {err && <p style={{ margin: "0 0 12px", color: C.red, fontWeight: 700, fontSize: 13 }}>{err}</p>}
        <button onClick={save} disabled={saving}
          style={{ width: "100%", padding: 16, border: "none", borderRadius: 16, cursor: "pointer", background: grad, color: C.white, fontWeight: 800, fontSize: 16 }}>
          {saving ? "Guardando…" : warn.length ? "Guardar de todos modos" : "Guardar estudio"}
        </button>
      </div>
    </div>
  );
}
