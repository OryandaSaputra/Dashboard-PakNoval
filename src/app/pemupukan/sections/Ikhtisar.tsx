import SectionHeader from "../components/SectionHeader";
import ScopeCard from "../components/ScopeCard";
import { Card, CardContent } from "@/components/ui/card";
import StatLine from "../components/StatLine";
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  type LucideIcon, // <-- penting: tipe ikon
} from "lucide-react";

export default function Ikhtisar({
  totals,
  realisasiHarian = 0,
  rencanaBesok = 0,
  tanggalHariIni,
  tanggalBesok,
}: {
  totals: {
    totalRencana: number; totalRealisasi: number;
    tmRencana: number; tmRealisasi: number;
    tbmRencana: number; tbmRealisasi: number;
    bibRencana: number; bibRealisasi: number;
    dtmRencana: number; dbrRencana: number;
    dtmRealisasi: number; dbrRealisasi: number;
  };
  realisasiHarian?: number;
  rencanaBesok?: number;
  tanggalHariIni?: string;
  tanggalBesok?: string;
}) {
  const {
    totalRencana, totalRealisasi,
    tmRencana, tmRealisasi,
    tbmRencana, tbmRealisasi,
    bibRencana, bibRealisasi,
    dtmRencana, dbrRencana,
    dtmRealisasi, dbrRealisasi,
  } = totals;

  const num = (v: number) => v.toLocaleString("id-ID");
  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short" });
  };

  const labelHarian = `Realisasi Harian${tanggalHariIni ? ` (${fmtDate(tanggalHariIni)})` : ""} (Kg)`;
  const labelRencana = `Rencana Besok${tanggalBesok ? ` (${fmtDate(tanggalBesok)})` : ""} (Kg)`;

  const pct = rencanaBesok > 0 ? (realisasiHarian / rencanaBesok) * 100 : 0;
  const deltaKg = realisasiHarian - rencanaBesok;

  type Tone = "good" | "warn" | "bad" | "neutral";
  const tone: Tone =
    rencanaBesok <= 0 ? "neutral" : pct >= 100 ? "good" : pct >= 80 ? "warn" : "bad";

  // === HAPUS 'any' DI SINI: pakai LucideIcon ===
  type ToneSpec = {
    ring: string; bg: string; bar: string; text: string; strip: string;
    IconMain: LucideIcon;
    IconDeltaUp: LucideIcon;
    IconDeltaDown: LucideIcon;
  };

  const toneMap: Record<Tone, ToneSpec> = {
    good: {
      ring: "ring-emerald-200/70 dark:ring-emerald-900",
      bg: "bg-emerald-50/60 dark:bg-emerald-950/30",
      bar: "bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-300",
      strip: "bg-emerald-500",
      IconMain: CheckCircle2,
      IconDeltaUp: TrendingUp,
      IconDeltaDown: TrendingDown,
    },
    warn: {
      ring: "ring-amber-200/70 dark:ring-amber-900",
      bg: "bg-amber-50/60 dark:bg-amber-950/30",
      bar: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      strip: "bg-amber-500",
      IconMain: AlertTriangle,
      IconDeltaUp: TrendingUp,
      IconDeltaDown: TrendingDown,
    },
    bad: {
      ring: "ring-rose-200/70 dark:ring-rose-900",
      bg: "bg-rose-50/60 dark:bg-rose-950/30",
      bar: "bg-rose-500",
      text: "text-rose-700 dark:text-rose-300",
      strip: "bg-rose-500",
      IconMain: TrendingDown,
      IconDeltaUp: TrendingUp,
      IconDeltaDown: TrendingDown,
    },
    neutral: {
      ring: "ring-slate-200/70 dark:ring-slate-800",
      bg: "bg-white/80 dark:bg-slate-900/60",
      bar: "bg-slate-500",
      text: "text-slate-600 dark:text-slate-300",
      strip: "bg-slate-300 dark:bg-slate-700",
      IconMain: CalendarDays,
      IconDeltaUp: TrendingUp,
      IconDeltaDown: TrendingDown,
    },
  };

  const T = toneMap[tone];
  const kpiCardCx =
    "h-full shadow-sm hover:shadow-md transition-shadow rounded-2xl ring-1 " +
    "bg-white/80 dark:bg-slate-900/60 ring-slate-200/60 dark:ring-slate-800";
  const statusCardCx = `h-full shadow-sm hover:shadow-md transition-shadow rounded-2xl ring-1 ${T.ring} ${T.bg}`;
  const pctClamped = Math.max(0, Math.min(100, Math.round(pct)));

  return (
    <section className="space-y-4">
      <SectionHeader title="Ikhtisar" desc="Dibagi berdasarkan TM, TBM, dan Bibitan" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ScopeCard scope="TM" rencana={tmRencana} realisasi={tmRealisasi} />
        <ScopeCard scope="TBM" rencana={tbmRencana} realisasi={tbmRealisasi} />
        <ScopeCard scope="Bibitan" rencana={bibRencana} realisasi={bibRealisasi} />
      </div>

      <div
        className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        role="region"
        aria-label="Ringkasan KPI"
      >
        <Card className={kpiCardCx}>
          <CardContent className="pt-4 pb-3">
            <StatLine label="Total Rencana (Kg)" value={num(totalRencana)} />
          </CardContent>
        </Card>

        <Card className={kpiCardCx}>
          <CardContent className="pt-4 pb-3">
            <StatLine label="Total Realisasi (Kg)" value={num(totalRealisasi)} />
          </CardContent>
        </Card>

        <Card className={kpiCardCx}>
          <CardContent className="pt-4 pb-3">
            <StatLine label="DTM (Real/Ren)" value={`${num(dtmRealisasi)} / ${num(dtmRencana)}`} />
          </CardContent>
        </Card>

        <Card className={kpiCardCx}>
          <CardContent className="pt-4 pb-3">
            <StatLine label="DBR (Real/Ren)" value={`${num(dbrRealisasi)} / ${num(dbrRencana)}`} />
          </CardContent>
        </Card>

        {/* Realisasi Harian */}
        <Card className={statusCardCx} title={labelHarian}>
          <div className={`h-1 rounded-t-2xl ${T.strip}`} />
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={`flex items-center gap-2 ${T.text}`}>
                  <T.IconMain className="w-4 h-4" aria-hidden="true" />
                  <span className="text-xs font-medium truncate">{labelHarian}</span>
                </div>
                <div className="mt-1">
                  <span className="text-2xl font-semibold tracking-tight">{num(realisasiHarian)}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">Kg</span>
                </div>
              </div>

              {rencanaBesok > 0 && (
                <div className="shrink-0 text-right">
                  {deltaKg >= 0 ? (
                    <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      <TrendingUp className="w-3.5 h-3.5" />
                      +{num(deltaKg)} Kg
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                      <TrendingDown className="w-3.5 h-3.5" />
                      {num(deltaKg)} Kg
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    vs Rencana Besok
                  </div>
                </div>
              )}
            </div>

            {rencanaBesok > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>Progress</span>
                  <span className="font-medium">{pctClamped}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200/70 dark:bg-slate-800">
                  <div
                    className={`h-2 rounded-full ${T.bar} transition-[width]`}
                    style={{ width: `${pctClamped}%` }}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pctClamped}
                    role="progressbar"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rencana Besok */}
        <Card className={kpiCardCx} title={labelRencana}>
          <div className="h-1 rounded-t-2xl bg-slate-300/80 dark:bg-slate-700" />
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <CalendarDays className="w-4 h-4" aria-hidden="true" />
                  <span className="text-xs font-medium truncate">{labelRencana}</span>
                </div>
                <div className="mt-1">
                  <span className="text-2xl font-semibold tracking-tight">{num(rencanaBesok)}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">Kg</span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                </div>
                {realisasiHarian > 0 && (
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Sisa: {num(Math.max(0, rencanaBesok - realisasiHarian))} Kg
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
