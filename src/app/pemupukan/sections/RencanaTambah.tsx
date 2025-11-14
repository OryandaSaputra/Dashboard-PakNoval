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

type FormData = {
  kebun: string;
  kodeKebun: string;
  tanggal: string;   // YYYY-MM-DD
  afd: string;       // AFD01, AFD02, ...
  tt: string;        // Tahun Tanam
  blok: string;      // D6, E10, dst
  luas: string;      // ha (boleh desimal)
  inv: string;       // pokok (integer)
  jenisPupuk: string;
  aplikasi: string;  // ke- (1,2,3..)
  dosis: string;     // kg/pokok (desimal)
  kgPupuk: string;   // total kg (manual)
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

export default function RencanaTambah() {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>({
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
    dosis: "3",
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
      dosis: "3",
      kgPupuk: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
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
        kg_pupuk: toNumberLoose(form.kgPupuk),
      };

      // TODO: aktifkan saat endpoint tersedia
      // const res = await fetch("/api/pemupukan/Rencana", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload),
      // });
      // if (!res.ok) throw new Error(await res.text());

      console.log("SUBMIT", payload);
      alert("Data siap dikirim. (Demo) Lihat console untuk payload.");
      reset();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data. Cek console untuk detail.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="renc-tambah" className="space-y-2 scroll-mt-24">
      <SectionHeader
        title="Rencana Pemupukan - Tambah Data"
        desc="Isi data Rencana sesuai laporan lapangan."
      />

      <Card className="bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px]">Formulir Rencana</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* ===== Identitas Lokasi ===== */}
            <div className="space-y-3">
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Identitas Lokasi
              </p>
              <div className="grid grid-cols-12 gap-3">
                {/* Baris 1 */}
                <div className="col-span-12 md:col-span-4">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">Nama Kebun</label>
                  <Select value={form.kebun} onValueChange={(v) => onChange("kebun", v)}>
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
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">Kode Kebun</label>
                  <Input
                    value={form.kodeKebun}
                    onChange={(e) => onChange("kodeKebun", e.target.value.toUpperCase())}
                    placeholder="mis. 3E18"
                    className="h-10"
                  />
                </div>
                <div className="col-span-12 md:col-span-4">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">Tanggal</label>
                  <Input
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => onChange("tanggal", e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Baris 2 */}
                <div className="col-span-6 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">AFD</label>
                  <Select value={form.afd} onValueChange={(v) => onChange("afd", v)}>
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
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">TT (Tahun Tanam)</label>
                  <Input
                    inputMode="numeric"
                    value={form.tt}
                    onChange={(e) => onChange("tt", e.target.value.replace(/\D/g, ""))}
                    placeholder="mis. 2004"
                    className="h-10"
                    maxLength={4}
                  />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">Blok</label>
                  <Input
                    value={form.blok}
                    onChange={(e) => onChange("blok", e.target.value.toUpperCase())}
                    placeholder="mis. D6"
                    className="h-10"
                  />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">Luas (Ha)</label>
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
                {/* 1 baris pas 12 kolom: 2 + 3 + 2 + 2 + 3 */}
                <div className="col-span-6 md:col-span-2">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">INV (Pokok)</label>
                  <Input
                    inputMode="numeric"
                    value={form.inv}
                    onChange={(e) => onChange("inv", e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="mis. 2067"
                    className="h-10"
                  />
                </div>

                <div className="col-span-12 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">Jenis Pupuk</label>
                  <Select value={form.jenisPupuk} onValueChange={(v) => onChange("jenisPupuk", v)}>
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
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">Aplikasi (ke-)</label>
                  <Input
                    inputMode="numeric"
                    value={form.aplikasi}
                    onChange={(e) => onChange("aplikasi", e.target.value.replace(/[^\d]/g, ""))}
                    className="h-10"
                  />
                </div>

                <div className="col-span-6 md:col-span-2">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">Dosis (Kg/pokok)</label>
                  <Input
                    inputMode="decimal"
                    value={form.dosis}
                    onChange={(e) => onChange("dosis", e.target.value)}
                    placeholder="mis. 3"
                    className="h-10"
                  />
                </div>

                <div className="col-span-12 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">KG Pupuk (Total)</label>
                  <Input
                    inputMode="decimal"
                    value={form.kgPupuk}
                    onChange={(e) => onChange("kgPupuk", e.target.value)}
                    placeholder="mis. 6201"
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
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
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
