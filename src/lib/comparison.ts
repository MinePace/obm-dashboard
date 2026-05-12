import { applyFilters, campaigns, isRedeemed, isWon, pct } from "./campaign";

export type CompareItem = {
  id: string;
  label: string;
  campaignId: string;
  filters: any;
};

export function buildComparisonData(compareItems: CompareItem[]) {
  return compareItems.map((item) => {
    const campaign =
      campaigns.find((c) => c.id === item.campaignId) ?? campaigns[0];

    const rows = applyFilters(campaign.rows, item.filters);

    return {
      ...item,
      rows,
      won: rows.filter(isWon).length,
      redeemed: rows.filter(isRedeemed).length,
      redeemRate: pct(
        rows.filter(isRedeemed).length,
        rows.filter(isWon).length
      ),
    };
  });
}