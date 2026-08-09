export type AssetCategoryType = 0 | 1 | 2 | 3 | 4;

export interface AssetCategoryConfig {
  type: AssetCategoryType;
  code: string;
  name: string;
  shortName: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  iconName: string;
  liquidAction: "DEDUCT" | "ADD" | "NONE";
  liquidActionLabel: string;
}

export const ASSET_CATEGORY_TYPES: Record<AssetCategoryType, AssetCategoryConfig> = {
  0: {
    type: 0,
    code: "LIQUID",
    name: "Tài sản thanh khoản (tiền mặt)",
    shortName: "Thanh khoản",
    description: "Tiền mặt, tài khoản ngân hàng, ví điện tử",
    badgeBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    badgeText: "Thanh khoản",
    iconName: "Wallet",
    liquidAction: "NONE",
    liquidActionLabel: "Tự động cộng dồn số dư",
  },
  1: {
    type: 1,
    code: "GROWTH",
    name: "Tài sản tăng trưởng (cổ phiếu, trái phiếu, crypto, ccq, kim loại quý)",
    shortName: "Tăng trưởng",
    description: "Cổ phiếu, Trái phiếu, Crypto, CCQ, Kim loại quý",
    badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    badgeText: "Tăng trưởng",
    iconName: "TrendingUp",
    liquidAction: "DEDUCT",
    liquidActionLabel: "Trừ giá trị giao dịch vào tài sản thanh khoản",
  },
  2: {
    type: 2,
    code: "PHYSICAL",
    name: "Tài sản vật chất (bđs, xe cộ, hàng hóa, vật chất)",
    shortName: "Vật chất",
    description: "Bất động sản, Xe cộ, Hàng hóa, Vật chất có giá trị",
    badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    badgeText: "Vật chất",
    iconName: "Building2",
    liquidAction: "DEDUCT",
    liquidActionLabel: "Trừ giá trị giao dịch vào tài sản thanh khoản",
  },
  3: {
    type: 3,
    code: "DEBT_MORTGAGE",
    name: "Tài sản thế chấp - nợ",
    shortName: "Thế chấp - Nợ",
    description: "Các khoản vay thế chấp, nợ tài chính",
    badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    badgeText: "Thế chấp - Nợ",
    iconName: "Landmark",
    liquidAction: "ADD",
    liquidActionLabel: "Cộng giá trị giao dịch vào tài sản thanh khoản",
  },
  4: {
    type: 4,
    code: "LENDING",
    name: "Tài sản cho vay (tiền gửi, trái phiếu, khoản cho vay)",
    shortName: "Cho vay",
    description: "Tiền gửi tiết kiệm, khoản cho vay, trái phiếu",
    badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    badgeText: "Cho vay",
    iconName: "HandCoins",
    liquidAction: "DEDUCT",
    liquidActionLabel: "Trừ giá trị giao dịch vào tài sản thanh khoản",
  },
};

export function getCategoryConfig(type: number): AssetCategoryConfig {
  const valid = (type >= 0 && type <= 4 ? type : 0) as AssetCategoryType;
  return ASSET_CATEGORY_TYPES[valid];
}
