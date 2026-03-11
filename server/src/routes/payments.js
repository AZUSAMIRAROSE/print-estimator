import { Router } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { requireAuth } from "../middleware/auth.js";
import { writeAudit } from "../services/audit.js";

const router = Router();

const schema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().min(3).default("usd"),
  metadata: z.record(z.string()).optional(),
});

router.post("/create-intent", requireAuth, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    writeAudit(req.user.sub, "payment.intent.simulated", "payment", null, parsed.data);
    return res.json({ simulated: true, clientSecret: "simulated_client_secret" });
  }

  const stripe = new Stripe(key);
  const intent = await stripe.paymentIntents.create({
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    metadata: parsed.data.metadata,
    automatic_payment_methods: { enabled: true },
  });

  writeAudit(req.user.sub, "payment.intent.created", "payment", intent.id, { amount: parsed.data.amount, currency: parsed.data.currency });
  res.json({ simulated: false, paymentIntentId: intent.id, clientSecret: intent.client_secret });
});

export default router;
