import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

export type LiveRoomMode = 'quiz_race' | 'boss_raid';
export type LiveRoomPhase = 'lobby' | 'question' | 'reveal' | 'finished';

export interface LiveQuestionPayload {
  id: string;
  subject: string;
  questionTh: string;
  options: string[];
}

export interface LiveRoomPlayer {
  userId: string;
  name: string;
  avatarUrl: string;
  equippedFrameId?: string;
  equippedTitle?: string;
  score: number;
  correctCount: number;
  streak: number;
  damageDealt: number;
  answeredQuestionIndex: number | null;
  lastAnswerCorrect?: boolean;
  lastPointsDelta?: number;
  joinedAt: number;
}

export interface LiveBossDamageEvent {
  id: string;
  playerName: string;
  damage: number;
  critical: boolean;
}

export interface LiveRoomState {
  pin: string;
  mode: LiveRoomMode;
  hostId: string;
  hostName: string;
  subjectLabel: string;
  phase: LiveRoomPhase;
  questionIndex: number;
  totalQuestions: number;
  secondsPerQuestion: number;
  questionStartedAt: number;
  currentQuestion: LiveQuestionPayload | null;
  revealCorrectIndex: number | null;
  revealExplanationTh: string;
  bossName: string;
  bossMaxHp: number;
  bossCurrentHp: number;
  lastDamageFeed: LiveBossDamageEvent[];
  players: LiveRoomPlayer[];
  updatedAt: number;
}

export type LiveClassroomEvent =
  | {
      type: 'room:state';
      state: LiveRoomState;
    }
  | {
      type: 'room:sync_request';
      userId: string;
    }
  | {
      type: 'player:join';
      player: {
        userId: string;
        name: string;
        avatarUrl: string;
        equippedFrameId?: string;
        equippedTitle?: string;
      };
    }
  | {
      type: 'player:answer';
      userId: string;
      questionIndex: number;
      choiceIndex: number;
      elapsedMs: number;
    }
  | {
      type: 'room:closed';
      reason: string;
    };

export interface LiveTransportHandle {
  transportMode: 'supabase_realtime' | 'local_broadcast';
  send: (event: LiveClassroomEvent) => void;
  disconnect: () => void;
}

export function generateRoomPin(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return String(digits);
}

export function formatRoomPin(pin: string): string {
  const clean = pin.replace(/\D/g, '').slice(0, 6);
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)} ${clean.slice(3)}`;
}

/**
 * Real multi-user room channel backed by Supabase Realtime WebSockets (Broadcast + Presence).
 * Falls back cleanly to native browser BroadcastChannel (cross-tab) only when Supabase keys are absent.
 */
export function connectLiveClassroomChannel(params: {
  pin: string;
  userId: string;
  userName: string;
  onEvent: (event: LiveClassroomEvent) => void;
  onStatusChange?: (status: 'connecting' | 'connected' | 'error') => void;
  onPresenceCountChange?: (count: number) => void;
}): LiveTransportHandle {
  const { pin, userId, userName, onEvent, onStatusChange, onPresenceCountChange } = params;
  const channelName = `eduverse_live_classroom_${pin}`;
  const client = getSupabaseClient();

  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      bc = new BroadcastChannel(channelName);
      bc.onmessage = (msg) => {
        if (msg.data && typeof msg.data === 'object' && 'type' in msg.data) {
          onEvent(msg.data as LiveClassroomEvent);
        }
      };
    } catch {
      bc = null;
    }
  }

  if (!client) {
    onStatusChange?.('connected');
    onPresenceCountChange?.(1);
    return {
      transportMode: 'local_broadcast',
      send: (event) => {
        try {
          bc?.postMessage(event);
        } catch {
          // ignore
        }
      },
      disconnect: () => {
        try {
          bc?.close();
        } catch {
          // ignore
        }
      },
    };
  }

  onStatusChange?.('connecting');
  const channel: RealtimeChannel = client.channel(channelName, {
    config: {
      broadcast: { self: false },
      presence: { key: userId },
    },
  });

  channel
    .on('broadcast', { event: 'classroom_event' }, (payload) => {
      const evt = payload.payload as LiveClassroomEvent | undefined;
      if (evt && typeof evt === 'object' && 'type' in evt) {
        onEvent(evt);
      }
    })
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const count = Object.keys(state || {}).length;
      onPresenceCountChange?.(count);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        onStatusChange?.('connected');
        channel
          .track({
            userId,
            userName,
            onlineAt: new Date().toISOString(),
          })
          .catch(() => {});
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onStatusChange?.('error');
      }
    });

  return {
    transportMode: 'supabase_realtime',
    send: (event) => {
      channel
        .send({
          type: 'broadcast',
          event: 'classroom_event',
          payload: event,
        })
        .catch(() => {});
      // Also mirror to same-browser BroadcastChannel for instant multi-tab testing on one machine
      try {
        bc?.postMessage(event);
      } catch {
        // ignore
      }
    },
    disconnect: () => {
      try {
        bc?.close();
      } catch {
        // ignore
      }
      client.removeChannel(channel).catch(() => {});
    },
  };
}
