import { useEffect, useState } from "react";
import { getReadingStreak } from "./firebase.js";

const C = {
  navy:"#0F2557", blue:"#1B3F8B", white:"#FFFFFF", mist:"#E4EBF8", ink:"#0D1B3E",
  slate:"#3D5080", gray:"#7A8DB0", gold:"#C8A84B", goldLight:"#FDF3D7",
};
const BADGES = [
  { n: 7,   name: "Constante" },
  { n: 30,  name: "Fiel" },
  { n: 100, name: "Firme" },
];

export default function RachaCard({ userId, onRead }) {
  const [s, setS] = useState(null);
  useEffect(() => {
    if (!userId) return;
    getReadingStreak(userId).then(setS).catch(() => {});
  }, [userId]);
  if (!s) return null;

  const next = BADGES.find(b => s.best < b.n);
  const line = s.readToday
    ? "Hoy ya leíste. Vuelve mañana para seguir sumando."
    : s.streak > 0
      ? "Lee un capítulo hoy para mantener tu racha."
      : "Lee un capítulo hoy y empieza tu racha.";

  return (
    <div style={{background:C.white,border:`1px solid ${C.mist}`,borderRadius:18,padding:16}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:64,height:64,borderRadius:18,background:C.goldLight,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontSize:20,lineHeight:1}}>🔥</span>
          <span style={{fontSize:22,fontWeight:900,color:C.navy,lineHeight:1.1}}>{s.streak}</span>
        </div>
        <div style={{flex:1}}>
          <p style={{margin:"0 0 3px",fontWeight:800,fontSize:15,color:C.ink}}>
            {s.streak === 1 ? "1 día" : `${s.streak} días`} leyendo la Biblia
          </p>
          <p style={{margin:0,fontSize:12,color:C.slate,lineHeight:1.45}}>{line}</p>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:14}}>
        {BADGES.map(b => {
          const on = s.best >= b.n;
          return (
            <div key={b.n} style={{flex:1,textAlign:"center",padding:"8px 4px",borderRadius:12,
              background:on?C.goldLight:"#F4F6FB",border:`1px solid ${on?C.gold:C.mist}`,opacity:on?1:.7}}>
              <p style={{margin:0,fontSize:13,fontWeight:800,color:on?"#8A6A12":C.gray}}>{b.n} días</p>
              <p style={{margin:0,fontSize:11,color:on?"#8A6A12":C.gray}}>{b.name}</p>
            </div>
          );
        })}
      </div>
      <p style={{margin:"10px 0 0",fontSize:11,color:C.gray}}>
        Mejor racha: {s.best} · Días leídos: {s.total}{next ? ` · Siguiente insignia en ${Math.max(next.n - s.streak, 0)} días` : ""}
      </p>
      {onRead && !s.readToday && (
        <button onClick={onRead} style={{marginTop:12,width:"100%",padding:"12px",border:"none",borderRadius:12,cursor:"pointer",
          background:C.blue,color:C.white,fontWeight:800,fontSize:14}}>Ir a la Biblia</button>
      )}
    </div>
  );
}
