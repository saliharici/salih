import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const loginForm = document.getElementById('login-form');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = loginForm.email.value;
    const password = loginForm.password.value;

    signInWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            // Giriş başarılı
            const user = userCredential.user;
            console.log('Giriş başarılı:', user.uid);

            // Kullanıcının rolünü Firestore'dan al
            const userDocRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                const role = userData.role;

                // Role göre yönlendirme
                switch (role) {
                    case 'admin':
                        window.location.assign('/ogrenci-takip-sistemi/admin.html');
                        break;
                    case 'ogretmen':
                        window.location.assign('/ogrenci-takip-sistemi/ogretmen.html');
                        break;
                    case 'ogrenci':
                        window.location.assign('/ogrenci-takip-sistemi/ogrenci.html');
                        break;
                    case 'veli':
                        window.location.assign('/ogrenci-takip-sistemi/veli.html');
                        break;
                    default:
                        console.error('Bilinmeyen kullanıcı rolü:', role);
                        alert('Hesabınız için tanımlanmış bir rol bulunamadı.');
                        auth.signOut();
                }
            } else {
                console.error("Kullanıcı veritabanında bulunamadı.");
                alert("Giriş başarısız: Kullanıcı bilgileri eksik.");
                auth.signOut();
            }
        })
        .catch((error) => {
            // Giriş başarısız
            console.error('Giriş hatası:', error.code, error.message);
            alert('Giriş başarısız. Lütfen e-posta ve şifrenizi kontrol edin.');
        });
});
