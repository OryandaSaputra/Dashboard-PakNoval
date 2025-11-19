"use client";

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KEBUN_LABEL } from "../constants";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

type Kategori = "TM" | "TBM" | "BIBITAN";

type ApiRealisasi = {
  id: number;
  kategori: Kategori;
  kebun: string;
  kodeKebun: string;
  tanggal: string | null;
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

type HistoryRow = {
  id: number;
  tanggal: string;
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

const TABLE_HEADERS = [
  "Tanggal",
  "Kategori",
  "Kebun",
  "Kode Kebun",
  "AFD",
  "TT",
  "Blok",
  "Luas (Ha)",
  "INV",
  "Jenis Pupuk",
  "Aplikasi",
  "Dosis (Kg/pokok)",
  "Kg Pupuk",
] as const;

function parseDateValue(s: string): number {
  if (!s || s === "-") return 0;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : 0;
}

function fmtNum(n: number | null | undefined) {
  if (n == null) return "-";
  return n.toLocaleString("id-ID");
}

function toLocalYmd(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function makeSheetName(raw: string): string {
  const invalid = /[\\/?*[\]:]/g;
  let name = raw.replace(invalid, " ");
  if (!name.trim()) name = "Sheet";
  if (name.length > 31) name = name.slice(0, 31);
  return name;
}

export default function RealisasiRiwayat() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 100;
  const router = useRouter();

  const [selectedKebun, setSelectedKebun] = useState<string>("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
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
          tanggal: toLocalYmd(r.tanggal),
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

  // 🔽 OPSI KEBUN DIAMBIL DARI DATA DATABASE (rows), BUKAN DARI KEBUN_LABEL
  const kebunOptions = useMemo(() => {
    const codes = Array.from(
      new Set(
        rows
          .map((r) => r.kebun)
          .filter((c): c is string => !!c && c.trim() !== "")
      )
    );

    // optional: sort ascending
    codes.sort();

    return codes.map((code) => ({
      code,
      name: KEBUN_LABEL[code] ?? code, // pakai label kalau ada, kalau tidak pakai code-nya
    }));
  }, [rows]);

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

  const groupedByKebun = useMemo(() => {
    const map: Record<string, HistoryRow[]> = {};
    rows.forEach((r) => {
      if (!map[r.kebun]) map[r.kebun] = [];
      map[r.kebun].push(r);
    });

    Object.values(map).forEach((list) => {
      list.sort(
        (a, b) => parseDateValue(a.tanggal) - parseDateValue(b.tanggal)
      );
    });

    return map;
  }, [rows]);

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
      const res = await fetch(`/api/pemupukan/realisasi?id=${row.id}`, {
        method: "DELETE",
      });

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

  const handleDeleteAll = async () => {
    if (rows.length === 0) return;

    const result = await Swal.fire({
      title: "Hapus semua data realisasi?",
      html: `
        <div style="text-align:left;font-size:12px">
          Tindakan ini akan menghapus <b>semua</b> data realisasi pemupukan di database.<br/>
          Data yang sudah dihapus <b>tidak dapat dikembalikan</b>.
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus semua",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch("/api/pemupukan/realisasi?all=1", {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Gagal hapus semua:", text);
        await Swal.fire({
          title: "Gagal menghapus semua",
          text:
            text ||
            "Terjadi kesalahan saat menghapus semua data. Silakan coba lagi atau hubungi admin.",
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }

      setRows([]);
      setPage(1);
      setQ("");

      await Swal.fire({
        title: "Berhasil",
        text: "Semua data realisasi berhasil dihapus.",
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (err) {
      console.error(err);
      await Swal.fire({
        title: "Terjadi kesalahan",
        text: "Tidak dapat menghapus semua data. Cek console atau hubungi admin.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const handleDeleteByKebun = async () => {
    if (!selectedKebun) {
      await Swal.fire({
        title: "Kebun belum dipilih",
        text: "Silakan pilih kebun yang akan dihapus datanya.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    const label = KEBUN_LABEL[selectedKebun] ?? selectedKebun;

    const result = await Swal.fire({
      title: "Hapus semua data realisasi untuk kebun ini?",
      html: `
        <div style="text-align:left;font-size:12px">
          Kebun: <b>${label}</b> (${selectedKebun})<br/>
          Tindakan ini akan menghapus <b>semua</b> data realisasi dengan kode kebun tersebut.<br/>
          Data yang sudah dihapus <b>tidak dapat dikembalikan</b>.
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus kebun ini",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(
        `/api/pemupukan/realisasi?kebun=${encodeURIComponent(selectedKebun)}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("Gagal hapus per kebun:", text);
        await Swal.fire({
          title: "Gagal menghapus data kebun",
          text:
            text ||
            "Terjadi kesalahan saat menghapus data per kebun. Silakan coba lagi atau hubungi admin.",
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }

      const json = await res.json().catch(() => null);
      const deletedCount = json?.deletedCount ?? 0;

      setRows((prev) => prev.filter((r) => r.kebun !== selectedKebun));

      await Swal.fire({
        title: "Berhasil",
        html: `Data realisasi untuk kebun <b>${label}</b> berhasil dihapus.<br/>Baris terhapus: <b>${deletedCount}</b>.`,
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (err) {
      console.error(err);
      await Swal.fire({
        title: "Terjadi kesalahan",
        text: "Tidak dapat menghapus data per kebun. Cek console atau hubungi admin.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const handleEdit = (row: HistoryRow) => {
    router.push(`/pemupukan/realisasi/edit?id=${row.id}`);
  };

  const handleExportExcelAll = async () => {
    if (rows.length === 0) {
      await Swal.fire({
        title: "Tidak ada data",
        text: "Tidak ada data realisasi untuk diexport.",
        icon: "info",
        confirmButtonText: "OK",
      });
      return;
    }

    const XLSX = await import("xlsx");

    const workbook = XLSX.utils.book_new();

    Object.entries(groupedByKebun).forEach(([kebunCode, kebunRows]) => {
      if (kebunRows.length === 0) return;

      const kebunLabel = KEBUN_LABEL[kebunCode] ?? kebunCode;
      const sheetName = makeSheetName(kebunLabel);

      const sheetData = [
        [...TABLE_HEADERS],
        ...kebunRows.map((r) => [
          r.tanggal,
          r.kategori,
          KEBUN_LABEL[r.kebun] ?? r.kebun,
          r.kodeKebun,
          r.afd,
          r.tt,
          r.blok,
          r.luas ?? "",
          r.inv ?? "",
          r.jenisPupuk,
          r.aplikasi ?? "",
          r.dosis ?? "",
          r.kgPupuk ?? "",
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    });

    XLSX.writeFile(workbook, "Realisasi_Pemupukan_Semua_Kebun.xlsx");
  };

  const handleExportExcelByKebun = async () => {
    if (!selectedKebun) {
      await Swal.fire({
        title: "Kebun belum dipilih",
        text: "Silakan pilih kebun terlebih dahulu.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    const kebunRows = rows.filter((r) => r.kebun === selectedKebun);
    if (kebunRows.length === 0) {
      await Swal.fire({
        title: "Tidak ada data",
        text: "Tidak ada data realisasi untuk kebun yang dipilih.",
        icon: "info",
        confirmButtonText: "OK",
      });
      return;
    }

    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();

    const kebunLabel = KEBUN_LABEL[selectedKebun] ?? selectedKebun;
    const sheetName = makeSheetName(kebunLabel);

    const sheetData = [
      [...TABLE_HEADERS],
      ...kebunRows.map((r) => [
        r.tanggal,
        r.kategori,
        KEBUN_LABEL[r.kebun] ?? r.kebun,
        r.kodeKebun,
        r.afd,
        r.tt,
        r.blok,
        r.luas ?? "",
        r.inv ?? "",
        r.jenisPupuk,
        r.aplikasi ?? "",
        r.dosis ?? "",
        r.kgPupuk ?? "",
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, ws, sheetName);

    const fileName = `Realisasi_Pemupukan_${selectedKebun}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleExportPdfAll = async () => {
    if (rows.length === 0) {
      await Swal.fire({
        title: "Tidak ada data",
        text: "Tidak ada data realisasi untuk diexport.",
        icon: "info",
        confirmButtonText: "OK",
      });
      return;
    }

    const jsPDFmod = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDFmod.jsPDF({ orientation: "landscape" });

    const kebunEntries = Object.entries(groupedByKebun).filter(
      ([, kebunRows]) => kebunRows.length > 0
    );

    kebunEntries.forEach(([kebunCode, kebunRows], idx) => {
      if (idx > 0) {
        doc.addPage("landscape");
      }

      const kebunLabel = KEBUN_LABEL[kebunCode] ?? kebunCode;
      doc.setFontSize(10);
      doc.text(
        `Realisasi Pemupukan - Kebun ${kebunLabel} (${kebunCode})`,
        14,
        12
      );

      const body = kebunRows.map((r) => [
        r.tanggal,
        r.kategori,
        KEBUN_LABEL[r.kebun] ?? r.kebun,
        r.kodeKebun,
        r.afd,
        r.tt,
        r.blok,
        fmtNum(r.luas),
        fmtNum(r.inv),
        r.jenisPupuk,
        fmtNum(r.aplikasi),
        fmtNum(r.dosis),
        fmtNum(r.kgPupuk),
      ]);

      autoTable(doc, {
        startY: 16,
        head: [TABLE_HEADERS as unknown as string[]],
        body,
        styles: { fontSize: 6 },
        headStyles: { fillColor: [226, 232, 240] },
        margin: { left: 10, right: 10 },
      });
    });

    doc.save("Realisasi_Pemupukan_Semua_Kebun.pdf");
  };

  const handleExportPdfByKebun = async () => {
    if (!selectedKebun) {
      await Swal.fire({
        title: "Kebun belum dipilih",
        text: "Silakan pilih kebun terlebih dahulu.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    const kebunRows = rows.filter((r) => r.kebun === selectedKebun);
    if (kebunRows.length === 0) {
      await Swal.fire({
        title: "Tidak ada data",
        text: "Tidak ada data realisasi untuk kebun yang dipilih.",
        icon: "info",
        confirmButtonText: "OK",
      });
      return;
    }

    const jsPDFmod = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDFmod.jsPDF({ orientation: "landscape" });

    const kebunLabel = KEBUN_LABEL[selectedKebun] ?? selectedKebun;

    doc.setFontSize(10);
    doc.text(
      `Realisasi Pemupukan - Kebun ${kebunLabel} (${selectedKebun})`,
      14,
      12
    );

    const body = kebunRows.map((r) => [
      r.tanggal,
      r.kategori,
      KEBUN_LABEL[r.kebun] ?? r.kebun,
      r.kodeKebun,
      r.afd,
      r.tt,
      r.blok,
      fmtNum(r.luas),
      fmtNum(r.inv),
      r.jenisPupuk,
      fmtNum(r.aplikasi),
      fmtNum(r.dosis),
      fmtNum(r.kgPupuk),
    ]);

    autoTable(doc, {
      startY: 16,
      head: [TABLE_HEADERS as unknown as string[]],
      body,
      styles: { fontSize: 6 },
      headStyles: { fillColor: [226, 232, 240] },
      margin: { left: 10, right: 10 },
    });

    const fileName = `Realisasi_Pemupukan_${selectedKebun}.pdf`;
    doc.save(fileName);
  };

  return (
    <section className="space-y-2">
      <SectionHeader
        title="Riwayat Realisasi"
        desc="Daftar input realisasi terbaru dari database"
      />

      <Card className="bg-white/80 dark:bg-slate-900/60">
        <CardHeader className="pb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-[13px]">
              Pencarian, Aksi, & Export
            </CardTitle>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Filter data, hapus, atau export riwayat realisasi ke Excel/PDF.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={handleExportExcelAll}
                disabled={loading || rows.length === 0}
                className="px-3 py-1.5 rounded border border-emerald-300 text-[11px] text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
              >
                Export Excel (Semua Kebun)
              </button>
              <button
                type="button"
                onClick={handleExportExcelByKebun}
                disabled={loading || !selectedKebun}
                className="px-3 py-1.5 rounded border border-emerald-300 text-[11px] text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
              >
                Export Excel (Per Kebun)
              </button>
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={handleExportPdfAll}
                disabled={loading || rows.length === 0}
                className="px-3 py-1.5 rounded border border-sky-300 text-[11px] text-sky-800 hover:bg-sky-50 disabled:opacity-50"
              >
                Export PDF (Semua Kebun)
              </button>
              <button
                type="button"
                onClick={handleExportPdfByKebun}
                disabled={loading || !selectedKebun}
                className="px-3 py-1.5 rounded border border-sky-300 text-[11px] text-sky-800 hover:bg-sky-50 disabled:opacity-50"
              >
                Export PDF (Per Kebun)
              </button>
            </div>

            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={rows.length === 0 || loading}
              className="px-3 py-1.5 rounded border border-red-300 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Hapus Semua Data
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex-1">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari kategori (TM/TBM/BIBITAN) / kebun / AFD / blok / jenis pupuk / tanggal…"
                className="h-9"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={selectedKebun}
                onChange={(e) => setSelectedKebun(e.target.value)}
                className="h-9 px-2 text-[11px] border border-slate-300 rounded bg-white dark:bg-slate-900"
              >
                <option value="">Pilih kebun…</option>
                {kebunOptions.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleDeleteByKebun}
                disabled={!selectedKebun || loading}
                className="px-3 py-1.5 rounded border border-red-300 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Hapus Data per Kebun
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-md">
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
                    className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
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
                          className="px-2 py-1 rounded border border-slate-300 text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800"
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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>
              Menampilkan{" "}
              {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}
              -
              {Math.min(page * pageSize, filtered.length)} dari{" "}
              {filtered.length}
            </span>
            <div className="flex gap-2 justify-end">
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
