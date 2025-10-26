// Adım 1: Firebase Projesi Oluşturun
// Eğer henüz yapmadıysanız, https://console.firebase.google.com/ adresine gidin,
// yeni bir proje oluşturun ve projenize bir isim verin.

// Adım 2: Web Uygulaması Ekleyin
// Firebase projenizin ana sayfasında, "Project Overview" başlığının yanında
// bulunan </> (Web) ikonuna tıklayarak yeni bir web uygulaması ekleyin.
// Uygulamanıza bir takma ad verin ve "Register app" butonuna tıklayın.

// Adım 3: Firebase SDK'sını Kurun
// "Add Firebase SDK" adımında, "Use a <script> tag" seçeneğini seçin.
// Karşınıza çıkan `firebaseConfig` objesini kopyalayın. Bu obje, aşağıdakine benzer
// şekilde projenize özel anahtarları içerecektir.

// Adım 4: Kendi Bilgilerinizi Buraya Yapıştırın
// Kopyaladığınız `firebaseConfig` objesinin içeriğini aşağıdaki `firebaseConfig`
// objesinin içine, ilgili alanlara yapıştırın. "YOUR_API_KEY" gibi yer tutucu
// değerleri kendi projenizin değerleriyle değiştirmiş olacaksınız.
//==============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Buraya kendi apiKey'inizi yapıştırın
  authDomain: "YOUR_AUTH_DOMAIN", // Buraya kendi authDomain'inizi yapıştırın
  projectId: "YOUR_PROJECT_ID", // Buraya kendi projectId'nizi yapıştırın
  storageBucket: "YOUR_STORAGE_BUCKET", // Buraya kendi storageBucket'ınızı yapıştırın
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Buraya kendi messagingSenderId'nizi yapıştırın
  appId: "YOUR_APP_ID" // Buraya kendi appId'nizi yapıştırın
};

//==============================================================================
// Adım 5: Authentication ve Firestore'u Aktif Edin
// Firebase konsolunda, sol menüden "Authentication"a gidin, "Sign-in method"
// sekmesine tıklayın ve "Email/Password" sağlayıcısını aktif hale getirin.
// Ardından, sol menüden "Firestore Database"e gidin, "Create database" butonuna
// tıklayın ve test modunda (test mode) bir veritabanı oluşturun.
//
// Bu adımlardan sonra projeniz çalışmaya hazır olacaktır!
//==============================================================================


// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
