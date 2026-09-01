import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config';

// ADDITIVE: Shared hook to fetch the account's currently equipped animated board
// theme + public profile theme (the separate "Themes" tab system).
// Returns { profileTheme, boardTheme, loading, reload }.
export default function useEquippedThemes(token) {
  const [profileTheme, setProfileTheme] = useState(null);
  const [boardTheme, setBoardTheme] = useState(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_BASE}/themes/equipped`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setProfileTheme(data.profileTheme || null);
          setBoardTheme(data.boardTheme || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { profileTheme, boardTheme, loading, reload };
}
