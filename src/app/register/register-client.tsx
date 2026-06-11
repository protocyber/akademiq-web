"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { usePlans, type PlanView } from "@/lib/query/queries/use-plans";
import { useRegisterTenant } from "@/lib/query/mutations/use-register-tenant";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { getErrorMessage } from "@/lib/errors/messages";
import { registerSchema, type RegisterFormValues } from "@/lib/schemas/register";

const STEPS = [
  { id: "school", label: "Profil sekolah" },
  { id: "plan", label: "Pilih plan" },
  { id: "admin", label: "Akun admin" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function RegisterClient() {
  const router = useRouter();
  const plans = usePlans();
  const register = useRegisterTenant();
  const [step, setStep] = React.useState<StepId>("school");
  const [topError, setTopError] = React.useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      school_name: "",
      plan_id: "",
      admin_email: "",
      admin_password: "",
      admin_full_name: "",
    },
    mode: "onSubmit",
  });

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const onSubmit = form.handleSubmit(async (values) => {
    setTopError(null);
    try {
      await register.mutateAsync(values);
      toast.success("Sekolah berhasil terdaftar");
      router.push("/dashboard");
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length > 0) {
        // Take the user back to the step that owns the offending field.
        const fields = applied;
        if (fields.includes("school_name")) setStep("school");
        else if (fields.includes("plan_id")) setStep("plan");
        else setStep("admin");
        return;
      }
      const message = getErrorMessage(err, { fallback: "Pendaftaran gagal. Coba lagi." });
      setTopError(message);
      toast.error(message);
    }
  });

  async function goNext() {
    let fieldsToCheck: (keyof RegisterFormValues)[] = [];
    if (step === "school") fieldsToCheck = ["school_name"];
    if (step === "plan") fieldsToCheck = ["plan_id"];
    if (step === "admin")
      fieldsToCheck = ["admin_email", "admin_password", "admin_full_name"];

    const ok = await form.trigger(fieldsToCheck, { shouldFocus: true });
    if (!ok) return;

    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1].id);
    } else {
      onSubmit();
    }
  }

  function goBack() {
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx > 0) setStep(STEPS[idx - 1].id);
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Daftarkan sekolah Anda</CardTitle>
          <CardDescription>
            Lengkapi data sekolah, pilih plan langganan, lalu buat akun admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="mb-8 flex w-full items-center gap-2">
            {STEPS.map((s, idx) => {
              const done = idx < stepIndex;
              const active = idx === stepIndex;
              return (
                <li key={s.id} className="flex flex-1 items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                      done && "border-primary bg-primary text-primary-foreground",
                      active && !done && "border-primary text-primary",
                      !active && !done && "border-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span
                    className={cn(
                      "truncate text-sm",
                      active ? "font-medium" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                  {idx < STEPS.length - 1 ? (
                    <span className="ml-2 hidden h-px flex-1 bg-border md:inline-block" />
                  ) : null}
                </li>
              );
            })}
          </ol>

          {topError ? (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Pendaftaran gagal</AlertTitle>
              <AlertDescription>{topError}</AlertDescription>
            </Alert>
          ) : null}

          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                goNext();
              }}
              noValidate
              className="space-y-6"
            >
              {step === "school" ? (
                <FormField
                  control={form.control}
                  name="school_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama sekolah</FormLabel>
                      <FormControl>
                        <Input placeholder="SMA Demo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              {step === "plan" ? (
                <PlanStep form={form} plans={plans.data} loading={plans.isLoading} error={plans.error} onRetry={() => plans.refetch()} />
              ) : null}

              {step === "admin" ? (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="admin_full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama lengkap</FormLabel>
                        <FormControl>
                          <Input placeholder="Andi Saputra" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="admin_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email admin</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            autoComplete="email"
                            placeholder="admin@sekolah.test"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="admin_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={goBack}
                  disabled={stepIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Kembali
                </Button>
                <Button type="submit" loading={register.isPending}>
                  {step === "admin" ? "Daftar sekolah" : "Lanjut"}
                  {step !== "admin" ? <ChevronRight className="h-4 w-4" /> : null}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Sudah punya akun?&nbsp;
        <Link className="text-primary underline-offset-4 hover:underline" href="/login">
          Masuk
        </Link>
      </p>
    </main>
  );
}

function PlanStep({
  form,
  plans,
  loading,
  error,
  onRetry,
}: {
  form: ReturnType<typeof useForm<RegisterFormValues>>;
  plans: PlanView[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const selected = form.watch("plan_id");

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3 rounded-lg border p-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !plans) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Gagal memuat plan</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>Coba muat ulang katalog plan.</p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Coba lagi
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <FormField
      control={form.control}
      name="plan_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Pilih plan</FormLabel>
          <FormControl>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => {
                const active = field.value === plan.plan_id;
                return (
                  <Card
                    key={plan.plan_id}
                    role="radio"
                    aria-checked={active}
                    tabIndex={0}
                    className={cn(
                      "cursor-pointer transition-colors",
                      active && "border-primary ring-2 ring-primary",
                    )}
                    onClick={() => field.onChange(plan.plan_id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        field.onChange(plan.plan_id);
                      }
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription>
                        Rp{Math.round(plan.price_monthly).toLocaleString("id-ID")} / bulan
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {plan.features.map((f) => (
                          <li
                            key={f.feature_code}
                            className={cn(
                              "flex items-center gap-2",
                              !f.enabled && "text-muted-foreground line-through",
                            )}
                          >
                            <Check
                              className={cn(
                                "h-3.5 w-3.5",
                                f.enabled ? "text-primary" : "opacity-30",
                              )}
                            />
                            {f.feature_code}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </FormControl>
          <FormMessage />
          {!selected ? (
            <p className="text-sm text-muted-foreground">
              Klik salah satu kartu untuk memilih.
            </p>
          ) : null}
        </FormItem>
      )}
    />
  );
}
