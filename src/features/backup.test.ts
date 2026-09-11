import { describe, expect, it } from "vitest";
import { BACKUP_VERSION, PK, TABLES } from "./backup";

/**
 * Backup coverage is easy to break silently: adding a table to the schema
 * without adding it here means a backup quietly omits it and a restore loses
 * the data. These tests pin the invariants.
 */
describe("backup table coverage", () => {
  it("declares a primary key for every backed-up table", () => {
    for (const table of TABLES) {
      expect(PK[table], `missing primary key for "${table}"`).toBeTruthy();
    }
  });

  it("declares no primary keys for tables that are not backed up", () => {
    expect(Object.keys(PK).sort()).toEqual([...TABLES].sort());
  });

  it("contains no duplicate table entries", () => {
    expect(new Set(TABLES).size).toBe(TABLES.length);
  });

  it("covers every sector table added by migrations 0006, 0007, and 0012", () => {
    const required = [
      "livestock_species",
      "livestock_records",
      "fisherfolk",
      "fish_catch",
      "aquaculture_sites",
      "aquaculture_cycles",
      "livestock_statistics",
      "fisheries_statistics",
      "aquaculture_statistics",
    ];
    for (const table of required) {
      expect(TABLES, `sector table "${table}" is not backed up`).toContain(table);
    }
  });

  it("covers the reference catalogs added by migration 0014", () => {
    for (const table of ["measurement_units", "aquatic_species"]) {
      expect(TABLES, `reference catalog "${table}" is not backed up`).toContain(table);
    }
  });

  it("orders parents before their children so a restore satisfies foreign keys", () => {
    const order = (t: string) => TABLES.indexOf(t as (typeof TABLES)[number]);
    const parentChildPairs: [string, string][] = [
      ["user_roles", "users"],
      ["farmers", "farms"],
      ["farms", "farm_plots"],
      ["farm_plots", "planting_records"],
      ["planting_records", "harvest_inventory"],
      ["crops", "planting_records"],
      ["farmers", "livestock_records"],
      ["livestock_species", "livestock_records"],
      ["farmers", "fisherfolk"],
      ["fisherfolk", "fish_catch"],
      ["farmers", "aquaculture_sites"],
      ["aquaculture_sites", "aquaculture_cycles"],
      ["livestock_species", "livestock_statistics"],
    ];

    for (const [parent, child] of parentChildPairs) {
      expect(order(parent), `"${parent}" must be restored before "${child}"`).toBeLessThan(
        order(child)
      );
    }
  });

  it("uses a backup version that reflects sector coverage", () => {
    expect(BACKUP_VERSION).toBeGreaterThanOrEqual(2);
  });
});
