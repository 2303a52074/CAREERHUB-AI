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
| `AI_PROVIDER` | Required | Selects the backend primary provider (`openrouter`, `gemini`, or `groq`). Feature gates and provider credentials are still required. |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Optional | Backend-only direct Google Gemini API configuration. The verified default candidate is `gemini-3.1-flash-lite`; no key is distributed with the project. |
| `GEMINI_PRIMARY_FEATURES` | Optional | Comma-separated allowlist. The local configuration enables only generic assessment/interview question generation and seeded-problem hints; profile-, resume-, answer-, job-description-, and submitted-code workflows remain privacy-blocked on the unpaid tier. |
| `OPENROUTER_ROLLBACK_FEATURES` | Optional | Explicit Gemini feature allowlist permitted to roll back to OpenRouter only after retryable Gemini/Groq failure. Empty by default; never an automatic/global fallback. |
| `OPENROUTER_API_KEY` | Required for AI | Server-side OpenRouter API key; never put the key in frontend code or source control. |
| `OPENROUTER_MODEL` | Optional | OpenRouter model ID; defaults to `deepseek/deepseek-chat`. |
| `OPENROUTER_FALLBACK_<FEATURE>_MODEL` | Optional | Feature-scoped model ID, configured only after it qualifies for that feature. Supported variables are listed below; all are disabled when blank. |
| `OPENROUTER_BASE_URL` | Optional | Defaults to `https://openrouter.ai/api/v1`; custom hosts are rejected by the backend. |
| `GROQ_API_KEY` / `GROQ_MODEL` | Optional | Backend-only credentials and model for the independent Groq provider. |
| `GROQ_PRIMARY_FEATURES` | Optional | Comma-separated feature allowlist that routes those features directly to Groq with no OpenRouter fallback. Keep empty until each feature passes at least 9 of 10 real production-schema requests. |
| `GROQ_FALLBACK_FEATURES` | Optional | Comma-separated feature names enabled only after each feature passes at least 9 of 10 real Groq requests through its production validator. Supported names: `assessment_question_generation`, `job_analyzer`, `skill_gap_guidance`, `career_roadmap`, `daily_plan`, `career_assistant`, `technical_interview_generation`, `behavioral_interview_generation`, `interview_evaluation`, `resume_analysis`. |
| `CAREERHUB_RUNNER_IMAGE` | Optional | Locally built Docker image name; defaults to `careerhub-code-runner:local`. No remote code execution API is used. |
| `PORT` | Optional | HTTP port; defaults to `3000`. |

Copy [.env.example](./.env.example) to `.env` or configure `backend/.env`, then set your provider key and MongoDB URL locally. The active loader reads the repository-root `.env` first and `backend/.env` second; existing process variables take precedence, and the first file defining a variable wins. Restart the backend after changing either file. Never place real keys in `.env.example`, source control, frontend code, or chat. Without a working MongoDB connection, health and application API requests report the database as unavailable; they do not silently use the test-only in-memory model adapters. Configure MongoDB and a unique, high-entropy `JWT_SECRET` before deployment. No shared demo account is available.

### Direct Google Gemini API

The backend supports Google's direct `generateContent` endpoint; it does not proxy Gemini through OpenRouter. The configured model must appear in Google's model list and support `generateContent`; `gemini-3.1-flash-lite` was verified with a real generation request. The allowlist includes assessment MCQ, technical/behavioral/video interview question generation, coding hints, and `career_assistant_general`. The free Career Assistant mode sends only the current general question: it does not send the user's profile or saved conversation history. Questions containing personal/profile context are answered locally from the authenticated user's saved profile and are not sent to Gemini. Users must not include confidential, identifying, resume, or code content in general questions. Requalify after changing a provider prompt or validator with `node backend/test-gemini-qualification.js --samples=10 --confirm-free-tier-only`; the harness uses synthetic fixtures, spaces requests by at least six seconds, and stops on a rate limit, quota, or authentication failure.

The centralized Gemini feature names are `assessment_question_generation`, `assessment_insights`, `technical_interview_generation`, `behavioral_interview_generation`, `video_interview_generation`, `interview_evaluation`, `resume_analysis`, `pdf_resume_analysis`, `docx_resume_analysis`, `job_analyzer`, `skill_gap_guidance`, `career_roadmap`, `daily_plan`, `coding_hint`, `coding_review`, `career_assistant`, `career_recommendations`, `learning_resources`, `job_fit_explanation`, and `interview_question`. Each must be independently qualified; adding a feature to this supported list does not enable it.

Important privacy and cost limits: Google's current unpaid-service terms say prompts and responses may be reviewed by humans and used to improve Google products, and explicitly say not to submit sensitive, confidential, or personal information. Gemini therefore refuses resume text/PDF/DOCX, profile-driven insights and plans, job descriptions, free-text interview answers, and user-code review. `career_assistant_general` sends only the current non-personal message and receives no profile or prior conversation; detected personal/profile questions are handled locally from the authenticated user's saved profile. Other personal-data workflows need a separately approved paid/data-processing provider; they are not silently sent to another provider. Use only a free-tier project and disable billing if the monthly budget must remain ₹0; reaching free-tier limits returns a provider error rather than switching to a paid tier. `GROQ_FALLBACK_FEATURES` and `OPENROUTER_ROLLBACK_FEATURES` remain independent, explicit allowlists and do not activate by default.

Resume extraction, ATS text checks, job-description requirement extraction, daily preparation plans, and profile-specific Career Assistant replies run locally. Raw resume and job-description text are not stored in analysis history. Personalized AI features that process resumes, job descriptions, profiles, answers, or saved conversation history remain disabled unless the operator explicitly attests to an approved paid/data-processing arrangement by setting `CAREERHUB_AI_DATA_PROCESSING_APPROVED=true` and `CAREERHUB_AI_DATA_PROCESSING_PROVIDER` to the same configured provider (`openrouter` or `groq`). Gemini is not eligible for these personal-data workflows, and OpenRouter model IDs marked `:free` are rejected. The operator is responsible for verifying the provider's actual contract, data handling, and billing before making that declaration. With no approved provider, local analysis remains available where implemented and the UI clearly reports that personalized AI is unavailable.

Before deploying the daily-plan concurrency safeguard, run `npm run migrate:daily-plan-index` once against the configured MongoDB database. It checks for duplicate `(userId, date)` plans and stops without changing data if any are found; resolve duplicates explicitly before retrying. The migration creates the plan and generation-lease indexes, after which generation is coordinated across backend instances.

### Locally managed coding runner

Code execution is performed by a dedicated CareerHub Docker image, not Judge0 or a remote API. Install Docker Desktop for Windows with the WSL2 backend (or Docker Engine on Linux), start it, and verify that `docker info` succeeds. Then build the local image from the repository root:

```powershell
docker build -t careerhub-code-runner:local -f backend/execution/Dockerfile backend/execution
docker image inspect careerhub-code-runner:local
```

Restart CareerHub and check the authenticated `GET /api/coding/engine` endpoint or the Engine status on the problem catalog. The runner supports Python 3, Java 17, C++17, and Node.js. Each run starts a fresh container with no network, a read-only root filesystem, a temporary writable filesystem, a non-root UID, dropped Linux capabilities, no-new-privileges, a 0.5 CPU limit, 256 MB memory, 64 processes, a bounded CPU/time budget, and no host directory mounts. Java receives up to twice the configured per-test runtime allowance (capped at five seconds) to account for JVM startup under the container CPU limit. Source code is sent over the container's standard input; execution is never performed in the Express process. Container memory/runtime usage may not be available on every host and is shown as unavailable rather than estimated.

On Windows, install WSL2 if needed (`wsl --install`), install Docker Desktop, select the WSL2 engine, and wait for its status to say Running. If the Docker daemon is stopped or unavailable to the CareerHub process, the UI leaves execution unavailable and reports the Docker setup requirement; it does not fabricate output. Never expose the Docker daemon socket to submitted code or mount host files into the execution container. Docker administration access itself is highly privileged and should be restricted to the CareerHub service operator.

`npm test` covers input validation, status handling, and required container restrictions. Real execution tests require the local daemon and built runner image; a missing daemon/image is BLOCKED, not a passing execution result.

Run `npm run test:catalog` to validate the original 100-problem catalog before seeding. It checks the required topic/difficulty totals, unique problem content, per-language starter scaffolds, and public/hidden expected outputs against private Python references; it also exercises the four language runners against a known problem. The API integration suite seeds only a validated catalog into its isolated MongoDB test database and checks idempotent seeding, submission persistence, XP de-duplication, and user isolation.

### LeetCode profile data

CareerHub currently does not synchronize LeetCode stats or submissions. LeetCode's published `robots.txt` disallows automated access to `/graphql`, and no authorized public stats API was verified. The authenticated `GET /api/user/leetcode/:username` endpoint therefore validates the username and responds with `LEETCODE_SYNC_UNAVAILABLE`; it does not fetch or claim to sync profile data. Users can still open their public profile directly at `https://leetcode.com/u/{username}/`. CareerHub never requests LeetCode passwords or cookies and does not award XP for external profile data.

Text-based PDF and DOCX resumes are extracted in memory for analysis; uploaded files and extracted text are not retained, while analysis results are stored per account. Scanned/image-only PDFs require OCR, which is not configured and are rejected with an explicit message. CareerHub coding exercises and submissions are account-specific and stored in MongoDB.

Learning Resources is a curated directory of links to official documentation and established practice platforms. It does not imply endorsement or host external material.

### Live job listings and matching

Job Matching requests the first page of the public [Arbeitnow Job Board API](https://www.arbeitnow.com/api/job-board-api) from the backend on each load; the feed is not seeded or cached by CareerHub. The provider's [API documentation](https://www.arbeitnow.com/blog/job-board-api), updated August 2026, says its free API requires no API key, primarily covers Germany and the UK, and aggregates listings from employer ATS platforms including Greenhouse, SmartRecruiters, Join.com, Teamtailor, Recruitee, and Comeet. Each result links to its specific Arbeitnow source listing, is attributed in the UI, and opens in a new tab. The feed does not currently supply salary data, so CareerHub omits salary rather than estimating it. Confirm details and submit an application on the source/employer page; opening the listing does not submit one.

The API returns current provider-feed records at request time; as with any aggregator, CareerHub cannot guarantee the employer has not since closed or changed a listing. If the provider is unavailable, Job Matching shows an unavailable state instead of old seeded listings. Older seeded records are no longer read by the matching endpoint or inserted on startup. Remotive was not selected: its [public API notice](https://remotive.com/remote-jobs/api) says listings must link back to Remotive and prohibits certain third-party redistribution and signup-gating uses.

Match percentage uses only profile information and provider fields actually present: 60% profile technical-skill overlap with listing tags, 30% target-role term overlap with the title, and 10% preferred-location compatibility (including an explicit remote flag). Missing dimensions are excluded and remaining weights are normalized; with no comparable profile fields the score is unavailable. Skills/tags, job type, location, text search, and newest/match sorting use the provider response and client filters.

The Job Description Analyzer computes role overlap deterministically from recognized catalog requirements and the user's listed skills. The configured AI provider provides grounded explanations, preparation steps, and interview questions when available; its advice does not change the calculated match. If no supported technical requirements are detected, the score is unavailable. Profile skills are self-reported, not proficiency-verified.

### AI provider architecture

All workflows use the centralized backend AI service and retain their production validators and persistence provenance. The repository example keeps OpenRouter as its default; the local backend environment selects Gemini and enables only the four general-question workflows listed above. Gemini errors do not silently retry through OpenRouter. An independently qualified feature may use `GROQ_FALLBACK_FEATURES`; optional OpenRouter rollback requires an explicit `OPENROUTER_ROLLBACK_FEATURES` allowlist. All provider responses use the same production validator. Provider credentials remain backend-only.

Run `node backend/test-ai-fallback-benchmark.js` with live OpenRouter credentials to qualify the configured candidate (`OPENROUTER_QUALIFICATION_MODELS` can provide a comma-separated candidate list). It runs ten sequential production-generator calls for each of 12 workflows by default. It records only counts, sanitized error categories, latency, token usage, and estimated costs; it does not print prompts or responses. Results with fewer than ten calls cannot qualify. This benchmark uses real requests and may consume provider quota.

The latest 120-request live qualification run qualified `qwen/qwen3-30b-a3b-instruct-2507` for assessment MCQs (9/10), job description analysis (9/10), skill-gap guidance (10/10), career roadmaps (9/10), daily plans (10/10), and the Career Assistant (10/10). It did not qualify for technical or behavioral interview questions, interview evaluation, text/PDF resume analysis, or coding recommendations. To opt in only for qualified workflows, set the matching backend variable: `OPENROUTER_FALLBACK_ASSESSMENT_MODEL`, `OPENROUTER_FALLBACK_JOB_ANALYZER_MODEL`, `OPENROUTER_FALLBACK_SKILL_GAP_MODEL`, `OPENROUTER_FALLBACK_ROADMAP_MODEL`, `OPENROUTER_FALLBACK_DAILY_PLAN_MODEL`, or `OPENROUTER_FALLBACK_ASSISTANT_MODEL` to that model ID. These variables remain blank by default; no global Qwen fallback is enabled. Re-run the benchmark before relying on these results after provider/model changes.

Run `npm run test:qualified-fallbacks` for one bounded real Qwen attempt per workflow. The harness locally simulates a primary HTTP 503, then calls the production generator and validator against Qwen; this is not evidence of a natural DeepSeek outage or Mongo persistence. It stops immediately on quota exhaustion. To test selected features only, append `-- --feature=skill_gap_guidance` (repeat `--feature=` for additional names). Use `node backend/test-real-integrations.js` separately for Mongo persistence, restart, and owner-isolation checks.

Run `npm run test:groq-qualification` for ten real Groq requests per supported feature. It locally simulates an OpenRouter HTTP 503, sends actual requests to Groq, validates results through production generators, records only safe counts/latency/token/cost metadata, and stops on quota, rate-limit, or authentication errors. Use `-- --feature=career_assistant --samples=10` to qualify one feature. Samples under ten are reported as insufficient and do not qualify a feature. The command does not change either Groq feature allowlist; enable only features whose results meet the qualification threshold.

Run `npm run test:gemini-qualification -- --samples=10 --confirm-free-tier-only` to run a maximum of ten sequential real Gemini calls per feature. It uses synthetic non-personal fixtures, production generators and validators, records safe latency/token/cost fields, and stops on the first rate-limit, quota, or auth failure. The explicit `--confirm-free-tier-only` flag is required to send any request because Google bills according to the API project's tier, which this application cannot enforce. With no `GEMINI_API_KEY`, the harness reports each feature as blocked without sending requests. Qualification never changes `GEMINI_PRIMARY_FEATURES`. Resume analysis is not enabled on the unpaid tier.

On providers approved to process user-specific context, the Career Assistant uses only that authenticated user's saved profile and module records, persists conversation history per user, and returns a retryable error instead of saving a fabricated answer. In Gemini unpaid-tier mode the Career Assistant is disabled before user messages or history are sent; its composer remains disabled and the UI explains why. Coding practice is not LeetCode synchronization; the assistant explicitly reports when verified LeetCode data is unavailable and only flags practice topics when the saved attempt evidence meets its minimum threshold.

`POST /api/health/ai` requires an authenticated user and makes a real, small request to the configured direct provider. It distinguishes missing configuration, invalid credentials, unavailable models, quota exhaustion, rate limiting, network failures, timeouts, invalid responses, and a verified response. `/api/career/assistant/status` reports configuration and the most recent request state only; it is not itself a connectivity test. Set up `.env` using [.env.example](./.env.example); never commit real keys.

AI-generated assessment and interview questions are validated and are not replaced with curated/demo questions when OpenRouter is unavailable. MCQ answer keys remain server-side until deterministic scoring is complete. Newly generated roadmaps and daily preparation plans require a successful OpenRouter response; no static plan is saved as a successful AI result. Skill-gap analysis and job-description analysis keep their explicitly described deterministic profile/job measurements separate from AI-generated advice. Job/provider facts and match scores remain deterministic; job-fit explanations use OpenRouter. Other provider-dependent operations return explicit errors, and generated outputs are validated before use.

The Mock Interview Studio supports MCQ, local webcam video practice, and voice/behavioral practice. Voice/video sessions generate one initial question at runtime, then send the candidate's saved profile and preceding question/answer/evaluation context to the configured model to score each response and generate an answer-driven follow-up. Difficulty adapts deterministically from the model's five-dimension rubric score: scores of 8–10 raise difficulty one level, scores of 1–4 lower it one level, and scores of 5–7 keep it steady (bounded to easy through hard). If generation fails, the owned session remains retryable and is not replaced with a curated question or fake AI result. Curated questions are used only for MCQ practice and are clearly identified; if the bank has too few for the requested length, the user can choose a shorter session or Mixed topic. Camera/microphone access is requested only when video practice starts. Recordings are local-only and require a separate consent checkbox and explicit record action; no recording is uploaded. Webcam preview does not perform video, appearance, emotion, or body-language analysis. Interview sessions, text answers, scores, and feedback are stored under the authenticated account; MCQ answer keys are only returned after submission.

Not every decision should use AI: career-assessment questions require validated OpenRouter generation; answer scoring and category results are deterministic. Each category and the overall result are the rounded percentage of correct answers in that group; unanswered items count as incorrect. If OpenRouter is unavailable or rejects a request, question generation returns an explicit error and does not substitute curated/demo questions. The legacy `/assessment/questions` endpoint returns `410`; callers must start an OpenRouter-backed session and submit its session ID. `GET /api/career/assessment/latest` always returns `{ assessment, overallReadiness, assessmentCompleted, message }`, with `assessment: null` when no saved assessment exists. Assessment sessions and results are owner-scoped in MongoDB; active answer keys expire with the session and are never sent to the browser before submission. Job/profile match scores, job-provider facts, and roadmap completion are calculated by application logic. Coding practice now targets the self-hosted Docker runner documented below; it does not use Judge0 or execute submitted code inside Express. The current 100-record catalog meets only structural count checks: all 100 entries have generic hints/editorials, while 99 also contain placeholder starters and generic test explanations. The seeder refuses to write this catalog until the problem-specific content is complete, so do not treat the coding library or dashboard as production-ready. No official LeetCode catalog feed is configured. Accepted-problem XP is awarded once per user/problem while all submission attempts remain in history; solved-problem statistics count unique problems. New roadmaps and daily plans are persisted only after successful OpenRouter generation. Resume analysis evaluates extracted text and is not a full document-layout or ATS-system simulation. Conversation history and generated analyses are scoped to the authenticated account in MongoDB.

The local coding runner requires Docker Desktop with the Linux container engine running. On Windows, launch Docker Desktop, select **Linux containers** if prompted, then verify the `desktop-linux` context with `docker context use desktop-linux` and `docker info`. If the engine is unavailable, install/update WSL 2 (`wsl --update`), restart it with `wsl --shutdown`, relaunch Docker Desktop, and wait until `docker info` shows both Client and Server sections. Build the image from the repository root with `docker build -t careerhub-code-runner:local -f backend/execution/Dockerfile backend/execution`. The API reports execution as unavailable until Docker and that local image are ready.

The local integration suite runs actual Python, Java, C++, and JavaScript programs, as well as wrong-answer, compile/runtime error, timeout, memory, read-only filesystem, network, environment-variable, process-limit, hidden-output, and container-cleanup checks: run `npm run test:local-runner`. These checks have passed against Docker Desktop Linux in this environment. Coding catalog validation and MongoDB/browser submission workflows remain separate acceptance checks; do not treat runner checks alone as proof that the full platform is complete.

Run the app with `npm install`, configure the environment above, then `npm start` (or `npm run dev`). Run `npm test`, `npm run lint`, `npm run build`, and `npm run test:api` for checks; the API suite requires MongoDB and intentionally uses an isolated database.

## Validation

Run the repository checks from the root:

```bash
npm test
npm run lint
npm run build
```

`npm run lint` and `npm run build` parse backend/frontend JavaScript and inline page scripts. `npm run test:api` requires `MONGO_URI`, creates a uniquely named isolated test database, starts a separate server on a test port, disables external AI credentials for that server, and removes only that isolated database when finished. Provider-dependent API flows therefore report as blocked rather than consuming quota. `node backend/test-real-integrations.js` makes genuine OpenRouter requests when `OPENROUTER_API_KEY` is configured; mocked unit tests do not count as real-provider verification. The job-source and profile validation tests do not call an AI provider.