# CareerHub AI — Deployment Guide

## Readiness warning

This guide documents configuration and safeguards; it does not certify production readiness. Genuine AI workflows, Judge0 execution, authenticated browser flows, and deployment-database migration still require verification.

## Required backend environment

Keep all variables in backend environment configuration. Never place secrets in frontend files, `.env.example`, logs, reports, or source control.

| Variable | Setting |
|---|---|
| `MONGO_URI` (or `MONGODB_URI`) | Required MongoDB connection string; `MONGO_URI` takes precedence. |
| `JWT_SECRET` | Required in production; use a high-entropy private value. |
| `AI_PROVIDER` | `openrouter` |
| `OPENROUTER_API_KEY` | Required for genuine AI calls; backend only. |
| `OPENROUTER_MODEL` | Keep the current DeepSeek primary (default: `deepseek/deepseek-chat`). |
| `OPENROUTER_FALLBACK_ASSESSMENT_MODEL` | `qwen/qwen3-30b-a3b-instruct-2507` |
| `OPENROUTER_FALLBACK_JOB_ANALYZER_MODEL` | `qwen/qwen3-30b-a3b-instruct-2507` |
| `OPENROUTER_FALLBACK_SKILL_GAP_MODEL` | `qwen/qwen3-30b-a3b-instruct-2507` |
| `OPENROUTER_FALLBACK_ROADMAP_MODEL` | `qwen/qwen3-30b-a3b-instruct-2507` |
| `OPENROUTER_FALLBACK_DAILY_PLAN_MODEL` | `qwen/qwen3-30b-a3b-instruct-2507` |
| `OPENROUTER_FALLBACK_ASSISTANT_MODEL` | `qwen/qwen3-30b-a3b-instruct-2507` |
| `OPENROUTER_FALLBACK_MODEL` | **Do not configure.** |
| Other OpenRouter feature fallback variables | Leave unset for unqualified workflows. Unsetting any feature variable disables that fallback. |
| `GROQ_API_KEY`, `GROQ_MODEL` | Optional backend-only configuration. Groq is currently unqualified and must remain disabled. |
| `GROQ_FALLBACK_FEATURES` | Leave empty until a feature independently passes the real-provider qualification threshold. |
| `CODE_EXECUTION_API_URL` | Required for coding runs/XP grading; local Judge0 CE URL, e.g. `http://127.0.0.1:2358`. Remote runner hosts are rejected. |
| `CODE_EXECUTION_API_KEY`, `CODE_EXECUTION_API_KEY_HEADER` | Only if the local Judge0 instance requires authentication; keep backend-only. |
| `PORT` | Optional; defaults to `3000`. |

The six Qwen entries are feature-scoped and do not imply that current quota/connectivity is available. Groq must not be enabled merely because it has a configured model. All provider responses still require the production validators.

## Database migration and rollout

1. Back up the deployment database and verify the target URI.
2. Run `npm run migrate:daily-plan-index` once against the intended database.
3. The migration checks for duplicate `(userId, date)` plans and duplicate leases. On duplicates it exits without deleting or changing documents; resolve records explicitly, then retry.
4. Confirm the plan and lock unique indexes exist before deploying multiple backend instances.
5. Deploy the backend and verify MongoDB health, daily-plan reads, provider status, and ownership checks.
6. Deploy frontend assets and run authenticated browser workflows at desktop, tablet, and mobile widths.

The migration has been tested on an isolated API-test database, including a duplicate fixture. It has **not** been run against the deployment database.

## Tests and operational checks

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run test:api` — requires MongoDB; creates and removes only a uniquely named isolated test database. Its current 23 provider/runner-dependent checks are blocked by design, not passing.
- `node backend/test-real-integrations.js` — makes real provider calls if credentials are configured; run only when quota is available and keep the sample bounded.

The daily-plan text challenges do not award XP until a trusted evaluator is configured. Coding challenge XP requires the supported local Judge0 service; otherwise submissions fail explicitly and award no points.
