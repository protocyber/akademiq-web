"use client";

import * as React from "react";
import { useAcademicYears, useCurriculumVersions } from "@/lib/query/queries/use-academic-config";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { getAccessToken } from "@/lib/api/client";

interface AcademicScopeContextType {
  yearId: string | null;
  curriculumId: string | null;
  setYearId: (id: string | null) => void;
  setCurriculumId: (id: string | null) => void;
  isResolving: boolean;
}

export const AcademicScopeContext = React.createContext<AcademicScopeContextType | undefined>(undefined);

export function AcademicScopeProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [yearId, setYearIdState] = React.useState<string | null>(null);
  const [curriculumId, setCurriculumIdState] = React.useState<string | null>(null);
  const [isResolving, setIsResolving] = React.useState(true);

  // Refs for tracking async state restoration
  const tempRestoredCurriculumIdRef = React.useRef<string | null>(null);
  const shouldSelectNewestCurriculumRef = React.useRef(false);
  const isInitialLoadRef = React.useRef(true);

  React.useEffect(() => {
    setIsAuthenticated(Boolean(getAccessToken()));
  }, []);

  const tenantMe = useTenantMe(isAuthenticated);
  const tenantId = tenantMe.data?.tenant_id;

  const yearsQuery = useAcademicYears();
  const curriculumQuery = useCurriculumVersions(yearId ?? undefined);

  const storageKey = tenantId ? `akademiq.academic_scope.${tenantId}` : null;

  // Initial mount: load and validate from localStorage
  React.useEffect(() => {
    if (!isAuthenticated) {
      setIsResolving(false);
      return;
    }
    if (tenantMe.isLoading) {
      return;
    }
    if (!tenantId) {
      setIsResolving(false);
      return;
    }
    if (yearsQuery.isLoading) {
      return;
    }

    const years = yearsQuery.data ?? [];

    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      const saved = localStorage.getItem(`akademiq.academic_scope.${tenantId}`);
      let restoredYearId: string | null = null;
      let restoredCurriculumId: string | null = null;

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          restoredYearId = parsed.academic_year_id || null;
          restoredCurriculumId = parsed.curriculum_version_id || null;
        } catch (e) {
          console.error("Failed to parse saved academic scope", e);
        }
      } else {
        shouldSelectNewestCurriculumRef.current = true;
      }

      // Validate restored yearId
      const yearExists = years.some((y) => y.academic_year_id === restoredYearId);
      if (!yearExists) {
        // Fallback to Active year
        const activeYear = years.find((y) => y.status === "Active");
        restoredYearId = activeYear ? activeYear.academic_year_id : null;
        restoredCurriculumId = null;
        shouldSelectNewestCurriculumRef.current = true;
      }

      setYearIdState(restoredYearId);

      if (!restoredYearId) {
        setCurriculumIdState(null);
        setIsResolving(false);
      } else {
        tempRestoredCurriculumIdRef.current = restoredCurriculumId;
      }
    }
  }, [isAuthenticated, tenantMe.isLoading, tenantId, yearsQuery.isLoading, yearsQuery.data]);

  // Resolve curriculum once yearId is set and its curriculum versions load
  React.useEffect(() => {
    if (!yearId || curriculumQuery.isLoading || !curriculumQuery.data) return;

    const curriculums = curriculumQuery.data ?? [];

    // If we have a restored curriculum ID, validate and use it
    if (tempRestoredCurriculumIdRef.current !== null) {
      const restoredCurriculumId = tempRestoredCurriculumIdRef.current;
      const curriculumExists = curriculums.some((c) => c.curriculum_version_id === restoredCurriculumId);
      
      let finalCurriculumId: string | null = null;
      if (curriculumExists) {
        finalCurriculumId = restoredCurriculumId;
      } else {
        finalCurriculumId = curriculums.length > 0 ? curriculums[curriculums.length - 1].curriculum_version_id : null;
      }
      
      setCurriculumIdState(finalCurriculumId);
      tempRestoredCurriculumIdRef.current = null;
      setIsResolving(false);
    } else if (shouldSelectNewestCurriculumRef.current) {
      // If user changed the year, select the newest curriculum
      const newest = curriculums.length > 0 ? curriculums[curriculums.length - 1].curriculum_version_id : null;
      setCurriculumIdState(newest);
      shouldSelectNewestCurriculumRef.current = false;
      setIsResolving(false);
    }
  }, [yearId, curriculumQuery.isLoading, curriculumQuery.data]);

  // Save to localStorage when yearId or curriculumId changes
  React.useEffect(() => {
    if (!storageKey || isResolving) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        academic_year_id: yearId,
        curriculum_version_id: curriculumId,
      })
    );
  }, [yearId, curriculumId, storageKey, isResolving]);

  // Listen to storage events to sync across tabs
  React.useEffect(() => {
    if (!storageKey) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const newYearId = parsed.academic_year_id || null;
          const newCurriculumId = parsed.curriculum_version_id || null;

          if (newYearId !== yearId) {
            setYearIdState(newYearId);
          }
          if (newCurriculumId !== curriculumId) {
            setCurriculumIdState(newCurriculumId);
          }
        } catch (err) {
          console.error("Failed to sync storage change", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [storageKey, yearId, curriculumId]);

  const setYearId = React.useCallback((id: string | null) => {
    setYearIdState(id);
    if (!id) {
      setCurriculumIdState(null);
    } else {
      shouldSelectNewestCurriculumRef.current = true;
    }
  }, []);

  const setCurriculumId = React.useCallback((id: string | null) => {
    setCurriculumIdState(id);
  }, []);

  return (
    <AcademicScopeContext.Provider
      value={{
        yearId,
        curriculumId,
        setYearId,
        setCurriculumId,
        isResolving,
      }}
    >
      {children}
    </AcademicScopeContext.Provider>
  );
}
