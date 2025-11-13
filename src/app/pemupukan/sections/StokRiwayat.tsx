"use client";

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { KEBUN_LABEL } from "../constants";

/** =====================[ TYPES ]===================== */
type StokHistoryRow = {
  kebun: string;
  kodeKebun?: string;
  tanggal: string;
  afd: string;
  tt?: string;
  blok: string;
  jenisPupuk: string;
  rencanaKg?: number | string;
  realisasiKg?: number | string;
  stokKg?: number | string;
};

/** =====================[ HELPERS ]===================== */
function parseDateValue(s: string): number {
  if (!s) return 0;
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
    const [d, m, y] = s.split(".").map(Number);
    return new Date(y, m - 1, d).getTime();
  }
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : 0;
}

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (!s) return 0;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  const normalized = hasComma && hasDot ? s.replace(/\./g, "").replace(",", ".") : hasComma ? s.replace(",", ".") : s;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

/** =====================[ COMPONENT ]===================== */
export default function StokRiwayat() {
  const [rows, setRows] = useState<StokHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [editingKebun, setEditingKebun] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pemupukan/stok/history", { cache: "no-store" });
      const data: StokHistoryRow[] = res.ok ? await res.json() : [];
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term
      ? rows.filter((r) => {
        const keb = KEBUN_LABEL[r.kebun] ?? r.kebun ?? "";
        return [keb, r.kodeKebun ?? "", r.afd ?? "", r.blok ?? "", r.jenisPupuk ?? "", r.tanggal ?? ""].some((v) =>
          String(v).toLowerCase().includes(term)
        );
      })
      : rows;
    return [...base].sort((a, b) => parseDateValue(b.tanggal) - parseDateValue(a.tanggal));
  }, [rows, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [q]);

  // === Actions ===
  const startEdit = (kebun: string, currentStok: number | string | undefined) => {
    setEditingKebun(kebun);
    setEditValue(String(toNum(currentStok ?? 0)));
  };
  const cancelEdit = () => { setEditingKebun(null); setEditValue(""); };

  const saveEdit = async (kebun: string, kodeKebun?: string) => {
    const stok_kg = Math.max(0, Math.round(toNum(editValue)));
    setSubmitting(true);
    try {
      const res = await fetch("/api/pemupukan/stok", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kebun, kode_kebun: kodeKebun ?? "", stok_kg }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchRows();
      cancelEdit();
    } catch (e) {
      console.error(e);
      alert("Gagal memperbarui stok.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteStok = async (kebun: string) => {
    if (!confirm(`Hapus semua stok untuk kebun ${kebun}?`)) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/pemupukan/stok", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kebun }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchRows();
      if (editingKebun === kebun) cancelEdit();
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus stok.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-2">
      <SectionHeader title="Riwayat Stok Pemupukan" desc="Rencana vs Realisasi, Kekurangan, % Realisasi, dan Stok Sisa" />

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
            <table className="min-w-full text-xs text-center">
              <thead className="bg-slate-100 dark:bg-slate-800/40">
                <tr>
                  <th className="px-3 py-2">Tanggal</th>
                  <th className="px-3 py-2">Kebun</th>
                  <th className="px-3 py-2">Kode Kebun</th>
                  <th className="px-3 py-2">AFD</th>
                  <th className="px-3 py-2">TT</th>
                  <th className="px-3 py-2">Blok</th>
                  <th className="px-3 py-2">Jenis Pupuk</th>
                  <th className="px-3 py-2">Rencana (kg)</th>
                  <th className="px-3 py-2">Realisasi (kg)</th>
                  <th className="px-3 py-2">Kekurangan (kg)</th>
                  <th className="px-3 py-2">% Realisasi</th>
                  <th className="px-3 py-2">Stok Awal (kg)</th>
                  <th className="px-3 py-2">Stok Sisa (kg)</th>
                  <th className="px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => {
                  const rcn = toNum(r.rencanaKg);
                  const rel = toNum(r.realisasiKg);
                  const stok = toNum(r.stokKg);
                  const kekurangan = rcn - rel;
                  const persen = rcn > 0 ? (rel / rcn) * 100 : NaN;
                  const stokSisa = Number.isFinite(stok) ? stok - rel : NaN;

                  const kekuranganClass = kekurangan < 0 ? "text-rose-600 font-medium" : "";
                  const stokSisaClass = Number.isFinite(stokSisa) && stokSisa < 0 ? "text-rose-600 font-medium" : "";
                  const persenText = Number.isFinite(persen) ? `${nf.format(persen)}%` : "-";
                  const isEditing = editingKebun === r.kebun;

                  return (
                    <tr key={`${r.kebun}-${r.kodeKebun}-${r.tanggal}-${r.jenisPupuk}-${i}`} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2">{r.tanggal}</td>
                      <td className="px-3 py-2">{KEBUN_LABEL[r.kebun] ?? r.kebun}</td>
                      <td className="px-3 py-2">{r.kodeKebun ?? "-"}</td>
                      <td className="px-3 py-2">{r.afd}</td>
                      <td className="px-3 py-2">{r.tt ?? "-"}</td>
                      <td className="px-3 py-2">{r.blok}</td>
                      <td className="px-3 py-2">{r.jenisPupuk}</td>

                      <td className="px-3 py-2">{rcn ? nf.format(rcn) : "-"}</td>
                      <td className="px-3 py-2">{rel ? nf.format(rel) : "-"}</td>
                      <td className={`px-3 py-2 ${kekuranganClass}`}>
                        {Number.isFinite(kekurangan) ? nf.format(kekurangan) : "-"}
                      </td>
                      <td className="px-3 py-2">{persenText}</td>

                      <td className="px-3 py-2">
                        {isEditing ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            inputMode="decimal"
                            className="h-7 w-28 mx-auto text-center"
                          />
                        ) : Number.isFinite(stok) ? (
                          nf.format(stok)
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className={`px-3 py-2 ${stokSisaClass}`}>
                        {Number.isFinite(stokSisa) ? nf.format(stokSisa) : "-"}
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditing ? (
                            <>
                              <Button
                                size="icon"
                                className="h-8 w-8"
                                disabled={submitting}
                                onClick={() => saveEdit(r.kebun, r.kodeKebun)}
                                aria-label="Simpan"
                                title="Simpan"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                disabled={submitting}
                                onClick={cancelEdit}
                                aria-label="Batal"
                                title="Batal"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => startEdit(r.kebun, r.stokKg)}
                                disabled={submitting}
                                aria-label="Ubah stok"
                                title="Ubah stok"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="destructive"
                                className="h-8 w-8"
                                onClick={() => deleteStok(r.kebun)}
                                disabled={submitting}
                                aria-label="Hapus"
                                title="Hapus"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && pageRows.length === 0 && (
                  <tr>
                    <td colSpan={14} className="px-3 py-6 text-center text-slate-500">
                      Tidak ada data.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={14} className="px-3 py-6 text-center text-slate-500">
                      Memuat data…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>
              Menampilkan {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} dari {filtered.length}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
