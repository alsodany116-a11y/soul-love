// Love Hunt - Admin Panel Controller Module
import { getSupabase, setTenantBySlug, getCurrentTenantSlug, getCurrentTenantTier } from '../config.js';
import { 
  createCoupleSpace, verifySpaceAdminPassword, isSpaceAdminUnlocked, fetchSpaceUI, updateSpaceUI, updateSpacePhotos,
  updateSpacePasswords,
  fetchMusicTracks, saveMusicTrack, deleteMusicTrack,
  saveGame, fetchGamesBySpace, uploadMedia,
  fetchDreams, saveDream, toggleDreamAchieved, deleteDream, updateDream,
  fetchMemories, saveMemory, deleteMemory, updateMemory,
  fetchGallery, saveGalleryItem, deleteGalleryItem,
  fetchImportantDates, saveImportantDate, deleteImportantDate, updateImportantDate,
  DEFAULT_UI_TEXTS,
  verifyMasterPassword, updateMasterPassword, fetchAllSpaces, deleteCoupleSpace
} from '../storage.js';
import { DEFAULT_THEMES, applyThemeStyles, startThemeAnimation, stopThemeAnimation } from '../themes.js';

// Application Admin State variables
let currentSpaceId = null;
let currentGameId = null;
let activeTheme = 'rose_garden';
let stages = [];
let customizationOverrides = {};
let hisPhotoUrl = "";
let herPhotoUrl = "";

let allSpacesCached = [];
let activeDashboardTab = 'recent'; // 'recent' or 'all'

const TIER_LIMITS = {
  1: { // Tier 1
    stages: 5,
    themes: 4,
    songs: 3,
    dreams: 5,
    memories: 8,
    photos: 10,
    dates: 5
  },
  2: { // Tier 2
    stages: 15,
    themes: 6,
    songs: 10,
    dreams: 10,
    memories: 20,
    photos: 25,
    dates: 10
  },
  3: { // Tier 3
    stages: 999,
    themes: 8,
    songs: 999,
    dreams: 999,
    memories: 999,
    photos: 999,
    dates: 999
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  setupPasswordToggles();
  initFlatpickr();

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker Registered.', reg))
      .catch(err => console.log('Service Worker Failed to Register.', err));
  }

  // Tab triggers for master dashboard
  const tabRecent = document.getElementById('dashboard-tab-recent');
  const tabAll = document.getElementById('dashboard-tab-all');
  if (tabRecent && tabAll) {
    tabRecent.onclick = () => {
      activeDashboardTab = 'recent';
      tabRecent.classList.add('btn-primary');
      tabRecent.classList.remove('btn-secondary');
      tabAll.classList.add('btn-secondary');
      tabAll.classList.remove('btn-primary');
      renderSpacesList();
    };
    tabAll.onclick = () => {
      activeDashboardTab = 'all';
      tabAll.classList.add('btn-primary');
      tabAll.classList.remove('btn-secondary');
      tabRecent.classList.add('btn-secondary');
      tabRecent.classList.remove('btn-primary');
      renderSpacesList();
    };
  }

  // Drawer Toggles for Master Dashboard
  const hamburgerBtn = document.getElementById('master-hamburger-btn');
  const drawer = document.getElementById('master-sidebar-drawer');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  const drawerOverlay = drawer ? drawer.querySelector('.drawer-overlay') : null;

  if (hamburgerBtn && drawer) {
    hamburgerBtn.onclick = () => {
      drawer.classList.remove('hidden');
    };
    const closeDrawer = () => {
      drawer.classList.add('hidden');
    };
    if (drawerCloseBtn) drawerCloseBtn.onclick = closeDrawer;
    if (drawerOverlay) drawerOverlay.onclick = closeDrawer;

    // Drawer menu item actions
    const btnMenuSpaces = document.getElementById('drawer-menu-spaces');
    const btnMenuSettings = document.getElementById('drawer-menu-settings');
    const btnMenuLogout = document.getElementById('drawer-menu-logout');
    const settingsFormWrapper = document.getElementById('drawer-settings-form-wrapper');

    if (btnMenuSpaces && btnMenuSettings && btnMenuLogout) {
      btnMenuSpaces.onclick = () => {
        btnMenuSpaces.classList.add('active');
        btnMenuSettings.classList.remove('active');
        if (settingsFormWrapper) settingsFormWrapper.classList.add('hidden');
        closeDrawer();
      };

      btnMenuSettings.onclick = () => {
        btnMenuSettings.classList.add('active');
        btnMenuSpaces.classList.remove('active');
        if (settingsFormWrapper) settingsFormWrapper.classList.remove('hidden');
      };

      btnMenuLogout.onclick = () => {
        closeDrawer();
        const logoutBtn = document.getElementById('dashboard-btn-logout');
        if (logoutBtn) logoutBtn.click();
      };
    }
  }

  // Date Filter Trigger for stats
  const btnFilterDate = document.getElementById('btn-filter-stats-date');
  if (btnFilterDate) {
    btnFilterDate.onclick = () => {
      const filterDateVal = document.getElementById('filter-stats-date').value;
      const output = document.getElementById('filtered-stats-output');
      if (!filterDateVal) {
        output.style.display = 'none';
        return;
      }
      const matched = allSpacesCached.filter(s => {
        const localDate = new Date(s.createdAt).toISOString().split('T')[0];
        return localDate === filterDateVal;
      });
      const daySales = matched.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
      output.innerHTML = `<i class="fa-solid fa-calculator"></i> المساحات: ${matched.length} | المبيعات: ${daySales.toFixed(2)} ج.م`;
      output.style.display = 'block';
    };
  }

  const urlParams = new URLSearchParams(window.location.search);
  let spaceSlug = urlParams.get('space');
  if (!spaceSlug && window.location.hash && window.location.hash !== '#master') {
    spaceSlug = window.location.hash.replace('#', '').replace('/', '').trim();
  }

  if (spaceSlug) {
    // Customer Mode (Dynamic database switching)
    try {
      showToast("جاري ربط قاعدة بيانات المساحة... 🔐");
      const tenantDetails = await setTenantBySlug(spaceSlug);
      currentSpaceId = tenantDetails.id;
      
      // Check if unlocked
      if (isSpaceAdminUnlocked(currentSpaceId)) {
        await revealAdminPanel(true); // Customer mode
      } else {
        revealSpaceLogin(spaceSlug);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "فشل ربط قاعدة بيانات المساحة.");
      window.location.href = '../'; // Redirect to user welcome page
    }
  } else {
    // Master Admin Mode - Only allow access if unlocked or the secret '#master' hash is present
    const isMasterUnlocked = sessionStorage.getItem('unlocked_master') === 'true';
    const isMasterHash = window.location.hash === '#master' || window.location.hash.startsWith('#master');

    if (isMasterUnlocked || isMasterHash) {
      if (isMasterUnlocked) {
        revealDashboard();
      } else {
        revealMasterLogin();
      }
    } else {
      // Redirect back to welcome homepage if no space slug and no #master secret hash
      window.location.href = '../';
    }
  }

  // Bind Redirect Form for Space Owners
  const formRedirect = document.getElementById('form-space-redirect');
  if (formRedirect) {
    formRedirect.onsubmit = async (e) => {
      e.preventDefault();
      let inputVal = document.getElementById('redirect-space-slug').value.trim();
      const errorMsg = document.getElementById('space-redirect-error');
      errorMsg.classList.add('hidden');
      
      // If they pasted a full URL, try to extract the slug/hash part
      if (inputVal.includes('#play/')) {
        inputVal = inputVal.split('#play/')[1].split('/')[0];
      } else if (inputVal.includes('#journey/')) {
        inputVal = inputVal.split('#journey/')[1].split('/')[0];
      } else if (inputVal.includes('admin/#')) {
        inputVal = inputVal.split('admin/#')[1].split('/')[0];
      }
      
      const cleanSlug = inputVal.toLowerCase().replace(/#/g, '').replace(/\//g, '').trim();
      if (!cleanSlug) {
        errorMsg.classList.remove('hidden');
        return;
      }
      
      try {
        showToast("جاري البحث عن المساحة... 🔍");
        // Verify database existence
        const { setTenantBySlug } = await import('../config.js');
        await setTenantBySlug(cleanSlug);
        
        // If found, redirect to the hash
        window.location.hash = `#${cleanSlug}`;
        window.location.reload();
      } catch (err) {
        console.error(err);
        errorMsg.textContent = "اسم المساحة غير صحيح أو غير مسجل لدينا! ❌";
        errorMsg.classList.remove('hidden');
      }
    };
  }

  // Toggle master mode login
  const btnToggleMaster = document.getElementById('btn-toggle-master-mode');
  if (btnToggleMaster) {
    btnToggleMaster.onclick = () => {
      const container = document.getElementById('master-login-container');
      if (container) {
        container.classList.toggle('hidden');
      }
    };
  }
});

function revealSpaceLogin(slug) {
  document.querySelectorAll('.app-screen, .creator-container').forEach(el => el.classList.add('hidden'));
  document.getElementById('admin-screen-space-login').classList.remove('hidden');

  // Apply default theme styles
  applyThemeStyles('rose_garden', document.documentElement);
  stopThemeAnimation();

  const form = document.getElementById('form-space-login');
  const errorMsg = document.getElementById('space-login-error');
  form.reset();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const password = document.getElementById('space-admin-password').value;
    errorMsg.classList.add('hidden');

    try {
      const isMatch = await verifySpaceAdminPassword(currentSpaceId, password);
      if (isMatch) {
        showToast("مرحباً بك في لوحة تحكم مساحتك! 🔓💖");
        await revealAdminPanel(true); // Customer mode
      } else {
        errorMsg.classList.remove('hidden');
      }
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء التحقق من كلمة المرور.");
    }
  };
}

function revealMasterLogin() {
  document.querySelectorAll('.app-screen, .creator-container').forEach(el => el.classList.add('hidden'));
  document.getElementById('admin-screen-master-login').classList.remove('hidden');

  // Apply beautiful default theme (rose_garden) & animations
  applyThemeStyles('rose_garden', document.documentElement);
  stopThemeAnimation();

  const form = document.getElementById('form-master-login');
  const errorMsg = document.getElementById('master-login-error');

  form.onsubmit = async (e) => {
    e.preventDefault();
    const password = document.getElementById('master-password').value;
    errorMsg.classList.add('hidden');

    try {
      const isMatch = await verifyMasterPassword(password);
      if (isMatch) {
        showToast("مرحباً بك في لوحة الإدارة الرئيسية! 🔓");
        sessionStorage.setItem('unlocked_master', 'true');
        
        const urlParams = new URLSearchParams(window.location.search);
        const spaceId = urlParams.get('spaceId');
        if (spaceId) {
          currentSpaceId = spaceId;
          // Set tenant context
          const master = getSupabase();
          const { data } = await master.from('spaces_registry').select('slug').eq('id', spaceId).single();
          if (data) {
            await setTenantBySlug(data.slug);
            await revealAdminPanel(false);
          } else {
            revealDashboard();
          }
        } else {
          revealDashboard();
        }
      } else {
        errorMsg.classList.remove('hidden');
      }
    } catch (err) {
      console.error(err);
      alert("خطأ قاعدة البيانات: " + err.message + "\nالتفاصيل: " + JSON.stringify(err));
      showToast("حدث خطأ أثناء الاتصال بقاعدة البيانات.");
    }
  };
}

function revealDashboard() {
  document.querySelectorAll('.app-screen, .creator-container').forEach(el => el.classList.add('hidden'));
  document.getElementById('admin-screen-dashboard').classList.remove('hidden');

  // Apply beautiful default theme (rose_garden) & animations
  applyThemeStyles('rose_garden', document.documentElement);
  stopThemeAnimation();

  loadDashboardSpaces();

  const modalCreate = document.getElementById('modal-admin-create');
  const openCreateModal = () => {
    document.getElementById('form-admin-create').reset();
    modalCreate.classList.remove('hidden');
  };
  const createBtn = document.getElementById('dashboard-btn-create');
  if (createBtn) createBtn.onclick = openCreateModal;
  const fabCreateBtn = document.getElementById('dashboard-fab-create');
  if (fabCreateBtn) fabCreateBtn.onclick = openCreateModal;
  const mobileCreateBtn = document.getElementById('dashboard-btn-create-mobile');
  if (mobileCreateBtn) mobileCreateBtn.onclick = openCreateModal;

  document.getElementById('dashboard-btn-logout').onclick = () => {
    if (confirm("هل تريد تسجيل الخروج؟")) {
      sessionStorage.removeItem('unlocked_master');
      window.location.reload();
    }
  };

  document.querySelectorAll('.modal-close, .modal').forEach(closer => {
    closer.onclick = (e) => {
      if (e.target.closest('.modal-content') && !e.target.closest('.modal-close')) return;
      const m = closer.closest('.modal');
      if (m) m.classList.add('hidden');
    };
  });

  document.getElementById('form-admin-create').onsubmit = async (e) => {
    e.preventDefault();
    const slug = document.getElementById('setup-space-slug').value.trim();
    const adminPwd = document.getElementById('setup-admin-password').value;
    const price = document.getElementById('setup-space-price').value;
    const tier = document.getElementById('setup-space-tier').value;
    const tenantUrl = document.getElementById('setup-supabase-url').value.trim();
    const tenantKey = document.getElementById('setup-supabase-key').value.trim();

    showToast("جاري تسجيل مساحة الحب المخصصة...");
    try {
      await createCoupleSpace(slug, adminPwd, tenantUrl, tenantKey, price, tier);
      showToast("تم تسجيل مساحة الحب وقاعدة البيانات بنجاح! ✨");
      document.getElementById('modal-admin-create').classList.add('hidden');
      loadDashboardSpaces();
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء تسجيل المساحة بقاعدة البيانات الرئيسية: " + err.message);
    }
  };

  document.getElementById('form-change-master-password').onsubmit = async (e) => {
    e.preventDefault();
    const newPwd = document.getElementById('new-master-password').value;

    showToast("جاري تحديث كلمة المرور الرئيسية...");
    try {
      await updateMasterPassword(newPwd);
      showToast("تم تحديث كلمة المرور بنجاح! 🔑");
      document.getElementById('form-change-master-password').reset();
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء الحفظ.");
    }
  };
}

async function loadDashboardSpaces() {
  try {
    allSpacesCached = await fetchAllSpaces();
    
    // Update Master Stats Count
    const countEl = document.getElementById('master-stats-count');
    if (countEl) countEl.textContent = allSpacesCached.length;
    
    // Calculate and Update Master Stats Sales
    const totalSales = allSpacesCached.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
    const salesEl = document.getElementById('master-stats-sales');
    if (salesEl) salesEl.textContent = totalSales.toFixed(2) + " ج.م";

    renderSpacesList();
  } catch (err) {
    console.error(err);
    const container = document.getElementById('dashboard-spaces-list');
    if (container) container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #fa3e3e;">فشل تحميل المساحات من قاعدة البيانات.</td></tr>';
  }
}

function renderSpacesList() {
  const container = document.getElementById('dashboard-spaces-cards');
  if (!container) return;
  container.innerHTML = '';

  let spacesToRender = [];
  if (activeDashboardTab === 'recent') {
    // Show spaces created in the last 24 hours, limited to last 5 spaces
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    spacesToRender = allSpacesCached
      .filter(s => new Date(s.createdAt) > oneDayAgo)
      .slice(0, 5);
  } else {
    // Show all spaces (archives)
    spacesToRender = allSpacesCached;
  }

  if (spacesToRender.length === 0) {
    container.innerHTML = '<div class="info-alert" style="text-align: center;">لا توجد مساحات حب مطابقة للتصفية الحالية.</div>';
    return;
  }

  spacesToRender.forEach(s => {
    const card = document.createElement('div');
    card.className = 'space-accordion-card';

    const dateStr = new Date(s.createdAt).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const tierNames = {
      1: "البسيطة (5 مراحل) 🍃",
      2: "المميزة (15 مرحلة) ⭐",
      3: "الكاملة (مفتوحة) 💎"
    };
    const tierName = tierNames[s.tier] || `باقة ${s.tier}`;

    card.innerHTML = `
      <div class="space-card-header">
        <h4>${escapeHTML(s.slug)}</h4>
        <i class="fa-solid fa-chevron-down space-card-toggle-icon"></i>
      </div>
      <div class="space-card-details-body">
        <div class="detail-row">
          <span class="detail-label">نوع الباقة:</span>
          <span class="detail-value">${tierName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">تاريخ الإنشاء:</span>
          <span class="detail-value">${dateStr}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">السعر:</span>
          <span class="detail-value">${parseFloat(s.price).toFixed(2)} ج.م</span>
        </div>
        <div class="space-card-actions">
          <button class="space-card-btn-manage" data-slug="${s.slug}" data-id="${s.id}">
            <i class="fa-solid fa-screwdriver-wrench"></i> إدارة المساحة
          </button>
          <button class="btn-copy-space-id" data-slug="${s.slug}" style="background: #eef2f7; color: #444;">
            <i class="fa-solid fa-copy"></i> نسخ الرابط
          </button>
          <button class="space-card-btn-delete" data-id="${s.id}">
            <i class="fa-solid fa-trash-can"></i> حذف
          </button>
        </div>
      </div>
    `;

    // Toggle expand/collapse on header click
    card.querySelector('.space-card-header').onclick = () => {
      const isExpanded = card.classList.contains('expanded');
      // Collapse all other cards first
      container.querySelectorAll('.space-accordion-card').forEach(c => c.classList.remove('expanded'));
      if (!isExpanded) {
        card.classList.add('expanded');
      }
    };

    container.appendChild(card);
  });

  // Bind copy listeners
  container.querySelectorAll('.btn-copy-space-id').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const slug = btn.getAttribute('data-slug');
      const adminUrl = `${window.location.origin}/admin/#${slug}`;
      navigator.clipboard.writeText(adminUrl);
      showToast("تم نسخ رابط لوحة تحكم العميل! 📋");
    };
  });

  // Bind manage/edit listeners
  container.querySelectorAll('.space-card-btn-manage').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const slug = btn.getAttribute('data-slug');
      const id = btn.getAttribute('data-id');
      showToast("جاري تحميل مساحة الحب... ⏳");
      try {
        currentSpaceId = id;
        await setTenantBySlug(slug);
        await revealAdminPanel(false); // Open in Master Edit Mode
      } catch (err) {
        console.error(err);
        showToast("حدث خطأ أثناء تحميل المساحة: " + err.message);
      }
    };
  });

  // Bind delete listeners
  container.querySelectorAll('.space-card-btn-delete').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (confirm("⚠️ هل أنت متأكد من حذف هذه المساحة نهائياً؟ سيتم مسح كافة الألغاز والذكريات والصور والموسيقى الخاصة بها بشكل لا يمكن استرجاعه!")) {
        showToast("جاري حذف المساحة...");
        try {
          await deleteCoupleSpace(id);
          showToast("تم حذف مساحة الحب بنجاح! 🗑️");
          loadDashboardSpaces();
        } catch (err) {
          console.error(err);
          showToast("حدث خطأ أثناء الحذف: " + err.message);
        }
      }
    };
  });
}

/**
 * Setup password field toggles (reveals passcode values).
 */
function setupPasswordToggles() {
  document.querySelectorAll('.btn-toggle-password').forEach(btn => {
    btn.onclick = () => {
      const input = btn.previousElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `<i class="fa-regular fa-eye-slash"></i>`;
      } else {
        input.type = 'password';
        btn.innerHTML = `<i class="fa-regular fa-eye"></i>`;
      }
    };
  });
}

/**
 * Unlocks the admin panel view and loads space details.
 */
async function revealAdminPanel(isCustomerMode = false) {
  document.getElementById('admin-screen-master-login').classList.add('hidden');
  document.getElementById('admin-screen-space-login').classList.add('hidden');
  document.getElementById('admin-screen-dashboard').classList.add('hidden');
  document.getElementById('admin-panel-container').classList.remove('hidden');

  const backBtn = document.getElementById('admin-btn-back-dashboard');
  const logoutBtn = document.getElementById('admin-btn-logout');

  if (isCustomerMode) {
    backBtn.style.display = 'none'; // Hide back to master dashboard button
  } else {
    backBtn.style.display = 'inline-flex';
  }

  showToast("تم فتح محرر مساحة الحب بنجاح ✨");
  setupTabControls();
  setupAccordionControls();
  
  // Initial Load calls
  await loadSpaceUIConfigs();
  await loadGameConfigs();
  await loadMusicPlaylist();
  await loadDreamsList();
  await loadMemoriesList();
  await loadGalleryList();
  await loadDatesList();
  
  applyThemeTiers();

  setupActionListeners();

  if (isCustomerMode) {
    logoutBtn.onclick = () => {
      if (confirm("هل تريد تسجيل الخروج؟")) {
        sessionStorage.removeItem(`unlocked_admin_${currentSpaceId}`);
        const currentSlug = getCurrentTenantSlug();
        if (currentSlug) {
          window.location.href = window.location.pathname + "#" + currentSlug;
        } else {
          window.location.href = window.location.pathname;
        }
        window.location.reload();
      }
    };
  } else {
    backBtn.style.display = 'inline-flex';
    // Bind Back to Dashboard Button
    backBtn.onclick = () => {
      history.pushState(null, '', window.location.pathname);
      revealDashboard();
    };
    logoutBtn.onclick = () => {
      if (confirm("هل تريد تسجيل الخروج؟")) {
        sessionStorage.removeItem('unlocked_master');
        window.location.reload();
      }
    };
  }
}

function applyThemeTiers() {
  const tier = getCurrentTenantTier();
  const buttons = document.querySelectorAll('.theme-preset-btn');
  buttons.forEach((btn, index) => {
    // Determine if locked
    let isLocked = false;
    if (tier === 1 && index >= 4) isLocked = true;
    if (tier === 2 && index >= 6) isLocked = true;

    // Clean existing padlock or text edits
    let rawText = btn.textContent.replace(' 🔒', '').trim();
    const iconClass = btn.querySelector('i')?.outerHTML || '';
    
    if (isLocked) {
      btn.innerHTML = `${iconClass} ${rawText} 🔒`;
      btn.classList.add('theme-locked');
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    } else {
      btn.innerHTML = `${iconClass} ${rawText}`;
      btn.classList.remove('theme-locked');
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  });
}

/**
 * Setup Sidebar tabs toggle.
 */
function setupTabControls() {
  const dropdownBtn = document.getElementById('mobile-tabs-dropdown-btn');
  const dropdownMenu = document.getElementById('mobile-tabs-menu');

  const switchTab = (tabId) => {
    document.querySelectorAll('.admin-pane').forEach(p => p.classList.remove('active'));
    const targetPane = document.getElementById(tabId);
    if (targetPane) targetPane.classList.add('active');

    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-admin-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.mobile-menu-item').forEach(item => {
      if (item.getAttribute('data-admin-tab') === tabId) {
        item.classList.add('active');
        if (dropdownBtn) {
          dropdownBtn.querySelector('span').innerHTML = item.innerHTML;
        }
      } else {
        item.classList.remove('active');
      }
    });
  };

  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.onclick = () => {
      const tabId = btn.getAttribute('data-admin-tab');
      switchTab(tabId);
    };
  });

  if (dropdownBtn && dropdownMenu) {
    dropdownBtn.onclick = (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('hidden');
    };

    document.addEventListener('click', () => {
      dropdownMenu.classList.add('hidden');
    });
  }

  document.querySelectorAll('.mobile-menu-item').forEach(item => {
    item.onclick = (e) => {
      e.stopPropagation();
      const tabId = item.getAttribute('data-admin-tab');
      switchTab(tabId);
      if (dropdownMenu) dropdownMenu.classList.add('hidden');
    };
  });
}

/**
 * Setup Accordion collapsible expand.
 */
function setupAccordionControls() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.onclick = () => {
      const item = header.parentElement;
      const isActive = item.classList.contains('active');
      
      // Close other accordions in same pane
      item.parentElement.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    };
  });
}

/* ============================================================================
   SPACE CONFIGURATIONS & TEXT OVERRIDES
   ============================================================================ */

async function loadSpaceUIConfigs() {
  try {
    const data = await fetchSpaceUI(currentSpaceId);
    const ui = data.uiTexts || DEFAULT_UI_TEXTS;
    
    // Fill text inputs
    for (const key of Object.keys(DEFAULT_UI_TEXTS)) {
      const input = document.getElementById(`text-${key}`);
      if (input) {
        input.value = ui[key] !== undefined ? ui[key] : DEFAULT_UI_TEXTS[key];
      }
    }

    // Set Avatars URL
    hisPhotoUrl = data.hisPhotoUrl || "";
    herPhotoUrl = data.herPhotoUrl || "";
    document.getElementById('admin-his-photo-url').value = hisPhotoUrl;
    document.getElementById('admin-her-photo-url').value = herPhotoUrl;

    // Set avatar upload status labels
    if (hisPhotoUrl) document.getElementById('his-photo-status').textContent = "تم رفع الصورة بنجاح ✅";
    if (herPhotoUrl) document.getElementById('her-photo-status').textContent = "تم رفع الصورة بنجاح ✅";

    // Set Passwords
    document.getElementById('admin-player-password').value = data.passwordPlain || "love";
    document.getElementById('admin-space-password').value = data.adminPasswordPlain || "";

  } catch (err) {
    console.error("Error loading UI texts:", err);
  }
}

async function loadGameConfigs() {
  try {
    const games = await fetchGamesBySpace(currentSpaceId);
    if (games && games.length > 0) {
      const game = games[0];
      currentGameId = game.id;
      stages = game.stages || [];
      activeTheme = game.theme || 'rose_garden';
      customizationOverrides = game.customization || {};

      document.getElementById('stats-views').textContent = game.views || 0;
      document.getElementById('stats-completions').textContent = game.completions || 0;

      if (game.startDate) {
        document.getElementById('admin-start-date').value = new Date(game.startDate).toISOString().slice(0, 16);
      }
      if (game.expiryDate) {
        document.getElementById('admin-expiry-date').value = new Date(game.expiryDate).toISOString().slice(0, 16);
      }

      // Populate styling variables
      populateStylingSliders(customizationOverrides, activeTheme);
      updateShareLinkUI();

      // Apply loaded theme styles & animations
      applyThemeStyles(activeTheme, document.documentElement, customizationOverrides);
      stopThemeAnimation();
    } else {
      stages = [];
      activeTheme = 'rose_garden';
      customizationOverrides = {};
      populateStylingSliders({}, 'rose_garden');
      hideShareLinkUI();

      // Apply default theme styles & animations
      applyThemeStyles('rose_garden', document.documentElement);
      stopThemeAnimation();
    }

    renderStagesList();
  } catch (err) {
    console.error("Error loading game config:", err);
  }
}

function populateStylingSliders(overrides, themeName) {
  const theme = { ...DEFAULT_THEMES[themeName], ...overrides };

  document.querySelectorAll('.theme-preset-btn').forEach(btn => {
    if (btn.getAttribute('data-theme') === themeName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.getElementById('style-font-family').value = theme.fontFamily;
  document.getElementById('style-font-size-title').value = theme.fontSizeTitle;
  document.getElementById('style-font-size-body').value = theme.fontSizeBody;
  document.getElementById('style-bg-color').value = theme.bgColor;
  document.getElementById('style-card-bg-color').value = theme.cardBgColor;
  document.getElementById('style-btn-color').value = rgbToHex(theme.buttonColor) || theme.buttonColor;
  document.getElementById('style-btn-hover-color').value = rgbToHex(theme.buttonHoverColor) || theme.buttonHoverColor;
  document.getElementById('style-border-color').value = rgbToHex(theme.borderColor) || theme.borderColor;
  document.getElementById('style-progress-color').value = rgbToHex(theme.progressBarColor) || theme.progressBarColor;
  document.getElementById('style-border-radius').value = theme.borderRadius;
  document.getElementById('style-card-width').value = theme.cardWidth;
  document.getElementById('style-stage-transition').value = theme.animationTransition || 'fade';
  document.getElementById('style-toggle-particles').checked = overrides.particlesEnabled !== false;
}

function readStylingSliders() {
  return {
    fontFamily: document.getElementById('style-font-family').value,
    fontSizeTitle: document.getElementById('style-font-size-title').value,
    fontSizeBody: document.getElementById('style-font-size-body').value,
    bgColor: document.getElementById('style-bg-color').value,
    cardBgColor: document.getElementById('style-card-bg-color').value,
    buttonColor: document.getElementById('style-btn-color').value,
    buttonHoverColor: document.getElementById('style-btn-hover-color').value,
    borderColor: document.getElementById('style-border-color').value,
    progressBarColor: document.getElementById('style-progress-color').value,
    borderRadius: document.getElementById('style-border-radius').value,
    cardWidth: document.getElementById('style-card-width').value,
    animationTransition: document.getElementById('style-stage-transition').value,
    particlesEnabled: document.getElementById('style-toggle-particles').checked
  };
}

/* ============================================================================
   STAGES BUILDER
   ============================================================================ */

function renderStagesList() {
  const container = document.getElementById('admin-stages-list');
  container.innerHTML = "";

  if (stages.length === 0) {
    container.innerHTML = `<div class="info-alert">لا توجد مراحل ألغاز حتى الآن. اضغط على زر "إضافة مرحلة جديدة" للبدء في كتابة الأسئلة!</div>`;
    return;
  }

  stages.forEach((s, index) => {
    const item = document.createElement('div');
    item.className = 'creator-stage-item';

    let typeName = "إدخال نصي";
    if (s.type === 'multiple_choice') typeName = "اختيار من متعدد";
    else if (s.type === 'number') typeName = "إدخال رقمي";

    item.innerHTML = `
      <div class="stage-item-info">
        <span class="stage-item-title">المرحلة ${index + 1}: ${escapeHTML(s.title)}</span>
        <span class="stage-item-type">${typeName}</span>
      </div>
      <div class="stage-item-actions">
        <button class="stage-action-btn btn-up" data-index="${index}" ${index === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-up"></i></button>
        <button class="stage-action-btn btn-down" data-index="${index}" ${index === stages.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-down"></i></button>
        <button class="stage-action-btn btn-edit" data-index="${index}"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="stage-action-btn btn-delete" data-index="${index}" style="color: #fa3e3e;"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    `;
    container.appendChild(item);
  });
}

function openStageEditor(index) {
  const modal = document.getElementById('modal-stage-editor');
  const form = document.getElementById('form-stage-editor');
  form.reset();

  document.getElementById('stage-editor-index').value = index;
  document.getElementById('stage-media-upload-status').textContent = "لا يوجد ملف جديد";
  document.getElementById('stage-edit-media-url').value = "";
  
  const chkWrapper = document.getElementById('stage-media-checkbox-wrapper');
  const chkActive = document.getElementById('stage-media-active');
  if (chkWrapper) chkWrapper.classList.add('hidden');
  if (chkActive) chkActive.checked = false;

  const choicesWrapper = document.getElementById('stage-edit-options-wrapper');
  choicesWrapper.classList.add('hidden');

  if (index === -1) {
    document.getElementById('stage-editor-title').textContent = "إضافة مرحلة لغز جديدة 🧩";
  } else {
    document.getElementById('stage-editor-title').textContent = `تعديل المرحلة ${index + 1}`;
    
    const stage = stages[index];
    document.getElementById('stage-edit-title').value = stage.title || "";
    document.getElementById('stage-edit-message').value = stage.message || "";
    document.getElementById('stage-edit-type').value = stage.type || "text";
    document.getElementById('stage-edit-correct').value = stage.answer || "";
    document.getElementById('stage-edit-question').value = stage.question || "";
    document.getElementById('stage-edit-hint').value = stage.hint || "";
    document.getElementById('stage-edit-success').value = stage.successMsg || "";
    document.getElementById('stage-edit-fail').value = stage.failMsg || "";
    document.getElementById('stage-edit-media-url').value = stage.mediaUrl || "";

    if (stage.mediaUrl) {
      if (chkWrapper) chkWrapper.classList.remove('hidden');
      if (chkActive) chkActive.checked = true;
      document.getElementById('stage-media-upload-status').textContent = "";
    }

    if (stage.type === 'multiple_choice') {
      choicesWrapper.classList.remove('hidden');
      document.getElementById('stage-edit-choices').value = stage.choices || "";
      document.getElementById('stage-edit-choices').required = true;
    }
  }

  modal.classList.remove('hidden');
}

/* ============================================================================
   MUSIC PLAYLIST
   ============================================================================ */

async function loadMusicPlaylist() {
  const container = document.getElementById('admin-music-list');
  container.innerHTML = "";

  try {
    const tracks = await fetchMusicTracks(currentSpaceId);
    if (tracks.length === 0) {
      container.innerHTML = `<div class="info-alert">قائمة الألحان فارغة. ارفع ملفات MP3 رومانسية بالأسفل لتشغيلها للاعب!</div>`;
      return;
    }

    tracks.forEach(track => {
      const item = document.createElement('div');
      item.className = 'creator-stage-item';
      item.innerHTML = `
        <div class="stage-item-info">
          <span class="stage-item-title"><i class="fa-solid fa-music"></i> ${escapeHTML(track.title)}</span>
        </div>
        <div class="stage-item-actions">
          <button class="stage-action-btn music-btn-delete" data-id="${track.id}" style="color: #fa3e3e;"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `;
      container.appendChild(item);
    });

    document.querySelectorAll('.music-btn-delete').forEach(btn => {
      btn.onclick = async () => {
        if (confirm("هل تريد إزالة هذا اللحن من قائمة التشغيل؟")) {
          const id = btn.getAttribute('data-id');
          await deleteMusicTrack(id);
          showToast("تم إزالة اللحن 🎵");
          loadMusicPlaylist();
        }
      };
    });
  } catch (err) {
    console.error(err);
  }
}

/* ============================================================================
   DREAMS BUCKET LIST
   ============================================================================ */

async function loadDreamsList() {
  const container = document.getElementById('admin-dreams-list');
  container.innerHTML = "";

  try {
    const dreams = await fetchDreams(currentSpaceId);
    if (dreams.length === 0) {
      container.innerHTML = `<div class="info-alert">قائمة الأمنيات فارغة. أضف أحلامكما المشتركة لتتحققوا منها يداً بيد!</div>`;
      return;
    }

    dreams.forEach(d => {
      const item = document.createElement('div');
      item.className = 'creator-stage-item';
      item.innerHTML = `
        <div class="stage-item-info" style="display: flex; align-items: center; gap: 15px;">
          <input type="checkbox" class="dream-achieved-toggle" data-id="${d.id}" ${d.isAchieved ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
          <div style="${d.isAchieved ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
            <strong class="stage-item-title">${escapeHTML(d.title)}</strong>
            <span class="stage-item-type" style="display: block; font-size: 0.8rem; color: #777;">${escapeHTML(d.description || '')}</span>
          </div>
        </div>
        <div class="stage-item-actions">
          <button class="stage-action-btn dream-btn-edit" data-id="${d.id}" data-title="${escapeHTML(d.title)}" data-desc="${escapeHTML(d.description || '')}"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="stage-action-btn dream-btn-delete" data-id="${d.id}" style="color: #fa3e3e;"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `;
      container.appendChild(item);
    });

    // Toggle check achieved
    document.querySelectorAll('.dream-achieved-toggle').forEach(chk => {
      chk.onchange = async () => {
        const id = chk.getAttribute('data-id');
        const checked = chk.checked;
        await toggleDreamAchieved(id, checked);
        showToast(checked ? "تمت إضافة حلم لقائمة المنجزات! 🎉🌟" : "تم إعادة الحلم لقائمة الانتظار.");
        loadDreamsList();
      };
    });

    // Edit
    document.querySelectorAll('.dream-btn-edit').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const title = btn.getAttribute('data-title');
        const desc = btn.getAttribute('data-desc');

        document.getElementById('dream-edit-id').value = id;
        document.getElementById('dream-title').value = title;
        document.getElementById('dream-desc').value = desc;
        document.getElementById('dream-modal-title').textContent = "تعديل الحلم المشترك ☁️";
        openModal('modal-add-dream');
      };
    });

    // Delete
    document.querySelectorAll('.dream-btn-delete').forEach(btn => {
      btn.onclick = async () => {
        if (confirm("هل تريد إزالة هذا الهدف من قائمة الأمنيات؟")) {
          const id = btn.getAttribute('data-id');
          await deleteDream(id);
          showToast("تم حذف الحلم.");
          loadDreamsList();
        }
      };
    });
  } catch (err) {
    console.error(err);
  }
}

/* ============================================================================
   MEMORIES TIMELINE
   ============================================================================ */

async function loadMemoriesList() {
  const container = document.getElementById('admin-memories-list');
  container.innerHTML = "";

  try {
    const memories = await fetchMemories(currentSpaceId);
    if (memories.length === 0) {
      container.innerHTML = `<div class="info-alert">شريط الذكريات فارغ. أضف أول ذكرى تاريخية لكما!</div>`;
      return;
    }

    memories.forEach(m => {
      const item = document.createElement('div');
      item.className = 'creator-stage-item';
      item.innerHTML = `
        <div class="stage-item-info" style="display: flex; align-items: center; gap: 15px;">
          ${m.photoUrl ? `<img src="${m.photoUrl}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 8px;">` : `<div style="width: 45px; height: 45px; background: #eee; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #aaa;"><i class="fa-solid fa-image"></i></div>`}
          <div>
            <span class="stage-item-title" style="display: block;">${escapeHTML(m.title)}</span>
            <span class="stage-item-type" style="display: block; font-size: 0.8rem; color: #777;">التاريخ: ${m.date}</span>
          </div>
        </div>
        <div class="stage-item-actions">
          <button class="stage-action-btn memory-btn-edit" data-id="${m.id}" data-title="${escapeHTML(m.title)}" data-date="${m.date}" data-desc="${escapeHTML(m.description || '')}" data-photourl="${m.photoUrl || ''}"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="stage-action-btn memory-btn-delete" data-id="${m.id}" style="color: #fa3e3e;"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `;
      container.appendChild(item);
    });

    // Edit Listener
    document.querySelectorAll('.memory-btn-edit').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const title = btn.getAttribute('data-title');
        const date = btn.getAttribute('data-date');
        const desc = btn.getAttribute('data-desc');
        const photoUrl = btn.getAttribute('data-photourl');

        document.getElementById('edit-memory-id').value = id;
        document.getElementById('edit-memory-photo-url').value = photoUrl;
        document.getElementById('memory-title').value = title;
        
        const fp = document.getElementById('memory-date')._flatpickr;
        if (fp) fp.setDate(date);
        else document.getElementById('memory-date').value = date;

        document.getElementById('memory-desc').value = desc;
        document.querySelector('#modal-add-memory .modal-title').textContent = "تعديل الذكرى المخلدة 📝";
        openModal('modal-add-memory');
      };
    });

    document.querySelectorAll('.memory-btn-delete').forEach(btn => {
      btn.onclick = async () => {
        if (confirm("هل تريد إزالة هذه الذكرى نهائياً؟")) {
          const id = btn.getAttribute('data-id');
          await deleteMemory(id);
          showToast("تم إزالة الذكرى.");
          loadMemoriesList();
        }
      };
    });
  } catch (err) {
    console.error(err);
  }
}

/* ============================================================================
   GALLERY
   ============================================================================ */

async function loadGalleryList() {
  const container = document.getElementById('admin-gallery-list');
  container.innerHTML = "";

  try {
    const photos = await fetchGallery(currentSpaceId);
    if (photos.length === 0) {
      container.innerHTML = `<div class="info-alert" style="grid-column: 1/-1;">معرض الصور فارغ. ارفعوا أجمل لقطاتكم!</div>`;
      return;
    }

    photos.forEach(img => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.style.position = 'relative';
      card.innerHTML = `
        <div class="gallery-card-media" style="height: 100px;">
          <img src="${img.url}">
        </div>
        <div class="gallery-card-caption" style="padding: 4px; font-size: 0.75rem;">${escapeHTML(img.caption || '')}</div>
        <button class="gallery-btn-delete" data-id="${img.id}" style="position: absolute; top: 5px; left: 5px; background: rgba(255,255,255,0.9); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; color: #fa3e3e; box-shadow: 0 2px 5px rgba(0,0,0,0.15);"><i class="fa-solid fa-trash"></i></button>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.gallery-btn-delete').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm("هل تريد حذف هذه الصورة من المعرض؟")) {
          const id = btn.getAttribute('data-id');
          await deleteGalleryItem(id);
          showToast("تم إزالة الصورة 🖼️");
          loadGalleryList();
        }
      };
    });
  } catch (err) {
    console.error(err);
  }
}

/* ============================================================================
   IMPORTANT DATES
   ============================================================================ */

async function loadDatesList() {
  const container = document.getElementById('admin-dates-list');
  container.innerHTML = "";

  try {
    const dates = await fetchImportantDates(currentSpaceId);
    if (dates.length === 0) {
      container.innerHTML = `<div class="info-alert">لا توجد مواعيد مخلدة بعد. حددوا المناسبات السنوية الخاصة!</div>`;
      return;
    }

    dates.forEach(d => {
      const item = document.createElement('div');
      item.className = 'creator-stage-item';
      const isMilestone = d.description && d.description.includes('[milestone]');
      const typeLabel = isMilestone ? 'ذكرى مضت (منذ...)' : (d.isRecurring ? 'ذكرى سنوية (متكررة)' : 'موعد عادي (تاريخ محدد)');
      const typeStyle = isMilestone ? 'background: #e0f2f1; color: #00796b; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; margin-right: 10px;' : (d.isRecurring ? 'background: #fff3e0; color: #e65100; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; margin-right: 10px;' : 'background: #e8eaf6; color: #3f51b5; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; margin-right: 10px;');

      item.innerHTML = `
        <div class="stage-item-info">
          <div style="display: flex; align-items: center;">
            <strong class="stage-item-title">${escapeHTML(d.title)}</strong>
            <span style="${typeStyle}">${typeLabel}</span>
          </div>
          <span class="stage-item-type" style="display: block; font-size: 0.8rem; color: #777;">التاريخ: ${d.date}</span>
        </div>
        <div class="stage-item-actions">
          <button class="stage-action-btn date-btn-edit" data-id="${d.id}" data-title="${escapeHTML(d.title)}" data-date="${d.date}" data-ismilestone="${isMilestone ? 'true' : 'false'}" data-isrecurring="${d.isRecurring ? 'true' : 'false'}"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="stage-action-btn date-btn-delete" data-id="${d.id}" style="color: #fa3e3e;"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `;
      container.appendChild(item);
    });

    // Edit Listener
    document.querySelectorAll('.date-btn-edit').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const title = btn.getAttribute('data-title');
        const date = btn.getAttribute('data-date');
        const isMilestone = btn.getAttribute('data-ismilestone') === 'true';
        const isRecurring = btn.getAttribute('data-isrecurring') === 'true';

        document.getElementById('edit-date-id').value = id;
        document.getElementById('date-title').value = title;
        
        const fp = document.getElementById('date-value')._flatpickr;
        if (fp) fp.setDate(date);
        else document.getElementById('date-value').value = date;

        document.getElementById('date-is-milestone').checked = isMilestone;
        document.getElementById('date-is-recurring').checked = isRecurring;
        document.querySelector('#modal-add-date .modal-title').textContent = "تعديل التاريخ المخلد 📝";
        openModal('modal-add-date');
      };
    });

    document.querySelectorAll('.date-btn-delete').forEach(btn => {
      btn.onclick = async () => {
        if (confirm("هل تريد مسح هذا الموعد التذكاري؟")) {
          const id = btn.getAttribute('data-id');
          await deleteImportantDate(id);
          showToast("تم مسح المناسبة.");
          loadDatesList();
        }
      };
    });
  } catch (err) {
    console.error(err);
  }
}

/* ============================================================================
   ACTION LISTENERS & SAVES
   ============================================================================ */

function setupActionListeners() {
  // Theme Presets
  document.querySelectorAll('.theme-preset-btn').forEach(btn => {
    btn.onclick = () => {
      if (btn.classList.contains('theme-locked')) {
        showToast("هذه السمة مغلقة في باقتك الحالية! 🔒 يرجى ترقية الاشتراك لفتحها.");
        return;
      }
      activeTheme = btn.getAttribute('data-theme');
      populateStylingSliders({}, activeTheme);
      
      const currentOverrides = readStylingSliders();
      applyThemeStyles(activeTheme, document.documentElement, currentOverrides);
      stopThemeAnimation();
      showToast("تم تطبيق السمات الجاهزة 🎨");
    };
  });

  // Dynamic Live Preview for Styling Controls
  document.querySelectorAll('#admin-tab-style input, #admin-tab-style select').forEach(input => {
    input.oninput = input.onchange = () => {
      const currentOverrides = readStylingSliders();
      applyThemeStyles(activeTheme, document.documentElement, currentOverrides);
      stopThemeAnimation();
    };
  });

  // Reorder Stages List Actions
  const stagesList = document.getElementById('admin-stages-list');
  stagesList.onclick = (e) => {
    const btn = e.target.closest('.stage-action-btn');
    if (!btn) return;
    const index = parseInt(btn.getAttribute('data-index'));

    if (btn.classList.contains('btn-up') && index > 0) {
      const temp = stages[index];
      stages[index] = stages[index - 1];
      stages[index - 1] = temp;
      renderStagesList();
    } else if (btn.classList.contains('btn-down') && index < stages.length - 1) {
      const temp = stages[index];
      stages[index] = stages[index + 1];
      stages[index + 1] = temp;
      renderStagesList();
    } else if (btn.classList.contains('btn-delete')) {
      if (confirm("هل أنت متأكد من حذف هذه المرحلة نهائياً؟")) {
        stages.splice(index, 1);
        renderStagesList();
        showToast("تم إزالة المرحلة.");
      }
    } else if (btn.classList.contains('btn-edit')) {
      openStageEditor(index);
    }
  };

  // Add Stage Button
  document.getElementById('admin-btn-add-stage').onclick = () => {
    const tier = getCurrentTenantTier();
    const limit = TIER_LIMITS[tier]?.stages || 5;
    if (stages.length >= limit) {
      showToast(`عذراً، الباقة الحالية تسمح بحد أقصى ${limit} مراحل فقط! ⚠️`);
      return;
    }
    openStageEditor(-1);
  };

  // Form Stage Editor submits
  document.getElementById('form-stage-editor').onsubmit = async (e) => {
    e.preventDefault();
    const index = parseInt(document.getElementById('stage-editor-index').value);

    const title = document.getElementById('stage-edit-title').value;
    const message = document.getElementById('stage-edit-message').value;
    const type = document.getElementById('stage-edit-type').value;
    const answer = document.getElementById('stage-edit-correct').value;
    const choices = document.getElementById('stage-edit-choices').value;
    const question = document.getElementById('stage-edit-question').value;
    const hint = document.getElementById('stage-edit-hint').value;
    const successMsg = document.getElementById('stage-edit-success').value;
    const failMsg = document.getElementById('stage-edit-fail').value;
    
    const isMediaActive = document.getElementById('stage-media-active') ? document.getElementById('stage-media-active').checked : true;
    let mediaUrl = document.getElementById('stage-edit-media-url').value;
    if (!isMediaActive) {
      mediaUrl = "";
    }
    const mediaFile = document.getElementById('stage-edit-media').files[0];

    if (mediaFile) {
      showToast("جاري رفع صورة المرحلة...");
      try {
        mediaUrl = await uploadMedia(mediaFile);
      } catch (err) {
        console.error(err);
        showToast("فشل رفع الملف.");
      }
    }

    const stageData = {
      title,
      message,
      type,
      answer,
      choices: type === 'multiple_choice' ? choices : "",
      question,
      hint,
      mediaUrl,
      successMsg: successMsg || "إجابة صحيحة وممتازة! 💖",
      failMsg: failMsg || "إجابة خاطئة، فكر مجدداً يا حب! 💕"
    };

    if (index === -1) {
      stages.push(stageData);
      showToast("تمت إضافة المرحلة.");
    } else {
      stages[index] = stageData;
      showToast("تم تعديل المرحلة.");
    }

    closeModal('modal-stage-editor');
    renderStagesList();
  };

  document.getElementById('stage-edit-type').onchange = (e) => {
    const choicesWrapper = document.getElementById('stage-edit-options-wrapper');
    if (e.target.value === 'multiple_choice') {
      choicesWrapper.classList.remove('hidden');
      document.getElementById('stage-edit-choices').required = true;
    } else {
      choicesWrapper.classList.add('hidden');
      document.getElementById('stage-edit-choices').required = false;
    }
  };

  // Upload Custom Music Track button
  document.getElementById('admin-btn-upload-music').onclick = async (e) => {
    e.preventDefault();
    const tier = getCurrentTenantTier();
    const limit = TIER_LIMITS[tier]?.songs || 3;
    const currentCount = document.querySelectorAll('#admin-music-playlist li').length;
    if (currentCount >= limit) {
      showToast(`عذراً، الباقة الحالية تسمح بحد أقصى ${limit} ملفات موسيقى فقط! ⚠️`);
      return;
    }

    const titleInput = document.getElementById('music-track-title');
    const fileInput = document.getElementById('music-track-file');
    const title = titleInput.value.trim();
    const file = fileInput.files[0];

    if (!title || !file) {
      showToast("يرجى كتابة اسم الأغنية واختيار الملف أولاً!");
      return;
    }

    showToast("جاري رفع ملف الموسيقى...");
    try {
      const url = await uploadMedia(file);
      await saveMusicTrack(currentSpaceId, title, url);
      showToast("تم رفع الأغنية لقائمة التشغيل! 🎵");
      titleInput.value = "";
      fileInput.value = "";
      loadMusicPlaylist();
    } catch (err) {
      console.error(err);
      alert("خطأ أثناء رفع ملف الموسيقى:\n" + err.message + "\nالتفاصيل: " + JSON.stringify(err));
      showToast("فشل رفع الموسيقى.");
    }
  };

  // Add Dream button
  document.getElementById('admin-btn-add-dream').onclick = () => {
    document.getElementById('form-add-dream').reset();
    document.getElementById('dream-edit-id').value = "";
    document.getElementById('dream-modal-title').textContent = "إضافة حلم جديد 💫";
    openModal('modal-add-dream');
  };
  document.getElementById('form-add-dream').onsubmit = async (e) => {
    e.preventDefault();
    const editId = document.getElementById('dream-edit-id').value;
    const title = document.getElementById('dream-title').value;
    const desc = document.getElementById('dream-desc').value;

    try {
      if (editId) {
        await updateDream(editId, { title, description: desc });
        showToast("تم تعديل الحلم بنجاح! ☁️");
      } else {
        const tier = getCurrentTenantTier();
        const limit = TIER_LIMITS[tier]?.dreams || 5;
        const currentCount = document.querySelectorAll('#admin-dreams-list .creator-stage-item').length;
        if (currentCount >= limit) {
          showToast(`عذراً، الباقة الحالية تسمح بحد أقصى ${limit} أحلام فقط! ⚠️`);
          return;
        }
        await saveDream(currentSpaceId, { title, description: desc });
        showToast("تم إضافة الحلم بنجاح! ☁️");
      }
      closeModal('modal-add-dream');
      loadDreamsList();
    } catch (err) {
      console.error(err);
      showToast("خطأ في حفظ الحلم: " + err.message);
    }
  };

  // Add Memory button
  document.getElementById('admin-btn-add-memory').onclick = () => {
    document.getElementById('form-add-memory').reset();
    document.getElementById('edit-memory-id').value = "";
    document.getElementById('edit-memory-photo-url').value = "";
    document.querySelector('#modal-add-memory .modal-title').textContent = "تخليد ذكرى جديدة 💖";
    openModal('modal-add-memory');
  };
  document.getElementById('form-add-memory').onsubmit = async (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-memory-id').value;
    const title = document.getElementById('memory-title').value;
    const date = document.getElementById('memory-date').value;
    const desc = document.getElementById('memory-desc').value;
    const file = document.getElementById('memory-photo').files[0];

    let photoUrl = document.getElementById('edit-memory-photo-url').value || "";
    if (file) {
      showToast("جاري رفع صورة الذكرى...");
      try {
        photoUrl = await uploadMedia(file);
      } catch (err) {
        console.error(err);
      }
    }

    try {
      if (editId) {
        await updateMemory(editId, { title, date, description: desc, photoUrl });
        showToast("تم تعديل الذكرى بنجاح! 📸");
      } else {
        const tier = getCurrentTenantTier();
        const limit = TIER_LIMITS[tier]?.memories || 8;
        const currentCount = document.querySelectorAll('#admin-memories-list .creator-stage-item').length;
        if (currentCount >= limit) {
          showToast(`عذراً، الباقة الحالية تسمح بحد أقصى ${limit} ذكريات فقط! ⚠️`);
          return;
        }
        await saveMemory(currentSpaceId, { title, date, description: desc, photoUrl });
        showToast("تم حفظ الذكرى بنجاح! 📸");
      }
      closeModal('modal-add-memory');
      loadMemoriesList();
    } catch (err) {
      console.error(err);
      showToast("خطأ في حفظ الذكرى: " + err.message);
    }
  };

  // Add Photo button
  document.getElementById('admin-btn-add-photo').onclick = () => openModal('modal-add-photo');
  document.getElementById('form-add-photo').onsubmit = async (e) => {
    e.preventDefault();
    const tier = getCurrentTenantTier();
    const limit = TIER_LIMITS[tier]?.photos || 10;
    const currentCount = document.querySelectorAll('#admin-gallery-list .gallery-card').length;
    if (currentCount >= limit) {
      showToast(`عذراً، الباقة الحالية تسمح بحد أقصى ${limit} صور معرض فقط! ⚠️`);
      return;
    }

    const file = document.getElementById('gallery-file').files[0];
    const caption = document.getElementById('gallery-caption').value;

    if (!file) return;
    showToast("جاري رفع الصورة للمعرض...");
    try {
      const url = await uploadMedia(file);
      await saveGalleryItem(currentSpaceId, { url, caption });
      showToast("تمت إضافة الصورة للمعرض! 🖼️");
      closeModal('modal-add-photo');
      loadGalleryList();
    } catch (err) {
      console.error(err);
      showToast("فشل الرفع للمعرض.");
    }
  };

  document.getElementById('admin-btn-add-date').onclick = () => {
    document.getElementById('form-add-date').reset();
    document.getElementById('edit-date-id').value = "";
    document.getElementById('date-is-milestone').checked = false;
    document.getElementById('date-is-recurring').checked = true;
    document.querySelector('#modal-add-date .modal-title').textContent = "تخليد موعد مميز 📌";
    openModal('modal-add-date');
  };
  document.getElementById('form-add-date').onsubmit = async (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-date-id').value;
    const title = document.getElementById('date-title').value;
    const val = document.getElementById('date-value').value;
    const isMilestone = document.getElementById('date-is-milestone').checked;
    const isRecurring = document.getElementById('date-is-recurring').checked;
    const desc = isMilestone ? '[milestone]' : '';

    try {
      if (editId) {
        await updateImportantDate(editId, { title, date: val, isRecurring, description: desc });
        showToast("تم تعديل المناسبة بنجاح! 📅");
      } else {
        const tier = getCurrentTenantTier();
        const limit = TIER_LIMITS[tier]?.dates || 5;
        const currentCount = document.querySelectorAll('#admin-dates-list .creator-stage-item').length;
        if (currentCount >= limit) {
          showToast(`عذراً، الباقة الحالية تسمح بحد أقصى ${limit} مواعيد فقط! ⚠️`);
          return;
        }
        await saveImportantDate(currentSpaceId, { title, date: val, isRecurring, description: desc });
        showToast("تم حفظ المناسبة بنجاح! 📅");
      }
      closeModal('modal-add-date');
      loadDatesList();
    } catch (err) {
      console.error(err);
      showToast("فشل الحفظ: " + err.message);
    }
  };

  // Modal close handlers
  document.querySelectorAll('.modal-close, .modal').forEach(closer => {
    closer.onclick = (e) => {
      if (e.target.closest('.modal-content') && !e.target.closest('.modal-close')) return;
      const m = closer.closest('.modal');
      if (m) m.classList.add('hidden');
    };
  });

  // Save All Changes Button
  document.getElementById('admin-btn-save').onclick = async () => {
    showToast("جاري حفظ التعديلات الكلية...");

    // 1. Save UI Text Settings
    const uiOverrides = {};
    for (const key of Object.keys(DEFAULT_UI_TEXTS)) {
      const input = document.getElementById(`text-${key}`);
      if (input) {
        uiOverrides[key] = input.value;
      }
    }

    try {
      await updateSpaceUI(currentSpaceId, uiOverrides);

      // 2. Upload Avatars if selected
      const hisFile = document.getElementById('admin-his-photo').files[0];
      const herFile = document.getElementById('admin-her-photo').files[0];
      
      let newHisUrl = hisPhotoUrl;
      let newHerUrl = herPhotoUrl;

      if (hisFile) {
        showToast("جاري رفع صورة الشاب...");
        newHisUrl = await uploadMedia(hisFile);
      }
      if (herFile) {
        showToast("جاري رفع صورة الفتاة...");
        newHerUrl = await uploadMedia(herFile);
      }

      await updateSpacePhotos(currentSpaceId, newHisUrl, newHerUrl);
      hisPhotoUrl = newHisUrl;
      herPhotoUrl = newHerUrl;

      // 3. Save Game Settings (Stages, Theme overrides, limits)
      const startDateVal = document.getElementById('admin-start-date').value;
      const expiryDateVal = document.getElementById('admin-expiry-date').value;

      const gameData = {
        id: currentGameId,
        coupleSpaceId: currentSpaceId,
        stages: stages,
        theme: activeTheme,
        customization: readStylingSliders(),
        startDate: startDateVal ? new Date(startDateVal).toISOString() : null,
        expiryDate: expiryDateVal ? new Date(expiryDateVal).toISOString() : null
      };

      const savedGameId = await saveGame(gameData);
      currentGameId = savedGameId;

      showToast("تم حفظ جميع التعديلات بنجاح! 💖🎉");
      updateShareLinkUI();
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء الحفظ الكلي: " + err.message);
    }
  };

  // Copy Player Link
  document.getElementById('admin-btn-copy-link').onclick = () => {
    const input = document.getElementById('admin-share-link');
    input.select();
    navigator.clipboard.writeText(input.value);
    showToast("تم نسخ الرابط بنجاح! 📋");
  };

  // WhatsApp Share
  document.getElementById('admin-btn-whatsapp-share').onclick = () => {
    const link = document.getElementById('admin-share-link').value;
    const msg = `حبيبتي الغالية، لقد صنعت لك لعبة مفاجئة خاصة بذكرانا الجميلة! العبيها من هنا: ${link} 💖`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Passwords Form Submit
  document.getElementById('form-update-passwords').onsubmit = async (e) => {
    e.preventDefault();
    const playerPassword = document.getElementById('admin-player-password').value.trim();
    const adminPassword = document.getElementById('admin-space-password').value.trim();

    if (playerPassword.length < 4 || adminPassword.length < 4) {
      showToast("يجب أن تكون كلمة المرور 4 أحرف أو أكثر ⚠️");
      return;
    }

    showToast("جاري تحديث كلمات المرور... 🔑");
    try {
      await updateSpacePasswords(currentSpaceId, playerPassword, adminPassword);
      showToast("تم تحديث كلمات المرور بنجاح! 🔐💖");
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء تحديث كلمات المرور: " + err.message);
    }
  };
}

function updateShareLinkUI() {
  const shareLinkInput = document.getElementById('admin-share-link');
  const slug = getCurrentTenantSlug();
  const gameLink = slug ? `${window.location.origin}/#play/${slug}` : `${window.location.origin}/#play/${currentGameId}`;
  shareLinkInput.value = gameLink;

  document.getElementById('admin-share-link-wrapper').classList.remove('hidden');
  document.getElementById('admin-save-first-message').classList.add('hidden');
}

function hideShareLinkUI() {
  document.getElementById('admin-share-link-wrapper').classList.add('hidden');
  document.getElementById('admin-save-first-message').classList.remove('hidden');
}

/* ============================================================================
   HELPERS & UTILS
   ============================================================================ */

function openModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove('hidden');
  }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('hidden');
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

function rgbToHex(rgbStr) {
  if (!rgbStr || !rgbStr.startsWith('rgb')) return rgbStr;
  const match = rgbStr.match(/\d+/g);
  if (!match) return rgbStr;
  return "#" + ((1 << 24) + (parseInt(match[0]) << 16) + (parseInt(match[1]) << 8) + parseInt(match[2])).toString(16).slice(1);
}

function showToast(msg) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

function initFlatpickr() {
  if (typeof window.flatpickr !== 'undefined') {
    window.flatpickr("#date-value", {
      locale: "ar",
      dateFormat: "Y-m-d",
      disableMobile: true,
      changeMonth: true,
      changeYear: true,
      minDate: "1940-01-01",
      maxDate: "2050-12-31"
    });
    window.flatpickr("#text-relationshipStartDate", {
      locale: "ar",
      dateFormat: "Y-m-d",
      disableMobile: true,
      changeMonth: true,
      changeYear: true,
      minDate: "1940-01-01",
      maxDate: "2050-12-31"
    });
    window.flatpickr("#memory-date", {
      locale: "ar",
      dateFormat: "Y-m-d",
      disableMobile: true,
      changeMonth: true,
      changeYear: true,
      minDate: "1940-01-01",
      maxDate: "2050-12-31"
    });
    window.flatpickr("#filter-stats-date", {
      locale: "ar",
      dateFormat: "Y-m-d",
      disableMobile: true,
      changeMonth: true,
      changeYear: true,
      minDate: "1940-01-01",
      maxDate: "2050-12-31"
    });
    // Start/expiry dates
    window.flatpickr("#admin-start-date, #admin-expiry-date", {
      locale: "ar",
      enableTime: true,
      dateFormat: "Y-m-d H:i",
      disableMobile: true,
      changeMonth: true,
      changeYear: true,
      minDate: "1940-01-01",
      maxDate: "2050-12-31"
    });
  }
}
