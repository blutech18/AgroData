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

export interface FarmerPage {
  rows: Farmer[];
  total: number;
}

export async function fetchFarmers(
  search = "",
  page = 1,
  pageSize = 12
): Promise<FarmerPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("farmers")
    .select("*", { count: "exact" })
    .order("last_name", { ascending: true })
    .range(from, to);

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},barangay.ilike.${term},contact_no.ilike.${term}`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data as Farmer[]) ?? [], total: count ?? 0 };
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
