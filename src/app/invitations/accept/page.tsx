"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, ArrowRight } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { PublicOnly } from "@/components/features/public-only";
import { getErrorMessage } from "@/lib/errors/messages";
import { useAcceptInvitation } from "@/lib/query/mutations/use-tenant-users";
import { useInvitationDetails } from "@/lib/query/queries/use-tenant-users";

const roleLabels: Record<string, string> = {
  teacher: "Guru Mapel",
  homeroom_teacher: "Wali Kelas",
  principal: "Kepala Sekolah",
  parent: "Orang Tua",
  student: "Siswa",
};

export default function AcceptInvitationPage() {
  return (
    <React.Suspense fallback={<AcceptSkeleton />}>
      <PublicOnly>
        <AcceptInvitationContent />
      </PublicOnly>
    </React.Suspense>
  );
}

function AcceptSkeleton() {
  return (
    <main className="container mx-auto flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </main>
  );
}

function AcceptInvitationContent() {
  const router = useRouter();
  const params = useSearchParams();
  const accept = useAcceptInvitation();
  const [topError, setTopError] = React.useState<string | null>(null);

  const token = params.get("token") ?? "";

  const { data: invitation, isLoading, error: queryError } = useInvitationDetails(token);

  const handleAccept = React.useCallback(async () => {
    setTopError(null);
    try {
      const result = await accept.mutateAsync({ token });
      if (!result.password_set && result.set_password_token) {
        toast.success("Undangan diterima! Set password untuk mengaktifkan login password.");
        router.push(`/set-password?token=${encodeURIComponent(result.set_password_token)}`);
      } else {
        toast.success("Undangan diterima.");
        router.push("/dashboard");
      }
    } catch (err) {
      const message = getErrorMessage(err, { fallback: "Tidak bisa menerima undangan." });
      setTopError(message);
      toast.error(message);
    }
  }, [accept, token, router]);

  if (isLoading) {
    return <AcceptSkeleton />;
  }

  const queryErrorMessage = queryError
    ? getErrorMessage(queryError, { fallback: "Token undangan tidak valid atau kedaluwarsa." })
    : null;

  const displayError = topError || queryErrorMessage;

  const formattedRoles = invitation?.roles?.map((role) => roleLabels[role] ?? role).join(", ") || "";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-primary px-4 py-12 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_26rem] lg:items-center">
          <section className="space-y-5">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="space-y-3">
              <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl mb-6">Aktifkan akun AcademiQ Anda</h1>
              {invitation ? (
                <div className="space-y-3">
                  {invitation.tenant_name ? (
                    <p className="max-w-xl text-base leading-7 text-white/90">
                      Anda diundang untuk bergabung ke <strong className="text-white underline decoration-white/30 underline-offset-4">{invitation.tenant_name}</strong> sebagai <strong className="text-white">{formattedRoles}</strong>.
                    </p>
                  ) : (
                    <p className="max-w-xl text-base leading-7 text-white/90">
                      Anda diundang ke AcademiQ sebagai <strong className="text-white">{formattedRoles}</strong>.
                    </p>
                  )}
                  <p className="max-w-xl text-sm leading-6 text-white/70">
                    {/* Klik tombol berikut ini untuk menerima undangan dan masuk ke dashboard sekolah. Anda bisa set password nanti kapan saja. */}
                  </p>
                </div>
              ) : (
                <p className="max-w-xl text-sm leading-6 text-white/70 md:text-base">
                  {/* Klik tombol berikut ini untuk menerima undangan dan masuk ke dashboard sekolah. Anda bisa set password nanti kapan saja. */}
                </p>
              )}
            </div>
          </section>

          <Card className="border-white/10 bg-background text-foreground shadow-2xl lg:mt-14">
            <CardHeader>
              <CardTitle>Terima Undangan</CardTitle>
              <CardDescription>Satu klik untuk mengaktifkan keanggotaan Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayError ? (
                <Alert variant="destructive">
                  <AlertTitle>Aktivasi gagal</AlertTitle>
                  <AlertDescription>{displayError}</AlertDescription>
                </Alert>
              ) : null}
              <Button
                className="w-full"
                loading={accept.isPending}
                disabled={!token || !!displayError || accept.isSuccess}
                onClick={handleAccept}
              >
                Terima Undangan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {!token ? (
                <p className="text-center text-sm text-muted-foreground">
                  Token undangan tidak ditemukan di link. Pastikan Anda membuka link lengkap dari email.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

