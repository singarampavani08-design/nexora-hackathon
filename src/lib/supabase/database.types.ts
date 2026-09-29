/**
 * Database types for the Nexora Supabase schema.
 * Kept in sync manually with supabase/migrations/0001_init.sql.
 */

export type MemoryDbType = "discussion" | "concern" | "decision" | "commitment" | "followup" | "preference";
export type MeetingStatus = "upcoming" | "completed" | "cancelled";
export type CommitmentStatus = "open" | "done" | "cancelled";
export type ReminderStatus = "pending" | "sent" | "failed" | "cancelled";

export interface ProfileRow {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface ContactRow {
  id: string;
  user_id: string | null;
  name: string;
  role: string | null;
  company: string | null;
  email: string | null;
  hue: number;
  avatar_url: string | null;
  created_at: string;
}

export interface MeetingRow {
  id: string;
  user_id: string | null;
  contact_id: string;
  title: string;
  purpose: string | null;
  meeting_date: string; // YYYY-MM-DD
  meeting_time: string | null; // HH:MM:SS
  zoom_meeting_id: string | null;
  zoom_join_url: string | null;
  zoom_meeting_uuid?: string | null;
  status: MeetingStatus;
  summary: string | null;
  created_at: string;
}

export interface MeetingInsert {
  contact_id: string;
  title: string;
  purpose?: string | null;
  meeting_date: string;
  meeting_time?: string | null;
  zoom_meeting_id?: string | null;
  zoom_join_url?: string | null;
  zoom_meeting_uuid?: string | null;
  status?: MeetingStatus;
  summary?: string | null;
  user_id?: string | null;
}

export interface MeetingUpdate {
  title?: string;
  purpose?: string | null;
  meeting_date?: string;
  meeting_time?: string | null;
  zoom_meeting_id?: string | null;
  zoom_join_url?: string | null;
  zoom_meeting_uuid?: string | null;
  status?: MeetingStatus;
  summary?: string | null;
}

export interface MeetingTranscriptRow {
  id: string;
  meeting_id: string;
  speaker_name: string | null;
  speaker_id: string | null;
  transcript_text: string;
  timestamp: string | null;
  chunk_id?: string | null;
  stream_id?: string | null;
  is_final?: boolean;
  created_at: string;
}

export interface MeetingTranscriptInsert {
  meeting_id: string;
  speaker_name?: string | null;
  speaker_id?: string | null;
  transcript_text: string;
  timestamp?: string | null;
  chunk_id?: string | null;
  stream_id?: string | null;
  is_final?: boolean;
}

export type RtmsSessionStatus = "active" | "stopped" | "error";

export interface RtmsSessionRow {
  id: string;
  meeting_id: string | null;
  zoom_meeting_id: string;
  zoom_meeting_uuid: string | null;
  rtms_stream_id: string;
  status: RtmsSessionStatus;
  server_urls: string[];
  connected_at: string;
  disconnected_at: string | null;
  metadata: Record<string, unknown>;
}

export interface RtmsSessionInsert {
  meeting_id?: string | null;
  zoom_meeting_id: string;
  zoom_meeting_uuid?: string | null;
  rtms_stream_id: string;
  status?: RtmsSessionStatus;
  server_urls?: string[];
  connected_at?: string;
  disconnected_at?: string | null;
  metadata?: Record<string, unknown>;
}

export interface MemoryRow {
  id: string;
  user_id: string | null;
  meeting_id: string;
  contact_id: string;
  type: MemoryDbType;
  content: string;
  confidence: number; // 0–1
  topics: string[];
  is_open: boolean;
  created_at: string;
}

export interface MemoryInsert {
  meeting_id: string;
  contact_id: string;
  type: MemoryDbType;
  content: string;
  confidence?: number;
  topics?: string[];
  is_open?: boolean;
  user_id?: string | null;
}

export interface CommitmentRow {
  id: string;
  user_id: string | null;
  meeting_id: string;
  contact_id: string;
  description: string;
  due_date: string | null;
  status: CommitmentStatus;
  created_at: string;
}

export interface CommitmentInsert {
  meeting_id: string;
  contact_id: string;
  description: string;
  due_date?: string | null;
  status?: CommitmentStatus;
  user_id?: string | null;
}

export interface ReminderRow {
  id: string;
  meeting_id: string;
  recipient_email: string;
  reminder_time: string;
  status: ReminderStatus;
  sent_at: string | null;
  created_at: string;
}

export interface ReminderInsert {
  meeting_id: string;
  recipient_email: string;
  reminder_time: string;
  status?: ReminderStatus;
}

/** Row shapes returned by joined queries used in the service layer. */
export interface MemoryRowWithMeeting extends MemoryRow {
  meetings: { meeting_date: string; meeting_time: string | null } | null;
}
