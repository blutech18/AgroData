import { describe, expect, it } from "vitest";
import { latestInventoryByHolding } from "./analytics";

interface Row {
  farmer_id: number;
  species_id: number;
  barangay: string | null;
  record_date: string;
  inventory_count: number;
}

describe("latestInventoryByHolding", () => {
  it("keeps only the latest snapshot per producer + species + barangay", () => {
    const rows: Row[] = [
      { farmer_id: 1, species_id: 1, barangay: "A", record_date: "2026-01-31", inventory_count: 10 },
      { farmer_id: 1, species_id: 1, barangay: "A", record_date: "2026-02-28", inventory_count: 12 },
      { farmer_id: 1, species_id: 1, barangay: "A", record_date: "2026-03-31", inventory_count: 11 },
    ];
    const latest = latestInventoryByHolding(rows);
    expect(latest).toHaveLength(1);
    expect(latest[0].inventory_count).toBe(11);
  });

  it("treats different producers, species, and barangays as separate holdings", () => {
    const rows: Row[] = [
      { farmer_id: 1, species_id: 1, barangay: "A", record_date: "2026-03-31", inventory_count: 11 },
      { farmer_id: 2, species_id: 1, barangay: "A", record_date: "2026-03-31", inventory_count: 5 },
      { farmer_id: 1, species_id: 2, barangay: "A", record_date: "2026-03-31", inventory_count: 8 },
      { farmer_id: 1, species_id: 1, barangay: "B", record_date: "2026-03-31", inventory_count: 4 },
    ];
    const latest = latestInventoryByHolding(rows);
    expect(latest).toHaveLength(4);
    const total = latest.reduce((sum, r) => sum + r.inventory_count, 0);
    expect(total).toBe(28);
  });

  it("does not double-count repeated snapshots of the same animals", () => {
    const rows: Row[] = [
      { farmer_id: 1, species_id: 1, barangay: "A", record_date: "2026-01-31", inventory_count: 100 },
      { farmer_id: 1, species_id: 1, barangay: "A", record_date: "2026-02-28", inventory_count: 100 },
    ];
    const total = latestInventoryByHolding(rows).reduce((s, r) => s + r.inventory_count, 0);
    expect(total).toBe(100);
  });

  it("returns an empty array for no rows", () => {
    expect(latestInventoryByHolding([])).toEqual([]);
  });
});
