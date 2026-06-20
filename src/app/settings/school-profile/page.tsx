"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/components/ui/toaster";
import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { useSchoolProfile, useSchoolMedia, type SchoolProfile } from "@/lib/query/queries/use-school-profile";
import { useUpdateSchoolProfile } from "@/lib/query/mutations/use-school-profile";
import { useUploadSchoolLogo } from "@/lib/query/mutations/use-academic-ops";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { getErrorMessage } from "@/lib/errors/messages";
import { formatDate } from "@/lib/date-utils";
import { schoolProfileSchema, type SchoolProfileForm } from "@/lib/schemas/academic-ops";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import type { MediaAsset } from "@/lib/query/queries/use-academic-ops";
import { Image as ImageIcon } from "lucide-react";

export default function SchoolProfilePage() {
  return (
    <AuthGuard fallback={<SchoolProfileSkeleton />}>
      <SchoolProfileContent />
    </AuthGuard>
  );
}

function SchoolProfileSkeleton() {
  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
      <Skeleton className="h-9 w-40" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}

function SchoolProfileContent() {
  const router = useRouter();
  const tenant = useTenantMe();
  const me = useMe();
  const profile = useSchoolProfile();
  const media = useSchoolMedia();
  const uploadLogo = useUploadSchoolLogo();
  const logout = useLogout();

  if (tenant.isLoading || me.isLoading || profile.isLoading || media.isLoading) {
    return <SchoolProfileSkeleton />;
  }

  if (tenant.error || me.error || profile.error || media.error || !tenant.data || !me.data || !profile.data) {
    return (
      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Tidak bisa memuat profil sekolah</AlertTitle>
          <AlertDescription className="space-y-3">
            <Button
              size="sm"
              variant="outline"
              loading={tenant.isFetching || me.isFetching || profile.isFetching || media.isFetching}
              onClick={() => {
                tenant.refetch();
                me.refetch();
                profile.refetch();
                media.refetch();
              }}
            >
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  async function onLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadLogo.mutateAsync(file);
      toast.success("Logo sekolah berhasil diunggah");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal mengunggah logo" }));
    }
  }

  const logoMedia = media.data?.find((m: MediaAsset) => m.is_active);
  const logoUrl = logoMedia?.file_url;

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
      className="mx-auto w-full"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg">Profil Sekolah</CardTitle>
            <CardDescription>
              Kelola informasi identitas, kontak, dan alamat sekolah Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <SchoolProfileForm
              profile={profile.data}
              logoUrl={logoUrl}
              onLogoUpload={onLogoUpload}
              isUploading={uploadLogo.isPending}
            />
          </CardContent>
        </Card>

        {media.data && media.data.length > 0 && (
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg">Riwayat Logo</CardTitle>
              <CardDescription>
                Logo yang pernah diunggah untuk sekolah ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <MediaHistoryList media={media.data} />
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarLayout>
  );
}

function SchoolProfileForm({
  profile,
  logoUrl,
  onLogoUpload,
  isUploading,
}: {
  profile: SchoolProfile;
  logoUrl?: string;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
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
          <h3 className="text-sm font-semibold text-foreground">Logo Sekolah</h3>
          <div className="flex items-start gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo sekolah" className="h-24 w-24 rounded-lg border object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onLogoUpload}
                disabled={isUploading}
                className="max-w-xs"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                JPG, PNG, atau WebP. Maksimal 2MB.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Identitas Sekolah</h3>
          <FormField
            control={form.control}
            name="school_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Sekolah</FormLabel>
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

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="submit" loading={updateProfile.isPending}>
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </Form>
  );
}

function MediaHistoryList({ media }: { media: MediaAsset[] }) {
  if (media.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada riwayat logo.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
      {media.map((m: MediaAsset) => (
        <div key={m.media_id} className="space-y-2">
          <img src={m.file_url} alt="Logo" className="h-24 w-24 rounded-lg border object-cover" />
          <div className="text-xs text-muted-foreground">
            {formatDate(m.uploaded_at)}
            {m.is_active && <span className="ml-1 text-green-600">(Aktif)</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
