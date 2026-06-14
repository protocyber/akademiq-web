"use client";

import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Confirm button label. Defaults to "Konfirmasi". */
  confirmLabel?: string;
  /** Cancel button label. Defaults to "Batal". */
  cancelLabel?: string;
  /** Label shown while `loading` is true. Defaults to `confirmLabel`. */
  loadingLabel?: string;
  /** Disables both buttons and swaps the confirm label to `loadingLabel`. */
  loading?: boolean;
  /** Red destructive confirm button. */
  destructive?: boolean;
  /** Confirm disabled when false (e.g. nothing selected). */
  canConfirm?: boolean;
  /** Called when the confirm action is clicked. Caller controls `open`. */
  onConfirm: () => void | Promise<void>;
};

/**
 * Reusable confirmation dialog built on the shadcn AlertDialog primitive.
 *
 * Controlled: the caller owns `open` and is responsible for closing the dialog
 * after a successful action (so a failed mutation keeps it open for retry).
 * Mirrors the focus-trap and portal behavior of Radix AlertDialog, so it stacks
 * correctly on top of an open `Dialog`.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  loadingLabel,
  loading = false,
  destructive = false,
  canConfirm = true,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              destructive &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
            disabled={loading || !canConfirm}
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
          >
            {loading ? (loadingLabel ?? confirmLabel) : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
