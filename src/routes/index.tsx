import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, BrainCircuit, CalendarClock, CheckCircle2, FileText, History, Layers, Play, Search, Sparkle, XCircle } from "lucide-react";
import { Card, TypeBadge, btnGhost, btnPrimary, inputCls } from "@/components/nx";
import { useApp } from "@/components/app-context";
import { retainMeetingMemory, recallMeetingMemory } from "@/lib/hindsight";
import type { Memory, RecalledMemory } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexora – Your AI Meeting Memory" },
      { name: "description", content: "Nexora remembers every conversation and turns it into a personalized prep brief for your next meeting." },
      { property: "og:title", content: "Nexora – Your AI Meeting Memory" },
      { property: "og:description", content: "Persistent meeting memory with Hindsight: past meetings become personalized briefs." },
    ],
  }),
  component: Landing,
});

const pipeline = [
  { icon: History, label: "Past Meetings", desc: "Notes & discussions" },
  { icon: BrainCircuit, label: "Hindsight Memory", desc: "Retained & structured" },
  { icon: Search, label: "Relevant Context", desc: "Recalled & ranked" },
  { icon: FileText, label: "Personalized Brief", desc: "Ready in seconds" },
];

import { useAuth } from "@/lib/auth-context";

function Landing() {
  const { startDemo } = useApp();
  const { isAuthenticated } = useAuth();

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6">
      {/* Hero */}
      <section className="pb-16 pt-16 text-center md:pt-24">
        <div className="mx-auto inline-flex animate-fade-up items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Powered by AI + Hindsight Memory
        </div>
        <h1 className="mx-auto mt-6 max-w-4xl animate-fade-up text-4xl font-semibold leading-[1.05] md:text-6xl" style={{ animationDelay: "80ms" }}>
          Your AI Meeting Memory.<br /><span className="text-gradient">Your Next Meeting Advantage.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-lg text-muted-foreground" style={{ animationDelay: "160ms" }}>
          Nexora remembers every conversation — concerns, decisions, promises — and prepares you for the next meeting with the same person.
        </p>
        <div className="mt-8 flex animate-fade-up flex-wrap justify-center gap-3" style={{ animationDelay: "240ms" }}>
          {isAuthenticated ? (
            <Link to="/dashboard" className={btnPrimary}>
              Enter Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link to="/login" search={{ tab: "signup" }} className={btnPrimary}>
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <button onClick={startDemo} className={btnGhost}><Play className="h-4 w-4" /> Launch 60s Demo</button>
          <Link to="/workspace" className={btnGhost}>Live Workspaces</Link>
        </div>

        {/* Pipeline */}
        <div id="pipeline" className="relative mx-auto mt-16 grid max-w-5xl gap-4 md:grid-cols-4">
          <div className="pointer-events-none absolute left-[12%] right-[12%] top-10 hidden h-px bg-border md:block">
            <span className="absolute -top-1 h-2 w-2 animate-flow rounded-full bg-primary glow" />
            <span className="absolute -top-1 h-2 w-2 animate-flow rounded-full bg-violet" style={{ animationDelay: "1.2s" }} />
          </div>
          {pipeline.map((p, i) => (
            <div key={p.label} className="relative animate-fade-up" style={{ animationDelay: `${300 + i * 120}ms` }}>
              <Card className="lift text-center">
                <span className={`mx-auto grid h-10 w-10 place-items-center rounded-xl ${i === 1 ? "bg-brand glow" : "bg-secondary"}`}><p.icon className="h-5 w-5" /></span>
                <p className="mt-3 font-display font-semibold">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="grid gap-8 py-16 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">The problem</p>
          <h2 className="mt-3 text-3xl font-semibold">You forget. Your contacts don't.</h2>
          <p className="mt-4 text-muted-foreground">Professionals juggle dozens of relationships. Before each meeting they dig through notes, emails and chats — and still miss the promise they made three weeks ago. Generic AI chat starts from zero every time.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[["68%", "of follow-ups slip through the cracks"], ["25 min", "spent hunting context per meeting"], ["0", "memory in generic chatbots"]].map(([v, l]) => (
            <Card key={l} className="lift"><p className="font-display text-2xl font-semibold text-gradient">{v}</p><p className="mt-1 text-xs text-muted-foreground">{l}</p></Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <h2 className="text-center text-3xl font-semibold">Memory is the product</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: Layers, t: "Retain", d: "Every meeting is distilled into discussions, concerns, decisions, commitments and preferences." },
            { icon: Search, t: "Recall", d: "When you prepare, Nexora retrieves the memories that matter, ranked by relevance and recency." },
            { icon: Sparkle, t: "Reflect", d: "A personalized brief: what to follow up on, what to avoid, and which questions to ask." },
            { icon: CheckCircle2, t: "Never drop a promise", d: "Open commitments surface automatically until you close the loop." },
            { icon: CalendarClock, t: "Timeline per contact", d: "See how every relationship evolved, meeting by meeting." },
            { icon: BrainCircuit, t: "Ask Nexora", d: "Ask \"What did we promise Rahul?\" and get answers grounded in memory." },
          ].map((f, i) => (
            <Card key={f.t} className="lift animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
              <f.icon className="h-5 w-5 text-primary" />
              <p className="mt-3 font-display font-semibold">{f.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </Card>
          ))}
        </div>
      </section>

      <MemoryInAction />
      <BeforeAfter />

      <section className="py-16">
        <Card className="relative overflow-hidden p-10 text-center">
          <div className="absolute inset-0 bg-brand opacity-10" />
          <h2 className="relative text-3xl font-semibold">Walk into every meeting remembering everything.</h2>
          <div className="relative mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/dashboard" className={btnPrimary}>Open dashboard</Link>
            <button onClick={startDemo} className={btnGhost}><Play className="h-4 w-4" /> Launch Demo</button>
          </div>
        </Card>
      </section>
    </div>
  );
}

const SAMPLE = "Rahul said the pilot results look strong. He is concerned about the cost of scaling to 200 seats. We agreed to start rollout with the data team first. We will send a discounted annual pricing option by Friday. Rahul prefers weekly written updates.";

function MemoryInAction() {
  const [notes, setNotes] = useState(SAMPLE);
  const [stage, setStage] = useState<"idle" | "retaining" | "retained" | "recalling" | "done">("idle");
  const [saved, setSaved] = useState<Memory[]>([]);
  const [recalled, setRecalled] = useState<RecalledMemory[]>([]);

  const retain = async () => {
    setStage("retaining");
    await new Promise((r) => setTimeout(r, 1200));
    setSaved(await retainMeetingMemory({ contactId: "rahul", title: "Live demo meeting", date: new Date().toISOString(), notes }));
    setStage("retained");
  };
  const recall = async () => {
    setStage("recalling");
    await new Promise((r) => setTimeout(r, 1400));
    setRecalled(recallMeetingMemory({ contactId: "rahul", query: "pricing rollout seats", limit: 5 }));
    setStage("done");
  };

  return (
    <section id="demo" className="py-16">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Memory in action</p>
        <h2 className="mt-3 text-3xl font-semibold">Watch Nexora Learn</h2>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-xs font-semibold text-primary">STEP 1 · First meeting with Rahul Sharma</p>
          <p className="mt-1 text-sm text-muted-foreground">Paste meeting notes. Nexora retains them as structured memory.</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className={inputCls + " mt-4"} />
          <button onClick={retain} disabled={stage === "retaining"} className={btnPrimary + " mt-3"}>
            {stage === "retaining" ? "Retaining memory…" : "Retain memory"}
          </button>
          <div className="mt-4 space-y-2">
            {stage === "retaining" && [0, 1, 2].map((i) => <div key={i} className="h-9 animate-shimmer rounded-lg" />)}
            {saved.map((m, i) => (
              <div key={m.id} className="flex animate-fade-up items-start gap-2 rounded-lg border border-border bg-secondary/40 p-2.5 text-sm" style={{ animationDelay: `${i * 120}ms` }}>
                <TypeBadge type={m.type} /> <span>{m.text}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className={stage === "idle" || stage === "retaining" ? "opacity-60" : ""}>
          <p className="text-xs font-semibold text-violet">STEP 2 · Two weeks later: next meeting</p>
          <p className="mt-1 text-sm text-muted-foreground">Nexora recalls what matters and builds your brief.</p>
          <button onClick={recall} disabled={stage === "idle" || stage === "retaining" || stage === "recalling"} className={btnPrimary + " mt-4"}>
            {stage === "recalling" ? "Recalling…" : "Prepare next meeting"}
          </button>
          {stage === "recalling" && (
            <div className="mt-6 flex items-center justify-center gap-3 py-6">
              <BrainCircuit className="h-8 w-8 animate-pulse text-primary" />
              <span className="text-sm text-muted-foreground">Searching Hindsight memory bank…</span>
            </div>
          )}
          {stage === "done" && (
            <div className="mt-4 space-y-2">
              {recalled.map((m, i) => (
                <div key={m.id} className="flex animate-fade-up items-center justify-between gap-2 rounded-lg border border-border bg-secondary/40 p-2.5 text-sm" style={{ animationDelay: `${i * 100}ms` }}>
                  <span className="flex-1">{m.text}</span>
                  <span className="text-xs font-semibold text-primary">{m.relevance}%</span>
                </div>
              ))}
              <Link to="/prepare" search={{ contact: "rahul", title: "Pricing & rollout discussion", auto: true }} className={btnGhost + " mt-2 w-full"}>Generate full brief <ArrowRight className="h-4 w-4" /></Link>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}

function BeforeAfter() {
  return (
    <section className="py-16">
      <h2 className="text-center text-3xl font-semibold">Before vs After</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Card>
          <p className="flex items-center gap-2 font-display font-semibold text-muted-foreground"><XCircle className="h-5 w-5 text-destructive" /> Without Memory</p>
          <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
            "Meeting with Rahul Sharma. Discuss pricing. Ask about their needs. Share product overview."
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• Generic agenda, no history</li><li>• Forgets the SOC 2 concern</li><li>• Misses the promised 200-seat pricing</li>
          </ul>
        </Card>
        <Card className="border-primary/40 glow">
          <p className="flex items-center gap-2 font-display font-semibold"><CheckCircle2 className="h-5 w-5 text-success" /> With Nexora Memory</p>
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            "Open with the 200-seat pricing you promised on Sep 16. Share bulk-sync benchmarks (latency concern). Rahul needs CFO sign-off — bring an ROI summary. Keep it concise and technical."
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li>• Recalls 3 past meetings</li><li>• Surfaces 2 open commitments</li><li>• Adapts to Rahul's preferences</li>
          </ul>
        </Card>
      </div>
    </section>
  );
}
