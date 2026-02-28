import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import fs from "node:fs";
import path from "node:path";

import { runMigrations } from "./db.js";
import authRoutes from "./routes/auth.js";
import quoteRoutes from "./routes/quotes.js";
import rateRoutes from "./routes/rates.js";
import emailRoutes from "./routes/email.js";
import fileRoutes from "./routes/files.js";
import paymentRoutes from "./routes/payments.js";
import systemRoutes from "./routes/system.js";
import customerRoutes from "./routes/customers.js";
import jobRoutes from "./routes/jobs.js";
import inventoryRoutes from "./routes/inventory.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const origin = process.env.CORS_ORIGIN || "http://localhost:1420";

const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./server/uploads");
fs.mkdirSync(uploadDir, { recursive: true });

runMigrations();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("combined"));

app.use(
  "/api/v1",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(
  "/api/v1/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use("/api/v1/system", systemRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/quotes", quoteRoutes);
app.use("/api/v1/rates", rateRoutes);
app.use("/api/v1/email", emailRoutes);
app.use("/api/v1/files", fileRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/inventory", inventoryRoutes);

app.use((err, _req, res, _next) => {
  const isValidation = err?.name === "ZodError";
  const status = isValidation ? 400 : 500;
  res.status(status).json({ error: err?.message || "Internal server error" });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}`);
});
