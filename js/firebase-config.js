// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDYVKVZqIe-NDYyI_xW8kE-TLut1HcHd3A",
  authDomain: "okul-7f57a.firebaseapp.com",
  projectId: "okul-7f57a",
  storageBucket: "okul-7f57a.appspot.com",
  messagingSenderId: "647527803588",
  appId: "1:647527803588:web:ed3e0047cc18369f6bb791",
  measurementId: "G-7S0V0X29H4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
