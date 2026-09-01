import React from 'react';
import { useNavigate } from 'react-router-dom';

// ADDITIVE: A clickable username that navigates to a player's public profile.
// Works uniformly across friends, DMs, match history, recent-feed and leaderboard
// surfaces by resolving the profile via the username (usernames are unique, so
// this works even where only a name string is available, e.g. game history).
// Display text is preserved exactly; only the wrapper becomes interactive.
export default function UsernameLink({ name, className = '', style, children }) {
  const navigate = useNavigate();
  const text = children != null ? children : name;
  if (!text) return null;
  const target = `/profile/u/${encodeURIComponent(String(text))}`;
  return (
    <span
      className={`username-link ${className}`.trim()}
      style={style}
      title={`View ${text}'s profile`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(target);
      }}
    >
      {text}
    </span>
  );
}
