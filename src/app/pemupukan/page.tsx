// src/app/pemupukan/page.tsx
import Ikhtisar from "@/app/pemupukan/sections/Ikhtisar";
import Visualisasi, {
  type TmRow,
} from "@/app/pemupukan/sections/Visualisasi";
import { prisma } from "@/lib/prisma";
import { KategoriTanaman } from "@prisma/client";

/* ===================[ Helper tanggal 5 hari ]=================== */
function getFiveDayWindow(base: Date) {
  const end = new Date(base);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 4);
  return { start, end };
}

/* ===================[ Build TM/TBM rows dari DB ]=================== */
async function buildTmRowsFromDb(
  kategori: KategoriTanaman,
  today: Date
): Promise<TmRow[]> {
  const { start, end } = getFiveDayWindow(today);

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

  const kebunSet = new Set<string>();
  rencana.forEach((r) => kebunSet.add(r.kebun));
  realisasi.forEach((r) => kebunSet.add(r.kebun));

  const todayKey = new Date(today);
  todayKey.setHours(0, 0, 0, 0);
  const tomorrowKey = new Date(todayKey);
  tomorrowKey.setDate(tomorrowKey.getDate() + 1);

  const sumKg = (
    rows: { kebun: string; aplikasiKe: number; kgPupuk: number; tanggal: Date | null }[],
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
    // Aplikasi I
    const app1_rencana = sumKg(rencana, kebun, 1);
    const app1_real = sumKg(realisasi, kebun, 1);
    const app1_pct =
      app1_rencana > 0 ? (app1_real / app1_rencana) * 100 : 0;

    // Aplikasi II
    const app2_rencana = sumKg(rencana, kebun, 2);
    const app2_real = sumKg(realisasi, kebun, 2);
    const app2_pct =
      app2_rencana > 0 ? (app2_real / app2_rencana) * 100 : 0;

    // Aplikasi III
    const app3_rencana = sumKg(rencana, kebun, 3);
    const app3_real = sumKg(realisasi, kebun, 3);
    const app3_pct =
      app3_rencana > 0 ? (app3_real / app3_rencana) * 100 : 0;

    // Rencana / real hari ini (semua aplikasi)
    const renc_selasa =
      sumKg(rencana, kebun, 1, todayKey, todayKey) +
      sumKg(rencana, kebun, 2, todayKey, todayKey) +
      sumKg(rencana, kebun, 3, todayKey, todayKey);

    const real_selasa =
      sumKg(realisasi, kebun, 1, todayKey, todayKey) +
      sumKg(realisasi, kebun, 2, todayKey, todayKey) +
      sumKg(realisasi, kebun, 3, todayKey, todayKey);

    // rencana besok (semua aplikasi)
    const renc_rabu =
      sumKg(rencana, kebun, 1, tomorrowKey, tomorrowKey) +
      sumKg(rencana, kebun, 2, tomorrowKey, tomorrowKey) +
      sumKg(rencana, kebun, 3, tomorrowKey, tomorrowKey);

    // jumlah total (tahun berjalan, semua aplikasi)
    const jumlah_rencana2025 =
      sumKg(rencana, kebun, 1) +
      sumKg(rencana, kebun, 2) +
      sumKg(rencana, kebun, 3);

    const jumlah_realSd0710 =
      sumKg(realisasi, kebun, 1, start, end) +
      sumKg(realisasi, kebun, 2, start, end) +
      sumKg(realisasi, kebun, 3, start, end);

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

  // Sementara: DTM/DBR pakai total saja (kalau kamu punya rule distrik,
  // nanti tinggal ganti where: { kebun: { in: LIST_DTM } } dll).
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

// Pie Rencana vs Realisasi per jenis pupuk
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

export default async function Page() {
  const today = new Date();
  const todayISO = new Date(today);
  todayISO.setHours(0, 0, 0, 0);

  const [tmRows, tbmRows, totals, aggPupuk] = await Promise.all([
    buildTmRowsFromDb(KategoriTanaman.TM, today),
    buildTmRowsFromDb(KategoriTanaman.TBM, today),
    getTotals(),
    getAggPupuk(),
  ]);

  const tmTbmRows: TmRow[] = [...tmRows, ...tbmRows];

  const headerDates = {
    today: todayISO.toISOString().slice(0, 10),
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
        barPerKebun={[]}         // belum dipakai di component
        aggPupuk={aggPupuk}
        stokVsSisa={[]}          // belum dipakai di component
        tmRows={tmRows}
        tbmRows={tbmRows}
        tmTbmRows={tmTbmRows}
        headerDates={headerDates}
        realWindow={undefined}
        realCutoffDate={undefined}
      />
    </>
  );
}
