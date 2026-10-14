// src/fuzzer/grammar-fuzzer.ts — generate structured inputs from grammars
// Produces valid JSON, SQL, and HTTP request inputs for fuzzing.

import type { FuzzInput } from "../types.js";

type GrammarRule = { name: string; expand: () => unknown };

// --- JSON grammar ---
const JSON_TYPES = ["object", "array", "string", "number", "boolean", "null"];
const JSON_KEYS = ["id", "name", "value", "data", "items", "config", "meta", "user", "ts"];

function genJsonValue(depth: number): unknown {
  if (depth <= 0) return pick(["str", 42, true, null]);
  const type = pick(JSON_TYPES);
  switch (type) {
    case "object": {
      const n = 1 + Math.floor(Math.random() * 4);
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < n; i++) obj[pick(JSON_KEYS)] = genJsonValue(depth - 1);
      return obj;
    }
    case "array": {
      const n = Math.floor(Math.random() * 5);
      return Array.from({ length: n }, () => genJsonValue(depth - 1));
    }
    case "string": return `str${Math.floor(Math.random() * 1000)}`;
    case "number": return Math.floor(Math.random() * 10000);
    case "boolean": return Math.random() > 0.5;
    case "null": return null;
    default: return null;
  }
}

// --- SQL grammar ---
const SQL_TABLES = ["users", "orders", "products", "payments", "sessions"];
const SQL_COLS = ["id", "name", "email", "amount", "status", "created_at"];
const SQL_OPS = ["=", "!=", ">", "<", ">=", "<=", "LIKE", "IS NULL", "IS NOT NULL"];

function genSQLQuery(): string {
  const t = pick(SQL_TABLES);
  const cols = SQL_COLS.slice(0, 1 + Math.floor(Math.random() * 3)).join(", ");
  const where = Math.random() > 0.3 ? ` WHERE ${pick(SQL_COLS)} ${pick(SQL_OPS)} ${genSQLValue()}` : "";
  const limit = Math.random() > 0.5 ? ` LIMIT ${1 + Math.floor(Math.random() * 100)}` : "";
  return `SELECT ${cols} FROM ${t}${where}${limit};`;
}

function genSQLValue(): string {
  const t = pick(["int", "str", "null"]);
  if (t === "int") return String(Math.floor(Math.random() * 1000));
  if (t === "str") return `'val${Math.floor(Math.random() * 100)}'`;
  return "NULL";
}

// --- HTTP grammar ---
const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const HTTP_PATHS = ["/api/users", "/api/orders", "/api/products", "/api/search", "/api/payments"];

function genHTTPRequest(): { method: string; path: string; body?: unknown } {
  const method = pick(HTTP_METHODS);
  const path = pick(HTTP_PATHS) + (Math.random() > 0.5 ? `/${Math.floor(Math.random() * 100)}` : "");
  return { method, path, body: method !== "GET" ? genJsonValue(3) : undefined };
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

let counter = 0;
function nextId(prefix: string): string { return `${prefix}-${++counter}-${Date.now().toString(36)}`; }

/** Generate a batch of JSON fuzz inputs. */
export function fuzzJSON(count: number, maxDepth = 4): FuzzInput[] {
  return Array.from({ length: count }, () => ({
    id: nextId("json"), value: genJsonValue(maxDepth), grammar: "grammar-json", generatedAt: Date.now(),
  }));
}

/** Generate a batch of SQL fuzz queries. */
export function fuzzSQL(count: number): FuzzInput[] {
  return Array.from({ length: count }, () => ({
    id: nextId("sql"), value: genSQLQuery(), grammar: "grammar-sql", generatedAt: Date.now(),
  }));
}

/** Generate a batch of HTTP request fuzz inputs. */
export function fuzzHTTP(count: number): FuzzInput[] {
  return Array.from({ length: count }, () => ({
    id: nextId("http"), value: genHTTPRequest(), grammar: "grammar-http", generatedAt: Date.now(),
  }));
}

/** Generate a mixed batch from all grammars. */
export function fuzzAll(count: number): FuzzInput[] {
  const third = Math.floor(count / 3);
  return [...fuzzJSON(third), ...fuzzSQL(third), ...fuzzHTTP(count - third * 2)];
}
