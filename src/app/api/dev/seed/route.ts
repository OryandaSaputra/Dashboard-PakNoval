import { NextResponse } from "next/server";
import { addPlan, clearPlans } from "@/lib/planDB";
import { addReal, clearReals } from "@/lib/realDB";
import { addStok, clearStok } from "@/lib/stokDB";
import { genPlans, genReals, MASTER_KEBUN } from "@/lib/mock";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const plansCount = Number(url.searchParams.get("plans") ?? 700);
  const realsFrac = Number(url.searchParams.get("reals") ?? 0.85); // 0..1
  const stokPerKeb = Number(url.searchParams.get("stok") ?? 15000); // kg per kebun (kasar)

  clearPlans(); clearReals(); clearStok();

  const plans = genPlans(plansCount);
  plans.forEach(addPlan);

  const reals = genReals(plans, realsFrac);
  reals.forEach(addReal);

  // seed stok per kebun (jumlah besar, misal stok gudang)
  MASTER_KEBUN.forEach(k => {
    addStok({ kebun: k.kebun, kode_kebun: k.kode, stok_kg: Math.round(stokPerKeb * (0.7 + Math.random() * 0.6)) });
  });

  return NextResponse.json({ ok: true, plans: plans.length, reals: reals.length, kebun_stok: MASTER_KEBUN.length });
}
