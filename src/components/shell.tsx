import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BrainCircuit, MessageSquare, Play, Send, X, Square } from "lucide-react";
import { useApp, DEMO_STEPS } from "./app-context";
import { askNexora } from "@/lib/hindsight";
import { btnPrimary, inputCls } from "./nx";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/prepare", label: "Prepare" },
  { to: "/workspace", label: "Workspace" },
  { to: "/memory", label: "Memory" },
  { to: "/contacts", label: "Contacts" },
  { to: "/history", label: "History" },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand glow">
        <BrainCircuit className="h-5 w-5 text-primary-foreground" />
      </span>
      <span className="font-display text-lg font-semibold">Nexora</span>
    </Link>
  );
}

import { useAuth } from "@/lib/auth-context";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";

export function Header() {
  const { setAssistantOpen, startDemo, demoStep } = useApp();
  const { user, isAuthenticated, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 md:px-6">
        <Logo />
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground" activeProps={{ className: "text-foreground bg-secondary" }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setAssistantOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-secondary">
            <MessageSquare className="h-4 w-4" /> <span className="hidden sm:inline">Ask Nexora</span>
          </button>
          <button onClick={startDemo} disabled={demoStep >= 0} className={btnPrimary + " !px-4 !py-2"}>
            <Play className="h-4 w-4" /> Launch Demo
          </button>

          {/* User Auth Action */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 pl-1 border-l border-border">
              <div className="hidden sm:flex items-center gap-2 rounded-xl bg-secondary/40 px-2.5 py-1 text-xs">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary/20 text-[11px] font-bold text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[100px] truncate font-medium">{user.name.split(" ")[0]}</span>
              </div>
              <button
                onClick={() => signOut()}
                title="Sign out"
                className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20"
            >
              <LogIn className="h-4 w-4" /> Sign In
            </Link>
          )}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-muted-foreground" activeProps={{ className: "text-foreground bg-secondary" }}>{l.label}</Link>
        ))}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">AI Meeting Prep Agent · Powered by AI + Hindsight Memory</p>
        </div>
        <div className="text-sm text-muted-foreground md:text-right">
          <p className="font-semibold text-foreground">Built by Team Nexora</p>
          <p className="mt-1">Sahithi · Supriya · Pavani · Pavithra · Sandhya · Greeshma</p>
        </div>
      </div>
    </footer>
  );
}

type Msg = { role: "user" | "ai"; text: string };

export function AssistantPanel() {
  const { assistantOpen, setAssistantOpen, pendingQuestion, clearPending } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "ai", text: "Hi! I'm Nexora. Ask me about past meetings, concerns, or commitments — I answer from memory." }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const ask = (q: string) => {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { role: "ai", text: askNexora(q).answer }]);
      setThinking(false);
    }, 900);
  };

  useEffect(() => {
    if (pendingQuestion) { ask(pendingQuestion); clearPending(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuestion]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, thinking]);

  return (
    <>
      <div onClick={() => setAssistantOpen(false)} className={`fixed inset-0 z-50 bg-background/60 backdrop-blur-sm transition-opacity ${assistantOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <aside className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-popover transition-transform duration-300 ${assistantOpen ? "translate-x-0" : "translate-x-full"}`} aria-hidden={!assistantOpen}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand"><BrainCircuit className="h-4 w-4 text-primary-foreground" /></span>
            <div><p className="font-display font-semibold">Nexora AI</p><p className="text-xs text-muted-foreground">Grounded in your meeting memory</p></div>
          </div>
          <button onClick={() => setAssistantOpen(false)} aria-label="Close" className="rounded-lg p-2 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {msgs.map((m, i) => (
            <div key={i} className={`animate-fade-up whitespace-pre-line text-sm leading-relaxed ${m.role === "user" ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground" : "max-w-[95%] text-foreground"}`}>{m.text}</div>
          ))}
          {thinking && <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> Recalling memories…</div>}
          <div ref={end} />
        </div>
        <div className="border-t border-border p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {["What did we promise Rahul?", "What is Priya worried about?", "Any pending follow-ups?"].map((s) => (
              <button key={s} onClick={() => ask(s)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground">{s}</button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about a contact or commitment…" className={inputCls} />
            <button className={btnPrimary + " !px-3"} aria-label="Send"><Send className="h-4 w-4" /></button>
          </form>
        </div>
      </aside>
    </>
  );
}

export function DemoOverlay() {
  const { demoStep, stopDemo } = useApp();
  if (demoStep < 0 || !DEMO_STEPS[demoStep]) return null;
  const step = DEMO_STEPS[demoStep]!;
  return (
    <div className="fixed bottom-5 left-1/2 z-[60] w-[min(640px,calc(100%-2rem))] -translate-x-1/2 animate-fade-up">
      <div className="glass rounded-2xl border-primary/40 p-4 glow" key={demoStep}>
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-brand px-2 py-1 text-xs font-bold text-primary-foreground">{demoStep + 1}/{DEMO_STEPS.length}</span>
          <p className="flex-1 text-sm">{step.caption}</p>
          <button onClick={stopDemo} className="rounded-lg p-1 text-muted-foreground hover:text-foreground" aria-label="Stop demo"><Square className="h-4 w-4" /></button>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-brand" style={{ animation: `grow ${step.ms}ms linear forwards` }} />
        </div>
        <style>{`@keyframes grow{from{width:0}to{width:100%}}`}</style>
      </div>
    </div>
  );
}
