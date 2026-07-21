import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Firebase 웹 설정값은 브라우저에 포함되는 공개 식별자입니다.
// 실제 접근 제어는 firestore.rules와 관리자 UID 검증으로 수행합니다.
const firebaseConfig = {
  apiKey: "AIzaSyAnyrAIXLAa9oE7Gf1kDck1MbH7-N-Fbi0",
  authDomain: "south-america-772de.firebaseapp.com",
  projectId: "south-america-772de",
  storageBucket: "south-america-772de.firebasestorage.app",
  messagingSenderId: "379842944876",
  appId: "1:379842944876:web:26fd16296b425fdf99dd49",
  measurementId: "G-EHC9B2EBC4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export {
  db,
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  collection,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc
};
