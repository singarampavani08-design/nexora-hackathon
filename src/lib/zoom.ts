/**
 * Zoom integration (foundation brick) — REAL Zoom meetings via the
 * authenticated Zoom REST API.
 *
 * Architecture:
 *  - `createServerFn` handlers run ONLY on the server. The Zoom OAuth
 *    credentials (ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET)
 *    are read from server env vars there and never serialized to the
 *    browser. The compiler strips server-function handler bodies from the
 *    client bundle, so nothing secret ships to the client.
 *  - Clients only ever receive meeting ids and join URLs — never tokens
 *    or secrets.
 *  - The Zoom client secret is never stored in Supabase. Only the meeting
 *    id and join URL (public by nature) are persisted in `meetings`.
 *  - No fake meeting ids: every id/URL below comes from the real Zoom API.
 *    If Zoom auth fails, callers get { ok: false, error } and the app
 *    degrades gracefully instead of inventing data.
 *
 * Env vars (see .env.example):
 *   ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET   (server-side)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ZOOM_OAUTH_URL = "https://zoom.us/oauth/token";
const ZOOM_API_BASE = "https://api.zoom.us/v2";

/** Cached access token (S2S tokens last ~1h; refresh 60s early). */
let cachedToken: { token: string; expiresAt: number } | null = null;

export interface ZoomCredentialsStatus {
  ok: boolean;
  missing: string[];
}

/** Names-only check — never exposes values. */
function zoomCredentialsStatus(): ZoomCredentialsStatus {
  const required = ["ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET"] as const;
  const missing = required.filter((k) => !process.env[k]);
  return { ok: missing.length === 0, missing };
}

class ZoomError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
  }
}

async function getZoomAccessToken(): Promise<string> {
  const { ok, missing } = zoomCredentialsStatus();
  if (!ok) throw new ZoomError(`Missing Zoom configuration: ${missing.join(", ")}.`, null);

  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  const basic = Buffer.from(`${process.env["ZOOM_CLIENT_ID"]}:${process.env["ZOOM_CLIENT_SECRET"]}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "account_credentials",
    account_id: process.env["ZOOM_ACCOUNT_ID"] as string,
  });

  let res: Response;
  try {
    res = await fetch(ZOOM_OAUTH_URL, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch {
    throw new ZoomError("Could not reach Zoom to authenticate. Check your network and try again.", null);
  }

  if (!res.ok) {
    // Log only the status — never headers or body (they contain secrets).
    console.error("[nexora:zoom] token request failed", res.status);
    throw new ZoomError(
      res.status === 401
        ? "Zoom rejected the server credentials (401). Check ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET."
        : `Zoom authentication failed with status ${res.status}.`,
      res.status,
    );
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new ZoomError("Zoom authentication returned no access token.", res.status);

  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + Math.max(60, (json.expires_in ?? 3600) - 60) * 1000,
  };
  return cachedToken.token;
}

interface ZoomMeetingInfo {
  /** Zoom's numeric meeting id (returned by the API — never invented). */
  zoomMeetingId: string;
  joinUrl: string;
  topic: string;
  startTime: string | null;
  duration: number;
}

interface CreateZoomMeetingInput {
  topic: string;
  /** ISO-8601 UTC instant, e.g. 2026-10-05T14:30:00Z */
  startTime: string;
  /** Minutes. Zoom requires it for scheduled meetings. */
  duration?: number;
}

async function createZoomMeeting(input: CreateZoomMeetingInput): Promise<ZoomMeetingInfo> {
  const token = await getZoomAccessToken();
  let res: Response;
  try {
    res = await fetch(`${ZOOM_API_BASE}/users/me/meetings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: input.topic,
        type: 2, // scheduled meeting
        start_time: input.startTime,
        duration: input.duration ?? 40,
        settings: { join_before_host: true },
      }),
    });
  } catch {
    throw new ZoomError("Could not reach the Zoom API to create the meeting. Check your network and try again.", null);
  }

  if (!res.ok) {
    console.error("[nexora:zoom] create meeting failed", res.status);
    throw new ZoomError(`Zoom rejected meeting creation (status ${res.status}).`, res.status);
  }

  const json = (await res.json()) as {
    id?: number | string;
    join_url?: string;
    topic?: string;
    start_time?: string;
    duration?: number;
  };
  if (!json.id || !json.join_url) throw new ZoomError("Zoom created the meeting but returned an incomplete response.", res.status);

  return {
    zoomMeetingId: String(json.id),
    joinUrl: json.join_url,
    topic: json.topic ?? input.topic,
    startTime: json.start_time ?? null,
    duration: json.duration ?? input.duration ?? 40,
  };
}

async function getZoomMeeting(zoomMeetingId: string): Promise<ZoomMeetingInfo> {
  const token = await getZoomAccessToken();
  let res: Response;
  try {
    res = await fetch(`${ZOOM_API_BASE}/meetings/${encodeURIComponent(zoomMeetingId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ZoomError("Could not reach the Zoom API to retrieve the meeting. Check your network and try again.", null);
  }

  if (!res.ok) {
    console.error("[nexora:zoom] get meeting failed", res.status);
    throw new ZoomError(
      res.status === 404
        ? "That Zoom meeting no longer exists (it may have been deleted)."
        : `Zoom meeting lookup failed with status ${res.status}.`,
      res.status,
    );
  }

  const json = (await res.json()) as {
    id?: number | string;
    join_url?: string;
    topic?: string;
    start_time?: string;
    duration?: number;
  };
  if (!json.id || !json.join_url) throw new ZoomError("Zoom returned an incomplete meeting response.", res.status);

  return {
    zoomMeetingId: String(json.id),
    joinUrl: json.join_url,
    topic: json.topic ?? "",
    startTime: json.start_time ?? null,
    duration: json.duration ?? 40,
  };
}

// ============================================================================
// Server functions (client-safe module; handler bodies run server-side only)
// ============================================================================

export type ZoomResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Client-safe report of whether Zoom is configured (names only, no values). */
export const getZoomStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<ZoomResult<{ configured: boolean; missing: string[] }>> => {
    const { ok, missing } = zoomCredentialsStatus();
    return { ok: true, data: { configured: ok, missing } };
  },
);

const createInput = z.object({
  topic: z.string().min(1).max(200),
  /** ISO-8601 UTC instant built from the meeting date + time fields. */
  startTime: z.string().datetime(),
  duration: z.number().int().min(15).max(180).optional(),
});

/** Creates a REAL scheduled Zoom meeting via the authenticated Zoom API. */
export const createZoomMeetingFn = createServerFn({ method: "POST" })
  .validator(createInput)
  .handler(async ({ data }): Promise<ZoomResult<{ zoomMeetingId: string; joinUrl: string }>> => {
    try {
      const meeting = await createZoomMeeting({
        topic: data.topic,
        startTime: data.startTime,
        ...(data.duration !== undefined ? { duration: data.duration } : {}),
      });
      // Only the id + join URL leave the server — never the access token.
      return { ok: true, data: { zoomMeetingId: meeting.zoomMeetingId, joinUrl: meeting.joinUrl } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Zoom meeting creation failed.";
      console.error("[nexora:zoom] createZoomMeetingFn failed:", message);
      return { ok: false, error: message };
    }
  });

const getInput = z.object({ zoomMeetingId: z.string().min(1) });

/** Retrieves a REAL Zoom meeting by its numeric id. */
export const getZoomMeetingFn = createServerFn({ method: "GET" })
  .validator(getInput)
  .handler(
    async ({ data }): Promise<ZoomResult<{ zoomMeetingId: string; joinUrl: string; topic: string; startTime: string | null }>> => {
      try {
        const m = await getZoomMeeting(data.zoomMeetingId);
        return {
          ok: true,
          data: { zoomMeetingId: m.zoomMeetingId, joinUrl: m.joinUrl, topic: m.topic, startTime: m.startTime },
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Zoom meeting lookup failed.";
        console.error("[nexora:zoom] getZoomMeetingFn failed:", message);
        return { ok: false, error: message };
      }
    },
  );

export { ZoomError };
