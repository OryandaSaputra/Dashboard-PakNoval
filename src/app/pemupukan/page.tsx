"use client";
import { usePemupukan } from "@/app/pemupukan/context";
import Ikhtisar from "@/app/pemupukan/sections/Ikhtisar";
import Visualisasi from "@/app/pemupukan/sections/Visualisasi";

export default function Page() {
  const {
    totalRencana, totalRealisasi,
    tmRencana, tmRealisasi, tbmRencana, tbmRealisasi, bibRencana, bibRealisasi,
    dtmRencana, dbrRencana, dtmRealisasi, dbrRealisasi,
    pieTotal, barEfisiensiDistrik, barPerKebun, aggPupuk, stokVsSisa,
    tmRows, tbmRows, tmTbmRows,
    headerDates, realWindow, realCutoffDate,
  } = usePemupukan();

  return (
    <>
      <Ikhtisar
        totals={{
          totalRencana, totalRealisasi,
          tmRencana, tmRealisasi, tbmRencana, tbmRealisasi, bibRencana, bibRealisasi,
          dtmRencana, dbrRencana, dtmRealisasi, dbrRealisasi,
        }}
      />
      <Visualisasi
        pieTotal={pieTotal}
        barEfisiensiDistrik={barEfisiensiDistrik}
        barPerKebun={barPerKebun}
        aggPupuk={aggPupuk}
        stokVsSisa={stokVsSisa}
        tmRows={tmRows}
        tbmRows={tbmRows}
        tmTbmRows={tmTbmRows}
        headerDates={headerDates}
        realWindow={realWindow}
        realCutoffDate={realCutoffDate}
      />
    </>
  );
}
