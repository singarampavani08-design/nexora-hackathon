import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Filter,
  Flame,
  MessageSquare,
  Play,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  User,
  Video,
  Volume2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/lib/store";
import { Avatar, Card, PageHeader, btnGhost, btnPrimary, inputCls } from "@/components/nx";
import { fmtDate } from "@/lib/types";
import { getSupabase } from "@/lib/supabase/client";
import type { MeetingTranscriptRow } from "@/lib/supabase/database.types";
import { getMeetingTranscriptsFn, getRtmsStatusFn, simulateTranscriptChunkFn } from "@/lib/rtms/server-fns";

export const Route = createFileRoute("/workspace/$meetingId")({
  head: () => ({
    meta: [
      { title: "Meeting Workspace – Nexora" },
      { name: "description", content: "Real-time meeting workspace with live Zoom RTMS transcript stream." },
      { property: "og:title", content: "Meeting Workspace – Nexora" },
      { property: "og:description", content: "Live Zoom RTMS transcript ingestion and memory capture." },
    ],
  }),
  component: MeetingWorkspacePage,
});

const SIMULATION_SCRIPTS = [
  { speaker: "Alex Vance", text: "Welcome everyone! Today we're reviewing the enterprise security checklist and Q4 rollout timeline." },
  { speaker: "Sarah Jenkins", text: "Thanks Alex. On our side, SOC2 Type II compliance certification is now complete and ready for review." },
  { speaker: "Alex Vance", text: "That is fantastic news. What about the data residency requirements for our EU customers?" },
  { speaker: "Sarah Jenkins", text: "We have dedicated Frankfurt hosting ready to deploy. I will email the architecture diagrams by Friday." },
  { speaker: "Alex Vance", text: "Perfect commitment. Let's schedule our follow-up review for next Tuesday at 2:00 PM." },
  { speaker: "Sarah Jenkins", text: "Agreed. I'll prepare the pricing comparison document for the 250 seat expansion before then." },
];

function MeetingWorkspacePage() {
  const { meetingId } = Route.useParams();
  const s = useAppState();

  const meeting = s.meetings.find((m) => m.id === meetingId);
  const contact = meeting ? s.contacts.find((c) => c.id === meeting.contactId) : undefined;

  const [transcripts, setTranscripts] = useState<MeetingTranscriptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("all");
  const [rtmsStatus, setRtmsStatus] = useState<{
    configured: boolean;
    webhookSecretConfigured: boolean;
    activeSessions: Array<{ streamId: string; status: string; packetsReceived: number }>;
    webhookPath: string;
  } | null>(null);

  const [simulating, setSimulating] = useState(false);
  const [dedupCount, setDedupCount] = useState(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch initial transcripts
  const fetchTranscripts = async () => {
    try {
      const res = await getMeetingTranscriptsFn({ data: { meetingId } });
      if (res.ok) {
        setTranscripts(res.data);
      }
    } catch (err) {
      console.error("Failed to load transcripts:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch RTMS status
  const fetchRtmsStatus = async () => {
    try {
      const res = await getRtmsStatusFn();
      if (res.ok) setRtmsStatus(res.data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchTranscripts();
    fetchRtmsStatus();

    // 3. Supabase Realtime Subscription for instant live transcript display
    let channel: ReturnType<typeof sb.channel> | null = null;
    let sb: ReturnType<typeof getSupabase>;
    try {
      sb = getSupabase();
      channel = sb
        .channel(`meeting-transcripts-${meetingId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "meeting_transcripts",
            filter: `meeting_id=eq.${meetingId}`,
          },
          (payload) => {
            const newChunk = payload.new as MeetingTranscriptRow;
            setTranscripts((prev) => {
              if (prev.some((t) => t.id === newChunk.id || (t.chunk_id && t.chunk_id === newChunk.chunk_id))) {
                setDedupCount((c) => c + 1);
                return prev;
              }
              return [...prev, newChunk];
            });
          },
        )
        .subscribe();
    } catch (err) {
      console.warn("Supabase realtime not available, polling fallback will handle updates:", err);
    }

    // 4. Polling fallback (every 3 seconds)
    const interval = setInterval(fetchTranscripts, 3000);

    return () => {
      clearInterval(interval);
      if (channel && sb) sb.removeChannel(channel);
    };
  }, [meetingId]);

  // Auto-scroll on new transcript chunks
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts.length]);

  // Run simulated RTMS stream
  const handleSimulateStream = async () => {
    if (simulating) return;
    setSimulating(true);
    toast.info("Simulating incoming Zoom RTMS transcript stream...");

    for (let i = 0; i < SIMULATION_SCRIPTS.length; i++) {
      const item = SIMULATION_SCRIPTS[i];
      if (!item) continue;
      try {
        await simulateTranscriptChunkFn({
          data: {
            meetingId,
            speakerName: item.speaker,
            text: item.text,
          },
        });
        await fetchTranscripts();
      } catch (e) {
        console.error("Simulation error:", e);
      }
      await new Promise((r) => setTimeout(r, 1200));
    }

    setSimulating(false);
    toast.success("RTMS transcript stream simulation completed!");
  };

  const copyTranscriptText = () => {
    const text = transcripts
      .map((t) => `[${t.speaker_name ?? "Participant"}] ${t.transcript_text}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Transcript copied to clipboard!");
  };

  // Filter transcripts
  const filtered = transcripts.filter((t) => {
    const matchesSpeaker = selectedSpeaker === "all" || (t.speaker_name ?? "Participant") === selectedSpeaker;
    const matchesQuery = !searchQuery || t.transcript_text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSpeaker && matchesQuery;
  });

  const uniqueSpeakers = Array.from(new Set(transcripts.map((t) => t.speaker_name ?? "Participant")));

  // Detect live commitments or key actions from transcript
  const detectedCommitments = transcripts.filter((t) =>
    /(will |promise|agree|schedule|by Friday|next Tuesday|deadline|send you|email you)/i.test(t.transcript_text),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      {/* Top Breadcrumb & Status */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link to="/history" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to History
        </Link>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
            <Radio className="h-3.5 w-3.5 animate-pulse text-success" />
            RTMS Live Ingestion Active
          </span>
          {dedupCount > 0 && (
            <span className="rounded-full border border-violet/30 bg-violet/10 px-2.5 py-1 text-xs text-violet">
              {dedupCount} duplicates filtered
            </span>
          )}
        </div>
      </div>

      {/* Meeting Header Card */}
      <Card className="relative mb-6 overflow-hidden p-6 md:p-8 animate-fade-up">
        <div className="absolute inset-0 bg-brand opacity-10 pointer-events-none" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {contact ? <Avatar contact={contact} size={56} /> : <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10"><User className="h-7 w-7 text-primary" /></div>}
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary">Meeting Workspace</span>
                {(meeting?.zoomMeetingId ?? meeting?.zoom_meeting_id) && (
                  <span className="rounded-md border border-border bg-secondary/80 px-2 py-0.5 text-xs font-mono text-muted-foreground">
                    Zoom ID: {meeting?.zoomMeetingId ?? meeting?.zoom_meeting_id}
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-2xl font-semibold md:text-3xl">{meeting?.title ?? "Meeting Workspace"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {contact ? `${contact.name} · ${contact.role}, ${contact.company}` : "Active Session"} ·{" "}
                {meeting ? fmtDate(meeting.date) : "Today"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(meeting?.zoomJoinUrl ?? meeting?.zoom_join_url) && (
              <a
                href={(meeting?.zoomJoinUrl ?? meeting?.zoom_join_url) as string}
                target="_blank"
                rel="noreferrer"
                className={btnPrimary + " !px-4 !py-2"}
              >
                <Video className="h-4 w-4" /> Join Zoom Meeting
              </a>
            )}
            <button
              onClick={handleSimulateStream}
              disabled={simulating}
              className={btnGhost + " border border-border"}
            >
              <Play className={`h-4 w-4 text-violet ${simulating ? "animate-spin" : ""}`} />
              {simulating ? "Streaming RTMS..." : "Simulate RTMS Stream"}
            </button>
            <button onClick={fetchTranscripts} className="rounded-xl border border-border p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Main Grid: Live Transcripts + Sidebar Diagnostics */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Live Transcript Stream */}
        <div className="space-y-4 lg:col-span-2">
          {/* Transcript Controls */}
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-1 items-center gap-2 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transcript..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={selectedSpeaker}
                onChange={(e) => setSelectedSpeaker(e.target.value)}
                className="rounded-lg border border-border bg-secondary/50 px-2.5 py-1 text-xs outline-none"
              >
                <option value="all">All speakers ({uniqueSpeakers.length})</option>
                {uniqueSpeakers.map((sp) => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
              <button
                onClick={copyTranscriptText}
                disabled={!transcripts.length}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
          </Card>

          {/* Transcript Scroll Area */}
          <Card className="min-h-[500px] max-h-[640px] flex flex-col p-5 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-semibold">Live Real-Time Transcript</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {transcripts.length} chunks
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="h-2 w-2 animate-ping rounded-full bg-success" /> Connected
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-1">
              {loading && !transcripts.length ? (
                <div className="py-20 text-center text-sm text-muted-foreground">
                  <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
                  Connecting to live transcript stream...
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary">
                    <MessageSquare className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="mt-4 font-semibold">No transcript chunks yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Start speaking in your Zoom meeting or click "Simulate RTMS Stream" above to stream chunks.
                  </p>
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const isHost = (item.speaker_name ?? "").toLowerCase().includes("alex") || idx % 2 === 0;
                  return (
                    <div
                      key={item.id || idx}
                      className="animate-fade-up rounded-xl border border-border bg-secondary/30 p-3.5 transition hover:bg-secondary/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                              isHost ? "bg-primary/20 text-primary" : "bg-violet/20 text-violet"
                            }`}
                          >
                            {(item.speaker_name ?? "P").charAt(0).toUpperCase()}
                          </span>
                          <span className="text-sm font-medium">{item.speaker_name ?? "Participant"}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Live"}
                          </span>
                        </div>
                        {item.chunk_id && (
                          <span className="text-[10px] font-mono text-muted-foreground/60" title={`Dedup Chunk: ${item.chunk_id}`}>
                            #{item.chunk_id.slice(0, 6)}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/90 pl-8">{item.transcript_text}</p>
                    </div>
                  );
                })
              )}
              <div ref={transcriptEndRef} />
            </div>
          </Card>
        </div>

        {/* Right Column: AI Extraction & RTMS Diagnostics */}
        <div className="space-y-4">
          {/* Detected Live Commitments & Action Items */}
          <Card className="p-5 animate-fade-up">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet" />
              <h3 className="font-display text-sm font-semibold">Live Commitments & Decisions</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Extracted automatically from the real-time transcript stream.
            </p>

            <div className="mt-4 space-y-2.5">
              {detectedCommitments.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Listening for commitments and follow-ups...
                </p>
              ) : (
                detectedCommitments.slice(-4).map((c, i) => (
                  <div key={i} className="rounded-xl border border-violet/30 bg-violet/10 p-3 text-xs">
                    <p className="font-semibold text-violet">{c.speaker_name ?? "Speaker"}</p>
                    <p className="mt-1 text-foreground/90">{c.transcript_text}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* RTMS Protocol & Webhook Health */}
          <Card className="p-5 animate-fade-up">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-semibold">Zoom RTMS Integration Status</h3>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Protocol</span>
                <span className="font-semibold text-primary">Zoom RTMS WebSocket v1.0</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Webhook Endpoint</span>
                <span className="font-mono text-[11px] text-foreground">/api/zoom/rtms</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">CRC Validation</span>
                <span className="inline-flex items-center gap-1 font-semibold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Supported (HMAC-SHA256)
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Deduplication</span>
                <span className="font-semibold text-foreground">Active (SHA-256 Hashes)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">OAuth S2S</span>
                <span className={`font-semibold ${rtmsStatus?.configured ? "text-success" : "text-warn"}`}>
                  {rtmsStatus?.configured ? "Configured" : "Missing credentials"}
                </span>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-5 animate-fade-up">
            <h3 className="font-display text-sm font-semibold">Quick Actions</h3>
            <div className="mt-3 space-y-2">
              {contact && (
                <Link
                  to="/prepare"
                  search={{ contact: contact.id, title: meeting?.title }}
                  className="flex w-full items-center justify-between rounded-xl border border-border p-3 text-xs hover:bg-secondary"
                >
                  <span>Generate Pre-brief for {contact.name.split(" ")[0]}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              )}
              <Link
                to="/memory"
                className="flex w-full items-center justify-between rounded-xl border border-border p-3 text-xs hover:bg-secondary"
              >
                <span>Browse Memory Nexus</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
