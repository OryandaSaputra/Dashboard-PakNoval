import type { PlanRow } from "./planDB";

export type RealRow = PlanRow & { tanggal: string };

let _reals: RealRow[] = [];

export function addReal(r: RealRow) { _reals.push(r); }
export function listReals(): RealRow[] { return _reals.slice(); }
export function clearReals() { _reals = []; }
