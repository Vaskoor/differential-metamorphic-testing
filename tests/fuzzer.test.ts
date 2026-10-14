// tests/fuzzer.test.ts — tests for the grammar fuzzer
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { fuzzJSON, fuzzSQL, fuzzHTTP, fuzzAll } from "../src/fuzzer/grammar-fuzzer.ts";

describe("grammar-fuzzer — JSON", () => {
  test("generates the requested count", () => {
    const inputs = fuzzJSON(10);
    assert.equal(inputs.length, 10);
  });
  test("each input has a valid grammar tag", () => {
    const inputs = fuzzJSON(5);
    for (const inp of inputs) assert.equal(inp.grammar, "grammar-json");
  });
  test("generates valid JSON types", () => {
    const inputs = fuzzJSON(20, 3);
    for (const inp of inputs) {
      const v = inp.value;
      assert.ok(v === null || typeof v === "object" || typeof v === "string" || typeof v === "number" || typeof v === "boolean");
    }
  });
  test("generates objects with keys", () => {
    const inputs = fuzzJSON(50, 3);
    const objs = inputs.filter(i => typeof i.value === "object" && i.value !== null && !Array.isArray(i.value));
    assert.ok(objs.length > 0);
    const first = objs[0].value as Record<string, unknown>;
    assert.ok(Object.keys(first).length > 0);
  });
});

describe("grammar-fuzzer — SQL", () => {
  test("generates SELECT statements", () => {
    const inputs = fuzzSQL(10);
    assert.equal(inputs.length, 10);
    for (const inp of inputs) {
      assert.ok(typeof inp.value === "string");
      assert.match(inp.value as string, /SELECT/i);
    }
  });
  test("includes FROM clause", () => {
    const inputs = fuzzSQL(20);
    for (const inp of inputs) assert.match(inp.value as string, /FROM/i);
  });
  test("may include WHERE clause", () => {
    const inputs = fuzzSQL(50);
    const withWhere = inputs.filter(i => (i.value as string).includes("WHERE"));
    assert.ok(withWhere.length > 0);
  });
});

describe("grammar-fuzzer — HTTP", () => {
  test("generates HTTP requests with method + path", () => {
    const inputs = fuzzHTTP(10);
    assert.equal(inputs.length, 10);
    for (const inp of inputs) {
      const v = inp.value as { method: string; path: string };
      assert.ok(v.method);
      assert.ok(v.path.startsWith("/"));
    }
  });
  test("POST/PUT/PATCH have a body", () => {
    const inputs = fuzzHTTP(50);
    const withBody = inputs.filter(i => {
      const v = i.value as { method: string; body?: unknown };
      return ["POST", "PUT", "PATCH"].includes(v.method) && v.body !== undefined;
    });
    assert.ok(withBody.length > 0);
  });
});

describe("grammar-fuzzer — fuzzAll", () => {
  test("generates a mix of grammars", () => {
    const inputs = fuzzAll(12);
    assert.equal(inputs.length, 12);
    const grammars = new Set(inputs.map(i => i.grammar));
    assert.ok(grammars.size >= 2);
  });
});
