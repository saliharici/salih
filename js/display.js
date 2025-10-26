// Firebase ve yardımcı fonksiyonları içe aktar
import { db } from './firebase-config.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- GLOBAL DEĞİŞKENLER VE SABİTLER ---
const DATA_COLLECTION = 'settings';
const DATA_DOCUMENT = 'config';
const DAYS = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi'];
const WEATHER_API_KEY = 'b3b242a50c07fac0813483e70144d649';
const WEATHER_CITY = 'Erzurum';

// Zamanlayıcılar için ID'ler
let pageInterval, slideshowInterval, examFactWordInterval, weatherInterval;

// --- DOM ELEMENTLERİ ---
const elements = {
    // ... (diğer elementler)
    // Hava Durumu
    weatherIcon: document.getElementById('weather-icon'),
    weatherTemp: document.getElementById('weather-temp'),
    weatherDesc: document.getElementById('weather-desc'),
    weatherAdvice: document.getElementById('weather-advice'),
    // Footer
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
    // ... (diğer widget güncelleme çağrıları)
    updateWeather(); // Hava durumunu güncelle
    // ...
}

// ... (diğer widget güncelleme fonksiyonları) ...

// --- YENİ: HAVA DURUMU FONKSİYONU ---
async function updateWeather() {
    if (!WEATHER_API_KEY || !WEATHER_CITY) {
        console.error("Hava durumu için API anahtarı veya şehir adı eksik.");
        return;
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${WEATHER_CITY}&appid=${WEATHER_API_KEY}&units=metric&lang=tr`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Hava durumu verisi alınamadı: ${response.statusText}`);
        }
        const data = await response.json();

        // Verileri HTML elementlerine yerleştir
        elements.weatherTemp.textContent = `${Math.round(data.main.temp)}°C`;
        elements.weatherDesc.textContent = data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1);

        // Hava durumu ikonunu ayarla (basit emoji ikonları)
        const iconCode = data.weather[0].icon.slice(0, -1); // '01d' -> '01'
        const weatherIcons = {
            '01': '☀️', '02': '⛅️', '03': '☁️', '04': '☁️',
            '09': '🌧️', '10': '🌦️', '11': '⛈️', '13': '❄️', '50': '🌫️'
        };
        elements.weatherIcon.textContent = weatherIcons[iconCode] || '❓';

        // Basit bir hava durumu tavsiyesi
        if (data.main.temp < 5) {
            elements.weatherAdvice.textContent = "✨ Hava çok soğuk, sıkı giyinmeyi unutmayın! ✨";
        } else if (data.weather[0].main.includes("Rain")) {
            elements.weatherAdvice.textContent = "✨ Yağmur bekleniyor, şemsiyenizi yanınıza alın! ✨";
        } else {
            elements.weatherAdvice.textContent = "✨ Bugün harika bir gün sizi bekliyor! ✨";
        }

    } catch (error) {
        console.error("Hava durumu güncellenirken hata oluştu:", error);
        elements.weatherDesc.textContent = "Veri alınamadı";
    }
}


// --- BAŞLANGIÇ ---
// ... (diğer başlangıç fonksiyonları)
updateWeather(); // Sayfa ilk yüklendiğinde hava durumunu hemen çek
weatherInterval = setInterval(updateWeather, 1000 * 60 * 60); // Saatte bir güncelle
