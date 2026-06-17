"use client";

import * as React from "react";
import { AcademicScopeContext } from "@/components/providers/academic-scope-provider";

export function useAcademicScope() {
  const context = React.useContext(AcademicScopeContext);
  if (context === undefined) {
    throw new Error("useAcademicScope must be used within an AcademicScopeProvider");
  }
  return context;
}
