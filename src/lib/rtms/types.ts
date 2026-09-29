/**
 * Types for Zoom RTMS (Real-Time Media Streams) protocol & webhooks.
 */

export interface ZoomUrlValidationPayload {
  plainToken: string;
}

export interface ZoomRtmsStartedPayload {
  account_id: string;
  object: {
    id: string; // Zoom Meeting ID (numeric string)
    uuid: string; // Zoom Meeting UUID
    rtms_stream_id: string; // Stream identifier
    server_urls?: string[]; // WebSocket URLs for RTMS media/transcript stream
    server_url?: string;
  };
}

export interface ZoomRtmsStoppedPayload {
  account_id: string;
  object: {
    id: string;
    uuid: string;
    rtms_stream_id: string;
  };
}

export type ZoomWebhookEvent =
  | {
      event: "endpoint.url_validation";
      payload: ZoomUrlValidationPayload;
      event_ts?: number;
    }
  | {
      event: "meeting.rtms_started";
      payload: ZoomRtmsStartedPayload;
      event_ts?: number;
    }
  | {
      event: "meeting.rtms_stopped";
      payload: ZoomRtmsStoppedPayload;
      event_ts?: number;
    }
  | {
      event: string;
      payload: Record<string, unknown>;
      event_ts?: number;
    };

/**
 * Zoom RTMS WebSocket protocol frame types.
 */
export enum RtmsMsgType {
  HANDSHAKE = 1,
  HANDSHAKE_ACK = 2,
  CLIENT_READY_ACK = 3,
  HEARTBEAT_PING = 9,
  HEARTBEAT_PONG = 10,
  DATA_TRANSCRIPT = 17,
  STREAM_CLOSE = 99,
}

export interface RtmsTranscriptFrameData {
  speaker_id?: string;
  speaker_name?: string;
  transcript_text?: string;
  text?: string;
  timestamp?: number | string;
  chunk_id?: string;
  msg_id?: string;
  is_final?: boolean;
}

export interface RtmsLiveChunk {
  meetingId: string;
  speakerName: string;
  speakerId: string | null;
  text: string;
  timestamp: string;
  chunkId: string;
  isFinal: boolean;
}

export interface RtmsSessionState {
  streamId: string;
  meetingId: string;
  zoomMeetingId: string;
  zoomMeetingUuid: string;
  status: "connecting" | "active" | "stopped" | "error";
  connectedAt: string;
  lastPacketAt: string | null;
  packetsReceived: number;
  error?: string;
}
