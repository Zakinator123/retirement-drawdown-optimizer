"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Tooltip({
  content,
  children,
  className,
}: {
  content: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex", className)} title={content}>
      {children}
    </span>
  );
}
