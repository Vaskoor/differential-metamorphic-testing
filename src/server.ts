import express from "express";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
const startedAt = Date.now();
let tick = 0;
const targets = [
  { name: "Postgres 16 vs 17", type: "differential", cases: 482000, bugs: 3, minimized: "SELECT ... GROUP BY ... edge" },
  { name: "SQLite vs DuckDB", type: "differential", cases: 318000, bugs: 1, minimized: "FLOAT cast precision" },
  { name: "LLM gpt-4o vs claude", type: "differential", cases: 92000, bugs: 0, minimized: "—" },
  { name: "JSON parser (jq vs python)", type: "differential", cases: 204000, bugs: 2, minimized: "deeply nested key" },
];
const metamorphic = [
  { relation: "sort(x) == sort(x.reverse())", holds: 0.998, broken: 12 },
  { relation: "sum(x) == sum(x.shuffle())", holds: 1.0, broken: 0 },
  { relation: "hash(x) == hash(x + '') ", holds: 0.999, broken: 3 },
  { relation: "query(x) == query(x.reordered)", holds: 0.971, broken: 48 },
];
function sim() {
  tick++;
  return {
    totalCases: targets.reduce((s, t) => s + t.cases, 0) + tick * 1000,
    totalBugs: targets.reduce((s, t) => s + t.bugs, 0),
    cves: 1, upstreamPRs: 3,
    targets, metamorphic,
    fuzzers: ["AFL++", "RESTler", "Schemathesis", "Hypothesis", "jqwik"],
    execPerSec: 12400 + tick,
  };
}
app.get("/api/status", (_q, r) => r.json({ ok: true, uptime: Math.round((Date.now() - startedAt) / 1000), ...sim() }));
app.get("/health", (_q, r) => r.json({ ok: true }));
app.use(express.static(path.join(__dirname, "../public")));
app.get("/", (_q, r) => r.sendFile(path.join(__dirname, "../public/index.html")));
app.listen(Number(process.env.PORT ?? 4305), () => console.log("differential-metamorphic → http://localhost:4305"));
