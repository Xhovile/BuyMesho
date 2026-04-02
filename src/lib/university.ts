import { UNIVERSITIES } from "../constants";
import type { University } from "../types";

const UNIVERSITY_ALIASES: Record<string, University> = {
  kuhes: "Kamuzu University of Health Sciences (KUHeS)",
  mubas: "Malawi University of Business and Applied Sciences (MUBAS)",
  unima: "University of Malawi (UNIMA)",
  must: "Malawi University of Science and Technology (MUST)",
  mzuni: "Mzuzu University (MZUNI)",
  luanar: "Lilongwe University of Agriculture and Natural Resources (LUANAR)",
  cunima: "Catholic University of Malawi (CUNIMA)",
  nkhuni: "Nkhoma University (NKHUNI)",
  magu: "Malawi Assemblies of God University (MAGU)",
  mau: "Malawi Adventist University (MAU)",
  plu: "Pentecostal Life University (PLU)",
  unilia: "University of Livingstonia (UNILIA)",
  eu: "Exploits University (EU)",
  unilil: "University of Lilongwe (UNILIL)",
  lamau: "Lake Malawi Anglican University (LAMAU)",
  biu: "Blantyre International University (BIU)",
  swou: "ShareWorld Open University (SWOU)",
  ju: "Jubilee University (JU)",
  ubs: "University of Blantyre Synod (UBS)",
};

const UNIVERSITY_BY_NORMALIZED = new Map<string, University>(
  UNIVERSITIES.map((name) => [name.toLowerCase(), name])
);

const ABBREVIATION_TO_UNIVERSITY = new Map<string, University>(
  UNIVERSITIES.flatMap((name) => {
    const abbreviation = name.match(/\(([^)]+)\)/)?.[1]?.trim().toLowerCase();
    return abbreviation ? [[abbreviation, name] as const] : [];
  })
);

export const resolveUniversity = (rawValue?: string | null): University => {
  if (typeof rawValue !== "string") return UNIVERSITIES[0] as University;
  const trimmed = rawValue.trim();
  if (!trimmed) return UNIVERSITIES[0] as University;

  const byName = UNIVERSITY_BY_NORMALIZED.get(trimmed.toLowerCase());
  if (byName) return byName;

  const byAbbreviation = ABBREVIATION_TO_UNIVERSITY.get(trimmed.toLowerCase());
  if (byAbbreviation) return byAbbreviation;

  const aliased = UNIVERSITY_ALIASES[trimmed.toLowerCase()];
  if (aliased) return aliased;

  return trimmed as University;
};
