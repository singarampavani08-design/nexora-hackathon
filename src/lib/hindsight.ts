/**
 * Hindsight memory service layer.
 *
 * Three operations mirror Hindsight's memory model:
 *  - retainMeetingMemory     → store a meeting and extract structured memories
 *  - recallMeetingMemory     → retrieve the most relevant memories for a contact/query
 *  - reflectOnMeetingContext → reason over recalled memories to produce a prep brief
 *
 * The demo runs against a local persistent memory bank (browser storage) so it
 * works offline for judges. Swap the bodies of these functions for Hindsight
 * API calls (one memory bank per user) without touching any UI code.
 */
import { getState, setState } from "./store";
import { createMeeting, createMemory } from "./supabase/service";
import { rowToMeeting, rowToMemory } from "./supabase/mappers";
import type { Brief, Memory, MemoryType, RecalledMemory } from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);

const TOPICS = ["pricing", "security", "integration", "timeline", "onboarding", "budget", "api", "compliance", "roadmap", "support", "pilot", "contract", "analytics", "migration", "performance", "roi", "design", "latency", "sso"];
const TOPIC_ALIAS: Record<string, string> = { latency: "Performance", sso: "Security", api: "Integration", roi: "ROI" };

function extractTopics(text: string): string[] {
  const t = text.toLowerCase();
  const found = TOPICS.filter((k) => t.includes(k)).map((k) => TOPIC_ALIAS[k] ?? k.charAt(0).toUpperCase() + k.slice(1));
  return found.length ? Array.from(new Set(found)) : ["General"];
}

function classify(s: string): MemoryType {
  const t = s.toLowerCase();
  if (/(concern|worried|risk|issue|problem|hesitant|unsure|blocker|slow)/.test(t)) return "concern";
  if (/(we will|i will|i'll|we'll|promise|commit)/.test(t)) return "commitment";
  if (/(follow up|follow-up|send|share|schedule|circle back)/.test(t)) return "followup";
  if (/(decided|agreed|approved|chose|finali[sz]ed)/.test(t)) return "decision";
  if (/(prefer|likes|wants .* format)/.test(t)) return "preference";
  return "discussion";
}

export interface RetainInput {
  contactId: string;
  title: string;
  date: string;
  notes: string;
}

export async function retainMeetingMemory(input: RetainInput): Promise<Memory[]> {
  const sentences = input.notes.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 8);
  const drafts: Memory[] = sentences.map((text) => {
    const type = classify(text);
    return {
      id: `mem-${uid()}`,
      contactId: input.contactId,
      meetingId: "",
      type,
      text,
      date: input.date,
      topics: extractTopics(text),
      status: type === "commitment" || type === "followup" ? "open" : undefined,
    };
  });

  // Persist to Supabase first (meeting row, then its memories), so ids and
  // dates match what the rest of the app reads back from the database.
  const meetingRes = await createMeeting({
    contact_id: input.contactId,
    title: input.title,
    purpose: input.title,
    meeting_date: input.date.slice(0, 10),
    meeting_time: input.date.length > 10 ? input.date.slice(11, 19) : null,
    status: "completed",
    summary: sentences.slice(0, 2).join(" ") || null,
  });

  if (meetingRes.ok) {
    const dbMeeting = rowToMeeting(meetingRes.data);
    const inserted = await Promise.all(
      drafts.map((m) =>
        createMemory({
          meeting_id: meetingRes.data.id,
          contact_id: input.contactId,
          type: m.type,
          content: m.text,
          topics: m.topics,
          is_open: m.status === "open",
          confidence: 0.95,
        }),
      ),
    );
    const dbMemories = inserted
      .filter((r) => r.ok)
      .map((r) => (r.ok ? rowToMemory({ ...r.data, meetings: null }) : null))
      .filter((m): m is Memory => m !== null);
    if (dbMemories.length) {
      setState((s) => ({
        ...s,
        meetings: [...s.meetings, dbMeeting],
        memories: [...s.memories, ...dbMemories],
      }));
      return dbMemories;
    }
  }

  // Fallback: database unreachable — keep the demo running on local state only.
  console.error("[nexora:db] Retain could not reach the database; storing this meeting locally only.");
  const localMeetingId = `m-${uid()}`;
  const localMemories = drafts.map((m) => ({ ...m, meetingId: localMeetingId }));
  setState((s) => ({
    ...s,
    meetings: [...s.meetings, { id: localMeetingId, contactId: input.contactId, title: input.title, date: input.date, purpose: input.title, status: "completed", summary: sentences.slice(0, 2).join(" ") }],
    memories: [...s.memories, ...localMemories],
  }));
  return localMemories;
}

export function recallMeetingMemory(opts: { contactId?: string | undefined; query?: string; limit?: number; types?: MemoryType[] | undefined }): RecalledMemory[] {
  const { memories } = getState();
  const q = (opts.query ?? "").toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const now = Date.now();
  return memories
    .filter((m) => (!opts.contactId || m.contactId === opts.contactId) && (!opts.types || opts.types.includes(m.type)))
    .map((m) => {
      const days = Math.max(0, (now - new Date(m.date).getTime()) / 864e5);
      const recency = Math.exp(-days / 90);
      const hay = (m.text + " " + m.topics.join(" ")).toLowerCase();
      const overlap = q.length ? q.filter((w) => hay.includes(w)).length / q.length : 0.3;
      const boost = m.status === "open" ? 0.2 : m.type === "concern" ? 0.15 : m.type === "decision" ? 0.08 : 0;
      const relevance = Math.min(99, Math.round((0.4 * recency + 0.45 * overlap + boost) * 100 + 20));
      return { ...m, relevance };
    })
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, opts.limit ?? 50);
}

export async function reflectOnMeetingContext(input: { contactId: string; title: string; date: string; purpose: string }): Promise<Brief> {
  const { contacts, meetings } = getState();
  const contact = contacts.find((c) => c.id === input.contactId)!;
  const recalled = recallMeetingMemory({ contactId: input.contactId, query: `${input.title} ${input.purpose}`, limit: 40 });
  const by = (t: MemoryType) => recalled.filter((m) => m.type === t);
  const past = meetings.filter((m) => m.contactId === input.contactId && m.status === "completed").sort((a, b) => b.date.localeCompare(a.date));
  const first = contact.name.split(" ")[0];

  const concerns = by("concern").map((m) => m.text);
  const openItems = recalled.filter((m) => m.status === "open");
  const topicCount = new Map<string, number>();
  recalled.slice(0, 12).forEach((m) => m.topics.forEach((t) => topicCount.set(t, (topicCount.get(t) ?? 0) + m.relevance)));
  const topTopics = [...topicCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);

  const questions = [
    ...by("concern").slice(0, 2).map((m) => `Has the concern around ${(m.topics[0] ?? "this").toLowerCase()} been resolved for ${first}? ("${m.text.slice(0, 60)}…")`),
    ...openItems.slice(0, 2).map((m) => `Does our update on "${m.text.replace(/^We (will|promised to|committed to) /i, "").slice(0, 60)}" meet ${first}'s expectations?`),
    `What would make "${input.purpose || input.title}" a clear win for ${contact.company}?`,
  ];

  await new Promise((r) => setTimeout(r, 400));
  const brief: Brief = {
    id: `b-${uid()}`,
    contactId: input.contactId,
    title: input.title,
    date: input.date,
    purpose: input.purpose,
    createdAt: new Date().toISOString(),
    previousDiscussion: [
      ...past.slice(0, 2).map((m) => `${m.title}: ${m.summary ?? ""}`),
      ...by("discussion").slice(0, 2).map((m) => m.text),
    ],
    concerns,
    commitments: by("commitment").map((m) => `${m.text}${m.status === "open" ? " — still open" : " — delivered"}`),
    followups: by("followup").filter((m) => m.status === "open").map((m) => m.text),
    context: [...by("preference").map((m) => m.text), ...by("decision").map((m) => m.text)],
    questions,
    focus: openItems.length
      ? `Lead by closing the loop on ${openItems.length} open item${openItems.length > 1 ? "s" : ""}, then address ${topTopics.join(", ").toLowerCase() || "their priorities"}. ${concerns[0] ? `Pre-empt the concern: ${concerns[0]}` : ""}`
      : `Build on past momentum around ${topTopics.join(", ").toLowerCase() || "shared goals"}.`,
    sources: recalled.slice(0, 10),
  };
  setState((s) => ({ ...s, briefs: [...s.briefs, brief] }));
  return brief;
}

/** Answer a free-form question grounded in recalled memories. */
export function askNexora(question: string): { answer: string; sources: RecalledMemory[] } {
  const { contacts } = getState();
  const q = question.toLowerCase();
  const contact = contacts.find((c) => q.includes(c.name.toLowerCase().split(" ")[0] ?? "") || q.includes(c.company.toLowerCase().split(" ")[0] ?? ""));
  let types: MemoryType[] | undefined;
  if (/(promise|commit|owe)/.test(q)) types = ["commitment"];
  else if (/(concern|worr|risk)/.test(q)) types = ["concern"];
  else if (/(follow|pending|open)/.test(q)) types = ["followup", "commitment"];
  else if (/(decid|agree)/.test(q)) types = ["decision"];
  else if (/(prefer|like)/.test(q)) types = ["preference"];
  let sources = recallMeetingMemory({ contactId: contact?.id, query: question, types, limit: 5 });
  if (/(pending|open)/.test(q)) sources = sources.filter((m) => m.status === "open");
  if (!sources.length) return { answer: "I couldn't find anything in memory about that yet. Retain a meeting first and I'll remember it.", sources };
  const who = contact ? contact.name : "your contacts";
  const answer = `Here's what I remember about ${who}:\n` + sources.map((m) => `• ${m.text}${m.status === "open" ? " (open)" : ""}`).join("\n");
  return { answer, sources };
}
