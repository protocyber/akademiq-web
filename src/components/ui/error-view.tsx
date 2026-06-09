"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ShieldAlert, FileQuestion, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorViewProps {
  status?: number;
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  fullPage?: boolean;
}

export function ErrorView({
  status,
  title: customTitle,
  description: customDescription,
  onRetry,
  isRetrying = false,
  fullPage = false,
}: ErrorViewProps) {
  let title = customTitle || "Gagal Memuat Data";
  let description =
    customDescription ||
    "Terjadi kesalahan saat memuat data. Periksa koneksi internet Anda dan coba lagi.";
  let Icon = AlertTriangle;
  let themeColorClass = "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30";

  if (status === 403 || status === 401) {
    title = customTitle || "Akses Ditolak";
    description =
      customDescription ||
      "Halaman ini memerlukan hak akses khusus yang tidak dimiliki oleh akun Anda. Silakan hubungi administrator sekolah jika Anda memerlukan akses.";
    Icon = ShieldAlert;
    themeColorClass = "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30";
  } else if (status === 404) {
    title = customTitle || "Halaman Tidak Ditemukan";
    description =
      customDescription ||
      "Halaman atau data yang Anda cari tidak dapat ditemukan atau telah dipindahkan.";
    Icon = FileQuestion;
    themeColorClass = "bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800/60";
  } else if (status && status >= 500) {
    title = customTitle || "Terjadi Kesalahan Sistem";
    description =
      customDescription ||
      "Terjadi kesalahan internal pada server kami. Tim teknis kami sedang menangani masalah ini.";
    Icon = AlertTriangle;
    themeColorClass = "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30";
  }

  const content = (
    <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
      {/* Icon Container */}
      <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 mb-6 animate-pulse ${themeColorClass}`}>
        <Icon className="h-8 w-8" />
      </div>

      {/* Heading */}
      <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-3 font-display">
        {title}
      </h2>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-8">
        {description}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        {onRetry && (
          <Button
            variant="default"
            onClick={onRetry}
            loading={isRetrying}
            className="w-full sm:w-auto min-w-[140px] shadow-sm font-medium transition-all"
          >
            {!isRetrying && <RefreshCw className="h-4 w-4 mr-2" />}
            Coba Lagi
          </Button>
        )}
        
        <Button
          variant={onRetry ? "outline" : "default"}
          asChild
          className="w-full sm:w-auto min-w-[140px] shadow-sm font-medium transition-all"
        >
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Ke Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50/50 dark:bg-background px-4">
        <div className="bg-background border rounded-2xl shadow-xl p-4 w-full max-w-lg transition-all duration-300 hover:shadow-2xl hover:border-slate-300 dark:hover:border-slate-800">
          {content}
        </div>
      </main>
    );
  }

  return (
    <div className="w-full py-12 bg-background border rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md">
      {content}
    </div>
  );
}
