// Love Hunt - Master Coordinator and Router Module (Arabic Only)
import { 
  verifySpacePassword, isSpaceUnlocked, fetchGame, fetchSpaceUI, findSpaceByPassword, fetchGamesBySpace 
} from './storage.js';
import { initPlayer, setupCelebrationScreen } from './player.js';
import { initJourney } from './journey.js';
import { applyThemeStyles } from './themes.js';
import { setTenantBySlug } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker Registered.', reg))
      .catch(err => console.log('Service Worker Failed to Register.', err));
  }

  // Bootstrap Router on hash changes
  window.addEventListener('hashchange', router);
  
  // Setup visible password fields globally
  setupGlobalPasswordToggles();

  // Run Router for initial load
  router();
});

/**
 * Client-Side Router. Evaluates URL hashes and activates matching screens.
 */
async function router() {
  const hash = window.location.hash;

  // Hide all screens immediately to prevent any flash
  document.querySelectorAll('.app-screen').forEach(s => s.classList.add('hidden'));

  // Known player routes
  const validPlayerRoute = hash.startsWith('#play/') || hash.startsWith('#journey/') || hash.startsWith('#lock/') || hash.startsWith('#celebration/');

  // Redirect root/welcome/unknown to admin
  if (!hash || hash === '#' || hash === '#welcome' || !validPlayerRoute) {
    window.location.replace('./admin/');
    return;
  }

  const parts = hash.split('/');
  const route = parts[0];
  const param = parts[1];
  const subParam = parts[2];

  // Admin redirect hook for play/slug/admin and journey/slug/admin
  if ((route === '#play' || route === '#journey') && subParam === 'admin') {
    window.location.href = `./admin/#${param}`;
    return;
  }

  // Hide all screens initially
  document.querySelectorAll('.app-screen').forEach(screen => {
    screen.classList.add('hidden');
  });

  switch (route) {
    case '#welcome':
      showScreen('screen-welcome');
      // Apply default styling overrides
      applyThemeStyles('rose_garden', document.documentElement, {});
      break;

    case '#play':
      if (!param) {
        window.location.hash = '#welcome';
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
        const games = await fetchGamesBySpace(space.id);
        
        if (games && games.length > 0) {
          // Set custom theme and route straight to play screen
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
