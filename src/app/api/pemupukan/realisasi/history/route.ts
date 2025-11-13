import { NextResponse } from "next/server";
import { listReals } from "@/lib/realDB";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = listReals().map(r => ({
    kebun: r.kebun, kodeKebun: r.kode_kebun, tanggal: r.tanggal,
    afd: r.afd, tt: String(r.tt), blok: r.blok,
    luas: r.luas, inv: r.inv, jenisPupuk: r.jenis_pupuk,
    aplikasi: r.aplikasi, dosis: r.dosis, kgPupuk: r.kg_pupuk,
  }));
  return NextResponse.json(rows);
}
