// src/app/pemupukan/page.tsx
import Ikhtisar from "@/app/pemupukan/sections/Ikhtisar";
import Visualisasi, {
  type TmRow,
} from "@/app/pemupukan/sections/Visualisasi";
import { prisma } from "@/lib/prisma";
import { KategoriTanaman } from "@prisma/client";

/* ===================[ Helper: ambil MIN–MAX tanggal realisasi ]=================== */
async function getRealisasiRange(): Promise<{ start: Date; end: Date }> {
  const [minRow, maxRow] = await Promise.all([
    prisma.realisasiPemupukan.findFirst({
      orderBy: { tanggal: "asc" },
      select: { tanggal: true },
    }),
    prisma.realisasiPemupukan.findFirst({
      orderBy: { tanggal: "desc" },
      select: { tanggal: true },
    }),
  ]);

  const today = new Date();
  const today0 = new Date(today);
  today0.setHours(0, 0, 0, 0);

  if (!minRow?.tanggal || !maxRow?.tanggal) {
    return { start: today0, end: today0 };
  }

  const start = new Date(minRow.tanggal);
  const end = new Date(maxRow.tanggal);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return { start, end };
}

/* ===================[ Build TM/TBM rows dari DB ]=================== */

type RowInput = {
  kebun: string;
  aplikasiKe: number;
  kgPupuk: number;
  tanggal: Date | null;
};

/**
 * usePeriodForRealisasi:
 * - true  => realisasi hanya dihitung di antara period.start–period.end
 * - false => realisasi dihitung TOTAL (abaikan tanggal), seperti keinginan default
 */
async function buildTmRowsFromDb(
  kategori: KategoriTanaman,
  today: Date,
  period: { start: Date; end: Date },
  usePeriodForRealisasi: boolean
): Promise<TmRow[]> {
  const { start, end } = period;

  const [rencana, realisasi] = await Promise.all([
    prisma.rencanaPemupukan.findMany({
      where: { kategori },
      select: {
        kebun: true,
        aplikasiKe: true,
        kgPupuk: true,
        tanggal: true,
      },
    }),
    prisma.realisasiPemupukan.findMany({
      where: { kategori },
      select: {
        kebun: true,
        aplikasiKe: true,
        kgPupuk: true,
        tanggal: true,
      },
    }),
  ]);

  const rencanaRows: RowInput[] = rencana.map((r) => ({
    kebun: r.kebun,
    aplikasiKe: r.aplikasiKe ?? 0,
    kgPupuk: r.kgPupuk ?? 0,
    tanggal: r.tanggal,
  }));

  const realisasiRows: RowInput[] = realisasi.map((r) => ({
    kebun: r.kebun,
    aplikasiKe: r.aplikasiKe ?? 0,
    kgPupuk: r.kgPupuk ?? 0,
    tanggal: r.tanggal,
  }));

  const kebunSet = new Set<string>();
  rencanaRows.forEach((r) => kebunSet.add(r.kebun));
  realisasiRows.forEach((r) => kebunSet.add(r.kebun));

  const todayKey = new Date(today);
  todayKey.setHours(0, 0, 0, 0);
  const tomorrowKey = new Date(todayKey);
  tomorrowKey.setDate(tomorrowKey.getDate() + 1);

  const sumKg = (
    rows: RowInput[],
    kebun: string,
    aplikasi: number,
    startDate?: Date,
    endDate?: Date
  ) => {
    return rows.reduce((acc, r) => {
      if (r.kebun !== kebun) return acc;
      if (r.aplikasiKe !== aplikasi) return acc;
      if (startDate && (!r.tanggal || r.tanggal < startDate)) return acc;
      if (endDate && (!r.tanggal || r.tanggal > endDate)) return acc;
      return acc + (r.kgPupuk || 0);
    }, 0);
  };

  const rows: TmRow[] = [];

  [...kebunSet].forEach((kebun, idx) => {
    // =================== RENCANA (selalu total, tidak pakai periode) ===================
    const app1_rencana = sumKg(rencanaRows, kebun, 1);
    const app2_rencana = sumKg(rencanaRows, kebun, 2);
    const app3_rencana = sumKg(rencanaRows, kebun, 3);

    // =================== REALISASI ===================
    // Default (tanpa filter) => TOTAL: panggil tanpa start/end
    // Jika user pilih filter tanggal => pakai periode start–end
    const app1_real = usePeriodForRealisasi
      ? sumKg(realisasiRows, kebun, 1, start, end)
      : sumKg(realisasiRows, kebun, 1);

    const app2_real = usePeriodForRealisasi
      ? sumKg(realisasiRows, kebun, 2, start, end)
      : sumKg(realisasiRows, kebun, 2);

    const app3_real = usePeriodForRealisasi
      ? sumKg(realisasiRows, kebun, 3, start, end)
      : sumKg(realisasiRows, kebun, 3);

    const app1_pct =
      app1_rencana > 0 ? (app1_real / app1_rencana) * 100 : 0;
    const app2_pct =
      app2_rencana > 0 ? (app2_real / app2_rencana) * 100 : 0;
    const app3_pct =
      app3_rencana > 0 ? (app3_real / app3_rencana) * 100 : 0;

    // Rencana / real hari ini (semua aplikasi) – tetap pakai tanggal hari ini
    const renc_selasa =
      sumKg(rencanaRows, kebun, 1, todayKey, todayKey) +
      sumKg(rencanaRows, kebun, 2, todayKey, todayKey) +
      sumKg(rencanaRows, kebun, 3, todayKey, todayKey);

    const real_selasa =
      sumKg(realisasiRows, kebun, 1, todayKey, todayKey) +
      sumKg(realisasiRows, kebun, 2, todayKey, todayKey) +
      sumKg(realisasiRows, kebun, 3, todayKey, todayKey);

    // Rencana besok (semua aplikasi)
    const renc_rabu =
      sumKg(rencanaRows, kebun, 1, tomorrowKey, tomorrowKey) +
      sumKg(rencanaRows, kebun, 2, tomorrowKey, tomorrowKey) +
      sumKg(rencanaRows, kebun, 3, tomorrowKey, tomorrowKey);

    // Jumlah total rencana (semua tahun, semua aplikasi)
    const jumlah_rencana2025 =
      app1_rencana + app2_rencana + app3_rencana;

    // Jumlah realisasi:
    // - default: total (tanpa filter)
    // - jika filter: hanya di periode
    const jumlah_realSd0710 = usePeriodForRealisasi
      ? sumKg(realisasiRows, kebun, 1, start, end) +
        sumKg(realisasiRows, kebun, 2, start, end) +
        sumKg(realisasiRows, kebun, 3, start, end)
      : sumKg(realisasiRows, kebun, 1) +
        sumKg(realisasiRows, kebun, 2) +
        sumKg(realisasiRows, kebun, 3);

    const jumlah_pct =
      jumlah_rencana2025 > 0
        ? (jumlah_realSd0710 / jumlah_rencana2025) * 100
        : 0;

    rows.push({
      no: idx + 1,
      kebun,
      app1_rencana,
      app1_real,
      app1_pct,
      app2_rencana,
      app2_real,
      app2_pct,
      app3_rencana,
      app3_real,
      app3_pct,
      renc_selasa,
      real_selasa,
      renc_rabu,
      jumlah_rencana2025,
      jumlah_realSd0710,
      jumlah_pct,
    });
  });

  return rows;
}

/* ===================[ Agg untuk Ikhtisar & Pie ]=================== */

async function getTotals() {
  const cat = KategoriTanaman;

  const sumKg = async (model: "REN" | "REAL", kategori?: KategoriTanaman) => {
    const agg =
      model === "REN"
        ? await prisma.rencanaPemupukan.aggregate({
            _sum: { kgPupuk: true },
            where: kategori ? { kategori } : undefined,
          })
        : await prisma.realisasiPemupukan.aggregate({
            _sum: { kgPupuk: true },
            where: kategori ? { kategori } : undefined,
          });

    return agg._sum.kgPupuk ?? 0;
  };

  const [totalRencana, totalRealisasi] = await Promise.all([
    sumKg("REN"),
    sumKg("REAL"),
  ]);

  const [tmRencana, tmRealisasi] = await Promise.all([
    sumKg("REN", cat.TM),
    sumKg("REAL", cat.TM),
  ]);
  const [tbmRencana, tbmRealisasi] = await Promise.all([
    sumKg("REN", cat.TBM),
    sumKg("REAL", cat.TBM),
  ]);
  const [bibRencana, bibRealisasi] = await Promise.all([
    sumKg("REN", cat.BIBITAN),
    sumKg("REAL", cat.BIBITAN),
  ]);

  const dtmRencana = totalRencana;
  const dtmRealisasi = totalRealisasi;
  const dbrRencana = 0;
  const dbrRealisasi = 0;

  return {
    totalRencana,
    totalRealisasi,
    tmRencana,
    tmRealisasi,
    tbmRencana,
    tbmRealisasi,
    bibRencana,
    bibRealisasi,
    dtmRencana,
    dbrRencana,
    dtmRealisasi,
    dbrRealisasi,
  };
}

async function getAggPupuk() {
  const rows = await prisma.$queryRaw<
    {
      jenis: string;
      rencana: number;
      realisasi: number;
    }[]
  >`
    SELECT
      jenisPupuk AS jenis,
      SUM(CASE WHEN t = 'REN' THEN kgPupuk ELSE 0 END) AS rencana,
      SUM(CASE WHEN t = 'REAL' THEN kgPupuk ELSE 0 END) AS realisasi
    FROM (
      SELECT 'REN' AS t, jenisPupuk, kgPupuk FROM RencanaPemupukan
      UNION ALL
      SELECT 'REAL' AS t, jenisPupuk, kgPupuk FROM RealisasiPemupukan
    ) x
    GROUP BY jenisPupuk
  `;

  return rows.map((r) => ({
    jenis: r.jenis,
    rencana: Number(r.rencana ?? 0),
    realisasi: Number(r.realisasi ?? 0),
    rencana_ha: 0,
    realisasi_ha: 0,
    progress:
      r.rencana && r.rencana > 0
        ? (Number(r.realisasi ?? 0) / Number(r.rencana)) * 100
        : 0,
  }));
}

/* ===================[ PAGE (server component) ]=================== */

type SearchParams = {
  dateFrom?: string;
  dateTo?: string;
};

export default async function Page({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const today = new Date();
  const today0 = new Date(today);
  today0.setHours(0, 0, 0, 0);

  const realRange = await getRealisasiRange();

  let periodStart = new Date(realRange.start);
  let periodEnd = new Date(realRange.end);

  const hasUserFilter = Boolean(
    (searchParams?.dateFrom ?? "") || (searchParams?.dateTo ?? "")
  );

  if (searchParams?.dateFrom) {
    const df = new Date(searchParams.dateFrom);
    if (!Number.isNaN(df.getTime())) {
      periodStart = df;
      periodStart.setHours(0, 0, 0, 0);
    }
  }

  if (searchParams?.dateTo) {
    const dt = new Date(searchParams.dateTo);
    if (!Number.isNaN(dt.getTime())) {
      periodEnd = dt;
      periodEnd.setHours(0, 0, 0, 0);
    }
  }

  if (periodStart > periodEnd) {
    const tmp = periodStart;
    periodStart = periodEnd;
    periodEnd = tmp;
  }

    const effectivePeriod = { start: periodStart, end: periodEnd };

  const [tmRows, tbmRows, totals, aggPupuk] = await Promise.all([
    buildTmRowsFromDb(
      KategoriTanaman.TM,
      today0,
      effectivePeriod,
      hasUserFilter
    ),
    buildTmRowsFromDb(
      KategoriTanaman.TBM,
      today0,
      effectivePeriod,
      hasUserFilter
    ),
    getTotals(),
    getAggPupuk(),
  ]);

  const tmTbmRows: TmRow[] = [...tmRows, ...tbmRows];

  const todayISO = today0.toISOString().slice(0, 10);

  const headerDates = {
    today: todayISO,
  };

  // 👉 LABEL untuk header tabel:
  //    - kalau user pakai filter => pakai string dari query (dateFrom/dateTo)
  //    - kalau tidak => pakai min–max realisasi dari DB
  const labelStartISO =
    hasUserFilter && searchParams?.dateFrom
      ? searchParams.dateFrom
      : realRange.start.toISOString().slice(0, 10);

  const labelEndISO =
    hasUserFilter && searchParams?.dateTo
      ? searchParams.dateTo
      : realRange.end.toISOString().slice(0, 10);

  const realWindow = {
    start: labelStartISO,
    end: labelEndISO,
  };


  return (
    <>
      <Ikhtisar
        totals={totals}
        realisasiHarian={0}
        rencanaBesok={0}
        tanggalHariIni={headerDates.today}
        tanggalBesok={undefined}
      />
      <Visualisasi
        barPerKebun={[]}
        aggPupuk={aggPupuk}
        stokVsSisa={[]}
        tmRows={tmRows}
        tbmRows={tbmRows}
        tmTbmRows={tmTbmRows}
        headerDates={headerDates}
        realWindow={realWindow}
        realCutoffDate={realWindow.end}
        hasUserFilter={hasUserFilter} 
      />
    </>
  );
}
