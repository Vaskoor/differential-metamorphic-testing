// src/differential/differential-runner.ts — run same input across two targets, deep-diff the output
import type { FuzzInput, DiffResult, DiffPath } from "../types.js";

/** Deep-diff two JSON values (same algorithm as the digital-twin diff engine). */
function deepDiff(a: unknown, b: unknown, basePath = ""): DiffPath[] {
  const diffs: DiffPath[] = [];
  if (a === b) return diffs;
  if (a === null || b === null) { diffs.push({ path: basePath || "$", a, b, kind: "changed" }); return diffs; }
  if (typeof a !== typeof b) { diffs.push({ path: basePath || "$", a, b, kind: "changed" }); return diffs; }
  if (typeof a === "object" && typeof b === "object") {
    if (Array.isArray(a) !== Array.isArray(b)) { diffs.push({ path: basePath || "$", a, b, kind: "changed" }); return diffs; }
    if (Array.isArray(a) && Array.isArray(b)) {
      const max = Math.max(a.length, b.length);
      for (let i = 0; i < max; i++) {
        const p = `${basePath}[${i}]`;
        if (i >= a.length) diffs.push({ path: p, a: undefined, b: b[i], kind: "added" });
        else if (i >= b.length) diffs.push({ path: p, a: a[i], b: undefined, kind: "removed" });
        else diffs.push(...deepDiff(a[i], b[i], p));
      }
      return diffs;
    }
    const ao = a as Record<string, unknown>, bo = b as Record<string, unknown>;
    for (const k of new Set([...Object.keys(ao), ...Object.keys(bo)])) {
      const p = basePath ? `${basePath}.${k}` : k;
      if (!(k in ao)) diffs.push({ path: p, a: undefined, b: bo[k], kind: "added" });
      else if (!(k in bo)) diffs.push({ path: p, a: ao[k], b: undefined, kind: "removed" });
      else diffs.push(...deepDiff(ao[k], bo[k], p));
    }
    return diffs;
  }
  diffs.push({ path: basePath || "$", a, b, kind: "changed" });
  return diffs;
}

/** Run a single input through two target functions + diff the outputs. */
export function runDifferential(
  input: FuzzInput,
  targetA: (input: unknown) => unknown,
  targetB: (input: unknown) => unknown,
  nameA: string,
  nameB: string,
): DiffResult {
  const outA = targetA(input.value);
  const outB = targetB(input.value);
  const diffs = deepDiff(outA, outB);
  const match = diffs.length === 0;
  const severity = match ? "none" : diffs.length > 10 ? "critical" : diffs.length > 5 ? "high" : diffs.length > 2 ? "medium" : "low";
  return { inputId: input.id, targetA: nameA, targetB: nameB, outputA: outA, outputB: outB, match, diffs, severity };
}

/** Run a batch of inputs through the differential runner. */
export function runBatch(
  inputs: FuzzInput[],
  targetA: (input: unknown) => unknown,
  targetB: (input: unknown) => unknown,
  nameA: string,
  nameB: string,
): DiffResult[] {
  return inputs.map(inp => runDifferential(inp, targetA, targetB, nameA, nameB));
}

/** Summarize differential results. */
export function summarizeDiffs(results: DiffResult[]): {
  total: number; mismatches: number; matchRate: number; bySeverity: Record<string, number>;
} {
  const mismatches = results.filter(r => !r.match);
  const bySeverity: Record<string, number> = {};
  for (const r of results) bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
  return {
    total: results.length,
    mismatches: mismatches.length,
    matchRate: results.length > 0 ? (results.length - mismatches.length) / results.length : 0,
    bySeverity,
  };
}
