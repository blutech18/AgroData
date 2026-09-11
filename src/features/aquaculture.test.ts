import { describe, expect, it } from "vitest";
import { validateAquacultureCycle, type AquacultureCycleInput } from "./aquaculture";

const TODAY = "2026-06-15";

const stocked: AquacultureCycleInput = {
  site_id: 1,
  species_name: "Bangus",
  stocking_date: "2026-05-01",
  stocking_qty: 5000,
  harvest_date: null,
  harvest_qty: null,
  unit: "kg",
  status: "STOCKED",
};

const harvested: AquacultureCycleInput = {
  ...stocked,
  harvest_date: "2026-06-01",
  harvest_qty: 4200,
  status: "HARVESTED",
};

describe("validateAquacultureCycle", () => {
  it("accepts a stocked cycle with no harvest details", () => {
    expect(validateAquacultureCycle(stocked, TODAY)).toBeNull();
  });

  it("accepts a harvested cycle with harvest date and quantity", () => {
    expect(validateAquacultureCycle(harvested, TODAY)).toBeNull();
  });

  it("requires species, stocking date, and unit", () => {
    expect(validateAquacultureCycle({ ...stocked, species_name: " " }, TODAY)).toMatch(/species/i);
    expect(validateAquacultureCycle({ ...stocked, stocking_date: "" }, TODAY)).toMatch(
      /stocking date/i
    );
    expect(validateAquacultureCycle({ ...stocked, unit: "" }, TODAY)).toMatch(/unit/i);
  });

  it("rejects a future stocking date", () => {
    expect(validateAquacultureCycle({ ...stocked, stocking_date: "2026-06-16" }, TODAY)).toMatch(
      /future/i
    );
  });

  it("rejects a harvest date before the stocking date", () => {
    expect(
      validateAquacultureCycle(
        { ...harvested, stocking_date: "2026-06-01", harvest_date: "2026-05-01" },
        TODAY
      )
    ).toMatch(/earlier than the stocking/i);
  });

  it("requires harvest date and quantity together", () => {
    expect(
      validateAquacultureCycle({ ...harvested, harvest_qty: null }, TODAY)
    ).toMatch(/both a harvest date and a harvest quantity/i);
  });

  it("requires harvest details when status is HARVESTED", () => {
    expect(
      validateAquacultureCycle(
        { ...stocked, status: "HARVESTED", harvest_date: null, harvest_qty: null },
        TODAY
      )
    ).toMatch(/harvested cycle needs/i);
  });

  it("rejects harvest details on a non-harvested cycle", () => {
    expect(validateAquacultureCycle({ ...harvested, status: "LOST" }, TODAY)).toMatch(
      /only a harvested cycle/i
    );
    expect(validateAquacultureCycle({ ...harvested, status: "STOCKED" }, TODAY)).toMatch(
      /only a harvested cycle/i
    );
  });
});
