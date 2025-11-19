"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { RefreshCcw, Save } from "lucide-react";
import Swal from "sweetalert2";

type Kategori = "TM" | "TBM" | "BIBITAN";

type ApiRencana = {
  id: number;
  kategori: Kategori;
  kebun: string;
  kodeKebun: string;
  tanggal: string; // ISO
  afd: string;
  tt: string;
  blok: string;
  luasHa: number;
  inv: number;
  jenisPupuk: string;
  aplikasiKe: number;
  dosisKgPerPokok: number;
  kgPupuk: number;
};

type FormData = {
  kategori: Kategori | "";
  kebun: string;
  kodeKebun: string;
  tanggal: string; // YYYY-MM-DD
  afd: string;
  tt: string;
  blok: string;
  luas: string;
  inv: string;
  jenisPupuk: string;
  aplikasi: string;
  dosis: string;
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

function toNumberLoose(v: string): number {
  if (!v) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export default function RencanaEditPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idParam = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
    dosis: "1",
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

  const derivedKgPupuk = useMemo(() => {
    const inv = toNumberLoose(form.inv);
    const dosis = toNumberLoose(form.dosis);
    return inv * dosis;
  }, [form.inv, form.dosis]);

  // Ambil data existing
  useEffect(() => {
    if (!idParam) {
      setLoading(false);
      Swal.fire({
        icon: "error",
        title: "ID tidak ditemukan",
        text: "Parameter id tidak ada. Kembali ke halaman sebelumnya.",
      }).then(() => {
        router.back();
      });
      return;
    }

    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/pemupukan/rencana?id=${idParam}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("GET detail error:", text);
          throw new Error(text || "Gagal mengambil data rencana");
        }

        const data = (await res.json()) as ApiRencana;
        if (!active) return;

        setForm({
          kategori: data.kategori,
          kebun: data.kebun,
          kodeKebun: data.kodeKebun,
          tanggal: data.tanggal.slice(0, 10),
          afd: data.afd,
          tt: data.tt ?? "",
          blok: data.blok,
          luas: data.luasHa != null ? String(data.luasHa) : "",
          inv: data.inv != null ? String(data.inv) : "",
          jenisPupuk: data.jenisPupuk,
          aplikasi:
            data.aplikasiKe != null ? String(data.aplikasiKe) : "1",
          dosis:
            data.dosisKgPerPokok != null
              ? String(data.dosisKgPerPokok)
              : "1",
        });
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: "error",
          title: "Gagal memuat data",
          text: "Terjadi kesalahan saat mengambil data rencana.",
        }).then(() => {
          router.back();
        });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [idParam, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idParam) return;

    if (!form.kategori) {
      Swal.fire({
        icon: "warning",
        title: "Kategori belum dipilih",
        text: "Silakan pilih kategori (TM / TBM / BIBITAN).",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        kategori: form.kategori,
        kebun: form.kebun,
        kode_kebun: form.kodeKebun.trim(),
        tanggal: form.tanggal,
        afd: form.afd,
        tt: form.tt.trim(),
        blok: form.blok.trim().toUpperCase(),
        luas: toNumberLoose(form.luas),
        inv: Math.round(toNumberLoose(form.inv)),
        jenis_pupuk: form.jenisPupuk,
        aplikasi: Number(form.aplikasi || 1),
        dosis: toNumberLoose(form.dosis),
        kg_pupuk: derivedKgPupuk,
      };

      const res = await fetch(`/api/pemupukan/rencana?id=${idParam}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Error response:", text);
        throw new Error(text || "Gagal menyimpan perubahan");
      }

      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Data rencana pemupukan berhasil diperbarui.",
      });

      router.back();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal menyimpan",
        text: "Terjadi kesalahan saat menyimpan perubahan. Cek console/log untuk detail.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    // reset ke kondisi "kosong" (optional, atau bisa di-disable)
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
    });
  };

  if (loading) {
    return (
      <section className="space-y-2">
        <SectionHeader
          title="Edit Rencana Pemupukan"
          desc="Memuat data dari database…"
        />
        <Card className="bg-white/80 dark:bg-slate-900/60">
          <CardContent className="py-8 text-center text-xs text-slate-500">
            Memuat data…
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <SectionHeader
        title="Edit Rencana Pemupukan"
        desc="Perbarui data rencana sesuai laporan lapangan."
      />

      <Card className="bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px]">
            Formulir Edit Rencana
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* ===== Pilih Kategori (TM / TBM / BIBITAN) ===== */}
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Kategori Tanaman
              </p>
              <div className="max-w-xs">
                <Select
                  value={form.kategori}
                  onValueChange={(v) =>
                    onChange("kategori", v as Kategori | "")
                  }
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

            {/* ===== Identitas Lokasi ===== */}
            <div className="space-y-3">
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Identitas Lokasi
              </p>
              <div className="grid grid-cols-12 gap-3">
                {/* Baris 1 */}
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
                    Tanggal
                  </label>
                  <Input
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => onChange("tanggal", e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Baris 2 */}
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

            {/* ===== Detail Pemupukan ===== */}
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
                    onChange={(e) =>
                      onChange("inv", e.target.value.replace(/[^\d]/g, ""))
                    }
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
                      onChange(
                        "aplikasi",
                        e.target.value.replace(/[^\d]/g, "")
                      )
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
                    onChange={(e) => onChange("dosis", e.target.value)}
                    placeholder="mis. 1"
                    className="h-10"
                  />
                </div>

                <div className="col-span-12 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    KG Pupuk (Total) = INV × Dosis
                  </label>
                  <Input
                    readOnly
                    value={
                      derivedKgPupuk
                        ? derivedKgPupuk.toLocaleString("id-ID")
                        : ""
                    }
                    className="h-10 bg-slate-50 dark:bg-slate-800 cursor-not-allowed"
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
                    <Save className="h-4 w-4" /> Simpan Perubahan
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
    </section>
  );
}
