import { describe, expect, it } from "vitest";
import { isPossibleDuplicate, normalizeName } from "./farmers";

const existing = {
  first_name: "Juan",
  last_name: "Dela Cruz",
  birthdate: "1980-03-12",
  barangay: "Bolisong",
};

describe("normalizeName", () => {
  it("collapses casing and surrounding whitespace", () => {
    expect(normalizeName("  Dela  Cruz ")).toBe("dela cruz");
    expect(normalizeName("JUAN")).toBe("juan");
  });
});

describe("isPossibleDuplicate", () => {
  it("flags the same person entered with different casing and spacing", () => {
    expect(
      isPossibleDuplicate(existing, {
        first_name: " juan ",
        last_name: "DELA  CRUZ",
        birthdate: "1980-03-12",
        barangay: "Bolisong",
      })
    ).toBe(true);
  });

  it("flags a name match when only the birthdate agrees", () => {
    expect(
      isPossibleDuplicate(existing, {
        first_name: "Juan",
        last_name: "Dela Cruz",
        birthdate: "1980-03-12",
        barangay: "Buko",
      })
    ).toBe(true);
  });

  it("flags a name match when only the barangay agrees", () => {
    expect(
      isPossibleDuplicate(existing, {
        first_name: "Juan",
        last_name: "Dela Cruz",
        birthdate: "1991-01-01",
        barangay: "bolisong",
      })
    ).toBe(true);
  });

  it("does not flag a namesake from another barangay with another birthdate", () => {
    expect(
      isPossibleDuplicate(existing, {
        first_name: "Juan",
        last_name: "Dela Cruz",
        birthdate: "1995-06-01",
        barangay: "Panabol",
      })
    ).toBe(false);
  });

  it("does not flag different people who share a barangay and birthdate", () => {
    expect(
      isPossibleDuplicate(existing, {
        first_name: "Maria",
        last_name: "Santos",
        birthdate: "1980-03-12",
        barangay: "Bolisong",
      })
    ).toBe(false);
  });

  it("does not flag a matching first name with a different surname", () => {
    expect(
      isPossibleDuplicate(existing, {
        first_name: "Juan",
        last_name: "Reyes",
        birthdate: "1980-03-12",
        barangay: "Bolisong",
      })
    ).toBe(false);
  });
});
