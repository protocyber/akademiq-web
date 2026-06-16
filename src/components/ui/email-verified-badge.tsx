import * as React from "react";
import { Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface EmailVerifiedBadgeProps {
  verified: boolean;
  className?: string;
}

export function EmailVerifiedBadge({ verified, className }: EmailVerifiedBadgeProps) {
  if (verified) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "inline-flex items-center gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 px-2 py-0.5 text-xs font-medium",
          className
        )}
        title="Email Terverifikasi"
        aria-label="Email Terverifikasi"
      >
        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <span>Terverifikasi</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 px-2 py-0.5 text-xs font-medium",
        className
      )}
      title="Email Belum Terverifikasi"
      aria-label="Email Belum Terverifikasi"
    >
      <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <span>Belum Verifikasi</span>
    </Badge>
  );
}
