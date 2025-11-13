// src/app/api/pemupukan/route.ts
import { NextResponse } from "next/server";
import { totalStokByKebun } from "@/lib/stokDB";
import { listPlans } from "@/lib/planDB";
import { listReals } from "@/lib/realDB";

export const dynamic = "force-dynamic";

/** =============== Tipe raw (sesuai spreadsheet / DB) =============== */
type PlanRow = {
  kebun: string; // Kode kebun singkat (TJM, SBL, dst.)
  kode_kebun: string;
  afd: string;
  tt: number;
  blok: string;
  luas: number;
  inv: number;
  jenis_pupuk: string;
  aplikasi: number;
  dosis: number;
  kg_pupuk: number;
};

type RealRow = PlanRow & {
  tanggal: string; // yyyy-mm-dd
};

/** =============== Tipe agregat untuk FE =============== */
export type FertRow = {
  kebun: string;
  kebun_name?: string;
  distrik: "DTM" | "DBR";
  wilayah?: "DTM" | "DBR";
  is_dtm?: boolean;
  is_dbr?: boolean;
  tanggal?: string;

  rencana_total: number;
  realisasi_total: number;
  persen_total?: number;

  tm_rencana?: number;
  tm_realisasi?: number;
  tbm_rencana?: number;
  tbm_realisasi?: number;

  rencana_npk?: number;
  rencana_urea?: number;
  rencana_tsp?: number;
  rencana_mop?: number;
  rencana_rp?: number;
  rencana_dolomite?: number;
  rencana_borate?: number;
  rencana_cuso4?: number;
  rencana_znso4?: number;

  real_npk?: number;
  real_urea?: number;
  real_tsp?: number;
  real_mop?: number;
  real_rp?: number;
  real_dolomite?: number;
  real_borate?: number;
  real_cuso4?: number;
  real_znso4?: number;

  stok?: number;
  sisa_kebutuhan?: number;
};

/** ===== Tambahan tipe agar bebas `any` dan aman indexing ===== */
type JenisKey =
  | "npk"
  | "urea"
  | "tsp"
  | "mop"
  | "rp"
  | "dolomite"
  | "borate"
  | "cuso4"
  | "znso4";

type NumericKeys<T> = {
  [K in keyof T]-?: T[K] extends number ? K : never;
}[keyof T];

type FertRowAgg = Omit<
  FertRow,
  | "tm_rencana"
  | "tm_realisasi"
  | "tbm_rencana"
  | "tbm_realisasi"
  | "rencana_npk"
  | "rencana_urea"
  | "rencana_tsp"
  | "rencana_mop"
  | "rencana_rp"
  | "rencana_dolomite"
  | "rencana_borate"
  | "rencana_cuso4"
  | "rencana_znso4"
  | "real_npk"
  | "real_urea"
  | "real_tsp"
  | "real_mop"
  | "real_rp"
  | "real_dolomite"
  | "real_borate"
  | "real_cuso4"
  | "real_znso4"
> & {
  tm_rencana: number;
  tm_realisasi: number;
  tbm_rencana: number;
  tbm_realisasi: number;

  rencana_npk: number;
  rencana_urea: number;
  rencana_tsp: number;
  rencana_mop: number;
  rencana_rp: number;
  rencana_dolomite: number;
  rencana_borate: number;
  rencana_cuso4: number;
  rencana_znso4: number;

  real_npk: number;
  real_urea: number;
  real_tsp: number;
  real_mop: number;
  real_rp: number;
  real_dolomite: number;
  real_borate: number;
  real_cuso4: number;
  real_znso4: number;
};

const RENCANA_FIELD: Record<JenisKey, NumericKeys<FertRowAgg>> = {
  npk: "rencana_npk",
  urea: "rencana_urea",
  tsp: "rencana_tsp",
  mop: "rencana_mop",
  rp: "rencana_rp",
  dolomite: "rencana_dolomite",
  borate: "rencana_borate",
  cuso4: "rencana_cuso4",
  znso4: "rencana_znso4",
};

const REAL_FIELD: Record<JenisKey, NumericKeys<FertRowAgg>> = {
  npk: "real_npk",
  urea: "real_urea",
  tsp: "real_tsp",
  mop: "real_mop",
  rp: "real_rp",
  dolomite: "real_dolomite",
  borate: "real_borate",
  cuso4: "real_cuso4",
  znso4: "real_znso4",
};

/** =============== Master Kebun (sama seperti sebelumnya) =============== */
const MASTER_KEBUN = [
  // DTM (Timur)
  { kebun: "TJM", name: "Tanjung Medan", kode: "DTM01", distrik: "DTM" as const },
  { kebun: "TNP", name: "Tanah Putih", kode: "DTM02", distrik: "DTM" as const },
  { kebun: "SPG", name: "Sei Pagar", kode: "DTM03", distrik: "DTM" as const },
  { kebun: "SGL", name: "Sei Galuh", kode: "DTM04", distrik: "DTM" as const },
  { kebun: "SGR", name: "Sei Garo", kode: "DTM05", distrik: "DTM" as const },
  { kebun: "LBD", name: "Lubuk Dalam", kode: "DTM06", distrik: "DTM" as const },
  { kebun: "SBT", name: "Sei Buatan", kode: "DTM07", distrik: "DTM" as const },
  { kebun: "AM1", name: "Air Molek- I", kode: "DTM08", distrik: "DTM" as const },
  { kebun: "AM2", name: "Air Molek- II", kode: "DTM09", distrik: "DTM" as const },

  // DBR (Barat)
  { kebun: "SKC", name: "Sei Kencana", kode: "DBR01", distrik: "DBR" as const },
  { kebun: "TRT", name: "Terantam", kode: "DBR02", distrik: "DBR" as const },
  { kebun: "TDN", name: "Tandun", kode: "DBR03", distrik: "DBR" as const },
  { kebun: "SLD", name: "Sei Lindai", kode: "DBR04", distrik: "DBR" as const },
  { kebun: "TMR", name: "Tamora", kode: "DBR05", distrik: "DBR" as const },
  { kebun: "SBL", name: "Sei Batulangkah", kode: "DBR06", distrik: "DBR" as const },
  { kebun: "SBR", name: "Sei Berlian", kode: "DBR07", distrik: "DBR" as const },
  { kebun: "SRK", name: "Sei Rokan", kode: "DBR08", distrik: "DBR" as const },
  { kebun: "SIN", name: "Sei Intan", kode: "DBR09", distrik: "DBR" as const },
  { kebun: "SIS", name: "Sei Siasam", kode: "DBR10", distrik: "DBR" as const },
  { kebun: "STP", name: "Sei Tapung", kode: "DBR11", distrik: "DBR" as const },
] as const;

/** =============== Utils kecil =============== */
function jenisKey(jenis: string): JenisKey {
  const j = jenis.toUpperCase();
  if (j.startsWith("NPK")) return "npk";
  if (j === "UREA") return "urea";
  if (j === "TSP") return "tsp";
  if (j === "MOP") return "mop";
  if (j === "RP") return "rp";
  if (j.includes("DOLOM")) return "dolomite";
  if (j.includes("BORATE")) return "borate";
  if (j.includes("CUSO4")) return "cuso4";
  if (j.includes("ZNSO4")) return "znso4";
  return "npk";
}

/** TM jika umur >= 4 tahun */
function isTM(tt: number) {
  const age = new Date().getFullYear() - tt;
  return age >= 4;
}

/** =============== Handler utama =============== */
export async function GET() {
  // 1) Ambil data dari DB (hasil POST /api/dev/seed)
  const plans = listPlans() as PlanRow[];
  const reals = listReals() as RealRow[];

  // 2) Agregasi per kebun
  const byKebun = new Map<string, FertRowAgg>();

  const ensure = (kodeKebun: string) => {
    const meta = MASTER_KEBUN.find((k) => k.kebun === kodeKebun);
    if (!meta) return undefined;

    if (!byKebun.has(kodeKebun)) {
      byKebun.set(kodeKebun, {
        kebun: meta.kebun,
        kebun_name: meta.name,
        distrik: meta.distrik,
        wilayah: meta.distrik,
        is_dtm: meta.distrik === "DTM",
        is_dbr: meta.distrik === "DBR",
        tanggal: undefined,

        rencana_total: 0,
        realisasi_total: 0,

        tm_rencana: 0,
        tm_realisasi: 0,
        tbm_rencana: 0,
        tbm_realisasi: 0,

        rencana_npk: 0,
        rencana_urea: 0,
        rencana_tsp: 0,
        rencana_mop: 0,
        rencana_rp: 0,
        rencana_dolomite: 0,
        rencana_borate: 0,
        rencana_cuso4: 0,
        rencana_znso4: 0,

        real_npk: 0,
        real_urea: 0,
        real_tsp: 0,
        real_mop: 0,
        real_rp: 0,
        real_dolomite: 0,
        real_borate: 0,
        real_cuso4: 0,
        real_znso4: 0,
      });
    }
    return byKebun.get(kodeKebun)!;
  };

  // --- RENCANA ---
  for (const p of plans) {
    const agg = ensure(p.kebun);
    if (!agg) continue;

    agg.rencana_total += p.kg_pupuk;

    const jk = jenisKey(p.jenis_pupuk);
    const rKey = RENCANA_FIELD[jk];
    agg[rKey] += p.kg_pupuk;

    if (isTM(p.tt)) agg.tm_rencana += p.kg_pupuk;
    else agg.tbm_rencana += p.kg_pupuk;
  }

  // --- REALISASI ---
  for (const r of reals) {
    const agg = ensure(r.kebun);
    if (!agg) continue;

    agg.realisasi_total += r.kg_pupuk;

    // tanggal terbaru per kebun
    if (!agg.tanggal || agg.tanggal < r.tanggal) {
      agg.tanggal = r.tanggal;
    }

    const jk = jenisKey(r.jenis_pupuk);
    const realKey = REAL_FIELD[jk];
    agg[realKey] += r.kg_pupuk;

    if (isTM(r.tt)) agg.tm_realisasi += r.kg_pupuk;
    else agg.tbm_realisasi += r.kg_pupuk;
  }

  // 3) Hitung persen, stok & sisa kebutuhan
  const out: FertRow[] = Array.from(byKebun.values()).map((v) => {
    const persen = v.rencana_total
      ? (v.realisasi_total / v.rencana_total) * 100
      : 0;

    const stokNyata = totalStokByKebun(v.kebun);
    const stok = Math.max(0, Math.round(stokNyata));

    const sisa = Math.max(0, v.rencana_total - v.realisasi_total);
    const sisa_kebutuhan = Math.round(sisa);

    return { ...v, persen_total: persen, stok, sisa_kebutuhan };
  });

  return NextResponse.json(out);
}
