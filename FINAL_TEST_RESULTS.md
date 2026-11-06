# CareerHub AI — Final Test Results

## Current run

| Command / check | Result | Evidence |
|---|---|---|
| `npm test` | **PASS** | Exit 0. Unit/regression suite includes provider selection, interview workflow, code execution, and challenge-security tests. |
| `npm run lint` | **PASS** | Exit 0; `backend/build-check.js` parsed 89 JavaScript files and 44 inline page scripts. |
| `npm run build` | **PASS** | Exit 0; same syntax/build validation. |
| `node backend/test-interview-workflows.js` | **PASS** | Included in the passing unit suite; mocked adapter tests only. |
| `node backend/test-provider-selection.js` | **PASS** | Included in the passing unit suite; mocked provider-routing tests only. |
| `node backend/test-challenge-security.js` | **PASS** | Ungraded answer rejection, owner-scoped XP, and duplicate-prevention regression tests. The evaluator is mocked; this does not verify a live Judge0 service. |
| `npm run test:api` | **BLOCKED overall** | Exit 2 by design because blocked checks are not passing. Final counts: **80 passed, 0 failed, 23 blocked of 103 checks**. |
| `git diff --check` | **PASS** | Exit 0. Git printed line-ending conversion warnings for existing working-tree files; no whitespace error was reported. |

## MongoDB integration evidence

The API runner created and later removed only a uniquely named isolated test database.

- Duplicate-safety fixture: the migration rejected a synthetic duplicate `(userId, date)` pair and preserved both documents.
- Clean migration: plan and lease unique indexes were created on the isolated database.
- Multi-process daily-plan test: **one generation winner, one saved plan, same plan ID returned to both processes, zero active locks after completion**.
- Challenge XP test with real MongoDB writes: two concurrent accepted-evaluator submissions for one user resulted in one award (**+20 XP**); the second test user's XP delta was **0**. The execution evaluator was injected/mocked, so this test verifies database atomicity and ownership behavior, not real code execution.
- The existing API suite also verified application tracking/persistence, duplicate rejection, and cross-user read/write protection.

The API suite's blocked checks were principally genuine-provider workflows and code execution: the runner intentionally clears OpenRouter credentials, and no isolated Judge0-compatible service is configured. The latest output showed **35 passed / 0 failed / 10 blocked** in the end-to-end suite and **45 passed / 0 failed / 13 blocked** in the extended suite.

## Real-provider evidence and limits

- No real AI request was made by the final isolated API run.
- A previous real OpenRouter integration run recorded **26 verified, 0 failed, 7 blocked**; provider-dependent checks were blocked by timeouts. These historical results are not a fresh provider qualification.
- The prior controlled OpenRouter benchmark across 10 features had **20 successful responses and 10 failures out of 30** (9 timeouts and 1 invalid output); it did not satisfy the required 10-request-per-feature qualification coverage.
- Prior Groq candidate checks stopped after rate limiting and had insufficient per-feature samples. **No Groq feature is qualified or enabled.**
- Qwen fallback qualification remains limited to the six previously qualified workflows and their feature-specific backend settings. A real fallback recovery/persistence run was blocked by provider quota in the earlier attempt.

## Browser and performance evidence

- Earlier browser checks covered public landing, login, and registration pages at 390, 768, and 1366 widths with no horizontal overflow. Those checks did not exercise authenticated workflows.
- The latest frontend changes were syntax-checked but not re-run through authenticated browser interaction tests.
- No new application performance benchmark was run for this pass. See [FINAL_PERFORMANCE_REPORT.md](./FINAL_PERFORMANCE_REPORT.md) for prior measurements and scope.

**Production readiness is not established.** Genuine AI availability, qualified Groq fallbacks, Judge0 execution, target-database migration, and authenticated browser verification remain outstanding.
