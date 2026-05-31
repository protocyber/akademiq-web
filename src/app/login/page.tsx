"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/components/ui/toaster";
import { PublicOnly } from "@/components/features/public-only";
import { useLogin } from "@/lib/query/mutations/use-login";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { ApiHttpError } from "@/lib/api/types";
import { loginSchema, type LoginFormValues } from "@/lib/schemas/login";

export default function LoginPage() {
  return (
    <React.Suspense fallback={<LoginSkeleton />}>
      <PublicOnly>
        <LoginForm />
      </PublicOnly>
    </React.Suspense>
  );
}

function LoginSkeleton() {
  return (
    <main className="container mx-auto flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Masuk</CardTitle>
          <CardDescription>Memuat formulir...</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const login = useLogin();
  const [topError, setTopError] = React.useState<string | null>(null);

  const onSubmit = form.handleSubmit(async (values) => {
    setTopError(null);
    try {
      await login.mutateAsync(values);
      router.push(next);
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length > 0) return;
      const message =
        err instanceof ApiHttpError ? err.message : "Tidak bisa masuk. Coba lagi.";
      setTopError(message);
      toast.error(message);
    }
  });

  return (
    <main className="container mx-auto flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Masuk</CardTitle>
          <CardDescription>Akses dashboard sekolah Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              {topError ? (
                <Alert variant="destructive">
                  <AlertTitle>Gagal masuk</AlertTitle>
                  <AlertDescription>{topError}</AlertDescription>
                </Alert>
              ) : null}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
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
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                loading={login.isPending}
              >
                Masuk
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Belum punya akun?&nbsp;
          <Link className="text-primary underline-offset-4 hover:underline" href="/register">
            Daftar sekolah
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
