# Backend/API Guide

This project now includes a production-style backend under `server/` with:

- Express API with structured routes under `/api/v1`
- SQLite persistence (`server/data/app.db`)
- JWT auth (`/auth/register`, `/auth/login`, `/auth/me`)
- Role-based admin endpoints (`/rates`, `/system/admin/audit-logs`)
- Quote CRUD (`/quotes`)
- File uploads (`/files`)
- Email sending (`/email/send-quote`) with SMTP or simulation fallback
- Payment intent endpoint (`/payments/create-intent`) with Stripe or simulation fallback
- API rate limiting and security middleware (`helmet`, `cors`, `express-rate-limit`)

## API Endpoints

- `GET /api/v1/system/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/quotes`
- `POST /api/v1/quotes`
- `PATCH /api/v1/quotes/:id/status`
- `GET /api/v1/rates`
- `PUT /api/v1/rates` (admin)
- `POST /api/v1/email/send-quote`
- `POST /api/v1/files` (multipart form-data: `file`)
- `GET /api/v1/files`
- `POST /api/v1/payments/create-intent`
- `GET /api/v1/system/admin/audit-logs` (admin)

## Local Run

1. Copy `.env.example` to `.env` and set secrets.
2. Install dependencies: `npm install`
3. Start frontend+backend: `npm run dev:full`
4. Frontend hits `/api/v1` by default. Override with `VITE_API_URL` if needed.

## Docker Deploy

- `docker compose up --build`
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:4000/api/v1/system/health`

## Security Notes

- Rotate `JWT_SECRET` for each environment.
- Configure real SMTP and Stripe keys in production.
- Place backend behind TLS and managed WAF/reverse proxy.
- For horizontal scaling, move rate limit counters and sessions to Redis.
