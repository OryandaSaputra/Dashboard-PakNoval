"use client";
import { usePemupukan } from "@/app/pemupukan/context";
import Komposisi from "@/app/pemupukan/sections/Komposisi";

export default function Page() {
  const { aggPupuk } = usePemupukan();
  return <Komposisi aggPupuk={aggPupuk} />;
}
