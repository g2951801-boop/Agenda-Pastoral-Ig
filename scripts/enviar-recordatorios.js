// Envía los recordatorios push de Mi Casa de Avivamiento.
// Se ejecuta desde GitHub Actions a las 8:00, 13:00 y 21:00 (hora de Madrid).
import admin from "firebase-admin";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) { console.error("Falta el secreto FIREBASE_SERVICE_ACCOUNT"); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
const db = admin.firestore();

const now = new Date();
const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hour12: false }).format(now)) % 24;
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(now);   // AAAA-MM-DD
const y = new Date(today + "T12:00:00Z"); y.setUTCDate(y.getUTCDate() - 1);
const yesterday = y.toISOString().slice(0, 10);

const f = process.env.FORCE_SLOT;
const forced = f && f !== "auto" ? f : "";
const slot = forced || { 8: "morning", 13: "midday", 21: "night" }[hour];
if (!slot) { console.log(`Son las ${hour}:xx en Madrid: no toca enviar.`); process.exit(0); }

const logRef = db.collection("pushLog").doc(`${today}_${slot}`);
if (!forced && (await logRef.get()).exists) { console.log(`Ya se envió "${slot}" hoy.`); process.exit(0); }

const tokSnap = await db.collection("pushTokens").get();
const tokens = tokSnap.docs.filter(d => d.data().active !== false).map(d => ({ token: d.id, uid: d.data().uid }));
console.log(`Momento: ${slot} · dispositivos activos: ${tokens.length}${forced ? " · MODO PRUEBA" : ""}`);

const uids = [...new Set(tokens.map(t => t.uid).filter(Boolean))];
const prog = {};
if (uids.length) {
  const docs = await db.getAll(...uids.map(u => db.collection("progress").doc(u)));
  docs.forEach(d => { prog[d.id] = d.exists ? d.data() : {}; });
}

const messages = [];
for (const t of tokens) {
  const p = prog[t.uid] || {};
  const readToday = p.lastDay === today;
  if (!forced && slot !== "morning" && readToday) continue;              // ya leyó hoy: no insistimos
  const alive = p.lastDay === today || p.lastDay === yesterday;
  const streak = alive ? (p.streak || 0) : 0;
  let title, body;
  if (slot === "morning") {
    title = "Buenos días 🙏";
    body = "Empieza tu día con un momento con Dios. Tu devocional de hoy te espera.";
  } else if (slot === "midday") {
    title = "Haz una pausa 📖";
    body = "Lee un capítulo de la Biblia y mantén tu racha.";
  } else {
    title = "Antes de dormir 🌙";
    body = streak > 0 ? `Tu racha de ${streak} ${streak === 1 ? "día" : "días"} te espera. Lee un capítulo hoy 🔥` : "Cierra el día en la Palabra: lee un capítulo hoy.";
  }
  messages.push({ token: t.token, data: { title, body, url: "/" }, webpush: { headers: { Urgency: "normal", TTL: "43200" } } });
}

let sent = 0, failed = 0;
for (let i = 0; i < messages.length; i += 500) {
  const batch = messages.slice(i, i + 500);
  const res = await admin.messaging().sendEach(batch);
  for (let k = 0; k < res.responses.length; k++) {
    const r = res.responses[k];
    if (r.success) { sent++; continue; }
    failed++;
    const code = r.error && r.error.code;
    console.log("Error:", code);
    if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
      await db.collection("pushTokens").doc(batch[k].token).delete().catch(() => {});
    }
  }
}
console.log(`Enviados: ${sent} · fallidos: ${failed} · omitidos (ya leyeron): ${tokens.length - messages.length}`);
if (!forced) await logRef.set({ slot, today, sent, failed, at: Date.now() });
