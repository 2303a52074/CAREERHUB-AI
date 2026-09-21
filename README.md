# CareerHub AI — Enterprise Career & Placement Intelligence Platform

An AI-powered campus placement and career intelligence platform designed for engineering candidates and high-velocity hiring teams. Features comprehensive placement readiness scoring, ATS resume auditing, AI mock interviews, data structures & algorithms practice arena, skill gap progressive roadmaps, and curated job matchmaking.

---

## 🏛️ Project Architecture (Separated Frontend & Backend)

The project has been modularly separated into dedicated **`backend/`** and **`frontend/`** architectures with full backward-compatible root orchestration:

```
CareerHub-Ai/
├── backend/                  # Dedicated Node.js & Express API Server
│   ├── middleware/           # Auth, admin, and upload middleware
│   ├── models/               # MongoDB / In-memory Mongoose models
│   ├── routes/               # API endpoint route handlers
│   ├── uploads/              # Storage for interview recordings & resumes
│   ├── utils/                # AI services (Gemini/Groq), in-memory store, NLP
│   ├── .env                  # Backend environment configuration
│   ├── list-models.js        # Model verification utility
│   ├── seed-problems.js      # Coding challenges database seeder
│   ├── package.json          # Backend-specific dependencies & scripts
│   └── server.js             # Core Express server & API routes
│
├── frontend/                 # Client Web Application & Placement Cockpit
│   ├── assets/
│   │   └── logo.png          # High-resolution CareerHub AI 3D logo
│   ├── admin.html            # Candidate management & interview session logs
│   ├── careerhub.js          # API client & interaction controller
│   ├── dashboard.html        # Placement Cockpit (Readiness, Roadmaps, Interviews)
│   ├── editor.html           # Coding Arena with Monaco Editor & AI Hints
│   ├── index.html            # Landing homepage with Company Logo Marquee
│   ├── login.html            # Secure authentication & instant demo access
│   ├── problems.html         # Curated placement coding challenges library
│   ├── register.html         # Candidate profile registration
│   ├── script.js             # Client scripts
│   ├── style.css             # Unified dark luxury tech design system
│   └── package.json          # Frontend development scripts
│
├── public/                   # Synced static bundle (for legacy deployments)
├── package.json              # Root workspace orchestration scripts
└── server.js                 # Seamless bridge delegating to backend/server.js
```

---

## 🚀 Quick Start Guide

### 1. Run Everything (Unified Mode)
Run from the root directory:
```bash
npm install
npm run dev
# or
npm start
```
The server will start on **`http://localhost:3000`** and automatically serve the frontend web application and API endpoints.

---

### 2. Run Backend & Frontend Separately

#### Run the Backend Server:
```bash
cd backend
npm install
npm run dev
```
Backend API will run on `http://localhost:3000` (or the port specified in `backend/.env`).

#### Run the Frontend Independently:
```bash
cd frontend
npm start
# or use any static file server (e.g. npx serve . -p 3001)
```

---

## 💎 Key Enhancements & Features

### 1. Official CareerHub AI Brand Logo
- Integrated the official 3D glowing cyan/blue emblem across all platform pages:
  - **Homepage Navbar & Hero Section**
  - **Placement Cockpit Sidebar**
  - **Sign In & Registration Portals**
  - **Admin Intelligence Dashboard**
  - **Coding Arena & Monaco Editor Toolbar**
  - **Browser Favicon**

### 2. Continuously Scrolling Company-Logo Marquee
- **Heading**: `"LEARN AND GET PLACED IN TOP COMPANIES"`
- **Featured Companies**: **Google, Microsoft, Amazon, IBM, Accenture, Infosys, TCS, Deloitte, Meta, Apple, Cisco, Oracle**
- **Seamless Infinite Loop**: Pure CSS `@keyframes scrollMarquee` with duplicate track rendering for 0ms jump/glitch.
- **Edge Gradient Masks**: Smooth fade out at both left and right edges via CSS `mask-image` and soft gradient overlays.
- **Micro-Interactions**: Hover to pause, subtle monochrome light-blue palette with electric cyan illumination and drop-shadow on cursor focus.
- **Responsive**: Dynamic scaling across Desktop, Tablet, and Mobile screens.

### 3. Executive Luxury Dark Theme
- Modern obsidian & midnight navy background (`#060b17` / `#0b1329`).
- Layered radial ambient glow lighting (`#00d2ff` & `#2563eb`).
- Glassmorphic card surfaces (`rgba(14, 25, 48, 0.75)`) with glowing cyan borders.
- Crisp Plus Jakarta Sans & Inter typography hierarchy.

---

## 🛠️ API & Database Resilience
- **High-Performance In-Memory DB Fallback**: Operates smoothly out-of-the-box even without a local MongoDB instance running.
- **Instant Demo Access**: Single-click demo credentials (`demo@example.com` / `password123`) enabled across all environments.
- **AI Integrations**: Gemini 2.0 / Groq / Natural NLP question generation with intelligent offline fallback sets.
