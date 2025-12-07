"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import React from "react";

const data = Array.from({ length: 24 }).map((_, i) => {
  const sentiment = 50 + Math.sin(i / 3) * 20 + Math.random() * 10;
  const botSpike = Math.random() > 0.85 ? 40 + Math.random() * 40 : Math.random() * 10;
  return {
    hour: `${i.toString().padStart(2, "0")}:00`,
    sentiment: Math.max(0, Math.min(100, sentiment)),
    bot: Math.max(0, Math.min(100, botSpike)),
  };
});

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const sentiment = payload.find((p) => p.dataKey === "sentiment")?.value;
  const bot = payload.find((p) => p.dataKey === "bot")?.value;
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/95 px-3 py-2 shadow-lg shadow-emerald-900/30">
      <p className="font-mono text-[11px] text-emerald-100">{label}</p>
      <p className="font-mono text-[11px] text-emerald-400">Sentiment: {sentiment?.toFixed(1)}%</p>
      <p className="font-mono text-[11px] text-red-400">Bot Activity: {bot?.toFixed(1)}%</p>
    </div>
  );
}

export function AnomalyChart() {
  return (
    <div className="h-48 w-full rounded-xl bg-slate-900/70 p-3 ring-1 ring-slate-800">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 0, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="botGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="hour"
            hide
            tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
          />
          <YAxis
            hide
            domain={[0, 100]}
            tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="sentiment"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#sentimentGradient)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="bot"
            stroke="#ef4444"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#botGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
