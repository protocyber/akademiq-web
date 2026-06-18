"use client";

import * as React from "react";
import { useAcademicYears, useCurriculumVersions, useTerms } from "@/lib/query/queries/use-academic-config";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { getAccessToken } from "@/lib/api/client";

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

  const tempRestoredCurriculumIdRef = React.useRef<string | null>(null);
  const tempRestoredTermIdRef = React.useRef<string | null>(null);
  const shouldSelectNewestCurriculumRef = React.useRef(false);
  const shouldResolveDefaultTermRef = React.useRef(false);
  const isInitialLoadRef = React.useRef(true);

  React.useEffect(() => {
    setIsAuthenticated(Boolean(getAccessToken()));
  }, []);

  const tenantMe = useTenantMe(isAuthenticated);
  const tenantId = tenantMe.data?.tenant_id;

  const yearsQuery = useAcademicYears({ enabled: isAuthenticated });
  const curriculumQuery = useCurriculumVersions(yearId ?? undefined);
  const termsQuery = useTerms(yearId ?? undefined);

  const storageKey = tenantId ? `akademiq.academic_scope.${tenantId}` : null;

  // Initial mount: load and validate from localStorage
  React.useEffect(() => {
    if (!isAuthenticated) {
      setIsResolving(false);
      return;
    }
    if (tenantMe.isLoading) return;
    if (!tenantId) {
      setIsResolving(false);
      return;
    }
    if (yearsQuery.isLoading) return;

    const years = yearsQuery.data ?? [];

    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      const saved = localStorage.getItem(`akademiq.academic_scope.${tenantId}`);
      let restoredYearId: string | null = null;
      let restoredCurriculumId: string | null = null;
      let restoredTermId: string | null = null;

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          restoredYearId = parsed.academic_year_id || null;
          restoredCurriculumId = parsed.curriculum_version_id || null;
          restoredTermId = parsed.term_id || null;
        } catch (e) {
          console.error("Failed to parse saved academic scope", e);
        }
      } else {
        shouldSelectNewestCurriculumRef.current = true;
        shouldResolveDefaultTermRef.current = true;
      }

      const yearExists = years.some((y) => y.academic_year_id === restoredYearId);
      if (!yearExists) {
        const activeYear = years.find((y) => y.status === "Active");
        restoredYearId = activeYear ? activeYear.academic_year_id : null;
        restoredCurriculumId = null;
        restoredTermId = null;
        shouldSelectNewestCurriculumRef.current = true;
        shouldResolveDefaultTermRef.current = true;
      }

      setYearIdState(restoredYearId);

      if (!restoredYearId) {
        setCurriculumIdState(null);
        setTermIdState(null);
        setIsResolving(false);
      } else {
        tempRestoredCurriculumIdRef.current = restoredCurriculumId;
        tempRestoredTermIdRef.current = restoredTermId;
      }
    }
  }, [isAuthenticated, tenantMe.isLoading, tenantId, yearsQuery.isLoading, yearsQuery.data]);

  // Resolve curriculum once yearId is set and curriculum versions load
  React.useEffect(() => {
    if (!yearId || curriculumQuery.isLoading || !curriculumQuery.data) return;

    const curriculums = curriculumQuery.data ?? [];

    if (tempRestoredCurriculumIdRef.current !== null) {
      const restoredCurriculumId = tempRestoredCurriculumIdRef.current;
      const curriculumExists = curriculums.some((c) => c.curriculum_version_id === restoredCurriculumId);
      setCurriculumIdState(
        curriculumExists
          ? restoredCurriculumId
          : curriculums.length > 0 ? curriculums[curriculums.length - 1].curriculum_version_id : null
      );
      tempRestoredCurriculumIdRef.current = null;
    } else if (shouldSelectNewestCurriculumRef.current) {
      setCurriculumIdState(
        curriculums.length > 0 ? curriculums[curriculums.length - 1].curriculum_version_id : null
      );
      shouldSelectNewestCurriculumRef.current = false;
    }
  }, [yearId, curriculumQuery.isLoading, curriculumQuery.data]);

  // Resolve term once yearId is set and terms load
  React.useEffect(() => {
    if (!yearId || termsQuery.isLoading || !termsQuery.data) return;

    const terms = termsQuery.data ?? [];

    if (tempRestoredTermIdRef.current !== null) {
      const restoredTermId = tempRestoredTermIdRef.current;
      const termExists = terms.some((t) => t.term_id === restoredTermId);
      if (termExists) {
        setTermIdState(restoredTermId);
      } else {
        setTermIdState(resolveDefaultTerm(terms));
      }
      tempRestoredTermIdRef.current = null;
      setIsResolving(false);
    } else if (shouldResolveDefaultTermRef.current) {
      setTermIdState(resolveDefaultTerm(terms));
      shouldResolveDefaultTermRef.current = false;
      setIsResolving(false);
    }
  }, [yearId, termsQuery.isLoading, termsQuery.data]);

  // Save to localStorage when yearId, curriculumId, or termId changes
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
    } else {
      shouldSelectNewestCurriculumRef.current = true;
      shouldResolveDefaultTermRef.current = true;
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

function resolveDefaultTerm(terms: { term_id: string; status: string; start_date: string; end_date: string }[]): string | null {
  if (terms.length === 0) return null;
  const active = terms.find((t) => t.status === "Active");
  if (active) return active.term_id;
  const today = new Date().toISOString().slice(0, 10);
  const inRange = terms.find((t) => t.start_date <= today && today <= t.end_date);
  if (inRange) return inRange.term_id;
  return terms[0].term_id;
}
