// src/app/api/pemupukan/realisasi/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { KategoriTanaman } from '@prisma/client';

/**
 * CREATE: Tambah data realisasi pemupukan
 */
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

/**
 * READ:
 * - Jika ada ?id= : kembalikan 1 data (detail)
 * - Jika tidak ada id: kembalikan list (opsional filter kategori)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');
    const kategori = searchParams.get('kategori'); // TM / TBM / BIBITAN / null

    // DETAIL by ID
    if (idParam) {
      const id = Number(idParam);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { message: 'Parameter id tidak valid.' },
          { status: 400 }
        );
      }

      const item = await prisma.realisasiPemupukan.findUnique({
        where: { id },
      });

      if (!item) {
        return NextResponse.json(
          { message: 'Data realisasi tidak ditemukan.' },
          { status: 404 }
        );
      }

      return NextResponse.json(item);
    }

    // LIST (opsional filter kategori)
    const where =
      kategori && ['TM', 'TBM', 'BIBITAN'].includes(kategori)
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

/**
 * UPDATE: Perbarui data realisasi
 * - butuh ?id= di query
 */
export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json(
        { message: 'Parameter id wajib diisi untuk update.' },
        { status: 400 }
      );
    }

    const id = Number(idParam);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { message: 'Parameter id tidak valid.' },
        { status: 400 }
      );
    }

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

    const updated = await prisma.realisasiPemupukan.update({
      where: { id },
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

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/pemupukan/realisasi error', err);
    return NextResponse.json(
      { message: 'Terjadi kesalahan saat memperbarui realisasi.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Hapus data realisasi
 * - butuh ?id= di query
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json(
        { message: 'Parameter id wajib diisi untuk hapus.' },
        { status: 400 }
      );
    }

    const id = Number(idParam);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { message: 'Parameter id tidak valid.' },
        { status: 400 }
      );
    }

    await prisma.realisasiPemupukan.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Data realisasi berhasil dihapus.' },
      { status: 200 }
    );
  } catch (err) {
    console.error('DELETE /api/pemupukan/realisasi error', err);
    return NextResponse.json(
      { message: 'Terjadi kesalahan saat menghapus realisasi.' },
      { status: 500 }
    );
  }
}
