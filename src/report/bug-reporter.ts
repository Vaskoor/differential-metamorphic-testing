// src/report/bug-reporter.ts — generate bug reports from differential + metamorphic findings
import type { DiffResult, MetamorphicResult, BugReport } from "../types.js";
import { formatMinimized } from "../minimize/minimizer.js";

/** Generate a bug report from a differential mismatch. */
export function reportDifferentialBug(diff: DiffResult, minimizedInput?: string): BugReport {
  const cve = diff.severity === "critical" || diff.severity === "high";
  return {
    id: `bug-${diff.inputId}`,
    title: `Differential mismatch: ${diff.targetA} vs ${diff.targetB} on ${diff.inputId}`,
    severity: diff.severity,
    target: `${diff.targetA} / ${diff.targetB}`,
    kind: "differential",
    minimizedInput: minimizedInput || JSON.stringify(diff.diffs.slice(0, 3)),
    outputA: JSON.stringify(diff.outputA, null, 2).slice(0, 500),
    outputB: JSON.stringify(diff.outputB, null, 2).slice(0, 500),
    reproduction: `1. Run input ${diff.inputId} against ${diff.targetA} and ${diff.targetB}\n2. ${diff.targetA} produced: ${JSON.stringify(diff.outputA).slice(0, 100)}\n3. ${diff.targetB} produced: ${JSON.stringify(diff.outputB).slice(0, 100)}\n4. ${diff.diffs.length} diff(s) found\n5. Severity: ${diff.severity}${cve ? "\n6. CVE-worthy: potential security impact" : ""}`,
    cveWorthy: cve,
  };
}

/** Generate a bug report from a metamorphic relation violation. */
export function reportMetamorphicBug(result: MetamorphicResult): BugReport {
  return {
    id: `bug-mr-${result.relationId}`,
    title: `Metamorphic relation violated: ${result.relationId}`,
    severity: "high",
    target: result.relationId,
    kind: "metamorphic",
    minimizedInput: formatMinimized([result.input, result.transformed]),
    outputA: JSON.stringify(result.originalOutput, null, 2).slice(0, 500),
    outputB: JSON.stringify(result.transformedOutput, null, 2).slice(0, 500),
    reproduction: `1. Original input: ${JSON.stringify(result.input).slice(0, 100)}\n2. Transformed input: ${JSON.stringify(result.transformed).slice(0, 100)}\n3. Original output: ${JSON.stringify(result.originalOutput).slice(0, 100)}\n4. Transformed output: ${JSON.stringify(result.transformedOutput).slice(0, 100)}\n5. ${result.detail}`,
    cveWorthy: false,
  };
}

/** Generate reports from all mismatches + violations. */
export function generateAllReports(diffs: DiffResult[], metamorphic: MetamorphicResult[]): BugReport[] {
  const reports: BugReport[] = [];
  for (const d of diffs.filter(d => !d.match)) reports.push(reportDifferentialBug(d));
  for (const m of metamorphic.filter(m => !m.passed)) reports.push(reportMetamorphicBug(m));
  return reports;
}
