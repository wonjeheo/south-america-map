// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { 
  getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// 🔥 인증 관련 기능 추가 import
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// 🔥 기존에 만드신 apikeys.js에서 가져오거나, 그냥 여기에 다시 적어도 안전합니다!
// (왜냐하면 위에서 Rules로 문을 잠갔으니까요)
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
const auth = getAuth(app); // 인증 객체 생성

// 외부에서 쓸 수 있게 export
export {
  db, auth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where
};