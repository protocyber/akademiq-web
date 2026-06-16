"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { KeyRound, Lock } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/errors/messages";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { useSetPassword } from "@/lib/query/mutations/use-tenant-users";
import { setPasswordSchema, type SetPasswordForm } from "@/lib/schemas/tenant-user-management";

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
  const setPassword = useSetPassword();
  const [topError, setTopError] = React.useState<string | null>(null);

  const form = useForm<SetPasswordForm>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setTopError(null);
    try {
      await setPassword.mutateAsync({
        password: values.password,
        token: tokenFromUrl ?? undefined,
      });
      toast.success("Password berhasil disimpan. Sekarang Anda bisa login dengan email dan password.");
      router.push("/login");
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length > 0) return;
      const message = getErrorMessage(err, { fallback: "Tidak bisa menyimpan password." });
      setTopError(message);
      toast.error(message);
    }
  });

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
                    <FormLabel>Password baru</FormLabel>
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
                    <FormLabel>Konfirmasi password</FormLabel>
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
