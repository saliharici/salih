import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { getPerformance } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-performance.js";
import { firebaseConfig, GEMINI_API_KEY } from './config.js';

// --- DEĞİŞKENLER VE AYARLAR ---

const weatherLocation = "Erzurum";
const PAGE_SWITCH_INTERVAL = 30000;
const EXAM_FACT_WORD_INTERVAL = 10000;
const TOTAL_PAGES = 3;

let app, db, auth;
let countdownInterval;
let slideshowInterval;
let currentSlideIndex = 0;
let slideshowImages = [];
let examFactWordInterval;
let examFactWordState = 'exam';
let pageSwitchInterval;
let currentPage = 1;

// Gemini API Ayarları
const GEMINI_API_URL_TEXT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
const GEMINI_API_URL_TTS = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`;

// Ders Saatleri
const lessonTimes = [
    { start: "08:30", end: "09:10" }, { start: "09:20", end: "10:00" }, { start: "10:10", end: "10:50" }, { start: "11:00", end: "11:40" },
    { start: "12:40", end: "13:20" }, { start: "13:30", end: "14:10" }, { start: "14:20", end: "15:00" }, { start: "15:10", end: "15:50" },
 ];
// Nöbet yerleri
const dutyLocationsMap = {
     "KANTİN": "kantin", "ANA BINA BODRUM": "bodrum", "ANA BINA ZEMİN": "zemin", "ANA BINA 1. ΚΑΤ": "kat1", "BAHÇE": "bahce"
 };

// --- BAŞLANGIÇ FONKSİYONU ---
async function initializeAppDisplay() {
     if (!firebaseConfig.apiKey) { document.body.innerHTML = "<h1>Firebase yapılandırması bulunamadı.</h1>"; return; }
     try {
        app = initializeApp(firebaseConfig); db = getFirestore(app); auth = getAuth(app);
        const analytics = getAnalytics(app); const performance = getPerformance(app); console.log("Analytics ve Performance başlatıldı.");
        setLogLevel('Debug'); await signInAnonymously(auth); console.log("Firebase başlatıldı ve kullanıcı girişi yapıldı.");
        startRealtimeListener();
        updateTimeAndSchedule(); setInterval(updateTimeAndSchedule, 1000 * 60);

        // API yükünü dağıtmak için zamanlayıcı kullanıldı
        setTimeout(() => fetchWeather(), 1000);
        setTimeout(() => fetchFactOfTheDay(), 3000);
        setTimeout(() => fetchWordOfTheDay(), 5000);
        // PERİYODİK ÇAĞRILAR
        setInterval(fetchWeather, 1800000);
        setInterval(fetchFactOfTheDay, 6 * 60 * 60 * 1000);
        setInterval(fetchWordOfTheDay, 6 * 60 * 60 * 1000);


        startExamFactWordRotation();
        startPageSwitching();
        window.manualGoToPage = manualGoToPage;
    } catch (error) { document.getElementById("school-name").innerText = "Bağlantı Hatası!"; }
}

// --- VERİTABANI İŞLEMLERİ (FIREBASE) ---
function startRealtimeListener() {
    const docRef = doc(db, "pano", "mainDisplay");
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data(); window.currentPanoData = data;
            renderHeader(data.schoolName, data.logoUrl);
            renderMarquee(data.scrollingText, data.scrollingTextSize, data.scrollingTextColor);
            renderCountdown(data.countdownEvent);
            renderDutyList(data.dutyList);
            renderExamSuccess(data.examSuccess);
            renderSlideshow(data.slideshowImages);
            renderAnnouncements(data.announcements);
            updateScheduleDisplay(data.classSchedule);
            toggleFactWordVisibility(data.showFactOfTheDay);
            renderCommonExams(data.commonExamTitle, data.commonExamDates, data.showCommonExams);

        } else { createInitialData(docRef); }
    }, (error) => { document.getElementById("school-name").innerText = "Veri Okuma Hatası!"; });
}

 async function createInitialData(docRef) {
     const sampleData = {
        schoolName: "Erzurum Lisesi", logoUrl: "", scrollingText: "Okulumuza hoş geldiniz!", scrollingTextSize: "24px", scrollingTextColor: "#CFD8DC",
        announcements: ["Örnek duyuru 1.", "Örnek duyuru 2."],
        dutyList: { pazartesi: { "KANTİN": "Öğrt. A", "ANA BINA ZEMİN": "Öğrt. B", "BAHÇE": "Öğrt. C", "ANA BINA BODRUM": "-", "ANA BINA 1. ΚΑΤ": "-"} },
        countdownEvent: { name: "Tatile", date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16) },
        slideshowImages: ["https://placehold.co/800x400/37474F/ECEFF1?text=Resim+1", "https://placehold.co/800x400/263238/B0BEC5?text=Resim+2"],
        examSuccess: { title: "Örnek Sınav", grades: { "9": [{name:"Ali Veli", score:"450"}, {name:"Ayşe Fatma", score:"440"}], "10": [], "11": [], "12": [] } },
        showFactOfTheDay: true,
        classSchedule: { pazartesi: { "9-A": ["Mat","Mat","Fiz","Fiz","Kim","Kim","Bio","Bio"], "10-B": ["Edb","Edb","Tar","Tar","Coğ","Coğ","İng","İng"] } },
         showCommonExams: false,
         commonExamTitle: "Ortak Sınav Takvimi",
         commonExamDates: ["25.10.2025, 9. Sınıflar, Matematik", "26.10.2025, 10. Sınıflar, Fizik"]
     };
    try { await setDoc(docRef, sampleData); } catch (error) { }
}


// --- RENDER FONKSİYONLARI ---
 function renderHeader(schoolName, logoUrl) { document.getElementById("school-name").innerText = schoolName || "Okul Adı"; const logoEl = document.getElementById("school-logo"); if (logoUrl) { logoEl.src = logoUrl; logoEl.style.display = "block"; } else { logoEl.style.display = "none"; } }
function renderMarquee(text, size, color) { const marqueeEl = document.getElementById("scrolling-text"); marqueeEl.innerText = text || "Hoş geldiniz."; marqueeEl.style.fontSize = size || "24px"; marqueeEl.style.color = color || "#CFD8DC"; marqueeEl.style.fontWeight = "500"; }
function renderAnnouncements(announcements) { const listEl = document.getElementById("announcements-list"); const summaryEl = document.getElementById("announcement-summary"); listEl.innerHTML = ""; summaryEl.style.display = "none"; if (!announcements || announcements.length === 0) { listEl.innerHTML = "<li class='text-slate-400'>Gösterilecek duyuru yok.</li>"; return; } if (announcements.length > 2) { fetchAnnouncementSummary(announcements); } announcements.forEach((item, index) => { const li = document.createElement("li"); li.className = "pb-1 border-b border-slate-600 flex justify-between items-center"; const textSpan = document.createElement("span"); textSpan.innerText = `• ${item}`; const ttsButton = document.createElement("button"); ttsButton.className = "tts-button"; ttsButton.innerHTML = "▶️"; ttsButton.setAttribute("aria-label", `${item} duyurusunu oku`); ttsButton.onclick = () => playTTS(item, ttsButton); li.appendChild(textSpan); li.appendChild(ttsButton); listEl.appendChild(li); }); }
function renderDutyList(dutyListMap) { const listEl = document.getElementById("duty-list"); listEl.innerHTML = ""; const todayIndex = new Date().getDay(); const daysTr = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi']; const todayKey = daysTr[todayIndex]; if (todayIndex === 0 || todayIndex === 6 || !dutyListMap || !dutyListMap[todayKey]) { listEl.innerHTML = "<li class='text-slate-400'>Bugün nöbetçi öğretmen bulunmamaktadır.</li>"; return; } const dutyLocations = dutyListMap[todayKey]; let count = 0; for (const [location, teacher] of Object.entries(dutyLocations)) { if (teacher && teacher.trim() !== "" && teacher.trim() !== "-") { const li = document.createElement("li"); li.className = "flex justify-between items-center"; li.innerHTML = `<span class="font-semibold text-blue-300">${location}:</span> <span>${teacher}</span>`; listEl.appendChild(li); count++; } } if(count === 0) { listEl.innerHTML = "<li class='text-slate-400'>Bugün için nöbetçi atanmamış.</li>"; } }
function renderCountdown(event) { if (countdownInterval) clearInterval(countdownInterval); const titleEl = document.getElementById("countdown-title"); const daysEl = document.getElementById("countdown-days"); const mottoEl = document.getElementById("countdown-motto"); if (!event || !event.name || !event.date) { titleEl.innerText = "Sayaç Ayarlanmamış"; daysEl.innerText = "--"; mottoEl.style.display = 'none'; return; } titleEl.innerText = `${event.name} Kalan Süre`; const targetDate = new Date(event.date).getTime(); fetchCountdownMotto(event.name); mottoEl.style.display = 'block'; const updateCountdown = () => { const now = new Date().getTime(); const distance = targetDate - now; if (distance < 0) { daysEl.innerText = "00"; clearInterval(countdownInterval); titleEl.innerText = "Süre Doldu!"; mottoEl.innerHTML = "✨ Hedefe ulaşıldı!"; return; } const days = Math.floor(distance / (1000 * 60 * 60 * 24)); daysEl.innerText = days.toString().padStart(2, '0'); }; updateCountdown(); countdownInterval = setInterval(updateCountdown, 1000 * 60 * 60); }
function renderExamSuccess(examData) { const titleEl = document.getElementById("exam-title"); const gradesEl = document.getElementById("exam-grades"); gradesEl.innerHTML = ""; if (!examData || !examData.title || !examData.grades) { titleEl.innerText = "Sınav Sonucu Girilmemiş"; return; } titleEl.innerText = examData.title; let hasResults = false; for (const grade in examData.grades) { const students = examData.grades[grade]; if (students && students.length > 0) { hasResults = true; const gradeTitle = document.createElement("h3"); gradeTitle.className = "col-span-1 font-semibold text-blue-300 mt-1 text-base"; gradeTitle.innerText = `${grade}. Sınıflar`; gradesEl.appendChild(gradeTitle); students.slice(0, 3).forEach((student, index) => { const div = document.createElement("div"); div.className = "flex justify-between items-center"; div.innerHTML = `<span>${index + 1}. ${student.name}</span> <span class="font-bold text-yellow-300">${student.score} Puan</span>`; gradesEl.appendChild(div); }); } } if(!hasResults) { gradesEl.innerHTML = "<p class='text-slate-400 col-span-1 text-center'>Henüz sonuç girilmemiş.</p>"; } }
function renderSlideshow(images) { const imgEl = document.getElementById("slideshow-image"); const dotsContainer = document.getElementById("slideshow-dots"); dotsContainer.innerHTML = ""; slideshowImages = images || []; currentSlideIndex = 0; if (slideshowInterval) clearInterval(slideshowInterval); if (slideshowImages.length === 0) { imgEl.src = "https://placehold.co/1000x800/37474F/ECEFF1?text=Resim+Eklenmemiş"; imgEl.alt = "Resim Eklenmemiş"; return; } slideshowImages.forEach((_, index) => { const dot = document.createElement("span"); dot.className = "h-2 w-2 rounded-full bg-gray-500 cursor:pointer transition-colors duration-300"; if(index === 0) dot.classList.add("bg-white"); dot.onclick = () => { currentSlideIndex = index; updateSlide(); clearInterval(slideshowInterval); slideshowInterval = setInterval(nextSlide, 7000); }; dotsContainer.appendChild(dot); }); updateSlide(); slideshowInterval = setInterval(nextSlide, 7000); }
function updateScheduleDisplay(scheduleData) { const listEl = document.getElementById("schedule-list"); const titleEl = document.getElementById("schedule-title"); const topicEl = document.getElementById("schedule-topic"); listEl.innerHTML = ""; topicEl.innerHTML = "✨ Yükleniyor..."; const now = new Date(); const dayIndex = now.getDay(); const daysTr = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi']; const todayKey = daysTr[dayIndex]; const currentTime = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); if (dayIndex === 0 || dayIndex === 6 || !scheduleData || !scheduleData[todayKey]) { titleEl.innerText = "📚 Ders Programı (Bugün Ders Yok)"; listEl.innerHTML = "<p class='text-slate-400 col-span-full text-center'>Bugün ders bulunmamaktadır.</p>"; topicEl.style.display = 'none'; return; } const todaySchedule = scheduleData[todayKey]; let currentLessonIndex = -1; let currentLessonName = ""; let status = "Ders Arası"; for (let i = 0; i < lessonTimes.length; i++) { if (currentTime >= lessonTimes[i].start && currentTime <= lessonTimes[i].end) { currentLessonIndex = i; status = `${i + 1}. Ders`; break; } } if (currentTime >= lessonTimes[3].end && currentTime < lessonTimes[4].start) { status = "Öğle Arası"; currentLessonIndex = -1; } if (currentTime > lessonTimes[lessonTimes.length - 1].end) { status = "Dersler Bitti"; currentLessonIndex = -1; } if (currentTime < lessonTimes[0].start) { status = "Dersler Başlamadı"; currentLessonIndex = -1; } titleEl.innerText = `📚 Ders Programı (${status})`; if (currentLessonIndex !== -1) { let firstLessonFound = false; for (const className in todaySchedule) { const lessons = todaySchedule[className]; const lessonName = lessons[currentLessonIndex] || "-"; const div = document.createElement("div"); div.className = "schedule-item"; div.innerHTML = `<span>${className}:</span> <span>${lessonName}</span>`; listEl.appendChild(div); if (!firstLessonFound && lessonName !== "-" && lessonName !== "") { currentLessonName = lessonName; firstLessonFound = true; } } if (currentLessonName) { fetchLessonTopic(currentLessonName); topicEl.style.display = 'block'; } else { topicEl.style.display = 'none'; } } else { listEl.innerHTML = `<p class='text-slate-400 col-span-full text-center'>${status}</p>`; topicEl.style.display = 'none'; } }

function renderCommonExams(title, dates, show) {
    const examWidget = document.getElementById("common-exam-widget");
    const announcementWidget = document.getElementById("announcements-widget");
    const listEl = document.getElementById("common-exam-list");
    const titleEl = document.getElementById("common-exam-title");
    listEl.innerHTML = "";

    if (show && dates && dates.length > 0) {
        examWidget.style.display = "flex";
        announcementWidget.style.display = "none";
        titleEl.innerText = title || "Ortak Sınav Takvimi";

        dates.forEach(item => {
            const parts = item.split(',');
            if (parts.length < 5) return;

            const date = (parts[0] || "").trim();
            const grade = (parts[1] || "").trim();
            const subject = (parts[2] || "").trim();
            const timeKey = (parts[4] || "").trim().toUpperCase();
            const duration = (parts[5] || "").trim();

            let time = "";
            if (timeKey.includes("DERS")) {
                const lessonIndex = parseInt(timeKey.match(/\d+/)?.[0], 10);
                if (lessonIndex > 0 && lessonIndex <= lessonTimes.length) {
                     time = `${lessonTimes[lessonIndex - 1].start} (${timeKey})`;
                }
            } else {
                 time = timeKey;
            }

            const li = document.createElement("li");
            li.className = "exam-item";
            li.innerHTML = `
                <span class="exam-date">${date}</span>
                <span class="exam-details">${grade} - ${subject}</span>
                <span class="exam-time">${time} / ${duration}</span>
            `;
            listEl.appendChild(li);
        });
    } else {
        examWidget.style.display = "none";
        announcementWidget.style.display = "flex";
    }
}

// --- YARDIMCI FONKSİYONLARI ---
function updateTimeAndSchedule() { updateTime(); const panoData = window.currentPanoData; if (panoData && panoData.classSchedule) { updateScheduleDisplay(panoData.classSchedule); } }
function updateTime() { const now = new Date(); const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' }); document.getElementById("time").innerText = timeStr; document.getElementById("date").innerText = dateStr; }
async function fetchWeather() { const url = `https://wttr.in/${encodeURIComponent(weatherLocation)}?format=j1`; try { const response = await fetch(url); if (!response.ok) throw new Error("Hava durumu verisi alınamadı."); const data = await response.json(); const current = data.current_condition[0]; const temp = current.temp_C; const desc = current.lang_tr[0].value; const weatherCode = current.weatherCode; document.getElementById("weather-icon").innerText = getWeatherIcon(weatherCode); document.getElementById("weather-temp").innerText = `${temp}°C`; document.getElementById("weather-desc").innerText = desc; renderForecast(data.weather); fetchWeatherAdvice(temp, desc); } catch (error) { document.getElementById("weather-desc").innerText = "Hata oluştu."; } }
function renderForecast(forecastData) { const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']; const forecastElements = [document.getElementById("forecast-1"), document.getElementById("forecast-2"), document.getElementById("forecast-3")]; for (let i = 0; i < 3; i++) { const dayData = forecastData[i + 1]; if (dayData) { const date = new Date(dayData.date); const dayOfWeek = days[date.getDay()]; const icon = getWeatherIcon(dayData.hourly[4].weatherCode); const avgTemp = dayData.avgtempC; forecastElements[i].innerHTML = `<div class="font-semibold">${dayOfWeek}</div><div class="text-3xl">${icon}</div><div>${avgTemp}°C</div>`; } else { forecastElements[i].innerHTML = `<div>N/A</div>`; } } }
function getWeatherIcon(code) { const codeStr = String(code); if (codeStr === "113") return "☀️"; if (["116", "119", "122"].includes(codeStr)) return "☁️"; if (["143", "248", "260"].includes(codeStr)) return "🌫️"; if (["176", "263", "266", "293", "296", "353"].includes(codeStr)) return "🌦️"; if (["179", "182", "185", "362", "365", "392", "395"].includes(codeStr)) return "🌨️"; if (["200", "386", "389"].includes(codeStr)) return "⛈️"; if (["281", "284", "311", "314", "317", "320", "350"].includes(codeStr)) return "🥶"; if (["299", "302", "305", "308", "356", "359"].includes(codeStr)) return "🌧️"; if (["227", "230", "323", "326", "329", "332", "335", "338", "368", "371"].includes(codeStr)) return "❄️"; return "🤷"; }
function updateSlide() { const imgEl = document.getElementById("slideshow-image"); const dots = document.querySelectorAll("#slideshow-dots span"); if (slideshowImages.length === 0) return; imgEl.classList.add('fade-out'); setTimeout(() => { imgEl.src = slideshowImages[currentSlideIndex]; imgEl.alt = `Slayt ${currentSlideIndex + 1}`; imgEl.classList.remove('fade-out'); imgEl.classList.add('fade-in'); dots.forEach((dot, index) => { dot.classList.toggle("bg-white", index === currentSlideIndex); dot.classList.toggle("bg-gray-500", index !== currentSlideIndex); }); setTimeout(() => imgEl.classList.remove('fade-in'), 500); }, 500); }
function nextSlide() { if (slideshowImages.length === 0) return; currentSlideIndex = (currentSlideIndex + 1) % slideshowImages.length; updateSlide(); }

// Dönen Widget Fonksiyonları (Güncellendi: 3 Durum)
function startExamFactWordRotation() {
     if (examFactWordInterval) clearInterval(examFactWordInterval); examFactWordInterval = setInterval(() => { const examContent = document.getElementById('exam-content'); const factContent = document.getElementById('fact-content'); const wordContent = document.getElementById('word-content'); const factWordVisible = window.showFactWordGlobally; if (!factWordVisible) { examContent.style.opacity = '1'; factContent.style.opacity = '0'; wordContent.style.opacity = '0'; examFactWordState = 'exam'; return; } let currentStateElement, nextStateElement; let nextState; if (examFactWordState === 'exam') { currentStateElement = examContent; nextStateElement = factContent; nextState = 'fact'; } else if (examFactWordState === 'fact') { currentStateElement = factContent; nextStateElement = wordContent; nextState = 'word'; } else { currentStateElement = wordContent; nextStateElement = examContent; nextState = 'exam'; } currentStateElement.classList.add('fade-out'); setTimeout(() => { currentStateElement.style.opacity = '0'; currentStateElement.classList.remove('fade-out'); nextStateElement.style.opacity = '0'; nextStateElement.classList.add('fade-in'); setTimeout(() => { nextStateElement.style.opacity = '1'; nextStateElement.classList.remove('fade-in'); examFactWordState = nextState; }, 500); }, 500); }, EXAM_FACT_WORD_INTERVAL);
}

// GÖRÜNÜRLÜK FONKSİYONU GÜNCELLEME
function toggleFactWordVisibility(isVisible) {
     window.showFactWordGlobally = isVisible; const factContent = document.getElementById('fact-content'); const wordContent = document.getElementById('word-content'); const examContent = document.getElementById('exam-content'); if (!isVisible && (examFactWordState === 'fact' || examFactWordState === 'word')) { if (examFactWordInterval) clearInterval(examFactWordInterval); factContent.style.opacity = '0'; wordContent.style.opacity = '0'; examContent.style.opacity = '1'; examFactWordState = 'exam'; } else if (isVisible && examFactWordState === 'exam' && !examFactWordInterval) { startExamFactWordRotation(); } else if (isVisible && examFactWordInterval) { } else if (!isVisible && examFactWordState === 'exam'){ if (examFactWordInterval) clearInterval(examFactWordInterval); }
}

// --- ✨ GEMINI FONKSİYONLARI ---
 async function callGeminiTextApi(prompt, retries = 4) {
    const url = GEMINI_API_URL_TEXT;
    const payload = { contents: [{ parts: [{ text: prompt }] }], safetySettings: [ { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, ] };

    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            if (response.status === 429 || response.status >= 500) {
                if (retries > 0) {
                    const delay = Math.pow(2, 4 - retries) * 4000; // Artırılmış bekleme süresi
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return callGeminiTextApi(prompt, retries - 1);
                } else {
                    throw new Error(`API hatası (${response.status}) (Yeniden deneme limitine ulaşıldı)`);
                }
            } else {
                throw new Error(`API hatası (${response.status})`);
            }
        }
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) { return text.trim().replace(/^"|"$/g, ''); }
        else { return "İçerik alınamadı."; }
    } catch (error) {
        if (retries > 0) {
            const delay = Math.pow(2, 4 - retries) * 4000; // Artırılmış bekleme süresi
            await new Promise(resolve => setTimeout(resolve, delay));
            return callGeminiTextApi(prompt, retries - 1);
        }
        return "İçerik alınamadı (Ağ Hatası).";
    }
}
async function fetchWeatherAdvice(temp, desc) { const adviceEl = document.getElementById("weather-advice"); adviceEl.innerHTML = "✨ Tavsiye alınıyor..."; const prompt = `Türkiye'deki ${weatherLocation} şehrinde hava sıcaklığı ${temp}°C ve durum "${desc}". Lise öğrencilerine yönelik, bu havaya uygun, çok kısa (en fazla 1-2 cümle), olumlu ve motive edici bir günlük tavsiye ver. Örneğin: "Bugün hava serin, yanınıza bir hırka almayı unutmayın ve derslerinize odaklanın!" gibi.`; const advice = await callGeminiTextApi(prompt); adviceEl.innerHTML = `✨ ${advice}`; }
async function fetchFactOfTheDay() { const factEl = document.getElementById("fact-text"); factEl.innerHTML = "Yükleniyor..."; const prompt = "Lise öğrencileri için ilginç, kısa (1-2 cümlelik) bir genel kültür bilgisi ver (tarih, bilim, sanat, coğrafya vb. olabilir). Sadece bilgiyi ver, ek açıklama yapma."; const fact = await callGeminiTextApi(prompt); factEl.innerText = fact; }
async function fetchCountdownMotto(eventName) { const mottoEl = document.getElementById("countdown-motto"); mottoEl.innerHTML = "✨ Motto alınıyor..."; const prompt = `"${eventName}" etkinliğine geri sayım yapılıyor. Bu etkinlikle ilgili lise öğrencilerine yönelik kısa (tek cümle), motive edici bir motto oluştur. Örneğin: "Az kaldı, hedeflerinize odaklanın!" gibi. Sadece mottoyu yaz.`; const motto = await callGeminiTextApi(prompt); mottoEl.innerHTML = `✨ ${motto}`; }
async function fetchLessonTopic(lessonName) { const topicEl = document.getElementById("schedule-topic"); topicEl.innerHTML = "✨ Konu alınıyor..."; const prompt = `Şu anki ders "${lessonName}". Bu dersle ilgili lise seviyesine uygun, çok kısa (tek cümlelik) ilginç bir bilgi veya günün konusu başlığı ver. Örneğin: "Fizik: Bugün Newton'un hareket yasalarını hatırlayalım!" gibi. Sadece bilgiyi/başlığı yaz.`; const topic = await callGeminiTextApi(prompt); topicEl.innerHTML = `✨ ${topic}`; }
async function fetchAnnouncementSummary(announcements) { const summaryEl = document.getElementById("announcement-summary"); summaryEl.innerHTML = "✨ Özet oluşturuluyor..."; summaryEl.style.display = "block"; const prompt = `Aşağıdaki lise duyurularını oku ve tek cümlelik kısa bir özetini çıkar (en önemli 1-2 konuya odaklan). Özetin başına ✨ ikonu koy. Duyurular:\n${announcements.join("\n")}`; const summary = await callGeminiTextApi(prompt); summaryEl.innerHTML = summary; }
let currentAudio = null; let currentlyPlayingButton = null;
async function callGeminiTTSApi(text, retries = 4) {
    const url = GEMINI_API_URL_TTS;
    const payload = { contents: [{ parts: [{ text: `Türkçe olarak oku: ${text}` }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Sulafat" } } }, model: "gemini-2.5-flash-preview-tts" } };

    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            if (response.status === 429 || response.status >= 500) {
                if (retries > 0) {
                    const delay = Math.pow(2, 4 - retries) * 4000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return callGeminiTTSApi(text, retries - 1);
                } else {
                    throw new Error(`API hatası (${response.status}) (Yeniden deneme limitine ulaşıldı)`);
                }
            } else {
                const errorBody = await response.text(); throw new Error(`API hatası (${response.status})`);
            }
         }
        const result = await response.json(); const part = result?.candidates?.[0]?.content?.parts?.[0]; const audioData = part?.inlineData?.data; const mimeType = part?.inlineData?.mimeType; if (audioData && mimeType && mimeType.startsWith("audio/")) { const sampleRateMatch = mimeType.match(/rate=(\d+)/); const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000; const pcmData = base64ToArrayBuffer(audioData); const pcm16 = new Int16Array(pcmData); const wavBlob = pcmToWav(pcm16, sampleRate); return URL.createObjectURL(wavBlob); } else { throw new Error("Geçersiz ses verisi."); } } catch (error) { if (retries > 0 && error.message.includes('Retryable')) { const delay = Math.pow(2, 4 - retries) * 4000; await new Promise(resolve => setTimeout(resolve, delay)); return callGeminiTTSApi(text, retries - 1); } throw error; } }
async function playTTS(text, button) { if (currentAudio) { currentAudio.pause(); currentAudio = null; if (currentlyPlayingButton && currentlyPlayingButton !== button) { currentlyPlayingButton.innerHTML = "▶️"; currentlyPlayingButton.classList.remove("playing", "loading"); } } if (currentlyPlayingButton === button) { currentlyPlayingButton.innerHTML = "▶️"; currentlyPlayingButton.classList.remove("playing", "loading"); currentlyPlayingButton = null; return; } button.innerHTML = ""; button.classList.add("loading"); button.disabled = true; currentlyPlayingButton = button; try { const audioUrl = await callGeminiTTSApi(text); currentAudio = new Audio(audioUrl); currentAudio.onplay = () => { button.classList.remove("loading"); button.classList.add("playing"); button.innerHTML = ""; }; currentAudio.onended = () => { button.innerHTML = "▶️"; button.classList.remove("playing"); button.disabled = false; currentAudio = null; currentlyPlayingButton = null; URL.revokeObjectURL(audioUrl); }; currentAudio.onerror = (e) => { button.innerHTML = "⚠️"; button.classList.remove("loading", "playing"); button.disabled = false; currentAudio = null; currentlyPlayingButton = null; URL.revokeObjectURL(audioUrl); }; currentAudio.play(); } catch (error) { button.innerHTML = "⚠️"; button.classList.remove("loading"); button.disabled = false; currentlyPlayingButton = null; } }
function base64ToArrayBuffer(base64) { const binaryString = window.atob(base64); const len = binaryString.length; const bytes = new Uint8Array(len); for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); } return bytes.buffer; }
function pcmToWav(pcmData, sampleRate) { const numChannels = 1; const bytesPerSample = 2; const blockAlign = numChannels * bytesPerSample; const byteRate = sampleRate * blockAlign; const dataSize = pcmData.length * bytesPerSample; const buffer = new ArrayBuffer(44 + dataSize); const view = new DataView(buffer); writeString(view, 0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); writeString(view, 8, 'WAVE'); view.setUint32(12, 'fmt '.length, true); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true); view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true); view.setUint16(34, bytesPerSample * 8, true); writeString(view, 36, 'data'); view.setUint32(40, dataSize, true); let offset = 44; for (let i = 0; i < pcmData.length; i++, offset += 2) { view.setInt16(offset, pcmData[i], true); } return new Blob([view], { type: 'audio/wav' }); }
function writeString(view, offset, string) { for (let i = 0; i < string.length; i++) { view.setUint8(offset + i, string.charCodeAt(i)); } }
async function fetchWordOfTheDay() { const wordEl = document.getElementById("word-text"); wordEl.innerHTML = "Yükleniyor..."; const prompt = "Lise seviyesine uygun bir Türkçe kelime ve onun çok kısa (birkaç kelimelik) anlamını ver. Sadece 'Kelime: Anlamı' formatında yaz. Örneğin: 'Müteşekkir: Minnettar, teşekkür borçlu olan'"; const wordData = await callGeminiTextApi(prompt); const parts = wordData.split(':'); if (parts.length >= 2) { const word = parts[0].trim(); const meaning = parts.slice(1).join(':').trim(); wordEl.innerHTML = `<strong>${word}:</strong> ${meaning}`; } else { wordEl.innerText = wordData; } }


// --- SAYFA GEÇİŞ FONKSİYONLARI ---

function goToPage(pageNumber) {
    const totalPages = 3;
    if (pageNumber < 1 || pageNumber > totalPages) return;

    for (let i = 1; i <= totalPages; i++) {
        const pageEl = document.getElementById(`page${i}`);
        if(pageEl) pageEl.classList.add('hidden-page');
        const navBtn = document.getElementById(`nav-btn-${i}`);
        if (navBtn) navBtn.classList.remove('active');
    }

    document.getElementById(`page${pageNumber}`).classList.remove('hidden-page');
    const activeNavBtn = document.getElementById(`nav-btn-${pageNumber}`);
    if (activeNavBtn) activeNavBtn.classList.add('active');
    currentPage = pageNumber;
}

function manualGoToPage(pageNumber) {
    goToPage(pageNumber);
    if (pageSwitchInterval) clearInterval(pageSwitchInterval);
    startPageSwitching();
}

function startPageSwitching() {
    if (pageSwitchInterval) clearInterval(pageSwitchInterval);
    pageSwitchInterval = setInterval(() => {
        let nextPage = currentPage + 1;
        if (nextPage > 3) nextPage = 1;
        goToPage(nextPage);
    }, PAGE_SWITCH_INTERVAL);
}

// --- UYGULAMAYI BAŞLAT ---
window.currentPanoData = {};
initializeAppDisplay();
