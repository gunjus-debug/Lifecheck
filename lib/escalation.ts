import { supabaseAdmin } from './supabaseClient';
import { sendEmail, sendSms, sendVoiceCall, sendWhatsApp } from './messaging';

export type ProtocolType = 'legacy' | 'elder_care';
export type CheckInStatus =
  | 'pending'
  | 'sent'
  | 'confirmed'
  | 'escalated'
  | 'released'
  | 'paused'
  | 'expired';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  timezone: string;
  plan_type: ProtocolType;
}

export interface CheckInSchedule {
  id: string;
  user_id: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  interval: number;
  last_check_in_at: string | null;
  next_check_in_at: string;
  grace_period_minutes: number;
  paused_until?: string | null;
  escalation_step: number;
  current_status: CheckInStatus;
}

export interface Contact {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  role: 'human_verifier' | 'beneficiary' | 'primary_caregiver' | 'emergency_contact';
  is_primary: boolean;
}

export interface CheckInLog {
  id: string;
  user_id: string;
  schedule_id: string;
  event_type: string;
  event_status: string;
  sent_at: string;
  responded_at?: string;
  response_payload?: Record<string, unknown>;
  escalation_step: number;
  notes?: string;
}

export interface EscalationAction {
  nextStatus: CheckInStatus;
  escalationStep: number;
  message?: string;
  voicePayload?: string;
  notifyRoles?: Contact['role'][];
  releaseVault?: boolean;
  emergencyAlert?: boolean;
}

const nowDate = () => new Date();
function minutesBetween(a: Date, b: Date) {
  return Math.max(0, Math.floor((a.getTime() - b.getTime()) / 60000));
}

export function buildEscalationAction(
  user: UserProfile,
  schedule: CheckInSchedule
): EscalationAction {
  const currentTime = nowDate();
  const lastSent = schedule.last_check_in_at ? new Date(schedule.last_check_in_at) : null;
  const minutesSinceLastSend = lastSent ? minutesBetween(currentTime, lastSent) : Infinity;

  if (schedule.current_status === 'paused') {
    return { nextStatus: 'paused', escalationStep: schedule.escalation_step };
  }

  return user.plan_type === 'legacy'
    ? legacyEscalation(user, schedule, minutesSinceLastSend)
    : elderCareEscalation(user, schedule, minutesSinceLastSend);
}

function legacyEscalation(
  user: UserProfile,
  schedule: CheckInSchedule,
  minutesSinceLastSend: number
): EscalationAction {
  const step = schedule.escalation_step;

  if (step === 0) {
    return {
      nextStatus: 'sent',
      escalationStep: 1,
      message: `Hello ${user.full_name}, please confirm your status with the secure check-in link.`,
      notifyRoles: [],
    };
  }

  if (step === 1 && minutesSinceLastSend >= 48 * 60) {
    return {
      nextStatus: 'escalated',
      escalationStep: 2,
      message: `Reminder: we have not received your confirmation. Please respond now.`,
      voicePayload: `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">This is a welfare check. If you are okay, press 1 now.</Say><Gather numDigits="1" action="/api/twilio/legacy-voice-response" method="POST" timeout="20"/></Response>`,
      notifyRoles: [],
    };
  }

  if (step === 2 && minutesSinceLastSend >= 96 * 60) {
    return {
      nextStatus: 'escalated',
      escalationStep: 3,
      message: `We are alerting your human verifier because no response was received.`,
      notifyRoles: ['human_verifier'],
    };
  }

  if (step === 3 && minutesSinceLastSend >= 7 * 24 * 60) {
    return {
      nextStatus: 'released',
      escalationStep: 4,
      releaseVault: true,
      notifyRoles: ['beneficiary'],
    };
  }

  return { nextStatus: schedule.current_status, escalationStep: step };
}

function elderCareEscalation(
  user: UserProfile,
  schedule: CheckInSchedule,
  minutesSinceLastSend: number
): EscalationAction {
  const step = schedule.escalation_step;

  if (step === 0) {
    return {
      nextStatus: 'sent',
      escalationStep: 1,
      message: `Good morning ${user.full_name}. Please confirm you're okay today.`,
    };
  }

  if (step === 1 && minutesSinceLastSend >= 90) {
    return {
      nextStatus: 'escalated',
      escalationStep: 2,
      message: `Urgent: no response yet. Please press 1 if you are OK.`,
      voicePayload: `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Urgent check-in. If you are okay, press 1 now.</Say><Gather numDigits="1" action="/api/twilio/elderly-voice-response" method="POST" timeout="20"/></Response>`,
    };
  }

  if (step === 2 && minutesSinceLastSend >= 180) {
    return {
      nextStatus: 'escalated',
      escalationStep: 3,
      emergencyAlert: true,
      message: `No response received. Notifying your primary caregiver immediately.`,
      notifyRoles: ['primary_caregiver'],
    };
  }

  return { nextStatus: schedule.current_status, escalationStep: step };
}

export async function logCheckInEvent(
  userId: string,
  scheduleId: string,
  eventType: string,
  eventStatus: string,
  escalationStep: number,
  notes: string,
  responsePayload: Record<string, unknown> | null = null
) {
  await supabaseAdmin.from('check_in_logs').insert({
    user_id: userId,
    schedule_id: scheduleId,
    event_type: eventType,
    event_status: eventStatus,
    escalation_step: escalationStep,
    notes,
    response_payload: responsePayload,
    sent_at: new Date().toISOString(),
  });
}

export async function notifyByRole(userId: string, roles: Contact['role'][], message: string, isEmergency = false) {
  const { data: contacts } = await supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .in('role', roles);

  if (!contacts) return;

  await Promise.all(
    contacts.map(async (contact: Contact) => {
      if (contact.phone) {
        await sendSms(contact.phone, message);
        // Also attempt WhatsApp delivery where possible
        try {
          await sendWhatsApp(contact.phone, message);
        } catch (err) {
          // non-fatal: keep going
        }
      }
      if (contact.email) {
        await sendEmail(contact.email, `Alert from LifeCheck`, message);
      }
      if (isEmergency && contact.phone) {
        await sendVoiceCall(contact.phone, `<Response><Say voice="alice">${message}</Say></Response>`);
      }
    })
  );
}
