import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BrainCircuit, CalendarDays, ListChecks, Users } from "lucide-react";
import { useAppState } from "@/lib/store";
import { Avatar, Card, SkeletonCard, StatusBanner, TypeBadge, btnPrimary } from "@/components/nx";
import { fmtDate } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard – Nexora" },
      { name: "description", content: "Your upcoming meetings, open commitments and memory stats at a glance." },
      { property: "og:title", content: "Dashboard – Nexora" },
      { property: "og:description", content: "Upcoming meetings and memory stats in Nexora." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const s = useAppState();
  const upcoming = s.meetings.filter((m) => m.status === "upcoming").sort((a, b) => a.date.localeCompare(b.date));
  const open = s.memories.filter((m) => m.status === "open");
  const recent = [...s.memories].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const contact = (id: string) => s.contacts.find((c) => c.id === id)!;
  const stats = [
    { icon: Users, label: "Contacts", v: s.contacts.length },
    { icon: CalendarDays, label: "Meetings remembered", v: s.meetings.filter((m) => m.status === "completed").length },
    { icon: BrainCircuit, label: "Memories stored", v: s.memories.length },
    { icon: ListChecks, label: "Open commitments", v: open.length },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <StatusBanner loading={s.loading && s.contacts.length === 0} error={s.error} />
      {s.loading && s.contacts.length === 0 ? (
        <div className="space-y-6">
          <SkeletonCard className="h-36" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} className="h-32" />)}
          </div>
          <SkeletonCard className="h-64" />
        </div>
      ) : (
      <>
      <Card className="relative mb-8 overflow-hidden p-8 animate-fade-up">
        <div className="absolute inset-0 bg-brand opacity-15" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back 👋</p>
            <h1 className="mt-1 text-3xl font-semibold">You have {upcoming.length} meetings coming up.</h1>
            <p className="mt-2 text-muted-foreground">Nexora is holding {open.length} open commitments so you don't have to.</p>
          </div>
          <Link to="/prepare" className={btnPrimary}>Prepare a meeting <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((st, i) => (
          <Card key={st.label} className="lift animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
            <st.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 font-display text-3xl font-semibold">{st.v}</p>
            <p className="text-sm text-muted-foreground">{st.label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Upcoming meetings</h2>
          <div className="mt-4 divide-y divide-border">
            {upcoming.map((m) => {
              const c = contact(m.contactId);
              const mem = s.memories.filter((x) => x.contactId === c.id).length;
              return (
                <div key={m.id} className="flex flex-wrap items-center gap-4 py-4">
                  <Avatar contact={c} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{m.title}</p>
                    <p className="text-sm text-muted-foreground">{c.name} · {c.company} · {fmtDate(m.date)}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{mem} memories</span>
                  <Link to="/workspace/$meetingId" params={{ meetingId: m.id }} className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20">Workspace</Link>
                  <Link to="/prepare" search={{ contact: c.id, title: m.title, purpose: m.purpose, date: m.date.slice(0, 10) }} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary">Prepare</Link>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Latest memories</h2>
            <Link to="/memory" className="text-sm text-primary">View all</Link>
          </div>
          <div className="mt-4 space-y-3">
            {recent.map((m) => (
              <div key={m.id} className="rounded-xl border border-border bg-secondary/40 p-3">
                <div className="flex items-center justify-between"><TypeBadge type={m.type} /><span className="text-xs text-muted-foreground">{contact(m.contactId).name}</span></div>
                <p className="mt-2 text-sm">{m.text}</p>
              </div>
            ))}
            {!recent.length && <p className="text-sm text-muted-foreground">No memories stored yet.</p>}
          </div>
        </Card>
      </div>
      </>
      )}
    </div>
  );
}
