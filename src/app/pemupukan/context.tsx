"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { FertRow } from "./types";
import { usePemupukanDerived } from "./derive";
import type { TmTableRow } from "./derive";

type Ctx = {
  // data
  rows: FertRow[];
  loading: boolean;

  // filters
  distrik: string; setDistrik: (v: string) => void;
  kebun: string; setKebun: (v: string) => void;
  search: string; setSearch: (v: string) => void;
  jenis: string; setJenis: (v: string) => void;
  dateFrom: string; setDateFrom: (v: string) => void;
  dateTo: string; setDateTo: (v: string) => void;
  resetFilter: () => void;

  // ui
  sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void;
  navRealOpen: boolean; setNavRealOpen: React.Dispatch<React.SetStateAction<boolean>>;
  navRencanaOpen: boolean; setNavRencanaOpen: React.Dispatch<React.SetStateAction<boolean>>;
  navStokOpen: boolean; setNavStokOpen: React.Dispatch<React.SetStateAction<boolean>>;
  filterOpen: boolean; setFilterOpen: (v: boolean) => void;

  // options
  jenisOptions: string[];
  distrikOptions: string[];
  kebunOptions: string[];

  // derived
  filtered: FertRow[];
  totalRencana: number; totalRealisasi: number;
  tmRencana: number; tmRealisasi: number;
  tbmRencana: number; tbmRealisasi: number;
  bibRencana: number; bibRealisasi: number;
  dtmRencana: number; dbrRencana: number;
  dtmRealisasi: number; dbrRealisasi: number;
  bestKebun?: { kebun: string; rencana: number; progress: number };

  pieTotal: { name: string; value: number; labelText: string }[];
  pieTmTbm: { name: string; value: number; labelText: string }[];
  barEfisiensiDistrik: { distrik: string; progress: number; rencana: number; realisasi: number }[];
  barPerKebun: { kebun: string; rencana: number; realisasi: number; progress: number }[];
  aggPupuk: {
    jenis: string; rencana: number; realisasi: number;
    rencana_ha: number; realisasi_ha: number; progress: number; share: number
  }[];
  stokVsSisa: { distrik: string; stok: number; sisa: number; stok_pct: number; sisa_pct: number }[];

  // NEW: data tabel TM
  tmRows: TmTableRow[];
};

const PemupukanContext = createContext<Ctx | null>(null);

export function PemupukanProvider({ children }: { children: React.ReactNode }) {
  const [rows, setRows] = useState<FertRow[]>([]);
  const [loading, setLoading] = useState(true);

  // sidebar & nav
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navRealOpen, setNavRealOpen] = useState(true);
  const [navRencanaOpen, setNavRencanaOpen] = useState(true);
  const [navStokOpen, setNavStokOpen] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  // filters
  const [distrik, setDistrik] = useState<string>("all");
  const [kebun, setKebun] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [jenis, setJenis] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const jenisOptions = useMemo(
    () => [
      "all",
      "NPK 13.6.27.4",
      "NPK 12.12.17.2",
      "UREA",
      "TSP",
      "MOP",
      "RP",
      "DOLOMITE",
      "BORATE",
      "CuSO4",
      "ZnSO4",
    ],
    []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/pemupukan", { cache: "no-store" });
        const data: FertRow[] = res.ok ? await res.json() : [];
        if (mounted) setRows(Array.isArray(data) ? data : []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const derived = usePemupukanDerived(rows, {
    distrik, kebun, search, jenis, dateFrom, dateTo,
  });

  const resetFilter = () => {
    setDistrik("all");
    setKebun("all");
    setSearch("");
    setJenis("all");
    setDateFrom("");
    setDateTo("");
  };

  const value: Ctx = {
    rows,
    loading,

    // filters
    distrik, setDistrik,
    kebun, setKebun,
    search, setSearch,
    jenis, setJenis,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    resetFilter,

    // ui
    sidebarOpen, setSidebarOpen,
    navRealOpen, setNavRealOpen,
    navRencanaOpen, setNavRencanaOpen,
    navStokOpen, setNavStokOpen,
    filterOpen, setFilterOpen,

    // options
    jenisOptions,
    distrikOptions: derived.distrikOptions,
    kebunOptions: derived.kebunOptions,

    // derived
    filtered: derived.filtered,
    totalRencana: derived.totalRencana,
    totalRealisasi: derived.totalRealisasi,
    tmRencana: derived.tmRencana,
    tmRealisasi: derived.tmRealisasi,
    tbmRencana: derived.tbmRencana,
    tbmRealisasi: derived.tbmRealisasi,
    bibRencana: derived.bibRencana,
    bibRealisasi: derived.bibRealisasi,
    dtmRencana: derived.dtmRencana,
    dbrRencana: derived.dbrRencana,
    dtmRealisasi: derived.dtmRealisasi,
    dbrRealisasi: derived.dbrRealisasi,
    bestKebun: derived.bestKebun,

    pieTotal: derived.pieTotal,
    pieTmTbm: derived.pieTmTbm,
    barEfisiensiDistrik: derived.barEfisiensiDistrik,
    barPerKebun: derived.barPerKebun,
    aggPupuk: derived.aggPupuk,
    stokVsSisa: derived.stokVsSisa,

    // NEW
    tmRows: derived.tmRows,
  };

  return (
    <PemupukanContext.Provider value={value}>
      {children}
    </PemupukanContext.Provider>
  );
}

export function usePemupukan() {
  const ctx = useContext(PemupukanContext);
  if (!ctx) throw new Error("usePemupukan must be used within PemupukanProvider");
  return ctx;
}
