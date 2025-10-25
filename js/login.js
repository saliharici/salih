// Firebase servislerini config dosyamızdan içe aktarıyoruz.
import { auth } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// HTML elementlerini seçiyoruz.
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const googleLoginBtn = document.getElementById('google-login-btn');
const errorMessage = document.getElementById('error-message');

// Sayfa yüklendiğinde kullanıcının oturum durumunu kontrol et
// Eğer kullanıcı zaten giriş yapmışsa, onu direkt admin paneline yönlendir.
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Kullanıcı zaten giriş yapmış, yönlendiriliyor...");
        window.location.href = 'admin.html';
    }
});


// E-posta ve şifre ile giriş formu gönderildiğinde...
loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Formun varsayılan gönderme işlemini engelle.

    const email = emailInput.value;
    const password = passwordInput.value;
    errorMessage.textContent = ''; // Hata mesajını temizle

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Giriş başarılı. Kullanıcı onAuthStateChanged tarafından yönlendirilecek.
            console.log("Giriş başarılı:", userCredential.user);
        })
        .catch((error) => {
            // Giriş başarısız. Hata mesajını göster.
            console.error("Giriş hatası:", error);
            errorMessage.textContent = "E-posta veya şifre hatalı. Lütfen tekrar deneyin.";
        });
});

// Google ile Giriş butonu tıklandığında...
googleLoginBtn.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    errorMessage.textContent = ''; // Hata mesajını temizle

    signInWithPopup(auth, provider)
        .then((result) => {
            // Google ile giriş başarılı. Kullanıcı onAuthStateChanged tarafından yönlendirilecek.
            console.log("Google ile giriş başarılı:", result.user);
        })
        .catch((error) => {
            // Google ile giriş başarısız. Hata mesajını göster.
            console.error("Google giriş hatası:", error);
            errorMessage.textContent = "Google ile giriş sırasında bir hata oluştu.";
        });
});
