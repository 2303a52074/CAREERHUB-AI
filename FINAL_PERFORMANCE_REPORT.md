# CareerHub AI — Final Performance Report

## Scope and status

No full production load test or authenticated-page performance benchmark was run during this pass. The following measurements are historical evidence from prior controlled tests and are labeled as such. They do not prove a performance improvement or production capacity.

## Previous browser measurements

Public pages only; prior run at 390, 768, and 1366 CSS-pixel viewport widths had no horizontal overflow.

| Page | DOM content loaded | Full load |
|---|---:|---:|
| Landing | 271 ms | 395 ms |
| Login | 120 ms | 305 ms |
| Registration | 82 ms | 179 ms |

These are local-browser samples, not percentiles from a representative user population. Authenticated feature pages were not measured.

## Previous AI-provider measurements

A prior controlled 30-request OpenRouter sample across 10 workflows observed:

| Metric | Measurement |
|---|---:|
| Valid successful responses | 20 / 30 (66.7%) |
| Failures | 10 / 30 (9 timeouts, 1 invalid output) |
| End-to-end median | 12,522 ms |
| End-to-end P90 | 15,019 ms |
| Provider median | 12,521 ms |
| Provider P90 | 15,018 ms |
| Application/generator processing | 1 ms median, 2 ms P90 |
| Retries in that sample | 0 |

A subsequent prior integration wave had 6 successful provider calls and 7 timeouts among 13 measured calls (median 15,007 ms, P90 15,025 ms). These results suggest provider latency/connectivity is the bottleneck; they do not establish stable availability.

The most recent isolated API suite did not call OpenRouter and therefore produced no fresh real-provider latency data. No Groq qualification or cost estimate is claimed.

## Changes with performance implications

- Dashboard API requests now begin concurrently and are bounded by 12 seconds each. No before/after authenticated dashboard timing was measured.
- Assistant status and history are coalesced per drawer load, each bounded by 15 seconds.
- Job-description analysis is bounded at 45 seconds and prevents duplicate in-flight submission.
- Daily-plan generation has a five-minute database lease and a 90-second waiter deadline. A two-process MongoDB test observed exactly one generation winner and one saved plan; this was a concurrency correctness test, not a throughput benchmark.
- Daily-plan and roadmap update requests are serialized in the UI and bounded at 15 seconds.

These are request deadlines and concurrency controls, not measured user-visible latency improvements. Do not increase timeouts or enable unqualified fallbacks based on these data.

## Remaining measurements

1. Benchmark authenticated dashboard and feature workflows against production-like MongoDB and AI services.
2. Measure request p50/p90/p99, provider versus application time, queueing, database query time, and error rates under a controlled load.
3. Re-run feature qualification only when provider quota is available and use at least 10 real responses per feature.
4. Measure Judge0 cold-start and execution latency after configuring the isolated runner.
