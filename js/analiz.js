import { db } from './firebase-config.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('menu');
    const content = document.getElementById('content');
    const defaultConfig = {
        'ogrenme-etkililigi': { title: 'Öğrenme Etkililiği', text: 'İçerik bekleniyor...' },
        'kullanici-memnuniyeti': { title: 'Kullanıcı Memnuniyeti', text: 'İçerik bekleniyor...' },
        'zaman-ve-sure-yonetimi': { title: 'Zaman ve Süre Yönetimi', text: 'İçerik bekleniyor...' },
        'teknoloji-kullanilabilirligi': { title: 'Teknoloji Kullanılabilirliği', text: 'İçerik bekleniyor...' },
        'icerik-kalitesi': { title: 'İçerik Kalitesi', text: 'İçerik bekleniyor...' },
        'egitmen-destegi': { title: 'Eğitmen Desteği', text: 'İçerik bekleniyor...' },
        'bilissel-yuk': { title: 'Bilişsel Yük', text: 'İçerik bekleniyor...' },
        'erisilebilirlik-ve-esneklik': { title: 'Erişilebilirlik ve Esneklik', text: 'İçerik bekleniyor...' },
        'motivasyon-ve-katilim': { title: 'Motivasyon ve Katılım', text: 'İçerik bekleniyor...' },
        'oz-yeterlik': { title: 'Öz-Yeterlik', text: 'İçerik bekleniyor...' },
        'is-yeri-uygunlugu': { title: 'İş Yeri Uygunluğu', text: 'İçerik bekleniyor...' },
        'ogrenme-transferi': { title: 'Öğrenme Transferi', text: 'İçerik bekleniyor...' },
    };
    let analysisContent = defaultConfig;

    const configRef = doc(db, "settings", "config");

    onSnapshot(configRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().analysis) {
            analysisContent = { ...defaultConfig, ...docSnap.data().analysis };
             console.log("Analiz verisi Firestore'dan yüklendi.");
        } else {
            console.log("Firestore'da analiz verisi bulunamadı, varsayılan içerik kullanılıyor.");
        }
    });

    menu.addEventListener('click', (e) => {
        e.preventDefault();
        const link = e.target.closest('a');
        if (!link) return;

        document.querySelectorAll('#menu a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');

        const sectionId = new URL(link.href).hash.substring(1);
        const sectionData = analysisContent[sectionId];

        if (sectionData) {
            content.innerHTML = `
                <h1 class="text-3xl font-bold mb-2">${sectionData.title}</h1>
                <p class="text-gray-600 mb-4">Hazırlayan: Salih ARICIOĞLU | Danışman: Prof. Dr. Aslan GÜLCÜ</p>
                <div>${sectionData.text.replace(/\n/g, '<br>')}</div>
            `;
        } else {
             content.innerHTML = `
                <h1 class="text-3xl font-bold mb-2">İçerik Bulunamadı</h1>
                 <p>Bu bölüme ait içerik henüz eklenmemiş.</p>
            `;
        }
    });
});
