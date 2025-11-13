import type { PlanRow } from "./planDB";
import type { RealRow } from "./realDB";

export const MASTER_JENIS = ["NPK 13.6.27.4", "NPK 12.12.17.2", "UREA", "TSP", "MOP", "RP", "DOLOMITE", "BORATE", "CuSO4", "ZnSO4"] as const;
export const MASTER_AFD = ["AFD01", "AFD02", "AFD03", "AFD04"] as const;
export const MASTER_BLOK = ["D6", "D8", "D10", "E1A", "E2", "E4", "E6", "F1", "F3"] as const;

export const MASTER_KEBUN = [
  { kebun: "TJM", name: "Tanjung Medan", kode: "DTM01" }, { kebun: "TNP", name: "Tanah Putih", kode: "DTM02" },
  { kebun: "SPG", name: "Sei Pagar", kode: "DTM03" }, { kebun: "SGL", name: "Sei Galuh", kode: "DTM04" },
  { kebun: "SGR", name: "Sei Garo", kode: "DTM05" }, { kebun: "LBD", name: "Lubuk Dalam", kode: "DTM06" },
  { kebun: "SBT", name: "Sei Buatan", kode: "DTM07" }, { kebun: "AM1", name: "Air Molek- I", kode: "DTM08" },
  { kebun: "AM2", name: "Air Molek- II", kode: "DTM09" },
  { kebun: "SKC", name: "Sei Kencana", kode: "DBR01" }, { kebun: "TRT", name: "Terantam", kode: "DBR02" },
  { kebun: "TDN", name: "Tandun", kode: "DBR03" }, { kebun: "SLD", name: "Sei Lindai", kode: "DBR04" },
  { kebun: "TMR", name: "Tamora", kode: "DBR05" }, { kebun: "SBL", name: "Sei Batulangkah", kode: "DBR06" },
  { kebun: "SBR", name: "Sei Berlian", kode: "DBR07" }, { kebun: "SRK", name: "Sei Rokan", kode: "DBR08" },
  { kebun: "SIN", name: "Sei Intan", kode: "DBR09" }, { kebun: "SIS", name: "Sei Siasam", kode: "DBR10" },
  { kebun: "STP", name: "Sei Tapung", kode: "DBR11" },
] as const;

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(a: readonly T[]) => a[rand(0, a.length - 1)];

export function genPlans(seed = 500): PlanRow[] {
  const rows: PlanRow[] = [];
  for (let i = 0; i < seed; i++) {
    const keb = pick(MASTER_KEBUN);
    const afd = pick(MASTER_AFD);
    const blok = pick(MASTER_BLOK);
    const jenis = pick(MASTER_JENIS);
    const luas = Number((Math.random() * 35 + 8).toFixed(2));
    const dosis = pick([2, 2.5, 3, 3.5]);
    const aplikasi = 1;
    const kg = Math.round(luas * dosis * 100);
    rows.push({
      kebun: keb.kebun, kode_kebun: keb.kode, afd, tt: rand(1998, 2014), blok, luas,
      inv: rand(1500, 4200), jenis_pupuk: jenis, aplikasi, dosis, kg_pupuk: kg
    });
  }
  return rows;
}

export function genReals(plans: PlanRow[], fraction = 0.8): RealRow[] {
  const n = Math.max(1, Math.floor(plans.length * fraction));
  const sample = [...plans].sort(() => Math.random() - 0.5).slice(0, n);
  const start = new Date(new Date().getFullYear(), 0, 1).getTime(), end = Date.now();
  return sample.map(p => {
    const kg = Math.max(0, Math.round(p.kg_pupuk * (0.9 + Math.random() * 0.2)));
    const tanggal = new Date(rand(start, end)).toISOString().slice(0, 10);
    return { ...p, kg_pupuk: kg, tanggal };
  });
}
