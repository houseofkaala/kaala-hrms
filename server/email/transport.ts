import type { EmailNotificationSettings } from '../notifications/types';

export interface SendEmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  fromName?: string;
}

let transportReady: boolean | null = null;

export function isEmailConfigured(): boolean {
  if (transportReady !== null) return transportReady;
  transportReady = Boolean(
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASS?.trim(),
  );
  return transportReady;
}

function fromAddress(settings?: EmailNotificationSettings): string {
  return process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || 'noreply@bymarketingonly.com';
}

function formatFrom(settings?: EmailNotificationSettings): string {
  const name = settings?.fromName || process.env.SMTP_FROM_NAME || 'House of Kaala HR';
  return `"${name}" <${fromAddress(settings)}>`;
}

export function buildEmailHtml(title: string, message: string, companyName: string, footer?: string): string {
  const body = message.split('\n').map(line => `<p style="margin:0 0 12px;line-height:1.6;color:#333;">${escapeHtml(line)}</p>`).join('');
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f8f6f4;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e8e0dc;">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8b2942;">${escapeHtml(companyName)}</p>
    <h1 style="margin:0 0 16px;font-size:20px;color:#1a0a0f;">${escapeHtml(title)}</h1>
    ${body}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
    <p style="margin:0;font-size:12px;color:#888;">${escapeHtml(footer || 'This is an automated message from your HRMS. Please do not reply to this email.')}</p>
  </div></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function sendEmail(payload: SendEmailPayload, settings?: EmailNotificationSettings): Promise<{ ok: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.warn('[HRMS Email] SMTP not configured — skipping email to', payload.to);
    return { ok: false, error: 'SMTP not configured' };
  }

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: formatFrom(settings),
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html || buildEmailHtml(payload.subject, payload.text, settings?.fromName || 'House of Kaala'),
    });

    console.log('[HRMS Email] Sent:', payload.subject, '→', payload.to);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Send failed';
    console.error('[HRMS Email] Failed:', msg);
    return { ok: false, error: msg };
  }
}