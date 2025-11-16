"use client";

import React, { useMemo, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { KEBUN_LABEL } from "../constants";
import { RefreshCcw, Save, Upload } from "lucide-react";
import Swal from "sweetalert2";

type Kategori = "TM" | "TBM" | "BIBITAN" | "";

type FormData = {
  kategori: Kategori;
  kebun: string;
  kodeKebun: string;
  tanggal: string; // YYYY-MM-DD (boleh kosong)
  afd: string;
  tt: string;
  blok: string;
  luas: string;
  inv: string;
  jenisPupuk: string;
  aplikasi: string;
  dosis: string;
  kgPupuk: string; // otomatis = inv * dosis
};

const JENIS_PUPUK = [
  "NPK 13.6.27.4",
  "NPK 12.12.17.2",
  "UREA",
  "TSP",
  "MOP",
  "RP",
  "DOLOMITE",
  "BORATE",
  "CuSO4",
  "ZnSO4",
];

const AFD_OPTIONS = Array.from({ length: 10 }, (_, i) =>
  `AFD${String(i + 1).padStart(2, "0")}`
);

// >>>>>>> helper angka (support Date) <<<<<<
function toNumberLoose(v: string | number | Date | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  if (v instanceof Date) return 0; // kalau Date, bukan angka yg kita butuhkan
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// Hitung KG pupuk = INV * Dosis, balikan string (supaya bisa ditaruh ke input)
function computeKgPupuk(invStr: string, dosisStr: string): string {
  const inv = toNumberLoose(invStr);
  const dosis = toNumberLoose(dosisStr);
  const kg = inv * dosis;
  if (!Number.isFinite(kg) || kg === 0) return "";
  return String(kg);
}

// helper untuk tanggal dari Excel (Date | number | string -> "YYYY-MM-DD")
function toIsoDate(cell: unknown): string {
  if (!cell) return "";
  if (cell instanceof Date) {
    const y = cell.getFullYear();
    const m = String(cell.getMonth() + 1).padStart(2, "0");
    const d = String(cell.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const asNum = Number(cell);
  // kalau bentuknya nomor serial Excel
  if (Number.isFinite(asNum) && asNum > 59 && asNum < 60000) {
    const ms = (asNum - 25569) * 86400 * 1000;
    const dt = new Date(ms);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dt.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // fallback: parse string biasa
  const t = new Date(String(cell));
  if (!Number.isNaN(t.getTime())) {
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return "";
}

export default function RencanaTambah() {
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState<FormData>({
    kategori: "",
    kebun: "",
    kodeKebun: "",
    tanggal: "",
    afd: "AFD01",
    tt: "",
    blok: "",
    luas: "",
    inv: "",
    jenisPupuk: "NPK 13.6.27.4",
    aplikasi: "1",
    dosis: "1", // default 1
    kgPupuk: "",
  });

  const kebunOptions = useMemo(
    () =>
      Object.keys(KEBUN_LABEL).map((k) => ({
        code: k,
        name: KEBUN_LABEL[k] ?? k,
      })),
    []
  );

  const onChange = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((s) => ({ ...s, [key]: value }));
  };

  const reset = () => {
    setForm({
      kategori: "",
      kebun: "",
      kodeKebun: "",
      tanggal: "",
      afd: "AFD01",
      tt: "",
      blok: "",
      luas: "",
      inv: "",
      jenisPupuk: "NPK 13.6.27.4",
      aplikasi: "1",
      dosis: "1",
      kgPupuk: "",
    });
  };

  // ============ SUBMIT MANUAL ============

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.kategori) {
      Swal.fire({
        title: "Kategori belum dipilih",
        text: "Silakan pilih kategori (TM / TBM / BIBITAN) terlebih dahulu.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        kategori: form.kategori,
        kebun: form.kebun,
        kode_kebun: form.kodeKebun.trim(),
        tanggal: form.tanggal, // boleh "" → di backend jadi null
        afd: form.afd,
        tt: form.tt.trim(),
        blok: form.blok.trim().toUpperCase(),
        luas: toNumberLoose(form.luas),
        inv: Math.round(toNumberLoose(form.inv)),
        jenis_pupuk: form.jenisPupuk,
        aplikasi: Number(form.aplikasi || 1),
        dosis: toNumberLoose(form.dosis),
        kg_pupuk: toNumberLoose(form.kgPupuk),
      };

      const res = await fetch("/api/pemupukan/rencana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Error response:", text);

        Swal.fire({
          title: "Gagal menyimpan",
          text:
            text ||
            "Gagal menyimpan rencana pemupukan. Silakan cek kembali data atau hubungi admin.",
          icon: "error",
          confirmButtonText: "OK",
        });

        throw new Error(text || "Gagal menyimpan rencana");
      }

      Swal.fire({
        title: "Berhasil",
        text: "Rencana pemupukan berhasil disimpan ke database.",
        icon: "success",
        confirmButtonText: "OK",
      });

      reset();
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Terjadi kesalahan",
        text: "Gagal menyimpan data. Cek console atau hubungi admin.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ============ IMPORT DARI EXCEL (BULK) ============

  const handleImportExcel = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!form.kategori) {
      Swal.fire({
        title: "Kategori belum dipilih",
        text: "Pilih kategori (TM / TBM / BIBITAN) dulu, kategori ini akan dipakai untuk semua baris Excel.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    setImporting(true);
    try {
      const XLSX = (await import("xlsx")) as typeof import("xlsx");
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, {
        type: "array",
        cellDates: true,
        dateNF: "yyyy-mm-dd",
      });

      const sheetNames = workbook.SheetNames;
      if (!sheetNames.length) {
        await Swal.fire({
          title: "File kosong",
          text: "Workbook tidak memiliki sheet.",
          icon: "warning",
        });
        setImporting(false);
        return;
      }

      // === PEMILIHAN SHEET DI SINI ===
      let selectedSheetName = sheetNames[0];

      if (sheetNames.length > 1) {
        const { value: picked } = await Swal.fire({
          title: "Pilih Sheet",
          text: "Pilih nama sheet yang berisi data rencana pemupukan.",
          icon: "question",
          input: "select",
          inputOptions: sheetNames.reduce<Record<string, string>>(
            (acc, name) => {
              acc[name] = name;
              return acc;
            },
            {}
          ),
          inputValue: sheetNames[0],
          showCancelButton: true,
          confirmButtonText: "Pakai sheet ini",
          cancelButtonText: "Batal",
        });

        if (!picked) {
          setImporting(false);
          return;
        }

        selectedSheetName = picked;
      }

      const sheet = workbook.Sheets[selectedSheetName];

      const rows = XLSX.utils.sheet_to_json<(string | number | Date)[]>(
        sheet,
        {
          header: 1,
          defval: "",
        }
      );

      if (!rows.length) {
        Swal.fire({
          title: "File kosong",
          text: "Sheet Excel tidak memiliki data.",
          icon: "warning",
          confirmButtonText: "OK",
        });
        return;
      }

      // --- CARI BARIS HEADER & NORMALISASI ---
      const normalize = (s: string) =>
        String(s ?? "")
          .normalize("NFKD")
          .replace(/\s+/g, "") // buang semua spasi
          .replace(/[^A-Z0-9]/gi, "") // buang simbol
          .toUpperCase();

      // daftar header yang kita harapkan (TANPA TANGGAL, karena rencana tidak punya tanggal)
      const targetHeaders = [
        "KEBUN",
        "KODE KEBUN",
        // "TANGGAL",    // ← sengaja tidak diwajibkan
        "AFD",
        "TT",
        "BLOK",
        "LUAS",
        "INV",
        "JENIS PUPUK",
        "APLIKASI",
        "DOSIS",
        "KG PUPUK",
      ].map(normalize);

      let headerRowIndex = -1;
      let headerNorm: string[] = [];

      // scan maks. 20 baris pertama untuk mencari baris header
      const maxScan = Math.min(rows.length, 20);
      for (let r = 0; r < maxScan; r++) {
        const norm = rows[r].map((h) => normalize(String(h ?? "")));
        const matchCount = norm.filter((col) =>
          targetHeaders.includes(col)
        ).length;

        if (matchCount >= 4) {
          headerRowIndex = r;
          headerNorm = norm;
          break;
        }
      }

      if (headerRowIndex === -1) {
        console.log("Gagal menemukan baris header, rows[0..5] =", rows.slice(0, 5));
        Swal.fire({
          title: "Header tidak sesuai",
          html:
            "Tidak dapat menemukan baris header.<br/>" +
            "Pastikan ada satu baris yang berisi minimal:<br/>" +
            "<b>KEBUN, KODE KEBUN, AFD, TT, BLOK, LUAS, INV, JENIS PUPUK, APLIKASI, DOSIS, KG PUPUK</b><br/>" +
            "Kolom <b>TANGGAL</b> bersifat opsional.",
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }

      const findIdx = (...candidates: string[]) => {
        const candNorms = candidates.map(normalize);
        return headerNorm.findIndex((col) => candNorms.includes(col));
      };

      const idxKebun = findIdx("KEBUN");
      const idxKodeKebun = findIdx("KODE KEBUN", "KODE_KEBUN");
      const idxTanggal = findIdx("TANGGAL", "TGL"); // OPSIONAL
      const idxAfd = findIdx("AFD", "AFDELING");
      const idxTt = findIdx("TT", "TAHUN TANAM");
      const idxBlok = findIdx("BLOK");
      const idxLuas = findIdx("LUAS", "LUAS (HA)");
      const idxInv = findIdx("INV", "POKOK", "JUMLAH POKOK");
      const idxJenisPupuk = findIdx("JENIS PUPUK", "PUPUK");
      const idxAplikasi = findIdx("APLIKASI", "APLIKASI (KE-)");
      const idxDosis = findIdx("DOSIS", "DOSIS (KG/POKOK)");
      const idxKgPupuk = findIdx("KG PUPUK", "KG_PUPUK", "KG PUPUK (TOTAL)");

      // TANGGAL TIDAK MASUK requiredIdx (opsional)
      const requiredIdx = [
        idxKebun,
        idxKodeKebun,
        // idxTanggal, // ← jangan dijadikan wajib
        idxAfd,
        idxTt,
        idxBlok,
        idxLuas,
        idxInv,
        idxJenisPupuk,
        idxAplikasi,
        idxDosis,
        idxKgPupuk,
      ];

      if (requiredIdx.some((i) => i === -1)) {
        console.log("HEADER NORMALIZED:", headerNorm, {
          idxKebun,
          idxKodeKebun,
          idxTanggal,
          idxAfd,
          idxTt,
          idxBlok,
          idxLuas,
          idxInv,
          idxJenisPupuk,
          idxAplikasi,
          idxDosis,
          idxKgPupuk,
        });

        Swal.fire({
          title: "Header tidak sesuai",
          html:
            "Pastikan header Excel minimal berisi:<br/>" +
            "<b>KEBUN, KODE KEBUN, AFD, TT, BLOK, LUAS, INV, JENIS PUPUK, APLIKASI, DOSIS, KG PUPUK</b><br/>" +
            "Kolom <b>TANGGAL</b> boleh tidak ada.",
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }

      // === KUMPULKAN PAYLOAD UNTUK BULK INSERT ===
      type BulkPayload = {
        kategori: string;
        kebun: string;
        kode_kebun: string;
        tanggal: string | null | "-"; // akan dikirim null jika tidak ada tanggal
        afd: string;
        tt: string;
        blok: string;
        luas: number;
        inv: number;
        jenis_pupuk: string;
        aplikasi: number;
        dosis: number;
        kg_pupuk: number;
      };

      const payloads: BulkPayload[] = [];

      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const kebunRaw = row[idxKebun];
        const kodeKebunRaw = row[idxKodeKebun];
        const tanggalRaw = idxTanggal >= 0 ? row[idxTanggal] : undefined;

        // kalau semua kolom penting kosong → skip
        const isRowEmpty =
          !kebunRaw &&
          !kodeKebunRaw &&
          !tanggalRaw &&
          !row[idxInv] &&
          !row[idxLuas];

        if (isRowEmpty) continue;

        const kebunStr = String(kebunRaw ?? "").trim() || "-";
        const kodeKebunStr = String(kodeKebunRaw ?? "").trim() || "-";

        const parsedDate = toIsoDate(tanggalRaw);

        let tanggalFinal: string | null | "-" = null;
        if (!tanggalRaw || String(tanggalRaw).trim() === "") {
          // tidak ada kolom tanggal / tanggal kosong → jadikan null
          tanggalFinal = null;
        } else if (parsedDate) {
          tanggalFinal = parsedDate; // tanggal valid → "YYYY-MM-DD"
        } else {
          tanggalFinal = "-"; // ada isi tapi ga valid → "-"
        }

        const afdStr =
          idxAfd >= 0 ? (String(row[idxAfd] ?? "").trim() || "-") : "-";

        const ttStr =
          idxTt >= 0 ? (String(row[idxTt] ?? "").trim() || "-") : "-";

        const blokStr =
          idxBlok >= 0
            ? (String(row[idxBlok] ?? "").trim().toUpperCase() || "-")
            : "-";

        const luasCell = idxLuas >= 0 ? row[idxLuas] : "";
        const invCell = row[idxInv];

        const jenisPupukStr =
          idxJenisPupuk >= 0
            ? (String(row[idxJenisPupuk] ?? "").trim() || "-")
            : "-";

        const aplikasiCell = idxAplikasi >= 0 ? row[idxAplikasi] : 1;
        const dosisCell = idxDosis >= 0 ? row[idxDosis] : 0;
        const kgPupukCell = idxKgPupuk >= 0 ? row[idxKgPupuk] : undefined;

        const invNum = toNumberLoose(invCell);
        const dosisNum = toNumberLoose(dosisCell);

        let kgPupukNum = kgPupukCell
          ? toNumberLoose(kgPupukCell)
          : invNum * dosisNum;

        if (!Number.isFinite(kgPupukNum)) kgPupukNum = 0;

        payloads.push({
          kategori: form.kategori,
          kebun: kebunStr,
          kode_kebun: kodeKebunStr,
          tanggal: tanggalFinal, // string | null | "-"
          afd: afdStr,
          tt: ttStr,
          blok: blokStr,
          luas: toNumberLoose(luasCell),
          inv: Math.round(invNum),
          jenis_pupuk: jenisPupukStr,
          aplikasi: Number(toNumberLoose(aplikasiCell) || 1),
          dosis: dosisNum,
          kg_pupuk: kgPupukNum,
        });
      }

      if (!payloads.length) {
        Swal.fire({
          title: "Tidak ada data",
          text: "Tidak ada baris valid yang dapat diimport dari Excel.",
          icon: "warning",
          confirmButtonText: "OK",
        });
        return;
      }

      // === KIRIM BULK DALAM CHUNK (untuk >500 baris) ===
      const CHUNK_SIZE = 300;
      let totalInserted = 0;
      let totalSent = 0;

      for (let i = 0; i < payloads.length; i += CHUNK_SIZE) {
        const chunk = payloads.slice(i, i + CHUNK_SIZE);
        totalSent += chunk.length;

        try {
          const res = await fetch("/api/pemupukan/rencana", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(chunk), // <<< kirim ARRAY, bukan satu objek
          });

          if (!res.ok) {
            console.error("Bulk import error status:", res.status);
            continue;
          }

          const json = await res.json().catch(() => null);
          const insertedFromApi =
            (json && (json.inserted as number)) ||
            (json && (json.insertedCount as number)) ||
            0;

          totalInserted += insertedFromApi;
        } catch (err) {
          console.error("Bulk chunk error:", err);
          // kalau 1 chunk error, lanjut chunk berikutnya
        }
      }

      const totalFailed = totalSent - totalInserted;

      Swal.fire({
        title: "Import selesai",
        html: `Berhasil import <b>${totalInserted}</b> baris.<br/>Gagal / terlewat <b>${totalFailed}</b> baris.`,
        icon:
          totalInserted > 0 && totalFailed === 0 ? "success" : "warning",
        confirmButtonText: "OK",
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Gagal membaca Excel",
        text:
          "Terjadi kesalahan saat membaca file Excel. Pastikan format file sudah benar.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <section id="real-tambah" className="space-y-2 scroll-mt-24">
      <SectionHeader
        title="Rencana Pemupukan - Tambah Data"
        desc="Isi data rencana secara manual atau import dari Excel."
      />

      <Card className="bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-[13px]">Formulir Rencana</CardTitle>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImportExcel}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={importing}
                asChild
              >
                <span>
                  <Upload className="h-4 w-4" />
                  {importing ? "Import..." : "Import dari Excel"}
                </span>
              </Button>
            </label>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Kategori */}
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Kategori Tanaman
              </p>
              <div className="max-w-xs">
                <Select
                  value={form.kategori}
                  onValueChange={(v) => onChange("kategori", v as Kategori)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Pilih kategori (TM / TBM / BIBITAN)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TM">
                      TM (Tanaman Menghasilkan)
                    </SelectItem>
                    <SelectItem value="TBM">
                      TBM (Tanaman Belum Menghasilkan)
                    </SelectItem>
                    <SelectItem value="BIBITAN">BIBITAN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Identitas Lokasi */}
            <div className="space-y-3">
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Identitas Lokasi
              </p>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-4">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Nama Kebun
                  </label>
                  <Select
                    value={form.kebun}
                    onValueChange={(v) => onChange("kebun", v)}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Pilih kebun" />
                    </SelectTrigger>
                    <SelectContent>
                      {kebunOptions.map((o) => (
                        <SelectItem key={o.code} value={o.code}>
                          {o.name} ({o.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-12 md:col-span-4">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kode Kebun
                  </label>
                  <Input
                    value={form.kodeKebun}
                    onChange={(e) =>
                      onChange("kodeKebun", e.target.value.toUpperCase())
                    }
                    placeholder="mis. 3E18"
                    className="h-10"
                  />
                </div>
                <div className="col-span-12 md:col-span-4">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tanggal (opsional)
                  </label>
                  <Input
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => onChange("tanggal", e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="col-span-6 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    AFD
                  </label>
                  <Select
                    value={form.afd}
                    onValueChange={(v) => onChange("afd", v)}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="AFD" />
                    </SelectTrigger>
                    <SelectContent>
                      {AFD_OPTIONS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-6 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    TT (Tahun Tanam)
                  </label>
                  <Input
                    inputMode="numeric"
                    value={form.tt}
                    onChange={(e) =>
                      onChange("tt", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="mis. 2004"
                    className="h-10"
                    maxLength={4}
                  />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Blok
                  </label>
                  <Input
                    value={form.blok}
                    onChange={(e) =>
                      onChange("blok", e.target.value.toUpperCase())
                    }
                    placeholder="mis. D6"
                    className="h-10"
                  />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Luas (Ha)
                  </label>
                  <Input
                    inputMode="decimal"
                    value={form.luas}
                    onChange={(e) => onChange("luas", e.target.value)}
                    placeholder="mis. 29,82"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Detail Pemupukan */}
            <div className="space-y-3">
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Detail Pemupukan
              </p>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-6 md:col-span-2">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    INV (Pokok)
                  </label>
                  <Input
                    inputMode="numeric"
                    value={form.inv}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      setForm((prev) => ({
                        ...prev,
                        inv: raw,
                        kgPupuk: computeKgPupuk(raw, prev.dosis),
                      }));
                    }}
                    placeholder="mis. 2067"
                    className="h-10"
                  />
                </div>

                <div className="col-span-12 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Jenis Pupuk
                  </label>
                  <Select
                    value={form.jenisPupuk}
                    onValueChange={(v) => onChange("jenisPupuk", v)}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Pilih jenis pupuk" />
                    </SelectTrigger>
                    <SelectContent>
                      {JENIS_PUPUK.map((j) => (
                        <SelectItem key={j} value={j}>
                          {j.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-6 md:col-span-2">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Aplikasi (ke-)
                  </label>
                  <Input
                    inputMode="numeric"
                    value={form.aplikasi}
                    onChange={(e) =>
                      onChange("aplikasi", e.target.value.replace(/[^\d]/g, ""))
                    }
                    className="h-10"
                  />
                </div>

                <div className="col-span-6 md:col-span-2">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dosis (Kg/pokok)
                  </label>
                  <Input
                    inputMode="decimal"
                    value={form.dosis}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        dosis: raw,
                        kgPupuk: computeKgPupuk(prev.inv, raw),
                      }));
                    }}
                    placeholder="mis. 1"
                    className="h-10"
                  />
                </div>

                <div className="col-span-12 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    KG Pupuk (Total) — otomatis = INV × Dosis
                  </label>
                  <Input
                    inputMode="decimal"
                    value={form.kgPupuk}
                    readOnly
                    className="h-10 bg-slate-50 dark:bg-slate-900/40"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Menyimpan…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Simpan
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={reset}
              >
                <RefreshCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span className="text-sm text-slate-700">
              Mengimport data dari Excel (bulk), mohon tunggu...
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
