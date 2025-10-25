// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAFSO4FH_rcXSvUYNn60Yph-EQeWLzWac0",
  authDomain: "datacek-91963.firebaseapp.com",
  projectId: "datacek-91963",
  storageBucket: "datacek-91963.appspot.com",
  messagingSenderId: "45310934263",
  appId: "1:45310934263:web:32d11f85ca005ed8f627f2",
  measurementId: "G-TQM4G2VSH6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
