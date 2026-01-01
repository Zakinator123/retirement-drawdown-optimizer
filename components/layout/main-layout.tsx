"use client";

import { Header } from "@/components/layout/header";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50">
      <Header />
      {children}
    </div>
  );
}
