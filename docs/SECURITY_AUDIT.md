# StockLine Security Architecture & Audit Report

This document outlines the defensive security practices and vulnerability safeguards implemented across StockLine Inventory SE.

---

## 1. Authentication & Session Management

- **JSON Web Tokens (JWT)**: Cryptographically signed using HMAC-SHA256 with strong secret keys.
- **Short-Lived Expiration**: Tokens carry defined expiry (`7d` default) to prevent indefinitely valid session hijackings.
- **Client Storage**: Tokens are stored securely and stripped from query parameters to prevent leakages via HTTP Referer headers.

---

## 2. Password Security & Storage

- **Bcrypt Hashing**: User credentials are protected using `bcryptjs` with salt round cost factor `10`.
- **Pre-Save Hooks**: Passwords are automatically hashed prior to MongoDB document persistence.
- **Timing Attack Resistance**: Constant-time string comparisons during password validation.

---

## 3. Injection Prevention & Sanitization

- **NoSQL Injection**: Express request bodies and MongoDB queries are sanitized; object operators (`$gt`, `$ne`, `$where`) cannot be passed via untrusted input.
- **Cross-Site Scripting (XSS)**: React JSX automatically escapes dangerous characters during DOM interpolation.
- **Parameter Pollution**: Body parser rejects non-standard object nesting on sensitive route endpoints.

---

## 4. Network Security & CORS

- **Cross-Origin Resource Sharing (CORS)**: Strict origin whitelisting configured for trusted frontend development and production domains (`localhost:5173`, `github.io`).
- **Rate Limiting**: Protects high-cost endpoints (`/api/auth/login`, `/api/lots/:id/bid`) against brute-force dictionary attacks.
- **HTTP Header Hardening**: Protection against clickjacking via `X-Frame-Options` and MIME type sniffing via `X-Content-Type-Options`.

---

## 5. Audit Logging & Non-Repudiation

All critical inventory adjustments, order cancellations, scrap bid approvals, and administrative user creations generate immutable records in the `audit_logs` collection, including:
- Actor user ID and role
- Action type (`CREATE`, `UPDATE`, `DELETE`, `AUCTION_BID`)
- Resource target and previous vs. new state
- Client IP address and UTC timestamp
