import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// API Anahtarlarını ve Firebase yapılandırmasını config.js dosyasından al
import { firebaseConfig, GEMINI_API_KEY } from './config.js';

// --- DEĞİŞKENLER VE AYARLAR ---

let app, db, auth, storage;
let dbDocRef;
const statusMessageEl = document.getElementById("status-message");
const adminFormEl = document.getElementById("admin-form");
const loadingSpinnerEl = document.getElementById("loading-spinner");
const saveBtn = document.getElementById("save-all-btn");
const logoutBtn = document.getElementById("logout-btn");
const loadDefaultsBtn = document.getElementById("load-defaults-btn");

// Sekme elemanları
const navItems = document.querySelectorAll(".nav-item");
const formSections = document.querySelectorAll(".form-section");

// Gemini Butonları
const geminiAnnouncementBtn = document.getElementById("gemini-announcement-btn");
const geminiMarqueeBtn = document.getElementById("gemini-marquee-btn");
const geminiImageBtn = document.getElementById("gemini-image-btn");
const dutyReminderOutput = document.getElementById("duty-reminder-output");

// Gemini API URL'leri (API Anahtarı config.js'den alındı)
const GEMINI_API_URL_TEXT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
const GEMINI_API_URL_IMAGE = `https://generativelanguage.googleapis.com/v1beta/models/imagen-a-vin:generateImage?key=${GEMINI_API_KEY}`; // Bu URL'nin doğru olduğunu varsayıyoruz.

// Sınıf ve Gün listeleri
const days = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma'];
const classes = [
    "9-A", "9-B", "9-C", "10-A", "10-B", "10-C", "10-D", "11-A", "11-B", "11-C", "11-D", "11-E", "12-A", "12-B", "12-C", "12-D", "12-E"
];

// PDF'ten alınan varsayılan veriler (kullanıcı isterse yüklenir)
const dutyData = {
    pazartesi: "KANTİN,A.LAFZİ\nANA BINA BODRUM,Ş ÇETİN\nANA BINA ZEMİN,A.TOPARLAK\nANA BINA 1. ΚΑΤ,S.ARICIOĞLU\nANA BINA 1. ΚΑΤ,Ş.KELEŞOĞLU\nBAHÇE,S.DURGUN", sali: "KANTİN,D.ÖZDEMİR\nANA BINA BODRUM,F.KOÇ\nANA BINA ZEMİN,K.KAYACAN\nANA BINA 1. ΚΑΤ,N.ÖZTAŞKIN\nBAHÇE,K.EREN", carsamba: "KANTİN,E. ÖZDEMİR\nANA BINA BODRUM,M.ÖZGÜL\nANA BINA ZEMİN,M.XX\nANA BINA 1. ΚΑΤ,Z.İNCESU\nANA BINA 1. ΚΑΤ,R.KOÇ\nBAHÇE,E.HANCI", persembe: "KANTİN,E.DEVECİ\nANA BINA BODRUM,H.KUZEY\nANA BINA ZEMİN,N.YILDIRIM\nANA BINA 1. ΚΑΤ,S.AKBULUT\nBAHÇE,S.KASIL", cuma: "KANTİN,Y.ERESKİCİ\nANA BINA BODRUM,H.TAKIM\nANA BINA ZEMİN,K.KARA\nANA BINA 1. ΚΑΤ,T.BAĞRIYANIK\nBAHÇE,S.KARACA"
 };
const scheduleData = {
    pazartesi: { "9-A": "FİZ2,FIZ2,SAG1,BTY1,S.EGI1,REH1,COGR2,COGR2", "9-B": "KKS22,KKS22,BTY1,SAG1,DKAB1,DKAB1,DVA1,DVA1", "9-C": "COGR2,COGR2,MAT1,MAT1,S.EGI1,SAG1,KKS22,KKS22", "10-A": "GÖR/MÜZ,GOR/MUZ,TRH2,TRH2,DVA1,DVA1,FEL1,FEL1", "10-B": "MAT1,MAT1,DVA1,DVA1,BTY2,BTY2,S.EGI1,REH1", "10-C": "BTY2,BTY2,S.EGI1,REH1,İYD2,İYD2,KİM1,KİM1", "10-D": "MAT1,MAT1,TRH2,TRH2,COGR2,COGR2,DVA1,DVA1", "11-A": "TRH1,TRH1,MS24,MS24,FEL1,FEL1,İYD,REH1", "11-B": "KIS22,KIS22,FEL1,FEL1,BYS27,BYS27,DKAB1,DKAB1", "11-C": "MS24,MS24,GÖR/MUZ,GÖR/MUZ,DVA1,REH1,BYS27,BYS27", "11-D": "BED3,BED3,FIS13,FIS13,MS24,MS24,DVA1,DVA1", "11-E": "DVA1,DVA1,REH1,TDB21,MS43,MS43,BED3,BED3", "12-A": "TCINK,TCINK,KIS24,KIS24,FIS24,FIS24,BYS27,BYS27", "12-B": "DKAB1,DKAB1,FIS24,FIS24,BYS27,BYS27,KİS24,KİS24", "12-C": "BYS27,BYS27,DKAB1,DKAB1,KİS24,KIS24,FIS24,FIS24", "12-D": "FIS24,FIS24,KIS24,KIS24,DKAB1,DKAB1,TSHA1,BTY1", "12-E": "SOS23,SOS23,MS24,MS24,S.TAR2,S.TAR2,TCINK,TCINK" },
    sali: { "9-A": "MAT1,MAT1,DVA1,DVA1,BYD2,BYD2,DKAB1,DKAB1", "9-B": "BİYO,BİYO,BYD2,BYD2,MAT1,MAT1,TRH1,TRH1", "9-C": "MAT1,MAT1,BİYO,BİYO,DVA1,DVA1,KİM1,KİM1", "10-A": "MAT1,MAT1,BYD2,BYD2,KİM1,KİM1,DVA1,DVA1", "10-B": "MAT1,MAT1,BİYO,BİYO,GÖR/MÜZ,GÖR/MÜZ,DVA1,P.HAY1", "10-C": "BYD2,BYD2,FEL1,FEL1,P.HAY1,DVA1,MAT1,MAT1", "10-D": "KİM1,KİM1,MAT1,MAT1,DVA1,P.HAY1,BTY2,BTY2", "11-A": "FİS13,FİS13,MS24,MS24,BYD3,BYD3,TDB21,DVA1", "11-B": "TRH1,TRH1,KİS22,KİS22,DVA1,TDB21,MS24,MS24", "11-C": "KİS22,KİS22,DKAB1,DKAB1,BYS27,BYS27,DVA1,DVA1", "11-D": "DKAB1,DKAB1,KİS22,KİS22,BYD3,BYD3,GÖR/MÜZ,GÖR/MÜZ", "11-E": "FEL1,FEL1,BYD3,BYD3,DVA1,T.EDE,MS43,MS43", "12-A": "GÖR/MÜZ,GÖR/MÜZ,DVA1,DVA1,MS24,MS24,BYS27,BYS27", "12-B": "TCINK,TCİNK,MS24,MS24,BYS27,BYS27,BYD4,BYD4", "12-C": "DVA1,DVA1,MTU2,MTU2,TCİNK,TCINK,BYD4,BYD4", "12-D": "BYS27,BYS27,FIS24,FİS24,KİS24,KİS24,DVA1,REH1", "12-E": "T.EDE,T.EDE,GÖR/MÜZ,GÖR/MÜZ,M.UYG2,M.UYG2,TSHA1,DVA1" },
    carsamba: { "9-A": "GÖR/MÜZ,GÖR/MÜZ,MAT1,MAT1,BİYO,BİYO,İYD1,İYD1", "9-B": "FİZ2,FİZ2,DVA1,REH1,GÖR/MÜZ,GÖR/MÜZ,İYD1,İYD1", "9-C": "DVA1,REH1,TRH1,TRH1,İYD1,İYD1,BYD2,BYD2", "10-A": "COĞR2,COĞR2,REH1,DVA1,FİZ2,FİZ2,BTY2,BTY2", "10-B": "DVA1,DVA1,COĞR2,COĞR2,BYD2,BYD2,TRH2,TRH2", "10-C": "BİYO,BİYO,BED1,BED1,DVA1,DVA1,MAT1,MAT1", "10-D": "BYD2,BYD2,FİZ2,FİZ2,İYD2,İYD2,GÖR/MÜZ,GÖR/MÜZ", "11-A": "BYS27,BYS27,KİS22,KİS22,DVA1,DVA1,DKAB1,DKAB1", "11-B": "MS24,MS24,BYS27,BYS27,BYD3,BYD3,BED3,BED3", "11-C": "BED3,BED3,FEL1,FEL1,TRH1,TRH1,BYD3,BYD3", "11-D": "TRH1,TRH1,MS24,MS24,DVA1,DVA1,BYS27,BYS27", "11-E": "PSS22,PSS22,BYD3,BYD3,DKAB1,DKAB1,DVA1,DVA1", "12-A": "FİS24,FİS24,MS24,MS24,BYD4,BYD4,DVA1,DVA1", "12-B": "DVA1,DVA1,REH1,GÖR/MÜZ,GÖR/MÜZ,BTY1,MS24,MS24", "12-C": "KİS24,KİS24,FIS24,FİS24,MS24,MS24,GÖR/MÜZ,GÖR/MÜZ", "12-D": "MS24,MS24,DVA1,DVA1,BYS27,BYS27,BYD4,BYD4", "12-E": "MS24,MS24,BYD4,BYD4,COS26,COS26,DVA1,DVA1" },
    persembe: { "9-A": "BYD2,BYD2,D.EĞİ1,DVA1,KKS22,KKS22,TRH1,TRH1", "9-B": "BED1,BED1,MAT1,MAT1,BYD2,BYD2,S.EĞİ1,D.EĞİ1", "9-C": "GÖR/MÜZ,GÖR/MÜZ,FİZ2,FİZ2,DVA1,DVA1,DKAB1,DKAB1", "10-A": "MAT1,MAT1,P.HAY1,İYD2,İYD2,S.EĞİ1,BİYO,BİYO", "10-B": "KİM1,KİM1,BYD2,BYD2,FEL1,FEL1,DKAB1,DKAB1", "10-C": "BYD2,BYD2,COĞR2,COĞR2,DVA1,DVA1,FİZ2,FİZ2", "10-D": "BİYO,BİYO,DKAB1,DKAB1,BED1,BED1,REH1,S.EĞİ1", "11-A": "BYS27,BYS27,KİS22,KİS22,GÖR/MÜZ,GÖR/MÜZ,BED3,BED3", "11-B": "DVA1,DVA1,BYD3,BYD3,FİS13,FİS13,GÖR/MÜZ,GÖR/MÜZ", "11-C": "FİS13,FİS13,MS24,MS24,TDB21,İYD,DVA1,DVA1", "11-D": "MS24,MS24,REH1,BYS27,BYS27,TDB21,DVA1,İYD", "11-E": "COĞR1,COĞR1,M.UYG2,M.UYG2,TKM3,TKM3,MS43,MS43", "12-A": "AUB2,AUB2,REH1,DVA1,MS24,MS24,BYD4,BYD4", "12-B": "BYD4,BYD4,FİS24,FİS24,MTU2,MTU2,TSHA1,DVA1", "12-C": "MS24,MS24,BYS27,BYS27,DVA1,DVA1,BYD4,BYD4", "12-D": "TCINK,TCİNK,GÖR/MÜZ,GÖR/MÜZ,AUB2,AUB2,MS24,MS24", "12-E": "MS24,MS24,ÇTS22,ÇTS22,BYD4,BYD4,REH1,T.EDE" },
    cuma: { "9-A": "BED1,BED1,KİM1,KİM1,MAT1,MAT1,DVA1,DVA1", "9-B": "MAT1,MAT1,COĞR2,COĞR2,KİM1,KIM1,DVA1,DVA1", "9-C": "MAT1,MAT1,BYD2,BYD2,BED1,BED1,BTY1,D.EĞİ1", "10-A": "BYD2,BYD2,DKAB1,DKAB1,MAT1,MAT1,BED1,BED1", "10-B": "FİZ2,FİZ2,BED1,BED1,MAT1,MAT1,İYD2,İYD2", "10-C": "MAT1,MAT1,TRH2,TRH2,DKAB1,DKAB1,GÖR/MÜZ,GÖR/MÜZ", "10-D": "MAT1,MAT1,FEL1,FEL1,DVA1,DVA1,BYD2,BYD2", "11-A": "FİS13,FİS13,BYD3,BYD3,DVA1,DVA1,MS24,MS24", "11-B": "DVA1,DVA1,FİS13,FİS13,REH1,IYD,MS24,MS24", "11-C": "BYD3,BYD3,MS24,MS24,KİS22,KİS22,FİS13,FİS13", "11-D": "FEL1,FEL1,BYD3,BYD3,FİS13,FİS13,KİS22,KİS22", "11-E": "TRH1,TRH1,T.EDE,T.EDE,GÖR/MÜZ,GÖR/MÜZ,İYD3,İYD3", "12-A": "DKAB1,DKAB1,KİS24,KİS24,BTY1,TSHA1,MTU2,MTU2", "12-B": "KİS24,KİS24,MS24,MS24,AUB2,AUB2,DVA1,DVA1", "12-C": "DVA1,REH1,AUB2,AUB2,MS24,MS24,TSHA1,BTY1", "12-D": "BYD4,BYD4,MTU2,MTU2,DVA1,DVA1,MS24,MS24", "12-E": "COS26,COS26,DVA1,DVA1,SİYD2,SİYD2,DKAB1,DKAB1" }
 };

// --- Toast Bildirim Fonksiyonu ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            container.removeChild(toast);
        }, 500);
    }, 4000);
}

// --- SEKMELER ---
window.showTab = function(tabName) {
    navItems.forEach(item => item.classList.remove('active'));
    formSections.forEach(section => section.classList.remove('active'));
    document.getElementById(`nav-${tabName}`).classList.add('active');
    document.getElementById(`${tabName}`).classList.add('active');
}

// --- BAŞLANGIÇ FONKSİYONU ---
async function initializeAdminPanel() {
    if (!firebaseConfig.apiKey) {
        document.body.innerHTML = "<h1>Firebase yapılandırması bulunamadı. Lütfen js/config.js dosyasını oluşturun ve doldurun.</h1>";
        return;
    }
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        storage = getStorage(app);

        setLogLevel('error');

        // Kullanıcı giriş durumunu kontrol et
        onAuthStateChanged(auth, user => {
            if (user) {
                // Kullanıcı giriş yapmış, paneli yükle
                console.log("Kullanıcı doğrulandı:", user.email);
                statusMessageEl.innerText = "Kullanıcı doğrulandı. Veriler yükleniyor...";
                dbDocRef = doc(db, "pano", "mainDisplay");
                loadDataFromFirebase();
                adminFormEl.style.display = 'block'; // Ana formu göster
                loadingSpinnerEl.style.display = "none"; // Yükleniyor animasyonunu gizle
            } else {
                // Kullanıcı giriş yapmamış, login sayfasına yönlendir
                console.log("Kullanıcı giriş yapmamış. Yönlendiriliyor...");
                window.location.href = 'login.html';
            }
        });

        // Event Listeners
        saveBtn.addEventListener("click", saveAllDataToFirebase);
        logoutBtn.addEventListener("click", () => {
            signOut(auth).then(() => {
                console.log("Çıkış yapıldı.");
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error("Çıkış hatası:", error);
                showToast("Çıkış yapılamadı.", "error");
            });
        });
        geminiAnnouncementBtn.addEventListener("click", generateGeminiAnnouncement);
        geminiMarqueeBtn.addEventListener("click", generateGeminiMarquee);
        geminiImageBtn.addEventListener("click", generateGeminiImage);
        loadDefaultsBtn.addEventListener("click", loadDefaultPdfData);
        window.generateDutyReminder = generateDutyReminder;

        // Kayan yazı boyutu göstergesi
        const sizeSlider = document.getElementById("scrollingTextSize");
        const sizeValue = document.getElementById("scrollingTextSizeValue");
        sizeSlider.addEventListener("input", (e) => {
            sizeValue.innerText = `${e.target.value}px`;
        });

    } catch (error) {
        console.error("Başlatma hatası:", error);
        statusMessageEl.innerText = "Bağlantı Hatası!";
        statusMessageEl.classList.add("text-red-500");
        loadingSpinnerEl.style.display = "none";
    }
}

// --- VERİ İŞLEMLERİ (FIREBASE) ---

// 1. Firebase'den verileri çek ve formu doldur
function loadDataFromFirebase() {
    onSnapshot(dbDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Mevcut veri yüklendi:", data);

            // Genel Ayarlar
            document.getElementById("schoolName").value = data.schoolName || "";
            document.getElementById("logoUrl").value = data.logoUrl || "";
            document.getElementById("scrollingText").value = data.scrollingText || "";
            document.getElementById("scrollingTextColor").value = data.scrollingTextColor || "#CFD8DC";
            const size = data.scrollingTextSize || "24px";
            document.getElementById("scrollingTextSize").value = parseInt(size, 10);
            document.getElementById("scrollingTextSizeValue").innerText = size;

            if (data.countdownEvent) {
                document.getElementById("countdownName").value = data.countdownEvent.name || "";
                document.getElementById("countdownDate").value = data.countdownEvent.date ? data.countdownEvent.date.slice(0, 16) : "";
            }
            document.getElementById("showFactOfTheDay").checked = data.showFactOfTheDay !== false;

            // Nöbet/Sınav
            if (data.examSuccess) {
                document.getElementById("examTitle").value = data.examSuccess.title || "";
                ["9", "10", "11", "12"].forEach(grade => {
                    document.getElementById(`exam-${grade}`).value = (data.examSuccess.grades[grade] || []).map(s => `${s.name},${s.score}`).join("\n");
                });
            }

            days.forEach(day => {
                let dutyText = "";
                const dutyDayData = data.dutyList ? data.dutyList[day] : null;
                if (dutyDayData) {
                     dutyText = Object.entries(dutyDayData).map(([loc, name]) => `${loc},${name}`).join("\n");
                }
                document.getElementById(`duty-${day}`).value = dutyText;
            });

            // Ders Programı
            days.forEach(day => {
                classes.forEach(cls => {
                    const inputId = `${day}-${cls}`;
                    const inputEl = document.getElementById(inputId);
                    if (inputEl) {
                        let lessonText = "";
                        if (data.classSchedule && data.classSchedule[day] && data.classSchedule[day][cls]) {
                            lessonText = data.classSchedule[day][cls].join(",");
                        }
                        inputEl.value = lessonText;
                    }
                });
            });

            // Medya
            document.getElementById("announcements").value = (data.announcements || []).join("\n");
            document.getElementById("slideshowImages").value = (data.slideshowImages || []).join("\n");

            // Ortak Sınavlar
            document.getElementById("showCommonExams").checked = data.showCommonExams || false;
            document.getElementById("commonExamTitle").value = data.commonExamTitle || "";
            document.getElementById("commonExamDates").value = (data.commonExamDates || []).join("\n");

            statusMessageEl.innerText = "Veriler başarıyla yüklendi.";
        } else {
            statusMessageEl.innerText = "Veri bulunamadı. 'Varsayılanları Yükle' butonunu kullanarak veya formu doldurarak başlayabilirsiniz.";
        }
    }, (error) => {
        console.error("Veri okuma hatası:", error);
        statusMessageEl.innerText = "Veri Okuma Hatası! (Firestore kurallarını kontrol edin)";
        statusMessageEl.classList.add("text-red-500");
    });
}

// PDF verilerini varsayılan olarak yükle
function loadDefaultPdfData() {
    if (!confirm("Bu işlem, nöbet ve ders programı alanlarındaki mevcut verileri PDF'ten alınan varsayılanlarla değiştirecektir. Emin misiniz?")) return;

    days.forEach(day => {
       document.getElementById(`duty-${day}`).value = dutyData[day] || "";
   });
    days.forEach(day => {
       classes.forEach(cls => {
           const inputId = `${day}-${cls}`;
           const inputEl = document.getElementById(inputId);
           if (inputEl) {
               inputEl.value = (scheduleData[day] && scheduleData[day][cls]) ? scheduleData[day][cls] : "";
           }
       });
   });
   showToast("Varsayılan nöbet ve ders programı verileri forma yüklendi. Kaydetmeyi unutmayın.", "info");
}

// 2. Formdaki tüm verileri topla ve Firebase'e kaydet
async function saveAllDataToFirebase() {
    saveBtn.disabled = true;
    saveBtn.innerText = "Kaydediliyor...";

    try {
        // Helper fonksiyonları
        const parseTextareaToObject = (textareaId) => document.getElementById(textareaId).value.split('\n').filter(line => line.trim() !== '').map(line => { const parts = line.split(','); return { name: (parts[0] || "").trim(), score: (parts[1] || "").trim() }; });
        const parseDutyTextarea = (textareaId) => document.getElementById(textareaId).value.split('\n').filter(line => line.trim() !== '').reduce((obj, line) => { const parts = line.split(','); const location = (parts[0] || "").trim().toUpperCase(); const teacher = (parts[1] || "").trim(); if (location && teacher) { obj[location.replace('ΚΑΤ', 'KAT')] = teacher; } return obj; }, {});
        const getTextareaLines = (id) => document.getElementById(id).value.split('\n').filter(line => line.trim() !== '');

        const dataToSave = {
            schoolName: document.getElementById("schoolName").value,
            logoUrl: document.getElementById("logoUrl").value,
            scrollingText: document.getElementById("scrollingText").value,
            scrollingTextColor: document.getElementById("scrollingTextColor").value,
            scrollingTextSize: document.getElementById("scrollingTextSize").value + "px",
            countdownEvent: { name: document.getElementById("countdownName").value, date: document.getElementById("countdownDate").value },
            showFactOfTheDay: document.getElementById("showFactOfTheDay").checked,
            examSuccess: {
                title: document.getElementById("examTitle").value,
                grades: { "9": parseTextareaToObject("exam-9"), "10": parseTextareaToObject("exam-10"), "11": parseTextareaToObject("exam-11"), "12": parseTextareaToObject("exam-12") }
            },
            dutyList: { pazartesi: parseDutyTextarea('duty-pazartesi'), sali: parseDutyTextarea('duty-sali'), carsamba: parseDutyTextarea('duty-carsamba'), persembe: parseDutyTextarea('duty-persembe'), cuma: parseDutyTextarea('duty-cuma') },
            classSchedule: {},
            announcements: getTextareaLines("announcements"),
            slideshowImages: getTextareaLines("slideshowImages"),
            showCommonExams: document.getElementById("showCommonExams").checked,
            commonExamTitle: document.getElementById("commonExamTitle").value,
            commonExamDates: getTextareaLines("commonExamDates"),
        };

        days.forEach(day => {
            dataToSave.classSchedule[day] = {};
            classes.forEach(cls => {
                const inputEl = document.getElementById(`${day}-${cls}`);
                dataToSave.classSchedule[day][cls] = inputEl ? inputEl.value.split(',').map(s => s.trim()) : [];
            });
        });

        await setDoc(dbDocRef, dataToSave);
        showToast("Tüm veriler başarıyla kaydedildi!");

    } catch (error) {
        console.error("Veri kaydetme hatası:", error);
        showToast("Hata oluştu! Veriler kaydedilemedi.", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "Kaydet";
    }
}

// --- GEMINI FONKSİYONLARI ---

async function callGeminiTextApi(prompt, button) {
    if (button) { button.disabled = true; const originalText = button.innerHTML; button.innerHTML = "..."; }
    const url = GEMINI_API_URL_TEXT;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
     try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (error) {
        console.error("Gemini Metin API hatası:", error);
        showToast("Yapay zeka metin oluşturulamadı. API anahtarınızı kontrol edin.", "error");
        return null;
    } finally {
        if (button) { button.disabled = false; button.innerHTML = originalText.includes("Hatırlatma") ? originalText : "✨"; }
    }
}

async function uploadImageToStorage(base64Data, prompt) {
    const fileName = `gemini_${new Date().getTime()}.png`;
    const storageRef = ref(storage, `slideshow-images/${fileName}`);
    try {
        const uploadResult = await uploadString(storageRef, base64Data, 'base64');
        const downloadURL = await getDownloadURL(uploadResult.ref);
        console.log("Resim yüklendi, URL:", downloadURL);
        return downloadURL;
    } catch (error) {
        console.error("Firebase Storage'a yükleme hatası:", error);
        showToast("Resim oluşturuldu ancak yüklenemedi. Storage kurallarınızı kontrol edin.", "error");
        return null;
    }
}

async function callGeminiImageApi(prompt, button) {
    button.disabled = true; button.innerText = "...";
    const statusEl = document.getElementById("gemini-image-status");
    statusEl.innerText = "Resim oluşturuluyor, lütfen bekleyin...";

    // Güvenlik ayarları
    const safetySettings = [
        { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-a-vin:generateImage?key=${GEMINI_API_KEY}`;
    const payload = {
        prompt: { text: prompt },
        safetySettings: safetySettings,
        generationConfig: { "sampleCount": 1 }
    };

    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`API Hatası: ${response.status} - ${errorBody.error.message}`);
        }
        const result = await response.json();
        const base64Data = result.generatedImages?.[0]?.image?.bytesBase64Encoded;
        if (!base64Data) throw new Error("API'den resim verisi alınamadı.");

        statusEl.innerText = "Resim oluşturuldu, Firebase'e yükleniyor...";
        return await uploadImageToStorage(base64Data, prompt);

    } catch (error) {
        console.error("Gemini Resim API hatası:", error);
        statusEl.innerText = "Resim oluşturulamadı. Hata oluştu.";
        showToast(`Resim oluşturulamadı: ${error.message}`, "error");
        return null;
    } finally {
        button.disabled = false; button.innerText = "✨ Oluştur";
        setTimeout(() => { statusEl.innerText = ""; }, 5000);
    }
}

async function generateGeminiAnnouncement() {
    const promptInput = document.getElementById("gemini-announcement-prompt"); const prompt = promptInput.value;
    if (!prompt) { showToast("Lütfen bir duyuru konusu girin.", "warn"); return; }
    const fullPrompt = `Şu konuyu lise öğrencileri için resmi bir duyuru metnine dönüştür (başına • koy): "${prompt}"`;
    const result = await callGeminiTextApi(fullPrompt, geminiAnnouncementBtn);
    if (result) { const announcementsEl = document.getElementById("announcements"); announcementsEl.value += (announcementsEl.value ? "\n" : "") + result.replace(/^"|"$/g, ''); promptInput.value = ""; }
}

async function generateGeminiMarquee() {
    const promptInput = document.getElementById("gemini-marquee-prompt"); const prompt = promptInput.value;
    if (!prompt) { showToast("Lütfen kayan yazı için bir konu girin.", "warn"); return; }
    const fullPrompt = `Şu konu hakkında lise öğrencileri için kısa (1-2 cümlelik) bir kayan yazı metni oluştur: "${prompt}"`;
    const result = await callGeminiTextApi(fullPrompt, geminiMarqueeBtn);
    if (result) { document.getElementById("scrollingText").value = result.replace(/^"|"$/g, ''); promptInput.value = ""; }
}

async function generateGeminiImage() {
    const promptInput = document.getElementById("gemini-image-prompt"); const prompt = promptInput.value;
    if (!prompt) { showToast("Lütfen resim için bir konu girin.", "warn"); return; }
    const fullPrompt = `Okul dijital panosu için slayt gösterisi resmi, konu: "${prompt}". Yüksek kaliteli, 16:9 en boy oranı, fotoğraf gerçekçiliğinde.`;
    const imageUrl = await callGeminiImageApi(fullPrompt, geminiImageBtn);
    if (imageUrl) { const slideshowEl = document.getElementById("slideshowImages"); slideshowEl.value += (slideshowEl.value ? "\n" : "") + imageUrl; promptInput.value = ""; showToast("Resim oluşturuldu, yüklendi ve listeye eklendi!"); }
}

async function generateDutyReminder(dayKey, button) {
    const dutyTextarea = document.getElementById(`duty-${dayKey}`); const dutyLines = dutyTextarea.value.split('\n').filter(line => line.trim() !== '');
    if (dutyLines.length === 0) { dutyReminderOutput.innerText = `${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)} günü için nöbetçi girilmemiş.`; return; }
    const teacherNames = dutyLines.map(line => (line.split(',')[1] || "").trim()).filter(name => name && name.toLowerCase() !== 'm.xx');
    if (teacherNames.length === 0) { dutyReminderOutput.innerText = `Geçerli nöbetçi bulunamadı.`; return; }
    dutyReminderOutput.innerText = "Hatırlatma mesajı oluşturuluyor..."; const dayNameTurkish = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
    const prompt = `Değerli öğretmenlerimiz ${teacherNames.join(', ')} için ${dayNameTurkish} günkü nöbet görevlerini hatırlatan kısa (1-2 cümlelik), nazik ve resmi bir mesaj oluştur. Mesajın sonuna "İyi çalışmalar dileriz." ekle.`;
    const result = await callGeminiTextApi(prompt, button);
    if (result) { dutyReminderOutput.innerText = result.replace(/^"|"$/g, ''); } else { dutyReminderOutput.innerText = "Hatırlatma mesajı oluşturulamadı."; }
}

// --- UYGULAMAYI BAŞLAT ---
initializeAdminPanel();
