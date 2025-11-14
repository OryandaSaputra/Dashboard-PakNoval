// src/app/api/pemupukan/realisasi/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { KategoriTanaman } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();

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
    } = body ?? {};

    if (!kategori || !['TM', 'TBM', 'BIBITAN'].includes(kategori)) {
      return NextResponse.json(
        { message: 'Kategori wajib diisi (TM/TBM/BIBITAN).' },
        { status: 400 }
      );
    }

    if (!kebun || !kode_kebun || !tanggal || !afd || !blok) {
      return NextResponse.json(
        { message: 'Field wajib (kebun, kode kebun, tanggal, afd, blok) belum lengkap.' },
        { status: 400 }
      );
    }

    const created = await prisma.realisasiPemupukan.create({
      data: {
        kategori: kategori as KategoriTanaman,
        kebun,
        kodeKebun: kode_kebun,
        tanggal: new Date(tanggal),
        afd,
        tt: tt ?? '',
        blok,
        luasHa: Number(luas ?? 0),
        inv: Number(inv ?? 0),
        jenisPupuk: jenis_pupuk,
        aplikasiKe: Number(aplikasi ?? 1),
        dosisKgPerPokok: Number(dosis ?? 0),
        kgPupuk: Number(kg_pupuk ?? 0),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('POST /api/pemupukan/realisasi error', err);
    return NextResponse.json(
      { message: 'Terjadi kesalahan saat menyimpan realisasi.' },
      { status: 500 }
    );
  }
}

// GET untuk Riwayat Realisasi (opsional filter kategori)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const kategori = searchParams.get('kategori'); // TM / TBM / BIBITAN / null

    const where = kategori && ['TM', 'TBM', 'BIBITAN'].includes(kategori)
      ? { kategori: kategori as KategoriTanaman }
      : {};

    const data = await prisma.realisasiPemupukan.findMany({
      where,
      orderBy: { tanggal: 'desc' },
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error('GET /api/pemupukan/realisasi error', err);
    return NextResponse.json(
      { message: 'Terjadi kesalahan saat mengambil data realisasi.' },
      { status: 500 }
    );
  }
}
