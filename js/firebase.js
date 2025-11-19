// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { 
  getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// 🔥 setPersistence, browserLocalPersistence 추가됨
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, 
  signOut, onAuthStateChanged, getRedirectResult,
  setPersistence, browserLocalPersistence 
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

// export 목록에도 추가
export {
  db, auth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, 
  signOut, onAuthStateChanged, getRedirectResult,
  setPersistence, browserLocalPersistence,
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where
};