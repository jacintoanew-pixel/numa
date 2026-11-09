# Numa — Personal Finance Platform

English · [Español](#español) · [Documentación detallada (ES)](docs/README.es-detallado.md)

Personal finance web application built with **Next.js 15 (App Router), React 19, TypeScript, and Tailwind CSS**, designed for direct deployment on a Linux VPS with PM2/systemd and Nginx.

## Features
- **Accounts, transactions, transfers, budgets, and reports** with integer-cent arithmetic and CSV export.
- **Assistant & receipt OCR** powered by Google Gemini tool-calling to log transactions from text or photos.
- **Telegram integration**: webhook validation, chat linking, and message de-duplication.
- **Authentication & security**: `scrypt` password hashing, TOTP 2FA (RFC 6238), WebAuthn passkeys, HMAC-signed session cookies verified at the Edge middleware, rate limiting, AES-256-GCM integrations vault, and per-resource ownership checks.
- **Tests**: 125 unit tests (Vitest) covering finance calculations, authentication, vault encryption, and Telegram parsing.

## Stack
| Area | Tech |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS, Motion |
| Backend | Next.js Route Handlers, Edge Middleware, Drizzle ORM schema |
| Security | Web Crypto API, RFC 6238 TOTP, WebAuthn, HMAC-SHA256 sessions |
| Deployment | systemd / PM2 (`ecosystem.config.cjs`), Nginx (`nginx/numa.conf`) |

## Quick Start
```bash
pnpm install
cp .env.production.example .env.local   # set SESSION_SIGNING_SECRET, VAULT_MASTER_KEY, ...
pnpm dev                                # http://localhost:3000
pnpm test                               # vitest
pnpm exec tsc --noEmit
```
In production, `SESSION_SIGNING_SECRET` (or `VAULT_MASTER_KEY`) is required to sign and verify session tokens.

---

## Español

Aplicación web de finanzas personales construida con **Next.js 15, React 19, TypeScript y Tailwind CSS**, preparada para correr directamente en un VPS Linux con PM2/systemd y Nginx. Incluye gestión de cuentas, transacciones, transferencias, presupuestos, reportes, escáner de recibos, integración con Telegram y autenticación con 2FA TOTP (RFC 6238), WebAuthn y sesiones firmadas con HMAC. Cuenta con 125 pruebas unitarias en Vitest. Documentación técnica detallada en [`docs/README.es-detallado.md`](docs/README.es-detallado.md).
