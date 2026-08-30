import React, { useEffect, useRef, useState } from 'react';
import { initBackgroundMusic, toggleMusic, getMusicStatus, startAudioPositionSaver, enableAudioOnInteraction, getEquippedTrack, getIsInMatch } from '../helpers';
import MusicSettingsOverlay from './MusicSettingsOverlay';

const MusicWidget = () => {
  const musicInitialized = useRef(false);
  const lastEquippedTrack = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTrack, setCurrentTrack] = useState('Default Background');

  useEffect(() => {
    if (!musicInitialized.current) {
      const savedVolume = localStorage.getItem('bgMusicVolume');
      initBackgroundMusic();
      if (savedVolume !== null) {
        const bgMusic = getMusicStatus().audio;
        if (bgMusic) bgMusic.volume = parseFloat(savedVolume);
      }
      startAudioPositionSaver();
      enableAudioOnInteraction();
      musicInitialized.current = true;
    }

    const checkMatchMusic = () => {
      const bgMusic = getMusicStatus().audio;
      const equippedTrack = getEquippedTrack();
      const isMatch = getIsInMatch();

      if (equippedTrack.includes('background-music.mp3')) {
        setCurrentTrack('Default Background');
      } else {
        const name = equippedTrack.split('/').pop().replace('.mp3', '').replace(/-/g, ' ');
        setCurrentTrack(name.charAt(0).toUpperCase() + name.slice(1));
      }

      if (bgMusic) setIsPlaying(!bgMusic.paused);

      if (isMatch && bgMusic && !bgMusic.src.includes(equippedTrack)) {
        if (lastEquippedTrack.current !== equippedTrack) {
          bgMusic.src = equippedTrack;
          bgMusic.loop = true;
          bgMusic.currentTime = 0;
          bgMusic.play().catch(() => {});
          lastEquippedTrack.current = equippedTrack;
        }
      } 
      else if (!isMatch && bgMusic && bgMusic.src.includes(equippedTrack)) {
        if (lastEquippedTrack.current !== null) {
          bgMusic.src = '/assets/audio/background-music.mp3';
          bgMusic.loop = true;
          bgMusic.currentTime = 0;
          bgMusic.play().catch(() => {});
          lastEquippedTrack.current = null;
        }
      }
    };

    window.addEventListener('mychess_match_status_changed', checkMatchMusic);
    setInterval(checkMatchMusic, 1000);

    return () => {
      clearInterval();
      window.removeEventListener('mychess_match_status_changed', checkMatchMusic);
      const bgMusic = getMusicStatus().audio;
      if (bgMusic) localStorage.setItem('bgMusicTime', bgMusic.currentTime);
    };
  }, []);

  // ✅ THIS IS THE ONLY THING THE BUTTON DOES NOW!
  const handleOpenSettings = () => {
    setShowSettings(true); 
  };

  return (
    <>
      <audio id="bg-audio" loop src="/assets/audio/background-music.mp3"></audio>
      
      <button 
        id="music-toggle-btn" 
        onClick={handleOpenSettings}
        className="music-float-btn"
        title="Music Settings"
      >
        🎵
      </button>

      <MusicSettingsOverlay 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        isPlaying={isPlaying}
        currentTrack={currentTrack}
      />
    </>
  );
};

export default MusicWidget;