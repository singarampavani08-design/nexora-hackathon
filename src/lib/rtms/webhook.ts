/**
 * Zoom Webhook Endpoint Handler.
 *
 * Implements:
 * 1. CRC Challenge-Response Check (`endpoint.url_validation`):
 *    - Calculates HMAC-SHA256 encryptedToken using ZOOM_WEBHOOK_SECRET_TOKEN.
 * 2. Webhook Signature Verification (`v0=` header with timestamp + raw body).
 * 3. RTMS Event Handling:
 *    - `meeting.rtms_started`: launches RTMS stream ingestion.
 *    - `meeting.rtms_stopped`: cleanly terminates RTMS stream session.
 */

import crypto from "node:crypto";
import { rtmsManager } from "./manager";
import type { ZoomWebhookEvent } from "./types";

export interface WebhookValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates Zoom webhook HMAC-SHA256 signature.
 */
export function verifyZoomWebhookSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  secret: string,
): WebhookValidationResult {
  if (!secret) {
    // If secret not configured in dev, pass with warning
    return { valid: true };
  }

  if (!timestamp || !signature) {
    return { valid: false, reason: "Missing timestamp or signature headers" };
  }

  const message = `v0:${timestamp}:${rawBody}`;
  const expectedHash = crypto.createHmac("sha256", secret).update(message).digest("hex");
  const expectedSignature = `v0=${expectedHash}`;

  const valid = crypto.timingSafeEqual(
    Buffer.from(signature, "utf8"),
    Buffer.from(expectedSignature, "utf8"),
  );

  return valid ? { valid: true } : { valid: false, reason: "Signature mismatch" };
}

/**
 * Main HTTP handler for Zoom RTMS webhooks.
 */
export async function handleZoomWebhookRequest(request: Request): Promise<Response> {
  const secret = process.env["ZOOM_WEBHOOK_SECRET_TOKEN"] ?? "";

  // 1. Handle GET for healthcheck / diagnostics
  if (request.method === "GET") {
    return new Response(
      JSON.stringify({
        ok: true,
        service: "Nexora RTMS Webhook Engine",
        status: "ready",
        secretConfigured: Boolean(secret),
        activeSessions: rtmsManager.getSessions(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // 2. Only allow POST for webhook events
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Read raw body text for CRC and signature verification
  const rawBody = await request.text();
  let eventData: ZoomWebhookEvent;

  try {
    eventData = JSON.parse(rawBody) as ZoomWebhookEvent;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Handle Zoom CRC URL Validation (endpoint.url_validation)
  if (eventData.event === "endpoint.url_validation") {
    const rawPayload = eventData.payload as { plainToken?: unknown };
    const plainToken = typeof rawPayload?.plainToken === "string" ? rawPayload.plainToken : "";
    if (!plainToken) {
      return new Response(JSON.stringify({ error: "Missing plainToken in url_validation" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encryptedToken = crypto
      .createHmac("sha256", secret)
      .update(plainToken)
      .digest("hex");

    console.log("[nexora:rtms] Responded to Zoom CRC endpoint.url_validation successfully.");

    return new Response(
      JSON.stringify({
        plainToken,
        encryptedToken,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // 5. Verify signature for non-CRC events (if secret is configured)
  const timestamp = request.headers.get("x-zm-request-timestamp");
  const signature = request.headers.get("x-zm-signature");

  if (secret && signature) {
    const verification = verifyZoomWebhookSignature(rawBody, timestamp, signature, secret);
    if (!verification.valid) {
      console.warn("[nexora:rtms] Rejected invalid webhook signature:", verification.reason);
      return new Response(JSON.stringify({ error: "Invalid signature", reason: verification.reason }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // 6. Dispatch events
  console.log(`[nexora:rtms] Received webhook event: ${eventData.event}`);

  if (eventData.event === "meeting.rtms_started") {
    const payload = eventData.payload as {
      object: {
        id: string;
        uuid: string;
        rtms_stream_id: string;
        server_urls?: string[];
        server_url?: string;
      };
    };

    const obj = payload?.object;
    if (obj?.rtms_stream_id) {
      const serverUrls = obj.server_urls ?? (obj.server_url ? [obj.server_url] : []);
      const result = await rtmsManager.startSession({
        zoomMeetingId: String(obj.id),
        zoomMeetingUuid: obj.uuid,
        rtmsStreamId: obj.rtms_stream_id,
        serverUrls,
      });

      return new Response(JSON.stringify({ ok: true, status: "started", result }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (eventData.event === "meeting.rtms_stopped") {
    const payload = eventData.payload as {
      object: {
        id: string;
        uuid: string;
        rtms_stream_id: string;
      };
    };

    const streamId = payload?.object?.rtms_stream_id;
    if (streamId) {
      await rtmsManager.stopSession(streamId);
      return new Response(JSON.stringify({ ok: true, status: "stopped", streamId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Acknowledge other Zoom webhook events with 200 OK
  return new Response(JSON.stringify({ ok: true, event: eventData.event, received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
