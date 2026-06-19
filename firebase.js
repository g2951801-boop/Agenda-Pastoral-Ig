import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCrRw94YzDGmcJ-c444mVxIsZ3UU9lrfcc",
  authDomain: "casa-avivamiento-nueva-v-b30ce.firebaseapp.com",
  projectId: "casa-avivamiento-nueva-v-b30ce",
  storageBucket: "casa-avivamiento-nueva-v-b30ce.firebasestorage.app",
  messagingSenderId: "167127050362",
  appId: "1:167127050362:web:536f8edfd8ae8187f1f3c3",
  measurementId: "G-HWXP0HMGRP",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ── AUTENTICACIÓN ──────────────────────────────────────────────────────

export async function registerUser({ name, email, password, phone, nie, role, pastorId }) {
  // Bloquear cuentas duplicadas de pastor o secretario
  if (role === "pastor" && pastorId) {
    const q = query(collection(db, "users"), where("role","==","pastor"), where("pastorId","==",pastorId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const err = new Error("ROLE_TAKEN");
      err.code = "ROLE_TAKEN";
      throw err;
    }
  }
  if (role === "secretary") {
    const q = query(collection(db, "users"), where("role","==","secretary"));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const err = new Error("ROLE_TAKEN");
      err.code = "ROLE_TAKEN";
      throw err;
    }
  }

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await sendEmailVerification(cred.user, { url: window.location.origin });
  await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid,
    name,
    email,
    phone: phone || "",
    nie: nie || "",
    role: role || "member",
    pastorId: pastorId || null,
    createdAt: Date.now(),
  });
  return cred.user;
}

export async function loginUser({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  if (!cred.user.emailVerified) {
    const err = new Error("EMAIL_NOT_VERIFIED");
    err.code = "EMAIL_NOT_VERIFIED";
    err.user = cred.user;
    throw err;
  }
  const userDoc = await getDoc(doc(db, "users", cred.user.uid));
  if (!userDoc.exists()) throw new Error("No se encontraron los datos del usuario.");
  return { id: cred.user.uid, ...userDoc.data() };
}

export async function resendVerificationEmail(user) {
  await sendEmailVerification(user, { url: window.location.origin });
}

export async function logoutUser() {
  await firebaseSignOut(auth);
}

/**
 * Escucha cambios de sesión (login/logout) y persiste automáticamente
 * entre recargas de página. Firebase Auth ya guarda la sesión en el
 * almacenamiento local del navegador — esta función solo nos avisa
 * cuando esa sesión ya existente se restaura.
 */
export function listenAuthState(callback) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) { callback(null); return; }
    if (!fbUser.emailVerified) { callback(null); return; }
    try {
      const userDoc = await getDoc(doc(db, "users", fbUser.uid));
      if (userDoc.exists()) {
        callback({ id: fbUser.uid, ...userDoc.data() });
      } else {
        callback(null);
      }
    } catch (e) {
      callback(null);
    }
  });
}

// ── FIRESTORE — Citas ──────────────────────────────────────────────────

export async function createAppointment(apt) {
  const ref = await addDoc(collection(db, "appointments"), apt);
  return { id: ref.id, ...apt };
}

export async function updateAppointment(id, data) {
  await updateDoc(doc(db, "appointments", id), data);
}

export function listenAppointments(callback) {
  return onSnapshot(collection(db, "appointments"), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// ── FIRESTORE — Disponibilidad ─────────────────────────────────────────

export async function setAvailabilityDay(pastorId, dateKey, times) {
  const ref = doc(db, "availability", pastorId);
  const snap = await getDoc(ref);
  const current = snap.exists() ? snap.data() : {};
  current[dateKey] = times;
  await setDoc(ref, current);
}

export function listenAvailability(pastorId, callback) {
  return onSnapshot(doc(db, "availability", pastorId), (snap) => {
    callback(snap.exists() ? snap.data() : {});
  });
}

// ── FIRESTORE — Notificaciones ─────────────────────────────────────────

export async function createNotification(notif) {
  await addDoc(collection(db, "notifications"), { ...notif, createdAt: Date.now() });
}

export function listenNotifications(callback) {
  return onSnapshot(collection(db, "notifications"), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function markNotificationRead(id) {
  await updateDoc(doc(db, "notifications", id), { read: true });
}
