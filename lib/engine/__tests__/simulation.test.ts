import { describe, expect, it } from "vitest";
import { runSimulation } from "../simulation";
import { DEFAULT_SCENARIO } from "../../defaults";

describe("runSimulation", () => {
  it("produces a row for each year", () => {
    const result = runSimulation({
      ...DEFAULT_SCENARIO,
      startAge: 62,
      endAge: 65,
    });
    expect(result.yearRows).toHaveLength(4);
    expect(result.summary.finalTotal).toBeGreaterThan(0);
  });
});
