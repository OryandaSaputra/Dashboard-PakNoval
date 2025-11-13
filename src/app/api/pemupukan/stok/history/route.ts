import { NextResponse } from "next/server";
import { listPlans } from "@/lib/planDB";
import { listReals } from "@/lib/realDB";
import { totalStokByKebun } from "@/lib/stokDB";

export const dynamic = "force-dynamic";

export async function GET() {
  const plans = listPlans();
  const realsByKey = new Map<string, ReturnType<typeof listReals>[number]>();

  for (const r of listReals()) {
    const k = [r.kebun, r.kode_kebun, r.afd, r.tt, r.blok, r.jenis_pupuk].join("|");
    realsByKey.set(k, r);
  }

  const rows = plans.map((p) => {
    const k = [p.kebun, p.kode_kebun, p.afd, p.tt, p.blok, p.jenis_pupuk].join(
      "|",
    );
    const r = realsByKey.get(k);
    return {
      kebun: p.kebun,
      kodeKebun: p.kode_kebun,
      tanggal: r?.tanggal ?? "",
      afd: p.afd,
      tt: String(p.tt),
      blok: p.blok,
      jenisPupuk: p.jenis_pupuk,
      rencanaKg: p.kg_pupuk,
      realisasiKg: r?.kg_pupuk ?? 0,
      stokKg: totalStokByKebun(p.kebun),
    };
  });

  return NextResponse.json(rows);
}
