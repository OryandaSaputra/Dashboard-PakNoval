// src/app/api/pemupukan/visualisasi/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db"; // Prisma client

// ====== Type untuk payload yang dipakai Visualisasi.tsx ======
type AggPupukRow = {
  jenis: string;
  rencana: number;
  realisasi: number;
  rencana_ha: number;
  realisasi_ha: number;
  progress: number;
};

type StokSisaRow = {
  distrik: string;
  stok: number;
  sisa: number;
  stok_pct: number;
  sisa_pct: number;
};

/** Struktur baris tabel TM / TBM / TM&TBM (harus sama dengan Visualisasi.tsx) */
export type TmRow = {
  no?: number;
  kebun: string;
  // APLIKASI - I
  app1_rencana: number;
  app1_real: number;
  app1_pct: number;
  // APLIKASI - II
  app2_rencana: number;
  app2_real: number;
  app2_pct: number;
  // APLIKASI - III
  app3_rencana: number;
  app3_real: number;
  app3_pct: number;
  // Harian (Kg)
  renc_selasa: number; // Rencana Hari Ini
  real_selasa: number; // Realisasi Hari Ini
  renc_rabu: number; // Rencana Besok
  // Jumlah
  jumlah_rencana2025: number;
  jumlah_realSd0710: number; // Real 5 hari terakhir (total)
  jumlah_pct: number;
};

type HeaderDates = {
  today?: string;
  tomorrow?: string;
  selasa?: string;
  rabu?: string;
};

type RealWindow = { start?: string; end?: string };

type VisualisasiPayload = {
  aggPupuk: AggPupukRow[];
  stokVsSisa: StokSisaRow[];
  tmRows: TmRow[];
  tbmRows: TmRow[];
  tmTbmRows: TmRow[];
  headerDates?: HeaderDates;
  realWindow?: RealWindow;
  realCutoffDate?: string;
};

// ===================[ Helper tanggal: Asia/Jakarta ]===================
function todayISOJakarta(base = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

function addDaysJakarta(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00+07:00`);
  d.setDate(d.getDate() + n);
  return todayISOJakarta(d);
}

function toISODate(d: Date): string {
  // format YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

function safePct(real: number, rencana: number): number {
  if (!rencana || rencana === 0) return 0;
  return (real / rencana) * 100;
}

// =====================================================================
// ===================[ AGGREGASI DARI DATABASE ]=======================
// =====================================================================

// Asumsi nama model Prisma:
// model PemupukanRencana { ... }
// model PemupukanRealisasi { ... }
// dan di PrismaClient: prisma.pemupukanRencana & prisma.pemupukanRealisasi

type Kategori = "TM" | "TBM" | "BIBITAN";

type RencanaRecord = {
  id: number | string;
  kategori: Kategori;
  kebun: string;
  jenis_pupuk: string;
  aplikasi: number;
  tanggal: Date;
  luas: number | null;
  kg_pupuk: number | null;
};

type RealisasiRecord = RencanaRecord;

// Hindari any di sini
function normalizeNum(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Hitung agregat per jenis pupuk untuk pie chart
function buildAggPupuk(
  rencanas: RencanaRecord[],
  realisasis: RealisasiRecord[]
): AggPupukRow[] {
  const map = new Map<
    string,
    {
      jenis: string;
      rencana: number;
      realisasi: number;
      rencana_ha: number;
      realisasi_ha: number;
    }
  >();

  for (const r of rencanas) {
    const jenis = r.jenis_pupuk || "LAINNYA";
    const key = jenis.toUpperCase();
    const kg = normalizeNum(r.kg_pupuk);
    const ha = normalizeNum(r.luas);
    const current =
      map.get(key) ?? {
        jenis: key,
        rencana: 0,
        realisasi: 0,
        rencana_ha: 0,
        realisasi_ha: 0,
      };
    current.rencana += kg;
    current.rencana_ha += ha;
    map.set(key, current);
  }

  for (const x of realisasis) {
    const jenis = x.jenis_pupuk || "LAINNYA";
    const key = jenis.toUpperCase();
    const kg = normalizeNum(x.kg_pupuk);
    const ha = normalizeNum(x.luas);
    const current =
      map.get(key) ?? {
        jenis: key,
        rencana: 0,
        realisasi: 0,
        rencana_ha: 0,
        realisasi_ha: 0,
      };
    current.realisasi += kg;
    current.realisasi_ha += ha;
    map.set(key, current);
  }

  return Array.from(map.values()).map((row) => ({
    ...row,
    progress: safePct(row.realisasi, row.rencana),
  }));
}

// Hitung tabel TM/TBM berdasar kategori
function buildTmRowsByKategori(
  kategori: "TM" | "TBM",
  rencanas: RencanaRecord[],
  realisasis: RealisasiRecord[],
  todayISO: string,
  tomorrowISO: string,
  windowStartISO: string,
  windowEndISO: string
): TmRow[] {
  const rencanaK = rencanas.filter((r) => r.kategori === kategori);
  const realisasiK = realisasis.filter((r) => r.kategori === kategori);

  // kumpulkan semua kebun yang ada di rencana/realisasi
  const kebunSet = new Set<string>();
  rencanaK.forEach((r) => kebunSet.add(r.kebun));
  realisasiK.forEach((r) => kebunSet.add(r.kebun));

  const result: TmRow[] = [];

  for (const kebun of kebunSet) {
    const rencKebun = rencanaK.filter((r) => r.kebun === kebun);
    const realKebun = realisasiK.filter((r) => r.kebun === kebun);

    const sumFilter = <T extends RencanaRecord | RealisasiRecord>(
      list: T[],
      predicate: (x: T) => boolean
    ) =>
      list.reduce(
        (acc, x) => (predicate(x) ? acc + normalizeNum(x.kg_pupuk) : acc),
        0
      );

    // aplikasi 1 / 2 / 3
    const app1_rencana = sumFilter(rencKebun, (x) => x.aplikasi === 1);
    const app2_rencana = sumFilter(rencKebun, (x) => x.aplikasi === 2);
    const app3_rencana = sumFilter(rencKebun, (x) => x.aplikasi === 3);

    // Real 5 hari terakhir per aplikasi
    const app1_real = sumFilter(realKebun, (x) => {
      const iso = toISODate(x.tanggal);
      return x.aplikasi === 1 && iso >= windowStartISO && iso <= windowEndISO;
    });
    const app2_real = sumFilter(realKebun, (x) => {
      const iso = toISODate(x.tanggal);
      return x.aplikasi === 2 && iso >= windowStartISO && iso <= windowEndISO;
    });
    const app3_real = sumFilter(realKebun, (x) => {
      const iso = toISODate(x.tanggal);
      return x.aplikasi === 3 && iso >= windowStartISO && iso <= windowEndISO;
    });

    // Harian
    const renc_selasa = sumFilter(rencKebun, (x) => {
      const iso = toISODate(x.tanggal);
      return iso === todayISO;
    });
    const real_selasa = sumFilter(realKebun, (x) => {
      const iso = toISODate(x.tanggal);
      return iso === todayISO;
    });
    const renc_rabu = sumFilter(rencKebun, (x) => {
      const iso = toISODate(x.tanggal);
      return iso === tomorrowISO;
    });

    // Jumlah (asumsi tahun 2025 sesuai nama field)
    const jumlah_rencana2025 = rencKebun.reduce((acc, x) => {
      const year = x.tanggal.getFullYear();
      return year === 2025 ? acc + normalizeNum(x.kg_pupuk) : acc;
    }, 0);

    const jumlah_realSd0710 = realKebun.reduce((acc, x) => {
      const iso = toISODate(x.tanggal);
      return iso >= windowStartISO && iso <= windowEndISO
        ? acc + normalizeNum(x.kg_pupuk)
        : acc;
    }, 0);

    const row: TmRow = {
      kebun,
      // app I
      app1_rencana,
      app1_real,
      app1_pct: safePct(app1_real, app1_rencana),
      // app II
      app2_rencana,
      app2_real,
      app2_pct: safePct(app2_real, app2_rencana),
      // app III
      app3_rencana,
      app3_real,
      app3_pct: safePct(app3_real, app3_rencana),
      // harian
      renc_selasa,
      real_selasa,
      renc_rabu,
      // jumlah
      jumlah_rencana2025,
      jumlah_realSd0710,
      jumlah_pct: safePct(jumlah_realSd0710, jumlah_rencana2025),
    };

    result.push(row);
  }

  // isi nomor urut dan sort by kebun biar rapi
  result.sort((a, b) => a.kebun.localeCompare(b.kebun));
  return result.map((r, idx) => ({ ...r, no: idx + 1 }));
}

// Gabungkan TM & TBM jadi TM&TBM (per kebun)
function buildTmTbmRows(tmRows: TmRow[], tbmRows: TmRow[]): TmRow[] {
  type Agg = {
    kebun: string;
    app1_rencana: number;
    app1_real: number;
    app2_rencana: number;
    app2_real: number;
    app3_rencana: number;
    app3_real: number;
    renc_selasa: number;
    real_selasa: number;
    renc_rabu: number;
    jumlah_rencana2025: number;
    jumlah_realSd0710: number;
  };

  const map = new Map<string, Agg>();

  const addRow = (r: TmRow) => {
    const current =
      map.get(r.kebun) ?? {
        kebun: r.kebun,
        app1_rencana: 0,
        app1_real: 0,
        app2_rencana: 0,
        app2_real: 0,
        app3_rencana: 0,
        app3_real: 0,
        renc_selasa: 0,
        real_selasa: 0,
        renc_rabu: 0,
        jumlah_rencana2025: 0,
        jumlah_realSd0710: 0,
      };
    current.app1_rencana += r.app1_rencana;
    current.app1_real += r.app1_real;
    current.app2_rencana += r.app2_rencana;
    current.app2_real += r.app2_real;
    current.app3_rencana += r.app3_rencana;
    current.app3_real += r.app3_real;
    current.renc_selasa += r.renc_selasa;
    current.real_selasa += r.real_selasa;
    current.renc_rabu += r.renc_rabu;
    current.jumlah_rencana2025 += r.jumlah_rencana2025;
    current.jumlah_realSd0710 += r.jumlah_realSd0710;
    map.set(r.kebun, current);
  };

  tmRows.forEach(addRow);
  tbmRows.forEach(addRow);

  const rows: TmRow[] = Array.from(map.values()).map((agg) => {
    const app1_pct = safePct(agg.app1_real, agg.app1_rencana);
    const app2_pct = safePct(agg.app2_real, agg.app2_rencana);
    const app3_pct = safePct(agg.app3_real, agg.app3_rencana);
    const jumlah_pct = safePct(
      agg.jumlah_realSd0710,
      agg.jumlah_rencana2025
    );
    return {
      kebun: agg.kebun,
      app1_rencana: agg.app1_rencana,
      app1_real: agg.app1_real,
      app1_pct,
      app2_rencana: agg.app2_rencana,
      app2_real: agg.app2_real,
      app2_pct,
      app3_rencana: agg.app3_rencana,
      app3_real: agg.app3_real,
      app3_pct,
      renc_selasa: agg.renc_selasa,
      real_selasa: agg.real_selasa,
      renc_rabu: agg.renc_rabu,
      jumlah_rencana2025: agg.jumlah_rencana2025,
      jumlah_realSd0710: agg.jumlah_realSd0710,
      jumlah_pct,
    };
  });

  rows.sort((a, b) => a.kebun.localeCompare(b.kebun));
  return rows.map((r, idx) => ({ ...r, no: idx + 1 }));
}

// =====================================================================
// ===========================[ HANDLER GET ]============================
// =====================================================================

export async function GET() {
  try {
    // Tanggal referensi: hari ini Jakarta
    const todayISO = todayISOJakarta();
    const tomorrowISO = addDaysJakarta(todayISO, 1);
    const windowEndISO = todayISO;
    const windowStartISO = addDaysJakarta(windowEndISO, -4); // 5 hari terakhir

    // Untuk menghindari error TS di akses model Prisma:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;

    // Ambil SEMUA data rencana & realisasi
    const [rencanasRaw, realisasisRaw] = await Promise.all([
      prismaAny.pemupukanRencana.findMany(),
      prismaAny.pemupukanRealisasi.findMany(),
    ]);

    const rencanas = rencanasRaw as RencanaRecord[];
    const realisasis = realisasisRaw as RealisasiRecord[];

    // 1) Pie chart: aggPupuk
    const aggPupuk = buildAggPupuk(rencanas, realisasis);

    // 2) Tabel TM, TBM
    const tmRows = buildTmRowsByKategori(
      "TM",
      rencanas,
      realisasis,
      todayISO,
      tomorrowISO,
      windowStartISO,
      windowEndISO
    );

    const tbmRows = buildTmRowsByKategori(
      "TBM",
      rencanas,
      realisasis,
      todayISO,
      tomorrowISO,
      windowStartISO,
      windowEndISO
    );

    // 3) Tabel TM & TBM gabungan
    const tmTbmRows = buildTmTbmRows(tmRows, tbmRows);

    // 4) Stok vs sisa -> sementara kosong (belum ada tabel stok di DB)
    const stokVsSisa: StokSisaRow[] = [];

    const payload: VisualisasiPayload = {
      aggPupuk,
      stokVsSisa,
      tmRows,
      tbmRows,
      tmTbmRows,
      headerDates: {
        today: todayISO,
        tomorrow: tomorrowISO,
        selasa: todayISO, // supaya kompatibel dengan Visualisasi.tsx
        rabu: tomorrowISO,
      },
      realWindow: {
        start: windowStartISO,
        end: windowEndISO,
      },
      realCutoffDate: windowEndISO,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("ERROR /api/pemupukan/visualisasi:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
