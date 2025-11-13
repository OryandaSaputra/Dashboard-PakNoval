"use client";

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KEBUN_LABEL } from "../constants";

type HistoryRow = {
  kebun: string;
  kodeKebun?: string;
  tanggal: string; // "YYYY-MM-DD" atau "dd.mm.yyyy"
  afd: string;
  tt?: string;
  blok: string;
  luas?: number | string;
  inv?: number | string;
  jenisPupuk: string;
  aplikasi?: number | string;
  dosis?: number | string;
  kgPupuk?: number | string;
};

function parseDateValue(s: string): number {
  if (!s) return 0;
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
    const [d, m, y] = s.split(".").map((x) => Number(x));
    return new Date(y, m - 1, d).getTime();
  }
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : 0;
}

export default function RealisasiRiwayat() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // TODO: sesuaikan endpoint backend kamu
        const res = await fetch("/api/pemupukan/realisasi/history", { cache: "no-store" });
        const data: HistoryRow[] = res.ok ? await res.json() : [];
        if (active) setRows(Array.isArray(data) ? data : []);
      } catch {
        if (active) setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term
      ? rows.filter((r) => {
        const keb = KEBUN_LABEL[r.kebun] ?? r.kebun ?? "";
        return [
          keb,
          r.kodeKebun ?? "",
          r.afd ?? "",
          r.blok ?? "",
          r.jenisPupuk ?? "",
          r.tanggal ?? "",
        ].some((v) => String(v).toLowerCase().includes(term));
      })
      : rows;

    return [...base].sort((a, b) => parseDateValue(b.tanggal) - parseDateValue(a.tanggal));
  }, [rows, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [q]);

  return (
    <section className="space-y-2">
      <SectionHeader title="Riwayat Realisasi" desc="Daftar input realisasi terbaru" />

      <Card className="bg-white/80 dark:bg-slate-900/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px]">Pencarian & Tabel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari kebun / AFD / blok / jenis pupuk / tanggal…"
              className="h-9 max-w-xl"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/40">
                <tr>
                  <th className="px-3 py-2 text-left">Tanggal</th>
                  <th className="px-3 py-2 text-left">Kebun</th>
                  <th className="px-3 py-2 text-left">Kode Kebun</th>
                  <th className="px-3 py-2 text-left">AFD</th>
                  <th className="px-3 py-2 text-left">TT</th>
                  <th className="px-3 py-2 text-left">Blok</th>
                  <th className="px-3 py-2 text-right">Luas (Ha)</th>
                  <th className="px-3 py-2 text-right">INV</th>
                  <th className="px-3 py-2 text-left">Jenis Pupuk</th>
                  <th className="px-3 py-2 text-right">Aplikasi</th>
                  <th className="px-3 py-2 text-right">Dosis</th>
                  <th className="px-3 py-2 text-right">Kg Pupuk</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={`${r.kebun}-${r.kodeKebun}-${r.tanggal}-${i}`} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2">{r.tanggal}</td>
                    <td className="px-3 py-2">{KEBUN_LABEL[r.kebun] ?? r.kebun}</td>
                    <td className="px-3 py-2">{r.kodeKebun ?? "-"}</td>
                    <td className="px-3 py-2">{r.afd}</td>
                    <td className="px-3 py-2">{r.tt ?? "-"}</td>
                    <td className="px-3 py-2">{r.blok}</td>
                    <td className="px-3 py-2 text-right">{r.luas ?? "-"}</td>
                    <td className="px-3 py-2 text-right">{r.inv ?? "-"}</td>
                    <td className="px-3 py-2">{r.jenisPupuk}</td>
                    <td className="px-3 py-2 text-right">{r.aplikasi ?? "-"}</td>
                    <td className="px-3 py-2 text-right">{r.dosis ?? "-"}</td>
                    <td className="px-3 py-2 text-right">{r.kgPupuk ?? "-"}</td>
                  </tr>
                ))}
                {!loading && pageRows.length === 0 && (
                  <tr><td colSpan={12} className="px-3 py-6 text-center text-slate-500">Tidak ada data.</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={12} className="px-3 py-6 text-center text-slate-500">Memuat data…</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination sederhana */}
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>Menampilkan {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} dari {filtered.length}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50">Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50">Next</button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
