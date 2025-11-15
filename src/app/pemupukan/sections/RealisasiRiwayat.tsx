"use client";

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KEBUN_LABEL } from "../constants";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

type Kategori = "TM" | "TBM" | "BIBITAN";

// Bentuk data asli dari API / Prisma
type ApiRealisasi = {
  id: number;
  kategori: Kategori;
  kebun: string;
  kodeKebun: string;
  tanggal: string; // ISO: "2020-04-10T00:00:00.000Z"
  afd: string;
  tt: string;
  blok: string;
  luasHa: number;
  inv: number;
  jenisPupuk: string;
  aplikasiKe: number;
  dosisKgPerPokok: number;
  kgPupuk: number;
  createdAt: string;
  updatedAt: string;
};

// Bentuk data yang dipakai tabel
type HistoryRow = {
  id: number;
  tanggal: string; // "YYYY-MM-DD"
  kategori: Kategori;
  kebun: string;
  kodeKebun: string;
  afd: string;
  tt: string;
  blok: string;
  luas: number | null;
  inv: number | null;
  jenisPupuk: string;
  aplikasi: number | null;
  dosis: number | null;
  kgPupuk: number | null;
};

function parseDateValue(s: string): number {
  if (!s) return 0;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : 0;
}

function fmtNum(n: number | null | undefined) {
  if (n == null) return "-";
  return n.toLocaleString("id-ID");
}

export default function RealisasiRiwayat() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const router = useRouter();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // ambil langsung dari API realisasi (tanpa /history)
        const res = await fetch("/api/pemupukan/realisasi", {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("Gagal mengambil data realisasi");
        }
        const data = (await res.json()) as ApiRealisasi[];

        if (!active) return;

        const mapped: HistoryRow[] = data.map((r) => ({
          id: r.id,
          tanggal: r.tanggal.slice(0, 10), // "2020-04-10"
          kategori: r.kategori,
          kebun: r.kebun,
          kodeKebun: r.kodeKebun,
          afd: r.afd,
          tt: r.tt,
          blok: r.blok,
          luas: r.luasHa,
          inv: r.inv,
          jenisPupuk: r.jenisPupuk,
          aplikasi: r.aplikasiKe,
          dosis: r.dosisKgPerPokok,
          kgPupuk: r.kgPupuk,
        }));

        setRows(mapped);
      } catch (err) {
        console.error(err);
        if (active) setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term
      ? rows.filter((r) => {
        const keb = KEBUN_LABEL[r.kebun] ?? r.kebun ?? "";
        return [
          r.kategori,
          keb,
          r.kodeKebun ?? "",
          r.afd ?? "",
          r.blok ?? "",
          r.jenisPupuk ?? "",
          r.tanggal ?? "",
        ]
          .map((v) => String(v).toLowerCase())
          .some((v) => v.includes(term));
      })
      : rows;

    return [...base].sort(
      (a, b) => parseDateValue(b.tanggal) - parseDateValue(a.tanggal)
    );
  }, [rows, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [q]);

  // === ACTION: HAPUS DATA ===
  const handleDelete = async (row: HistoryRow) => {
    const result = await Swal.fire({
      title: "Yakin ingin menghapus data ini?",
      html: `
        <div style="text-align:left;font-size:12px">
          <b>Tanggal:</b> ${row.tanggal}<br/>
          <b>Kategori:</b> ${row.kategori}<br/>
          <b>Kebun:</b> ${KEBUN_LABEL[row.kebun] ?? row.kebun}<br/>
          <b>Blok:</b> ${row.blok} | <b>AFD:</b> ${row.afd}
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(
        `/api/pemupukan/realisasi?id=${row.id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("Gagal hapus:", text);
        await Swal.fire({
          title: "Gagal menghapus",
          text:
            text ||
            "Terjadi kesalahan saat menghapus data. Silakan coba lagi atau hubungi admin.",
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }

      // Hapus dari state
      setRows((prev) => prev.filter((r) => r.id !== row.id));

      await Swal.fire({
        title: "Berhasil",
        text: "Data realisasi berhasil dihapus.",
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (err) {
      console.error(err);
      await Swal.fire({
        title: "Terjadi kesalahan",
        text: "Tidak dapat menghapus data. Cek console atau hubungi admin.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // === ACTION: EDIT DATA ===
  const handleEdit = (row: HistoryRow) => {
    // Sementara diarahkan ke halaman edit (nanti bisa kamu buat)
    // misal: /pemupukan/realisasi/edit?id=...
    router.push(`/pemupukan/realisasi/edit?id=${row.id}`);
  };

  return (
    <section className="space-y-2">
      <SectionHeader
        title="Riwayat Realisasi"
        desc="Daftar input realisasi terbaru dari database"
      />

      <Card className="bg-white/80 dark:bg-slate-900/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px]">
            Pencarian &amp; Tabel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari kategori (TM/TBM/BIBITAN) / kebun / AFD / blok / jenis pupuk / tanggal…"
              className="h-9 max-w-xl"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/40">
                <tr>
                  <th className="px-3 py-2 text-left">Tanggal</th>
                  <th className="px-3 py-2 text-left">Kategori</th>
                  <th className="px-3 py-2 text-left">Kebun</th>
                  <th className="px-3 py-2 text-left">Kode Kebun</th>
                  <th className="px-3 py-2 text-left">AFD</th>
                  <th className="px-3 py-2 text-left">TT</th>
                  <th className="px-3 py-2 text-left">Blok</th>
                  <th className="px-3 py-2 text-right">Luas (Ha)</th>
                  <th className="px-3 py-2 text-right">INV</th>
                  <th className="px-3 py-2 text-left">Jenis Pupuk</th>
                  <th className="px-3 py-2 text-right">Aplikasi</th>
                  <th className="px-3 py-2 text-right">Dosis (Kg/pokok)</th>
                  <th className="px-3 py-2 text-right">Kg Pupuk</th>
                  <th className="px-3 py-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr
                    key={`${r.id}-${r.kebun}-${r.kodeKebun}-${r.tanggal}-${i}`}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-3 py-2">{r.tanggal}</td>
                    <td className="px-3 py-2">{r.kategori}</td>
                    <td className="px-3 py-2">
                      {KEBUN_LABEL[r.kebun] ?? r.kebun}
                    </td>
                    <td className="px-3 py-2">{r.kodeKebun || "-"}</td>
                    <td className="px-3 py-2">{r.afd}</td>
                    <td className="px-3 py-2">{r.tt || "-"}</td>
                    <td className="px-3 py-2">{r.blok}</td>
                    <td className="px-3 py-2 text-right">
                      {fmtNum(r.luas)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {fmtNum(r.inv)}
                    </td>
                    <td className="px-3 py-2">{r.jenisPupuk}</td>
                    <td className="px-3 py-2 text-right">
                      {fmtNum(r.aplikasi)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {fmtNum(r.dosis)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {fmtNum(r.kgPupuk)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(r)}
                          className="px-2 py-1 rounded border border-slate-300 text-[11px] hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          className="px-2 py-1 rounded border border-red-300 text-[11px] text-red-700 hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && pageRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-3 py-6 text-center text-slate-500"
                    >
                      Tidak ada data.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-3 py-6 text-center text-slate-500"
                    >
                      Memuat data…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination sederhana */}
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>
              Menampilkan{" "}
              {filtered.length === 0
                ? 0
                : (page - 1) * pageSize + 1}
              -
              {Math.min(page * pageSize, filtered.length)} dari{" "}
              {filtered.length}
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
