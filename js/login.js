import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Firebase yapılandırmasını config.js dosyasından al
import { firebaseConfig } from './config.js';

// --- Firebase Başlatma ---
let app, auth;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
} catch (error) {
    console.error("Firebase başlatılamadı:", error);
    document.getElementById("error-message").innerText = "Uygulama başlatılamadı. Yapılandırmayı kontrol edin.";
}


// --- DOM Elementleri ---
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const googleLoginBtn = document.getElementById('google-login-btn');
const errorMessageEl = document.getElementById('error-message');

// --- Kullanıcı Zaten Giriş Yapmış mı Kontrolü ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Eğer kullanıcı zaten giriş yapmışsa, admin paneline yönlendir
        console.log("Kullanıcı zaten giriş yapmış, yönlendiriliyor...");
        window.location.href = 'admin.html';
    }
});

// --- Giriş Formu Olay Dinleyicisi ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Formun varsayılan gönderme işlemini engelle
    errorMessageEl.innerText = ''; // Hata mesajını temizle

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        // Firebase ile kullanıcı girişi yapmayı dene
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Giriş başarılı:", userCredential.user);

        // Giriş başarılıysa admin.html'e yönlendir
        window.location.href = 'admin.html';

    } catch (error) {
        // Hata durumunda kullanıcıya bilgi ver
        console.error("Giriş hatası:", error.code, error.message);

        let friendlyMessage = "Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            friendlyMessage = "E-posta veya şifre hatalı.";
        } else if (error.code === 'auth/invalid-email') {
            friendlyMessage = "Geçersiz e-posta formatı.";
        }
        errorMessageEl.innerText = friendlyMessage;
    }
});

// --- Google ile Giriş Olay Dinleyicisi ---
googleLoginBtn.addEventListener('click', async () => {
    errorMessageEl.innerText = ''; // Hata mesajını temizle
    const provider = new GoogleAuthProvider();

    try {
        // Firebase ile Google pop-up girişini başlat
        const result = await signInWithPopup(auth, provider);
        console.log("Google ile giriş başarılı:", result.user);

        // Giriş başarılıysa admin.html'e yönlendir
        window.location.href = 'admin.html';

    } catch (error) {
        // Hataları işle
        console.error("Google ile giriş hatası:", error);

        let friendlyMessage = "Google ile giriş yapılamadı. Lütfen tekrar deneyin.";
        if (error.code === 'auth/popup-closed-by-user') {
            friendlyMessage = "Giriş penceresi kapatıldı.";
        } else if (error.code === 'auth/account-exists-with-different-credential') {
            friendlyMessage = "Bu e-posta adresiyle daha önce farklı bir yöntemle giriş yapılmış.";
        }
        errorMessageEl.innerText = friendlyMessage;
    }
});
