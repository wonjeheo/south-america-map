// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { 
  getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// 🔥 수정 포인트 1: import 목록에 getRedirectResult 추가
import { 
  getAuth, GoogleAuthProvider, signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

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

// 🔥 수정 포인트 2: export 목록에도 getRedirectResult 추가
export {
  db, auth, GoogleAuthProvider, signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult,
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where
};