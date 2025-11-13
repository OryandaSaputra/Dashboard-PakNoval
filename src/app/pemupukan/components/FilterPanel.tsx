import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter as FilterIcon, RefreshCcw } from "lucide-react";
import { KEBUN_LABEL } from "../constants";

export default function FilterPanel({
  open, onClose,
  distrik, setDistrik,
  kebun, setKebun,
  jenis, setJenis, jenisOptions,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  search, setSearch,
  distrikOptions, kebunOptions,
  resetFilter,
}: {
  open: boolean; onClose: () => void;
  distrik: string; setDistrik: (v: string) => void;
  kebun: string; setKebun: (v: string) => void;
  jenis: string; setJenis: (v: string) => void; jenisOptions: string[];
  dateFrom: string; setDateFrom: (v: string) => void;
  dateTo: string; setDateTo: (v: string) => void;
  search: string; setSearch: (v: string) => void;
  distrikOptions: string[]; kebunOptions: string[];
  resetFilter: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-slate-900 shadow-xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <FilterIcon className="h-5 w-5" /> Filter
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetFilter} className="gap-2 h-8 px-3">
              <RefreshCcw className="h-4 w-4" /> Reset
            </Button>
            <Button variant="outline" onClick={onClose} className="h-8 px-3">
              Tutup
            </Button>
          </div>
        </div>

        <Card className="bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-4">
            <div className="grid md:grid-cols-6 gap-3">
              <div className="md:col-span-3">
                <label className="text-[11px] text-slate-500 dark:text-slate-400">Distrik</label>
                <Select value={distrik} onValueChange={(v) => setDistrik(v)}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Pilih Distrik" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {distrikOptions.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3">
                <label className="text-[11px] text-slate-500 dark:text-slate-400">Kebun</label>
                <Select value={kebun} onValueChange={(v) => setKebun(v)}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Pilih Kebun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {kebunOptions.map((k) => (<SelectItem key={k} value={k}>{KEBUN_LABEL[k] ?? k}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3">
                <label className="text-[11px] text-slate-500 dark:text-slate-400">Jenis Pupuk</label>
                <Select value={jenis} onValueChange={(v) => setJenis(v)}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Pilih Jenis Pupuk" />
                  </SelectTrigger>
                  <SelectContent>
                    {jenisOptions.map((j) => (<SelectItem key={j} value={j}>{j.toUpperCase()}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3">
                <label className="text-[11px] text-slate-500 dark:text-slate-400">Realisasi: Dari</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
              </div>

              <div className="md:col-span-3">
                <label className="text-[11px] text-slate-500 dark:text-slate-400">Realisasi: Sampai</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
              </div>

              <div className="md:col-span-6">
                <label className="text-[11px] text-slate-500 dark:text-slate-400">Cari Kebun</label>
                <Input placeholder="ketik nama kebun…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              {distrik !== "all" && <Badge variant="secondary">Distrik: {distrik}</Badge>}
              {kebun !== "all" && <Badge variant="secondary">Kebun: {KEBUN_LABEL[kebun] ?? kebun}</Badge>}
              {jenis !== "all" && <Badge variant="secondary">Jenis: {jenis}</Badge>}
              {dateFrom && <Badge variant="secondary">Dari: {dateFrom}</Badge>}
              {dateTo && <Badge variant="secondary">Sampai: {dateTo}</Badge>}
              {search && <Badge variant="secondary">Cari: {search}</Badge>}
              {distrik === "all" && kebun === "all" && jenis === "all" && !dateFrom && !dateTo && !search && (
                <span className="text-slate-400 dark:text-slate-500">Tidak ada filter aktif</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
