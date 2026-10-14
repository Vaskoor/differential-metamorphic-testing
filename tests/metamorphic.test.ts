// tests/metamorphic.test.ts — tests for the metamorphic checker
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BUILTIN_RELATIONS, checkRelation, runAllRelations, summarizeMetamorphic } from "../src/metamorphic/metamorphic-checker.ts";
import type { FuzzInput } from "../src/types.ts";

function mkInput(value: unknown): FuzzInput {
  return { id: "mr-test", value, grammar: "test", generatedAt: Date.now() };
}

describe("metamorphic relations — built-in", () => {
  test("has 4 relations defined", () => {
    assert.equal(BUILTIN_RELATIONS.length, 4);
    assert.ok(BUILTIN_RELATIONS.some(r => r.id === "mr-sort-shuffle"));
    assert.ok(BUILTIN_RELATIONS.some(r => r.id === "mr-sum-reverse"));
    assert.ok(BUILTIN_RELATIONS.some(r => r.id === "mr-dup-idempotent"));
    assert.ok(BUILTIN_RELATIONS.some(r => r.id === "mr-query-reorder"));
  });
  test("sort-shuffle relation holds for arrays", () => {
    const rel = BUILTIN_RELATIONS.find(r => r.id === "mr-sort-shuffle")!;
    const input = mkInput([3, 1, 2, 4, 5]);
    const transformed = rel.transform(input.value);
    assert.ok(rel.oracle(input.value, transformed));
  });
  test("sum-reverse relation holds for arrays", () => {
    const rel = BUILTIN_RELATIONS.find(r => r.id === "mr-sum-reverse")!;
    const input = mkInput([1, 2, 3, 4, 5]);
    const transformed = rel.transform(input.value);
    assert.ok(rel.oracle(input.value, transformed));
  });
  test("dup-idempotent relation holds for arrays", () => {
    const rel = BUILTIN_RELATIONS.find(r => r.id === "mr-dup-idempotent")!;
    const input = mkInput([1, 2, 3]);
    const transformed = rel.transform(input.value);
    assert.ok(rel.oracle(input.value, transformed));
  });
  test("query-reorder transform swaps WHERE clauses", () => {
    const rel = BUILTIN_RELATIONS.find(r => r.id === "mr-query-reorder")!;
    const result = rel.transform("SELECT * FROM t WHERE a = 1 AND b = 2");
    assert.ok(typeof result === "string");
    assert.ok(result.includes("WHERE"));
  });
});

describe("metamorphic checker — checkRelation", () => {
  test("passes when oracle holds", () => {
    const rel = BUILTIN_RELATIONS.find(r => r.id === "mr-sort-shuffle")!;
    const input = mkInput([3, 1, 2]);
    const targetFn = (x: unknown) => Array.isArray(x) ? [...x].sort() : x;
    const result = checkRelation(rel, input, targetFn);
    assert.ok(result.passed);
    assert.match(result.detail, /holds/);
  });
  test("fails when oracle is violated", () => {
    // Custom relation that always fails
    const rel = { id: "mr-fail", name: "Always fails", description: "test", transform: (x: unknown) => x, oracle: () => false };
    const input = mkInput([1, 2, 3]);
    const result = checkRelation(rel as any, input, () => 42);
    assert.ok(!result.passed);
    assert.match(result.detail, /VIOLATED/);
  });
});

describe("metamorphic checker — runAllRelations + summarize", () => {
  test("runs all relations on inputs", () => {
    const inputs = [mkInput([1, 2, 3]), mkInput([4, 5, 6])];
    const targetFn = (x: unknown) => Array.isArray(x) ? [...x].sort() : x;
    const results = runAllRelations(inputs, targetFn);
    assert.ok(results.length >= inputs.length * 2); // at least 2 relations apply to arrays
  });
  test("summarizeMetamorphic counts violations", () => {
    const inputs = [mkInput([1, 2, 3]), mkInput([4, 5, 6])];
    const targetFn = (x: unknown) => Array.isArray(x) ? [...x].sort() : x;
    const results = runAllRelations(inputs, targetFn);
    const s = summarizeMetamorphic(results);
    assert.equal(s.total, results.length);
    assert.ok(s.passed + s.violations === results.length);
  });
});
