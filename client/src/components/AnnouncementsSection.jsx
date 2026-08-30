import React, { useState, useEffect } from 'react';
import { API_BASE, SERVER_URL } from '../config';

const AnnouncementsSection = ({ refreshKey }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_BASE}/announcements/public`);
        const data = await response.json();
        if (!cancelled && data.ok) setAnnouncements(data.announcements || []);
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (loading) return null;
  if (!announcements.length) return null;

  return (
    <section className="announcements-home-section">
      {announcements.map((item, index) => {
        const imgSrc = item.image_url
          ? (item.image_url.startsWith('http') ? item.image_url : `${SERVER_URL}${item.image_url}`)
          : null;
        return (
          <div key={item.announcement_id || index}>
            <div className={`home-split-card ${index % 2 === 1 ? 'home-split-reverse' : ''}`}>
              <div className="home-split-content">
                <span className="home-split-tag">{item.category || '📢 Announcement'}</span>
                <h2 className="home-split-title">{item.title}</h2>
                <p className="home-split-text">{item.content}</p>
                {(item.event_date || item.prize_pool) && (
                  <div className="home-split-meta">
                    {item.event_date && <span>📅 {item.event_date}</span>}
                    {item.prize_pool && <span>🏅 {item.prize_pool}</span>}
                  </div>
                )}
                {item.button_link && (
                  <button
                    className="mychess-chess-tips-btn"
                    onClick={() => {
                      if (item.button_link.startsWith('http')) {
                        window.open(item.button_link, '_blank', 'noopener,noreferrer');
                      } else {
                        window.location.href = item.button_link;
                      }
                    }}
                  >
                    {item.button_label || 'Register Now'} →
                  </button>
                )}
              </div>
              {imgSrc && (
                <div className="home-split-visual announcement-visual">
                  <img src={imgSrc} alt={item.title} className="announcement-visual-img" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default AnnouncementsSection;
