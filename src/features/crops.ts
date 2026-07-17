import { supabase } from "@/lib/supabase";
import type { Crop } from "@/types/database";

export interface CropInput {
  crop_name: string;
  crop_category: string | null;
  expected_harvest_days: number | null;
}

export async function fetchCrops(): Promise<Crop[]> {
  const { data, error } = await supabase.from("crops").select("*").order("crop_name");
  if (error) throw error;
  return (data as Crop[]) ?? [];
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
