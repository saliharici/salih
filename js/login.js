import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    loginError.textContent = ''; // Önceki hata mesajını temizle

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Başarılı giriş, Firebase onAuthStateChanged yönlendirmeyi halledecek
        window.location.href = 'admin.html';
    } catch (error) {
        let errorMessage = "Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.";

        // Firebase'den gelen hata koduna göre daha spesifik mesajlar
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                errorMessage = "Hatalı e-posta veya şifre. Lütfen tekrar deneyin.";
                break;
            case 'auth/invalid-email':
                errorMessage = "Geçersiz e-posta formatı.";
                break;
            case 'auth/too-many-requests':
                errorMessage = "Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.";
                break;
        }

        loginError.textContent = errorMessage;
        console.error("Giriş Hatası:", error); // Geliştirici için detayı konsola yazdır
    }
});
