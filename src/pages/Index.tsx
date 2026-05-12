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
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
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

/* ───────────────────────────── OBM VIEW ───────────────────────────── */

function CentrumView() {
  const [filters, setFilters] = useState<Filters>({});
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [campaignId, setCampaignId] = useState(campaigns[0].id);
  const [compareCampaignId, setCompareCampaignId] = useState(
    campaigns[1]?.id ?? campaigns[0].id
  );

  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === campaignId) ?? campaigns[0];

  const compareCampaign =
  campaigns.find((campaign) => campaign.id === compareCampaignId) ?? campaigns[1] ?? campaigns[0];

  const compareData = compareCampaign.rows;
  const compareFiltered = useMemo(
    () => applyFilters(compareData, filters),
    [compareData, filters]
  );

  const compareWon = compareFiltered.filter(isWon).length;
  const compareRedeemed = compareFiltered.filter(isRedeemed).length;
  const compareRedeemRate = pct(compareRedeemed, compareWon);

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
      winkels: uniqueSorted(data.map((r) => r.winkel_inwissel || r.winkel_uitgever)),
      coupon_types: uniqueSorted(data.map((r) => r.coupon_type)),
      leeftijden: uniqueSorted(data.map((r) => r.leeftijdsgroep)),
      kanalen: uniqueSorted(data.map((r) => r.kanaal)),
      segments: uniqueSorted(
        centrumNieuwVennep.stores.map((s) => s.segment)
      ),
    }),
    [data],
  );

  const filtered = useMemo(() => applyFilters(data, filters), [data, filters]);

  const won = filtered.filter(isWon).length;
  const claimed = filtered.filter(isClaimed).length;
  const redeemed = filtered.filter(isRedeemed).length;
  const redeemRate = pct(redeemed, won);

  const trend = useMemo(() => {
    const byWeek = new Map<string, number>();

    for (const r of filtered) {
      const d = r["datum_uitgeleverd"];
      if (!d) continue;

      const key = getWeekStart(d);
      if (!key) continue;

      byWeek.set(key, (byWeek.get(key) || 0) + 1);
    }

    return Array.from(byWeek.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, value]) => ({ week, aanmeldingen: value }));
  }, [filtered]);

  const topWinkels = useMemo(() => {
    const m = new Map<string, { winkel: string; gewonnen: number; ingewisseld: number }>();

    for (const r of filtered) {
      const w = r.winkel_inwissel || r.winkel_uitgever;
      if (!w) continue;

      const e = m.get(w) || { winkel: w, gewonnen: 0, ingewisseld: 0 };
      if (isWon(r)) e.gewonnen += 1;
      if (isRedeemed(r)) e.ingewisseld += 1;
      m.set(w, e);
    }

    return Array.from(m.values()).sort((a, b) => b.ingewisseld - a.ingewisseld);
  }, [filtered]);

  const ageGender = useMemo(() => {
    const ages = uniqueSorted(filtered.filter(isWon).map((r) => r.leeftijdsgroep));
    const genders = uniqueSorted(filtered.filter(isWon).map((r) => r["wat_is_uw_geslacht"]));

    return ages.map((a) => {
      const row: Record<string, string | number> = { leeftijd: a };
      for (const g of genders) {
        row[g] = filtered.filter(
          (r) => isWon(r) && r.leeftijdsgroep === a && r["wat_is_uw_geslacht"] === g,
        ).length;
      }
      return row;
    });
  }, [filtered]);

  const genders = useMemo(() => {
    const preferredOrder = ["Man", "Vrouw", "Onbekend"];

    return preferredOrder.filter((gender) =>
      filtered.some((r) => isWon(r) && r["wat_is_uw_geslacht"] === gender)
    );
  }, [filtered]);

  const genderPieData = useMemo(() => {
    if (!filters.leeftijdsgroep) return [];

    return genders
      .map((gender) => ({
        name: gender,
        value: filtered.filter(
          (r) =>
            isWon(r) &&
            r.leeftijdsgroep === filters.leeftijdsgroep &&
            r.wat_is_uw_geslacht === gender
        ).length,
      }))
      .filter((item) => item.value > 0);
  }, [filtered, filters.leeftijdsgroep, genders]);

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
              label={isCompareMode ? "Campagne A" : "Campagne"}
            />

            {isCompareMode && (
              <CampaignSelect
                campaignId={compareCampaignId}
                setCampaignId={setCompareCampaignId}
                label="Campagne B"
              />
            )}
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
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Vergelijken</h2>

              <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
                <input
                  type="checkbox"
                  checked={isCompareMode}
                  onChange={(e) => setIsCompareMode(e.target.checked)}
                />
                Vergelijk campagnes
              </label>
          </div>
        </CardContent>
      </Card>


      <FilterBar filters={filters} setFilters={setFilters} options={options} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-8">
        <Kpi
          label="Totaal winkels"
          value={centrumNieuwVennep.totalStores.toLocaleString("nl-NL")}
          hint="Aantal winkels in het centrum"
          tone="primary"
        />
        <Kpi
          label="Deelnemende winkels"
          value={participatingStores.length.toLocaleString("nl-NL")}
          hint="Aantal winkels dat meedoet aan deze campagne"
          tone="accent"
        />
        <Kpi
          label="Totaal prijzen"
          value="4976"
          hint="Totaal aantal prijzen binnen de lopende campagne"
          tone="accent"
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
          tone="primary"
        />
        <Kpi
          label="Prijs gewonnen"
          value={won.toLocaleString("nl-NL")}
          hint="prijs_gewonnen of status claimed/redeemed"
          tone="primary"
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
          tone="success"
        />
      </div>

      {isCompareMode && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Vergelijking: {selectedCampaign.name} vs {compareCampaign.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>KPI</TableHead>
                  <TableHead className="text-right">{selectedCampaign.name}</TableHead>
                  <TableHead className="text-right">{compareCampaign.name}</TableHead>
                  <TableHead className="text-right">Verschil</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Coupons gewonnen</TableCell>
                  <TableCell className="text-right">{won}</TableCell>
                  <TableCell className="text-right">{compareWon}</TableCell>
                  <TableCell className="text-right">{won - compareWon}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Coupons ingewisseld</TableCell>
                  <TableCell className="text-right">{redeemed}</TableCell>
                  <TableCell className="text-right">{compareRedeemed}</TableCell>
                  <TableCell className="text-right">{redeemed - compareRedeemed}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Redeem rate</TableCell>
                  <TableCell className="text-right">{fmtPct(redeemRate)}</TableCell>
                  <TableCell className="text-right">{fmtPct(compareRedeemRate)}</TableCell>
                  <TableCell className="text-right">
                    {fmtPct(redeemRate - compareRedeemRate)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )}

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Aanmeldingen per week" info="Op basis van 'datum_uitgeleverd'.">
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ left: 0, right: 16, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip />
                <Line type="monotone" dataKey="aanmeldingen" stroke="#00E5AC" strokeWidth={2.5} dot={false} />
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
                <Bar dataKey="count" name="Aantal winkels" fill="#0B0989" radius={[6, 6, 0, 0]} />
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
          info="Gewonnen coupons."
        >
          <div className="h-72">
            <ResponsiveContainer>
              {filters.leeftijdsgroep ? (
                <PieChart>
                  <Pie
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
              <Bar dataKey="ingewisseld" fill="#0B0989" radius={[0, 6, 6, 0]} />
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
      if (!r.coupon_type) continue;

      const waarde = r.coupon_waarde || "-";
      const key = `${r.coupon_type} — ${waarde}`;

      const e = m.get(key) || {
        key,
        type: r.coupon_type,
        waarde,
        gewonnen: 0,
        ingewisseld: 0,
      };

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
            <p><strong>Coupons gewonnen:</strong> prijs_gewonnen = TRUE, óf status ∈ {"{won, redeemed}"}.</p>
            <p><strong>Coupons ingewisseld:</strong> status = redeemed.</p>
            <p><strong>Redeem rate:</strong> ingewisseld ÷ gewonnen.</p>
            <p><strong>Time-to-redeem:</strong> datum_opgehaald − datum_uitgeleverd (alleen indien beide gevuld).</p>
            <p><strong>Niet volledig meetbaar:</strong> Cross-store flow (winkel_uitgever → winkel_inwissel) wordt alleen getoond als de uitgeverskolom voldoende compleet is.</p>
          </div>
        </details>
      </footer>
    </div>
  );
}
