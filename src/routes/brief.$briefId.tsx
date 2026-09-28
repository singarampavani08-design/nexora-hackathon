import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, BrainCircuit, CheckSquare, Clock, HelpCircle, MessagesSquare, Target, Info } from "lucide-react";
import { useAppState } from "@/lib/store";
import { Avatar, Card, Relevance, TypeBadge, btnGhost, btnPrimary } from "@/components/nx";
import { fmtDate } from "@/lib/types";

export const Route = createFileRoute("/brief/$briefId")({
  head: () => ({
    meta: [
      { title: "Meeting Brief – Nexora" },
      { name: "description", content: "A personalized meeting brief generated from recalled meeting memory." },
      { property: "og:title", content: "Meeting Brief – Nexora" },
      { property: "og:description", content: "Personalized prep generated from persistent memory." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BriefPage,
});

function Section({ icon: Icon, title, items, tone = "text-primary", delay }: { icon: typeof Info; title: string; items: string[]; tone?: string; delay: number }) {
  return (
    <Card className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <p className="flex items-center gap-2 font-display font-semibold"><Icon className={`h-4 w-4 ${tone}`} /> {title}</p>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm">{items.map((t, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />{t}</li>)}</ul>
      ) : <p className="mt-3 text-sm text-muted-foreground">Nothing recorded yet.</p>}
    </Card>
  );
}

function BriefPage() {
  const { briefId } = Route.useParams();
  const s = useAppState();
  const [hydrated, setHydrated] = useState(false);
  const [showSources, setShowSources] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  const brief = s.briefs.find((b) => b.id === briefId);

  let body: ReactNode;
  if (!hydrated) body = <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-32 animate-shimmer rounded-2xl" />)}</div>;
  else if (!brief) body = (
    <Card className="text-center"><p className="font-semibold">Brief not found</p><Link to="/prepare" className={btnPrimary + " mt-4"}>Prepare a meeting</Link></Card>
  );
  else {
    const c = s.contacts.find((x) => x.id === brief.contactId)!;
    body = (
      <>
        <Card className="relative mb-6 overflow-hidden p-7 animate-fade-up">
          <div className="absolute inset-0 bg-brand opacity-10" />
          <div className="relative flex flex-wrap items-center gap-4">
            <Avatar contact={c} size={56} />
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Meeting brief</p>
              <h1 className="mt-1 text-2xl font-semibold md:text-3xl">{brief.title}</h1>
              <p className="text-sm text-muted-foreground">{c.name} · {c.role}, {c.company} · {fmtDate(brief.date)}</p>
            </div>
            <button onClick={() => setShowSources((v) => !v)} className={btnGhost}><BrainCircuit className="h-4 w-4" /> {showSources ? "Hide" : "View"} Memory Sources ({brief.sources.length})</button>
          </div>
        </Card>

        <Card className="mb-6 border-primary/40 glow animate-fade-up">
          <p className="flex items-center gap-2 font-display font-semibold"><Target className="h-4 w-4 text-violet" /> Recommended focus</p>
          <p className="mt-2">{brief.focus}</p>
        </Card>

        {showSources && (
          <Card className="mb-6 animate-fade-up">
            <p className="font-display font-semibold">Memory sources recalled from Hindsight</p>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {brief.sources.map((m) => (
                <div key={m.id} className="rounded-xl border border-border bg-secondary/40 p-3">
                  <div className="flex items-center justify-between"><TypeBadge type={m.type} /><Relevance value={m.relevance} /></div>
                  <p className="mt-2 text-sm">{m.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{fmtDate(m.date)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Section icon={MessagesSquare} title="Previous discussion" items={brief.previousDiscussion} delay={0} />
          <Section icon={AlertTriangle} title="Key concerns" items={brief.concerns} tone="text-destructive" delay={60} />
          <Section icon={CheckSquare} title="Commitments made" items={brief.commitments} tone="text-violet" delay={120} />
          <Section icon={Clock} title="Pending follow-ups" items={brief.followups} tone="text-warn" delay={180} />
          <Section icon={Info} title="Relevant context & preferences" items={brief.context} tone="text-cyan" delay={240} />
          <Section icon={HelpCircle} title="Suggested questions" items={brief.questions} tone="text-success" delay={300} />
        </div>
      </>
    );
  }

  return <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">{body}</div>;
}
