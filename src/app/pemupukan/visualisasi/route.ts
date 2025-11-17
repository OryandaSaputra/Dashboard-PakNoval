// // src/app/pemupukan/visualisasi/route.ts
// import { NextResponse } from "next/server";
// import prisma from "@/lib/db";

// // ====== Type Payload ======
// type AggPupukRow = {
//   jenis: string;
//   rencana: number;
//   realisasi: number;
//   rencana_ha: number;
//   realisasi_ha: number;
//   progress: number;
// };

// type StokSisaRow = {
//   distrik: string;
//   stok: number;
//   sisa: number;
//   stok_pct: number;
//   sisa_pct: number;
// };

// export type TmRow = {
//   no?: number;
//   kebun: string;

//   app1_rencana: number;
//   app1_real: number;
//   app1_pct: number;

//   app2_rencana: number;
//   app2_real: number;
//   app2_pct: number;

//   app3_rencana: number;
//   app3_real: number;
//   app3_pct: number;

//   renc_selasa: number;
//   real_selasa: number;
//   renc_rabu: number;

//   jumlah_rencana2025: number;
//   jumlah_realSd0710: number;
//   jumlah_pct: number;
// };

// type HeaderDates = {
//   today?: string;
//   tomorrow?: string;
//   selasa?: string;
//   rabu?: string;
// };

// type RealWindow = { start?: string; end?: string };

// type VisualisasiPayload = {
//   aggPupuk: AggPupukRow[];
//   stokVsSisa: StokSisaRow[];
//   tmRows: TmRow[];
//   tbmRows: TmRow[];
//   tmTbmRows: TmRow[];
//   headerDates?: HeaderDates;
//   realWindow?: RealWindow;
//   realCutoffDate?: string;
// };

// // =================== Helpers ===================
// function todayISOJakarta(base = new Date()): string {
//   return new Intl.DateTimeFormat("en-CA", {
//     timeZone: "Asia/Jakarta",
//     year: "numeric",
//     month: "2-digit",
//     day: "2-digit",
//   }).format(base);
// }

// function addDaysJakarta(iso: string, n: number): string {
//   const d = new Date(`${iso}T00:00:00+07:00`);
//   d.setDate(d.getDate() + n);
//   return todayISOJakarta(d);
// }

// function toISODate(d: Date | null): string {
//   if (!d) return "";
//   return d.toISOString().slice(0, 10);
// }

// function normalizeNum(v: unknown): number {
//   const n = Number(v);
//   return Number.isFinite(n) ? n : 0;
// }

// function safePct(real: number, rencana: number): number {
//   if (!rencana) return 0;
//   return (real / rencana) * 100;
// }

// // =================== Prisma Record Types ===================
// type Kategori = "TM" | "TBM" | "BIBITAN";

// interface RencanaRecord {
//   id: number;
//   kategori: Kategori;
//   kebun: string;
//   kodeKebun: string;
//   tanggal: Date | null;
//   afd: string;
//   tt: string;
//   blok: string;
//   luasHa: number;
//   inv: number;
//   jenisPupuk: string;
//   aplikasiKe: number;
//   dosisKgPerPokok: number;
//   kgPupuk: number;
// }

// type RealisasiRecord = RencanaRecord;

// // =================== Pie Chart Builder ===================
// function buildAggPupuk(
//   rencanas: RencanaRecord[],
//   realisasis: RealisasiRecord[]
// ): AggPupukRow[] {
//   const map = new Map<
//     string,
//     {
//       jenis: string;
//       rencana: number;
//       realisasi: number;
//       rencana_ha: number;
//       realisasi_ha: number;
//     }
//   >();

//   for (const r of rencanas) {
//     const key = r.jenisPupuk.toUpperCase();
//     const existing = map.get(key) ?? {
//       jenis: key,
//       rencana: 0,
//       realisasi: 0,
//       rencana_ha: 0,
//       realisasi_ha: 0,
//     };

//     existing.rencana += normalizeNum(r.kgPupuk);
//     existing.rencana_ha += normalizeNum(r.luasHa);

//     map.set(key, existing);
//   }

//   for (const x of realisasis) {
//     const key = x.jenisPupuk.toUpperCase();
//     const existing = map.get(key) ?? {
//       jenis: key,
//       rencana: 0,
//       realisasi: 0,
//       rencana_ha: 0,
//       realisasi_ha: 0,
//     };

//     existing.realisasi += normalizeNum(x.kgPupuk);
//     existing.realisasi_ha += normalizeNum(x.luasHa);

//     map.set(key, existing);
//   }

//   return Array.from(map.values()).map((row) => ({
//     ...row,
//     progress: safePct(row.realisasi, row.rencana),
//   }));
// }

// // =================== Build TM/TBM Rows ===================
// function buildTmRows(
//   kategori: Kategori,
//   rencanas: RencanaRecord[],
//   realisasis: RealisasiRecord[],
//   todayISO: string,
//   tomorrowISO: string,
//   winStartISO: string,
//   winEndISO: string
// ): TmRow[] {
//   const renK = rencanas.filter((r) => r.kategori === kategori);
//   const realK = realisasis.filter((r) => r.kategori === kategori);

//   const kebuns = new Set([...renK.map(r => r.kebun), ...realK.map(r => r.kebun)]);

//   const out: TmRow[] = [];

//   for (const kebun of kebuns) {
//     const renX = renK.filter((r) => r.kebun === kebun);
//     const realX = realK.filter((r) => r.kebun === kebun);

//     const sumApp = (list: RencanaRecord[] | RealisasiRecord[], app: number) =>
//       list
//         .filter((x) => x.aplikasiKe === app)
//         .reduce((acc, x) => acc + normalizeNum(x.kgPupuk), 0);

//     const sumRealWindow = (list: RealisasiRecord[], app: number) =>
//       list
//         .filter(
//           (x) =>
//             x.aplikasiKe === app &&
//             x.tanggal &&
//             toISODate(x.tanggal) >= winStartISO &&
//             toISODate(x.tanggal) <= winEndISO
//         )
//         .reduce((acc, x) => acc + normalizeNum(x.kgPupuk), 0);

//     const rencanaHariIni = renX
//       .filter((x) => x.tanggal && toISODate(x.tanggal) === todayISO)
//       .reduce((a, b) => a + normalizeNum(b.kgPupuk), 0);

//     const realHariIni = realX
//       .filter((x) => x.tanggal && toISODate(x.tanggal) === todayISO)
//       .reduce((a, b) => a + normalizeNum(b.kgPupuk), 0);

//     const rencanaBesok = renX
//       .filter((x) => x.tanggal && toISODate(x.tanggal) === tomorrowISO)
//       .reduce((a, b) => a + normalizeNum(b.kgPupuk), 0);

//     const rencana2025 = renX
//       .filter((x) => x.tanggal && x.tanggal.getFullYear() === 2025)
//       .reduce((a, b) => a + normalizeNum(b.kgPupuk), 0);

//     const real5hari = realX
//       .filter(
//         (x) =>
//           x.tanggal &&
//           toISODate(x.tanggal) >= winStartISO &&
//           toISODate(x.tanggal) <= winEndISO
//       )
//       .reduce((a, b) => a + normalizeNum(b.kgPupuk), 0);

//     out.push({
//       kebun,

//       app1_rencana: sumApp(renX, 1),
//       app1_real: sumRealWindow(realX, 1),
//       app1_pct: safePct(sumRealWindow(realX, 1), sumApp(renX, 1)),

//       app2_rencana: sumApp(renX, 2),
//       app2_real: sumRealWindow(realX, 2),
//       app2_pct: safePct(sumRealWindow(realX, 2), sumApp(renX, 2)),

//       app3_rencana: sumApp(renX, 3),
//       app3_real: sumRealWindow(realX, 3),
//       app3_pct: safePct(sumRealWindow(realX, 3), sumApp(renX, 3)),

//       renc_selasa: rencanaHariIni,
//       real_selasa: realHariIni,
//       renc_rabu: rencanaBesok,

//       jumlah_rencana2025: rencana2025,
//       jumlah_realSd0710: real5hari,
//       jumlah_pct: safePct(real5hari, rencana2025),
//     });
//   }

//   out.sort((a, b) => a.kebun.localeCompare(b.kebun));
//   return out.map((r, i) => ({ ...r, no: i + 1 }));
// }

// // =================== Build TM + TBM ===================
// function buildTmTbmRows(tmRows: TmRow[], tbmRows: TmRow[]) {
//   const map = new Map<string, TmRow>();

//   const accumulate = (src: TmRow) => {
//     const cur =
//       map.get(src.kebun) ??
//       ({
//         kebun: src.kebun,
//         app1_rencana: 0,
//         app1_real: 0,
//         app1_pct: 0,
//         app2_rencana: 0,
//         app2_real: 0,
//         app2_pct: 0,
//         app3_rencana: 0,
//         app3_real: 0,
//         app3_pct: 0,
//         renc_selasa: 0,
//         real_selasa: 0,
//         renc_rabu: 0,
//         jumlah_rencana2025: 0,
//         jumlah_realSd0710: 0,
//         jumlah_pct: 0,
//       } as TmRow);

//     cur.app1_rencana += src.app1_rencana;
//     cur.app1_real += src.app1_real;

//     cur.app2_rencana += src.app2_rencana;
//     cur.app2_real += src.app2_real;

//     cur.app3_rencana += src.app3_rencana;
//     cur.app3_real += src.app3_real;

//     cur.renc_selasa += src.renc_selasa;
//     cur.real_selasa += src.real_selasa;
//     cur.renc_rabu += src.renc_rabu;

//     cur.jumlah_rencana2025 += src.jumlah_rencana2025;
//     cur.jumlah_realSd0710 += src.jumlah_realSd0710;

//     map.set(src.kebun, cur);
//   };

//   tmRows.forEach(accumulate);
//   tbmRows.forEach(accumulate);

//   const rows = Array.from(map.values()).map((r) => ({
//     ...r,
//     app1_pct: safePct(r.app1_real, r.app1_rencana),
//     app2_pct: safePct(r.app2_real, r.app2_rencana),
//     app3_pct: safePct(r.app3_real, r.app3_rencana),
//     jumlah_pct: safePct(r.jumlah_realSd0710, r.jumlah_rencana2025),
//   }));

//   rows.sort((a, b) => a.kebun.localeCompare(b.kebun));
//   return rows.map((r, i) => ({ ...r, no: i + 1 }));
// }

// // =================== GET Handler ===================
// export async function GET() {
//   try {
//     const todayISO = todayISOJakarta();
//     const tomorrowISO = addDaysJakarta(todayISO, 1);
//     const winEndISO = todayISO;
//     const winStartISO = addDaysJakarta(todayISO, -4);

//     const rencanas = (await prisma.rencanaPemupukan.findMany()) as RencanaRecord[];
//     const realisasis = (await prisma.realisasiPemupukan.findMany()) as RealisasiRecord[];

//     const aggPupuk = buildAggPupuk(rencanas, realisasis);

//     const tmRows = buildTmRows(
//       "TM",
//       rencanas,
//       realisasis,
//       todayISO,
//       tomorrowISO,
//       winStartISO,
//       winEndISO
//     );

//     const tbmRows = buildTmRows(
//       "TBM",
//       rencanas,
//       realisasis,
//       todayISO,
//       tomorrowISO,
//       winStartISO,
//       winEndISO
//     );

//     const tmTbmRows = buildTmTbmRows(tmRows, tbmRows);

//     const payload: VisualisasiPayload = {
//       aggPupuk,
//       stokVsSisa: [],
//       tmRows,
//       tbmRows,
//       tmTbmRows,
//       headerDates: {
//         today: todayISO,
//         tomorrow: tomorrowISO,
//         selasa: todayISO,
//         rabu: tomorrowISO,
//       },
//       realWindow: {
//         start: winStartISO,
//         end: winEndISO,
//       },
//       realCutoffDate: winEndISO,
//     };

//     return NextResponse.json(payload);
//   } catch (err) {
//     console.error("ERROR /api/pemupukan/visualisasi:", err);
//     return new NextResponse("Internal Server Error", { status: 500 });
//   }
// }
