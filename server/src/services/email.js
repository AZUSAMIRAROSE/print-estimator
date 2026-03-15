import nodemailer from "nodemailer";
import { writeAudit } from "./audit.js";

// ── In-memory retry queue ──────────────────────────────────────────────────
const EMAIL_QUEUE = [];
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

async function processQueue() {
  while (EMAIL_QUEUE.length > 0) {
    const job = EMAIL_QUEUE[0];
    try {
      const result = await _sendEmail(job.payload);
      job.resolve(result);
      EMAIL_QUEUE.shift();
    } catch (err) {
      job.retries++;
      if (job.retries >= MAX_RETRIES) {
        job.reject(err);
        EMAIL_QUEUE.shift();
        console.error(`[email] Failed after ${MAX_RETRIES} retries:`, err.message);
      } else {
        console.warn(`[email] Retry ${job.retries}/${MAX_RETRIES} in ${RETRY_DELAY_MS}ms`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }
}

async function _sendEmail({ to, subject, text, html }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return { simulated: true, messageId: "simulated" };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const result = await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to,
    subject,
    text,
    html,
  });

  return { simulated: false, messageId: result.messageId };
}

/**
 * Queue an email for sending. Will retry up to MAX_RETRIES times.
 * Returns immediately — the email is sent in the background.
 */
export function sendQuoteEmail(payload) {
  return new Promise((resolve, reject) => {
    const isProcessing = EMAIL_QUEUE.length > 0;
    EMAIL_QUEUE.push({ payload, resolve, reject, retries: 0 });
    if (!isProcessing) {
      processQueue().catch((err) =>
        console.error("[email] Queue processing error:", err)
      );
    }
  });
}
