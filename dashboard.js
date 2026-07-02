// Love Hunt - Relationship Dashboard Module
import { getSupabase } from './config.js';
import { 
  fetchMemories, saveMemory, deleteMemory,
  fetchDreams, saveDream, toggleDreamAchieved, deleteDream,
  fetchGallery, saveGalleryItem, deleteGalleryItem,
  fetchImportantDates, saveImportantDate, deleteImportantDate,
  fetchGamesBySpace, uploadMedia
} from './storage.js';
import { applyThemeStyles, startThemeAnimation } from './themes.js';
import { showToast } from './creator.js';
import { getLang } from './i18n.js';

let currentSpaceId = null;
let activeGalleryItems = [];
let lightboxIndex = -1;

/**
 * Initializes and builds the Couple Dashboard.
 * @param {string} spaceId UUID of the love space
 */
export async function initDashboard(spaceId) {
  currentSpaceId = spaceId;
  activeGalleryItems = [];
  lightboxIndex = -1;

  setupDashboardListeners();

  try {
    const loadingMsg = getLang() === 'ar' ? "جاري فتح عالم الحب الخاص بكما..." : "Opening your private world...";
    showToast(loadingMsg);

    // Fetch theme configurations from the active game
    const games = await fetchGamesBySpace(spaceId);
    let themeName = 'rose_garden';
    let overrides = {};

    if (games && games.length > 0) {
      themeName = games[0].theme || 'rose_garden';
      overrides = games[0].customization || {};
    }

    // Apply space styles
    applyThemeStyles(themeName, document.documentElement, overrides);

    // Apply space particles
    const canvas = document.getElementById('theme-canvas');
    if (overrides.particlesEnabled !== false) {
      startThemeAnimation(themeName, canvas);
    }

    // Load Stats and all Pane elements
    await refreshDashboardStats(games);
    await loadMemoriesPane();
    await loadDreamsPane();
    await loadGalleryPane();
    await loadDatesPane();

  } catch (error) {
    console.error("Dashboard initialize error:", error);
    showToast(getLang() === 'ar' ? "فشل فتح لوحة التحكم. أعد المحاولة." : "Failed to load dashboard. Try refreshing.");
  }
}

/**
 * Recalculates metrics for the top dashboard status HUD.
 */
async function refreshDashboardStats(gamesList) {
  let games = gamesList;
  if (!games) {
    games = await fetchGamesBySpace(currentSpaceId);
  }

  // 1. Games Solved
  const completedCount = games.reduce((acc, g) => acc + (g.completions || 0), 0);
  document.getElementById('dash-stat-completed').textContent = completedCount;

  // 2. Dreams Fulfilled
  const dreams = await fetchDreams(currentSpaceId);
  if (dreams.length > 0) {
    const achieved = dreams.filter(d => d.isAchieved).length;
    const pct = Math.round((achieved / dreams.length) * 100);
    document.getElementById('dash-stat-dreams').textContent = `${pct}%`;
  } else {
    document.getElementById('dash-stat-dreams').textContent = `0%`;
  }

  // 3. Days Together (Calculated from earliest date in database)
  const dates = await fetchImportantDates(currentSpaceId);
  if (dates.length > 0) {
    const sorted = [...dates].sort((a, b) => new Date(a.date) - new Date(b.date));
    const earliest = new Date(sorted[0].date);
    const today = new Date();
    const diffTime = Math.abs(today - earliest);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    document.getElementById('dash-stat-days').textContent = diffDays;
  } else {
    document.getElementById('dash-stat-days').textContent = 0;
  }
}

/* ============================================================================
   MEMORIES TIMELINE PANE
   ============================================================================ */

async function loadMemoriesPane() {
  const container = document.getElementById('dashboard-memories-container');
  container.innerHTML = "";

  try {
    const memories = await fetchMemories(currentSpaceId);
    
    if (memories.length === 0) {
      const alertMsg = getLang() === 'ar' ? 
        "لا توجد ذكريات محفوظة بعد. اضغط على 'إضافة ذكرى جديدة' لتسجيل لحظاتكما الجميلة!" : 
        "No memories stored yet. Click 'Add Memory' to log your first sweet moment!";
      container.innerHTML = `<div class="info-alert">${alertMsg}</div>`;
      return;
    }

    memories.forEach(m => {
      const card = document.createElement('div');
      card.className = 'memory-timeline-card fade-in';
      card.innerHTML = `
        <div class="memory-card-inner">
          ${m.photoUrl ? `
            <div class="memory-card-media">
              <img src="${m.photoUrl}" alt="${escapeHTML(m.title)}">
            </div>
          ` : ''}
          <div class="memory-card-header">
            <div>
              <h3 class="memory-card-title">${escapeHTML(m.title)}</h3>
              <span class="memory-card-date">${formatDisplayDate(m.date)}</span>
            </div>
            <button class="btn-delete memory-btn-delete" data-id="${m.id}" title="Remove memory"><i class="fa-solid fa-trash-can"></i></button>
          </div>
          <p class="memory-card-text">${escapeHTML(m.description)}</p>
        </div>
      `;
      container.appendChild(card);
    });

    // Delete Memory listener
    document.querySelectorAll('.memory-btn-delete').forEach(btn => {
      btn.onclick = async () => {
        const deleteConfirm = getLang() === 'ar' ? "هل تريد حذف هذه الذكرى نهائياً؟" : "Delete this memory forever?";
        if (confirm(deleteConfirm)) {
          const id = btn.getAttribute('data-id');
          await deleteMemory(id);
          showToast(getLang() === 'ar' ? "تم حذف الذكرى." : "Memory deleted.");
          loadMemoriesPane();
        }
      };
    });
  } catch (error) {
    console.error("Load memories failed:", error);
  }
}

/* ============================================================================
   DREAMS BUCKET LIST PANE
   ============================================================================ */

async function loadDreamsPane() {
  const container = document.getElementById('dashboard-dreams-list');
  container.innerHTML = "";

  try {
    const dreams = await fetchDreams(currentSpaceId);

    if (dreams.length === 0) {
      const alertMsg = getLang() === 'ar' ? 
        "لم تقم بإضافة أحلام مشتركة بعد. اضغط على 'إضافة حلم جديد' لرسم مستقبلكم!" : 
        "No shared dreams listed yet. Click 'Add Dream' to map out your future!";
      container.innerHTML = `<div class="info-alert">${alertMsg}</div>`;
      return;
    }

    dreams.forEach(d => {
      const item = document.createElement('div');
      item.className = `dream-item-card ${d.isAchieved ? 'achieved' : ''} fade-in`;
      item.id = `dream-card-${d.id}`;
      item.innerHTML = `
        <div class="dream-checkbox-wrapper">
          <input type="checkbox" class="dream-checkbox-element" data-id="${d.id}" ${d.isAchieved ? 'checked' : ''}>
        </div>
        <div class="dream-item-body">
          <h3 class="dream-item-title">${escapeHTML(d.title)}</h3>
          <p class="dream-item-desc" style="font-size: 0.9rem; color: #666; margin-bottom: 0;">${escapeHTML(d.description || '')}</p>
        </div>
        <div class="dream-item-actions">
          <button class="btn-delete dream-btn-delete" data-id="${d.id}" title="Delete goal"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `;
      container.appendChild(item);
    });

    // Checkbox changed listener
    document.querySelectorAll('.dream-checkbox-element').forEach(chk => {
      chk.onchange = async (e) => {
        const id = chk.getAttribute('data-id');
        const checked = chk.checked;
        const card = document.getElementById(`dream-card-${id}`);

        await toggleDreamAchieved(id, checked);

        if (checked) {
          card.classList.add('achieved', 'spark-explosion');
          showToast(getLang() === 'ar' ? "لقد حققتم أحد أحلامكم المشتركة! 🌟" : "Dream fulfilled! 🌟");
          if (typeof window.confetti === 'function') {
            window.confetti({ particleCount: 30, spread: 40 });
          }
          setTimeout(() => card.classList.remove('spark-explosion'), 600);
        } else {
          card.classList.remove('achieved');
        }

        refreshDashboardStats();
      };
    });

    // Delete Dream listener
    document.querySelectorAll('.dream-btn-delete').forEach(btn => {
      btn.onclick = async () => {
        const deleteConfirm = getLang() === 'ar' ? "هل تريد إزالة هذا الحلم من قائمة الأمنيات؟" : "Remove this dream from your bucket list?";
        if (confirm(deleteConfirm)) {
          const id = btn.getAttribute('data-id');
          await deleteDream(id);
          showToast(getLang() === 'ar' ? "تم حذف الحلم." : "Dream deleted.");
          loadDreamsPane();
          refreshDashboardStats();
        }
      };
    });
  } catch (error) {
    console.error(error);
  }
}

/* ============================================================================
   PHOTO GALLERY PANE
   ============================================================================ */

async function loadGalleryPane() {
  const grid = document.getElementById('dashboard-gallery-grid');
  grid.innerHTML = "";

  try {
    activeGalleryItems = await fetchGallery(currentSpaceId);

    if (activeGalleryItems.length === 0) {
      const alertMsg = getLang() === 'ar' ? 
        "معرض الصور فارغ. ارفعوا أجمل لقطاتكم معاً!" : 
        "Gallery is empty. Upload your favorite snapshots together!";
      grid.innerHTML = `<div class="info-alert">${alertMsg}</div>`;
      return;
    }

    activeGalleryItems.forEach((img, index) => {
      const card = document.createElement('div');
      card.className = 'gallery-card fade-in';
      card.onclick = () => openLightbox(index);
      
      const captionText = img.caption || (getLang() === 'ar' ? "لحظة حب" : "Moment");

      card.innerHTML = `
        <div class="gallery-card-media">
          <img src="${img.url}" alt="${escapeHTML(img.caption || '')}" loading="lazy">
        </div>
        <div class="gallery-card-caption">${escapeHTML(captionText)}</div>
        <div class="gallery-card-footer" onclick="event.stopPropagation();">
          <button class="btn-delete gallery-btn-delete" data-id="${img.id}" title="Delete photo"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `;
      grid.appendChild(card);
    });

    // Delete Photo listener
    document.querySelectorAll('.gallery-btn-delete').forEach(btn => {
      btn.onclick = async (e) => {
        const deleteConfirm = getLang() === 'ar' ? "هل تريد إزالة هذه الصورة من المعرض؟" : "Delete this photo from your gallery?";
        if (confirm(deleteConfirm)) {
          const id = btn.getAttribute('data-id');
          await deleteGalleryItem(id);
          showToast(getLang() === 'ar' ? "تم حذف الصورة." : "Photo deleted.");
          loadGalleryPane();
        }
      };
    });
  } catch (error) {
    console.error(error);
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
   IMPORTANT DATES & COUNTDOWNS PANE
   ============================================================================ */

async function loadDatesPane() {
  const grid = document.getElementById('dashboard-dates-grid');
  const remindersWrapper = document.getElementById('dash-date-reminders');
  grid.innerHTML = "";
  remindersWrapper.innerHTML = "";
  remindersWrapper.classList.add('hidden');

  try {
    const dates = await fetchImportantDates(currentSpaceId);

    if (dates.length === 0) {
      const alertMsg = getLang() === 'ar' ? 
        "لا توجد مواعيد مثبتة بعد. حدد تواريخ ميلادكم، لقائكم الأول، أو أعيادكم المميزة!" : 
        "No dates tracked yet. Set birthdays, first meetings, or anniversaries!";
      grid.innerHTML = `<div class="info-alert">${alertMsg}</div>`;
      return;
    }

    const upcomingReminders = [];

    dates.forEach(d => {
      const countdown = calculateAnniversaryCountdown(d.date);
      
      if (countdown.daysToGo >= 0 && countdown.daysToGo <= 7) {
        upcomingReminders.push({
          title: d.title,
          daysLeft: countdown.daysToGo
        });
      }

      const countdownText = countdown.daysToGo === 0 ? 
        (getLang() === 'ar' ? 'اليوم! 🎉' : 'Today! 🎉') : 
        (getLang() === 'ar' ? `متبقي ${countdown.daysToGo} يوم` : `${countdown.daysToGo} Days Left`);

      const card = document.createElement('div');
      card.className = 'date-item-card fade-in';
      card.innerHTML = `
        <h3 class="date-card-title">${escapeHTML(d.title)}</h3>
        <span class="date-card-value">${formatDisplayDate(d.date)}</span>
        <div class="date-countdown-bubble">
          ${countdownText}
        </div>
        <button class="btn-delete date-btn-delete" data-id="${d.id}" title="Remove date" style="position: absolute; top: 12px; right: 12px;"><i class="fa-solid fa-trash-can"></i></button>
      `;
      grid.appendChild(card);
    });

    // Render reminders banner if there are approaching anniversaries
    if (upcomingReminders.length > 0) {
      const bannerTitle = getLang() === 'ar' ? "احتفالات قريبة جداً 🔔" : "Upcoming Celebrations";
      remindersWrapper.innerHTML = `<h3><i class="fa-solid fa-bell"></i> ${bannerTitle}</h3>`;
      upcomingReminders.forEach(r => {
        const item = document.createElement('div');
        item.className = 'anniversary-reminder-item';
        
        const reminderText = getLang() === 'ar' ? 
          `يقترب موعد <strong>${escapeHTML(r.title)}</strong>! متبقي <strong>${r.daysLeft}</strong> أيام فقط. جهّز مفاجأة جميلة! 🎁💖` :
          `<strong>${escapeHTML(r.title)}</strong> is approaching in <strong>${r.daysLeft}</strong> days! Plan a surprise! 🎁`;

        item.innerHTML = `
          <i class="fa-solid fa-heart-circle-exclamation"></i>
          <span>${reminderText}</span>
        `;
        remindersWrapper.appendChild(item);
      });
      remindersWrapper.classList.remove('hidden');
    }

    // Delete Date listener
    document.querySelectorAll('.date-btn-delete').forEach(btn => {
      btn.onclick = async () => {
        const deleteConfirm = getLang() === 'ar' ? "هل تريد إزالة هذا التاريخ التذكاري؟" : "Delete this anniversary tracking?";
        if (confirm(deleteConfirm)) {
          const id = btn.getAttribute('data-id');
          await deleteImportantDate(id);
          showToast(getLang() === 'ar' ? "تم إزالة التاريخ." : "Anniversary removed.");
          loadDatesPane();
          refreshDashboardStats();
        }
      };
    });
  } catch (error) {
    console.error(error);
  }
}

/**
 * Calculates days left until the next occurrence of an annual event.
 * @param {string} rawDate Date formatted as YYYY-MM-DD
 */
function calculateAnniversaryCountdown(rawDate) {
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

  return {
    daysToGo: daysToGo,
    nextDate: nextOccurrence
  };
}

/* ============================================================================
   EVENT HANDLERS & MODAL CONTROL
   ============================================================================ */

function setupDashboardListeners() {
  // Navigation Tabs toggle
  document.querySelectorAll('.dash-tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.dash-tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-dash-tab');
      document.getElementById(targetId).classList.add('active');
    };
  });

  // Create New Game quick link
  document.getElementById('dashboard-btn-create-game').onclick = () => {
    window.location.hash = `#creator/${currentSpaceId}`;
  };

  // Exit Space
  document.getElementById('dashboard-btn-logout').onclick = () => {
    const logoutConfirm = getLang() === 'ar' ? "هل تريد الخروج وإغلاق مساحة الحب الحالية؟" : "Exit this Love Space?";
    if (confirm(logoutConfirm)) {
      sessionStorage.removeItem(`unlocked_${currentSpaceId}`);
      window.location.hash = "#welcome";
    }
  };

  // Add modals opens
  document.getElementById('dash-btn-add-memory').onclick = () => openModal('modal-add-memory');
  document.getElementById('dash-btn-add-dream').onclick = () => openModal('modal-add-dream');
  document.getElementById('dash-btn-add-photo').onclick = () => openModal('modal-add-photo');
  document.getElementById('dash-btn-add-date').onclick = () => openModal('modal-add-date');

  // Modal Closes
  document.querySelectorAll('.modal-close, .modal').forEach(closer => {
    closer.onclick = (e) => {
      if (e.target.closest('.modal-content') && !e.target.closest('.modal-close')) return;
      const modal = closer.closest('.modal');
      if (modal) modal.classList.add('hidden');
    };
  });

  // Lightbox closes
  document.querySelector('.lightbox-close').onclick = closeLightbox;
  document.querySelector('.lightbox-overlay').onclick = closeLightbox;

  // Lightbox arrow clicks
  document.querySelector('.lightbox-next').onclick = (e) => { e.stopPropagation(); nextLightboxImage(); };
  document.querySelector('.lightbox-prev').onclick = (e) => { e.stopPropagation(); prevLightboxImage(); };

  // Form Submits: Memory
  document.getElementById('form-add-memory').onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('memory-title').value;
    const date = document.getElementById('memory-date').value;
    const desc = document.getElementById('memory-desc').value;
    const photoFile = document.getElementById('memory-photo').files[0];

    showToast(getLang() === 'ar' ? "جاري حفظ الذكرى..." : "Adding memory...");
    let photoUrl = "";
    if (photoFile) {
      try {
        photoUrl = await uploadMedia(photoFile);
      } catch (err) {
        console.error(err);
        showToast(getLang() === 'ar' ? "فشل رفع صورة الذكرى." : "Photo upload failed.");
      }
    }

    try {
      await saveMemory(currentSpaceId, { title, date, description: desc, photoUrl });
      showToast(getLang() === 'ar' ? "تم توثيق الذكرى في شريط الوقت! 💖" : "Memory saved to timeline! 💖");
      document.getElementById('form-add-memory').reset();
      document.getElementById('modal-add-memory').classList.add('hidden');
      loadMemoriesPane();
      refreshDashboardStats();
    } catch (err) {
      console.error(err);
      showToast(getLang() === 'ar' ? "فشل حفظ الذكرى." : "Failed to save memory.");
    }
  };

  // Form Submits: Dream
  document.getElementById('form-add-dream').onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('dream-title').value;
    const desc = document.getElementById('dream-desc').value;

    try {
      await saveDream(currentSpaceId, { title, description: desc });
      showToast(getLang() === 'ar' ? "تمت إضافة الحلم لقائمة الأمنيات! ☁️" : "Dream added! ☁️");
      document.getElementById('form-add-dream').reset();
      document.getElementById('modal-add-dream').classList.add('hidden');
      loadDreamsPane();
      refreshDashboardStats();
    } catch (err) {
      console.error(err);
      showToast(getLang() === 'ar' ? "فشل إضافة الحلم." : "Failed to add dream.");
    }
  };

  // Form Submits: Photo
  document.getElementById('form-add-photo').onsubmit = async (e) => {
    e.preventDefault();
    const file = document.getElementById('gallery-file').files[0];
    const caption = document.getElementById('gallery-caption').value;

    if (!file) return;
    showToast(getLang() === 'ar' ? "جاري رفع الصورة للمعرض..." : "Uploading photo...");

    try {
      const url = await uploadMedia(file);
      await saveGalleryItem(currentSpaceId, { url, caption });
      showToast(getLang() === 'ar' ? "تمت إضافة الصورة بنجاح المعرض! 📸" : "Photo uploaded to gallery! 📸");
      document.getElementById('form-add-photo').reset();
      document.getElementById('modal-add-photo').classList.add('hidden');
      loadGalleryPane();
    } catch (err) {
      console.error(err);
      showToast(getLang() === 'ar' ? "فشل إضافة الصورة للمعرض." : "Failed to upload image.");
    }
  };

  // Form Submits: Date
  document.getElementById('form-add-date').onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('date-title').value;
    const dateVal = document.getElementById('date-value').value;

    try {
      await saveImportantDate(currentSpaceId, { title, date: dateVal });
      showToast(getLang() === 'ar' ? "تم تثبيت التاريخ في لوحتكما! 📌" : "Important date pinned! 📌");
      document.getElementById('form-add-date').reset();
      document.getElementById('modal-add-date').classList.add('hidden');
      loadDatesPane();
      refreshDashboardStats();
    } catch (err) {
      console.error(err);
      showToast(getLang() === 'ar' ? "فشل حفظ التاريخ." : "Failed to save date.");
    }
  };

  // Keyboard navigation for lightbox
  window.onkeydown = (e) => {
    if (lightboxIndex !== -1) {
      if (e.key === 'ArrowRight') nextLightboxImage();
      if (e.key === 'ArrowLeft') prevLightboxImage();
      if (e.key === 'Escape') closeLightbox();
    }
  };
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  const form = modal.querySelector('form');
  if (form) form.reset();
  modal.classList.remove('hidden');
}

/**
 * Formats a Date String YYYY-MM-DD into a human-friendly format.
 */
function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const year = parts[0];
  const monthIdx = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  
  const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthsAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  
  if (getLang() === 'ar') {
    return `${day} ${monthsAr[monthIdx]}، ${year}`;
  }
  return `${monthsEn[monthIdx]} ${day}, ${year}`;
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
