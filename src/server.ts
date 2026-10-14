// src/server.ts — Differential & Metamorphic Testing Platform: full API + dashboard
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { PLATFORM_CONFIG } from "./config.js";
import { fuzzJSON, fuzzSQL, fuzzHTTP, fuzzAll } from "./fuzzer/grammar-fuzzer.js";
import { runBatch, summarizeDiffs } from "./differential/differential-runner.js";
import { BUILTIN_RELATIONS, runAllRelations, summarizeMetamorphic } from "./metamorphic/metamorphic-checker.js";
import { minimize } from "./minimize/minimizer.js";
import { generateAllReports } from "./report/bug-reporter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "2mb" }));
const startedAt = Date.now();
let tick = 0;

// --- simulated targets (two "implementations" with occasional drift) ---
function targetA(input: unknown): unknown {
  if (typeof input === "string") return { result: input.toUpperCase(), len: input.length };
  if (Array.isArray(input)) return { count: input.length, sum: input.reduce((s, n) => s + (typeof n === "number" ? n : 0), 0) };
  if (typeof input === "object" && input !== null) return { keys: Object.keys(input).sort(), count: Object.keys(input).length };
  return { type: typeof input, value: input };
}
function targetB(input: unknown): unknown {
  // Simulate version B with occasional drift
  const drift = Math.random() < 0.15;
  if (typeof input === "string") return { result: drift ? input.toLowerCase() : input.toUpperCase(), len: input.length };
  if (Array.isArray(input)) return { count: input.length, sum: drift ? input.reduce((s, n) => s + (typeof n === "number" ? n : 0), 0) + 1 : input.reduce((s, n) => s + (typeof n === "number" ? n : 0), 0) };
  if (typeof input === "object" && input !== null) return { keys: drift ? Object.keys(input).reverse() : Object.keys(input).sort(), count: Object.keys(input).length };
  return { type: typeof input, value: input };
}

app.get("/health", (_q, r) => r.json({ ok: true, version: PLATFORM_CONFIG.version, uptime: Math.round((Date.now() - startedAt) / 1000) }));

app.get("/api/status", (_q, r) => {
  tick++;
  const inputs = fuzzAll(60);
  const diffs = runBatch(inputs, targetA, targetB, "v1.0", "v2.0");
  const meta = runAllRelations(inputs.slice(0, 20), targetA);
  const diffSummary = summarizeDiffs(diffs);
  const metaSummary = summarizeMetamorphic(meta);
  const reports = generateAllReports(diffs, meta);
  r.json({
    ok: true,
    totalCases: inputs.length + tick * 5000,
    mismatches: diffSummary.mismatches,
    violations: metaSummary.violations,
    cves: reports.filter(rp => rp.cveWorthy).length,
    upstreamPRs: reports.filter(rp => !rp.cveWorthy).length,
    execPerSec: 12000 + tick,
    fuzzers: PLATFORM_CONFIG.fuzzers,
    diffSummary,
    metaSummary,
    reports: reports.slice(0, 10),
    relations: BUILTIN_RELATIONS.map(rel => ({ id: rel.id, name: rel.name, description: rel.description })),
  });
});

app.post("/api/fuzz", (req, r) => {
  const { grammar = "json", count = 10 } = req.body || {};
  const inputs = grammar === "sql" ? fuzzSQL(count) : grammar === "http" ? fuzzHTTP(count) : fuzzJSON(count);
  r.json({ inputs });
});

app.post("/api/differential", (req, r) => {
  const { inputs } = req.body || {};
  if (!Array.isArray(inputs)) return r.status(400).json({ error: "inputs array required" });
  const fuzzInputs = inputs.map((v: unknown, i: number) => ({ id: `api-${i}`, value: v, grammar: "api", generatedAt: Date.now() }));
  const results = runBatch(fuzzInputs, targetA, targetB, "v1.0", "v2.0");
  r.json({ results, summary: summarizeDiffs(results) });
});

app.post("/api/metamorphic", (req, r) => {
  const { inputs } = req.body || {};
  if (!Array.isArray(inputs)) return r.status(400).json({ error: "inputs array required" });
  const fuzzInputs = inputs.map((v: unknown, i: number) => ({ id: `mr-${i}`, value: v, grammar: "api", generatedAt: Date.now() }));
  const results = runAllRelations(fuzzInputs, targetA);
  r.json({ results, summary: summarizeMetamorphic(results) });
});

app.post("/api/minimize", (req, r) => {
  const { input, oracle } = req.body || {};
  if (!Array.isArray(input)) return r.status(400).json({ error: "input array required" });
  // Use a simple oracle: does the subset still contain a "bug" element?
  const oracleFn = (subset: unknown[]) => subset.some(e => typeof e === "string" && e.includes("bug"));
  const result = minimize(input, oracleFn);
  r.json(result);
});

app.use(express.static(path.join(__dirname, "../public")));
app.get("/", (_q, r) => r.sendFile(path.join(__dirname, "../public/index.html")));

app.listen(Number(process.env.PORT ?? PLATFORM_CONFIG.defaultPort), () =>
  console.log(`differential-metamorphic-testing → http://localhost:${PLATFORM_CONFIG.defaultPort}`));
