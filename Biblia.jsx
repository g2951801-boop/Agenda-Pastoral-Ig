import { useState, useEffect, useMemo } from "react";
import { getReadingStreak, recordReadingDay } from "./firebase.js";

/* Colores iguales a los de App.jsx */
const C = {
  navy:"#0F2557", blue:"#1B3F8B", blueMid:"#2756C5", blueFrost:"#EBF1FB", blueMist:"#F0F5FF",
  white:"#FFFFFF", snow:"#F8FAFF", mist:"#E4EBF8", ink:"#0D1B3E", slate:"#3D5080",
  gray:"#7A8DB0", gold:"#C8A84B", goldLight:"#FDF3D7",
};
const grad = "linear-gradient(135deg,#0F2557 0%,#1B3F8B 55%,#2756C5 100%)";
const SERIF = "Georgia, 'Times New Roman', serif";

/* La Biblia se descarga una sola vez y queda en memoria */
let _cache = null;
async function loadBible() {
  if (_cache) return _cache;
  const r = await fetch("/rv1909.json");
  if (!r.ok) throw new Error("No se pudo cargar la Biblia");
  _cache = await r.json();
  return _cache;
}

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function Biblia({ userId }) {
  const [bible, setBible] = useState(null);
  const [error, setError] = useState(false);
  const [view, setView] = useState("books");           // books | chapters | read | search | favs
  const [bi, setBi] = useState(() => store.get("bib_pos", {b:42,c:0}).b);
  const [ci, setCi] = useState(() => store.get("bib_pos", {b:42,c:0}).c);
  const [fontSize, setFontSize] = useState(() => store.get("bib_font", 18));
  const [favs, setFavs] = useState(() => store.get("bib_favs", []));
  const [sel, setSel] = useState(null);                // versículo seleccionado (índice)
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [streak, setStreak] = useState(null);

  useEffect(() => { loadBible().then(setBible).catch(() => setError(true)); }, []);
  useEffect(() => { store.set("bib_pos", {b:bi, c:ci}); }, [bi, ci]);
  useEffect(() => { store.set("bib_font", fontSize); }, [fontSize]);
  useEffect(() => { store.set("bib_favs", favs); }, [favs]);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(""), 1800); return () => clearTimeout(t); } }, [msg]);

  useEffect(() => { if (userId) getReadingStreak(userId).then(setStreak).catch(() => {}); }, [userId]);

  /* Cuenta el día de lectura cuando el lector llega al final del capítulo (y estuvo al menos 6 s) */
  useEffect(() => {
    if (view !== "read" || !userId || !bible || (streak && streak.readToday)) return;
    const el = document.getElementById("bib-end");
    if (!el) return;
    let seen = false, waited = false, done = false;
    const finish = async () => {
      if (done || !seen || !waited) return;
      done = true;
      try {
        const r = await recordReadingDay(userId);
        setStreak(r);
        if (r.isNew) {
          const badge = [100, 30, 7].find(n => r.streak === n);
          setMsg(badge ? `¡${badge} días seguidos!` : `🔥 Racha: ${r.streak} ${r.streak === 1 ? "día" : "días"}`);
        }
      } catch {}
    };
    const t = setTimeout(() => { waited = true; finish(); }, 6000);
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { seen = true; finish(); } }, { threshold: 1 });
    io.observe(el);
    return () => { clearTimeout(t); io.disconnect(); };
  }, [view, bi, ci, userId, bible, streak && streak.readToday]);

  const results = useMemo(() => {
    if (!bible || q.trim().length < 3) return [];
    const nq = norm(q.trim());
    const out = [];
    for (const b of bible.books) {
      for (let c = 0; c < b.chapters.length; c++) {
        const ch = b.chapters[c];
        for (let v = 0; v < ch.length; v++) {
          if (norm(ch[v]).includes(nq)) {
            out.push({b:b.n-1, c, v, text:ch[v]});
            if (out.length >= 60) return out;
          }
        }
      }
    }
    return out;
  }, [bible, q]);

  if (error) return <Shell><p style={{padding:24,color:C.slate,textAlign:"center"}}>No se pudo cargar la Biblia. Revisa tu conexión e inténtalo de nuevo.</p></Shell>;
  if (!bible) return <Shell><p style={{padding:24,color:C.gray,textAlign:"center"}}>Cargando la Biblia…</p></Shell>;

  const book = bible.books[bi];
  const chapter = book.chapters[ci];
  const ref = (b, c, v) => `${bible.books[b].name} ${c+1}:${v+1}`;
  const isFav = (b, c, v) => favs.some(f => f.b===b && f.c===c && f.v===v);

  const toggleFav = (b, c, v) => {
    if (isFav(b, c, v)) setFavs(favs.filter(f => !(f.b===b && f.c===c && f.v===v)));
    else setFavs([{b, c, v}, ...favs]);
  };
  const copyVerse = async (b, c, v, text) => {
    const t = `"${text}" — ${ref(b, c, v)} (RV1909)`;
    try { await navigator.clipboard.writeText(t); setMsg("Versículo copiado"); } catch { setMsg("No se pudo copiar"); }
  };
  const share = async (b, c, v, text) => {
    const t = `"${text}" — ${ref(b, c, v)} (RV1909)`;
    if (navigator.share) { try { await navigator.share({ text: t }); } catch {} }
    else copyVerse(b, c, v, text);
  };
  const goRead = (b, c) => { setBi(b); setCi(c); setSel(null); setView("read"); window.scrollTo(0, 0); };
  const prev = () => { if (ci > 0) goRead(bi, ci-1); else if (bi > 0) goRead(bi-1, bible.books[bi-1].chapters.length-1); };
  const next = () => { if (ci < book.chapters.length-1) goRead(bi, ci+1); else if (bi < 65) goRead(bi+1, 0); };

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setView(id)}
      style={{flex:1,padding:"10px 4px",border:"none",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:13,
        background:view===id?C.white:"transparent",color:view===id?C.blue:"rgba(255,255,255,.8)"}}>{label}</button>
  );

  const header = (
    <div style={{background:grad,padding:"22px 16px 14px",color:C.white}}>
      <p style={{margin:"0 0 2px",fontSize:12,opacity:.7,fontWeight:600}}>Reina Valera 1909</p>
      <h2 style={{margin:"0 0 14px",fontSize:24,fontFamily:SERIF,fontWeight:700}}>La Santa Biblia</h2>
      {streak && streak.streak > 0 && (
        <p style={{margin:"-6px 0 12px",fontSize:13,fontWeight:700,color:C.gold}}>🔥 {streak.streak} {streak.streak === 1 ? "día" : "días"} seguidos leyendo</p>
      )}
      <div style={{display:"flex",gap:4,background:"rgba(255,255,255,.14)",borderRadius:14,padding:4}}>
        {tabBtn("books", "Libros")}
        {tabBtn("search", "Buscar")}
        {tabBtn("favs", `Guardados${favs.length ? " ("+favs.length+")" : ""}`)}
      </div>
    </div>
  );

  /* ---------- LECTURA ---------- */
  if (view === "read") {
    return (
      <Shell>
        <div style={{background:grad,padding:"14px 16px",color:C.white,display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:10}}>
          <button onClick={() => setView("chapters")} style={{background:"rgba(255,255,255,.18)",border:"none",color:C.white,borderRadius:10,padding:"8px 12px",cursor:"pointer",fontWeight:700}}>‹ Capítulos</button>
          <div style={{flex:1,textAlign:"center",fontFamily:SERIF,fontWeight:700,fontSize:17}}>{book.name} {ci+1}</div>
          <button onClick={() => setFontSize(s => Math.max(14, s-2))} aria-label="Letra más pequeña" style={fontBtn}>A−</button>
          <button onClick={() => setFontSize(s => Math.min(30, s+2))} aria-label="Letra más grande" style={fontBtn}>A+</button>
        </div>
        <div style={{padding:"20px 18px 24px",background:C.white}}>
          {chapter.map((t, v) => {
            const active = sel === v;
            const fav = isFav(bi, ci, v);
            return (
              <div key={v}>
                <p onClick={() => setSel(active ? null : v)}
                  style={{margin:"0 0 12px",fontFamily:SERIF,fontSize,lineHeight:1.65,color:C.ink,cursor:"pointer",
                    background:active?C.goldLight:fav?C.blueMist:"transparent",borderRadius:8,padding:"2px 6px",marginLeft:-6,marginRight:-6}}>
                  <sup style={{fontSize:Math.round(fontSize*.6),color:C.gold,fontWeight:800,marginRight:5,fontFamily:"system-ui,sans-serif"}}>{v+1}</sup>{t}
                </p>
                {active && (
                  <div style={{display:"flex",gap:8,margin:"-4px 0 14px"}}>
                    <button onClick={() => toggleFav(bi, ci, v)} style={actBtn(fav)}>{fav ? "★ Guardado" : "☆ Guardar"}</button>
                    <button onClick={() => copyVerse(bi, ci, v, t)} style={actBtn(false)}>Copiar</button>
                    <button onClick={() => share(bi, ci, v, t)} style={actBtn(false)}>Compartir</button>
                  </div>
                )}
              </div>
            );
          })}
          <div id="bib-end" style={{height:1}}/>
        </div>
        <div style={{display:"flex",gap:10,padding:"4px 16px 24px"}}>
          <button onClick={prev} disabled={bi===0 && ci===0} style={navBtn(bi===0 && ci===0)}>‹ Anterior</button>
          <button onClick={next} disabled={bi===65 && ci===book.chapters.length-1} style={navBtn(bi===65 && ci===book.chapters.length-1)}>Siguiente ›</button>
        </div>
        {msg && <Toast text={msg}/>}
      </Shell>
    );
  }

  /* ---------- CAPÍTULOS ---------- */
  if (view === "chapters") {
    return (
      <Shell>
        <div style={{background:grad,padding:"18px 16px",color:C.white,display:"flex",alignItems:"center",gap:10}}>
          <button onClick={() => setView("books")} style={{background:"rgba(255,255,255,.18)",border:"none",color:C.white,borderRadius:10,padding:"8px 12px",cursor:"pointer",fontWeight:700}}>‹ Libros</button>
          <h2 style={{margin:0,fontFamily:SERIF,fontSize:22}}>{book.name}</h2>
        </div>
        <div style={{padding:16,display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
          {book.chapters.map((_, c) => (
            <button key={c} onClick={() => goRead(bi, c)}
              style={{aspectRatio:"1",border:`1px solid ${C.mist}`,background:c===ci?C.blue:C.white,color:c===ci?C.white:C.ink,
                borderRadius:14,fontSize:16,fontWeight:700,cursor:"pointer"}}>{c+1}</button>
          ))}
        </div>
      </Shell>
    );
  }

  /* ---------- BUSCAR ---------- */
  if (view === "search") {
    return (
      <Shell>
        {header}
        <div style={{padding:16}}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Busca una palabra o frase (mín. 3 letras)"
            style={{width:"100%",boxSizing:"border-box",padding:"14px 16px",borderRadius:14,border:`1.5px solid ${C.mist}`,fontSize:15,outline:"none"}}/>
          {q.trim().length >= 3 && (
            <p style={{fontSize:12,color:C.gray,margin:"12px 2px"}}>
              {results.length === 0 ? "Sin resultados. Prueba con otra palabra." : results.length >= 60 ? "Mostrando los primeros 60 resultados" : `${results.length} resultado${results.length===1?"":"s"}`}
            </p>
          )}
          {results.map((r, i) => (
            <button key={i} onClick={() => goRead(r.b, r.c)}
              style={{display:"block",width:"100%",textAlign:"left",background:C.white,border:`1px solid ${C.mist}`,borderRadius:14,padding:14,marginBottom:10,cursor:"pointer"}}>
              <p style={{margin:"0 0 4px",fontWeight:800,color:C.blue,fontSize:13}}>{ref(r.b, r.c, r.v)}</p>
              <p style={{margin:0,fontFamily:SERIF,fontSize:15,lineHeight:1.5,color:C.ink}}>{r.text}</p>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  /* ---------- GUARDADOS ---------- */
  if (view === "favs") {
    return (
      <Shell>
        {header}
        <div style={{padding:16}}>
          {favs.length === 0 && (
            <p style={{textAlign:"center",color:C.gray,fontSize:14,lineHeight:1.6,padding:"30px 10px"}}>
              Aún no has guardado versículos.<br/>Toca un versículo mientras lees y elige <b>Guardar</b>.
            </p>
          )}
          {favs.map((f, i) => {
            const t = bible.books[f.b].chapters[f.c][f.v];
            return (
              <div key={i} style={{background:C.white,border:`1px solid ${C.mist}`,borderRadius:14,padding:14,marginBottom:10}}>
                <p style={{margin:"0 0 6px",fontWeight:800,color:C.blue,fontSize:13}}>{ref(f.b, f.c, f.v)}</p>
                <p style={{margin:"0 0 10px",fontFamily:SERIF,fontSize:16,lineHeight:1.55,color:C.ink}}>{t}</p>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={() => goRead(f.b, f.c)} style={actBtn(false)}>Leer capítulo</button>
                  <button onClick={() => share(f.b, f.c, f.v, t)} style={actBtn(false)}>Compartir</button>
                  <button onClick={() => toggleFav(f.b, f.c, f.v)} style={actBtn(false)}>Quitar</button>
                </div>
              </div>
            );
          })}
        </div>
        {msg && <Toast text={msg}/>}
      </Shell>
    );
  }

  /* ---------- LIBROS ---------- */
  const bookRow = b => (
    <button key={b.n} onClick={() => { setBi(b.n-1); setCi(0); setView("chapters"); }}
      style={{background:C.white,border:`1px solid ${C.mist}`,borderRadius:14,padding:"14px 12px",cursor:"pointer",textAlign:"left",
        fontFamily:SERIF,fontSize:15,color:C.ink,fontWeight:600}}>{b.name}</button>
  );
  return (
    <Shell>
      {header}
      <div style={{padding:16}}>
        <button onClick={() => setView("read")}
          style={{width:"100%",background:C.goldLight,border:`1px solid ${C.gold}`,borderRadius:14,padding:14,marginBottom:18,cursor:"pointer",textAlign:"left"}}>
          <p style={{margin:"0 0 2px",fontSize:12,color:"#8A6A12",fontWeight:700}}>Continuar leyendo</p>
          <p style={{margin:0,fontFamily:SERIF,fontSize:18,color:C.navy,fontWeight:700}}>{book.name} {ci+1}</p>
        </button>
        <p style={{margin:"0 0 10px",fontWeight:800,color:C.slate,fontSize:14}}>Antiguo Testamento</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:22}}>{bible.books.slice(0, 39).map(bookRow)}</div>
        <p style={{margin:"0 0 10px",fontWeight:800,color:C.slate,fontSize:14}}>Nuevo Testamento</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{bible.books.slice(39).map(bookRow)}</div>
      </div>
    </Shell>
  );
}

/* ---------- auxiliares ---------- */
function Shell({ children }) {
  // paddingBottom deja espacio para la barra inferior de la app
  return <div style={{background:C.snow,minHeight:"100vh",paddingBottom:90}}>{children}</div>;
}
function Toast({ text }) {
  return (
    <div style={{position:"fixed",bottom:100,left:"50%",transform:"translateX(-50%)",background:C.navy,color:C.white,
      padding:"10px 18px",borderRadius:20,fontSize:13,fontWeight:700,zIndex:300}}>{text}</div>
  );
}
const fontBtn = {background:"rgba(255,255,255,.18)",border:"none",color:"#fff",borderRadius:10,padding:"8px 10px",cursor:"pointer",fontWeight:800,fontSize:13};
const actBtn = on => ({flex:1,padding:"9px 6px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:12,
  border:`1px solid ${on ? C.gold : C.mist}`,background:on ? C.goldLight : C.white,color:on ? "#8A6A12" : C.blue});
const navBtn = off => ({flex:1,padding:"14px",borderRadius:14,border:"none",cursor:off?"default":"pointer",fontWeight:800,fontSize:14,
  background:off ? C.mist : C.blue,color:off ? C.gray : C.white});
