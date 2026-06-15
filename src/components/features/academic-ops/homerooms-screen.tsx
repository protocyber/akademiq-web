"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { QuerySelect } from "@/components/ui/query-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { GuardedButton, TableSkeleton, type OpsContext } from "@/components/features/academic-ops/academic-ops-page";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { getErrorMessage } from "@/lib/errors/messages";
import {
  useBulkDeleteHomerooms,
  useCreateHomeroom,
  useDeleteHomeroom,
  useEnrollStudent,
  useUnenrollStudent,
  useUpdateHomeroom,
} from "@/lib/query/mutations/use-academic-ops";
import {
  useHomeroomEnrollments,
  useHomeroomsTable,
  useStudents,
  type Enrollment,
  type Homeroom,
} from "@/lib/query/queries/use-academic-ops";
import { useAcademicYears } from "@/lib/query/queries/use-academic-config";
import { homeroomSchema, type HomeroomForm } from "@/lib/schemas/academic-ops";
import {
  parseHomeroomsParams,
  serializeHomeroomsParams,
  type HomeroomsParams,
  type HomeroomsSort,
} from "@/lib/schemas/homerooms-params";

const SORT_FIELDS: Record<string, { asc: HomeroomsSort; desc: HomeroomsSort }> = {
  name: { asc: "name", desc: "-name" },
  grade_level: { asc: "grade_level", desc: "-grade_level" },
};

export function HomeroomsScreen({ canManage, upgradeMessage }: OpsContext) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = React.useMemo(() => parseHomeroomsParams(searchParams), [searchParams]);
  const [searchDraft, setSearchDraft] = React.useState(params.search ?? "");
  const homerooms = useHomeroomsTable(params);
  const years = useAcademicYears();
  const activeYears = React.useMemo(() => (years.data ?? []).filter((y) => y.status === "Active"), [years.data]);

  React.useEffect(() => {
    setSearchDraft(params.search ?? "");
  }, [params.search]);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((params.search ?? "") !== searchDraft) {
        replaceParams(router, { ...params, search: searchDraft || undefined, page: 1 });
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [params, router, searchDraft]);

  const yearName = React.useCallback(
    (id: string) => (years.data ?? []).find((y) => y.academic_year_id === id)?.name ?? "—",
    [years.data],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Cari nama atau tingkat"
          className="max-w-xs"
        />
        <HomeroomDialog
          canManage={canManage}
          upgradeMessage={upgradeMessage}
          years={activeYears}
          trigger={<Button size="sm">+ Tambah</Button>}
        />
      </div>

      {homerooms.isLoading ? (
        <TableSkeleton />
      ) : homerooms.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(homerooms.error)}</p>
      ) : (
        <HomeroomsTable
          homerooms={homerooms.data?.data ?? []}
          meta={homerooms.data?.meta ?? { page: params.page, page_size: params.page_size, total: 0 }}
          params={params}
          canManage={canManage}
          upgradeMessage={upgradeMessage}
          years={activeYears}
          yearName={yearName}
          onParamsChange={(next) => replaceParams(router, next)}
        />
      )}
    </div>
  );
}

function replaceParams(router: ReturnType<typeof useRouter>, params: HomeroomsParams) {
  const query = serializeHomeroomsParams(params);
  router.replace(query ? `/homerooms?${query}` : "/homerooms", { scroll: false });
}

type Meta = { page: number; page_size: number; total: number };

function HomeroomsTable({
  homerooms,
  meta,
  params,
  canManage,
  upgradeMessage,
  years,
  yearName,
  onParamsChange,
}: {
  homerooms: Homeroom[];
  meta: Meta;
  params: HomeroomsParams;
  canManage: boolean;
  upgradeMessage: string;
  years: { academic_year_id: string; name: string }[];
  yearName: (id: string) => string;
  onParamsChange: (params: HomeroomsParams) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.page_size));
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [editing, setEditing] = React.useState<Homeroom | null>(null);
  const [roster, setRoster] = React.useState<Homeroom | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRowSelection({});
  }, [params.page, params.search, params.sort]);

  function toggleSort(field: keyof typeof SORT_FIELDS) {
    const { asc, desc } = SORT_FIELDS[field];
    onParamsChange({ ...params, sort: params.sort === asc ? desc : asc, page: 1 });
  }

  function sortIcon(field: keyof typeof SORT_FIELDS) {
    const { asc, desc } = SORT_FIELDS[field];
    if (params.sort === asc) return <ArrowUp className="h-3.5 w-3.5" />;
    if (params.sort === desc) return <ArrowDown className="h-3.5 w-3.5" />;
    return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />;
  }

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const allSelected = homerooms.length > 0 && homerooms.every((h) => rowSelection[h.homeroom_id]);
  const someSelected = homerooms.some((h) => rowSelection[h.homeroom_id]);

  function startDelete(id: string) {
    setPendingId(id);
    setRowSelection({ [id]: true });
    setConfirmDelete(true);
  }

  const columns: ColumnDef<Homeroom>[] = [
    {
      id: "select",
      size: 40,
      header: () => (
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            homerooms.forEach((h) => {
              if (checked) next[h.homeroom_id] = true;
              else delete next[h.homeroom_id];
            });
            setRowSelection(next);
          }}
          aria-label="Pilih semua"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={Boolean(rowSelection[row.original.homeroom_id])}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            if (checked) next[row.original.homeroom_id] = true;
            else delete next[row.original.homeroom_id];
            setRowSelection(next);
          }}
          aria-label={`Pilih ${row.original.name}`}
        />
      ),
    },
    {
      id: "name",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("name")}>
          Nama {sortIcon("name")}
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      id: "grade_level",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("grade_level")}>
          Tingkat {sortIcon("grade_level")}
        </Button>
      ),
      cell: ({ row }) => <span className="tabular-nums">{row.original.grade_level}</span>,
    },
    {
      id: "year",
      header: () => <span>Tahun</span>,
      cell: ({ row }) => <span className="text-muted-foreground">{yearName(row.original.academic_year_id)}</span>,
    },
    {
      id: "capacity",
      header: () => <span>Kapasitas</span>,
      cell: ({ row }) => <span className="tabular-nums">{row.original.capacity}</span>,
    },
    {
      id: "roster",
      size: 110,
      header: () => <span className="sr-only">Roster</span>,
      cell: ({ row }) => (
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setRoster(row.original)}>
          <Users className="h-4 w-4" /> Roster
        </Button>
      ),
    },
    {
      id: "actions",
      size: 72,
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => {
        const homeroom = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <MoreHorizontal className="h-4 w-4" /> Aksi
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{homeroom.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!canManage} onClick={() => setEditing(homeroom)}>
                <Pencil className="h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canManage}
                className="text-destructive focus:text-destructive"
                onClick={() => startDelete(homeroom.homeroom_id)}
              >
                <Trash2 className="h-4 w-4" /> Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          {selectedIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <span>{selectedIds.length} dipilih</span>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1"
                disabled={!canManage}
                onClick={() => {
                  setPendingId(null);
                  setConfirmDelete(true);
                }}
              >
                <Trash2 className="h-4 w-4" /> Hapus
              </Button>
            </div>
          ) : null}

          <DataTable
            columns={columns}
            data={homerooms}
            getRowId={(row) => row.homeroom_id}
            rowSelection={rowSelection}
            emptyText="Tidak ada kelas yang cocok."
          />

          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Halaman {meta.page} dari {pageCount} · {meta.total} kelas
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page <= 1}
                onClick={() => onParamsChange({ ...params, page: meta.page - 1 })}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page >= pageCount}
                onClick={() => onParamsChange({ ...params, page: meta.page + 1 })}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {editing ? (
        <HomeroomDialog
          homeroom={editing}
          canManage={canManage}
          upgradeMessage={upgradeMessage}
          years={years}
          yearName={yearName}
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}

      {roster ? (
        <RosterDialog
          homeroom={roster}
          canManage={canManage}
          open={Boolean(roster)}
          onOpenChange={(open) => {
            if (!open) setRoster(null);
          }}
        />
      ) : null}

      <DeleteConfirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        ids={pendingId ? [pendingId] : selectedIds}
        onDone={() => {
          setRowSelection({});
          setPendingId(null);
        }}
      />
    </div>
  );
}

function DeleteConfirm({
  open,
  onOpenChange,
  ids,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
  onDone: () => void;
}) {
  const singleDelete = useDeleteHomeroom();
  const bulkDelete = useBulkDeleteHomerooms();
  const count = ids.length;

  async function onConfirm() {
    try {
      if (count === 1) {
        await singleDelete.mutateAsync(ids[0]);
      } else {
        await bulkDelete.mutateAsync(ids);
      }
      toast.success(`${count} kelas dihapus.`);
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus kelas." }));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Hapus ${count} kelas?`}
      description="Kelas yang masih memiliki siswa aktif tidak bisa dihapus."
      confirmLabel="Hapus"
      loadingLabel="Menghapus..."
      loading={singleDelete.isPending || bulkDelete.isPending}
      destructive
      canConfirm={count > 0}
      onConfirm={onConfirm}
    />
  );
}

function RosterDialog({
  homeroom,
  canManage,
  open,
  onOpenChange,
}: {
  homeroom: Homeroom;
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const enrollments = useHomeroomEnrollments(homeroom.homeroom_id);
  const students = useStudents();
  const enroll = useEnrollStudent(homeroom.homeroom_id);
  const unenroll = useUnenrollStudent(homeroom.homeroom_id);
  const [studentId, setStudentId] = React.useState("");

  const studentName = React.useMemo(() => {
    const map = new Map((students.data ?? []).map((s) => [s.student_id, s.full_name]));
    return (id: string) => map.get(id) ?? id;
  }, [students.data]);

  const enrolledIds = React.useMemo(
    () => new Set((enrollments.data ?? []).map((e) => e.student_id)),
    [enrollments.data],
  );
  const availableStudents = React.useMemo(
    () => (students.data ?? []).filter((s) => !enrolledIds.has(s.student_id)),
    [students.data, enrolledIds],
  );

  async function onEnroll() {
    if (!studentId) return;
    try {
      await enroll.mutateAsync({ student_id: studentId, homeroom_id: homeroom.homeroom_id });
      toast.success("Siswa dienroll.");
      setStudentId("");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa mengenroll siswa." }));
    }
  }

  async function onUnenroll(enrollment: Enrollment) {
    try {
      await unenroll.mutateAsync(enrollment.enrollment_id);
      toast.success("Siswa di-unenroll.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa meng-unenroll siswa." }));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Roster — {homeroom.name}</DialogTitle>
          <DialogDescription>Enroll dan unenroll siswa untuk kelas ini.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[14rem] flex-1">
              <QuerySelect
                items={availableStudents}
                isLoading={students.isLoading}
                value={studentId}
                onValueChange={setStudentId}
                getValue={(s) => s.student_id}
                getLabel={(s) => s.full_name}
                placeholder="Pilih siswa"
                emptyText="Semua siswa sudah dienroll"
              />
            </div>
            <Button
              type="button"
              disabled={!canManage || !studentId || enroll.isPending}
              loading={enroll.isPending}
              onClick={onEnroll}
            >
              Enroll
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(enrollments.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-20 text-center text-sm text-muted-foreground">
                      Roster kosong.
                    </TableCell>
                  </TableRow>
                ) : (
                  (enrollments.data ?? []).map((enrollment) => (
                    <TableRow key={enrollment.enrollment_id}>
                      <TableCell className="font-medium">{studentName(enrollment.student_id)}</TableCell>
                      <TableCell className="text-muted-foreground">active</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canManage || unenroll.isPending}
                          onClick={() => onUnenroll(enrollment)}
                        >
                          Unenroll
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HomeroomDialog({
  homeroom,
  canManage,
  upgradeMessage,
  years,
  yearName,
  open,
  onOpenChange,
  trigger,
}: {
  homeroom?: Homeroom;
  canManage: boolean;
  upgradeMessage: string;
  years: { academic_year_id: string; name: string }[];
  yearName?: (id: string) => string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const create = useCreateHomeroom();
  const update = useUpdateHomeroom(homeroom?.homeroom_id ?? "");
  const defaultValues = React.useMemo<HomeroomForm>(
    () => ({
      name: homeroom?.name ?? "",
      grade_level: homeroom?.grade_level ?? "",
      capacity: homeroom?.capacity ?? 32,
      academic_year_id: homeroom?.academic_year_id ?? "",
    }),
    [homeroom],
  );
  const form = useForm<HomeroomForm>({ resolver: zodResolver(homeroomSchema), defaultValues });

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const loading = create.isPending || update.isPending;

  async function onSubmit(values: HomeroomForm) {
    try {
      if (homeroom) {
        await update.mutateAsync({
          name: values.name,
          grade_level: values.grade_level,
          capacity: values.capacity,
        });
        toast.success("Kelas diperbarui.");
      } else {
        await create.mutateAsync(values);
        toast.success("Kelas dibuat.");
        form.reset({ name: "", grade_level: "", capacity: 32, academic_year_id: "" });
      }
      setOpen(false);
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan kelas." }));
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{homeroom ? "Edit kelas" : "Tambah kelas"}</DialogTitle>
          <DialogDescription>
            {homeroom ? "Tahun ajaran tidak bisa diubah setelah kelas dibuat." : "Kelas hanya bisa dibuat untuk tahun ajaran aktif."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama kelas</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="7A" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grade_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tingkat</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="7" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kapasitas</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="academic_year_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tahun aktif</FormLabel>
                  {homeroom ? (
                    <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                      {yearName ? yearName(field.value) : field.value}
                    </div>
                  ) : (
                    <QuerySelect
                      items={years}
                      isLoading={false}
                      value={field.value}
                      onValueChange={field.onChange}
                      getValue={(y) => y.academic_year_id}
                      getLabel={(y) => y.name}
                      placeholder="Pilih tahun aktif"
                      emptyText="Tidak ada tahun aktif"
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <GuardedButton enabled={canManage} message={upgradeMessage} loading={loading}>
                {homeroom ? "Simpan" : "Buat Kelas"}
              </GuardedButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
