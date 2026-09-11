import { describe, expect, it } from "vitest";
import { validateFishCatch, type FishCatchInput } from "./fisheries";

const TODAY = "2026-06-15";

const base: FishCatchInput = {
  fisherfolk_id: 1,
  catch_date: "2026-06-10",
  subsector: "MARINE_MUNICIPAL",
  species_name: "Tilapia",
  quantity: 12.5,
  unit: "kg",
  notes: "",
};

describe("validateFishCatch", () => {
  it("accepts a valid catch record", () => {
    expect(validateFishCatch(base, TODAY)).toBeNull();
  });

  it("rejects a future catch date", () => {
    expect(validateFishCatch({ ...base, catch_date: "2026-06-16" }, TODAY)).toMatch(/future/i);
  });

  it("requires a species", () => {
    expect(validateFishCatch({ ...base, species_name: "   " }, TODAY)).toMatch(/species/i);
  });

  it("requires a unit", () => {
    expect(validateFishCatch({ ...base, unit: "" }, TODAY)).toMatch(/unit/i);
  });

  it("rejects a zero or negative quantity", () => {
    expect(validateFishCatch({ ...base, quantity: 0 }, TODAY)).toMatch(/greater than zero/i);
    expect(validateFishCatch({ ...base, quantity: -3 }, TODAY)).toMatch(/greater than zero/i);
  });
});
