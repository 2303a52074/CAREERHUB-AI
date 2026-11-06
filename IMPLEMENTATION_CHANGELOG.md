# CareerHub AI — Implementation Changelog

This changelog summarizes the current implementation and verified limitations. The active AI provider is **OpenRouter**, defaulting to `deepseek/deepseek-chat`. Environment variables are loaded by `backend/utils/loadEnv.js` before service and route imports. Do not use any historical Gemini configuration as current setup.

## Current implementation notes

- AI-backed features use the centralized backend service. Provider credentials remain server-side; missing credentials, provider failures, and unusable output are surfaced instead of replaced with fabricated AI responses.
- Coding execution is delegated to a configured external runner. Without runner configuration, execution is unavailable; user code is not executed in the Node.js application process.
- Resume extraction supports text-based PDF and DOCX documents. Scanned/image-only PDFs are unsupported because OCR is not configured.
- The Career Assistant context is assembled from authenticated, user-scoped saved profile and career records. Coding progress reflects CareerHub submissions, not synchronized LeetCode submissions.
- Assessment history now has an authenticated, owner-scoped paginated endpoint and a matching UI list. The latest real Mongo integration and browser refresh check passed.
- Interview question generation now retries bounded empty/malformed outputs with stricter, concise schema instructions and a larger, still-capped token budget. The latest live video-mode interview request passed after earlier intermittent provider timeouts/invalid output.
- Application Tracker no longer invents “Remote” or “Competitive” when optional location/salary fields are blank. It reports API failures, prevents duplicate saves while submitting, and uses an SVG delete icon.
- Local video interview recordings now have an in-browser playback preview in addition to the existing download link. The playback change is not yet verified by an explicitly consented recording.
- A shared visual foundation includes restrained card/button depth, reduced-motion handling, focus states, accessible SVG toast icons, and a Daily Plan loading/error-state fix. This is not a completed redesign of every page.

## Verification state

- Latest `npm test`, `npm run lint`, and `npm run build` passed.
- Latest real OpenRouter/MongoDB integration run verified 27 checks with no failures or blocks, including persistence across backend restart, cross-user isolation, interview generation, and application CRUD.
- The previous browser pass was a smoke test, not a full responsive or page-by-page audit.
- Browser verified OpenRouter assessment questions/scoring/history refresh, actual DOCX extraction and AI analysis, application create/update/delete, and video-mode System Design generation. Camera/microphone access and toggles worked; local recording/playback remains unverified because no explicit recording consent was given.
- API suites reported 35 passed/0 failed/10 blocked and 78 passed/0 failed/23 blocked. Blocked cases require provider credentials in isolated test runs or a configured execution runner.
- Judge0 is unconfigured; live code execution remains unavailable.
- No authorized LeetCode public-statistics source is configured or verified. Do not scrape undocumented endpoints or represent local progress as LeetCode synchronization.
- Current measured status and remaining work are tracked in [FINAL_TESTING_REPORT.md](./FINAL_TESTING_REPORT.md).

## Historical Gemini configuration notes (archived)

Earlier work temporarily described Gemini setup and testing. That configuration was superseded by the OpenRouter migration. The old Gemini SDK, environment variables, model names, and test results are not instructions for the current application and should not be used to configure it. Current setup guidance is in [README.md](./README.md) and `.env.example`.

## Shared design-system foundation

`frontend/assets/shared-nav.css` and its `public/` counterpart contain shared card/button states, focus/reduced-motion behavior, and mobile table overflow containment. `frontend/assets/shared-nav.js` and its duplicate provide accessible toast SVGs and scoped SVG icon normalization. `frontend/daily-plan.html` and `public/daily-plan.html` clear the loading state and show an actionable message for a missing target role or network failure.

These changes preserve the existing page structure and are only a foundation. The full route-by-route redesign, remaining icon replacement, and desktop/tablet/mobile browser tests are still outstanding.
