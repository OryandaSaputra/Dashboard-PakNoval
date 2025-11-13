"use client";
import { usePemupukan } from "@/app/pemupukan/context";
import TabelRingkas from "@/app/pemupukan/sections/TabelRingkas";

export default function Page() {
  const { filtered, loading } = usePemupukan();
  return <TabelRingkas filtered={filtered} loading={loading} />;