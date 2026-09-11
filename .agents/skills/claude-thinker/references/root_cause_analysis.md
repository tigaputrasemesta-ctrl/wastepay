# Root-Cause Analysis (RCA) Protocol

When encountering a defect or runtime error, follow this systematic investigation:

## Step 1: Reproduce & Isolate
- Isolate the minimal reproduction case.
- Determine if the failure is deterministic or transient (timing/race condition dependent).

## Step 2: The 5 Whys Technique
- *Defect*: API endpoint returns 500 Internal Server Error.
- *Why 1*: The server threw an unhandled TypeError: cannot read property 'email' of undefined.
- *Why 2*: The user record fetched from the database was null.
- *Why 3*: The query filtered by `tenant_id` which was missing from the JWT claim.
- *Why 4*: The user recently updated their organization membership, issuing a new token format without migration.
- *Why 5 (Root Cause)*: The token issuance service lacked schema validation for required claims across all membership states.

## Step 3: Permanent Remediation Plan
1. Fix the immediate issue (graceful fallback when claim is missing).
2. Fix the upstream root cause (strict schema validation in token generator).
3. Add regression tests covering the defect case.
