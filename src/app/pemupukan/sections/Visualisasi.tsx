"use client";

import ChartCard from "../components/ChartCard";
import SectionHeader from "../components/SectionHeader";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { COLOR_PLAN, COLOR_REAL } from "../constants";
import React, { useMemo } from "react";
import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";

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
function todayISOJakarta(base = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

function addDaysJakarta(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00+07:00`);
  d.setDate(d.getDate() + n);
  return todayISOJakarta(d);
}

function isoToShort(iso?: string) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "-";
  return `${d}/${m}/${y}`;
}

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

type Totals = ReturnType<typeof computeTotals> | null;

/** Warna sel persen: hijau kalau >=100%, merah kalau <100% */
const pctClass = (n?: number | null) => {
  if (n == null || Number.isNaN(n)) return "";
  const rounded = Math.round(n * 100) / 100;
  return rounded >= 100
    ? "text-emerald-700 font-semibold"
    : "text-red-600 font-semibold";
};

/** Tipe cell untuk body AutoTable (tanpa any) */
type PdfCell =
  | string
  | number
  | {
    content: string | number;
    colSpan?: number;
  };

/** Helper: export tabel pemupukan ke PDF dari data
 *  Header dibuat 2 baris supaya mirip dengan tabel web
 */
function exportPemupukanTablePdf(
  label: string, // "TM", "TBM", "TM & TBM"
  rows: TmRow[],
  totals: Totals,
  meta: {
    todayShort: string;
    tomorrowShort: string;
    startLong: string;
    endLong: string;
    filename: string;
  }
) {
  if (!rows.length) {
    alert(`Tidak ada data ${label} untuk diexport.`);
    return;
  }

  const doc = new jsPDF("l", "mm", "a4");

  // ===== Judul & info tanggal =====
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Tabel Rencana & Realisasi Pemupukan ${label}`, 14, 10);

  doc.setFontSize(9);
  doc.text(
    `Rencana Hari Ini: ${meta.todayShort} | Rencana Besok: ${meta.tomorrowShort}`,
    14,
    16
  );
  doc.text(
    `Real 5 Hari Terakhir: ${meta.startLong} – ${meta.endLong}`,
    14,
    21
  );

  const fmtNum = (n?: number | null) =>
    n == null ? "-" : n.toLocaleString("id-ID");
  const fmtPct = (n?: number | null) =>
    n == null
      ? "-"
      : n.toLocaleString("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

  // ===== HEADER: 2 baris, meniru struktur tabel web =====
  const head: RowInput[] = [
    [
      "No.",
      "Kebun",
      { content: "APLIKASI - I", colSpan: 3 },
      { content: "APLIKASI - II", colSpan: 3 },
      { content: "APLIKASI - III", colSpan: 3 },
      { content: `Rencana Hari Ini\n${meta.todayShort}\n(Kg)` },
      { content: `Realisasi Hari Ini\n${meta.todayShort}\n(Kg)` },
      { content: `Rencana Besok\n${meta.tomorrowShort}\n(Kg)` },
      { content: "Jumlah", colSpan: 3 },
    ],
    [
      "",
      "",
      "RENCANA",
      `Real 5 Hari Terakhir\n${meta.startLong} – ${meta.endLong}`,
      "%",
      "RENCANA",
      `Real 5 Hari Terakhir\n${meta.startLong} – ${meta.endLong}`,
      "%",
      "RENCANA",
      `Real 5 Hari Terakhir\n${meta.startLong} – ${meta.endLong}`,
      "%",
      "",
      "",
      "",
      "Rencana (Total)",
      `Real 5 Hari Terakhir\n${meta.startLong} – ${meta.endLong}`,
      "%",
    ],
  ];

  const body: PdfCell[][] = rows.map((r, idx) => [
    r.no ?? idx + 1,
    r.kebun,
    fmtNum(r.app1_rencana),
    fmtNum(r.app1_real),
    fmtPct(r.app1_pct),
    fmtNum(r.app2_rencana),
    fmtNum(r.app2_real),
    fmtPct(r.app2_pct),
    fmtNum(r.app3_rencana),
    fmtNum(r.app3_real),
    fmtPct(r.app3_pct),
    fmtNum(r.renc_selasa),
    fmtNum(r.real_selasa),
    fmtNum(r.renc_rabu),
    fmtNum(r.jumlah_rencana2025),
    fmtNum(r.jumlah_realSd0710),
    fmtPct(r.jumlah_pct),
  ]);

  if (totals) {
    const totalRow: PdfCell[] = [
      { content: `Jumlah ${label}`, colSpan: 2 },
      fmtNum(totals.app1_rencana),
      fmtNum(totals.app1_real),
      fmtPct(totals.app1_pct),
      fmtNum(totals.app2_rencana),
      fmtNum(totals.app2_real),
      fmtPct(totals.app2_pct),
      fmtNum(totals.app3_rencana),
      fmtNum(totals.app3_real),
      fmtPct(totals.app3_pct),
      fmtNum(totals.renc_today),
      fmtNum(totals.real_today),
      fmtNum(totals.renc_tomorrow),
      fmtNum(totals.jumlah_rencana2025),
      fmtNum(totals.jumlah_real5),
      fmtPct(totals.jumlah_pct),
    ];
    body.push(totalRow);
  }

  autoTable(doc, {
    head,
    body: body as RowInput[],
    startY: 26,
    theme: "grid",
    styles: {
      fontSize: 7,
      textColor: [15, 23, 42],
      lineColor: [148, 163, 184],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [22, 101, 52], // hijau tua
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244], // hijau muda
    },
    columnStyles: {
      0: { halign: "center" }, // No.
      // sisanya rata kiri supaya mirip tabel web
      1: { halign: "left" },
      2: { halign: "left" },
      3: { halign: "left" },
      4: { halign: "left" },
      5: { halign: "left" },
      6: { halign: "left" },
      7: { halign: "left" },
      8: { halign: "left" },
      9: { halign: "left" },
      10: { halign: "left" },
      11: { halign: "left" },
      12: { halign: "left" },
      13: { halign: "left" },
      14: { halign: "left" },
      15: { halign: "left" },
      16: { halign: "left" },
    },
    // Watermark sangat samar di pojok kanan bawah
    didDrawPage: () => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // super halus: kecil & hampir putih
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(245, 245, 245); // nyaris putih

      doc.text("Bagian Tanaman", pageWidth - 6, pageHeight - 4, {
        align: "right",
      });

      // kembalikan warna font jika nanti ada teks lain
      doc.setTextColor(0, 0, 0);
    },
  });

  doc.save(meta.filename);
}

export default function Visualisasi({
  aggPupuk,
  tmRows = [],
  tbmRows = [],
  tmTbmRows = [],
  headerDates,
  realWindow,
  realCutoffDate,
}: {
  pieTotal?: never;
  barPerKebun?: KebunRow[];
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

  const fallbackToday = todayISOJakarta();
  const todayISO = headerDates?.today ?? headerDates?.selasa ?? fallbackToday;
  const tomorrowISO =
    headerDates?.tomorrow ?? headerDates?.rabu ?? addDaysJakarta(todayISO, 1);

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

  const totalsTM = useMemo(() => computeTotals(tmRows), [tmRows]);
  const totalsTBM = useMemo(() => computeTotals(tbmRows), [tbmRows]);
  const totalsTmTbm = useMemo(
    () => computeTotals(tmTbmRows),
    [tmTbmRows]
  );

  return (
    <section className="space-y-4">
      <SectionHeader title="Visualisasi" desc="Grafik utama" />

      {/* ===================== CARD PIE RENCANA vs REALISASI ===================== */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12">
          <ChartCard title="Rencana vs Realisasi per Jenis Pupuk (Kg)">
            <div className="pb-4">
              <p className="text-[11px] text-slate-500 mb-2">
                Setiap pie chart merepresentasikan komposisi Rencana (Kg) vs
                Realisasi (Kg) untuk satu jenis pupuk. Angka Ha ditampilkan di
                bawah masing-masing chart.
              </p>

              {/* 4 card per baris, dibuat serendah mungkin supaya muat 2 baris */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-3 gap-y-1">
                {aggPupuk.map((item) => {
                  const data = [
                    {
                      name: "Rencana (Kg)",
                      value: item.rencana || 0,
                    },
                    {
                      name: "Realisasi (Kg)",
                      value: item.realisasi || 0,
                    },
                  ];

                  return (
                    <div
                      key={item.jenis}
                      className="border border-slate-200 rounded-lg px-2 pt-2 pb-3 flex flex-col items-center bg-white"
                    >
                      <div className="text-[10px] font-semibold mb-0.5 text-center">
                        {item.jenis}
                      </div>

                      {/* pie kecil supaya total tinggi card tidak berlebih */}
                      <div className="w-full h-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={16}
                              outerRadius={24}
                              labelLine={false}
                              isAnimationActive={false}
                            >
                              <Cell fill={COLOR_PLAN} />
                              <Cell fill={COLOR_REAL} />
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: tooltipBg,
                                border: `1px solid ${tooltipBorder}`,
                              }}
                              formatter={(value, name) => [
                                (value as number).toLocaleString("id-ID") +
                                " Kg",
                                name,
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-0.5 text-[9px] text-slate-600 text-center leading-tight space-y-[1px]">
                        <div>
                          Ren: {fmtNum(item.rencana)} Kg |{" "}
                          {fmtNum(item.rencana_ha)} Ha
                        </div>
                        <div>
                          Real: {fmtNum(item.realisasi)} Kg |{" "}
                          {fmtNum(item.realisasi_ha)} Ha
                        </div>
                        <div>
                          Progress:{" "}
                          <span className={pctClass(item.progress)}>
                            {fmtPct(item.progress)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* ===================== BAGIAN TABEL (di luar ChartCard) ===================== */}
      <div className="space-y-4">
        {/* === Tabel TM === */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              Tabel Rencana &amp; Realisasi Pemupukan TM
            </h3>
            <button
              type="button"
              onClick={() =>
                exportPemupukanTablePdf("TM", tmRows, totalsTM, {
                  todayShort,
                  tomorrowShort,
                  startLong,
                  endLong,
                  filename: "Tabel_TM.pdf",
                })
              }
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
            >
              Download PDF
            </button>
          </div>

          <div className="overflow-auto rounded-lg border border-slate-300">
            <table className="w-full text-xs border-collapse">
              <thead className="text-[11px]">
                <tr className="bg-slate-200 text-slate-800">
                  <th rowSpan={2} className="border px-2 py-2 text-center">
                    No.
                  </th>
                  <th rowSpan={2} className="border px-2 py-2 text-left">
                    Kebun
                  </th>
                  <th colSpan={3} className="border px-2 py-2 text-center">
                    APLIKASI - I
                  </th>
                  <th colSpan={3} className="border px-2 py-2 text-center">
                    APLIKASI - II
                  </th>
                  <th colSpan={3} className="border px-2 py-2 text-center">
                    APLIKASI - III
                  </th>
                  <th rowSpan={2} className="border px-2 py-2 text-center">
                    Rencana Hari Ini
                    <br />
                    {todayShort}
                    <br />
                    (Kg)
                  </th>
                  <th rowSpan={2} className="border px-2 py-2 text-center">
                    Realisasi Hari Ini
                    <br />
                    {todayShort}
                    <br />
                    (Kg)
                  </th>
                  <th rowSpan={2} className="border px-2 py-2 text-center">
                    Rencana Besok
                    <br />
                    {tomorrowShort}
                    <br />
                    (Kg)
                  </th>
                  <th colSpan={3} className="border px-2 py-2 text-center">
                    Jumlah
                  </th>
                </tr>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border px-2 py-2 text-left">RENCANA</th>
                  <th className="border px-2 py-2 text-left">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border px-2 py-2 text-left">%</th>
                  <th className="border px-2 py-2 text-left">RENCANA</th>
                  <th className="border px-2 py-2 text-left">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border px-2 py-2 text-left">%</th>
                  <th className="border px-2 py-2 text-left">RENCANA</th>
                  <th className="border px-2 py-2 text-left">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border px-2 py-2 text-left">%</th>
                  <th className="border px-2 py-2 text-left">
                    Rencana (Total)
                  </th>
                  <th className="border px-2 py-2 text-left">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border px-2 py-2 text-left">%</th>
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
                      <td className="border px-2 py-1 text-center">
                        {r.no ?? idx + 1}
                      </td>
                      <td className="border px-2 py-1 text-left">{r.kebun}</td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app1_rencana)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app1_real)}
                      </td>
                      <td
                        className={`border px-2 py-1 text-left ${pctClass(
                          r.app1_pct
                        )}`}
                      >
                        {fmtPct(r.app1_pct)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app2_rencana)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app2_real)}
                      </td>
                      <td
                        className={`border px-2 py-1 text-left ${pctClass(
                          r.app2_pct
                        )}`}
                      >
                        {fmtPct(r.app2_pct)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app3_rencana)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app3_real)}
                      </td>
                      <td
                        className={`border px-2 py-1 text-left ${pctClass(
                          r.app3_pct
                        )}`}
                      >
                        {fmtPct(r.app3_pct)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.renc_selasa)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.real_selasa)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.renc_rabu)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.jumlah_rencana2025)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.jumlah_realSd0710)}
                      </td>
                      <td
                        className={`border px-2 py-1 text-left ${pctClass(
                          r.jumlah_pct
                        )}`}
                      >
                        {fmtPct(r.jumlah_pct)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {totalsTM && tmRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-200 font-semibold">
                    <td colSpan={2} className="border px-2 py-2 text-center">
                      Jumlah TM
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTM.app1_rencana)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTM.app1_real)}
                    </td>
                    <td
                      className={`border px-2 py-2 text-left ${pctClass(
                        totalsTM.app1_pct
                      )}`}
                    >
                      {fmtPct(totalsTM.app1_pct)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTM.app2_rencana)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTM.app2_real)}
                    </td>
                    <td
                      className={`border px-2 py-2 text-left ${pctClass(
                        totalsTM.app2_pct
                      )}`}
                    >
                      {fmtPct(totalsTM.app2_pct)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTM.app3_rencana)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTM.app3_real)}
                    </td>
                    <td
                      className={`border px-2 py-2 text-left ${pctClass(
                        totalsTM.app3_pct
                      )}`}
                    >
                      {fmtPct(totalsTM.app3_pct)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTM.renc_today)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTM.real_today)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTM.renc_tomorrow)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTM.jumlah_rencana2025)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTM.jumlah_real5)}
                    </td>
                    <td
                      className={`border px-2 py-2 text-left ${pctClass(
                        totalsTM.jumlah_pct
                      )}`}
                    >
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              Tabel Rencana &amp; Realisasi Pemupukan TBM
            </h3>
            <button
              type="button"
              onClick={() =>
                exportPemupukanTablePdf("TBM", tbmRows, totalsTBM, {
                  todayShort,
                  tomorrowShort,
                  startLong,
                  endLong,
                  filename: "Tabel_TBM.pdf",
                })
              }
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
            >
              Download PDF
            </button>
          </div>

          <div className="overflow-auto rounded-lg border border-slate-300">
            <table className="w-full text-xs border-collapse">
              <thead className="text-[11px]">
                <tr className="bg-slate-200 text-slate-800">
                  <th rowSpan={2} className="border px-2 py-2 text-center">
                    No.
                  </th>
                  <th rowSpan={2} className="border px-2 py-2 text-left">
                    Kebun
                  </th>
                  <th colSpan={3} className="border px-2 py-2 text-center">
                    APLIKASI - I
                  </th>
                  <th colSpan={3} className="border px-2 py-2 text-center">
                    APLIKASI - II
                  </th>
                  <th colSpan={3} className="border px-2 py-2 text-center">
                    APLIKASI - III
                  </th>
                  <th rowSpan={2} className="border px-2 py-2 text-center">
                    Rencana Hari Ini
                    <br />
                    {todayShort}
                    <br />
                    (Kg)
                  </th>
                  <th rowSpan={2} className="border px-2 py-2 text-center">
                    Realisasi Hari Ini
                    <br />
                    {todayShort}
                    <br />
                    (Kg)
                  </th>
                  <th rowSpan={2} className="border px-2 py-2 text-center">
                    Rencana Besok
                    <br />
                    {tomorrowShort}
                    <br />
                    (Kg)
                  </th>
                  <th colSpan={3} className="border px-2 py-2 text-center">
                    Jumlah
                  </th>
                </tr>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border px-2 py-2 text-left">RENCANA</th>
                  <th className="border px-2 py-2 text-left">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border px-2 py-2 text-left">%</th>
                  <th className="border px-2 py-2 text-left">RENCANA</th>
                  <th className="border px-2 py-2 text-left">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border px-2 py-2 text-left">%</th>
                  <th className="border px-2 py-2 text-left">RENCANA</th>
                  <th className="border px-2 py-2 text-left">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border px-2 py-2 text-left">%</th>
                  <th className="border px-2 py-2 text-left">
                    Rencana (Total)
                  </th>
                  <th className="border px-2 py-2 text-left">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border px-2 py-2 text-left">%</th>
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
                      <td className="border px-2 py-1 text-center">
                        {r.no ?? idx + 1}
                      </td>
                      <td className="border px-2 py-1 text-left">{r.kebun}</td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app1_rencana)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app1_real)}
                      </td>
                      <td
                        className={`border px-2 py-1 text-left ${pctClass(
                          r.app1_pct
                        )}`}
                      >
                        {fmtPct(r.app1_pct)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app2_rencana)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app2_real)}
                      </td>
                      <td
                        className={`border px-2 py-1 text-left ${pctClass(
                          r.app2_pct
                        )}`}
                      >
                        {fmtPct(r.app2_pct)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app3_rencana)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app3_real)}
                      </td>
                      <td
                        className={`border px-2 py-1 text-left ${pctClass(
                          r.app3_pct
                        )}`}
                      >
                        {fmtPct(r.app3_pct)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.renc_selasa)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.real_selasa)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.renc_rabu)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.jumlah_rencana2025)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.jumlah_realSd0710)}
                      </td>
                      <td
                        className={`border px-2 py-1 text-left ${pctClass(
                          r.jumlah_pct
                        )}`}
                      >
                        {fmtPct(r.jumlah_pct)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {totalsTBM && tbmRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-200 font-semibold">
                    <td colSpan={2} className="border px-2 py-2 text-center">
                      Jumlah TBM
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTBM.app1_rencana)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTBM.app1_real)}
                    </td>
                    <td
                      className={`border px-2 py-2 text-left ${pctClass(
                        totalsTBM.app1_pct
                      )}`}
                    >
                      {fmtPct(totalsTBM.app1_pct)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTBM.app2_rencana)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTBM.app2_real)}
                    </td>
                    <td
                      className={`border px-2 py-2 text-left ${pctClass(
                        totalsTBM.app2_pct
                      )}`}
                    >
                      {fmtPct(totalsTBM.app2_pct)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTBM.app3_rencana)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTBM.app3_real)}
                    </td>
                    <td
                      className={`border px-2 py-2 text-left ${pctClass(
                        totalsTBM.app3_pct
                      )}`}
                    >
                      {fmtPct(totalsTBM.app3_pct)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTBM.renc_today)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTBM.real_today)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTBM.renc_tomorrow)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTBM.jumlah_rencana2025)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTBM.jumlah_real5)}
                    </td>
                    <td
                      className={`border px-2 py-2 text-left ${pctClass(
                        totalsTBM.jumlah_pct
                      )}`}
                    >
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              Tabel Rencana &amp; Realisasi Pemupukan TM &amp; TBM
            </h3>
            <button
              type="button"
              onClick={() =>
                exportPemupukanTablePdf("TM & TBM", tmTbmRows, totalsTmTbm, {
                  todayShort,
                  tomorrowShort,
                  startLong,
                  endLong,
                  filename: "Tabel_TM_TBM.pdf",
                })
              }
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
            >
              Download PDF
            </button>
          </div>

          <div className="overflow-auto rounded-lg border border-slate-300">
            <table className="w-full text-xs border-collapse">
              <thead className="text-[11px]">
                <tr className="bg-slate-200 text-slate-800">
                  <th rowSpan={2} className="border px-2 py-2 text-center">
                    No.
                  </th>
                  <th rowSpan={2} className="border px-2 py-2 text-left">
                    Kebun
                  </th>
                  <th colSpan={3} className="border px-2 py-2 text-center">
                    APLIKASI - I
                  </th>
                  <th colSpan={3} className="border px-2 py-2 text-center">
                    APLIKASI - II
                  </th>
                  <th colSpan={3} className="border px-2 py-2 text-center">
                    APLIKASI - III
                  </th>
                  <th rowSpan={2} className="border px-2 py-2 text-center">
                    Rencana Hari Ini
                    <br />
                    {todayShort}
                    <br />
                    (Kg)
                  </th>
                  <th rowSpan={2} className="border px-2 py-2 text-center">
                    Realisasi Hari Ini
                    <br />
                    {todayShort}
                    <br />
                    (Kg)
                  </th>
                  <th rowSpan={2} className="border px-2 py-2 text-center">
                    Rencana Besok
                    <br />
                    {tomorrowShort}
                    <br />
                    (Kg)
                  </th>
                  <th colSpan={3} className="border px-2 py-2 text-center">
                    Jumlah
                  </th>
                </tr>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border px-2 py-2 text-left">RENCANA</th>
                  <th className="border px-2 py-2 text-left">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border px-2 py-2 text-left">%</th>
                  <th className="border px-2 py-2 text-left">RENCANA</th>
                  <th className="border px-2 py-2 text-left">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border px-2 py-2 text-left">%</th>
                  <th className="border px-2 py-2 text-left">RENCANA</th>
                  <th className="border px-2 py-2 text-left">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border px-2 py-2 text-left">%</th>
                  <th className="border px-2 py-2 text-left">
                    Rencana (Total)
                  </th>
                  <th className="border px-2 py-2 text-left">
                    Real 5 Hari Terakhir
                    <br />
                    {startLong} – {endLong}
                  </th>
                  <th className="border px-2 py-2 text-left">%</th>
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
                      <td className="border px-2 py-1 text-center">
                        {r.no ?? idx + 1}
                      </td>
                      <td className="border px-2 py-1 text-left">{r.kebun}</td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app1_rencana)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app1_real)}
                      </td>
                      <td
                        className={`border px-2 py-1 text-left ${pctClass(
                          r.app1_pct
                        )}`}
                      >
                        {fmtPct(r.app1_pct)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app2_rencana)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app2_real)}
                      </td>
                      <td
                        className={`border px-2 py-1 text-left ${pctClass(
                          r.app2_pct
                        )}`}
                      >
                        {fmtPct(r.app2_pct)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app3_rencana)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.app3_real)}
                      </td>
                      <td
                        className={`border px-2 py-1 text-left ${pctClass(
                          r.app3_pct
                        )}`}
                      >
                        {fmtPct(r.app3_pct)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.renc_selasa)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.real_selasa)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.renc_rabu)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.jumlah_rencana2025)}
                      </td>
                      <td className="border px-2 py-1 text-left">
                        {fmtNum(r.jumlah_realSd0710)}
                      </td>
                      <td
                        className={`border px-2 py-1 text-left ${pctClass(
                          r.jumlah_pct
                        )}`}
                      >
                        {fmtPct(r.jumlah_pct)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {totalsTmTbm && tmTbmRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-200 font-semibold">
                    <td colSpan={2} className="border px-2 py-2 text-center">
                      Jumlah TM &amp; TBM
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTmTbm.app1_rencana)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTmTbm.app1_real)}
                    </td>
                    <td
                      className={`border px-2 py-2 text-left ${pctClass(
                        totalsTmTbm.app1_pct
                      )}`}
                    >
                      {fmtPct(totalsTmTbm.app1_pct)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTmTbm.app2_rencana)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTmTbm.app2_real)}
                    </td>
                    <td
                      className={`border px-2 py-2 text-left ${pctClass(
                        totalsTmTbm.app2_pct
                      )}`}
                    >
                      {fmtPct(totalsTmTbm.app2_pct)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTmTbm.app3_rencana)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTmTbm.app3_real)}
                    </td>
                    <td
                      className={`border px-2 py-2 text-left ${pctClass(
                        totalsTmTbm.app3_pct
                      )}`}
                    >
                      {fmtPct(totalsTmTbm.app3_pct)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTmTbm.renc_today)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTmTbm.real_today)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTmTbm.renc_tomorrow)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTmTbm.jumlah_rencana2025)}
                    </td>
                    <td className="border px-2 py-2 text-left">
                      {fmtNum(totalsTmTbm.jumlah_real5)}
                    </td>
                    <td
                      className={`border px-2 py-2 text-left ${pctClass(
                        totalsTmTbm.jumlah_pct
                      )}`}
                    >
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
