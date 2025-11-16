// src/app/api/pemupukan/Rencana/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, KategoriTanaman } from "@prisma/client";

/**
 * Helper: normalisasi string
 * - kalau kosong / null → fallback ("-" by default)
 */
function safeString(value: unknown, fallback: string = "-") {
  const s = String(value ?? "").trim();
  return s === "" ? fallback : s;
}

/**
 * Helper: normalisasi angka
 * - kalau NaN / undefined → fallback (0 by default)
 */
function safeNumber(value: unknown, fallback: number = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Helper: parse tanggal dari payload
 * - jika null / "" / "-" → null
 * - jika bisa diparse → Date
 * - jika tidak valid → null
 */
function parseTanggal(value: unknown): Date | null {
  if (value === null || value === undefined) return null;

  const s = String(value).trim();
  if (s === "" || s === "-") return null;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Tipe data masuk dari client (single row Excel / manual)
 * Semua optional & bertipe unknown supaya fleksibel.
 */
type IncomingRow = {
  kategori?: string;
  kebun?: unknown;
  kode_kebun?: unknown;
  tanggal?: unknown;
  afd?: unknown;
  tt?: unknown;
  blok?: unknown;
  luas?: unknown;
  inv?: unknown;
  jenis_pupuk?: unknown;
  aplikasi?: unknown;
  dosis?: unknown;
  kg_pupuk?: unknown;
};

/**
 * Utility: mapping body → data untuk Prisma
 * Dipakai baik single maupun bulk
 */
function mapBodyToCreateInput(row: IncomingRow | null | undefined) {
  const {
    kategori,
    kebun,
    kode_kebun,
    tanggal,
    afd,
    tt,
    blok,
    luas,
    inv,
    jenis_pupuk,
    aplikasi,
    dosis,
    kg_pupuk,
  } = row ?? {};

  if (!kategori || !["TM", "TBM", "BIBITAN"].includes(kategori)) {
    return { error: "Kategori wajib diisi (TM/TBM/BIBITAN)." } as const;
  }

  const tanggalDate = parseTanggal(tanggal);

  const baseData = {
    kategori: kategori as KategoriTanaman,
    kebun: safeString(kebun),
    kodeKebun: safeString(kode_kebun),
    afd: safeString(afd),
    tt: safeString(tt, ""), // tt boleh kosong string
    blok: safeString(blok).toUpperCase(),
    luasHa: safeNumber(luas, 0),
    inv: Math.round(safeNumber(inv, 0)),
    jenisPupuk: safeString(jenis_pupuk),
    aplikasiKe: Math.round(safeNumber(aplikasi, 1)),
    dosisKgPerPokok: safeNumber(dosis, 0),
    kgPupuk: safeNumber(kg_pupuk, 0),
    tanggal: tanggalDate, // Date | null
  };

  return { data: baseData } as const;
}

/**
 * CREATE: Tambah data Rencana pemupukan
 * - jika body = object  → create 1 row
 * - jika body = array   → createMany (bulk)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ==== BULK MODE: body berupa array ====
    if (Array.isArray(body)) {
      if (body.length === 0) {
        return NextResponse.json(
          { message: "Array data kosong." },
          { status: 400 }
        );
      }

      const validData: Prisma.RencanaPemupukanCreateManyInput[] = [];
      let invalidCount = 0;

      for (const row of body as IncomingRow[]) {
        const mapped = mapBodyToCreateInput(row);
        if ("error" in mapped) {
          invalidCount += 1;
          continue;
        }

        validData.push(
          mapped.data as Prisma.RencanaPemupukanCreateManyInput
        );
      }

      if (validData.length === 0) {
        return NextResponse.json(
          {
            message:
              "Tidak ada baris valid untuk disimpan (kategori/tanggal/angka tidak sesuai).",
          },
          { status: 400 }
        );
      }

      const result = await prisma.rencanaPemupukan.createMany({
        data: validData,
      });

      const inserted = result.count;
      const totalSent = body.length;
      const skipped = totalSent - inserted;

      return NextResponse.json(
        {
          message: "Import bulk selesai.",
          inserted,
          totalSent,
          skipped,
          invalidCount,
        },
        { status: 201 }
      );
    }

    // ==== SINGLE MODE: body berupa object ====
    const mapped = mapBodyToCreateInput(body as IncomingRow);
    if ("error" in mapped) {
      return NextResponse.json(
        { message: mapped.error },
        { status: 400 }
      );
    }

    const data = mapped.data as Prisma.RencanaPemupukanCreateInput;

    const created = await prisma.rencanaPemupukan.create({ data });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/pemupukan/rencana error", err);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menyimpan rencana." },
      { status: 500 }
    );
  }
}

/**
 * READ:
 * - Jika ada ?id= : kembalikan 1 data (detail)
 * - Jika tidak ada id: kembalikan list (opsional filter kategori)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    const kategori = searchParams.get("kategori"); // TM / TBM / BIBITAN / null

    // DETAIL by ID
    if (idParam) {
      const id = Number(idParam);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { message: "Parameter id tidak valid." },
          { status: 400 }
        );
      }

      const item = await prisma.rencanaPemupukan.findUnique({
        where: { id },
      });

      if (!item) {
        return NextResponse.json(
          { message: "Data rencana tidak ditemukan." },
          { status: 404 }
        );
      }

      return NextResponse.json(item);
    }

    // LIST (opsional filter kategori)
    const where =
      kategori && ["TM", "TBM", "BIBITAN"].includes(kategori)
        ? { kategori: kategori as KategoriTanaman }
        : {};

    const data = await prisma.rencanaPemupukan.findMany({
      where,
      orderBy: { tanggal: "desc" }, // tanggal null akan diurutkan belakangan/awal tergantung DB
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/pemupukan/rencana error", err);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data rencana." },
      { status: 500 }
    );
  }
}

/**
 * UPDATE: Perbarui data Rencana
 * - butuh ?id= di query
 */
export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");

    if (!idParam) {
      return NextResponse.json(
        { message: "Parameter id wajib diisi untuk update." },
        { status: 400 }
      );
    }

    const id = Number(idParam);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { message: "Parameter id tidak valid." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const mapped = mapBodyToCreateInput(body as IncomingRow);
    if ("error" in mapped) {
      return NextResponse.json(
        { message: mapped.error },
        { status: 400 }
      );
    }

    const data = mapped.data as Prisma.RencanaPemupukanUpdateInput;

    const updated = await prisma.rencanaPemupukan.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/pemupukan/rencana error", err);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memperbarui rencana." },
      { status: 500 }
    );
  }
}

/**
 * DELETE:
 * - ?id=123   → hapus satu baris
 * - ?all=1    → hapus SEMUA data Rencana
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all");
    const idParam = searchParams.get("id");

    // 🔥 HAPUS SEMUA DATA
    if (all === "1") {
      const result = await prisma.rencanaPemupukan.deleteMany({});
      return NextResponse.json(
        {
          message: "Semua data rencana berhasil dihapus.",
          deletedCount: result.count,
        },
        { status: 200 }
      );
    }

    // 🔁 HAPUS SATU DATA (default)
    if (!idParam) {
      return NextResponse.json(
        { message: "Parameter id atau all=1 wajib diisi untuk hapus." },
        { status: 400 }
      );
    }

    const id = Number(idParam);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { message: "Parameter id tidak valid." },
        { status: 400 }
      );
    }

    await prisma.rencanaPemupukan.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Data rencana berhasil dihapus." },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /api/pemupukan/rencana error", err);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus rencana." },
      { status: 500 }
    );
  }
}
