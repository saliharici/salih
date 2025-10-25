import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { firebaseConfig, GEMINI_API_KEY } from './config.js';

// --- DEĞİŞKENLER VE AYARLAR ---

let app, db, auth, storage;
let dbDocRef;
const statusMessageEl = document.getElementById("status-message");
const adminFormEl = document.getElementById("admin-form");
const loadingSpinnerEl = document.getElementById("loading-spinner");
const saveBtn = document.getElementById("save-all-btn");
const saveStatusEl = document.getElementById("save-status");

// Sekme elemanları
const navItems = document.querySelectorAll(".nav-item");
const formSections = document.querySelectorAll(".form-section");

// Gemini Butonları
const geminiAnnouncementBtn = document.getElementById("gemini-announcement-btn");
const geminiMarqueeBtn = document.getElementById("gemini-marquee-btn");
const geminiImageBtn = document.getElementById("gemini-image-btn");
const dutyReminderOutput = document.getElementById("duty-reminder-output");

// Sınıf ve Gün listeleri
const days = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma'];
const classes = [
    "9-A", "9-B", "9-C",
    "10-A", "10-B", "10-C", "10-D",
    "11-A", "11-B", "11-C", "11-D", "11-E",
    "12-A", "12-B", "12-C", "12-D", "12-E"
];
// PDF'ten alınan nöbet verileri
const dutyData = { /* ... nöbet verileri ... */
    pazartesi: "KANTİN,A.LAFZİ\nANA BINA BODRUM,Ş ÇETİN\nANA BINA ZEMİN,A.TOPARLAK\nANA BINA 1. ΚΑΤ,S.ARICIOĞLU\nANA BINA 1. ΚΑΤ,Ş.KELEŞOĞLU\nBAHÇE,S.DURGUN", sali: "KANTİN,D.ÖZDEMİR\nANA BINA BODRUM,F.KOÇ\nANA BINA ZEMİN,K.KAYACAN\nANA BINA 1. ΚΑΤ,N.ÖZTAŞKIN\nBAHÇE,K.EREN", carsamba: "KANTİN,E. ÖZDEMİR\nANA BINA BODRUM,M.ÖZGÜL\nANA BINA ZEMİN,M.XX\nANA BINA 1. ΚΑΤ,Z.İNCESU\nANA BINA 1. ΚΑΤ,R.KOÇ\nBAHÇE,E.HANCI", persembe: "KANTİN,E.DEVECİ\nANA BINA BODRUM,H.KUZEY\nANA BINA ZEMİN,N.YILDIRIM\nANA BINA 1. ΚΑΤ,S.AKBULUT\nBAHÇE,S.KASIL", cuma: "KANTİN,Y.ERESKİCİ\nANA BINA BODRUM,H.TAKIM\nANA BINA ZEMİN,K.KARA\nANA BINA 1. ΚΑΤ,T.BAĞRIYANIK\nBAHÇE,S.KARACA"
 };
// PDF'ten alınan ders programı verileri
const scheduleData = { /* ... ders programı verileri ... */
    pazartesi: { "9-A": "FİZ2,FIZ2,SAG1,BTY1,S.EGI1,REH1,COGR2,COGR2", "9-B": "KKS22,KKS22,BTY1,SAG1,DKAB1,DKAB1,DVA1,DVA1", "9-C": "COGR2,COGR2,MAT1,MAT1,S.EGI1,SAG1,KKS22,KKS22", "10-A": "GÖR/MÜZ,GOR/MUZ,TRH2,TRH2,DVA1,DVA1,FEL1,FEL1", "10-B": "MAT1,MAT1,DVA1,DVA1,BTY2,BTY2,S.EGI1,REH1", "10-C": "BTY2,BTY2,S.EGI1,REH1,İYD2,İYD2,KİM1,KİM1", "10-D": "MAT1,MAT1,TRH2,TRH2,COGR2,COGR2,DVA1,DVA1", "11-A": "TRH1,TRH1,MS24,MS24,FEL1,FEL1,İYD,REH1", "11-B": "KIS22,KIS22,FEL1,FEL1,BYS27,BYS27,DKAB1,DKAB1", "11-C": "MS24,MS24,GÖR/MUZ,GÖR/MUZ,DVA1,REH1,BYS27,BYS27", "11-D": "BED3,BED3,FIS13,FIS13,MS24,MS24,DVA1,DVA1", "11-E": "DVA1,DVA1,REH1,TDB21,MS43,MS43,BED3,BED3", "12-A": "TCINK,TCINK,KIS24,KIS24,FIS24,FIS24,BYS27,BYS27", "12-B": "DKAB1,DKAB1,FIS24,FIS24,BYS27,BYS27,KİS24,KİS24", "12-C": "BYS27,BYS27,DKAB1,DKAB1,KİS24,KIS24,FIS24,FIS24", "12-D": "FIS24,FIS24,KIS24,KIS24,DKAB1,DKAB1,TSHA1,BTY1", "12-E": "SOS23,SOS23,MS24,MS24,S.TAR2,S.TAR2,TCINK,TCINK" },
    sali: { "9-A": "MAT1,MAT1,DVA1,DVA1,BYD2,BYD2,DKAB1,DKAB1", "9-B": "BİYO,BİYO,BYD2,BYD2,MAT1,MAT1,TRH1,TRH1", "9-C": "MAT1,MAT1,BİYO,BİYO,DVA1,DVA1,KİM1,KİM1", "10-A": "MAT1,MAT1,BYD2,BYD2,KİM1,KİM1,DVA1,DVA1", "10-B": "MAT1,MAT1,BİYO,BİYO,GÖR/MÜZ,GÖR/MÜZ,DVA1,P.HAY1", "10-C": "BYD2,BYD2,FEL1,FEL1,P.HAY1,DVA1,MAT1,MAT1", "10-D": "KİM1,KİM1,MAT1,MAT1,DVA1,P.HAY1,BTY2,BTY2", "11-A": "FİS13,FİS13,MS24,MS24,BYD3,BYD3,TDB21,DVA1", "11-B": "TRH1,TRH1,KİS22,KİS22,DVA1,TDB21,MS24,MS24", "11-C": "KİS22,KİS22,DKAB1,DKAB1,BYS27,BYS27,DVA1,DVA1", "11-D": "DKAB1,DKAB1,KİS22,KİS22,BYD3,BYD3,GÖR/MÜZ,GÖR/MÜZ", "11-E": "FEL1,FEL1,BYD3,BYD3,DVA1,T.EDE,MS43,MS43", "12-A": "GÖR/MÜZ,GÖR/MÜZ,DVA1,DVA1,MS24,MS24,BYS27,BYS27", "12-B": "TCINK,TCİNK,MS24,MS24,BYS27,BYS27,BYD4,BYD4", "12-C": "DVA1,DVA1,MTU2,MTU2,TCİNK,TCINK,BYD4,BYD4", "12-D": "BYS27,BYS27,FIS24,FİS24,KİS24,KİS24,DVA1,REH1", "12-E": "T.EDE,T.EDE,GÖR/MÜZ,GÖR/MÜZ,M.UYG2,M.UYG2,TSHA1,DVA1" },
    carsamba: { "9-A": "GÖR/MÜZ,GÖR/MÜZ,MAT1,MAT1,BİYO,BİYO,İYD1,İYD1", "9-B": "FİZ2,FİZ2,DVA1,REH1,GÖR/MÜZ,GÖR/MÜZ,İYD1,İYD1", "9-C": "DVA1,REH1,TRH1,TRH1,İYD1,İYD1,BYD2,BYD2", "10-A": "COĞR2,COĞR2,REH1,DVA1,FİZ2,FİZ2,BTY2,BTY2", "10-B": "DVA1,DVA1,COĞR2,COĞR2,BYD2,BYD2,TRH2,TRH2", "10-C": "BİYO,BİYO,BED1,BED1,DVA1,DVA1,MAT1,MAT1", "10-D": "BYD2,BYD2,FİZ2,FİZ2,İYD2,İYD2,GÖR/MÜZ,GÖR/MÜZ", "11-A": "BYS27,BYS27,KİS22,KİS22,DVA1,DVA1,DKAB1,DKAB1", "11-B": "MS24,MS24,BYS27,BYS27,BYD3,BYD3,BED3,BED3", "11-C": "BED3,BED3,FEL1,FEL1,TRH1,TRH1,BYD3,BYD3", "11-D": "TRH1,TRH1,MS24,MS24,DVA1,DVA1,BYS27,BYS27", "11-E": "PSS22,PSS22,BYD3,BYD3,DKAB1,DKAB1,DVA1,DVA1", "12-A": "FİS24,FİS24,MS24,MS24,BYD4,BYD4,DVA1,DVA1", "12-B": "DVA1,DVA1,REH1,GÖR/MÜZ,GÖR/MÜZ,BTY1,MS24,MS24", "12-C": "KİS24,KİS24,FIS24,FİS24,MS24,MS24,GÖR/MÜZ,GÖR/MÜZ", "12-D": "MS24,MS24,DVA1,DVA1,BYS27,BYS27,BYD4,BYD4", "12-E": "MS24,MS24,BYD4,BYD4,COS26,COS26,DVA1,DVA1" },
    persembe: { "9-A": "BYD2,BYD2,D.EĞİ1,DVA1,KKS22,KKS22,TRH1,TRH1", "9-B": "BED1,BED1,MAT1,MAT1,BYD2,BYD2,S.EĞİ1,D.EĞİ1", "9-C": "GÖR/MÜZ,GÖR/MÜZ,FİZ2,FİZ2,DVA1,DVA1,DKAB1,DKAB1", "10-A": "MAT1,MAT1,P.HAY1,İYD2,İYD2,S.EĞİ1,BİYO,BİYO", "10-B": "KİM1,KİM1,BYD2,BYD2,FEL1,FEL1,DKAB1,DKAB1", "10-C": "BYD2,BYD2,COĞR2,COĞR2,DVA1,DVA1,FİZ2,FİZ2", "10-D": "BİYO,BİYO,DKAB1,DKAB1,BED1,BED1,REH1,S.EĞİ1", "11-A": "BYS27,BYS27,KİS22,KİS22,GÖR/MÜZ,GÖR/MÜZ,BED3,BED3", "11-B": "DVA1,DVA1,BYD3,BYD3,FİS13,FİS13,GÖR/MÜZ,GÖR/MÜZ", "11-C": "FİS13,FİS13,MS24,MS24,TDB21,İYD,DVA1,DVA1", "11-D": "MS24,MS24,REH1,BYS27,BYS27,TDB21,DVA1,İYD", "11-E": "COĞR1,COĞR1,M.UYG2,M.UYG2,TKM3,TKM3,MS43,MS43", "12-A": "AUB2,AUB2,REH1,DVA1,MS24,MS24,BYD4,BYD4", "12-B": "BYD4,BYD4,FİS24,FİS24,MTU2,MTU2,TSHA1,DVA1", "12-C": "MS24,MS24,BYS27,BYS27,DVA1,DVA1,BYD4,BYD4", "12-D": "TCINK,TCİNK,GÖR/MÜZ,GÖR/MÜZ,AUB2,AUB2,MS24,MS24", "12-E": "MS24,MS24,ÇTS22,ÇTS22,BYD4,BYD4,REH1,T.EDE" },
    cuma: { "9-A": "BED1,BED1,KİM1,KİM1,MAT1,MAT1,DVA1,DVA1", "9-B": "MAT1,MAT1,COĞR2,COĞR2,KİM1,KIM1,DVA1,DVA1", "9-C": "MAT1,MAT1,BYD2,BYD2,BED1,BED1,BTY1,D.EĞİ1", "10-A": "BYD2,BYD2,DKAB1,DKAB1,MAT1,MAT1,BED1,BED1", "10-B": "FİZ2,FİZ2,BED1,BED1,MAT1,MAT1,İYD2,İYD2", "10-C": "MAT1,MAT1,TRH2,TRH2,DKAB1,DKAB1,GÖR/MÜZ,GÖR/MÜZ", "10-D": "MAT1,MAT1,FEL1,FEL1,DVA1,DVA1,BYD2,BYD2", "11-A": "FİS13,FİS13,BYD3,BYD3,DVA1,DVA1,MS24,MS24", "11-B": "DVA1,DVA1,FİS13,FİS13,REH1,IYD,MS24,MS24", "11-C": "BYD3,BYD3,MS24,MS24,KİS22,KİS22,FİS13,FİS13", "11-D": "FEL1,FEL1,BYD3,BYD3,FİS13,FİS13,KİS22,KİS22", "11-E": "TRH1,TRH1,T.EDE,T.EDE,GÖR/MÜZ,GÖR/MÜZ,İYD3,İYD3", "12-A": "DKAB1,DKAB1,KİS24,KİS24,BTY1,TSHA1,MTU2,MTU2", "12-B": "KİS24,KİS24,MS24,MS24,AUB2,AUB2,DVA1,DVA1", "12-C": "DVA1,REH1,AUB2,AUB2,MS24,MS24,TSHA1,BTY1", "12-D": "BYD4,BYD4,MTU2,MTU2,DVA1,DVA1,MS24,MS24", "12-E": "COS26,COS26,DVA1,DVA1,SİYD2,SİYD2,DKAB1,DKAB1" }
 };


// --- SEKMELER ---
window.showTab = function(tabName) {
    navItems.forEach(item => item.classList.remove('active'));
    formSections.forEach(section => section.classList.remove('active'));
    document.getElementById(`nav-${tabName}`).classList.add('active');
    document.getElementById(`${tabName}`).classList.add('active');
}

// --- BAŞLANGIÇ FONKSİYONU ---
async function initializeAdminPanel() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        storage = getStorage(app);

        onAuthStateChanged(auth, (user) => {
            if (user) {
                // Kullanıcı giriş yapmış, paneli yükle
                statusMessageEl.innerText = "Firebase'e bağlandı. Veriler yükleniyor...";
                dbDocRef = doc(db, "pano", "mainDisplay");
                loadDataFromFirebase();
            } else {
                // Kullanıcı giriş yapmamış, login sayfasına yönlendir
                window.location.href = 'login.html';
            }
        });

        // Event Listeners
        saveBtn.addEventListener("click", saveAllDataToFirebase);
        document.getElementById("load-defaults-btn").addEventListener("click", loadDefaultPdfData);
        geminiAnnouncementBtn.addEventListener("click", generateGeminiAnnouncement);
        geminiMarqueeBtn.addEventListener("click", generateGeminiMarquee);
        geminiImageBtn.addEventListener("click", generateAndUploadImage);
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
        statusMessageEl.classList.add("text-red-600");
        loadingSpinnerEl.style.display = "none";
    }
}

// --- VERİ İŞLEMLERİ (FIREBASE) ---

// Helper: Form alanını güvenli bir şekilde doldurur
function populateField(id, value, defaultValue = "") {
    const el = document.getElementById(id);
    if (el) {
        if (el.type === 'checkbox') {
            el.checked = value;
        } else {
            el.value = value || defaultValue;
        }
    }
}

// 1a. Genel Ayarları Forma Yükle
function populateGeneralSettings(data) {
    populateField("schoolName", data.schoolName, "Erzurum Lisesi");
    populateField("logoUrl", data.logoUrl);
    populateField("scrollingText", data.scrollingText);
    populateField("scrollingTextColor", data.scrollingTextColor, "#CFD8DC");
    const size = data.scrollingTextSize || "24px";
    populateField("scrollingTextSize", parseInt(size, 10));
    const sizeValueEl = document.getElementById("scrollingTextSizeValue");
    if (sizeValueEl) sizeValueEl.innerText = size;
}

// 1b. Geri Sayım Bilgilerini Yükle
function populateCountdown(data) {
    if (data.countdownEvent) {
        populateField("countdownName", data.countdownEvent.name);
        const countdownDateValue = data.countdownEvent.date || "";
        try {
            if (countdownDateValue && !isNaN(new Date(countdownDateValue).getTime())) {
                populateField("countdownDate", countdownDateValue.slice(0, 16));
            } else {
                populateField("countdownDate", "");
            }
        } catch (e) {
            populateField("countdownDate", "");
        }
    } else {
        populateField("countdownDate", "");
    }
    populateField("showFactOfTheDay", data.showFactOfTheDay !== false, true);
}

// 1c. Sınav Başarısı ve Nöbet Listesini Yükle
function populateExamAndDuty(data) {
    if (data.examSuccess) {
        populateField("examTitle", data.examSuccess.title);
        ["9", "10", "11", "12"].forEach(grade => {
            const gradeData = (data.examSuccess.grades[grade] || []).map(s => `${s.name},${s.score}`).join("\n");
            populateField(`exam-${grade}`, gradeData);
        });
    }
    days.forEach(day => {
        let dutyText = dutyData[day] || ""; // Önce varsayılanı al
        const dutyDayData = data.dutyList ? data.dutyList[day] : null;
        if (dutyDayData) {
            dutyText = Object.entries(dutyDayData).map(([loc, name]) => `${loc},${name}`).join("\n");
        }
        populateField(`duty-${day}`, dutyText);
    });
}

// 1d. Ders Programını Yükle
function populateSchedule(data) {
    days.forEach(day => {
        classes.forEach(cls => {
            const inputId = `${day}-${cls}`;
            let lessonText = scheduleData[day] && scheduleData[day][cls] ? scheduleData[day][cls] : ""; // Varsayılan
            if (data.classSchedule && data.classSchedule[day] && data.classSchedule[day][cls]) {
                const lessons = data.classSchedule[day][cls];
                if (Array.isArray(lessons)) {
                    lessonText = lessons.join(",");
                }
            }
            populateField(inputId, lessonText);
        });
    });
}

// 1e. Medya ve Ortak Sınavları Yükle
function populateMediaAndExams(data) {
    populateField("announcements", (data.announcements || []).join("\n"));
    populateField("slideshowImages", (data.slideshowImages || []).join("\n"));
    populateField("showCommonExams", data.showCommonExams || false, false);
    populateField("commonExamTitle", data.commonExamTitle);
    populateField("commonExamDates", (data.commonExamDates || []).join("\n"));
}


// 1. Ana Yükleyici Fonksiyon
function loadDataFromFirebase() {
    onSnapshot(dbDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Mevcut veri yüklendi:", data);

            populateGeneralSettings(data);
            populateCountdown(data);
            populateExamAndDuty(data);
            populateSchedule(data);
            populateMediaAndExams(data);

            statusMessageEl.innerText = "Veriler başarıyla yüklendi. (Son Güncelleme: " + new Date().toLocaleTimeString() + ")";
        } else {
            statusMessageEl.innerText = "Veri bulunamadı. Formu doldurup 'Kaydet'e basın veya varsayılan verileri yükleyin.";
            // Otomatik yükleme kaldırıldı.
        }
        adminFormEl.classList.add("active");
        loadingSpinnerEl.style.display = "none";

    }, (error) => {
        console.error("Veri okuma hatası:", error);
        statusMessageEl.innerText = "Veri Okuma Hatası! (Kuralları kontrol edin)";
        statusMessageEl.classList.add("text-red-600");
        loadingSpinnerEl.style.display = "none";
    });
}

// PDF verilerini varsayılan olarak yükle (sadece admin paneli için)
function loadDefaultPdfData() {
    if (!confirm("Bu işlem, formdaki mevcut Nöbetçi ve Ders Programı verilerinin üzerine yazacaktır. Devam etmek istiyor musunuz?")) {
        return;
    }

    days.forEach(day => {
        populateField(`duty-${day}`, dutyData[day] || "");
    });
    days.forEach(day => {
        classes.forEach(cls => {
            const inputId = `${day}-${cls}`;
            const defaultValue = (scheduleData[day] && scheduleData[day][cls]) ? scheduleData[day][cls] : "";
            populateField(inputId, defaultValue);
        });
    });

    showToast("Varsayılan veriler yüklendi. Kaydetmeyi unutmayın.", "success");
    console.log("Varsayılan PDF verileri forma yüklendi.");
}

// --- Form Verilerini Toplama Fonksiyonları ---

// Helper: Formdan bir değer alır
const getFieldValue = (id, isCheckbox = false) => {
    const el = document.getElementById(id);
    if (!el) return isCheckbox ? false : "";
    return isCheckbox ? el.checked : el.value;
};

// Helper: Textarea'dan satırları al
const getTextareaLines = (id) => {
    return getFieldValue(id).split('\n').filter(line => line.trim() !== '');
};

// 2a. Genel Ayarları Formdan Al
function getGeneralSettingsFromForm() {
    return {
        schoolName: getFieldValue("schoolName"),
        logoUrl: getFieldValue("logoUrl"),
        scrollingText: getFieldValue("scrollingText"),
        scrollingTextColor: getFieldValue("scrollingTextColor"),
        scrollingTextSize: `${getFieldValue("scrollingTextSize")}px`,
    };
}

// 2b. Geri Sayım Bilgilerini Formdan Al
function getCountdownFromForm() {
    return {
        countdownEvent: {
            name: getFieldValue("countdownName"),
            date: getFieldValue("countdownDate"),
        },
        showFactOfTheDay: getFieldValue("showFactOfTheDay", true),
    };
}

// 2c. Sınav ve Nöbet Bilgilerini Formdan Al
function getExamAndDutyFromForm() {
    const examSuccess = {
        title: getFieldValue("examTitle"),
        grades: {},
    };
    ["9", "10", "11", "12"].forEach(grade => {
        examSuccess.grades[grade] = getTextareaLines(`exam-${grade}`).map(line => {
            const parts = line.split(',');
            return { name: (parts[0] || "").trim(), score: (parts[1] || "").trim() };
        });
    });

    const dutyList = {};
    days.forEach(day => {
        dutyList[day] = getTextareaLines(`duty-${day}`).reduce((obj, line) => {
            const parts = line.split(',');
            const location = (parts[0] || "").trim().toUpperCase().replace('ΚΑΤ', 'KAT');
            const teacher = (parts[1] || "").trim();
            if (location && teacher) obj[location] = teacher;
            return obj;
        }, {});
    });

    return { examSuccess, dutyList };
}

// 2d. Ders Programını Formdan Al
function getScheduleFromForm() {
    const classSchedule = {};
    days.forEach(day => {
        classSchedule[day] = {};
        classes.forEach(cls => {
            const lessons = getFieldValue(`${day}-${cls}`).split(',').map(s => s.trim());
            classSchedule[day][cls] = lessons;
        });
    });
    return { classSchedule };
}

// 2e. Medya ve Ortak Sınavları Formdan Al
function getMediaAndExamsFromForm() {
    return {
        announcements: getTextareaLines("announcements"),
        slideshowImages: getTextareaLines("slideshowImages"),
        showCommonExams: getFieldValue("showCommonExams", true),
        commonExamTitle: getFieldValue("commonExamTitle"),
        commonExamDates: getTextareaLines("commonExamDates"),
    };
}


// 2. Ana Kaydetme Fonksiyonu
async function saveAllDataToFirebase() {
    saveBtn.disabled = true;
    saveStatusEl.innerText = "Kaydediliyor...";
    saveStatusEl.classList.remove("text-red-600", "text-green-600");
    saveStatusEl.classList.add("text-blue-600");

    try {
        const dataToSave = {
            ...getGeneralSettingsFromForm(),
            ...getCountdownFromForm(),
            ...getExamAndDutyFromForm(),
            ...getScheduleFromForm(),
            ...getMediaAndExamsFromForm(),
        };

        await setDoc(dbDocRef, dataToSave);

        console.log("Veri başarıyla kaydedildi:", dataToSave);
        saveStatusEl.innerText = "Başarıyla Kaydedildi!";
        saveStatusEl.classList.remove("text-blue-600");
        saveStatusEl.classList.add("text-green-600");

    } catch (error) {
        console.error("Veri kaydetme hatası:", error);
        saveStatusEl.innerText = "Hata oluştu! Kaydedilemedi.";
        saveStatusEl.classList.remove("text-blue-600");
        saveStatusEl.classList.add("text-red-600");
    } finally {
        saveBtn.disabled = false;
        setTimeout(() => {
            saveStatusEl.innerText = "";
            saveStatusEl.classList.remove("text-red-600", "text-green-600");
        }, 4000);
    }
}

// --- GEMINI YARDIMCI FONKSİYONLARI ---

// Merkezi Gemini API çağrı fonksiyonu
async function callGeminiApi(model, payload, button, statusEl = null) {
    if (button) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner-tiny"></span>'; // Basit bir spinner göster
    }
    if (statusEl) statusEl.innerText = "İstek gönderiliyor...";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API Hatası: ${response.status}`);
        }

        const result = await response.json();
        if (statusEl) statusEl.innerText = "Başarıyla tamamlandı!";
        return result;

    } catch (error) {
        console.error(`Gemini API hatası (${model}):`, error);
        if (statusEl) statusEl.innerText = "Hata oluştu!";
        showToast("Yapay zeka içeriği oluşturulamadı. API anahtarınızı kontrol edin.", "error");
        return null;
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || "✨";
        }
        if (statusEl) {
            setTimeout(() => { statusEl.innerText = ""; }, 4000);
        }
    }
}


// --- GEMINI İŞLEVLERİ ---

// 1. Metin Tabanlı İçerik Oluşturma
async function generateTextContent(prompt, button) {
    const model = "gemini-1.5-flash-latest";
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    const result = await callGeminiApi(model, payload, button);
    return result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/^"|"$/g, '');
}

// 2. Resmi Storage'a Yükle ve URL'ini Al
async function uploadImageToStorage(base64Data) {
    const statusEl = document.getElementById("gemini-image-status");
    try {
        statusEl.innerText = "Resim Firebase Storage'a yükleniyor...";
        // Dosya adı için benzersiz bir kimlik oluştur
        const imageName = `gemini-img-${Date.now()}.png`;
        const storageRef = ref(storage, `slideshow/${imageName}`);

        // Base64 verisini Storage'a yükle
        const snapshot = await uploadString(storageRef, base64Data, 'base64');

        // Yüklenen dosyanın URL'ini al
        const downloadURL = await getDownloadURL(snapshot.ref);

        statusEl.innerText = "Resim başarıyla yüklendi!";
        return downloadURL;
    } catch (error) {
        console.error("Firebase Storage yükleme hatası:", error);
        statusEl.innerText = "Resim yüklenemedi!";
        showToast("Resim Firebase Storage'a yüklenemedi.", "error");
        return null;
    }
}


// 3. Gemini ile Resim Oluştur ve Storage'a Yükle
async function generateImageContent(prompt, button) {
    // Dikkat: Gemini resim modelleri farklı bir API endpoint ve yapı kullanabilir.
    // Bu kod, `imagen-3.0` modelinin `bytesBase64Encoded` döndürdüğünü varsayar.
    // Gerçek modelin dokümantasyonuna göre endpoint/payload güncellenmelidir.
    const model = "imagen-3.0-generate-002:predict"; // 'predict' endpoint'i genellikle kullanılır
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${GEMINI_API_KEY}`;
    const payload = { instances: [{ prompt: prompt }], parameters: { "sampleCount": 1 } };
    const statusEl = document.getElementById("gemini-image-status");

    // Merkezi API çağrı fonksiyonu yerine özel bir fetch yapıyoruz çünkü endpoint farklı
    try {
        if (button) { button.disabled = true; button.innerHTML = '<span class="spinner-tiny"></span>'; }
        statusEl.innerText = "Yapay zekadan resim oluşturuluyor...";

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`API Hatası: ${response.status}`);

        const result = await response.json();
        const base64Data = result.predictions?.[0]?.bytesBase64Encoded;

        if (!base64Data) throw new Error("API'den geçerli resim verisi alınamadı.");

        statusEl.innerText = "Resim başarıyla oluşturuldu!";
        return await uploadImageToStorage(base64Data);

    } catch (error) {
        console.error("Gemini Resim API hatası:", error);
        statusEl.innerText = "Resim oluşturulamadı!";
        showToast("Yapay zeka resmi oluşturulamadı.", "error");
        return null;
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || "✨ Oluştur";
        }
        setTimeout(() => { statusEl.innerText = ""; }, 5000);
    }
}


// 4. Hızlı Duyuru Oluştur
async function generateGeminiAnnouncement() {
    const promptInput = document.getElementById("gemini-announcement-prompt");
    if (!promptInput.value) { showToast("Lütfen bir duyuru konusu girin.", "error"); return; }
    const fullPrompt = `Şu konuyu lise öğrencileri için resmi bir duyuru metnine dönüştür (başına • koy): "${promptInput.value}"`;
    const result = await generateTextContent(fullPrompt, geminiAnnouncementBtn);
    if (result) {
        const announcementsEl = document.getElementById("announcements");
        announcementsEl.value += (announcementsEl.value ? "\n" : "") + result;
        promptInput.value = "";
    }
}

// 4. Kayan Yazı Oluştur
async function generateGeminiMarquee() {
    const promptInput = document.getElementById("gemini-marquee-prompt");
    if (!promptInput.value) { showToast("Lütfen kayan yazı için bir konu girin.", "error"); return; }
    const fullPrompt = `Şu konu hakkında lise öğrencileri için kısa (1-2 cümlelik) bir kayan yazı metni oluştur: "${promptInput.value}"`;
    const result = await generateTextContent(fullPrompt, geminiMarqueeBtn);
    if (result) {
        document.getElementById("scrollingText").value = result;
        promptInput.value = "";
    }
}

// 5. Resim Oluştur ve Listeye Ekle
async function generateAndUploadImage() {
    const promptInput = document.getElementById("gemini-image-prompt");
    if (!promptInput.value) {
        showToast("Lütfen oluşturulacak resim için bir konu girin.", "error");
        return;
    }
    const fullPrompt = `Okul dijital panosu için slayt gösterisi resmi, konu: "${promptInput.value}". Yüksek kaliteli, 16:9 oranında, canlı renkler.`;

    const imageUrl = await generateImageContent(fullPrompt, geminiImageBtn);

    if (imageUrl) {
        const slideshowEl = document.getElementById("slideshowImages");
        slideshowEl.value += (slideshowEl.value ? "\n" : "") + imageUrl;
        promptInput.value = "";
        showToast("Resim başarıyla oluşturuldu ve eklendi!", "success");
    }
}

// 6. Nöbetçi Hatırlatma Mesajı Oluştur
async function generateDutyReminder(dayKey, button) {
    const dutyTextarea = document.getElementById(`duty-${dayKey}`);
    const dutyLines = dutyTextarea.value.split('\n').filter(line => line.trim() !== '');
    if (dutyLines.length === 0) {
        dutyReminderOutput.innerText = `${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)} günü için nöbetçi girilmemiş.`;
        return;
    }
    const teacherNames = dutyLines.map(line => (line.split(',')[1] || "").trim()).filter(name => name && name.toLowerCase() !== 'm.xx');
    if (teacherNames.length === 0) {
        dutyReminderOutput.innerText = `${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)} günü için geçerli nöbetçi bulunamadı.`;
        return;
    }
    dutyReminderOutput.innerText = "Hatırlatma mesajı oluşturuluyor...";
    const dayNameTurkish = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
    const prompt = `Değerli öğretmenlerimiz ${teacherNames.join(', ')} için ${dayNameTurkish} günkü nöbet görevlerini hatırlatan kısa (1-2 cümlelik), nazik ve resmi bir mesaj oluştur. Mesajın sonuna "İyi çalışmalar dileriz." ekle.`;
    const result = await generateTextContent(prompt, button);
    dutyReminderOutput.innerText = result || "Hatırlatma mesajı oluşturulamadı.";
}


// --- KULLANICI DENEYİMİ (UX) YARDIMCILARI ---

// Toast Bildirim Fonksiyonu
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;

    container.appendChild(toast);

    // Toast'u göster
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Toast'u gizle ve kaldır
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, duration);
}


// --- UYGULAMAYI BAŞLAT ---
initializeAdminPanel();
