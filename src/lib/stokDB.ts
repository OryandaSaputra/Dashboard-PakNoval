export type StokRecord = { id: string; kebun: string; kode_kebun: string; stok_kg: number; created_at: string; };
let _stokDb: StokRecord[] = [];

export function addStok(rec: Omit<StokRecord, "id" | "created_at">): StokRecord {
  const row: StokRecord = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...rec };
  _stokDb.push(row); return row;
}
export function listStok(): StokRecord[] { return [..._stokDb].sort((a, b) => b.created_at.localeCompare(a.created_at)); }
export function totalStokByKebun(kebun: string): number { return _stokDb.filter(r => r.kebun === kebun).reduce((s, r) => s + r.stok_kg, 0); }
export function clearStok() { _stokDb = []; }
