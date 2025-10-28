// Firebase servislerini ve yardımcı fonksiyonları içe aktar
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- GLOBAL DEĞİŞKENLER VE ELEMENTLER ---
const DATA_COLLECTION = 'settings';
const DATA_DOCUMENT = 'config';
const adminForm = document.getElementById('admin-form');
const loadingSpinner = document.getElementById('loading-spinner');
const statusMessage = document.getElementById('status-message');
const saveAllBtn = document.getElementById('save-all-btn');
const logoutBtn = document.getElementById('logout-btn');
const toastContainer = document.getElementById('toast-container');

// --- KİMLİK DOĞRULAMA ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Admin paneline giriş yapıldı:", user.email);
        loadData();
    } else {
        window.location.href = 'login.html';
    }
});

// --- VERİ YÖNETİMİ ---

/**
 * Formdaki tüm inputları okur ve yapılandırılmış bir JS nesnesi oluşturur.
 * @returns {object} Kaydedilecek veri nesnesi.
 */
function buildDataObject() {
    const data = {
        general: {},
        duty: {},
        exam: {},
        schedule: { pazartesi: {}, sali: {}, carsamba: {}, persembe: {}, cuma: {} },
        media: {},
        commonExam: {}
    };

    // Genel Ayarlar
    data.general.schoolName = document.getElementById('schoolName')?.value;
    data.general.logoUrl = document.getElementById('logoUrl')?.value;
    data.general.countdownName = document.getElementById('countdownName')?.value;
    data.general.countdownDate = document.getElementById('countdownDate')?.value;
    data.general.scrollingText = document.getElementById('scrollingText')?.value;
    data.general.scrollingTextColor = document.getElementById('scrollingTextColor')?.value;
    data.general.scrollingTextSize = document.getElementById('scrollingTextSize')?.value;
    data.general.showFactOfTheDay = document.getElementById('showFactOfTheDay')?.checked;

    // Nöbetçi Öğretmenler
    const days = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma'];
    days.forEach(day => {
        data.duty[day] = document.getElementById(`duty-${day}`)?.value;
    });

    // Sınav Başarısı
    data.exam.title = document.getElementById('examTitle')?.value;
    ['9', '10', '11', '12'].forEach(grade => {
        data.exam[grade] = document.getElementById(`exam-${grade}`)?.value;
    });

    // Ders Programı (İç içe geçmiş yapı)
    days.forEach(day => {
        const dayInputs = adminForm.querySelectorAll(`input[id^="${day}-"]`);
        dayInputs.forEach(input => {
            const className = input.id.replace(`${day}-`, '');
            data.schedule[day][className] = input.value;
        });
    });

    // Duyuru ve Medya
    data.media.announcements = document.getElementById('announcements')?.value;
    data.media.slideshowImages = document.getElementById('slideshowImages')?.value;

    // Ortak Sınavlar
    data.commonExam.show = document.getElementById('showCommonExams')?.checked;
    data.commonExam.title = document.getElementById('commonExamTitle')?.value;
    data.commonExam.dates = document.getElementById('commonExamDates')?.value;

    // Öğretmen Ders Programı
    data.teacherSchedule = [];
    const teacherScheduleContainer = document.getElementById('teacher-schedule-container');
    teacherScheduleContainer.querySelectorAll('.teacher-schedule-entry').forEach(entry => {
        const teacherData = {
            name: entry.querySelector('input[data-type="name"]').value,
            schedule: {
                pazartesi: entry.querySelector('input[data-day="pazartesi"]').value,
                sali: entry.querySelector('input[data-day="sali"]').value,
                carsamba: entry.querySelector('input[data-day="carsamba"]').value,
                persembe: entry.querySelector('input[data-day="persembe"]').value,
                cuma: entry.querySelector('input[data-day="cuma"]').value,
            }
        };
        if (teacherData.name) { // Sadece ismi olan öğretmenleri kaydet
            data.teacherSchedule.push(teacherData);
        }
    });

    return data;
}

/**
 * Veri nesnesini alır ve formdaki alanları doldurur.
 * @param {object} data - Firestore'dan gelen veri.
 */
function populateForm(data) {
    // Genel
    if (data.general) {
        document.getElementById('schoolName').value = data.general.schoolName || '';
        document.getElementById('logoUrl').value = data.general.logoUrl || '';
        document.getElementById('countdownName').value = data.general.countdownName || '';
        document.getElementById('countdownDate').value = data.general.countdownDate || '';
        document.getElementById('scrollingText').value = data.general.scrollingText || '';
        document.getElementById('scrollingTextColor').value = data.general.scrollingTextColor || '#FFFFFF';
        document.getElementById('scrollingTextSize').value = data.general.scrollingTextSize || '24';
        document.getElementById('showFactOfTheDay').checked = data.general.showFactOfTheDay || false;
        document.getElementById('scrollingTextSizeValue').textContent = (data.general.scrollingTextSize || '24') + 'px';
    }
    // Nöbet
    if (data.duty) {
        Object.keys(data.duty).forEach(day => {
            document.getElementById(`duty-${day}`).value = data.duty[day] || '';
        });
    }
    // Sınav
    if (data.exam) {
        document.getElementById('examTitle').value = data.exam.title || '';
        ['9', '10', '11', '12'].forEach(grade => {
            document.getElementById(`exam-${grade}`).value = data.exam[grade] || '';
        });
    }
    // Ders Programı
    if (data.schedule) {
        Object.keys(data.schedule).forEach(day => {
            Object.keys(data.schedule[day]).forEach(className => {
                const inputId = `${day}-${className}`;
                const input = document.getElementById(inputId);
                if (input) {
                    input.value = data.schedule[day][className] || '';
                }
            });
        });
    }
    // Medya
    if (data.media) {
        document.getElementById('announcements').value = data.media.announcements || '';
        document.getElementById('slideshowImages').value = data.media.slideshowImages || '';
    }
    // Ortak Sınav
    if (data.commonExam) {
        document.getElementById('showCommonExams').checked = data.commonExam.show || false;
        document.getElementById('commonExamTitle').value = data.commonExam.title || '';
        document.getElementById('commonExamDates').value = data.commonExam.dates || '';
    }
     // Öğretmen Ders Programı
    if (data.teacherSchedule) {
        const container = document.getElementById('teacher-schedule-container');
        container.innerHTML = ''; // Konteyneri temizle
        data.teacherSchedule.forEach(teacher => {
            addTeacherScheduleEntry(teacher);
        });
    }
}


async function loadData() {
    statusMessage.textContent = 'Veriler yükleniyor...';
    try {
        const docRef = doc(db, DATA_COLLECTION, DATA_DOCUMENT);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log("Veritabanından veriler başarıyla yüklendi.");
            populateForm(docSnap.data());
        } else {
            console.log("Veritabanında kayıtlı veri bulunamadı.");
        }
    } catch (error) {
        console.error("Veri yüklenirken hata oluştu:", error);
        showToast('Veriler yüklenirken bir hata oluştu!', 'error');
    } finally {
        loadingSpinner.style.display = 'none';
        adminForm.style.display = 'block';
    }
}

saveAllBtn.addEventListener('click', async () => {
    saveAllBtn.disabled = true;
    saveAllBtn.textContent = 'Kaydediliyor...';

    const dataToSave = buildDataObject();

    try {
        await setDoc(doc(db, DATA_COLLECTION, DATA_DOCUMENT), dataToSave);
        console.log("Tüm veriler başarıyla kaydedildi.");
        showToast('Tüm ayarlar başarıyla kaydedildi!', 'success');
    } catch (error) {
        console.error("Veri kaydedilirken hata oluştu:", error);
        showToast('Ayarlar kaydedilemedi!', 'error');
    } finally {
        saveAllBtn.disabled = false;
        saveAllBtn.textContent = 'Kaydet';
    }
});


// --- ARAYÜZ İŞLEVLERİ (DEĞİŞİKLİK YOK) ---
window.showTab = function(tabName) {
    document.querySelectorAll('.form-section').forEach(section => section.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    document.getElementById('nav-' + tabName).classList.add('active');
}

logoutBtn.addEventListener('click', () => {
    signOut(auth).catch((error) => console.error("Çıkış hatası:", error));
});

adminForm.addEventListener('input', (e) => {
    if (e.target.type === 'range') {
        document.getElementById(e.target.id + 'Value').textContent = e.target.value + 'px';
    }
});

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 5000);
}

// --- ÖĞRETMEN PROGRAMI DINAMIK FORM ---
document.getElementById('add-teacher-btn').addEventListener('click', () => {
    addTeacherScheduleEntry(); // Boş yeni bir giriş ekle
});

function addTeacherScheduleEntry(teacher = null) {
    const container = document.getElementById('teacher-schedule-container');
    const entryId = `teacher-${Date.now()}`;
    const entryDiv = document.createElement('div');
    entryDiv.className = 'teacher-schedule-entry';
    entryDiv.id = entryId;

    const teacherName = teacher ? teacher.name : '';
    const schedule = teacher ? teacher.schedule : {};

    entryDiv.innerHTML = `
        <div class="teacher-schedule-header">
            <input type="text" placeholder="Öğretmen Adı Soyadı" value="${teacherName}" data-type="name" class="teacher-name-input">
            <button class="btn-danger-small" onclick="document.getElementById('${entryId}').remove()">Kaldır</button>
        </div>
        <div class="teacher-schedule-grid">
            <input type="text" placeholder="Pazartesi Dersleri" value="${schedule.pazartesi || ''}" data-day="pazartesi">
            <input type="text" placeholder="Salı Dersleri" value="${schedule.sali || ''}" data-day="sali">
            <input type="text" placeholder="Çarşamba Dersleri" value="${schedule.carsamba || ''}" data-day="carsamba">
            <input type="text" placeholder="Perşembe Dersleri" value="${schedule.persembe || ''}" data-day="persembe">
            <input type="text" placeholder="Cuma Dersleri" value="${schedule.cuma || ''}" data-day="cuma">
        </div>
    `;
    container.appendChild(entryDiv);
}



// --- EXCEL YÜKLEME ---
// Nöbet/Sınav Yükleyici
document.getElementById('excelUploadNobet').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleExcelUpload(file, {
            'Nobet': (data) => {
                document.getElementById('duty-pazartesi').value = formatExcelColumn(data, 'Pazartesi');
                document.getElementById('duty-sali').value = formatExcelColumn(data, 'Salı');
                document.getElementById('duty-carsamba').value = formatExcelColumn(data, 'Çarşamba');
                document.getElementById('duty-persembe').value = formatExcelColumn(data, 'Perşembe');
                document.getElementById('duty-cuma').value = formatExcelColumn(data, 'Cuma');
            },
            'Sinav': (data) => {
                document.getElementById('exam-9').value = formatExcelColumn(data, '9. Sınıflar');
                document.getElementById('exam-10').value = formatExcelColumn(data, '10. Sınıflar');
                document.getElementById('exam-11').value = formatExcelColumn(data, '11. Sınıflar');
                document.getElementById('exam-12').value = formatExcelColumn(data, '12. Sınıflar');
            }
        });
        e.target.value = ''; // Input'u temizle
    }
});

// Ders Programı Yükleyici
document.getElementById('excelUploadProgram').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleExcelUpload(file, {
            'Program': (data) => {
                const days = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma'];
                days.forEach(day => {
                    data.forEach(row => {
                        const className = row['Sınıf'];
                        const lessons = row[day.charAt(0).toUpperCase() + day.slice(1)];
                        if (className && lessons) {
                            const inputId = `${day}-${className.replace(/ /g, '-')}`;
                            const input = document.getElementById(inputId);
                            if (input) {
                                input.value = lessons;
                            }
                        }
                    });
                });
            }
        });
        e.target.value = '';
    }
});

// Ortak Sınav Yükleyici
document.getElementById('excelUploadOrtakSinav').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleExcelUpload(file, {
            'OrtakSinav': (data) => {
                document.getElementById('commonExamDates').value = formatExcelColumn(data, 'Tarih,Sınıf,Ders');
            }
        });
        e.target.value = '';
    }
});


function handleExcelUpload(file, sheetHandlers) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            Object.keys(sheetHandlers).forEach(sheetName => {
                if (workbook.SheetNames.includes(sheetName)) {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    sheetHandlers[sheetName](jsonData);
                } else {
                    showToast(`Excel dosyasında "${sheetName}" sayfası bulunamadı.`, 'error');
                }
            });
            showToast('Excel verileri başarıyla forma aktarıldı!', 'success');
        } catch (error) {
            console.error("Excel okuma hatası:", error);
            showToast('Excel dosyası okunurken bir hata oluştu.', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

// Excel'den gelen JSON verisini "Değer1,Değer2\n" formatına çevirir
function formatExcelColumn(data, columnName) {
    return data
        .map(row => row[columnName])
        .filter(Boolean) // Boş veya undefined değerleri atla
        .join('\n');
}


// --- AI YARDIMCI FONKSİYONLARI (PLACEHOLDER) ---
document.getElementById('gemini-marquee-btn')?.addEventListener('click', () => showToast('AI özelliği yakında eklenecek.', 'info'));
document.getElementById('gemini-announcement-btn')?.addEventListener('click', () => showToast('AI özelliği yakında eklenecek.', 'info'));
document.getElementById('gemini-image-btn')?.addEventListener('click', () => showToast('AI özelliği yakında eklenecek.', 'info'));
window.generateDutyReminder = () => showToast('AI özelliği yakında eklenecek.', 'info');
