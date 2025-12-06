// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// PASTE YOUR CONFIG FROM FIREBASE CONSOLE HERE:
const firebaseConfig = {
  apiKey: "AIzaSyDKAoe3naKSl-EdKvHTE8pkCWf4wUCQ04Y",
  authDomain: "audio-phile-f3b5e.firebaseapp.com",
  projectId: "audio-phile-f3b5e",
  storageBucket: "audio-phile-f3b5e.firebasestorage.app",
  messagingSenderId: "396503507434",
  appId: "1:396503507434:web:7457785ae54f5f60c65293"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };