import sgMail from '@sendgrid/mail';
import Twilio from 'twilio';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'no-reply@lifecheck.app';

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFromPhone = process.env.TWILIO_FROM_PHONE;

const hasSendGrid = Boolean(SENDGRID_API_KEY);
const hasTwilio = Boolean(twilioAccountSid && twilioAuthToken && twilioFromPhone && twilioAccountSid.startsWith('AC'));

if (hasSendGrid) {
  sgMail.setApiKey(SENDGRID_API_KEY as string);
} else {
  console.warn('SENDGRID_API_KEY not set — email sending disabled in local/dev environment.');
}

let twilioClient: any = null;
if (hasTwilio) {
  try {
    twilioClient = Twilio(twilioAccountSid as string, twilioAuthToken as string);
  } catch (err) {
    console.warn('Twilio client initialization failed:', (err as any)?.message || err);
    twilioClient = null;
  }
} else {
  console.warn('Twilio credentials not fully configured or invalid — SMS/voice disabled in local/dev environment.');
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!hasSendGrid) return console.warn('sendEmail skipped: SendGrid not configured');
  await sgMail.send({
    to,
    from: SENDGRID_FROM_EMAIL,
    subject,
    html,
  });
}

export async function sendSms(to: string, body: string) {
  if (!twilioClient) return console.warn('sendSms skipped: Twilio not configured');
  await twilioClient.messages.create({
    to,
    from: twilioFromPhone,
    body,
  });
}

export async function sendWhatsApp(to: string, body: string) {
  if (!twilioClient) return console.warn('sendWhatsApp skipped: Twilio not configured');
  const from = twilioFromPhone?.startsWith('whatsapp:') ? twilioFromPhone : `whatsapp:${twilioFromPhone}`;
  const toAddr = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  await twilioClient.messages.create({ to: toAddr, from, body });
}

export async function sendVoiceCall(to: string, twiml: string) {
  if (!twilioClient) return console.warn('sendVoiceCall skipped: Twilio not configured');
  await twilioClient.calls.create({
    to,
    from: twilioFromPhone,
    twiml,
  });
}
