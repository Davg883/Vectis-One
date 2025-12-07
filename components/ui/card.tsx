"use client";

import * as React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className = "", ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100 ${className}`}
      {...props}
    />
  );
});

export const CardHeader = React.forwardRef<HTMLDivElement, CardProps>(function CardHeader(
  { className = "", ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={`p-4 ${className}`}
      {...props}
    />
  );
});

export const CardContent = React.forwardRef<HTMLDivElement, CardProps>(function CardContent(
  { className = "", ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={`px-4 pb-4 ${className}`}
      {...props}
    />
  );
});
