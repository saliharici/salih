import { db } from './firebase-config.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const pages = [
        { id: '#duty', name: 'duty', type: 'duty' },
        { id: '#exam', name: 'exam', type: 'exam' },
        { id: '#common-exam', name: 'commonExam', type: 'commonExam' },
        { id: '#schedule', name: 'schedule', type: 'schedule' },
        { id: '#teacher-schedule', name: 'teacherSchedule', type: 'teacherSchedule' },
        { id: '#image', name: 'image', type: 'image' },
        { id: '#video', name: 'video', type: 'video' },
    ];

    let availablePages = [];
    let currentIndex = 0;
    let slideInterval;

    const configRef = doc(db, "settings", "config");

    const updateDuty = (data) => {
        if (!data) return;
        document.getElementById('pazartesi').textContent = data.pazartesi || '';
        document.getElementById('sali').textContent = data.sali || '';
        document.getElementById('carsamba').textContent = data.carsamba || '';
        document.getElementById('persembe').textContent = data.persembe || '';
        document.getElementById('cuma').textContent = data.cuma || '';
    };

    const updateExam = (data) => {
        if (!data) return;
        const examContainer = document.getElementById('exam-container');
        if (!examContainer) return;
        examContainer.innerHTML = '';
        Object.entries(data).forEach(([key, value]) => {
            if (value && value.trim() !== '') {
                const p = document.createElement('p');
                p.textContent = `${key}: ${value}`;
                examContainer.appendChild(p);
            }
        });
    };

    const updateCommonExam = (data) => {
        if (!data) return;
        document.getElementById('common-exam-title').textContent = data.title || '';
        document.getElementById('common-exam-dates').textContent = data.dates || '';
    };

    const updateSchedule = (data) => {
        if (!data) return;
        const scheduleContainer = document.getElementById('schedule-container');
        if (!scheduleContainer) return;
        scheduleContainer.innerHTML = ''; // Clear previous content

        for (let i = 1; i <= 10; i++) {
            const lessonData = data[i];
            if (lessonData && (lessonData.lesson || lessonData.teacher || lessonData.group)) {
                const row = document.createElement('tr');

                const cellTime = document.createElement('td');
                cellTime.textContent = `${i}. Ders`;
                row.appendChild(cellTime);

                const cellLesson = document.createElement('td');
                cellLesson.textContent = lessonData.lesson || '-';
                row.appendChild(cellLesson);

                const cellTeacher = document.createElement('td');
                cellTeacher.textContent = lessonData.teacher || '-';
                row.appendChild(cellTeacher);

                const cellGroup = document.createElement('td');
                cellGroup.textContent = lessonData.group || '-';
                row.appendChild(cellGroup);

                scheduleContainer.appendChild(row);
            }
        }
    };

    const updateTeacherSchedule = (data) => {
        if (!data || data.length === 0) {
            document.getElementById('teacher-schedule-widget').style.display = 'none';
            return;
        }

        document.getElementById('teacher-schedule-widget').style.display = 'flex';
        const teacherSelect = document.getElementById('teacher-select');
        const scheduleList = document.getElementById('teacher-schedule-list');
        const currentTeacher = teacherSelect.value; // Mevcut seçimi koru
        teacherSelect.innerHTML = '<option value="">Öğretmen Seçiniz</option>';

        data.forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher.name;
            option.textContent = teacher.name;
            if (teacher.name === currentTeacher) {
                option.selected = true;
            }
            teacherSelect.appendChild(option);
        });

        teacherSelect.onchange = () => {
            const selectedTeacherName = teacherSelect.value;
            const selectedTeacher = data.find(t => t.name === selectedTeacherName);
            scheduleList.innerHTML = '';

            if (selectedTeacher) {
                const schedule = selectedTeacher.schedule;
                const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
                const lessons = ['1. Ders', '2. Ders', '3. Ders', '4. Ders', '5. Ders', '6. Ders', '7. Ders', '8. Ders'];

                let html = '<div class="schedule-grid-teacher">';
                html += '<div></div>'; // Köşe boşluğu
                lessons.forEach(lesson => html += `<div>${lesson}</div>`);

                days.forEach(day => {
                    html += `<div>${day}</div>`;
                    const dayKey = day.toLocaleLowerCase('en-US').replace('ş', 's').replace('ç', 'c').replace('ğ', 'g');
                    const daySchedule = schedule[dayKey] ? schedule[dayKey].split(',').map(s => s.trim()) : [];
                    for (let i = 0; i < 8; i++) {
                        html += `<div>${daySchedule[i] || '-'}</div>`;
                    }
                });

                html += '</div>';
                scheduleList.innerHTML = html;
            } else {
                scheduleList.innerHTML = '<p class="text-slate-400 col-span-full text-center">Öğretmen seçiniz...</p>';
            }
        };

        // Eğer bir öğretmen daha önce seçilmişse, değişikliği tetikle
        if (currentTeacher) {
            teacherSelect.onchange();
        }
    };

    const updateImage = (data) => {
        if (!data || !data.url) return;
        const imgElement = document.getElementById('display-image');
        if (imgElement) {
            imgElement.src = data.url;
        }
    };

    const updateVideo = (data) => {
        if (!data || !data.url) return;
        const videoElement = document.getElementById('display-video');
        const sourceElement = document.getElementById('video-source');
        if (videoElement && sourceElement) {
            sourceElement.src = data.url;
            videoElement.load(); // Load the new video source
        }
    };

    const showPage = (index) => {
        if (availablePages.length === 0) {
            // Hide all pages if none are available
            pages.forEach(p => {
                const pageEl = document.querySelector(p.id);
                if (pageEl) pageEl.style.display = 'none';
            });
            return;
        }

        // Ensure index is within bounds
        currentIndex = (index + availablePages.length) % availablePages.length;

        // Hide all pages
        pages.forEach(p => {
            const pageEl = document.querySelector(p.id);
            if (pageEl) pageEl.style.display = 'none';
        });

        // Show the target page
        const pageToShow = availablePages[currentIndex];
        const pageElement = document.querySelector(pageToShow.id);
        if (pageElement) {
            pageElement.style.display = 'block';
        }
    };

    const startSlideshow = (interval) => {
        if (slideInterval) {
            clearInterval(slideInterval);
        }
        if (interval > 0 && availablePages.length > 1) {
            slideInterval = setInterval(() => {
                showPage(currentIndex + 1);
            }, interval * 1000);
        }
    };

    onSnapshot(configRef, (docSnap) => {
        if (docSnap.exists()) {
            console.log("Veri güncellemesi alındı:", docSnap.data());
            const config = docSnap.data();

            // Update content for all sections
            if(config.duty) updateDuty(config.duty);
            if(config.exam) updateExam(config.exam);
            if(config.commonExam) updateCommonExam(config.commonExam);
            if(config.schedule) updateSchedule(config.schedule);
            if(config.teacherSchedule) updateTeacherSchedule(config.teacherSchedule);
            if(config.image) updateImage(config.image);
            if(config.video) updateVideo(config.video);

            // Determine which pages are available based on config
            availablePages = pages.filter(p => {
                const pageConfig = config[p.name];
                if (typeof pageConfig === 'object' && pageConfig !== null) {
                    // For pages like commonExam, image, video, check the 'show' flag
                    if (pageConfig.hasOwnProperty('show')) {
                        return pageConfig.show;
                    }
                    // For other pages like duty, exam, schedule, show if they exist
                    return true;
                }
                return false;
            });

            console.log("Gösterilecek sayfalar:", availablePages.map(p => p.name));

            // Reset slideshow
            showPage(currentIndex); // Show the current or first page
            startSlideshow(config.interval || 10); // Use interval from config or default to 10s

        } else {
            console.log("Yapılandırma belgesi bulunamadı!");
        }
    });

    // Manual navigation
    document.getElementById('prevBtn').addEventListener('click', () => {
        showPage(currentIndex - 1);
        // Reset interval on manual navigation to avoid quick double-change
        onSnapshot(configRef, (docSnap) => {
            if (docSnap.exists()) {
                startSlideshow(docSnap.data().interval || 10);
            }
        });
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        showPage(currentIndex + 1);
        // Reset interval on manual navigation
        onSnapshot(configRef, (docSnap) => {
            if (docSnap.exists()) {
                startSlideshow(docSnap.data().interval || 10);
            }
        });
    });
});
