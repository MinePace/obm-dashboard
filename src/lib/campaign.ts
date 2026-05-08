import winkelWeken from "@/data/campaign-winkel-weken.json";
import lenteGeluk from "@/data/campaign-lente-geluk.json";

export type Row = {
  status: "registered" | "won" | "claimed" | "redeemed";
  Prijsgewonnen: boolean;
  coupon_type: string | null;
  coupon_waarde: string | null;
  winkel_inwissel: string | null;
  winkel_uitgever: string | null;
  leeftijdsgroep: string;
  "Wat is uw geslacht": string;
  kanaal: string;
  "Datum uitgeleverd": string | null;
  "Datum opgehaald": string | null;
};

export type Filters = {
  dateFrom?: string;
  dateTo?: string;
  winkel?: string;
  coupon_type?: string;
  leeftijdsgroep?: string;
  kanaal?: string;
  segment?: string;
};

export type StoreSegment = 
  | "Levensmiddelen" 
  | "Persoonlijke verzorging" 
  | "Vrije tijd" 
  | "Overige winkels" 
  | "Elektronica" 
  | "Fietsen" 
  | "Wonen en warenhuis" 
  | "Damesmode" 
  | "Optiek" 
  | "Mode algemeen" 
  | "Schoenen" 
  | "Lunchroom" 
  | "Restaurant" 
  | "Dienst" 
  | "Geld,werk, woning";

export type Store = {
  id: string;
  name: string;
  segment: StoreSegment;
};

export type CampaignOption = {
  id: string;
  name: string;
  rows: Row[];
  totalCouponsIssued: number;
  participatingStoreIds: string[];
};

export type ShoppingCenter = {
  id: string;
  name: string;
  totalStores: number;
  stores: Store[];
  campaigns: CampaignOption[];
};

export const centrumNieuwVennep: ShoppingCenter = {
  id: "centrum-nieuw-vennep",
  name: "Centrum Nieuw-Vennep",
  totalStores: 148,

  stores: [
    { id: "dirk", name: "Dirk De Symfonie", segment: "Levensmiddelen" },
    { id: "jumbo", name: "Jumbo", segment: "Levensmiddelen" },
    { id: "hema", name: "Hema", segment: "Wonen en warenhuis" },
    { id: "orries", name: "Orries restaurant", segment: "Lunchroom" },
    { id: "mood4", name: "Mood4", segment: "Levensmiddelen" },
    { id: "shoeby", name: "Shoeby", segment: "Mode algemeen" },
    { id: "janosik", name: "Janosik Markt", segment: "Levensmiddelen" },
    { id: "roti2day", name: "Roti2Day", segment: "Lunchroom" },
    { id: "dominos", name: "Domino's Pizza", segment: "Lunchroom" },
    { id: "kriek-optiek", name: "Kriek Optiek", segment: "Optiek" },
    { id: "fix-my-phone", name: "Fix My Phone", segment: "Elektronica" },
    { id: "ami-kappers", name: "Ami kappers", segment: "Persoonlijke verzorging" },
    { id: "handmade-hobby", name: "Handmade Hobby", segment: "Wonen en warenhuis" },
    { id: "cardstyle", name: "Cardstyle", segment: "Overige winkels" },
    { id: "kapsalon-perdaan", name: "Kapsalon Perdaan", segment: "Persoonlijke verzorging" },
    { id: "haarstudio-unique", name: "HaarstudioUnique", segment: "Persoonlijke verzorging" },
    { id: "chris-hair", name: "Chris Hair Beauty Nails", segment: "Persoonlijke verzorging" },
    { id: "snoep-kadoboetiek", name: "Snoep & Kadoboetiek", segment: "Overige winkels" },
  ],

  campaigns: [
    {
      id: "winkel-weken",
      name: "WINkel weken",
      rows: winkelWeken as Row[],
      totalCouponsIssued: 7390,
      participatingStoreIds: [
        "dirk",
        "jumbo",
        "hema",
        "orries",
        "shoeby",
        "janosik",
        "roti2day",
        "dominos",
        "kriek-optiek",
        "fix-my-phone",
        "ami-kappers",
        "handmade-hobby",
        "cardstyle",
        "kapsalon-perdaan",
        "haarstudio-unique",
        "chris-hair",
        "snoep-kadoboetiek",
      ],
    },
    {
      id: "lente-geluk",
      name: "Lente Geluk",
      rows: lenteGeluk as Row[],
      totalCouponsIssued: 12500,
      participatingStoreIds: [
        "jumbo",
        "hema",
        "orries",
        "mood4",
        "shoeby",
        "roti2day",
        "dominos",
        "fix-my-phone",
        "cardstyle",
      ],
    },
  ],
};

export const centers = [centrumNieuwVennep];

export const campaigns: CampaignOption[] = centrumNieuwVennep.campaigns;

export const data: Row[] = campaigns[0].rows;

export function getParticipatingStores(
  center: ShoppingCenter,
  campaign: CampaignOption
): Store[] {
  return center.stores.filter((store) =>
    campaign.participatingStoreIds.includes(store.id)
  );
}

export function getStoreSegmentOverview(
  center: ShoppingCenter,
  campaign: CampaignOption
): { segment: string; count: number }[] {
  const stores = getParticipatingStores(center, campaign);

  return Object.values(
    stores.reduce<Record<string, { segment: string; count: number }>>(
      (acc, store) => {
        if (!acc[store.segment]) {
          acc[store.segment] = {
            segment: store.segment,
            count: 0,
          };
        }

        acc[store.segment].count += 1;
        return acc;
      },
      {}
    )
  );
}

export const isWon = (r: Row) =>
  r.Prijsgewonnen || ["won", "claimed", "redeemed"].includes(r.status);

export const isClaimed = (r: Row) =>
  ["claimed", "redeemed"].includes(r.status);

export const isRedeemed = (r: Row) => r.status === "redeemed";

export const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

export const fmtPct = (v: number) => `${v.toFixed(1)}%`;

export function uniqueSorted<T>(arr: (T | null | undefined)[]): T[] {
  return Array.from(
    new Set(arr.filter((x): x is T => x != null && x !== ""))
  ).sort((a, b) => String(a).localeCompare(String(b)));
}

export function applyFilters(rows: Row[], f: Filters): Row[] {
  return rows.filter((r) => {
    const d = r["Datum opgehaald"] || r["Datum uitgeleverd"];

    if (f.dateFrom && (!d || d < f.dateFrom)) return false;
    if (f.dateTo && (!d || d > f.dateTo)) return false;
    if (f.winkel && r.winkel_inwissel !== f.winkel) return false;
    if (f.coupon_type && r.coupon_type !== f.coupon_type) return false;
    if (f.leeftijdsgroep && r.leeftijdsgroep !== f.leeftijdsgroep) return false;
    if (f.kanaal && r.kanaal !== f.kanaal) return false;
    if (f.segment) {
      const store = centrumNieuwVennep.stores.find(
        (s) => s.name === r.winkel_inwissel
      );

      if (!store || store.segment !== f.segment) return false;
    }

    return true;
  });
}

export function exportCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}