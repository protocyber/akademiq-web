"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/lib/query/mutations/use-profile";
import { clearAllTokens } from "@/lib/api/client";
import { ApiHttpError } from "@/lib/api/types";

type VerificationStatus = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<VerificationStatus>("verifying");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus("error");
        setErrorMessage("Token tidak ditemukan");
        return;
      }

      try {
        await verifyEmail({ token });
        setStatus("success");
        clearAllTokens();
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } catch (error: unknown) {
        setStatus("error");
        
        if (error instanceof ApiHttpError) {
          if (error.code === "TOKEN_EXPIRED") {
            setErrorMessage("Token verifikasi sudah kedaluwarsa. Silakan minta link verifikasi baru dari halaman profil.");
          } else if (error.code === "INVALID_TOKEN") {
            setErrorMessage("Token verifikasi tidak valid atau sudah digunakan.");
          } else {
            setErrorMessage("Terjadi kesalahan saat memverifikasi email. Silakan coba lagi.");
          }
        } else {
          setErrorMessage("Terjadi kesalahan saat memverifikasi email. Silakan coba lagi.");
        }
      }
    }

    verify();
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verifikasi Email</CardTitle>
          <CardDescription>
            {status === "verifying" && "Memverifikasi email..."}
            {status === "success" && "Email berhasil diverifikasi"}
            {status === "error" && "Verifikasi gagal"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "verifying" && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-center text-sm text-muted-foreground">
                Mohon tunggu, kami sedang memverifikasi email Anda...
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">
                  Email Anda telah berhasil diverifikasi!
                </p>
                <p className="text-sm text-muted-foreground">
                  Anda akan dialihkan ke halaman login dalam 3 detik...
                </p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="rounded-full bg-red-100 p-3">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Verifikasi Gagal</p>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>
              <Button asChild className="w-full">
                <Link href="/profile">Kembali ke Profil</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
