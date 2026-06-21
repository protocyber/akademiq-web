"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import {
  AcademicSettingsPage,
  EntitlementTooltip,
} from "@/components/features/academic-config/academic-settings";
import { getErrorMessage } from "@/lib/errors/messages";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import {
  useAddSubject,
  useAddSubjectGroup,
  useBulkDeleteSubjects,
  useDeleteSubject,
  useDeleteSubjectGroup,
  useUpdateSubject,
  useUpdateSubjectGroup,
} from "@/lib/query/mutations/use-academic-config";
import {
  type Subject,
  type SubjectGroup,
  useSubjectGroups,
  useSubjects,
} from "@/lib/query/queries/use-academic-config";
import {
  subjectSchema,
  subjectGroupSchema,
  type SubjectForm,
  type SubjectGroupForm,
} from "@/lib/schemas/subject";
import { useAcademicScope } from "@/hooks/use-academic-scope";

export default function AcademicSubjectsPage() {
  return (
    <AcademicSettingsPage
      title="Mata Pelajaran"
      description="Kelola mata pelajaran per versi kurikulum."
    >
      {({ canManageAcademicConfig, upgradeMessage }) => (
        <SubjectsContent canManage={canManageAcademicConfig} upgradeMessage={upgradeMessage} />
      )}
    </AcademicSettingsPage>
  );
}

function SubjectsContent({ canManage, upgradeMessage }: { canManage: boolean; upgradeMessage: string; }) {
  const { curriculumId, isResolving } = useAcademicScope();

  if (isResolving) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!curriculumId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Pilih tahun ajaran dan versi kurikulum di header untuk menampilkan mata pelajaran.
        </CardContent>
      </Card>
    );
  }

  return (
    <SubjectGroupsBoard
      curriculumVersionId={curriculumId}
      canManage={canManage}
      upgradeMessage={upgradeMessage}
    />
  );
}

function SubjectGroupsBoard({
  curriculumVersionId,
  canManage,
  upgradeMessage,
}: {
  curriculumVersionId: string;
  canManage: boolean;
  upgradeMessage: string;
}) {
  const groups = useSubjectGroups(curriculumVersionId);
  const subjects = useSubjects(curriculumVersionId);

  const [creatingGroup, setCreatingGroup] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<SubjectGroup | null>(null);
  const [groupDeleteTarget, setGroupDeleteTarget] = React.useState<string | null>(null);
  const [creatingSubject, setCreatingSubject] = React.useState(false);
  const [editingSubject, setEditingSubject] = React.useState<Subject | null>(null);
  const [subjectSearch, setSubjectSearch] = React.useState("");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [subjectSelection, setSubjectSelection] = React.useState<RowSelectionState>({});
  const [subjectDeleteOpen, setSubjectDeleteOpen] = React.useState(false);
  const [subjectDeleteTargetId, setSubjectDeleteTargetId] = React.useState<string | null>(null);

  const sortedGroups = React.useMemo(() => {
    const list = groups.data ?? [];
    return [...list].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  }, [groups.data]);

  const subjectSearchLower = subjectSearch.trim().toLowerCase();
  const subjectsByGroup = React.useMemo(() => {
    const map = new Map<string, Subject[]>();
    for (const subject of subjects.data ?? []) {
      if (subjectSearchLower) {
        const haystack = `${subject.name} ${subject.code ?? ""}`.toLowerCase();
        if (!haystack.includes(subjectSearchLower)) continue;
      }
      const arr = map.get(subject.subject_group_id) ?? [];
      arr.push(subject);
      map.set(subject.subject_group_id, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [subjects.data, subjectSearchLower]);

  React.useEffect(() => {
    setSubjectSelection({});
  }, [curriculumVersionId, subjectSearchLower]);

  function toggleCollapse(groupId: string) {
    setCollapsed((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }

  const selectedSubjectIds = Object.keys(subjectSelection).filter((id) => subjectSelection[id]);

  return (
    <div className="space-y-4">
      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">Mata Pelajaran</CardTitle>
              <CardDescription>Kelola kelompok dan mata pelajaran per versi kurikulum.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={subjectSearch}
                onChange={(event) => setSubjectSearch(event.target.value)}
                placeholder="Cari nama atau kode mapel"
                className="md:w-64"
              />
              <EntitlementTooltip enabled={canManage} message={upgradeMessage}>
                <span>
                  <Button
                    disabled={!canManage}
                    onClick={() => setCreatingGroup(true)}
                    variant="outline"
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" /> Tambah Kelompok
                  </Button>
                </span>
              </EntitlementTooltip>
              <EntitlementTooltip enabled={canManage} message={upgradeMessage}>
                <span>
                  <Button disabled={!canManage} onClick={() => setCreatingSubject(true)} className="gap-1">
                    <Plus className="h-4 w-4" /> Tambah Mapel
                  </Button>
                </span>
              </EntitlementTooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {selectedSubjectIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border bg-muted/30 p-3 text-sm">
              <span>{selectedSubjectIds.length} mapel dipilih</span>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1"
                disabled={!canManage}
                onClick={() => {
                  setSubjectDeleteTargetId(null);
                  setSubjectDeleteOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" /> Hapus
              </Button>
            </div>
          ) : null}

          {groups.isLoading || subjects.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : sortedGroups.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Belum ada kelompok. Tambahkan kelompok terlebih dahulu sebelum membuat mata pelajaran.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedGroups.map((group) => {
                const groupSubjects = subjectsByGroup.get(group.subject_group_id) ?? [];
                const isCollapsed = collapsed[group.subject_group_id];
                const groupSelection = groupSubjects.filter((s) => subjectSelection[s.subject_id]);
                const allInGroupSelected = groupSubjects.length > 0 && groupSelection.length === groupSubjects.length;
                const someInGroupSelected = groupSelection.length > 0 && !allInGroupSelected;
                return (
                  <Card key={group.subject_group_id} className="overflow-hidden">
                    <CardHeader className="border-b py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          className="flex h-auto items-center gap-2 p-1 text-left"
                          onClick={() => toggleCollapse(group.subject_group_id)}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                          <CardTitle className="text-base">
                            {group.name}
                            {group.code ? (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                ({group.code})
                              </span>
                            ) : null}
                          </CardTitle>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {groupSubjects.length} mapel
                          </span>
                          <span className="text-xs text-muted-foreground">Posisi {group.position}</span>
                        </Button>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Edit Kelompok" onClick={() => setEditingGroup(group)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!canManage} aria-label="Aksi kelompok lainnya">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{group.name}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={!canManage}
                                className="text-destructive focus:text-destructive"
                                onClick={() => setGroupDeleteTarget(group.subject_group_id)}
                              >
                                <Trash2 className="h-4 w-4" /> Hapus Kelompok
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    {!isCollapsed ? (
                      <CardContent className="p-0">
                        {groupSubjects.length === 0 ? (
                          <p className="px-6 py-6 text-center text-sm text-muted-foreground">
                            Belum ada mata pelajaran di kelompok ini.
                          </p>
                        ) : (
                          <GroupSubjectTable
                            subjects={groupSubjects}
                            canManage={canManage}
                            groupId={group.subject_group_id}
                            selection={subjectSelection}
                            onSelectionChange={setSubjectSelection}
                            allSelected={allInGroupSelected}
                            someSelected={someInGroupSelected}
                            onEdit={(subject) => setEditingSubject(subject)}
                            onDelete={(subjectId) => {
                              setSubjectDeleteTargetId(subjectId);
                              setSubjectDeleteOpen(true);
                            }}
                          />
                        )}
                      </CardContent>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <SubjectGroupDialog
        open={creatingGroup}
        onOpenChange={setCreatingGroup}
        mode="create"
        curriculumVersionId={curriculumVersionId}
      />
      <SubjectGroupDialog
        open={Boolean(editingGroup)}
        onOpenChange={(o) => { if (!o) setEditingGroup(null); }}
        mode="edit"
        group={editingGroup ?? undefined}
        curriculumVersionId={curriculumVersionId}
      />
      <SubjectGroupDeleteConfirm
        open={Boolean(groupDeleteTarget)}
        onOpenChange={(o) => { if (!o) setGroupDeleteTarget(null); }}
        targetId={groupDeleteTarget}
      />

      <SubjectDialog
        open={creatingSubject}
        onOpenChange={setCreatingSubject}
        mode="create"
        curriculumVersionId={curriculumVersionId}
        groups={sortedGroups}
      />
      <SubjectDialog
        open={Boolean(editingSubject)}
        onOpenChange={(o) => { if (!o) setEditingSubject(null); }}
        mode="edit"
        subject={editingSubject ?? undefined}
        curriculumVersionId={curriculumVersionId}
        groups={sortedGroups}
      />

      <SubjectDeleteConfirm
        open={subjectDeleteOpen}
        onOpenChange={(o) => setSubjectDeleteOpen(o)}
        targetId={subjectDeleteTargetId}
        selectedIds={selectedSubjectIds}
        clearSelection={() => setSubjectSelection({})}
        clearTarget={() => setSubjectDeleteTargetId(null)}
      />
    </div>
  );
}

function GroupSubjectTable({
  subjects,
  canManage,
  groupId,
  selection,
  onSelectionChange,
  allSelected,
  someSelected,
  onEdit,
  onDelete,
}: {
  subjects: Subject[];
  canManage: boolean;
  groupId: string;
  selection: RowSelectionState;
  onSelectionChange: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  allSelected: boolean;
  someSelected: boolean;
  onEdit: (subject: Subject) => void;
  onDelete: (subjectId: string) => void;
}) {
  function toggleAll(checked: boolean | "indeterminate") {
    onSelectionChange((prev) => {
      const next = { ...prev };
      for (const s of subjects) {
        if (checked) next[s.subject_id] = true;
        else delete next[s.subject_id];
      }
      return next;
    });
  }

  const columns: ColumnDef<Subject>[] = [
    {
      id: "select",
      size: 40,
      header: () => (
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => toggleAll(checked)}
          aria-label={`Pilih semua mapel di kelompok ${groupId}`}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={Boolean(selection[row.original.subject_id])}
          onCheckedChange={(checked) => {
            onSelectionChange((prev) => {
              const next = { ...prev };
              if (checked) next[row.original.subject_id] = true;
              else delete next[row.original.subject_id];
              return next;
            });
          }}
          aria-label={`Pilih ${row.original.name}`}
        />
      ),
    },
    {
      id: "name",
      header: "Nama",
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.name}</span>,
    },
    {
      id: "code",
      header: "Kode",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.code ?? "—"}</span>
      ),
    },
    {
      id: "passing_grade",
      header: "KKM",
      cell: ({ row }) => (
        <span className="tabular-nums text-foreground">{row.original.passing_grade}</span>
      ),
    },
    {
      id: "actions",
      size: 120,
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => {
        const subject = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Edit" onClick={() => onEdit(subject)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!canManage} aria-label="Aksi lainnya">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{subject.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!canManage}
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(subject.subject_id)}
                >
                  <Trash2 className="h-4 w-4" /> Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={subjects}
      getRowId={(row) => row.subject_id}
      rowSelection={selection}
      onRowSelectionChange={onSelectionChange}
      emptyText="Belum ada mata pelajaran."
    />
  );
}

function SubjectDialog({
  open,
  onOpenChange,
  mode,
  subject,
  curriculumVersionId,
  groups,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  subject?: Subject;
  curriculumVersionId: string;
  groups: SubjectGroup[];
}) {
  const add = useAddSubject(curriculumVersionId);
  const update = useUpdateSubject(subject?.subject_id ?? "");
  const defaultGroupId = groups[0]?.subject_group_id ?? "";
  const form = useForm<SubjectForm>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      curriculum_version_id: curriculumVersionId,
      subject_group_id: subject?.subject_group_id ?? defaultGroupId,
      name: subject?.name ?? "",
      code: subject?.code ?? "",
      passing_grade: subject?.passing_grade ?? 75,
    },
  });

  React.useEffect(() => {
    form.reset({
      curriculum_version_id: curriculumVersionId,
      subject_group_id: subject?.subject_group_id ?? defaultGroupId,
      name: subject?.name ?? "",
      code: subject?.code ?? "",
      passing_grade: subject?.passing_grade ?? 75,
    });
  }, [form, subject, curriculumVersionId, defaultGroupId]);

  async function onSubmit(values: SubjectForm) {
    const { curriculum_version_id: _ignored, ...input } = values;
    try {
      if (mode === "create") {
        await add.mutateAsync(input);
        toast.success("Mata pelajaran ditambahkan.");
      } else if (subject) {
        await update.mutateAsync(input);
        toast.success("Mata pelajaran diperbarui.");
      }
      onOpenChange(false);
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan mata pelajaran." }));
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah Mata Pelajaran" : "Edit Mata Pelajaran"}</DialogTitle>
          <DialogDescription>
            Kelompok, nama, kode, dan kriteria ketuntasan minimal (KKM).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subject_group_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kelompok</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kelompok" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.subject_group_id} value={group.subject_group_id}>
                          {group.name}
                          {group.code ? ` (${group.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama</FormLabel>
                  <FormControl>
                    <Input placeholder="Matematika" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode</FormLabel>
                    <FormControl>
                      <Input placeholder="MTK" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="passing_grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KKM</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" loading={add.isPending || update.isPending}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SubjectGroupDialog({
  open,
  onOpenChange,
  mode,
  group,
  curriculumVersionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  group?: SubjectGroup;
  curriculumVersionId: string;
}) {
  const add = useAddSubjectGroup(curriculumVersionId);
  const update = useUpdateSubjectGroup(group?.subject_group_id ?? "");
  const form = useForm<SubjectGroupForm>({
    resolver: zodResolver(subjectGroupSchema),
    defaultValues: {
      name: group?.name ?? "",
      code: group?.code ?? "",
      position: group?.position ?? 1,
    },
  });

  React.useEffect(() => {
    form.reset({
      name: group?.name ?? "",
      code: group?.code ?? "",
      position: group?.position ?? 1,
    });
  }, [form, group]);

  async function onSubmit(values: SubjectGroupForm) {
    try {
      if (mode === "create") {
        await add.mutateAsync(values);
        toast.success("Kelompok ditambahkan.");
      } else if (group) {
        await update.mutateAsync(values);
        toast.success("Kelompok diperbarui.");
      }
      onOpenChange(false);
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan kelompok." }));
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah Kelompok" : "Edit Kelompok"}</DialogTitle>
          <DialogDescription>
            Kelompok digunakan untuk mengelompokkan mata pelajaran di rapor.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama</FormLabel>
                  <FormControl>
                    <Input placeholder="Kelompok A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode (opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posisi</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" loading={add.isPending || update.isPending}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SubjectGroupDeleteConfirm({
  open,
  onOpenChange,
  targetId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string | null;
}) {
  const single = useDeleteSubjectGroup();
  async function onConfirm() {
    if (!targetId) return;
    try {
      await single.mutateAsync(targetId);
      toast.success("Kelompok dihapus.");
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus kelompok." }));
    }
  }
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Hapus kelompok?"
      description="Kelompok yang masih memiliki mata pelajaran tidak bisa dihapus."
      confirmLabel="Hapus"
      loadingLabel="Menghapus..."
      loading={single.isPending}
      destructive
      canConfirm={Boolean(targetId)}
      onConfirm={onConfirm}
    />
  );
}

function SubjectDeleteConfirm({
  open,
  onOpenChange,
  targetId,
  selectedIds,
  clearSelection,
  clearTarget,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string | null;
  selectedIds: string[];
  clearSelection: () => void;
  clearTarget: () => void;
}) {
  const single = useDeleteSubject();
  const bulk = useBulkDeleteSubjects();
  const isSingle = Boolean(targetId);
  const ids = targetId ? [targetId] : selectedIds;
  const count = ids.length;

  async function onConfirm() {
    try {
      if (isSingle && targetId) {
        await single.mutateAsync(targetId);
      } else {
        await bulk.mutateAsync(ids);
      }
      toast.success(`${count} mata pelajaran dihapus.`);
      onOpenChange(false);
      clearSelection();
      clearTarget();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus mata pelajaran." }));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Hapus ${count} mata pelajaran?`}
      description="Mata pelajaran yang dipakai penugasan mengajar tidak bisa dihapus."
      confirmLabel="Hapus"
      loadingLabel="Menghapus..."
      loading={single.isPending || bulk.isPending}
      destructive
      canConfirm={count > 0}
      onConfirm={onConfirm}
    />
  );
}
