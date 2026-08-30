// client/src/helpers.js
// ============================================================
// MYCHESS THEME FUNCTIONS - Client Side Only
// ============================================================

// ----- 1. CLICK SOUND ENGINE -----
let audioCtx = null;
let clickBuffer = null;

export const initClickSound = async () => {
  try {
    if (!window.AudioContext && !window.webkitAudioContext) {
      console.warn('AudioContext not supported');
      return;
    }
    
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    const response = await fetch('/assets/audio/click.mp3');
    
    if (!response.ok) {
      console.warn('Click sound file not found (404). Using fallback.');
      createFallbackClickSound();
      return;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    clickBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.warn('Click sound not available:', error.message);
    createFallbackClickSound();
  }
};

function createFallbackClickSound() {
  if (!audioCtx) return;
  const duration = 0.05;
  const sampleRate = audioCtx.sampleRate;
  const bufferLength = sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferLength, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferLength; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }
  clickBuffer = buffer;
  console.log('✅ Fallback click sound created');
}

export const playClickSound = () => {
  try {
    // If audio context doesn't exist, create it immediately (unlocked by user click)
    if (!audioCtx) {
      initClickSound();
    }

    if (clickBuffer && audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const source = audioCtx.createBufferSource();
      source.buffer = clickBuffer;
      source.connect(audioCtx.destination);
      source.start(0);
    } else {
      // HTML Audio fallback (this works even without AudioContext!)
      const clickSound = new Audio('/assets/audio/click.mp3');
      clickSound.volume = 0.3;
      clickSound.play().catch(() => {});
    }
  } catch {
    // Silent fail
  }
};

// ----- 2. BACKGROUND MUSIC ENGINE -----
let bgMusic = new Audio('/assets/audio/background-music.mp3');

let isMusicPlaying = false;

export const initBackgroundMusic = () => {
  if (!bgMusic) {
    bgMusic = new Audio('/assets/audio/background-music.mp3');
    bgMusic.id = 'bg-music';
    document.body.appendChild(bgMusic);
  }

  // Always ensure loop is set
  bgMusic.loop = true;

  // Safety: if ended event fires, restart
  bgMusic.removeEventListener('ended', bgMusic._endedHandler);
  bgMusic._endedHandler = () => {
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
  };
  bgMusic.addEventListener('ended', bgMusic._endedHandler);

  const savedTime = localStorage.getItem('bgMusicTime');
  if (savedTime && !isNaN(savedTime)) {
    bgMusic.currentTime = parseFloat(savedTime);
  }
  
  // Restore volume
  const savedVolume = localStorage.getItem('bgMusicVolume');
  if (savedVolume !== null) {
    bgMusic.volume = parseFloat(savedVolume);
  } else {
    bgMusic.volume = 0.5;
  }

  if (bgMusic.paused) {
    bgMusic.play().then(() => {
      isMusicPlaying = true;
    }).catch(() => {
      enableAudioOnInteraction();
    });
  }
  
  return bgMusic;
};

export const toggleMusic = () => {
  // If audio doesn't exist yet, create it on the spot
  if (!bgMusic) {
    initBackgroundMusic(); 
  }

  if (!bgMusic) return;

  if (bgMusic.paused) {
    bgMusic.play().then(() => {
      localStorage.setItem('bgMusicUserPaused', 'false');
      isMusicPlaying = true;
      updateMusicUI(true);
    }).catch(() => {});
  } else {
    bgMusic.pause();
    localStorage.setItem('bgMusicUserPaused', 'true');
    isMusicPlaying = false;
    updateMusicUI(false);
  }
};

export const getMusicStatus = () => {
  return { isPlaying: isMusicPlaying, audio: bgMusic };
};

const updateMusicUI = (playing) => {
  const toggleBtn = document.getElementById('music-toggle-btn');
  
  if (toggleBtn) {
    toggleBtn.innerHTML = playing ? '⏸️' : '▶️';
    if (playing) {
      toggleBtn.classList.remove('paused');
    } else {
      toggleBtn.classList.add('paused');
    }
  }
};

export const startAudioPositionSaver = () => {
  setInterval(() => {
    if (bgMusic && !bgMusic.paused) {
      localStorage.setItem('bgMusicTime', bgMusic.currentTime);
    }
  }, 200);
};

export const enableAudioOnInteraction = () => {
  // The moment the user clicks, scrolls, or presses a key, start the music instantly
  const startAudio = () => {
    if (bgMusic && bgMusic.paused) {
      bgMusic.play().then(() => {
        isMusicPlaying = true;
        updateMusicUI(true);
      }).catch(() => {});
    }

    // Remove listeners after the first interaction so it doesn't keep listening
    document.removeEventListener('click', startAudio);
    document.removeEventListener('keydown', startAudio);
    document.removeEventListener('scroll', startAudio);
  };

  // Attach listeners to catch the first user interaction
  document.addEventListener('click', startAudio);
  document.addEventListener('keydown', startAudio);
  document.addEventListener('scroll', startAudio);
};

export const reinitializeTheme = () => {
  const floatingBg = document.querySelector('.floating-bg');
  if (floatingBg) {
    floatingBg.style.display = 'block';
  }
  document.querySelectorAll('.circle-node').forEach(circle => {
    circle.style.display = 'block';
    circle.style.visibility = 'visible';
  });
};

//export const reattachMusicToggle = () => {
  //const toggleBtn = document.getElementById('music-toggle-btn');
  //if (toggleBtn && !toggleBtn.dataset.listenerAttached) {
    //toggleBtn.addEventListener('click', (e) => {
      //e.stopPropagation();
      //toggleMusic();
    //});
    //toggleBtn.dataset.listenerAttached = 'true';
  //}
//};



// ----- 7. REMOVED testAudio (Fixes the specific error) -----

// ----- 8. CAPTURE / KILL SOUND EFFECT -----
let captureCtx = null;

export const playCaptureSound = () => {
  try {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    
    if (!captureCtx) {
      captureCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (captureCtx.state === 'suspended') {
      captureCtx.resume();
    }

    // Create a fun, satisfying "Pop & Zap" sound
    const oscillator = captureCtx.createOscillator();
    const gainNode = captureCtx.createGain();

    oscillator.type = 'sine'; // Clean, bright sound
    oscillator.frequency.setValueAtTime(400, captureCtx.currentTime); // Start low
    oscillator.frequency.exponentialRampToValueAtTime(1200, captureCtx.currentTime + 0.08); // Zap up high
    oscillator.frequency.exponentialRampToValueAtTime(200, captureCtx.currentTime + 0.2); // Drop down low

    // Make it pop loud, then fade out quickly
    gainNode.gain.setValueAtTime(0.6, captureCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, captureCtx.currentTime + 0.25);

    oscillator.connect(gainNode);
    gainNode.connect(captureCtx.destination);

    oscillator.start();
    oscillator.stop(captureCtx.currentTime + 0.3); // Stop after 0.3 seconds
  } catch {
    // Silent fail
  }
};

// Get equipped music album from localStorage
export const getEquippedMusic = () => {
  return localStorage.getItem('mychess_equipped_album') || '/assets/audio/background-music.mp3';
};

// ✅ Get the equipped album track from localStorage
export const getEquippedTrack = () => {
  // Default to original background if none selected
  return localStorage.getItem('mychess_equipped_album') || '/assets/audio/background-music.mp3';
};

// ✅ Send a signal to the music player to switch to match music
export const notifyMusicForMatch = (isMatch) => {
  localStorage.setItem('mychess_is_in_match', JSON.stringify(isMatch));
  window.dispatchEvent(new Event('mychess_match_status_changed'));
};

// Get if we are currently in a match
export const getIsInMatch = () => {
  return localStorage.getItem('mychess_is_in_match') === 'true';
};

// ✅ VICTORY SOUND
export const playVictorySound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
    oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5
    oscillator.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.45); // C6

    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 1.2);
  } catch (e) { console.error(e); }
};

// ✅ DEFEAT SOUND
export const playDefeatSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.8);

    gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.9);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.9);
  } catch (e) { console.error(e); }
};

// ============================================================
// NEW SOUND EFFECTS - Added for visual effects features
// ============================================================

export const playCheckSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(900, audioCtx.currentTime + 0.15);
    oscillator.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.25);

    gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.35);
  } catch (e) { /* silent */ }
};

export const playPurchaseSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
    gainNode.connect(audioCtx.destination);

    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
      osc.connect(gainNode);
      osc.start(audioCtx.currentTime + i * 0.1);
      osc.stop(audioCtx.currentTime + i * 0.1 + 0.25);
    });
  } catch (e) { /* silent */ }
};

export const playMoveSyncSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.12);
  } catch (e) { /* silent */ }
};
