// src/app/api/pemupukan/route.ts
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

/** =============== Tipe agregat untuk FE =============== */
export type FertRow = {
  // Identitas
  kebun: string;                          // Kode kebun (TJM, SBL, …)
  kebun_name?: string;
  distrik: "DTM" | "DBR";
  wilayah?: "DTM" | "DBR";
  is_dtm?: boolean;
  is_dbr?: boolean;
  tanggal?: string;                       // yyyy-mm-dd (selalu 5 hari terakhir)

  // Total
  rencana_total: number;
  realisasi_total: number;
  persen_total?: number;

  // TM / TBM
  tm_rencana: number;
  tm_realisasi: number;
  tbm_rencana: number;
  tbm_realisasi: number;

  // Per-jenis (rencana, Kg)
  rencana_npk: number;
  rencana_urea: number;
  rencana_tsp: number;
  rencana_mop: number;
  rencana_rp: number;
  rencana_dolomite: number;
  rencana_borate: number;
  rencana_cuso4: number;
  rencana_znso4: number;

  // Per-jenis (realisasi, Kg)
  real_npk: number;
  real_urea: number;
  real_tsp: number;
  real_mop: number;
  real_rp: number;
  real_dolomite: number;
  real_borate: number;
  real_cuso4: number;
  real_znso4: number;

  // Per-jenis (Ha) –> dipakai untuk grafik Ha
  rencana_npk_ha: number;
  rencana_urea_ha: number;
  rencana_tsp_ha: number;
  rencana_mop_ha: number;
  rencana_rp_ha: number;
  rencana_dolomite_ha: number;
  rencana_borate_ha: number;
  rencana_cuso4_ha: number;
  rencana_znso4_ha: number;

  real_npk_ha: number;
  real_urea_ha: number;
  real_tsp_ha: number;
  real_mop_ha: number;
  real_rp_ha: number;
  real_dolomite_ha: number;
  real_borate_ha: number;
  real_cuso4_ha: number;
  real_znso4_ha: number;

  // Logistik
  stok?: number;
  sisa_kebutuhan?: number;
};

/** =============== Master Data =============== */
const MASTER_KEBUN = [
  // DTM
  { kebun: "TJM", name: "Tanjung Medan", distrik: "DTM" as const },
  { kebun: "TNP", name: "Tanah Putih", distrik: "DTM" as const },
  { kebun: "SPG", name: "Sei Pagar", distrik: "DTM" as const },
  { kebun: "SGL", name: "Sei Galuh", distrik: "DTM" as const },
  { kebun: "SGR", name: "Sei Garo", distrik: "DTM" as const },
  { kebun: "LBD", name: "Lubuk Dalam", distrik: "DTM" as const },
  { kebun: "SBT", name: "Sei Buatan", distrik: "DTM" as const },
  { kebun: "AM1", name: "Air Molek I", distrik: "DTM" as const },
  { kebun: "AM2", name: "Air Molek II", distrik: "DTM" as const },

  // DBR
  { kebun: "SKC", name: "Sei Kencana", distrik: "DBR" as const },
  { kebun: "TRT", name: "Terantam", distrik: "DBR" as const },
  { kebun: "TDN", name: "Tandun", distrik: "DBR" as const },
  { kebun: "SLD", name: "Sei Lindai", distrik: "DBR" as const },
  { kebun: "TMR", name: "Tamora", distrik: "DBR" as const },
  { kebun: "SBL", name: "Sei Batulangkah", distrik: "DBR" as const },
  { kebun: "SBR", name: "Sei Berlian", distrik: "DBR" as const },
  { kebun: "SRK", name: "Sei Rokan", distrik: "DBR" as const },
  { kebun: "SIN", name: "Sei Intan", distrik: "DBR" as const },
  { kebun: "SIS", name: "Sei Siasam", distrik: "DBR" as const },
  { kebun: "STP", name: "Sei Tapung", distrik: "DBR" as const },
] as const;

/** ================= Util random sederhana ================= */
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// ISO local (pakai timezone host, cukup untuk mock)
const toISO = (d: Date) => d.toISOString().slice(0, 10);

const today = new Date();
const last5Start = new Date(today);
last5Start.setDate(today.getDate() - 4);

/** Bagi total ke beberapa bagian dengan rasio yang kira-kira mendekati `weights` */
function splitByWeights(total: number, weights: number[]): number[] {
  const sumW = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / sumW) * total);
  const rounded = raw.map((v) => Math.round(v));
  // Sinkronkan supaya jumlahnya persis = total
  const diff = total - rounded.reduce((a, b) => a + b, 0);
  if (diff !== 0) {
    const idx = diff > 0 ? 0 : rounded.length - 1;
    rounded[idx] += diff;
  }
  return rounded;
}

/** Buat satu baris FertRow per kebun, semua kolom terisi dan ada variasi % */
function buildRowForKebun(meta: (typeof MASTER_KEBUN)[number], index: number): FertRow {
  // Total rencana per kebun (Kg)
  const rencana_total = randInt(200_000, 450_000);

  // Progress: beberapa kebun 100% (untuk test warna hijau), lainnya 70–95%
  const perfect = index % 4 === 0; // tiap 4 kebun sekali 100%
  const progress = perfect ? 1 : (70 + randInt(0, 25)) / 100; // 0.70 – 0.95
  const realisasi_total = Math.round(rencana_total * progress);

  // Bagi TM / TBM (sekitar 70% : 30%)
  const [tm_rencana, tbm_rencana] = splitByWeights(rencana_total, [0.7, 0.3]);
  const [tm_realisasi, tbm_realisasi] = splitByWeights(realisasi_total, [0.7, 0.3]);

  // Bagi ke jenis pupuk (Kg) – proporsinya bebas tapi konstan
  const jenisWeights = [0.4, 0.15, 0.1, 0.08, 0.07, 0.08, 0.04, 0.04, 0.04];
  const [
    rencana_npk,
    rencana_urea,
    rencana_tsp,
    rencana_mop,
    rencana_rp,
    rencana_dolomite,
    rencana_borate,
    rencana_cuso4,
    rencana_znso4,
  ] = splitByWeights(rencana_total, jenisWeights);

  // Realisasi per jenis mengikuti total progress + sedikit noise
  const realFactor = (base: number) => {
    const noise = (randInt(-5, 5)) / 100; // ±5%
    return Math.max(0, Math.round(base * progress * (1 + noise)));
  };

  const real_npk = realFactor(rencana_npk);
  const real_urea = realFactor(rencana_urea);
  const real_tsp = realFactor(rencana_tsp);
  const real_mop = realFactor(rencana_mop);
  const real_rp = realFactor(rencana_rp);
  const real_dolomite = realFactor(rencana_dolomite);
  const real_borate = realFactor(rencana_borate);
  const real_cuso4 = realFactor(rencana_cuso4);
  const real_znso4 = realFactor(rencana_znso4);

  // Konversi kasar Kg -> Ha (misal 1 Ha ≈ 100 Kg, hanya untuk visual)
  const toHa = (kg: number) => Math.round(kg / 100);

  const rencana_npk_ha = toHa(rencana_npk);
  const rencana_urea_ha = toHa(rencana_urea);
  const rencana_tsp_ha = toHa(rencana_tsp);
  const rencana_mop_ha = toHa(rencana_mop);
  const rencana_rp_ha = toHa(rencana_rp);
  const rencana_dolomite_ha = toHa(rencana_dolomite);
  const rencana_borate_ha = toHa(rencana_borate);
  const rencana_cuso4_ha = toHa(rencana_cuso4);
  const rencana_znso4_ha = toHa(rencana_znso4);

  const real_npk_ha = toHa(real_npk);
  const real_urea_ha = toHa(real_urea);
  const real_tsp_ha = toHa(real_tsp);
  const real_mop_ha = toHa(real_mop);
  const real_rp_ha = toHa(real_rp);
  const real_dolomite_ha = toHa(real_dolomite);
  const real_borate_ha = toHa(real_borate);
  const real_cuso4_ha = toHa(real_cuso4);
  const real_znso4_ha = toHa(real_znso4);

  // Tanggal: acak di 5 hari terakhir (supaya kolom "Real 5 hari terakhir" selalu terisi)
  const d = new Date(last5Start);
  d.setDate(last5Start.getDate() + randInt(0, 4));
  const tanggal = toISO(d);

  // Stok & sisa (logistik)
  const stok = randInt(Math.round(rencana_total * 0.25), Math.round(rencana_total * 0.6));
  const sisa_kebutuhan = Math.max(0, rencana_total - realisasi_total);

  return {
    kebun: meta.kebun,
    kebun_name: meta.name,
    distrik: meta.distrik,
    wilayah: meta.distrik,
    is_dtm: meta.distrik === "DTM",
    is_dbr: meta.distrik === "DBR",
    tanggal,

    rencana_total,
    realisasi_total,
    persen_total: (realisasi_total / rencana_total) * 100,

    tm_rencana,
    tm_realisasi,
    tbm_rencana,
    tbm_realisasi,

    rencana_npk,
    rencana_urea,
    rencana_tsp,
    rencana_mop,
    rencana_rp,
    rencana_dolomite,
    rencana_borate,
    rencana_cuso4,
    rencana_znso4,

    real_npk,
    real_urea,
    real_tsp,
    real_mop,
    real_rp,
    real_dolomite,
    real_borate,
    real_cuso4,
    real_znso4,

    rencana_npk_ha,
    rencana_urea_ha,
    rencana_tsp_ha,
    rencana_mop_ha,
    rencana_rp_ha,
    rencana_dolomite_ha,
    rencana_borate_ha,
    rencana_cuso4_ha,
    rencana_znso4_ha,

    real_npk_ha,
    real_urea_ha,
    real_tsp_ha,
    real_mop_ha,
    real_rp_ha,
    real_dolomite_ha,
    real_borate_ha,
    real_cuso4_ha,
    real_znso4_ha,

    stok,
    sisa_kebutuhan,
  };
}

/** =============== Handler =============== */
export async function GET() {
  // Satu baris per kebun -> semua kolom terisi
  const rows: FertRow[] = MASTER_KEBUN.map((k, idx) =>
    buildRowForKebun(k, idx)
  );

  return NextResponse.json(rows);
}
