"use client";

import * as React from "react";
import { useAcademicYears, useCurriculumVersions, useTerms } from "@/lib/query/queries/use-academic-config";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { getAccessToken } from "@/lib/api/client";
import {
  resolveDefaultAcademicYear,
  resolveDefaultTerm,
  resolveDefaultCurriculum,
} from "@/lib/scope-resolvers";

interface AcademicScopeContextType {
  yearId: string | null;
  curriculumId: string | null;
  termId: string | null;
  setYearId: (id: string | null) => void;
  setCurriculumId: (id: string | null) => void;
  setTermId: (id: string | null) => void;
  hasNoActiveTerm: boolean;
  isResolving: boolean;
}

export const AcademicScopeContext = React.createContext<AcademicScopeContextType | undefined>(undefined);

export function AcademicScopeProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [yearId, setYearIdState] = React.useState<string | null>(null);
  const [curriculumId, setCurriculumIdState] = React.useState<string | null>(null);
  const [termId, setTermIdState] = React.useState<string | null>(null);
  const [isResolving, setIsResolving] = React.useState(true);
  const isInitialResolveDone = React.useRef(false);

  React.useEffect(() => {
    setIsAuthenticated(Boolean(getAccessToken()));

    const handleTokensChanged = () => {
      setIsAuthenticated(Boolean(getAccessToken()));
    };

    window.addEventListener("akademiq:tokens-changed", handleTokensChanged);
    return () => window.removeEventListener("akademiq:tokens-changed", handleTokensChanged);
  }, []);

  const tenantMe = useTenantMe(isAuthenticated);
  const tenantId = tenantMe.data?.tenant_id;

  const yearsQuery = useAcademicYears({ enabled: isAuthenticated });
  const curriculumQuery = useCurriculumVersions(yearId ?? undefined);
  const termsQuery = useTerms(yearId ?? undefined);

  const storageKey = tenantId ? `akademiq.academic_scope.${tenantId}` : null;

  // Step 1: resolve year once on initial mount
  React.useEffect(() => {
    if (!isAuthenticated) return;
    if (tenantMe.isLoading) return;
    if (!tenantId) return;
    if (yearsQuery.isLoading) return;
    if (isInitialResolveDone.current) return;

    isInitialResolveDone.current = true;
    const years = yearsQuery.data ?? [];
    const resolved = resolveDefaultAcademicYear(years);
    setYearIdState(resolved);

    if (!resolved) {
      setCurriculumIdState(null);
      setTermIdState(null);
      setIsResolving(false);
    }
  }, [isAuthenticated, tenantMe.isLoading, tenantId, yearsQuery.isLoading, yearsQuery.data]);

  // Step 2: resolve curriculum when yearId and curriculum data are available
  React.useEffect(() => {
    if (!yearId || curriculumQuery.isLoading || !curriculumQuery.data) return;

    const curriculums = curriculumQuery.data ?? [];
    setCurriculumIdState(resolveDefaultCurriculum(curriculums));
  }, [yearId, curriculumQuery.isLoading, curriculumQuery.data]);

  // Step 3: resolve term when yearId and term data are available, then finish resolving
  React.useEffect(() => {
    if (!yearId || termsQuery.isLoading || !termsQuery.data) return;

    const terms = termsQuery.data ?? [];
    setTermIdState(resolveDefaultTerm(terms));
    setIsResolving(false);
  }, [yearId, termsQuery.isLoading, termsQuery.data]);

  // Save to localStorage when scope changes (after initial resolve)
  React.useEffect(() => {
    if (!storageKey || isResolving) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        academic_year_id: yearId,
        curriculum_version_id: curriculumId,
        term_id: termId,
      })
    );
  }, [yearId, curriculumId, termId, storageKey, isResolving]);

  // Sync across tabs
  React.useEffect(() => {
    if (!storageKey) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const newYearId = parsed.academic_year_id || null;
          const newCurriculumId = parsed.curriculum_version_id || null;
          const newTermId = parsed.term_id || null;

          if (newYearId !== yearId) setYearIdState(newYearId);
          if (newCurriculumId !== curriculumId) setCurriculumIdState(newCurriculumId);
          if (newTermId !== termId) setTermIdState(newTermId);
        } catch (err) {
          console.error("Failed to sync storage change", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [storageKey, yearId, curriculumId, termId]);

  const setYearId = React.useCallback((id: string | null) => {
    setYearIdState(id);
    if (!id) {
      setCurriculumIdState(null);
      setTermIdState(null);
    }
  }, []);

  const setCurriculumId = React.useCallback((id: string | null) => {
    setCurriculumIdState(id);
  }, []);

  const setTermId = React.useCallback((id: string | null) => {
    setTermIdState(id);
  }, []);

  const years = yearsQuery.data ?? [];
  const selectedYear = years.find((y) => y.academic_year_id === yearId);
  const terms = termsQuery.data ?? [];
  const hasNoActiveTerm =
    selectedYear?.status === "Active" && terms.length > 0 && !terms.some((t) => t.status === "Active");

  return (
    <AcademicScopeContext.Provider
      value={{
        yearId,
        curriculumId,
        termId,
        setYearId,
        setCurriculumId,
        setTermId,
        hasNoActiveTerm,
        isResolving,
      }}
    >
      {children}
    </AcademicScopeContext.Provider>
  );
}
