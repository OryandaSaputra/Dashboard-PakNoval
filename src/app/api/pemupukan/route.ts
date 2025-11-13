// src/app/api/pemupukan/route.ts
import { NextResponse } from "next/server";
import { totalStokByKebun } from "@/lib/stokDB"; // pastikan file ini ada
export const dynamic = "force-dynamic";

/** =============== Tipe raw (sesuai spreadsheet) =============== */
type PlanRow = {
  kebun: string;          // Kode kebun singkat (TJM, SBL, dst.)
  kode_kebun: string;     // Kode internal
  afd: string;            // AFD01, dst.
  tt: number;             // Tahun tanam
  blok: string;           // D6, D8, E1A, ...
  luas: number;           // ha
  inv: number;            // inventaris / id
  jenis_pupuk: string;    // NPK..., UREA, TSP, MOP, RP, DOLOMITE, BORATE, CuSO4, ZnSO4
  aplikasi: number;       // 1..n
  dosis: number;          // kg/ha
  kg_pupuk: number;       // total kg
};

type RealRow = PlanRow & {
  tanggal: string;        // yyyy-mm-dd
};

/** =============== Tipe agregat untuk FE =============== */
export type FertRow = {
  // Identitas
  kebun: string;                          // Kode kebun (TJM, SBL, ...)
  kebun_name?: string;                    // Nama lengkap
  distrik: "DTM" | "DBR";                 // Hanya DTM/DBR
  wilayah?: "DTM" | "DBR";                // redundan untuk filter
  is_dtm?: boolean;
  is_dbr?: boolean;
  tanggal?: string;                       // tanggal realisasi terbaru per kebun

  // Total
  rencana_total: number;
  realisasi_total: number;
  persen_total?: number;

  // TM / TBM
  tm_rencana?: number;
  tm_realisasi?: number;
  tbm_rencana?: number;
  tbm_realisasi?: number;

  // Per-jenis (rencana)
  rencana_npk?: number;
  rencana_urea?: number;
  rencana_tsp?: number;
  rencana_mop?: number;
  rencana_rp?: number;
  rencana_dolomite?: number;
  rencana_borate?: number;
  rencana_cuso4?: number;
  rencana_znso4?: number;

  // Per-jenis (realisasi)
  real_npk?: number;
  real_urea?: number;
  real_tsp?: number;
  real_mop?: number;
  real_rp?: number;
  real_dolomite?: number;
  real_borate?: number;
  real_cuso4?: number;
  real_znso4?: number;

  // Opsional (logistik)
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

/** Ambil hanya key yang bernilai number */
type NumericKeys<T> = {
  [K in keyof T]-?: T[K] extends number ? K : never;
}[keyof T];

/** Versi “agg” dengan semua field numerik wajib (bukan optional) */
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

/** Mapping aman ke numeric keys */
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

/** =============== Master Data =============== */
const MASTER_JENIS = [
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
] as const;

// Kebun sesuai contoh, dikelompokkan DTM lalu DBR
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

const MASTER_AFD = ["AFD01", "AFD02", "AFD03", "AFD04"] as const;
const MASTER_BLOK = ["D6", "D8", "D10", "E1A", "E2", "E4", "E6", "F1", "F3"] as const;

/** =============== Utils =============== */
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T,>(arr: readonly T[]) => arr[rand(0, arr.length - 1)];

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

/** =============== Generator Data Dummy (Mock) =============== */
function genPlans(seed = 700) {
  const rows: PlanRow[] = [];
  for (let i = 0; i < seed; i++) {
    const keb = pick(MASTER_KEBUN);
    const afd = pick(MASTER_AFD);
    const blok = pick(MASTER_BLOK);
    const jenis = pick(MASTER_JENIS);
    const luas = Number((Math.random() * 35 + 8).toFixed(2)); // 8—43 ha
    const dosis = pick([2, 2.5, 3, 3.5]); // kg/ha
    const aplikasi = 1;
    const kg = Math.round(luas * dosis * 100); // skala diperbesar supaya grafik jelas

    rows.push({
      kebun: keb.kebun,
      kode_kebun: keb.kode,
      afd,
      tt: rand(1998, 2014),
      blok,
      luas,
      inv: rand(1500, 4200),
      jenis_pupuk: jenis,
      aplikasi,
      dosis,
      kg_pupuk: kg,
    });
  }
  return rows;
}

function genRealizations(plans: PlanRow[]) {
  const n = rand(Math.floor(plans.length * 0.7), plans.length); // 70–100% plan terealisasi
  const shuffled = [...plans].sort(() => Math.random() - 0.5);
  const chosen = shuffled.slice(0, n);

  const start = new Date(new Date().getFullYear(), 0, 1).getTime();
  const end = Date.now();

  const rows: RealRow[] = chosen.map((p) => {
    // variasi realisasi ±10% dari rencana
    const kg = Math.max(0, Math.round(p.kg_pupuk * (0.9 + Math.random() * 0.2)));
    const t = new Date(rand(start, end));
    const tanggal = t.toISOString().slice(0, 10);
    return { ...p, kg_pupuk: kg, tanggal };
  });

  return rows;
}

/** =============== Handler =============== */
export async function GET() {
  // 1) Bangun dataset besar (mock). Ganti 2 fungsi di atas dengan parser XLSX jika sudah ada file nyata.
  const plans = genPlans(700);
  const reals = genRealizations(plans);

  // 2) Agregasi per kebun (pakai FertRowAgg supaya field numeric wajib ada)
  const byKebun = new Map<string, FertRowAgg>();

  // Init helper untuk satu kebun
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
        tbm_rencana: 0,
        tm_realisasi: 0,
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

  // Agregasi RENCANA
  for (const p of plans) {
    const agg = ensure(p.kebun);
    if (!agg) continue;

    agg.rencana_total += p.kg_pupuk;

    // per-jenis rencana (tanpa any)
    const jk = jenisKey(p.jenis_pupuk);
    const rKey = RENCANA_FIELD[jk];
    agg[rKey] += p.kg_pupuk;

    // TM/TBM rencana
    if (isTM(p.tt)) agg.tm_rencana += p.kg_pupuk;
    else agg.tbm_rencana += p.kg_pupuk;
  }

  // Agregasi REALISASI
  for (const r of reals) {
    const agg = ensure(r.kebun);
    if (!agg) continue;

    agg.realisasi_total += r.kg_pupuk;
    // tanggal terbaru per kebun
    agg.tanggal = agg.tanggal && agg.tanggal > r.tanggal ? agg.tanggal : r.tanggal;

    // per-jenis realisasi (tanpa any)
    const jk = jenisKey(r.jenis_pupuk);
    const realKey = REAL_FIELD[jk];
    agg[realKey] += r.kg_pupuk;

    // TM/TBM realisasi
    if (isTM(r.tt)) agg.tm_realisasi += r.kg_pupuk;
    else agg.tbm_realisasi += r.kg_pupuk;
  }

  // 3) Persentase total + stok nyata dari input + sisa kebutuhan
  const out: FertRow[] = Array.from(byKebun.values()).map((v) => {
    const persen = v.rencana_total ? (v.realisasi_total / v.rencana_total) * 100 : 0;

    // Ambil stok dari input user (ditotal per kebun)
    const stokNyata = totalStokByKebun(v.kebun);
    const stok = Math.max(0, Math.round(stokNyata));

    // Sisa kebutuhan = rencana - realisasi (bisa disesuaikan business rule)
    const sisa = Math.max(0, v.rencana_total - v.realisasi_total);
    const sisa_kebutuhan = Math.round(sisa);

    return { ...v, persen_total: persen, stok, sisa_kebutuhan };
  });

  return NextResponse.json(out);
}
