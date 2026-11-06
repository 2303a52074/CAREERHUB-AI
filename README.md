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
│   ├── utils/                # OpenRouter AI service, persistence adapters, NLP
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
│   ├── login.html            # Account sign-in
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

The project requires Node.js `>=20.16.0 <21` or `>=22.3.0`, matching the PDF parser runtime requirement.

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
```
The standalone frontend runs on port `3001` and proxies `/api/*` requests to the backend port configured by `PORT` (default `3000`). Set `CAREERHUB_BACKEND_URL` to an HTTP(S) backend origin when it is hosted elsewhere. The bundled Vite config is for the separate `src/` React scaffold; the existing HTML application is served by `frontend/server.js`.

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

### Shared interface foundation

The existing HTML application uses a shared visual layer in `frontend/style.css` and `frontend/assets/shared-nav.css`, mirrored under `public/assets/` for the legacy static bundle. Shared cards and controls use restrained elevation, hover/pressed states, visible focus, and reduced-motion behavior. Leading emoji glyphs in common icon-bearing controls are rendered as inline SVGs; this is a shared migration aid, not a claim that every page has completed a manual icon and responsive-design review.

---

## Local setup and configuration

Install dependencies and start the API plus static frontend from the repository root:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The backend loads environment variables from the repository-root `.env` and then `backend/.env`. Values already set in the process environment take precedence; if the same variable appears in both files, the repository-root `.env` wins. Either file can be used, and `.env` files must never be committed.

Configure the following variables as needed:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URI` or `MONGODB_URI` | Required | MongoDB connection string for accounts, profiles, applications, and activity. `MONGO_URI` takes precedence. APIs fail with `503` while MongoDB is unavailable; the runtime does not switch user data to memory. |
| `JWT_SECRET` | Production | Secret used to sign authentication tokens. Required in production; development uses a temporary process-only secret, so sessions expire when the server restarts. |
| `AI_PROVIDER` | Required | `openrouter` preserves current routing. Set to `gemini` only after configuring Gemini and activating qualified feature names. |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Optional | Backend-only direct Google Gemini API configuration. The model defaults to the current stable low-latency `gemini-3.5-flash-lite`; no key is currently distributed with the project. |
| `GEMINI_PRIMARY_FEATURES` | Optional | Comma-separated feature allowlist. Keep empty until each feature passes at least 9 of 10 real responses through the production validator. Resume text/PDF/DOCX are always blocked on unpaid Gemini because its terms prohibit submitting personal or sensitive information. |
| `OPENROUTER_ROLLBACK_FEATURES` | Optional | Explicit Gemini feature allowlist permitted to roll back to OpenRouter only after retryable Gemini/Groq failure. Empty by default; never an automatic/global fallback. |
| `OPENROUTER_API_KEY` | Required for AI | Server-side OpenRouter API key; never put the key in frontend code or source control. |
| `OPENROUTER_MODEL` | Optional | OpenRouter model ID; defaults to `deepseek/deepseek-chat`. |
| `OPENROUTER_FALLBACK_<FEATURE>_MODEL` | Optional | Feature-scoped model ID, configured only after it qualifies for that feature. Supported variables are listed below; all are disabled when blank. |
| `OPENROUTER_BASE_URL` | Optional | Defaults to `https://openrouter.ai/api/v1`; custom hosts are rejected by the backend. |
| `GROQ_API_KEY` / `GROQ_MODEL` | Optional | Backend-only credentials and model for the independent Groq provider. |
| `GROQ_PRIMARY_FEATURES` | Optional | Comma-separated feature allowlist that routes those features directly to Groq with no OpenRouter fallback. Keep empty until each feature passes at least 9 of 10 real production-schema requests. |
| `GROQ_FALLBACK_FEATURES` | Optional | Comma-separated feature names enabled only after each feature passes at least 9 of 10 real Groq requests through its production validator. Supported names: `assessment_question_generation`, `job_analyzer`, `skill_gap_guidance`, `career_roadmap`, `daily_plan`, `career_assistant`, `technical_interview_generation`, `behavioral_interview_generation`, `interview_evaluation`, `resume_analysis`. |
| `CODE_EXECUTION_API_URL` | Required for code runs/submissions | Base URL for the local Judge0 Community Edition service (default `http://127.0.0.1:2358`). The backend queries `/languages`, submits asynchronously to `/submissions`, and polls submission tokens. Remote runner hosts are rejected. |
| `CODE_EXECUTION_API_KEY` | Optional | Server-side `X-Auth-Token` value only if authentication is enabled in the local Judge0 `judge0.conf`; leave empty for the default local setup. |
| `CODE_EXECUTION_API_KEY_HEADER` | Optional | Judge0 authentication header; defaults to `X-Auth-Token`. Must match `AUTHN_HEADER` in `judge0.conf`. |
| `PORT` | Optional | HTTP port; defaults to `3000`. |

Copy [.env.example](./.env.example) to `.env` or configure `backend/.env`, then set your provider key and MongoDB URL locally. The active loader reads the repository-root `.env` first and `backend/.env` second; existing process variables take precedence, and the first file defining a variable wins. Restart the backend after changing either file. Never place real keys in `.env.example`, source control, frontend code, or chat. Without a working MongoDB connection, health and application API requests report the database as unavailable; they do not silently use the test-only in-memory model adapters. Configure MongoDB and a unique, high-entropy `JWT_SECRET` before deployment. No shared demo account is available.

### Direct Google Gemini API

The backend supports Google's direct `generateContent` endpoint; it does not proxy Gemini through OpenRouter. Current official model documentation lists `gemini-3.5-flash-lite` as a stable, low-latency model with JSON structured-output support. Keep `GEMINI_PRIMARY_FEATURES` empty until each feature passes the production validator in `node backend/test-gemini-qualification.js --samples=10`. The benchmark stops on a rate limit and uses synthetic fixtures; it never uses an account's profile, resume, or conversation.

Important privacy and cost limits: Google's current unpaid-service terms say prompts and responses may be reviewed by humans and used to improve Google products, and explicitly say not to submit sensitive, confidential, or personal information. Consequently Gemini is hard-disabled for resume text, PDF, and DOCX workflows on the unpaid tier; no resume data is sent to Gemini. Other feature allowlists also remain empty until qualification and privacy review. Use only a free-tier project and disable billing if the monthly budget must remain ₹0; reaching free-tier limits returns a provider error rather than switching to a paid tier. `GROQ_FALLBACK_FEATURES` and `OPENROUTER_ROLLBACK_FEATURES` remain independent, explicit allowlists and do not activate by default.

Before deploying the daily-plan concurrency safeguard, run `npm run migrate:daily-plan-index` once against the configured MongoDB database. It checks for duplicate `(userId, date)` plans and stops without changing data if any are found; resolve duplicates explicitly before retrying. The migration creates the plan and generation-lease indexes, after which generation is coordinated across backend instances.

### Local Judge0 Community Edition

Code execution is configured for a local, self-hosted Judge0 CE instance; the backend rejects remote runner hosts. No RapidAPI or paid runner account is needed. Install and start Docker Desktop with the WSL2 backend on Windows, then wait until `docker info` succeeds. In a separate PowerShell window, use the [official Judge0 CE repository](https://github.com/judge0/judge0):

```powershell
git clone https://github.com/judge0/judge0.git
Set-Location judge0
docker compose up -d
Invoke-RestMethod http://127.0.0.1:2358/languages
```

The official Compose stack runs the Judge0 server, worker, PostgreSQL, and Redis. Keep this privileged code-execution stack local and do not expose port `2358` to the public internet. Set `CODE_EXECUTION_API_URL=http://127.0.0.1:2358` in the CareerHub `.env` or `backend/.env`, then restart CareerHub. The sample leaves the API token empty. If you enable Judge0 authentication in `judge0.conf`, set the same token in `CODE_EXECUTION_API_KEY` and make `CODE_EXECUTION_API_KEY_HEADER` match Judge0's `AUTHN_HEADER` (default `X-Auth-Token`). The authenticated `/api/coding/languages` route checks live runner connectivity and only exposes supported language choices; provider language IDs and credentials remain backend-side. Problem mode keeps the existing JavaScript function contract. Other languages receive each JSON input argument on its own stdin line, and their programs must print the expected result to stdout. Program mode accepts raw stdin. Execution limits are requested from Judge0; code is never run by the Node.js backend. Without a running local Judge0 service, code execution remains unavailable and does not fabricate results.

After Judge0 is running, use `node backend/test-judge0-integration.js` for real Hello World runs in Python, JavaScript, Java, C, and C++, plus stdin/stdout, compile/runtime errors, CPU/memory limits, async token polling, and hidden-test privacy. It reports `BLOCKED` without contacting a runner if `CODE_EXECUTION_API_URL` is unset. `npm test` exercises the mocked unit suite; `npm run test:api` exercises authenticated application flows and MongoDB persistence. Neither mocked tests nor a blocked integration run prove Judge0 executes code.

### LeetCode profile data

CareerHub currently does not synchronize LeetCode stats or submissions. LeetCode's published `robots.txt` disallows automated access to `/graphql`, and no authorized public stats API was verified. The authenticated `GET /api/user/leetcode/:username` endpoint therefore validates the username and responds with `LEETCODE_SYNC_UNAVAILABLE`; it does not fetch or claim to sync profile data. Users can still open their public profile directly at `https://leetcode.com/u/{username}/`. CareerHub never requests LeetCode passwords or cookies and does not award XP for external profile data.

Text-based PDF and DOCX resumes are extracted in memory for analysis; uploaded files and extracted text are not retained, while analysis results are stored per account. Scanned/image-only PDFs require OCR, which is not configured and are rejected with an explicit message. Coding questions remain a curated practice bank; user submissions and roadmap progress are account-specific.

Learning Resources is a curated directory of links to official documentation and established practice platforms. It does not imply endorsement or host external material.

### Live job listings and matching

Job Matching requests the first page of the public [Arbeitnow Job Board API](https://www.arbeitnow.com/api/job-board-api) from the backend on each load; the feed is not seeded or cached by CareerHub. The provider's [API documentation](https://www.arbeitnow.com/blog/job-board-api), updated August 2026, says its free API requires no API key, primarily covers Germany and the UK, and aggregates listings from employer ATS platforms including Greenhouse, SmartRecruiters, Join.com, Teamtailor, Recruitee, and Comeet. Each result links to its specific Arbeitnow source listing, is attributed in the UI, and opens in a new tab. The feed does not currently supply salary data, so CareerHub omits salary rather than estimating it. Confirm details and submit an application on the source/employer page; opening the listing does not submit one.

The API returns current provider-feed records at request time; as with any aggregator, CareerHub cannot guarantee the employer has not since closed or changed a listing. If the provider is unavailable, Job Matching shows an unavailable state instead of old seeded listings. Older seeded records are no longer read by the matching endpoint or inserted on startup. Remotive was not selected: its [public API notice](https://remotive.com/remote-jobs/api) says listings must link back to Remotive and prohibits certain third-party redistribution and signup-gating uses.

Match percentage uses only profile information and provider fields actually present: 60% profile technical-skill overlap with listing tags, 30% target-role term overlap with the title, and 10% preferred-location compatibility (including an explicit remote flag). Missing dimensions are excluded and remaining weights are normalized; with no comparable profile fields the score is unavailable. Skills/tags, job type, location, text search, and newest/match sorting use the provider response and client filters.

The Job Description Analyzer computes role overlap deterministically from recognized catalog requirements and the user's listed skills. The configured AI provider provides grounded explanations, preparation steps, and interview questions when available; its advice does not change the calculated match. If no supported technical requirements are detected, the score is unavailable. Profile skills are self-reported, not proficiency-verified.

### AI provider architecture

All workflows use the centralized backend AI service and retain their production validators and persistence provenance. The currently configured provider is OpenRouter (`AI_PROVIDER=openrouter`, `OPENROUTER_MODEL` defaults to `deepseek/deepseek-chat`), with existing feature-scoped Qwen settings unchanged. Direct Gemini is available as a provider candidate through `AI_PROVIDER=gemini`, but remains inactive until `GEMINI_PRIMARY_FEATURES` contains a qualified feature and `GEMINI_API_KEY` is configured. Gemini errors do not silently retry through OpenRouter. An independently qualified feature may use `GROQ_FALLBACK_FEATURES`; optional OpenRouter rollback requires an explicit `OPENROUTER_ROLLBACK_FEATURES` allowlist. All provider responses use the same production validator. Provider credentials remain backend-only.

Run `node backend/test-ai-fallback-benchmark.js` with live OpenRouter credentials to qualify the configured candidate (`OPENROUTER_QUALIFICATION_MODELS` can provide a comma-separated candidate list). It runs ten sequential production-generator calls for each of 12 workflows by default. It records only counts, sanitized error categories, latency, token usage, and estimated costs; it does not print prompts or responses. Results with fewer than ten calls cannot qualify. This benchmark uses real requests and may consume provider quota.

The latest 120-request live qualification run qualified `qwen/qwen3-30b-a3b-instruct-2507` for assessment MCQs (9/10), job description analysis (9/10), skill-gap guidance (10/10), career roadmaps (9/10), daily plans (10/10), and the Career Assistant (10/10). It did not qualify for technical or behavioral interview questions, interview evaluation, text/PDF resume analysis, or coding recommendations. To opt in only for qualified workflows, set the matching backend variable: `OPENROUTER_FALLBACK_ASSESSMENT_MODEL`, `OPENROUTER_FALLBACK_JOB_ANALYZER_MODEL`, `OPENROUTER_FALLBACK_SKILL_GAP_MODEL`, `OPENROUTER_FALLBACK_ROADMAP_MODEL`, `OPENROUTER_FALLBACK_DAILY_PLAN_MODEL`, or `OPENROUTER_FALLBACK_ASSISTANT_MODEL` to that model ID. These variables remain blank by default; no global Qwen fallback is enabled. Re-run the benchmark before relying on these results after provider/model changes.

Run `npm run test:qualified-fallbacks` for one bounded real Qwen attempt per workflow. The harness locally simulates a primary HTTP 503, then calls the production generator and validator against Qwen; this is not evidence of a natural DeepSeek outage or Mongo persistence. It stops immediately on quota exhaustion. To test selected features only, append `-- --feature=skill_gap_guidance` (repeat `--feature=` for additional names). Use `node backend/test-real-integrations.js` separately for Mongo persistence, restart, and owner-isolation checks.

Run `npm run test:groq-qualification` for ten real Groq requests per supported feature. It locally simulates an OpenRouter HTTP 503, sends actual requests to Groq, validates results through production generators, records only safe counts/latency/token/cost metadata, and stops on quota, rate-limit, or authentication errors. Use `-- --feature=career_assistant --samples=10` to qualify one feature. Samples under ten are reported as insufficient and do not qualify a feature. The command does not change either Groq feature allowlist; enable only features whose results meet the qualification threshold.

Run `npm run test:gemini-qualification -- --samples=10 --confirm-free-tier-only` to run a maximum of ten sequential real Gemini calls per feature. It uses synthetic non-personal fixtures, production generators and validators, records safe latency/token/cost fields, and stops on the first rate-limit, quota, or auth failure. The explicit `--confirm-free-tier-only` flag is required to send any request because Google bills according to the API project's tier, which this application cannot enforce. With no `GEMINI_API_KEY`, the harness reports each feature as blocked without sending requests. Qualification never changes `GEMINI_PRIMARY_FEATURES`. Resume analysis is not enabled on the unpaid tier.

The Career Assistant retries transient provider failures and empty/invalid completions up to two times, then presents a retry action without saving a fabricated answer. Its authenticated context is assembled from that user's saved profile, assessment, skill-gap analysis, roadmap, daily plan, resume analyses, interview history, and CareerHub coding submissions. Coding practice is not LeetCode synchronization; the assistant explicitly reports when verified LeetCode data is unavailable and only flags practice topics when the saved attempt evidence meets its minimum threshold.

`POST /api/health/ai` requires an authenticated user and makes a real, small request to the configured direct provider. It distinguishes missing configuration, invalid credentials, unavailable models, quota exhaustion, rate limiting, network failures, timeouts, invalid responses, and a verified response. `/api/career/assistant/status` reports configuration and the most recent request state only; it is not itself a connectivity test. Set up `.env` using [.env.example](./.env.example); never commit real keys.

AI-generated assessment and interview questions are validated and are not replaced with curated/demo questions when OpenRouter is unavailable. MCQ answer keys remain server-side until deterministic scoring is complete. Newly generated roadmaps and daily preparation plans require a successful OpenRouter response; no static plan is saved as a successful AI result. Skill-gap analysis and job-description analysis keep their explicitly described deterministic profile/job measurements separate from AI-generated advice. Job/provider facts and match scores remain deterministic; job-fit explanations use OpenRouter. Other provider-dependent operations return explicit errors, and generated outputs are validated before use.

The Mock Interview Studio supports MCQ, local webcam video practice, and voice/behavioral practice. Voice/video sessions generate one initial question at runtime, then send the candidate's saved profile and preceding question/answer/evaluation context to the configured model to score each response and generate an answer-driven follow-up. Difficulty adapts deterministically from the model's five-dimension rubric score: scores of 8–10 raise difficulty one level, scores of 1–4 lower it one level, and scores of 5–7 keep it steady (bounded to easy through hard). If generation fails, the owned session remains retryable and is not replaced with a curated question or fake AI result. Curated questions are used only for MCQ practice and are clearly identified; if the bank has too few for the requested length, the user can choose a shorter session or Mixed topic. Camera/microphone access is requested only when video practice starts. Recordings are local-only and require a separate consent checkbox and explicit record action; no recording is uploaded. Webcam preview does not perform video, appearance, emotion, or body-language analysis. Interview sessions, text answers, scores, and feedback are stored under the authenticated account; MCQ answer keys are only returned after submission.

Not every decision should use AI: career-assessment questions require validated OpenRouter generation; answer scoring and category results are deterministic. Each category and the overall result are the rounded percentage of correct answers in that group; unanswered items count as incorrect. If OpenRouter is unavailable or rejects a request, question generation returns an explicit error and does not substitute curated/demo questions. The legacy `/assessment/questions` endpoint returns `410`; callers must start an OpenRouter-backed session and submit its session ID. `GET /api/career/assessment/latest` always returns `{ assessment, overallReadiness, assessmentCompleted, message }`, with `assessment: null` when no saved assessment exists. Assessment sessions and results are owner-scoped in MongoDB; active answer keys expire with the session and are never sent to the browser before submission. Job/profile match scores, job-provider facts, and roadmap completion are calculated by application logic. Coding practice ships with 16 curated problems and searchable difficulty/topic filters: six entries have exact verified official LeetCode title/slug mappings, and ten are original CareerHub challenges without official LeetCode links. Accepted-problem XP is awarded once per user/problem while all submission attempts remain in history; solved-problem statistics count unique problems. No official LeetCode catalog feed is configured, so the application does not claim the local set is a comprehensive or live LeetCode catalog. Code review is AI-generated; execution results are produced only by the configured external isolated runner. New roadmaps and daily plans are persisted only after successful OpenRouter generation. Resume analysis evaluates extracted text and is not a full document-layout or ATS-system simulation. Conversation history and generated analyses are scoped to the authenticated account in MongoDB.

Run the app with `npm install`, configure the environment above, then `npm start` (or `npm run dev`). Run `npm test`, `npm run lint`, `npm run build`, and `npm run test:api` for checks; the API suite requires MongoDB and intentionally uses an isolated database.

## Validation

Run the repository checks from the root:

```bash
npm test
npm run lint
npm run build
```

`npm run lint` and `npm run build` parse backend/frontend JavaScript and inline page scripts. `npm run test:api` requires `MONGO_URI`, creates a uniquely named isolated test database, starts a separate server on a test port, disables external AI credentials for that server, and removes only that isolated database when finished. Provider-dependent API flows therefore report as blocked rather than consuming quota. `node backend/test-real-integrations.js` makes genuine OpenRouter requests when `OPENROUTER_API_KEY` is configured; mocked unit tests do not count as real-provider verification. The job-source and profile validation tests do not call an AI provider.