import React, { useState, useEffect } from 'react';
import { getMusicStatus, toggleMusic } from '../helpers';

const MusicSettingsOverlay = ({ isOpen, onClose, isPlaying, currentTrack }) => {
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    if (isOpen) {
      const bgMusic = getMusicStatus().audio;
      if (bgMusic) setVolume(bgMusic.volume);
    }
  }, [isOpen]);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    const bgMusic = getMusicStatus().audio;
    if (bgMusic) {
      bgMusic.volume = newVolume;
      localStorage.setItem('bgMusicVolume', newVolume);
    }
  };

  const handleTogglePlay = () => {
    toggleMusic();
  };

  if (!isOpen) return null;

  return (
    <div className="music-settings-overlay" onClick={onClose}>
      <div className="music-settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="music-settings-header">
          <span className="music-settings-icon">🎧</span>
          <span className="music-settings-title">Music Settings</span>
          <button className="music-settings-close" onClick={onClose}>×</button>
        </div>

        <div className="music-settings-info">
          <div className="music-now-playing">
            <span className="now-playing-label">Now Playing</span>
            <span className="now-playing-track">{currentTrack}</span>
          </div>
        </div>

        <div className="music-settings-controls">
          <div className="volume-control">
            <span className="volume-icon">🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
            <span className="volume-percentage">{Math.round(volume * 100)}%</span>
          </div>

          <button className="music-play-pause-btn" onClick={handleTogglePlay}>
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
        </div>

        <div className="music-settings-footer">
          <span>💡 Volume is saved automatically</span>
        </div>
      </div>
    </div>
  );
};

export default MusicSettingsOverlay;