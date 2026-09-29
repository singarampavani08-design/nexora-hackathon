/**
 * Row → domain mappers (Supabase snake_case → existing camelCase UI types).
 * Keeping these in one place means the UI types in lib/types.ts never change.
 */
import type { ContactRow, MeetingRow, MemoryRowWithMeeting } from "./database.types";
import type { Contact, Meeting, Memory, MemoryType } from "../types";

export function rowToContact(r: ContactRow): Contact {
  return {
    id: r.id,
    name: r.name,
    role: r.role ?? "",
    company: r.company ?? "",
    email: r.email ?? "",
    hue: r.hue,
  };
}

function meetingDateIso(meeting_date: string, meeting_time: string | null): string {
  const time = meeting_time ? meeting_time.slice(0, 8) : "09:00:00";
  const d = new Date(`${meeting_date}T${time}Z`);
  return Number.isNaN(d.getTime())
    ? new Date(`${meeting_date}T00:00:00Z`).toISOString()
    : d.toISOString();
}

export function rowToMeeting(r: MeetingRow): Meeting {
  return {
    id: r.id,
    contactId: r.contact_id,
    title: r.title,
    date: meetingDateIso(r.meeting_date, r.meeting_time),
    purpose: r.purpose ?? "",
    status: r.status === "completed" ? "completed" : "upcoming",
    ...(r.summary ? { summary: r.summary } : {}),
    zoomMeetingId: r.zoom_meeting_id ?? null,
    zoomJoinUrl: r.zoom_join_url ?? null,
    zoom_meeting_id: r.zoom_meeting_id ?? null,
    zoom_join_url: r.zoom_join_url ?? null,
  };
}

export function rowToMemory(r: MemoryRowWithMeeting): Memory {
  return {
    id: r.id,
    meetingId: r.meeting_id,
    contactId: r.contact_id,
    type: r.type as MemoryType,
    text: r.content,
    date: r.meetings
      ? meetingDateIso(r.meetings.meeting_date, r.meetings.meeting_time)
      : r.created_at,
    topics: r.topics ?? [],
    status: r.is_open ? "open" : undefined,
    confidence: r.confidence,
  };
}
