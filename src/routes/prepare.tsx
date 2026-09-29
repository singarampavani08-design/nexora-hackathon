import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, BrainCircuit, CalendarCheck, Check, Sparkles as SparkIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { setState, useAppState } from "@/lib/store";
import { recallMeetingMemory, reflectOnMeetingContext } from "@/lib/hindsight";
import { createMeeting } from "@/lib/supabase/service";
import { createZoomMeetingFn } from "@/lib/zoom";
import { rowToMeeting } from "@/lib/supabase/mappers";
import { Avatar, Card, PageHeader, Relevance, StatusBanner, TypeBadge, btnGhost, btnPrimary, inputCls } from "@/components/nx";

const search = z.object({
  contact: z.string().optional(),
  title: z.string().optional(),
  purpose: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  auto: z.boolean().optional(),
});

export const Route = createFileRoute("/prepare")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Prepare a Meeting – Nexora" },
      { name: "description", content: "Generate a personalized meeting brief from everything Nexora remembers about your contact." },
      { property: "og:title", content: "Prepare a Meeting – Nexora" },
      { property: "og:description", content: "Personalized meeting briefs from persistent memory." },
    ],
  }),
  component: Prepare,
});

const STEPS = ["Recalling past meetings", "Ranking relevant memories", "Reflecting on context", "Writing your brief"];

/** HH:MM:SS or null — matches the Supabase `meetings.meeting_time` column. */
function toDbTime(t: string): string | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t.trim());
  if (!m) return null;
  const h = Math.min(23, Number(m[1]));
  return `${String(h).padStart(2, "0")}:${m[2]}:${m[3] ?? "00"}`;
}

function Prepare() {
  const sp = Route.useSearch();
  const s = useAppState();
  const navigate = useNavigate();
  const [contactId, setContactId] = useState(sp.contact ?? "");
  const [title, setTitle] = useState(sp.title ?? "");
  const [purpose, setPurpose] = useState(sp.purpose ?? (sp.auto ? "Finalize pricing and rollout plan for 200 seats" : ""));
  const [date, setDate] = useState(sp.date ?? "");
  const [time, setTime] = useState(sp.time ?? "10:00");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{
    id: string;
    title: string;
    date: string;
    time: string | null;
    contactName: string;
    zoomJoinUrl: string | null;
    zoomWarning: string | null;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const autoRan = useRef(false);
  // Synchronous double-submit guard: a ref check happens even if a second
  // click lands before React re-renders with the disabled button.
  const submitting = useRef(false);

  const contact = s.contacts.find((c) => c.id === contactId);
  const preview = contact ? recallMeetingMemory({ contactId, query: `${title} ${purpose}`, limit: 6 }) : [];

  const generate = async () => {
    // 1. Validate required fields.
    if (!contactId || !title.trim() || !date) {
      setError("Please choose a contact and fill in the meeting title and date.");
      toast.error("Please choose a contact and fill in the meeting title and date.");
      return;
    }
    if (submitting.current) return; // ignore double-click / repeat submits
    setError(null);
    setSaving(true);
    submitting.current = true;

    // 2. Create a REAL Zoom meeting (server-side S2S OAuth) so its ids can be
    //    stored with the insert. Failure must NOT block the meeting — we save
    //    it anyway and surface a clear warning. (Demo/?auto path skips Zoom.)
    let zoom: { zoomMeetingId: string; joinUrl: string } | null = null;
    let zoomWarning: string | null = null;
    if (!sp.auto) {
      const dbTime = toDbTime(time) ?? "09:00:00";
      const zres = await createZoomMeetingFn({
        data: { topic: title.trim(), startTime: new Date(`${date}T${dbTime}Z`).toISOString() },
      });
      if (zres.ok) zoom = zres.data;
      else zoomWarning = `Zoom link couldn't be created: ${zres.error}`;
    }

    // 3. Save the meeting to Supabase so it survives refresh.
    //    Internal Nexora meeting ID = the meetings.id UUID (returned by the DB).
    const res = await createMeeting({
      contact_id: contactId,
      title: title.trim(),
      purpose: purpose.trim() || null,
      meeting_date: date,
      meeting_time: toDbTime(time),
      status: "upcoming", // scheduled-but-not-held; UI label "Scheduled"
      ...(zoom ? { zoom_meeting_id: zoom.zoomMeetingId, zoom_join_url: zoom.joinUrl } : {}),
    });
    if (!res.ok) {
      setSaving(false);
      submitting.current = false;
      setError(
        zoom
          ? "The meeting was created in Zoom but couldn't be saved to the database. Please try again — you may want to delete the Zoom meeting first."
          : "We couldn't save your meeting to the database. Please try again.",
      );
      toast.error("Something went wrong while saving the meeting. Please try again.");
      return;
    }
    // 3. Update the UI immediately (dashboard/history read from this store).
    const savedRow = rowToMeeting(res.data);
    setState((s) => ({ ...s, meetings: [...s.meetings, savedRow] }));
    setSaving(false);
    // 4. Demo/?auto path only: still run the local reflect step to produce a brief.
    //    Manual flow stops here — no Hindsight call (future brick).
    if (!sp.auto) {
      setSaved({
        id: savedRow.id,
        title: savedRow.title,
        date: savedRow.date,
        time: toDbTime(time),
        contactName: contact?.name ?? "your contact",
        zoomJoinUrl: zoom?.joinUrl ?? null,
        zoomWarning,
      });
      toast.success("Meeting saved to your database.");
      return;
    }
    setGenerating(true);
    for (let i = 0; i < STEPS.length; i++) { setStep(i); await new Promise((r) => setTimeout(r, 650)); }
    const brief = await reflectOnMeetingContext({ contactId, title: title || "Meeting", date: new Date(`${date}T09:00:00Z`).toISOString(), purpose });
    navigate({ to: "/brief/$briefId", params: { briefId: brief.id } });
  };

  useEffect(() => {
    if (sp.auto && !autoRan.current) { autoRan.current = true; const t = setTimeout(generate, 1200); return () => clearTimeout(t); }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.auto]);

  const createAnother = () => {
    submitting.current = false;
    setSaved(null);
    setTitle("");
    setPurpose("");
    setError(null);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <PageHeader eyebrow="Prepare" title="Prepare for your next meeting" desc="Nexora recalls everything relevant about this contact and writes a personalized brief." />
      <StatusBanner loading={s.loading && s.contacts.length === 0} error={error ?? s.error} />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          {saving ? (
            <div className="py-10 text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand glow"><SparkIcon className="h-9 w-9 animate-pulse text-primary-foreground" /></div>
              <p className="mt-6 font-display text-lg font-semibold">Saving your meeting…</p>
              <p className="mt-2 text-sm text-muted-foreground">Storing it safely in your database.</p>
            </div>
          ) : saved ? (
            <div className="py-10 text-center animate-fade-up">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success/15"><CalendarCheck className="h-9 w-9 text-success" /></div>
              <p className="mt-6 font-display text-lg font-semibold">Meeting scheduled</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {saved.title} with {saved.contactName} on {new Date(saved.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                {saved.time ? ` at ${saved.time.slice(0, 5)}` : ""}.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">Nexora meeting ID: {saved.id.slice(0, 8)}…</p>
              {saved.zoomJoinUrl && (
                <div className="mt-4">
                  <a href={saved.zoomJoinUrl} target="_blank" rel="noreferrer" className={btnGhost}>
                    <CalendarCheck className="h-4 w-4" /> Join Zoom meeting
                  </a>
                </div>
              )}
              {saved.zoomWarning && (
                <div className="mx-auto mt-4 flex max-w-md items-center gap-3 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-left text-sm text-warn">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {saved.zoomWarning}
                </div>
              )}
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/workspace/$meetingId" params={{ meetingId: saved.id }} className={btnPrimary}>
                  Open Meeting Workspace <ArrowRight className="h-4 w-4" />
                </Link>
                <button onClick={createAnother} className={btnGhost}><SparkIcon className="h-4 w-4" /> Schedule another</button>
                <Link to="/dashboard" className={btnGhost}>Dashboard</Link>
              </div>
            </div>
          ) : generating ? (
            <div className="py-10">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand glow"><BrainCircuit className="h-9 w-9 animate-pulse text-primary-foreground" /></div>
              <p className="mt-6 text-center font-display text-lg font-semibold">Generating brief for {contact?.name ?? "…"}</p>
              <div className="mx-auto mt-6 max-w-sm space-y-3">
                {STEPS.map((st, i) => (
                  <div key={st} className={`flex items-center gap-3 text-sm transition ${i <= step ? "text-foreground" : "text-muted-foreground/50"}`}>
                    <span className={`grid h-5 w-5 place-items-center rounded-full ${i < step ? "bg-success" : i === step ? "animate-pulse bg-primary" : "bg-muted"}`}>{i < step && <Check className="h-3 w-3 text-background" />}</span>
                    {st}
                  </div>
                ))}
              </div>
              <div className="mt-8 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-4 animate-shimmer rounded" style={{ width: `${90 - i * 15}%` }} />)}</div>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); generate(); }} className="space-y-5">
              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Contact</label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {s.contacts.map((c) => (
                    <button type="button" key={c.id} onClick={() => setContactId(c.id)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${c.id === contactId ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}>
                      <Avatar contact={c} size={34} />
                      <div className="min-w-0"><p className="truncate text-sm font-semibold">{c.name}</p><p className="truncate text-xs text-muted-foreground">{c.company}</p></div>
                    </button>
                  ))}
                </div>
                {!s.contacts.length && !s.loading && <p className="mt-2 text-sm text-muted-foreground">No contacts yet — add one in Supabase to get started.</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="text-sm font-medium">Meeting title</label><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Pricing discussion" className={inputCls + " mt-2"} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">Date</label><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls + " mt-2"} /></div>
                  <div><label className="text-sm font-medium">Time</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls + " mt-2"} /></div>
                </div>
              </div>
              <div><label className="text-sm font-medium">Purpose</label><textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} placeholder="What do you want to achieve?" className={inputCls + " mt-2"} /></div>
              <button type="submit" disabled={saving} className={btnPrimary + " w-full"}><SparkIcon className="h-4 w-4" /> Schedule meeting</button>
            </form>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-primary" /><h2 className="font-display font-semibold">Memory preview</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">{contact ? <>What Nexora remembers about {contact.name.split(" ")[0]}</> : "Pick a contact to preview their memory"}</p>
          <div className="mt-4 space-y-2">
            {preview.map((m, i) => (
              <div key={m.id} className="animate-fade-up rounded-xl border border-border bg-secondary/40 p-3" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between"><TypeBadge type={m.type} /><Relevance value={m.relevance} /></div>
                <p className="mt-2 text-sm">{m.text}</p>
              </div>
            ))}
            {contact && !preview.length && <p className="text-sm text-muted-foreground">No memories yet for this contact.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
