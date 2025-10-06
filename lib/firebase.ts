// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCqcI6SQZB_-27HS5GwNfONEAm-oJ7pmus",
  authDomain: "storage-8cc1b.firebaseapp.com",
  databaseURL: "https://storage-8cc1b-default-rtdb.firebaseio.com",
  projectId: "storage-8cc1b",
  storageBucket: "storage-8cc1b.firebasestorage.app",
  messagingSenderId: "111503494335",
  appId: "1:111503494335:web:8cd461103c627876c00a0a",
  measurementId: "G-DRW539MWL1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };