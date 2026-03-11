import { Router } from "express";
import { z } from "zod";
import { sendQuoteEmail } from "../services/email.js";
import { requireAuth } from "../middleware/auth.js";
import { writeAudit } from "../services/audit.js";

const router = Router();

const emailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  text: z.string().min(1),
  html: z.string().optional(),
  quoteId: z.string().optional(),
});

router.post("/send-quote", requireAuth, async (req, res) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const result = await sendQuoteEmail(parsed.data);
  writeAudit(req.user.sub, "email.send_quote", "quote", parsed.data.quoteId || null, { to: parsed.data.to, simulated: result.simulated });
  res.json({ ok: true, ...result });
});

export default router;
