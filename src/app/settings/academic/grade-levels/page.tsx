"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabelRequired, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { AcademicSettingsPage } from "@/components/features/academic-config/academic-settings";
import { getErrorMessage } from "@/lib/errors/messages";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import {
  useAddGradeLevel,
  useDeleteGradeLevel,
  useReorderGradeLevels,
  useUpdateGradeLevel,
} from "@/lib/query/mutations/use-academic-config";
import { type GradeLevel, useGradeLevels } from "@/lib/query/queries/use-academic-config";
import { gradeLevelSchema, type GradeLevelForm } from "@/lib/schemas/grade-level";
import { useAcademicScope } from "@/hooks/use-academic-scope";

/**
 * Presentational table. Reorder is exposed as explicit up/down buttons rather
 * than drag-and-drop: keyboard accessible, testable without pointer
 * simulation, and a school reorders its grade ladder about once.
 */
export function GradeLevelsTable({
  levels,
  canEdit,
  onEdit,
  onDelete,
  onReorder,
}: {
  levels: GradeLevel[];
  canEdit: boolean;
  onEdit: (level: GradeLevel) => void;
  onDelete: (level: GradeLevel) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  if (levels.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Belum ada tingkat kelas. Tambahkan tingkat untuk tahun ajaran ini.
      </div>
    );
  }

  function move(index: number, delta: number) {
    const next = [...levels];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next.map((l) => l.grade_level_id));
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Urutan</TableHead>
          <TableHead>Kode</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead />
          {canEdit ? <TableHead className="w-32 text-right">Aksi</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {levels.map((level, index) => (
          <TableRow key={level.grade_level_id}>
            <TableCell className="tabular-nums">{level.ordinal}</TableCell>
            <TableCell className="font-semibold text-foreground">{level.code}</TableCell>
            <TableCell>{level.label}</TableCell>
            <TableCell>
              {level.is_final ? <Badge variant="secondary">Tingkat akhir</Badge> : null}
            </TableCell>
            {canEdit ? (
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Naikkan ${level.label}`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Turunkan ${level.label}`}
                  disabled={index === levels.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Menu ${level.label}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{level.label}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit(level)}>
                      <Pencil className="mr-2 h-4 w-4" /> Ubah
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(level)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function GradeLevelsPage() {
  return (
    <AcademicSettingsPage
      title="Tingkat Kelas"
      description="Urutan tingkat kelas menentukan kenaikan kelas dan menandai tingkat akhir yang meluluskan siswa."
    >
      {({ canManageAcademicConfig }) => (
        <GradeLevelsScreen canEdit={canManageAcademicConfig} />
      )}
    </AcademicSettingsPage>
  );
}

function GradeLevelsScreen({ canEdit }: { canEdit: boolean }) {
  const { yearId } = useAcademicScope();
  const academicYearId = yearId ?? undefined;
  const query = useGradeLevels(academicYearId);
  const reorder = useReorderGradeLevels(academicYearId ?? "");
  const remove = useDeleteGradeLevel();

  const [editing, setEditing] = React.useState<GradeLevel | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<GradeLevel | null>(null);

  const levels = query.data ?? [];

  function handleReorder(orderedIds: string[]) {
    reorder.mutate(orderedIds, {
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleDelete() {
    if (!deleting) return;
    remove.mutate(deleting.grade_level_id, {
      onSuccess: () => {
        toast.success("Tingkat kelas dihapus");
        setDeleting(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {canEdit ? (
          <div className="flex justify-end">
            <Button onClick={() => setCreating(true)} disabled={!academicYearId}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Tingkat
            </Button>
          </div>
        ) : null}

        {query.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <GradeLevelsTable
            levels={levels}
            canEdit={canEdit}
            onEdit={setEditing}
            onDelete={setDeleting}
            onReorder={handleReorder}
          />
        )}
      </CardContent>

      {academicYearId ? (
        <GradeLevelDialog
          key={editing?.grade_level_id ?? "create"}
          open={creating || editing !== null}
          level={editing}
          academicYearId={academicYearId}
          nextOrdinal={levels.length + 1}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title="Hapus tingkat kelas?"
        description={`Tingkat ${deleting?.label ?? ""} akan dihapus.`}
        confirmLabel="Hapus"
        onConfirm={handleDelete}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      />
    </Card>
  );
}

function GradeLevelDialog({
  open,
  level,
  academicYearId,
  nextOrdinal,
  onClose,
}: {
  open: boolean;
  level: GradeLevel | null;
  academicYearId: string;
  nextOrdinal: number;
  onClose: () => void;
}) {
  const add = useAddGradeLevel(academicYearId);
  const update = useUpdateGradeLevel(level?.grade_level_id ?? "");

  const form = useForm<GradeLevelForm>({
    resolver: zodResolver(gradeLevelSchema),
    defaultValues: {
      academic_year_id: academicYearId,
      code: level?.code ?? "",
      label: level?.label ?? "",
      ordinal: level?.ordinal ?? nextOrdinal,
      is_final: level?.is_final ?? false,
    },
  });

  function onSubmit(values: GradeLevelForm) {
    const payload = {
      code: values.code,
      label: values.label,
      ordinal: values.ordinal,
      is_final: values.is_final,
    };
    const mutation = level ? update : add;
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(level ? "Tingkat kelas diperbarui" : "Tingkat kelas ditambahkan");
        onClose();
      },
      onError: (error) => {
        // applyServerFieldErrors returns the list of fields it mapped; an
        // empty list means nothing matched a form field, so fall back to a toast.
        const applied = applyServerFieldErrors(form, error);
        if (applied.length === 0) {
          toast.error(
            getErrorMessage(error, { fallback: "Tidak bisa menyimpan tingkat kelas." }),
          );
        }
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{level ? "Ubah Tingkat Kelas" : "Tambah Tingkat Kelas"}</DialogTitle>
          <DialogDescription>
            Urutan menentukan tingkat berikutnya saat kenaikan kelas.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabelRequired>Kode</FormLabelRequired>
                  <FormControl>
                    <Input placeholder="X" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabelRequired>Nama</FormLabelRequired>
                  <FormControl>
                    <Input placeholder="Kelas X" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ordinal"
              render={({ field }) => (
                <FormItem>
                  <FormLabelRequired>Urutan</FormLabelRequired>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_final"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  </FormControl>
                  <span className="text-sm">
                    Tingkat akhir — siswa di tingkat ini lulus, bukan naik kelas
                  </span>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit" disabled={add.isPending || update.isPending}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
