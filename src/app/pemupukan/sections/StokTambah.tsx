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
import { RefreshCcw, Save } from "lucide-react";

type StokFormData = {
  kebun: string;
  kodeKebun: string;
  stokKg: string; // total stok dalam kg
};

// parser angka longgar (dukung "6.201,5" atau "6,201.5")
function toNumberLoose(v: string): number {
  if (!v) return 0;
  const s = v.trim();
  if (!s) return 0;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  let normalized = s;

  if (hasComma && hasDot) {
    // asumsikan format ID: "." ribuan, "," desimal
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma && !hasDot) {
    normalized = s.replace(",", ".");
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export default function StokTambah() {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<StokFormData>({
    kebun: "",
    kodeKebun: "",
    stokKg: "",
  });

  const kebunOptions = useMemo(
    () =>
      Object.keys(KEBUN_LABEL).map((code) => ({
        code,
        name: KEBUN_LABEL[code] ?? code,
      })),
    []
  );

  const onChange = <K extends keyof StokFormData>(key: K, value: StokFormData[K]) => {
    setForm((s) => ({ ...s, [key]: value }));
  };

  const reset = () => {
    setForm({ kebun: "", kodeKebun: "", stokKg: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const stok = toNumberLoose(form.stokKg);
    if (!form.kebun) return alert("Pilih kebun terlebih dahulu.");
    if (!form.kodeKebun.trim()) return alert("Isi Kode Kebun.");
    if (!Number.isFinite(stok) || stok <= 0) return alert("Stok (kg) harus angka > 0.");

    setSubmitting(true);
    try {
      const payload = {
        kebun: form.kebun,
        kode_kebun: form.kodeKebun.trim().toUpperCase(),
        stok_kg: stok,
      };

      // TODO: aktifkan saat endpoint tersedia
      // const res = await fetch("/api/pemupukan/stok", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload),
      // });
      // if (!res.ok) throw new Error(await res.text());

      console.log("SUBMIT STOK", payload);
      alert("Data stok siap dikirim. (Demo) Lihat console untuk payload.");
      reset();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data stok. Cek console untuk detail.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="stok-tambah" className="space-y-2 scroll-mt-24">
      <SectionHeader
        title="Stok Pupuk - Tambah Data"
        desc="Input stok (kg) per kebun & kode kebun."
      />

      <Card className="bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px]">Formulir Stok</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <form className="space-y-6" onSubmit={handleSubmit} autoComplete="off">
            {/* ===== Identitas & Stok ===== */}
            <div className="space-y-3">
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Identitas & Stok
              </p>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-4">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kebun (Kode)
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
                    Stok (kg)
                  </label>
                  <Input
                    inputMode="decimal"
                    value={form.stokKg}
                    onChange={(e) => onChange("stokKg", e.target.value)}
                    placeholder="mis. 6.200"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
              <Button type="button" variant="outline" className="gap-2" onClick={reset}>
                <RefreshCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
