"use client";

import ChartCard from "../components/ChartCard";
import SectionHeader from "../components/SectionHeader";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
} from "recharts";
import {
  COLOR_PLAN,
  COLOR_REAL,
  COLOR_REMAIN,
  COLOR_STOK,
  COLOR_SISA,
} from "../constants";
import { pctFormatter } from "../utils";
import React, { useMemo } from "react";

type PieItem = { name: string; value: number; labelText: string };
type DistrikRow = {
  distrik: string;
  progress: number;
  rencana: number;
  realisasi: number;
};
type KebunRow = {
  kebun: string;
  rencana: number;
  realisasi: number;
  progress: number;
};
type AggPupukRow = {
  jenis: string;
  rencana: number;
  realisasi: number;
  rencana_ha: number;
  realisasi_ha: number;
  progress: number;
};
type StokSisaRow = {
  distrik: string;
  stok: number;
  sisa: number;
  stok_pct: number;
  sisa_pct: number;
};

/** ====== Struktur baris tabel TM / TBM / TM&TBM ====== */
export type TmRow = {
  no?: number;
  kebun: string;
  // APLIKASI - I
  app1_rencana: number;
  app1_real: number;
  app1_pct: number;
  // APLIKASI - II
  app2_rencana: number;
  app2_real: number;
  app2_pct: number;
  // APLIKASI - III
  app3_rencana: number;
  app3_real: number;
  app3_pct: number;
  // Harian (Kg)
  renc_selasa: number; // Rencana Hari Ini
  real_selasa: number; // Realisasi Hari Ini
  renc_rabu: number; // Rencana Besok
  // Jumlah
  jumlah_rencana2025: number;
  jumlah_realSd0710: number; // Real 5 hari terakhir (total)
  jumlah_pct: number;
};

/* ===================[ TANGGAL: Asia/Jakarta helper ]=================== */
/** ISO (YYYY-MM-DD) untuk zona Asia/Jakarta */
function todayISOJakarta(base = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}
/** Tambah hari berbasis ISO (diperlakukan sebagai jam 00:00 Asia/Jakarta) */
function addDaysJakarta(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00+07:00`);
  d.setDate(d.getDate() + n);
  return todayISOJakarta(d);
}
/** 07/10/2025 dari ISO */
function isoToShort(iso?: string) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "-";
  return `${d}/${m}/${y}`;
}
/** "07 Oktober 2025" dari ISO dengan zona Asia/Jakarta */
function isoToLongID(iso?: string) {
  if (!iso) return "-";
  const d = new Date(`${iso}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
/* ===================================================================== */

/** Hitung total untuk tabel TM / TBM / TM&TBM */
function computeTotals(rows?: TmRow[] | null) {
  if (!rows || !rows.length) return null;

  const sum = (sel: (r: TmRow) => number) =>
    rows.reduce((a, r) => a + (sel(r) || 0), 0);

  const app1_rencana = sum((r) => r.app1_rencana);
  const app1_real = sum((r) => r.app1_real);
  const app2_rencana = sum((r) => r.app2_rencana);
  const app2_real = sum((r) => r.app2_real);
  const app3_rencana = sum((r) => r.app3_rencana);
  const app3_real = sum((r) => r.app3_real);

  const renc_today = sum((r) => r.renc_selasa);
  const real_today = sum((r) => r.real_selasa);
  const renc_tomorrow = sum((r) => r.renc_rabu);

  const jumlah_rencana2025 = sum((r) => r.jumlah_rencana2025);
  const jumlah_real5 = sum((r) => r.jumlah_realSd0710);

  const safePct = (real: number, rencana: number) =>
    rencana > 0 ? (real / rencana) * 100 : 0;

  return {
    app1_rencana,
    app1_real,
    app1_pct: safePct(app1_real, app1_rencana),
    app2_rencana,
    app2_real,
    app2_pct: safePct(app2_real, app2_rencana),
    app3_rencana,
    app3_real,
    app3_pct: safePct(app3_real, app3_rencana),
    renc_today,
    real_today,
    renc_tomorrow,
    jumlah_rencana2025,
    jumlah_real5,
    jumlah_pct: safePct(jumlah_real5, jumlah_rencana2025),
  };
}

export default function Visualisasi({
  pieTotal,
  barEfisiensiDistrik,
  aggPupuk,
  stokVsSisa,
  tmRows = [],
  tbmRows = [],
  tmTbmRows = [],
  // fleksibel: boleh kirim today/tomorrow atau selasa/rabu
  headerDates,
  // fleksibel: boleh kirim window start/end atau hanya cutoff (end)
  realWindow,
  realCutoffDate,
}: {
  pieTotal: PieItem[];
  barEfisiensiDistrik: DistrikRow[];
  barPerKebun?: KebunRow[]; // opsional agar kompatibel
  aggPupuk: AggPupukRow[];
  stokVsSisa: StokSisaRow[];
  tmRows?: TmRow[];
  tbmRows?: TmRow[];
  tmTbmRows?: TmRow[];
  headerDates?: {
    today?: string;
    tomorrow?: string;
    selasa?: string;
    rabu?: string;
  };
  realWindow?: { start?: string; end?: string };
  realCutoffDate?: string;
}) {
  const tooltipBg = "#FFFFFF";
  const tooltipBorder = "#E5E7EB";

  // ====== Header tanggal dinamis (hari ini/besok) ======
  const fallbackToday = todayISOJakarta();
  const todayISO = headerDates?.today ?? headerDates?.selasa ?? fallbackToday;

  const tomorrowISO =
    headerDates?.tomorrow ?? headerDates?.rabu ?? addDaysJakarta(todayISO, 1);

  // ====== Window "Real 5 Hari Terakhir" ======
  const endISO = realWindow?.end ?? realCutoffDate ?? todayISO;
  const startISO = realWindow?.start ?? addDaysJakarta(endISO, -4);

  const todayShort = isoToShort(todayISO);
  const tomorrowShort = isoToShort(tomorrowISO);
  const startLong = isoToLongID(startISO);
  const endLong = isoToLongID(endISO);

  const fmtNum = (n?: number | null) =>
    n == null ? "-" : n.toLocaleString("id-ID");
  const fmtPct = (n?: number | null) =>
    n == null
      ? "-"
      : n.toLocaleString("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

  // total TM / TBM / TM&TBM
  const totalsTM = useMemo(() => computeTotals(tmRows), [tmRows]);
  const totalsTBM = useMemo(() => computeTotals(tbmRows), [tbmRows]);
  const totalsTmTbm = useMemo(
    () => computeTotals(tmTbmRows),
    [tmTbmRows]
  );

  return (
    <section className="space-y-4">
      <SectionHeader title="Visualisasi" desc="Grafik utama" />

      {/* ===================== GRID CHART ===================== */}
      <div className="grid grid-cols-12 gap-3">
        {/* Pie komposisi */}
        <div className="col-span-12 lg:col-span-4">
          <ChartCard title="Komposisi Total (Realisasi vs Sisa Rencana)">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieTotal}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={96}
                  labelLine={false}
                  isAnimationActive={false}
                >
                  <LabelList dataKey="labelText" position="inside" />
                  <Cell fill={COLOR_REAL} />
                  <Cell fill={COLOR_REMAIN} />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Kg & Ha per jenis pupuk */}
        <div className="col-span-12 lg:col-span-4">
          <ChartCard title="Rencana vs Realisasi per Jenis Pupuk (Kg & Ha)">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={aggPupuk}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="jenis" />
                <YAxis yAxisId="kg" />
                <YAxis yAxisId="ha" orientation="right" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="kg"
                  dataKey="rencana"
                  name="Rencana (Kg)"
                  fill={COLOR_PLAN}
                />
                <Bar
                  yAxisId="kg"
                  dataKey="realisasi"
                  name="Realisasi (Kg)"
                  fill={COLOR_REAL}
                />
                <Line
                  yAxisId="ha"
                  type="monotone"
                  dataKey="rencana_ha"
                  name="Rencana (Ha)"
                  stroke={COLOR_PLAN}
                  dot={false}
                  strokeDasharray="4 2"
                />
                <Line
                  yAxisId="ha"
                  type="monotone"
                  dataKey="realisasi_ha"
                  name="Realisasi (Ha)"
                  stroke={COLOR_REAL}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Efisiensi distrik */}
        <div className="col-span-12 lg:col-span-4">
          <ChartCard title="Efisiensi per Distrik (Progress %)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barEfisiensiDistrik}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="distrik" />
                <YAxis />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="progress"
                  name="Progress (%)"
                  fill={COLOR_REAL}
                >
                  <LabelList
                    dataKey="progress"
                    position="top"
                    formatter={pctFormatter}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Stok vs sisa */}
        {stokVsSisa.length > 0 && (
          <div className="col-span-12">
            <ChartCard title="Stok Pupuk vs Sisa Kebutuhan">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={stokVsSisa}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="distrik" />
                  <YAxis />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="stok" name="Stok (Kg)" fill={COLOR_STOK}>
                    <LabelList
                      dataKey="stok_pct"
                      position="top"
                      formatter={pctFormatter}
                    />
                  </Bar>
                  <Bar
                    dataKey="sisa"
                    name="Sisa Kebutuhan (Kg)"
                    fill={COLOR_SISA}
                  >
                    <LabelList
                      dataKey="sisa_pct"
                      position="top"
                      formatter={pctFormatter}
                    />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </div>

      {/* ===================== BAGIAN TABEL (di luar ChartCard) ===================== */}
      <div className="space-y-4">
        {/* === Tabel TM === */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold mb-3">
            Tabel Rencana &amp; Realisasi Pemupukan TM
          </h3>
          <div className="overflow-auto rounded-lg border border-slate-300">
            <table className="w-full text-xs border-collapse">
              <thead className="text-[11px]">
                <tr className="bg-slate-200 text-slate-800">
                  <th
                    rowSpan={2}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    No.
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    Kebun
                  </th>

                  <th
                    colSpan={3}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    APLIKASI - I
                  </th>
                  <th
                    colSpan={3}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    APLIKASI - II
                  </th>
                  <th
                    colSpan={3}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    APLIKASI - III
                  </th>

                  <th
                    rowSpan={2}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    Rencana Hari Ini
                    <br />
                    {todayShort}
                    <br />
                    (Kg)
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    Realisasi Hari Ini
                    <br />
                    {todayShort}
                    <br />
                    (Kg)
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    Rencana Besok
                    <br />
                    {tomorrowShort}
                    <br />
                    (Kg)
                  </th>

                  <th
                    colSpan={3}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    Jumlah
                  </th>
                </tr>
                <tr className="bg-slate-100 text-slate-700">
                  {/* Aplikasi I */}
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    RENCANA
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    %
                  </th>
                  {/* Aplikasi II */}
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    RENCANA
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    %
                  </th>
                  {/* Aplikasi III */}
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    RENCANA
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    %
                  </th>
                  {/* Jumlah */}
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    Rencana (Total)
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {tmRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={17}
                      className="px-3 py-6 text-center text-slate-500"
                    >
                      Tidak ada data TM untuk filter/periode ini.
                    </td>
                  </tr>
                ) : (
                  tmRows.map((r, idx) => (
                    <tr
                      key={`tm-${r.kebun}-${idx}`}
                      className={idx % 2 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {r.no ?? idx + 1}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {r.kebun}
                      </td>

                      {/* APLIKASI - I */}
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app1_rencana)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app1_real)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtPct(r.app1_pct)}
                      </td>

                      {/* APLIKASI - II */}
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app2_rencana)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app2_real)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtPct(r.app2_pct)}
                      </td>

                      {/* APLIKASI - III */}
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app3_rencana)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app3_real)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtPct(r.app3_pct)}
                      </td>

                      {/* Harian */}
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.renc_selasa)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.real_selasa)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.renc_rabu)}
                      </td>

                      {/* Jumlah */}
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.jumlah_rencana2025)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.jumlah_realSd0710)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtPct(r.jumlah_pct)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {totalsTM && tmRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-200 font-semibold">
                    <td
                      className="border border-slate-300 px-2 py-2 text-center"
                      colSpan={2}
                    >
                      Jumlah TM
                    </td>

                    {/* APLIKASI - I */}
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTM.app1_rencana)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTM.app1_real)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtPct(totalsTM.app1_pct)}
                    </td>

                    {/* APLIKASI - II */}
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTM.app2_rencana)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTM.app2_real)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtPct(totalsTM.app2_pct)}
                    </td>

                    {/* APLIKASI - III */}
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTM.app3_rencana)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTM.app3_real)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtPct(totalsTM.app3_pct)}
                    </td>

                    {/* Harian */}
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTM.renc_today)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTM.real_today)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTM.renc_tomorrow)}
                    </td>

                    {/* Jumlah */}
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTM.jumlah_rencana2025)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTM.jumlah_real5)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtPct(totalsTM.jumlah_pct)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* === Tabel TBM === */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold mb-3">
            Tabel Rencana &amp; Realisasi Pemupukan TBM
          </h3>
          <div className="overflow-auto rounded-lg border border-slate-300">
            <table className="w-full text-xs border-collapse">
              <thead className="text-[11px]">
                <tr className="bg-slate-200 text-slate-800">
                  <th
                    rowSpan={2}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    No.
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    Kebun
                  </th>

                  <th
                    colSpan={3}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    APLIKASI - I
                  </th>
                  <th
                    colSpan={3}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    APLIKASI - II
                  </th>
                  <th
                    colSpan={3}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    APLIKASI - III
                  </th>

                  <th
                    rowSpan={2}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    Rencana Hari Ini
                    <br />
                    {todayShort}
                    <br />
                    (Kg)
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    Realisasi Hari Ini
                    <br />
                    {todayShort}
                    <br />
                    (Kg)
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    Rencana Besok
                    <br />
                    {tomorrowShort}
                    <br />
                    (Kg)
                  </th>

                  <th
                    colSpan={3}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    Jumlah
                  </th>
                </tr>
                <tr className="bg-slate-100 text-slate-700">
                  {/* Aplikasi I */}
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    RENCANA
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    %
                  </th>
                  {/* Aplikasi II */}
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    RENCANA
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    %
                  </th>
                  {/* Aplikasi III */}
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    RENCANA
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    %
                  </th>
                  {/* Jumlah */}
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    Rencana (Total)
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {tbmRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={17}
                      className="px-3 py-6 text-center text-slate-500"
                    >
                      Tidak ada data TBM untuk filter/periode ini.
                    </td>
                  </tr>
                ) : (
                  tbmRows.map((r, idx) => (
                    <tr
                      key={`tbm-${r.kebun}-${idx}`}
                      className={idx % 2 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {r.no ?? idx + 1}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {r.kebun}
                      </td>

                      {/* APLIKASI - I */}
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app1_rencana)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app1_real)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtPct(r.app1_pct)}
                      </td>

                      {/* APLIKASI - II */}
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app2_rencana)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app2_real)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtPct(r.app2_pct)}
                      </td>

                      {/* APLIKASI - III */}
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app3_rencana)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app3_real)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtPct(r.app3_pct)}
                      </td>

                      {/* Harian */}
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.renc_selasa)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.real_selasa)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.renc_rabu)}
                      </td>

                      {/* Jumlah */}
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.jumlah_rencana2025)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.jumlah_realSd0710)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtPct(r.jumlah_pct)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {totalsTBM && tbmRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-200 font-semibold">
                    <td
                      className="border border-slate-300 px-2 py-2 text-center"
                      colSpan={2}
                    >
                      Jumlah TBM
                    </td>

                    {/* APLIKASI - I */}
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTBM.app1_rencana)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTBM.app1_real)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtPct(totalsTBM.app1_pct)}
                    </td>

                    {/* APLIKASI - II */}
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTBM.app2_rencana)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTBM.app2_real)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtPct(totalsTBM.app2_pct)}
                    </td>

                    {/* APLIKASI - III */}
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTBM.app3_rencana)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTBM.app3_real)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtPct(totalsTBM.app3_pct)}
                    </td>

                    {/* Harian */}
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTBM.renc_today)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTBM.real_today)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTBM.renc_tomorrow)}
                    </td>

                    {/* Jumlah */}
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTBM.jumlah_rencana2025)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTBM.jumlah_real5)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtPct(totalsTBM.jumlah_pct)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* === Tabel TM & TBM === */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold mb-3">
            Tabel Rencana &amp; Realisasi Pemupukan TM &amp; TBM
          </h3>
          <div className="overflow-auto rounded-lg border border-slate-300">
            <table className="w-full text-xs border-collapse">
              <thead className="text-[11px]">
                <tr className="bg-slate-200 text-slate-800">
                  <th
                    rowSpan={2}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    No.
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    Kebun
                  </th>

                  <th
                    colSpan={3}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    APLIKASI - I
                  </th>
                  <th
                    colSpan={3}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    APLIKASI - II
                  </th>
                  <th
                    colSpan={3}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    APLIKASI - III
                  </th>

                  <th
                    rowSpan={2}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    Rencana Hari Ini
                    <br />
                    {todayShort}
                    <br />
                    (Kg)
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    Realisasi Hari Ini
                    <br />
                    {todayShort}
                    <br />
                    (Kg)
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    Rencana Besok
                    <br />
                    {tomorrowShort}
                    <br />
                    (Kg)
                  </th>

                  <th
                    colSpan={3}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    Jumlah
                  </th>
                </tr>
                <tr className="bg-slate-100 text-slate-700">
                  {/* Aplikasi I */}
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    RENCANA
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    %
                  </th>
                  {/* Aplikasi II */}
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    RENCANA
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    %
                  </th>
                  {/* Aplikasi III */}
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    RENCANA
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    %
                  </th>
                  {/* Jumlah */}
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    Rencana (Total)
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center">
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {tmTbmRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={17}
                      className="px-3 py-6 text-center text-slate-500"
                    >
                      Tidak ada data TM &amp; TBM untuk filter/periode ini.
                    </td>
                  </tr>
                ) : (
                  tmTbmRows.map((r, idx) => (
                    <tr
                      key={`tm-tbm-${r.kebun}-${idx}`}
                      className={idx % 2 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {r.no ?? idx + 1}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {r.kebun}
                      </td>

                      {/* APLIKASI - I */}
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app1_rencana)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app1_real)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtPct(r.app1_pct)}
                      </td>

                      {/* APLIKASI - II */}
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app2_rencana)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app2_real)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtPct(r.app2_pct)}
                      </td>

                      {/* APLIKASI - III */}
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app3_rencana)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.app3_real)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtPct(r.app3_pct)}
                      </td>

                      {/* Harian */}
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.renc_selasa)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.real_selasa)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.renc_rabu)}
                      </td>

                      {/* Jumlah */}
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.jumlah_rencana2025)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtNum(r.jumlah_realSd0710)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {fmtPct(r.jumlah_pct)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {totalsTmTbm && tmTbmRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-200 font-semibold">
                    <td
                      className="border border-slate-300 px-2 py-2 text-center"
                      colSpan={2}
                    >
                      Jumlah TM &amp; TBM
                    </td>

                    {/* APLIKASI - I */}
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTmTbm.app1_rencana)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTmTbm.app1_real)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtPct(totalsTmTbm.app1_pct)}
                    </td>

                    {/* APLIKASI - II */}
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTmTbm.app2_rencana)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTmTbm.app2_real)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtPct(totalsTmTbm.app2_pct)}
                    </td>

                    {/* APLIKASI - III */}
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTmTbm.app3_rencana)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTmTbm.app3_real)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtPct(totalsTmTbm.app3_pct)}
                    </td>

                    {/* Harian */}
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTmTbm.renc_today)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTmTbm.real_today)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTmTbm.renc_tomorrow)}
                    </td>

                    {/* Jumlah */}
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTmTbm.jumlah_rencana2025)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtNum(totalsTmTbm.jumlah_real5)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {fmtPct(totalsTmTbm.jumlah_pct)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
