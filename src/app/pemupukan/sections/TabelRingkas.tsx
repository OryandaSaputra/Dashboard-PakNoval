import SectionHeader from "../components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ORDER_DTM, ORDER_DBR, KEBUN_LABEL } from "../constants";
import { FertRow } from "../types";

export default function TabelRingkas({
  filtered, loading,
}: { filtered: FertRow[]; loading: boolean; }) {
  const renderGroup = (label: "DTM" | "DBR", order: string[]) => {
    const rowsGrp = filtered
      .filter((r) => r.distrik === label || (label === "DTM" ? r.is_dtm : r.is_dbr))
      .filter((r) => order.includes(r.kebun))
      .sort((a, b) => order.indexOf(a.kebun) - order.indexOf(b.kebun));

    const totalR = rowsGrp.reduce((a, b) => a + (b.rencana_total || 0), 0);
    const totalX = rowsGrp.reduce((a, b) => a + (b.realisasi_total || 0), 0);
    const prog = totalR ? (totalX / totalR) * 100 : 0;

    return (
      <table className="min-w-full text-xs">
        <thead className="bg-slate-100 dark:bg-slate-800/40">
          <tr>
            <th className="px-3 py-2 text-left w-24">Distrik</th>
            <th className="px-3 py-2 text-left">Kebun</th>
            <th className="px-3 py-2 text-right w-32">Rencana (Kg)</th>
            <th className="px-3 py-2 text-right w-32">Realisasi (Kg)</th>
            <th className="px-3 py-2 text-right w-24">Progress</th>
          </tr>
        </thead>
        <tbody>
          {rowsGrp.map((r, i) => (
            <tr key={`${label}-${r.kebun}`} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-3 py-2 align-top">{i === 0 ? label : ""}</td>
              <td className="px-3 py-2">{KEBUN_LABEL[r.kebun] ?? r.kebun}</td>
              <td className="px-3 py-2 text-right">{(r.rencana_total || 0).toLocaleString("id-ID")}</td>
              <td className="px-3 py-2 text-right">{(r.realisasi_total || 0).toLocaleString("id-ID")}</td>
              <td className="px-3 py-2 text-right">
                {(r.rencana_total ? (r.realisasi_total / r.rencana_total) * 100 : 0).toFixed(1)}%
              </td>
            </tr>
          ))}
          <tr className="bg-[--ptpn-cream] dark:bg-slate-800/60 font-medium border-t border-slate-200 dark:border-slate-700">
            <td className="px-3 py-2" />
            <td className="px-3 py-2">Total {label}</td>
            <td className="px-3 py-2 text-right">{totalR.toLocaleString("id-ID")}</td>
            <td className="px-3 py-2 text-right">{totalX.toLocaleString("id-ID")}</td>
            <td className="px-3 py-2 text-right">{prog.toFixed(1)}%</td>
          </tr>
        </tbody>
      </table>
    );
  };

  return (
    <section id="tabel" className="space-y-2 scroll-mt-20">
      <SectionHeader title="Tabel Ringkas" desc="Rencana vs Realisasi per Distrik" />
      <Card className="overflow-hidden bg-white/80 dark:bg-slate-900/60">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {renderGroup("DTM", ORDER_DTM)}
              {renderGroup("DBR", ORDER_DBR)}
            </div>

            {filtered.length === 0 && !loading && (
              <div className="p-6 text-center text-slate-500 text-sm">Tidak ada data untuk filter saat ini.</div>
            )}
            {loading && <div className="p-6 text-center text-slate-500 text-sm">Memuat data…</div>}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
