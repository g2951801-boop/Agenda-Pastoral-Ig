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

export async function registerUser({ name, email, password, phone, nie, gender, role, pastorId }) {
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
    gender: gender || null,
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

// ── Buscar el correo real de un pastor por su pastorId ──────────────────
export async function getPastorEmail(pastorId) {
  const q = query(collection(db, "users"), where("role","==","pastor"), where("pastorId","==",pastorId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data().email || null;
}

// ── Buscar el correo real del secretario/a (solo puede haber uno) ──────
export async function getSecretaryEmail() {
  const q = query(collection(db, "users"), where("role","==","secretary"));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data().email || null;
}

// ── Recordatorios — marcar que ya se envió para no duplicar ────────────
export async function markReminderSent(aptId, type) {
  // type: "24h" | "1h"
  await updateDoc(doc(db, "appointments", aptId), {
    [`reminder_${type}`]: true
  });
}

// ── Recuperación de contraseña por correo ──────────────────────────────
export async function sendPasswordReset(email) {
  const { sendPasswordResetEmail } = await import("firebase/auth");
  await sendPasswordResetEmail(auth, email, {
    url: window.location.origin,
  });
}

// ── PROGRESO — Racha de lectura bíblica ────────────────────────────────
// Documento: progress/{uid} → { lastDay, streak, best, total, updatedAt }
export function dayKey(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function yesterdayKey() {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return dayKey(y);
}

export async function getReadingStreak(uid) {
  const snap = await getDoc(doc(db, "progress", uid));
  const d = snap.exists() ? snap.data() : {};
  const alive = d.lastDay === dayKey() || d.lastDay === yesterdayKey();
  return {
    streak: alive ? (d.streak || 0) : 0,
    best: d.best || 0,
    total: d.total || 0,
    readToday: d.lastDay === dayKey(),
  };
}

export async function recordReadingDay(uid) {
  const ref = doc(db, "progress", uid);
  const snap = await getDoc(ref);
  const d = snap.exists() ? snap.data() : {};
  const today = dayKey();
  if (d.lastDay === today) {
    return { streak: d.streak || 1, best: d.best || 1, total: d.total || 1, readToday: true, isNew: false };
  }
  const streak = d.lastDay === yesterdayKey() ? (d.streak || 0) + 1 : 1;
  const best = Math.max(d.best || 0, streak);
  const total = (d.total || 0) + 1;
  await setDoc(ref, { lastDay: today, streak, best, total, updatedAt: Date.now() }, { merge: true });
  return { streak, best, total, readToday: true, isNew: true };
}
