import { useSyncExternalStore } from "react";
import { seedContacts, seedMeetings, seedMemories } from "./seed";
import { getContacts, getMeetings, getMemoriesWithMeeting } from "./supabase/service";
import { rowToContact, rowToMeeting, rowToMemory } from "./supabase/mappers";
import type { Brief, Contact, Memory, Meeting } from "./types";

export interface AppState {
  contacts: Contact[];
  meetings: Meeting[];
  memories: Memory[];
  briefs: Brief[];
  loading: boolean;
  error: string | null;
}

const KEY = "nexora-memory-v1"; // legacy localStorage key (briefs cache lives here)
const CACHE_KEY = "nexora-db-cache-v1"; // last successful Supabase load
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Keep the hard-coded 2026 seed dates relative to "now" so upcoming meetings
 * always appear upcoming while running on fallback data. DB rows keep their
 * literal dates.
 */
function nowShiftedMeetings(list: Meeting[]): Meeting[] {
  const base = new Date("2026-09-29T00:00:00Z").getTime();
  const delta = Date.now() - base;
  if (Math.abs(delta) < 86400000) return list;
  return list.map((m) => ({ ...m, date: new Date(new Date(m.date).getTime() + delta).toISOString() }));
}

function seedState(): AppState {
  let briefs: Brief[] = [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) briefs = (JSON.parse(raw) as Partial<AppState>).briefs ?? [];
  } catch {
    /* ignore */
  }
  return {
    contacts: seedContacts,
    meetings: nowShiftedMeetings(seedMeetings),
    memories: seedMemories,
    briefs,
    loading: true,
    error: null,
  };
}

let state: AppState = seedState();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function set(partial: Partial<AppState>) {
  state = { ...state, ...partial };
  persistCache();
  emit();
}

function persistCache() {
  if (state.loading) return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        contacts: state.contacts,
        meetings: state.meetings,
        memories: state.memories,
        at: Date.now(),
      }),
    );
    // Briefs are generated client-side; keep persisting them under the legacy key.
    localStorage.setItem(KEY, JSON.stringify({ briefs: state.briefs }));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

function readCache(): Partial<AppState> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      contacts: Contact[];
      meetings: Meeting[];
      memories: Memory[];
      at: number;
    };
    if (!parsed.at || Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return { contacts: parsed.contacts, meetings: parsed.meetings, memories: parsed.memories };
  } catch {
    return null;
  }
}

export function getState(): AppState {
  return state;
}

export function setState(fn: (s: AppState) => AppState) {
  state = fn(state);
  persistCache();
  emit();
}

export function resetState() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
  set({
    contacts: seedContacts,
    meetings: nowShiftedMeetings(seedMeetings),
    memories: seedMemories,
    briefs: [],
    loading: false,
    error: null,
  });
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getServerSnapshot);
}

const SERVER_SNAPSHOT: AppState = {
  contacts: seedContacts,
  meetings: seedMeetings,
  memories: seedMemories,
  briefs: [],
  loading: true,
  error: null,
};

function getServerSnapshot(): AppState {
  return SERVER_SNAPSHOT;
}

// ------------------------------------------------------------ Supabase hydration

/**
 * Loads contacts/meetings/memories from Supabase into the store.
 * On failure: falls back to the last good cache, else demo seed, and sets a
 * friendly error message. Called once on app mount (in AppProvider).
 */
export async function hydrateFromSupabase(): Promise<void> {
  set({ loading: true, error: null });
  const [contactsRes, meetingsRes, memoriesRes] = await Promise.all([
    getContacts(),
    getMeetings(),
    getMemoriesWithMeeting(),
  ]);

  if (!contactsRes.ok || !meetingsRes.ok || !memoriesRes.ok) {
    const cache = readCache();
    set({
      ...(cache ?? {}),
      loading: false,
      error: "Unable to load your data from the database — showing previously saved data. Please try refreshing.",
    });
    return;
  }

  set({
    contacts: contactsRes.data.map(rowToContact),
    meetings: meetingsRes.data.map(rowToMeeting),
    memories: memoriesRes.data.map(rowToMemory),
    loading: false,
    error: null,
  });
}
