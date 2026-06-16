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

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-primary px-4 py-12 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_26rem] lg:items-center">
          <section className="space-y-5">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="space-y-3">
              <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Aktifkan akun AcademiQ Anda</h1>
              <p className="max-w-xl text-sm leading-6 text-white/70 md:text-base">
                Klik tombol di samping untuk menerima undangan dan masuk ke dashboard sekolah. Anda bisa set password nanti kapan saja.
              </p>
            </div>
          </section>

          <Card className="border-white/10 bg-background text-foreground shadow-2xl">
            <CardHeader>
              <CardTitle>Terima Undangan</CardTitle>
              <CardDescription>Satu klik untuk mengaktifkan keanggotaan Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {topError ? (
                <Alert variant="destructive">
                  <AlertTitle>Aktivasi gagal</AlertTitle>
                  <AlertDescription>{topError}</AlertDescription>
                </Alert>
              ) : null}
              <Button
                className="w-full"
                loading={accept.isPending}
                disabled={!token || accept.isSuccess}
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
