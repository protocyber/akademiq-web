"use client";

import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage, promotionFieldGroups } from "@/lib/errors/messages";
import { withStudentNames } from "@/lib/promotion/placement";
import { useExecutePromotionRun } from "@/lib/query/mutations/use-promotion";
import type { PromotionDecision, PromotionRunDetail } from "@/lib/query/queries/use-promotion";

export function canConfirmExecution(typed: string, targetYearName: string, unassigned: number): boolean {
  return unassigned === 0 && targetYearName !== "" && typed.trim() === targetYearName;
}

export function ExecuteDialog({
  open,
  onOpenChange,
  detail,
  decisions,
  targetYearName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: PromotionRunDetail;
  decisions: Pick<PromotionDecision, "student_id" | "full_name">[];
  targetYearName: string;
}) {
  const execute = useExecutePromotionRun(detail.run.run_id);
  const [typed, setTyped] = React.useState("");
  const [failure, setFailure] = React.useState<unknown>(null);

  React.useEffect(() => {
    if (open) {
      setTyped("");
      setFailure(null);
    }
  }, [open]);

  const names = React.useMemo(
    () => new Map(decisions.filter((d) => d.full_name).map((d) => [d.student_id, d.full_name as string])),
    [decisions],
  );
  const over = detail.placement.filter((p) => p.over_capacity);
  const groups = promotionFieldGroups(failure);
  const ready = canConfirmExecution(typed, targetYearName, detail.unassigned);

  async function run() {
    setFailure(null);
    try {
      const outcome = await execute.mutateAsync();
      toast.success(
        `Kenaikan kelas dieksekusi: ${outcome.counts.promoted} naik, ${outcome.counts.retained} tinggal, ${outcome.counts.graduated} lulus.`,
      );
      onOpenChange(false);
    } catch (error) {
      setFailure(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eksekusi kenaikan kelas</DialogTitle>
          <DialogDescription>
            Semua siswa dipindahkan ke tahun {targetYearName || "tujuan"} dalam satu kali proses. Tindakan ini tidak bisa
            dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-1 text-sm">
          <li>Naik: {detail.counts.promote}</li>
          <li>Tinggal kelas: {detail.counts.retain}</li>
          <li>Lulus: {detail.counts.graduate}</li>
        </ul>
        {over.length > 0 ? (
          <Alert>
            <AlertTitle>Kelas melebihi kapasitas</AlertTitle>
            <AlertDescription>{over.map((p) => `${p.name} (${p.total}/${p.capacity})`).join(", ")}</AlertDescription>
          </Alert>
        ) : null}
        {detail.unassigned > 0 ? (
          <Alert variant="destructive">
            <AlertDescription>Lengkapi tujuan {detail.unassigned} siswa dulu.</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-year">Ketik nama tahun tujuan untuk konfirmasi</Label>
            <Input id="confirm-year" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={targetYearName} />
          </div>
        )}
        {groups.length > 0 ? (
          <Alert variant="destructive">
            <AlertTitle>Eksekusi ditolak</AlertTitle>
            <AlertDescription className="space-y-2">
              {groups.map((g) => (
                <div key={g.field}>
                  <p className="font-medium">{g.label}</p>
                  <ul className="list-disc pl-4">
                    {g.messages.map((m) => (
                      <li key={m}>{withStudentNames(m, names)}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </AlertDescription>
          </Alert>
        ) : failure ? (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(failure, { fallback: "Eksekusi gagal." })}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={execute.isPending}>
            Batal
          </Button>
          <Button variant="destructive" onClick={run} disabled={!ready} loading={execute.isPending}>
            Eksekusi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
