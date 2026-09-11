import {
  LayoutDashboard,
  Users,
  Map,
  Grid3x3,
  Sprout,
  Wheat,
  Warehouse,
  LineChart,
  FileText,
  UserCog,
  ScrollText,
  DatabaseBackup,
  Beef,
  Bird,
  Anchor,
  Fish,
  Waves,
  Droplets,
  Tags,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", to: "/", icon: LayoutDashboard },
      { label: "Analytics", to: "/analytics", icon: LineChart },
    ],
  },
  {
    title: "Crops",
    items: [
      { label: "Farmers", to: "/farmers", icon: Users },
      { label: "Farms & Land Use", to: "/farms", icon: Map },
      { label: "Farm Plots", to: "/plots", icon: Grid3x3 },
      { label: "Crops", to: "/crops", icon: Sprout },
      { label: "Planting Records", to: "/planting", icon: Wheat },
      { label: "Harvest Inventory", to: "/harvest", icon: Warehouse },
    ],
  },
  {
    title: "Livestock & Poultry",
    items: [
      { label: "Species", to: "/livestock-species", icon: Bird },
      { label: "Livestock Records", to: "/livestock", icon: Beef },
    ],
  },
  {
    title: "Fisheries & Aquaculture",
    items: [
      { label: "Fisherfolk", to: "/fisherfolk", icon: Anchor },
      { label: "Fish Catch", to: "/fish-catch", icon: Fish },
      { label: "Aquaculture Sites", to: "/aquaculture-sites", icon: Waves },
      { label: "Culture Cycles", to: "/aquaculture-cycles", icon: Droplets },
    ],
  },
  {
    title: "Office",
    items: [
      { label: "Reports", to: "/reports", icon: FileText, adminOnly: true },
      { label: "Reference Data", to: "/reference-data", icon: Tags, adminOnly: true },
      { label: "User Accounts", to: "/users", icon: UserCog, adminOnly: true },
      { label: "Backup & Restore", to: "/backup", icon: DatabaseBackup, adminOnly: true },
      { label: "Audit Logs", to: "/audit-logs", icon: ScrollText, adminOnly: true },
    ],
  },
];
