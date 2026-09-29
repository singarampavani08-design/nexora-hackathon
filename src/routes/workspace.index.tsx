import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, MessageSquare, Radio, Users } from "lucide-react";
import { useAppState } from "@/lib/store";
import { Avatar, Card, PageHeader, btnPrimary } from "@/components/nx";
import { fmtDate } from "@/lib/types";

export const Route = createFileRoute("/workspace/")({
  head: () => ({
    meta: [
      { title: "Meeting Workspaces – Nexora" },
      { name: "description", content: "Select a meeting to enter the live RTMS workspace and transcript feed." },
    ],
  }),
  component: WorkspaceIndexPage,
});

function WorkspaceIndexPage() {
  const s = useAppState();
  const contact = (id: string) => s.contacts.find((c) => c.id === id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <PageHeader
        eyebrow="Live Collaboration"
        title="Meeting Workspaces"
        desc="Enter an active or past meeting workspace to view real-time transcripts, Zoom RTMS streams, and memory capture."
      />

      <div className="mt-8 space-y-4">
        {s.meetings.map((m) => {
          const c = contact(m.contactId);
          return (
            <Card key={m.id} className="lift flex flex-wrap items-center justify-between gap-4 p-5 animate-fade-up">
              <div className="flex items-center gap-4">
                {c ? <Avatar contact={c} size={48} /> : <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{m.title}</span>
                    {(m.zoomMeetingId ?? m.zoom_meeting_id) && (
                      <span className="rounded-md border border-border bg-secondary/80 px-2 py-0.5 text-xs font-mono text-muted-foreground">
                        Zoom
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {c ? `${c.name} · ${c.company}` : "Meeting"} · {fmtDate(m.date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs ${m.status === "upcoming" ? "bg-violet/15 text-violet" : "bg-primary/10 text-primary"}`}>
                  {m.status === "upcoming" ? "Upcoming" : "Completed"}
                </span>
                <Link
                  to="/workspace/$meetingId"
                  params={{ meetingId: m.id }}
                  className={btnPrimary + " !px-4 !py-2 text-xs"}
                >
                  <Radio className="h-3.5 w-3.5" /> Open Workspace
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
