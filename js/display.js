// Firebase ve yardımcı fonksiyonları içe aktar
import { db } from './firebase-config.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- GLOBAL DEĞİŞKENLER VE SABİTLER ---
const DATA_COLLECTION = 'settings';
const DATA_DOCUMENT = 'config';
const DAYS = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi'];

// Zamanlayıcılar için ID'ler
let pageInterval, slideshowInterval, examFactWordInterval;

// --- DOM ELEMENTLERİ ---
const elements = {
    schoolLogo: document.getElementById('school-logo'),
    schoolName: document.getElementById('school-name'),
    time: document.getElementById('time'),
    date: document.getElementById('date'),
    countdownTitle: document.getElementById('countdown-title'),
    countdownDays: document.getElementById('countdown-days'),
    countdownMotto: document.getElementById('countdown-motto'),
    announcementsWidget: document.getElementById('announcements-widget'),
    announcementsList: document.getElementById('announcements-list'),
    commonExamWidget: document.getElementById('common-exam-widget'),
    commonExamTitle: document.getElementById('common-exam-title'),
    commonExamList: document.getElementById('common-exam-list'),
    scheduleTitle: document.getElementById('schedule-title'),
    scheduleList: document.getElementById('schedule-list'),
    dutyList: document.getElementById('duty-list'),
    slideshowImage: document.getElementById('slideshow-image'),
    slideshowDots: document.getElementById('slideshow-dots'),
    examContent: document.getElementById('exam-content'),
    examTitle: document.getElementById('exam-title'),
    examGrades: document.getElementById('exam-grades'),
    factContent: document.getElementById('fact-content'),
    factText: document.getElementById('fact-text'),
    wordContent: document.getElementById('word-content'),
    wordText: document.getElementById('word-text'),
    scrollingText: document.getElementById('scrolling-text'),
};

// --- ANA VERİ DİNLEYİCİSİ ---
onSnapshot(doc(db, DATA_COLLECTION, DATA_DOCUMENT), (doc) => {
    if (doc.exists()) {
        console.log("Veri güncellemesi alındı.");
        updateAllWidgets(doc.data());
    } else {
        console.log("Veri bulunamadı. Pano varsayılan durumda.");
    }
});

// --- TÜM WIDGET'LARI GÜNCELLEYEN ANA FONKSİYON ---
function updateAllWidgets(data) {
    // Tüm zamanlayıcıları temizle
    [pageInterval, slideshowInterval, examFactWordInterval].forEach(clearInterval);

    // Her bir widget için güncelleme fonksiyonunu çağır
    updateHeader(data.general);
    updateFooter(data.general);
    updateCountdown(data.general);
    updateAnnouncementsAndExams(data.media, data.commonExam);
    updateDuty(data.duty);
    updateSchedule(data.schedule);
    updateSlideshow(data.media);
    updateExamFactWord(data.exam, data.general);

    // Zamanlayıcıları yeniden başlat
    startPageRotation();
}

// --- WIDGET GÜNCELLEME FONKSİYONLARI (YENİ VERİ YAPISINA GÖRE) ---

function updateHeader(general = {}) {
    elements.schoolName.textContent = general.schoolName || 'Okul Adı';
    if (general.logoUrl) {
        elements.schoolLogo.src = general.logoUrl;
        elements.schoolLogo.style.display = 'block';
    } else {
        elements.schoolLogo.style.display = 'none';
    }
}

function updateFooter(general = {}) {
    elements.scrollingText.textContent = general.scrollingText || 'Okul duyuru panosuna hoş geldiniz.';
    elements.scrollingText.style.color = general.scrollingTextColor || '#FFFFFF';
    elements.scrollingText.style.fontSize = (general.scrollingTextSize || 24) + 'px';
}

function updateCountdown(general = {}) {
    elements.countdownTitle.textContent = general.countdownName || 'ÖNEMLİ TARİH';
    const countdownDate = general.countdownDate;

    // Eski interval'ı temizle
    if (window.countdownInterval) clearInterval(window.countdownInterval);

    if (countdownDate) {
        const targetDate = new Date(countdownDate).getTime();
        const update = () => {
            const distance = targetDate - new Date().getTime();
            if (distance < 0) {
                elements.countdownDays.textContent = '00';
                elements.countdownMotto.textContent = '✨ Vakit geldi! ✨';
                clearInterval(window.countdownInterval);
            } else {
                elements.countdownDays.textContent = String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0');
            }
        };
        update();
        window.countdownInterval = setInterval(update, 1000 * 60 * 60); // Saatte bir güncellemek yeterli
    } else {
        elements.countdownDays.textContent = '??';
        elements.countdownMotto.textContent = 'Tarih belirlenmedi.';
    }
}

function updateAnnouncementsAndExams(media = {}, commonExam = {}) {
    if (commonExam.show) {
        elements.commonExamWidget.style.display = 'flex';
        elements.announcementsWidget.style.display = 'none';
        elements.commonExamTitle.textContent = commonExam.title || 'Ortak Sınav Takvimi';
        const exams = (commonExam.dates || '').split('\n').filter(Boolean);
        elements.commonExamList.innerHTML = exams.length ? exams.map(exam => {
            const [date, grade, course] = exam.split(',');
            return `<div class="exam-item"><span class="exam-date">${date||''}</span><span class="exam-details">${grade||''} - ${course||''}</span></div>`;
        }).join('') : '<li>Sınav takvimi girilmedi.</li>';
    } else {
        elements.commonExamWidget.style.display = 'none';
        elements.announcementsWidget.style.display = 'flex';
        const announcements = (media.announcements || '').split('\n').filter(Boolean);
        elements.announcementsList.innerHTML = announcements.length ? announcements.map(ann => `<li>${ann}</li>`).join('') : '<li>Duyuru yok.</li>';
    }
}

function updateDuty(duty = {}) {
    const today = DAYS[new Date().getDay()];
    const dutyData = (duty[today] || '').split('\n').filter(Boolean);
    elements.dutyList.innerHTML = dutyData.length ? dutyData.map(line => {
        const [place, teacher] = line.split(',');
        return `<li><strong>${place||''}:</strong> ${teacher||''}</li>`;
    }).join('') : '<li>Bugün için nöbetçi bilgisi girilmedi.</li>';
}

function updateSchedule(schedule = {}) {
    const today = DAYS[new Date().getDay()];
    const todaySchedule = schedule[today] || {};
    elements.scheduleTitle.textContent = `📚 Ders Programı (${today.charAt(0).toUpperCase() + today.slice(1)})`;
    const scheduleEntries = Object.entries(todaySchedule).filter(([_, lessons]) => lessons);
    elements.scheduleList.innerHTML = scheduleEntries.length ? scheduleEntries.map(([className, lessons]) => {
        const lessonSpans = (lessons || '').split(',').map(l => `<span>${l.trim()}</span>`).join('');
        return `<div class="p-2 bg-slate-800 rounded"><strong class="block text-blue-300 mb-1">${className.replace(/-/g, ' ')}</strong><div class="grid grid-cols-4 gap-1 text-sm">${lessonSpans}</div></div>`;
    }).join('') : '<p class="text-slate-400 col-span-full text-center">Bugün için ders programı bulunamadı.</p>';
}

function updateSlideshow(media = {}) {
    const images = (media.slideshowImages || '').split('\n').filter(Boolean);
    if (!images.length) {
        elements.slideshowImage.src = 'https://placehold.co/1000x800/37474F/ECEFF1?text=Resim+Yok';
        elements.slideshowDots.innerHTML = '';
        return;
    }
    let currentSlide = 0;
    elements.slideshowDots.innerHTML = images.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}"></span>`).join('');
    const dots = elements.slideshowDots.querySelectorAll('.dot');
    const showNextSlide = () => {
        currentSlide = (currentSlide + 1) % images.length;
        elements.slideshowImage.style.opacity = 0;
        setTimeout(() => {
            elements.slideshowImage.src = images[currentSlide];
            elements.slideshowImage.style.opacity = 1;
            dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
        }, 500);
    };
    elements.slideshowImage.src = images[0];
    slideshowInterval = setInterval(showNextSlide, 7000);
}

function updateExamFactWord(exam = {}, general = {}) {
    elements.examTitle.textContent = exam.title || 'Sınav Başarısı';
    elements.examGrades.innerHTML = ['9', '10', '11', '12'].map(grade => {
        const students = (exam[grade] || '').split('\n').filter(Boolean);
        return students.length ? `<div class="mb-2"><strong class="text-amber-300">${grade}. Sınıflar</strong>${students.map(s => `<p>${s.replace(',', ' - ')}</p>`).join('')}</div>` : '';
    }).join('');

    // AI Özellikleri için yer tutucular
    elements.factText.textContent = general.factOfTheDay || "Günün bilgisi AI tarafından oluşturulacak.";
    elements.wordText.innerHTML = (general.wordOfTheDay || "Günün Kelimesi:İstikbal,Anlamı:Gelecek").replace(':', '</strong><br/>').replace('Anlamı','<br/><strong>Anlamı</strong>');

    let currentWidget = 0;
    const widgets = [elements.examContent, elements.factContent, elements.wordContent];
    const rotate = () => {
        widgets[currentWidget].classList.add('opacity-0');
        currentWidget = (!general.showFactOfTheDay) ? 0 : (currentWidget + 1) % widgets.length;
        setTimeout(() => widgets.forEach((w, i) => w.classList.toggle('opacity-0', i !== currentWidget)), 500);
    };
    examFactWordInterval = setInterval(rotate, 8000);
}

// --- YARDIMCI FONKSİYONLAR ---
function updateClock() {
    const now = new Date();
    elements.time.textContent = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    elements.date.textContent = now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

let currentPage = 1;
function goToPage(pageNumber) {
    document.querySelectorAll('.page-container').forEach(p => p.classList.add('hidden-page'));
    document.getElementById(`page${pageNumber}`)?.classList.remove('hidden-page');
    document.querySelectorAll('.page-nav-button').forEach((btn, i) => btn.classList.toggle('active', i + 1 === pageNumber));
    currentPage = pageNumber;
}

function startPageRotation() {
    pageInterval = setInterval(() => goToPage((currentPage % 3) + 1), 15000);
}

window.manualGoPage = (pageNumber) => {
    clearInterval(pageInterval);
    goToPage(pageNumber);
    startPageRotation();
};

// --- BAŞLANGIÇ ---
updateClock();
setInterval(updateClock, 1000);
goToPage(1);
console.log("display.js başarıyla yüklendi.");
