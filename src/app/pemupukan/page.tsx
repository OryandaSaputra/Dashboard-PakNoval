"use client";
import { usePemupukan } from "@/app/pemupukan/context";
import Ikhtisar from "@/app/pemupukan/sections/Ikhtisar";
import Visualisasi from "@/app/pemupukan/sections/Visualisasi";

export default function Page() {
  const {
    totalRencana, totalRealisasi,
    tmRencana, tmRealisasi, tbmRencana, tbmRealisasi, bibRencana, bibRealisasi,
    dtmRencana, dbrRencana, dtmRealisasi, dbrRealisasi,
    barPerKebun, aggPupuk, stokVsSisa,
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
