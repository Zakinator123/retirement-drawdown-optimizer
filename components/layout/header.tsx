"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    const stored = window.localStorage.getItem("theme");
    const initial = stored ? stored === "dark" : prefersDark;
    setIsDark(initial);
    root.classList.toggle("dark", initial);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggle}>
      {isDark ? "Light Mode" : "Dark Mode"}
    </Button>
  );
}

export function Header() {
  return (
    <header className="flex flex-col gap-3 border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Retirement Drawdown Optimizer
          </h1>
          <Badge variant="secondary">Rebuild</Badge>
        </div>
        <ThemeToggle />
      </div>
      <p className="text-sm text-muted-foreground">
        Explore withdrawal strategies, taxes, and Social Security timing with a
        transparent year-by-year ledger.
      </p>
    </header>
  );
}
