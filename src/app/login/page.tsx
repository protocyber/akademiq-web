"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  GraduationCap,
  TrendingUp,
  Users,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google-icon";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { PublicOnly } from "@/components/features/public-only";
import { googleLoginStartUrl, useLogin, useMyTenants, useEnterTenant } from "@/lib/query/mutations/use-login";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { isApiError } from "@/lib/errors/messages";
import { getErrorMessage } from "@/lib/errors/messages";
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
  const oauthError = params.get("oauth_error");
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "", remember_device: false },
  });

  const login = useLogin();
  const myTenants = useMyTenants();
  const enterTenant = useEnterTenant();
  const [topError, setTopError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!oauthError) return;
    const message = getErrorMessage(
      { code: oauthError, message: oauthError },
      { fallback: "Login dengan Gmail gagal. Coba lagi." },
    );
    setTopError(message);
    toast.error(message);
  }, [oauthError]);

  function handleGoogleLogin() {
    window.location.href = googleLoginStartUrl();
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setTopError(null);
    try {
      const { remember_device: _rememberDevice, ...input } = values;
      await login.mutateAsync(input);

      // After login we always get an identity token. Now resolve tenant context.
      const tenants = await myTenants.mutateAsync();

      if (tenants.length === 1) {
        // Single-tenant fast path: auto-enter and proceed to app.
        await enterTenant.mutateAsync({ tenantId: tenants[0].tenant_id });
        router.push(next);
      } else if (tenants.length === 0) {
        // 0-tenant: go to empty state.
        router.push("/tenant-select");
      } else {
        // N tenants: go to picker.
        router.push("/tenant-select");
      }
    } catch (err) {
      // PASSWORD_NOT_SET: the account exists but has no password. Route the
      // user to the authenticated set-password screen instead of showing a
      // generic error.
      if (isApiError(err, "PASSWORD_NOT_SET")) {
        toast.info("Akun Anda belum punya password. Silakan set password terlebih dahulu.");
        router.push("/set-password");
        return;
      }
      const applied = applyServerFieldErrors(form, err);
      if (applied.length > 0) return;
      const message = getErrorMessage(err, { fallback: "Tidak bisa masuk. Coba lagi." });
      setTopError(message);
      toast.error(message);
    }
  });

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left side: branding & illustration */}
      <section className="hidden md:flex md:w-1/2 lg:w-3/5 bg-gradient-to-br from-primary to-primary-container relative items-center justify-center p-8 overflow-hidden text-white">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-white blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-primary-foreground blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-2xl">
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold mb-4">
              <Check className="h-3.5 w-3.5" />
              Dipercaya oleh 500+ Sekolah
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight mb-4">
              Manajemen Sekolah Modern, <br />
              <span className="text-emerald-300">Lebih Mudah & Efisien.</span>
            </h1>
            <p className="text-lg text-white/80 max-w-md">
              Platform all-in-one untuk administrasi sekolah, akademik, kehadiran, dan pembayaran dalam satu dasbor terpadu.
            </p>
          </div>

          {/* Floating Cards (Bento Style) */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white shadow-lg">
              <CardHeader className="pb-4">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-300" />
                </div>
                <CardTitle className="text-base text-white">Analisis Real-time</CardTitle>
                <CardDescription className="text-white/60 text-xs">
                  Pantau perkembangan akademik siswa secara instan.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white shadow-lg translate-y-4">
              <CardHeader className="pb-4">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-2">
                  <Users className="h-4 w-4 text-emerald-300" />
                </div>
                <CardTitle className="text-base text-white">Portal Wali Murid</CardTitle>
                <CardDescription className="text-white/60 text-xs">
                  Menjembatani sekolah dan orang tua dengan mudah.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Main Illustration Image */}
          <div className="mt-12 relative rounded-xl overflow-hidden shadow-2xl border border-white/10">
            <div
              role="img"
              aria-label="Kolaborasi Akademik"
              className="h-[320px] w-full bg-cover bg-center"
              style={{
                backgroundImage:
                  "url(https://lh3.googleusercontent.com/aida-public/AB6AXuBiFuJe9x0H_3e-VcVvAXYYcc2cePpaN82YKu9SxtF2aP7GEMihjrPYBi-1Y420erhlI6W3Zkdhosnl-ogbIerox4Uiu-UlsQ3ptzBd_BAuIOFzjaga-vFyPQ_vbf_8rLRgEgZY42ZEVyfXeeCXHb5ShbotFpo4cRlbmO_VnB3BSYsD9kUcWjZ-Xr2wSs1p5b1Xqz-25doQjZPTvvVI1PAu3z_Q06_vzsqurB51rtCvvLiEdcXu58-QcvfZryp9BY9RED8R63LhsyTs)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        </div>
      </section>

      {/* Right side: Login form */}
      <section className="w-full md:w-1/2 lg:w-2/5 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md">
                <GraduationCap className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold font-display text-primary tracking-tight">AcademiQ</span>
            </div>
            <h2 className="text-2xl font-bold font-display text-foreground">Selamat Datang</h2>
            <p className="text-muted-foreground text-sm">
              Silakan masukkan email atau username Anda untuk masuk ke dasbor.
            </p>
          </div>

          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Masuk</CardTitle>
              <CardDescription>Akses dasbor sekolah Anda.</CardDescription>
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
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email atau username</FormLabel>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <FormControl>
                            <Input
                              className="pl-10"
                              type="text"
                              autoComplete="username"
                              placeholder="nama@sekolah.sch.id atau nama_pengguna"
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
                        <div className="flex justify-between items-center">
                          <FormLabel>Password</FormLabel>
                          <Link className="text-xs text-primary hover:underline" href="#">
                            Lupa Password?
                          </Link>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <FormControl>
                            <Input
                              className="pl-10 pr-10"
                              type={showPassword ? "text" : "password"}
                              autoComplete="current-password"
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
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="remember_device"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0 py-1">
                        <FormControl>
                          <Checkbox
                            id="remember_device"
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(checked === true)}
                          />
                        </FormControl>
                        <Label
                          htmlFor="remember_device"
                          className="cursor-pointer select-none text-xs text-muted-foreground"
                        >
                          Ingat perangkat ini selama 30 hari
                        </Label>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5"
                    disabled={login.isPending || myTenants.isPending || enterTenant.isPending}
                    loading={login.isPending || myTenants.isPending || enterTenant.isPending}
                  >
                    Masuk
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
              Belum punya akun?&nbsp;
              <Link className="text-primary font-medium hover:underline" href="/signup">
                Daftar sekarang
              </Link>
            </CardFooter>
          </Card>

          <footer className="text-center space-y-4 pt-4 text-xs text-muted-foreground">
            <div className="flex justify-center gap-4">
              <Link className="hover:text-primary transition-colors" href="#">Kebijakan Privasi</Link>
              <span>•</span>
              <Link className="hover:text-primary transition-colors" href="#">Syarat & Ketentuan</Link>
            </div>
            <p>© 2026 AcademiQ. Hak Cipta Dilindungi.</p>
          </footer>
        </div>
      </section>
    </main>
  );
}

