import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { BrainCircuit, Database, FileText, Search, Upload, RotateCcw } from "lucide-react";
import { useAppState, resetState } from "@/lib/store";
import { recallMeetingMemory } from "@/lib/hindsight";
import { Card, PageHeader, Relevance, SkeletonCard, StatusBanner, TypeBadge, inputCls } from "@/components/nx";
import { TYPE_META, fmtDate, type MemoryType } from "@/lib/types";

export const Route = createFileRoute("/memory")({
  validateSearch: z.object({ contact: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Memory Center – Nexora" },
      { name: "description", content: "Explore every memory Nexora has retained: topics, relevance and growth over time." },
      { property: "og:title", content: "Memory Center – Nexora" },
      { property: "og:description", content: "Visualize Nexora's persistent Hindsight memory." },
    ],
  }),
  component: MemoryCenter,
});

const flow = [
  { icon: Upload, t: "Meeting" }, { icon: Database, t: "Retain" }, { icon: BrainCircuit, t: "Memory bank" }, { icon: Search, t: "Recall" }, { icon: FileText, t: "Brief" },
];

function MemoryCenter() {
  const sp = Route.useSearch();
  const s = useAppState();
  const [contact, setContact] = useState(sp.contact ?? "all");
  const [type, setType] = useState<MemoryType | "all">("all");
  const list = recallMeetingMemory({ contactId: contact === "all" ? undefined : contact, types: type === "all" ? undefined : [type], limit: 200 })
    .sort((a, b) => b.date.localeCompare(a.date));

  const topics = new Map<string, number>();
  s.memories.forEach((m) => m.topics.forEach((t) => topics.set(t, (topics.get(t) ?? 0) + 1)));
  const topTopics = [...topics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  const maxT = topTopics[0]?.[1] ?? 1;

  const months: string[] = [];
  const today = new Date();
  for (let i = 3; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  let cum = 0;
  const growth = months.map((mo) => { cum += s.memories.filter((m) => m.date.slice(0, 7) === mo).length; return { mo, cum }; });
  const maxG = Math.max(1, ...growth.map((g) => g.cum));
  const cName = (id: string) => s.contacts.find((c) => c.id === id)?.name ?? "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <PageHeader eyebrow="Memory Center" title="Hindsight memory, visualized" desc="Everything Nexora has learned across your meetings — and how it flows into every brief."
        action={<button onClick={() => { if (confirm("Reset memory to demo data?")) resetState(); }} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"><RotateCcw className="h-4 w-4" /> Reset demo data</button>} />

      <StatusBanner loading={s.loading && s.memories.length === 0} error={s.error} />
      {s.loading && s.memories.length === 0 ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} className="h-44" />)}
        </div>
      ) : (
      <>
      <Card className="mb-6">
        <div className="relative grid grid-cols-5 gap-2">
          <div className="absolute left-[10%] right-[10%] top-6 h-px bg-border">
            {[0, 0.8, 1.6].map((d) => <span key={d} className="absolute -top-1 h-2 w-2 animate-flow rounded-full bg-primary glow" style={{ animationDelay: `${d}s` }} />)}
          </div>
          {flow.map((f, i) => (
            <div key={f.t} className="relative text-center">
              <span className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-border ${i === 2 ? "bg-brand glow" : "bg-secondary"}`}><f.icon className="h-5 w-5" /></span>
              <p className="mt-2 text-xs font-semibold md:text-sm">{f.t}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <p className="font-display font-semibold">Memory growth</p>
          <div className="mt-6 flex h-40 items-end gap-4">
            {growth.map((g, i) => (
              <div key={g.mo} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs tabular-nums text-muted-foreground">{g.cum}</span>
                <div className="w-full origin-bottom rounded-t-lg bg-brand animate-fade-up" style={{ height: `${(g.cum / maxG) * 120}px`, animationDelay: `${i * 120}ms` }} />
                <span className="text-xs text-muted-foreground">{new Date(g.mo + "-01").toLocaleString("en", { month: "short" })}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <p className="font-display font-semibold">By type</p>
          <div className="mt-4 space-y-3">
            {(Object.keys(TYPE_META) as MemoryType[]).map((t) => {
              const c = s.memories.filter((m) => m.type === t).length;
              return (
                <div key={t} className="flex items-center gap-3">
                  <div className="w-24"><TypeBadge type={t} /></div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-brand" style={{ width: `${(c / s.memories.length) * 100}%` }} /></div>
                  <span className="w-6 text-right text-xs tabular-nums">{c}</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <p className="font-display font-semibold">Top topics</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {topTopics.map(([t, c]) => (
              <span key={t} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary" style={{ fontSize: `${11 + (c / maxT) * 6}px` }}>{t} · {c}</span>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <select value={contact} onChange={(e) => setContact(e.target.value)} className={inputCls + " max-w-xs"}>
          <option value="all">All contacts</option>
          {s.contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex flex-wrap gap-2">
          {(["all", ...Object.keys(TYPE_META)] as (MemoryType | "all")[]).map((t) => (
            <button key={t} onClick={() => setType(t)} className={`rounded-full border px-3 py-1.5 text-xs ${type === t ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground"}`}>{t === "all" ? "All" : TYPE_META[t].label}</button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((m, i) => (
          <Card key={m.id} className="lift animate-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
            <div className="flex items-center justify-between"><TypeBadge type={m.type} /><Relevance value={m.relevance} /></div>
            <p className="mt-3 text-sm">{m.text}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <Link to="/contacts/$contactId" params={{ contactId: m.contactId }} className="hover:text-foreground">{cName(m.contactId)}</Link>
              <span>{fmtDate(m.date)}{m.status === "open" && <span className="ml-2 text-warn">● open</span>}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">{m.topics.map((t) => <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>)}</div>
          </Card>
        ))}
        {!list.length && <p className="text-center text-muted-foreground md:col-span-2 lg:col-span-3">{s.memories.length ? "No memories match your filters." : "No memories stored yet."}</p>}
      </div>
      </>
      )}
    </div>
  );
}
