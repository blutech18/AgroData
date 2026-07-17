// Domain types mirroring the AGRODATA PostgreSQL schema (supabase/migrations).

export type AccountStatus = "ACTIVE" | "INACTIVE";
export type Sex = "MALE" | "FEMALE";
export type SoilType = "CLAY" | "LOAM" | "SANDY";
export type IrrigationType = "RAINFED" | "IRRIGATED";
export type PlotStatus = "ACTIVE" | "FALLOW";
export type PlantingStatus = "PLANTED" | "HARVESTED" | "SPOILED";
export type PeriodType = "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface UserRole {
  role_id: number;
  role_name: string;
  description: string | null;
}

export interface AppUser {
  user_id: number;
  auth_id: string | null;
  role_id: number | null;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  account_status: AccountStatus;
  created_at: string;
  user_roles?: UserRole | null;
}

export interface Farmer {
  farmer_id: number;
  user_id: number | null;
  first_name: string;
  last_name: string;
  sex: Sex;
  birthdate: string;
  contact_no: string;
  address: string;
  barangay: string;
  registration_date: string;
}

export interface Farm {
  farm_id: number;
  farmer_id: number;
  farm_name: string;
  barangay: string;
  total_area: number | null;
  soil_type: SoilType | null;
  irrigation_type: IrrigationType | null;
  farmers?: Pick<Farmer, "first_name" | "last_name"> | null;
}

export interface FarmPlot {
  plot_id: number;
  farm_id: number;
  plot_number: string;
  plot_size: number;
  status: PlotStatus;
  farms?: Pick<Farm, "farm_name" | "barangay"> | null;
}

export interface Crop {
  crop_id: number;
  crop_name: string;
  crop_category: string | null;
  expected_harvest_days: number | null;
}

export interface PlantingRecord {
  planting_id: number;
  plot_id: number;
  crop_id: number;
  planting_date: string;
  expected_harvest_date: string | null;
  actual_harvest_date: string | null;
  area_planted: number;
  quantity_planted: number | null;
  planting_unit: string;
  planting_status: PlantingStatus;
  crops?: Pick<Crop, "crop_name"> | null;
  farm_plots?: (Pick<FarmPlot, "plot_number"> & {
    farms?: Pick<Farm, "farm_name" | "barangay"> | null;
  }) | null;
}

export interface HarvestInventory {
  inventory_id: number;
  planting_id: number;
  quantity_harvested: number;
  unit: string;
  harvested_at: string;
  planting_records?: PlantingRecord | null;
}

export interface YieldStatistic {
  stat_id: number;
  crop_id: number;
  barangay: string | null;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  total_area_planted: number | null;
  total_yield: number | null;
  average_yield_per_hectare: number | null;
  farmer_count: number | null;
  computed_at: string;
  crops?: Pick<Crop, "crop_name"> | null;
}

export interface AuditLog {
  log_id: number;
  user_id: number | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: string | null;
  created_at: string;
  users?: Pick<AppUser, "first_name" | "last_name" | "username"> | null;
}
