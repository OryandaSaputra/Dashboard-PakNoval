export type PlanRow = {
  kebun: string; kode_kebun: string; afd: string; tt: number; blok: string;
  luas: number; inv: number; jenis_pupuk: string; aplikasi: number; dosis: number; kg_pupuk: number;
};

let _plans: PlanRow[] = [];

export function addPlan(p: PlanRow) { _plans.push(p); }
export function listPlans(): PlanRow[] { return _plans.slice(); }
export function clearPlans() { _plans = []; }
