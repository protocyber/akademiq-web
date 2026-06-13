"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Copy, ShieldCheck, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { ErrorView } from "@/components/ui/error-view";
import { ApiHttpError } from "@/lib/api/types";
import { hasAccessPerm } from "@/lib/auth/access-claims";
import { getErrorMessage } from "@/lib/errors/messages";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { useCreateTenantRole, useDeleteTenantRole, useUpdateTenantRole } from "@/lib/query/mutations/use-tenant-roles";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { Permission, TenantRole, useTenantPermissions, useTenantRoles } from "@/lib/query/queries/use-tenant-roles";
import { createTenantRoleSchema, type CreateTenantRoleForm } from "@/lib/schemas/tenant-role-management";

export default function SettingsRolesPage() {
  return (
    <AuthGuard fallback={<RolesSkeleton />}>
      <RolesContent />
    </AuthGuard>
  );
}

function RolesSkeleton() {
  return (
    <main className="container mx-auto max-w-5xl space-y-6 px-4 py-10">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-52 w-full" />
        ))}
      </div>
    </main>
  );
}

function RolesContent() {
  const tenant = useTenantMe();
  const me = useMe();
  const roles = useTenantRoles();
  const permissions = useTenantPermissions();
  const logout = useLogout();
  const router = useRouter();
  const canManageRoles = hasAccessPerm("role.manage");

  if (tenant.isLoading || me.isLoading || roles.isLoading || permissions.isLoading) {
    return <RolesSkeleton />;
  }

  const error = tenant.error || me.error || roles.error || permissions.error;
  if (error || !tenant.data || !me.data) {
    const status = error instanceof ApiHttpError ? error.status : undefined;
    return <ErrorView status={status} fullPage onRetry={() => window.location.reload()} />;
  }

  return (
    <SidebarLayout
      schoolName={tenant.data.school_name}
      userName={me.data.full_name}
      userEmail={me.data.email}
      isLoggingOut={logout.isPending}
      onLogout={async () => {
        await logout.mutateAsync();
        router.push("/login");
      }}
      className="mx-auto max-w-5xl"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">Role & Izin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola role bawaan dan role custom tenant dari palet izin yang Anda miliki.</p>
        </div>
        <RoleDialog permissions={permissions.data ?? []} />
      </div>

      {!canManageRoles ? (
        <Alert variant="destructive">
          <AlertTitle>Akses dibatasi</AlertTitle>
          <AlertDescription>Anda belum memiliki izin role.manage untuk mengelola katalog role.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {(roles.data ?? []).map((role) => (
          <RoleCard key={role.role_id} role={role} permissions={permissions.data ?? []} />
        ))}
      </div>
    </SidebarLayout>
  );
}

function RoleCard({ role, permissions }: { role: TenantRole; permissions: Permission[] }) {
  const remove = useDeleteTenantRole(role.role_id);

  async function onDelete() {
    try {
      await remove.mutateAsync();
      toast.success("Role dihapus.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus role." }));
    }
  }

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {role.name}
            </CardTitle>
            <CardDescription>{role.code}</CardDescription>
          </div>
          <Badge variant={role.is_builtin ? "secondary" : "outline"}>{role.is_builtin ? "Bawaan" : "Custom"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {role.permissions.length ? role.permissions.map((permission) => (
            <Badge key={permission} variant="secondary">{permission}</Badge>
          )) : <span className="text-sm text-muted-foreground">Tidak ada izin.</span>}
        </div>
        <div className="flex gap-2">
          <RoleDialog role={role} permissions={permissions} />
          <RoleDialog cloneFrom={role} permissions={permissions} />
          <Button size="sm" variant="destructive" loading={remove.isPending} disabled={role.is_builtin} onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Hapus
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleDialog({ role, cloneFrom, permissions }: { role?: TenantRole; cloneFrom?: TenantRole; permissions: Permission[] }) {
  const [open, setOpen] = React.useState(false);
  const create = useCreateTenantRole();
  const update = useUpdateTenantRole(role?.role_id ?? "");
  const defaultValues = React.useMemo<CreateTenantRoleForm>(() => ({
    code: cloneFrom ? `${cloneFrom.code}_copy` : role?.code ?? "",
    name: cloneFrom ? `${cloneFrom.name} Copy` : role?.name ?? "",
    permissions: role?.permissions ?? cloneFrom?.permissions ?? [],
  }), [cloneFrom, role]);
  const form = useForm<CreateTenantRoleForm>({
    resolver: zodResolver(createTenantRoleSchema),
    defaultValues,
  });

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const title = role ? "Edit role custom" : cloneFrom ? "Clone role bawaan" : "Buat role custom";
  const loading = create.isPending || update.isPending;

  async function onSubmit(values: CreateTenantRoleForm) {
    try {
      if (role) {
        await update.mutateAsync({ name: values.name, permissions: values.permissions });
        toast.success("Role diperbarui.");
      } else {
        await create.mutateAsync(values);
        toast.success("Role dibuat.");
        form.reset({ code: "", name: "", permissions: [] });
      }
      setOpen(false);
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan role." }));
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={role || cloneFrom ? "sm" : "default"} variant={role ? "outline" : cloneFrom ? "secondary" : "default"} disabled={role?.is_builtin}>
          {cloneFrom ? <Copy className="h-4 w-4" /> : null}
          {role ? "Edit" : cloneFrom ? "Clone" : "Buat Role"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Pilih hanya izin yang tersedia dalam akun Anda. Server akan menolak eskalasi privilege.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem>
                <FormLabel>Kode</FormLabel>
                <FormControl><Input {...field} disabled={Boolean(role)} placeholder="wakil_kurikulum" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nama</FormLabel>
                <FormControl><Input {...field} placeholder="Wakil Kepala Kurikulum" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="permissions" render={({ field }) => (
              <FormItem>
                <FormLabel>Izin</FormLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  {permissions.map((permission) => {
                    const checked = field.value.includes(permission.code);
                    return (
                      <label key={permission.code} className="flex items-start gap-2 rounded-md border p-3 text-sm">
                        <Checkbox
                          checked={checked}
                          disabled={!permission.held}
                          onCheckedChange={(next) => {
                            const value = next
                              ? [...field.value, permission.code]
                              : field.value.filter((code) => code !== permission.code);
                            field.onChange(value);
                          }}
                        />
                        <span>
                          <span className="block font-medium">{permission.code}</span>
                          <span className="block text-xs text-muted-foreground">{permission.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="submit" loading={loading}>Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
