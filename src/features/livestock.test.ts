import { describe, expect, it } from "vitest";
import { validateLivestockRecord, type LivestockRecordInput } from "./livestock";

const TODAY = "2026-06-15";

const base: LivestockRecordInput = {
  farmer_id: 1,
  species_id: 1,
  barangay: "Bolisong",
  record_date: "2026-06-01",
  inventory_count: 10,
  births: 2,
  deaths: 1,
  disposed: 1,
  production_type: null,
  production_qty: null,
  production_unit: "",
  notes: "",
};

describe("validateLivestockRecord", () => {
  it("accepts a consistent record", () => {
    expect(validateLivestockRecord(base, TODAY)).toBeNull();
  });

  it("rejects a missing record date", () => {
    expect(validateLivestockRecord({ ...base, record_date: "" }, TODAY)).toMatch(/date is required/i);
  });

  it("rejects a future record date", () => {
    expect(validateLivestockRecord({ ...base, record_date: "2026-06-16" }, TODAY)).toMatch(
      /future/i
    );
  });

  it("rejects losses greater than inventory plus births", () => {
    expect(
      validateLivestockRecord(
        { ...base, inventory_count: 5, births: 0, deaths: 4, disposed: 3 },
        TODAY
      )
    ).toMatch(/exceed/i);
  });

  it("allows losses equal to inventory plus births", () => {
    expect(
      validateLivestockRecord(
        { ...base, inventory_count: 5, births: 1, deaths: 4, disposed: 2 },
        TODAY
      )
    ).toBeNull();
  });

  it("requires a production type and unit when a production quantity is given", () => {
    expect(
      validateLivestockRecord({ ...base, production_qty: 40, production_unit: "" }, TODAY)
    ).toMatch(/production type/i);
    expect(
      validateLivestockRecord(
        { ...base, production_qty: 40, production_type: "EGGS", production_unit: "" },
        TODAY
      )
    ).toMatch(/unit/i);
  });

  it("requires a quantity when a production type is selected", () => {
    expect(
      validateLivestockRecord({ ...base, production_type: "MILK", production_qty: null }, TODAY)
    ).toMatch(/quantity/i);
  });

  it("accepts a complete production triple", () => {
    expect(
      validateLivestockRecord(
        { ...base, production_type: "EGGS", production_qty: 40, production_unit: "trays" },
        TODAY
      )
    ).toBeNull();
  });
});
