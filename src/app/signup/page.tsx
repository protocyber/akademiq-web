"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google-icon";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/components/ui/toaster";
import { PublicOnly } from "@/components/features/public-only";
import { usePublicSignup } from "@/lib/query/mutations/use-signup";
import { googleLoginStartUrl } from "@/lib/query/mutations/use-login";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { getErrorMessage } from "@/lib/errors/messages";
import { signupSchema, type SignupFormValues } from "@/lib/schemas/signup";

export default function SignupPage() {
  return (
    <React.Suspense>
      <PublicOnly>
        <SignupForm />
      </PublicOnly>
    </React.Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [topError, setTopError] = React.useState<string | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", username: "" },
  });

  const signup = usePublicSignup();

  function handleGoogleLogin() {
    window.location.href = googleLoginStartUrl();
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setTopError(null);
    try {
      await signup.mutateAsync({
        email: values.email,
        password: values.password,
        username: values.username || undefined,
      });
      // After signup: identity token stored, go to tenant selection (0-tenant state).
      router.push("/tenant-select");
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length > 0) return;
      const message = getErrorMessage(err, { fallback: "Pendaftaran gagal. Coba lagi." });
      setTopError(message);
      toast.error(message);
    }
  });

  return (
    <main className="container mx-auto flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold font-display text-primary tracking-tight">
              AcademiQ
            </span>
          </div>
          <h2 className="text-2xl font-bold font-display text-foreground">Buat Akun</h2>
          <p className="text-muted-foreground text-sm">
            Daftar dengan email dan password untuk mulai menggunakan AcademiQ.
          </p>
        </div>

        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Daftar</CardTitle>
            <CardDescription>Isi data berikut untuk membuat akun.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                {topError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Pendaftaran gagal</AlertTitle>
                    <AlertDescription>{topError}</AlertDescription>
                  </Alert>
                ) : null}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <FormControl>
                          <Input
                            className="pl-10"
                            type="email"
                            autoComplete="email"
                            placeholder="nama@contoh.com"
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <FormControl>
                          <Input
                            className="pl-10 pr-10"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Username{" "}
                        <span className="text-muted-foreground font-normal">(opsional)</span>
                      </FormLabel>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <FormControl>
                          <Input
                            className="pl-10"
                            type="text"
                            autoComplete="username"
                            placeholder="nama_pengguna"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5"
                  loading={signup.isPending}
                >
                  Buat Akun
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <div className="relative py-1 text-center text-xs text-muted-foreground">
                  <span className="bg-background px-2">atau</span>
                  <div className="absolute inset-x-0 top-1/2 -z-10 border-t" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleGoogleLogin}
                >
                  <GoogleIcon className="h-4 w-4" />
                  Login dengan Gmail
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground justify-center border-t p-4 bg-muted/30">
            Sudah punya akun?&nbsp;
            <Link className="text-primary font-medium hover:underline" href="/login">
              Masuk
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

