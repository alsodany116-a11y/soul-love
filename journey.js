// Love Hunt - Relationship Journey Sequential Flow Module
import { 
  fetchSpaceUI, fetchMemories, fetchDreams, fetchGallery, fetchImportantDates, fetchGamesBySpace 
} from './storage.js';
import { applyThemeStyles, startThemeAnimation, stopThemeAnimation } from './themes.js';
function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

let currentSpaceId = null;
let activeGalleryItems = [];
let lightboxIndex = -1;
let spaceUI = {};

/**
 * Initializes and builds the Step-by-Step Relationship Journey.
 * @param {string} spaceId UUID of the love space
 */
export async function initJourney(spaceId) {
  currentSpaceId = spaceId;
  activeGalleryItems = [];
  lightboxIndex = -1;

  setupJourneyListeners();

  try {
    showToast("جاري فتح عالم ذكرياتكم السعيدة... 💖");

    // Fetch Custom UI Texts
    const data = await fetchSpaceUI(spaceId);
    spaceUI = data.uiTexts;

    // Apply custom UI texts
    hydrateJourneyTexts();

    // Fetch Game Theme & Customization and apply them
    const games = await fetchGamesBySpace(spaceId);
    if (games && games.length > 0) {
      const game = games[0];
      applyThemeStyles(game.theme, document.documentElement, game.customization);
      
      const canvas = document.getElementById('theme-canvas');
      if (canvas && game.customization && game.customization.particlesEnabled !== false) {
        startThemeAnimation(game.theme, canvas);
      } else {
        stopThemeAnimation();
      }
    }

    // Reset view to Step 1
    showStepCard(1);

    // Load Step 1 statistics & calculations
    await loadStep1Data();

  } catch (error) {
    console.error("Journey load error:", error);
    showToast("فشل تحميل مسار ذكريات الشريكين. يرجى التحديث.");
  }
}

function hydrateJourneyTexts() {
  document.getElementById('journey-title-step-1').textContent = spaceUI.step1Title;
  document.getElementById('journey-btn-next-1').innerHTML = `${spaceUI.step1Btn} <i class="fa-solid fa-arrow-left"></i>`;

  document.getElementById('journey-title-step-2').textContent = spaceUI.step2Title;
  document.getElementById('journey-btn-next-2').innerHTML = `${spaceUI.step2Btn} <i class="fa-solid fa-arrow-left"></i>`;

  document.getElementById('journey-title-step-3').textContent = spaceUI.step3Title;
  document.getElementById('journey-btn-next-3').innerHTML = `${spaceUI.step3Btn} <i class="fa-solid fa-arrow-left"></i>`;

  document.getElementById('journey-title-step-4').textContent = spaceUI.step4Title;
  document.getElementById('journey-btn-next-4').innerHTML = `${spaceUI.step4Btn || 'تاريخ لقاءاتنا ➡️'} <i class="fa-solid fa-arrow-left"></i>`;

  document.getElementById('journey-title-step-5').textContent = spaceUI.step5Title || 'تاريخ لقاءاتنا ⏳';
}

/**
 * Focuses active step panel.
 */
function showStepCard(stepNumber) {
  // Hide all steps
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`journey-step-${i}`).classList.add('hidden');
  }
  // Reveal target step
  document.getElementById(`journey-step-${stepNumber}`).classList.remove('hidden');
}

/* ============================================================================
   STEP 1: DAYS TOGETHER
   ============================================================================ */

async function loadStep1Data() {
  try {
    const dates = await fetchImportantDates(currentSpaceId);
    if (dates.length > 0) {
      // Sort to find the earliest date
      const sorted = [...dates].sort((a, b) => new Date(a.date) - new Date(b.date));
      const earliest = new Date(sorted[0].date);
      const today = new Date();
      const diffTime = Math.abs(today - earliest);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      document.getElementById('journey-stat-days').textContent = diffDays;
    } else {
      document.getElementById('journey-stat-days').textContent = 0;
    }
  } catch (err) {
    console.error(err);
  }
}

/* ============================================================================
   STEP 2: DREAMS BUCKET LIST
   ============================================================================ */

async function loadStep2Data() {
  const container = document.getElementById('journey-dreams-list');
  container.innerHTML = "";

  try {
    const dreams = await fetchDreams(currentSpaceId);

    if (dreams.length === 0) {
      container.innerHTML = `<div class="info-alert">لا توجد أحلام مسجلة في قائمة الأمنيات حالياً. يمكن للأدمن إضافتها من لوحة التحكم!</div>`;
      document.getElementById('journey-stat-dreams').textContent = "0%";
      document.getElementById('journey-dreams-progress-bar').style.width = "0%";
      return;
    }

    let achievedCount = 0;

    dreams.forEach(d => {
      if (d.isAchieved) achievedCount++;

      const item = document.createElement('div');
      item.className = `dream-item-card ${d.isAchieved ? 'achieved' : ''}`;
      item.innerHTML = `
        <div class="dream-checkbox-wrapper">
          <input type="checkbox" class="dream-checkbox-element" disabled ${d.isAchieved ? 'checked' : ''}>
        </div>
        <div class="dream-item-body">
          <h3>${escapeHTML(d.title)}</h3>
          <p>${escapeHTML(d.description || '')}</p>
        </div>
      `;
      container.appendChild(item);
    });

    const pct = Math.round((achievedCount / dreams.length) * 100);
    document.getElementById('journey-stat-dreams').textContent = `${pct}%`;
    document.getElementById('journey-dreams-progress-bar').style.width = `${pct}%`;

  } catch (err) {
    console.error(err);
  }
}

/* ============================================================================
   STEP 3: PHOTO GALLERY
   ============================================================================ */

async function loadStep3Data() {
  const grid = document.getElementById('journey-gallery-grid');
  grid.innerHTML = "";

  try {
    activeGalleryItems = await fetchGallery(currentSpaceId);

    if (activeGalleryItems.length === 0) {
      grid.innerHTML = `<div class="info-alert" style="grid-column: 1/-1;">معرض الصور فارغ حالياً. قم برفع لقطاتكم السعيدة من لوحة التحكم!</div>`;
      return;
    }

    activeGalleryItems.forEach((img, index) => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.onclick = () => openLightbox(index);
      
      const captionText = img.caption || "لحظة حب";

      card.innerHTML = `
        <div class="gallery-card-media">
          <img src="${img.url}" loading="lazy">
        </div>
        <div class="gallery-card-caption">${escapeHTML(captionText)}</div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
  }
}

function openLightbox(index) {
  if (index < 0 || index >= activeGalleryItems.length) return;
  lightboxIndex = index;
  
  const lb = document.getElementById('gallery-lightbox');
  const img = document.getElementById('lightbox-img');
  const caption = document.getElementById('lightbox-caption');

  img.src = activeGalleryItems[index].url;
  caption.textContent = activeGalleryItems[index].caption || "";

  lb.classList.remove('hidden');
}

function closeLightbox() {
  document.getElementById('gallery-lightbox').classList.add('hidden');
  lightboxIndex = -1;
}

function nextLightboxImage() {
  if (lightboxIndex === -1 || activeGalleryItems.length === 0) return;
  let next = lightboxIndex + 1;
  if (next >= activeGalleryItems.length) next = 0;
  openLightbox(next);
}

function prevLightboxImage() {
  if (lightboxIndex === -1 || activeGalleryItems.length === 0) return;
  let prev = lightboxIndex - 1;
  if (prev < 0) prev = activeGalleryItems.length - 1;
  openLightbox(prev);
}

/* ============================================================================
   STEP 4: IMPORTANT DATES
   ============================================================================ */

async function loadStep4Data() {
  const grid = document.getElementById('journey-dates-grid');
  const alertsWrapper = document.getElementById('journey-dates-alerts');
  grid.innerHTML = "";
  alertsWrapper.innerHTML = "";
  alertsWrapper.classList.add('hidden');

  try {
    const allDates = await fetchImportantDates(currentSpaceId);
    const dates = allDates.filter(d => !(d.description && d.description.includes('[milestone]')));

    if (dates.length === 0) {
      grid.innerHTML = `<div class="info-alert">لم يتم تخليد تواريخ هامة حتى الآن. حددوا مواعيد تهمكم من لوحة التحكم!</div>`;
      return;
    }

    const approachingDates = [];

    dates.forEach(d => {
      const countdown = calculateAnniversaryDays(d.date);
      
      if (countdown.daysToGo >= 0 && countdown.daysToGo <= 7) {
        approachingDates.push({
          title: d.title,
          daysLeft: countdown.daysToGo
        });
      }

      const countdownText = countdown.daysToGo === 0 ? 'اليوم! 🎉' : `متبقي ${countdown.daysToGo} يوم`;

      const card = document.createElement('div');
      card.className = 'date-item-card';
      card.innerHTML = `
        <div>
          <h3 class="date-card-title">${escapeHTML(d.title)}</h3>
          <span class="date-card-value">${formatArabicDate(d.date)}</span>
        </div>
        <div class="date-countdown-bubble">
          ${countdownText}
        </div>
      `;
      grid.appendChild(card);
    });

    // Anniversaries under 7 days alert banner
    if (approachingDates.length > 0) {
      alertsWrapper.innerHTML = `<h3><i class="fa-solid fa-bell"></i> احتفالات ومواعيد قريبة جداً 🔔</h3>`;
      approachingDates.forEach(r => {
        const item = document.createElement('div');
        item.className = 'anniversary-reminder-item';
        
        const reminderText = r.daysLeft === 0 ?
          `يقترب موعد <strong>${escapeHTML(r.title)}</strong>! إنه <strong>اليوم</strong>! خطط لمفاجأة سريعة! 🎁💖` :
          `يقترب موعد <strong>${escapeHTML(r.title)}</strong>! متبقي <strong>${r.daysLeft}</strong> أيام فقط. جهّز مفاجأة جميلة! 🎁`;

        item.innerHTML = `
          <i class="fa-solid fa-heart-circle-exclamation"></i>
          <span>${reminderText}</span>
        `;
        alertsWrapper.appendChild(item);
      });
      alertsWrapper.classList.remove('hidden');
    }
  } catch (err) {
    console.error(err);
  }
}

function calculateAnniversaryDays(rawDate) {
  const eventDate = new Date(rawDate);
  const today = new Date();
  
  today.setHours(0, 0, 0, 0);
  
  const currentYear = today.getFullYear();
  const nextOccurrence = new Date(eventDate);
  nextOccurrence.setFullYear(currentYear);
  nextOccurrence.setHours(0,0,0,0);

  if (nextOccurrence < today) {
    nextOccurrence.setFullYear(currentYear + 1);
  }

  const diffTime = nextOccurrence - today;
  const daysToGo = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return { daysToGo };
}

function formatArabicDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const year = parts[0];
  const monthIdx = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  
  const monthsAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  return `${day} ${monthsAr[monthIdx]}، ${year}`;
}

/* ============================================================================
   EVENT HANDLERS & NAVIGATION
   ============================================================================ */

function setupJourneyListeners() {
  // Step 1 Next Button
  document.getElementById('journey-btn-next-1').onclick = async () => {
    await loadStep2Data();
    showStepCard(2);
  };

  // Step 2 Next Button
  document.getElementById('journey-btn-next-2').onclick = async () => {
    await loadStep3Data();
    showStepCard(3);
  };

  // Step 3 Next Button
  document.getElementById('journey-btn-next-3').onclick = async () => {
    await loadStep4Data();
    showStepCard(4);
  };

  // Step 4 Next Button
  document.getElementById('journey-btn-next-4').onclick = async () => {
    await loadStep5Data();
    showStepCard(5);
  };

  // Step 5 Restart Button
  document.getElementById('journey-btn-restart').onclick = () => {
    showStepCard(1);
  };

  // Exit Space Button
  document.getElementById('journey-btn-logout').onclick = () => {
    if (confirm("هل تريد الخروج وإغلاق مساحة الحب الحالية؟")) {
      sessionStorage.removeItem(`unlocked_${currentSpaceId}`);
      window.location.hash = "#welcome";
    }
  };

  // Lightbox Close
  document.querySelector('.lightbox-close').onclick = closeLightbox;
  document.querySelector('.lightbox-overlay').onclick = closeLightbox;
  document.querySelector('.lightbox-next').onclick = (e) => { e.stopPropagation(); nextLightboxImage(); };
  document.querySelector('.lightbox-prev').onclick = (e) => { e.stopPropagation(); prevLightboxImage(); };

  // Keyboard navigation for lightbox
  window.onkeydown = (e) => {
    if (lightboxIndex !== -1) {
      if (e.key === 'ArrowRight') nextLightboxImage();
      if (e.key === 'ArrowLeft') prevLightboxImage();
      if (e.key === 'Escape') closeLightbox();
    }
  };
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/* ============================================================================
   STEP 5: RELATIONSHIP MILESTONES (تاريخ لقاءاتنا)
   ============================================================================ */

async function loadStep5Data() {
  const grid = document.getElementById('journey-milestones-grid');
  grid.innerHTML = "";

  try {
    const allDates = await fetchImportantDates(currentSpaceId);
    const milestones = allDates.filter(d => d.description && d.description.includes('[milestone]'));

    if (milestones.length === 0) {
      grid.innerHTML = `<div class="info-alert">لم يتم تخليد ذكريات تاريخية مضت حتى الآن. حددوا مواعيد لقاءاتكم من لوحة التحكم!</div>`;
      return;
    }

    // Sort milestones so the earliest event appears first
    const sortedMilestones = [...milestones].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedMilestones.forEach(m => {
      const durationText = calculateDurationElapsed(m.date);
      const card = document.createElement('div');
      card.className = 'date-item-card';
      card.innerHTML = `
        <div>
          <h3 class="date-card-title">${escapeHTML(m.title)}</h3>
          <span class="date-card-value">${formatArabicDate(m.date)}</span>
        </div>
        <div class="date-countdown-bubble" style="background: rgba(0, 150, 136, 0.1); color: #009688; border-color: rgba(0, 150, 136, 0.2);">
          ${durationText}
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
  }
}

function calculateDurationElapsed(dateStr) {
  const past = new Date(dateStr);
  past.setHours(0,0,0,0);
  const today = new Date();
  today.setHours(0,0,0,0);

  if (past > today) {
    return "في المستقبل";
  }

  let years = today.getFullYear() - past.getFullYear();
  let months = today.getMonth() - past.getMonth();
  let days = today.getDate() - past.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  let text = "";
  if (years > 0) {
    text += `منذ ${years} ${years === 1 ? 'سنة' : (years === 2 ? 'سنتين' : (years <= 10 ? 'سنوات' : 'سنة'))}`;
    if (months > 0) {
      text += ` و ${months} ${months === 1 ? 'شهر' : (months === 2 ? 'شهرين' : (months <= 10 ? 'أشهر' : 'شهر'))}`;
    }
  } else if (months > 0) {
    text += `منذ ${months} ${months === 1 ? 'شهر' : (months === 2 ? 'شهرين' : (months <= 10 ? 'أشهر' : 'شهر'))}`;
    if (days > 0) {
      text += ` و ${days} ${days === 1 ? 'يوم' : (days === 2 ? 'يومين' : (days <= 10 ? 'أيام' : 'يوم'))}`;
    }
  } else {
    text += `منذ ${days === 0 ? 'اليوم' : `${days} ${days === 1 ? 'يوم' : (days === 2 ? 'يومين' : (days <= 10 ? 'أيام' : 'يوم'))}`}`;
  }
  return text;
}
