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

// ---------------------------------------------------------------------------
// Livestock/Poultry & Fisheries/Aquaculture expansion (migration 0006)
// ---------------------------------------------------------------------------

export type LivestockCategory = "LIVESTOCK" | "POULTRY";
export type AnimalProductType = "MEAT" | "MILK" | "EGGS" | "OTHER";
export type FishingInvolvement = "FULL_TIME" | "PART_TIME";
export type FisheriesSubsector = "MARINE_MUNICIPAL" | "INLAND_MUNICIPAL";
export type AquaSiteType = "POND" | "CAGE" | "TANK" | "PEN";
export type WaterEnvironment = "FRESHWATER" | "BRACKISH" | "MARINE";
export type AquaCycleStatus = "STOCKED" | "HARVESTED" | "LOST";

export interface LivestockSpecies {
  species_id: number;
  species_name: string;
  category: LivestockCategory;
  primary_product: string | null;
}

export interface LivestockRecord {
  record_id: number;
  farmer_id: number;
  species_id: number;
  barangay: string;
  record_date: string;
  inventory_count: number;
  births: number;
  deaths: number;
  disposed: number;
  production_type: AnimalProductType | null;
  production_qty: number | null;
  production_unit: string | null;
  notes: string | null;
  farmers?: Pick<Farmer, "first_name" | "last_name"> | null;
  livestock_species?: Pick<LivestockSpecies, "species_name" | "category"> | null;
}

export interface Fisherfolk {
  fisherfolk_id: number;
  farmer_id: number;
  barangay: string;
  involvement: FishingInvolvement;
  vessel_type: string | null;
  gear_type: string | null;
  registered_at: string;
  farmers?: Pick<Farmer, "first_name" | "last_name"> | null;
}

export interface FishCatch {
  catch_id: number;
  fisherfolk_id: number;
  catch_date: string;
  subsector: FisheriesSubsector;
  species_name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  fisherfolk?:
    | (Pick<Fisherfolk, "barangay"> & { farmers?: Pick<Farmer, "first_name" | "last_name"> | null })
    | null;
}

export interface AquacultureSite {
  site_id: number;
  farmer_id: number;
  site_name: string;
  barangay: string;
  site_type: AquaSiteType;
  water_environment: WaterEnvironment;
  area_size: number | null;
  farmers?: Pick<Farmer, "first_name" | "last_name"> | null;
}

export interface AquacultureCycle {
  cycle_id: number;
  site_id: number;
  species_name: string;
  stocking_date: string;
  stocking_qty: number | null;
  harvest_date: string | null;
  harvest_qty: number | null;
  unit: string;
  status: AquaCycleStatus;
  aquaculture_sites?: Pick<AquacultureSite, "site_name" | "barangay"> | null;
}

export interface LivestockStatistic {
  stat_id: number;
  species_id: number;
  barangay: string | null;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  total_inventory: number | null;
  total_births: number | null;
  total_deaths: number | null;
  total_disposed: number | null;
  total_production: number | null;
  computed_at: string;
  livestock_species?: Pick<LivestockSpecies, "species_name" | "category"> | null;
}

export interface FisheriesStatistic {
  stat_id: number;
  subsector: FisheriesSubsector;
  species_name: string;
  unit: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  total_catch: number | null;
  catch_records: number | null;
  computed_at: string;
}

export interface AquacultureStatistic {
  stat_id: number;
  species_name: string;
  site_type: AquaSiteType | null;
  unit: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  total_stocked: number | null;
  total_harvested: number | null;
  active_cycles: number | null;
  harvested_cycles: number | null;
  lost_cycles: number | null;
  computed_at: string;
}

// ---------------------------------------------------------------------------
// Reference catalogs (migration 0014): controlled measurement units and
// aquatic species used to replace free-text entry in the sector forms.
// ---------------------------------------------------------------------------

export interface MeasurementUnit {
  unit_id: number;
  unit_name: string;
  dimension: string | null;
  active: boolean;
}

export interface AquaticSpecies {
  aqua_species_id: number;
  common_name: string;
  scientific_name: string | null;
  active: boolean;
}
