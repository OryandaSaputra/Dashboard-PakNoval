export const KEBUN_LABEL: Record<string, string> = {
  // DTM
  TJM: "Tanjung Medan",
  TNP: "Tanah Putih",
  SPG: "Sei Pagar",
  SGL: "Sei Galuh",
  SGR: "Sei Garo",
  LBD: "Lubuk Dalam",
  SBT: "Sei Buatan",
  AM1: "Air Molek- I",
  AM2: "Air Molek- II",
  // DBR
  SKC: "Sei Kencana",
  TRT: "Terantam",
  TDN: "Tandun",
  SLD: "Sei Lindai",
  TMR: "Tamora",
  SBL: "Sei Batulangkah",
  SBR: "Sei Berlian",
  SRK: "Sei Rokan",
  SIN: "Sei Intan",
  SIS: "Sei Siasam",
  STP: "Sei Tapung",
};

export const ORDER_DTM = ["TJM", "TNP", "SPG", "SGL", "SGR", "LBD", "SBT", "AM1", "AM2"];
export const ORDER_DBR = ["SKC", "TRT", "TDN", "SLD", "TMR", "SBL", "SBR", "SRK", "SIN", "SIS", "STP"];

export const PTPN_GREEN_DARK = "#004D25";
export const PTPN_GREEN = "#006B3F";
export const PTPN_GREEN_BRIGHT = "#00A45A";
export const PTPN_ORANGE = "#F59E0B";
export const PTPN_CREAM = "#FFF7ED";
export const PTPN_INK = "#0B1320";

export const COLOR_PLAN = PTPN_INK;
export const COLOR_REAL = PTPN_GREEN;
export const COLOR_REMAIN = "#E2E8F0";
export const COLOR_TM = PTPN_GREEN_BRIGHT;
export const COLOR_TBM = "#86EFAC";
export const COLOR_STOK = PTPN_GREEN_DARK;
export const COLOR_SISA = PTPN_ORANGE;

export const PUPUK_KEYS = ["npk", "urea", "tsp", "mop", "dolomite", "borate", "cuso4", "znso4"] as const;

export const LABEL_PUPUK = {
  npk: "NPK",
  urea: "Urea",
  tsp: "TSP",
  mop: "MOP",
  dolomite: "Dolomite",
  borate: "Borate",
  cuso4: "CuSO₄",
  znso4: "ZnSO₄",
} as const;
