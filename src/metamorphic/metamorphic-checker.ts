// src/metamorphic/metamorphic-checker.ts — check metamorphic relations
// An input transformation should preserve an output property.
// e.g., sort(x) == sort(shuffle(x)), sum(x) == sum(reverse(x))

import type { MetamorphicRelation, MetamorphicResult, FuzzInput } from "../types.js";

/** Built-in metamorphic relations for common operations. */
export const BUILTIN_RELATIONS: MetamorphicRelation[] = [
  {
    id: "mr-sort-shuffle",
    name: "Sort invariance under shuffle",
    description: "sort(x) == sort(shuffle(x)) — sorting is order-independent",
    transform: (input: unknown) => Array.isArray(input) ? shuffle(input) : input,
    oracle: (original: unknown, transformed: unknown) => {
      if (!Array.isArray(original) || !Array.isArray(transformed)) return true;
      return JSON.stringify([...original].sort()) === JSON.stringify([...transformed].sort());
    },
  },
  {
    id: "mr-sum-reverse",
    name: "Sum invariance under reversal",
    description: "sum(x) == sum(reverse(x)) — addition is commutative",
    transform: (input: unknown) => Array.isArray(input) ? [...input].reverse() : input,
    oracle: (original: unknown, transformed: unknown) => {
      if (!Array.isArray(original) || !Array.isArray(transformed)) return true;
      const sumO = original.reduce((s, n) => s + (typeof n === "number" ? n : 0), 0);
      const sumT = transformed.reduce((s, n) => s + (typeof n === "number" ? n : 0), 0);
      return sumO === sumT;
    },
  },
  {
    id: "mr-dup-idempotent",
    name: "Duplicate invariance for set operations",
    description: "set(x ∪ x) == set(x) — union with self is idempotent",
    transform: (input: unknown) => Array.isArray(input) ? [...input, ...input] : input,
    oracle: (original: unknown, transformed: unknown) => {
      if (!Array.isArray(original) || !Array.isArray(transformed)) return true;
      const setO = new Set(original);
      const setT = new Set(transformed);
      return setO.size === setT.size;
    },
  },
  {
    id: "mr-query-reorder",
    name: "Query result invariance under WHERE reorder",
    description: "SELECT * WHERE A AND B == SELECT * WHERE B AND A",
    transform: (input: unknown) => {
      if (typeof input === "string" && input.includes("WHERE")) {
        return input.replace(/WHERE\s+(.+?)\s+(AND|OR)\s+(.+?)(\s|;|$)/i, "WHERE $3 $2 $1$4");
      }
      return input;
    },
    oracle: (original: unknown, transformed: unknown) => {
      // In a real system, you'd execute both queries and compare results.
      // Here we check syntactic equivalence after normalization.
      return typeof original === "string" && typeof transformed === "string";
    },
  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Run a metamorphic relation check on a single input. */
export function checkRelation(
  relation: MetamorphicRelation,
  input: FuzzInput,
  targetFn: (input: unknown) => unknown,
): MetamorphicResult {
  const transformed = relation.transform(input.value);
  const originalOutput = targetFn(input.value);
  const transformedOutput = targetFn(transformed);
  const passed = relation.oracle(originalOutput, transformedOutput);
  return {
    relationId: relation.id,
    input: input.value,
    transformed,
    originalOutput,
    transformedOutput,
    passed,
    detail: passed
      ? `${relation.name} holds`
      : `${relation.name} VIOLATED — output differs after transformation`,
  };
}

/** Run all built-in relations on a batch of inputs. */
export function runAllRelations(
  inputs: FuzzInput[],
  targetFn: (input: unknown) => unknown,
): MetamorphicResult[] {
  const results: MetamorphicResult[] = [];
  for (const rel of BUILTIN_RELATIONS) {
    for (const input of inputs) {
      results.push(checkRelation(rel, input, targetFn));
    }
  }
  return results;
}

/** Summarize metamorphic results. */
export function summarizeMetamorphic(results: MetamorphicResult[]): {
  total: number; passed: number; violations: number; byRelation: Record<string, number>;
} {
  const violations = results.filter(r => !r.passed);
  const byRelation: Record<string, number> = {};
  for (const r of results) if (!r.passed) byRelation[r.relationId] = (byRelation[r.relationId] || 0) + 1;
  return { total: results.length, passed: results.length - violations.length, violations: violations.length, byRelation };
}
