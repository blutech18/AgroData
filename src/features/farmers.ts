import { supabase } from "@/lib/supabase";
import type { Farmer, Sex } from "@/types/database";

export interface FarmerInput {
  first_name: string;
  last_name: string;
  sex: Sex;
  birthdate: string;
  contact_no: string;
  address: string;
  barangay: string;
}

export async function fetchFarmers(search = ""): Promise<Farmer[]> {
  let query = supabase.from("farmers").select("*").order("last_name", { ascending: true });
  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},barangay.ilike.${term},contact_no.ilike.${term}`
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as Farmer[]) ?? [];
}

export async function createFarmer(input: FarmerInput): Promise<Farmer> {
  const { data, error } = await supabase.from("farmers").insert(input).select().single();
  if (error) throw error;
  return data as Farmer;
}

export async function updateFarmer(id: number, input: FarmerInput): Promise<Farmer> {
  const { data, error } = await supabase
    .from("farmers")
    .update(input)
    .eq("farmer_id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Farmer;
}

export async function deleteFarmer(id: number): Promise<void> {
  const { error } = await supabase.from("farmers").delete().eq("farmer_id", id);
  if (error) throw error;
}
