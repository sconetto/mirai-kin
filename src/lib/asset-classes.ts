import type { AccountType, AssetSubtype } from "@/db/schema";

export const ASSET_CLASSES = [
  "cash",
  "investments",
  "real_estate",
  "vehicles",
  "other_appreciating",
  "other_depreciating",
  "liabilities",
] as const;

export type AssetClass = (typeof ASSET_CLASSES)[number];

export const DEFAULT_REAL_ESTATE_GROWTH = 0.05;
export const DEFAULT_VEHICLE_GROWTH = -0.12;

const CASH_ACCOUNT_TYPES: AccountType[] = ["checking", "savings", "cash"];
const LIABILITY_ACCOUNT_TYPES: AccountType[] = ["credit_card", "loan", "mortgage"];

export type ClassifiableAccount = {
  type: AccountType;
  assetSubtype?: AssetSubtype | null;
  hasPositions?: boolean;
};

export function classifyAccount(account: ClassifiableAccount): AssetClass {
  if (LIABILITY_ACCOUNT_TYPES.includes(account.type)) return "liabilities";
  if (CASH_ACCOUNT_TYPES.includes(account.type)) return "cash";
  if (account.type === "investment" && account.hasPositions) return "investments";

  switch (account.assetSubtype) {
    case "real_estate":
      return "real_estate";
    case "vehicle":
      return "vehicles";
    case "other_depreciating":
      return "other_depreciating";
    case "stocks":
    case "fiis":
    case "crypto":
      return "investments";
    case "other_appreciating":
      return "other_appreciating";
    default:
      return account.type === "investment" ? "investments" : "other_appreciating";
  }
}

export function classifyEstateAsset(type: string): AssetClass {
  const value = type.toLowerCase();
  if (/(real.?estate|property|imovel|imóvel|house|home)/.test(value)) {
    return "real_estate";
  }
  if (/(vehicle|car|auto|moto)/.test(value)) return "vehicles";
  if (/depreciat/.test(value)) return "other_depreciating";
  return "other_appreciating";
}

export function defaultNominalGrowth(
  assetClass: AssetClass,
  inflation: number,
  investmentReturn: number,
): number {
  switch (assetClass) {
    case "cash":
    case "other_appreciating":
    case "other_depreciating":
      return inflation;
    case "investments":
      return investmentReturn;
    case "real_estate":
      return DEFAULT_REAL_ESTATE_GROWTH;
    case "vehicles":
      return DEFAULT_VEHICLE_GROWTH;
    case "liabilities":
      return 0;
  }
}

export function isLiabilityClass(assetClass: AssetClass): boolean {
  return assetClass === "liabilities";
}
