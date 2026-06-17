"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

type StatusConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: string;
  targetStatus: string;
  onConfirm: (reason: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  setError?: (err: string | null) => void;
};

const STATUS_ORDER = ["Draft", "Active", "Closed", "Archived"];

const STATUS_LABELS: Record<string, string> = {
  Draft: "Draft",
  Active: "Aktif",
  Closed: "Ditutup",
  Archived: "Arsip",
};

export function StatusConfirmDialog({
  open,
  onOpenChange,
  currentStatus,
  targetStatus,
  onConfirm,
  loading = false,
  error: propError,
  setError: propSetError,
}: StatusConfirmDialogProps) {
  const [reason, setReason] = React.useState("");
  const [confirmText, setConfirmText] = React.useState("");
  const [cooldown, setCooldown] = React.useState(0);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const error = propError !== undefined ? propError : localError;
  const setError = propSetError !== undefined ? propSetError : setLocalError;

  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const targetIdx = STATUS_ORDER.indexOf(targetStatus);
  const isForward = targetIdx > currentIdx;
  const isArchived = targetStatus === "Archived";

  const tier = isArchived ? "archived" : !isForward ? "backward" : "forward";

  // Reset state on open
  React.useEffect(() => {
    if (open) {
      setReason("");
      setConfirmText("");
      setError(null);
      if (tier === "backward" || tier === "archived") {
        setCooldown(5);
      } else {
        setCooldown(0);
      }
    }
  }, [open, tier, setError]);

  // Cooldown timer
  React.useEffect(() => {
    if (cooldown > 0 && open) {
      const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown, open]);

  // Expected confirmation text validation
  const expectedConfirmText = tier === "archived" ? "ARCHIVED" : STATUS_LABELS[targetStatus] ?? targetStatus;
  const isConfirmationTyped = tier === "forward" || confirmText.trim() === expectedConfirmText;
  const isReasonValid = reason.trim().length >= 10;
  const canSubmit = isConfirmationTyped && isReasonValid && cooldown === 0 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      await onConfirm(reason);
      onOpenChange(false);
    } catch (err: any) {
      // Handled by caller or local error state
      if (!propSetError) {
        let msg = "Terjadi kesalahan saat mengubah status.";
        const code = err?.error?.code || err?.code;
        if (code === "ACTIVE_YEAR_EXISTS") {
          msg = "Tahun ajaran aktif sudah ada untuk penyewa ini. Silakan tutup tahun ajaran aktif terlebih dahulu.";
        } else if (code === "INVALID_STATE_TRANSITION") {
          msg = "Transisi status ini tidak diperbolehkan.";
        } else if (code === "VALIDATION_ERROR") {
          msg = "Alasan tidak valid. Alasan minimal harus 10 karakter.";
        }
        setError(msg);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Ubah Status ke {STATUS_LABELS[targetStatus] ?? targetStatus}
          </DialogTitle>
          <DialogDescription>
            Konfirmasi perubahan status tahun ajaran dari {STATUS_LABELS[currentStatus] ?? currentStatus} ke {STATUS_LABELS[targetStatus] ?? targetStatus}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {tier === "archived" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Tindakan Irreversible!</AlertTitle>
              <AlertDescription>
                Tindakan ini tidak dapat dibatalkan. Seluruh rapor siswa untuk tahun ajaran ini akan diarsipkan secara permanen dan tidak dapat diubah lagi.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
              <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="status-reason" className="text-sm font-medium">
              Alasan Perubahan Status <span className="text-destructive">*</span>
            </Label>
            <Input
              id="status-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Masukkan alasan minimal 10 karakter"
              required
              minLength={10}
              autoComplete="off"
            />
            {reason.trim().length > 0 && reason.trim().length < 10 && (
              <p className="text-[11px] text-destructive font-medium">Alasan harus minimal 10 karakter ({reason.trim().length}/10)</p>
            )}
          </div>

          {(tier === "backward" || tier === "archived") && (
            <div className="space-y-1.5">
              <Label htmlFor="status-confirm-text" className="text-sm font-medium">
                Ketik <span className="font-mono bg-muted px-1.5 py-0.5 rounded border text-foreground font-semibold">{expectedConfirmText}</span> untuk mengonfirmasi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="status-confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Ketik "${expectedConfirmText}"`}
                required
                autoComplete="off"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              loading={loading}
              variant={tier === "archived" ? "destructive" : "default"}
            >
              {cooldown > 0 ? `Tunggu ${cooldown}s` : "Konfirmasi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
