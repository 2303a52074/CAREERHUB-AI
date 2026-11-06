# CareerHub AI — Final Bug Fix Report

This report covers the hardening changes in this pass. The worktree contained unrelated pre-existing changes; those were left intact.

## Security and integrity

### Challenge XP farming

- Removed answer-length scoring.
- Added server-side grading for the reverse-string coding challenge through the existing isolated code-execution service, including hidden test cases.
- Text challenges now fail closed with `CHALLENGE_EVALUATION_UNAVAILABLE` until a trusted evaluator exists; they do not earn XP.
- Challenge IDs are stable for the UTC day.
- Added `completedChallengeIds` to the user record. A conditional update atomically records completion and increments XP, preventing parallel duplicate awards and scoping the award to the authenticated user.
- Regression tests cover ungraded text answers, rejected coding answers, duplicate submissions, and per-user XP isolation.

### Daily-plan multi-instance race

- Kept the existing in-process request coalescing and added a MongoDB lease keyed by user and date.
- Added unique indexes for daily plans and leases. Waiters reuse the saved plan; if a generation is still active past the bounded wait, the route returns a retryable `503`.
- Added `npm run migrate:daily-plan-index`. It checks duplicate plan/lease keys and aborts without modifying data before creating indexes.
- API integration now launches two independent Node processes against an isolated MongoDB database and verifies one generator, one saved plan, identical returned plan IDs, and no remaining active lease.

## Loading, duplicate requests, and accessibility

- Dashboard data requests start concurrently and each has a 12-second deadline; failures render explicit unavailable states instead of leaving loading placeholders.
- The Job Description Analyzer prevents duplicate submissions, times out after 45 seconds, surfaces the server message, and always restores its button.
- Assistant status/history requests are coalesced, bounded by 15-second timeouts, and use `Promise.allSettled` so a failure in one request does not trigger overlapping retries while the other is still pending.
- Daily-plan and roadmap toggles are semantic buttons with accessible labels and `aria-pressed` state. Concurrent updates are serialized, bounded by timeouts, and controls are re-enabled after failures.

## Files changed in this pass

- `backend/models/User.js`
- `backend/utils/challengeService.js`
- `backend/routes/challengeRoutes.js`
- `backend/test-challenge-security.js`
- `backend/utils/inMemoryDB.js`
- `backend/models/DailyPlan.js`
- `backend/models/DailyPlanGenerationLock.js`
- `backend/utils/dailyPlanGeneration.js`
- `backend/routes/careerRoutes.js`
- `backend/migrations/ensure-daily-plan-unique-index.js`
- `backend/run-api-tests.js`
- `backend/test-extended.js`
- `backend/test-daily-plan-worker.js`
- `frontend/assets/shared-nav.js`
- `frontend/job-analyzer.html`
- `frontend/dashboard.html`
- `frontend/daily-plan.html`
- `frontend/roadmap.html`
- `package.json`
- `README.md`

The five final reports were also added at the repository root.

## Known limitations

- No prose-answer evaluator is configured; those challenge questions are intentionally non-rewarding rather than easy to game.
- The challenge coding grader requires a configured local Judge0 service; without it, submissions return an explicit service error and no XP.
- OpenRouter was not exercised by the isolated API suite, which disables provider credentials. Groq remains unqualified and disabled.
- Frontend edits passed syntax/build checks but have not yet received authenticated browser interaction testing.
