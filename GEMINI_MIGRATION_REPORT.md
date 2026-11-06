# Gemini Migration Report

## Status

**Gemini is integrated but not qualified or active.** The application remains on its existing OpenRouter configuration; no provider was changed automatically. `GEMINI_API_KEY` is not configured, `GEMINI_PRIMARY_FEATURES` is empty, and the qualification harness made zero real Gemini requests.

The backend adapter calls Google's direct Gemini `generateContent` endpoint. It keeps the key in the backend-only `x-goog-api-key` header and uses the existing production generators and validators. Feature routing is allowlist-based; Groq fallback and OpenRouter rollback are independently gated. Resume text, PDF, and DOCX features are blocked from normal Gemini use on the unpaid tier.

## Model, pricing, and privacy

- **Model configured as the default/test candidate:** `gemini-3.5-flash-lite`.
- **Model calls actually made:** none. Its model ID and documented capabilities were checked, but model availability/free-tier eligibility for this API project has not been verified by a real call.
- Google's [model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) lists this stable model and structured-output support.
- Google's [pricing page](https://ai.google.dev/gemini-api/docs/pricing) describes free token access for *limited access to certain models*; it does not guarantee that this project's selected model or quota will be free. Confirm availability and billing controls in AI Studio before enabling anything. No Gemini request charges were incurred in this verification.
- Under Google's [Gemini API terms](https://ai.google.dev/gemini-api/terms), content sent via unpaid services may be used to improve products and may be reviewed by humans. The terms say not to submit sensitive, confidential, or personal information. Therefore, resume text/PDF/DOCX remain blocked; assistant-context minimization/redaction is not a guarantee of anonymization and Career Assistant is also unqualified.
- The terms also require users of the API to be 18 or older and prohibit making clients available to people under 18. Confirm the application's audience and eligibility before deployment.

## Feature qualification

Qualification requires at least 9 valid production-schema responses out of 10 real requests per feature. No feature was qualified. Each row below had **0/10 attempted and 0 valid responses**; latency, token usage, rate-limit counts, and P90 are therefore unavailable, not zero.

| Feature | Gemini result | Configured active route |
|---|---|---|
| Assessment MCQs | BLOCKED — no API key; 0/10 | OpenRouter / DeepSeek; Qwen feature fallback configured |
| Technical interview generation | BLOCKED — no API key; 0/10 | OpenRouter / DeepSeek |
| Behavioral interview generation | BLOCKED — no API key; 0/10 | OpenRouter / DeepSeek |
| Interview evaluation | BLOCKED — no API key; 0/10 | OpenRouter / DeepSeek |
| Resume text analysis | BLOCKED — no API key and unpaid-tier privacy restriction; 0/10 | OpenRouter / DeepSeek |
| PDF resume analysis | BLOCKED — no API key and unpaid-tier privacy restriction; 0/10 | OpenRouter / DeepSeek |
| DOCX resume analysis | BLOCKED — no API key and unpaid-tier privacy restriction; 0/10 | OpenRouter / DeepSeek |
| Job description analysis | BLOCKED — no API key; 0/10 | OpenRouter / DeepSeek; Qwen feature fallback configured |
| Skill-gap guidance | BLOCKED — no API key; 0/10 | OpenRouter / DeepSeek; Qwen feature fallback configured |
| Career roadmap | BLOCKED — no API key; 0/10 | OpenRouter / DeepSeek; Qwen feature fallback configured |
| Daily plan | BLOCKED — no API key; 0/10 | OpenRouter / DeepSeek; Qwen feature fallback configured |
| Coding recommendations | BLOCKED — no API key; 0/10 | OpenRouter / DeepSeek |
| Career Assistant | BLOCKED — no API key; 0/10; user context needs privacy review | OpenRouter / DeepSeek; Qwen feature fallback configured |

The configured Qwen model is `qwen/qwen3-30b-a3b-instruct-2507`, limited to the six rows marked above. No Groq feature fallback is enabled. The Gemini feature allowlist and OpenRouter rollback allowlist are empty. These configuration checks do not prove that the configured OpenRouter credential or live provider is currently healthy.

## Persistence and security

- MongoDB-backed API integration tests ran against an isolated test database. Existing owner-scoped persistence checks passed, including conversation history/clear-history and user isolation. The suite also verified daily-plan index migration safety.
- Gemini-generated persistence, provider provenance through a real Gemini response, post-restart recovery of a Gemini record, and Gemini cross-user isolation are **NOT TESTED** because no Gemini response was generated.
- The conversation schema now accepts `gemini` provenance, and a unit assertion verifies that metadata is valid. Existing response validation and route persistence logic remain in place.
- The frontend contains no Gemini API-key references. Provider credentials remain backend-only.

## Regression results

| Check | Result |
|---|---|
| `npm test` | PASS |
| `npm run lint` | PASS — 90 JavaScript files and 44 inline page scripts |
| `npm run build` | PASS — same build checks |
| `node backend/test-interview-workflows.js` | PASS |
| `node backend/test-provider-selection.js` | PASS — mocked routing, validation, failure handling, privacy blocks, and Gemini provenance schema |
| `git diff --check` | PASS — no whitespace errors; Git reported existing LF/CRLF conversion notices |
| `npm run test:api` | 80 PASS, 0 FAIL, 23 BLOCKED; exit code 2 because blocked external dependencies are surfaced. Live AI calls were disabled in the isolated test server; a Judge0-compatible runner was unavailable. |
| `node backend/test-gemini-qualification.js --samples=10` | BLOCKED — missing key; 0 requests sent across all 13 features |

The mocked tests are not real-provider qualification evidence. No Gemini rate-limit or timeout events occurred because no Gemini requests were made. Real Gemini persistence and latency/cost measurements remain unverified.

## Activation and rollback

Do not set `GEMINI_PRIMARY_FEATURES` yet. After configuring a backend-only API key and confirming the account is restricted to the intended billing tier, qualify each feature independently using:

```powershell
node backend/test-gemini-qualification.js --samples=10 --confirm-free-tier-only
```

Only add features meeting the 9/10 production-validator threshold after reviewing their privacy terms. Keep resume analysis disabled for unpaid Gemini. To roll back, set `AI_PROVIDER=openrouter` and leave `GEMINI_PRIMARY_FEATURES` empty; this is already the current configuration. Groq and OpenRouter fallback routing must remain explicitly feature-qualified/configured.

## Migration-related files

- `backend/utils/aiService.js`
- `backend/utils/providerErrors.js`
- `backend/routes/careerRoutes.js`
- `backend/routes/interviewRoutes.js`
- `backend/routes/resumeRoutes.js`
- `backend/server.js`
- `backend/models/CareerConversation.js`
- `backend/test-provider-selection.js`
- `backend/test-provider-errors.js`
- `backend/test-extended.js`
- `backend/test-real-integrations.js`
- `backend/test-e2e.js`
- `backend/test-gemini-qualification.js`
- `.env.example`
- `package.json`
- `README.md`
- `frontend/careerhub.js`
- `public/careerhub.js`
