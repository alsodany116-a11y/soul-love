// Love Hunt - Master Coordinator and Router Module (Arabic Only)
import { 
  verifySpacePassword, isSpaceUnlocked, fetchGame, fetchSpaceUI, findSpaceByPassword, fetchGamesBySpace 
} from './storage.js';
import { initPlayer, setupCelebrationScreen, playGameMusic } from './player.js';
import { initJourney } from './journey.js';
import { applyThemeStyles } from './themes.js';
import { setTenantBySlug } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  // Unregister any conflicting service workers on play to prevent loading cached admin pages
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) {
        registration.unregister();
      }
    });
  }

  // Bootstrap Router on hash changes
  window.addEventListener('hashchange', router);
  
  // Setup visible password fields globally
  setupGlobalPasswordToggles();

  // Run Router for initial load
  router();
});

async function router() {
  const hash = window.location.hash;

  // Hide all screens immediately to prevent any flash
  document.querySelectorAll('.app-screen').forEach(s => s.classList.add('hidden'));

  // Get space slug from query string parameter or directly from pathname
  const urlParams = new URLSearchParams(window.location.search);
  let spaceSlug = urlParams.get('space');
  if (!spaceSlug) {
    const pathParts = window.location.pathname.split('/').filter(p => p);
    // If we are on a clean path like /osha-basmala, the first part is the slug
    if (pathParts.length > 0 && pathParts[0] !== 'play' && pathParts[0] !== 'admin' && pathParts[0] !== 'admin-space') {
      spaceSlug = pathParts[0];
    }
  }

  if (!spaceSlug) {
    // If no space slug is loaded, redirect back to dashboard
    window.location.replace('./');
    return;
  }

  // Update PWA Manifest dynamically for this specific space/game
  updateDynamicManifest(spaceSlug, `رحلة الحب — ${spaceSlug}`, `/${spaceSlug}`);

  // Known player routes
  const validPlayerRoute = hash.startsWith('#play/') || hash.startsWith('#journey/') || hash.startsWith('#lock/') || hash.startsWith('#celebration/');

  // If no hash or invalid hash, auto-redirect to lock screen for this space
  if (!hash || hash === '#' || hash === '#welcome' || !validPlayerRoute) {
    window.location.replace(`#lock/play/${spaceSlug}`);
    return;
  }

  const parts = hash.split('/');
  const route = parts[0];
  const param = parts[1];
  const subParam = parts[2];

  // Admin redirect hook for play/slug/admin and journey/slug/admin (sends to root dashboard)
  if ((route === '#play' || route === '#journey') && subParam === 'admin') {
    window.location.href = `./#${param}`;
    return;
  }

  // Hide all screens initially
  document.querySelectorAll('.app-screen').forEach(screen => {
    screen.classList.add('hidden');
  });

  switch (route) {
    case '#welcome':
      window.location.replace(`#lock/play/${spaceSlug}`);
      break;

    case '#play':
      if (!param) {
        window.location.replace(`#lock/play/${spaceSlug}`);
        break;
      }

      try {
        const tenantDetails = await setTenantBySlug(param);
        const spaceId = tenantDetails.id;
        
        const game = await fetchGame(param); // Loads the active game from tenant db
        if (!game) {
          showToast("عذراً، لم يقم الشريك بإعداد الألغاز بعد!");
          window.location.hash = '#welcome';
          break;
        }

        // Guard Check: Space must be unlocked to play
        if (isSpaceUnlocked(spaceId)) {
          showScreen('screen-player');
          initPlayer(param);
        } else {
          window.location.hash = `#lock/play/${param}`;
        }
      } catch (err) {
        console.error(err);
        showToast("خطأ في تحميل اللعبة.");
        window.location.hash = '#welcome';
      }
      break;

    case '#celebration':
      if (!param) {
        window.location.hash = '#welcome';
        break;
      }
      try {
        await setTenantBySlug(param);
        showScreen('screen-celebration');
        setupCelebrationScreen(param);
      } catch (err) {
        console.error(err);
        showToast("خطأ في تحميل صفحة الاحتفال.");
        window.location.hash = '#welcome';
      }
      break;

    case '#journey':
      if (!param) {
        window.location.hash = '#welcome';
        break;
      }

      try {
        const tenantDetails = await setTenantBySlug(param);
        const spaceId = tenantDetails.id;

        // Guard Lock Check
        if (isSpaceUnlocked(spaceId)) {
          showScreen('screen-journey');
          initJourney(spaceId);
        } else {
          window.location.hash = `#lock/journey/${param}`;
        }
      } catch (err) {
        console.error(err);
        showToast("خطأ في تحميل مسار الذكريات.");
        window.location.hash = '#welcome';
      }
      break;

    case '#lock':
      // Lock route parameters: #lock/<action>/<slug>
      if (!param || !subParam) {
        window.location.hash = '#welcome';
        break;
      }
      showScreen('screen-lock');
      initLockScreen(param, subParam);
      break;

    default:
      window.location.hash = '#welcome';
      break;
  }
}

/**
 * Activates display on target screen.
 */
function showScreen(screenId) {
  // Remove all active screens first
  document.querySelectorAll('.app-screen').forEach(s => {
    s.classList.remove('screen-active');
    s.classList.add('hidden');
  });
  // Show the target screen
  const elem = document.getElementById(screenId);
  if (elem) {
    elem.classList.remove('hidden');
    elem.classList.add('screen-active');
  }
}

/**
 * Handles Lock Screen password entry and validation.
 */
async function initLockScreen(targetAction, targetId) {
  const form = document.getElementById('form-lock-screen');
  const errorMsg = document.getElementById('lock-error-msg');
  errorMsg.classList.add('hidden');
  form.reset();

  let spaceId = null;
  let customTexts = {
    lockTitle: "مغلق بالحب 🔒",
    lockDesc: "الرجاء إدخال كلمة المرور المشتركة للدخول إلى مساحة الحب.",
    lockPlaceholder: "رمز المرور...",
    lockBtn: "فتح المساحة 🔑",
    lockError: "كلمة المرور غير صحيحة، حاول مجدداً يا حب! 💖"
  };

  try {
    if (targetAction === 'play' || targetAction === 'journey') {
      const tenantDetails = await setTenantBySlug(targetId);
      spaceId = tenantDetails.id;
      
      const data = await fetchSpaceUI(spaceId);
      customTexts = data.uiTexts;
      
      const game = await fetchGame(targetId);
      if (game) {
        // Instantly apply the selected theme styles & variables to the lock screen
        applyThemeStyles(game.theme, document.documentElement, game.customization);
      } else {
        applyThemeStyles('rose_garden', document.documentElement, {});
      }
    } else if (targetAction === 'generic') {
      // Default placeholder style until matching password finds custom theme
      applyThemeStyles('rose_garden', document.documentElement, {});
    }

    // Set UI Texts to inputs
    document.getElementById('lock-screen-title').textContent = customTexts.lockTitle;
    document.getElementById('lock-screen-desc').textContent = customTexts.lockDesc;
    document.getElementById('lock-password-input').placeholder = customTexts.lockPlaceholder;
    document.getElementById('lock-screen-btn').innerHTML = `${customTexts.lockBtn} <i class="fa-solid fa-heart"></i>`;
    document.getElementById('lock-error-msg').textContent = customTexts.lockError;

  } catch (err) {
    console.error("Lock screen boot error:", err);
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    const password = document.getElementById('lock-password-input').value;
    
    if (targetAction === 'generic') {
      showToast("جاري البحث عن مساحة الحب... 🔍");
      const space = await findSpaceByPassword(password);
      
      if (space) {
        showToast("تم التحقق بنجاح! 🔓💖");
        try {
          playGameMusic(space.id, true);
        } catch (musicErr) {
          console.warn("Failed to trigger music on generic unlock:", musicErr);
        }
        const games = await fetchGamesBySpace(space.id);
        
        if (games && games.length > 0) {
          applyThemeStyles(games[0].theme, document.documentElement, games[0].customization);
          window.location.hash = `#play/${games[0].id}`;
        } else {
          // Fallback to empty journey if no game was configured yet
          window.location.hash = `#journey/${space.id}`;
        }
      } else {
        errorMsg.classList.remove('hidden');
        document.querySelector('#screen-lock .lock-box').classList.add('shake');
        setTimeout(() => {
          document.querySelector('#screen-lock .lock-box').classList.remove('shake');
        }, 450);
      }
    } else {
      // Match password for the specific spaceId
      const isMatch = await verifySpacePassword(spaceId, password);
      if (isMatch) {
        showToast("تم تأكيد كلمة المرور بنجاح! 💖");
        // Attempt to play music immediately on user interaction
        try {
          playGameMusic(spaceId, true);
        } catch (musicErr) {
          console.warn("Failed to trigger music on lock unlock:", musicErr);
        }
        window.location.hash = `#${targetAction}/${targetId}`;
      } else {
        errorMsg.classList.remove('hidden');
        document.querySelector('#screen-lock .lock-box').classList.add('shake');
        setTimeout(() => {
          document.querySelector('#screen-lock .lock-box').classList.remove('shake');
        }, 450);
      }
    }
  };
}

/**
 * Setup password text toggles globally (reveals passcodes).
 */
function setupGlobalPasswordToggles() {
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
 * Helper to display toast notifications.
 */
export function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

/**
 * Dynamically updates the PWA manifest of the page using a Blob URL.
 */
function updateDynamicManifest(slug, name, startUrl) {
  try {
    const manifestEl = document.getElementById('pwa-manifest');
    if (!manifestEl) return;

    const manifestData = {
      "name": name,
      "short_name": name,
      "description": "لعبة ألغاز وذكريات رومانسية مشتركة مخصصة",
      "start_url": startUrl,
      "scope": startUrl,
      "display": "standalone",
      "display_override": ["standalone", "minimal-ui"],
      "orientation": "portrait-primary",
      "background_color": "#ffffff",
      "theme_color": "#ff758c",
      "lang": "ar",
      "dir": "rtl",
      "icons": [
        {
          "src": "/icon-192.png",
          "sizes": "192x192",
          "type": "image/png",
          "purpose": "any"
        },
        {
          "src": "/icon-512.png",
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "any maskable"
        }
      ]
    };

    const manifestString = JSON.stringify(manifestData);
    const manifestBlob = new Blob([manifestString], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(manifestBlob);
    manifestEl.setAttribute('href', manifestURL);
  } catch (err) {
    console.warn("Failed to generate dynamic manifest:", err);
  }
}

