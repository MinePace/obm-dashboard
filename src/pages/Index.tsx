import { useMemo, useState } from "react";
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
} from "recharts";
import { Info, Download } from "lucide-react";
import {
  applyFilters,
  campaigns,
  exportCsv,
  Filters,
  fmtPct,
  isClaimed,
  isRedeemed,
  isWon,
  pct,
  uniqueSorted,
} from "@/lib/campaign";
import { Kpi } from "@/components/Kpi";

type Campaign = (typeof campaigns)[number];

const CHART_COLORS = [
  "#0B0989",
  "#00E5AC",
  "#1E1E1E",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function getStats(rows: Campaign["rows"], totalCouponsIssued: number) {
  const won = rows.filter(isWon).length;
  const claimed = rows.filter(isClaimed).length;
  const redeemed = rows.filter(isRedeemed).length;

  return {
    issued: totalCouponsIssued,
    won,
    claimed,
    redeemed,
    winRate: pct(won, totalCouponsIssued),
    claimRate: pct(claimed, won),
    redeemRate: pct(redeemed, won),
  };
}

function getRedeemTrend(rows: Campaign["rows"]) {
  const byWeek = new Map<string, number>();

  for (const r of rows) {
    const d = r["Datum uitgeleverd"];
    if (!d) continue;

    const dt = new Date(d);
    const day = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() - (day - 1));

    const key = dt.toISOString().slice(0, 10);
    byWeek.set(key, (byWeek.get(key) || 0) + 1);
  }

  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, value]) => ({ week, ingewisseld: value }));
}

function mergeTrends(
  trendA: { week: string; ingewisseld: number }[],
  trendB: { week: string; ingewisseld: number }[],
  labelA = "Campagne A",
  labelB = "Campagne B",
) {
  const weeks = Array.from(new Set([...trendA.map((t) => t.week), ...trendB.map((t) => t.week)])).sort();

  return weeks.map((week) => ({
    week,
    [labelA]: trendA.find((t) => t.week === week)?.ingewisseld ?? 0,
    [labelB]: trendB.find((t) => t.week === week)?.ingewisseld ?? 0,
  }));
}

function getTopWinkels(rows: Campaign["rows"]) {
  const m = new Map<string, { winkel: string; gewonnen: number; ingewisseld: number }>();

  for (const r of rows) {
    const w = r.winkel_inwissel;
    if (!w) continue;

    const e = m.get(w) || { winkel: w, gewonnen: 0, ingewisseld: 0 };
    if (isWon(r)) e.gewonnen += 1;
    if (isRedeemed(r)) e.ingewisseld += 1;
    m.set(w, e);
  }

  return Array.from(m.values()).sort((a, b) => b.ingewisseld - a.ingewisseld);
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
          <Label className="text-xs">Kanaal</Label>
          <Select
            value={filters.kanaal || ALL}
            onValueChange={(v) => update("kanaal", v === ALL ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle</SelectItem>
              {options.kanalen.map((w) => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function CampaignControls({
  isCompareMode,
  setIsCompareMode,
  campaignAId,
  setCampaignAId,
  campaignBId,
  setCampaignBId,
}: {
  isCompareMode: boolean;
  setIsCompareMode: (value: boolean) => void;
  campaignAId: string;
  setCampaignAId: (id: string) => void;
  campaignBId: string;
  setCampaignBId: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent className="grid gap-4 p-4 md:grid-cols-3">
        <label className="flex items-center gap-3 rounded-md border bg-secondary/40 px-4 py-3">
          <input
            type="checkbox"
            checked={isCompareMode}
            onChange={(e) => setIsCompareMode(e.target.checked)}
            className="h-4 w-4 accent-[#0B0989]"
          />
          <span className="text-sm font-medium">Vergelijk campagnes</span>
        </label>

        <div className="space-y-1.5">
          <Label className="text-xs">{isCompareMode ? "Campagne A" : "Campagne"}</Label>
          <Select value={campaignAId} onValueChange={setCampaignAId}>
            <SelectTrigger>
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

        {isCompareMode && (
          <div className="space-y-1.5">
            <Label className="text-xs">Campagne B</Label>
            <Select value={campaignBId} onValueChange={setCampaignBId}>
              <SelectTrigger>
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
        )}
      </CardContent>
    </Card>
  );
}

function InfoTip({ children }: { children: React.ReactNode }) {
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
  children: React.ReactNode;
  action?: React.ReactNode;
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

function CompareKpiTable({
  campaignA,
  campaignB,
  statsA,
  statsB,
}: {
  campaignA: Campaign;
  campaignB: Campaign;
  statsA: ReturnType<typeof getStats>;
  statsB: ReturnType<typeof getStats>;
}) {
  const rows = [
    {
      label: "Coupons uitgegeven",
      a: statsA.issued.toLocaleString("nl-NL"),
      b: statsB.issued.toLocaleString("nl-NL"),
      diff: (statsB.issued - statsA.issued).toLocaleString("nl-NL"),
    },
    {
      label: "Coupons gewonnen",
      a: statsA.won.toLocaleString("nl-NL"),
      b: statsB.won.toLocaleString("nl-NL"),
      diff: (statsB.won - statsA.won).toLocaleString("nl-NL"),
    },
    {
      label: "Coupons claimed",
      a: statsA.claimed.toLocaleString("nl-NL"),
      b: statsB.claimed.toLocaleString("nl-NL"),
      diff: (statsB.claimed - statsA.claimed).toLocaleString("nl-NL"),
    },
    {
      label: "Coupons ingewisseld",
      a: statsA.redeemed.toLocaleString("nl-NL"),
      b: statsB.redeemed.toLocaleString("nl-NL"),
      diff: (statsB.redeemed - statsA.redeemed).toLocaleString("nl-NL"),
    },
    {
      label: "Win rate",
      a: fmtPct(statsA.winRate),
      b: fmtPct(statsB.winRate),
      diff: fmtPct(statsB.winRate - statsA.winRate),
    },
    {
      label: "Redeem rate",
      a: fmtPct(statsA.redeemRate),
      b: fmtPct(statsB.redeemRate),
      diff: fmtPct(statsB.redeemRate - statsA.redeemRate),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Campagne vergelijking</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>KPI</TableHead>
                <TableHead className="text-right">{campaignA.name}</TableHead>
                <TableHead className="text-right">{campaignB.name}</TableHead>
                <TableHead className="text-right">Verschil B - A</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.a}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.b}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.diff}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────────── OBM VIEW ───────────────────────────── */

function ObmView({
  campaignA,
  campaignB,
  isCompareMode,
}: {
  campaignA: Campaign;
  campaignB: Campaign;
  isCompareMode: boolean;
}) {
  const [filters, setFilters] = useState<Filters>({});

  const data = campaignA.rows;
  const dataB = campaignB.rows;

  const options = useMemo(
    () => ({
      winkels: uniqueSorted([...data.map((r) => r.winkel_inwissel), ...dataB.map((r) => r.winkel_inwissel)]),
      coupon_types: uniqueSorted([...data.map((r) => r.coupon_type), ...dataB.map((r) => r.coupon_type)]),
      leeftijden: uniqueSorted([...data.map((r) => r.leeftijdsgroep), ...dataB.map((r) => r.leeftijdsgroep)]),
      kanalen: uniqueSorted([...data.map((r) => r.kanaal), ...dataB.map((r) => r.kanaal)]),
    }),
    [data, dataB],
  );

  const filtered = useMemo(() => applyFilters(data, filters), [data, filters]);
  const filteredB = useMemo(() => applyFilters(dataB, filters), [dataB, filters]);

  const stats = getStats(filtered, campaignA.totalCouponsIssued);
  const statsB = getStats(filteredB, campaignB.totalCouponsIssued);

  const trend = useMemo(() => getRedeemTrend(filtered), [filtered]);
  const trendB = useMemo(() => getRedeemTrend(filteredB), [filteredB]);
  const compareTrend = useMemo(
    () => mergeTrends(trend, trendB, campaignA.name, campaignB.name),
    [trend, trendB, campaignA.name, campaignB.name],
  );

  const topWinkels = useMemo(() => getTopWinkels(filtered), [filtered]);
  const topWinkelsB = useMemo(() => getTopWinkels(filteredB), [filteredB]);

  const compareWinkels = useMemo(() => {
    const all = Array.from(new Set([...topWinkels.map((w) => w.winkel), ...topWinkelsB.map((w) => w.winkel)]));

    return all
      .map((winkel) => {
        const a = topWinkels.find((w) => w.winkel === winkel);
        const b = topWinkelsB.find((w) => w.winkel === winkel);

        return {
          winkel,
          [`${campaignA.name} gewonnen`]: a?.gewonnen ?? 0,
          [`${campaignA.name} ingewisseld`]: a?.ingewisseld ?? 0,
          [`${campaignB.name} gewonnen`]: b?.gewonnen ?? 0,
          [`${campaignB.name} ingewisseld`]: b?.ingewisseld ?? 0,
          verschil: (b?.ingewisseld ?? 0) - (a?.ingewisseld ?? 0),
        };
      })
      .sort((a, b) => Math.abs(b.verschil) - Math.abs(a.verschil));
  }, [topWinkels, topWinkelsB, campaignA.name, campaignB.name]);

  const ageGender = useMemo(() => {
    const ages = uniqueSorted(filtered.filter(isWon).map((r) => r.leeftijdsgroep));
    const genders = uniqueSorted(filtered.filter(isWon).map((r) => r["Wat is uw geslacht"]));

    return ages.map((a) => {
      const row: Record<string, string | number> = { leeftijd: a };
      for (const g of genders) {
        row[g] = filtered.filter(
          (r) => isWon(r) && r.leeftijdsgroep === a && r["Wat is uw geslacht"] === g,
        ).length;
      }
      return row;
    });
  }, [filtered]);

  const genders = useMemo(
    () => uniqueSorted(filtered.filter(isWon).map((r) => r["Wat is uw geslacht"])),
    [filtered],
  );

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} setFilters={setFilters} options={options} />

      {!isCompareMode ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Coupons uitgegeven"
              value={stats.issued.toLocaleString("nl-NL")}
              hint="Totaal aantal uitgegeven coupons"
              tone="primary"
            />
            <Kpi
              label="Coupons gewonnen"
              value={stats.won.toLocaleString("nl-NL")}
              hint="Prijsgewonnen of status won/claimed/redeemed"
              tone="primary"
            />
            <Kpi
              label="Coupons ingewisseld"
              value={stats.redeemed.toLocaleString("nl-NL")}
              hint="status = redeemed"
              tone="accent"
            />
            <Kpi
              label="Redeem rate"
              value={fmtPct(stats.redeemRate)}
              hint="ingewisseld ÷ gewonnen"
              tone="success"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Inwisselingen per week" info="Op basis van 'Datum opgehaald'.">
              <div className="h-72">
                <ResponsiveContainer>
                  <LineChart data={trend} margin={{ left: 0, right: 16, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip />
                    <Line type="monotone" dataKey="ingewisseld" stroke="#00E5AC" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Deelname per leeftijd × gender" info="Gewonnen coupons.">
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={ageGender}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="leeftijd" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {genders.map((g, i) => (
                      <Bar key={g} dataKey={g} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </BarChart>
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
        </>
      ) : (
        <>
          <CompareKpiTable campaignA={campaignA} campaignB={campaignB} statsA={stats} statsB={statsB} />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Kpi label="A redeem rate" value={fmtPct(stats.redeemRate)} hint={campaignA.name} tone="primary" />
            <Kpi label="B redeem rate" value={fmtPct(statsB.redeemRate)} hint={campaignB.name} tone="accent" />
            <Kpi label="Verschil inwisselingen" value={(statsB.redeemed - stats.redeemed).toLocaleString("nl-NL")} hint="Campagne B - Campagne A" tone="success" />
            <Kpi label="Verschil redeem rate" value={fmtPct(statsB.redeemRate - stats.redeemRate)} hint="Campagne B - Campagne A" tone="success" />
          </div>

          <ChartCard title="Inwisselingen per week — vergelijking" info="Beide campagnes met dezelfde filters.">
            <div className="h-80">
              <ResponsiveContainer>
                <LineChart data={compareTrend} margin={{ left: 0, right: 16, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey={campaignA.name} stroke="#0B0989" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey={campaignB.name} stroke="#00E5AC" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Winkels — vergelijking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[480px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted">
                    <TableRow>
                      <TableHead>Winkel</TableHead>
                      <TableHead className="text-right">A gewonnen</TableHead>
                      <TableHead className="text-right">A ingewisseld</TableHead>
                      <TableHead className="text-right">B gewonnen</TableHead>
                      <TableHead className="text-right">B ingewisseld</TableHead>
                      <TableHead className="text-right">Verschil</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compareWinkels.map((w) => (
                      <TableRow key={w.winkel}>
                        <TableCell className="font-medium">{w.winkel}</TableCell>
                        <TableCell className="text-right tabular-nums">{w[`${campaignA.name} gewonnen`]}</TableCell>
                        <TableCell className="text-right tabular-nums">{w[`${campaignA.name} ingewisseld`]}</TableCell>
                        <TableCell className="text-right tabular-nums">{w[`${campaignB.name} gewonnen`]}</TableCell>
                        <TableCell className="text-right tabular-nums">{w[`${campaignB.name} ingewisseld`]}</TableCell>
                        <TableCell className="text-right tabular-nums">{w.verschil}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* ─────────────────────── WINKELIER VIEW ─────────────────────── */

function WinkelierView({
  campaignA,
  campaignB,
  isCompareMode,
}: {
  campaignA: Campaign;
  campaignB: Campaign;
  isCompareMode: boolean;
}) {
  const winkels = useMemo(
    () => uniqueSorted([...campaignA.rows.map((r) => r.winkel_inwissel), ...campaignB.rows.map((r) => r.winkel_inwissel)]),
    [campaignA.rows, campaignB.rows],
  );

  const [winkel, setWinkel] = useState<string>(winkels[0] ?? "");

  const rows = useMemo(
    () => campaignA.rows.filter((r) => r.winkel_inwissel === winkel),
    [campaignA.rows, winkel],
  );

  const rowsB = useMemo(
    () => campaignB.rows.filter((r) => r.winkel_inwissel === winkel),
    [campaignB.rows, winkel],
  );

  const stats = getStats(rows, campaignA.totalCouponsIssued);
  const statsB = getStats(rowsB, campaignB.totalCouponsIssued);

  const perf = useMemo(() => {
    const m = new Map<string, { key: string; type: string; waarde: string; gewonnen: number; ingewisseld: number }>();
    for (const r of rows) {
      if (!r.coupon_type || !r.coupon_waarde) continue;
      const key = `${r.coupon_type} — ${r.coupon_waarde}`;
      const e = m.get(key) || { key, type: r.coupon_type, waarde: r.coupon_waarde, gewonnen: 0, ingewisseld: 0 };
      if (isWon(r)) e.gewonnen += 1;
      if (isRedeemed(r)) e.ingewisseld += 1;
      m.set(key, e);
    }
    return Array.from(m.values()).sort((a, b) => b.gewonnen - a.gewonnen);
  }, [rows]);

  const trend = useMemo(() => getRedeemTrend(rows.filter(isRedeemed)), [rows]);
  const trendB = useMemo(() => getRedeemTrend(rowsB.filter(isRedeemed)), [rowsB]);
  const compareTrend = useMemo(
    () => mergeTrends(trend, trendB, campaignA.name, campaignB.name),
    [trend, trendB, campaignA.name, campaignB.name],
  );

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
      if (r["Datum opgehaald"]) dayMap.set(r["Datum opgehaald"], (dayMap.get(r["Datum opgehaald"]) || 0) + 1);
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
          <div className="space-y-1.5">
            <Label className="text-xs">Kies winkel</Label>
            <Select value={winkel} onValueChange={setWinkel}>
              <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {winkels.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
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
                `${winkel}-prijs-performance.csv`,
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </CardContent>
      </Card>

      {!isCompareMode ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Kpi label="Gewonnen" value={stats.won} tone="primary" />
            <Kpi label="Claimed" value={stats.claimed} />
            <Kpi label="Ingewisseld" value={stats.redeemed} tone="accent" />
            <Kpi label="Redeem rate" value={fmtPct(stats.redeemRate)} tone="success" />
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
        </>
      ) : (
        <>
          <CompareKpiTable campaignA={campaignA} campaignB={campaignB} statsA={stats} statsB={statsB} />

          <ChartCard title={`Inwisselingen over tijd — ${winkel}`} info="Zelfde winkel vergeleken tussen beide campagnes.">
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={compareTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey={campaignA.name} stroke="#0B0989" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey={campaignB.name} stroke="#00E5AC" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </>
      )}

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

/* ─────────────────────────── FLOW VIEW ─────────────────────────── */

function FlowView({
  campaignA,
  campaignB,
  isCompareMode,
}: {
  campaignA: Campaign;
  campaignB: Campaign;
  isCompareMode: boolean;
}) {
  const stats = getStats(campaignA.rows, campaignA.totalCouponsIssued);
  const statsB = getStats(campaignB.rows, campaignB.totalCouponsIssued);

  const wonRows = campaignA.rows.filter(isWon);
  const uitgeverFilled = wonRows.filter((r) => r.winkel_uitgever).length;
  const reliable = uitgeverFilled / Math.max(wonRows.length, 1) > 0.9;

  const funnelData = [
    { stap: "Won", [campaignA.name]: stats.won, [campaignB.name]: statsB.won },
    { stap: "Claimed", [campaignA.name]: stats.claimed, [campaignB.name]: statsB.claimed },
    { stap: "Redeemed", [campaignA.name]: stats.redeemed, [campaignB.name]: statsB.redeemed },
  ];

  return (
    <div className="space-y-6">
      {!isCompareMode ? (
        <ChartCard title="Funnel: Won → Claimed → Redeemed" info="Aantallen per status.">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Won", v: stats.won, color: "#0B0989" },
              { label: "Claimed", v: stats.claimed, color: "#1E1E1E" },
              { label: "Redeemed", v: stats.redeemed, color: "#00E5AC" },
            ].map((s, i, arr) => {
              const prev = i === 0 ? s.v : arr[i - 1].v;
              return (
                <Card key={s.label} className="relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10" style={{ background: s.color }} />
                  <CardContent className="relative p-6">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                    <div className="mt-2 text-4xl font-semibold tabular-nums">{s.v.toLocaleString("nl-NL")}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {i === 0 ? "Startpunt" : `${fmtPct(pct(s.v, prev))} t.o.v. vorige stap`}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ChartCard>
      ) : (
        <>
          <CompareKpiTable campaignA={campaignA} campaignB={campaignB} statsA={stats} statsB={statsB} />

          <ChartCard title="Funnel vergelijking" info="Won, claimed en redeemed naast elkaar per campagne.">
            <div className="h-80">
              <ResponsiveContainer>
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="stap" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey={campaignA.name} fill="#0B0989" radius={[6, 6, 0, 0]} />
                  <Bar dataKey={campaignB.name} fill="#00E5AC" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </>
      )}

      <ChartCard title="Cross-store: uitgever → inwisselaar" info="Toont alleen bij voldoende databetrouwbaarheid.">
        {reliable ? (
          <div className="text-sm">Cross-store data is voldoende compleet — visualisatie volgt in v2.</div>
        ) : (
          <div className="rounded-md border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            Niet meetbaar met huidige data — <span className="font-medium">winkel_uitgever</span> is{" "}
            {fmtPct(pct(uitgeverFilled, wonRows.length))} gevuld voor gewonnen coupons.
          </div>
        )}
      </ChartCard>
    </div>
  );
}

/* ───────────────────────────── ROOT ───────────────────────────── */

type Tab = "obm" | "winkelier" | "flow";

export default function Index() {
  const [tab, setTab] = useState<Tab>("obm");
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [campaignAId, setCampaignAId] = useState(campaigns[0].id);
  const [campaignBId, setCampaignBId] = useState(campaigns[1]?.id ?? campaigns[0].id);

  const campaignA = campaigns.find((c) => c.id === campaignAId) ?? campaigns[0];
  const campaignB = campaigns.find((c) => c.id === campaignBId) ?? campaigns[1] ?? campaigns[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Coupon Campagne Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {isCompareMode
                ? `${campaignA.name} vergelijken met ${campaignB.name}`
                : campaignA.name}
            </p>
          </div>
          <nav className="flex gap-1 rounded-lg bg-muted p-1">
            {([
              ["obm", "OBM Overzicht"],
              ["winkelier", "Winkelier"],
              ["flow", "Flow"],
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

      <main className="container space-y-6 py-6">
        <CampaignControls
          isCompareMode={isCompareMode}
          setIsCompareMode={setIsCompareMode}
          campaignAId={campaignAId}
          setCampaignAId={setCampaignAId}
          campaignBId={campaignBId}
          setCampaignBId={setCampaignBId}
        />

        {tab === "obm" && <ObmView campaignA={campaignA} campaignB={campaignB} isCompareMode={isCompareMode} />}
        {tab === "winkelier" && <WinkelierView campaignA={campaignA} campaignB={campaignB} isCompareMode={isCompareMode} />}
        {tab === "flow" && <FlowView campaignA={campaignA} campaignB={campaignB} isCompareMode={isCompareMode} />}
      </main>

      <footer className="container py-8 text-xs text-muted-foreground">
        <details className="rounded-md border bg-card p-4">
          <summary className="cursor-pointer font-medium text-foreground">Over dit dashboard / definities</summary>
          <div className="mt-3 space-y-2">
            <p><strong>Bron:</strong> Excel dataset (1 rij = 1 coupon-actie/registratie), ingelezen als JSON.</p>
            <p><strong>Coupons gewonnen:</strong> Prijsgewonnen = TRUE, óf status ∈ {"{won, claimed, redeemed}"}.</p>
            <p><strong>Coupons claimed:</strong> status ∈ {"{claimed, redeemed}"}.</p>
            <p><strong>Coupons ingewisseld:</strong> status = redeemed.</p>
            <p><strong>Redeem rate:</strong> ingewisseld ÷ gewonnen.</p>
            <p><strong>Time-to-redeem:</strong> Datum opgehaald − Datum uitgeleverd (alleen indien beide gevuld).</p>
            <p><strong>Niet (volledig) meetbaar:</strong> Cross-store flow (winkel_uitgever → winkel_inwissel) wordt alleen getoond als de uitgeverskolom voldoende compleet is.</p>
          </div>
        </details>
      </footer>
    </div>
  );
}
