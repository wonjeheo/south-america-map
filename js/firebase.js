// js/firebase.js
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const db = window.db;

export {
  db,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where
};
