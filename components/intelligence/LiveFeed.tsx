"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AnimatePresence, motion } from "framer-motion";

type FeedItem = {
  _id: string;
  kind: string;
  title?: string;
  createdAt: number;
};

export function LiveFeed() {
  const items = (useQuery(api.intelligence.ingest.getRecent) as FeedItem[] | undefined) ?? [];

  return (
    <div className="glass-panel rounded-2xl p-4 text-white">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Live Feed</p>
        <p className="text-[11px] text-white/50">{items.length}</p>
      </div>
      <p className="mt-1 text-sm font-semibold">Isabella Stream</p>

      <div className="mt-3 space-y-2">
        <AnimatePresence initial={false}>
          {items.slice(0, 12).map((item) => (
            <motion.div
              key={item._id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {item.title ?? "Untitled"}
                  </p>
                  <p className="text-[11px] text-white/60">
                    {item.kind} · {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <div className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/70 ring-1 ring-white/10">
            No signals yet. Use Capture to generate intelligence.
          </div>
        )}
      </div>
    </div>
  );
}

