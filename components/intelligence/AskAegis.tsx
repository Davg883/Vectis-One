"use client";

import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrganization } from "@clerk/nextjs";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "aegis"; text: string };

export function AskAegis() {
  const { organization } = useOrganization();
  const ask = useAction(api.intelligence.search.ask);

  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState<"all" | "transport_compliance" | "legal" | "depot_safety">(
    "all"
  );
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !busy, [input, busy]);

  const send = async () => {
    if (!canSend) return;
    if (!organization?.id) {
      setMessages((m) => [...m, { role: "aegis", text: "No Organization Selected." }]);
      return;
    }

    const q = input.trim();
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: q }]);

    try {
      const result = (await ask({
        query: q,
        orgId: organization.id,
        domain: domain === "all" ? undefined : domain,
      })) as unknown as { answer: string };
      setMessages((m) => [...m, { role: "aegis", text: result.answer }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ask failed";
      setMessages((m) => [...m, { role: "aegis", text: msg }]);
    } finally {
      setBusy(false);
      queueMicrotask(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
    }
  };

  return (
    <div className="fixed bottom-5 left-5 z-50">
      {open ? (
        <div className="glass-panel w-[360px] max-w-[calc(100vw-2.5rem)] rounded-2xl p-4 text-white ring-1 ring-white/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Ask</p>
              <p className="text-sm font-semibold">Aegis</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/10 hover:bg-white/15"
            >
              Close
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs text-white/60">Domain</label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value as typeof domain)}
              className="glass-input flex-1 rounded-xl px-3 py-2 text-sm outline-none"
              disabled={busy}
            >
              <option value="all">All</option>
              <option value="transport_compliance">Transport</option>
              <option value="legal">Legal</option>
              <option value="depot_safety">Depot</option>
            </select>
          </div>

          <div
            ref={listRef}
            className="mt-3 max-h-[40vh] overflow-auto rounded-xl bg-white/5 p-3 text-sm ring-1 ring-white/10"
          >
            {messages.length === 0 ? (
              <p className="text-white/60">Ask about your uploaded PDFs. Aegis answers using only ingested context.</p>
            ) : (
              <div className="space-y-3">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-xl px-3 py-2 ring-1 ring-white/10",
                      m.role === "user" ? "bg-white/10 text-white" : "bg-black/20 text-white/90"
                    )}
                  >
                    <p className="text-[11px] uppercase tracking-wide text-white/60">
                      {m.role === "user" ? "You" : "Aegis"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{m.text}</p>
                  </div>
                ))}
                {busy ? <p className="text-xs text-white/60">Thinking...</p> : null}
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
              placeholder="Ask a question..."
              className="glass-input flex-1 rounded-xl px-3 py-2 text-sm outline-none placeholder:text-white/40"
              disabled={busy}
            />
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className="rounded-xl bg-[var(--color-brand-accent)] px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="glass-panel rounded-full px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 hover:bg-white/10"
        >
          Ask Aegis
        </button>
      )}
    </div>
  );
}

