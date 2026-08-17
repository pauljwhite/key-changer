import { describe, expect, it } from "vitest";
import { glassVariables } from "./glass";

describe("glassVariables", () => {
  it("makes maximum glass more transparent, blurred, saturated and reflective", () => {
    const solid = glassVariables("dark", 0);
    const glass = glassVariables("dark", 100);
    expect(glass.alpha).toBeLessThan(solid.alpha);
    expect(glass.blur).toBeGreaterThan(solid.blur);
    expect(glass.saturation).toBeGreaterThan(solid.saturation);
    expect(glass.shine).toBeGreaterThan(solid.shine);
    expect(glass.alpha).toBeCloseTo(0.16);
    expect(glass.shine).toBeCloseTo(0.175);
    expect(glass).toMatchObject({ blur: 36, saturation: 190 });
  });

  it("clamps saved values before calculating the effect", () => {
    expect(glassVariables("light", -20)).toEqual(glassVariables("light", 0));
    expect(glassVariables("light", 140)).toEqual(glassVariables("light", 100));
  });
});
