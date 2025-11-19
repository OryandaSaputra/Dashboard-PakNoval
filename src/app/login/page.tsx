// src/app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const VALID_USERNAME = "PTPN5TNM";
const VALID_PASSWORD = "PTPN5AKHLAK";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [scrollY, setScrollY] = useState(0);

  // Parallax effect: update scrollY
  useEffect(() => {
    const onScroll = () => {
      setScrollY(window.scrollY || 0);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      username.trim() === VALID_USERNAME &&
      password.trim() === VALID_PASSWORD
    ) {
      setError("");

      if (remember) {
        localStorage.setItem("ptpn5-auth", "logged-in");
      }

      router.push("/pemupukan"); // ganti ke route yang kamu mau
    } else {
      setError("Username atau password salah.");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* ===== Parallax background layer ===== */}
      <div
        className="pointer-events-none fixed inset-0 -z-20"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #064e3b, #065f46, #047857), url('/bg-pupuk.jpg')",
          // ganti '/bg-pupuk.jpg' dengan gambar backgroundmu (taruh di /public)
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          transform: `translateY(${scrollY * -0.15}px)`,
          transition: "transform 0.05s linear",
        }}
      />

      {/* Overlay gradient supaya teks tetap kebaca */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-emerald-900/80 via-emerald-900/60 to-emerald-950/90" />

      {/* ===== Main content ===== */}
      <div className="min-h-screen w-full flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-950/40 bg-emerald-900/60 border border-emerald-700/40 backdrop-blur-sm">
            {/* Kiri: info sistem */}
            <div className="hidden md:flex flex-col justify-between px-10 py-10 text-emerald-50 bg-emerald-900/90">
              {/* Logo & title */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative h-10 w-10 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-emerald-900/60 overflow-hidden">
                    {/* Logo PTPN 4 */}
                    <Image
                      src="/ptpn4-logo.png" // <- pastikan file ini ada di /public
                      alt="PTPN 4"
                      fill
                      className="object-contain p-1.5"
                    />
                  </div>
                  <span className="text-xs tracking-[0.25em] uppercase">
                    PTPN 4 • DIVISI TANAMAN
                  </span>
                </div>

                <h1 className="text-3xl font-semibold leading-tight mb-2">
                  Dashboard Pemupukan
                </h1>
                <h2 className="text-2xl font-semibold text-emerald-300 mb-6">
                  PTPN 4 Regional III
                </h2>

                <p className="text-sm text-emerald-100/80 mb-6 max-w-md">
                  Akses terpusat untuk memantau rencana dan realisasi pemupukan,
                  analisis progres per kebun, serta laporan pendukung keputusan
                  Divisi Tanaman.
                </p>

                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                    <span>Data terpusat &amp; tersinkronisasi per kebun.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                    <span>
                      Monitoring rencana vs realisasi secara real-time.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                    <span>Keamanan akses dengan akun Divisi Tanaman.</span>
                  </li>
                </ul>
              </div>

              <p className="mt-8 text-[11px] text-emerald-200/70">
                © {new Date().getFullYear()} PTPN 4 • Dashboard Pemupukan Divisi
                Tanaman
              </p>
            </div>

            {/* Kanan: form login */}
            <div className="bg-white rounded-l-3xl md:rounded-l-none px-8 sm:px-10 py-10 flex flex-col justify-center">
              <div className="mb-8">
                {/* Logo kecil utk mobile */}
                <div className="flex items-center gap-2 mb-2 md:hidden">
                  <div className="relative h-8 w-8 rounded-2xl bg-white flex items-center justify-center shadow-md shadow-emerald-900/40 overflow-hidden">
                    <Image
                      src="/ptpn4-logo.png"
                      alt="PTPN 4"
                      fill
                      className="object-contain p-1"
                    />
                  </div>
                  <span className="text-[11px] tracking-[0.25em] uppercase text-emerald-700">
                    PTPN 4 • DIVISI TANAMAN
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-emerald-950">
                  Masuk Akun
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Gunakan kredensial yang telah ditetapkan Divisi Tanaman.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-xl border border-emerald-200/80 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      placeholder="Masukkan username"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-emerald-200/80 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      placeholder="Masukkan password"
                    />
                  </div>
                </div>

                {/* Remember + lupa password (dummy) */}
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-slate-600">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Ingat saya</span>
                  </label>
                  <button
                    type="button"
                    className="text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Lupa password?
                  </button>
                </div>

                {/* Error message */}
                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                {/* Tombol masuk */}
                <button
                  type="submit"
                  className="mt-1 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium py-2.5 shadow-lg shadow-emerald-700/40 transition-colors"
                >
                  Masuk
                </button>

                {/* Hint kredensial (opsional, bisa dihapus nanti) */}
                <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-[11px] text-emerald-800">
                  <div className="font-semibold mb-1">Kredensial Demo</div>
                  <div>
                    Username: <span className="font-mono">PTPN5TNM</span>
                  </div>
                  <div>
                    Password: <span className="font-mono">PTPN5AKHLAK</span>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
