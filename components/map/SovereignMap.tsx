"use client";

import { motion } from "framer-motion";

export function SovereignMap() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(246,115,54,0.18),transparent_40%),radial-gradient(circle_at_75%_35%,rgba(59,130,246,0.16),transparent_45%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.10),transparent_45%)]" />
      <div className="absolute inset-0 opacity-70 bg-grid-pattern" />
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0.25 }}
        animate={{ opacity: [0.18, 0.28, 0.18] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(circle at 60% 40%, rgba(255,255,255,0.05), transparent 45%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.85),rgba(2,6,23,0.35),rgba(2,6,23,0.9))]" />
    </div>
  );
}

