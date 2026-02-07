# Δ Delta 360 — Dispatch Command Center

A professional GroupMe dispatch client built for real-time team communications.

![Theme](https://img.shields.io/badge/theme-dark%20%2F%20light-ff5c00)
![Deploy](https://img.shields.io/badge/deploy-Netlify-00c7b7)

---

## Quick Start

1. Visit your deployed site
2. Get your GroupMe API token at [dev.groupme.com](https://dev.groupme.com)
3. Paste the token and click **Connect**

## Features

- **Universal Feed** — all groups in one stream
- **Custom Streams** — filtered feeds with unique alert sounds
- **Multi-Panel Chat** — Shift+click to open 2–3 chats side by side
- **Direct Comms** — DM approval system with pending queue
- **Dispatch Board** — shared team status (Available / Busy / Away)
- **Sticky Notes** — per-chat notes with expiry and history
- **Message Templates** — one-click canned responses
- **Priority Alerts** — keyword-triggered notifications
- **Shift Change Broadcast** — notify all groups at once
- **Ad-Hoc Broadcast** — send to selected groups
- **Floating Clipboard** — persistent scratchpad across chats
- **Search** — full-text search with highlighting and jump-to
- **Contact Directory** — all members across all groups
- **6 Synth Sounds** — Web Audio generated (no files needed)
- **Dark / Light Theme** — with compact mode
- **Desktop Notifications** — with sound routing per feed/DM
- **Pin Messages** — physically moved to pinned zone
- **Pin Chats** — sidebar favorites
- **Export Chat** — download as text
- **Keyboard Shortcuts** — `/` search, `C` clipboard

## Setup: GitHub + Netlify (Auto-Deploy)

### 1. Create a GitHub Repository

- Go to [github.com/new](https://github.com/new)
- Name it `delta360` (or whatever you prefer)
- Keep it **Private** if you want
- **Don't** initialize with README (we already have one)
- Click **Create repository**

### 2. Push This Code

Open a terminal and run:

```bash
cd delta360
git init
git add .
git commit -m "Initial deploy — Delta 360 v9"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/delta360.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

### 3. Connect to Netlify

- Go to [app.netlify.com](https://app.netlify.com)
- Click **Add new site → Import an existing project**
- Choose **GitHub** and authorize if needed
- Select your `delta360` repo
- Build settings:
  - **Build command:** *(leave blank)*
  - **Publish directory:** `.`
- Click **Deploy site**

### 4. Done!

Your site is live. Every time you push to `main`, Netlify auto-deploys within seconds.

**Optional:** Set a custom domain in Netlify → Site Settings → Domain Management.

## Making Edits

### Quick edits (GitHub web editor)
1. Go to your repo on GitHub
2. Click any file → pencil icon to edit
3. Commit → auto-deploys

### From Claude
1. Describe the change you want
2. Get updated files
3. Replace them in your local repo and push:
   ```bash
   git add .
   git commit -m "description of change"
   git push
   ```

### Local development
Just open `index.html` in a browser — no build step needed. Everything is vanilla HTML/CSS/JS.

## Project Structure

```
delta360/
├── index.html          → HTML shell
├── netlify.toml        → Deploy config & headers
├── README.md           → This file
├── css/
│   ├── theme.css       → CSS variables, dark/light themes
│   ├── layout.css      → Sidebar, panels, header, responsive
│   └── components.css  → Cards, modals, toasts, inputs
└── js/
    └── app.js          → Application logic (128 functions)
```

## Tech Stack

- **Zero dependencies** — no npm, no build step, no framework
- **Vanilla JS** — runs in any modern browser
- **Web Audio API** — synthesized notification sounds
- **GroupMe REST API** — real-time polling
- **localStorage** — all preferences persist client-side
- **Netlify** — static hosting with auto-deploy

## License

Private project. Not for redistribution.
