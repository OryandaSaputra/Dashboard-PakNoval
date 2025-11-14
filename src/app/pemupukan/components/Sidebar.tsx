import Image from "next/image";
import React from "react";
import {
  Database, Calendar,  Factory, 
  Filter as FilterIcon, ChevronDown, ChevronRight,
} from "lucide-react";
import Link from "next/link";

export default function Sidebar({
  navRealOpen, setNavRealOpen,
  navRencanaOpen, setNavRencanaOpen,
  setFilterOpen,
}: {
  navRealOpen: boolean;
  setNavRealOpen: React.Dispatch<React.SetStateAction<boolean>>;
  navRencanaOpen: boolean;
  setNavRencanaOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setFilterOpen: (v: boolean) => void;
  bestKebun?: { kebun: string; rencana: number; progress: number };
}) {
  return (
    <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 sticky top-0 self-start h-[100dvh] overflow-y-auto border-r border-slate-200 dark:border-slate-800 bg-gradient-to-b from-[--ptpn-green-dark] to-[--ptpn-green] text-slate-900 dark:text-slate-100">
      <div className="h-16 px-4 flex items-center gap-3 border-b border-white/10">
        <Image
          src="https://www.ptpn4.co.id/build/assets/Logo%20PTPN%20IV-CyWK9qsP.png"
          alt="Logo PTPN IV Regional III"
          width={36} height={36} unoptimized
          className="h-9 w-auto object-contain drop-shadow"
        />
        <div className="leading-tight">
          <p className="text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-300">PT Perkebunan Nusantara IV</p>
          <p className="text-[10px] text-slate-600 dark:text-slate-400">Regional III</p>
        </div>
      </div>

      <nav className="px-3 py-4 text-sm space-y-1">
        <Link href="/pemupukan" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 transition">
          <Database className="h-4 w-4" /> Home
        </Link>

        {/* Realisasi */}
        <button
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 transition"
          onClick={() => setNavRealOpen((s) => !s)}
        >
          <span className="flex items-center gap-2">
            <Factory className="h-4 w-4" /> Realisasi Pemupukan
          </span>
          {navRealOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {navRealOpen && (
          <div className="pl-8 space-y-1">
            <Link href="/pemupukan/realisasi/tambah" className="block px-3 py-1.5 rounded-lg hover:bg-white/10">Tambah Data</Link>
            <Link href="/pemupukan/realisasi/riwayat" className="block px-3 py-1.5 rounded-lg hover:bg-white/10">Tabel Realisasi</Link>
          </div>
        )}

        {/* Rencana */}
        <button
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 transition"
          onClick={() => setNavRencanaOpen((s) => !s)}
        >
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Rencana Pemupukan
          </span>
          {navRencanaOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {navRencanaOpen && (
          <div className="pl-8 space-y-1">
            <Link href="/pemupukan/rencana/tambah" className="block px-3 py-1.5 rounded-lg hover:bg-white/10">Tambah Data</Link>
            <Link href="/pemupukan/rencana/riwayat" className="block px-3 py-1.5 rounded-lg hover:bg-white/10">Tabel Rencana</Link>
          </div>
        )}

        <button
          onClick={() => setFilterOpen(true)}
          className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
        >
          <FilterIcon className="h-4 w-4" /> Buka Filter
        </button>
      </nav>
    </aside>
  );
}
