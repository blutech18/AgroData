import { supabase } from "@/lib/supabase";
import type { Crop } from "@/types/database";

export interface CropInput {
  crop_name: string;
  crop_category: string | null;
  expected_harvest_days: number | null;
}

export interface CropPage { rows: Crop[]; total: number; }

export async function fetchCrops(
  search = "",
  page = 1,
  pageSize = 12
): Promise<CropPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("crops")
    .select("*", { count: "exact" })
    .order("crop_name")
    .range(from, to);
  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`crop_name.ilike.${term},crop_category.ilike.${term}`);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data as Crop[]) ?? [], total: count ?? 0 };
}

export async function createCrop(input: CropInput): Promise<Crop> {
  const { data, error } = await supabase.from("crops").insert(input).select().single();
  if (error) throw error;
  return data as Crop;
}

export async function updateCrop(id: number, input: CropInput): Promise<Crop> {
  const { data, error } = await supabase
    .from("crops")
    .update(input)
    .eq("crop_id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Crop;
}

export async function deleteCrop(id: number): Promise<void> {
  const { error } = await supabase.from("crops").delete().eq("crop_id", id);
  if (error) throw error;
}
