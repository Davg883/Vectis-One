"use client";

import * as React from "react";

type Variant = "default" | "destructive" | "outline";

const variantClasses: Record<Variant, string> = {
  default: "bg-slate-900 text-white",
  destructive: "bg-red-100 text-red-700 ring-1 ring-red-200",
  outline: "border border-slate-200 text-slate-700",
};

export function Badge({
  children,
  variant = "default",
  className = "",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
