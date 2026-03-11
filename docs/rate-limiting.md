# Backend Rate Limiting Blueprint

The current app is local-first and does not rely on a hosted API by default.  
When deploying a backend for quotes/jobs, apply rate limiting at the API gateway and service layer.

## Recommended Policy

- Authenticated users: 120 requests/minute per user token
- Write-heavy endpoints (`POST /quotes`, `POST /jobs`): 30 requests/minute
- Public endpoints (if any): 60 requests/minute per IP
- Burst window: token bucket with burst capacity 2x sustained rate

## Suggested Stack

- Reverse proxy/API gateway:
  - NGINX `limit_req`
  - Cloudflare/API Gateway native rate rules
- App-level fallback:
  - Redis-backed sliding window/token bucket

## Minimal Express Middleware Example

```ts
import type { Request, Response, NextFunction } from "express";

const bucket = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const LIMIT = 120;

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip || "unknown";
  const now = Date.now();
  const record = bucket.get(key);

  if (!record || now > record.resetAt) {
    bucket.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (record.count >= LIMIT) {
    res.status(429).json({ error: "Too many requests. Try again later." });
    return;
  }

  record.count += 1;
  next();
}
```

## Operational Recommendations

- Log 429 responses with route/user/IP metadata
- Alert on spikes and anomaly patterns
- Combine with WAF rules for abusive traffic
