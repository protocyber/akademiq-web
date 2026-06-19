import type { Metadata } from "next";

import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { QueryProvider } from "@/lib/query/provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AcademicScopeProvider } from "@/components/providers/academic-scope-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "AcademiQ",
  description: "Multi-tenant school management SaaS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} ${plusJakartaSans.variable} min-h-screen bg-background font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            <AcademicScopeProvider>
              <TooltipProvider delayDuration={150}>
                {children}
                <Toaster />
              </TooltipProvider>
            </AcademicScopeProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
