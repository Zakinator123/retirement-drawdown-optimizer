import { describe, expect, it } from "vitest";
import { DEFAULT_SCENARIO } from "../../defaults";
import { compareSsClaimAges } from "../optimize";

describe("compareSsClaimAges", () => {
  it("returns results for each claim age", () => {
    const result = compareSsClaimAges(DEFAULT_SCENARIO);
    expect(result.variants).toHaveLength(9);
    expect(result.bestScenario.ssClaimAge).toBeGreaterThanOrEqual(62);
  });
});
