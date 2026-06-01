import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Info } from "lucide-react";
import {
  applyFilters,
  campaigns,
  centrumNieuwVennep,
  exportCsv,
  type Filters,
  fmtPct,
  getParticipatingStores,
  getStoreSegmentOverview,
  isClaimed,
  isRedeemed,
  isWon,
  pct,
  uniqueSorted,
} from "@/lib/campaign";
import {
  getChannelPerformance,
  getDropOffData,
  getFunnelSteps,
  getTrafficForCampaign,
  sumTraffic,
} from "@/lib/traffic-source";
import { type CompareItem, buildComparisonData } from "@/lib/comparison";
import { Kpi } from "@/components/Kpi";

type Campaign = (typeof campaigns)[number];

const CHART_COLORS = [
  "#0B0989",
  "#00E5AC",
  "#1E1E1E",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function getWeekStart(date: string | null | undefined) {
  if (!date) return null;

  const cleaned = String(date).trim();
  if (!cleaned) return null;

  const dt = new Date(cleaned);
  if (Number.isNaN(dt.getTime())) return null;

  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() - (day - 1));

  return dt.toISOString().slice(0, 10);
}

function CampaignSelect({
  campaignId,
  setCampaignId,
  label = "Campagne",
}: {
  campaignId: string;
  setCampaignId: (id: string) => void;
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={campaignId} onValueChange={setCampaignId}>
        <SelectTrigger className="w-full md:w-72">
          <SelectValue placeholder="Selecteer campagne" />
        </SelectTrigger>
        <SelectContent>
          {campaigns.map((campaign) => (
            <SelectItem key={campaign.id} value={campaign.id}>
              {campaign.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterBar({
  filters,
  setFilters,
  options,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  options: {
    winkels: string[];
    coupon_types: string[];
    leeftijden: string[];
    kanalen: string[];
    segments: string[];
  };
}) {
  const ALL = "__all__";
  const update = (k: keyof Filters, v: string | undefined) =>
    setFilters({ ...filters, [k]: v || undefined });

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 md:grid-cols-3 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label className="text-xs">Datum vanaf</Label>
          <Input
            type="date"
            value={filters.dateFrom || ""}
            onChange={(e) => update("dateFrom", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Datum t/m</Label>
          <Input
            type="date"
            value={filters.dateTo || ""}
            onChange={(e) => update("dateTo", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Winkel</Label>
          <Select
            value={filters.winkel || ALL}
            onValueChange={(v) => update("winkel", v === ALL ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle winkels" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ALL}>Alle winkels</SelectItem>
              {options.winkels.map((w) => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Leeftijdsgroep</Label>
          <Select
            value={filters.leeftijdsgroep || ALL}
            onValueChange={(v) => update("leeftijdsgroep", v === ALL ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle</SelectItem>
              {options.leeftijden.map((w) => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Segment</Label>

          <Select
            value={filters.segment || ALL}
            onValueChange={(v) =>
              update("segment", v === ALL ? undefined : v)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle segmenten" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value={ALL}>Alle segmenten</SelectItem>

              {options.segments.map((segment) => (
                <SelectItem key={segment} value={segment}>
                  {segment}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoTip({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-foreground">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{children}</TooltipContent>
    </Tooltip>
  );
}

function ChartCard({
  title,
  info,
  children,
  action,
}: {
  title: string;
  info?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {title}
          {info && <InfoTip>{info}</InfoTip>}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

type CompareMode = "campagne" | "periode" | "winkel" | "segment" | "leeftijdsgroep";

type DashboardCompareItem = Omit<CompareItem, "filters"> & {
  filters: Filters;
  compareMode?: CompareMode;
  compareValue?: string;
};

type CompareOption = {
  value: string;
  label: string;
  filters: Filters;
  campaignId?: string;
};

type ComparisonDataItem = {
  id: string;
  label: string;
  campaignId: string;
  filters: Filters;
  rows: Campaign["rows"];
  won: number;
  redeemed: number;
  redeemRate: number;
  compareMode?: CompareMode;
  compareValue?: string;
};

const createCompareId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `compare-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const ALL = "__all__";

function getRowDate(row: Campaign["rows"][number]) {
  const r = row as any;
  return r.datum_uitgeleverd || r["Datum uitgeleverd"] || null;
}

function getRowStoreName(row: Campaign["rows"][number]) {
  const r = row as any;
  return r.winkel_inwissel || r.winkel_uitgever || null;
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function getSegmentForStoreName(storeName: string | null | undefined) {
  const normalizedStoreName = normalizeText(storeName);

  if (!normalizedStoreName) return null;

  return (
    centrumNieuwVennep.stores.find(
      (store) => normalizeText(store.name) === normalizedStoreName
    )?.segment ?? null
  );
}

function buildTrendFromRows(rows: Campaign["rows"], dataKey = "aanmeldingen") {
  const byWeek = new Map<string, number>();

  for (const row of rows) {
    const date = getRowDate(row);
    if (!date) continue;

    const week = getWeekStart(date);
    if (!week) continue;

    byWeek.set(week, (byWeek.get(week) || 0) + 1);
  }

  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, value]) => ({ week, [dataKey]: value }));
}

function getCampaignName(campaignId: string) {
  return campaigns.find((campaign) => campaign.id === campaignId)?.name ?? campaignId;
}

function getComparisonChartKey(item: ComparisonDataItem) {
  return `${item.label} — ${getCampaignName(item.campaignId)}`;
}

function buildComparisonTrend(items: ComparisonDataItem[], compareMode: CompareMode) {
  const xKey = compareMode === "periode" ? "dag" : "week";
  const trendMap = new Map<string, Record<string, string | number>>();

  if (compareMode === "periode") {
    for (let day = 1; day <= 31; day++) {
      trendMap.set(String(day), { [xKey]: String(day) });
    }
  }

  for (const item of items) {
    for (const row of item.rows) {
      const date = getRowDate(row);
      if (!date) continue;

      const key =
        compareMode === "periode"
          ? String(new Date(date).getDate())
          : getWeekStart(date);

      if (!key || key === "NaN") continue;

      const existing = trendMap.get(key) ?? { [xKey]: key };
      const chartKey = getComparisonChartKey(item);
      existing[chartKey] = Number(existing[chartKey] ?? 0) + 1;
      trendMap.set(key, existing);
    }
  }

  return Array.from(trendMap.values()).sort((a, b) => {
    if (compareMode === "periode") return Number(a[xKey]) - Number(b[xKey]);
    return String(a[xKey]).localeCompare(String(b[xKey]));
  });
}

function getMonthDateRange(month: string): Pick<Filters, "dateFrom" | "dateTo"> {
  const [year, monthNumber] = month.split("-").map(Number);

  if (!year || !monthNumber) return {};

  const lastDay = new Date(year, monthNumber, 0).getDate();

  return {
    dateFrom: `${month}-01`,
    dateTo: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  if (!year || !monthNumber) return month;

  return new Intl.DateTimeFormat("nl-NL", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
}

function buildCompareOptions(mode: CompareMode, campaign: Campaign): CompareOption[] {
  if (mode === "campagne") {
    return campaigns.map((campaignOption) => ({
      value: campaignOption.id,
      label: campaignOption.name,
      campaignId: campaignOption.id,
      filters: {},
    }));
  }

  if (mode === "periode") {
    return uniqueSorted(
      campaign.rows
        .map((row) => getRowDate(row)?.slice(0, 7))
        .filter((month): month is string => Boolean(month))
    ).map((month) => ({
      value: month,
      label: formatMonthLabel(month),
      filters: getMonthDateRange(month),
    }));
  }

  if (mode === "winkel") {
    return uniqueSorted(campaign.rows.map((row) => getRowStoreName(row))).map((winkel) => ({
      value: winkel,
      label: winkel,
      filters: { winkel },
    }));
  }

  if (mode === "segment") {
    const segmentsInCampaign = uniqueSorted(
      campaign.rows.map((row) => getSegmentForStoreName(getRowStoreName(row)))
    );

    const segments = segmentsInCampaign.length
      ? segmentsInCampaign
      : uniqueSorted(centrumNieuwVennep.stores.map((store) => store.segment));

    return segments.map((segment) => ({
      value: segment,
      label: segment,
      filters: { segment },
    }));
  }

  return uniqueSorted(campaign.rows.map((row) => row.leeftijdsgroep)).map((leeftijdsgroep) => ({
    value: leeftijdsgroep,
    label: leeftijdsgroep,
    filters: { leeftijdsgroep },
  }));
}

function createCompareItemFromOption(
  mode: CompareMode,
  option: CompareOption,
  baseCampaignId: string
): DashboardCompareItem {
  return {
    id: `${mode}-${option.campaignId ?? baseCampaignId}-${option.value}`,
    label: option.label,
    campaignId: option.campaignId ?? baseCampaignId,
    filters: option.filters,
    compareMode: mode,
    compareValue: option.value,
  };
}

function isSameCompareItem(
  item: DashboardCompareItem,
  mode: CompareMode,
  option: CompareOption,
  baseCampaignId: string
) {
  return (
    item.compareMode === mode &&
    item.compareValue === option.value &&
    item.campaignId === (option.campaignId ?? baseCampaignId)
  );
}

function getCompareModeHelp(mode: CompareMode) {
  if (mode === "campagne") return "Vink campagnes aan om campagnes direct met elkaar te vergelijken.";
  if (mode === "periode") return "Vink maanden aan om periodes binnen de geselecteerde campagne te vergelijken.";
  if (mode === "winkel") return "Vink winkels aan om winkels binnen de geselecteerde campagne te vergelijken.";
  if (mode === "segment") return "Vink segmenten aan om winkelsegmenten met elkaar te vergelijken.";
  return "Vink leeftijdsgroepen aan om leeftijdsgroepen met elkaar te vergelijken.";
}

function ComparisonBuilder({
  compareMode,
  setCompareMode,
  baseCampaignId,
  setBaseCampaignId,
  compareOptions,
  compareItems,
  setCompareItems,
}: {
  compareMode: CompareMode;
  setCompareMode: (mode: CompareMode) => void;
  baseCampaignId: string;
  setBaseCampaignId: (id: string) => void;
  compareOptions: CompareOption[];
  compareItems: DashboardCompareItem[];
  setCompareItems: (items: DashboardCompareItem[]) => void;
}) {
  const isOptionChecked = (option: CompareOption) =>
    compareItems.some((item) => isSameCompareItem(item, compareMode, option, baseCampaignId));

  const toggleOption = (option: CompareOption, checked: boolean) => {
    if (checked) {
      if (isOptionChecked(option)) return;
      setCompareItems([
        ...compareItems,
        createCompareItemFromOption(compareMode, option, baseCampaignId),
      ]);
      return;
    }

    setCompareItems(
      compareItems.filter(
        (item) => !isSameCompareItem(item, compareMode, option, baseCampaignId)
      )
    );
  };

  const selectAll = () => {
    const newItems = compareOptions
      .filter((option) => !isOptionChecked(option))
      .map((option) => createCompareItemFromOption(compareMode, option, baseCampaignId));

    setCompareItems([...compareItems, ...newItems]);
  };

  const clearAll = () => setCompareItems([]);

  const onCompareModeChange = (mode: CompareMode) => {
    setCompareMode(mode);
    setCompareItems([]);
  };

  const selectedInCurrentView = compareOptions.filter(isOptionChecked).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Vergelijkingen instellen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {compareItems.length > 0 && (
          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">Actieve vergelijkingen</div>
            <div className="flex flex-wrap gap-2">
              {compareItems.map((item) => {
                const campaign = campaigns.find((c) => c.id === item.campaignId);

                return (
                  <span
                    key={item.id}
                    className="rounded-md bg-muted px-3 py-2 text-sm"
                  >
                    {campaign?.name ?? item.campaignId} — {item.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-4 rounded-md border bg-muted/40 p-3 md:grid-cols-[280px_280px_1fr] md:items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">Vergelijk op</Label>
            <Select value={compareMode} onValueChange={(value) => onCompareModeChange(value as CompareMode)}>
              <SelectTrigger>
                <SelectValue placeholder="Vergelijk op" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="campagne">Campagne</SelectItem>
                <SelectItem value="periode">Periode</SelectItem>
                <SelectItem value="winkel">Winkel</SelectItem>
                <SelectItem value="segment">Segment</SelectItem>
                <SelectItem value="leeftijdsgroep">Leeftijdsgroep</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Campagnebron</Label>
            <Select
              value={baseCampaignId}
              onValueChange={setBaseCampaignId}
              disabled={compareMode === "campagne"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Campagne" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            {getCompareModeHelp(compareMode)} Wisselen van vergelijkcategorie wist de selectie, zodat je alleen dezelfde soorten met elkaar vergelijkt.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={selectAll}>
            Alles selecteren
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={clearAll}>
            Selectie wissen
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedInCurrentView} van {compareOptions.length} geselecteerd in huidige bron · {compareItems.length} totaal
          </span>
        </div>

        <div className="flex max-h-80 flex-wrap gap-2 overflow-auto rounded-md border p-3">
          {compareOptions.map((option) => (
            <label
              key={`${option.campaignId ?? baseCampaignId}-${option.value}`}
              className="flex cursor-pointer items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:bg-muted/50"
            >
              <input
                type="checkbox"
                checked={isOptionChecked(option)}
                onChange={(e) => toggleOption(option, e.target.checked)}
              />
              {option.label}
            </label>
          ))}

          {!compareOptions.length && (
            <div className="text-sm text-muted-foreground">
              Geen opties gevonden voor deze vergelijking.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


/* ───────────────────────────── OBM VIEW ───────────────────────────── */

function CentrumView() {
  const [filters, setFilters] = useState<Filters>({});
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareMode, setCompareMode] = useState<CompareMode>("periode");
  const [ageGenderMetric, setAgeGenderMetric] = useState<"claimed" | "won" | "redeemed">("won");
  const [campaignId, setCampaignId] = useState(campaigns[0].id);
  const [compareCampaignId, setCompareCampaignId] = useState(campaigns[0].id);
  const [compareItems, setCompareItems] = useState<DashboardCompareItem[]>([]);

  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === campaignId) ?? campaigns[0];

  const data = selectedCampaign.rows;

  const participatingStores = useMemo(
    () => getParticipatingStores(centrumNieuwVennep, selectedCampaign),
    [selectedCampaign],
  );

  const segmentOverview = useMemo(
    () => getStoreSegmentOverview(centrumNieuwVennep, selectedCampaign),
    [selectedCampaign],
  );

  const options = useMemo(
    () => ({
      winkels: uniqueSorted(data.map((r) => getRowStoreName(r))),
      coupon_types: uniqueSorted(data.map((r) => r.coupon_type)),
      leeftijden: uniqueSorted(data.map((r) => r.leeftijdsgroep)),
      kanalen: uniqueSorted(data.map((r) => r.kanaal)),
      segments: uniqueSorted(
        centrumNieuwVennep.stores.map((s) => s.segment)
      ),
    }),
    [data],
  );

  const compareBaseCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === compareCampaignId) ?? campaigns[0],
    [compareCampaignId]
  );

  const compareOptions = useMemo(
    () => buildCompareOptions(compareMode, compareBaseCampaign),
    [compareMode, compareBaseCampaign]
  );

  const filtered = useMemo(() => applyFilters(data, filters), [data, filters]);

  const won = filtered.filter(isWon).length;
  const claimed = filtered.filter(isClaimed).length;
  const redeemed = filtered.filter(isRedeemed).length;
  const redeemRate = pct(redeemed, won);

  const trend = useMemo(() => buildTrendFromRows(filtered), [filtered]);

  const comparisonData = useMemo(
    () => buildComparisonData(compareItems) as ComparisonDataItem[],
    [compareItems]
  );

  const compareTrend = useMemo(
    () => buildComparisonTrend(comparisonData, compareMode),
    [comparisonData, compareMode]
  );

  const topWinkels = useMemo(() => {
    const m = new Map<string, { winkel: string; gewonnen: number; ingewisseld: number }>();

    for (const r of filtered) {
      const w = getRowStoreName(r);
      if (!w) continue;

      const e = m.get(w) || { winkel: w, gewonnen: 0, ingewisseld: 0 };
      if (isWon(r)) e.gewonnen += 1;
      if (isRedeemed(r)) e.ingewisseld += 1;
      m.set(w, e);
    }

    return Array.from(m.values()).sort((a, b) => b.ingewisseld - a.ingewisseld);
  }, [filtered]);

  const ageGenderPredicate = ageGenderMetric === "won" ? isWon : ageGenderMetric === "claimed" ? isClaimed : isRedeemed;
  const ageGender = useMemo(() => {
    const ages = uniqueSorted(filtered.filter(ageGenderPredicate).map((r) => r.leeftijdsgroep));
    const genderOrder = ["Man", "Vrouw", "Onbekend"];

    return ages.map((a) => {
      const row: Record<string, string | number> = { leeftijd: a };

      for (const gender of genderOrder) {
        row[gender] = filtered.filter(
          (r) =>
            ageGenderPredicate(r) &&
            r.leeftijdsgroep === a &&
            r.wat_is_uw_geslacht === gender
        ).length;
      }

      return row;
    });
  }, [filtered, ageGenderPredicate]);

  const genders = useMemo(() => {
    const preferredOrder = ["Man", "Vrouw", "Onbekend"];

    return preferredOrder.filter((gender) =>
      filtered.some((r) => ageGenderPredicate(r) && r.wat_is_uw_geslacht === gender)
    );
  }, [filtered, ageGenderPredicate]);

  const genderPieData = useMemo(() => {
    if (!filters.leeftijdsgroep) return [];

    return genders
      .map((gender) => ({
        name: gender,
        value: filtered.filter(
          (r) =>
            ageGenderPredicate(r) &&
            r.leeftijdsgroep === filters.leeftijdsgroep &&
            r.wat_is_uw_geslacht === gender
        ).length,
      }))
      .filter((item) => item.value > 0);
  }, [filtered, filters.leeftijdsgroep, genders, ageGenderPredicate]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <CampaignSelect
              campaignId={campaignId}
              setCampaignId={(id) => {
                setCampaignId(id);
                setFilters({});
              }}
              label="Campagne"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Winkelcentrum:{" "}
            <span className="font-medium text-foreground">
              {centrumNieuwVennep.name}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Vergelijken</h2>
              <p className="text-sm text-muted-foreground">
                Vergelijk campagnes, maanden, winkels, segmenten of leeftijdsgroepen. De vergelijkingen worden ook als lijnen in de grafiek getoond.
              </p>
            </div>

            <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
              <input
                type="checkbox"
                checked={isCompareMode}
                onChange={(e) => setIsCompareMode(e.target.checked)}
              />
              Vergelijkingen tonen
            </label>
          </div>
        </CardContent>
      </Card>

      {isCompareMode && (
        <ComparisonBuilder
          compareMode={compareMode}
          setCompareMode={setCompareMode}
          baseCampaignId={compareCampaignId}
          setBaseCampaignId={setCompareCampaignId}
          compareOptions={compareOptions}
          compareItems={compareItems}
          setCompareItems={setCompareItems}
        />
      )}

      {!isCompareMode && (
        <FilterBar filters={filters} setFilters={setFilters} options={options} />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-8">
        <Kpi
          label="Totaal winkels"
          value={centrumNieuwVennep.totalStores.toLocaleString("nl-NL")}
          hint="Aantal winkels in het centrum"
          tone="primary"
        />
        <Kpi
          label="Deelnemende winkels"
          value="29"
          hint="Aantal winkels dat meedoet aan deze campagne"
          tone="primary"
        />
        <Kpi
          label="Totaal prijzen"
          value="4976"
          hint="Totaal aantal prijzen binnen de lopende campagne"
          tone="primary"
        />
        <Kpi
          label="Coupons uitgegeven"
          value={selectedCampaign.totalCouponsIssued.toLocaleString("nl-NL")}
          hint="Totaal aantal uitgegeven coupons"
          tone="primary"
        />
        <Kpi
          label="Coupons ingewisseld"
          value={claimed.toLocaleString("nl-NL")}
          hint="Totaal gebruikte coupons"
          tone="accent"
        />
        <Kpi
          label="Prijs gewonnen"
          value={won.toLocaleString("nl-NL")}
          hint="prijs_gewonnen of status claimed/redeemed"
          tone="accent"
        />
        <Kpi
          label="Prijs opgehaald"
          value={redeemed.toLocaleString("nl-NL")}
          hint="status = redeemed"
          tone="accent"
        />
        <Kpi
          label="Redeem rate"
          value={fmtPct(redeemRate)}
          hint="opgehaald ÷ gewonnen"
          tone="accent"
        />
      </div>

      {isCompareMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vergelijkingsoverzicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Vergelijking</TableHead>
                    <TableHead>Campagne</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Winkel</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Leeftijd</TableHead>
                    <TableHead className="text-right">Gewonnen</TableHead>
                    <TableHead className="text-right">Opgehaald</TableHead>
                    <TableHead className="text-right">Redeem rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.map((item) => {
                    const campaign = campaigns.find((c) => c.id === item.campaignId);

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.label}</TableCell>
                        <TableCell>{campaign?.name ?? item.campaignId}</TableCell>
                        <TableCell>
                          {item.compareMode === "periode"
                            ? item.label
                            : `${item.filters.dateFrom || "-"} t/m ${item.filters.dateTo || "-"}`}
                        </TableCell>
                        <TableCell>{item.filters.winkel || "Alle winkels"}</TableCell>
                        <TableCell>{item.filters.segment || "Alle segmenten"}</TableCell>
                        <TableCell>{item.filters.leeftijdsgroep || "Alle leeftijden"}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.won}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.redeemed}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtPct(item.redeemRate)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title={isCompareMode && compareMode === "periode" ? "Aanmeldingen per dag — vergelijking" : isCompareMode ? "Aanmeldingen per week — vergelijking" : "Aanmeldingen per week"}
          info="Op basis van 'datum_uitgeleverd'."
        >
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={isCompareMode ? compareTrend : trend} margin={{ left: 0, right: 16, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey={isCompareMode && compareMode === "periode" ? "dag" : "week"} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip />
                {isCompareMode && <Legend wrapperStyle={{ fontSize: 12 }} />}
                {isCompareMode ? (
                  comparisonData.map((item, i) => (
                    <Line
                      isAnimationActive={false}
                      key={item.id}
                      type="monotone"
                      dataKey={getComparisonChartKey(item)}
                      name={getComparisonChartKey(item)}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2.5}
                      dot={false}
                    />
                  ))
                ) : (
                  <Line isAnimationActive={false} type="monotone" dataKey="aanmeldingen" stroke="#00E5AC" strokeWidth={2.5} dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Segmentoverzicht" info="Verdeling van deelnemende winkels per segment.">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={segmentOverview} margin={{ left: 0, right: 16, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="segment" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <RTooltip />
                <Bar isAnimationActive={false} dataKey="count" name="Aantal winkels" fill="#0B0989" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={
            filters.leeftijdsgroep
              ? `Genderverdeling binnen ${filters.leeftijdsgroep}`
              : "Deelname per leeftijd × gender"
          }
          info={ageGenderMetric === "won" ? "Gewonnen coupons." : "Opgehaalde prijzen."}
          action={
            <Select
              value={ageGenderMetric}
              onValueChange={(v) => setAgeGenderMetric(v as "claimed" | "won" | "redeemed")}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claimed">Ingewisseld</SelectItem>
                <SelectItem value="won">Gewonnen</SelectItem>
                <SelectItem value="redeemed">Opgehaald</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <div className="h-72">
            <ResponsiveContainer>
              {filters.leeftijdsgroep ? (
                <PieChart>
                  <Pie
                    isAnimationActive={false}
                    data={genderPieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {genderPieData.map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RTooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              ) : (
                <BarChart data={ageGender}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="leeftijd" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {genders.map((g, i) => (
                    <Bar 
                      isAnimationActive={false}
                      key={g}
                      dataKey={g}
                      stackId="a"
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Top 10 winkels — coupons ingewisseld"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCsv(
                topWinkels.map((w) => ({
                  winkel: w.winkel,
                  gewonnen: w.gewonnen,
                  ingewisseld: w.ingewisseld,
                  redeem_rate_pct: pct(w.ingewisseld, w.gewonnen).toFixed(1),
                })),
                "winkels.csv",
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
        }
      >
        <div className="h-80">
          <ResponsiveContainer>
            <BarChart data={topWinkels.slice(0, 10)} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="winkel" type="category" tick={{ fontSize: 11 }} width={140} />
              <RTooltip />
              <Bar isAnimationActive={false} dataKey="ingewisseld" fill="#0B0989" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Winkels — overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[480px] overflow-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-muted">
                <TableRow>
                  <TableHead>Winkel</TableHead>
                  <TableHead className="text-right">Gewonnen</TableHead>
                  <TableHead className="text-right">Ingewisseld</TableHead>
                  <TableHead className="text-right">Redeem rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topWinkels.map((w) => (
                  <TableRow key={w.winkel}>
                    <TableCell className="font-medium">{w.winkel}</TableCell>
                    <TableCell className="text-right tabular-nums">{w.gewonnen}</TableCell>
                    <TableCell className="text-right tabular-nums">{w.ingewisseld}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPct(pct(w.ingewisseld, w.gewonnen))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────────────── WINKELIER VIEW ─────────────────────── */

function WinkelierView() {
  const [campaignId, setCampaignId] = useState(campaigns[0].id);
  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === campaignId) ?? campaigns[0];
  const data = selectedCampaign.rows;

  const winkels = useMemo(() => uniqueSorted(data.map((r) => r.winkel_uitgever)), [data]);
  const [winkel, setWinkel] = useState<string>("");

  useEffect(() => {
    if (!winkels.length) {
      setWinkel("");
      return;
    }

    if (!winkels.includes(winkel)) {
      setWinkel(winkels[0]);
    }
  }, [winkel, winkels]);

  const rows = useMemo(() => data.filter((r) => r.winkel_uitgever === winkel), [data, winkel]);
  const won = rows.filter(isWon).length;
  const redeemed = rows.filter(isRedeemed).length;
  const claimed = rows.filter(isClaimed).length;
  const rate = pct(redeemed, won);

  const perf = useMemo(() => {
    const m = new Map<string, { key: string; type: string; waarde: string; gewonnen: number; ingewisseld: number }>();

    for (const r of rows) {
      const key = `${r.coupon_type} — ${r.coupon_waarde}`;
      const e = m.get(key) || { key, type: r.coupon_type, waarde: r.coupon_waarde, gewonnen: 0, ingewisseld: 0 };
      if (isWon(r)) e.gewonnen += 1;
      if (isRedeemed(r)) e.ingewisseld += 1;
      m.set(key, e);
    }

    return Array.from(m.values()).sort((a, b) => b.gewonnen - a.gewonnen);
  }, [rows]);

  const trend = useMemo(() => {
    const byWeek = new Map<string, number>();

    for (const r of rows.filter(isRedeemed)) {
      const d = r["datum_opgehaald"];
      if (!d) continue;

      const key = getWeekStart(d);
      if (!key) continue;

      byWeek.set(key, (byWeek.get(key) || 0) + 1);
    }

    return Array.from(byWeek.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, value]) => ({ week, ingewisseld: value }));
  }, [rows]);

  const insights = useMemo(() => {
    const list: string[] = [];

    if (perf.length) {
      const best = [...perf].sort((a, b) => pct(b.ingewisseld, b.gewonnen) - pct(a.ingewisseld, a.gewonnen))[0];
      list.push(`Beste prijs: ${best.key} — conversie ${fmtPct(pct(best.ingewisseld, best.gewonnen))}`);
    }

    const ageMap = new Map<string, number>();
    rows.filter(isRedeemed).forEach((r) => ageMap.set(r.leeftijdsgroep, (ageMap.get(r.leeftijdsgroep) || 0) + 1));
    const topAge = Array.from(ageMap.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topAge) list.push(`Sterkste leeftijdsgroep: ${topAge[0]} (${topAge[1]} inwisselingen)`);

    const dayMap = new Map<string, number>();
    rows.filter(isRedeemed).forEach((r) => {
      if (r["datum_opgehaald"]) dayMap.set(r["datum_opgehaald"], (dayMap.get(r["datum_opgehaald"]) || 0) + 1);
    });
    const peak = Array.from(dayMap.entries()).sort((a, b) => b[1] - a[1])[0];
    if (peak) list.push(`Piekdag: ${peak[0]} (${peak[1]} inwisselingen)`);

    const chMap = new Map<string, number>();
    rows.filter(isWon).forEach((r) => chMap.set(r.kanaal || "Onbekend", (chMap.get(r.kanaal || "Onbekend") || 0) + 1));
    const topCh = Array.from(chMap.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topCh) list.push(`Beste kanaal: ${topCh[0]} (${topCh[1]} winnaars)`);

    return list;
  }, [rows, perf]);

  return (
    <div className="theme-symfonie space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <CampaignSelect campaignId={campaignId} setCampaignId={setCampaignId} />

            <div className="space-y-1.5">
              <Label className="text-xs">Kies winkel</Label>
              <Select value={winkel} onValueChange={setWinkel} disabled={!winkels.length}>
                <SelectTrigger className="w-full md:w-72">
                  <SelectValue placeholder="Selecteer winkel" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {winkels.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() =>
              exportCsv(
                perf.map((p) => ({
                  coupon_type: p.type,
                  coupon_waarde: p.waarde,
                  gewonnen: p.gewonnen,
                  ingewisseld: p.ingewisseld,
                  conversie_pct: pct(p.ingewisseld, p.gewonnen).toFixed(1),
                })),
                `${winkel || "winkel"}-prijs-performance.csv`,
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi label="Gewonnen" value={won} tone="primary" />
        <Kpi label="Ingewisseld" value={redeemed} tone="accent" />
        <Kpi label="Redeem rate" value={fmtPct(rate)} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Inwisselingen over tijd" info="Per week, op 'Datum opgehaald'.">
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip />
                <Line type="monotone" dataKey="ingewisseld" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Top inzichten" info="Automatisch gegenereerd uit de data.">
          <ul className="space-y-2 text-sm">
            {insights.length === 0 && (
              <li className="text-muted-foreground">Geen data beschikbaar.</li>
            )}
            {insights.map((i, idx) => (
              <li key={idx} className="rounded-md border bg-secondary/50 p-3">
                {i}
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Prijs performance</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Coupon type</TableHead>
                  <TableHead>Waarde</TableHead>
                  <TableHead className="text-right">Gewonnen</TableHead>
                  <TableHead className="text-right">Ingewisseld</TableHead>
                  <TableHead className="text-right">Conversie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perf.map((p) => (
                  <TableRow key={p.key}>
                    <TableCell className="font-medium">{p.type}</TableCell>
                    <TableCell>{p.waarde}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.gewonnen}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.ingewisseld}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPct(pct(p.ingewisseld, p.gewonnen))}</TableCell>
                  </TableRow>
                ))}
                {!perf.length && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Geen data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────────────────── PERFORMANCE VIEW ─────────────────────────── */
function PerformanceView() {
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [campaignId, setCampaignId] = useState(campaigns[0].id);
  const [compareCampaignId, setCompareCampaignId] = useState(
    campaigns[1]?.id ?? campaigns[0].id
  );

  const trafficRows = useMemo(
    () => getTrafficForCampaign(campaignId),
    [campaignId]
  );

  const compareTrafficRows = useMemo(
    () => getTrafficForCampaign(compareCampaignId),
    [compareCampaignId]
  );

  const compareFunnelSteps = useMemo(() => {
    const a = getFunnelSteps(trafficRows);
    const b = getFunnelSteps(compareTrafficRows);

    return a.map((step, index) => ({
      label: step.label,
      campagneA: step.value,
      campagneB: b[index]?.value ?? 0,
      verschil: (b[index]?.value ?? 0) - step.value,
    }));
  }, [trafficRows, compareTrafficRows]);

  const compareDropOffData = useMemo(() => {
    const a = getDropOffData(trafficRows);
    const b = getDropOffData(compareTrafficRows);

    return a.map((step, index) => {
      const bStep = b[index];

      return {
        step: step.step,
        campagneA: step.dropOffRate,
        campagneB: bStep?.dropOffRate ?? 0,
        verschil: (bStep?.dropOffRate ?? 0) - step.dropOffRate,
      };
    });
  }, [trafficRows, compareTrafficRows]);

  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === campaignId) ?? campaigns[0];

  const compareCampaign =
    campaigns.find((campaign) => campaign.id === compareCampaignId) ??
    campaigns[1] ??
    campaigns[0];

  const totalTraffic = useMemo(() => sumTraffic(trafficRows), [trafficRows]);
  const funnelSteps = useMemo(() => getFunnelSteps(trafficRows), [trafficRows]);
  const dropOffData = useMemo(() => getDropOffData(trafficRows), [trafficRows]);
  const channelPerformance = useMemo(
    () => getChannelPerformance(trafficRows),
    [trafficRows]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <CampaignSelect
              campaignId={campaignId}
              setCampaignId={(id) => {
                setCampaignId(id);
              }}
              label={isCompareMode ? "Campagne A" : "Campagne"}
            />

            {isCompareMode && (
              <CampaignSelect
                campaignId={compareCampaignId}
                setCampaignId={setCompareCampaignId}
                label="Campagne B"
              />
            )}

            <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
              <input
                type="checkbox"
                checked={isCompareMode}
                onChange={(e) => setIsCompareMode(e.target.checked)}
              />
              Vergelijk campagnes
            </label>
          </div>

          <div className="text-sm text-muted-foreground">
            Winkelcentrum:{" "}
            <span className="font-medium text-foreground">
              {centrumNieuwVennep.name}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Kliks / QR scans" value={totalTraffic.clicks.toLocaleString("nl-NL")} tone="primary" />
        <Kpi label="Landingspagina" value={totalTraffic.landingPageVisits.toLocaleString("nl-NL")} tone="primary" />
        <Kpi label="Formulier afgerond" value={totalTraffic.formSubmits.toLocaleString("nl-NL")} tone="accent" />
        <Kpi label="Landing conversie" value={fmtPct(pct(totalTraffic.formSubmits, totalTraffic.landingPageVisits))} tone="accent" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Performance funnel" info="Van klik/QR-scan naar opgehaalde prijs.">
          <div className="h-80">
            <ResponsiveContainer>
              {isCompareMode ? (
                <BarChart data={compareFunnelSteps} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={170} />
                  <RTooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="campagneA" name={selectedCampaign.name} fill="#0B0989" radius={[0, 6, 6, 0]} />
                  <Bar dataKey="campagneB" name={compareCampaign.name} fill="#00E5AC" radius={[0, 6, 6, 0]} />
                </BarChart>
              ) : (
                <BarChart data={funnelSteps} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={170} />
                  <RTooltip />
                  <Bar dataKey="value" name="Aantal" fill="#0B0989" radius={[0, 6, 6, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Afhaakmomenten" info="Laat zien hoeveel consumenten per stap afhaken.">
          <div className="h-80">
            <ResponsiveContainer>
              {isCompareMode ? (
                <BarChart data={compareDropOffData} margin={{ left: 0, right: 16, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="step" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={90} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <RTooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="campagneA" name={selectedCampaign.name} fill="#0B0989" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="campagneB" name={compareCampaign.name} fill="#00E5AC" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={dropOffData} margin={{ left: 0, right: 16, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="step" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={90} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip formatter={(value, name) => [value, name === "dropOff" ? "Afhakers" : name]} />
                  <Bar dataKey="dropOff" name="Afhakers" fill="#00E5AC" radius={[6, 6, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Kanaal performance" info="Vergelijkt waar consumenten vandaan komen en welk kanaal het beste converteert.">
        <div className="overflow-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Kanaal</TableHead>
                <TableHead className="text-right">Kliks/scans</TableHead>
                <TableHead className="text-right">Landing</TableHead>
                <TableHead className="text-right">Formulier start</TableHead>
                <TableHead className="text-right">Formulier afgerond</TableHead>
                <TableHead className="text-right">Prijs gewonnen</TableHead>
                <TableHead className="text-right">Prijs opgehaald</TableHead>
                <TableHead className="text-right">Landing conv.</TableHead>
                <TableHead className="text-right">Formulier conv.</TableHead>
                <TableHead className="text-right">Redeem rate</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {channelPerformance.map((row) => (
                <TableRow key={row.source}>
                  <TableCell className="font-medium">{row.source}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.clicks}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.landingPageVisits}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.formStarts}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.formSubmits}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.couponWins}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.redeemed}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(row.landingRate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(row.formSubmitRate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(row.redeemRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ChartCard>
    </div>
  );
}

/* ───────────────────────────── ROOT ───────────────────────────── */

type Tab = "centrum" | "winkelier" | "performance";

export default function Index() {
  const [tab, setTab] = useState<Tab>("centrum");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Coupon Campagne Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {centrumNieuwVennep.name} · OBM &amp; StoreTime
            </p>
          </div>
          <nav className="flex gap-1 rounded-lg bg-muted p-1">
            {([
              ["centrum", "Centrum Overzicht"],
              ["winkelier", "Winkelier"],
              ["performance", "Performance"],
            ] as [Tab, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                  tab === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="container py-6">
        {tab === "centrum" && <CentrumView />}
        {tab === "winkelier" && <WinkelierView />}
        {tab === "performance" && <PerformanceView />}
      </main>

      <footer className="container py-8 text-xs text-muted-foreground">
        <details className="rounded-md border bg-card p-4">
          <summary className="cursor-pointer font-medium text-foreground">Over dit dashboard / definities</summary>
          <div className="mt-3 space-y-2">
            <p><strong>Bron:</strong> Excel dataset (1 rij = 1 coupon-actie/registratie), ingelezen als JSON.</p>
            <p><strong>Totaal winkels:</strong> aantal winkels binnen het gekoppelde winkelcentrum.</p>
            <p><strong>Deelnemende winkels:</strong> aantal winkels dat gekoppeld is aan de geselecteerde campagne.</p>
            <p><strong>Segmentoverzicht:</strong> verdeling van deelnemende winkels op basis van winkelsegment.</p>
            <p><strong>Coupons gewonnen:</strong> Prijsgewonnen = TRUE, óf status ∈ {"{won, redeemed}"}.</p>
            <p><strong>Coupons ingewisseld:</strong> status = redeemed.</p>
            <p><strong>Redeem rate:</strong> ingewisseld ÷ gewonnen.</p>
            <p><strong>Time-to-redeem:</strong> Datum opgehaald − Datum uitgeleverd (alleen indien beide gevuld).</p>
            <p><strong>Niet volledig meetbaar:</strong> Cross-store flow (winkel_uitgever → winkel_inwissel) wordt alleen getoond als de uitgeverskolom voldoende compleet is.</p>
          </div>
        </details>
      </footer>
    </div>
  );
}
