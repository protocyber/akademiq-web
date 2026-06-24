"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { KeyRound, Lock } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabelRequired, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/errors/messages";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { useAuth } from "@/hooks/use-auth";
import { useResendSetPassword, useSetPassword } from "@/lib/query/mutations/use-tenant-users";
import {
  resendSetPasswordSchema,
  setPasswordSchema,
  type ResendSetPasswordForm,
  type SetPasswordForm,
} from "@/lib/schemas/tenant-user-management";

export default function SetPasswordPage() {
  return (
    <React.Suspense fallback={<SetPasswordSkeleton />}>
      <SetPasswordContent />
    </React.Suspense>
  );
}

function SetPasswordSkeleton() {
  return (
    <main className="container mx-auto flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Password</CardTitle>
          <CardDescription>Memuat...</CardDescription>
        </CardHeader>
        <CardContent>
          <Spinner />
        </CardContent>
      </Card>
    </main>
  );
}

function SetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenFromUrl = params.get("token");
  const auth = useAuth();
  const setPassword = useSetPassword();
  const resendSetPassword = useResendSetPassword();
  const [topError, setTopError] = React.useState<string | null>(null);
  const [resendConfirmed, setResendConfirmed] = React.useState(false);

  const form = useForm<SetPasswordForm>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const resendForm = useForm<ResendSetPasswordForm>({
    resolver: zodResolver(resendSetPasswordSchema),
    defaultValues: { identifier: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setTopError(null);
    try {
      await setPassword.mutateAsync({
        password: values.password,
        token: tokenFromUrl ?? undefined,
      });
      toast.success("Password berhasil disimpan. Silakan login kembali.");
      router.push("/login");
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length > 0) return;
      const message = getErrorMessage(err, { fallback: "Tidak bisa menyimpan password." });
      setTopError(message);
      toast.error(message);
    }
  });

  const onResendSubmit = resendForm.handleSubmit(async (values) => {
    setTopError(null);
    try {
      await resendSetPassword.mutateAsync({ identifier: values.identifier });
      setResendConfirmed(true);
      toast.success("Jika akun ditemukan, link set password baru sudah dibuat.");
    } catch (err) {
      const applied = applyServerFieldErrors(resendForm, err);
      if (applied.length > 0) return;
      const message = getErrorMessage(err, { fallback: "Tidak bisa meminta link baru." });
      setTopError(message);
      toast.error(message);
    }
  });

  const canSetPassword = Boolean(tokenFromUrl) || auth.isAuthenticated;

  if (!canSetPassword && auth.isLoading) {
    return <SetPasswordSkeleton />;
  }

  if (!canSetPassword) {
    return (
      <main className="container mx-auto flex min-h-screen items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Minta Link Set Password</CardTitle>
            <CardDescription>
              Masukkan email atau username untuk meminta link set password baru.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...resendForm}>
              <form onSubmit={onResendSubmit} className="space-y-4" noValidate>
                {topError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Gagal</AlertTitle>
                    <AlertDescription>{topError}</AlertDescription>
                  </Alert>
                ) : null}
                {resendConfirmed ? (
                  <Alert>
                    <AlertTitle>Permintaan diterima</AlertTitle>
                    <AlertDescription>
                      Jika akun ditemukan, link set password baru sudah dibuat.
                    </AlertDescription>
                  </Alert>
                ) : null}
                <FormField
                  control={resendForm.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelRequired>Email/username</FormLabelRequired>
                      <FormControl>
                        <Input type="text" autoComplete="username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" loading={resendSetPassword.isPending}>
                  Kirim Link Baru
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>Set Password</CardTitle>
          <CardDescription>
            {tokenFromUrl
              ? "Buat password baru untuk akun Anda agar bisa login dengan email."
              : "Anda sedang masuk. Buat password baru untuk mengaktifkan login password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              {topError ? (
                <Alert variant="destructive">
                  <AlertTitle>Gagal</AlertTitle>
                  <AlertDescription>{topError}</AlertDescription>
                </Alert>
              ) : null}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabelRequired>Password baru</FormLabelRequired>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <FormControl>
                        <Input
                          className="pl-10"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Minimal 8 karakter"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabelRequired>Konfirmasi password</FormLabelRequired>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <FormControl>
                        <Input
                          className="pl-10"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Ulangi password"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" loading={setPassword.isPending}>
                Simpan Password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
