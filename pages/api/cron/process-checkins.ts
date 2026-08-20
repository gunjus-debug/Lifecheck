import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseClient';
import { buildEscalationAction, logCheckInEvent, notifyByRole } from '../../../lib/escalation';
import { sendEmail, sendSms, sendVoiceCall } from '../../../lib/messaging';

const SCHEDULES_TABLE = 'check_in_schedules';
const CONTACTS_TABLE = 'contacts';
const VAULT_ITEMS_TABLE = 'vault_items';
const VAULT_ACCESS_TOKENS_TABLE = 'vault_access_tokens';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const now = new Date().toISOString();
  const { data: dueSchedules, error } = await supabaseAdmin
    .from(SCHEDULES_TABLE)
    .select('*, users(*)')
    .lte('next_check_in_at', now)
    .eq('active', true)
    .or('paused_until.is.null,paused_until.lte.' + now);

  if (error) {
    return res.status(500).json({ error: 'Unable to fetch due schedules', details: error.message });
  }

  const results = [];

  for (const schedule of dueSchedules ?? []) {
    const user = schedule.users;
    const action = buildEscalationAction(user, schedule);

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      current_status: action.nextStatus,
      escalation_step: action.escalationStep,
    };

    if (action.releaseVault) {
      await releaseVaultToBeneficiaries(user.id, schedule.id);
      await logCheckInEvent(user.id, schedule.id, 'vault_released', 'sent', action.escalationStep, 'Vault release triggered');
    }

    if (action.emergencyAlert) {
      await notifyByRole(user.id, ['primary_caregiver'], action.message ?? 'Emergency alert for your dependent.', true);
      await logCheckInEvent(user.id, schedule.id, 'emergency_alerted', 'sent', action.escalationStep, action.message ?? 'Emergency escalation');
    } else if (action.notifyRoles?.length) {
      await notifyByRole(user.id, action.notifyRoles, action.message ?? 'Attention required.', false);
      await logCheckInEvent(user.id, schedule.id, 'verifier_alerted', 'sent', action.escalationStep, action.message ?? 'Verifier escalation');
    } else if (action.message) {
      await notifyUser(user, action.message, action.voicePayload);
      await logCheckInEvent(user.id, schedule.id, 'check_in_sent', 'sent', action.escalationStep, action.message);
    }

    await supabaseAdmin.from(SCHEDULES_TABLE).update(updatePayload).eq('id', schedule.id);
    results.push({ scheduleId: schedule.id, action });
  }

  return res.status(200).json({ processed: results.length, details: results });
}

async function notifyUser(user: any, message: string, voicePayload?: string) {
  if (user.phone) {
    await sendSms(user.phone, message);
  }
  if (user.email) {
    await sendEmail(user.email, 'LifeCheck Check-in Request', `<p>${message}</p>`);
  }
  if (voicePayload && user.phone) {
    await sendVoiceCall(user.phone, voicePayload);
  }
}

async function releaseVaultToBeneficiaries(userId: string, scheduleId: string) {
  const { data: vaultItems } = await supabaseAdmin
    .from(VAULT_ITEMS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('active', true);

  if (!vaultItems?.length) {
    return;
  }

  const { data: beneficiaries } = await supabaseAdmin
    .from(CONTACTS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('role', 'beneficiary');

  for (const beneficiary of beneficiaries ?? []) {
    const token = await createVaultAccessToken(userId, beneficiary.id);
    const accessUrl = `${process.env.APP_URL}/vault-access/${token}`;

    if (beneficiary.phone) {
      await sendSms(beneficiary.phone, `Your beneficiary access request is ready. Visit ${accessUrl} and complete verification.`);
    }
    if (beneficiary.email) {
      await sendEmail(
        beneficiary.email,
        'LifeCheck Vault Access Initiated',
        `<p>Your vault details are available. Use this secure link to retrieve them:</p><p><a href="${accessUrl}">${accessUrl}</a></p>`
      );
    }
  }
}

async function createVaultAccessToken(userId: string, contactId: string) {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 4);

  const otpCode = generateOtp();
  await supabaseAdmin.from(VAULT_ACCESS_TOKENS_TABLE).insert({
    user_id: userId,
    contact_id: contactId,
    token,
    purpose: 'vault_release',
    otp_code: otpCode,
    expires_at: expiresAt.toISOString(),
    used: false,
    metadata: { created_by: 'cron_process' },
  });

  return token;
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
