import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAppState } from "@/lib/store";
import { Avatar, Card, PageHeader, SkeletonCard, StatusBanner, inputCls } from "@/components/nx";
import { fmtDate } from "@/lib/types";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Meeting History – Nexora" },
      { name: "description", content: "Search and filter every meeting Nexora remembers by contact and date." },
      { property: "og:title", content: "Meeting History – Nexora" },
      { property: "og:description", content: "Searchable meeting history backed by memory." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const s = useAppState();
  const [q, setQ] = useState("");
  const [contact, setContact] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const list = s.meetings
    .filter((m) => contact === "all" || m.contactId === contact)
    .filter((m) => (!from || m.date >= from) && (!to || m.date.slice(0, 10) <= to))
    .filter((m) => !q || `${m.title} ${m.summary ?? ""} ${m.purpose}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <PageHeader eyebrow="History" title="Meeting history" desc="Every meeting, searchable — with the memories it created." />
      <StatusBanner loading={s.loading && s.meetings.length === 0} error={s.error} />
      <Card className="mb-6 grid gap-3 md:grid-cols-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search meetings…" className={inputCls} />
        <select value={contact} onChange={(e) => setContact(e.target.value)} className={inputCls}>
          <option value="all">All contacts</option>
          {s.contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} aria-label="From date" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} aria-label="To date" />
      </Card>
      {s.loading && s.meetings.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} className="h-20" />)}
        </div>
      ) : (
      <div className="space-y-3">
        {list.map((m, i) => {
          const c = s.contacts.find((x) => x.id === m.contactId)!;
          const mem = s.memories.filter((x) => x.meetingId === m.id).length;
          return (
            <Card key={m.id} className="lift flex flex-wrap items-center gap-4 animate-fade-up" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
              <Avatar contact={c} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{m.title}</p>
                <p className="text-sm text-muted-foreground">{c.name} · {fmtDate(m.date)}</p>
                {m.summary && <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{m.summary}</p>}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs ${m.status === "upcoming" ? "bg-violet/15 text-violet" : "bg-primary/10 text-primary"}`}>{m.status === "upcoming" ? "Upcoming" : `${mem} memories`}</span>
              <Link to="/workspace/$meetingId" params={{ meetingId: m.id }} className="text-sm font-medium text-primary hover:underline">Workspace</Link>
              <Link to="/contacts/$contactId" params={{ contactId: c.id }} className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
            </Card>
          );
        })}
        {!list.length && <p className="text-center text-muted-foreground">{s.meetings.length ? "No meetings match your filters." : "No meetings yet."}</p>}
      </div>
      )}
    </div>
  );
}
