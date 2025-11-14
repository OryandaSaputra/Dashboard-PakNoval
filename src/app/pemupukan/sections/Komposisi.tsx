// import SectionHeader from "../components/SectionHeader";
// import { Card, CardContent } from "@/components/ui/card";

// export default function Komposisi({
//   aggPupuk,
// }: {
//   aggPupuk: { jenis: string; realisasi: number; realisasi_ha?: number }[];
// }) {
//   return (
//     <section id="komposisi" className="space-y-2 scroll-mt-24">
//       <SectionHeader title="Komposisi Realisasi per Jenis Pupuk" desc="Menampilkan jumlah dalam Kg dan Ha" />
//       <Card className="overflow-hidden bg-white/80 dark:bg-slate-900/60">
//         <CardContent className="p-0">
//           <div className="overflow-x-auto">
//             <table className="min-w-full text-xs">
//               <thead className="bg-slate-100 dark:bg-slate-800/40">
//                 <tr>
//                   <th className="px-3 py-2 text-left">Jenis Pupuk</th>
//                   <th className="px-3 py-2 text-right">Realisasi (Kg)</th>
//                   <th className="px-3 py-2 text-right">Realisasi (Ha)</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {aggPupuk.map((row) => (
//                   <tr key={`komp-${row.jenis}`} className="border-t border-slate-100 dark:border-slate-800">
//                     <td className="px-3 py-2">{row.jenis}</td>
//                     <td className="px-3 py-2 text-right">{(row.realisasi || 0).toLocaleString("id-ID")}</td>
//                     <td className="px-3 py-2 text-right">
//                       {row.realisasi_ha ? row.realisasi_ha.toLocaleString("id-ID") : "-"}
//                     </td>
//                   </tr>
//                 ))}
//                 {aggPupuk.length === 0 && (
//                   <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">Tidak ada data.</td></tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </CardContent>
//       </Card>
//     </section>
//   );
// }
