// Activa o quita al personal (pastores y secretaría) de Mi Casa de Avivamiento.
// Se lanza desde GitHub → Actions → "Activar personal". Solo el dueño del repositorio puede hacerlo.
import admin from "firebase-admin";

const fail = (msg) => { console.error("✗ " + msg); process.exit(1); };

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) fail("Falta el secreto FIREBASE_SERVICE_ACCOUNT.");
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
const db = admin.firestore();

const uid = (process.env.PERSONAL_UID || "").trim();
const entrada = (process.env.PERSONAL_ROLE || "").trim();      // pastor | secretaria | quitar
const pastor = (process.env.PERSONAL_PASTOR || "").trim();     // jcg | kg | ninguno
const role = entrada === "secretaria" ? "secretary" : entrada;
const mask = (e = "") => e.replace(/^(.).*(@.*)$/, "$1***$2");  // no mostramos correos completos: este registro es público

if (!uid) fail("Falta el UID de la cuenta.");
if (!["pastor", "secretary", "quitar"].includes(role)) fail("Rol no válido.");

let user;
try { user = await admin.auth().getUser(uid); }
catch { fail("No existe ninguna cuenta con ese UID. Revisa que lo copiaste completo."); }

const ref = db.collection("staff").doc(uid);

if (role === "quitar") {
  await ref.delete();
  console.log(`✓ Listo: ${mask(user.email)} ya no tiene permisos de personal.`);
  process.exit(0);
}

if (!user.emailVerified) fail("Esa cuenta todavía no verificó su correo. Debe abrir el enlace que recibió y volver a intentarlo.");

if (role === "pastor") {
  if (!["jcg", "kg"].includes(pastor)) fail('Para un pastor elige "jcg" (Jean Carlos) o "kg" (Katherine).');
  const dup = await db.collection("staff").where("pastorId", "==", pastor).get();
  if (dup.docs.some((d) => d.id !== uid)) fail(`Ya hay otra cuenta activa como "${pastor}". Quítala primero con el rol "quitar".`);
}
if (role === "secretary") {
  const dup = await db.collection("staff").where("role", "==", "secretary").get();
  if (dup.docs.some((d) => d.id !== uid)) fail('Ya hay otra cuenta activa como secretaría. Quítala primero con el rol "quitar".');
}

await ref.set({
  role,
  pastorId: role === "pastor" ? pastor : null,
  email: user.email || "",
  name: user.displayName || "",
  active: true,
  updatedAt: Date.now(),
});
console.log(`✓ Listo: ${mask(user.email)} activado como ${role}${role === "pastor" ? " (" + pastor + ")" : ""}.`);
