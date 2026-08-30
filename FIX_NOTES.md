# MYCHESS overhaul

This version keeps the working react-chessboard v5 movement fix and adds a complete realtime game-room experience.

## Added
- MYCHESS branding and premium dark purple/black/white UI.
- Username entry persisted in localStorage.
- Room entry + shareable room invite URL.
- Persistent player id so a refresh can reclaim the same White/Black seat.
- Realtime opponent presence and player names.
- Realtime room chat with history and timestamps.
- Live local date/time clock in the header.
- Move history panel.
- Check/game-over state messaging.
- Restart match control.
- Copy invite control.
- Responsive mobile layout.
- Server-authoritative chess validation remains enabled.
- Server-authoritative usernames, rooms and chat messages.

## Run
Client: `npm install` then `npm run dev`
Server: `npm install` then `node server.js`
