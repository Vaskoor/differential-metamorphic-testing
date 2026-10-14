// tests/differential.test.ts — tests for the differential runner
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { runDifferential, runBatch, summarizeDiffs } from "../src/differential/differential-runner.ts";
import type { FuzzInput } from "../src/types.ts";

function mkInput(value: unknown): FuzzInput {
  return { id: "test-1", value, grammar: "test", generatedAt: Date.now() };
}

describe("differential-runner", () => {
  test("no diff when targets return same output", () => {
    const r = runDifferential(mkInput({ a: 1 }), () => ({ a: 1 }), () => ({ a: 1 }), "A", "B");
    assert.equal(r.match, true);
    assert.equal(r.diffs.length, 0);
    assert.equal(r.severity, "none");
  });
  test("detects primitive mismatch", () => {
    const r = runDifferential(mkInput("x"), () => 42, () => 43, "A", "B");
    assert.equal(r.match, false);
    assert.equal(r.diffs.length, 1);
    assert.equal(r.diffs[0].kind, "changed");
  });
  test("detects missing key", () => {
    const r = runDifferential(mkInput({ a: 1 }), () => ({ a: 1, b: 2 }), () => ({ a: 1 }), "A", "B");
    assert.equal(r.match, false);
    assert.ok(r.diffs.some(d => d.kind === "removed" && d.path === "b"));
  });
  test("detects added key", () => {
    const r = runDifferential(mkInput({ a: 1 }), () => ({ a: 1 }), () => ({ a: 1, c: 3 }), "A", "B");
    assert.equal(r.match, false);
    assert.ok(r.diffs.some(d => d.kind === "added" && d.path === "c"));
  });
  test("detects nested diff", () => {
    const r = runDifferential(mkInput({ user: { name: "x" } }), () => ({ user: { name: "x" } }), () => ({ user: { name: "y" } }), "A", "B");
    assert.equal(r.match, false);
    assert.equal(r.diffs[0].path, "user.name");
  });
  test("detects array diff", () => {
    const r = runDifferential(mkInput([1, 2, 3]), () => [1, 2, 3], () => [1, 2, 4], "A", "B");
    assert.equal(r.match, false);
    assert.equal(r.diffs[0].path, "[2]");
  });
  test("runBatch processes multiple inputs", () => {
    const inputs = [mkInput(1), mkInput(2), mkInput(3)];
    const results = runBatch(inputs, () => "same", () => "same", "A", "B");
    assert.equal(results.length, 3);
    assert.ok(results.every(r => r.match));
  });
  test("summarizeDiffs computes stats", () => {
    const inputs = [mkInput(1), mkInput(2), mkInput(3)];
    const results = runBatch(inputs, () => "ok", () => "fail", "A", "B");
    const s = summarizeDiffs(results);
    assert.equal(s.total, 3);
    assert.equal(s.mismatches, 3);
    assert.equal(s.matchRate, 0);
  });
  test("severity scales with diff count", () => {
    const bigObj: Record<string, number> = {};
    for (let i = 0; i < 20; i++) bigObj[`k${i}`] = i;
    const r = runDifferential(mkInput(bigObj), () => bigObj, () => ({ ...bigObj, k0: 999, k1: 999, k2: 999, k3: 999, k4: 999, k5: 999, k6: 999, k7: 999, k8: 999, k9: 999, k10: 999, k11: 999 }), "A", "B");
    assert.ok(r.severity === "critical" || r.severity === "high");
  });
});
