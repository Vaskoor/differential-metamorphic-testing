// tests/minimizer.test.ts — tests for the delta-debug minimizer
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { minimize, formatMinimized } from "../src/minimize/minimizer.ts";

describe("minimizer (delta-debugging)", () => {
  test("reduces to the single failing element", () => {
    // Oracle: subset fails if it contains "bug"
    const input = ["ok", "ok", "bug", "ok", "ok", "ok", "ok", "ok", "ok", "ok"];
    const oracle = (s: unknown[]) => s.some(e => e === "bug");
    const result = minimize(input, oracle);
    assert.ok(result.minimized.includes("bug"));
    assert.ok(result.minimized.length < input.length);
    assert.ok(result.reductionPct > 0);
    assert.ok(result.iterations > 0);
  });
  test("handles single-element input", () => {
    const input = ["bug"];
    const oracle = (s: unknown[]) => s.some(e => e === "bug");
    const result = minimize(input, oracle);
    assert.equal(result.minimized.length, 1);
  });
  test("handles input where nothing fails", () => {
    const input = ["ok", "ok", "ok"];
    const oracle = () => false;  // nothing fails
    const result = minimize(input, oracle);
    // can't reduce since no subset fails
    assert.ok(result.minimized.length >= 1);
  });
  test("reductionPct is 0-100", () => {
    const input = Array.from({ length: 100 }, (_, i) => i === 50 ? "bug" : "ok");
    const oracle = (s: unknown[]) => s.some(e => e === "bug");
    const result = minimize(input, oracle);
    assert.ok(result.reductionPct >= 0 && result.reductionPct <= 100);
    assert.ok(result.reductionPct >= 50); // should reduce significantly
  });
});

describe("formatMinimized", () => {
  test("formats empty array", () => {
    assert.equal(formatMinimized([]), "(empty)");
  });
  test("formats single element", () => {
    const out = formatMinimized([42]);
    assert.ok(out.includes("42"));
  });
  test("formats multiple elements", () => {
    const out = formatMinimized([1, 2, 3]);
    assert.ok(out.includes("3 elements"));
  });
});
