// Love Hunt - Game Player Engine Module
import { fetchGame, fetchSpaceUI, incrementGameViews, incrementGameCompletions } from './storage.js';
import { applyThemeStyles, startThemeAnimation, stopThemeAnimation } from './themes.js';
import { getCurrentTenantSlug } from './config.js';
function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

let currentGame = null;
let currentStageIndex = 0;
let isSubmitting = false;
let spaceUI = {};
let currentStageWrongCount = 0;

/**
 * Initializes and starts a Game Player journey.
 * @param {string} gameId UUID of the game
 */
export async function initPlayer(gameId) {
  currentGame = null;
  currentStageIndex = 0;
  isSubmitting = false;
  
  setupPlayerListeners();

  try {
    showToast("جاري تحميل مغامرة الحب... 💖");
    currentGame = await fetchGame(gameId);
    if (!currentGame) {
      showToast("عذراً، لم نجد هذه اللعبة!");
      window.location.hash = "#welcome";
      return;
    }

    // Fetch Custom UI texts for the space
    const data = await fetchSpaceUI(currentGame.coupleSpaceId);
    spaceUI = data.uiTexts;

    // Set partner avatar photos
    const boyImg = document.getElementById('avatar-boy-img');
    const girlImg = document.getElementById('avatar-girl-img');
    
    // Set default avatars if none uploaded
    boyImg.src = data.hisPhotoUrl || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120";
    girlImg.src = data.herPhotoUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120";

    // Update Customizable UI Texts
    hydratePlayerUITexts();

    // Register View
    incrementGameViews(currentGame.id);

    // Apply custom styling overrides
    applyThemeStyles(currentGame.theme, document.documentElement, currentGame.customization);

    // Start background music loop (if any uploaded)
    playGameMusic(currentGame.coupleSpaceId);

    // Start background particle animation
    const canvas = document.getElementById('theme-canvas');
    if (currentGame.customization && currentGame.customization.particlesEnabled !== false) {
      startThemeAnimation(currentGame.theme, canvas);
    } else {
      stopThemeAnimation();
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Load auto-save progress if it exists
    const savedProgress = localStorage.getItem(`currentPlayerProgress_${gameId}`);
    if (savedProgress !== null) {
      const idx = parseInt(savedProgress);
      if (idx >= 0 && idx < currentGame.stages.length) {
        currentStageIndex = idx;
        showToast("جاري استئناف إجاباتك السابقة... 💖");
      }
    }

    // Render Heart Map layout
    setTimeout(() => {
      drawHeartProgressMap();
      renderActiveStage();
    }, 200);

  } catch (error) {
    console.error("Error launching game player:", error);
    showToast("حدث خطأ أثناء تحميل اللعبة. يرجى التحقق من اتصال المتصفح بالانترنت.");
    window.location.hash = "#welcome";
  }
}

/**
 * Hydrates Player UI labels from customized text configurations.
 */
function hydratePlayerUITexts() {
  // Lock Screen
  document.getElementById('lock-screen-title').textContent = spaceUI.lockTitle;
  document.getElementById('lock-screen-desc').textContent = spaceUI.lockDesc;
  document.getElementById('lock-password-input').placeholder = spaceUI.lockPlaceholder;
  document.getElementById('lock-screen-btn').textContent = spaceUI.lockBtn;
  document.getElementById('lock-error-msg').textContent = spaceUI.lockError;

  // Game Player buttons
  document.getElementById('player-text-hint').textContent = spaceUI.hintBtn;
  document.getElementById('player-text-submit').textContent = spaceUI.submitBtn;
  document.getElementById('player-label-hint').innerHTML = `<i class="fa-regular fa-lightbulb"></i> ${spaceUI.hintPrefix}`;

  // Celebration
  document.getElementById('celebration-main-title').textContent = spaceUI.celebrationTitle;
  document.getElementById('celebration-gift-title').textContent = spaceUI.celebrationGiftTitle;
  document.getElementById('celebration-text-open').textContent = spaceUI.envelopeOpenBtn;
  document.getElementById('celebration-text-enter').textContent = spaceUI.enterWorldBtn;
}

/**
 * Renders the dotted heart progress map and positions avatars using SVG coordinates.
 */
function drawHeartProgressMap() {
  const path = document.getElementById('heart-map-path');
  if (!path) return;

  const N = currentGame.stages.length;
  const pathLength = path.getTotalLength();
  const dotsContainer = document.getElementById('map-stage-dots');
  dotsContainer.innerHTML = "";

  const boyAvatar = document.getElementById('avatar-boy');
  const girlAvatar = document.getElementById('avatar-girl');

  // Reset merge animation
  boyAvatar.classList.remove('map-avatars-merged');
  girlAvatar.classList.remove('map-avatars-merged');
  boyAvatar.style.display = 'block';

  // 1. Position Boy Avatar (Starting left point: 0 distance along path)
  const boyPt = path.getPointAtLength(0);
  boyAvatar.style.left = boyPt.x + '%';
  boyAvatar.style.top = (boyPt.y / 40) * 100 + '%';

  // 2. Draw Numbered Stage Dots along the path curve
  for (let i = 0; i < N; i++) {
    const ratio = i / (N - 1 || 1);
    const dist = ratio * pathLength;
    const pt = path.getPointAtLength(dist);

    const dot = document.createElement('div');
    dot.className = 'map-stage-dot';
    dot.id = `map-dot-${i}`;
    dot.style.left = pt.x + '%';
    dot.style.top = (pt.y / 40) * 100 + '%';
    
    // Add stage number inside
    dot.innerHTML = `<span style="font-size: 9px; font-weight: 800; color: #ff2d55; pointer-events: none; transition: color 0.3s;">${i + 1}</span>`;
    dot.style.display = 'flex';
    dot.style.alignItems = 'center';
    dot.style.justifyContent = 'center';
    dot.style.width = '22px';
    dot.style.height = '22px';
    dot.style.marginTop = '-11px';
    dot.style.marginLeft = '-11px';
    dot.style.border = '2.5px solid #ffccd5';
    dot.style.backgroundColor = 'white';
    dot.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';

    dotsContainer.appendChild(dot);
  }

  updateAvatarsPosition();
}

/**
 * Slide both avatars symmetrically towards each other based on progress.
 */
function updateAvatarsPosition(customDuration = null) {
  const path = document.getElementById('heart-map-path');
  if (!path) return;

  const N = currentGame.stages.length;
  const pathLength = path.getTotalLength();
  const boyAvatar = document.getElementById('avatar-boy');
  const girlAvatar = document.getElementById('avatar-girl');

  // Apply custom transition duration if specified (e.g. 2s for end game)
  if (customDuration) {
    boyAvatar.style.transition = `left ${customDuration}s ease, top ${customDuration}s ease`;
    girlAvatar.style.transition = `left ${customDuration}s ease, top ${customDuration}s ease`;
  } else {
    boyAvatar.style.transition = 'left 0.8s cubic-bezier(0.25, 1, 0.5, 1), top 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
    girlAvatar.style.transition = 'left 0.8s cubic-bezier(0.25, 1, 0.5, 1), top 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
  }

  // Boy ratio: from 0% to 50% along the path
  const boyRatio = (currentStageIndex / N) * 0.5;
  const boyDist = boyRatio * pathLength;
  const boyPt = path.getPointAtLength(boyDist);

  boyAvatar.style.left = boyPt.x + '%';
  boyAvatar.style.top = (boyPt.y / 40) * 100 + '%';

  // Girl ratio: from 100% to 50% along the path
  const girlRatio = 1.0 - (currentStageIndex / N) * 0.5;
  const girlDist = girlRatio * pathLength;
  const girlPt = path.getPointAtLength(girlDist);

  girlAvatar.style.left = girlPt.x + '%';
  girlAvatar.style.top = (girlPt.y / 40) * 100 + '%';

  // Highlight completed dots
  for (let i = 0; i < N; i++) {
    const dot = document.getElementById(`map-dot-${i}`);
    if (dot) {
      dot.classList.remove('completed', 'active');
      const numSpan = dot.querySelector('span');
      if (numSpan) numSpan.style.color = '#ff2d55';

      if (i < currentStageIndex) {
        dot.classList.add('completed');
        dot.style.backgroundColor = 'var(--progress-bar-color)';
        dot.style.borderColor = 'var(--progress-bar-color)';
        if (numSpan) numSpan.style.color = 'white';
      } else if (i === currentStageIndex) {
        dot.classList.add('active');
        dot.style.backgroundColor = 'white';
        dot.style.borderColor = 'var(--progress-bar-color)';
        dot.style.boxShadow = '0 0 0 4px var(--overlay-color)';
        if (numSpan) numSpan.style.color = 'var(--progress-bar-color)';
      } else {
        dot.style.backgroundColor = 'white';
        dot.style.borderColor = '#ffccd5';
        dot.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
      }
    }
  }
}

/**
 * Renders the active stage question inside the card structure.
 */
function renderActiveStage() {
  if (!currentGame || !currentGame.stages || currentGame.stages.length === 0) return;

  const stage = currentGame.stages[currentStageIndex];
  
  // Update Header details & Progress Line width
  const totalStages = currentGame.stages.length;
  document.getElementById('player-stage-counter').textContent = `المرحلة ${currentStageIndex + 1} من ${totalStages}`;
  
  const progressPercent = ((currentStageIndex + 1) / (totalStages || 1)) * 100;
  const progressBar = document.getElementById('player-stage-progress-bar');
  if (progressBar) {
    progressBar.style.width = `${progressPercent}%`;
  }

  // Render media attachments
  const mediaContainer = document.getElementById('player-media-container');
  mediaContainer.innerHTML = "";
  if (stage.mediaUrl) {
    const isVideo = stage.mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i) || stage.mediaUrl.includes("video");
    if (isVideo) {
      mediaContainer.innerHTML = `<video src="${stage.mediaUrl}" controls autoplay loop muted></video>`;
    } else {
      mediaContainer.innerHTML = `<img src="${stage.mediaUrl}" alt="Stage attachment">`;
    }
    mediaContainer.classList.remove('hidden');
  } else {
    mediaContainer.classList.add('hidden');
  }

  // Render Descriptions
  document.getElementById('player-stage-title').textContent = stage.title;
  document.getElementById('player-stage-desc').textContent = stage.message;
  document.getElementById('player-question-text').textContent = stage.question;

  // Clear Hints & hide Hint button initially
  currentStageWrongCount = 0;
  document.getElementById('player-hint-box').classList.add('hidden');
  const hintBtn = document.getElementById('player-btn-hint');
  hintBtn.classList.add('hidden');

  // Generate Inputs
  const inputWrapper = document.getElementById('player-input-wrapper');
  inputWrapper.innerHTML = "";
  document.getElementById('player-feedback-msg').classList.add('hidden');

  if (stage.type === 'multiple_choice') {
    const choices = stage.choices ? stage.choices.split(',') : ['خيار أ', 'خيار ب'];
    const grid = document.createElement('div');
    grid.className = 'mcq-grid';
    
    choices.forEach((choice) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mcq-option-btn';
      btn.textContent = choice.trim();
      btn.onclick = () => {
        document.querySelectorAll('.mcq-option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
      grid.appendChild(btn);
    });
    inputWrapper.appendChild(grid);
  } else {
    const input = document.createElement('input');
    input.type = stage.type === 'number' ? 'number' : 'text';
    input.id = 'player-answer-input';
    input.className = 'player-input-field';
    input.required = true;
    input.placeholder = stage.type === 'number' ? "أدخل رقم الإجابة..." : "اكتب إجابتك هنا...";
    inputWrapper.appendChild(input);
  }

  // Restore active submit button state
  const submitBtn = document.getElementById('player-btn-submit');
  submitBtn.disabled = false;
}

/**
 * Handles checking stage challenge answers.
 */
async function submitStageAnswer() {
  if (isSubmitting || !currentGame) return;
  isSubmitting = true;

  const stage = currentGame.stages[currentStageIndex];
  let playerAnswer = "";

  if (stage.type === 'multiple_choice') {
    const selectedBtn = document.querySelector('.mcq-option-btn.selected');
    playerAnswer = selectedBtn ? selectedBtn.textContent.trim() : "";
  } else {
    const input = document.getElementById('player-answer-input');
    playerAnswer = input ? input.value.trim() : "";
  }

  if (!playerAnswer) {
    showToast("الرجاء كتابة أو اختيار إجابة أولاً!");
    isSubmitting = false;
    return;
  }

  const feedbackDiv = document.getElementById('player-feedback-msg');
  const card = document.getElementById('player-stage-card');

  // Verify correctness
  const isCorrect = verifyAnswerMatch(playerAnswer, stage.answer);

  if (isCorrect) {
    feedbackDiv.className = 'player-feedback success';
    feedbackDiv.textContent = stage.successMsg || "إجابة صحيحة وممتازة! 💖";
    feedbackDiv.classList.remove('hidden');

    document.getElementById('player-btn-submit').disabled = true;

    // Slide avatar forward on map
    setTimeout(() => {
      proceedToNextStage();
    }, 1800);

  } else {
    currentStageWrongCount++;
    // Clear typed input field if exists
    const input = document.getElementById('player-answer-input');
    if (input) {
      input.value = "";
    }
    // Clear MCQ selection if exists
    document.querySelectorAll('.mcq-option-btn').forEach(btn => btn.classList.remove('selected'));

    feedbackDiv.className = 'player-feedback fail';
    feedbackDiv.textContent = stage.failMsg || "إجابة خاطئة، فكر مجدداً يا حب! 💕";
    feedbackDiv.classList.remove('hidden');

    card.classList.add('shake');
    setTimeout(() => {
      card.classList.remove('shake');
    }, 450);

    isSubmitting = false;
  }
}

/**
 * Validates the answer matching mechanism (case & punctuation insensitive).
 */
function verifyAnswerMatch(playerInput, correctAnswer) {
  if (typeof playerInput === 'string') {
    const cleanInput = playerInput.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
    const cleanCorrect = correctAnswer.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
    return cleanInput === cleanCorrect;
  }
  return String(playerInput) === String(correctAnswer);
}

/**
 * Handles stage increment indices or redirects to celebration.
 */
function proceedToNextStage() {
  currentStageIndex++;
  
  localStorage.setItem(`currentPlayerProgress_${currentGame.id}`, currentStageIndex);

  if (currentStageIndex >= currentGame.stages.length) {
    localStorage.removeItem(`currentPlayerProgress_${currentGame.id}`);
    launchCelebration();
  } else {
    // Update map positions
    updateAvatarsPosition();

    const card = document.getElementById('player-stage-card');
    const transitionType = (currentGame.customization && currentGame.customization.animationTransition) || 'fade';
    
    card.classList.remove('transition-fade', 'transition-slide', 'transition-zoom', 'transition-flip', 'transition-bounce');
    void card.offsetWidth;
    card.classList.add(`transition-${transitionType}`);
    
    renderActiveStage();
    isSubmitting = false;
  }
}

async function launchCelebration() {
  // Trigger avatar merge coordinate update (Boy and Girl meet at the center 50% along path)
  // Animation duration is set to 2.0 seconds!
  updateAvatarsPosition(2.0);

  setTimeout(() => {
    // Add merge animation classes
    const boyAvatar = document.getElementById('avatar-boy');
    const girlAvatar = document.getElementById('avatar-girl');

    boyAvatar.classList.add('map-avatars-merged');
    girlAvatar.style.display = 'none'; // Overlapped

    if (typeof window.confetti === 'function') {
      window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }

    setTimeout(() => {
      incrementGameCompletions(currentGame.id);
      sessionStorage.setItem(`unlocked_${currentGame.coupleSpaceId}`, 'true');
      window.location.hash = `#celebration/${getCurrentTenantSlug()}`;
    }, 1500);

  }, 2000); // Wait exactly 2.0s for the slider meetup animation to finish
}

/**
 * Sets up celebration page elements (confetti, custom cards, envelope actions).
 */
export async function setupCelebrationScreen(gameId) {
  try {
    if (!currentGame || currentGame.id !== gameId) {
      currentGame = await fetchGame(gameId);
      const data = await fetchSpaceUI(currentGame.coupleSpaceId);
      spaceUI = data.uiTexts;
    }
    
    if (!currentGame) {
      window.location.hash = "#welcome";
      return;
    }

    hydratePlayerUITexts();

    // Apply custom visual styling
    applyThemeStyles(currentGame.theme, document.documentElement, currentGame.customization);

    // Confetti blast
    if (typeof window.confetti === 'function') {
      window.confetti({ particleCount: 80, spread: 60 });
    }

    // Populate concluding details from spaceUI customizations or game config fallback
    document.getElementById('celebration-concluding-msg').textContent = spaceUI.concludingMsg || currentGame.finalMessage || "لقد تمكنت من فك رموز ذكرياتنا واجتياز كل المراحل بنجاح. لقد جمعنا الحب والوفاء معًا.";
    document.getElementById('celebration-gift-text').textContent = spaceUI.giftText || currentGame.giftMessage || "حبيبتي الغالية، هذه رسالة حب مخبأة لك...";

    // Render surprise media
    const mediaWrapper = document.getElementById('celebration-media-wrapper');
    mediaWrapper.innerHTML = "";
    if (currentGame.celebrationMediaUrl) {
      const isVideo = currentGame.celebrationMediaUrl.match(/\.(mp4|webm|ogg|mov)$/i) || currentGame.celebrationMediaUrl.includes("video");
      if (isVideo) {
        mediaWrapper.innerHTML = `<video src="${currentGame.celebrationMediaUrl}" controls autoplay loop muted></video>`;
      } else {
        mediaWrapper.innerHTML = `<img src="${currentGame.celebrationMediaUrl}" alt="Celebration surprise">`;
      }
      mediaWrapper.classList.remove('hidden');
    } else {
      mediaWrapper.classList.add('hidden');
    }

    // Reset envelope flap state
    const envelope = document.getElementById('gift-envelope');
    envelope.classList.remove('open');
    document.getElementById('celebration-actions-container').classList.add('hidden');

    // Auto-open final letter after 600ms
    setTimeout(() => {
      envelope.classList.add('open');
      if (typeof window.confetti === 'function') {
        window.confetti({ particleCount: 80, spread: 60 });
      }
      
      // Reveal the button to enter dashboard steps
      setTimeout(() => {
        document.getElementById('celebration-actions-container').classList.remove('hidden');
      }, 1000);
    }, 600);

    // Dashboard navigation button click
    document.getElementById('celebration-btn-enter-dashboard').onclick = () => {
      window.location.hash = `#journey/${currentGame.coupleSpaceId}`;
    };

  } catch (err) {
    console.error("Celebration boot error:", err);
    window.location.hash = "#welcome";
  }
}

/**
 * Triggers custom uploaded playlist loops.
 */
async function playGameMusic(spaceId) {
  try {
    const tracks = await fetchMusicTracks(spaceId);
    if (!tracks || tracks.length === 0) {
      document.getElementById('global-audio-hud').classList.add('hidden');
      return;
    }

    const audio = document.getElementById('global-bg-music');
    const audioHud = document.getElementById('global-audio-hud');
    const titleSpan = document.getElementById('audio-hud-title');
    const playBtn = document.getElementById('audio-hud-play');

    let currentTrackIdx = 0;

    const loadTrack = (idx) => {
      audio.src = tracks[idx].url;
      titleSpan.textContent = tracks[idx].title;
      currentTrackIdx = idx;
    };

    loadTrack(0);
    audioHud.classList.remove('hidden');

    // Play next song on end
    audio.onended = () => {
      currentTrackIdx = (currentTrackIdx + 1) % tracks.length;
      loadTrack(currentTrackIdx);
      audio.play();
    };

    // Skip Buttons
    document.getElementById('audio-hud-next').onclick = () => {
      currentTrackIdx = (currentTrackIdx + 1) % tracks.length;
      loadTrack(currentTrackIdx);
      audio.play();
      playBtn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
    };

    document.getElementById('audio-hud-prev').onclick = () => {
      currentTrackIdx = (currentTrackIdx - 1 + tracks.length) % tracks.length;
      loadTrack(currentTrackIdx);
      audio.play();
      playBtn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
    };

    // Audio hud play toggles
    playBtn.onclick = () => {
      if (audio.paused) {
        audio.play().then(() => {
          playBtn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
        });
      } else {
        audio.pause();
        playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
      }
    };
  } catch (err) {
    console.warn("Could not start background playlist.", err);
  }
}

/**
 * Event bindings for active player card controls.
 */
function setupPlayerListeners() {
  document.getElementById('player-btn-submit').onclick = submitStageAnswer;

  document.getElementById('form-player-challenge').onsubmit = (e) => {
    e.preventDefault();
    submitStageAnswer();
  };

  document.getElementById('player-btn-hint').onclick = () => {
    const hintBox = document.getElementById('player-hint-box');
    const stage = currentGame.stages[currentStageIndex];
    document.getElementById('player-hint-text').textContent = stage.hint || "لا يوجد تلميح مكتوب لهذه المرحلة.";
    hintBox.classList.toggle('hidden');
  };
}
