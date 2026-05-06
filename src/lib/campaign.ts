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
};

export type CampaignOption = {
  id: string;
  name: string;
  rows: Row[];
  totalCouponsIssued: number;
};

export const campaigns: CampaignOption[] = [
  {
    id: "winkel-weken",
    name: "WINkel weken",
    rows: winkelWeken as Row[],
    totalCouponsIssued: 7390,
  },
  {
    id: "lente-geluk",
    name: "Lente Geluk",
    rows: lenteGeluk as Row[],
    totalCouponsIssued: 12500,
  },
];

export const data: Row[] = campaigns[0].rows;

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