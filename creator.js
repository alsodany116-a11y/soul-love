// Love Hunt - Game Creator Panel Logic
import { getSupabase } from './config.js';
import { DEFAULT_THEMES, applyThemeStyles, startThemeAnimation } from './themes.js';
import { saveGame, fetchGamesBySpace, uploadMedia } from './storage.js';
import { getLang } from './i18n.js';

// Application creator state variables
let currentSpaceId = null;
let currentGameId = null;
let activeTheme = 'rose_garden';
let stages = [];
let customizationOverrides = {};
let customMusicUrl = "";
let celebrationMediaUrl = "";

// Default initial stage templates to populate a new game
const DEFAULT_STAGES = [
  {
    title: "The First Glance",
    message: "It was a moment frozen in time. The world faded into the background, and all that was left was you.",
    question: "In what city or specific location did our eyes first meet?",
    type: "text",
    answer: "Rome",
    hint: "It begins with the letter 'R'...",
    mediaUrl: "",
    successMsg: "Correct! That day changed my life forever. 💖",
    failMsg: "No, try to think of our very first encounter. 💕"
  },
  {
    title: "Sweet Delights",
    message: "Our conversations flowed like water, and time disappeared when we shared that sweet dessert.",
    question: "How many scoops of ice cream did we share on that date? (Enter a number)",
    type: "number",
    answer: "3",
    hint: "It was more than two but less than four...",
    mediaUrl: "",
    successMsg: "Yes! Three scoops of pure sweet happiness! 🍦",
    failMsg: "Hmm, that doesn't sound quite right. Try another number! 🍧"
  }
];

/**
 * Initializes the Game Creator workspace.
 * @param {string} spaceId Couple space identifier
 */
export async function initCreator(spaceId) {
  currentSpaceId = spaceId;
  currentGameId = null;
  stages = [];
  customizationOverrides = {};
  customMusicUrl = "";
  celebrationMediaUrl = "";
  
  // Set up event listeners (only run once)
  setupCreatorListeners();

  // Load existing game if it exists in Supabase
  const loadingMsg = getLang() === 'ar' ? "جاري تحميل مساحة الحب الخاصة بكما..." : "Loading your love space...";
  showToast(loadingMsg);
  try {
    const games = await fetchGamesBySpace(spaceId);
    if (games && games.length > 0) {
      // Load the most recent game
      const game = games[0];
      currentGameId = game.id;
      stages = game.stages || [];
      activeTheme = game.theme || 'rose_garden';
      customizationOverrides = game.customization || {};
      customMusicUrl = game.musicUrl || "";
      celebrationMediaUrl = game.celebrationMediaUrl || "";

      // Populate Inputs
      document.getElementById('creator-final-message').value = game.finalMessage || "";
      document.getElementById('creator-gift-message').value = game.giftMessage || "";
      
      if (game.startDate) {
        document.getElementById('creator-start-date').value = new Date(game.startDate).toISOString().slice(0, 16);
      }
      if (game.expiryDate) {
        document.getElementById('creator-expiry-date').value = new Date(game.expiryDate).toISOString().slice(0, 16);
      }

      // Populate Stats
      document.getElementById('stats-views').textContent = game.views || 0;
      document.getElementById('stats-completions').textContent = game.completions || 0;

      // Select proper music in dropdown
      const musicSelect = document.getElementById('creator-music-select');
      const presetOption = Array.from(musicSelect.options).find(opt => opt.value === game.musicUrl);
      if (presetOption) {
        musicSelect.value = game.musicUrl;
        document.getElementById('creator-custom-music-group').classList.add('hidden');
      } else if (game.musicUrl) {
        musicSelect.value = 'custom';
        document.getElementById('creator-custom-music-group').classList.remove('hidden');
        document.getElementById('custom-music-upload-status').textContent = getLang() === 'ar' ? "الملف المرفوع نشط" : "Uploaded File Active";
      }

      // Populate styling controls from saved customizations
      populateStylingControls(customizationOverrides, activeTheme);
      updateShareLinkUI();
    } else {
      // Setup default template game
      stages = [...DEFAULT_STAGES];
      activeTheme = 'rose_garden';
      customizationOverrides = {};
      
      document.getElementById('creator-final-message').value = getLang() === 'ar' ? "لقد أكملت الرحلة بنجاح! أحبك كثيراً يا شريك عمري." : "You completed the journey! I love you so much.";
      document.getElementById('creator-gift-message').value = getLang() === 'ar' ? "هديتي لك: وعد بضحكات لا تنتهي، دعم كامل في كل خطوة، ومغامرات لا تنسى يداً بيد طوال العمر. 💖" : "My gift to you: A lifetime of laughter, support, and adventures. I promise to stand by you always. 💖";
      
      document.getElementById('stats-views').textContent = 0;
      document.getElementById('stats-completions').textContent = 0;
      
      populateStylingControls({}, 'rose_garden');
      hideShareLinkUI();
    }

    renderStagesList();
    applyVisualStyles();
    syncLivePreview();
  } catch (error) {
    console.error("Error loading creator space:", error);
    showToast(getLang() === 'ar' ? "خطأ في تحميل لوحة صانع الألعاب." : "Error initializing creator panel.");
  }
}

/**
 * Renders the list of quiz stages in the Stages tab.
 */
function renderStagesList() {
  const container = document.getElementById('creator-stages-list');
  container.innerHTML = "";

  if (stages.length === 0) {
    const alertMsg = getLang() === 'ar' ? "لم تقم بإنشاء مراحل للعبة بعد. اضغط على 'إضافة مرحلة' للبدء!" : "No stages created. Click 'Add Stage' to begin!";
    container.innerHTML = `<div class="info-alert">${alertMsg}</div>`;
    return;
  }

  stages.forEach((stage, index) => {
    const item = document.createElement('div');
    item.className = 'creator-stage-item';
    
    let typeName = "Text Input";
    if (stage.type === 'multiple_choice') typeName = getLang() === 'ar' ? "اختيار من متعدد" : "Multiple Choice";
    else if (stage.type === 'number') typeName = getLang() === 'ar' ? "إجابة رقمية" : "Number Bound";
    else typeName = getLang() === 'ar' ? "إجابة نصية" : "Text Input";

    const stageLabel = getLang() === 'ar' ? `المرحلة ${index + 1}` : `Stage ${index + 1}`;

    item.innerHTML = `
      <div class="stage-item-info">
        <span class="stage-item-title">${stageLabel}: ${escapeHTML(stage.title)}</span>
        <span class="stage-item-type">${typeName}</span>
      </div>
      <div class="stage-item-actions">
        <button class="stage-action-btn btn-up" data-index="${index}" title="Move Up" ${index === 0 ? 'disabled' : ''}>
          <i class="fa-solid fa-arrow-up"></i>
        </button>
        <button class="stage-action-btn btn-down" data-index="${index}" title="Move Down" ${index === stages.length - 1 ? 'disabled' : ''}>
          <i class="fa-solid fa-arrow-down"></i>
        </button>
        <button class="stage-action-btn btn-edit" data-index="${index}" title="Edit Configuration">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="stage-action-btn btn-delete" data-index="${index}" title="Delete Stage" style="color: #ff5252;">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
    container.appendChild(item);
  });
}

/**
 * Appends custom styling variable selections into form input fields.
 */
function populateStylingControls(overrides, themeName) {
  const theme = { ...DEFAULT_THEMES[themeName], ...overrides };

  // Set Theme preset active button
  document.querySelectorAll('.theme-preset-btn').forEach(btn => {
    if (btn.getAttribute('data-theme') === themeName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Fonts
  document.getElementById('style-font-family').value = theme.fontFamily;
  document.getElementById('style-font-size-title').value = theme.fontSizeTitle;
  document.getElementById('style-font-size-body').value = theme.fontSizeBody;
  
  // Colors
  document.getElementById('style-color-title').value = rgbToHex(theme.colorTextTitle) || theme.colorTextTitle;
  document.getElementById('style-color-body').value = rgbToHex(theme.colorTextBody) || theme.colorTextBody;
  document.getElementById('style-color-btn-text').value = rgbToHex(theme.colorTextButton) || theme.colorTextButton;
  
  document.getElementById('style-bg-color').value = theme.bgColor;
  document.getElementById('style-card-bg-color').value = theme.cardBgColor;
  document.getElementById('style-btn-color').value = rgbToHex(theme.buttonColor) || theme.buttonColor;
  document.getElementById('style-btn-hover-color').value = rgbToHex(theme.buttonHoverColor) || theme.buttonHoverColor;
  document.getElementById('style-border-color').value = rgbToHex(theme.borderColor) || theme.borderColor;
  document.getElementById('style-progress-color').value = rgbToHex(theme.progressBarColor) || theme.progressBarColor;

  // Layouts
  document.getElementById('style-border-radius').value = theme.borderRadius;
  document.getElementById('style-card-width').value = theme.cardWidth;
  document.getElementById('style-card-padding').value = theme.padding;

  // Transitions & Toggle
  document.getElementById('style-stage-transition').value = theme.animationTransition || 'fade';
  document.getElementById('style-toggle-particles').checked = overrides.particlesEnabled !== false;
}

/**
 * Reads all styling input selections and compiles customization overrides.
 */
function readStylingInputs() {
  const overrides = {
    fontFamily: document.getElementById('style-font-family').value,
    fontSizeTitle: document.getElementById('style-font-size-title').value,
    fontSizeBody: document.getElementById('style-font-size-body').value,
    
    colorTextTitle: document.getElementById('style-color-title').value,
    colorTextBody: document.getElementById('style-color-body').value,
    colorTextButton: document.getElementById('style-color-btn-text').value,
    
    bgColor: document.getElementById('style-bg-color').value,
    cardBgColor: document.getElementById('style-card-bg-color').value,
    buttonColor: document.getElementById('style-btn-color').value,
    buttonHoverColor: document.getElementById('style-btn-hover-color').value,
    borderColor: document.getElementById('style-border-color').value,
    progressBarColor: document.getElementById('style-progress-color').value,

    borderRadius: document.getElementById('style-border-radius').value,
    cardWidth: document.getElementById('style-card-width').value,
    padding: document.getElementById('style-card-padding').value,
    
    animationTransition: document.getElementById('style-stage-transition').value,
    particlesEnabled: document.getElementById('style-toggle-particles').checked
  };

  customizationOverrides = overrides;
}

/**
 * Applies active theme variables & overrides to the Creator main interface.
 */
function applyVisualStyles() {
  readStylingInputs();
  applyThemeStyles(activeTheme, document.documentElement, customizationOverrides);

  // Trigger particle engine refresh if checked
  const canvas = document.getElementById('theme-canvas');
  if (customizationOverrides.particlesEnabled) {
    startThemeAnimation(activeTheme, canvas);
  } else {
    // Clear canvas
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/**
 * Synchronizes the visual mobile screen preview in the creator side panel.
 */
function syncLivePreview() {
  const container = document.getElementById('live-preview-container');
  applyThemeStyles(activeTheme, container, customizationOverrides);

  // Set background of preview container to mirror game background
  container.style.background = customizationOverrides.bgColor;

  if (stages.length > 0) {
    const stage = stages[0]; // Always preview the first stage
    
    const stageLabel = getLang() === 'ar' ? `المرحلة 1 من ${stages.length}` : `Stage 1 of ${stages.length}`;
    document.getElementById('preview-stage-counter').textContent = stageLabel;
    
    document.getElementById('live-preview-progress').style.width = `${(1 / stages.length) * 100}%`;
    document.getElementById('live-preview-title').textContent = stage.title;
    document.getElementById('live-preview-message').textContent = stage.message;
    document.getElementById('live-preview-question').textContent = stage.question;

    // Media
    const mediaDiv = document.getElementById('live-preview-media');
    if (stage.mediaUrl) {
      mediaDiv.innerHTML = `<img src="${stage.mediaUrl}" alt="Preview Stage Media">`;
      mediaDiv.classList.remove('hidden');
    } else {
      mediaDiv.classList.add('hidden');
    }

    // Input fields mapping
    const inputArea = document.getElementById('live-preview-input-area');
    inputArea.innerHTML = "";
    if (stage.type === 'multiple_choice') {
      const choices = stage.choices ? stage.choices.split(',') : ['Option A', 'Option B'];
      const grid = document.createElement('div');
      grid.className = 'mcq-grid';
      choices.forEach(ch => {
        const btn = document.createElement('button');
        btn.className = `mcq-option-btn ${ch.trim() === stage.answer.trim() ? 'selected' : ''}`;
        btn.textContent = ch.trim();
        btn.disabled = true;
        grid.appendChild(btn);
      });
      inputArea.appendChild(grid);
    } else {
      const input = document.createElement('input');
      input.type = stage.type === 'number' ? 'number' : 'text';
      input.className = 'preview-input-element';
      input.placeholder = stage.type === 'number' ? 
        (getLang() === 'ar' ? "أدخل رقم..." : "Enter number...") : 
        (getLang() === 'ar' ? "إجابتك..." : "Your answer...");
      input.disabled = true;
      inputArea.appendChild(input);
    }
  }
}

/**
 * Saves game configuration changes to Supabase.
 */
async function saveCreatorGame() {
  if (stages.length === 0) {
    const err = getLang() === 'ar' ? "يجب إضافة مرحلة واحدة على الأقل قبل حفظ اللعبة!" : "You need to add at least one stage before saving!";
    showToast(err);
    return;
  }

  showToast(getLang() === 'ar' ? "جاري حفظ اللعبة..." : "Saving game...");
  readStylingInputs();

  // Handle music selector
  const musicSelect = document.getElementById('creator-music-select');
  let musicUrl = musicSelect.value;
  if (musicUrl === 'custom') {
    musicUrl = customMusicUrl;
    if (!musicUrl) {
      showToast(getLang() === 'ar' ? "يرجى رفع ملف موسيقى أولاً أو اختيار أحد النغمات المتاحة." : "Please upload an MP3 file or choose a preset.");
      return;
    }
  }

  const finalMsg = document.getElementById('creator-final-message').value;
  const giftMsg = document.getElementById('creator-gift-message').value;
  const startDateVal = document.getElementById('creator-start-date').value;
  const expiryDateVal = document.getElementById('creator-expiry-date').value;

  const gameData = {
    id: currentGameId, // If null, storage will INSERT new record
    coupleSpaceId: currentSpaceId,
    stages: stages,
    theme: activeTheme,
    customization: customizationOverrides,
    musicUrl: musicUrl,
    finalMessage: finalMsg,
    giftMessage: giftMsg,
    celebrationMediaUrl: celebrationMediaUrl,
    startDate: startDateVal ? new Date(startDateVal).toISOString() : null,
    expiryDate: expiryDateVal ? new Date(expiryDateVal).toISOString() : null
  };

  try {
    const savedId = await saveGame(gameData);
    currentGameId = savedId;
    showToast(getLang() === 'ar' ? "تم حفظ اللعبة بنجاح! 💖" : "Game saved successfully! 💖");
    updateShareLinkUI();
  } catch (error) {
    console.error("Error saving game:", error);
    showToast(getLang() === 'ar' ? "فشل حفظ اللعبة. يرجى المحاولة لاحقاً." : "Failed to save game. Please try again.");
  }
}

/**
 * Formats the sharing block UI elements.
 */
function updateShareLinkUI() {
  const shareLinkWrapper = document.getElementById('creator-share-link-wrapper');
  const saveFirstMessage = document.getElementById('creator-save-first-message');
  const shareLinkInput = document.getElementById('creator-share-link');

  const gameLink = `${window.location.origin}${window.location.pathname}#play/${currentGameId}`;
  shareLinkInput.value = gameLink;

  shareLinkWrapper.classList.remove('hidden');
  saveFirstMessage.classList.add('hidden');
}

function hideShareLinkUI() {
  document.getElementById('creator-share-link-wrapper').classList.add('hidden');
  document.getElementById('creator-save-first-message').classList.remove('hidden');
}

/**
 * Binds DOM event listeners for interactive creator elements.
 */
function setupCreatorListeners() {
  // Tabs toggle
  document.querySelectorAll('.creator-tab-btn').forEach(btn => {
    btn.onclick = (e) => {
      document.querySelectorAll('.creator-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.creator-tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    };
  });

  // Theme Preset select
  document.querySelectorAll('.theme-preset-btn').forEach(btn => {
    btn.onclick = () => {
      activeTheme = btn.getAttribute('data-theme');
      populateStylingControls({}, activeTheme);
      applyVisualStyles();
      syncLivePreview();
    };
  });

  // Re-sync style overrides on input changes
  const styleInputs = [
    'style-font-family', 'style-font-size-title', 'style-font-size-body',
    'style-color-title', 'style-color-body', 'style-color-btn-text',
    'style-bg-color', 'style-card-bg-color', 'style-btn-color',
    'style-btn-hover-color', 'style-border-color', 'style-progress-color',
    'style-border-radius', 'style-card-width', 'style-card-padding',
    'style-stage-transition', 'style-toggle-particles'
  ];
  styleInputs.forEach(id => {
    const elem = document.getElementById(id);
    if (elem) {
      elem.oninput = () => {
        applyVisualStyles();
        syncLivePreview();
      };
    }
  });

  // Accordion Expand/Collapse
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.onclick = () => {
      const item = header.parentElement;
      const isActive = item.classList.contains('active');
      document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    };
  });

  // Stage builder list buttons (Move up, down, edit, delete)
  const stagesList = document.getElementById('creator-stages-list');
  stagesList.onclick = async (e) => {
    const btn = e.target.closest('.stage-action-btn');
    if (!btn) return;
    const index = parseInt(btn.getAttribute('data-index'));

    if (btn.classList.contains('btn-up')) {
      if (index > 0) {
        const temp = stages[index];
        stages[index] = stages[index - 1];
        stages[index - 1] = temp;
        renderStagesList();
        syncLivePreview();
      }
    } else if (btn.classList.contains('btn-down')) {
      if (index < stages.length - 1) {
        const temp = stages[index];
        stages[index] = stages[index + 1];
        stages[index + 1] = temp;
        renderStagesList();
        syncLivePreview();
      }
    } else if (btn.classList.contains('btn-delete')) {
      const deleteConfirm = getLang() === 'ar' ? "هل أنت متأكد من حذف هذه المرحلة نهائياً؟" : "Are you sure you want to delete this stage?";
      if (confirm(deleteConfirm)) {
        stages.splice(index, 1);
        renderStagesList();
        syncLivePreview();
        showToast(getLang() === 'ar' ? "تم حذف المرحلة." : "Stage removed.");
      }
    } else if (btn.classList.contains('btn-edit')) {
      openStageEditor(index);
    }
  };

  // Add Stage Button
  document.getElementById('creator-btn-add-stage').onclick = () => {
    openStageEditor(-1); // -1 signifies a new stage insertion
  };

  // Save Game Button
  document.getElementById('creator-btn-save-game').onclick = saveCreatorGame;

  // Copy Link Button
  document.getElementById('creator-btn-copy-link').onclick = () => {
    const linkInput = document.getElementById('creator-share-link');
    linkInput.select();
    navigator.clipboard.writeText(linkInput.value);
    showToast(getLang() === 'ar' ? "تم نسخ الرابط الحافظة! 📋" : "Link copied to clipboard! 📋");
  };

  // WhatsApp Share Button
  document.getElementById('creator-btn-whatsapp-share').onclick = () => {
    const link = document.getElementById('creator-share-link').value;
    const message = getLang() === 'ar' ? 
      `مرحباً يا حبيبي، لقد صنعت لك لعبة مفاجئة خاصة بذكرانا الجميلة! العبها من هنا: ${link} 💖` :
      `Hey love, I created a special surprise game just for you! Play it here: ${link} 💖`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Stage Config Editor Form Submit
  document.getElementById('form-stage-editor').onsubmit = async (e) => {
    e.preventDefault();
    const indexVal = document.getElementById('stage-editor-index').value;
    const index = parseInt(indexVal);

    const title = document.getElementById('stage-edit-title').value;
    const message = document.getElementById('stage-edit-message').value;
    const type = document.getElementById('stage-edit-type').value;
    const answer = document.getElementById('stage-edit-correct').value;
    const choices = document.getElementById('stage-edit-choices').value;
    const question = document.getElementById('stage-edit-question').value;
    const hint = document.getElementById('stage-edit-hint').value;
    const successMsg = document.getElementById('stage-edit-success').value;
    const failMsg = document.getElementById('stage-edit-fail').value;
    
    // Media attachment URL
    let mediaUrl = document.getElementById('stage-edit-media-url').value;
    const mediaFile = document.getElementById('stage-edit-media').files[0];

    if (mediaFile) {
      showToast(getLang() === 'ar' ? "جاري رفع ملف المرحلة..." : "Uploading stage file...");
      try {
        mediaUrl = await uploadMedia(mediaFile);
        showToast(getLang() === 'ar' ? "تم الرفع بنجاح!" : "Upload success!");
      } catch (err) {
        showToast(getLang() === 'ar' ? "فشل رفع الصورة." : "Media upload failed.");
        console.error(err);
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
      successMsg: successMsg || (getLang() === 'ar' ? "إجابة صحيحة وممتازة! 💖" : "Correct answer! 💖"),
      failMsg: failMsg || (getLang() === 'ar' ? "إجابة خاطئة، فكر مجدداً يا حب! 💕" : "Incorrect, try again! 💕")
    };

    if (index === -1) {
      stages.push(stageData);
      showToast(getLang() === 'ar' ? "تمت إضافة المرحلة بنجاح." : "Stage added.");
    } else {
      stages[index] = stageData;
      showToast(getLang() === 'ar' ? "تم تعديل المرحلة بنجاح." : "Stage updated.");
    }

    closeModal('modal-stage-editor');
    renderStagesList();
    syncLivePreview();
  };

  // Stage Editor Type listener
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

  // Music select dropdown change listener
  document.getElementById('creator-music-select').onchange = (e) => {
    const customMusicGroup = document.getElementById('creator-custom-music-group');
    if (e.target.value === 'custom') {
      customMusicGroup.classList.remove('hidden');
    } else {
      customMusicGroup.classList.add('hidden');
    }
  };

  // Custom Music File upload
  document.getElementById('creator-custom-music-file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('custom-music-upload-status').textContent = getLang() === 'ar' ? "جاري الرفع..." : "Uploading...";
    try {
      customMusicUrl = await uploadMedia(file);
      document.getElementById('custom-music-upload-status').textContent = getLang() === 'ar' ? "اكتمل الرفع!" : "Upload finished!";
      showToast(getLang() === 'ar' ? "تم رفع الموسيقى الخاصة بك بنجاح!" : "Soundtrack uploaded successfully!");
    } catch (err) {
      document.getElementById('custom-music-upload-status').textContent = getLang() === 'ar' ? "فشل الرفع." : "Upload failed.";
      showToast(getLang() === 'ar' ? "فشل رفع ملف الموسيقى." : "Custom music upload failed.");
      console.error(err);
    }
  };

  // Celebration Image/Video upload
  document.getElementById('creator-celebration-media').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('celebration-media-upload-status').textContent = getLang() === 'ar' ? "جاري الرفع..." : "Uploading...";
    try {
      celebrationMediaUrl = await uploadMedia(file);
      document.getElementById('celebration-media-upload-status').textContent = getLang() === 'ar' ? "اكتمل الرفع!" : "Uploaded!";
      showToast(getLang() === 'ar' ? "تم رفع الوسائط الاحتفالية!" : "Celebration media uploaded!");
    } catch (err) {
      document.getElementById('celebration-media-upload-status').textContent = getLang() === 'ar' ? "فشل الرفع." : "Upload failed.";
      console.error(err);
    }
  };

  // Redirect to Dashboard Button
  document.getElementById('creator-btn-dashboard').onclick = () => {
    window.location.hash = `#dashboard/${currentSpaceId}`;
  };
}

/**
 * Opens the stage editor modal and pre-fills the values.
 * @param {number} index Index of stage in stages array. If -1, sets up a clean new form.
 */
function openStageEditor(index) {
  const modal = document.getElementById('modal-stage-editor');
  const form = document.getElementById('form-stage-editor');
  form.reset();

  document.getElementById('stage-editor-index').value = index;
  document.getElementById('stage-media-upload-status').textContent = getLang() === 'ar' ? "لا يوجد ملف مرفوع" : "No file uploaded";
  document.getElementById('stage-edit-media-url').value = "";
  
  const choicesWrapper = document.getElementById('stage-edit-options-wrapper');
  choicesWrapper.classList.add('hidden');

  if (index === -1) {
    document.getElementById('stage-editor-title').textContent = getLang() === 'ar' ? "إضافة مرحلة لغز" : "Add Quiz Stage";
  } else {
    document.getElementById('stage-editor-title').textContent = getLang() === 'ar' ? `تعديل إعداد المرحلة ${index + 1}` : `Configure Stage ${index + 1}`;
    
    const stage = stages[index];
    document.getElementById('stage-edit-title').value = stage.title;
    document.getElementById('stage-edit-message').value = stage.message;
    document.getElementById('stage-edit-type').value = stage.type;
    document.getElementById('stage-edit-correct').value = stage.answer;
    document.getElementById('stage-edit-question').value = stage.question;
    document.getElementById('stage-edit-hint').value = stage.hint || "";
    document.getElementById('stage-edit-success').value = stage.successMsg || "";
    document.getElementById('stage-edit-fail').value = stage.failMsg || "";
    document.getElementById('stage-edit-media-url').value = stage.mediaUrl || "";

    if (stage.mediaUrl) {
      document.getElementById('stage-media-upload-status').textContent = getLang() === 'ar' ? "الصورة الحالية نشطة" : "Current image active";
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
   UTIL & HELPER FUNCTIONS
   ============================================================================ */

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

/**
 * Escapes tags in inputs to avoid arbitrary HTML injection.
 */
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

/**
 * Converts colors from rgb(r, g, b) formatting to clean hex code strings for color inputs.
 */
function rgbToHex(rgbStr) {
  if (!rgbStr || !rgbStr.startsWith('rgb')) return rgbStr;
  const match = rgbStr.match(/\d+/g);
  if (!match) return rgbStr;
  const r = parseInt(match[0]);
  const g = parseInt(match[1]);
  const b = parseInt(match[2]);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Helper to display toast messages in client.
 */
export function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  
  // Clean up element after animation finishes
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
