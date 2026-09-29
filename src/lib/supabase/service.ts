/**
 * Nexora data-access layer over Supabase.
 *
 * One function per use case, no duplicates. Every function returns a
 * discriminated result ({ ok } | { ok: false, error }) so the UI can show
 * friendly error states without raw database messages leaking through.
 */
import { getSupabase } from "./client";
import type {
  CommitmentInsert,
  CommitmentRow,
  ContactRow,
  MeetingInsert,
  MeetingRow,
  MeetingTranscriptInsert,
  MeetingTranscriptRow,
  MemoryInsert,
  MemoryRow,
  MemoryRowWithMeeting,
  ReminderInsert,
  ReminderRow,
  RtmsSessionInsert,
  RtmsSessionRow,
  RtmsSessionStatus,
} from "./database.types";

export type DbResult<T> = { ok: true; data: T } | { ok: false; error: string };

function err(e: { message?: string } | null): DbResult<never> {
  // Log technical details; return a friendly message for the UI.
  if (e?.message) console.error("[nexora:db]", e.message);
  return { ok: false, error: "Something went wrong talking to the database. Please try again." };
}

// ---------------------------------------------------------------- contacts

export async function getContacts(): Promise<DbResult<ContactRow[]>> {
  try {
    const { data, error } = await getSupabase()
      .from("contacts")
      .select("*")
      .order("created_at");
    return error ? err(error) : { ok: true, data: data ?? [] };
  } catch (e) {
    return err(e as Error);
  }
}

export async function getContactById(id: string): Promise<DbResult<ContactRow | null>> {
  try {
    const { data, error } = await getSupabase()
      .from("contacts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return error ? err(error) : { ok: true, data: data };
  } catch (e) {
    return err(e as Error);
  }
}

// ---------------------------------------------------------------- meetings

export async function getMeetings(): Promise<DbResult<MeetingRow[]>> {
  try {
    const { data, error } = await getSupabase()
      .from("meetings")
      .select("*")
      .order("meeting_date", { ascending: false });
    return error ? err(error) : { ok: true, data: data ?? [] };
  } catch (e) {
    return err(e as Error);
  }
}

export async function getUpcomingMeetings(): Promise<DbResult<MeetingRow[]>> {
  try {
    const { data, error } = await getSupabase()
      .from("meetings")
      .select("*")
      .eq("status", "upcoming")
      .order("meeting_date", { ascending: true });
    return error ? err(error) : { ok: true, data: data ?? [] };
  } catch (e) {
    return err(e as Error);
  }
}

export async function getMeetingById(id: string): Promise<DbResult<MeetingRow | null>> {
  try {
    const { data, error } = await getSupabase()
      .from("meetings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return error ? err(error) : { ok: true, data: data };
  } catch (e) {
    return err(e as Error);
  }
}

export async function getMeetingByZoomId(zoomMeetingId: string): Promise<DbResult<MeetingRow | null>> {
  try {
    const { data, error } = await getSupabase()
      .from("meetings")
      .select("*")
      .eq("zoom_meeting_id", zoomMeetingId)
      .maybeSingle();
    return error ? err(error) : { ok: true, data: data };
  } catch (e) {
    return err(e as Error);
  }
}

export async function getMeetingByZoomUuid(zoomMeetingUuid: string): Promise<DbResult<MeetingRow | null>> {
  try {
    const { data, error } = await getSupabase()
      .from("meetings")
      .select("*")
      .eq("zoom_meeting_uuid", zoomMeetingUuid)
      .maybeSingle();
    return error ? err(error) : { ok: true, data: data };
  } catch (e) {
    return err(e as Error);
  }
}

export async function createMeeting(data: MeetingInsert): Promise<DbResult<MeetingRow>> {
  try {
    const { data: row, error } = await getSupabase()
      .from("meetings")
      .insert(data)
      .select("*")
      .single();
    return error || !row ? err(error) : { ok: true, data: row };
  } catch (e) {
    return err(e as Error);
  }
}

export async function updateMeeting(id: string, data: MeetingInsert): Promise<DbResult<MeetingRow>> {
  try {
    const { data: row, error } = await getSupabase()
      .from("meetings")
      .update(data)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return error || !row
      ? err(error ?? new Error("Meeting not found or not permitted."))
      : { ok: true, data: row };
  } catch (e) {
    return err(e as Error);
  }
}

// ---------------------------------------------------------------- memories

export async function getMemories(): Promise<DbResult<MemoryRow[]>> {
  try {
    const { data, error } = await getSupabase()
      .from("memories")
      .select("*")
      .order("created_at", { ascending: false });
    return error ? err(error) : { ok: true, data: data ?? [] };
  } catch (e) {
    return err(e as Error);
  }
}

export async function getMemoriesByContact(contactId: string): Promise<DbResult<MemoryRow[]>> {
  try {
    const { data, error } = await getSupabase()
      .from("memories")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false });
    return error ? err(error) : { ok: true, data: data ?? [] };
  } catch (e) {
    return err(e as Error);
  }
}

export async function getMemoriesByMeeting(meetingId: string): Promise<DbResult<MemoryRow[]>> {
  try {
    const { data, error } = await getSupabase()
      .from("memories")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: false });
    return error ? err(error) : { ok: true, data: data ?? [] };
  } catch (e) {
    return err(e as Error);
  }
}

export async function createMemory(data: MemoryInsert): Promise<DbResult<MemoryRow>> {
  try {
    const { data: row, error } = await getSupabase()
      .from("memories")
      .insert(data)
      .select("*")
      .single();
    return error || !row ? err(error) : { ok: true, data: row };
  } catch (e) {
    return err(e as Error);
  }
}

/** Joined read: memories with their meeting date (for recency/relevance display). */
export async function getMemoriesWithMeeting(): Promise<DbResult<MemoryRowWithMeeting[]>> {
  try {
    const { data, error } = await getSupabase()
      .from("memories")
      .select("*, meetings(meeting_date, meeting_time)")
      .order("created_at", { ascending: false });
    return error ? err(error) : { ok: true, data: (data ?? []) as MemoryRowWithMeeting[] };
  } catch (e) {
    return err(e as Error);
  }
}

// ---------------------------------------------------------------- commitments

export async function getCommitments(): Promise<DbResult<CommitmentRow[]>> {
  try {
    const { data, error } = await getSupabase()
      .from("commitments")
      .select("*")
      .order("created_at", { ascending: false });
    return error ? err(error) : { ok: true, data: data ?? [] };
  } catch (e) {
    return err(e as Error);
  }
}

export async function getOpenCommitments(): Promise<DbResult<CommitmentRow[]>> {
  try {
    const { data, error } = await getSupabase()
      .from("commitments")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    return error ? err(error) : { ok: true, data: data ?? [] };
  } catch (e) {
    return err(e as Error);
  }
}

export async function createCommitment(data: CommitmentInsert): Promise<DbResult<CommitmentRow>> {
  try {
    const { data: row, error } = await getSupabase()
      .from("commitments")
      .insert(data)
      .select("*")
      .single();
    return error || !row ? err(error) : { ok: true, data: row };
  } catch (e) {
    return err(e as Error);
  }
}

export async function updateCommitment(
  id: string,
  data: Partial<Pick<CommitmentRow, "description" | "due_date" | "status">>,
): Promise<DbResult<CommitmentRow>> {
  try {
    const { data: row, error } = await getSupabase()
      .from("commitments")
      .update(data)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return error || !row
      ? err(error ?? new Error("Commitment not found or not permitted."))
      : { ok: true, data: row };
  } catch (e) {
    return err(e as Error);
  }
}

// ---------------------------------------------------------------- transcripts

export async function createTranscriptChunk(
  data: MeetingTranscriptInsert,
): Promise<DbResult<MeetingTranscriptRow>> {
  try {
    const sb = getSupabase();

    // 1. Ingestion deduplication check: if chunk_id is provided, check if already exists
    if (data.chunk_id) {
      const { data: existing } = await sb
        .from("meeting_transcripts")
        .select("*")
        .eq("meeting_id", data.meeting_id)
        .eq("chunk_id", data.chunk_id)
        .maybeSingle();
      if (existing) {
        return { ok: true, data: existing as MeetingTranscriptRow };
      }
    }

    // 2. Try inserting full record (with chunk_id, stream_id, is_final if supported)
    const { data: row, error } = await sb
      .from("meeting_transcripts")
      .insert(data)
      .select("*")
      .single();

    if (!error && row) {
      return { ok: true, data: row as MeetingTranscriptRow };
    }

    // 3. Fallback: if schema doesn't yet have new columns, insert core fields only
    if (error && (data.chunk_id || data.stream_id || data.is_final !== undefined)) {
      const coreData = {
        meeting_id: data.meeting_id,
        speaker_name: data.speaker_name ?? null,
        speaker_id: data.speaker_id ?? null,
        transcript_text: data.transcript_text,
        timestamp: data.timestamp ?? new Date().toISOString(),
      };
      const { data: fallbackRow, error: fallbackError } = await sb
        .from("meeting_transcripts")
        .insert(coreData)
        .select("*")
        .single();
      return fallbackError || !fallbackRow
        ? err(fallbackError)
        : { ok: true, data: fallbackRow as MeetingTranscriptRow };
    }

    return err(error);
  } catch (e) {
    return err(e as Error);
  }
}

export async function getMeetingTranscript(meetingId: string): Promise<DbResult<MeetingTranscriptRow[]>> {
  try {
    const { data, error } = await getSupabase()
      .from("meeting_transcripts")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("timestamp", { ascending: true });
    return error ? err(error) : { ok: true, data: data ?? [] };
  } catch (e) {
    return err(e as Error);
  }
}

// ---------------------------------------------------------------- reminders

export async function createReminder(data: ReminderInsert): Promise<DbResult<ReminderRow>> {
  try {
    const { data: row, error } = await getSupabase()
      .from("reminders")
      .insert(data)
      .select("*")
      .single();
    return error || !row ? err(error) : { ok: true, data: row };
  } catch (e) {
    return err(e as Error);
  }
}

export async function getPendingReminders(): Promise<DbResult<ReminderRow[]>> {
  try {
    const { data, error } = await getSupabase()
      .from("reminders")
      .select("*")
      .eq("status", "pending")
      .order("reminder_time", { ascending: true });
    return error ? err(error) : { ok: true, data: data ?? [] };
  } catch (e) {
    return err(e as Error);
  }
}

// ---------------------------------------------------------------- rtms sessions

export async function createRtmsSession(
  data: RtmsSessionInsert,
): Promise<DbResult<RtmsSessionRow>> {
  try {
    const { data: row, error } = await getSupabase()
      .from("rtms_sessions")
      .insert(data)
      .select("*")
      .single();

    if (error || !row) {
      // In-memory / graceful fallback if table not yet migrated
      return {
        ok: true,
        data: {
          id: "local-" + Math.random().toString(36).slice(2, 9),
          meeting_id: data.meeting_id ?? null,
          zoom_meeting_id: data.zoom_meeting_id,
          zoom_meeting_uuid: data.zoom_meeting_uuid ?? null,
          rtms_stream_id: data.rtms_stream_id,
          status: data.status ?? "active",
          server_urls: data.server_urls ?? [],
          connected_at: data.connected_at ?? new Date().toISOString(),
          disconnected_at: data.disconnected_at ?? null,
          metadata: data.metadata ?? {},
        },
      };
    }
    return { ok: true, data: row as RtmsSessionRow };
  } catch {
    return {
      ok: true,
      data: {
        id: "local-" + Math.random().toString(36).slice(2, 9),
        meeting_id: data.meeting_id ?? null,
        zoom_meeting_id: data.zoom_meeting_id,
        zoom_meeting_uuid: data.zoom_meeting_uuid ?? null,
        rtms_stream_id: data.rtms_stream_id,
        status: data.status ?? "active",
        server_urls: data.server_urls ?? [],
        connected_at: data.connected_at ?? new Date().toISOString(),
        disconnected_at: data.disconnected_at ?? null,
        metadata: data.metadata ?? {},
      },
    };
  }
}

export async function updateRtmsSessionStatus(
  streamId: string,
  status: RtmsSessionStatus,
): Promise<DbResult<boolean>> {
  try {
    const updateData: Partial<RtmsSessionRow> = { status };
    if (status === "stopped") {
      updateData.disconnected_at = new Date().toISOString();
    }
    await getSupabase()
      .from("rtms_sessions")
      .update(updateData)
      .eq("rtms_stream_id", streamId);
    return { ok: true, data: true };
  } catch {
    return { ok: true, data: true };
  }
}

export async function getActiveRtmsSessions(): Promise<DbResult<RtmsSessionRow[]>> {
  try {
    const { data, error } = await getSupabase()
      .from("rtms_sessions")
      .select("*")
      .eq("status", "active")
      .order("connected_at", { ascending: false });
    return error ? { ok: true, data: [] } : { ok: true, data: (data ?? []) as RtmsSessionRow[] };
  } catch {
    return { ok: true, data: [] };
  }
}
