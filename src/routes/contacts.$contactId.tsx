import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, Mail } from "lucide-react";
import { useAppState } from "@/lib/store";
import { getContactById } from "@/lib/supabase/service";
import { Avatar, Card, TypeBadge, btnPrimary } from "@/components/nx";
import { fmtDate } from "@/lib/types";

export const Route = createFileRoute("/contacts/$contactId")({
  loader: async ({ params }) => {
    const res = await getContactById(params.contactId);
    if (!res.ok || !res.data) throw notFound();
    return { name: res.data.name, company: res.data.company ?? "" };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} – Nexora` },
          { name: "description", content: `Meeting timeline and memory history with ${loaderData.name} at ${loaderData.company}.` },
          { property: "og:title", content: `${loaderData.name} – Nexora` },
          { property: "og:description", content: `Everything Nexora remembers about ${loaderData.name}.` },
        ]
      : [{ title: "Contact not found – Nexora" }, { name: "robots", content: "noindex" }],
  }),
  component: ContactDetail,
});

function ContactDetail() {
  const { contactId } = Route.useParams();
  const s = useAppState();
  const c = s.contacts.find((x) => x.id === contactId);

  if (!c) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Contact not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The requested contact doesn't exist or was removed.</p>
        <Link to="/contacts" className={btnPrimary + " mt-6 inline-flex"}>View all contacts</Link>
      </div>
    );
  }

  const meetings = s.meetings.filter((m) => m.contactId === c.id).sort((a, b) => b.date.localeCompare(a.date));
  const open = s.memories.filter((m) => m.contactId === c.id && m.status === "open");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <Card className="relative mb-8 overflow-hidden p-7 animate-fade-up">
        <div className="absolute inset-0 bg-brand opacity-10" />
        <div className="relative flex flex-wrap items-center gap-5">
          <Avatar contact={c} size={72} />
          <div className="flex-1">
            <h1 className="text-3xl font-semibold">{c.name}</h1>
            <p className="text-muted-foreground">{c.role} · {c.company}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" />{c.email}</p>
          </div>
          <Link to="/prepare" search={{ contact: c.id }} className={btnPrimary}>Prepare meeting <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold">Meeting timeline</h2>
          <div className="relative space-y-6 border-l border-border pl-6">
            {meetings.map((m, i) => {
              const mem = s.memories.filter((x) => x.meetingId === m.id);
              return (
                <div key={m.id} className="relative animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <span className={`absolute -left-[31px] top-1.5 h-3 w-3 rounded-full ring-4 ring-background ${m.status === "upcoming" ? "bg-violet" : "bg-primary"}`} />
                  <p className="text-xs text-muted-foreground">{fmtDate(m.date)} · {m.status === "upcoming" ? "Upcoming" : "Completed"}</p>
                  <p className="font-semibold">{m.title}</p>
                  {m.summary && <p className="mt-1 text-sm text-muted-foreground">{m.summary}</p>}
                  {mem.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {mem.map((x) => (
                        <div key={x.id} className="flex items-start gap-2 rounded-xl border border-border bg-secondary/40 p-2.5 text-sm"><TypeBadge type={x.type} /><span>{x.text}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <Card className="h-fit">
          <h2 className="font-display font-semibold">Open commitments & follow-ups</h2>
          <div className="mt-4 space-y-2">
            {open.map((m) => <div key={m.id} className="rounded-xl border border-warn/30 bg-warn/5 p-3 text-sm"><TypeBadge type={m.type} /><p className="mt-2">{m.text}</p></div>)}
            {!open.length && <p className="text-sm text-muted-foreground">All caught up.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
