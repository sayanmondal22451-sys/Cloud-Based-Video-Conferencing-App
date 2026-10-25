# Simple Meet

**🔗 Live app: [Open Simple Meet](https://link-and-lantern-meetings.lovable.app)**

A simple, cloud-deployable video conferencing web app. Open a link, enter a name and a room code, and talk face to face with up to 8 people from any device with a modern browser. No installs and no accounts.

Built with **WebRTC** for peer-to-peer audio/video and a small **Node.js + WebSocket** server for signaling.

---

## Table of Contents
1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [How It Works](#how-it-works)
4. [Project Structure](#project-structure)
5. [Getting Started (Local)](#getting-started-local)
6. [Using the App](#using-the-app)
7. [Testing on Other Devices](#testing-on-other-devices)
8. [Deployment](#deployment)
9. [Configuration](#configuration)
10. [Limitations](#limitations)
11. [Troubleshooting](#troubleshooting)
12. [Roadmap](#roadmap)
13. [Author](#author)

---

## Features
- Multi-user video and audio calls (up to 8 people per room)
- Room codes and shareable links (`https://your-site/#roomcode`)
- Mute / unmute microphone
- Camera on / off
- Screen sharing (replaces your camera feed for everyone)
- Built-in text chat
- Auto-resizing video grid, works on desktop and mobile
- One-click "Copy link" button
- No database and no sign-up; rooms exist only while people are in them

## Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, vanilla JavaScript |
| Media | WebRTC (`RTCPeerConnection`, `getUserMedia`, `getDisplayMedia`) |
| Signaling | WebSocket (`ws` library) |
| Server | Node.js, Express |
| NAT traversal | Google public STUN server (TURN optional) |

## How It Works
Video and audio travel **directly between browsers** (peer to peer). The server never sees the media. It only helps users find each other.

```
 Browser A                Server (Node.js)               Browser B
    |  -- join room "abc" -->  |                              |
    |  <-- list of peers ----  |                              |
    |                          |  <-- join room "abc" ------  |
    |                          |  --- list of peers (A) --->  |
    |                          |                              |
    |  <------ offer (SDP) relayed through server ----------  |
    |  ------- answer (SDP) relayed through server -------->  |
    |  <------ ICE candidates both ways ------------------->  |
    |                                                         |
    |  <============ direct WebRTC audio/video ============>  |
```

1. A user joins a room. The server replies with the list of people already in it.
2. The newcomer creates a WebRTC offer for each existing person.
3. The server relays offers, answers and ICE candidates between the two browsers.
4. Once connected, media flows directly between them.

This is called a **mesh** topology: every participant connects to every other participant.

## Project Structure
```
simple-meet/
├── server.js          # Express static server + WebSocket signaling
├── package.json       # Dependencies and start script
├── package-lock.json
└── public/
    └── index.html     # Entire client: UI, styles and WebRTC logic
```

## Getting Started (Local)

### Prerequisites
- [Node.js](https://nodejs.org) 18 or newer (LTS recommended)
- A modern browser (Chrome, Edge, Firefox, Safari)
- A webcam and microphone

### Install and run
```bash
git clone https://github.com/YOUR-USERNAME/simple-meet.git
cd simple-meet
npm install
npm start
```
Open **http://localhost:3000** in your browser.

> **Windows PowerShell note:** if `npm install` is blocked by an execution-policy error, run it from Command Prompt, or use `npm.cmd install`.

## Using the App
1. Enter your name and a room code (a random one is suggested).
2. Click **Join meeting** and allow camera and microphone access.
3. Click **Copy link** and send it to others. Anyone opening the link joins the same room.
4. Use the control bar to mute, stop video, share your screen or leave.
5. Use the chat panel on the right to send messages (hidden on small screens).

### Quick local test
Open two tabs at `http://localhost:3000/#test` with different names. You should see two tiles in each tab. Use headphones to avoid echo.

## Testing on Other Devices
Browsers only allow camera and microphone on **HTTPS** pages (or `localhost`). Opening `http://192.168.x.x:3000` from a phone will not work. Use a tunnel:

```bash
# Windows
winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:3000
```
It prints an `https://....trycloudflare.com` link. Open it on any device and add `/#roomcode` to join the same room.

## Deployment

### Option 1: Render (easiest, free tier)
1. Push this repo to GitHub.
2. On [render.com](https://render.com), click **New + → Web Service** and connect the repo.
3. Settings: Runtime `Node`, Build `npm install`, Start `npm start`, Instance `Free`.
4. Deploy. You get an HTTPS link such as `https://simple-meet.onrender.com`.

The free tier sleeps after about 15 minutes of inactivity; the first request afterwards takes 30 to 60 seconds.

### Option 2: AWS EC2 (Ubuntu) with Nginx
1. Allow inbound ports **22, 80 and 443** in the security group.
2. Attach an Elastic IP and point a domain (or a free DuckDNS subdomain) at it.
3. Install requirements:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs nginx git
   sudo npm install -g pm2
   ```
4. Clone, install and run:
   ```bash
   git clone https://github.com/YOUR-USERNAME/simple-meet.git
   cd simple-meet && npm install
   pm2 start server.js --name meet && pm2 save && pm2 startup
   ```
5. Nginx reverse proxy (WebSocket headers are required):
   ```nginx
   server {
       server_name your-domain.example;
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
       }
   }
   ```
6. Add HTTPS: `sudo certbot --nginx -d your-domain.example`

## Configuration
| Setting | Where | Default |
|---------|-------|---------|
| Port | `PORT` environment variable | `3000` |
| Max people per room | `MAX` constant in `server.js` | `8` |
| STUN / TURN servers | `cfg` object in `public/index.html` | Google STUN |

### Adding a TURN server
About 10 to 15% of users (strict firewalls, some mobile carriers) cannot connect with STUN alone. Add a TURN server such as [coturn](https://github.com/coturn/coturn) in `public/index.html`:
```js
const cfg = { iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'turn:your-turn-server:3478', username: 'user', credential: 'pass' }
]};
```

## Limitations
- **Mesh topology:** every person uploads their video to every other person, so quality drops beyond roughly 6 to 8 participants. Larger meetings need an SFU (for example LiveKit or mediasoup).
- **No authentication:** anyone with the room code can join. Use long, random codes.
- **No persistence:** chat history and rooms are not stored.
- **No recording.**
- Only a public STUN server is configured by default.

## Troubleshooting
| Problem | Fix |
|---------|-----|
| "Site can't be reached" on another device | `localhost` only works on your own PC. Use a tunnel or a deployed HTTPS link. |
| Camera or mic permission never appears | The page must be HTTPS or `localhost`. Check browser site settings. |
| "Camera in use" in a second tab | Another tab or app holds the camera. Use a different browser or device. |
| Echo or feedback | Use headphones, or mute one of the tabs. |
| 502 Bad Gateway on EC2 | The Node app is not running. Check `pm2 logs meet`. |
| Chat or video fails behind Nginx | Make sure the `Upgrade` and `Connection` headers are in the Nginx config. |
| Some people can't connect | Add a TURN server (see above). |
| `npm install` blocked in PowerShell | Use `npm.cmd install` or Command Prompt. |

## Roadmap
- [ ] TURN server setup guide
- [ ] Room passwords
- [ ] Participant list and raise-hand
- [ ] Active speaker highlight
- [ ] Pin / full-screen a tile
- [ ] SFU backend for larger rooms
- [ ] Meeting recording

## Author
Built by **Sayan Mondal**, ECE student.

---

If you find this project useful, consider giving it a star on GitHub.
