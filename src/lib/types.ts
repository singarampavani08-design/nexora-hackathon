export type MemoryType = "discussion" | "concern" | "decision" | "commitment" | "followup" | "preference";

export interface Contact {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  hue: number;
}

export interface Meeting {
  id: string;
  contactId: string;
  title: string;
  date: string; // ISO
  purpose: string;
  status: "completed" | "upcoming";
  summary?: string;
  zoomMeetingId?: string | null;
  zoomJoinUrl?: string | null;
  zoom_meeting_id?: string | null;
  zoom_join_url?: string | null;
}

export interface Memory {
  id: string;
  contactId: string;
  meetingId: string;
  type: MemoryType;
  text: string;
  date: string;
  topics: string[];
  status?: "open" | "done" | undefined;
  confidence?: number; // 0–1, from Supabase (shown where relevance is shown for recalled items)
}

export interface RecalledMemory extends Memory {
  relevance: number; // 0-100
}

export interface Brief {
  id: string;
  contactId: string;
  title: string;
  date: string;
  purpose: string;
  createdAt: string;
  previousDiscussion: string[];
  concerns: string[];
  commitments: string[];
  followups: string[];
  context: string[];
  questions: string[];
  focus: string;
  sources: RecalledMemory[];
}

export const TYPE_META: Record<MemoryType, { label: string; cls: string }> = {
  discussion: { label: "Discussion", cls: "text-primary bg-primary/10 border-primary/30" },
  concern: { label: "Concern", cls: "text-destructive bg-destructive/10 border-destructive/30" },
  decision: { label: "Decision", cls: "text-success bg-success/10 border-success/30" },
  commitment: { label: "Commitment", cls: "text-violet bg-violet/10 border-violet/30" },
  followup: { label: "Follow-up", cls: "text-warn bg-warn/10 border-warn/30" },
  preference: { label: "Preference", cls: "text-cyan bg-cyan/10 border-cyan/30" },
};

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
