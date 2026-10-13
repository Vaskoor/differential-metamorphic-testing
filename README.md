# Differential & Metamorphic Testing Platform

<div align="center">**Find real bugs in compilers, databases, APIs, and ML models by comparing implementations or transformations.**</div>

## What it does
- **Differential testing** — run the same input across versions/vendors (Postgres 16 vs 17, SQLite vs DuckDB, gpt-4o vs claude, jq vs python json), diff the output.
- **Metamorphic relations** — transform the input (sort, shuffle, reorder) and assert the output property is preserved (`sum(x) == sum(x.shuffle())`).
- **Grammar-based fuzzing** — AFL++, RESTler, Schemathesis generate structured inputs.
- **Property-based testing** — Hypothesis (Python), jqwik (JS).
- **Minimize + file** — delta-debug the failing case to the smallest repro, then auto-file a CVE or upstream PR.

## Architecture
| Layer | Tech |
|-------|------|
| Differential | version/vendor A vs B runners |
| Metamorphic | relation definitions + oracles |
| Fuzzers | AFL++, RESTler, Schemathesis |
| Property | Hypothesis, jqwik |
| Minimizer | delta-debugging |
| Reporting | auto-filed CVEs + upstream PRs |

## Run
```bash
npm install && npm run dev   # → http://localhost:4305
```
## Why it's OG
Finding real CVEs or upstream bugs is undeniable proof of skill.
## License
MIT
