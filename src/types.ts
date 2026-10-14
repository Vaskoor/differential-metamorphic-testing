// src/types.ts — shared types for the Differential & Metamorphic Testing Platform

export type TargetKind = "database" | "compiler" | "api" | "ml-model" | "json-parser";

export interface FuzzInput {
  id: string;
  value: unknown;
  grammar: string;
  generatedAt: number;
}

export interface DiffResult {
  inputId: string;
  targetA: string;
  targetB: string;
  outputA: unknown;
  outputB: unknown;
  match: boolean;
  diffs: DiffPath[];
  severity: "none" | "low" | "medium" | "high" | "critical";
}

export interface DiffPath {
  path: string;
  a: unknown;
  b: unknown;
  kind: "added" | "removed" | "changed";
}

export interface MetamorphicRelation {
  id: string;
  name: string;
  description: string;
  transform: (input: unknown) => unknown;
  oracle: (original: unknown, transformed: unknown) => boolean;
}

export interface MetamorphicResult {
  relationId: string;
  input: unknown;
  transformed: unknown;
  originalOutput: unknown;
  transformedOutput: unknown;
  passed: boolean;
  detail: string;
}

export interface MinimizedCase {
  original: unknown[];
  minimized: unknown[];
  reductionPct: number;
  iterations: number;
}

export interface BugReport {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  target: string;
  kind: "differential" | "metamorphic";
  minimizedInput: string;
  outputA: string;
  outputB: string;
  reproduction: string;
  cveWorthy: boolean;
}
