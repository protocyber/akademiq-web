export type ResolvableAcademicYear = {
  academic_year_id: string;
  status: string;
  start_date: string;
  end_date: string;
};

export type ResolvableTerm = {
  term_id: string;
  status: string;
  start_date: string;
  end_date: string;
};

export type ResolvableCurriculum = {
  curriculum_version_id: string;
};

export function resolveDefaultAcademicYear(years: ResolvableAcademicYear[]): string | null {
  if (years.length === 0) return null;
  const active = years.find((y) => y.status === "Active");
  if (active) return active.academic_year_id;
  const sorted = [...years].sort((a, b) => b.start_date.localeCompare(a.start_date));
  return sorted[0].academic_year_id;
}

export function resolveDefaultTerm(terms: ResolvableTerm[]): string | null {
  if (terms.length === 0) return null;
  const active = terms.find((t) => t.status === "Active");
  if (active) return active.term_id;
  const today = new Date().toISOString().slice(0, 10);
  const inRange = terms.find((t) => t.start_date <= today && today <= t.end_date);
  if (inRange) return inRange.term_id;
  const sorted = [...terms].sort((a, b) => b.start_date.localeCompare(a.start_date));
  return sorted[0].term_id;
}

export function resolveDefaultCurriculum(curriculums: ResolvableCurriculum[]): string | null {
  if (curriculums.length === 0) return null;
  return curriculums[curriculums.length - 1].curriculum_version_id;
}
