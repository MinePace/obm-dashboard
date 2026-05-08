import rawTrafficSources from "@/data/traffic-sources.json";

export type TrafficSourceRow = {
  source: string;
  clicks: number;
  landingPageVisits: number;
  formStarts: number;
  formSubmits: number;
  couponWins: number;
  redeemed: number;
};

export type CampaignTrafficData = {
  campaignId: string;
  sources: TrafficSourceRow[];
};

export type FunnelStep = {
  key:
    | "clicks"
    | "landingPageVisits"
    | "formStarts"
    | "formSubmits"
    | "couponWins"
    | "redeemed";
  label: string;
  value: number;
};

export const trafficSources = rawTrafficSources as CampaignTrafficData[];

export function getTrafficForCampaign(campaignId: string): TrafficSourceRow[] {
  return trafficSources.find((t) => t.campaignId === campaignId)?.sources ?? [];
}

export function sumTraffic(rows: TrafficSourceRow[]): TrafficSourceRow {
  return rows.reduce<TrafficSourceRow>(
    (acc, row) => ({
      source: "Totaal",
      clicks: acc.clicks + row.clicks,
      landingPageVisits: acc.landingPageVisits + row.landingPageVisits,
      formStarts: acc.formStarts + row.formStarts,
      formSubmits: acc.formSubmits + row.formSubmits,
      couponWins: acc.couponWins + row.couponWins,
      redeemed: acc.redeemed + row.redeemed,
    }),
    {
      source: "Totaal",
      clicks: 0,
      landingPageVisits: 0,
      formStarts: 0,
      formSubmits: 0,
      couponWins: 0,
      redeemed: 0,
    }
  );
}

export function pct(a: number, b: number) {
  return b > 0 ? (a / b) * 100 : 0;
}

export function fmtPct(value: number) {
  return `${value.toFixed(1)}%`;
}

export function getFunnelSteps(rows: TrafficSourceRow[]): FunnelStep[] {
  const total = sumTraffic(rows);

  return [
    { key: "clicks", label: "Kliks / QR scans", value: total.clicks },
    { key: "landingPageVisits", label: "Landingspagina bezoeken", value: total.landingPageVisits },
    { key: "formStarts", label: "Formulier gestart", value: total.formStarts },
    { key: "formSubmits", label: "Formulier afgerond", value: total.formSubmits },
    { key: "couponWins", label: "Prijs gewonnen", value: total.couponWins },
    { key: "redeemed", label: "Prijs opgehaald", value: total.redeemed },
  ];
}

export function getDropOffData(rows: TrafficSourceRow[]) {
  const steps = getFunnelSteps(rows);

  return steps.slice(1).map((step, index) => {
    const previous = steps[index];
    const dropOff = previous.value - step.value;

    return {
      step: `${previous.label} → ${step.label}`,
      previous: previous.value,
      current: step.value,
      dropOff,
      dropOffRate: pct(dropOff, previous.value),
      conversionRate: pct(step.value, previous.value),
    };
  });
}

export function getChannelPerformance(rows: TrafficSourceRow[]) {
  return rows.map((row) => ({
    ...row,
    landingRate: pct(row.landingPageVisits, row.clicks),
    formStartRate: pct(row.formStarts, row.landingPageVisits),
    formSubmitRate: pct(row.formSubmits, row.formStarts),
    winRate: pct(row.couponWins, row.formSubmits),
    redeemRate: pct(row.redeemed, row.couponWins),
  }));
}