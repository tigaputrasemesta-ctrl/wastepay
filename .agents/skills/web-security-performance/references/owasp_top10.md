# OWASP Top 10 Web Vulnerabilities & Prevention

## 1. Broken Access Control
- **Risk**: Users accessing resources belonging to other tenants or elevated roles.
- **Remedy**: Enforce authorization checks on the server for every single endpoint and mutation.
  - Never trust user IDs passed in query parameters or request bodies when verifying ownership.
  - Verify `user.id === resource.ownerId` or check role permissions via RBAC middleware.

## 2. Cryptographic Failures
- Passwords must be hashed using argon2, bcrypt (cost factor >= 12), or scrypt. Never use SHA-256 or MD5 for passwords.
- Enforce HTTPS across all routes with HSTS (`Strict-Transport-Security`).

## 3. Server-Side Request Forgery (SSRF)
- If the server fetches URLs provided by users (e.g., webhooks, unfurl previews):
  - Validate against internal network ranges (block `127.0.0.1`, `169.254.169.254`, `10.0.0.0/8`, `192.168.0.0/16`, `::1`).
  - Restrict allowed protocols to `http` and `https`.
