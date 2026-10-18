"use client";

import * as React from "react";

import type { PromotionAccess } from "@/components/features/promotion/promotion-page";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/errors/messages";
import { useTransitionPromotionRun, type PromotionTransition } from "@/lib/query/mutations/use-promotion";
import type { PromotionRunDetail, PromotionStatus } from "@/lib/query/queries/use-promotion";

export type PromotionAction = "reevaluate" | "submit" | "approve" | "return" | "execute";

export function availableActions(
  status: PromotionStatus,
  access: { canManage: boolean; canApprove: boolean },
): PromotionAction[] {
  switch (status) {
    case "draft":
      return access.canManage ? ["reevaluate", "submit"] : [];
    case "submitted":
      return access.canApprove ? ["approve", "return"] : [];
    case "approved":
      return access.canManage ? ["execute"] : [];
    case "executed":
      return [];
  }
}

const TRANSITION_COPY: Record<PromotionTransition, { label: string; title: string; description: string; done: string }> = {
  submit: {
    label: "Ajukan",
    title: "Ajukan evaluasi?",
    description: "Setelah diajukan, keputusan tidak bisa diubah sampai kepala sekolah mengembalikannya.",
    done: "Evaluasi diajukan.",
  },
  approve: {
    label: "Setujui",
    title: "Setujui evaluasi?",
    description: "Setelah disetujui, admin dapat menentukan kelas tujuan dan mengeksekusi kenaikan kelas.",
    done: "Evaluasi disetujui.",
  },
  return: {
    label: "Kembalikan",
    title: "Kembalikan ke draft?",
    description: "Admin dapat mengubah keputusan lagi lalu mengajukan ulang.",
    done: "Evaluasi dikembalikan ke draft.",
  },
};

export function ActionBar({
  detail,
  access,
  onReevaluate,
  onExecute,
  executeDisabled = false,
}: {
  detail: PromotionRunDetail;
  access: PromotionAccess;
  onReevaluate: () => void;
  onExecute: () => void;
  executeDisabled?: boolean;
}) {
  const transition = useTransitionPromotionRun(detail.run.run_id);
  const [pending, setPending] = React.useState<PromotionTransition | null>(null);
  const actions = availableActions(detail.run.status, access);
  if (actions.length === 0) return null;

  async function confirm() {
    if (!pending) return;
    try {
      await transition.mutateAsync(pending);
      toast.success(TRANSITION_COPY[pending].done);
      setPending(null);
    } catch (error) {
      toast.error(getErrorMessage(error, { fallback: "Aksi gagal." }));
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.includes("reevaluate") ? (
        <Button variant="outline" onClick={onReevaluate}>
          Evaluasi ulang
        </Button>
      ) : null}
      {(["submit", "approve", "return"] as const)
        .filter((a) => actions.includes(a))
        .map((a) => (
          <Button key={a} variant={a === "return" ? "outline" : "default"} onClick={() => setPending(a)}>
            {TRANSITION_COPY[a].label}
          </Button>
        ))}
      {actions.includes("execute") ? (
        <Button onClick={onExecute} disabled={executeDisabled}>
          Eksekusi
        </Button>
      ) : null}
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => (!open ? setPending(null) : undefined)}
        title={pending ? TRANSITION_COPY[pending].title : ""}
        description={pending ? TRANSITION_COPY[pending].description : ""}
        confirmLabel={pending ? TRANSITION_COPY[pending].label : "Konfirmasi"}
        loading={transition.isPending}
        onConfirm={confirm}
      />
    </div>
  );
}
