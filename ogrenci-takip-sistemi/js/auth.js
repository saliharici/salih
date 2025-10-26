import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

// Kimlik doğrulama durumu dinleyicisi
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Kullanıcı giriş yapmamışsa, login sayfasına yönlendir.
    // Panel sayfalarının kök dizinde olmadığını varsayarak,
    // projenin yapısına uygun bir yönlendirme yapıyoruz.
    console.log('Oturum açık değil. Giriş sayfasına yönlendiriliyor...');
    window.location.assign('/ogrenci-takip-sistemi/login.html');
  } else {
    // Kullanıcı giriş yapmış.
    console.log('Kullanıcı oturumu açık:', user.uid);
  }
});

// Çıkış butonu işlevselliği
const logoutButton = document.getElementById('logout-button');
if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
      console.log('Başarıyla çıkış yapıldı.');
      // onAuthStateChanged dinleyicisi yönlendirmeyi otomatik olarak yapacaktır.
    }).catch((error) => {
      console.error('Çıkış yapılırken hata oluştu:', error);
      alert('Çıkış yapılırken bir hata oluştu.');
    });
  });
}
