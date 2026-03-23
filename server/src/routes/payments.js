import { Router } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { requireAuth } from "../middleware/auth.js";
import { writeAudit } from "../services/audit.js";

const router = Router();

// Lazy-initialize Stripe client as singleton
let _stripe = null;
function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    _stripe = new Stripe(key);
  }
  return _stripe;
}

const schema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().min(3).default("usd"),
  metadata: z.record(z.string()).optional(),
});

router.post("/create-intent", requireAuth, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const stripe = getStripe();
  if (!stripe) {
    writeAudit(req.user.sub, "payment.intent.simulated", "payment", null, parsed.data);
    return res.json({ simulated: true, clientSecret: "simulated_client_secret" });
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      metadata: parsed.data.metadata,
      automatic_payment_methods: { enabled: true },
    });

    writeAudit(req.user.sub, "payment.intent.created", "payment", intent.id, { amount: parsed.data.amount, currency: parsed.data.currency });
    res.json({ simulated: false, paymentIntentId: intent.id, clientSecret: intent.client_secret });
  } catch (err) {
    res.status(500).json({ error: "Payment processing failed", message: err.message });
  }
});

export default router;

