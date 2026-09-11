import { supabase } from "@/lib/supabase";
import type { AquaticSpecies, MeasurementUnit } from "@/types/database";

// ---------------------------------------------------------------------------
// Measurement units (controlled catalog)
// ---------------------------------------------------------------------------

export interface UnitInput {
  unit_name: string;
  dimension: string | null;
  active: boolean;
}

export async function fetchUnits(): Promise<MeasurementUnit[]> {
  const { data, error } = await supabase
    .from("measurement_units")
    .select("*")
    .order("dimension", { ascending: true })
    .order("unit_name", { ascending: true });
  if (error) throw error;
  return (data as MeasurementUnit[]) ?? [];
}

/** Active unit names for form dropdowns. */
export async function fetchUnitOptions(): Promise<string[]> {
  const { data, error } = await supabase
    .from("measurement_units")
    .select("unit_name")
    .eq("active", true)
    .order("unit_name");
  if (error) throw error;
  return ((data as { unit_name: string }[]) ?? []).map((r) => r.unit_name);
}

export async function createUnit(input: UnitInput): Promise<MeasurementUnit> {
  const { data, error } = await supabase.from("measurement_units").insert(input).select().single();
  if (error) throw error;
  return data as MeasurementUnit;
}

export async function updateUnit(id: number, input: UnitInput): Promise<MeasurementUnit> {
  const { data, error } = await supabase
    .from("measurement_units")
    .update(input)
    .eq("unit_id", id)
    .select()
    .single();
  if (error) throw error;
  return data as MeasurementUnit;
}

export async function deleteUnit(id: number): Promise<void> {
  const { error } = await supabase.from("measurement_units").delete().eq("unit_id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Aquatic species (controlled catalog)
// ---------------------------------------------------------------------------

export interface AquaticSpeciesInput {
  common_name: string;
  scientific_name: string | null;
  active: boolean;
}

export async function fetchAquaticSpecies(): Promise<AquaticSpecies[]> {
  const { data, error } = await supabase
    .from("aquatic_species")
    .select("*")
    .order("common_name", { ascending: true });
  if (error) throw error;
  return (data as AquaticSpecies[]) ?? [];
}

/** Active aquatic species names for form dropdowns. */
export async function fetchAquaticSpeciesOptions(): Promise<string[]> {
  const { data, error } = await supabase
    .from("aquatic_species")
    .select("common_name")
    .eq("active", true)
    .order("common_name");
  if (error) throw error;
  return ((data as { common_name: string }[]) ?? []).map((r) => r.common_name);
}

export async function createAquaticSpecies(input: AquaticSpeciesInput): Promise<AquaticSpecies> {
  const { data, error } = await supabase.from("aquatic_species").insert(input).select().single();
  if (error) throw error;
  return data as AquaticSpecies;
}

export async function updateAquaticSpecies(
  id: number,
  input: AquaticSpeciesInput
): Promise<AquaticSpecies> {
  const { data, error } = await supabase
    .from("aquatic_species")
    .update(input)
    .eq("aqua_species_id", id)
    .select()
    .single();
  if (error) throw error;
  return data as AquaticSpecies;
}

export async function deleteAquaticSpecies(id: number): Promise<void> {
  const { error } = await supabase.from("aquatic_species").delete().eq("aqua_species_id", id);
  if (error) throw error;
}
