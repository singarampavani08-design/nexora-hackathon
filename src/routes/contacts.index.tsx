import { createFileRoute, Link } from "@tanstack/react-router";
import { useAppState } from "@/lib/store";
import { Avatar, Card, PageHeader, SkeletonCard, StatusBanner } from "@/components/nx";

export const Route = createFileRoute("/contacts/")({
  head: () => ({
    meta: [
      { title: "Contacts – Nexora" },
      { name: "description", content: "Every contact Nexora remembers, with meeting counts and open commitments." },
      { property: "og:title", content: "Contacts – Nexora" },
      { property: "og:description", content: "Your contact directory with meeting memory." },
    ],
  }),
  component: Contacts,
});

function Contacts() {
  const s = useAppState();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <PageHeader eyebrow="Contacts" title="People Nexora remembers" desc="Open a contact to see their full meeting timeline and memory history." />
      <StatusBanner loading={s.loading && s.contacts.length === 0} error={s.error} />
      {s.loading && s.contacts.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} className="h-44" />)}
        </div>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {s.contacts.map((c, i) => {
          const meetings = s.meetings.filter((m) => m.contactId === c.id && m.status === "completed").length;
          const mem = s.memories.filter((m) => m.contactId === c.id);
          const open = mem.filter((m) => m.status === "open").length;
          return (
            <Link key={c.id} to="/contacts/$contactId" params={{ contactId: c.id }} className="block animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <Card className="lift h-full">
                <div className="flex items-center gap-3">
                  <Avatar contact={c} size={48} />
                  <div><p className="font-display font-semibold">{c.name}</p><p className="text-sm text-muted-foreground">{c.role} · {c.company}</p></div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  {[["Meetings", meetings], ["Memories", mem.length], ["Open", open]].map(([l, v]) => (
                    <div key={l} className="rounded-xl bg-secondary/60 py-2"><p className="font-display text-lg font-semibold">{v}</p><p className="text-[11px] text-muted-foreground">{l}</p></div>
                  ))}
                </div>
              </Card>
            </Link>
          );
        })}
        {!s.contacts.length && <p className="text-center text-muted-foreground sm:col-span-2 lg:col-span-3">No contacts yet.</p>}
      </div>
      )}
    </div>
  );
}
