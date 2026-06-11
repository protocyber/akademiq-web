"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { GraduationCap, KeyRound, User } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { PublicOnly } from "@/components/features/public-only";
import { getErrorMessage } from "@/lib/errors/messages";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { useAcceptInvitation } from "@/lib/query/mutations/use-tenant-users";
import { acceptInvitationSchema, type AcceptInvitationForm } from "@/lib/schemas/tenant-user-management";

export default function AcceptInvitationPage() {
  return (
    <React.Suspense fallback={<AcceptSkeleton />}>
      <PublicOnly>
        <AcceptInvitationFormContent />
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
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </main>
  );
}

function AcceptInvitationFormContent() {
  const router = useRouter();
  const params = useSearchParams();
  const accept = useAcceptInvitation();
  const [topError, setTopError] = React.useState<string | null>(null);
  const form = useForm<AcceptInvitationForm>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      token: params.get("token") ?? "",
      password: "",
      full_name: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setTopError(null);
    try {
      await accept.mutateAsync(values);
      toast.success("Undangan diterima.");
      router.push("/dashboard");
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length > 0) return;
      const message = getErrorMessage(err, { fallback: "Tidak bisa menerima undangan." });
      setTopError(message);
      toast.error(message);
    }
  });

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
                Buat password pertama untuk masuk ke dashboard sekolah dengan role yang sudah ditentukan admin tenant.
              </p>
            </div>
          </section>

          <Card className="border-white/10 bg-background text-foreground shadow-2xl">
            <CardHeader>
              <CardTitle>Terima Undangan</CardTitle>
              <CardDescription>Masukkan nama lengkap dan password baru.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={onSubmit} className="space-y-4" noValidate>
                  {topError ? (
                    <Alert variant="destructive">
                      <AlertTitle>Aktivasi gagal</AlertTitle>
                      <AlertDescription>{topError}</AlertDescription>
                    </Alert>
                  ) : null}
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama lengkap</FormLabel>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <FormControl>
                            <Input className="pl-10" autoComplete="name" placeholder="Nama sesuai data sekolah" {...field} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <FormControl>
                            <Input className="pl-10" type="password" autoComplete="new-password" placeholder="Minimal 8 karakter" {...field} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token undangan</FormLabel>
                        <FormControl>
                          <Input placeholder="Token dari link aktivasi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" loading={accept.isPending}>Aktifkan Akun</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
