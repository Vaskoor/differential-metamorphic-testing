// src/config.ts — platform configuration
export const PLATFORM_CONFIG = {
  version: "1.0.0",
  defaultPort: 4305,
  maxCases: Number(process.env.MAX_CASES || "100000"),
  diffTimeoutMs: Number(process.env.DIFF_TIMEOUT || "5000"),
  minimizeIterations: Number(process.env.MINIMIZE_ITERS || "50"),
  fuzzers: ["grammar-json", "grammar-sql", "grammar-http", "hypothesis", "jqwik", "AFL++"],
  reporters: ["restler", "schemathesis", "custom-oracle"],
};
