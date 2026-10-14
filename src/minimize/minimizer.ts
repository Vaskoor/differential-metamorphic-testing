// src/minimize/minimizer.ts — delta-debugging minimizer
// Reduces a failing input to the smallest subset that still fails.
// Implements the classic delta-debugging algorithm (ddmin).

/** Delta-debug minimization: find the smallest subset of elements that still fails. */
export function minimize<T>(
  input: T[],
  oracle: (subset: T[]) => boolean,  // returns true if the subset still triggers the bug
  maxIterations = 50,
): { minimized: T[]; reductionPct: number; iterations: number } {
  let current = [...input];
  let n = current.length;
  let iterations = 0;

  while (n > 1 && iterations < maxIterations) {
    iterations++;
    const chunkSize = Math.ceil(current.length / Math.min(n, current.length));
    let reduced = false;

    // Try removing each chunk
    for (let i = 0; i < current.length; i += chunkSize) {
      const chunk = current.slice(i, i + chunkSize);
      const remaining = current.filter((_, idx) => idx < i || idx >= i + chunkSize);
      if (remaining.length > 0 && oracle(remaining)) {
        current = remaining;
        reduced = true;
        break;
      }
    }

    if (!reduced) {
      // Granularity: try smaller chunks
      if (n > 2) {
        n = Math.max(2, Math.floor(n / 2));
      } else {
        // Try removing one element at a time
        for (let i = 0; i < current.length; i++) {
          const remaining = current.filter((_, idx) => idx !== i);
          if (remaining.length > 0 && oracle(remaining)) {
            current = remaining;
            reduced = true;
            break;
          }
        }
        if (!reduced) break; // can't reduce further
      }
    }
  }

  return {
    minimized: current,
    reductionPct: input.length > 0 ? Math.round((1 - current.length / input.length) * 100) : 0,
    iterations,
  };
}

/** Minimize a failing test case to the smallest input that still fails. */
export function minimizeTestCase<T>(
  fullInput: T[],
  testFn: (input: T[]) => boolean,  // returns true if the test FAILS
): { minimized: T[]; reductionPct: number; iterations: number } {
  return minimize(fullInput, testFn);
}

/** Pretty-print a minimized case for a bug report. */
export function formatMinimized(minimized: unknown[]): string {
  if (minimized.length === 0) return "(empty)";
  if (minimized.length === 1) return JSON.stringify(minimized[0], null, 2);
  return `[${minimized.length} elements]:\n${minimized.map((e, i) => `  [${i}] ${JSON.stringify(e).slice(0, 80)}`).join("\n")}`;
}
