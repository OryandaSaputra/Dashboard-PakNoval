import { useMemo, useCallback } from "react";
import {
  KEBUN_LABEL,
  ORDER_DTM,
  ORDER_DBR,
  LABEL_PUPUK,
  PUPUK_KEYS,
} from "./constants";
import { FertRow, PupukKey } from "./types";
import { sum } from "./utils";

export type Filters = {
  distrik: string;
  kebun: string;
  search: string;
  jenis: string;
  dateFrom: string;
  dateTo: string;
};

// ---- Baris untuk Tabel TM/TBM/TM&TBM
export type TmTableRow = {
  no?: number;
  kebun: string;
  app1_rencana: number;
  app1_real: number;
  app1_pct: number;
  app2_rencana: number;
  app2_real: number;
  app2_pct: number;
  app3_rencana: number;
  app3_real: number;
  app3_pct: number;
  // Harian
  renc_selasa: number; // Rencana Hari Ini
  real_selasa: number; // Realisasi Hari Ini
  renc_rabu: number;   // Rencana Besok
  // Jumlah
  jumlah_rencana2025: number;   // total rencana
  jumlah_realSd0710: number;    // total real 5 hari terakhir
  jumlah_pct: number;
};

export function usePemupukanDerived(rows: FertRow[], filters: Filters) {
  const { distrik, kebun, search, jenis, dateFrom, dateTo } = filters;

  const distrikOptions = useMemo(() => ["DTM", "DBR"], []);

  const kebunOptions = useMemo(() => {
    const base = rows.filter((r) => distrik === "all" || r.distrik === distrik);
    return Array.from(new Set(base.map((r) => r.kebun))).sort((a, b) =>
      (KEBUN_LABEL[a] ?? a).localeCompare(KEBUN_LABEL[b] ?? b)
    );
  }, [rows, distrik]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const passDistrik = distrik === "all" || r.distrik === distrik;
      const passKebun = kebun === "all" || r.kebun === kebun;
      const passSearch =
        search === "" ||
        (KEBUN_LABEL[r.kebun] ?? r.kebun)
          .toLowerCase()
          .includes(search.toLowerCase());

      const passJenis =
        jenis === "all"
          ? true
          : (() => {
            const j = jenis.toUpperCase();
            const map: Record<string, number> = {
              "NPK 13.6.27.4": (r.real_npk ?? 0) + (r.rencana_npk ?? 0),
              "NPK 12.12.17.2": (r.real_npk ?? 0) + (r.rencana_npk ?? 0),
              UREA: (r.real_urea ?? 0) + (r.rencana_urea ?? 0),
              TSP: (r.real_tsp ?? 0) + (r.rencana_tsp ?? 0),
              MOP: (r.real_mop ?? 0) + (r.rencana_mop ?? 0),
              RP: (r.real_rp ?? 0) + (r.rencana_rp ?? 0),
              DOLOMITE:
                (r.real_dolomite ?? 0) + (r.rencana_dolomite ?? 0),
              BORATE: (r.real_borate ?? 0) + (r.rencana_borate ?? 0),
              CUSO4: (r.real_cuso4 ?? 0) + (r.rencana_cuso4 ?? 0),
              ZNSO4: (r.real_znso4 ?? 0) + (r.rencana_znso4 ?? 0),
            };
            return (map[j] ?? 0) > 0;
          })();

      const passDate =
        (!dateFrom && !dateTo) ||
        (() => {
          if (!r.tanggal) return false;
          const t = r.tanggal; // asumsi "YYYY-MM-DD"
          const geFrom = !dateFrom || t >= dateFrom;
          const leTo = !dateTo || t <= dateTo;
          return geFrom && leTo;
        })();

      return passDistrik && passKebun && passSearch && passJenis && passDate;
    });
  }, [rows, distrik, kebun, search, jenis, dateFrom, dateTo]);

  // ================= KPIs yang sudah ada =================
  const totalRencana = useMemo(
    () => sum(filtered, (r) => r.rencana_total),
    [filtered]
  );
  const totalRealisasi = useMemo(
    () => sum(filtered, (r) => r.realisasi_total),
    [filtered]
  );

  const tmRencana = useMemo(
    () => sum(filtered, (r) => r.tm_rencana),
    [filtered]
  );
  const tmRealisasi = useMemo(
    () => sum(filtered, (r) => r.tm_realisasi),
    [filtered]
  );

  const tbmRencana = useMemo(
    () => sum(filtered, (r) => r.tbm_rencana),
    [filtered]
  );
  const tbmRealisasi = useMemo(
    () => sum(filtered, (r) => r.tbm_realisasi),
    [filtered]
  );

  const bibRencana = useMemo(
    () => sum(filtered, (r) => r.bibitan_rencana),
    [filtered]
  );
  const bibRealisasi = useMemo(
    () => sum(filtered, (r) => r.bibitan_realisasi),
    [filtered]
  );

  const isDTM = (r: FertRow) =>
    r.distrik === "DTM" || r.is_dtm || r.wilayah === "DTM";
  const isDBR = (r: FertRow) =>
    r.distrik === "DBR" || r.is_dbr || r.wilayah === "DBR";

  const dtmRencana = useMemo(
    () => sum(filtered.filter(isDTM), (r) => r.rencana_total),
    [filtered]
  );
  const dbrRencana = useMemo(
    () => sum(filtered.filter(isDBR), (r) => r.rencana_total),
    [filtered]
  );
  const dtmRealisasi = useMemo(
    () => sum(filtered.filter(isDTM), (r) => r.realisasi_total),
    [filtered]
  );
  const dbrRealisasi = useMemo(
    () => sum(filtered.filter(isDBR), (r) => r.realisasi_total),
    [filtered]
  );

  const kebunProgress = useMemo(
    () =>
      filtered.map((r) => ({
        kebun: r.kebun,
        distrik: r.distrik,
        rencana: r.rencana_total || 0,
        realisasi: r.realisasi_total || 0,
        progress: r.rencana_total
          ? (r.realisasi_total / r.rencana_total) * 100
          : 0,
      })),
    [filtered]
  );

  const bestKebun = useMemo(
    () =>
      [...kebunProgress].sort((a, b) => b.progress - a.progress)[0] ||
      undefined,
    [kebunProgress]
  );

  const pieTotal = useMemo(() => {
    const real = Math.max(0, totalRealisasi);
    const sisa = Math.max(0, totalRencana - totalRealisasi);
    const sumV = Math.max(1, real + sisa);
    const pct = (v: number) => `${((v / sumV) * 100).toFixed(1)}%`;
    return [
      { name: "Realisasi (Kg)", value: real, labelText: pct(real) },
      { name: "Sisa Rencana (Kg)", value: sisa, labelText: pct(sisa) },
    ];
  }, [totalRencana, totalRealisasi]);

  const pieTmTbm = useMemo(() => {
    const tm = Math.max(0, tmRealisasi);
    const tbm = Math.max(0, tbmRealisasi);
    const sumV = Math.max(1, tm + tbm);
    const pct = (name: string, v: number) =>
      `${name} ${((v / sumV) * 100).toFixed(1)}%`;
    return [
      { name: "TM Realisasi", value: tm, labelText: pct("TM", tm) },
      { name: "TBM Realisasi", value: tbm, labelText: pct("TBM", tbm) },
    ];
  }, [tmRealisasi, tbmRealisasi]);

  const barPerKebun = useMemo(
    () => [...kebunProgress].sort((a, b) => b.rencana - a.rencana).slice(0, 20),
    [kebunProgress]
  );

  const barEfisiensiDistrik = useMemo(() => {
    const byDistrik = new Map<
      string,
      { rencana: number; realisasi: number }
    >();
    filtered.forEach((r) => {
      const key = r.distrik || "-";
      const curr = byDistrik.get(key) || { rencana: 0, realisasi: 0 };
      curr.rencana += r.rencana_total || 0;
      curr.realisasi += r.realisasi_total || 0;
      byDistrik.set(key, curr);
    });
    return Array.from(byDistrik.entries())
      .map(([d, v]) => ({
        distrik: d,
        progress: v.rencana ? (v.realisasi / v.rencana) * 100 : 0,
        rencana: v.rencana,
        realisasi: v.realisasi,
      }))
      .sort((a, b) => b.progress - a.progress);
  }, [filtered]);

  const aggPupuk = useMemo(() => {
    const initPair = () => ({ rencana: 0, real: 0 });
    const totalsKg: Record<PupukKey, { rencana: number; real: number }> = {
      npk: initPair(),
      urea: initPair(),
      tsp: initPair(),
      mop: initPair(),
      dolomite: initPair(),
      borate: initPair(),
      cuso4: initPair(),
      znso4: initPair(),
    };
    const totalsHa: Record<PupukKey, { rencana: number; real: number }> = {
      npk: initPair(),
      urea: initPair(),
      tsp: initPair(),
      mop: initPair(),
      dolomite: initPair(),
      borate: initPair(),
      cuso4: initPair(),
      znso4: initPair(),
    };

    filtered.forEach((r) => {
      totalsKg.npk.rencana += r.rencana_npk || 0;
      totalsKg.npk.real += r.real_npk || 0;
      totalsKg.urea.rencana += r.rencana_urea || 0;
      totalsKg.urea.real += r.real_urea || 0;
      totalsKg.tsp.rencana += r.rencana_tsp || 0;
      totalsKg.tsp.real += r.real_tsp || 0;
      totalsKg.mop.rencana += r.rencana_mop || 0;
      totalsKg.mop.real += r.real_mop || 0;
      totalsKg.dolomite.rencana += r.rencana_dolomite || 0;
      totalsKg.dolomite.real += r.real_dolomite || 0;
      totalsKg.borate.rencana += r.rencana_borate || 0;
      totalsKg.borate.real += r.real_borate || 0;
      totalsKg.cuso4.rencana += r.rencana_cuso4 || 0;
      totalsKg.cuso4.real += r.real_cuso4 || 0;
      totalsKg.znso4.rencana += r.rencana_znso4 || 0;
      totalsKg.znso4.real += r.real_znso4 || 0;

      totalsHa.npk.rencana += r.rencana_npk_ha || 0;
      totalsHa.npk.real += r.real_npk_ha || 0;
      totalsHa.urea.rencana += r.rencana_urea_ha || 0;
      totalsHa.urea.real += r.real_urea_ha || 0;
      totalsHa.tsp.rencana += r.rencana_tsp_ha || 0;
      totalsHa.tsp.real += r.real_tsp_ha || 0;
      totalsHa.mop.rencana += r.rencana_mop_ha || 0;
      totalsHa.mop.real += r.real_mop_ha || 0;
      totalsHa.dolomite.rencana += r.rencana_dolomite_ha || 0;
      totalsHa.dolomite.real += r.real_dolomite_ha || 0;
      totalsHa.borate.rencana += r.rencana_borate_ha || 0;
      totalsHa.borate.real += r.real_borate_ha || 0;
      totalsHa.cuso4.rencana += r.rencana_cuso4_ha || 0;
      totalsHa.cuso4.real += r.real_cuso4_ha || 0;
      totalsHa.znso4.rencana += r.rencana_znso4_ha || 0;
      totalsHa.znso4.real += r.real_znso4_ha || 0;
    });

    const totalRealKg =
      PUPUK_KEYS.reduce((a, k) => a + totalsKg[k].real, 0) || 1;

    return PUPUK_KEYS.map((k) => ({
      jenis: LABEL_PUPUK[k],
      rencana: totalsKg[k].rencana,
      realisasi: totalsKg[k].real,
      rencana_ha: totalsHa[k].rencana,
      realisasi_ha: totalsHa[k].real,
      progress: totalsKg[k].rencana
        ? (totalsKg[k].real / totalsKg[k].rencana) * 100
        : 0,
      share: (totalsKg[k].real / totalRealKg) * 100,
    }));
  }, [filtered]);

  const stokVsSisa = useMemo(() => {
    const byDistrik = new Map<string, { stok: number; sisa: number }>();
    filtered.forEach((r) => {
      const d = r.distrik || "-";
      const curr = byDistrik.get(d) || { stok: 0, sisa: 0 };
      curr.stok += r.stok || 0;
      curr.sisa += r.sisa_kebutuhan || 0;
      byDistrik.set(d, curr);
    });
    return Array.from(byDistrik.entries())
      .map(([d, v]) => {
        const total = Math.max(1, v.stok + v.sisa);
        return {
          distrik: d,
          stok: v.stok,
          sisa: v.sisa,
          stok_pct: (v.stok / total) * 100,
          sisa_pct: (v.sisa / total) * 100,
        };
      })
      .filter((x) => x.stok > 0 || x.sisa > 0);
  }, [filtered]);

  // ==================== TABEL TM/TBM/TM&TBM ====================

  // util tanggal lokal -> "YYYY-MM-DD"
  const toLocalISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const addDays = (iso: string, delta: number) => {
    const [Y, M, D] = iso.split("-").map(Number);
    const t = new Date(Y, M - 1, D);
    t.setDate(t.getDate() + delta);
    return toLocalISO(t);
  };

  const todayISO = toLocalISO(new Date());
  const tomorrowISO = addDays(todayISO, 1);
  const last5StartISO = addDays(todayISO, -4);
  const last5EndISO = todayISO;

  type Agg = {
    app1_rencana: number;
    app2_rencana: number;
    app3_rencana: number;
    app1_real: number;
    app2_real: number;
    app3_real: number;
    rencana_today: number;
    real_today: number;
    rencana_tomorrow: number;
    jumlah_rencana_total: number;
    real_last5_total: number;
  };

  type Apps = {
    rencana_app1?: number;
    rencana_app2?: number;
    rencana_app3?: number;
    real_app1?: number;
    real_app2?: number;
    real_app3?: number;
  };

  type Mode = "TM" | "TBM" | "ALL";

  const buildRows = useCallback(
    (mode: Mode): TmTableRow[] => {
      const by = new Map<string, Agg>();
      const ensure = (k: string): Agg => {
        const v = by.get(k);
        if (v) return v;
        const init: Agg = {
          app1_rencana: 0,
          app2_rencana: 0,
          app3_rencana: 0,
          app1_real: 0,
          app2_real: 0,
          app3_real: 0,
          rencana_today: 0,
          real_today: 0,
          rencana_tomorrow: 0,
          jumlah_rencana_total: 0,
          real_last5_total: 0,
        };
        by.set(k, init);
        return init;
      };

      for (const r of filtered) {
        const g = ensure(r.kebun);

        // pilih basis sesuai mode
        let renBase = 0;
        let realBase = 0;
        if (mode === "TM") {
          renBase = r.tm_rencana ?? 0;
          realBase = r.tm_realisasi ?? 0;
        } else if (mode === "TBM") {
          renBase = r.tbm_rencana ?? 0;
          realBase = r.tbm_realisasi ?? 0;
        } else {
          // ALL = TM + TBM / total
          renBase =
            r.rencana_total ?? (r.tm_rencana ?? 0) + (r.tbm_rencana ?? 0);
          realBase =
            r.realisasi_total ??
            (r.tm_realisasi ?? 0) + (r.tbm_realisasi ?? 0);
        }

        g.jumlah_rencana_total += renBase;

        // window 5 hari terakhir
        if (
          r.tanggal &&
          r.tanggal >= last5StartISO &&
          r.tanggal <= last5EndISO
        ) {
          g.real_last5_total += realBase;

          const a = r as unknown as Apps;
          g.app1_real += a.real_app1 ?? 0;
          g.app2_real += a.real_app2 ?? 0;
          g.app3_real += a.real_app3 ?? 0;
        }

        // Harian: gunakan basis sesuai mode (supaya TM/TBM terpisah)
        if (r.tanggal === todayISO) {
          g.rencana_today += renBase;
          g.real_today += realBase;
        }
        if (r.tanggal === tomorrowISO) {
          g.rencana_tomorrow += renBase;
        }

        // Rencana per-aplikasi (kalau ada fieldnya)
        const a = r as unknown as Apps;
        g.app1_rencana += a.rencana_app1 ?? 0;
        g.app2_rencana += a.rencana_app2 ?? 0;
        g.app3_rencana += a.rencana_app3 ?? 0;
      }

      // fallback distribusi 3 aplikasi bila tidak tersedia field per-aplikasi
      const split3 = (total: number) => {
        const raw = [0.4 * total, 0.35 * total, 0.25 * total];
        const a1 = Math.round(raw[0]);
        const a2 = Math.round(raw[1]);
        const a3 = Math.max(0, Math.round(total - a1 - a2));
        return [a1, a2, a3] as const;
      };

      for (const [, g] of by) {
        const hasRenApps =
          g.app1_rencana + g.app2_rencana + g.app3_rencana > 0;
        const hasRealApps = g.app1_real + g.app2_real + g.app3_real > 0;

        if (!hasRenApps && g.jumlah_rencana_total > 0) {
          const [a1, a2, a3] = split3(g.jumlah_rencana_total);
          g.app1_rencana = a1;
          g.app2_rencana = a2;
          g.app3_rencana = a3;
        }
        if (!hasRealApps && g.real_last5_total > 0) {
          const [a1, a2, a3] = split3(g.real_last5_total);
          g.app1_real = a1;
          g.app2_real = a2;
          g.app3_real = a3;
        }
      }

      const pct = (real: number, ren: number) =>
        ren > 0 ? (real / ren) * 100 : 0;

      // urutan kebun: DTM lalu DBR
      const orderMap = new Map<string, number>();
      ORDER_DTM.forEach((k, i) => orderMap.set(k, i));
      const baseIndex = ORDER_DTM.length;
      ORDER_DBR.forEach((k, i) => orderMap.set(k, baseIndex + i));

      const keys = Array.from(by.keys()).sort((a, b) => {
        const ia = orderMap.get(a);
        const ib = orderMap.get(b);
        if (ia != null && ib != null) return ia - ib;
        const la = KEBUN_LABEL[a] ?? a;
        const lb = KEBUN_LABEL[b] ?? b;
        return la.localeCompare(lb);
      });

      return keys.map((k, i) => {
        const g = by.get(k)!;
        return {
          no: i + 1,
          kebun: KEBUN_LABEL[k] ?? k,

          app1_rencana: g.app1_rencana,
          app1_real: g.app1_real,
          app1_pct: pct(g.app1_real, g.app1_rencana),

          app2_rencana: g.app2_rencana,
          app2_real: g.app2_real,
          app2_pct: pct(g.app2_real, g.app2_rencana),

          app3_rencana: g.app3_rencana,
          app3_real: g.app3_real,
          app3_pct: pct(g.app3_real, g.app3_rencana),

          // Harian
          renc_selasa: g.rencana_today,
          real_selasa: g.real_today,
          renc_rabu: g.rencana_tomorrow,

          // Jumlah
          jumlah_rencana2025: g.jumlah_rencana_total,
          jumlah_realSd0710: g.real_last5_total,
          jumlah_pct: pct(g.real_last5_total, g.jumlah_rencana_total),
        } as TmTableRow;
      });
    },
    [filtered, todayISO, tomorrowISO, last5StartISO, last5EndISO]
  );

  const tmRows = useMemo(
    () => buildRows("TM"),
    [buildRows]
  );
  const tbmRows = useMemo(
    () => buildRows("TBM"),
    [buildRows]
  );
  const tmTbmRows = useMemo(
    () => buildRows("ALL"),
    [buildRows]
  );

  return {
    // options & filtered
    distrikOptions,
    kebunOptions,
    filtered,
    // KPIs
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
    // charts & helpers
    kebunProgress,
    bestKebun,
    pieTotal,
    pieTmTbm,
    barPerKebun,
    barEfisiensiDistrik,
    aggPupuk,
    stokVsSisa,
    // === Data untuk Tabel TM/TBM/TM&TBM + info tanggal header ===
    tmRows,
    tbmRows,
    tmTbmRows,
    headerDates: { selasa: todayISO, rabu: tomorrowISO },
    realCutoffDate: todayISO,
    realWindow: { start: last5StartISO, end: last5EndISO },
    // static (kalau butuh)
    ORDER_DTM,
    ORDER_DBR,
  };
}
