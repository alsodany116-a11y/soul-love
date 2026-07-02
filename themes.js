// Love Hunt - Themes and Particle Animation Module

// Default configurations for the 4 premium romantic themes
export const DEFAULT_THEMES = {
  rose_garden: {
    name: "Rose Garden",
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSizeTitle: "2.5rem",
    fontSizeBody: "1.05rem",
    fontSizeButton: "1.1rem",
    colorTextTitle: "#800020", // Burgundy
    colorTextBody: "#4a3b32", // Dark bronze
    colorTextButton: "#ffffff",
    bgColor: "linear-gradient(135deg, #fff3f5 0%, #ffd3d6 50%, #ffa6ae 100%)",
    cardBgColor: "rgba(255, 255, 255, 0.82)",
    buttonColor: "#b81d24", // Deep red
    buttonHoverColor: "#93000b",
    borderColor: "#ffb5bc",
    progressBarColor: "#d81b60",
    inputBgColor: "rgba(255, 255, 255, 0.9)",
    inputBorderColor: "#ffcdd2",
    colorSuccess: "#2e7d32",
    colorFail: "#c62828",
    overlayColor: "rgba(255, 235, 238, 0.35)",
    borderRadius: "24px",
    cardWidth: "480px",
    letterSpacing: "0.5px",
    lineHeight: "1.6",
    padding: "32px",
    shadow: "0 15px 35px rgba(184, 29, 36, 0.12)",
    animationTransition: "fade"
  },
  golden_hour: {
    name: "Golden Hour",
    fontFamily: "'Lora', Cambria, serif",
    fontSizeTitle: "2.4rem",
    fontSizeBody: "1.05rem",
    fontSizeButton: "1.05rem",
    colorTextTitle: "#e65100", // Deep orange
    colorTextBody: "#4e342e", // Soft brown
    colorTextButton: "#ffffff",
    bgColor: "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 50%, #ffcc80 100%)",
    cardBgColor: "rgba(255, 255, 255, 0.88)",
    buttonColor: "#ff6d00", // Bright amber
    buttonHoverColor: "#e65100",
    borderColor: "#ffe0b2",
    progressBarColor: "#ff9100",
    inputBgColor: "#ffffff",
    inputBorderColor: "#ffe0b2",
    colorSuccess: "#388e3c",
    colorFail: "#d32f2f",
    overlayColor: "rgba(255, 243, 224, 0.4)",
    borderRadius: "30px",
    cardWidth: "480px",
    letterSpacing: "0.2px",
    lineHeight: "1.5",
    padding: "30px",
    shadow: "0 15px 35px rgba(230, 81, 0, 0.1)",
    animationTransition: "slide"
  },
  ocean_of_love: {
    name: "Ocean of Love",
    fontFamily: "'Quicksand', system-ui, sans-serif",
    fontSizeTitle: "2.3rem",
    fontSizeBody: "1.05rem",
    fontSizeButton: "1.1rem",
    colorTextTitle: "#0077b6", // Deep sea blue
    colorTextBody: "#2c3e50",
    colorTextButton: "#ffffff",
    bgColor: "linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 50%, #80deea 100%)",
    cardBgColor: "rgba(255, 255, 255, 0.82)",
    buttonColor: "#ff6f59", // Coral pink
    buttonHoverColor: "#ff523d",
    borderColor: "#80deea",
    progressBarColor: "#009688",
    inputBgColor: "rgba(255, 255, 255, 0.95)",
    inputBorderColor: "#b2ebf2",
    colorSuccess: "#009688",
    colorFail: "#e57373",
    overlayColor: "rgba(224, 247, 250, 0.3)",
    borderRadius: "28px",
    cardWidth: "460px",
    letterSpacing: "0.3px",
    lineHeight: "1.6",
    padding: "28px",
    shadow: "0 12px 30px rgba(0, 119, 182, 0.12)",
    animationTransition: "bounce"
  },
  minimal_love: {
    name: "Minimal Love",
    fontFamily: "'Cairo', -apple-system, system-ui, sans-serif",
    fontSizeTitle: "2.0rem",
    fontSizeBody: "0.95rem",
    fontSizeButton: "1.0rem",
    colorTextTitle: "#111111", // Pitch black
    colorTextBody: "#555555", // Charcoal
    colorTextButton: "#ffffff",
    bgColor: "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
    cardBgColor: "#ffffff",
    buttonColor: "#111111",
    buttonHoverColor: "#333333",
    borderColor: "#e5e5e5",
    progressBarColor: "#ff2d55", // Heart red accent
    inputBgColor: "#fafafa",
    inputBorderColor: "#e5e5e5",
    colorSuccess: "#24b47e",
    colorFail: "#fa3e3e",
    overlayColor: "rgba(240, 240, 240, 0.5)",
    borderRadius: "12px",
    cardWidth: "450px",
    letterSpacing: "0px",
    lineHeight: "1.6",
    padding: "24px",
    shadow: "0 4px 20px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)",
    animationTransition: "fade"
  },
  sunset_glow: {
    name: "Sunset Glow",
    fontFamily: "'Lora', Cambria, Georgia, serif",
    fontSizeTitle: "2.4rem",
    fontSizeBody: "1.05rem",
    fontSizeButton: "1.05rem",
    colorTextTitle: "#d84315", // Deep sunset orange
    colorTextBody: "#4e342e", // Dark bronze
    colorTextButton: "#ffffff",
    bgColor: "linear-gradient(135deg, #fff3e0 0%, #f48fb1 50%, #ff7043 100%)",
    cardBgColor: "rgba(255, 255, 255, 0.85)",
    buttonColor: "#ff5722",
    buttonHoverColor: "#e64a19",
    borderColor: "#ffab91",
    progressBarColor: "#ff7043",
    inputBgColor: "rgba(255, 255, 255, 0.9)",
    inputBorderColor: "#ffab91",
    colorSuccess: "#2e7d32",
    colorFail: "#d32f2f",
    overlayColor: "rgba(255, 171, 145, 0.2)",
    borderRadius: "24px",
    cardWidth: "480px",
    letterSpacing: "0.2px",
    lineHeight: "1.6",
    padding: "30px",
    shadow: "0 15px 35px rgba(255, 87, 34, 0.12)",
    animationTransition: "slide"
  },
  lavender_dream: {
    name: "Lavender Dream",
    fontFamily: "'Cinzel', Times New Roman, serif",
    fontSizeTitle: "2.3rem",
    fontSizeBody: "1.02rem",
    fontSizeButton: "1.05rem",
    colorTextTitle: "#4a148c", // Deep violet
    colorTextBody: "#311b92", // Deep indigo
    colorTextButton: "#ffffff",
    bgColor: "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 50%, #b39ddb 100%)",
    cardBgColor: "rgba(255, 255, 255, 0.86)",
    buttonColor: "#7b1fa2",
    buttonHoverColor: "#4a148c",
    borderColor: "#d1c4e9",
    progressBarColor: "#8e24aa",
    inputBgColor: "rgba(255, 255, 255, 0.95)",
    inputBorderColor: "#d1c4e9",
    colorSuccess: "#009688",
    colorFail: "#b71c1c",
    overlayColor: "rgba(179, 157, 219, 0.25)",
    borderRadius: "28px",
    cardWidth: "470px",
    letterSpacing: "0.5px",
    lineHeight: "1.6",
    padding: "32px",
    shadow: "0 15px 35px rgba(123, 31, 162, 0.12)",
    animationTransition: "fade"
  },
  midnight_star: {
    name: "Midnight Star",
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSizeTitle: "2.4rem",
    fontSizeBody: "1.05rem",
    fontSizeButton: "1.1rem",
    colorTextTitle: "#ffeb3b", // Bright star yellow
    colorTextBody: "#e0e0e0", // Warm light grey
    colorTextButton: "#0a0e17", // Dark navy text on button
    bgColor: "linear-gradient(135deg, #0a0e17 0%, #1a237e 50%, #311b92 100%)",
    cardBgColor: "rgba(18, 24, 45, 0.85)",
    buttonColor: "#ffeb3b",
    buttonHoverColor: "#fdd835",
    borderColor: "#3f51b5",
    progressBarColor: "#ffeb3b",
    inputBgColor: "rgba(10, 14, 23, 0.9)",
    inputBorderColor: "#3f51b5",
    colorSuccess: "#4caf50",
    colorFail: "#f44336",
    overlayColor: "rgba(49, 27, 146, 0.3)",
    borderRadius: "20px",
    cardWidth: "480px",
    letterSpacing: "0.5px",
    lineHeight: "1.7",
    padding: "30px",
    shadow: "0 15px 35px rgba(26, 35, 126, 0.4)",
    animationTransition: "zoom"
  },
  sweet_strawberry: {
    name: "Sweet Strawberry",
    fontFamily: "'Pacifico', 'Cairo', cursive, sans-serif",
    fontSizeTitle: "2.6rem",
    fontSizeBody: "1.05rem",
    fontSizeButton: "1.1rem",
    colorTextTitle: "#d81b60", // Sweet strawberry red
    colorTextBody: "#5c0632", // Very dark berry
    colorTextButton: "#ffffff",
    bgColor: "linear-gradient(135deg, #fff0f5 0%, #ffb6c1 50%, #ffc0cb 100%)",
    cardBgColor: "rgba(255, 255, 255, 0.9)",
    buttonColor: "#e91e63",
    buttonHoverColor: "#c2185b",
    borderColor: "#ffc0cb",
    progressBarColor: "#e91e63",
    inputBgColor: "rgba(255, 255, 255, 0.95)",
    inputBorderColor: "#ffb6c1",
    colorSuccess: "#2e7d32",
    colorFail: "#d50000",
    overlayColor: "rgba(255, 182, 193, 0.3)",
    borderRadius: "25px",
    cardWidth: "470px",
    letterSpacing: "0px",
    lineHeight: "1.6",
    padding: "28px",
    shadow: "0 12px 30px rgba(233, 30, 99, 0.12)",
    animationTransition: "bounce"
  }
};

// Global Animation State variables
let animationFrameId = null;
let particles = [];
let activeTheme = null;
let resizeHandler = null;

/**
 * Initializes and starts the canvas particle animation based on the selected theme.
 */
export function startThemeAnimation(themeName, canvas) {
  if (!canvas) return;
  stopThemeAnimation(); // Clear existing animation loop

  activeTheme = themeName;
  const ctx = canvas.getContext('2d');

  // Handle Resize
  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles(themeName, canvas.width, canvas.height);
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  resizeHandler = resizeCanvas;

  // Animation Loop
  const loop = () => {
    if (activeTheme !== themeName) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawThemeOverlay(themeName, ctx, canvas.width, canvas.height);
    updateAndDrawParticles(themeName, ctx, canvas.width, canvas.height);

    animationFrameId = requestAnimationFrame(loop);
  };
  animationFrameId = requestAnimationFrame(loop);
}

/**
 * Halts any active theme canvas animations and cleans up listeners.
 */
export function stopThemeAnimation() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  particles = [];
  activeTheme = null;
}

/**
 * Generates initial particles based on the theme style and viewport dimensions.
 */
/**
 * Generates initial particles based on the theme style and viewport dimensions.
 */
function initParticles(themeName, width, height) {
  particles = [];
  let count = 0;

  if (themeName === 'rose_garden') count = 40;
  else if (themeName === 'golden_hour') count = 50;
  else if (themeName === 'ocean_of_love') count = 35;
  else if (themeName === 'sunset_glow') count = 45;
  else if (themeName === 'lavender_dream') count = 40;
  else if (themeName === 'midnight_star') count = 60;
  else if (themeName === 'sweet_strawberry') count = 35;

  for (let i = 0; i < count; i++) {
    particles.push(createParticle(themeName, width, height, true));
  }
}

/**
 * Factory for creating a particle.
 */
function createParticle(themeName, width, height, initialRandomY = false) {
  const yStart = initialRandomY ? Math.random() * height : -20;

  switch (themeName) {
    case 'rose_garden':
    case 'lavender_dream':
    case 'sweet_strawberry':
      return {
        x: Math.random() * width,
        y: yStart,
        r: Math.random() * 8 + 5,
        speedX: Math.random() * 1.5 - 0.75 + 0.5,
        speedY: Math.random() * 1.2 + 0.8,
        angle: Math.random() * Math.PI * 2,
        angleSpeed: Math.random() * 0.02 - 0.01,
        swing: Math.random() * 0.02,
        swingPhase: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.4 + 0.4,
        color: themeName === 'rose_garden' 
          ? (Math.random() > 0.4 ? '#b81d24' : '#ff4d6d') 
          : (themeName === 'lavender_dream' 
             ? (Math.random() > 0.4 ? '#7b1fa2' : '#b39ddb') 
             : (Math.random() > 0.4 ? '#e91e63' : '#ffb6c1'))
      };

    case 'golden_hour':
    case 'sunset_glow':
    case 'midnight_star':
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        r: themeName === 'midnight_star' ? (Math.random() * 2 + 0.5) : (Math.random() * 2.5 + 0.8),
        speedX: themeName === 'midnight_star' ? (Math.random() * 0.2 - 0.1) : (Math.random() * 0.6 - 0.3),
        speedY: themeName === 'midnight_star' ? (Math.random() * 0.15 + 0.05) : (Math.random() * 0.4 + 0.2),
        opacity: Math.random() * 0.5 + 0.1,
        color: themeName === 'golden_hour' ? '#ffcc80' : (themeName === 'sunset_glow' ? '#ff8a65' : '#fff59d')
      };

    case 'ocean_of_love':
      return {
        x: Math.random() * width,
        y: initialRandomY ? Math.random() * height : height + 20,
        r: Math.random() * 7 + 2,
        speedY: -(Math.random() * 1.2 + 0.4),
        wobble: Math.random() * 1.5,
        wobbleSpeed: Math.random() * 0.04 + 0.01,
        wobblePhase: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.3 + 0.1
      };

    default:
      return {};
  }
}

/**
 * Draws background-wide static/dynamic gradient layers.
 */
function drawThemeOverlay(themeName, ctx, width, height) {
  if (themeName === 'golden_hour' || themeName === 'sunset_glow') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, 'rgba(255, 235, 204, 0.08)');
    grad.addColorStop(0.3, 'rgba(255, 204, 128, 0.03)');
    grad.addColorStop(0.5, themeName === 'sunset_glow' ? 'rgba(244, 143, 177, 0.05)' : 'rgba(255, 110, 0, 0.05)');
    grad.addColorStop(0.7, 'rgba(255, 204, 128, 0.03)');
    grad.addColorStop(1, 'rgba(255, 235, 204, 0.08)');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
}

/**
 * Updates coordinates and draws each particle on the screen.
 */
function updateAndDrawParticles(themeName, ctx, width, height) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    switch (themeName) {
      case 'rose_garden':
      case 'lavender_dream':
      case 'sweet_strawberry':
        // Update
        p.y += p.speedY;
        p.swingPhase += p.swing;
        p.x += p.speedX + Math.sin(p.swingPhase) * 0.3;
        p.angle += p.angleSpeed;

        // Draw
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.y > height + 20 || p.x > width + 20 || p.x < -20) {
          particles[i] = createParticle(themeName, width, height, false);
        }
        break;

      case 'golden_hour':
      case 'sunset_glow':
      case 'midnight_star':
        p.y += p.speedY;
        p.x += p.speedX;
        
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.y > height + 10 || p.x > width + 10 || p.x < -10) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        break;

      case 'ocean_of_love':
        p.y += p.speedY;
        p.wobblePhase += p.wobbleSpeed;
        p.x += Math.sin(p.wobblePhase) * p.wobble * 0.5;

        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.lineWidth = 1.0;
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.3})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
        
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.7})`;
        ctx.beginPath();
        ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.y < -20) {
          particles[i] = createParticle(themeName, width, height, false);
        }
        break;
    }
  }
}

/**
 * Applies a theme's visual configuration variables.
 */
export function applyThemeStyles(themeName, targetElement = document.documentElement, overrides = {}) {
  const theme = { ...DEFAULT_THEMES[themeName], ...overrides };
  if (!theme) return;

  const mapping = {
    '--font-family': theme.fontFamily,
    '--font-size-title': theme.fontSizeTitle,
    '--font-size-body': theme.fontSizeBody,
    '--font-size-button': theme.fontSizeButton,
    '--color-text-title': theme.colorTextTitle,
    '--color-text-body': theme.colorTextBody,
    '--color-text-button': theme.colorTextButton,
    '--bg-color': theme.bgColor,
    '--card-bg-color': theme.cardBgColor,
    '--button-color': theme.buttonColor,
    '--button-hover-color': theme.buttonHoverColor,
    '--border-color': theme.borderColor,
    '--progress-bar-color': theme.progressBarColor,
    '--input-bg-color': theme.inputBgColor,
    '--input-border-color': theme.inputBorderColor,
    '--color-success': theme.colorSuccess,
    '--color-fail': theme.colorFail,
    '--overlay-color': theme.overlayColor,
    '--border-radius': theme.borderRadius,
    '--card-width': theme.cardWidth,
    '--letter-spacing': theme.letterSpacing,
    '--line-height': theme.lineHeight,
    '--padding': theme.padding,
    '--card-shadow': theme.shadow
  };

  for (const [key, value] of Object.entries(mapping)) {
    if (value !== undefined) {
      targetElement.style.setProperty(key, value);
    }
  }
}
