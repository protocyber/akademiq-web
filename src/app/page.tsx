import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">AcademiQ</h1>
      <p className="max-w-prose text-muted-foreground">
        Multi-tenant SaaS untuk manajemen sekolah — identitas, langganan,
        akademik, kehadiran, dan penilaian dalam satu platform.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/register">Daftar sekolah</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Masuk</Link>
        </Button>
      </div>
    </main>
  );
}
