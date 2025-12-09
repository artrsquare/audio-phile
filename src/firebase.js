// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDKAoe3naKSl-EdKvHTE8pkCWf4wUCQ04Y",
  authDomain: "audio-phile-f3b5e.firebaseapp.com",
  projectId: "audio-phile-f3b5e",
  storageBucket: "audio-phile-f3b5e.appspot.com",
  messagingSenderId: "396503507434",
  appId: "1:396503507434:web:7457785ae54f5f60c65293"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

export { db };
