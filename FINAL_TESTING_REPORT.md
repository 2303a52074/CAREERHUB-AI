# CareerHub AI — Current Verification Report

> Historical snapshot: this report predates the latest hardening pass. See [FINAL_TEST_RESULTS.md](./FINAL_TEST_RESULTS.md) for the current test counts and known blockers.

## Current configuration

- The backend selects OpenRouter and defaults to `deepseek/deepseek-chat`. Runtime environment loading happens before route and AI-service imports.
- `.env.example` documents the OpenRouter variables with blank secret values. The frontend does not receive provider credentials.
- Older Gemini notes in prior reports/changelogs are historical only; they are not current setup instructions. See the changelog's archived note.

## Latest verified results

| Area | Status | Evidence / limitation |
|---|---|---|
| Unit tests, lint, and build | **PASS** | Latest `npm test`, `npm run lint`, and `npm run build` passed. |
| Real OpenRouter/MongoDB integration | **BLOCKED** | Latest `node backend/test-real-integrations.js`: 26 verified, 0 failed, 7 blocked by `AI_PROVIDER_TIMEOUT`. Provider connectivity, genuine assistant context/follow-up, resume-text and job analysis, daily-plan deduplication, MongoDB restart persistence, and user isolation passed; assessment, video interview, roadmap, PDF analysis, daily plan, skill-gap guidance, and a second user's roadmap generation were blocked by timeouts. |
| OpenRouter performance | **BLOCKED** | A 30-call controlled benchmark across 10 features completed with 20 successes and 10 failures (9 timeouts, 1 invalid output): 66.7% success, 33.3% failure, median 12,522 ms, P90 15,019 ms. Provider duration was effectively the full duration (median 12,521 ms, P90 15,018 ms); generator/application processing was 1 ms median, 2 ms P90; 0 retries. A separate latest Mongo integration timing sample had 6/13 successes, 7 timeouts, median 15,007 ms, P90 15,025 ms, and 0 retries. These samples indicate provider-side latency/failures remain and do not establish an improved success rate. |
| Assessment history endpoint/UI | **PASS** | Browser generated and submitted a real OpenRouter assessment; saved history appeared, then remained visible after page refresh. Integration checked owner history and the other user's empty result. |
| Resume DOCX upload and analysis | **PASS** | Uploaded an isolated synthetic DOCX through the UI; extraction succeeded, actual OpenRouter analysis was attributed to `openrouter`, and the saved record appeared in recent analyses. |
| Resume PDF upload | **BLOCKED** | A valid text-based PDF now passes actual extraction with the upgraded parser. The authenticated upload reached OpenRouter but analysis returned `AI_PROVIDER_TIMEOUT`; no result was saved, so PDF-route persistence and owner isolation remain unverified. Scanned PDFs remain unsupported because OCR is not configured. |
| Video interview generation and camera controls | **PASS** | Live video-mode question generation passed; browser camera/microphone access and both controls worked. |
| Local interview recording/playback | **NOT TESTED** | The local recording preview is implemented, but recording and playback require explicit consent and were not exercised. |
| Application tracker UI and API | **PASS** | Browser created, updated, and deleted an isolated test application; empty salary remained “Salary not listed.” Live API integration verified status update, persistence, deletion, and cross-user write protection. |
| API regression suites | **BLOCKED** | Latest run: end-to-end 35 passed, 0 failed, 10 blocked; extended 78 passed, 0 failed, 23 blocked. The runner deliberately removes the OpenRouter key and no isolated Judge0 runner is configured, so provider/runner-dependent cases remain blocked; the suite exits with status 2 by design. |
| LeetCode synchronization | **BLOCKED** | No authorized, documented public-statistics integration is configured or verified. The app must not claim external synchronization; available coding progress refers only to saved CareerHub records. |
| Judge0 execution | **BLOCKED** | No external code runner is configured; code execution must not be reported as successful. |
| Full premium UI transformation | **NOT TESTED** | Shared styles and accessible SVG icons were added, but all-page icon/control cleanup and desktop/tablet/mobile browser testing are still outstanding. |
| Full visible-control audit and responsive testing | **NOT TESTED** | This was a targeted browser pass, not an audit of every visible control and route at desktop, tablet, and mobile sizes. |

## Remaining work

1. Complete consent-based local recording/playback browser verification.
2. Retry PDF upload after OpenRouter recovers, then verify saved history and owner isolation.
3. Continue the page-by-page visual and control audit at desktop, tablet, and mobile sizes.
4. Do not enable LeetCode sync until an authorized and documented source is verified; do not request account passwords, cookies, or private tokens.

The project is not complete. A check is marked **PASS** only when supported by an executed test or browser workflow; provider/runner limitations remain **BLOCKED**, and unexercised work remains **NOT TESTED**.

## OpenRouter performance notes

The earlier 13-request sample measured 9 successes and 4 timeouts, with a 15-second median and 40.3-second P90. Historical logs do not separate provider time from application processing, so that sample is not directly comparable to the later instrumented benchmark. The later benchmark caps each call at its feature deadline, avoids retries for timeouts and invalid output, and records provider and orchestration timing separately. It reduced the observed tail duration in that sample, but did not demonstrate better availability: the controlled benchmark still failed 10 of 30 calls, and the subsequent integration wave timed out on 7 of 13 provider requests. OpenRouter/DeepSeek service latency, transient availability, and occasional unusable output remain unresolved provider-side limitations.
