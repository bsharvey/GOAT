export const ROYALTY_SOURCES = [
  "spotify",
  "apple-music",
  "tidal",
  "amazon-music",
  "youtube-music",
  "soundexchange",
  "mlc",
  "ascap",
  "bmi",
  "sesac",
  "manual",
] as const;

export type RoyaltySource = (typeof ROYALTY_SOURCES)[number];

export const PRO_AFFILIATIONS = [
  "ASCAP",
  "BMI",
  "SESAC",
  "GMR",
  "NONE",
] as const;

export type ProAffiliation = (typeof PRO_AFFILIATIONS)[number];
