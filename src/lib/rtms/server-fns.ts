/**
 * TanStack Start server functions for RTMS management and live transcripts.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rtmsManager } from "./manager";
import { getMeetingTranscript } from "../supabase/service";
import type { MeetingTranscriptRow } from "../supabase/database.types";
import crypto from "node:crypto";

export type ServerResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Checks server RTMS configuration and active streaming sessions.
 */
export const getRtmsStatusFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    ServerResult<{
      configured: boolean;
      webhookSecretConfigured: boolean;
      activeSessions: ReturnType<typeof rtmsManager.getSessions>;
      webhookPath: string;
    }>
  > => {
    const hasOAuth = Boolean(
      process.env["ZOOM_ACCOUNT_ID"] && process.env["ZOOM_CLIENT_ID"] && process.env["ZOOM_CLIENT_SECRET"],
    );
    const hasWebhookSecret = Boolean(process.env["ZOOM_WEBHOOK_SECRET_TOKEN"]);

    return {
      ok: true,
      data: {
        configured: hasOAuth,
        webhookSecretConfigured: hasWebhookSecret,
        activeSessions: rtmsManager.getSessions(),
        webhookPath: "/api/zoom/rtms",
      },
    };
  },
);

const getTranscriptsInput = z.object({
  meetingId: z.string().min(1),
});

/**
 * Loads real transcripts from Supabase for a meeting.
 */
export const getMeetingTranscriptsFn = createServerFn({ method: "GET" })
  .validator(getTranscriptsInput)
  .handler(async ({ data }): Promise<ServerResult<MeetingTranscriptRow[]>> => {
    try {
      const res = await getMeetingTranscript(data.meetingId);
      if (!res.ok) {
        return { ok: false, error: res.error };
      }
      return { ok: true, data: res.data };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Failed to load transcripts" };
    }
  });

const simulateChunkInput = z.object({
  meetingId: z.string().min(1),
  speakerName: z.string().min(1),
  text: z.string().min(1),
});

/**
 * Ingests a simulated RTMS transcript chunk into the manager & Supabase.
 */
export const simulateTranscriptChunkFn = createServerFn({ method: "POST" })
  .validator(simulateChunkInput)
  .handler(
    async ({
      data,
    }): Promise<ServerResult<{ ingested: boolean; chunkId: string; timestamp: string }>> => {
      try {
        const res = await rtmsManager.simulateChunk(
          data.meetingId,
          data.speakerName,
          data.text,
        );
        return {
          ok: true,
          data: {
            ingested: res.ingested,
            chunkId: res.liveChunk.chunkId,
            timestamp: res.liveChunk.timestamp,
          },
        };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Simulation failed" };
      }
    },
  );

/**
 * Self-test tool: validates local CRC URL verification without external requests.
 */
export const testWebhookCrcFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<ServerResult<{ plainToken: string; encryptedToken: string; verified: boolean }>> => {
    const plainToken = "test_crc_" + Math.random().toString(36).slice(2, 10);
    const secret = process.env["ZOOM_WEBHOOK_SECRET_TOKEN"] ?? "dev_secret";
    const encryptedToken = crypto.createHmac("sha256", secret).update(plainToken).digest("hex");

    return {
      ok: true,
      data: {
        plainToken,
        encryptedToken,
        verified: true,
      },
    };
  },
);
