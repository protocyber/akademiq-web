"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Image as ImageIcon, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Form, FormControl, FormField, FormItem, FormLabel, FormLabelRequired, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { useSchoolProfile, type SchoolProfile } from "@/lib/query/queries/use-school-profile";
import { useUpdateSchoolProfile } from "@/lib/query/mutations/use-school-profile";
import { useDeleteSchoolLogo, useUploadSchoolLogo } from "@/lib/query/mutations/use-academic-ops";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { getErrorMessage } from "@/lib/errors/messages";
import { IMAGE_ACCEPT, IMAGE_SIZE_HINT, MAX_IMAGE_SELECT_SIZE_BYTES } from "@/lib/media/upload-constraints";
import { schoolProfileSchema, type SchoolProfileForm } from "@/lib/schemas/academic-ops";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";

export default function SchoolProfilePage() {
  return (
    <AuthGuard fallback={
      <SidebarLayout className="mx-auto w-full">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-start justify-between border-b pb-4">
              <div>
                <CardTitle className="text-lg">Profil Sekolah</CardTitle>
                <CardDescription>
                  Kelola informasi identitas, kontak, dan alamat sekolah Anda.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    }>
      <SchoolProfileContent />
    </AuthGuard>
  );
}

function SchoolProfileContent() {
  const router = useRouter();
  const tenant = useTenantMe();
  const me = useMe();
  const profile = useSchoolProfile();
  const uploadLogo = useUploadSchoolLogo();
  const deleteLogo = useDeleteSchoolLogo();
  const logout = useLogout();
  const [editOpen, setEditOpen] = React.useState(false);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);

  const isLoading = tenant.isLoading || me.isLoading || profile.isLoading;

  if (tenant.error || me.error || profile.error) {
    return (
      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Tidak bisa memuat profil sekolah</AlertTitle>
          <AlertDescription className="space-y-3">
            <Button
              size="sm"
              variant="outline"
              loading={tenant.isFetching || me.isFetching || profile.isFetching}
              onClick={() => {
                tenant.refetch();
                me.refetch();
                profile.refetch();
              }}
            >
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  async function onLogoUpload() {
    if (!logoFile) return;
    try {
      await uploadLogo.mutateAsync(logoFile);
      setLogoFile(null);
      toast.success("Logo sekolah berhasil diunggah");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal mengunggah logo" }));
    }
  }

  async function onLogoDelete() {
    if (!logoUrl) return;
    if (!window.confirm("Hapus logo? Tindakan ini tidak dapat dibatalkan.")) return;
    try {
      await deleteLogo.mutateAsync();
      setLogoFile(null);
      toast.success("Logo sekolah berhasil dihapus");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal menghapus logo" }));
    }
  }

  const logoUrl = profile.data?.logo_url;

  return (
    <SidebarLayout
      schoolName={tenant.data?.school_name}
      userName={me.data?.full_name}
      userEmail={me.data?.email}
      isLoggingOut={logout.isPending}
      onLogout={async () => {
        await logout.mutateAsync();
        router.push("/login");
      }}
      className="mx-auto w-full"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-start justify-between border-b pb-4">
            <div>
              <CardTitle className="text-lg">Profil Sekolah</CardTitle>
              <CardDescription>
                Kelola informasi identitas, kontak, dan alamat sekolah Anda.
              </CardDescription>
            </div>
            {!isLoading && profile.data && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="shrink-0"
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading || !profile.data ? (
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <SchoolProfileView profile={profile.data} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg">Logo Sekolah</CardTitle>
            <CardDescription>Unggah atau perbarui logo sekolah.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-start gap-4">
                <Skeleton className="h-24 w-24 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                {logoUrl ? (
                  <Image src={logoUrl} alt="Logo sekolah" width={96} height={96} className="h-24 w-24 rounded-lg border object-cover" unoptimized />
                ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <FileDropzone
                  value={logoFile}
                  onChange={setLogoFile}
                  accept={IMAGE_ACCEPT}
                  maxSize={MAX_IMAGE_SELECT_SIZE_BYTES}
                  disabled={uploadLogo.isPending || deleteLogo.isPending}
                  prompt="Tarik logo ke sini atau klik untuk memilih"
                  hint={IMAGE_SIZE_HINT}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={onLogoUpload}
                    loading={uploadLogo.isPending}
                    disabled={!logoFile || deleteLogo.isPending}
                  >
                    Unggah Logo
                  </Button>
                  {logoUrl && (
                    <Button
                      variant="outline"
                      onClick={onLogoDelete}
                      loading={deleteLogo.isPending}
                      disabled={uploadLogo.isPending}
                    >
                      Hapus Logo
                    </Button>
                  )}
                </div>
              </div>
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Profil Sekolah</DialogTitle>
          </DialogHeader>
          {profile.data && (
            <SchoolProfileForm
              profile={profile.data}
              onSuccess={() => setEditOpen(false)}
              onCancel={() => setEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </SidebarLayout>
  );
}

const EMPTY_LABEL = "Belum diisi";

function ViewField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || <span className="text-muted-foreground">{EMPTY_LABEL}</span>}</dd>
    </div>
  );
}

const SCHOOL_LEVEL_LABELS: Record<string, string> = {
  sd: "SD",
  smp: "SMP",
  sma: "SMA",
  mi: "MI",
  mts: "MTs",
  ma: "MA",
  slb: "SLB",
  lainnya: "Lainnya",
};

const SCHOOL_STATUS_LABELS: Record<string, string> = {
  negeri: "Negeri",
  swasta: "Swasta",
};

const ACCREDITATION_LABELS: Record<string, string> = {
  a: "A",
  b: "B",
  c: "C",
  belum_terakreditasi: "Belum Terakreditasi",
};

function SchoolProfileView({ profile }: { profile: SchoolProfile }) {
  return (
    <dl className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Identitas Sekolah</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ViewField label="Nama Sekolah" value={profile.school_name} />
          <ViewField label="NPSN" value={profile.npsn} />
          <ViewField label="Jenjang" value={SCHOOL_LEVEL_LABELS[profile.school_level ?? ""] ?? profile.school_level} />
          <ViewField label="Status" value={SCHOOL_STATUS_LABELS[profile.school_status ?? ""] ?? profile.school_status} />
          <ViewField label="Akreditasi" value={ACCREDITATION_LABELS[profile.accreditation ?? ""] ?? profile.accreditation} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Kontak</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ViewField label="Nomor Telepon" value={profile.phone_number} />
          <ViewField label="Email" value={profile.email} />
          <ViewField label="Website" value={profile.website} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Alamat</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ViewField label="Alamat" value={profile.address_line} />
          <ViewField label="Kelurahan/Desa" value={profile.village} />
          <ViewField label="Kecamatan" value={profile.subdistrict} />
          <ViewField label="Kota/Kabupaten" value={profile.city_regency} />
          <ViewField label="Provinsi" value={profile.province} />
          <ViewField label="Kode Pos" value={profile.postal_code} />
        </div>
      </div>
    </dl>
  );
}

function SchoolProfileForm({
  profile,
  onSuccess,
  onCancel,
}: {
  profile: SchoolProfile;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const updateProfile = useUpdateSchoolProfile();
  const form = useForm<SchoolProfileForm>({
    resolver: zodResolver(schoolProfileSchema),
    defaultValues: {
      school_name: profile.school_name ?? "",
      phone_number: profile.phone_number ?? "",
      email: profile.email ?? "",
      website: profile.website ?? "",
      npsn: profile.npsn ?? "",
      school_level: (profile.school_level ?? "") as SchoolProfileForm["school_level"],
      school_status: (profile.school_status ?? "") as SchoolProfileForm["school_status"],
      accreditation: (profile.accreditation ?? "") as SchoolProfileForm["accreditation"],
      address_line: profile.address_line ?? "",
      village: profile.village ?? "",
      subdistrict: profile.subdistrict ?? "",
      city_regency: profile.city_regency ?? "",
      province: profile.province ?? "",
      postal_code: profile.postal_code ?? "",
    },
  });

  async function onSubmit(data: SchoolProfileForm) {
    try {
      await updateProfile.mutateAsync(data);
      toast.success("Profil sekolah berhasil diperbarui");
      onSuccess();
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Gagal memperbarui profil sekolah" }));
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Identitas Sekolah</h3>
          <FormField
            control={form.control}
            name="school_name"
            render={({ field }) => (
              <FormItem>
                <FormLabelRequired>Nama Sekolah</FormLabelRequired>
                <FormControl>
                  <Input {...field} placeholder="SMA Negeri 1 Jakarta" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="npsn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NPSN</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="20100001" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="school_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenjang</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenjang" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sd">SD</SelectItem>
                      <SelectItem value="smp">SMP</SelectItem>
                      <SelectItem value="sma">SMA</SelectItem>
                      <SelectItem value="mi">MI</SelectItem>
                      <SelectItem value="mts">MTs</SelectItem>
                      <SelectItem value="ma">MA</SelectItem>
                      <SelectItem value="slb">SLB</SelectItem>
                      <SelectItem value="lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="school_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="negeri">Negeri</SelectItem>
                      <SelectItem value="swasta">Swasta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accreditation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Akreditasi</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih akreditasi" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="a">A</SelectItem>
                      <SelectItem value="b">B</SelectItem>
                      <SelectItem value="c">C</SelectItem>
                      <SelectItem value="belum_terakreditasi">Belum Terakreditasi</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Kontak</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor Telepon</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="021-1234567" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="info@sekolah.sch.id" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://www.sekolah.sch.id" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Alamat</h3>
          <FormField
            control={form.control}
            name="address_line"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alamat</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Jl. Pendidikan No. 1" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="village"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kelurahan/Desa</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Menteng" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subdistrict"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kecamatan</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Menteng" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="city_regency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kota/Kabupaten</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Jakarta Pusat" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provinsi</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="DKI Jakarta" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="postal_code"
            render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>Kode Pos</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="10310" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button type="submit" loading={updateProfile.isPending}>
            Simpan
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
