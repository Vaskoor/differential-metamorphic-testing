# Differential & Metamorphic Testing Platform

<div align="center">

**Find real bugs in compilers, databases, APIs, and ML models by comparing implementations or transformations.**

![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue)

</div>

---

## Overview

A platform that finds real bugs by comparing outputs across implementations (differential testing) and verifying that input transformations preserve output properties (metamorphic testing). Failing cases are minimized via delta-debugging and auto-filed as bug reports.

```
grammar fuzzer ──▶ generate inputs (JSON/SQL/HTTP)
       │
       ├──▶ differential runner ──▶ run input across target A + B
       │         │                    deep-diff outputs
       │         ▼                    flag mismatches
       │    minimizer ──▶ delta-debug to smallest failing case
       │         │
       │         ▼
       │    bug reporter ──▶ report + CVE-worthy flag
       │
       └──▶ metamorphic checker ──▶ transform input, check oracle
                   │                   (sort/shuffle, sum/reverse, dup/idempotent, WHERE reorder)
                   ▼
              violation flagged
```

## Architecture

```
src/
├── types.ts                        # FuzzInput, DiffResult, MetamorphicRelation, BugReport, MinimizedCase
├── config.ts                       # Platform config (max cases, fuzzers, reporters)
├── fuzzer/
│   └── grammar-fuzzer.ts           # Generate valid JSON/SQL/HTTP inputs from grammars
├── differential/
│   └── differential-runner.ts      # Run input across 2 targets, recursive deep-diff, severity classification
├── metamorphic/
│   └── metamorphic-checker.ts      # 4 built-in relations: sort-shuffle, sum-reverse, dup-idempotent, WHERE-reorder
├── minimize/
│   └── minimizer.ts                # Delta-debugging (ddmin) — reduce to smallest failing subset
├── report/
│   └── bug-reporter.ts            # Generate bug reports with repro steps + CVE-worthy flag
└── server.ts                       # Express API: /api/fuzz, /api/differential, /api/metamorphic, /api/minimize
```

## Core Modules

### Grammar Fuzzer (`fuzzer/grammar-fuzzer.ts`)
Generates structured inputs from grammar rules:
- **JSON**: recursive objects/arrays/strings/numbers/booleans/null with randomized depth
- **SQL**: `SELECT cols FROM table WHERE col OP value LIMIT n;`
- **HTTP**: `{method, path, body}` with GET/POST/PUT/DELETE/PATCH

### Differential Runner (`differential/differential-runner.ts`)
- `runDifferential()` — runs one input through two target functions, deep-diffs the output (recursive JSON diff: objects/arrays/primitives)
- `runBatch()` — processes a batch of inputs
- `summarizeDiffs()` — computes mismatch count, match rate, by-severity breakdown
- Severity: none → low (1-2 diffs) → medium (3-5) → high (6-10) → critical (>10)

### Metamorphic Checker (`metamorphic/metamorphic-checker.ts`)
4 built-in metamorphic relations:
| Relation | Transform | Oracle |
|----------|-----------|--------|
| Sort-shuffle | shuffle array | sort(x) == sort(shuffle(x)) |
| Sum-reverse | reverse array | sum(x) == sum(reverse(x)) |
| Dup-idempotent | duplicate array | set(x ∪ x) == set(x) |
| WHERE-reorder | swap WHERE clauses | syntactic equivalence |

`checkRelation()` runs one relation on one input. `runAllRelations()` runs all relations on a batch.

### Minimizer (`minimize/minimizer.ts`)
Implements **delta-debugging (ddmin)**: binary-search-like reduction of a failing input to the smallest subset that still triggers the bug. Reports `reductionPct` (how much was stripped) + `iterations`.

### Bug Reporter (`report/bug-reporter.ts`)
Generates `BugReport` objects with: title, severity, target, minimized input, output A/B, reproduction steps, `cveWorthy` flag (true for critical/high severity).

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness + version |
| `GET` | `/api/status` | Summary: cases, mismatches, violations, CVEs, relations |
| `POST` | `/api/fuzz` | Generate fuzz inputs (grammar: json/sql/http, count) |
| `POST` | `/api/differential` | Run differential test on provided inputs |
| `POST` | `/api/metamorphic` | Run metamorphic checks on provided inputs |
| `POST` | `/api/minimize` | Delta-debug minimize a failing input |

## Tests

```bash
npm test    # 33 unit tests
```

- `tests/fuzzer.test.ts` — 12 tests: JSON (4), SQL (3), HTTP (2), fuzzAll (1)
- `tests/differential.test.ts` — 9 tests: identical/no-diff, primitive/key/nested/array mismatches, batch, summary, severity
- `tests/metamorphic.test.ts` — 8 tests: 4 relation oracles + checkRelation pass/fail + runAll + summarize
- `tests/minimizer.test.ts` — 4 tests: reduces to single element, handles single/empty/large, formatMinimized

## Docker

```bash
docker compose -f docker/docker-compose.yml up -d   # Postgres 16 (target A) + Postgres 17 (target B) + jq
```

## Run

```bash
npm install
npm test          # 33 tests
npm run dev       # → http://localhost:4305
```

## Stack
Hypothesis · jqwik · AFL++ · RESTler · Schemathesis · custom oracles · TypeScript · Express

## License
MIT
