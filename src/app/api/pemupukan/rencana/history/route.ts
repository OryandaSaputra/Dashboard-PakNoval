import { NextResponse } from "next/server";
import { listPlans } from "@/lib/planDB";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = listPlans().map((p) => ({
    kebun: p.kebun,
    kodeKebun: p.kode_kebun,
    tanggal: "",
    afd: p.afd,
    tt: String(p.tt),
    blok: p.blok,
    luas: p.luas,
    inv: p.inv,
    jenisPupuk: p.jenis_pupuk,
    aplikasi: p.aplikasi,
    dosis: p.dosis,
    kgPupuk: p.kg_pupuk,
  }));
  return NextResponse.json(rows);
}
