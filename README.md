# TypeMaster Pro

A sleek typing game with Firebase auth + Firestore stats, built for static hosting (Vercel, GitHub Pages).

## Features

- Time or Words mode
- Character-accurate scoring (fixed bug from whole-word penalty)
- Live WPM, accuracy, streak, best WPM (local)
- Pause/Resume (Esc or button), Restart (R)
- Word sets: Common / Coding / Mixed
- Theme toggle (Dark/Light), persisted
- Copy results
- Firebase anonymous auth, per-user game logs + summary stats (paths fixed)
- LeaderBoard

  Demo Web app URL = https://velvety-marshmallow-53643e.netlify.app/

## File Structure

```
index.html
styles.css
app.js
vercel.json
```

## Firebase

This project uses your existing Firebase project. If you need to override keys at runtime (e.g., for previews), set `window.__firebase_config` to a JSON string before `app.js` loads.

Firestore paths used (correct doc/collection segmentation):

- `users/{uid}/typingGame/summary` — document
- `users/{uid}/games/{gameId}` — documents

> Ensure your Firestore security rules permit read/write for authenticated users (anonymous is authenticated).

## Run locally

Just open `index.html` with a local web server 

## Deploy

### Vercel

- Push to GitHub
- In Vercel: “New Project” → import repo → Framework preset: **Other** (static)
- Build command: none
- Output directory: root
- Environment: none required

### GitHub Pages

- Enable Pages (from main branch, root)
- It’s static and served client-side

## Notes

- CSP is set to allow Firebase modules and APIs. Tighten as needed.
- Tailwind is imported from CDN; you can replace with a compiled build later.
