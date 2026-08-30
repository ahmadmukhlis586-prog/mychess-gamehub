import React, { useState, useEffect, useRef } from 'react';

export default function SplashScreen({ onComplete }) {
  const [audioOn, setAudioOn] = useState(false);
  const soundPlayed = useRef(false);
  const audioRef = useRef(null);

  // ✅ AUTOMATIC SOUND ACTIVATION (No manual click needed!)
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/assets/audio/my-intro-sound.mp3');
      audioRef.current.volume = 0.8;
      audioRef.current.setAttribute('playsinline', '');
    }

    const tryPlay = () => {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => {
        soundPlayed.current = true;
        setAudioOn(true);
      }).catch(() => {
        // ✅ If browser blocks it, retry automatically every 100ms until it plays
        setTimeout(tryPlay, 100);
      });
    };

    // ✅ Automatically "unlock" audio by triggering a fake user click
    const fakeClick = new Event('click');
    document.dispatchEvent(fakeClick);
    tryPlay();

    // ✅ Also attach to real interaction just in case (hidden fallback)
    const unlock = () => {
      if (!soundPlayed.current) {
        audioRef.current.play().catch(() => {});
        soundPlayed.current = true;
        setAudioOn(true);
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);

    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // ✅ TIMER (8 seconds total - as you requested)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 8000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div style={styles.body}>
      <div style={styles.gridBg}></div>

      <div style={styles.container}>
        {/* ✅ LONG GLOWING LOGO */}
        <div style={styles.logoBox}>
          <svg viewBox="0 0 24 24" style={styles.svg}>
            <path d="M19 22H5V20H19V22M17 10C15.9 10 15 9.1 15 8C15 7.4 15.3 6.8 15.7 6.4L13.8 3.5L12 6.2L10.2 3.5L8.3 6.4C8.7 6.8 9 7.4 9 8C9 9.1 8.1 10 7 10C6.8 10 6.6 10 6.4 9.9L7.9 18H16.1L17.6 9.9C17.4 10 17.2 10 17 10Z" />
          </svg>
        </div>
        <h1 style={styles.title}>
          MyChess <span style={styles.titleSpan}>GameHub</span>
        </h1>
        <p style={styles.subtitle}>Play & Compete</p>

        <div style={styles.loaderBar}>
          <div style={styles.loaderProgress}></div>
        </div>
      </div>

      {/* ✅ HIDDEN AUDIO STATUS (Just for debugging, not visible) */}
      <div style={{ position: 'absolute', bottom: '24px', right: '24px', zIndex: 20, opacity: 0 }}>
        <span id="audioStatus">{audioOn ? 'ON' : 'OFF'}</span>
      </div>

      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.5); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes fadeInUp {
          0% { transform: translateY(18px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        /* ✅ LONGER GLOWING LOGO ANIMATION (3 seconds) */
        @keyframes logoGlowPulse {
          0% { 
            opacity: 0; 
            transform: scale(0.5); 
            box-shadow: 0 0 0 rgba(168, 85, 247, 0), 0 0 0 rgba(236, 72, 153, 0); 
          }
          25% { 
            opacity: 0.5; 
            transform: scale(1.05); 
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(236, 72, 153, 0.3); 
          }
          50% { 
            opacity: 1; 
            transform: scale(1.1); 
            box-shadow: 0 0 40px rgba(168, 85, 247, 0.9), 0 0 80px rgba(236, 72, 153, 0.6), 0 0 120px rgba(99, 102, 241, 0.4); 
          }
          75% { 
            opacity: 1; 
            transform: scale(1.05); 
            box-shadow: 0 0 30px rgba(168, 85, 247, 0.7), 0 0 60px rgba(236, 72, 153, 0.4); 
          }
          100% { 
            opacity: 1; 
            transform: scale(1); 
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.6), 0 0 40px rgba(236, 72, 153, 0.3); 
          }
        }

        /* ✅ GLOWING LOGO ICON (3 seconds) */
        @keyframes logoIconGlow {
          0% { filter: drop-shadow(0 0 0 rgba(168, 85, 247, 0)); opacity: 0; }
          50% { filter: drop-shadow(0 0 25px rgba(168, 85, 247, 1)); opacity: 1; }
          100% { filter: drop-shadow(0 0 15px rgba(168, 85, 247, 0.8)); opacity: 1; }
        }

        @keyframes fillProgress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        
        @keyframes gridMove {
          0% { transform: rotateX(55deg) translateY(0); }
          100% { transform: rotateX(55deg) translateY(50px); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  body: {
    backgroundColor: '#07050a',
    color: '#ffffff',
    height: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 99999,
  },
  gridBg: {
    position: 'absolute',
    width: '200%',
    height: '200%',
    backgroundImage: `
      linear-gradient(to right, rgba(168, 85, 247, 0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(168, 85, 247, 0.05) 1px, transparent 1px)
    `,
    backgroundSize: '50px 50px',
    transform: 'rotateX(55deg) translateY(-80px)',
    animation: 'gridMove 20s linear infinite',
  },
  container: {
    position: 'relative',
    zIndex: 10,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoBox: {
    width: '88px',
    height: '88px',
    border: '2px solid #a855f7',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px',
    background: 'rgba(168, 85, 247, 0.04)',
    animation: 'scaleIn 2s cubic-bezier(0.16, 1, 0.3, 1), logoGlowPulse 3s ease-in-out forwards',
  },
  svg: {
    width: '48px',
    height: '48px',
    fill: '#a855f7',
    animation: 'logoIconGlow 3s ease-in-out forwards',
  },
  title: {
    fontSize: '2.4rem',
    fontWeight: '800',
    letterSpacing: '5px',
    textTransform: 'uppercase',
    opacity: 0,
    animation: 'fadeInUp 2s ease-out forwards',
    margin: 0,
  },
  titleSpan: {
    color: '#a855f7',
    textShadow: '0 0 16px rgba(168, 85, 247, 0.5)',
  },
  subtitle: {
    fontSize: '0.8rem',
    color: '#7e7694',
    letterSpacing: '7px',
    textTransform: 'uppercase',
    marginTop: '6px',
    marginBottom: '40px',
    opacity: 0,
    animation: 'fadeInUp 2s ease-out forwards',
  },
  loaderBar: {
    width: '180px',
    height: '3px',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '2px',
    overflow: 'hidden',
    opacity: 0,
    animation: 'fadeIn 1s ease-out forwards',
  },
  loaderProgress: {
    width: '0%',
    height: '100%',
    background: '#a855f7',
    boxShadow: '0 0 14px #a855f7',
    animation: 'fillProgress 7.5s cubic-bezier(0.4, 0, 0.2, 1) 0.5s forwards',
  },
};